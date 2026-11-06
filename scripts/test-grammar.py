"""Classroom grammar against disposable localhost PHP/SQLite; no production or real learner data."""
from pathlib import Path
import http.cookiejar,io,json,math,os,secrets,shlex,socket,sqlite3,subprocess,tarfile,tempfile,time,urllib.error,urllib.request

content=json.loads(Path('dist/training.json').read_text())
grammar=content['grammarLessons'];packs={p['id']:p for p in grammar['packs']};nouns={n['id']:n for n in grammar['nouns']}
assert set(packs)=={'number','plurals','articles','sentences','questions'} and len(nouns)==16
cases={c['id']:c for p in packs.values() for c in p['cases']}
assert len(cases)==40
# A narrow comparison contract for the new track; legacy comparison is not changed.
comparison_cases=[
    ({'mode':'grammar-choice','answer':'Yes, it is.','aliases':[]}, '  YES,it IS!  ', True),
    ({'mode':'grammar-choice','answer':'Yes, it is.','aliases':[]}, 'Yes,it is.,', True),
    ({'mode':'grammar-choice','answer':'Yes, it is.','aliases':[]}, 'Yes,it is.\u00a0', True),
    ({'mode':'grammar-choice','answer':'Yes, it is.','aliases':[]}, "Yes, it's.", False),
    ({'mode':'grammar-choice','answer':"No, it isn't.",'aliases':['No, it is not.',"No, it's not."]}, ' NO,it ISN’T! ', True),
    ({'mode':'grammar-choice','answer':"No, it isn't.",'aliases':['No, it is not.',"No, it's not."]}, "No, it's not.", True),
    ({'mode':'grammar-build','answer':'Is it a pen?','aliases':[]}, 'It is a pen.', False),
    ({'mode':'grammar-build','answer':'Is it a pen?','aliases':[]}, ' IS   it a pen! ', True),
    ({'mode':'grammar-write','answer':'book bags','aliases':['bookbags']}, 'Bookbags.', True),
    ({'mode':'grammar-write','answer':'book bags','aliases':['bookbags']}, 'book bag', False),
    ({'mode':'grammar-write','answer':'book','aliases':[]}, 'bo.ok', False),
    ({'mode':'grammar-choice','answer':'an','aliases':[]}, 'a', False),
]
php=r"""define('WORDYLAND_BOOTSTRAPPED',true);$action='not-training';require 'dist/training.php';$tests=json_decode(stream_get_contents(STDIN),true);foreach($tests as [$q,$answer,$expected]){if(trainingGrammarCorrect($q,$answer)!==$expected){fwrite(STDERR,'Grammar comparison failed');exit(1);}}echo 'Grammar comparison cases passed';"""
comparison=subprocess.run(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-r',php],input=json.dumps(comparison_cases),text=True,capture_output=True,timeout=10)
assert comparison.returncode==0,(comparison.stdout,comparison.stderr)
expected_phases={'number':['model','number'],'plurals':['model','plural-choice','plural-write'],'articles':['model','article'],'sentences':['model','sentence'],'questions':['model','question-build','short-answer']}
expected_skills={'model':'model.explore','number':'grammar.number','plural-choice':'grammar.plural.recognize','plural-write':'grammar.plural.write','article':'grammar.article','sentence':'grammar.sentence.compose','question-build':'grammar.question.compose','short-answer':'grammar.question.answer'}
with tempfile.TemporaryDirectory(prefix='wordyland-grammar-') as tmp:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(tmp+'/server.log','w+')
    server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
    base=f'http://127.0.0.1:{port}/api.php?action='
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(c,action,body=None,csrf='',status=200,origin=None):
        r=urllib.request.Request((origin or base)+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=c.open(r,timeout=8)
        except urllib.error.HTTPError as error:response=error
        raw=response.read().decode();assert response.status==status,(action,response.status,raw)
        try:return json.loads(raw)
        except json.JSONDecodeError:raise AssertionError((action,response.status,raw[:800]))
    try:
        a,b,anonymous=client(),client(),client()
        for _ in range(80):
            try:req(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        else:raise RuntimeError('Disposable PHP did not start')
        password='Grammar-synthetic-only-123'
        def register(c,name):
            t=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf']
            pid=req(c,'create-profile',{'nickname':name},t)['id'];req(c,'hub&profile='+str(pid));return pid,t
        pid,ta=register(a,'grammar_parent');other,tb=register(b,'grammar_other')
        db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
        req(a,'training-state&profile='+str(pid));req(a,'training-state&profile='+str(other),status=404)
        protected=['accounts','profiles','wallets','inventory','practice','practice_outcomes','credits','rewards','quests','clubs','club_profiles']
        def snapshot(tables=protected):return {table:db.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in tables}
        before=snapshot()
        req(anonymous,f'training-state&profile={pid}&grammar=1',status=401)
        req(b,f'training-state&profile={pid}&grammar=1',status=404)
        req(a,'training-start',{'profile':pid,'track':'grammar','pack':'number'},'invalid',403)
        req(a,f'training-start&profile={pid}',status=405)
        for value in ['missing',1,None,{},['number']]:req(a,'training-start',{'profile':pid,'track':'grammar','pack':value},ta,400)
        req(a,'training-start',{'profile':pid,'track':'grammar'},ta,400)
        req(a,'training-state',{'profile':pid},ta,405)
        legacy=req(a,'training-start',{'profile':pid,'track':'letters','block':'ae'},ta)['session']
        legacy_row=db.execute('SELECT * FROM training_sessions WHERE token=?',(legacy['token'],)).fetchone()
        legacy_recommendation=req(a,f'training-state&profile={pid}')['recommendation']
        def start(pack):return req(a,'training-start',{'profile':pid,'track':'grammar','pack':pack,'coins':999999,'xp':999999},ta)['session']
        attempt=0
        def answer(s,value=None,c=None,csrf=None,**extra):
            global attempt
            attempt+=1;body={'profile':pid,'token':s['token'],'step':s['step'],'attempt':f'{attempt:032x}','answer':s['question']['answer'] if value is None else value,**extra}
            return req(c or a,'training-answer',body,csrf or ta),body
        def state(token,c=None):return req(c or a,f'training-state&profile={pid}&token='+token)['session']
        def check_plan(s,pack):
            row=db.execute('SELECT plan FROM training_grammar_sessions WHERE token=?',(s['token'],)).fetchone();plan=json.loads(row[0]);phases=expected_phases[pack]
            assert s['track']=='grammar:'+pack and s['total']==3*len(phases)
            assert len(plan)==s['total'] and len({q['item'] for q in plan})==3
            for index,q in enumerate(plan):
                phase=phases[index%len(phases)];case=cases[q['item'][8:]]
                assert q['grammar']==dict(case,nounData=nouns[case['noun']],pack=pack,phase=phase)
                assert q['answer']==(case['question'] if phase=='question-build' else case['answer'])
                assert q['aliases']==([] if phase=='question-build' else case['aliases'])
                assert q['mode']==('grammar-model' if phase=='model' else 'grammar-write' if phase=='plural-write' else 'grammar-build' if phase in ['sentence','question-build'] else 'grammar-choice')
                assert sorted(q['choices'])==sorted(case['choices'])
                assert sorted(q['tokens'])==sorted(case.get('questionTokens',[]) if phase=='question-build' else case['tokens'])
                assert q['grammar']['nounData']['art']==nouns[case['noun']]['art']
            return plan
        s=start('number');check_plan(s,'number');assert start('number')['token']==s['token']
        assert {x['token'] for x in req(a,f'training-state&profile={pid}')['sessions']}=={legacy['token']}
        assert {x['token'] for x in req(a,f'training-state&profile={pid}&grammar=1')['sessions']}=={s['token']}
        req(b,f'training-state&profile={other}&token='+s['token'],status=404)
        # A model is always guided even if the client claims that it worked independently.
        q=s['question'];r,model_payload=answer(s,helped=False,audioUsed=True);assert r['correct'] and not r['independent'];s=r['session']
        assert db.execute('SELECT independent,guided FROM training_items WHERE profile_id=? AND item=? AND skill="model.explore"',(pid,q['item'])).fetchone()==(0,1)
        unchanged=snapshot(['training_sessions','training_grammar_sessions','training_items','training_daily','training_totals','training_stickers'])
        assert req(a,'training-answer',model_payload,ta)['replayed'];assert snapshot(list(unchanged))==unchanged
        # Wrong attempts, retries and hints use the same persisted protocol as other training.
        wrong=next(x for x in s['question']['choices'] if x!=s['question']['answer'])
        r,wrong_payload=answer(s,wrong);assert r['correct'] is False and r['session']['errors']==1
        r=req(a,'training-answer',wrong_payload,ta);assert r['replayed'] and r['session']['errors']==1
        future=dict(wrong_payload,step=s['step']+1,attempt='f'*32);req(a,'training-answer',future,ta,409)
        req(a,'training-answer',dict(wrong_payload,attempt='not-a-token'),ta,400)
        req(a,'training-hint',{'profile':pid,'token':s['token'],'step':s['step'],'level':3},ta,400)
        h={'profile':pid,'token':s['token'],'step':s['step'],'level':1};req(a,'training-hint',h,ta)
        device=client();td=req(device,'login',{'username':'grammar_parent','password':password},req(device,'session')['csrf'])['csrf']
        req(device,'training-hint',dict(h,level=2),td)
        assert state(s['token'])['hint']==2 and state(s['token'],device)['helped']
        assert req(a,'training-hint',h,ta)['session']['hint']==2
        r,_=answer(s,helped=False);assert not r['independent'];s=r['session']
        # Fail an actual save before COMMIT: no advance, daily count or clue is invented.
        tables=['training_sessions','training_grammar_sessions','training_items','training_daily','training_totals','training_stickers']
        saved=snapshot(tables)
        db.execute('CREATE TRIGGER grammar_storage_failure BEFORE INSERT ON training_daily WHEN NEW.item LIKE "grammar:%" BEGIN SELECT RAISE(ABORT,"synthetic grammar storage full"); END');db.commit()
        attempt+=1;pending={'profile':pid,'token':s['token'],'step':s['step'],'attempt':f'{attempt:032x}','answer':s['question']['answer']}
        failure=req(a,'training-answer',pending,ta,503);assert 'synthetic grammar storage full' not in json.dumps(failure)
        assert snapshot(tables)==saved and state(s['token'])['step']==s['step']
        db.execute('DROP TRIGGER grammar_storage_failure');db.commit();r=req(a,'training-answer',pending,ta);assert r['correct'];s=r['session']
        # Exercise every curated case through bounded rotations, including explicit aliases.
        seen={p:set() for p in packs};seen['number'].update(q['item'][8:] for q in json.loads(db.execute('SELECT plan FROM training_grammar_sessions WHERE token=?',(s['token'],)).fetchone()[0]))
        aliases_accepted=set();negative_seen=False;positive_seen=False;question_order_rejected=False;sentence_order_rejected=False
        for pack in packs:
            remaining=s if pack=='number' else None
            for _ in range(math.ceil(len(packs[pack]['cases'])/3)+1):
                current=remaining or start(pack);remaining=None;plan=check_plan(current,pack);seen[pack].update(q['item'][8:] for q in plan)
                while not current['done']:
                    q=current['question'];phase=q['grammar']['phase'];value=q['answer']
                    if phase=='question-build' and not question_order_rejected:
                        opposite='It is '+q['answer'][len('Is it '):].rstrip('?')+'.'
                        bad,_=answer(current,opposite);assert not bad['correct'];current=bad['session'];question_order_rejected=True
                    if phase=='sentence' and not sentence_order_rejected:
                        bad,_=answer(current,'They is a book.');assert not bad['correct'];current=bad['session'];sentence_order_rejected=True
                    if phase=='short-answer':
                        if value.startswith('Yes'):
                            positive_seen=True;bad,_=answer(current,"Yes, it's.");assert not bad['correct'];current=bad['session'];value='  YES,it IS!  '
                        else:
                            negative_seen=True;value='  NO,it ISN’T!  '
                    if q['aliases'] and phase!='model':value=q['aliases'][0];aliases_accepted.add(q['item'])
                    expected_independent=phase!='model' and not current.get('helped') and not current.get('errors')
                    result,last=answer(current,value);assert result['correct'],(pack,q,value,result);assert result['independent']==expected_independent,(phase,current,result)
                    current=result['session']
                duplicate_before=snapshot(tables);assert req(a,'training-answer',last,ta)['replayed'];assert snapshot(tables)==duplicate_before
                if seen[pack]=={c['id'] for c in packs[pack]['cases']}:break
            assert seen[pack]=={c['id'] for c in packs[pack]['cases']},(pack,seen[pack])
        assert positive_seen and negative_seen and question_order_rejected and sentence_order_rejected and aliases_accepted
        report=req(a,f'training-progress&profile={pid}');assert report['scope']=='owned-training-only'
        entries=[i for i in report['items'] if i['item'].startswith('grammar:')];assert len(entries)==40
        assert all(i['label'] and not i['label'].startswith('grammar:') for i in entries)
        assert set(expected_skills.values())=={c['skill'] for i in entries for c in i['competencies']}
        assert all(c['independent']==0 for i in entries for c in i['competencies'] if c['skill']=='model.explore')
        assert db.execute('SELECT * FROM training_sessions WHERE token=?',(legacy['token'],)).fetchone()==legacy_row
        assert req(a,f'training-state&profile={pid}')['recommendation']==legacy_recommendation
        assert all(not x['track'].startswith('grammar:') for x in req(a,f'training-state&profile={pid}')['sessions'])
        assert len(req(a,f'training-state&profile={pid}&grammar=1')['sessions'])==0
        assert req(a,f'training-state&profile={pid}&grammar=1')['stickers']==['explore','first']
        assert snapshot()==before,'Guided grammar changed accounts, classic progress, rewards or the game economy'
        # Filtering happens in SQL BEFORE LIMIT32, not after receiving newer grammar rows.
        clone=db.execute('SELECT plan FROM training_grammar_sessions WHERE profile_id=? AND track="grammar:number" ORDER BY rowid LIMIT 1',(pid,)).fetchone()[0]
        for i in range(36):db.execute('INSERT INTO training_grammar_sessions(token,profile_id,track,plan,created_at) VALUES(?,?,?,?,?)',(f'{i+1000:048x}',pid,'grammar:number',clone,int(time.time())))
        db.commit();assert {x['token'] for x in req(a,f'training-state&profile={pid}')['sessions']}=={legacy['token']}
        filtered=req(a,f'training-state&profile={pid}&grammar=1')['sessions'];assert len(filtered)==32 and all(x['track'].startswith('grammar:') for x in filtered)
        # Expiry and rate limits leave confirmed observations and legacy state alone.
        expiry=filtered[0];db.execute('UPDATE training_grammar_sessions SET created_at=? WHERE token=?',(int(time.time())-604801,expiry['token']));db.commit();req(a,f'training-state&profile={pid}&token='+expiry['token'],status=410)
        db.execute('INSERT OR REPLACE INTO rate_limits(bucket,attempts,expires) VALUES(?,?,?)',(f'training-start:{pid}',60,int(time.time())+3600));db.commit()
        untouched=snapshot(tables);req(a,'training-start',{'profile':pid,'track':'grammar','pack':'articles'},ta,429);assert snapshot(tables)==untouched
        # Application-file rollback sees only known plans; the unknown additive table is ignored.
        oldroot=Path(tmp)/'rollback';oldroot.mkdir()
        archive=subprocess.check_output(['git','archive','38434fc','dist'])
        with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:bundle.extractall(oldroot,filter='data')
        oldjs=(oldroot/'dist/training.js').read_text()
        assert 'grammar-model' not in oldjs and 'pending=Array.isArray(data.sessions)?data.sessions:[]' in oldjs
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));oldport=sock.getsockname()[1]
        oldserver=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{oldport}','-t',str(oldroot/'dist')],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
        oldbase=f'http://127.0.0.1:{oldport}/api.php?action='
        for _ in range(80):
            try:oldstate=req(a,f'training-state&profile={pid}',origin=oldbase);break
            except urllib.error.URLError:time.sleep(.05)
        else:raise RuntimeError('Rollback PHP did not start')
        assert {s['token'] for s in oldstate['sessions']}=={legacy['token']}
        assert all(s['question']['mode']=='model' for s in oldstate['sessions'])
        req(a,f'training-state&profile={pid}&token='+filtered[-1]['token'],status=404,origin=oldbase)
        assert db.execute('SELECT COUNT(*) FROM training_grammar_sessions WHERE profile_id=?',(pid,)).fetchone()[0]>=36
        assert snapshot()==before,'Rollback read changed accounts, profiles, rewards or classic progress'
        # Class learners can practice their own profile, but cannot read private adult reports.
        classroom=req(b,'club-create',{'profile':other,'name':'Synthetic grammar class','consent':True},tb)
        learner=client();sl=req(learner,'class-register',{'code':classroom['code'],'nickname':'GrammarFixture','password':password,'consent':True},req(learner,'session')['csrf']);lp=sl['profiles'][0]['id'];lt=sl['csrf']
        cs=req(learner,'training-start',{'profile':lp,'track':'grammar','pack':'questions'},lt)['session'];assert cs['track']=='grammar:questions'
        req(learner,f'training-progress&profile={lp}',status=403);req(learner,f'training-state&profile={pid}&grammar=1',status=404);req(b,f'training-state&profile={lp}&grammar=1',status=404)
        req(learner,'delete-account',{'password':password,'confirm':'ELIMINA'},lt,origin=oldbase)
        assert db.execute('SELECT COUNT(*) FROM training_grammar_sessions WHERE profile_id=?',(lp,)).fetchone()[0]==0
        # Existing owned profile deletion cascades new observations with no schema changes.
        req(a,'delete-profile',{'profile':pid,'password':password,'confirm':'ELIMINA'},ta,origin=oldbase)
        for table in ['training_items','training_daily','training_sessions','training_grammar_sessions','training_totals','training_stickers']:
            assert db.execute('SELECT COUNT(*) FROM '+table+' WHERE profile_id=?',(pid,)).fetchone()[0]==0,table
        assert req(b,f'training-state&profile={other}')['sessions']==[]
        oldserver.terminate();oldserver.wait(timeout=5)
        print('Grammar API passed: five packs/all40cases, frozen phased plans and rotation, explicit grammar skills, aliases/punctuation/Yes and No, rejected word order/contractions, model/help autonomy, failed-save rollback, idempotent retry and second-device help, private ownership/CSRF, separate session storage and real384 rollback/deletion compatibility before LIMIT32, expiry/quota, unchanged economy and old session, finite stickers and class/profile deletion. Synthetic localhost only.')
    finally:
        if 'oldserver' in locals() and oldserver.poll() is None:oldserver.terminate();oldserver.wait(timeout=5)
        server.terminate();server.wait(timeout=5);log.close()
