"""Equivalent vocabulary stays playable but never appears as a wrong distractor."""
import http.cookiejar,json,os,pathlib,shlex,shutil,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
banks={
 'hello':[['hello','ciao','👋'],['hi','ciao','👋'],['one','uno','1'],['two','due','2']],
 'penpositions':[["it's by the book",'vicino al libro','🖊️'],["it's next to the book",'accanto al libro','🖊️'],["it's on the book",'sopra il libro','🖊️'],["it's under the book",'sotto il libro','🖊️']]
}
aliases={'hello':'hi','hi':'hello',"it's by the book":"it's next to the book","it's next to the book":"it's by the book"}
def fair(answer,options):
    assert answer in options and len(options)==len(set(options))
    if answer in aliases:assert aliases[answer] not in options,'Equivalent expression offered as a wrong answer'
    assert not ('hello' in options and 'hi' in options)
    assert not ("it's by the book" in options and "it's next to the book" in options)
with tempfile.TemporaryDirectory(prefix='wordyland-choice-') as tmp:
    public=pathlib.Path(tmp)/'public';shutil.copytree('dist',public)
    # Small synthetic banks guarantee both equivalents are exercised, without modifying repository content.
    curriculum=json.loads((public/'curriculum.json').read_text());curriculum.update(banks);(public/'curriculum.json').write_text(json.dumps(curriculum))
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(tmp+'/server.log','w+')
    server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t',str(public)],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(c,action,body=None,csrf='',expected=200):
        request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=c.open(request,timeout=8)
        except urllib.error.HTTPError as error:response=error
        result=json.loads(response.read());assert response.status==expected,(action,response.status,result);return result
    try:
        a,b=client(),client();password='Choice-test-password-123'
        for _ in range(60):
            try:req(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        def register(c,name):
            csrf=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf']
            return req(c,'create-profile',{'nickname':name},csrf)['id'],csrf
        pid,ta=register(a,'choice_luna');other,tb=register(b,'choice_sole');req(a,f'hub&profile={pid}');db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
        for topic,bank in banks.items():
            req(a,'study-save',{'profile':pid,'title':topic,'words':bank,'confirmed':True},ta)
            study=req(a,f'hub&profile={pid}')['studies'][0]['id']
            for target in [bank[0][0],bank[1][0]]:
                for row in bank:db.execute('INSERT INTO practice(profile_id,word,good,wrong) VALUES (?,?,?,1) ON CONFLICT(profile_id,word) DO UPDATE SET good=excluded.good,wrong=1',(pid,row[0],0 if row[0]==target else 3))
                db.commit();q=req(a,'quest-start',{'profile':pid,'study':study},ta)['question'];assert q['word']==target
                fair(target,[row[0] for row in q['options']])
        club=req(a,'club-create',{'profile':pid,'name':'Classe fittizia','consent':True},ta)
        req(b,'club-join',{'profile':other,'code':club['code'],'consent':True},tb)
        for topic,bank in banks.items():
            duel=req(a,'duel-create',{'profile':pid,'opponent':other,'category':topic},ta)['duel']['id']
            questions=json.loads(db.execute('SELECT questions FROM duels WHERE id=?',(duel,)).fetchone()[0]);assert len(questions)==4
            assert {q['answer'] for q in questions}=={row[0] for row in bank},'Keep every vocabulary target, including both equivalents'
            for q in questions:fair(q['answer'],q['options'])
            req(b,'duel-accept',{'profile':other,'duel':duel},tb)
            for step,q in enumerate(questions):
                actual=req(a,f'duel&profile={pid}&duel={duel}')['question'];assert actual['options']==q['options']
                result=req(a,'duel-answer',{'profile':pid,'duel':duel,'step':step,'answer':q['options'].index(q['answer'])},ta)
                assert result['correct'] and result['duel']['score']==10*(step+1)
        db.close()
        print('Choice fairness API passed: hello/hi and by/next-to remain available as targets, never as wrong equivalents, unique choice meanings, personal missions, class duels, public choices and unchanged scoring. Synthetic banks only.')
    finally:server.terminate();server.wait(timeout=5);log.close()
