"""Arrival/calendar metadata: isolated server clock, synthetic owner, unchanged activity windows."""
import http.cookiejar,json,os,secrets,shlex,socket,subprocess,tempfile,time,urllib.request,urllib.error
from pathlib import Path
with tempfile.TemporaryDirectory(prefix='wordyland-calendar-') as tmp:
 clock=Path(tmp)/'clock';clock.write_text('2026-11-02 12:00:00')
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 log=open(tmp+'/server.log','w+')
 server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_TEST_CLOCK_FILE=str(clock),WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
 client=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(action,body=None,csrf=''):
  request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
  with client.open(request,timeout=5) as response:return json.loads(response.read())
 try:
  for _ in range(80):
   try:req('session');break
   except urllib.error.URLError:time.sleep(.05)
  csrf=req('session')['csrf'];csrf=req('register',{'username':'calendar_'+secrets.token_hex(5),'password':'Calendar-fixture-password-123','adult':True},csrf)['csrf'];pid=req('create-profile',{'nickname':'Calendario di prova'},csrf)['id']
  before=req('hub&profile='+str(pid))['wallet']
  cases=[
   ('2026-11-02 12:00:00','2026-11-02',True,False,2026),
   ('2026-12-07 23:59:59','2026-12-07',True,False,2026),
   ('2026-12-07 23:00:00+00:00','2026-12-08',True,True,2026),
   ('2027-01-01 12:00:00','2027-01-01',True,True,2026),
   ('2027-01-07 23:59:59','2027-01-07',True,True,2026),
   ('2027-01-07 23:00:00+00:00','2027-01-08',False,False,2027),
   ('2027-11-02 12:00:00','2027-11-02',True,False,2027),
   ('2027-12-08 00:00:00','2027-12-08',True,True,2027),
   ('2028-01-08 00:00:00','2028-01-08',False,False,2028),
  ]
  for value,day,event_active,elf_active,year in cases:
   clock.write_text(value);state=req('holiday-state&profile='+str(pid));assert state['day']==day and state['timezone']=='Europe/Rome';assert len(state['events'])==4
   event=next(e for e in state['events'] if e['id']=='christmas');schedule=event['elfSchedule'];assert event['season']=='christmas:'+str(year);assert event['active']==event_active;assert schedule['active']==elf_active;assert schedule['phase']==('active' if elf_active else 'upcoming');assert schedule['opens']==f'{year}-12-08T00:00:00+01:00';assert schedule['closes']==event['closes'];assert schedule['lastDay']==event['lastDay']==f'07/01/{year+1}'
   if event_active:assert event['elf']['active']==elf_active
   else:assert event['elf'] is None,'Closed-event visitor contract must remain unchanged'
   for other in state['events']:
    if other['id']!='christmas':assert other['elf'] is None and 'elfSchedule' not in other
  journey=req('journey-state&profile='+str(pid))['events'][0];assert journey['elf'] is None and 'elfSchedule' not in journey
  assert req('hub&profile='+str(pid))['wallet']==before,'Reading schedules never changes coins, progress or inventory'
  print('Holiday calendar API passed: server Rome dates/UTC boundaries, November/December/January, next-year arrivals, no premature visitor or rule changes, unchanged wallet and existing elf-null contract.')
 finally:
  server.terminate();server.wait(timeout=5);log.close()
