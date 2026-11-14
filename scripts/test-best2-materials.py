"""Best2 teacher materials, schema negotiation and rollback: disposable localhost only.

No real account, document, address, email or production request is used. All
identities, permissions and data live in a temporary directory removed on exit.
"""
from pathlib import Path
import copy
import http.cookiejar
import io
import json
import os
import shlex
import shutil
import socket
import sqlite3
import subprocess
import tarfile
import tempfile
import time
import urllib.error
import urllib.request

BASELINE = '3614c4476101814b307dd72a80b935ca7883e2fd'
GRAMMAR_TABLE = 'training_best2_grammar_sessions'
WORD_TABLE = 'training_best2_word_sessions'
PACKS = {'best2-what-questions': ('model', 'identify-build', 'identify-write'),
         'best2-this-these': ('model', 'demonstrative-choice', 'demonstrative-build', 'demonstrative-write'),
         'best2-it-they-sentences': ('model', 'sentence')}
WORDS = {'slide', 'scooter', 'swing', 'shelf', 'cupboard', 'computer', 'tree'}
SKILLS = {'model': 'model.explore', 'identify-build': 'grammar.identify.compose',
          'identify-write': 'grammar.identify.write', 'sentence': 'grammar.sentence.compose',
          'demonstrative-choice': 'grammar.demonstrative.recognize',
          'demonstrative-build': 'grammar.demonstrative.compose',
          'demonstrative-write': 'grammar.demonstrative.write'}


