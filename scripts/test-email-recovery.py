"""Opt-in recovery tests. Every account, email and message here is synthetic."""
import glob, hashlib, http.cookiejar, json, os, shlex, socket, sqlite3, subprocess, tempfile, time, urllib.error, urllib.request

def suite(enabled):
    with tempfile.TemporaryDirectory(prefix='wordyland-email-') as tmp:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        log=open(tmp+'/server.log','w+')
        process=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_TEST_MAIL='1' if enabled else '0',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
        def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        def req(c,action,body=None,csrf='',expected=200):
            request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
            try:response=c.open(request,timeout=10)
            except urllib.error.HTTPError as error:response=error
            data=json.loads(response.read());assert response.status==expected,(action,response.status,data);return data
        try:
            a,b,guest=client(),client(),client()
            for _ in range(60):
                try:req(a,'session');break
                except urllib.error.URLError:time.sleep(.05)
            csrf=req(guest,'session')['csrf'];email='recovery@example.test';old='Email-old-password-123';new='Email-new-password-123'
            assert req(guest,'auth-capabilities')['emailRecoveryEnabled']==enabled
            if not enabled:
                for address in [email,'unknown@example.test']:
                    req(guest,'email-recovery-request',{'email':address},csrf,503)
                assert not glob.glob(tmp+'/data/mail-test-outbox/*')
                def owner_status():
                    result=subprocess.run(shlex.split(os.environ.get('PHP_COMMAND','php'))+['scripts/owner-recovery-status.php'],env=dict(os.environ,WORDYLAND_BOOTSTRAP_DATA=tmp+'/data'),capture_output=True,text=True,check=True)
                    return json.loads(result.stdout)
                assert owner_status()=={'ownerExists':False,'ownerIsAdmin':False,'privateActivationAvailable':False}
                db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
                db.execute('INSERT INTO accounts(username,password_hash,created_at,role) VALUES (?,?,?,?)',('luca@perrone.it','synthetic-unused-hash',int(time.time()),'admin'));db.commit()
                with open(tmp+'/data/admin-activation.txt','w') as fixture:fixture.write('synthetic activation contents never printed')
                before=db.execute('SELECT * FROM accounts').fetchall()
                assert owner_status()=={'ownerExists':True,'ownerIsAdmin':True,'privateActivationAvailable':True}
                assert db.execute('SELECT * FROM accounts').fetchall()==before
                db.close()
                return
            account=req(a,'register',{'username':email,'password':old,'adult':True},req(a,'session')['csrf']);ca=account['csrf']
            pid=req(a,'create-profile',{'nickname':'Test Luna'},ca)['id']
            profile=req(a,f'profile&id={pid}')
            cb=req(b,'login',{'username':email,'password':old},req(b,'session')['csrf'])['csrf']
            req(guest,'email-recovery-request',{'email':email},'bad',403)
            first=req(guest,'email-recovery-request',{'email':email},csrf)
            unknown=req(guest,'email-recovery-request',{'email':'unknown@example.test'},csrf)
            assert first==unknown and len(glob.glob(tmp+'/data/mail-test-outbox/*'))==1
            def tokens():
                return [json.load(open(path))['url'].split('=')[1] for path in glob.glob(tmp+'/data/mail-test-outbox/*')]
            token=tokens()[0];db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
            assert db.execute('SELECT token_hash FROM password_reset_tokens').fetchone()[0]==hashlib.sha256(token.encode()).hexdigest()
            assert req(a,'session')['username']==email # requesting a link never changes access
            body={'token':token,'password':new,'confirmPassword':new}
            req(guest,'email-recovery-confirm',body,'bad',403)
            req(guest,'email-recovery-confirm',{**body,'confirmPassword':old},csrf,400)
            req(guest,'email-recovery-confirm',{**body,'token':'0'*64},csrf,401)
            db.execute('UPDATE password_reset_tokens SET expires=?',(int(time.time())-1,));db.commit()
            req(guest,'email-recovery-confirm',body,csrf,401)
            req(guest,'email-recovery-request',{'email':email},csrf)
            token2=next(t for t in tokens() if t!=token)
            # A password change makes pending mail links stale.
            ca=req(a,'change-password',{'password':old,'newPassword':new,'confirmPassword':new},ca)['csrf']
            req(guest,'email-recovery-confirm',{**body,'token':token2},csrf,401)
            req(guest,'email-recovery-request',{'email':email},csrf)
            token3=next(t for t in tokens() if t not in [token,token2])
            result=req(guest,'email-recovery-confirm',{**body,'token':token3},csrf);csrf=result['csrf']
            req(guest,'email-recovery-confirm',{**body,'token':token3},csrf,401)
            for c in [a,b]:assert req(c,'session')['username'] is None
            ca=req(a,'login',{'username':email,'password':new},req(a,'session')['csrf'])['csrf']
            assert req(a,f'profile&id={pid}')==profile
            # Email reset preserves the existing private recovery code and profile.
            req(guest,'recover',{'username':email,'code':account['recovery'],'password':old},csrf)
            assert db.execute('SELECT COUNT(*) FROM password_reset_tokens').fetchone()[0]==0
            for _ in range(2):req(guest,'email-recovery-request',{'email':email},req(guest,'session')['csrf'])
            req(guest,'email-recovery-request',{'email':email},req(guest,'session')['csrf'],429)
            for _ in range(5):req(guest,'email-recovery-request',{'email':'limited@example.test'},req(guest,'session')['csrf'])
            req(guest,'email-recovery-request',{'email':'limited@example.test'},req(guest,'session')['csrf'],429)
            db.close()
        finally:process.terminate();process.wait(timeout=5);log.close()
suite(False)
suite(True)
print('Email recovery passed: disabled by default, CSRF, uniform responses, hashed tokens, expiry, password-change invalidation, single use, session revocation, preserved profiles/recovery codes and limits. Synthetic outbox only; real delivery not tested.')
