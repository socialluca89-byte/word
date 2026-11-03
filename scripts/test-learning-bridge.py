"""Read-only owned review bridge and original sentence/instruction training contracts."""
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import shlex
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

with tempfile.TemporaryDirectory(prefix='wordyland-learning-bridge-') as temporary:
    fixture=Path(temporary);public=fixture/'public';shutil.copytree('dist',public)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=(fixture/'server.log').open('w+')
    server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+temporary,'-S',f'127.0.0.1:{port}','-t',str(public)],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=str(fixture/'data')),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(person,action,body=None,csrf='',status=200):
        request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=person.open(request,timeout=10)
        except urllib.error.HTTPError as error:response=error
        with response:
            data=json.loads(response.read());assert response.status==status,(action,response.status,data)
        return data
    db=None
    try:
        owner,foreign=client(),client();password='Learning-bridge-synthetic-123'
        for _ in range(80):
            try:req(owner,'session');break
            except urllib.error.URLError:time.sleep(.03)
        def register(person,label):
            name=label+'_'+secrets.token_hex(4);token=req(person,'register',{'username':name,'password':password,'adult':True},req(person,'session')['csrf'])['csrf']
            return req(person,'create-profile',{'nickname':label},token)['id'],token,name
        pid,csrf,name=register(owner,'bridge');other,foreign_csrf,_=register(foreign,'outsider')
        sibling=req(owner,'create-profile',{'nickname':'Second profile'},csrf)['id']
        device=client();device_csrf=req(device,'login',{'username':name,'password':password},req(device,'session')['csrf'])['csrf']
        base=req(owner,f'hub&profile={pid}')['wallet'];req(owner,f'training-state&profile={pid}');req(owner,f'holiday-state&profile={pid}')
        db=sqlite3.connect(fixture/'data/wordyland.sqlite');db.row_factory=sqlite3.Row
        content=json.loads((public/'training.json').read_text());known={row['id'] for row in content['foundationWords']};beginner={row['id'] for row in content['foundationWords'][:6]}
        def start(track='words',pack='classroom',profile=pid):return req(owner,'training-start',{'profile':profile,'track':track,'pack':pack},csrf)['session']
        def answer(session,**extra):
            body={'profile':pid,'token':session['token'],'step':session['step'],'attempt':secrets.token_hex(16),'answer':session['question']['answer'],**extra}
            result=req(owner,'training-answer',body,csrf);assert result['correct'];assert req(device,'training-answer',body,device_csrf)['replayed'];return result
        # Reach a genuine Classroom recall outside the initial six-word Journey subset.
        session=None;target=None
        for _ in range(8):
            session=start()
            while not session['done']:
                question=session['question']
                if question['mode']=='recall' and question['word']['id'] not in beginner:target=question['word']['id'];break
                session=answer(session)['session']
            if target:break
        assert target in known and target not in beginner
        wrong={'profile':pid,'token':session['token'],'step':session['step'],'attempt':secrets.token_hex(16),'answer':'synthetic wrong spelling'}
        rejected=req(owner,'training-answer',wrong,csrf);assert not rejected['correct'] and rejected['session']['errors']==1
        assert req(device,'training-answer',wrong,device_csrf)['replayed']
        tables=['accounts','profiles','wallets','inventory','quests','rewards','practice','practice_outcomes','credits','training_items','training_daily','training_sessions','training_totals','training_stickers']
        def snapshot():return {table:[tuple(row) for row in db.execute('SELECT * FROM '+table+' ORDER BY 1')] for table in tables}
        before=snapshot();summary=req(owner,f'learning-summary&profile={pid}');assert target in summary['reviewWords']
        assert next(row for row in summary['reviewSources'] if row['word']==target)['sources']==['training']
        assert summary['reviewScope']=='owned-learning-evidence' and summary['totals']['observed']==0 and summary['legacyCorrect']==0
        assert snapshot()==before,'GET bridge cannot copy counters, history, points or credits'
        assert target not in req(owner,f'learning-summary&profile={sibling}')['reviewWords']
        req(foreign,f'learning-summary&profile={pid}',status=404)
        # A study contains the exact curated word, no fuzzy bag/bookbag or eraser/rubber aliases.
        word=next(row for row in content['foundationWords'] if row['id']==target)
        others=[row for row in content['foundationWords'] if row['id']!=target][:2]
        req(owner,'study-save',{'profile':pid,'title':'Synthetic exact-word bridge','words':[[word['id'],word['meaning'],word['emoji']]]+[[row['id'],row['meaning'],row['emoji']] for row in others],'confirmed':True},csrf)
        study=req(owner,f'hub&profile={pid}')['studies'][0]['id'];quest=req(owner,'quest-start',{'profile':pid,'study':study},csrf)
        assert quest['question']['word']==target,'Classical mission prioritizes actual training recall difficulty'
        journey=req(owner,'journey-start',{'profile':pid},csrf)['session']
        plan=json.loads(db.execute('SELECT plan FROM holiday_days WHERE token=?',(journey['token'],)).fetchone()[0])
        assert plan[0]['word']==target and plan[0]['review'] is True,'Even a new Journey can review a word actually studied in Classroom'
        assert len({row['word'] for row in plan})==3
        req(foreign,'training-state&profile='+str(pid),status=404)
        corrected=answer(session);assert not corrected['independent'];session=corrected['session']
        while not session['done']:session=answer(session)['session']
        assert target in req(owner,f'learning-summary&profile={pid}')['reviewWords'],'An assisted correction is not new independent mastery'
        # Same-day counts cannot prove that success followed the error. Preserve the
        # actual attempts without interpreting their daily aggregate as mastery.
        recall_successes=0
        before_economy={table:[tuple(row) for row in db.execute('SELECT * FROM '+table+' ORDER BY 1')] for table in ['wallets','inventory','practice','practice_outcomes','credits','rewards']}
        for _ in range(30):
            session=start()
            while not session['done']:
                question=session['question'];result=answer(session,audioUsed=True)
                if question['mode']=='recall' and question['word']['id']==target:
                    assert result['independent'];recall_successes+=1
                session=result['session']
            if recall_successes>=3:break
        assert recall_successes>=3 and target in req(owner,f'learning-summary&profile={pid}')['reviewWords']
        assert {table:[tuple(row) for row in db.execute('SELECT * FROM '+table+' ORDER BY 1')] for table in before_economy}==before_economy
        # Guided composition/recognition, unknown words and letters never become spelling review.
        req(owner,f'training-state&profile={sibling}')
        for item,skill in [('word:pen','spelling.compose'),('word:book','heard-word.meaning'),('letter:A','letter-name.letter'),('word:unlisted word','spelling.recall')]:
            db.execute('INSERT INTO training_daily(profile_id,day,item,skill,completed,errors,guided) VALUES(?,date("now"),?,?,1,4,4)',(sibling,item,skill))
        malformed=json.dumps([{'mode':'recall','word':'pen','answer':'pen'}])
        db.execute('INSERT INTO training_sessions(token,profile_id,track,plan,errors,created_at) VALUES(?,?,?,?,2,?)',('d'*48,sibling,'words',malformed,int(time.time())))
        db.commit();assert req(owner,f'learning-summary&profile={sibling}')['reviewWords']==[]
        # Synthetic dated aggregates exercise the conservative chronological bridge:
        # earlier independent success never hides a later guided/error observation;
        # three later-day independent recalls can clear that source, not the history.
        db.execute('INSERT INTO training_daily(profile_id,day,item,skill,completed,independent) VALUES(?,date("now","-2 day"),?,"spelling.recall",3,3)',(sibling,'word:pen'))
        db.execute('INSERT INTO training_daily(profile_id,day,item,skill,completed,errors,guided) VALUES(?,date("now","-1 day"),?,"spelling.recall",1,1,1)',(sibling,'word:pen'));db.commit()
        assert req(owner,f'learning-summary&profile={sibling}')['reviewWords']==['pen']
        db.execute('INSERT INTO training_daily(profile_id,day,item,skill,completed,independent) VALUES(?,date("now"),?,"spelling.recall",3,3)',(sibling,'word:pen'));db.commit()
        assert req(owner,f'learning-summary&profile={sibling}')['reviewWords']==[]
        db.execute('UPDATE training_daily SET errors=1,guided=1 WHERE profile_id=? AND day=date("now") AND item="word:pen" AND skill="spelling.recall"',(sibling,));db.commit()
        assert req(owner,f'learning-summary&profile={sibling}')['reviewWords']==['pen'],'A new difficulty is not masked by older or same-day autonomous counts'
        # Both new tracks use the original owned session/hint/retry protocol and no game economy.
        assert len(content['sentenceActivities'])==12 and len(content['instructionActivities'])==8
        for activity in content['sentenceActivities']:
            normalize=lambda value:' '.join(value.rstrip(' .!?').lower().split())
            assert normalize(' '.join(activity['tokens']))==normalize(activity['answer'])
        balance=req(owner,f'hub&profile={pid}')['wallet']
        sentence=start('sentences');assert sentence['track']=='sentences:basics' and sentence['total']==3 and sentence['question']['mode']=='sentence-build'
        assert start('sentences')['token']==sentence['token']
        req(foreign,'training-hint',{'profile':other,'token':sentence['token'],'step':0},foreign_csrf,404)
        req(owner,'training-hint',{'profile':pid,'token':sentence['token'],'step':0},'invalid-csrf',403)
        hinted=req(owner,'training-hint',{'profile':pid,'token':sentence['token'],'step':0,'level':2},csrf)['session'];assert hinted['helped'] and hinted['hint']==2
        recovered=req(device,f'training-state&profile={pid}&token='+sentence['token'])['session'];assert recovered==hinted
        assert req(owner,f'training-state&profile={pid}')['recommendation']['token']==sentence['token']
        bad={'profile':pid,'token':sentence['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'word order is incorrect'}
        assert not req(owner,'training-answer',bad,csrf)['correct'];assert req(device,'training-answer',bad,device_csrf)['replayed']
        first=answer(sentence);assert not first['independent'];sentence=first['session']
        while not sentence['done']:
            assert sorted(sentence['question']['sentence']['tokens'])==sorted(next(row for row in content['sentenceActivities'] if row['id']==sentence['question']['sentence']['id'])['tokens'])
            result=answer(sentence);assert result['independent'];sentence=result['session']
        instructions=start('instructions');assert instructions['track']=='instructions:basics' and instructions['total']==3
        assert start('instructions')['token']==instructions['token']
        readings=set()
        while not instructions['done']:
            question=instructions['question'];assert question['mode']=='instruction-choice' and len(question['choices'])==3
            assert question['answer'] in {choice['id'] for choice in question['choices']}
            assert len({choice['id'] for choice in question['choices']})==3
            step=instructions['step'];result=answer(instructions,audioUsed=step%2==0,helped=step==2)
            assert result['independent']==(step!=2);instructions=result['session'];readings.add('heard-instruction.meaning' if step%2==0 else 'instruction-reading.meaning')
        progress=req(owner,f'training-progress&profile={pid}')
        skills={row['skill'] for item in progress['items'] for row in item['competencies']}
        assert {'sentence.compose',*readings}.issubset(skills)
        assert req(owner,f'hub&profile={pid}')['wallet']==balance
        assert req(owner,f'learning-summary&profile={pid}')['totals']['observed']==0
        print('Learning bridge API passed: exact curated recall evidence crosses to Journey/classical priorities, no GET writes or counter/XP fusion, pending/assisted and chronologically later independent recall, no older/same-day success masking a new error, source metadata/profile isolation, no recognition/build/letter/unknown-word inference;12 original sentence and8 instruction catalogs, owned three-step new tracks, frozen resume/device/hints/errors/replays, accurate separate listening/reading skills and unchanged wallet.')
    finally:
        if db is not None:db.close()
        if server.poll() is None:
            server.terminate()
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:server.kill();server.wait(timeout=5)
        log.close()
