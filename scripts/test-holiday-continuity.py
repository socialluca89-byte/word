"""Owned seasonal resume across midnight with real server-dated completion badges."""
import concurrent.futures
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
import threading
import time
import urllib.error
import urllib.request

with tempfile.TemporaryDirectory(prefix='wordyland-holiday-continuity-') as temporary:
    fixture=Path(temporary);public=fixture/'public';shutil.copytree('dist',public)
    clock=fixture/'clock';clock.write_text('2026-11-01 23:59:00')
    servers=[];ports=[];log=(fixture/'server.log').open('w+')
    env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_TEST_CLOCK_FILE=str(clock),WORDYLAND_DATA_DIR=str(fixture/'data'))
    def client():
        return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(person,action,body=None,csrf='',status=200,at=None):
        at=ports[0] if at is None else at;assert at in ports
        request=urllib.request.Request(f'http://127.0.0.1:{at}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=person.open(request,timeout=10)
        except urllib.error.HTTPError as error:response=error
        with response:
            data=json.loads(response.read());assert response.status==status,(action,response.status,data)
        return data
    def server():
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        ports.append(port)
        process=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+str(fixture),'-S',f'127.0.0.1:{port}','-t',str(public)],env=env,stdout=log,stderr=log);servers.append(process)
        probe=client()
        for _ in range(100):
            try:req(probe,'session',at=port);return port
            except urllib.error.URLError:time.sleep(.03)
        raise AssertionError('Local PHP fixture did not become ready')
    db=None
    try:
        server();owner,foreign=client(),client();password='Holiday-continuity-fixture-123'
        def register(person,label):
            name=label+'_'+secrets.token_hex(4);csrf=req(person,'session')['csrf'];csrf=req(person,'register',{'username':name,'password':password,'adult':True},csrf)['csrf']
            return req(person,'create-profile',{'nickname':label},csrf)['id'],csrf,name
        first,csrf,name=register(owner,'continuity');other,other_csrf,_=register(foreign,'other')
        device=client();device_csrf=req(device,'login',{'username':name,'password':password},req(device,'session')['csrf'])['csrf']
        db=sqlite3.connect(fixture/'data/wordyland.sqlite');db.row_factory=sqlite3.Row
        # A genuine legacy schema before completed_on existed. Its values must stay intact.
        old_schema='profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,season TEXT NOT NULL,day TEXT NOT NULL,token TEXT UNIQUE NOT NULL,plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,last_attempt TEXT'
        db.execute('CREATE TABLE holiday_days('+old_schema+',PRIMARY KEY(profile_id,season,day))')
        db.execute('CREATE TABLE holiday_rounds('+old_schema+',round INTEGER NOT NULL CHECK(round>=2),PRIMARY KEY(profile_id,season,day,round))')
        legacy='c'*48;db.execute('INSERT INTO holiday_days(profile_id,season,day,token,plan,step) VALUES(?,?,?,?,?,3)',(other,'christmas:2026','2026-11-01',legacy,'[]'));db.commit()
        legacy_before=tuple(db.execute('SELECT * FROM holiday_days WHERE token=?',(legacy,)).fetchone())
        second_port=server();gate=threading.Barrier(2)
        def initialize(person,port):gate.wait(timeout=5);return req(person,f'holiday-state&profile={first}',at=port)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            initialized=list(pool.map(lambda args:initialize(*args),[(owner,ports[0]),(device,second_port)]))
        assert all(result['timezone']=='Europe/Rome' for result in initialized)
        for table in ['holiday_days','holiday_rounds']:assert 'completed_on' in [row['name'] for row in db.execute('PRAGMA table_info('+table+')')]
        legacy_after=db.execute('SELECT * FROM holiday_days WHERE token=?',(legacy,)).fetchone()
        assert tuple(legacy_after)[:-1]==legacy_before and legacy_after['completed_on'] is None
        def profile(label):return req(owner,'create-profile',{'nickname':label},csrf)['id']
        def state(pid):return next(event for event in req(owner,f'holiday-state&profile={pid}')['events'] if event['id']=='christmas')
        def start(pid,previous=None,**extra):
            payload={'profile':pid,'event':'christmas',**extra}
            if previous is not None:payload.update(another=True,after=previous['token'])
            return req(owner,'holiday-start',payload,csrf)['session']
        def row(session):
            return db.execute('SELECT plan FROM holiday_days WHERE token=? UNION ALL SELECT plan FROM holiday_rounds WHERE token=?',(session['token'],session['token'])).fetchone()
        def payload(pid,session):return {'profile':pid,'token':session['token'],'step':session['step'],'attempt':secrets.token_hex(16),'answer':json.loads(row(session)['plan'])[session['step']]['answer'],'day':'1900-01-01','completed_on':'1900-01-01','eventDays':9999}
        def answer(pid,session):
            data=payload(pid,session);result=req(owner,'holiday-answer',data,csrf);assert result['correct'];assert req(device,'holiday-answer',data,device_csrf,at=second_port)['replayed'];return result['session']
        def finish(pid,session):
            while not session['done']:session=answer(pid,session)
            return session
        completed=[]
        for count in [0,1,2]:
            pid=profile('Before midnight '+str(count));clock.write_text('2026-11-01 23:59:00');session=start(pid)
            for _ in range(count):session=answer(pid,session)
            frozen=row(session)['plan'];token=session['token'];before=req(owner,f'hub&profile={pid}')['wallet']
            clock.write_text('2026-11-01 23:00:00+00:00') # Rome midnight, not client day.
            snapshot=[tuple(r) for r in db.execute('SELECT * FROM holiday_days WHERE profile_id=?',(pid,))]
            current=state(pid);assert current['session']['token']==token and current['session']['step']==count
            assert [tuple(r) for r in db.execute('SELECT * FROM holiday_days WHERE profile_id=?',(pid,))]==snapshot
            assert start(pid)['token']==token and row(session)['plan']==frozen
            req(foreign,'holiday-answer',dict(payload(pid,session),profile=other),other_csrf,404)
            req(owner,'holiday-answer',payload(pid,session),'bad-csrf',403)
            if count==2:
                one=payload(pid,session);two={**one,'attempt':secrets.token_hex(16)};barrier=threading.Barrier(2)
                def together(person,data,token,port):barrier.wait(timeout=5);return req(person,'holiday-answer',data,token,at=port)
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                    pending=[pool.submit(together,*args) for args in [(owner,one,csrf,ports[0]),(device,two,device_csrf,second_port)]]
                    results=[future.result() for future in pending]
                assert sum(bool(result.get('correct')) for result in results)==1 and sum(bool(result.get('replayed')) for result in results)==1
                session=next(result['session'] for result in results if result.get('correct'))
            else:session=finish(pid,session)
            assert session['completedOn']=='2026-11-02'
            stored=db.execute('SELECT * FROM holiday_days WHERE token=?',(token,)).fetchone();assert stored['day']=='2026-11-01' and stored['completed_on']=='2026-11-02' and stored['step']==3
            event=state(pid);assert event['dailyComplete']
            badges={reward['days']:reward for reward in event['rewards'] if reward['days']}
            assert badges[1]['owned'] and badges[3]['progress']==1 and not badges[3]['owned']
            today=start(pid,session);assert today['day']=='2026-11-02' and today['round']==1
            assert start(pid,session)['token']==today['token'];today=finish(pid,today)
            assert start(pid,session)['token']==today['token'],'Lost old predecessor cannot allocate an extra current-day round'
            assert next(reward for reward in state(pid)['rewards'] if reward['days']==3)['progress']==1
            after=req(owner,f'hub&profile={pid}')['wallet'];assert after['coins']==before['coins'] and after['xp']==before['xp']
            completed.append((pid,today))
        # Completing two missions on the same actual date is still one date badge.
        pid,today=completed[-1];clock.write_text('2026-11-03 12:00:00');daily=finish(pid,start(pid));extra=start(pid,daily)
        extra=answer(pid,extra);extra=answer(pid,extra);frozen=row(extra)['plan']
        clock.write_text('2026-11-04 00:00:00');assert start(pid)['token']==extra['token'];extra=finish(pid,start(pid));assert extra['completedOn']=='2026-11-04' and row(extra)['plan']==frozen
        assert next(reward for reward in state(pid)['rewards'] if reward['days']==3)['owned']
        # The old completed day remains byte-for-byte the same plus NULL metadata.
        assert tuple(db.execute('SELECT * FROM holiday_days WHERE token=?',(legacy,)).fetchone())[:-1]==legacy_before
        # Thirty-three genuine same-day replies still do not activate the blocked Grinch.
        clock.write_text('2026-11-05 12:00:00');thirty_three=profile('Finite collection');session=None
        for _ in range(11):session=finish(thirty_three,start(thirty_three,session))
        wallet=req(owner,f'hub&profile={thirty_three}')['wallet'];assert 'yeti' in wallet['inventory'] and 'grinch' not in wallet['inventory'] and wallet['coins']==0 and wallet['xp']==0
        assert len([item for item in req(owner,f'hub&profile={thirty_three}')['catalog'] if item.get('season')=='christmas' and item['slot']=='avatar'])==12
        # Neither partial daily nor extra rounds cross the final event boundary.
        clock.write_text('2027-01-07 23:59:59');end=start(pid);end=answer(pid,end)
        clock.write_text('2027-01-08 00:00:00');req(owner,'holiday-answer',payload(pid,end),csrf,410);req(owner,'holiday-start',{'profile':pid,'event':'christmas'},csrf,410)
        req(owner,'equip',{'profile':thirty_three,'item':'yeti'},csrf)
        clock.write_text('2027-11-01 00:00:00');fresh=state(pid);assert fresh['session'] is None;assert start(pid)['step']==0
        assert req(owner,f'hub&profile={thirty_three}')['wallet']['inventory']==wallet['inventory']
        assert db.execute('SELECT COUNT(*) FROM rewards').fetchone()[0]==0
        print('Holiday continuity passed: additive concurrent legacy migration, 0/1/2-step Rome-midnight resume and exact plans, owned/CSRF checks, two-worker final replay, server completed_on and distinct real completion-date badges, old predecessor retries, extra rounds, season cutoff, permanent inventory, 33 genuine replies with no Grinch or XP/coin changes.')
    finally:
        if db is not None:db.close()
        for process in reversed(servers):
            if process.poll() is None:
                process.terminate()
                try:process.wait(timeout=5)
                except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
        log.close()
