"""Recently mistaken words must return to review without erasing earned progress."""
import http.cookiejar,json,os,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
with tempfile.TemporaryDirectory(prefix='wordyland-review-') as tmp:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(tmp+'/server.log','w+')
    server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(c,action,body=None,csrf='',expected=200):
        request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=c.open(request,timeout=8)
        except urllib.error.HTTPError as error:response=error
        result=json.loads(response.read());assert response.status==expected,(action,response.status,result);return result
    try:
        a,b=client(),client();password='Review-test-password-123'
        for _ in range(60):
            try:req(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        def register(c,name):
            csrf=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf']
            return req(c,'create-profile',{'nickname':name},csrf)['id'],csrf
        pid,ta=register(a,'luna_review');other,tb=register(b,'sole_review')
        def study(c,pid,csrf,words):
            req(c,'study-save',{'profile':pid,'title':'Scheda fittizia','words':words,'confirmed':True},csrf)
            return req(c,f'hub&profile={pid}')['studies'][0]['id']
        trio=study(a,pid,ta,[['head','testa','🙂'],['hand','mano','👋'],['leg','gamba','🦵']]);single=study(a,pid,ta,[['head','testa','🙂']]);other_trio=study(b,other,tb,[['head','testa','🙂'],['hand','mano','👋'],['leg','gamba','🦵']])
        req(a,f'hub&profile={pid}');db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
        # Simulate the preceding outcomes schema and a legitimately earned legacy mastery credit.
        db.execute('DROP TABLE practice_outcomes')
        db.execute('CREATE TABLE practice_outcomes(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,word TEXT,independent INTEGER NOT NULL DEFAULT 0,assisted INTEGER NOT NULL DEFAULT 0,corrected INTEGER NOT NULL DEFAULT 0,observed INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(profile_id,word))')
        for who in [pid,other]:
            for word,good in [('head',3),('hand',0),('leg',0)]:db.execute('INSERT INTO practice(profile_id,word,good,wrong) VALUES (?,?,?,1)',(who,word,good))
            db.execute('INSERT INTO practice_outcomes(profile_id,word,independent,observed) VALUES (?,"head",3,3)',(who,))
        db.execute('UPDATE wallets SET coins=30,xp=50 WHERE profile_id=?',(pid,));db.commit()
        def start(study_id,c=a,who=pid,csrf=ta):return req(c,'quest-start',{'profile':who,'study':study_id,'activity':'pets'},csrf)
        assert start(trio)['question']['word']!='head','Historical mastery credit is preserved before a new mistake'
        assert db.execute('SELECT good,wrong FROM practice WHERE profile_id=? AND word="head"',(pid,)).fetchone()==(3,1)
        assert db.execute('SELECT independent,observed FROM practice_outcomes WHERE profile_id=? AND word="head"',(pid,)).fetchone()==(3,3)
        assert db.execute('SELECT coins,xp FROM wallets WHERE profile_id=?',(pid,)).fetchone()==(30,50)
        wrong=start(single);payload={'profile':pid,'token':wrong['token'],'step':0}
        req(a,'quest-answer',{**payload,'answer':'hade'},ta)
        assert start(trio)['question']['word']=='head','A new mistake must outrank older review words, even after three successes'
        assert start(other_trio,b,other,tb)['question']['word']!='head','Review priorities stay profile-private'
        corrected=req(a,'quest-answer',{**payload,'answer':'head'},ta);assert corrected['corrected'] and not corrected['independent']
        assert start(trio)['question']['word']=='head','A correction still needs a later independent attempt'
        fresh=start(single);reply=req(a,'quest-answer',{'profile':pid,'token':fresh['token'],'step':0,'answer':'head'},ta);assert reply['independent']
        assert start(trio)['question']['word']!='head','A fresh independent answer clears the recent review flag'
        helped=start(single);hint={'profile':pid,'token':helped['token'],'step':0};before=db.execute('SELECT coins,xp FROM wallets WHERE profile_id=?',(pid,)).fetchone()
        req(a,'quest-hint',hint,ta);req(a,'quest-hint',hint,ta)
        assert db.execute('SELECT coins,xp FROM wallets WHERE profile_id=?',(pid,)).fetchone()==before
        assert start(trio)['question']['word']=='head','Asking for help also reopens focused practice without removing credits'
        guided=req(a,'quest-answer',{**hint,'answer':'head'},ta);assert guided['assisted'] and not guided['independent']
        assert start(trio)['question']['word']=='head'
        fresh=start(single);req(a,'quest-answer',{'profile':pid,'token':fresh['token'],'step':0,'answer':'head'},ta)
        assert start(trio)['question']['word']!='head'
        assert db.execute('SELECT independent FROM practice_outcomes WHERE profile_id=? AND word="head"',(pid,)).fetchone()[0]==5
        db.close()
        print('Review API passed: warm additive migration, preserved historical credit/wallet, recent errors/help prioritized, correction versus fresh success, profile isolation, idempotent free help and unchanged earned credits.')
    finally:server.terminate();server.wait(timeout=5);log.close()
