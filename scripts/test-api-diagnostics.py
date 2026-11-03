"""Synthetic local service-failure correlation without request/identity content."""
import json, os, re, shlex, shutil, socket, subprocess, tempfile, time
from pathlib import Path
import urllib.request, urllib.error
ROOT=Path(__file__).resolve().parents[1]
PHP=shlex.split(os.environ.get('PHP_COMMAND','php'))
SENTINEL='SYNTHETIC_PRIVATE_INPUT_938471'
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
with tempfile.TemporaryDirectory(prefix='wordyland-diagnostics-') as temp:
    root=Path(temp);public=root/'public';shutil.copytree(ROOT/'dist',public)
    (public/'.wordyland-managed').write_text('a'*40+'\n')
    original=root/'private';original.mkdir();unsafe=root/'unsafe';unsafe.symlink_to(original,target_is_directory=True)
    servers=[];logs=[]
    def server(data,label):
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        log=(root/(label+'-server.log')).open('w+');logs.append(log)
        errorlog=root/(label+'-errors.log')
        proc=subprocess.Popen(PHP+['-d','session.save_path='+temp,'-d','log_errors=1','-d','error_log='+str(errorlog),'-S','127.0.0.1:'+str(port),'-t',str(public)],env=dict(os.environ,WORDYLAND_TEST='1',WORDYLAND_DATA_DIR=str(data)),stdout=log,stderr=log);servers.append(proc)
        for _ in range(80):
            try:
                with opener.open('http://127.0.0.1:'+str(port)+'/api.php?action=auth-capabilities',timeout=1):pass
                return port,errorlog
            except urllib.error.HTTPError:return port,errorlog
            except urllib.error.URLError:time.sleep(.03)
        raise AssertionError('Local diagnostic fixture unavailable')
    def request(port,action,body=None):
        req=urllib.request.Request('http://127.0.0.1:'+str(port)+'/api.php?action='+action,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','X-Request-ID':SENTINEL})
        try:response=opener.open(req,timeout=5)
        except urllib.error.HTTPError as e:response=e
        with response:return response.status,dict(response.headers),json.loads(response.read())
    try:
        healthy,healthylog=server(root/'good-data','good')
        status,headers,data=request(healthy,'auth-capabilities')
        assert status==200 and set(data)=={'emailRecoveryEnabled'}
        assert re.fullmatch('[a-f0-9]{24}',headers['X-Request-ID'])
        assert 'Set-Cookie' not in headers and not (root/'good-data').exists(),'Capabilities must remain session/database-free'
        _,headers2,data2=request(healthy,'session');assert headers2['X-Request-ID']!=headers['X-Request-ID'] and 'requestId' not in data2
        broken,errorlog=server(unsafe,'broken')
        ids=[]
        for action,body in [('session&probe='+SENTINEL,None),('training-'+SENTINEL,{'password':SENTINEL,'token':SENTINEL,'answer':SENTINEL}),('feedback-create',{'nickname':SENTINEL})]:
            status,h,d=request(broken,action,body);assert status==503 and set(d)=={'error','requestId'}
            assert re.fullmatch('[a-f0-9]{24}',d['requestId']) and h['X-Request-ID']==d['requestId'] and SENTINEL not in json.dumps(d)
            ids.append(d['requestId'])
        assert len(set(ids))==3
        entries=[json.loads(line.split('WordyLand API ',1)[1]) for line in errorlog.read_text().splitlines() if 'WordyLand API ' in line]
        assert len(entries)>=3
        for entry in entries:
            assert set(entry)=={'requestId','operation','release','error'}
            assert entry['release']=='a'*40 and entry['error']=='RuntimeException'
        raw=errorlog.read_text();assert SENTINEL not in raw and str(root) not in raw and 'password' not in raw and 'answer' not in raw
        assert all(any(e['requestId']==value for e in entries) for value in ids)
        (public/'.wordyland-managed').write_text(SENTINEL)
        status,h,d=request(broken,'session');assert status==503
        latest=json.loads([line for line in errorlog.read_text().splitlines() if 'WordyLand API ' in line][-1].split('WordyLand API ',1)[1]);assert latest['release']=='unmarked'
        assert SENTINEL not in errorlog.read_text()
        print('API diagnostics passed: unique server IDs, no forged-ID echo, private operation/release/error correlation, no body/query/identity leakage, invalid marker redaction, unchanged success/capability session behavior.')
    finally:
        for proc in servers:
            if proc.poll() is None:
                proc.terminate()
                try:proc.wait(timeout=5)
                except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
        for log in logs:log.close()
