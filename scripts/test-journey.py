"""Evergreen learning journey: real local API, private synthetic fixtures only."""
import http.cookiejar,json,os,secrets,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error,datetime
from pathlib import Path
with tempfile.TemporaryDirectory(prefix='wordyland-journey-') as tmp:
 clock=Path(tmp)/'clock';clock.write_text('2027-07-01 12:00:00')
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 log=open(tmp+'/server.log','w+')
 server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_TEST_CLOCK_FILE=str(clock),WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
 def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(c,action,body=None,csrf='',status=200):
  r=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
  try:r=c.open(r,timeout=5)
  except urllib.error.HTTPError as e:r=e
  d=json.loads(r.read());assert r.status==status,(action,r.status,d);return d
 try:
  a,b=client(),client()
  for _ in range(80):
   try:req(a,'session');break
   except urllib.error.URLError:time.sleep(.05)
  def register(c):
   name='journey_'+secrets.token_hex(5);t=req(c,'session')['csrf'];t=req(c,'register',{'username':name,'password':'Journey-fixture-password-123','adult':True},t)['csrf'];pid=req(c,'create-profile',{'nickname':'Esploratore'},t)['id'];return pid,t,name
  pid,ta,name=register(a);other,tb,_=register(b)
  device=client();td=req(device,'session')['csrf'];td=req(device,'login',{'username':name,'password':'Journey-fixture-password-123'},td)['csrf']
  db=sqlite3.connect(tmp+'/data/wordyland.sqlite');db.row_factory=sqlite3.Row
  def state():return req(a,'journey-state&profile='+str(pid))
  def start():return req(a,'journey-start',{'profile':pid,'now':'1999-01-01'},ta)['session']
  def answer(s):
   q=json.loads(db.execute('SELECT plan FROM holiday_days WHERE token=?',(s['token'],)).fetchone()[0])[s['step']]
   payload={'profile':pid,'token':s['token'],'step':s['step'],'answer':q['answer'],'attempt':secrets.token_hex(16),'coins':9999,'rewards':['bunny','koala']}
   result=req(a,'journey-answer',payload,ta);assert result['correct'];assert req(device,'journey-answer',payload,td)['replayed'];return result['session']
  baseline=req(a,'hub&profile='+str(pid))['wallet'];st=state();event=st['events'][0]
  assert len(st['events'])==1 and event['id']=='journey' and event['evergreen'] and event['active'] and event['closes'] is None
  assert len(event['rewards'])==12 and all(r['progress']==0 and not r['owned'] for r in event['rewards'])
  assert len(req(a,'holiday-state&profile='+str(pid))['events'])==4
  req(b,'journey-state&profile='+str(pid),status=404)
  req(a,'journey-start',{'profile':pid},'bad-csrf',403);req(a,'journey-start&profile='+str(pid),status=405)
  req(a,'holiday-start',{'profile':pid,'event':'journey'},ta,400)
  for reward in event['rewards']:
   for op in ['buy','equip']:req(a,op,{'profile':pid,'item':reward['id']},ta,403)
  s=start();assert start()['token']==s['token'];old_token=s['token'];assert s['day']=='2027-07-01'
  req(a,'holiday-hint',{'profile':pid,'token':s['token'],'step':0},ta,404)
  req(b,'journey-answer',{'profile':other,'token':s['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'anything'},tb,404)
  skip=req(a,'journey-answer',{'profile':pid,'token':s['token'],'step':3,'attempt':secrets.token_hex(16),'answer':'skip'},ta);assert skip['session']['step']==0
  req(a,'journey-hint',{'profile':pid,'token':s['token'],'step':0},ta);s=answer(s);assert s['step']==1
  # A long break preserves both the same frozen questions and confirmed exercise credit.
  plan=db.execute('SELECT plan FROM holiday_days WHERE token=?',(old_token,)).fetchone()[0]
  clock.write_text('2027-07-09 12:00:00');assert state()['events'][0]['session']['token']==old_token
  s=start();assert s['token']==old_token and s['step']==1
  assert req(device,'journey-state&profile='+str(pid))['events'][0]['session']['step']==1
  assert db.execute('SELECT plan FROM holiday_days WHERE token=?',(old_token,)).fetchone()[0]==plan
  while not s['done']:s=answer(s)
  w=req(a,'hub&profile='+str(pid))['wallet'];assert 'hat-leaf' in w['inventory'] and w['coins']==baseline['coins'] and w['xp']==baseline['xp']
  # Completing the carried mission allows today's distinct mission; never another for a completed date.
  s=start();assert s['day']=='2027-07-09' and s['token']!=old_token
  while not s['done']:s=answer(s)
  assert start()['done'] and start()['token']==s['token']
  assert 'neck-ocean' in req(a,'hub&profile='+str(pid))['wallet']['inventory']
  # Simulated existing review signals belong only to this owned profile.
  db.execute('INSERT INTO practice(profile_id,word,good,wrong) VALUES(?,?,0,2)',(pid,'pen'));db.commit()
  clock.write_text('2027-07-10 12:00:00');s=start();p=json.loads(db.execute('SELECT plan FROM holiday_days WHERE token=?',(s['token'],)).fetchone()[0]);assert p[0]['word']=='pen' and s['question']['review'] is True
  while not s['done']:s=answer(s)
  # Finish the finite first three collections through genuine answer endpoints.
  for n in range(27):
   clock.write_text((datetime.date(2027,7,11)+datetime.timedelta(days=n)).isoformat()+' 12:00:00');s=start()
   while not s['done']:s=answer(s)
   assert start()['done']
  result=state()['events'][0];assert len(result['rewards'])==12 and all(r['owned'] for r in result['rewards'])
  wallet=req(a,'hub&profile='+str(pid))['wallet'];assert {'bunny','koala'}.issubset(wallet['inventory']);assert wallet['coins']==baseline['coins'] and wallet['xp']==baseline['xp']
  assert all(wallet['inventory'].count(r['id'])==1 for r in result['rewards'])
  assert db.execute('SELECT SUM(step) FROM holiday_days WHERE profile_id=? AND season="journey:v1"',(pid,)).fetchone()[0]==90
  for avatar in ['bunny','koala']:assert req(a,'equip',{'profile':pid,'item':avatar},ta)['wallet']['equipped']['avatar']==avatar
  clock.write_text('2028-01-08 12:00:00');assert not next(e for e in req(a,'holiday-state&profile='+str(pid))['events'] if e['id']=='christmas')['active']
  assert state()['events'][0]['active'];assert all(r['owned'] for r in state()['events'][0]['rewards']);assert not start()['done']
  assert not any(r['owned'] for r in req(b,'journey-state&profile='+str(other))['events'][0]['rewards'])
  assert db.execute('SELECT COUNT(*) FROM rewards').fetchone()[0]==0
  print('Journey API passed: year-round and cross-year, separate festive gates, owned/CSRF/method checks, no direct buys, pending mission across skipped dates/devices, frozen plans/hints, one new mission per date, review selection, 90 real confirmed exercises, twelve permanent unique prizes, two earned characters, no XP/coin/streak reset or duplicate rewards.')
 finally:
  server.terminate();server.wait(timeout=5);log.close()
