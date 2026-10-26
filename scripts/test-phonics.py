"""Guided initials: private isolated protocol, no rewards or claimed phonemic mastery."""
import datetime,http.cookiejar,json,os,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path
content=json.loads(Path('dist/training.json').read_text());groups=content['phonics']['groups'];words={w['id']:w for w in content['foundationWords']}
expected={'s':['sun','six','seven'],'p':['pen','pink','pencil'],'b':['bag','book'],'n':['nose','nine','no']}
assert content['phonics']['guidedOnly'] is True and content['phonics']['phonemeAudioAvailable'] is False
assert content['phonics']['source']['commit']=='74790861f652b15e4ac49015a90074ad62a27690'
assert {g['id']:g['words'] for g in groups}==expected
for g in groups:assert g['letter']==g['arpabet']==g['id'].upper() and g['sound']=='/'+g['id']+'/' and all(id in words and id.startswith(g['id']) for id in g['words'])
assert len({id for g in groups for id in g['words']})==11
with tempfile.TemporaryDirectory(prefix='wordyland-phonics-') as tmp:
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 log=open(tmp+'/server.log','w+');server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
 def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(c,action,body=None,csrf='',status=200,method=None):
  r=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),method=method,headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
  try:s=c.open(r,timeout=8)
  except urllib.error.HTTPError as e:s=e
  d=json.loads(s.read());assert s.status==status,(action,s.status,d);return d
 try:
  a,b,second,anonymous=client(),client(),client(),client()
  for _ in range(80):
   try:req(a,'session');break
   except urllib.error.URLError:time.sleep(.05)
  password='Phonics-synthetic-password-123'
  def register(c,name):
   t=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf'];p=req(c,'create-profile',{'nickname':name},t)['id'];req(c,'hub&profile='+str(p));req(c,f'training-state&profile={p}');return p,t
  pid,ta=register(a,'phonics_parent_a');other,tb=register(b,'phonics_parent_b');db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
  protected=['accounts','profiles','wallets','inventory','practice','practice_outcomes','credits','rewards','quests','clubs','club_profiles','training_sessions','training_items','training_daily','training_totals','training_stickers','training_choice_steps']
  def snapshot(tables=protected):return {t:db.execute('SELECT * FROM '+t+' ORDER BY 1').fetchall() for t in tables}
  legacy=req(a,'training-start',{'profile':pid,'track':'letters','block':'ae'},ta)['session']
  for i in range(4):legacy=req(a,'training-answer',{'profile':pid,'token':legacy['token'],'step':legacy['step'],'attempt':f'{1000+i:032x}','answer':legacy['question']['answer']},ta)['session']
  legacy_pending=req(a,'training-start',{'profile':pid,'track':'letters','block':'bc'},ta)['session'];legacy_report=req(a,f'training-progress&profile={pid}')
  assert legacy_report['items'] and legacy_report['stickers']==['first']
  original=snapshot();req(anonymous,f'phonics-state&profile={pid}',status=401);req(b,f'phonics-progress&profile={pid}',status=404);req(a,'phonics-start',{'profile':pid,'lesson':'s'},'invalid',403)
  req(a,f'phonics-start&profile={pid}',status=405);req(a,'phonics-state',{'profile':pid},ta,405);req(a,'phonics-start',{'profile':pid,'lesson':'s'},ta,405,method='PUT')
  for bad in ['unknown',{},1]:req(a,'phonics-start',{'profile':pid,'lesson':bad},ta,400)
  assert req(a,f'phonics-progress&profile={pid}')['items']==[]
  def start(lesson='s'):return req(a,'phonics-start',{'profile':pid,'lesson':lesson},ta)['session']
  counter=0
  def answer(s,value=None,**extra):
   global counter
   counter+=1;payload={'profile':pid,'token':s['token'],'step':s['step'],'attempt':f'{counter:032x}','answer':s['question']['answer'] if value is None else value,**extra}
   return req(a,'phonics-answer',payload,ta),payload
  s=start();assert s['total']==6 and s['question']['kind']=='model' and s['guidedOnly'];assert start()['token']==s['token']
  td=req(second,'login',{'username':'phonics_parent_a','password':password},req(second,'session')['csrf'])['csrf']
  assert req(second,f'phonics-state&profile={pid}&token='+s['token'])['session']['question']==s['question']
  req(b,f'phonics-state&profile={other}&token='+s['token'],status=404);req(a,'phonics-hint',{'profile':pid,'token':s['token'],'step':20},ta,409)
  r,payload=answer(s,independent=True,phonemeAudioVerified=True,coins=999999,xp=999999);assert r['independent'] is False and r['guidedOnly'];s=r['session']
  tables=['phonics_sessions','phonics_practice','phonics_totals'];saved=snapshot(tables);assert req(a,'phonics-answer',payload,ta)['replayed'];assert snapshot(tables)==saved
  r,wrong=answer(s,'SYNTHETIC_PRIVATE_WRONG',kind='model');assert r['correct'] is False and r['session']['errors']==1
  assert req(a,'phonics-answer',wrong,ta)['replayed'];assert req(a,f'phonics-state&profile={pid}&token='+s['token'])['session']['errors']==1
  r,_=answer(s,'sound');assert not r['correct'] and r['session']['hint']==2
  req(second,'phonics-hint',{'profile':pid,'token':s['token'],'step':s['step'],'level':1},td);s=req(a,f'phonics-state&profile={pid}&token='+s['token'])['session'];assert s['hint']==2,'Hints are monotonic across devices'
  assert start()['token']==s['token']
  while not s['done']:
   q=s['question'];ids=[o['id'] for o in q['options']];assert len(ids)==len(set(ids))
   if q['kind']=='match':assert sum(id.startswith(q['group']['id']) for id in ids)==1
   r,last=answer(s,phonemeAudioVerified=True,independent=True,audioUsed=True,replays=999,day='1900-01-01');assert r['guidedOnly'] and r['independent'] is False;s=r['session']
  assert req(a,'phonics-answer',last,ta)['replayed'];assert snapshot()==original
  report=req(a,f'phonics-progress&profile={pid}');assert report['guidedOnly'] and not report['assessesPronunciation'] and not report['assessesPhonemeListening'];assert sum(r['completed'] for r in report['items'])==6
  assert report['lessons'][0]['sessions']==1;assert next(r for r in report['items'] if r['skill']=='concept-name')['with_help']==1
  assert next(r for r in report['items'] if r['skill']=='concept-name')['errors']==2
  assert all(r['last_day']!='1900-01-01' for r in report['items']) and all(r['replays']<=r['completed']*20 for r in report['items'])
  assert 'SYNTHETIC_PRIVATE_WRONG' not in Path(tmp+'/data/wordyland.sqlite').read_bytes().decode('latin1')
  # Legacy clients keep their original training state/report, not unknown question modes.
  assert [s['token'] for s in req(a,f'training-state&profile={pid}')['sessions']]==[legacy_pending['token']] and req(a,f'training-progress&profile={pid}')==legacy_report
  seen=set(expected['s'])
  for group in groups[1:]:
   s=start(group['id'])
   while not s['done']:
    q=s['question'];seen.add(q['word']['id']);assert q['word']['id'] in expected[group['id']];r,_=answer(s);assert not r['independent'];s=r['session']
  assert seen==set(id for ids in expected.values() for id in ids);assert snapshot()==original
  before=snapshot(tables);req(a,f'phonics-progress&profile={pid}');assert snapshot(tables)==before,'Warm report is read only'
  s=start('s');db.execute('UPDATE phonics_sessions SET created_at=? WHERE token=?',(int(time.time())-604801,s['token']));db.commit();req(a,f'phonics-state&profile={pid}&token='+s['token'],status=410)
  assert start('s')['token']!=s['token'];assert len(req(a,f'phonics-progress&profile={pid}')['lessons'])==4
  db.execute('UPDATE accounts SET role="admin" WHERE username="phonics_parent_b"');db.commit();req(b,f'phonics-progress&profile={pid}',status=404)
  db.execute('UPDATE accounts SET role="learner" WHERE username="phonics_parent_a"');db.commit();req(a,f'phonics-progress&profile={pid}',status=403);req(a,f'phonics-state&profile={pid}');db.execute('UPDATE accounts SET role="adult" WHERE username="phonics_parent_a"');db.commit()
  retained=req(b,'phonics-start',{'profile':other,'lesson':'b'},tb)['session']
  req(a,'delete-profile',{'profile':pid,'password':password,'confirm':'ELIMINA'},ta)
  for t in tables:assert db.execute('SELECT COUNT(*) FROM '+t+' WHERE profile_id=?',(pid,)).fetchone()[0]==0
  assert req(b,f'phonics-state&profile={other}&token='+retained['token'])['session']['token']==retained['token']
  print('Phonics API passed: four groups/11 verified words/24 guided steps, strict verbs/CSRF/ownership/roles, frozen cross-device resume/hints, replay and error deduplication, no claimed phoneme mastery, no rewards or legacy progress mutation, read-only report, expiry and owned deletion cleanup. Synthetic only.')
 finally:server.terminate();server.wait(timeout=5);log.close()
