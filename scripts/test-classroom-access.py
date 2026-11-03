"""Class manager recovery and invitation lifecycle; disposable accounts/local servers only."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
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
import threading
import time
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def passed(label):
    checks.append(label)
    print('PASS '+label,flush=True)

def client():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

with tempfile.TemporaryDirectory(prefix='wordyland-class-access-') as temporary:
    fixture=Path(temporary);servers=[];logs=[];db=None;ports=[]
    for _ in range(2):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0));ports.append(sock.getsockname()[1])
    env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=str(fixture/'data'))
    def req(person,action,body=None,csrf='',expected=200,port=None):
        selected=ports[0] if port is None else port
        assert selected in ports
        request=urllib.request.Request('http://127.0.0.1:'+str(selected)+'/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=person.open(request,timeout=10)
        except urllib.error.HTTPError as error:response=error
        with response:
            data=json.loads(response.read())
            assert response.status==expected,(action,response.status,expected,sorted(data))
        return data
    def anon():
        person=client();return person,req(person,'session')['csrf']
    def adult(label):
        person,csrf=anon();result=req(person,'register',{'username':label+'_'+secrets.token_hex(4),'password':'Class-adult-fixture-123','adult':True},csrf)
        profile=req(person,'create-profile',{'nickname':label},result['csrf'])['id']
        return person,result['csrf'],profile,result['username']
    def learner(code,nickname):
        person,csrf=anon();result=req(person,'class-register',{'code':code,'nickname':nickname,'password':'Class-learner-fixture-123','consent':True},csrf)
        return person,result,result['profiles'][0]['id']
    try:
        for index,port in enumerate(ports):
            log=(fixture/('php-'+str(index)+'.log')).open('w+');logs.append(log)
            servers.append(subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+str(fixture),'-S','127.0.0.1:'+str(port),'-t',str(ROOT/'dist')],env=env,stdout=log,stderr=log))
        probe=client()
        for _ in range(100):
            try:req(probe,'session');break
            except urllib.error.URLError:time.sleep(.03)
        else:raise RuntimeError('Local fixture unavailable')
        teacher,tt,tp,teacher_name=adult('ClassManager')
        other,ot,op,_=adult('OtherManager')
        parent,pt,pp,_=adult('ParentFixture')
        club=req(teacher,'club-create',{'profile':tp,'name':'Synthetic managed class','consent':True},tt)
        foreign=req(other,'club-create',{'profile':op,'name':'Synthetic other class','consent':True},ot)
        stable=club['code']
        child,child_result,pid=learner(stable,'MoonFixture')
        second,second_result,spid=learner(stable,'StarFixture')
        db=sqlite3.connect(fixture/'data/wordyland.sqlite');db.row_factory=sqlite3.Row
        account_id=db.execute('SELECT account_id FROM profiles WHERE id=?',(pid,)).fetchone()[0]
        req(child,'save',{'id':pid,'revision':0,'state':{'stats':{'cat':{'good':2,'attempts':3}},'stars':17}},child_result['csrf'])
        wallet=req(child,'hub&profile='+str(pid))['wallet']
        profile_before=dict(db.execute('SELECT * FROM profiles WHERE id=?',(pid,)).fetchone())
        credentials_before=tuple(db.execute('SELECT password_hash,recovery_hash,session_version,role FROM accounts WHERE id=?',(account_id,)).fetchone())
        guest,gcsrf=anon()
        state=req(teacher,'class-manage-state',{'club':club['id']},tt)
        assert state['registrationOpen'] and len(state['members'])==3
        assert all(set(row)=={'id','nickname','role','removable','recoverable'} for row in state['members'])
        assert next(row for row in state['members'] if row['id']==pid)['recoverable']
        assert not next(row for row in state['members'] if row['id']==tp)['removable']
        for action,body in [('class-manage-state',{'club':club['id']}),('class-recovery-issue',{'club':club['id'],'member':pid,'verified':True,'attempt':secrets.token_hex(16)}),('class-invitation-update',{'club':club['id'],'change':'pause','confirmed':True})]:
            req(guest,action,body,gcsrf,401);req(other,action,body,ot,403);req(child,action,body,child_result['csrf'],403)
        req(teacher,'class-manage-state',{'club':club['id']},'bad',403)
        req(teacher,'class-recovery-issue',{'club':club['id'],'member':tp,'verified':True,'attempt':secrets.token_hex(16)},tt,404)
        req(teacher,'class-recovery-issue',{'club':foreign['id'],'member':pid,'verified':True,'attempt':secrets.token_hex(16)},tt,403)
        passed('manager/role/CSRF/ownership boundaries; no adult account recovery or roster disclosure')

        def invitation(change):return req(teacher,'class-invitation-update',{'club':club['id'],'change':change,'confirmed':True},tt)
        invitation('pause')
        assert req(guest,'class-invite&code='+stable)['registrationOpen'] is False
        newcomer,ncsrf=anon();signup={'code':stable,'nickname':'NewFixture','password':'Class-newcomer-fixture-123','consent':True}
        req(newcomer,'class-register',signup,ncsrf,410)
        req(parent,'club-join',{'profile':pp,'code':stable,'consent':True},pt,410)
        existing,existing_csrf=anon()
        signed=req(existing,'class-login',{'code':stable,'nickname':'MoonFixture','password':'Class-learner-fixture-123'},existing_csrf)
        assert signed['profiles'][0]['id']==pid
        invitation('resume');invitation('rotate')
        fresh=req(teacher,'class-link',{'club':club['id']},tt)['code'];assert fresh!=stable
        assert not req(guest,'class-invite&code='+stable)['registrationOpen']
        assert req(guest,'class-invite&code='+fresh)['registrationOpen']
        req(newcomer,'class-register',signup,ncsrf,410)
        req(parent,'club-join',{'profile':pp,'code':stable,'consent':True},pt,410)
        req(parent,'club-join',{'profile':pp,'code':fresh,'consent':True},pt)
        invitation('pause');req(parent,'club-join',{'profile':pp,'code':stable,'consent':True},pt)
        invitation('resume');invitation('rotate')
        freshest=req(teacher,'class-link',{'club':club['id']},tt)['code'];assert freshest not in [stable,fresh]
        for legacy in [stable,fresh]:
            returning,rcsrf=anon();result=req(returning,'class-login',{'code':legacy,'nickname':'MoonFixture','password':'Class-learner-fixture-123'},rcsrf);assert result['profiles'][0]['id']==pid
        req(newcomer,'class-register',{**signup,'code':fresh},ncsrf,410)
        born,_,born_pid=learner(freshest,'NewFixture')
        passed('pause/rotation stop new enrollment from old links; legacy login and existing membership remain usable')

        def issue(member=pid,attempt=None):
            return req(teacher,'class-recovery-issue',{'club':club['id'],'member':member,'verified':True,'attempt':attempt or secrets.token_hex(16)},tt)
        attempt=secrets.token_hex(16);grant=issue(attempt=attempt)
        assert len(grant['recovery'])==24 and grant['expires']>time.time()
        assert issue(attempt=attempt)=={'grant':grant['grant'],'alreadyCreated':True}
        assert db.execute('SELECT COUNT(*) FROM class_recovery_grants WHERE attempt=?',(attempt,)).fetchone()[0]==1
        assert db.execute('SELECT token_hash FROM class_recovery_grants WHERE id=?',(grant['grant'],)).fetchone()[0]==hashlib.sha256(grant['recovery'].encode()).hexdigest()
        assert grant['recovery'] not in json.dumps(req(teacher,'class-manage-state',{'club':club['id']},tt))
        assert tuple(db.execute('SELECT password_hash,recovery_hash,session_version,role FROM accounts WHERE id=?',(account_id,)).fetchone())==credentials_before
        assert req(child,'session')['username']==child_result['username']
        req(teacher,'class-recovery-issue',{'club':club['id'],'member':spid,'verified':True,'attempt':attempt},tt,409)
        invalid=anon()
        req(invalid[0],'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':'f'*24,'password':'Class-reset-fixture-456','confirmPassword':'Class-reset-fixture-456'},invalid[1],401)
        req(guest,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':grant['recovery'],'password':'Class-reset-fixture-456','confirmPassword':'different'},gcsrf,400)
        req(teacher,'class-recovery-revoke',{'club':club['id'],'grant':grant['grant']},tt)
        req(guest,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':grant['recovery'],'password':'Class-reset-fixture-456','confirmPassword':'Class-reset-fixture-456'},gcsrf,401)
        expired=issue();db.execute('UPDATE class_recovery_grants SET expires=0 WHERE id=?',(expired['grant'],));db.commit()
        req(guest,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':expired['recovery'],'password':'Class-reset-fixture-456','confirmPassword':'Class-reset-fixture-456'},gcsrf,401)
        assert tuple(db.execute('SELECT password_hash,recovery_hash,session_version,role FROM accounts WHERE id=?',(account_id,)).fetchone())==credentials_before
        passed('hashed short-lived code, no credential change on issue/retry/revoke/expiry; no raw code in management state')

        active=issue();one,c1=anon();two,c2=anon();barrier=threading.Barrier(2)
        payload={'code':stable,'nickname':'MoonFixture','token':active['recovery'],'password':'Class-reset-fixture-456','confirmPassword':'Class-reset-fixture-456'}
        def race(person,csrf,port):
            barrier.wait(timeout=5)
            request=urllib.request.Request('http://127.0.0.1:'+str(port)+'/api.php?action=class-assisted-confirm',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
            try:response=person.open(request,timeout=10)
            except urllib.error.HTTPError as error:response=error
            with response:return response.status,json.loads(response.read())
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(race,one,c1,ports[0]),pool.submit(race,two,c2,ports[1])];replies=[future.result() for future in futures]
        assert sorted(status for status,_ in replies)==[200,401]
        ok=next(data for status,data in replies if status==200)
        assert len(ok['recovery'])==32
        after=tuple(db.execute('SELECT password_hash,recovery_hash,session_version,role FROM accounts WHERE id=?',(account_id,)).fetchone())
        assert after[2]==credentials_before[2]+1 and after[3]=='learner'
        assert after[1]==hashlib.sha256(ok['recovery'].encode()).hexdigest()
        assert dict(db.execute('SELECT * FROM profiles WHERE id=?',(pid,)).fetchone())==profile_before
        assert req(child,'session')['username'] is None and req(existing,'session')['username'] is None
        returning,tcsrf=anon();reset_login=req(returning,'class-login',{'code':fresh,'nickname':'MoonFixture','password':'Class-reset-fixture-456'},tcsrf)
        assert reset_login['profiles'][0]['id']==pid and req(returning,'hub&profile='+str(pid))['wallet']==wallet
        personal,pc=anon();personal_reset=req(personal,'class-recover',{'code':stable,'nickname':'MoonFixture','password':'Class-reset-personal-789','recovery':ok['recovery']},pc);assert len(personal_reset['recovery'])==32
        passed('two-worker one-time redemption; reset only on explicit confirm, old sessions revoked and progress/wallet preserved')

        removable=issue();req(teacher,'class-member-remove',{'club':club['id'],'member':pid,'confirmed':True},tt)
        req(teacher,'class-member-remove',{'club':club['id'],'member':pid,'confirmed':True},tt)
        removed=req(teacher,'class-manage-state',{'club':club['id']},tt)
        assert any(row['id']==pid for row in removed['removed']) and not any(row['id']==pid for row in removed['members'])
        outsider,oc=anon();req(outsider,'class-login',{'code':stable,'nickname':'MoonFixture','password':'Class-reset-personal-789'},oc,401)
        req(outsider,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':removable['recovery'],'password':'Class-removed-reset-123','confirmPassword':'Class-removed-reset-123'},oc,401)
        req(teacher,'class-member-restore',{'club':club['id'],'member':pid,'confirmed':True},tt)
        req(teacher,'class-member-restore',{'club':club['id'],'member':pid,'confirmed':True},tt)
        req(outsider,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':removable['recovery'],'password':'Class-removed-reset-123','confirmPassword':'Class-removed-reset-123'},oc,401)
        signed=req(outsider,'class-login',{'code':stable,'nickname':'MoonFixture','password':'Class-reset-personal-789'},oc)
        assert signed['profiles'][0]['id']==pid and req(outsider,'hub&profile='+str(pid))['wallet']==wallet
        assert db.execute('SELECT COUNT(*) FROM club_profiles WHERE club_id=? AND profile_id=?',(club['id'],pid)).fetchone()[0]==1
        assert dict(db.execute('SELECT * FROM profiles WHERE id=?',(pid,)).fetchone())==profile_before
        passed('membership remove/restore idempotent and nondestructive; old recovery grants cannot resurrect')
        # Authorization changes permanently invalidate prepared grants, even when restored.
        db.execute("DELETE FROM rate_limits WHERE bucket LIKE 'class-assisted:%' OR bucket LIKE 'class-assisted-ip:%'");db.commit()
        teacher_id=db.execute('SELECT id FROM accounts WHERE username=?',(teacher_name,)).fetchone()[0]
        other_id=db.execute('SELECT account_id FROM profiles WHERE id=?',(op,)).fetchone()[0]
        issuer_changed=issue();db.execute('UPDATE clubs SET owner_id=? WHERE id=?',(other_id,club['id']));db.execute('UPDATE clubs SET owner_id=? WHERE id=?',(teacher_id,club['id']));db.commit()
        for grant_to_reject in [issuer_changed]:
            revoked_guest,rg=anon();req(revoked_guest,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':grant_to_reject['recovery'],'password':'Class-invalidation-123','confirmPassword':'Class-invalidation-123'},rg,401)
        role_changed=issue();db.execute('UPDATE accounts SET role="learner" WHERE id=?',(teacher_id,));db.execute('UPDATE accounts SET role="adult" WHERE id=?',(teacher_id,));db.commit()
        revoked_guest,rg=anon();req(revoked_guest,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':role_changed['recovery'],'password':'Class-invalidation-123','confirmPassword':'Class-invalidation-123'},rg,401)
        stale=issue();db.execute('UPDATE accounts SET session_version=session_version+1 WHERE id=?',(account_id,));db.commit()
        revoked_guest,rg=anon();req(revoked_guest,'class-assisted-confirm',{'code':stable,'nickname':'MoonFixture','token':stale['recovery'],'password':'Class-invalidation-123','confirmPassword':'Class-invalidation-123'},rg,401)
        req(teacher,'class-member-remove',{'club':club['id'],'member':op,'confirmed':True},tt,404)
        db.execute("DELETE FROM rate_limits WHERE bucket LIKE 'class-assisted:%' OR bucket LIKE 'class-assisted-ip:%'");db.commit()
        throttled,throttled_csrf=anon();wrong_payload={'code':stable,'nickname':'MoonFixture','token':'a'*24,'password':'Class-invalidation-123','confirmPassword':'Class-invalidation-123'}
        credentials_now=tuple(db.execute('SELECT password_hash,recovery_hash,session_version,role FROM accounts WHERE id=?',(account_id,)).fetchone())
        for _ in range(10):req(throttled,'class-assisted-confirm',wrong_payload,throttled_csrf,401)
        req(throttled,'class-assisted-confirm',wrong_payload,throttled_csrf,429)
        assert tuple(db.execute('SELECT password_hash,recovery_hash,session_version,role FROM accounts WHERE id=?',(account_id,)).fetchone())==credentials_now
        passed('owner/role/version invalidation is monotonic; unrelated membership inaccessible and failed recovery attempts limited')
        print(json.dumps({'status':'passed','checks':checks,'scope':'synthetic local accounts only; no email, real recovery or production requests'}))
    finally:
        if db is not None:db.close()
        for process in reversed(servers):
            if process.poll() is None:
                process.terminate()
                try:process.wait(timeout=5)
                except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
        for log in logs:log.close()
