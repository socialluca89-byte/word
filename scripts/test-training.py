"""New training is isolated from game economies, private, resumable and replay safe."""
import json,os,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request,http.cookiejar,datetime
from pathlib import Path
content=json.loads(Path('dist/training.json').read_text())
assert [l['id'] for l in content['letters']]==list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
assert all(l['lower']==l['id'].lower() for l in content['letters'])
assert len(content['blocks'])==13 and len({b['id'] for b in content['blocks']})==13
assert sorted(letter for block in content['blocks'] for letter in block['letters'])==list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
assert all(len(block['letters'])==2 and len(set(block['letters']))==2 for block in content['blocks'])
assert {l['id']:(l['it'],l['en']) for l in content['letters'] if l['id'] in 'ABCEI'}=={'A':('a','ay'),'B':('bi','bee'),'C':('ci','see'),'E':('e','ee'),'I':('i','eye')}
assert len(content['words'])==6 and len(content['stickers'])==3
for word in content['words']:assert word['gap'].replace('___',word['id'])==word['phrase']
with tempfile.TemporaryDirectory(prefix='wordyland-training-') as tmp:
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 log=open(tmp+'/server.log','w+');server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
 def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(c,action,body=None,csrf='',status=200):
  r=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
  try:s=c.open(r,timeout=8)
  except urllib.error.HTTPError as e:s=e
  d=json.loads(s.read());assert s.status==status,(action,s.status,d);return d
 try:
  a,b,anonymous=client(),client(),client()
  for _ in range(80):
   try:req(a,'session');break
   except urllib.error.URLError:time.sleep(.05)
  password='Training-synthetic-password-123'
  def register(c,name):
   t=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf'];p=req(c,'create-profile',{'nickname':name},t)['id'];req(c,'hub&profile='+str(p));return p,t
  pid,ta=register(a,'training_parent_a');other,tb=register(b,'training_parent_b');db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
  protected=['accounts','profiles','wallets','inventory','practice','practice_outcomes','credits','rewards','quests','clubs','club_profiles']
  def snapshot(tables=protected):return {table:db.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in tables}
  old=snapshot();assert req(a,f'training-progress&profile={pid}')['items']==[]
  req(anonymous,f'training-state&profile={pid}',status=401);req(b,f'training-progress&profile={pid}',status=404)
  req(a,'training-start',{'profile':pid},'invalid',403);req(a,'training-start',{'profile':pid,'track':'exam-level'},ta,400)
  def start(track='letters',block='ae'):return req(a,'training-start',{'profile':pid,'track':track,'block':block},ta)['session']
  counter=0
  def answer(s,**extra):
   global counter
   counter+=1;payload={'profile':pid,'token':s['token'],'step':s['step'],'attempt':f'{counter:032x}','answer':s['question']['answer'],**extra}
   return req(a,'training-answer',payload,ta),payload
  s=start();assert s['total']==4 and s['question']['mode']=='model';assert start()['token']==s['token']
  result,payload=answer(s,coins=999999,xp=999999,stickers=["forged"],day="1900-01-01");assert result['correct'];s=result['session'];assert s['question']['mode']=='letter' and len(s['question']['choices'])==2
  before=snapshot(['training_daily','training_items','training_sessions']);assert req(a,'training-answer',payload,ta)['replayed'];assert snapshot(['training_daily','training_items','training_sessions'])==before
  wrong={'profile':pid,'token':s['token'],'step':s['step'],'attempt':'f'*32,'answer':'synthetic private wrong response','helped':True}
  r=req(a,'training-answer',wrong,ta);assert r['session']['errors']==1 and r['session']['helped'];r=req(a,'training-answer',wrong,ta);assert r['replayed'] and r['session']['errors']==1
  hint={'profile':pid,'token':s['token'],'step':s['step'],'level':1};req(a,'training-hint',hint,ta);assert req(a,'training-hint',hint,ta)['session']['hint']==1
  # A second device sees persisted help, even when the separate hint reply was lost.
  device=client();td=req(device,'login',{'username':'training_parent_a','password':password},req(device,'session')['csrf'])['csrf'];assert req(device,f'training-state&profile={pid}&token='+s['token'])['session']['helped']
  r,_=answer(s,audioUsed=False,helped=False);assert not r['independent'];s=r['session']
  s=answer(s)[0]['session'];r,last=answer(s,audioUsed=True,letterAudioVerified=True);assert r['independent'] and r['session']['done'];assert r['stickers']==['first']
  assert req(a,'training-answer',last,ta)['replayed'];assert req(a,'training-progress&profile='+str(pid))['scope']=='owned-training-only'
  report=req(a,'training-progress&profile='+str(pid));letter_a=next(i for i in report['items'] if i['item']=='letter:A');letter_e=next(i for i in report['items'] if i['item']=='letter:E')
  assert 'letter-reading.letter' in letter_a['skills'] and 'letter-name.letter' in letter_e['skills'];assert not letter_e['repeatedIndependently']
  assert 'synthetic private wrong response' not in Path(tmp+'/data/wordyland.sqlite').read_bytes().decode('latin1')
  for _ in range(2):
   s=start()
   while not s['done']:s=answer(s,audioUsed=True,letterAudioVerified=True)[0]['session']
  assert start()['total']==4,'Three same-day successes are not evidence across days'
  # Finish current path; then seed ONLY the synthetic aggregate to model a later day.
  s=start()
  while not s['done']:s=answer(s,audioUsed=True,letterAudioVerified=True)[0]['session']
  db.execute('UPDATE training_items SET independent_days=2,independent=3 WHERE profile_id=? AND item="letter:E" AND skill="letter-name.letter"',(pid,));db.commit();s=start();assert s['total']==3,'Consistent spaced practice may reduce the model, never remove the help'
  req(a,'training-hint',{'profile':pid,'token':s['token'],'step':s['step'],'level':2},ta)
  while not s['done']:s=answer(s,helped=True,audioUsed=True,letterAudioVerified=True)[0]['session']
  for _ in range(3):
   s=start('words');assert s['total']>=7
   while not s['done']:
    q=s['question'];assert q['mode'] not in ['recognize','phrase'] or q['answer'] in [w['id'] for w in q['choices']]
    result,_=answer(s,audioUsed=q['mode']=='recognize');assert not(q['mode'] in ['model','build']) or not result['independent'];s=result['session']
  report=req(a,'training-progress&profile='+str(pid));assert any(i['item']=='word:red' for i in report['items']);assert all('competencies' in i for i in report['items']);assert set(report['stickers'])=={'first','explore'}
  db.execute('UPDATE training_totals SET first_day=? WHERE profile_id=?',[(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=4)).date().isoformat(),pid]);db.commit()
  s=start('letters','bc')
  while not s['done']:result,last=answer(s,helped=True);s=result['session']
  assert set(result['stickers'])=={'first','explore','return'};n=db.execute('SELECT COUNT(*) FROM training_stickers WHERE profile_id=?',(pid,)).fetchone()[0];req(a,'training-answer',last,ta);assert db.execute('SELECT COUNT(*) FROM training_stickers WHERE profile_id=?',(pid,)).fetchone()[0]==n==3
  assert snapshot()==old,'Training must not change game wallets, points, badges, credit, profiles or class standings'
  seen=set()
  for block in content['blocks']:
   s=start('letters',block['id'])
   while not s['done']:
    question=s['question'];assert question['answer'] in block['letters'];assert set(question['choices'])==set(block['letters']);seen.add(question['answer']);s=answer(s,audioUsed=False)[0]['session']
  assert seen==set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),'Every guided letter must be reachable, not only present in the explorer'
  assert snapshot()==old,'Full alphabet paths keep old games/economy unchanged'
  assert db.execute('SELECT COUNT(*) FROM training_stickers WHERE profile_id=?',(pid,)).fetchone()[0]==3
  tables=['training_daily','training_items','training_sessions','training_stickers','training_totals'];before=snapshot(tables);req(a,'training-progress&profile='+str(pid));assert snapshot(tables)==before
  req(b,f'training-state&profile={pid}&token='+s['token'],status=404);req(a,'training-hint',{'profile':pid,'token':s['token'],'step':999,'level':1},ta,409)
  db.execute('UPDATE accounts SET role="admin" WHERE username="training_parent_b"');db.commit();req(b,f'training-progress&profile={pid}',status=404);req(b,f'training-progress&profile={other}')
  # Learners can practice their own profile; the parent report is not exposed to them.
  db.execute('UPDATE accounts SET role="learner" WHERE username="training_parent_a"');db.commit();req(a,f'training-progress&profile={pid}',status=403);req(a,f'training-state&profile={pid}');db.execute('UPDATE accounts SET role="adult" WHERE username="training_parent_a"');db.commit()
  req(a,'training-progress',{'profile':pid},ta,405)
  # Other games still grant their established rewards.
  req(a,'study-save',{'profile':pid,'title':'Gioco separato','words':[['head','testa','🙂']],'confirmed':True},ta);study=req(a,f'hub&profile={pid}')['studies'][0]['id'];q=req(a,'quest-start',{'profile':pid,'study':study},ta);reward=req(a,'quest-answer',{'profile':pid,'token':q['token'],'step':0,'answer':'head'},ta);assert reward['done'] and reward['coins']==15 and reward['wallet']['xp']>0
  s=start('letters','id');db.execute('UPDATE training_sessions SET created_at=? WHERE token=?',(int(time.time())-604801,s['token']));db.commit();req(a,f'training-state&profile={pid}&token='+s['token'],status=410)
  retained=req(b,'training-start',{'profile':other,'track':'letters','block':'ae'},tb)['session']
  req(a,'delete-profile',{'profile':pid,'password':password,'confirm':'ELIMINA'},ta)
  for table in ['training_sessions','training_daily','training_items','training_totals','training_stickers']:assert db.execute('SELECT COUNT(*) FROM '+table+' WHERE profile_id=?',(pid,)).fetchone()[0]==0,'Profile deletion must clean training data'
  assert req(b,f'training-state&profile={other}&token='+retained['token'])['session']['token']==retained['token']
  print('Training API passed: 26 guided letters in 13 blocks, curated content, owned privacy/roles/CSRF, no game economy/ranking mutations, finite idempotent stickers, wrong/hint/reply replay, second-device help, spaced-days fading, reading versus audio skill separation, six words/phrases, private report, expiry unchanged game rewards and owned-profile deletion cleanup.')
 finally:server.terminate();server.wait(timeout=5);log.close()