def main():
    content = json.loads(Path('dist/training.json').read_text())
    grammar = content['grammarLessons']
    packs = {p['id']: p for p in grammar['packs']}
    cases = {c['id']: c for p in grammar['packs'] for c in p['cases']}
    assert set(PACKS) <= set(packs), 'The source-backed Best2 packs must exist before this test runs'
    assert [len(packs[p]['cases']) for p in PACKS] == [10, 8, 10]
    checks = []
    with tempfile.TemporaryDirectory(prefix='wordyland-best2-api-') as tmp:
        root = Path(tmp)
        public = root / 'public'
        shutil.copytree('dist', public)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
        command = shlex.split(os.environ.get('PHP_COMMAND', 'php'))
        log = (root / 'php.log').open('w+')
        environment = dict(os.environ, WORDYLAND_TEST='1', WORDYLAND_DATA_DIR=str(root / 'data'))
        server = subprocess.Popen(command + ['-d', 'session.save_path=' + tmp, '-S',
                                  f'127.0.0.1:{port}', '-t', str(public)],
                                  env=environment, stdout=log, stderr=log)
        base = f'http://127.0.0.1:{port}/api.php?action='
        actors, csrf, profiles = {}, {}, {}

        def client():
            return urllib.request.build_opener(urllib.request.ProxyHandler({}),
                urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def request(name, action, data=None, status=200, token=None, endpoint=None):
            req = urllib.request.Request((endpoint or base) + action,
                data=None if data is None else json.dumps(data).encode(),
                headers={'Content-Type': 'application/json',
                         'X-CSRF-Token': csrf.get(name, '') if token is None else token})
            try:
                response = actors[name].open(req, timeout=12)
            except urllib.error.HTTPError as error:
                response = error
            raw = response.read().decode()
            acceptable = (status,) if isinstance(status, int) else status
            assert response.status in acceptable, (action, response.status, acceptable, raw[:1000])
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                raise AssertionError((action, response.status, 'Non-JSON local response', raw[:600]))
            if response.status >= 400:
                assert set(result) <= {'error', 'requestId'}, ('Denial leaks snapshot', action, sorted(result))
            return result

        def get(name, action, status=200, endpoint=None):
            return request(name, action, status=status, endpoint=endpoint)

        def post(name, action, data, status=200):
            return request(name, action, data, status)

        password = 'Best2-synthetic-only-123'
        attempt_counter = 0
        try:
            actors['owner'] = client()
            for _ in range(80):
                try:
                    get('owner', 'session'); break
                except urllib.error.URLError:
                    time.sleep(.05)
            else:
                raise RuntimeError('Disposable PHP server did not start')
            for name in ['owner', 'other', 'admin']:
                actors.setdefault(name, client())
                session = get(name, 'session')
                result = request(name, 'register', {
                    'username': 'best2_fixture_' + name, 'password': password, 'adult': True
                }, token=session['csrf'])
                csrf[name] = result['csrf']
                profiles[name] = post(name, 'create-profile', {'nickname': 'Synthetic ' + name})['id']
                get(name, 'hub&profile=' + str(profiles[name]))
            models = {kind: post('owner', 'create-profile', {'nickname': 'Model ' + kind})['id']
                      for kind in ['grammar', 'words']}
            for pid in models.values():
                get('owner', 'hub&profile=' + str(pid))
            db = sqlite3.connect(root / 'data' / 'wordyland.sqlite')
            db.row_factory = sqlite3.Row
            db.execute('UPDATE accounts SET role="admin" WHERE username="best2_fixture_admin"'); db.commit()
            csrf['admin'] = request('admin', 'login', {
                'username': 'best2_fixture_admin', 'password': password
            }, token=get('admin', 'session')['csrf'])['csrf']
            pid = profiles['owner']
            get('owner', 'training-state&profile=' + str(pid))
            protected = ['accounts', 'profiles', 'wallets', 'inventory', 'practice',
                         'practice_outcomes', 'credits', 'rewards', 'quests', 'clubs', 'club_profiles']

            def rows(table):
                return [tuple(row) for row in db.execute('SELECT * FROM ' + table + ' ORDER BY 1')]

            def snapshot(tables):
                return {table: rows(table) for table in tables}

            def row(token, table):
                data = db.execute('SELECT * FROM ' + table + ' WHERE token=?', (token,)).fetchone()
                assert data is not None, (table, token)
                return dict(data)

            def start(pack, track='grammar', profile=pid, cap=3, expected=None, status=200):
                body = {'profile': profile, 'track': track, 'pack': pack}
                if cap is not None:
                    body['trainingSchema'] = cap
                if expected:
                    body.update(expected)
                return post('owner', 'training-start', body, status)

            def read(token, profile=pid, cap=3, name='owner', status=200, endpoint=None):
                action = f'training-state&profile={profile}&token=' + token
                if cap is not None:
                    action += '&trainingSchema=' + str(cap)
                return get(name, action, status, endpoint)

            def answer(session, value=None, profile=pid, cap=3, name='owner', status=200,
                       attempt=None, extra=None):
                nonlocal attempt_counter
                attempt_counter += 1
                body = {'profile': profile, 'token': session['token'], 'step': session['step'],
                        'attempt': attempt or f'{attempt_counter:032x}',
                        'answer': session['question']['answer'] if value is None else value}
                if cap is not None:
                    body['trainingSchema'] = cap
                if extra:
                    body.update(extra)
                return post(name, 'training-answer', body, status), body

            def hint(session, profile=pid, cap=3, status=200):
                body = {'profile': profile, 'token': session['token'], 'step': session['step'], 'level': 1}
                if cap is not None:
                    body['trainingSchema'] = cap
                return post('owner', 'training-hint', body, status)

            legacy_word = start('first', 'words', cap=None)['session']
            legacy_grammar = start('questions', cap=None)['session']
            assert 'trainingSchema' not in legacy_word and 'trainingSchema' not in legacy_grammar
            assert 'trainingSchema' not in read(legacy_word['token'])['session']
            actors['anonymous'] = client()
            get('anonymous', f'training-state&profile={pid}&grammar=1&trainingSchema=3', status=401)
            request('owner', 'training-start', {'profile': pid, 'track': 'grammar',
                'pack': 'best2-this-these', 'trainingSchema': 3}, token='invalid', status=403)
            original_old_rows = {
                'training_sessions': rows('training_sessions'),
                'training_grammar_sessions': rows('training_grammar_sessions'),
                'training_worksheet_sessions': rows('training_worksheet_sessions')}
            economy = snapshot(protected)
            before_rejected_caps = snapshot([GRAMMAR_TABLE, WORD_TABLE, 'rate_limits', 'training_items', 'training_daily', 'training_totals', 'training_stickers'])
            for pack in PACKS:
                for cap in [None, 2, 4, True, '3']:
                    start(pack, cap=cap, status=409)
            for cap in [None, 2, 4]:
                start('best2-new-words', 'words', cap=cap, status=409)
            assert rows(GRAMMAR_TABLE) == [] and rows(WORD_TABLE) == []
            assert snapshot(before_rejected_caps) == before_rejected_caps, 'Unsupported clients must not consume a start budget or alter progress'
            checks.append('new tracks require schema3 before storing a plan; existing word and grammar starts remain compatible')

            seen = {pack: set() for pack in PACKS}
            demonstrated = set()
            for pack, phases in PACKS.items():
                for _ in range((len(packs[pack]['cases']) + 2) // 3 + 1):
                    session = start(pack)['session']
                    assert session['trainingSchema'] == 3
                    actual = row(session['token'], GRAMMAR_TABLE)
                    plan = json.loads(actual['plan'])
                    assert session['track'] == 'grammar:' + pack
                    assert len(plan) == len(phases) * 3 and len(plan) <= 12
                    assert len({q['item'] for q in plan}) == 3
                    for index, question in enumerate(plan):
                        phase = phases[index % len(phases)]
                        case = cases[question['item'][8:]]
                        assert question['grammar']['phase'] == phase
                        assert question['grammar']['tokens'] == case['tokens']
                        expected = case['prefix'] if phase == 'demonstrative-choice' else case['answer']
                        assert question['answer'] == expected, (phase, question, case)
                        assert question['mode'] == ('grammar-model' if phase == 'model' else
                            'grammar-choice' if phase == 'demonstrative-choice' else
                            'grammar-write' if phase in ['identify-write', 'demonstrative-write'] else 'grammar-build')
                        if phase == 'demonstrative-choice':
                            assert sorted(question['choices']) == ['These are', 'This is']
                        if phase in ['demonstrative-build', 'identify-build', 'sentence']:
                            assert sorted(question['tokens']) == sorted(case['tokens'])
                        seen[pack].add(case['id'])
                    for missing_cap in [None, 2, 4, True]:
                        assert read(session['token'], cap=missing_cap, status=409).get('error')
                    assert read(session['token'], name='other', profile=profiles['other'], status=404).get('error')
                    if pack not in demonstrated:
                        before = copy.deepcopy(row(session['token'], GRAMMAR_TABLE))
                        hint(session, cap=None, status=409)
                        answer(session, cap=None, status=409)
                        assert row(session['token'], GRAMMAR_TABLE) == before
                    while not session['done']:
                        question = session['question']
                        phase = question['grammar']['phase']
                        if pack not in demonstrated and phase != 'model':
                            wrong, duplicate_wrong = answer(session, 'synthetic_wrong_typing')
                            assert wrong['correct'] is False and wrong['session']['step'] == session['step']
                            assert wrong['session']['errors'] == 1
                            duplicate = post('owner', 'training-answer', duplicate_wrong)
                            assert duplicate['replayed'] and duplicate['session']['errors'] == 1
                            session = hint(wrong['session'])['session']
                            assert session['helped'] and session['hint'] == 1
                            assert read(session['token'])['session'] == session
                            demonstrated.add(pack)
                        case = cases[question['item'][8:]]
                        accepted = question['answer']
                        if phase == 'identify-write' and case['noun'] == 'bookbag':
                            short = 'It is a bag.' if case['count'] == 1 else 'They are bags.'
                            wrong, _ = answer(session, short)
                            assert wrong['correct'] is False, 'Bare bag must not replace teacher bookbag'
                            session = wrong['session']
                            accepted = 'It is a book bag.' if case['count'] == 1 else 'They are book bags.'
                        result, payload = answer(session, accepted, extra={'replays': 2})
                        assert result['correct'], (pack, phase, result)
                        evidence = db.execute('SELECT * FROM training_items WHERE profile_id=? AND item=? AND skill=?',
                            (pid, question['item'], SKILLS[phase])).fetchone()
                        assert evidence and evidence['completed'] >= 1 and evidence['replays'] >= 2
                        if phase == 'model' or session['helped'] or session['errors']:
                            assert result['independent'] is False
                        session = result['session']
                    before_replay = snapshot([GRAMMAR_TABLE, 'training_items', 'training_daily', 'training_totals', 'training_stickers'])
                    assert post('owner', 'training-answer', payload)['replayed']
                    assert snapshot(before_replay) == before_replay
                    if seen[pack] == {case['id'] for case in packs[pack]['cases']}:
                        break
                assert seen[pack] == {case['id'] for case in packs[pack]['cases']}, (pack, seen[pack])
            assert set().union(*seen.values()) == {c['id'] for pack in PACKS for c in packs[pack]['cases']}
            progress = get('owner', 'training-progress&profile=' + str(pid))
            assert progress['scope'] == 'owned-training-only'
            assert {item['item'] for item in progress['items']} >= {'grammar:' + case_id for values in seen.values() for case_id in values}
            get('other', 'training-progress&profile=' + str(pid), status=404)
            checks.append('all28source cases run through exact model/choice/composition/writing skills; bookbag aliases and rejected bag, errors, hints, replay, reload and owned-only progress are preserved')

            seen_words = set()
            for _ in range(5):
                session = start('best2-new-words', 'words')['session']
                plan = json.loads(row(session['token'], WORD_TABLE)['plan'])
                assert session['trainingSchema'] == 3 and len(plan) == 8
                assert [q['mode'] for q in plan] == ['model', 'recognize', 'build', 'recall'] * 2
                assert {q['word']['id'] for q in plan} <= WORDS
                assert all(q['word']['phrase'] == q['word']['id'] and q['word']['gap'] == '___' for q in plan)
                if not seen_words:
                    before = row(session['token'], WORD_TABLE)
                    for missing_cap in [None, 2, 4, True]:
                        read(session['token'], cap=missing_cap, status=409)
                    read(session['token'], name='other', profile=profiles['other'], status=404)
                    hint(session, cap=None, status=409)
                    answer(session, cap=None, status=409)
                    assert row(session['token'], WORD_TABLE) == before
                seen_words.update(q['word']['id'] for q in plan)
                while not session['done']:
                    result, payload = answer(session); assert result['correct']; session = result['session']
                before = snapshot([WORD_TABLE, 'training_items', 'training_daily', 'training_totals', 'training_stickers'])
                assert post('owner', 'training-answer', payload)['replayed'] and snapshot(before) == before
                if seen_words == WORDS:
                    break
            assert seen_words == WORDS
            assert {q['mode'] for q in json.loads(row(session['token'], WORD_TABLE)['plan'])} <= {'model', 'recognize', 'build', 'recall'}
            checks.append('all7word spellings rotate in8-step word-only plans without new sentences or plurals; replay never grants duplicate progress')

            for table, original in original_old_rows.items():
                assert rows(table) == original, ('New material changed an old plan', table)
            assert snapshot(protected) == economy, 'New practice changed accounts, game economy or old progress'
            assert read(legacy_word['token'], cap=None)['session']['token'] == legacy_word['token']
            assert read(legacy_grammar['token'], cap=None)['session']['token'] == legacy_grammar['token']
            checks.append('old plan rows and all account/game/reward tables remain exact while new activities run')

            def played():
                return {entry['id'] for entry in get('admin', 'roster&scope=all&filter=played')['items']}

            for kind, model_profile in models.items():
                session = start('best2-this-these' if kind == 'grammar' else 'best2-new-words',
                                'grammar' if kind == 'grammar' else 'words', profile=model_profile)['session']
                assert model_profile not in played()
                session = answer(session, profile=model_profile)[0]['session']
                assert model_profile not in played(), 'Viewing a model is not a played answer'
                session = hint(session, profile=model_profile)['session']
                assert model_profile not in played(), 'An optional hint is not an answer'
                result, _ = answer(session, 'synthetic_wrong_typing', profile=model_profile)
                assert not result['correct'] and model_profile in played(), 'Wrong-only meaningful attempts count in the new table'
            checks.append('roster counts actual correct/wrong attempts in both new tables, excluding starts, models and hints')

            grammar_pending = start('best2-this-these')['session']
            word_pending = start('best2-new-words', 'words')['session']
            grammar_pending = answer(grammar_pending)[0]['session']
            grammar_pending = hint(grammar_pending)['session']
            preserved_new_tables = [GRAMMAR_TABLE, WORD_TABLE, 'training_items', 'training_daily', 'training_totals', 'training_stickers']
            new_rows_before = snapshot(preserved_new_tables)
            for grammar_view in [False, True]:
                query = f'training-state&profile={pid}' + ('&grammar=1' if grammar_view else '')
                old = get('owner', query)
                assert not any(s['token'] in {grammar_pending['token'], word_pending['token']} for s in old['sessions'])
                if old.get('recommendation'):
                    assert old['recommendation'].get('pack') not in set(PACKS) | {'best2-new-words'}
                current = get('owner', query + '&trainingSchema=3')
                expected_token = grammar_pending['token'] if grammar_view else word_pending['token']
                assert expected_token in {s['token'] for s in current['sessions']}
            rollback = root / 'rollback'; rollback.mkdir()
            archive = subprocess.check_output(['git', 'archive', BASELINE, 'dist'])
            with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
                bundle.extractall(rollback, filter='data')
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0)); old_port = sock.getsockname()[1]
            oldserver = subprocess.Popen(command + ['-d', 'session.save_path=' + tmp, '-S',
                f'127.0.0.1:{old_port}', '-t', str(rollback / 'dist')],
                env=environment, stdout=log, stderr=log)
            oldbase = f'http://127.0.0.1:{old_port}/api.php?action='
            try:
                for _ in range(80):
                    try:
                        old_grammar = get('owner', f'training-state&profile={pid}&grammar=1', endpoint=oldbase); break
                    except urllib.error.URLError:
                        time.sleep(.05)
                else:
                    raise RuntimeError('The real baseline rollback server did not start')
                old_words = get('owner', f'training-state&profile={pid}', endpoint=oldbase)
                assert not any(s['token'] in {grammar_pending['token'], word_pending['token']}
                               for s in old_grammar['sessions'] + old_words['sessions'])
                assert read(legacy_word['token'], cap=None, endpoint=oldbase)['session']['token'] == legacy_word['token']
                assert read(legacy_grammar['token'], cap=None, endpoint=oldbase)['session']['token'] == legacy_grammar['token']
            finally:
                oldserver.terminate(); oldserver.wait(timeout=5)
            assert snapshot(preserved_new_tables) == new_rows_before
            assert read(grammar_pending['token'])['session'] == grammar_pending
            assert read(word_pending['token'])['session'] == word_pending
            checks.append('cached-old state and real3614application rollback hide new plans while preserving old resume and new frozen help/plan bytes')

            # Publish the new lesson units only in this synthetic class. A second
            # class keeps its previous material and cannot start these topics.
            club = post('owner', 'club-create', {'profile': pid, 'name': 'Synthetic Best2 material', 'consent': True})
            other_club = post('other', 'club-create', {'profile': profiles['other'], 'name': 'Synthetic other method', 'consent': True})

            def programme(name, club_id, unit_ids, expected_version=0):
                program = post(name, 'class-program-save', {'club': club_id, 'schoolYear': '2026/2027',
                    'title': 'Synthetic teacher material', 'teacherLabel': 'Synthetic teacher',
                    'method': 'Only reviewed material', 'examGoal': '', 'expectedRevision': expected_version,
                    'units': [{'id': unit, 'status': 'active'} for unit in unit_ids]})['program']
                post(name, 'class-program-publish', {'program': program['id'],
                     'expectedRevision': program['editVersion'], 'confirmed': True})
                return program

            old_programme = programme('owner', club['id'], ['whats-this'])
            frozen = get('owner', 'class-program-state&profile=' + str(pid))
            frozen_revision = copy.deepcopy(dict(db.execute('SELECT * FROM class_program_revisions WHERE id=?', (frozen['active']['revision'],)).fetchone()))
            bound_old = start('whats-this', cap=None, expected=frozen['expected'])['session']
            programme('owner', club['id'], ['best2-20261114-words', 'best2-20261114-questions',
                'best2-20261114-this-these', 'best2-20261114-statements'], old_programme['editVersion'])
            programme('other', other_club['id'], ['whats-this'])
            manifest = get('owner', 'class-program-state&profile=' + str(pid))
            foreign = get('other', 'class-program-state&profile=' + str(profiles['other']))
            assert set(manifest['allowed']['grammarCases']) == set().union(*seen.values())
            assert not set().union(*seen.values()) & set(foreign['allowed']['grammarCases'])
            assert not WORDS & set(foreign['allowed']['wordIds'])
            post('other', 'training-start', {'profile': profiles['other'], 'track': 'grammar',
                 'pack': 'best2-this-these', 'trainingSchema': 3, **foreign['expected']}, status=400)
            assert dict(db.execute('SELECT * FROM class_program_revisions WHERE id=?', (frozen['active']['revision'],)).fetchone()) == frozen_revision
            assert read(bound_old['token'], cap=None)['session']['question'] == bound_old['question']
            start('best2-this-these', expected=frozen['expected'], status=409)
            bound = start('best2-this-these', expected=manifest['expected'])['session']
            generic = next(p for p in manifest['training']['wordPacks'] if p['id'] == 'program')
            assert WORDS <= set(generic['words'])
            start('program', 'words', cap=None, expected=manifest['expected'], status=409)
            generic_word = start('program', 'words', expected=manifest['expected'])['session']
            assert db.execute('SELECT COUNT(*) FROM ' + WORD_TABLE + ' WHERE token=?', (generic_word['token'],)).fetchone()[0] == 1
            assert db.execute('SELECT COUNT(*) FROM training_sessions WHERE token=?', (generic_word['token'],)).fetchone()[0] == 0
            assert bound['program']['club'] == club['id'] and bound['program']['revision'] == manifest['active']['revision']
            checks.append('class assignment remains explicit and exact; foreign classes, stale revisions and generic class-word pools cannot bypass topic/schema isolation')

            # New published revisions carry two immutable views. Exercise the
            # actual previous PHP application, not a simulation of its filters.
            revision = dict(db.execute('SELECT * FROM class_program_revisions WHERE id=?',
                (manifest['active']['revision'],)).fetchone())
            payload_views = json.loads(revision['payload'])
            assert {p['id'] for p in payload_views['trainingV3']['grammarLessons']['packs']} == set(PACKS)
            assert not {p['id'] for p in payload_views['training']['grammarLessons']['packs']} & set(PACKS)
            assert 'best2-new-words' not in {p['id'] for p in payload_views['training']['wordPacks']}
            assert all(c['task'] != 'demonstrative' for p in payload_views['training']['grammarLessons']['packs'] for c in p['cases'])
            before_old_head = snapshot(preserved_new_tables)
            oldserver = subprocess.Popen(command + ['-d', 'session.save_path=' + tmp, '-S',
                f'127.0.0.1:{old_port}', '-t', str(rollback / 'dist')],
                env=environment, stdout=log, stderr=log)
            try:
                for _ in range(80):
                    try:
                        old_manifest = get('owner', 'class-program-state&profile=' + str(pid), endpoint=oldbase); break
                    except urllib.error.URLError:
                        time.sleep(.05)
                else:
                    raise RuntimeError('The baseline programme rollback server did not start')
                assert old_manifest['active']['revision'] == manifest['active']['revision']
                assert not {p['id'] for p in old_manifest['training']['grammarLessons']['packs']} & set(PACKS)
                assert 'best2-new-words' not in {p['id'] for p in old_manifest['training']['wordPacks']}
                assert all(c['task'] != 'demonstrative' for p in old_manifest['training']['grammarLessons']['packs'] for c in p['cases'])
                old_head_grammar = get('owner', f'training-state&profile={pid}&grammar=1', endpoint=oldbase)
                old_head_words = get('owner', f'training-state&profile={pid}', endpoint=oldbase)
                assert not any(s['token'] in {bound['token'], generic_word['token']} for s in old_head_grammar['sessions'] + old_head_words['sessions'])
                request('owner', 'training-start', {'profile': pid, 'track': 'grammar',
                    'pack': 'best2-this-these', **old_manifest['expected']}, status=400, endpoint=oldbase)
                assert read(bound_old['token'], cap=None, endpoint=oldbase)['session']['question'] == bound_old['question']
                compatible_word = request('owner', 'training-start', {'profile': pid, 'track': 'words',
                    'pack': 'program', **old_manifest['expected']}, endpoint=oldbase)['session']
                compatible_plan = json.loads(row(compatible_word['token'], 'training_sessions')['plan'])
                assert len(compatible_plan) == 8 and {q['mode'] for q in compatible_plan} == {'model', 'recognize', 'build', 'recall'}
            finally:
                oldserver.terminate(); oldserver.wait(timeout=5)
            assert snapshot(preserved_new_tables) == before_old_head
            assert dict(db.execute('SELECT * FROM class_program_revisions WHERE id=?', (manifest['active']['revision'],)).fetchone()) == revision
            assert read(bound['token'])['session'] == bound
            checks.append('actual3614PHP reads the new published revision through its legacy-safe frozen view, rejects new grammar and retains executable old word/grammar plans without mutating V3 storage')

            ledger_tables = [GRAMMAR_TABLE, WORD_TABLE, 'class_program_steps', 'training_items', 'training_daily', 'training_totals', 'training_stickers']
            before_fault = snapshot(ledger_tables)
            db.execute("CREATE TRIGGER best2_synthetic_failure BEFORE INSERT ON class_program_steps WHEN NEW.token='" + bound['token'] + "' BEGIN SELECT RAISE(ABORT,'synthetic ledger fault'); END")
            db.commit()
            denied, _ = answer(bound, status=503)
            assert denied.get('requestId') and snapshot(ledger_tables) == before_fault
            db.execute('DROP TRIGGER best2_synthetic_failure'); db.commit()
            confirmed, payload = answer(bound)
            assert confirmed['correct'] and not confirmed['independent']
            ledger = [dict(r) for r in db.execute('SELECT * FROM class_program_steps WHERE token=?', (bound['token'],))]
            assert len(ledger) == 1 and ledger[0]['model'] == 1 and ledger[0]['helped'] == 1
            before_replay = snapshot(ledger_tables)
            assert post('owner', 'training-answer', payload)['replayed'] and snapshot(ledger_tables) == before_replay
            assert not {'answer', 'raw_answer', 'draft'} & {r[1] for r in db.execute('PRAGMA table_info(class_program_steps)')}
            assert 'synthetic_wrong_typing' not in json.dumps(snapshot([GRAMMAR_TABLE, WORD_TABLE, 'class_program_steps']))
            checks.append('class ledger and training step commit atomically, rollback503 leaves no credit, retries are idempotent and raw typed answers are not retained')
            print(json.dumps({'status': 'passed', 'checks': checks, 'groups': len(checks),
                'cases': sum(len(value) for value in seen.values()), 'words': len(seen_words),
                'rollback': BASELINE, 'syntheticOnly': True, 'productionRequests': 0}))
        finally:
            server.terminate(); server.wait(timeout=5); log.close()


if __name__ == '__main__':
    main()
