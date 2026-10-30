"""Role, email, private bootstrap, feedback and administrator integration checks."""
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import shlex
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

with tempfile.TemporaryDirectory(prefix='wordyland-community-') as temporary:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    environment=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=temporary+'/data')
    php=shlex.split(os.environ.get('PHP_COMMAND','php'))
    log=open(temporary+'/php.log','w+')
    server=subprocess.Popen(php+['-d','session.save_path='+temporary,'-S',f'127.0.0.1:{port}','-t','dist'],env=environment,stdout=log,stderr=log)
    base=f'http://127.0.0.1:{port}/api.php?action='
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def cpu_throttled():
        try:
            return int(dict(line.split() for line in Path('/sys/fs/cgroup/cpu.stat').read_text().splitlines()).get('throttled_usec',0))
        except (OSError,ValueError):return None
    timings=[]
    def request(session,action,body=None,csrf='',expected=200):
        req=urllib.request.Request(base+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        started=time.monotonic();cpu_before=cpu_throttled()
        event={'action':action.split('&')[0],'method':'POST' if body is not None else 'GET'}
        try:
            try:response=session.open(req,timeout=5)
            except urllib.error.HTTPError as error:response=error
            data=response.read().decode();event['status']=response.status
        except (TimeoutError,urllib.error.URLError):
            event['elapsed']=round(time.monotonic()-started,3);cpu_after=cpu_throttled()
            event['cpu_throttled_delta_usec']=cpu_after-cpu_before if cpu_after is not None and cpu_before is not None else None
            print('Community request diagnostic:',json.dumps(event,sort_keys=True),flush=True)
            raise
        event['elapsed']=round(time.monotonic()-started,3);cpu_after=cpu_throttled()
        event['cpu_throttled_delta_usec']=cpu_after-cpu_before if cpu_after is not None and cpu_before is not None else None
        timings.append(event)
        assert response.status==expected,(action,response.status,data)
        return json.loads(data)
    def bootstrap():
        return subprocess.run(php+['scripts/bootstrap-admin.php'],env=dict(os.environ,WORDYLAND_BOOTSTRAP_DATA=temporary+'/data'),capture_output=True,text=True)
    try:
        a,b,learner,admin,guest=[client() for _ in range(5)]
        for _ in range(50):
            try:request(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        password='Community-test-password-123'
        def register(c,name,nickname='Docente'):
            token=request(c,'session')['csrf'];result=request(c,'register',{'username':name,'password':password,'adult':True,'role':'admin'},token)
            assert result['role']=='adult'
            profile=request(c,'create-profile',{'nickname':nickname},result['csrf'])['id']
            return result['csrf'],profile
        ta,pa=register(a,'teacher_'+secrets.token_hex(3)+'@example.test');tb,pb=register(b,'another_'+secrets.token_hex(3),'Nuvola')
        request(guest,'feedback-list',expected=401);request(guest,'admin-overview',expected=401)
        token=request(guest,'session')['csrf'];request(guest,'register',{'username':'luca@perrone.it','password':password,'adult':True},token,403)
        request(a,'admin-overview',expected=403);request(a,'feedback-list&scope=all',expected=403)
        club=request(a,'club-create',{'profile':pa,'name':'La nostra classe','consent':True},ta)
        tl=request(learner,'session')['csrf'];registered=request(learner,'class-register',{'code':club['code'],'nickname':'Stellina','password':password,'consent':True},tl)
        tl=registered['csrf'];pl=registered['profiles'][0]['id']
        request(learner,'managed-classes',expected=403)
        payload={'kind':'bug','title':'La parola non si sente','body':'Quando premo ascolta non sento la voce.','screen':'lessons','profile':pl}
        request(learner,'feedback-create',payload,'invalid',403)
        request(b,'feedback-create',{**payload,'profile':pa},tb,404)
        feedback=request(learner,'feedback-create',payload,tl)
        request(learner,'feedback-status',{'id':feedback['id'],'status':'fixed'},tl,403)
        own=request(learner,'feedback-list');assert len(own['items'])==1 and 'username' not in own['items'][0]
        assert request(a,'feedback-list')['total']==0
        request(a,'feedback-create',{'kind':'idea','title':'Un nuovo mondo','body':'Mi piacerebbe un mondo con il bosco.','screen':'island'},ta)
        request(a,'feedback-create',{'kind':'unknown','title':'Titolo','body':'Descrizione','screen':'island'},ta,400)
        request(a,'feedback-create',{'kind':'bug','title':'Titolo','body':'Descrizione','screen':'#classe=private-token'},ta,400)
        assert bootstrap().returncode==0
        private=Path(temporary+'/data/admin-activation.txt');assert private.is_file() and private.stat().st_mode&0o077==0
        contents=private.read_text();code=re.search(r'admin-attiva=([a-f0-9]{64})',contents)[1]
        again=bootstrap();assert again.returncode==0 and code not in again.stdout and code not in again.stderr and private.read_text()==contents
        tc=request(admin,'session')['csrf']
        recovered=request(admin,'recover',{'username':'luca@perrone.it','code':code,'password':password},tc)
        assert not private.exists()
        logged=request(admin,'login',{'username':'luca@perrone.it','password':password},recovered['csrf']);tc=logged['csrf'];assert logged['role']=='admin'
        request(admin,'recover',{'username':'luca@perrone.it','code':code,'password':password},tc,401)
        for view in ['accounts','profiles','classes','duels']:
            data=request(admin,'admin-overview&view='+view)
            assert data['summary']['accounts']==4 and not any(key in json.dumps(data) for key in ['password_hash','recovery_hash','session_version','invite_hash'])
        assert request(admin,'class-link',{'club':club['id']},tc)['code']==club['code']
        # The admin enrolls an existing profile, preserving account and progress.
        enrollment={'club':club['id'],'member':pb,'consent':True}
        request(guest,'admin-class-add',enrollment,request(guest,'session')['csrf'],401)
        request(a,'admin-class-add',enrollment,ta,403)
        request(learner,'admin-class-add',enrollment,tl,403)
        request(admin,'admin-class-add',enrollment,'invalid',403)
        request(admin,'admin-class-add',expected=405)
        request(admin,'admin-class-add',{**enrollment,'consent':False},tc,400)
        request(admin,'admin-class-add',{**enrollment,'member':999999},tc,404)
        request(admin,'admin-class-add',{**enrollment,'club':999999},tc,404)
        request(admin,'admin-class-add',{**enrollment,'member':str(pb)},tc,400)
        duplicate=request(b,'create-profile',{'nickname':'docente'},tb)['id']
        request(admin,'admin-class-add',{**enrollment,'member':duplicate},tc,409)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            preserved={table:database.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in ['accounts','profiles','wallets']}
        added=request(admin,'admin-class-add',enrollment,tc)
        assert added['added'] is True and added['className']=='La nostra classe'
        assert request(admin,'admin-class-add',enrollment,tc)['added'] is False
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            assert preserved=={table:database.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in preserved}
            assert database.execute('SELECT COUNT(*) FROM club_profiles WHERE club_id=? AND profile_id=?',(club['id'],pb)).fetchone()[0]==1
        assert next(p for p in request(b,'class-invite&code='+club['code'])['profiles'] if p['id']==pb)['joined'] is True
        # A full class rejects new members, but re-submitting an existing one is safe.
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            owner=database.execute('SELECT account_id FROM profiles WHERE id=?',(pb,)).fetchone()[0]
            missing=100-database.execute('SELECT COUNT(*) FROM club_profiles WHERE club_id=?',(club['id'],)).fetchone()[0]
            fillers=[]
            for index in range(missing):
                synthetic=database.execute('INSERT INTO profiles(account_id,nickname,state) VALUES (?,?,?)',(owner,'Capacity_'+str(index),'{}')).lastrowid
                fillers.append(synthetic)
                database.execute('INSERT INTO club_profiles(club_id,profile_id) VALUES (?,?)',(club['id'],synthetic))
        request(b,'rename-profile',{'profile':duplicate,'nickname':'Another'},tb)
        request(admin,'admin-class-add',{**enrollment,'member':duplicate},tc,409)
        assert request(admin,'admin-class-add',enrollment,tc)['added'] is False
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            assert database.execute('SELECT COUNT(*) FROM club_profiles WHERE club_id=?',(club['id'],)).fetchone()[0]==100
            database.execute('PRAGMA foreign_keys=ON')
            database.executemany('DELETE FROM profiles WHERE id=?',[(pid,) for pid in fillers])
        request(b,'class-link',{'club':club['id']},tb,403)
        assert request(a,'managed-classes')['items'][0]['id']==club['id']
        all_reports=request(admin,'feedback-list&scope=all');assert all_reports['total']==2 and all('username' in row for row in all_reports['items'])
        request(admin,'feedback-status',{'id':feedback['id'],'status':'fixed'},tc)
        assert request(learner,'feedback-list')['items'][0]['status']=='fixed'
        request(admin,'feedback-status',{'id':feedback['id'],'status':'not-a-state'},tc,400)
        # Admin search is literal, private and paginated across the whole dataset.
        request(a,'admin-overview&view=profiles&q=Nuvola',expected=403)
        assert request(admin,'admin-overview&view=profiles&q=NUVOLA')['items'][0]['id']==pb
        assert request(admin,'admin-overview&view=classes&q=nostra')['items'][0]['id']==club['id']
        assert request(admin,'admin-overview&view=profiles&q='+urllib.parse.quote("' OR 1=1 --"))['total']==0
        assert request(admin,'admin-overview&view=profiles&q=%25')['total']==0
        request(admin,'admin-overview&q%5B%5D=bad',expected=400)
        request(admin,'admin-overview&q='+('x'*241),expected=400)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            owner=database.execute('SELECT account_id FROM profiles WHERE id=?',(pb,)).fetchone()[0]
            hidden=database.execute('INSERT INTO profiles(account_id,nickname,state) VALUES (?,"HiddenNeedle","{}")',(owner,)).lastrowid
            search_ids=[hidden]
            for index in range(25):search_ids.append(database.execute('INSERT INTO profiles(account_id,nickname,state) VALUES (?,?,?)',(owner,'Probe_'+str(index),'{}')).lastrowid)
        first=request(admin,'admin-overview&view=profiles&q=Probe_');second=request(admin,'admin-overview&view=profiles&q=Probe_&offset=20')
        assert first['total']==second['total']==25 and len(first['items'])==20 and len(second['items'])==5
        assert set(row['id'] for row in first['items']).isdisjoint(row['id'] for row in second['items'])
        assert request(admin,'admin-overview&view=profiles&q=HiddenNeedle')['items'][0]['id']==hidden
        assert request(admin,'admin-overview&view=profiles&q=ProbeX')['total']==0
        assert first['summary']['profiles']>first['total'] and first['query']=='Probe_'
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            database.execute('PRAGMA foreign_keys=ON');database.executemany('DELETE FROM profiles WHERE id=?',[(pid,) for pid in search_ids])
        database_path=temporary+'/data/wordyland.sqlite'
        with sqlite3.connect(database_path) as db:
            bid=db.execute('SELECT account_id FROM profiles WHERE id=?',(pb,)).fetchone()[0]
            for i in range(21):db.execute('INSERT INTO feedback(account_id,kind,title,body,screen,created_at,updated_at) VALUES (?,"idea",?,"Un suggerimento","island",1,1)',(bid,'Suggerimento '+str(i)))
            before=db.execute('SELECT password_hash,recovery_hash,session_version FROM accounts WHERE username="luca@perrone.it"').fetchone()
            db.execute('UPDATE accounts SET role="adult" WHERE username="luca@perrone.it"')
        assert request(admin,'feedback-list&scope=all',expected=403)
        assert bootstrap().returncode==0
        with sqlite3.connect(database_path) as db:
            after=db.execute('SELECT password_hash,recovery_hash,session_version FROM accounts WHERE username="luca@perrone.it"').fetchone()
        assert before[:2]==after[:2] and after[2]==before[2]+1
        assert request(admin,'session')['username'] is None
        tc=request(admin,'login',{'username':'luca@perrone.it','password':password},request(admin,'session')['csrf'])['csrf']
        assert len(request(admin,'feedback-list&scope=all&offset=20')['items'])==3
        assert request(a,'feedback-list')['total']==1
        request(b,'delete-account',{'password':password,'confirm':'ELIMINA'},tb)
        assert request(admin,'feedback-list&scope=all')['total']==2
        print('Community checks passed: email login, reserved owner identity, private one-time bootstrap, password preservation/session invalidation, server admin permissions, private pupil reports, status updates, pagination, class sharing and account-deletion cleanup.')
    finally:
        if timings:print('Community timing summary:',json.dumps({'requests':len(timings),'max':max(timings,key=lambda e:e['elapsed']),'register':[e for e in timings if e['action']=='register']},sort_keys=True),flush=True)

        server.terminate();server.wait(timeout=5);log.close()
