"""Authenticated presence, class roster scope, multi-tab expiry and session cleanup."""
import http.cookiejar,json,os,secrets,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path
with tempfile.TemporaryDirectory(prefix='wordyland-presence-') as temporary:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(temporary+'/server.log','w+')
    server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+temporary,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=temporary+'/data'),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(c,action,body=None,csrf='',expected=200):
        req=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:r=c.open(req,timeout=6)
        except urllib.error.HTTPError as error:r=error
        text=r.read().decode();assert r.status==expected,(action,r.status,text);return json.loads(text)
    try:
        a,b,c,guest,admin=[client() for _ in range(5)];password='Presence-test-password-123'
        for _ in range(50):
            try:request(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        def register(session,name):
            token=request(session,'session')['csrf'];token=request(session,'register',{'username':name,'password':password,'adult':True},token)['csrf']
            return request(session,'create-profile',{'nickname':name},token)['id'],token
        pa,ta=register(a,'Luna');pb,tb=register(b,'Sole');pc,tc=register(c,'Nuvola')
        club=request(a,'club-create',{'profile':pa,'name':'Classe Uno','consent':True},ta);request(b,'club-join',{'profile':pb,'code':club['code'],'consent':True},tb)
        secret=request(c,'club-create',{'profile':pc,'name':'Classe Privata','consent':True},tc);request(b,'club-join',{'profile':pb,'code':secret['code'],'consent':True},tb)
        # A shared peer's other class must not be disclosed.
        roster=request(a,'roster');assert {x['id'] for x in roster['items']}=={pa,pb};assert 'Classe Privata' not in json.dumps(roster)
        assert 'username' not in json.dumps(roster) and 'account_created_at' not in json.dumps(roster)
        request(a,'roster&scope=all',expected=403);request(a,'roster&filter=today',expected=403);request(guest,'roster',expected=401)
        payload={'profile':pb,'tab':'a'*32,'state':'ready'}
        request(guest,'presence-heartbeat',payload,request(guest,'session')['csrf'],401)
        request(b,'presence-heartbeat',payload,'bad',403);request(a,'presence-heartbeat',payload,ta,404)
        request(b,'presence-heartbeat',{**payload,'state':'unknown'},tb,400);request(b,'presence-heartbeat',{**payload,'tab':'bad'},tb,400)
        request(b,'presence-heartbeat',payload,tb)
        arena=request(a,f'arena&profile={pa}');assert arena['opponents'][0]['presence']=='ready'
        assert request(a,'roster&filter=online')['counts']['online']==1
        # Any busy foreground tab wins over ready; removing it preserves the other tab.
        request(b,'presence-heartbeat',{**payload,'tab':'b'*32,'state':'busy'},tb)
        assert request(a,f'arena&profile={pa}')['opponents'][0]['presence']=='busy'
        request(b,'presence-leave',{**payload,'tab':'b'*32},tb)
        assert request(a,f'arena&profile={pa}')['opponents'][0]['presence']=='ready'
        # An expired presence must become offline without waiting in real time.
        database=temporary+'/data/wordyland.sqlite'
        with sqlite3.connect(database) as db:db.execute('UPDATE online_presence SET last_seen=?',(int(time.time())-91,))
        assert request(a,f'arena&profile={pa}')['opponents'][0]['presence']=='offline'
        request(b,'presence-heartbeat',payload,tb);request(b,'logout',{},tb)
        assert request(a,f'arena&profile={pa}')['opponents'][0]['presence']=='offline'
        tb=request(b,'login',{'username':'Sole','password':password},request(b,'session')['csrf'])['csrf'];request(b,'presence-heartbeat',payload,tb)
        # Session-version invalidation must invalidate presence immediately.
        with sqlite3.connect(database) as db:db.execute('UPDATE accounts SET session_version=session_version+1 WHERE id=(SELECT account_id FROM profiles WHERE id=?)',(pb,))
        assert request(a,f'arena&profile={pa}')['opponents'][0]['presence']=='offline'
        request(b,'presence-heartbeat',payload,tb,403)
        tb=request(b,'login',{'username':'Sole','password':password},request(b,'session')['csrf'])['csrf'];request(b,'presence-heartbeat',payload,tb)
        # Global roster is available only after a server-side admin grant.
        with sqlite3.connect(database) as db:db.execute('UPDATE accounts SET role="admin" WHERE id=(SELECT account_id FROM profiles WHERE id=?)',(pa,))
        all_people=request(a,'roster&scope=all');assert all_people['counts']['registered']==3 and all_people['counts']['online']==1
        assert any(p['username']=='nuvola' for p in all_people['items']);assert request(a,'roster&scope=all&filter=today')['total']==0
        assert not any(secret in json.dumps(all_people) for secret in ['session_key','tab_key','session_version','last_seen','password_hash','recovery_hash'])
        # Learner signup today is counted in the Italian day and stays class-scoped.
        learner=client();tl=request(learner,'session')['csrf'];joined=request(learner,'class-register',{'code':club['code'],'nickname':'Stellina','password':password,'consent':True},tl);pl=joined['profiles'][0]['id'];tl=joined['csrf']
        today=request(a,'roster&scope=all&filter=today');assert today['total']==1 and today['items'][0]['id']==pl
        request(learner,'roster&scope=all',expected=403);assert pc not in [p['id'] for p in request(learner,'roster')['items']]
        request(learner,'presence-heartbeat',{'profile':pl,'tab':'c'*32,'state':'online'},tl)
        # Cap simultaneous tabs per authenticated session without trusting profile IDs.
        for n in range(7):request(learner,'presence-heartbeat',{'profile':pl,'tab':f'{n:032x}','state':'online'},tl)
        request(learner,'presence-heartbeat',{'profile':pl,'tab':'d'*32,'state':'online'},tl,429)
        # Deleting a profile also deletes its leases.
        request(b,'delete-profile',{'profile':pb,'password':password,'confirm':'ELIMINA'},tb)
        with sqlite3.connect(database) as db:assert db.execute('SELECT COUNT(*) FROM online_presence WHERE profile_id=?',(pb,)).fetchone()[0]==0
        print('Presence checks passed: authentication/CSRF/ownership, shared-class-only names, private class/email isolation, global admin/today filters, per-tab busy/ready states, expiry, logout, session invalidation, tab cap and deletion cleanup.')
    finally:
        server.terminate();server.wait(timeout=5);log.close()
