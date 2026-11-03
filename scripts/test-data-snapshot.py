"""Synthetic-only SQLite/material snapshot and safe-new-directory restore checks."""
from pathlib import Path
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import shutil
import sqlite3
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/data-snapshot.py'
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('wordyland_snapshot_test_module', SCRIPT)
snapshot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snapshot)
SENTINEL = 'SYNTHETIC_PRIVATE_DO_NOT_PRINT_473901'
NAME = 'a' * 32 + '.bin'
ORPHAN = 'b' * 32 + '.bin'
checks = []
os.umask(0o077)


def passed(label):
    checks.append(label)
    print('PASS ' + label, flush=True)


def run(*args, ok=True):
    result = subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True, timeout=15)
    combined = result.stdout + result.stderr
    assert SENTINEL not in combined and 'Traceback' not in combined
    assert result.returncode == (0 if ok else 2), (result.returncode, combined)
    data = json.loads(result.stdout if ok else result.stderr)
    assert data['ok'] is ok
    if not ok:
        assert result.stdout == '' and set(data) == {'ok', 'error'}
    return data


def fixture(parent, name):
    case = parent / name
    case.mkdir(mode=0o700)
    data = case / '.wordyland-data'
    data.mkdir(mode=0o700)
    (data / 'materials').mkdir(mode=0o700)
    connection = sqlite3.connect(data / snapshot.DATABASE)
    connection.executescript('''
      PRAGMA foreign_keys=ON;
      CREATE TABLE accounts(id INTEGER PRIMARY KEY,username TEXT,password_hash TEXT,role TEXT,session_version INTEGER);
      CREATE TABLE profiles(id INTEGER PRIMARY KEY,account_id INTEGER REFERENCES accounts(id),nickname TEXT,state TEXT);
      CREATE TABLE wallets(profile_id INTEGER PRIMARY KEY REFERENCES profiles(id),coins INTEGER,xp INTEGER,equipped TEXT);
      CREATE TABLE inventory(profile_id INTEGER REFERENCES profiles(id),item TEXT,PRIMARY KEY(profile_id,item));
      CREATE TABLE practice(profile_id INTEGER REFERENCES profiles(id),word TEXT,good INTEGER,wrong INTEGER);
      CREATE TABLE studies(id INTEGER PRIMARY KEY,profile_id INTEGER REFERENCES profiles(id),title TEXT,file TEXT);
    ''')
    connection.execute('INSERT INTO accounts VALUES(1,?,?,?,7)', ('synthetic-owner', '$synthetic-hash-' + SENTINEL, 'admin'))
    connection.execute('INSERT INTO profiles VALUES(1,1,?,?)', ('synthetic-child', json.dumps({'stats': {'pencil': {'good': 2}}, 'stars': 9})))
    connection.execute('INSERT INTO wallets VALUES(1,17,31,?)', (json.dumps({'avatar': 'santa', 'hat': 'crown'}),))
    connection.executemany('INSERT INTO inventory VALUES(1,?)', [('fox',), ('santa',), ('crown',)])
    connection.execute('INSERT INTO practice VALUES(1,\'pencil\',4,1)')
    connection.execute('INSERT INTO studies VALUES(1,1,?,?)', ('Synthetic document', NAME))
    connection.execute('INSERT INTO studies VALUES(2,1,?,NULL)', ('Text without attachment',))
    connection.commit()
    connection.close()
    (data / 'materials' / NAME).write_bytes(b'%PDF-synthetic\n' + SENTINEL.encode() + b'\nEOF')
    (data / 'materials' / ORPHAN).write_bytes(b'unreferenced opaque material')
    for filename in ['mail-settings.json', 'admin-activation.txt', 'ssh-private-key', 'private-config.json']:
        (data / filename).write_text(SENTINEL)
    return case, data


def state(data):
    connection = sqlite3.connect(data / snapshot.DATABASE)
    try:
        return list(connection.iterdump())
    finally:
        connection.close()


def clone_backup(path, destination):
    shutil.copytree(path, destination)
    return destination


