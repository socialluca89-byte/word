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
    def request(session,action,body=None,csrf='',expected=200):
        req=urllib.request.Request(base+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        started=time.monotonic()
        try:response=session.open(req,timeout=5)
        except urllib.error.HTTPError as error:response=error
        except (TimeoutError,urllib.error.URLError):
            # Synthetic fixture diagnostic only: never print bodies, usernames or tokens.
            cpu=Path('/sys/fs/cgroup/cpu.stat')
            counters={line.split()[0]:int(line.split()[1]) for line in cpu.read_text().splitlines()} if cpu.is_file() else {}
            print('Community request diagnostic:',json.dumps({'action':action.split('&')[0],'method':'POST' if body is not None else 'GET','elapsed':round(time.monotonic()-started,3),'cpu_throttled_total_usec':counters.get('throttled_usec')},sort_keys=True),flush=True)
            raise
        data=response.read().decode();assert response.status==expected,(action,response.status,data)
        return json.loads(data)
    def bootstrap():
        return subprocess.run(php+['scripts/bootstrap-admin.php'],env=dict(os.environ,WORDYLAND_BOOTSTRAP_DATA=temporary+'/data'),capture_output=True,text=True)
    try:
        a,b,learner,admin,guest=[client() for _ in range(5)]
        for _ in range(50):
            try:request(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        password='Community-test-password-123'
        def register(c,name):
            token=request(c,'session')['csrf'];result=request(c,'register',{'username':name,'password':password,'adult':True,'role':'admin'},token)
            assert result['role']=='adult'
            profile=request(c,'create-profile',{'nickname':'Docente'},result['csrf'])['id']
            return result['csrf'],profile
        ta,pa=register(a,'teacher_'+secrets.token_hex(3)+'@example.test');tb,pb=register(b,'another_'+secrets.token_hex(3))
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
        request(b,'class-link',{'club':club['id']},tb,403)
        assert request(a,'managed-classes')['items'][0]['id']==club['id']
        all_reports=request(admin,'feedback-list&scope=all');assert all_reports['total']==2 and all('username' in row for row in all_reports['items'])
        request(admin,'feedback-status',{'id':feedback['id'],'status':'fixed'},tc)
        assert request(learner,'feedback-list')['items'][0]['status']=='fixed'
        request(admin,'feedback-status',{'id':feedback['id'],'status':'not-a-state'},tc,400)
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
        server.terminate();server.wait(timeout=5);log.close()
