"""Ready classmates precede the100-result cap; disposable local profiles only."""
import http.cookiejar,json,os,secrets,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
with tempfile.TemporaryDirectory(prefix='wordyland-arena-capacity-') as temp:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(temp+'/server.log','w+')
    server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+temp,'-S','127.0.0.1:'+str(port),'-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=temp+'/data'),stdout=log,stderr=log)
    def req(action,body=None,csrf='',status=200):
        request=urllib.request.Request('http://127.0.0.1:'+str(port)+'/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=opener.open(request,timeout=5)
        except urllib.error.HTTPError as e:response=e
        with response:
            data=json.loads(response.read());assert response.status==status,(action,response.status,data);return data
    db=None
    try:
        for _ in range(80):
            try:csrf=req('session')['csrf'];break
            except urllib.error.URLError:time.sleep(.03)
        csrf=req('register',{'username':'capacity_'+secrets.token_hex(5),'password':'Capacity-synthetic-password-123','adult':True},csrf)['csrf']
        me=req('create-profile',{'nickname':'Synthetic player'},csrf)['id']
        classes=[req('club-create',{'profile':me,'name':'Synthetic group '+str(i),'consent':True},csrf)['id'] for i in range(2)]
        req('arena&profile='+str(me))
        db=sqlite3.connect(temp+'/data/wordyland.sqlite')
        other=db.execute('INSERT INTO accounts(username,password_hash,created_at,role) VALUES(?,?,?,?)',('capacity_other','synthetic-unusable-hash',int(time.time()),'learner')).lastrowid
        ids=[]
        for i in range(122):
            name='A'+str(i).zfill(3) if i<119 else ['Zzz Ready','Zzz Stale','Zzz Invalid'][i-119]
            pid=db.execute('INSERT INTO profiles(account_id,nickname,state) VALUES(?,?,?)',(other,name,'{}')).lastrowid;ids.append(pid)
            db.execute('INSERT INTO club_profiles(club_id,profile_id) VALUES(?,?)',(classes[i%2],pid))
        db.execute('INSERT INTO club_profiles(club_id,profile_id) VALUES(?,?)',(classes[1],ids[0]))
        for i,pid,version,last_seen in [(0,ids[119],0,int(time.time())),(1,ids[120],0,int(time.time())-91),(2,ids[121],999,int(time.time()))]:
            db.execute('INSERT INTO online_presence(session_key,tab_key,profile_id,session_version,state,last_seen) VALUES(?,?,?,?,?,?)',('synthetic-session-'+str(i),'synthetic-tab-'+str(i),pid,version,'ready',last_seen))
        db.commit()
        data=req('arena&profile='+str(me));peers=data['opponents'];assert len(peers)==100 and len({p['id'] for p in peers})==100
        assert peers[0]['id']==ids[119] and peers[0]['presence']=='ready','Ready late-sorting classmate must be included before cap'
        assert ids[120] not in {p['id'] for p in peers} and ids[121] not in {p['id'] for p in peers},'Stale/invalid sessions must not gain priority'
        req('arena&profile='+str(ids[119]),status=404)
        db.execute('DELETE FROM online_presence');db.commit();peers=req('arena&profile='+str(me))['opponents'];assert len(peers)==100 and all(p['presence']=='offline' for p in peers)
        assert ids[119] not in {p['id'] for p in peers},'Offline alphabetical cap remains deterministic'
        print('Arena capacity passed:122classmates/two groups, ready priority before100cap, duplicate membership deduped, stale/version-invalid presence excluded, owned-profile isolation, offline fallback.')
    finally:
        if db is not None:db.close()
        server.terminate()
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill();server.wait(timeout=5)
        log.close()
