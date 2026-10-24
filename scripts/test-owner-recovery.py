"""Private CLI preparation tests. No connection to hosting or real accounts."""
import hashlib,json,os,pathlib,re,shlex,sqlite3,subprocess,tempfile
php=shlex.split(os.environ.get('PHP_COMMAND','php'))
owner='luca@perrone.it'
with tempfile.TemporaryDirectory(prefix='wordyland-owner-recovery-') as tmp:
    root=pathlib.Path(tmp);directory=root/'wordyland.eu'/'.wordyland-data';directory.mkdir(parents=True)
    database=directory/'wordyland.sqlite';db=sqlite3.connect(database)
    db.executescript('CREATE TABLE accounts(id INTEGER PRIMARY KEY,username TEXT UNIQUE,password_hash TEXT,recovery_hash TEXT,session_version INTEGER,role TEXT);CREATE TABLE profiles(id INTEGER PRIMARY KEY,account_id INTEGER,state TEXT);CREATE TABLE wallets(profile_id INTEGER PRIMARY KEY,coins INTEGER,xp INTEGER);')
    db.execute('INSERT INTO accounts VALUES (1,?,?,?,?,?)',(owner,'synthetic-password-hash',hashlib.sha256(b'synthetic-old-code').hexdigest(),7,'admin'))
    db.execute('INSERT INTO accounts VALUES (2,?,?,?,?,?)',('other@example.test','synthetic-other-hash','synthetic-other-recovery',2,'adult'))
    db.execute('INSERT INTO profiles VALUES (10,1,?)',(json.dumps({'stats':{'head':{'good':3}},'stars':5}),));db.execute('INSERT INTO wallets VALUES (10,91,420)');db.commit()
    private=directory/'admin-activation.txt'
    def run(confirm=True,args=True,data=directory):
        env=dict(os.environ,WORDYLAND_BOOTSTRAP_DATA=str(data));env.pop('WORDYLAND_OWNER_RECOVERY_CONFIRM',None)
        if confirm:env['WORDYLAND_OWNER_RECOVERY_CONFIRM']=owner
        return subprocess.run(php+['scripts/prepare-owner-recovery.php']+(['--prepare-owner-recovery'] if args else []),env=env,capture_output=True,text=True,timeout=10)
    def snapshot():return {table:db.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall() for table in ['accounts','profiles','wallets']}
    original=snapshot()
    for result in [run(False),run(args=False)]:assert result.returncode!=0
    assert snapshot()==original and not private.exists()
    db.execute('UPDATE accounts SET role="adult" WHERE id=1');db.commit();before=snapshot();assert run().returncode!=0 and snapshot()==before and not private.exists()
    db.execute('UPDATE accounts SET username="missing@example.test",role="admin" WHERE id=1');db.commit();before=snapshot();assert run().returncode!=0 and snapshot()==before and not private.exists()
    db.execute('UPDATE accounts SET username=? WHERE id=1',(owner,));db.commit();assert snapshot()==original
    private.write_text('synthetic existing activation');before=snapshot();assert run().returncode!=0 and snapshot()==before and private.read_text()=='synthetic existing activation';private.unlink()
    target=root/'symlink-target';target.write_text('do not overwrite');private.symlink_to(target);assert run().returncode!=0 and target.read_text()=='do not overwrite' and snapshot()==original;private.unlink()
    alias=root/'alias'/'.wordyland-data';alias.parent.mkdir();alias.symlink_to(directory,target_is_directory=True);assert run(data=alias).returncode!=0
    public=root/'public_html'/'wordyland.eu'/'.wordyland-data';public.mkdir(parents=True);assert run(data=public).returncode!=0
    # Force an SQL failure after creating the private file: rollback must preserve credentials and remove only the new file.
    db.execute("CREATE TRIGGER refuse_rotation BEFORE UPDATE OF recovery_hash ON accounts BEGIN SELECT RAISE(ABORT,'synthetic update failure'); END");db.commit()
    refused=run();assert refused.returncode!=0 and snapshot()==original and not private.exists()
    assert 'synthetic update failure' not in refused.stderr
    db.execute('DROP TRIGGER refuse_rotation');db.commit()
    # Also cover a deferred failure at COMMIT, not just a failed UPDATE.
    db.executescript('CREATE TABLE deferred_guard(parent INTEGER REFERENCES accounts(id) DEFERRABLE INITIALLY DEFERRED);CREATE TRIGGER defer_rotation AFTER UPDATE OF recovery_hash ON accounts BEGIN INSERT INTO deferred_guard VALUES (999999);END;');db.commit()
    refused=run();assert refused.returncode!=0 and snapshot()==original and not private.exists()
    db.execute('DROP TRIGGER defer_rotation');db.commit()
    done=run();assert done.returncode==0 and private.is_file() and not private.is_symlink() and private.stat().st_mode&0o077==0
    contents=private.read_text();token=re.search(r'#admin-attiva=([a-f0-9]{64})',contents)[1]
    after=snapshot();row=after['accounts'][0]
    assert row[1]==owner and row[2]==original['accounts'][0][2] and row[3]==hashlib.sha256(token.encode()).hexdigest() and row[4]==8 and row[5]=='admin'
    assert after['accounts'][1]==original['accounts'][1] and after['profiles']==original['profiles'] and after['wallets']==original['wallets']
    assert token not in done.stdout+done.stderr and 'synthetic-password-hash' not in done.stdout+done.stderr
    repeated=run();assert repeated.returncode!=0 and snapshot()==after and private.read_text()==contents and token not in repeated.stdout+repeated.stderr
    db.close()
print('Owner recovery CLI passed on synthetic data: explicit confirmation gates, fixed site/owner, no creation/promotion, preserved password/progress/rewards/other accounts, private file, single preparation, rollback after UPDATE/COMMIT failures and no secrets in output. Production operation not executed.')
