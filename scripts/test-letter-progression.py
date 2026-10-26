"""Synthetic-only adaptive choices: separate skills, spaced practice and frozen sessions."""
import datetime,http.cookiejar,json,os,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
with tempfile.TemporaryDirectory(prefix='wordyland-letter-progression-') as tmp:
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 log=open(tmp+'/server.log','w+');server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
 def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(c,action,body=None,csrf='',status=200):
  r=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
  try:s=c.open(r,timeout=8)
  except urllib.error.HTTPError as e:s=e
  d=json.loads(s.read());assert s.status==status,(action,s.status,d);return d
 try:
  a,b,second=client(),client(),client()
  for _ in range(80):
   try:req(a,'session');break
   except urllib.error.URLError:time.sleep(.05)
  password='Letter-progression-test-password-123'
  def register(c,name):
   t=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf'];p=req(c,'create-profile',{'nickname':name},t)['id'];req(c,'hub&profile='+str(p));return p,t
  pid,ta=register(a,'choice_owner');other,tb=register(b,'choice_other');req(a,f'training-state&profile={pid}')
  db=sqlite3.connect(tmp+'/data/wordyland.sqlite');protected=['accounts','profiles','wallets','inventory','credits','rewards','quests','clubs','club_profiles']
  def snapshot():return {t:db.execute('SELECT * FROM '+t+' ORDER BY 1').fetchall() for t in protected}
  original=snapshot();counter=0
  def start(block='ae'):return req(a,'training-start',{'profile':pid,'track':'letters','block':block},ta)['session']
  def plan(s):return json.loads(db.execute('SELECT plan FROM training_sessions WHERE token=?',(s['token'],)).fetchone()[0])
  def choices(s):return {q['answer']:q['choiceSets'] for q in plan(s) if q['mode']=='letter'}
  def answer(s,mode='reading',count=None,value=None,status=200):
   global counter
   counter+=1;q=s['question'];n=count if count is not None else len(q.get('choiceSets',{}).get(mode,q['choices']))
   payload={'profile':pid,'token':s['token'],'step':s['step'],'attempt':f'{counter:032x}','answer':q['answer'] if value is None else value,'audioUsed':mode=='listening','letterAudioVerified':mode=='listening','choiceCount':n}
   return req(a,'training-answer',payload,ta,status),payload
  def finish(s,mode='reading'):
   while not s['done']:s=answer(s,mode=mode,count=2 if s['hint'] else None)[0]['session']
   return s
  def seed(item,skill,n,days):
   db.execute('INSERT INTO training_items(profile_id,item,skill,completed,independent,independent_days,last_independent_day) VALUES(?,?,?,?,?,?,?) ON CONFLICT(profile_id,item,skill) DO UPDATE SET completed=excluded.completed,independent=excluded.independent,independent_days=excluded.independent_days,last_independent_day=excluded.last_independent_day',(pid,'letter:'+item,skill,max(1,n),n,days,'2026-01-01'));db.commit()
  s=start();assert all(len(v)==2 for sets in choices(s).values() for v in sets.values())
  # Real legacy plan has no choiceSets: no reset is needed to resume/finish it.
  oldplan=plan(s)
  for q in oldplan:q.pop('choiceSets',None)
  db.execute('UPDATE training_sessions SET plan=? WHERE token=?',(json.dumps(oldplan),s['token']));db.commit();s=req(a,f'training-state&profile={pid}&token='+s['token'])['session'];finish(s)
  seed('A','letter-reading.letter',100,1);s=start();assert len(choices(s)['A']['reading'])==2,'One date never advances choices';finish(s)
  seed('A','letter-reading.letter',6,3);s=start();assert len(choices(s)['A']['reading'])==2,'Do not invent unseen distractors';finish(s)
  finish(start('bc'))
  seed('A','letter-reading.letter',3,2);seed('A','letter-name.letter',6,3)
  s=start();v=choices(s);assert len(v['A']['reading'])==3 and len(v['A']['listening'])==3,'No jump from old two-choice history straight to four'
  for sets in v.values():
   for ids in sets.values():assert len(ids)==len(set(ids)) and set('AE').issubset(ids) and set(ids).issubset(set('AEBC'))
  # First genuine three-choice success is recorded, but cannot unlock four on one date.
  finish(s);three=db.execute('SELECT independent,independent_days FROM training_choice_steps WHERE profile_id=? AND item="letter:A" AND skill="letter-reading.letter" AND choice_count=3',(pid,)).fetchone();assert three==(1,1)
  seed('A','letter-reading.letter',10,4);s=start();assert len(choices(s)['A']['reading'])==3;finish(s);assert db.execute('SELECT independent_days FROM training_choice_steps WHERE profile_id=? AND item="letter:A" AND skill="letter-reading.letter" AND choice_count=3',(pid,)).fetchone()[0]==1
  # Model another day ONLY in synthetic evidence; two successes on different dates.
  db.execute('UPDATE training_choice_steps SET independent_days=2 WHERE profile_id=? AND item="letter:A" AND skill="letter-reading.letter" AND choice_count=3',(pid,));db.commit();s=start();frozen=choices(s);assert len(frozen['A']['reading'])==4 and len(frozen['A']['listening'])==3,'Skills stay separate'
  td=req(second,'login',{'username':'choice_owner','password':password},req(second,'session')['csrf'])['csrf']
  seed('A','letter-reading.letter',0,0);snapshot_from_second=req(second,f'training-state&profile={pid}&token='+s['token'])['session'];assert snapshot_from_second['question']==s['question'],'Another device resumes exact frozen options'
  seed('A','letter-reading.letter',10,4)
  # Current first question is A because its heard-name model was already faded.
  assert s['question']['answer']=='A' and s['question']['mode']=='letter'
  answer(s,mode='listening',count=4,status=409)
  before=db.execute('SELECT * FROM training_choice_steps ORDER BY 1,2,3,4').fetchall();r,payload=answer(s,count=4);assert r['independent'];assert req(a,'training-answer',payload,ta)['replayed'];after=db.execute('SELECT * FROM training_choice_steps ORDER BY 1,2,3,4').fetchall();assert after!=before
  assert req(a,'training-answer',payload,ta)['replayed'];assert db.execute('SELECT * FROM training_choice_steps ORDER BY 1,2,3,4').fetchall()==after
  finish(r['session'])
  s=start();req(second,'training-hint',{'profile':pid,'token':s['token'],'step':s['step'],'level':1},td);s=req(a,f'training-state&profile={pid}&token='+s['token'])['session'];assert s['hint']==1 and s['helped'];answer(s,count=4,status=409);r,_=answer(s,count=2);assert not r['independent'];finish(r['session'])
  # Repeated recent difficulty guides subsequent paths back to two without erasing evidence.
  db.execute('DELETE FROM training_daily WHERE profile_id=? AND item="letter:A" AND skill="letter-reading.letter"',(pid,));db.commit();s=start();assert len(choices(s)['A']['reading'])==4
  s=answer(s,count=4,value='E')[0]['session'];s=answer(s,count=4,value='E')[0]['session'];assert s['errors']==2
  req(a,'training-hint',{'profile':pid,'token':s['token'],'step':s['step'],'level':1},ta);s=req(a,f'training-state&profile={pid}&token='+s['token'])['session'];r,_=answer(s,count=2);assert not r['independent'];finish(r['session']);s=start();assert len(choices(s)['A']['reading'])==2 and len(choices(s)['A']['listening'])==3;finish(s)
  report=req(a,f'training-progress&profile={pid}');a_item=next(i for i in report['items'] if i['item']=='letter:A');reading=next(c for c in a_item['competencies'] if c['skill']=='letter-reading.letter');assert {x['choices'] for x in reading['choicePractice']}=={3,4};req(b,f'training-progress&profile={pid}',status=404)
  old_day=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=9)).date().isoformat()
  db.execute('UPDATE training_daily SET day=? WHERE profile_id=? AND item="letter:A" AND skill="letter-reading.letter"',(old_day,pid));db.commit();s=start();assert len(choices(s)['A']['reading'])==4,'A long break does not erase established practice';finish(s)
  assert snapshot()==original,'No game/account/class mutation from progression or help'
  req(a,'delete-profile',{'profile':pid,'password':password,'confirm':'ELIMINA'},ta);assert db.execute('SELECT COUNT(*) FROM training_choice_steps WHERE profile_id=?',(pid,)).fetchone()[0]==0
  print('Letter progression API passed: 2→3→4, no same-day jump or unseen distractors, separate reading/listening, real three-choice stage, legacy/frozen cross-device resume, replay, saved help, guided fallback, private report, unchanged economy and deletion cleanup.')
 finally:server.terminate();server.wait(timeout=5);log.close()
