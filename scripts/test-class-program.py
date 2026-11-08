"""Class programmes and teacher capabilities in a disposable localhost database.

Only synthetic accounts and original public lesson metadata are used. No email,
production request, real enrolment or externally supplied document is involved.
"""
from pathlib import Path
import copy
import hashlib
import http.cookiejar
import json
import os
import secrets
import shlex
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


def main():
    with tempfile.TemporaryDirectory(prefix='wordyland-class-program-') as temporary:
        public = Path(temporary, 'public')
        shutil.copytree('dist', public)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}/api.php?action='
        log = open(Path(temporary, 'php.log'), 'w+')
        command = shlex.split(os.environ.get('PHP_COMMAND', 'php'))
        server = subprocess.Popen(
            command + ['-d', 'session.save_path=' + temporary, '-S',
                       f'127.0.0.1:{port}', '-t', str(public)],
            env=dict(os.environ, WORDYLAND_TEST='1',
                     WORDYLAND_DATA_DIR=str(Path(temporary, 'data'))),
            stdout=log, stderr=log)

        def client():
            return urllib.request.build_opener(
                urllib.request.ProxyHandler({}),
                urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def request(actor, action, data=None, csrf='', expected=200):
            message = urllib.request.Request(
                base + action,
                data=None if data is None else json.dumps(data).encode(),
                headers={'Content-Type': 'application/json', 'X-CSRF-Token': csrf})
            try:
                response = actor.open(message, timeout=12)
            except urllib.error.HTTPError as error:
                response = error
            raw = response.read().decode()
            acceptable = (expected,) if isinstance(expected, int) else expected
            assert response.status in acceptable, (action, response.status, acceptable, raw[:1200])
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                raise AssertionError((action, response.status, 'Non-JSON local response', raw[:600]))
            if response.status >= 400:
                assert set(result) == {'error'}, ('A denied action exposes metadata', action, sorted(result))
            return result

        password = 'Class-program-synthetic-only-123'
        checks = []
        actors = {name: client() for name in ['owner', 'parent', 'teacher', 'outsider', 'second', 'learner', 'guest']}
        tokens, profiles = {}, {}
        try:
            for _ in range(80):
                try:
                    request(actors['owner'], 'session')
                    break
                except urllib.error.URLError:
                    time.sleep(.05)
            else:
                raise RuntimeError('Disposable PHP server did not start')

            for name in ['owner', 'parent', 'teacher', 'outsider', 'second']:
                actor = actors[name]
                result = request(actor, 'register', {
                    'username': 'cp_fixture_' + name, 'password': password, 'adult': True
                }, request(actor, 'session')['csrf'])
                tokens[name] = result['csrf']
                profiles[name] = request(actor, 'create-profile', {'nickname': 'Synthetic ' + name}, tokens[name])['id']
                request(actor, 'hub&profile=' + str(profiles[name]))

            def get(name, action, expected=200):
                return request(actors[name], action, expected=expected)

            def post(name, action, data, expected=200, csrf=None):
                return request(actors[name], action, data,
                               tokens[name] if csrf is None else csrf, expected)

            first = post('owner', 'club-create', {
                'profile': profiles['owner'], 'name': 'Synthetic programme A', 'consent': True})
            second = post('owner', 'club-create', {
                'profile': profiles['owner'], 'name': 'Synthetic programme B', 'consent': True})
            foreign = post('second', 'club-create', {
                'profile': profiles['second'], 'name': 'Unrelated synthetic class', 'consent': True})
            post('parent', 'club-join', {'profile': profiles['parent'], 'code': first['code'], 'consent': True})
            child = request(actors['learner'], 'class-register', {
                'code': first['code'], 'nickname': 'SyntheticLearner',
                'password': password, 'consent': True
            }, request(actors['learner'], 'session')['csrf'])
            tokens['learner'] = child['csrf']
            profiles['learner'] = child['profiles'][0]['id']
            database = sqlite3.connect(Path(temporary, 'data', 'wordyland.sqlite'))
            database.row_factory = sqlite3.Row

            def state(name, profile=None):
                return get(name, 'class-program-state&profile=' + str(profiles[name] if profile is None else profile))

            def manage(name, club):
                return get(name, 'class-program-manage&club=' + str(club))

            def draft(club, units, title='Synthetic approved material', year='2026/2027', expected=None):
                current = manage('owner', club)['program']
                revision = (current['editVersion'] if current else 0) if expected is None else expected
                result = post('owner', 'class-program-save', {
                    'club': club, 'schoolYear': year, 'title': title,
                    'teacherLabel': 'Synthetic English teacher',
                    'method': 'Only the reviewed worksheet', 'examGoal': '',
                    'units': units, 'expectedRevision': revision})
                program = manage('owner', club)['program']
                assert program and program['id'] > 0 and program['editVersion'] > revision
                return program, result

            def publish(program, expected=None, confirmed=True, status=200):
                return post('owner', 'class-program-publish', {
                    'program': program['id'],
                    'expectedRevision': program['editVersion'] if expected is None else expected,
                    'confirmed': confirmed}, status)

            # A programme is opt-in; old classes and guests gain no implicit grant.
            request(actors['guest'], 'class-program-state&profile=' + str(profiles['parent']), expected=401)
            request(actors['guest'], 'class-program-manage', expected=401)
            assert state('parent')['mode'] == 'legacy'
            assert state('outsider')['mode'] == 'legacy'
            get('outsider', 'class-program-state&profile=' + str(profiles['parent']), 404)
            get('outsider', 'class-program-manage&club=' + str(first['id']), (403, 404))
            post('learner', 'class-program-save', {'club': first['id']}, 403)
            get('owner', 'class-program-save', 405)
            post('owner', 'class-program-save', {'club': first['id']}, 403, csrf='not-csrf')
            old = post('parent', 'training-start', {'profile': profiles['parent'], 'track': 'letters', 'block': 'ae'})['session']
            old_plan = database.execute('SELECT plan FROM training_sessions WHERE token=?', (old['token'],)).fetchone()[0]
            checks.append('legacy classes remain playable; profile/class isolation, verbs, CSRF and learner denial')

            public_catalog = manage('owner', first['id'])['catalog']
            assert {u['id'] for u in public_catalog} >= {
                'classroom-grammar', 'classroom-dictation', 'toys-yes-no', 'whats-this',
                'it-they-choice', 'it-they-write', 'is-this', 'short-answer-gap'}
            initial_units = [
                {'id': 'classroom-dictation', 'status': 'active'},
                {'id': 'toys-yes-no', 'status': 'planned'}]
            program, _ = draft(first['id'], initial_units)
            assert state('parent')['mode'] == 'blocked', 'A configured draft cannot fall back to global lessons'
            post('parent', 'training-start', {'profile': profiles['parent'], 'track': 'words', 'pack': 'classroom'}, 409)
            publish(program, confirmed=False, status=400)
            publish(program, expected=program['editVersion'] - 1, status=409)
            post('outsider', 'class-program-publish', {'program': program['id'], 'expectedRevision': program['editVersion'], 'confirmed': True}, (403, 404))
            publish(program)
            manifest = state('parent')
            assert manifest['mode'] == 'class' and manifest['active']['club'] == first['id']
            assert manifest['active']['program'] == program['id'] and manifest['active']['revision'] > 0
            expected_a = manifest['expected']
            assert expected_a == {'programClass': first['id'], 'programRevision': manifest['active']['revision']}
            assert [u['id'] for u in manifest['units']] == ['classroom-dictation']
            vocabulary_a = {row[0] for row in manifest['words']}
            assert vocabulary_a == {'pencil', 'pen', 'book', 'eraser', 'scissors', 'glue stick', 'crayons', 'notebook', 'sharpener', 'marker', 'bookbag', 'desk'}
            assert 'doll' not in vocabulary_a and not manifest['allowed']['grammarCases']
            checks.append('reviewed unit snapshots, draft blocking, planned topics excluded and immutable published vocabulary')

            def start_words(name, expected_context, pack='classroom', expected_status=200):
                return post(name, 'training-start', {
                    'profile': profiles[name], 'track': 'words', 'pack': pack,
                    **expected_context}, expected_status)

            start_words('parent', {}, expected_status=409)
            start_words('parent', {**expected_a, 'programClass': foreign['id']}, expected_status=409)
            start_words('parent', {**expected_a, 'programRevision': expected_a['programRevision'] + 999}, expected_status=409)
            post('parent', 'training-start', {'profile': profiles['parent'], 'track': 'grammar', 'pack': 'number', **expected_a}, (400, 409))
            started = start_words('parent', expected_a)['session']
            assert started['program']['club'] == first['id'] and started['program']['revision'] == expected_a['programRevision']
            assert start_words('parent', expected_a)['session']['token'] == started['token']
            assert started['question']['word']['id'] in vocabulary_a
            assert all(row['id'] in vocabulary_a for row in started['question']['choices'])
            get('outsider', 'training-state&profile=' + str(profiles['parent']) + '&token=' + started['token'], 404)
            legacy_resume = get('parent', 'training-state&profile=' + str(profiles['parent']) + '&token=' + old['token'])['session']
            assert legacy_resume['token'] == old['token'] and legacy_resume['step'] == old['step']
            assert database.execute('SELECT plan FROM training_sessions WHERE token=?', (old['token'],)).fetchone()[0] == old_plan
            checks.append('new starts bind the exact class/revision; no missing-context bypass or unassigned pack; old plans remain frozen')

            # A second published programme makes the choice explicit for a new member.
            second_program, _ = draft(second['id'], [{'id': 'classroom-grammar', 'status': 'active'}], 'Another synthetic programme')
            publish(second_program)
            post('outsider', 'club-join', {'profile': profiles['outsider'], 'code': first['code'], 'consent': True})
            post('outsider', 'club-join', {'profile': profiles['outsider'], 'code': second['code'], 'consent': True})
            assert state('outsider')['mode'] == 'selection-required'
            post('outsider', 'training-start', {'profile': profiles['outsider'], 'track': 'words', 'pack': 'first'}, 409)
            post('outsider', 'class-program-context', {'profile': profiles['outsider'], 'club': foreign['id']}, (403, 404))
            post('outsider', 'class-program-context', {'profile': profiles['outsider'], 'club': first['id']})
            assert state('outsider')['active']['club'] == first['id']
            post('outsider', 'class-program-context', {'profile': profiles['outsider'], 'club': second['id']})
            assert state('outsider')['active']['club'] == second['id']
            post('outsider', 'training-start', {'profile': profiles['outsider'], 'track': 'grammar', 'pack': 'number', **expected_a}, 409)
            checks.append('multiple-class selection is explicit and stale device expectations cannot silently switch the programme')

            # Draft edits never mutate the published lesson snapshot.
            published_before = copy.deepcopy(state('parent'))
            current_edit = manage('owner', first['id'])['program']
            revised, _ = draft(first['id'], [{'id': 'classroom-grammar', 'status': 'review'}])
            assert state('parent') == published_before
            post('owner', 'class-program-save', {
                'club': first['id'], 'schoolYear': '2026/2027', 'title': 'Stale overwrite',
                'teacherLabel': '', 'method': '', 'examGoal': '',
                'units': initial_units, 'expectedRevision': current_edit['editVersion']}, 409)
            publish(revised)
            current = state('parent')
            assert current['active']['revision'] != expected_a['programRevision']
            assert expected_a['programRevision'] in {row['id'] for row in get('owner', 'class-program-history&club=' + str(first['id']))['history']}
            start_words('parent', expected_a, expected_status=409)
            resumed = get('parent', 'training-state&profile=' + str(profiles['parent']) + '&token=' + started['token'])['session']
            assert resumed['token'] == started['token'] and resumed['question'] == started['question']
            assert resumed['program']['historical'] is True
            checks.append('optimistic edits and immutable revisions preserve explicit historical resume without regrading')

            # Published source is copied, not a pointer into tomorrow's catalog.
            published_file = Path(public, 'training.json')
            source = published_file.read_text()
            changed = json.loads(source)
            changed['words'][0]['meaning'] = 'Synthetic future catalog edit'
            published_file.write_text(json.dumps(changed))
            assert state('parent') == current
            published_file.write_text(source)
            assert publish(revised)['replayed'] is True
            assert state('parent')['active']['revision'] == current['active']['revision']
            checks.append('published training payload and revision stay unchanged after catalog edits and duplicate publication')

            # Private material requires explicit adult review and remains class-local.
            material_body = {'club': first['id'], 'title': 'Synthetic private worksheet',
                             'words': [['pencil', 'matita', '✏️'], ['book', 'libro', '📘']],
                             'confirmed': True}
            post('owner', 'class-program-material-save', {**material_body, 'confirmed': False}, 400)
            post('owner', 'class-program-material-save', {**material_body, 'attachment': 'not-an-upload'}, 400)
            post('outsider', 'class-program-material-save', material_body, 403)
            post('owner', 'class-program-material-save', {**material_body, 'words': [['book', 'libro'], ['BOOK', 'libro']]}, 400)
            post('owner', 'class-program-material-save', {**material_body, 'words': [['<script>', 'test']]}, 400)
            post('owner', 'class-program-material-save', {**material_body, 'words': [['book', 'libro', '<svg onload=1>']]}, 400)
            custom = post('owner', 'class-program-material-save', material_body)['unit']
            assert custom['private'] is True and custom['id'].startswith('material-')
            assert custom['words'] == material_body['words']
            assert custom['id'] in {u['id'] for u in manage('owner', first['id'])['catalog']}
            assert custom['id'] not in {u['id'] for u in manage('owner', second['id'])['catalog']}
            post('owner', 'class-program-save', {
                'club': second['id'], 'schoolYear': '2026/2027', 'title': 'Forbidden cross-class material',
                'teacherLabel': '', 'method': '', 'examGoal': '',
                'units': [{'id': custom['id'], 'status': 'active'}],
                'expectedRevision': manage('owner', second['id'])['program']['editVersion']}, 400)
            assert state('parent') == current, 'Saving material alone must not assign it'
            checks.append('private reviewed materials have no automatic upload or assignment and cannot cross classes')

            # An accepted scoped capability never changes role, membership or ownership.
            identity_before = {table: database.execute('SELECT * FROM ' + table + ' ORDER BY 1').fetchall()
                               for table in ['profiles', 'club_profiles', 'accounts']}
            invitation_body = {'club': first['id'], 'username': 'cp_fixture_teacher',
                               'scopes': ['program-edit'], 'confirmed': True}
            post('owner', 'class-program-teacher-invite', {**invitation_body, 'confirmed': False}, 400)
            post('owner', 'class-program-teacher-invite', {**invitation_body, 'scopes': ['administrator']}, 400)
            post('outsider', 'class-program-teacher-invite', invitation_body, 403)
            learner_username = database.execute('SELECT a.username FROM accounts a JOIN profiles p ON p.account_id=a.id WHERE p.id=?', (profiles['learner'],)).fetchone()[0]
            post('owner', 'class-program-teacher-invite', {**invitation_body, 'username': learner_username}, 404)
            invitation = post('owner', 'class-program-teacher-invite', invitation_body)
            assert len(invitation['token']) == 48 and invitation['expires'] > time.time()
            stored = database.execute('SELECT token_hash FROM class_program_staff WHERE id=?', (invitation['staff'],)).fetchone()[0]
            assert stored == hashlib.sha256(invitation['token'].encode()).hexdigest() and stored != invitation['token']
            get('teacher', 'class-program-manage&club=' + str(first['id']), 403)
            acceptance = {'token': invitation['token'], 'confirmed': True}
            post('outsider', 'class-program-teacher-accept', acceptance, 404)
            post('outsider', 'class-program-teacher-accept', {**acceptance, 'confirmed': False}, 404)
            before_preview = tuple(database.execute('SELECT * FROM class_program_staff WHERE id=?', (invitation['staff'],)).fetchone())
            preview = post('teacher', 'class-program-teacher-accept', {**acceptance, 'confirmed': False})
            assert set(preview) == {'invitation'}
            assert preview['invitation'] == {'className': 'Synthetic programme A', 'scopes': ['program-edit'], 'expires': invitation['expires']}
            assert tuple(database.execute('SELECT * FROM class_program_staff WHERE id=?', (invitation['staff'],)).fetchone()) == before_preview
            get('teacher', 'class-program-manage&club=' + str(first['id']), 403)
            post('teacher', 'class-program-teacher-accept', acceptance)
            post('teacher', 'class-program-teacher-accept', acceptance, 404)
            assert database.execute('SELECT token_hash FROM class_program_staff WHERE id=?', (invitation['staff'],)).fetchone()[0] is None
            assert first['id'] in {c['id'] for c in get('teacher', 'class-program-manage')['classes']}
            assert second['id'] not in {c['id'] for c in get('teacher', 'class-program-manage')['classes']}
            assert manage('teacher', first['id'])['program']['id'] == program['id']
            editable = manage('teacher', first['id'])['program']
            post('teacher', 'class-program-save', {
                'club': first['id'], 'schoolYear': editable['schoolYear'],
                'title': 'Private unpublished teacher edit', 'teacherLabel': editable['teacherLabel'],
                'method': editable['method'], 'examGoal': '', 'units': editable['units'],
                'expectedRevision': editable['editVersion']})
            assert manage('teacher', first['id'])['program']['title'] == 'Private unpublished teacher edit'
            assert state('parent')['active']['title'] == current['active']['title']
            get('teacher', 'class-program-progress&club=' + str(first['id']), 403)
            get('teacher', 'class-program-state&profile=' + str(profiles['learner']), 404)
            get('teacher', 'training-progress&profile=' + str(profiles['learner']), 404)
            post('teacher', 'class-program-teacher-invite', {**invitation_body, 'username': 'cp_fixture_outsider'}, 403)
            assert identity_before == {table: database.execute('SELECT * FROM ' + table + ' ORDER BY 1').fetchall()
                                       for table in identity_before}
            post('owner', 'class-program-teacher-revoke', {'club': second['id'], 'staff': invitation['staff'], 'confirmed': True}, 404)
            post('owner', 'class-program-teacher-revoke', {'club': first['id'], 'staff': invitation['staff'], 'confirmed': True})
            get('teacher', 'class-program-manage&club=' + str(first['id']), 403)
            post('teacher', 'class-program-teacher-accept', acceptance, 404)
            checks.append('single-use username-bound teacher grants are scoped, revocable and never grant owned profiles or global roles')

            # Read-only staff and transient role/owner changes cannot resurrect grants.
            reader = post('owner', 'class-program-teacher-invite', {**invitation_body, 'scopes': ['progress-read']})
            post('teacher', 'class-program-teacher-accept', {'token': reader['token'], 'confirmed': True})
            assert get('teacher', 'class-program-progress&club=' + str(first['id']))['scope'] == 'class-program-confirmed-only'
            readonly = get('teacher', 'class-program-manage&club=' + str(first['id']))
            assert readonly['program']['publishedRevision'] == current['active']['revision']
            assert readonly['program']['editVersion'] == 0
            assert readonly['program']['title'] != 'Private unpublished teacher edit'
            assert all(not readonly[key] for key in ['units', 'catalog', 'teachers', 'history'])
            assert readonly['classes'][0]['canEdit'] is False and readonly['classes'][0]['canReadProgress'] is True
            get('teacher', 'class-program-history&club=' + str(first['id']), 403)
            post('teacher', 'class-program-save', {'club': first['id'], 'schoolYear': '2026/2027', 'title': 'No editing grant', 'units': [], 'expectedRevision': revised['editVersion']}, 403)
            ids = dict(database.execute('SELECT username,id FROM accounts'))
            database.execute('UPDATE accounts SET role="learner" WHERE id=?', (ids['cp_fixture_teacher'],))
            database.execute('UPDATE accounts SET role="adult" WHERE id=?', (ids['cp_fixture_teacher'],))
            database.commit()
            get('teacher', 'class-program-progress&club=' + str(first['id']), 403)
            reader = post('owner', 'class-program-teacher-invite', {**invitation_body, 'scopes': ['progress-read']})
            post('teacher', 'class-program-teacher-accept', {'token': reader['token'], 'confirmed': True})
            database.execute('UPDATE clubs SET owner_id=? WHERE id=?', (ids['cp_fixture_second'], first['id']))
            database.execute('UPDATE clubs SET owner_id=? WHERE id=?', (ids['cp_fixture_owner'], first['id']))
            database.commit()
            get('teacher', 'class-program-progress&club=' + str(first['id']), 403)
            reader = post('owner', 'class-program-teacher-invite', {**invitation_body, 'scopes': ['progress-read']})
            database.execute('UPDATE class_program_staff SET expires=0 WHERE id=?', (reader['staff'],))
            database.commit()
            post('teacher', 'class-program-teacher-accept', {'token': reader['token'], 'confirmed': False}, 404)
            post('teacher', 'class-program-teacher-accept', {'token': reader['token'], 'confirmed': True}, 404)
            checks.append('read-only scope cannot edit; expired invitations and role/owner loss stay revoked after restoration')

            def report(name='owner', club=None, program_id=None):
                action = 'class-program-progress&club=' + str(first['id'] if club is None else club)
                if program_id is not None:
                    action += '&program=' + str(program_id)
                return get(name, action)

            def profile_report(value, profile):
                return next(p for p in value['profiles'] if p['id'] == profile)

            def consent(name, profile, allowed=True, club=None, expected=200):
                return post(name, 'class-program-consent', {'club': first['id'] if club is None else club,
                            'profile': profile, 'allowed': allowed, 'confirmed': True}, expected)

            report_before = report()
            assert all(not p['shared'] and set(p) == {'id', 'nickname', 'shared'} for p in report_before['profiles'])
            consent('owner', profiles['learner'], expected=403)
            consent('learner', profiles['learner'], expected=403)
            consent('outsider', profiles['parent'], expected=403)
            post('parent', 'class-program-consent', {'club': first['id'], 'profile': profiles['parent'], 'allowed': True, 'confirmed': False}, 400)
            consent('parent', profiles['parent'])
            shared = profile_report(report(), profiles['parent'])
            assert shared['shared'] and shared['totals'] == {'completed': 0, 'independent': 0, 'guided': 0, 'errors': 0, 'replays': 0, 'models': 0}
            assert shared['items'] == []
            get('owner', 'class-program-progress&club=' + str(first['id']) + '&program=' + str(second_program['id']), 404)
            checks.append('progress requires valid per-profile adult consent; class managers and learners cannot self-authorize another child')

            # Confirm real server steps. Old global practice is never attributed.
            def answer(name, session, value=None, **extra):
                body = {'profile': profiles[name], 'token': session['token'], 'step': session['step'],
                        'attempt': secrets.token_hex(16),
                        'answer': session['question']['answer'] if value is None else value, **extra}
                return post(name, 'training-answer', body), body

            global_answer, _ = answer('parent', legacy_resume)
            assert profile_report(report(), profiles['parent'])['totals']['models'] == 0
            bound = get('parent', 'training-state&profile=' + str(profiles['parent']) + '&token=' + started['token'])['session']
            first_answer, payload = answer('parent', bound, replays=2)
            assert first_answer['correct'] and not first_answer['independent']
            after_model = profile_report(report(), profiles['parent'])
            assert after_model['totals']['models'] == 1 and after_model['totals']['completed'] == 0
            before_rows = [tuple(r) for r in database.execute('SELECT * FROM class_program_steps ORDER BY 1,2,3,4')]
            assert post('parent', 'training-answer', payload)['replayed'] is True
            assert [tuple(r) for r in database.execute('SELECT * FROM class_program_steps ORDER BY 1,2,3,4')] == before_rows
            bound = first_answer['session']
            wrong, wrong_payload = answer('parent', bound, 'Synthetic response never retained', replays=3)
            assert not wrong['correct'] and wrong['session']['errors'] == 1
            assert post('parent', 'training-answer', wrong_payload)['replayed'] is True
            post('parent', 'training-hint', {'profile': profiles['parent'], 'token': bound['token'], 'step': bound['step'], 'level': 1})
            device = client()
            device_token = request(device, 'login', {'username': 'cp_fixture_parent', 'password': password}, request(device, 'session')['csrf'])['csrf']
            from_device = request(device, 'training-state&profile=' + str(profiles['parent']) + '&token=' + bound['token'])['session']
            assert from_device['hint'] >= 1
            success = request(device, 'training-answer', {'profile': profiles['parent'], 'token': bound['token'],
                'step': bound['step'], 'attempt': secrets.token_hex(16), 'answer': bound['question']['answer'],
                'helped': False, 'replays': 4}, device_token)
            assert success['correct'] and not success['independent']
            summary = profile_report(report(), profiles['parent'])
            assert summary['totals'] == {'completed': 1, 'independent': 0, 'guided': 1, 'errors': 1, 'replays': 4, 'models': 1}
            assert len(summary['items']) == 2 and any(p['isModel'] for p in summary['items'])
            assert 'Synthetic response never retained' not in json.dumps(report())
            assert 'Synthetic response never retained' not in Path(temporary, 'data', 'wordyland.sqlite').read_bytes().decode('latin1')
            protected = ['profiles', 'wallets', 'inventory', 'practice', 'rewards', 'training_daily', 'training_items', 'class_program_steps']
            snapshot = {table: [tuple(r) for r in database.execute('SELECT * FROM ' + table + ' ORDER BY 1')] for table in protected}
            report()
            assert snapshot == {table: [tuple(r) for r in database.execute('SELECT * FROM ' + table + ' ORDER BY 1')] for table in protected}
            consent('parent', profiles['parent'], False)
            hidden = profile_report(report(), profiles['parent'])
            assert hidden == {'id': profiles['parent'], 'nickname': 'Synthetic parent', 'shared': False}
            consent('parent', profiles['parent'])
            assert profile_report(report(), profiles['parent'])['totals'] == summary['totals']
            checks.append('only bound server outcomes are attributed; model/guided, retries, cross-device help and read-only totals remain exact')

            # An accepted guardian can choose sharing, without obtaining ownership.
            pair_code = post('parent', 'guardian-code', {})['code']
            link = post('owner', 'guardian-invite', {'club': first['id'], 'profile': profiles['learner'], 'code': pair_code, 'authorized': True})['invitation']
            consent('parent', profiles['learner'], expected=403)
            pending = next(row for row in get('parent', 'guardian-state')['received'] if row['id'] == link)
            post('parent', 'guardian-accept', {'link': link, 'version': pending['version'], 'confirmGuardian': True})
            consent('parent', profiles['learner'])
            assert profile_report(report(), profiles['learner'])['shared'] is True
            get('parent', 'class-program-state&profile=' + str(profiles['learner']), 404)
            get('parent', 'training-progress&profile=' + str(profiles['learner']), 404)
            post('parent', 'guardian-revoke', {'link': link, 'version': pending['version']})
            assert profile_report(report(), profiles['learner'])['shared'] is False
            pair_code = post('parent', 'guardian-code', {})['code']
            reissued = post('owner', 'guardian-invite', {'club': first['id'], 'profile': profiles['learner'], 'code': pair_code, 'authorized': True})['invitation']
            replacement = next(row for row in get('parent', 'guardian-state')['received'] if row['id'] == reissued)
            post('parent', 'guardian-accept', {'link': reissued, 'version': replacement['version'], 'confirmGuardian': True})
            assert profile_report(report(), profiles['learner'])['shared'] is False, 'A new guardian consent version requires a new sharing choice'
            consent('parent', profiles['learner'])
            assert profile_report(report(), profiles['learner'])['shared'] is True
            checks.append('guardian sharing requires current accepted link/version and cannot revive on reissue or expand owned profiles')

            # Synthetic identity changes revoke consent permanently, not just until restored.
            consent('parent', profiles['parent'])
            database.execute('UPDATE profiles SET account_id=? WHERE id=?', (ids['cp_fixture_second'], profiles['parent']))
            database.execute('UPDATE profiles SET account_id=? WHERE id=?', (ids['cp_fixture_parent'], profiles['parent']))
            database.commit()
            assert profile_report(report(), profiles['parent'])['shared'] is False
            consent('parent', profiles['parent'])
            database.execute('UPDATE accounts SET role="learner" WHERE id=?', (ids['cp_fixture_parent'],))
            database.execute('UPDATE accounts SET role="adult" WHERE id=?', (ids['cp_fixture_parent'],))
            database.commit()
            assert profile_report(report(), profiles['parent'])['shared'] is False
            assert profile_report(report(), profiles['learner'])['shared'] is False
            consent('parent', profiles['parent'])
            checks.append('profile-owner and authorizing-adult role changes permanently invalidate both owned and guardian sharing')

            # Losing exact membership revokes access even if another class remains.
            post('parent', 'club-join', {'profile': profiles['parent'], 'code': second['code'], 'consent': True})
            post('parent', 'class-program-context', {'profile': profiles['parent'], 'club': second['id']})
            assert state('parent')['active']['club'] == second['id']
            frozen_plan = database.execute('SELECT plan FROM training_sessions WHERE token=?', (started['token'],)).fetchone()[0]
            post('owner', 'class-member-remove', {'club': first['id'], 'member': profiles['parent'], 'confirmed': True})
            get('parent', 'training-state&profile=' + str(profiles['parent']) + '&token=' + started['token'], 403)
            assert database.execute('SELECT plan FROM training_sessions WHERE token=?', (started['token'],)).fetchone()[0] == frozen_plan
            post('parent', 'club-join', {'profile': profiles['parent'], 'code': first['code'], 'consent': True})
            assert profile_report(report(), profiles['parent'])['shared'] is False, 'Rejoining never resurrects a revoked sharing choice'
            assert get('parent', 'training-state&profile=' + str(profiles['parent']) + '&token=' + started['token'])['session']['step'] == success['session']['step']
            checks.append('exact class removal blocks private resume, preserves history and revokes sharing after rejoin')

            # Empty published programmes stay blocked and annual history is preserved.
            previous_id = revised['id']
            previous_latest = manage('owner', first['id'])['program']
            publish(previous_latest)
            future, _ = draft(first['id'], [], 'Synthetic next-year draft', '2027/2028', expected=0)
            assert future['id'] != previous_id
            previous_head = state('learner')['active']
            publish(future, status=409)
            assert state('learner')['active'] == previous_head
            future, _ = draft(first['id'], [{'id': 'toys-yes-no', 'status': 'active'}],
                              'Synthetic next-year programme', '2027/2028', expected=future['editVersion'])
            publish(future)
            assert state('learner')['active']['program'] == future['id']
            assert state('learner')['active']['schoolYear'] == '2027/2028'
            new_head = state('learner')['active']
            publish(previous_latest, status=409)
            assert state('learner')['active'] == new_head, 'A stale replay must not rewind a newer year'
            assert previous_id in {h['program'] for h in get('owner', 'class-program-history&club=' + str(first['id']))['history']}
            assert profile_report(report(program_id=previous_id), profiles['parent'])['shared'] is False
            checks.append('empty publication is refused; a reviewed new year preserves the previous revision/progress history')

            alphabet_draft, _ = draft(second['id'], [
                {'id': 'classroom-dictation', 'status': 'active'},
                {'id': 'alphabet-it-en', 'status': 'planned'}], 'Synthetic explicit alphabet assignment')
            publish(alphabet_draft)
            assert state('outsider')['allowed']['letterIds'] == []
            alphabet_draft, _ = draft(second['id'], [{'id': 'alphabet-it-en', 'status': 'active'}],
                                      'Synthetic alphabet-only programme')
            publish(alphabet_draft)
            alphabet_state = state('outsider')
            assert set(alphabet_state['allowed']['letterIds']) == set('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
            assert alphabet_state['words'] == [] and alphabet_state['allowed']['grammarCases'] == []
            assert len(alphabet_state['training']['letters']) == 26
            post('outsider', 'training-start', {'profile': profiles['outsider'], 'track': 'letters', 'block': 'ae'}, 409)
            alpha = post('outsider', 'training-start', {'profile': profiles['outsider'], 'track': 'letters', 'block': 'ae', **alphabet_state['expected']})['session']
            assert alpha['question']['letter']['id'] in {'A', 'E'}
            post('outsider', 'training-start', {'profile': profiles['outsider'], 'track': 'words', 'pack': 'first', **alphabet_state['expected']}, (400, 409))
            checks.append('alphabet is explicitly assigned: planned has no effect and letters-only programmes include no words or grammar')

            # A reviewed private wording wins consistently over a public homonym.
            override_rows = [['book', 'libro personale della scheda', '⭐'],
                             ['pen', 'penna personale della scheda', '🖊️']]
            override = post('owner', 'class-program-material-save', {
                'club': first['id'], 'title': 'Synthetic approved wording override',
                'words': override_rows, 'confirmed': True})['unit']
            override_program, _ = draft(first['id'], [
                {'id': 'classroom-dictation', 'status': 'active'},
                {'id': override['id'], 'status': 'active'}],
                'Synthetic reviewed custom meaning', '2028/2029', expected=0)
            publish(override_program)
            canonical = state('learner')
            assert next(row for row in canonical['words'] if row[0] == 'book')[:3] == override_rows[0]
            for collection in ['words', 'foundationWords']:
                word = next(row for row in canonical['training'][collection] if row['id'] == 'book')
                assert word['meaning'] == override_rows[0][1] and word['emoji'] == override_rows[0][2]
                assert word['phraseMeaning'] == override_rows[0][1]
            changed = json.loads(source)
            for collection in ['words', 'foundationWords']:
                for word in changed.get(collection, []):
                    if word['id'] == 'book':
                        word['meaning'] = 'Synthetic later global wording'
                        word['emoji'] = '📙'
            published_file.write_text(json.dumps(changed))
            assert state('learner') == canonical
            assert publish(override_program)['replayed'] is True
            assert state('learner') == canonical
            published_file.write_text(source)
            checks.append('private reviewed wording/icons override public homonyms consistently and survive later global catalog changes')

            # A two-word class guarantees book is selected in a real saved quest.
            minimal, _ = draft(first['id'], [{'id': override['id'], 'status': 'active'}],
                               'Synthetic two-word mission pool', '2028/2029',
                               expected=override_program['editVersion'])
            publish(minimal)
            post('owner', 'class-program-context', {'profile': profiles['owner'], 'club': first['id']})
            two_word_context = state('owner')
            assert len(two_word_context['words']) == 2
            post('owner', 'study-save', {'profile': profiles['owner'],
                'title': 'Synthetic stale source wording', 'confirmed': True,
                'words': [['book', 'global meaning must not win', '📙'],
                          ['pen', 'global pen meaning must not win', '🌐'],
                          ['cat', 'unassigned word must not enter', '🐈']]})
            study = database.execute('SELECT id FROM studies WHERE profile_id=? ORDER BY id DESC LIMIT 1',
                                     (profiles['owner'],)).fetchone()[0]
            mission = post('owner', 'quest-start', {'profile': profiles['owner'],
                'study': study, 'activity': 'kart', **two_word_context['expected']})
            plan = json.loads(database.execute('SELECT questions FROM quests WHERE token=?',
                                              (mission['token'],)).fetchone()[0])
            expected_words = {row[0]: row for row in override_rows}
            assert len(plan) == 2 and {question['word'] for question in plan} == {'book', 'pen'}
            for question in plan:
                canonical_row = expected_words[question['word']]
                assert [question['word'], question['translation'], question['emoji']] == canonical_row
                for option in question.get('options', []):
                    assert option[:3] == expected_words[option[0]]

            # Pure helper oracle also covers trusted visual metadata and legacy identity.
            probe = '''define('WORDYLAND_BOOTSTRAPPED',true);
            $db=new PDO('sqlite::memory:');$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);
            $db->exec('CREATE TABLE accounts(id INTEGER PRIMARY KEY,role TEXT);CREATE TABLE clubs(id INTEGER PRIMARY KEY,owner_id INTEGER);CREATE TABLE profiles(id INTEGER PRIMARY KEY,account_id INTEGER);CREATE TABLE club_profiles(club_id INTEGER,profile_id INTEGER);');
            $action='synthetic-pool-probe';require $argv[1];
            $rows=[['BOOK','global','old',['type'=>'count','count'=>2]],['cat','global cat','old']];
            $context=['mode'=>'class','words'=>[['book','libro personale della scheda','⭐']]];
            $plain=cpFilterWordPool($rows,$context);
            $context['words'][0][3]=['type'=>'count','count'=>3];
            echo json_encode(['plain'=>$plain,'explicit'=>cpFilterWordPool($rows,$context),'legacy'=>cpFilterWordPool($rows,['mode'=>'legacy']),'blocked'=>cpFilterWordPool($rows,['mode'=>'blocked'])],JSON_UNESCAPED_UNICODE);'''
            helper = json.loads(subprocess.run(command + ['-r', probe, str(Path(public, 'class-program.php'))],
                                               check=True, capture_output=True, text=True).stdout)
            assert helper['plain'] == [['book', 'libro personale della scheda', '⭐', {'type': 'count', 'count': 2}]]
            assert helper['explicit'] == [['book', 'libro personale della scheda', '⭐', {'type': 'count', 'count': 3}]]
            assert helper['legacy'] == [['BOOK', 'global', 'old', {'type': 'count', 'count': 2}], ['cat', 'global cat', 'old']]
            assert helper['blocked'] == []
            checks.append('mission pools use private canonical meanings/icons, preserve trusted visual metadata, exclude unassigned words and leave legacy unchanged')

            print(json.dumps({'status': 'passed', 'checks': checks, 'syntheticOnly': True}))
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
            log.close()


if __name__ == '__main__':
    main()
