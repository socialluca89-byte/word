"""Adult summaries are read-only, profile-owned and separate from classroom visibility."""
import http.cookiejar,json,os,shlex,socket,sqlite3,subprocess,tempfile,time,urllib.error,urllib.request
with tempfile.TemporaryDirectory(prefix='wordyland-parent-summary-') as tmp:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    log=open(tmp+'/server.log','w+')
    server=subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND','php'))+['-d','session.save_path='+tmp,'-S',f'127.0.0.1:{port}','-t','dist'],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=tmp+'/data'),stdout=log,stderr=log)
    def client():return urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def req(c,action,body=None,csrf='',expected=200):
        request=urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':csrf})
        try:response=c.open(request,timeout=8)
        except urllib.error.HTTPError as error:response=error
        result=json.loads(response.read());assert response.status==expected,(action,response.status,result);return result
    try:
        a,b,guest,learner=client(),client(),client(),client();password='Parent-summary-password-123'
        for _ in range(60):
            try:req(a,'session');break
            except urllib.error.URLError:time.sleep(.05)
        def register(c,name):
            csrf=req(c,'register',{'username':name,'password':password,'adult':True},req(c,'session')['csrf'])['csrf']
            return req(c,'create-profile',{'nickname':name},csrf)['id'],csrf
        pid,ta=register(a,'parent_luna');other,tb=register(b,'parent_sole');empty=req(a,'create-profile',{'nickname':'Altro profilo'},ta)['id']
        def mission(word,helped=False):
            req(a,'study-save',{'profile':pid,'title':word,'words':[[word,'esempio','📚']],'confirmed':True},ta)
            study=req(a,f'hub&profile={pid}')['studies'][0]['id'];q=req(a,'quest-start',{'profile':pid,'study':study},ta);payload={'profile':pid,'token':q['token'],'step':0}
            if helped:req(a,'quest-hint',payload,ta);req(a,'quest-answer',{**payload,'answer':'synthetic wrong'},ta)
            return req(a,'quest-answer',{**payload,'answer':word},ta)
        mission('head');balance=mission('hand',True)['wallet']
        req(a,'quest-start',{'profile':pid,'category':'body'},ta)
        club=req(a,'club-create',{'profile':pid,'name':'Classe fittizia','consent':True},ta);req(b,'club-join',{'profile':other,'code':club['code'],'consent':True},tb)
        child=req(learner,'class-register',{'code':club['code'],'nickname':'Stellina','password':password,'consent':True},req(learner,'session')['csrf'])['profiles'][0]['id']
        db=sqlite3.connect(tmp+'/data/wordyland.sqlite');db.execute('INSERT INTO practice(profile_id,word,good,wrong) VALUES (?,"legacy phrase",7,0)',(pid,));db.commit()
        def snapshot():return {table:db.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in ['accounts','profiles','wallets','inventory','quests','rewards','practice','practice_outcomes']}
        before=snapshot();summary=req(a,f'learning-summary&profile={pid}');assert summary['profile']==pid and summary['scope']=='owned-online-missions'
        assert summary['totals']=={'independent':1,'assisted':1,'corrected':1,'observed':2}
        assert summary['legacyCorrect']==7 and summary['reviewWords']==['hand'] and summary['reviewTotal']==1
        assert summary['completedMissions']==2 and summary['pendingMissions']==1 and summary['coins']==balance['coins'] and summary['xp']==balance['xp']
        assert snapshot()==before;assert req(a,f'learning-summary&profile={pid}')==summary and snapshot()==before
        empty_summary=req(a,f'learning-summary&profile={empty}');assert all(n==0 for n in empty_summary['totals'].values()) and empty_summary['reviewWords']==[] and empty_summary['coins']==0;assert snapshot()==before
        req(a,'learning-summary',{'profile':pid},ta,405)
        req(guest,f'learning-summary&profile={pid}',expected=401)
        req(b,f'learning-summary&profile={pid}',expected=404);req(a,f'learning-summary&profile={other}',expected=404)
        req(learner,f'learning-summary&profile={child}',expected=403);req(learner,f'profile&id={child}')
        # A global administrator retains the same owner-only boundary on this new endpoint.
        db.execute('UPDATE accounts SET role="admin" WHERE username="parent_sole"');db.commit()
        req(b,f'learning-summary&profile={pid}',expected=404);assert req(b,f'learning-summary&profile={other}')['profile']==other
        db.close();print('Parent summary API passed: own adult profiles only, no classmate/admin widening, learner/guest denial, unchanged child profile access, read-only GET, exact overlapping counts, legacy preservation, pending/review and no wallet writes.')
    finally:server.terminate();server.wait(timeout=5);log.close()
