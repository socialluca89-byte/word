"""Synthetic owned recommendation: read-only, actual observations, no new access."""
import datetime,http.cookiejar,json,os,shlex,shutil,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path

with tempfile.TemporaryDirectory(prefix='wordyland-guidance-') as tmp:
 public=Path(tmp)/'public';shutil.copytree('dist',public);sessions=Path(tmp)/'sessions';sessions.mkdir()
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 log=open(Path(tmp)/'server.log','w+');server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+str(sessions),'-S',f'127.0.0.1:{port}','-t',str(public)],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
 def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(c,action,body=None,csrf='',status=200):
  request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
  try:response=c.open(request,timeout=8)
  except urllib.error.HTTPError as error:response=error
  data=json.loads(response.read());assert response.status==status,(action,response.status,data);return data
 try:
  owner,foreign,anonymous=client(),client(),client()
  for _ in range(80):
   try:req(owner,'session');break
   except urllib.error.URLError:time.sleep(.05)
  def register(c,name):
   csrf=req(c,'register',{'username':name,'password':'Synthetic-guidance-password-123','adult':True},req(c,'session')['csrf'])['csrf'];pid=req(c,'create-profile',{'nickname':name},csrf)['id'];req(c,'hub&profile='+str(pid));return pid,csrf
  pid,csrf=register(owner,'guidance_parent');foreign_id,foreign_csrf=register(foreign,'guidance_other');db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
  def state(profile=pid,c=owner):return req(c,'training-state&profile='+str(profile))
  assert state()['recommendation']=={'kind':'letters','track':'letters:ae','block':'ae','reason':'new'}
  other=req(owner,'create-profile',{'nickname':'Second synthetic profile'},csrf)['id'];state(other)
  tables=['accounts','profiles','wallets','inventory','practice','practice_outcomes','credits','rewards','quests','clubs','club_profiles','training_items','training_daily','training_sessions','training_totals','training_stickers']
  def snapshot():return {table:db.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in tables}
  before=snapshot();again=state();assert set(again['recommendation'])=={'kind','track','block','reason'};assert snapshot()==before,'GET advice has no writes, rewards, points or class effects'
  req(anonymous,f'training-state&profile={pid}',status=401);req(foreign,f'training-state&profile={pid}',status=404)
  req(owner,'training-state',{'profile':pid},csrf,status=405)
  def seed(item,skill,rows):
   db.execute('DELETE FROM training_daily WHERE profile_id=?',(pid,));db.execute('DELETE FROM training_items WHERE profile_id=?',(pid,))
   db.execute('INSERT INTO training_items(profile_id,item,skill,completed) VALUES(?,?,?,?)',(pid,item,skill,len(rows)))
   for day,errors,independent,guided in rows:db.execute('INSERT INTO training_daily(profile_id,day,item,skill,completed,errors,independent,guided) VALUES(?,?,?,?,1,?,?,?)',(pid,day,item,skill,errors,independent,guided))
   db.commit()
  today=datetime.datetime.now(datetime.timezone.utc).date();day=lambda n:(today-datetime.timedelta(days=n)).isoformat()
  seed('letter:A','letter-reading.letter',[(day(0),20,0,1)])
  assert state()['recommendation']['reason']=='new','Many same-day errors cannot become spaced evidence'
  seed('letter:A','letter-reading.letter',[(day(0),1,0,1),(day(1),1,0,1)])
  assert state()['recommendation']=={'kind':'letters','track':'letters:ae','block':'ae','reason':'review'}
  assert state(other)['recommendation']['reason']=='new','No observations inherited from another owned profile'
  seed('letter:A','letter-reading.letter',[(day(0),1,3,0),(day(1),1,0,1)])
  assert state()['recommendation']['reason']=='new','Recent autonomous responses limit old error priority'
  seed('word:sharpener','spelling.compose',[(day(0),5,0,5),(day(1),5,0,5)])
  assert state()['recommendation']['reason']=='new','Composition/model support is not a spelling recall difficulty'
  seed('word:sharpener','spelling.recall',[(day(0),1,0,1),(day(1),1,0,1)])
  assert state()['recommendation']=={'kind':'words','track':'words:classroom','pack':'classroom','reason':'review'}
  before=snapshot();state();assert snapshot()==before
  saved=req(owner,'training-start',{'profile':pid,'track':'letters','block':'bc'},csrf)['session']
  first=state()['recommendation'];assert first['kind']=='resume' and first['token']==saved['token'] and first['step']==0
  response=req(owner,'training-answer',{'profile':pid,'token':saved['token'],'step':0,'attempt':'1'*32,'answer':saved['question']['answer']},csrf)
  assert response['session']['step']==1;assert state()['recommendation']['step']==1,'The suggestion resumes the last confirmed step'
  second_device=client();req(second_device,'login',{'username':'guidance_parent','password':'Synthetic-guidance-password-123'},req(second_device,'session')['csrf'])
  assert state(c=second_device)['recommendation']==state()['recommendation'],'Existing owned state works on a second device'
  # Expiry is enforced by the existing state query, rather than a suggested stale token.
  db.execute('UPDATE training_sessions SET created_at=? WHERE token=?',(int(time.time())-604801,saved['token']));db.commit()
  assert state()['recommendation']['reason']=='review'
  db.execute('UPDATE accounts SET role="learner" WHERE username="guidance_parent"');db.commit();assert state()['recommendation']['reason']=='review';req(owner,f'training-progress&profile={pid}',status=403)
  req(foreign,f'training-state&profile={pid}&token='+saved['token'],status=404)
  print('Training guidance API passed: actual spaced evidence, one-day/help safeguards, owned profile isolation, existing learner permissions, second-device confirmed resume and expiry, minimal recommendation and read-only GET with unchanged game/reward tables. Synthetic data only.')
 finally:server.terminate();server.wait(timeout=5);log.close()
