#!/usr/bin/env python3
"""Private, explicit WordyLand SQLite/material snapshots. Never an HTTP endpoint.

Only wordyland.sqlite and studies.file references are copied. No configuration,
mail settings, activation instructions, keys or unreferenced files are exported.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import stat
import sys
import tempfile
import time

FORMAT = 'wordyland-private-data'
VERSION = 1
DATABASE = 'wordyland.sqlite'
MATERIAL = re.compile(r'^[a-f0-9]{32}\.bin$')
DIGEST = re.compile(r'^[a-f0-9]{64}$')
MAX_MANIFEST = 4 * 1024 * 1024
CHUNK = 128 * 1024
LOCK_BUDGET = 3.0
BUSY_SECONDS = 2.0


class SnapshotError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def reject(code):
    raise SnapshotError(code)


def within(path, parent):
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def safe_path(value, must_exist=False):
    path = Path(value)
    if not path.is_absolute() or '..' in path.parts or any(part.lower() == 'public_html' for part in path.parts):
        reject('unsafe-path')
    current = Path(path.anchor)
    missing = False
    for part in path.parts[1:]:
        current = current / part
        try:
            info = current.lstat()
        except FileNotFoundError:
            missing = True
            continue
        if missing or stat.S_ISLNK(info.st_mode):
            reject('unsafe-path')
        if stat.S_ISDIR(info.st_mode):
            # Root and the CLI owner are trusted. A writable non-sticky
            # ancestor would let another UID replace a checked directory.
            if info.st_uid not in {0, os.geteuid()} or (info.st_mode & 0o022 and not info.st_mode & stat.S_ISVTX):
                reject('unsafe-directory')
    if must_exist and missing:
        reject('missing-path')
    return path


def directory(path, private=False):
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode):
        reject('unsafe-directory')
    if private and (info.st_uid != os.geteuid() or info.st_mode & 0o077):
        reject('private-directory-required')
    return info


def regular(path, private=False):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        reject('unsafe-file')
    if private and (info.st_uid != os.geteuid() or info.st_mode & 0o077):
        reject('private-file-required')
    return info


def open_regular(path, private=False):
    before = regular(path, private)
    descriptor = os.open(str(path), os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
    try:
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or (before.st_dev, before.st_ino) != (info.st_dev, info.st_ino):
            reject('unsafe-file')
        return os.fdopen(descriptor, 'rb')
    except BaseException:
        os.close(descriptor)
        raise


def stable_identity(info):
    # unlink changes ctime/link count, but an already-open immutable attachment
    # remains a valid snapshot. In-place changes alter size or mtime.
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)


def digest_stream(stream):
    start = stable_identity(os.fstat(stream.fileno()))
    stream.seek(0)
    digest = hashlib.sha256()
    size = 0
    while True:
        chunk = stream.read(CHUNK)
        if not chunk:
            break
        digest.update(chunk)
        size += len(chunk)
    if stable_identity(os.fstat(stream.fileno())) != start or size != start[2]:
        reject('source-changed')
    stream.seek(0)
    return {'sha256': digest.hexdigest(), 'bytes': size}


def copy_stream(stream, destination, expected=None, identity=None):
    start = stable_identity(os.fstat(stream.fileno()))
    if identity is not None and start != identity:
        reject('source-changed')
    stream.seek(0)
    descriptor = os.open(str(destination), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
    digest = hashlib.sha256()
    size = 0
    with os.fdopen(descriptor, 'wb') as target:
        while True:
            chunk = stream.read(CHUNK)
            if not chunk:
                break
            target.write(chunk)
            digest.update(chunk)
            size += len(chunk)
        target.flush()
        os.fsync(target.fileno())
    result = {'sha256': digest.hexdigest(), 'bytes': size}
    if stable_identity(os.fstat(stream.fileno())) != start or size != start[2]:
        reject('source-changed')
    if expected is not None and result != expected:
        reject('checksum-mismatch')
    return result


def sqlite_connection(path, readonly=True, immutable=False):
    regular(path)
    suffix = '?mode=ro' if readonly else '?mode=rw'
    if immutable:
        suffix += '&immutable=1'
    return sqlite3.connect(path.as_uri() + suffix, uri=True, timeout=BUSY_SECONDS, isolation_level=None)


def references(connection):
    tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    required = {'accounts': {'id', 'username', 'password_hash'}, 'profiles': {'id', 'account_id', 'nickname', 'state'},
                'studies': {'id', 'profile_id', 'file'}}
    for table, expected in required.items():
        if table not in tables or not expected.issubset({row[1] for row in connection.execute('PRAGMA table_info(' + table + ')')}):
            reject('database-schema-invalid')
    result = set()
    for (name,) in connection.execute('SELECT file FROM studies WHERE file IS NOT NULL'):
        if not isinstance(name, str) or MATERIAL.fullmatch(name) is None:
            reject('invalid-material-reference')
        result.add(name)
    return sorted(result)


def validate_database(path):
    connection = sqlite_connection(path, immutable=True)
    try:
        if connection.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
            reject('database-integrity-failed')
        if connection.execute('PRAGMA foreign_key_check').fetchone() is not None:
            reject('database-foreign-keys-failed')
        return references(connection)
    finally:
        connection.close()


def exclusive_directory(path):
    directory(path.parent, private=True)
    path.mkdir(mode=0o700)
    return path.lstat()


def cleanup_created(path, identity):
    try:
        current = path.lstat()
        if stat.S_ISDIR(current.st_mode) and not stat.S_ISLNK(current.st_mode) and (current.st_dev, current.st_ino) == (identity.st_dev, identity.st_ino):
            shutil.rmtree(path)
    except OSError:
        pass


def sync_directory(path):
    descriptor = os.open(str(path), os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            reject('invalid-manifest')
        result[key] = value
    return result


def validate_snapshot(value):
    path = safe_path(value, must_exist=True)
    directory(path, private=True)
    allowed_root = {'manifest.json', DATABASE, 'materials'}
    if {entry.name for entry in path.iterdir()} != allowed_root:
        reject('unexpected-snapshot-entry')
    directory(path / 'materials', private=True)
    with open_regular(path / 'manifest.json', private=True) as stream:
        raw = stream.read(MAX_MANIFEST + 1)
    if len(raw) > MAX_MANIFEST:
        reject('invalid-manifest')
    try:
        manifest = json.loads(raw, object_pairs_hook=unique_pairs)
    except (ValueError, UnicodeError):
        reject('invalid-manifest')
    if not isinstance(manifest, dict) or set(manifest) != {'format', 'version', 'created_utc', 'files'}:
        reject('invalid-manifest')
    if manifest['format'] != FORMAT or type(manifest['version']) is not int or manifest['version'] != VERSION:
        reject('invalid-manifest')
    if not isinstance(manifest['created_utc'], str) or re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', manifest['created_utc']) is None:
        reject('invalid-manifest')
    files = manifest['files']
    if not isinstance(files, dict) or DATABASE not in files or len(files) > 100000:
        reject('invalid-manifest')
    for name, metadata in files.items():
        if name != DATABASE and not (isinstance(name, str) and name.startswith('materials/') and MATERIAL.fullmatch(name[10:])):
            reject('invalid-manifest')
        if not isinstance(metadata, dict) or set(metadata) != {'sha256', 'bytes'}:
            reject('invalid-manifest')
        if not isinstance(metadata['sha256'], str) or DIGEST.fullmatch(metadata['sha256']) is None or type(metadata['bytes']) is not int or metadata['bytes'] < 0:
            reject('invalid-manifest')
    material_paths = {str(entry.relative_to(path)) for entry in (path / 'materials').iterdir()}
    if material_paths != set(files) - {DATABASE}:
        reject('unexpected-snapshot-entry')
    handles = {}
    try:
        for name, expected in sorted(files.items()):
            stream = open_regular(path / name, private=True)
            handles[name] = stream
            if digest_stream(stream) != expected:
                reject('checksum-mismatch')
        referenced = {'materials/' + name for name in validate_database(path / DATABASE)}
        if referenced != set(files) - {DATABASE}:
            reject('material-set-mismatch')
        return path, manifest, handles
    except BaseException:
        for stream in handles.values():
            stream.close()
        raise


def create_snapshot(source_value, destination_value):
    source = safe_path(source_value, must_exist=True)
    destination = safe_path(destination_value)
    directory(source, private=True)
    if source.name != '.wordyland-data' or within(destination, source) or within(source, destination):
        reject('unsafe-path')
    if destination.exists():
        reject('destination-exists')
    directory(destination.parent, private=True)
    for entry in source.iterdir():
        if entry.is_symlink():
            reject('unsafe-file')
    materials = source / 'materials'
    if materials.exists():
        directory(materials, private=True)
        if any(entry.is_symlink() for entry in materials.iterdir()):
            reject('unsafe-file')
    original_db = regular(source / DATABASE)
    for suffix in ['-wal', '-shm', '-journal']:
        sibling = source / (DATABASE + suffix)
        if sibling.exists() or sibling.is_symlink():
            regular(sibling)
    created = exclusive_directory(destination)
    handles = {}
    identities = {}
    locker = reader = output_db = None
    success = False
    try:
        (destination / 'materials').mkdir(mode=0o700)
        db_path = destination / DATABASE
        descriptor = os.open(str(db_path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        os.close(descriptor)
        locker = sqlite_connection(source / DATABASE, readonly=False)
        try:
            locker.execute('BEGIN IMMEDIATE')
        except sqlite3.OperationalError:
            reject('database-busy-or-unavailable')
        deadline = time.monotonic() + LOCK_BUDGET
        reader = sqlite_connection(source / DATABASE)
        output_db = sqlite3.connect(str(db_path))

        def progress(status, remaining, total):
            if time.monotonic() > deadline:
                reject('source-lock-budget-exceeded')

        reader.backup(output_db, pages=128, progress=progress, sleep=.01)
        output_db.close()
        output_db = None
        snapshot_reader = sqlite_connection(db_path, immutable=True)
        try:
            names = references(snapshot_reader)
        finally:
            snapshot_reader.close()
        if names:
            directory(source / 'materials', private=True)
        for name in names:
            if time.monotonic() > deadline:
                reject('source-lock-budget-exceeded')
            try:
                handles[name] = open_regular(source / 'materials' / name)
                identities[name] = stable_identity(os.fstat(handles[name].fileno()))
            except FileNotFoundError:
                reject('referenced-material-missing')
        current_db = regular(source / DATABASE)
        if (current_db.st_dev, current_db.st_ino) != (original_db.st_dev, original_db.st_ino):
            reject('source-changed')
        reader.close()
        reader = None
        locker.execute('ROLLBACK')
        locker.close()
        locker = None
        # The heavy copy happens after releasing the writer lock. Open file
        # descriptors survive an application DELETE + unlink of immutable files.
        files = {}
        with open_regular(db_path, private=True) as stream:
            files[DATABASE] = digest_stream(stream)
        for name, stream in handles.items():
            files['materials/' + name] = copy_stream(stream, destination / 'materials' / name, identity=identities[name])
        validate_database(db_path)
        manifest = {'format': FORMAT, 'version': VERSION,
                    'created_utc': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                    'files': files}
        descriptor = os.open(str(destination / 'manifest.json'), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(descriptor, 'w') as stream:
            json.dump(manifest, stream, sort_keys=True, separators=(',', ':'))
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        sync_directory(destination / 'materials')
        sync_directory(destination)
        checked_path, checked, checked_handles = validate_snapshot(str(destination))
        for stream in checked_handles.values():
            stream.close()
        sync_directory(destination.parent)
        success = True
        return len(names)
    finally:
        for stream in handles.values():
            stream.close()
        if output_db is not None:
            output_db.close()
        if reader is not None:
            reader.close()
        if locker is not None:
            if locker.in_transaction:
                locker.execute('ROLLBACK')
            locker.close()
        if not success:
            cleanup_created(destination, created)


def restore_snapshot(snapshot_value, target_value):
    snapshot = safe_path(snapshot_value, must_exist=True)
    target = safe_path(target_value)
    if within(target, snapshot) or within(snapshot, target):
        reject('unsafe-path')
    directory(target.parent, private=True)
    if target.exists():
        directory(target, private=True)
        if any(target.iterdir()):
            reject('restore-target-not-empty')
    # Full validation is complete before any destination/staging write.
    checked_path, manifest, handles = validate_snapshot(str(snapshot))
    staging = None
    identity = None
    published = False
    try:
        staging = Path(tempfile.mkdtemp(prefix='.wordyland-restore-', dir=str(target.parent)))
        identity = directory(staging, private=True)
        (staging / 'materials').mkdir(mode=0o700)
        for name, stream in sorted(handles.items()):
            copy_stream(stream, staging / name, manifest['files'][name])
        validate_database(staging / DATABASE)
        sync_directory(staging / 'materials')
        sync_directory(staging)
        safe_path(str(target))
        if target.exists():
            directory(target, private=True)
            if any(target.iterdir()):
                reject('restore-target-not-empty')
        # rename of a directory cannot replace a non-empty target. A concurrent
        # new file therefore remains untouched, even after the last check.
        os.rename(str(staging), str(target))
        published = True
        sync_directory(target.parent)
        return len(handles) - 1
    finally:
        for stream in handles.values():
            stream.close()
        if not published and staging is not None:
            cleanup_created(staging, identity)


def verify_snapshot(value):
    path, manifest, handles = validate_snapshot(value)
    try:
        return len(handles) - 1
    finally:
        for stream in handles.values():
            stream.close()


class PrivateParser(argparse.ArgumentParser):
    def error(self, message):
        reject('invalid-arguments')


def main(argv=None):
    parser = PrivateParser(description='Private WordyLand data snapshot; no network or in-place restore.')
    actions = parser.add_subparsers(dest='operation', required=True, parser_class=PrivateParser)
    backup = actions.add_parser('backup')
    backup.add_argument('--data-dir', required=True)
    backup.add_argument('--snapshot', required=True)
    verify = actions.add_parser('verify')
    verify.add_argument('--snapshot', required=True)
    restore = actions.add_parser('restore')
    restore.add_argument('--snapshot', required=True)
    restore.add_argument('--target-dir', required=True)
    args = parser.parse_args(argv)
    os.umask(0o077)
    if not hasattr(os, 'O_NOFOLLOW') or not hasattr(os, 'O_DIRECTORY'):
        reject('unsupported-platform')
    if args.operation == 'backup':
        count = create_snapshot(args.data_dir, args.snapshot)
    elif args.operation == 'verify':
        count = verify_snapshot(args.snapshot)
    else:
        count = restore_snapshot(args.snapshot, args.target_dir)
    print(json.dumps({'ok': True, 'operation': args.operation, 'materials': count, 'formatVersion': VERSION}))


if __name__ == '__main__':
    try:
        main()
    except SnapshotError as error:
        print(json.dumps({'ok': False, 'error': error.code}), file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        print(json.dumps({'ok': False, 'error': 'interrupted'}), file=sys.stderr)
        sys.exit(2)
    except Exception:
        print(json.dumps({'ok': False, 'error': 'operation-failed'}), file=sys.stderr)
        sys.exit(2)
