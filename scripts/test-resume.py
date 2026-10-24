"""Progress survives new sessions/devices, expiry and rejected duplicate answers."""
import http.cookiejar,json,os,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
with tempfile.TemporaryDirectory(prefix='wordyland-resume-') as temporary:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(temporary+'/server.log','w+');server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+temporary,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=temporary+'/data'),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(c,action,body=None,csrf='',expected=200):
        req=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:r=c.open(req,timeout=6)
        except urllib.error.HTTPError as e:r=e
        text=r.read().decode();assert r.status==expected,(action,r.status,text);return json.loads(text)
    try:
        a,b,guest=client(),client(),client();password='Resume-tests-password-123'
        for _ in range(50):
            try:request(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        def register(c,name):
            csrf=request(c,'session')['csrf'];csrf=request(c,'register',{'username':name,'password':password,'adult':True},csrf)['csrf'];return request(c,'create-profile',{'nickname':name},csrf)['id'],csrf
        pa,ta=register(a,'luna');pb,tb=register(b,'sole')
        q=request(a,'quest-start',{'profile':pa,'category':'mousepositions','activity':'pets'},ta);token=q['token']
        snapshot=request(a,f'quest-resume&profile={pa}&token={token}');assert snapshot['step']==0 and snapshot['source']=='mousepositions' and snapshot['question']==q['question']
        request(guest,f'quest-resume&profile={pa}&token={token}',expected=401);request(b,f'quest-resume&profile={pa}&token={token}',expected=404);request(b,f'quest-resume&profile={pb}&token={token}',expected=404)
        first=q['question'];result=request(a,'quest-answer',{'profile':pa,'token':token,'step':0,'answer':first['word']},ta);assert result['correct']
        request(a,'quest-answer',{'profile':pa,'token':token,'step':0,'answer':first['word']},ta,409)
        pending=request(a,f'pending-games&profile={pa}');assert pending['quests'][0]['step']==1 and 'questions' not in json.dumps(pending)
        assert request(b,f'pending-games&profile={pb}')['quests']==[]
        device=client();td=request(device,'session')['csrf'];td=request(device,'login',{'username':'luna','password':password},td)['csrf'];continued=request(device,f'quest-resume&profile={pa}&token={token}');assert continued['question']==result['question'] and continued['step']==1
        # Missions survive an overnight break, without extending expiry on reads.
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:db.execute('UPDATE quests SET created_at=? WHERE token=?',(int(time.time())-172800,token))
        continued=request(device,f'quest-resume&profile={pa}&token={token}');assert continued['step']==1
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:db.execute('UPDATE quests SET source="" WHERE token=?',(token,))
        assert request(device,f'quest-resume&profile={pa}&token={token}')['source']=='mousepositions'
        while True:
            question=continued['question'];kind=question['kind'];answer=question['word']
            if kind in ['missing','gap']:
                start=question['mask'].index('_');end=start
                while end<len(question['mask']) and question['mask'][end]=='_':end+=1
                answer=question['word'][start:end]
            continued=request(device,'quest-answer',{'profile':pa,'token':token,'step':question['number']-1,'answer':answer},td);assert continued['correct']
            if continued['done']:break
        request(device,f'quest-resume&profile={pa}&token={token}',expected=409);assert request(device,f'pending-games&profile={pa}')['quests']==[]
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:assert db.execute('SELECT COUNT(*) FROM rewards WHERE token=?',(token,)).fetchone()[0]==1
        expired=request(a,'quest-start',{'profile':pa,'category':'body','activity':'pets'},ta)['token']
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:db.execute('UPDATE quests SET created_at=0 WHERE token=?',(expired,))
        request(a,f'quest-resume&profile={pa}&token={expired}',expected=410);assert request(a,f'pending-games&profile={pa}')['quests']==[]
        club=request(a,'club-create',{'profile':pa,'name':'Classe','consent':True},ta);request(b,'club-join',{'profile':pb,'code':club['code'],'consent':True},tb)
        duel=request(a,'duel-create',{'profile':pa,'opponent':pb,'category':'body'},ta)['duel']['id'];request(b,'duel-accept',{'profile':pb,'duel':duel},tb)
        request(a,'duel-answer',{'profile':pa,'duel':duel,'step':0,'answer':0},ta)
        assert request(device,f'pending-games&profile={pa}')['duels'][0]['step']==1
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:db.execute('DELETE FROM club_profiles WHERE profile_id=?',(pb,))
        assert request(device,f'pending-games&profile={pa}')['duels']==[]
        print('Resume checks passed: owner-only pending/resume APIs, exact next question, second device, overnight continuity, seven-day expiry, duplicate-answer/reward protection and class-scoped duels.')
    finally:server.terminate();server.wait(timeout=5);log.close()
