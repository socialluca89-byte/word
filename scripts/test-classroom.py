"""Class-link enrollment and learner permissions against an isolated PHP server."""
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import shlex
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

with tempfile.TemporaryDirectory(prefix='wordyland-classroom-') as temporary:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    # Restore a pre-classroom database, including an existing account/profile.
    Path(temporary+'/data').mkdir()
    with sqlite3.connect(temporary+'/data/wordyland.sqlite') as legacy:
        legacy.executescript('CREATE TABLE accounts(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL); CREATE TABLE profiles(id INTEGER PRIMARY KEY,account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,nickname TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);')
        legacy.execute('INSERT INTO accounts VALUES (1,?,?,0)',('legacy_parent','retained-password-hash'))
        legacy.execute('INSERT INTO profiles(id,account_id,nickname,state) VALUES (1,1,?,?)',('Legacy pupil',json.dumps({'stats':{'cat':{'good':3}},'stars':9})))
    log = open(temporary+'/php.log', 'w+')
    process = subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND', 'php')) + ['-d', 'session.save_path='+temporary, '-S', f'127.0.0.1:{port}', '-t', 'dist'], env=dict(os.environ, WORDYLAND_TEST='1', WORDYLAND_DATA_DIR=temporary+'/data'), stdout=log, stderr=log)
    base = f'http://127.0.0.1:{port}/api.php?action='
    def client():
        return urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(c, action, body=None, csrf='', expected=200):
        req = urllib.request.Request(base+action, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type':'application/json', 'X-CSRF-Token':csrf})
        try: response = c.open(req, timeout=5)
        except urllib.error.HTTPError as error: response = error
        value = response.read().decode()
        assert response.status == expected, (action, response.status, value)
        return json.loads(value)
    def anonymous():
        c=client()
        return c, request(c, 'session')['csrf']
    def learner(code, nickname, password='My-class-password-123'):
        c,csrf=anonymous()
        result=request(c, 'class-register', {'code':code,'nickname':nickname,'password':password,'consent':True,'role':'adult'}, csrf)
        assert result['role']=='learner' and len(result['profiles'])==1
        return c,result
    try:
        teacher=client()
        for _ in range(40):
            try:
                token=request(teacher,'session')['csrf']; break
            except urllib.error.URLError: time.sleep(.05)
        else: raise RuntimeError('PHP server did not start')
        adult=request(teacher,'register',{'username':'teacher_'+secrets.token_hex(5),'password':'Adult-password-123','adult':True},token)
        token=adult['csrf']
        profile=request(teacher,'create-profile',{'nickname':'Maestra'},token)['id']
        classroom=request(teacher,'club-create',{'profile':profile,'name':'La nostra seconda','consent':True},token)
        code=classroom['code']
        assert request(teacher,'class-link',{'club':classroom['id']},token)['code']==code
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as migrated:
            assert migrated.execute('SELECT role,password_hash FROM accounts WHERE id=1').fetchone()==('adult','retained-password-hash')
            assert json.loads(migrated.execute('SELECT state FROM profiles WHERE id=1').fetchone()[0])['stars']==9
        assert request(teacher,'class-link',{'club':classroom['id']},token)['code']==code
        guest,csrf=anonymous()
        metadata=request(guest,'class-invite&code='+code)
        assert metadata=={'name':'La nostra seconda','full':False,'joined':False}
        # Existing adult-owned profiles can follow a class link without becoming
        # learner accounts. The invite returns only this account's own choices.
        owner_metadata=request(teacher,'class-invite&code='+code)
        assert owner_metadata['profiles']==[{'id':profile,'nickname':'Maestra','joined':True}]
        assert owner_metadata['canManage'] is True
        family,ft=anonymous()
        family_account=request(family,'register',{'username':'family_'+secrets.token_hex(5),'password':'Family-password-123','adult':True},ft)
        ft=family_account['csrf']
        family_profile=request(family,'create-profile',{'nickname':'ArmadilloFixture'},ft)['id']
        spare_profile=request(family,'create-profile',{'nickname':'SpareFixture'},ft)['id']
        before_join=request(family,'class-invite&code='+code)
        assert before_join['joined'] is False and before_join['canManage'] is False
        assert before_join['profiles']==[{'id':family_profile,'nickname':'ArmadilloFixture','joined':False},{'id':spare_profile,'nickname':'SpareFixture','joined':False}]
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            account_before=db.execute('SELECT role,password_hash,recovery_hash,session_version FROM accounts WHERE username=?',(family_account['username'],)).fetchone()
        request(family,'club-join',{'profile':family_profile,'code':code,'consent':False},ft,400)
        request(family,'club-join',{'profile':profile,'code':code,'consent':True},ft,404)
        request(family,'club-join',{'profile':family_profile,'code':code,'consent':True},ft)
        joined_metadata=request(family,'class-invite&code='+code)
        assert joined_metadata['joined'] is True and joined_metadata['profiles'][0]['joined'] is True
        assert joined_metadata['profiles'][1]['joined'] is False
        assert set(joined_metadata['profiles'][0])=={'id','nickname','joined'}
        assert {p['id'] for p in joined_metadata['profiles']}=={family_profile,spare_profile}
        assert request(teacher,'class-invite&code='+code)['profiles']==owner_metadata['profiles']
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            assert db.execute('SELECT role,password_hash,recovery_hash,session_version FROM accounts WHERE username=?',(family_account['username'],)).fetchone()==account_before
            assert db.execute('SELECT COUNT(*) FROM class_enrollments WHERE profile_id=?',(family_profile,)).fetchone()[0]==0
        # Remove just the synthetic membership before the existing roster checks.
        request(family,'club-leave',{'profile':family_profile,'club':classroom['id']},ft)
        request(guest,'class-invite&code=bad',expected=404)
        request(guest,'class-link',{'club':classroom['id']},csrf,401)
        payload={'code':code,'nickname':'Luna7','password':'My-class-password-123','consent':True}
        request(guest,'class-register',payload,'invalid',403)
        request(guest,'class-register',{**payload,'consent':False},csrf,400)
        request(guest,'class-register',{**payload,'nickname':'<script>'},csrf,400)
        request(guest,'class-register',{**payload,'password':'short'},csrf,400)
        request(teacher,'class-register',payload,token,409)
        assert request(teacher,'session')['username']==adult['username']
        a,sa=learner(code,'Luna7')
        b,sb=learner(code,'Nico8')
        pa,pb=sa['profiles'][0]['id'],sb['profiles'][0]['id']
        assert request(a,'class-invite&code='+code)['joined'] is True
        request(guest,'class-register',{**payload,'nickname':'luna7'},csrf,409)
        request(guest,'class-register',{**payload,'nickname':'maestra'},csrf,409)
        roster=request(a,f'arena&profile={pa}')
        assert pb in [p['id'] for p in roster['opponents']]
        assert all(p['classes']==['La nostra seconda'] for p in roster['opponents'])
        for action, body in [
            ('create-profile',{'nickname':'Extra'}),('club-create',{'profile':pa,'name':'Another','consent':True}),
            ('club-join',{'profile':pa,'code':code,'consent':True}),('club-leave',{'profile':pa,'club':classroom['id']}),
            ('rename-profile',{'profile':pa,'nickname':'Teacher'}),('delete-profile',{'profile':pa}),
            ('study-save',{'profile':pa}),('class-link',{'club':classroom['id']})
        ]:
            request(a,action,body,sa['csrf'],403)
        request(a,f'profile&id={pb}',expected=404)
        invitation=request(a,'duel-create',{'profile':pa,'opponent':pb,'category':'body'},sa['csrf'])['duel']
        assert request(b,'duel-accept',{'profile':pb,'duel':invitation['id']},sb['csrf'])['question']
        state=request(a,f'profile&id={pa}')
        request(a,'save',{'id':pa,'revision':state['revision'],'state':{'stats':{'cat':{'good':1,'attempts':1}},'stars':1}},sa['csrf'])
        assert request(a,f'profile&id={pa}')['state']['stats']['cat']['good']==1
        # Same nickname in a different class is a different account.
        second=request(teacher,'club-create',{'profile':profile,'name':'Altra classe','consent':True},token)
        other,so=learner(second['code'],'Luna7','Other-class-password-456')
        po=so['profiles'][0]['id']
        assert po not in [p['id'] for p in request(a,f'arena&profile={pa}')['opponents']]
        # A super admin may add an existing learner to a second class without a
        # second enrollment record, password, account or change of permissions.
        destination=request(teacher,'club-create',{'profile':profile,'name':'Classe aggiuntiva','consent':True},token)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            learner_before=db.execute('SELECT role,password_hash,recovery_hash,session_version FROM accounts WHERE username=?',(sa['username'],)).fetchone()
            db.execute('UPDATE accounts SET role="admin" WHERE username=?',(adult['username'],))
        request(teacher,'admin-class-add',{'club':destination['id'],'member':pa,'consent':True},token)
        moved,tm=anonymous()
        signed_existing=request(moved,'class-login',{**payload,'code':destination['code']},tm)
        assert signed_existing['role']=='learner' and signed_existing['profiles'][0]['id']==pa
        assert signed_existing['className']=='Classe aggiuntiva'
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            assert db.execute('SELECT role,password_hash,recovery_hash,session_version FROM accounts WHERE username=?',(sa['username'],)).fetchone()==learner_before
            assert db.execute('SELECT COUNT(*) FROM class_enrollments WHERE profile_id=?',(pa,)).fetchone()[0]==1
        denied,td=anonymous()
        # The equally named learner in another class is not a valid identity here.
        request(denied,'class-login',{**payload,'code':destination['code'],'password':'Other-class-password-456'},td,401)
        request(denied,'class-recover',{**payload,'code':destination['code'],'recovery':so['recovery']},td,401)
        # Even inconsistent legacy memberships must not pick the first account.
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            db.execute('INSERT INTO club_profiles(club_id,profile_id) VALUES (?,?)',(destination['id'],po))
        request(denied,'class-login',{**payload,'code':destination['code']},td,401)
        request(denied,'class-recover',{**payload,'code':destination['code'],'recovery':sa['recovery']},td,401)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            db.execute('DELETE FROM club_profiles WHERE club_id=? AND profile_id=?',(destination['id'],po))
            db.execute('DELETE FROM club_profiles WHERE club_id=? AND profile_id=?',(classroom['id'],pa))
        # The old signup/enrollment record and account-to-class record remain,
        # but neither may authorize login or recovery without profile membership.
        request(denied,'class-login',payload,td,401)
        request(denied,'class-recover',{**payload,'recovery':sa['recovery']},td,401)
        request(teacher,'admin-class-add',{'club':classroom['id'],'member':pa,'consent':True},token)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            db.execute('DELETE FROM club_profiles WHERE club_id=? AND profile_id=?',(destination['id'],pa))
            db.execute('UPDATE accounts SET role="adult" WHERE username=?',(adult['username'],))
        request(denied,'class-login',{**payload,'code':destination['code']},td,401)
        assert request(moved,'class-invite&code='+destination['code'])['joined'] is False
        # A pre-existing class without a saved link acquires one without invalidating its old invitation.
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as legacy:
            legacy.execute('DELETE FROM class_links WHERE club_id=?',(second['id'],))
        new_link=request(teacher,'class-link',{'club':second['id']},token)['code']
        assert new_link==request(teacher,'class-link',{'club':second['id']},token)['code']
        assert request(guest,'class-invite&code='+new_link)['name']=='Altra classe'
        assert request(guest,'class-invite&code='+second['code'])['name']=='Altra classe'
        request(family,'club-join',{'profile':family_profile,'code':new_link,'consent':True},ft)
        assert request(family,'class-invite&code='+new_link)['profiles'][0]['joined'] is True
        request(family,'club-leave',{'profile':family_profile,'club':second['id']},ft)
        wrong,tc=anonymous()
        request(wrong,'class-login',{**payload,'code':second['code']},tc,401)
        request(other,'class-link',{'club':classroom['id']},so['csrf'],403)
        # More than eight pupils may join one class without sharing an account.
        extra=[]
        for i in range(7): extra.append(learner(code,'Pupil'+str(i)))
        assert len(request(a,f'arena&profile={pa}')['opponents'])==9
        # Capacity must be enforced by the server as well as the signup form.
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            used=db.execute('SELECT COUNT(*) FROM club_profiles WHERE club_id=?',(classroom['id'],)).fetchone()[0]
            for i in range(100-used):
                profile_id=db.execute('INSERT INTO profiles(account_id,nickname,state) VALUES (1,?,?)',('CapacityFixture'+str(i),'{}')).lastrowid
                db.execute('INSERT INTO club_profiles(club_id,profile_id) VALUES (?,?)',(classroom['id'],profile_id))
        assert request(guest,'class-invite&code='+code)['full'] is True
        request(guest,'class-register',{**payload,'nickname':'FullClassPupil'},csrf,409)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            account=db.execute('SELECT role,password_hash,recovery_hash FROM accounts WHERE username=?',(sa['username'],)).fetchone()
            assert account[0]=='learner' and account[1]!='My-class-password-123' and account[2]!=sa['recovery']
            assert db.execute('SELECT COUNT(*) FROM class_enrollments WHERE profile_id=?',(pa,)).fetchone()[0]==1
        login,tl=anonymous()
        request(login,'class-login',{**payload,'password':'Wrong-password-123'},tl,401)
        signed=request(login,'class-login',{**payload,'nickname':'luna7'},tl)
        assert signed['role']=='learner' and signed['profiles'][0]['id']==pa
        recover,tr=anonymous()
        recovered=request(recover,'class-recover',{**payload,'password':'New-class-password-456','recovery':sa['recovery']},tr)
        assert recovered['recovery']!=sa['recovery']
        assert request(a,'session')['username'] is None
        assert request(login,'session')['username'] is None
        request(recover,'class-recover',{**payload,'password':'New-class-password-456','recovery':sa['recovery']},tr,401)
        request(recover,'class-login',payload,tr,401)
        signed=request(recover,'class-login',{**payload,'password':'New-class-password-456'},tr)
        assert signed['profiles'][0]['id']==pa
        request(recover,'delete-account',{'password':'New-class-password-456','confirm':'ELIMINA'},signed['csrf'])
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            assert db.execute('SELECT COUNT(*) FROM class_enrollments WHERE profile_id=?',(pa,)).fetchone()[0]==0
            assert db.execute('SELECT COUNT(*) FROM duels WHERE challenger=? OR opponent=?',(pa,pa)).fetchone()[0]==0
        print('Classroom checks passed: preserved legacy accounts and links, stable owner-only link, direct signup/login, capacity, class-scoped nicknames, automatic membership, separate learner permissions, shared-school IP enrollment, private duels, progress, password recovery/session invalidation and deletion.')
    finally:
        process.terminate();process.wait(timeout=5);log.close()
