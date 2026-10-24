"""Isolated UNIX socket tests of the private Site Tools cache client; no network/hosting."""
import json,os,socket,subprocess,tempfile,threading
from pathlib import Path
helper=Path(__file__).with_name('siteground-cache.php')
with tempfile.TemporaryDirectory(prefix='wordyland-cache-') as directory:
    filename=directory+'/site-tools.sock'
    def run(reply,expected,split=False):
        seen=[];errors=[]
        with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as server:
            server.bind(filename);server.listen(1);server.settimeout(8)
            def service():
                try:
                    conn,_=server.accept()
                    with conn:
                        request=conn.makefile('rb').readline(4096);seen.append(json.loads(request))
                        if split:
                            for part in [reply[:5],reply[5:]]:conn.sendall(part)
                        else:conn.sendall(reply)
                except Exception as error:errors.append(str(error))
            thread=threading.Thread(target=service);thread.start()
            result=subprocess.run(['php',str(helper)],env={**os.environ,'WORDYLAND_TEST':'1','WORDYLAND_CACHE_TEST_SOCKET':filename},text=True,capture_output=True,timeout=12)
            thread.join(timeout=9);assert not thread.is_alive() and not errors,errors
        os.unlink(filename)
        assert result.returncode==expected,(result.returncode,result.stderr)
        assert seen==[{'api':'domain-all','cmd':'update','params':{'flush_cache':'1','id':'wordyland.eu','path':'/(.*)'},'settings':{'json':1}}],seen
        assert 'hosting-secret' not in result.stdout+result.stderr
        assert ('CACHE_PURGED=wordyland.eu' in result.stdout)==(expected==0)
    run(b'{"result":"ok"}\n',0,True)
    run(b'{}\n',0)
    run(b'{"err_code":403,"message":"hosting-secret"}\n',1)
    run(b'{"err_code":0,"message":"hosting-secret"}\n',1)
    run(b'not-json hosting-secret\n',1)
    run(b'null\n',1)
    run(b'',1)
    run(b'"string"\n',1)
    result=subprocess.run(['php',str(helper)],env={**os.environ,'WORDYLAND_TEST':'1','WORDYLAND_CACHE_TEST_SOCKET':filename},text=True,capture_output=True)
    assert result.returncode==1 and 'CACHE_PURGED=' not in result.stdout
print('Site Tools cache tests passed: exact domain/path invalidation, unchanged cache configuration, split writes, missing socket, rejected/malformed replies and no service response leaks.')
