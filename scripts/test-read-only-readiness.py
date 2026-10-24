"""Private diagnostics: synthetic files/SQLite and fake SSH only. No real credentials/network."""
import hashlib,json,os,pathlib,sqlite3,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
PHP=os.environ.get('PHP_COMMAND','php')
ERROR='Read-only diagnostic unavailable. No state change requested.\n'
SENTINEL='SYNTHETIC_PRIVATE_VALUE_DO_NOT_PRINT_938471'
def run(args,env,**kwargs):return subprocess.run(args,env=env,capture_output=True,text=True,timeout=12,**kwargs)
with tempfile.TemporaryDirectory(prefix='wordyland-readonly-') as tmp:
    root=pathlib.Path(tmp);data=root/'wordyland.eu'/'.wordyland-data';data.mkdir(parents=True)
    database=data/'wordyland.sqlite';db=sqlite3.connect(database)
    db.executescript('CREATE TABLE accounts (id INTEGER PRIMARY KEY,username TEXT,role TEXT,password_hash TEXT,recovery_hash TEXT,session_version INTEGER); CREATE TABLE progress(value TEXT);')
    db.execute('INSERT INTO accounts VALUES(1,?,?,?,?,?)',('luca@perrone.it','admin',SENTINEL,SENTINEL,7));db.execute('INSERT INTO accounts VALUES(2,?,?,?,?,?)',('synthetic_other','adult',SENTINEL,SENTINEL,3));db.execute('INSERT INTO progress VALUES(?)',(SENTINEL,));db.commit();db.close()
    env=dict(os.environ,WORDYLAND_BOOTSTRAP_DATA=str(data))
    script=ROOT/'scripts/read-only-readiness.php';settings=data/'mail-settings.json';activation=data/'admin-activation.txt'
    activation.write_text(SENTINEL);os.chmod(activation,0o600)
    mail_called=root/'mail-called';trap=root/'sendmail-trap';trap.write_text('#!/bin/sh\ntouch "'+str(mail_called)+'"\n');trap.chmod(0o700)
    logs=root/'php-errors'
    def snapshot():
        return {str(p.relative_to(data)):(('link',os.readlink(p)) if p.is_symlink() else ('file',hashlib.sha256(p.read_bytes()).hexdigest(),p.stat().st_mode&0o777)) for p in data.iterdir() if p.is_file() or p.is_symlink()}
    def probe(extra=(),ok=True,directory=None):
        before=snapshot();testenv=dict(env)
        if directory is not None:testenv['WORDYLAND_BOOTSTRAP_DATA']=str(directory)
        p=run([PHP,'-d','log_errors=1','-d','error_log='+str(logs),'-d','sendmail_path='+str(trap),*extra,str(script),'--read-only'],testenv)
        assert snapshot()==before,'Diagnostic modified private files';assert not mail_called.exists(),'Diagnostic invoked mail';assert not logs.exists() or logs.read_text()=='','Diagnostic logged private errors'
        assert SENTINEL not in p.stdout+p.stderr and str(data) not in p.stdout+p.stderr
        if not ok:
            assert p.returncode!=0 and p.stdout=='' and p.stderr==ERROR;return
        assert p.returncode==0 and p.stderr=='';d=json.loads(p.stdout)
        assert set(d)=={'ownerExists','ownerIsAdmin','privateActivationAvailable','mail'}
        assert all(type(d[k]) is bool for k in ['ownerExists','ownerIsAdmin','privateActivationAvailable'])
        assert set(d['mail'])=={'configuration','transport','sender','phpMailAvailable','configurationReady'}
        return d
    stdin=run([PHP,'--','--read-only'],env,input=script.read_text());assert stdin.returncode==0 and stdin.stderr=='' and set(json.loads(stdin.stdout))=={'ownerExists','ownerIsAdmin','privateActivationAvailable','mail'}
    d=probe();assert d['ownerExists'] and d['ownerIsAdmin'] and d['privateActivationAvailable'];assert d['mail']['configuration']=='absent'
    def config(value):settings.write_text(json.dumps(value));settings.chmod(0o600)
    config({'enabled':True,'transport':'php-mail','from':'sender@wordyland.example','password':SENTINEL});d=probe();assert d['mail']['configurationReady'] and d['mail']['sender']=='valid_format';assert 'sender@wordyland.example' not in json.dumps(d)
    d=probe(('-d','disable_functions=mail'));assert not d['mail']['phpMailAvailable'] and not d['mail']['configurationReady']
    config({'enabled':False,'transport':'php-mail','from':'sender@wordyland.example','password':SENTINEL});assert probe()['mail']['configuration']=='disabled'
    config({'enabled':True,'transport':SENTINEL,'from':SENTINEL});d=probe();assert d['mail']['transport']=='unsupported' and d['mail']['sender']=='invalid' and not d['mail']['configurationReady']
    config({'enabled':True,'transport':'php-mail','from':'sender@example.test\r\nBcc: private@example.test'});assert probe()['mail']['sender']=='invalid'
    for contents in ['{"password":"'+SENTINEL+'",broken',json.dumps([SENTINEL]),'x'*16385]:
        settings.write_text(contents);assert probe()['mail']['configuration']=='invalid'
    settings.unlink();settings.symlink_to(activation);assert probe()['mail']['configuration']=='unsafe';settings.unlink()
    settings.mkdir();assert probe()['mail']['configuration']=='invalid';settings.rmdir()
    activation.unlink();assert not probe()['privateActivationAvailable'];activation.symlink_to(database);assert not probe()['privateActivationAvailable'];activation.unlink()
    db=sqlite3.connect(database);db.execute('UPDATE accounts SET role="adult" WHERE id=1');db.commit();db.close();assert not probe()['ownerIsAdmin']
    db=sqlite3.connect(database);db.execute('DELETE FROM accounts WHERE id=1');db.commit();db.close();d=probe();assert not d['ownerExists'] and not d['ownerIsAdmin']
    p=run([PHP,str(script)],env);assert p.returncode!=0 and p.stdout=='' and p.stderr==ERROR
    alias=root/'alias';alias.symlink_to(data,target_is_directory=True);probe(directory=alias,ok=False)
    public=root/'public_html'/'wordyland.eu'/'.wordyland-data';public.mkdir(parents=True);probe(directory=public,ok=False)
    saved=database.read_bytes();database.write_text(SENTINEL);probe(ok=False);database.write_bytes(saved)
    db=sqlite3.connect(database);db.execute('ALTER TABLE accounts RENAME TO hidden_accounts');db.commit();db.close();probe(ok=False)
    database.unlink();probe(ok=False);assert not database.exists(),'Missing database was created'
    database.symlink_to(activation);probe(ok=False);database.unlink()

    # Existing SG_* authentication is exercised with a generated synthetic SSH key and fake ssh.
    key=root/'synthetic-key';subprocess.run(['ssh-keygen','-q','-t','ed25519','-N','synthetic-pass','-f',str(key)],check=True,capture_output=True)
    fakebin=root/'bin';fakebin.mkdir();called=root/'ssh-called';received=root/'received.php';argslog=root/'ssh-args'
    ssh=fakebin/'ssh';ssh.write_text('''#!/usr/bin/env python3
import os,sys,pathlib
pathlib.Path(os.environ['TEST_CALLED']).write_text('called')
pathlib.Path(os.environ['TEST_RECEIVED']).write_text(sys.stdin.read())
pathlib.Path(os.environ['TEST_ARGS']).write_text('\\n'.join(sys.argv[1:]))
assert not any(os.environ.get(k) for k in ['SG_PRIVATE_KEY','SG_KEY_PASSPHRASE','SG_KNOWN_HOSTS'])
sys.stdout.write(os.environ['TEST_REPLY']);sys.stderr.write(os.environ['TEST_PRIVATE_STDERR'])
sys.exit(int(os.environ.get('TEST_EXIT','0')))
''');ssh.chmod(0o700)
    good={'ownerExists':True,'ownerIsAdmin':True,'privateActivationAvailable':False,'mail':{'configuration':'present','transport':'php-mail','sender':'valid_format','phpMailAvailable':True,'configurationReady':True}}
    wrapenv=dict(os.environ,PATH=str(fakebin)+os.pathsep+os.environ['PATH'],SG_HOST='ssh.wordyland.eu',SG_PORT='18765',SG_PATH='/home/customer/www/wordyland.eu/public_html',SG_USER='synthetic_user',SG_PRIVATE_KEY=key.read_text(),SG_KEY_PASSPHRASE='synthetic-pass',SG_KNOWN_HOSTS='[ssh.wordyland.eu]:18765 '+key.with_suffix('.pub').read_text(),TEST_CALLED=str(called),TEST_RECEIVED=str(received),TEST_ARGS=str(argslog),TEST_REPLY=json.dumps(good),TEST_PRIVATE_STDERR=SENTINEL)
    wrapper=ROOT/'scripts/read-only-readiness.sh'
    wrapper_tmp=root/'wrapper-tmp';wrapper_tmp.mkdir();wrapenv['TMPDIR']=str(wrapper_tmp)
    def wrap(changes=None,args=('--read-only',),ok=False,network=True):
        called.unlink(missing_ok=True);testenv=dict(wrapenv);testenv.update(changes or {})
        p=run(['bash',str(wrapper),*args],testenv)
        assert not list(wrapper_tmp.iterdir()),'Private runner files not cleaned'
        assert called.exists()==network and SENTINEL not in p.stdout+p.stderr and 'PRIVATE KEY' not in p.stdout+p.stderr
        if ok:assert p.returncode==0 and p.stderr=='' and json.loads(p.stdout)==good
        else:assert p.returncode!=0 and p.stdout=='' and p.stderr==ERROR
    wrap(ok=True);assert received.read_bytes()==script.read_bytes()
    args=argslog.read_text();assert 'StrictHostKeyChecking=yes' in args and 'WORDYLAND_BOOTSTRAP_DATA=\'/home/customer/www/wordyland.eu/.wordyland-data\'' in args and '--read-only' in args
    assert not any(s in args for s in ['bootstrap','deploy-siteground','keyscan','PURGE','curl'])
    wrap(args=(),network=False)
    for changes in [{'SG_HOST':'other.example'},{'SG_PORT':'22'},{'SG_PATH':'/tmp/other/public_html'},{'SG_PRIVATE_KEY':''},{'SG_KNOWN_HOSTS':''},{'SG_USER':'unsafe;echo'},{'SG_KEY_PASSPHRASE':'incorrect'},{'SG_PRIVATE_KEY':SENTINEL},{'SG_KNOWN_HOSTS':'[other.example]:18765 '+key.with_suffix('.pub').read_text()}]:wrap(changes,network=False)
    agent=fakebin/'ssh-agent';agent.write_text('#!/bin/sh\nprintf %s "'+SENTINEL+'" >&2\nexit 9\n');agent.chmod(0o700)
    wrap(network=False);agent.unlink()
    for reply in [SENTINEL,json.dumps(dict(good,private=SENTINEL)),json.dumps(dict(good,ownerExists='true')),json.dumps(dict(good,mail=dict(good['mail'],sender=SENTINEL))),json.dumps(dict(good,mail=dict(good['mail'],configurationReady=False))),'x'*8193]:wrap({'TEST_REPLY':reply})
    wrap({'TEST_EXIT':'42','TEST_REPLY':SENTINEL})
    print('Read-only readiness passed: immutable synthetic files/database, three account booleans, safe mail states, no sender/config/secret values, missing/corrupt/symlink failures sanitized, no mail calls, existing encrypted-key authentication, strict host verification, one fake SSH only and rejected private/malformed replies.')
