"""Birillo's calendar metadata and harmlessness, through a local synthetic API only."""
import datetime,http.cookiejar,json,os,secrets,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error
from pathlib import Path
with tempfile.TemporaryDirectory(prefix='wordyland-elf-') as tmp:
 clock=Path(tmp)/'clock';clock.write_text('2026-12-07 23:59:59')
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
  token=req(a,'session')['csrf'];token=req(a,'register',{'username':'elf_'+secrets.token_hex(5),'password':'Elf-fixture-password-123','adult':True},token)['csrf'];pid=req(a,'create-profile',{'nickname':'Esploratore'},token)['id']
  def event():return next(e for e in req(a,'holiday-state&profile='+str(pid))['events'] if e['id']=='christmas')
  before=req(a,'hub&profile='+str(pid))['wallet'];assert not event()['elf']['active'];assert event()['elf']['opens']=='2026-12-08T00:00:00+01:00';assert event()['elf']['prank'] is None
  clock.write_text('2026-12-07 23:00:00+00:00');assert event()['elf']['active'] and event()['elf']['prank']['id']=='packages'
  sequence=[]
  for offset in range(31):
   date=datetime.date(2026,12,8)+datetime.timedelta(days=offset);clock.write_text(date.isoformat()+' 12:00:00');e=event();assert e['elf']['active'] and e['elf']['day']==date.isoformat();assert e==event(),'Same date must not randomize or mutate the daily story';sequence.append(e['elf']['prank']['id'])
   for other in req(a,'holiday-state&profile='+str(pid))['events']:
    if other['id']!='christmas':assert other['elf'] is None
  assert sequence[:5]==['packages','letter','sign','moustache','colors'];assert sequence[5:10]==sequence[:5]
  clock.write_text('2027-01-07 23:59:59');assert event()['elf']['active']
  clock.write_text('2027-01-08 00:00:00');assert event()['elf'] is None and not event()['active'];assert req(a,'journey-state&profile='+str(pid))['events'][0]['elf'] is None
  clock.write_text('2027-12-08 00:00:00');assert event()['elf']['active'] and event()['elf']['prank']['id']=='packages';assert event()['season']=='christmas:2027'
  assert req(a,'hub&profile='+str(pid))['wallet']==before,'Reading or cycling cosmetic pranks never grants or removes inventory, XP or coins'
  req(b,'holiday-state&profile='+str(pid),status=401)
  # Ordinary exercise grants remain the only reward path; prank body flags are ignored.
  clock.write_text('2026-12-08 12:00:00');s=req(a,'holiday-start',{'profile':pid,'event':'christmas','prankSolved':True,'reward':'snowpal'},token)['session'];assert req(a,'hub&profile='+str(pid))['wallet']==before
  db=sqlite3.connect(tmp+'/data/wordyland.sqlite');plan=json.loads(db.execute('SELECT plan FROM holiday_days WHERE token=?',(s['token'],)).fetchone()[0])
  while not s['done']:
   payload={'profile':pid,'token':s['token'],'step':s['step'],'answer':plan[s['step']]['answer'],'attempt':secrets.token_hex(16)}
   result=req(a,'holiday-answer',payload,token);s=result['session'];assert req(a,'holiday-answer',payload,token)['replayed']
  wallet=req(a,'hub&profile='+str(pid))['wallet'];assert wallet['coins']==before['coins'] and wallet['xp']==before['xp'];assert len([r for r in event()['rewards'] if r['owned']])==6 and 'snowpal' not in wallet['inventory']
  assert db.execute('SELECT SUM(step) FROM holiday_days WHERE profile_id=?',(pid,)).fetchone()[0]==3
  print('Elf API passed: exact Dec8 Italian midnight, inclusive Jan7 cutoff, 31 dates/five deterministic prank variants, annual reopening, no elf in other festivals/journey, no mutations from prank metadata, normal owned exercise rewards and idempotence unchanged.')
 finally:
  server.terminate();server.wait(timeout=5);log.close()
