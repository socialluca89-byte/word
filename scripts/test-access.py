"""Password changes, recovery, logout and other-session invalidation on a disposable server."""
import http.cookiejar,json,os,shlex,socket,subprocess,tempfile,time,urllib.error,urllib.request
with tempfile.TemporaryDirectory(prefix='wordyland-access-') as tmp:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(tmp+'/server.log','w+')
    process=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(c,action,body=None,csrf='',expected=200):
        r=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=c.open(r,timeout=6)
        except urllib.error.HTTPError as e:response=e
        data=json.loads(response.read());assert response.status==expected,(action,response.status,data);return data
    try:
        a,b,guest=client(),client(),client();old='Access-old-password-123';new='Access-new-password-123';reset='Access-reset-password-123'
        for _ in range(60):
            try:req(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        tc=req(guest,'session')['csrf'];req(guest,'change-password',{'password':old,'newPassword':new,'confirmPassword':new},tc,401)
        account=req(a,'register',{'username':'access_test','password':old,'adult':True},req(a,'session')['csrf']);ta=account['csrf'];recovery=account['recovery']
        pid=req(a,'create-profile',{'nickname':'Luna'},ta)['id'];club=req(a,'club-create',{'profile':pid,'name':'Classe accesso','consent':True},ta)
        quest=req(a,'quest-start',{'profile':pid,'category':'body'},ta);q=quest['question']
        while True:
            answer=q['word']
            if q['kind'] in ['missing','gap']:
                start=q['mask'].index('_');end=start
                while end<len(q['mask']) and q['mask'][end]=='_':end+=1
                answer=answer[start:end]
            result=req(a,'quest-answer',{'profile':pid,'token':quest['token'],'step':q['number']-1,'answer':answer},ta)
            if result['done']:break
            q=result['question']
        before=req(a,f'hub&profile={pid}')['wallet']
        tb=req(b,'login',{'username':'access_test','password':old},req(b,'session')['csrf'])['csrf'];req(b,f'profile&id={pid}')
        body={'password':old,'newPassword':new,'confirmPassword':new}
        req(a,'change-password',body,'bad',403);req(a,'change-password',{**body,'password':'wrong'},ta,401)
        req(a,'change-password',{**body,'newPassword':'short'},ta,400);req(a,'change-password',{**body,'confirmPassword':old},ta,400)
        ta=req(a,'change-password',body,ta)['csrf'];assert req(a,'session')['username']=='access_test'
        assert req(a,f'hub&profile={pid}')['wallet']==before
        req(b,f'profile&id={pid}',expected=401);assert req(b,'session')['username'] is None
        req(b,'login',{'username':'access_test','password':old},req(b,'session')['csrf'],401)
        req(b,'login',{'username':'access_test','password':new},req(b,'session')['csrf'])
        req(a,'logout',{},ta);assert req(a,'session')['username'] is None
        recovered=req(a,'recover',{'username':'access_test','code':recovery,'password':reset},req(a,'session')['csrf']);assert recovered['recovery']!=recovery
        req(b,f'profile&id={pid}',expected=401)
        req(a,'recover',{'username':'access_test','code':recovery,'password':reset},recovered['csrf'],401)
        ta=req(a,'login',{'username':'access_test','password':reset},req(a,'session')['csrf'])['csrf'];assert req(a,f'hub&profile={pid}')['wallet']==before
        pupil=client();tp=req(pupil,'session')['csrf'];enrolled=req(pupil,'class-register',{'code':club['code'],'nickname':'Stellina','password':old,'consent':True},tp);tp=enrolled['csrf'];child=enrolled['profiles'][0]['id']
        tp=req(pupil,'change-password',body,tp)['csrf'];assert req(pupil,'session')['role']=='learner';req(pupil,f'profile&id={child}')
        req(pupil,'logout',{},tp);tp=req(pupil,'session')['csrf'];req(pupil,'class-login',{'code':club['code'],'nickname':'Stellina','password':old},tp,401)
        signed=req(pupil,'class-login',{'code':club['code'],'nickname':'Stellina','password':new},tp);assert signed['profiles'][0]['id']==child
        print('Access API passed: authenticated password changes, current/confirmation validation, CSRF, other-device invalidation, preserved profile/wallet/class, logout, recovery rotation and learner password changes.')
    finally:process.terminate();process.wait(timeout=5);log.close()
