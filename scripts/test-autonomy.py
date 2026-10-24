"""Synthetic-only learning outcomes: help, errors, repeat writes and a second device."""
import http.cookiejar,json,os,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
with tempfile.TemporaryDirectory(prefix='wordyland-autonomy-') as tmp:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(tmp+'/server.log','w+')
    process=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(c,action,body=None,csrf='',expected=200):
        request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=c.open(request,timeout=8)
        except urllib.error.HTTPError as error:response=error
        result=json.loads(response.read());assert response.status==expected,(action,response.status,result);return result
    try:
        a,device,outsider,guest=client(),client(),client(),client();password='Autonomy-test-password-123'
        for _ in range(60):
            try:req(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        def register(c,name):
            csrf=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf']
            return req(c,'create-profile',{'nickname':name},csrf)['id'],csrf
        pid,ta=register(a,'luna_auto');other,to=register(outsider,'sole_auto')
        td=req(device,'login',{'username':'luna_auto','password':password},req(device,'session')['csrf'])['csrf']
        req(a,f'hub&profile={pid}');db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
        db.execute('INSERT INTO practice(profile_id,word,good,wrong) VALUES (?,?,?,?)',(pid,'legacy-test',17,2))
        db.execute('UPDATE wallets SET coins=91,xp=420 WHERE profile_id=?',(pid,));db.execute('DROP TABLE practice_outcomes');db.commit()
        req(a,f'hub&profile={pid}')
        assert db.execute('SELECT good,wrong FROM practice WHERE profile_id=? AND word=?',(pid,'legacy-test')).fetchone()==(17,2)
        assert db.execute('SELECT coins,xp FROM wallets WHERE profile_id=?',(pid,)).fetchone()==(91,420)
        assert db.execute('SELECT COUNT(*) FROM practice_outcomes').fetchone()[0]==0 # legacy autonomy remains unknown
        def start():return req(a,'quest-start',{'profile':pid,'category':'catpositions','activity':'pets'},ta)
        def outcomes(word):return db.execute('SELECT independent,assisted,corrected FROM practice_outcomes WHERE profile_id=? AND word=?',(pid,word)).fetchone() or (0,0,0)
        def focus_credit(word):return db.execute('SELECT p.good-COALESCE(o.observed,0)+COALESCE(o.independent,0) FROM practice p LEFT JOIN practice_outcomes o ON o.profile_id=p.profile_id AND o.word=p.word WHERE p.profile_id=? AND p.word=?',(pid,word)).fetchone()[0]
        assert focus_credit('legacy-test')==17
        def wallet():return db.execute('SELECT coins,xp FROM wallets WHERE profile_id=?',(pid,)).fetchone()
        def answer(c,csrf,quest,extra=None):return req(c,'quest-answer',{'profile':pid,'token':quest['token'],'step':0,'answer':quest['question']['word'],**(extra or {})},csrf)
        first=start();w=first['question']['word'];before=outcomes(w);result=answer(a,ta,first)
        assert result['independent'] is True and not result['assisted'] and not result['corrected']
        assert outcomes(w)==(before[0]+1,before[1],before[2])
        helped=start();w=helped['question']['word'];before=outcomes(w);balance=wallet();old_credit=focus_credit(w) if db.execute('SELECT 1 FROM practice WHERE profile_id=? AND word=?',(pid,w)).fetchone() else 0;payload={'profile':pid,'token':helped['token'],'step':0}
        req(guest,'quest-hint',payload,req(guest,'session')['csrf'],401)
        req(outsider,'quest-hint',payload,to,404);req(a,'quest-hint',payload,'bad',403)
        req(a,'quest-hint',payload,ta);req(a,'quest-hint',payload,ta) # retry is idempotent
        assert wallet()==balance and outcomes(w)==before
        resumed=req(device,f'quest-resume&profile={pid}&token='+helped['token']);assert resumed['question']['assisted'] is True
        result=answer(device,td,helped,{'assisted':False,'independent':True}) # cannot clear a recorded help
        assert result['independent'] is False and result['assisted'] is True and not result['corrected']
        assert outcomes(w)==(before[0],before[1]+1,before[2]) and focus_credit(w)==old_credit;confirmed=outcomes(w);paid=wallet()
        req(a,'quest-answer',{'profile':pid,'token':helped['token'],'step':0,'answer':w},ta,409)
        req(a,'quest-hint',payload,ta,409);assert outcomes(w)==confirmed and wallet()==paid
        resumed=req(a,f'quest-resume&profile={pid}&token='+helped['token']);assert resumed['step']==1 and not resumed['question'].get('assisted',False)
        corrected=start();w=corrected['question']['word'];before=outcomes(w)
        req(a,'quest-answer',{'profile':pid,'token':corrected['token'],'step':0,'answer':'synthetic wrong'},ta)
        snapshot=req(device,f'quest-resume&profile={pid}&token='+corrected['token']);assert snapshot['question']['hadErrors']
        result=answer(device,td,corrected);assert not result['independent'] and result['corrected'] and not result['assisted']
        assert outcomes(w)==(before[0],before[1],before[2]+1)
        both=start();w=both['question']['word'];before=outcomes(w)
        req(a,'quest-answer',{'profile':pid,'token':both['token'],'step':0,'answer':'synthetic wrong','assisted':True},ta)
        result=answer(a,ta,both,{'assisted':False});assert not result['independent'] and result['assisted'] and result['corrected']
        assert outcomes(w)==(before[0],before[1]+1,before[2]+1)
        # A help whose earlier write was interrupted is included atomically with the answer.
        interrupted=start();w=interrupted['question']['word'];before=outcomes(w)
        result=answer(a,ta,interrupted,{'assisted':True});assert not result['independent'] and result['assisted']
        assert outcomes(w)==(before[0],before[1]+1,before[2]);saved=outcomes(w);paid=wallet()
        # Simulate a lost reply: another device resumes the next step; replay cannot pay twice.
        assert req(device,f'quest-resume&profile={pid}&token='+interrupted['token'])['step']==1
        req(device,'quest-answer',{'profile':pid,'token':interrupted['token'],'step':0,'answer':w,'assisted':True},td,409)
        assert outcomes(w)==saved and wallet()==paid
        expired=start()
        db.execute('UPDATE quests SET created_at=0 WHERE token=?',(expired['token'],));db.commit()
        req(a,'quest-hint',{'profile':pid,'token':expired['token'],'step':0},ta,410)
        assert db.execute('SELECT good,wrong FROM practice WHERE profile_id=? AND word=?',(pid,'legacy-test')).fetchone()==(17,2)
        req(a,'delete-account',{'password':password,'confirm':'ELIMINA'},ta)
        assert db.execute('SELECT COUNT(*) FROM practice_outcomes WHERE profile_id=?',(pid,)).fetchone()[0]==0
        db.close()
        print('Autonomy API passed: additive legacy preservation, independent/helped/corrected outcomes, free idempotent hints, ownership/CSRF, second device, immutable help, clean next question, interrupted/lost replies no duplicate rewards and synthetic-account deletion cleanup.')
    finally:process.terminate();process.wait(timeout=5);log.close()