def refresh_database_checksum(archive):
    manifest = json.loads((archive / 'manifest.json').read_text())
    data = (archive / snapshot.DATABASE).read_bytes()
    manifest['files'][snapshot.DATABASE] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    (archive / 'manifest.json').write_text(json.dumps(manifest))


with tempfile.TemporaryDirectory(prefix='wordyland-data-snapshot-test-', dir=str(ROOT.parent)) as temporary:
    root = Path(temporary)
    case, source = fixture(root, 'roundtrip')
    before = state(source)
    original_hash = hashlib.sha256((source / snapshot.DATABASE).read_bytes()).hexdigest()
    archive = case / 'snapshot-one'
    assert run('backup', '--data-dir', source, '--snapshot', archive)['materials'] == 1
    assert run('verify', '--snapshot', archive)['materials'] == 1
    assert set(p.name for p in archive.iterdir()) == {snapshot.DATABASE, 'materials', 'manifest.json'}
    assert set(p.name for p in (archive / 'materials').iterdir()) == {NAME}
    assert SENTINEL not in (archive / 'manifest.json').read_text()
    assert state(source) == before and hashlib.sha256((source / snapshot.DATABASE).read_bytes()).hexdigest() == original_hash
    for entry in [archive, archive / 'materials']:
        assert stat.S_IMODE(entry.stat().st_mode) == 0o700
    for entry in [archive / snapshot.DATABASE, archive / 'manifest.json', archive / 'materials' / NAME]:
        assert stat.S_IMODE(entry.stat().st_mode) == 0o600
    restored = case / 'restored-data'
    assert run('restore', '--snapshot', archive, '--target-dir', restored)['materials'] == 1
    assert state(restored) == before
    assert (restored / 'materials' / NAME).read_bytes() == (source / 'materials' / NAME).read_bytes()
    assert set(p.name for p in restored.iterdir()) == {snapshot.DATABASE, 'materials'}
    existing_empty = case / 'empty-private-target'
    existing_empty.mkdir(mode=0o700)
    run('restore', '--snapshot', archive, '--target-dir', existing_empty)
    assert state(existing_empty) == before
    passed('roundtrip preserves roles/password hashes/profiles/progress/inventory and only referenced attachments; private700/600 and no source writes')

    assert run('backup', '--data-dir', source, '--snapshot', archive, ok=False)['error'] == 'destination-exists'
    marker = restored / 'keep-private.txt'
    marker.write_text(SENTINEL)
    snapshot_before = state(restored)
    assert run('restore', '--snapshot', archive, '--target-dir', restored, ok=False)['error'] == 'restore-target-not-empty'
    assert marker.read_text() == SENTINEL and state(restored) == snapshot_before
    run('backup', '--data-dir', source, '--snapshot', source / 'nested-output', ok=False)
    assert not (source / 'nested-output').exists()
    public = case / 'public_html'
    public.mkdir(mode=0o700)
    run('restore', '--snapshot', archive, '--target-dir', public / 'new', ok=False)
    run('backup', '--data-dir', source, '--snapshot', public / 'archive', ok=False)
    run('restore', '--snapshot', archive, '--target-dir', archive / 'nested', ok=False)
    shared_case, shared_source = fixture(root, 'unsafe-ancestor')
    shared_case.chmod(0o777)
    try:
        assert run('backup', '--data-dir', shared_source, '--snapshot', case / 'unsafe-source', ok=False)['error'] == 'unsafe-directory'
        assert run('backup', '--data-dir', source, '--snapshot', shared_case / 'unsafe-destination', ok=False)['error'] == 'unsafe-directory'
        assert not (case / 'unsafe-source').exists() and not (shared_case / 'unsafe-destination').exists()
    finally:
        shared_case.chmod(0o700)
    passed('no overwrite, nonempty/in-place restore, data-nested output and public_html/overlapping paths rejected before changes')

    alias = case / 'source-alias'
    alias.symlink_to(source, target_is_directory=True)
    run('backup', '--data-dir', alias, '--snapshot', case / 'alias-backup', ok=False)
    db_path = source / snapshot.DATABASE
    real_db = source / 'original-database.private'
    db_path.rename(real_db)
    db_path.symlink_to(real_db)
    run('backup', '--data-dir', source, '--snapshot', case / 'db-symlink', ok=False)
    db_path.unlink()
    real_db.rename(db_path)
    real_material = source / 'material.private'
    (source / 'materials' / NAME).rename(real_material)
    (source / 'materials' / NAME).symlink_to(real_material)
    run('backup', '--data-dir', source, '--snapshot', case / 'material-symlink', ok=False)
    (source / 'materials' / NAME).unlink()
    real_material.rename(source / 'materials' / NAME)
    bad = clone_backup(archive, case / 'archive-symlink')
    (bad / 'materials' / NAME).unlink()
    (bad / 'materials' / NAME).symlink_to(source / 'materials' / NAME)
    run('verify', '--snapshot', bad, ok=False)
    passed('source directory/database/material and snapshot material symlinks never followed')

    bad = clone_backup(archive, case / 'tampered-material')
    (bad / 'materials' / NAME).write_bytes(SENTINEL.encode())
    target = case / 'must-not-exist-on-invalid'
    assert run('restore', '--snapshot', bad, '--target-dir', target, ok=False)['error'] == 'checksum-mismatch'
    assert not target.exists()
    bad = clone_backup(archive, case / 'tampered-db')
    with (bad / snapshot.DATABASE).open('ab') as stream:
        stream.write(b'changed')
    run('verify', '--snapshot', bad, ok=False)
    bad = clone_backup(archive, case / 'extra-config')
    (bad / 'mail-settings.json').write_text(SENTINEL)
    run('verify', '--snapshot', bad, ok=False)
    bad = clone_backup(archive, case / 'traversal')
    manifest = json.loads((bad / 'manifest.json').read_text())
    manifest['files']['materials/../../' + SENTINEL] = manifest['files'][snapshot.DATABASE]
    (bad / 'manifest.json').write_text(json.dumps(manifest))
    assert run('verify', '--snapshot', bad, ok=False)['error'] == 'invalid-manifest'
    bad = clone_backup(archive, case / 'invalid-foreign-key')
    connection = sqlite3.connect(bad / snapshot.DATABASE)
    connection.execute('PRAGMA foreign_keys=OFF')
    connection.execute('UPDATE profiles SET account_id=999')
    connection.commit()
    connection.close()
    refresh_database_checksum(bad)
    assert run('verify', '--snapshot', bad, ok=False)['error'] == 'database-foreign-keys-failed'
    passed('checksum tamper, traversal, unknown secret/config files and FK corruption rejected before target creation')

    missing = source / 'materials' / NAME
    saved = missing.read_bytes()
    missing.unlink()
    failed_archive = case / 'missing-material'
    assert run('backup', '--data-dir', source, '--snapshot', failed_archive, ok=False)['error'] == 'referenced-material-missing'
    assert not failed_archive.exists()
    missing.write_bytes(saved)
    original_copy = snapshot.copy_stream
    source_state = state(source)

    def changed_file(stream, destination, **kwargs):
        missing.write_bytes(b'changed-in-place' + SENTINEL.encode())
        return original_copy(stream, destination, **kwargs)

    snapshot.copy_stream = changed_file
    try:
        try:
            snapshot.create_snapshot(str(source), str(case / 'changed-source'))
        except snapshot.SnapshotError as error:
            assert error.code == 'source-changed'
        else:
            raise AssertionError('In-place mutation was accepted')
    finally:
        snapshot.copy_stream = original_copy
        missing.write_bytes(saved)
    assert not (case / 'changed-source').exists() and state(source) == source_state
    passed('missing or in-place-mutating referenced material fails the snapshot and removes only its new output')

    wal_case, wal_source = fixture(root, 'wal-live')
    writer = sqlite3.connect(wal_source / snapshot.DATABASE)
    observer = sqlite3.connect(wal_source / snapshot.DATABASE)
    try:
        assert writer.execute('PRAGMA journal_mode=WAL').fetchone()[0] == 'wal'
        writer.execute('PRAGMA wal_autocheckpoint=0')
        observer.execute('BEGIN')
        observer.execute('SELECT * FROM wallets').fetchall()
        writer.execute('UPDATE wallets SET coins=29 WHERE profile_id=1')
        writer.execute('INSERT INTO inventory VALUES(1,\'hat-elf\')')
        writer.commit()
        assert (wal_source / (snapshot.DATABASE + '-wal')).stat().st_size > 0
        wal_snapshot = wal_case / 'snapshot'
        run('backup', '--data-dir', wal_source, '--snapshot', wal_snapshot)
        result = sqlite3.connect('file:' + str(wal_snapshot / snapshot.DATABASE) + '?mode=ro&immutable=1', uri=True)
        assert result.execute('SELECT coins FROM wallets').fetchone()[0] == 29
        assert result.execute('SELECT COUNT(*) FROM inventory WHERE item=\'hat-elf\'').fetchone()[0] == 1
        result.close()
        writer.execute('BEGIN IMMEDIATE')
        busy = wal_case / 'busy-snapshot'
        assert run('backup', '--data-dir', wal_source, '--snapshot', busy, ok=False)['error'] == 'database-busy-or-unavailable'
        assert not busy.exists()
        writer.rollback()
    finally:
        observer.rollback()
        observer.close()
        writer.close()
    passed('two live SQLite connections plus uncheckpointed WAL are snapshotted coherently; an active competing writer fails safely')

    delete_case, delete_source = fixture(root, 'delete-concurrent')
    deletion = sqlite3.connect(delete_source / snapshot.DATABASE)
    removed = [False]

    def delete_after_descriptors_open(stream, destination, **kwargs):
        if not removed[0]:
            # Must be possible now: the snapshot has released its brief writer lock.
            deletion.execute('DELETE FROM studies WHERE file=?', (NAME,))
            deletion.commit()
            (delete_source / 'materials' / NAME).unlink()
            removed[0] = True
        return original_copy(stream, destination, **kwargs)

    snapshot.copy_stream = delete_after_descriptors_open
    try:
        delete_archive = delete_case / 'snapshot'
        assert snapshot.create_snapshot(str(delete_source), str(delete_archive)) == 1
    finally:
        snapshot.copy_stream = original_copy
        deletion.close()
    assert removed[0] and not (delete_source / 'materials' / NAME).exists()
    run('verify', '--snapshot', delete_archive)
    old = sqlite3.connect('file:' + str(delete_archive / snapshot.DATABASE) + '?mode=ro&immutable=1', uri=True)
    assert old.execute('SELECT file FROM studies WHERE id=1').fetchone()[0] == NAME
    old.close()
    assert (delete_archive / 'materials' / NAME).read_bytes().startswith(b'%PDF-synthetic')
    passed('application DELETE+unlink after lock release keeps a coherent earlier snapshot via held file descriptors')

    original_rename = snapshot.os.rename
    raced = case / 'empty-race'
    raced.mkdir(mode=0o700)

    def create_file_before_publish(old, new):
        (Path(new) / 'new-private-file').write_text(SENTINEL)
        return original_rename(old, new)

    snapshot.os.rename = create_file_before_publish
    try:
        try:
            snapshot.restore_snapshot(str(archive), str(raced))
        except OSError:
            pass
        else:
            raise AssertionError('Concurrent nonempty target accepted')
    finally:
        snapshot.os.rename = original_rename
    assert (raced / 'new-private-file').read_text() == SENTINEL
    assert not (raced / snapshot.DATABASE).exists()
    assert not list(case.glob('.wordyland-restore-*'))
    run('verify', '--unknown-' + SENTINEL, ok=False)
    run('verify', '--snapshot', case / SENTINEL, ok=False)
    passed('restore publishes only validated staging and preserves a concurrently populated target; errors redact paths/content/arguments')

print(json.dumps({'status': 'passed', 'checks': checks, 'production_requests': 0, 'real_data': False,
                  'hosting_backup_verified': False}, ensure_ascii=False))
