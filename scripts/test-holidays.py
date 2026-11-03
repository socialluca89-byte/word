"""Seasonal API/date/reward isolation: disposable database and synthetic clock only."""
import concurrent.futures,datetime,http.cookiejar,json,os,secrets,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.request,urllib.error
from pathlib import Path
with tempfile.TemporaryDirectory(prefix='wordyland-holidays-') as tmp:
 clock=Path(tmp)/'clock';clock.write_text('2026-11-01 12:00:00')
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 log=open(tmp+'/php.log','w+')
 server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_TEST_CLOCK_FILE=str(clock),WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
 def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(c,action,body=None,csrf='',status=200,at=port):
  r=urllib.request.Request(f'http://127.0.0.1:{at}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
  try:r=c.open(r,timeout=5)
  except urllib.error.HTTPError as e:r=e
  result=json.loads(r.read());assert r.status==status,(action,r.status,result);return result
 server2=None
 try:
  a,b=client(),client()
  for _ in range(80):
   try:req(a,'session');break
   except urllib.error.URLError:time.sleep(.05)
  def register(c):
   name='holiday_'+secrets.token_hex(5);csrf=req(c,'session')['csrf'];csrf=req(c,'register',{'username':name,'password':'Holiday-synthetic-password-123','adult':True},csrf)['csrf'];p=req(c,'create-profile',{'nickname':'Test esploratore'},csrf)['id'];return p,csrf,name
  pid,ta,name=register(a);other,tb,_=register(b)
  device=client();td=req(device,'session')['csrf'];td=req(device,'login',{'username':name,'password':'Holiday-synthetic-password-123'},td)['csrf']
  def state(c=a,p=pid):return req(c,'holiday-state&profile='+str(p))
  def event(id='christmas'):return next(e for e in state()['events'] if e['id']==id)
  def start(id='christmas',**kw):return req(a,'holiday-start',{'profile':pid,'event':id,**kw},ta)['session']
  db=sqlite3.connect(tmp+'/data/wordyland.sqlite');db.row_factory=sqlite3.Row
  baseline=req(a,'hub&profile='+str(pid))['wallet']
  assert state()['timezone']=='Europe/Rome' and len(state()['events'])==4
  assert event()['active'] and event()['lastDay']=='07/01/2027'
  assert not event('easter')['active'] and event('easter')['opens'].startswith('2027-03-14')
  for id in [x['id'] for x in req(a,'hub&profile='+str(pid))['catalog'] if x.get('event')]:
   for op in ['buy','equip']:req(a,op,{'profile':pid,'item':id},ta,403)
  req(b,'holiday-state&profile='+str(pid),status=404)
  req(a,'holiday-start',{'profile':pid,'event':'christmas'},'bad-csrf',403)
  req(a,'holiday-start&profile='+str(pid),status=405)
  req(a,'holiday-start',{'profile':pid,'event':'unknown'},ta,404)
  req(a,'holiday-start',{'profile':pid,'event':'easter'},ta,410)
  for day in [1,3,5,8,12,13,16,18,22,28]:
   clock.write_text(f'2026-11-{day:02d} 12:00:00');s=start(day='2000-01-01',reward='forged');assert start()['token']==s['token']
   assert state()['day']==f'2026-11-{day:02d}'
   req(b,'holiday-answer',{'profile':other,'token':s['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'anything'},tb,404)
   if day==1:
    skip=req(a,'holiday-answer',{'profile':pid,'token':s['token'],'step':3,'attempt':secrets.token_hex(16),'answer':'forged'},ta);assert skip['replayed'] and skip['session']['step']==0
    payload={'profile':pid,'token':s['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'wrong'}
    bad=req(a,'holiday-answer',payload,ta);assert bad['correct'] is False and bad['session']['step']==0 and bad['session']['question']['hint']
    assert req(a,'holiday-answer',payload,ta)['replayed']
   while not s['done']:
    saved=dict(db.execute('SELECT * FROM holiday_days WHERE token=?',(s['token'],)).fetchone());q=json.loads(saved['plan'])[s['step']]
    # Public question never exposes the answer unless the child requested/needed a hint.
    assert 'answer' not in s['question']
    hint=req(device,'holiday-hint',{'profile':pid,'token':s['token'],'step':s['step']},td)['session'];assert hint['question']['hint']==q['answer']
    assert event()['session']['question']['hint']==q['answer']
    payload={'profile':pid,'token':s['token'],'step':s['step'],'attempt':secrets.token_hex(16),'answer':q['answer'],'coins':9999}
    result=req(a,'holiday-answer',payload,ta);assert result['correct'];s=result['session'];assert req(device,'holiday-answer',payload,td)['replayed']
    if day==1 and s['step']==1:assert 'hat-santa' in result['earned'] and 'hat-santa' in result['wallet']['inventory'] and 'reindeer' not in result['wallet']['inventory']
   assert start()['done'];assert event()['session']['done']
   expected={1:6,3:10,5:14,8:18,12:22,13:23,16:24,18:25,22:26,28:27}[day]
   assert sum(r['owned'] for r in event()['rewards'])==expected,(day,event()['rewards'])
  after=req(a,'hub&profile='+str(pid))['wallet'];assert after['coins']==baseline['coins'] and after['xp']==baseline['xp']
  assert all(after['inventory'].count('souvenir-christmas-'+str(i))==1 for i in [1,2,3])
  assert db.execute('SELECT COUNT(*) FROM holiday_days WHERE profile_id=? AND step=3',(pid,)).fetchone()[0]==10
  assert {'reindeer','penguin','snowpal'}.issubset(after['inventory'])
  for avatar in ['reindeer','penguin','snowpal']:assert req(a,'equip',{'profile':pid,'item':avatar},ta)['wallet']['equipped']['avatar']==avatar
  # All five game formats rotate, with legacy plans retained intact.
  seen_modes=set()
  for date in [2,4]:
   clock.write_text(f'2026-11-{date:02d} 12:00:00');qs=start();plan=json.loads(db.execute('SELECT plan FROM holiday_days WHERE token=?',(qs['token'],)).fetchone()[0]);seen_modes.update(q['mode'] for q in plan)
   for q in plan:
    if q['mode']=='gap':assert q['mask'].replace('_',q['answer'],1)==q['word']
    if q['mode']=='build':assert sorted(q['tiles'])==sorted(q['word'])
  for row in db.execute('SELECT plan FROM holiday_days WHERE profile_id=?',(pid,)):seen_modes.update(q['mode'] for q in json.loads(row[0]))
  assert seen_modes=={'meaning','word','gap','build','write'},seen_modes
  # Midnight and event cutoff are server-owned, including stale open browser sessions.
  clock.write_text('2026-11-29 00:00:00');assert req(a,'holiday-hint',{'profile':pid,'token':s['token'],'step':3},ta)['replayed']
  clock.write_text('2027-01-07 23:59:59');assert event()['active'];last=start()
  clock.write_text('2027-01-08 00:00:00');assert not event()['active']
  req(a,'holiday-start',{'profile':pid,'event':'christmas','day':'2027-01-07'},ta,410)
  req(a,'holiday-answer',{'profile':pid,'token':last['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'anything'},ta,410)
  req(a,'equip',{'profile':pid,'item':'souvenir-christmas-3'},ta)
  clock.write_text('2027-11-01 00:00:00');assert event()['active'] and event()['season']=='christmas:2027';assert all(r['owned'] and r['progress']==0 for r in event()['rewards']);assert start()['step']==0
  # DST/local midnight, one daily lease, and all future event schedules.
  clock.write_text('2027-11-01 23:00:00+00:00');assert state()['day']=='2027-11-02';assert not start()['done']
  for date,id in [('2027-02-09 12:00:00','carnival'),('2027-03-28 12:00:00','easter'),('2027-10-31 12:00:00','halloween')]:
   clock.write_text(date);assert event(id)['active'];assert start(id)['total']==3
   if id=='halloween':
    hs=start(id)
    while not hs['done']:
     q=json.loads(db.execute('SELECT plan FROM holiday_days WHERE token=?',(hs['token'],)).fetchone()[0])[hs['step']]
     hs=req(a,'holiday-answer',{'profile':pid,'token':hs['token'],'step':hs['step'],'attempt':secrets.token_hex(16),'answer':q['answer']},ta)['session']
    assert event(id)['rewards'][0]['owned']
  clock.write_text('2026-10-31 23:59:59');assert not event()['active']
  req(a,'holiday-start',{'profile':pid,'event':'christmas','now':'2026-11-01'},ta,410)
  assert not any(r['owned'] for r in state(b,other)['events'][0]['rewards'])
  # Festival claims have no side effects on ordinary rewards/progress tables.
  assert db.execute('SELECT COUNT(*) FROM rewards').fetchone()[0]==0
  # Repeatable character challenges: additive rows, unchanged daily history and date badges.
  legacy=[tuple(row) for row in db.execute('SELECT * FROM holiday_days WHERE profile_id=? ORDER BY season,day',(pid,))]
  clock.write_text('2026-11-04 12:00:00');c=client();cp,tc,cname=register(c)
  cd=client();tcd=req(cd,'session')['csrf'];tcd=req(cd,'login',{'username':cname,'password':'Holiday-synthetic-password-123'},tcd)['csrf']
  def repeatstate():return next(e for e in req(c,'holiday-state&profile='+str(cp))['events'] if e['id']=='christmas')
  def repeatstart(**kw):return req(c,'holiday-start',{'profile':cp,'event':'christmas',**kw},tc)['session']
  def stored(s):return db.execute('SELECT plan FROM holiday_days WHERE token=? UNION ALL SELECT plan FROM holiday_rounds WHERE token=?',(s['token'],s['token'])).fetchone()[0]
  def finish(s):
   while not s['done']:
    q=json.loads(stored(s))[s['step']];payload={'profile':cp,'token':s['token'],'step':s['step'],'attempt':secrets.token_hex(16),'answer':q['answer'],'coins':9999,'eventDays':9999}
    result=req(c,'holiday-answer',payload,tc);assert result['correct'];s=result['session']
    replay=req(cd,'holiday-answer',payload,tcd);assert replay['replayed'] and replay['session']['step']==s['step']
   return s
  empty=repeatstate();assert empty['repeatable'] and not empty['dailyComplete'] and empty['session'] is None
  first=repeatstart();assert first['round']==1
  req(c,'holiday-start',{'profile':cp,'event':'christmas','another':True,'after':first['token']},tc,409)
  first=finish(first);assert repeatstate()['dailyComplete'] and repeatstart()['token']==first['token']
  req(c,'holiday-start',{'profile':cp,'event':'christmas','another':True},tc,400)
  req(c,'holiday-start',{'profile':cp,'event':'christmas','another':'yes','after':first['token']},tc,400)
  req(c,'holiday-start',{'profile':cp,'event':'christmas','another':True,'after':last['token']},tc,404)
  req(c,'holiday-start',{'profile':cp,'event':'christmas','another':True,'after':'a'*48},tc,404)
  # Two PHP workers share only this disposable database and use distinct sessions.
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port2=sock.getsockname()[1]
  server2=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port2}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_TEST_CLOCK_FILE=str(clock),WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
  for _ in range(80):
   try:req(cd,'session',at=port2);break
   except urllib.error.URLError:time.sleep(.05)
  payload={'profile':cp,'event':'christmas','another':True,'after':first['token']}
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
   answers=list(pool.map(lambda args:req(args[0],'holiday-start',payload,args[1],at=args[2]),[(c,tc,port),(cd,tcd,port2)]))
  second=answers[0]['session'];assert answers[1]['session']['token']==second['token'] and second['round']==2
  assert db.execute('SELECT COUNT(*) FROM holiday_rounds WHERE profile_id=?',(cp,)).fetchone()[0]==1
  assert repeatstart(another=True,after=first['token'])['token']==second['token']
  assert stored(first)!=stored(second),'A new round contains new questions, not the old completed plan'
  req(b,'holiday-answer',{'profile':other,'token':second['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'anything'},tb,404)
  bad=req(c,'holiday-answer',{'profile':cp,'token':second['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'wrong','exercises':9999},tc)
  assert not bad['correct'] and bad['session']['step']==0 and all(not r['owned'] for r in bad['rewards'] if r['id'] in ['reindeer','santa','yeti'])
  second=finish(second);assert repeatstate()['session']['token']==second['token'] and repeatstart()['done']
  w=req(c,'hub&profile='+str(cp))['wallet'];assert w['inventory'].count('reindeer')==1 and 'polar-bear' not in w['inventory']
  # Lost response + another device finishing the allocated round cannot turn a retry into a new round.
  assert repeatstart(another=True,after=first['token'])['token']==second['token']
  assert db.execute('SELECT COUNT(*) FROM holiday_rounds WHERE profile_id=?',(cp,)).fetchone()[0]==1
  current=second
  for n in range(3,11):
   current=repeatstart(another=True,after=current['token']);assert current['round']==n and current['step']==0
   assert repeatstart()['token']==current['token']
   hint=req(cd,'holiday-hint',{'profile':cp,'token':current['token'],'step':0},tcd)['session'];assert hint['question']['hint']
   assert repeatstate()['session']['question']['hint']==hint['question']['hint']
   current=finish(current)
  same_day=repeatstate();w=req(c,'hub&profile='+str(cp))['wallet']
  assert all(r['owned'] for r in same_day['rewards'] if r['exercises']),same_day['rewards']
  assert all(w['inventory'].count(r['id'])==1 for r in same_day['rewards'] if r['owned'])
  assert w['coins']==0 and w['xp']==0
  days={r['days']:r for r in same_day['rewards'] if r['days']};assert days[1]['owned'] and not days[3]['owned'] and not days[5]['owned']
  assert days[3]['progress']==1 and days[5]['progress']==1
  assert db.execute('SELECT SUM(step) FROM holiday_rounds WHERE profile_id=?',(cp,)).fetchone()[0]==27
  assert db.execute('SELECT COUNT(*) FROM holiday_days WHERE profile_id=?',(cp,)).fetchone()[0]==1
  assert [tuple(row) for row in db.execute('SELECT * FROM holiday_days WHERE profile_id=? ORDER BY season,day',(pid,))]==legacy
  for avatar in [r['id'] for r in same_day['rewards'] if r['slot']=='avatar']:assert req(c,'equip',{'profile':cp,'item':avatar},tc)['wallet']['equipped']['avatar']==avatar
  # New day allocates at most its single daily from an old completed predecessor.
  clock.write_text('2026-11-05 00:00:00')
  daily=repeatstart(another=True,after=current['token']);assert daily['round']==1 and daily['day']=='2026-11-05'
  assert repeatstart(another=True,after=current['token'])['token']==daily['token']
  assert req(c,'holiday-hint',{'profile':cp,'token':current['token'],'step':3},tc)['replayed']
  assert repeatstart()['token']==daily['token'];finish(daily)
  clock.write_text('2026-11-07 12:00:00');finish(repeatstart())
  assert next(r for r in repeatstate()['rewards'] if r['days']==3)['owned']
  clock.write_text('2027-01-07 23:59:59');cutoff=finish(repeatstart());extra=repeatstart(another=True,after=cutoff['token']);assert extra['round']==2
  clock.write_text('2027-01-08 00:00:00')
  req(c,'holiday-answer',{'profile':cp,'token':extra['token'],'step':0,'attempt':secrets.token_hex(16),'answer':'anything'},tc,410)
  req(c,'holiday-start',{'profile':cp,'event':'christmas','another':True,'after':cutoff['token']},tc,410)
  assert req(c,'equip',{'profile':cp,'item':'yeti'},tc)['wallet']['equipped']['avatar']=='yeti'
  assert db.execute('SELECT COUNT(*) FROM rewards').fetchone()[0]==0
  print('Holiday API passed: preserved annual calendars, daily rows/date badges and season cutoff; additive repeatable rounds, all characters earned in one day through 30 real exercises, two-worker double-start idempotence, lost-response replay, private device resume/hints, no forged/duplicate grants or XP/coins, permanent equip and unchanged historic daily plans.')
 finally:
  if server2:server2.terminate();server2.wait(timeout=5)
  server.terminate();server.wait(timeout=5);log.close()
