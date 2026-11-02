"""Private guardian capabilities: synthetic accounts only; no email or production."""
import concurrent.futures
import calendar
import hashlib
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

with tempfile.TemporaryDirectory(prefix='wordyland-guardian-') as tmp:
    # Scheduling barriers exist only in this disposable copy, never in production code.
    public=tmp+'/public';shutil.copytree('dist',public)
    module=Path(public+'/guardian.php');source=module.read_text()
    hook='''
function guardianFixtureBarrier(string $directory,string $stage):void{
    $wait=$directory.'/guardian-wait-'.$stage;if(!is_file($wait))return;
    file_put_contents($directory.'/guardian-reached-'.$stage,'1');$until=microtime(true)+8;
    while(is_file($wait)&&microtime(true)<$until){clearstatcache(true,$wait);usleep(1000);}
    if(is_file($wait))throw new RuntimeException('Synthetic barrier timed out');
}
'''
    anchor='function guardianCurrent(PDO $db,int $link):array|false{';assert source.count(anchor)==1
    source=source.replace(anchor,hook+anchor+"\n    global $dataDir,$action;if($action==='guardian-state')guardianFixtureBarrier($dataDir,'detail');",1)
    anchor="if ($action==='guardian-state') {";assert source.count(anchor)==1
    source=source.replace(anchor,anchor+"\n    guardianFixtureBarrier($dataDir,'before');",1);module.write_text(source)
    ports=[]
    for _ in range(2):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0));ports.append(sock.getsockname()[1])
    log=open(tmp+'/server.log','w+')
    servers=[subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t',public],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log) for port in ports]
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(c,action,body=None,csrf='',expected=200,port=None):
        request=urllib.request.Request(f'http://127.0.0.1:{port or ports[0]}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=c.open(request,timeout=12)
        except urllib.error.HTTPError as error:response=error
        result=json.loads(response.read())
        assert response.status==expected,(action,response.status,expected,sorted(result))
        return result
    try:
        teacher,parent,other,second,child,guest=[client() for _ in range(6)]
        for _ in range(80):
            try:req(teacher,'session');break
            except urllib.error.URLError:time.sleep(.05)
        else:raise RuntimeError('Synthetic PHP server did not start')
        password='Guardian-fixture-only-123'
        def register(c,name):
            result=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])
            return result['csrf'],req(c,'create-profile',{'nickname':name},result['csrf'])['id']
        tt,teacher_profile=register(teacher,'guardian_teacher')
        pt,parent_profile=register(parent,'guardian_parent')
        ot,other_profile=register(other,'guardian_other')
        st,second_profile=register(second,'guardian_second')
        club=req(teacher,'club-create',{'profile':teacher_profile,'name':'Synthetic first','consent':True},tt)
        club2=req(second,'club-create',{'profile':second_profile,'name':'Synthetic second','consent':True},st)
        learner=req(child,'class-register',{'code':club['code'],'nickname':'PupilFixture','password':password,'consent':True},req(child,'session')['csrf'])
        ct=learner['csrf'];pid=learner['profiles'][0]['id']
        db=sqlite3.connect(tmp+'/data/wordyland.sqlite')
        # Only an adult manages enrollment. A second authorized membership is
        # a synthetic database fixture for the two-owner race, never a new permission.
        db.execute('INSERT INTO club_profiles VALUES (?,?)',(club2['id'],pid));db.commit()
        ids=dict(db.execute('SELECT username,id FROM accounts'))
        req(guest,'guardian-state',expected=401);req(child,'guardian-state',expected=403)
        assert req(other,'guardian-state')=={'scope':'guardian-progress-read-only','received':[],'managedClasses':[],'issued':[]}
        managed=req(teacher,'guardian-state')['managedClasses']
        assert managed==[{'id':club['id'],'name':'Synthetic first','learners':[{'id':pid,'nickname':'PupilFixture'}]}]
        req(parent,'guardian-code',{},expected=403)
        req(parent,'guardian-code',expected=405)
        req(parent,'guardian-progress',{},pt,405)
        def pair():return req(parent,'guardian-code',{},pt)['code']
        def invite(code,teacher_client=teacher,token=tt,which=club):return req(teacher_client,'guardian-invite',{'club':which['id'],'profile':pid,'code':code,'authorized':True},token)['invitation']
        code=pair()
        stored=db.execute('SELECT code_hash FROM guardian_pairings WHERE parent_id=?',(ids['guardian_parent'],)).fetchone()[0]
        assert stored==hashlib.sha256(code.encode()).hexdigest() and stored!=code
        body={'club':club['id'],'profile':pid,'code':code,'authorized':True}
        req(other,'guardian-invite',body,ot,404)
        req(teacher,'guardian-invite',{**body,'profile':teacher_profile},tt,404)
        req(teacher,'guardian-invite',{**body,'authorized':False},tt,400)
        link=invite(code)
        req(teacher,'guardian-invite',body,tt,404)
        assert not db.execute('SELECT 1 FROM guardian_pairings WHERE code_hash=?',(stored,)).fetchone()
        state=req(parent,'guardian-state');pending=state['received'][0]
        assert pending['id']==link and pending['status']=='pending' and state['managedClasses']==[]
        assert set(pending)=={'id','version','nickname','className','status','expires'}
        accept={'link':link,'version':pending['version'],'confirmGuardian':True}
        req(parent,f'guardian-progress&link={link}',expected=404)
        req(other,'guardian-accept',accept,ot,404)
        req(parent,'guardian-accept',{**accept,'confirmGuardian':False},pt,400)
        req(parent,'guardian-accept',accept,expected=403)
        assert req(parent,'guardian-accept',accept,pt)=={'ok':True,'replayed':False}
        assert req(parent,'guardian-accept',accept,pt)=={'ok':True,'replayed':True}
        assert req(parent,'session')['profiles']==[{'id':parent_profile,'nickname':'guardian_parent','revision':0}]
        # A new read capability must not turn the learner into an owned profile.
        for action in [f'profile&id={pid}',f'hub&profile={pid}',f'training-progress&profile={pid}',f'learning-summary&profile={pid}']:
            req(parent,action,expected=404)
        req(parent,'rename-profile',{'profile':pid,'nickname':'Not permitted'},pt,404)
        req(parent,'study-save',{'profile':pid,'title':'Not permitted','words':[['cat','gatto','x']],'confirmed':True},pt,404)
        req(parent,'buy',{'profile':pid,'item':'cap'},pt,404)
        req(other,f'guardian-progress&link={link}',expected=404)
        req(teacher,f'guardian-progress&link={link}',expected=404)
        req(parent,'guardian-progress&link=999999',expected=404)
        db.execute('UPDATE accounts SET role="admin" WHERE id=?',(ids['guardian_other'],));db.commit()
        req(other,f'guardian-progress&link={link}',expected=404)
        assert req(other,'guardian-state')['managedClasses']==[]
        # Only dated aggregate counters cross the capability boundary.
        req(child,'training-start',{'profile':pid,'track':'words','pack':'first'},ct)
        today=time.strftime('%Y-%m-%d',time.gmtime());midnight=calendar.timegm(time.strptime(today,'%Y-%m-%d'))
        old=time.strftime('%Y-%m-%d',time.gmtime(midnight-90*86400));boundary=time.strftime('%Y-%m-%d',time.gmtime(midnight-89*86400));future=time.strftime('%Y-%m-%d',time.gmtime(midnight+86400))
        db.execute('INSERT INTO training_daily VALUES (?,?,?,?,?,?,?,?,?)',(pid,today,'word:private fixture name','spelling.recall',3,1,2,4,5))
        db.execute('INSERT INTO training_daily VALUES (?,?,?,?,?,?,?,?,?)',(pid,boundary,'word:private boundary','spelling.recall',2,0,2,0,0))
        db.execute('INSERT INTO training_daily VALUES (?,?,?,?,?,?,?,?,?)',(pid,old,'word:private old','spelling.recall',99,99,0,0,0))
        db.execute('INSERT INTO training_daily VALUES (?,?,?,?,?,?,?,?,?)',(pid,future,'word:private future','spelling.recall',99,99,0,0,0))
        db.commit()
        req(child,f'phonics-state&profile={pid}')
        for created,completed in [(midnight-29*86400+3600,midnight-24*86400+3600),(midnight-40*86400,midnight-35*86400),(int(time.time()),midnight+86400),(midnight+86400,int(time.time()))]:
            db.execute('INSERT INTO phonics_sessions(token,profile_id,lesson,plan,step,created_at,completed_at) VALUES (?,?,?,"[]",6,?,?)',(secrets.token_hex(24),pid,'s',created,completed))
        db.commit()
        def snapshot():return {table:db.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in ['accounts','profiles','wallets','inventory','quests','rewards','practice','training_daily','guardian_links','guardian_pairings']}
        before=snapshot();report=req(parent,f'guardian-progress&link={link}')
        assert report['scope']=='guardian-progress-read-only' and report['historyDays']==90
        assert report['training']=={'available':True,'activities':5,'independent':1,'guided':4,'errors':4,'replays':5,'days':2}
        assert report['phonics']=={'available':True,'guidedPaths':1,'windowDays':30,'windowBasis':'started'}
        serialized=json.dumps(report)
        assert all(key not in report for key in ['profile','state','wallet','coins','xp','studies','roster','reviewWords','items'])
        assert 'private fixture name' not in serialized and 'private old' not in serialized and 'alunno_' not in serialized
        assert snapshot()==before and req(parent,f'guardian-progress&link={link}')==report and snapshot()==before
        # Pause after authorized IDs but before their metadata is read. A concurrent
        # owner/metadata mutation cannot disclose post-revocation names to the issuer.
        def barrier(stage):
            wait=Path(tmp+'/data/guardian-wait-'+stage);reached=Path(tmp+'/data/guardian-reached-'+stage)
            reached.unlink(missing_ok=True);wait.write_text('1');return wait,reached
        def wait_reached(reached):
            until=time.monotonic()+5
            while not reached.exists() and time.monotonic()<until:time.sleep(.005)
            assert reached.exists(),'Synthetic scheduling barrier not reached'
        wait,reached=barrier('detail');staged=threading.Event()
        def change_class():
            with sqlite3.connect(tmp+'/data/wordyland.sqlite',timeout=10) as writer:
                writer.execute('BEGIN IMMEDIATE')
                writer.execute('UPDATE clubs SET owner_id=?,name="Private renamed class" WHERE id=?',(ids['guardian_second'],club['id']))
                writer.execute('UPDATE profiles SET nickname="Private renamed pupil" WHERE id=?',(pid,))
                staged.set();writer.commit()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            reading=pool.submit(req,teacher,'guardian-state');wait_reached(reached)
            writing=pool.submit(change_class);assert staged.wait(5);assert not writing.done()
            wait.unlink();prior=reading.result(timeout=10);writing.result(timeout=10)
        assert 'Private renamed' not in json.dumps(prior)
        assert prior['managedClasses'][0]['learners']==[{'id':pid,'nickname':'PupilFixture'}]
        assert prior['issued'][0]['nickname']=='PupilFixture'
        assert req(teacher,'guardian-state')['managedClasses']==[] and req(teacher,'guardian-state')['issued']==[]
        db.execute('UPDATE clubs SET owner_id=?,name="Synthetic first" WHERE id=?',(ids['guardian_teacher'],club['id']))
        db.execute('UPDATE profiles SET nickname="PupilFixture" WHERE id=?',(pid,));db.commit()
        req(parent,f'guardian-progress&link={link}',expected=404)
        link=invite(pair());accept={'link':link,'version':req(parent,'guardian-state')['received'][0]['version'],'confirmGuardian':True};req(parent,'guardian-accept',accept,pt)
        # A role changed after the ordinary session guard is checked again inside
        # the same read snapshot as state data. No metadata is returned to a learner.
        wait,reached=barrier('before')
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            reading=pool.submit(req,parent,'guardian-state',None,'',403);wait_reached(reached)
            db.execute('UPDATE accounts SET role="learner" WHERE id=?',(ids['guardian_parent'],));db.commit();wait.unlink()
            assert set(reading.result(timeout=10))=={'error'}
        db.execute('UPDATE accounts SET role="adult" WHERE id=?',(ids['guardian_parent'],));db.commit()
        req(parent,f'guardian-progress&link={link}',expected=404)
        link=invite(pair());accept={'link':link,'version':req(parent,'guardian-state')['received'][0]['version'],'confirmGuardian':True};req(parent,'guardian-accept',accept,pt)
        # Role or ownership loss denies immediately, including existing grants.
        db.execute('UPDATE clubs SET owner_id=? WHERE id=?',(ids['guardian_second'],club['id']))
        db.execute('UPDATE clubs SET owner_id=? WHERE id=?',(ids['guardian_teacher'],club['id']));db.commit()
        req(parent,f'guardian-progress&link={link}',expected=404);assert req(parent,'guardian-state')['received']==[]
        link=invite(pair());accept={'link':link,'version':req(parent,'guardian-state')['received'][0]['version'],'confirmGuardian':True};req(parent,'guardian-accept',accept,pt)
        db.execute('UPDATE accounts SET role="learner" WHERE id=?',(ids['guardian_parent'],))
        db.execute('UPDATE accounts SET role="adult" WHERE id=?',(ids['guardian_parent'],));db.commit()
        req(parent,f'guardian-progress&link={link}',expected=404)
        link=invite(pair());accept={'link':link,'version':req(parent,'guardian-state')['received'][0]['version'],'confirmGuardian':True};req(parent,'guardian-accept',accept,pt)
        child_account=db.execute('SELECT account_id FROM profiles WHERE id=?',(pid,)).fetchone()[0]
        db.execute('UPDATE profiles SET account_id=? WHERE id=?',(ids['guardian_teacher'],pid))
        db.execute('UPDATE profiles SET account_id=? WHERE id=?',(child_account,pid));db.commit()
        req(parent,f'guardian-progress&link={link}',expected=404)
        link=invite(pair());accept={'link':link,'version':req(parent,'guardian-state')['received'][0]['version'],'confirmGuardian':True};req(parent,'guardian-accept',accept,pt)
        # Parent and class owner can revoke; a stale version cannot accept a reissue.
        req(other,'guardian-revoke',accept,ot,404)
        req(teacher,'guardian-revoke',accept,tt)
        req(parent,f'guardian-progress&link={link}',expected=404)
        assert invite(pair())==link
        newer=req(parent,'guardian-state')['received'][0];assert newer['version']==accept['version']+1
        req(parent,'guardian-accept',accept,pt,409)
        accept={**accept,'version':newer['version']}
        req(parent,'guardian-accept',accept,pt)
        # Membership deletion is irreversible for this grant even after re-enrollment.
        db.execute('PRAGMA foreign_keys=ON');db.execute('DELETE FROM club_profiles WHERE club_id=? AND profile_id=?',(club['id'],pid));db.commit()
        assert not db.execute('SELECT 1 FROM guardian_links WHERE id=?',(link,)).fetchone()
        db.execute('INSERT INTO club_profiles VALUES (?,?)',(club['id'],pid));db.commit()
        req(parent,f'guardian-progress&link={link}',expected=404)
        # Code and unaccepted invitation expiration fail closed.
        expired=pair();db.execute('UPDATE guardian_pairings SET expires=?',(int(time.time())-1,));db.commit()
        req(teacher,'guardian-invite',{'club':club['id'],'profile':pid,'code':expired,'authorized':True},tt,404)
        deleted_link=link;link=invite(pair());assert link!=deleted_link,'Deleted invitation IDs must never be recycled for a different capability'
        db.execute('UPDATE guardian_links SET expires=? WHERE id=?',(int(time.time())-1,link));db.commit()
        row=db.execute('SELECT version FROM guardian_links WHERE id=?',(link,)).fetchone()
        req(parent,'guardian-accept',{'link':link,'version':row[0],'confirmGuardian':True},pt,404)
        assert req(parent,'guardian-state')['received']==[]
        # Two real PHP processes consume one pairing code at most once.
        code=pair()
        def racing_invite(args):
            c,token,which,port=args
            request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action=guardian-invite',data=json.dumps({'club':which['id'],'profile':pid,'code':code,'authorized':True}).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':token})
            try:response=c.open(request,timeout=12)
            except urllib.error.HTTPError as error:response=error
            response.read();return response.status
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            statuses=list(pool.map(racing_invite,[(teacher,tt,club,ports[0]),(second,st,club2,ports[1])]))
        assert sorted(statuses)==[200,404],statuses
        invitation=req(parent,'guardian-state')['received'][0]
        parent2=client();pt2=req(parent2,'login',{'username':'guardian_parent','password':password},req(parent2,'session')['csrf'])['csrf']
        acceptance={'link':invitation['id'],'version':invitation['version'],'confirmGuardian':True}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            replies=list(pool.map(lambda args:req(args[0],'guardian-accept',acceptance,args[1],port=args[2]),[(parent,pt,ports[0]),(parent2,pt2,ports[1])]))
        assert sorted(reply['replayed'] for reply in replies)==[False,True]
        req(parent,'guardian-revoke',acceptance,pt)
        req(parent2,f'guardian-progress&link={invitation["id"]}',expected=404)
        # A consumed code is never stored in plaintext, and ordinary account access survives.
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
        assert req(child,f'profile&id={pid}')['nickname']=='PupilFixture'
        assert req(parent,f'profile&id={parent_profile}')['nickname']=='guardian_parent'
        db.execute('DELETE FROM rate_limits WHERE bucket=?',('guardian-code:'+str(ids['guardian_parent']),));db.commit()
        for _ in range(10):req(parent,'guardian-code',{},pt)
        req(parent,'guardian-code',{},pt,429)
        db.close()
        print('Guardian API passed: account-bound double consent, hashed expiring pairing, CSRF/roles/IDOR, no owned-profile widening, exact90date training and30day-started phonics cohort, immutable progress, coherent snapshot metadata/role races, monotonic owner/role/profile transfer revocation without intervening reads, membership cascade/re-enrollment, expiration/version replay, two-server code/accept races and limits. Synthetic accounts only; no mail sent.')
    finally:
        for server in servers:server.terminate()
        for server in servers:server.wait(timeout=5)
        log.close()
