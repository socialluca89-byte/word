"""Exercise real quest/holiday/duel adapters against synthetic class programmes.

The HTTP server and database are disposable localhost fixtures. No production,
email, child document, account credentials or external service is contacted.
"""
from pathlib import Path
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
    with tempfile.TemporaryDirectory(prefix='wordyland-program-adapters-') as temporary:
        public = Path(temporary, 'public')
        shutil.copytree('dist', public)
        # Run the actual renderer in a VM without a DOM: hostile text must stay
        # text, including material saved before the server validation tightened.
        renderer_check = subprocess.run(['node', '-e', r"""
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.argv[1],'utf8');
const start=source.indexOf('function picture(w,emoji){'),end=source.indexOf('let gapAnswer=',start);
assert(start>=0&&end>start,'The real classic picture renderer must remain under test');
const context={lists:{counting:[],place:[]}};vm.createContext(context);
vm.runInContext(source.split('\n')[0]+'\n'+source.slice(start,end),context);
const hostile='<img src=x onerror=alert(1)>',html=context.picture('fixtureword',hostile);
assert(!html.includes('<img'),'An assigned icon cannot become an active HTML element');
assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'),'Untrusted icon text is escaped');
assert(context.picture('fixtureword','📘').includes('📘'),'Plain emoji remain visible');
""", str(public / 'app.js')], text=True, capture_output=True, timeout=10)
        assert renderer_check.returncode == 0, ('classic icon safety', renderer_check.stderr[:1000])
        clock = Path(temporary, 'clock')
        clock.write_text('2026-12-08 12:00:00')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        log = open(Path(temporary, 'php.log'), 'w+')
        server = subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND', 'php')) + [
            '-d', 'session.save_path=' + temporary, '-S', f'127.0.0.1:{port}', '-t', str(public)
        ], env=dict(os.environ, WORDYLAND_TEST='1', WORDYLAND_TEST_CLOCK_FILE=str(clock),
                    WORDYLAND_DATA_DIR=str(Path(temporary, 'data'))), stdout=log, stderr=log)
        actors, tokens, profiles = {}, {}, {}
        checks = ['the real classic renderer escapes previously stored hostile icon text and preserves emoji']

        def client():
            return urllib.request.build_opener(urllib.request.ProxyHandler({}),
                urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def request(actor, action, data=None, csrf='', expected=200):
            message = urllib.request.Request(f'http://127.0.0.1:{port}/api.php?action=' + action,
                data=None if data is None else json.dumps(data).encode(),
                headers={'Content-Type': 'application/json', 'X-CSRF-Token': csrf})
            try:
                response = actor.open(message, timeout=12)
            except urllib.error.HTTPError as error:
                response = error
            raw = response.read().decode()
            statuses = (expected,) if isinstance(expected, int) else expected
            assert response.status in statuses, (action, response.status, expected, raw[:900])
            result = json.loads(raw)
            if response.status >= 400:
                assert set(result) <= {'error', 'requestId'}, (action, 'denial exposes context')
            return result

        def get(name, action, expected=200):
            return request(actors[name], action, expected=expected)

        def post(name, action, data, expected=200):
            return request(actors[name], action, data, tokens[name], expected)

        try:
            actors['owner'] = client()
            for _ in range(80):
                try:
                    get('owner', 'session')
                    break
                except urllib.error.URLError:
                    time.sleep(.05)
            else:
                raise RuntimeError('Disposable PHP server did not start')
            for name in ['owner', 'rival', 'outsider']:
                actors.setdefault(name, client())
                tokens[name] = request(actors[name], 'register', {
                    'username': 'adapter_fixture_' + name,
                    'password': 'Synthetic-adapter-only-123', 'adult': True
                }, get(name, 'session')['csrf'])['csrf']
                profiles[name] = post(name, 'create-profile', {'nickname': 'Synthetic ' + name})['id']
                get(name, 'hub&profile=' + str(profiles[name]))
            database = sqlite3.connect(Path(temporary, 'data', 'wordyland.sqlite'))
            database.row_factory = sqlite3.Row

            def rows(sql, parameters=()):
                return [dict(row) for row in database.execute(sql, parameters)]

            def scalar(sql, parameters=()):
                return database.execute(sql, parameters).fetchone()[0]

            def state(name='owner'):
                return get(name, 'class-program-state&profile=' + str(profiles[name]))

            def select(club, name='owner'):
                return post(name, 'class-program-context', {'profile': profiles[name], 'club': club})

            def publish(club, unit, title):
                old = get('owner', 'class-program-manage&club=' + str(club))['program']
                program = post('owner', 'class-program-save', {
                    'club': club, 'schoolYear': '2026/2027', 'title': title,
                    'teacherLabel': 'Synthetic teacher', 'method': 'Reviewed fixture only', 'examGoal': '',
                    'units': [{'id': unit, 'status': 'active'}],
                    'expectedRevision': old['editVersion'] if old else 0})['program']
                post('owner', 'class-program-publish', {'program': program['id'],
                    'expectedRevision': program['editVersion'], 'confirmed': True})
                return select(club)['expected']

            def material(club, title, words):
                return post('owner', 'class-program-material-save', {'club': club,
                    'title': title, 'words': words, 'confirmed': True})['unit']['id']

            def quest(expected, category='program', activity='kart', **extra):
                return post('owner', 'quest-start', {'profile': profiles['owner'],
                    'activity': activity, 'category': category, **expected, **extra})

            def quest_plan(token):
                return json.loads(scalar('SELECT questions FROM quests WHERE token=?', (token,)))

            def assert_words(plan, approved):
                assert plan and {q['word'] for q in plan} <= approved
                for question in plan:
                    for option in question.get('options', []):
                        assert (option[0] if isinstance(option, list) else option) in approved

            # Existing unbound sessions remain historical and are never backfilled.
            legacy = quest({}, 'body')
            legacy_plan = quest_plan(legacy['token'])
            assert 'program' not in legacy
            first = post('owner', 'club-create', {'profile': profiles['owner'],
                'name': 'Synthetic adapter A', 'consent': True})
            second = post('owner', 'club-create', {'profile': profiles['owner'],
                'name': 'Synthetic adapter B', 'consent': True})
            foreign = post('outsider', 'club-create', {'profile': profiles['outsider'],
                'name': 'Unrelated adapter class', 'consent': True})
            for club in [first, second]:
                post('rival', 'club-join', {'profile': profiles['rival'], 'code': club['code'], 'consent': True})
            words_a = [['pencil', 'matita', '✏️'], ['pen', 'penna', '🖊️'], ['book', 'libro', '📘']]
            curriculum = json.loads(Path(public, 'curriculum.json').read_text())
            words_b = [row[:3] for row in curriculum['counting'][:3] + curriculum['conversation'][:3]]
            approved_a, approved_b = {w[0] for w in words_a}, {w[0] for w in words_b}
            unit_a = material(first['id'], 'Three reviewed school words', words_a)
            for hostile_icon in ['<img src=x onerror=alert(1)>', '<svg/onload=alert(1)>', '📘\n<script>']:
                post('owner', 'class-program-material-save', {'club': first['id'],
                    'title': 'Rejected markup icon fixture', 'words': [['fixtureword', 'parola sintetica', hostile_icon]],
                    'confirmed': True}, 400)
            expected_a = publish(first['id'], unit_a, 'School fixture A')
            unit_b = material(second['id'], 'Reviewed count and dialogue', words_b)
            expected_b = publish(second['id'], unit_b, 'Count fixture B')
            select(first['id'])
            select(first['id'], 'rival')
            assert scalar('SELECT COUNT(*) FROM class_program_sessions') == 0
            resumed_legacy = get('owner', f"quest-resume&profile={profiles['owner']}&token={legacy['token']}")
            assert 'program' not in resumed_legacy and quest_plan(legacy['token']) == legacy_plan
            checks.append('no retroactive attribution or mutation of legacy sessions')

            for expected in [{}, {**expected_a, 'programClass': foreign['id']},
                             {**expected_a, 'programRevision': expected_a['programRevision'] + 999}]:
                post('owner', 'quest-start', {'profile': profiles['owner'], 'category': 'program', **expected}, 409)
                post('owner', 'holiday-start', {'profile': profiles['owner'], 'event': 'christmas', **expected}, 409)
                post('owner', 'duel-create', {'profile': profiles['owner'], 'opponent': profiles['rival'],
                    'category': 'program', **expected}, 403 if expected.get('programClass') == foreign['id'] else 409)
            get('outsider', f"quest-resume&profile={profiles['owner']}&token={legacy['token']}", 404)
            started = quest(expected_a, 'animals')  # A graphical world may use only the reviewed class words.
            assert_words(quest_plan(started['token']), approved_a)
            assert quest(expected_a, 'animals')['token'] == started['token']
            assert started['program']['club'] == first['id']
            post('owner', 'study-save', {'profile': profiles['owner'], 'title': 'Unassigned personal sheet',
                'words': [['tiger', 'tigre']], 'confirmed': True})
            study = scalar('SELECT id FROM studies WHERE profile_id=?', (profiles['owner'],))
            quest_count = scalar('SELECT COUNT(*) FROM quests')
            for source in [{'study': study}, {'category': 'personal'}]:
                post('owner', 'quest-start', {'profile': profiles['owner'], **expected_a, **source}, 409)
            assert scalar('SELECT COUNT(*) FROM quests') == quest_count
            checks.append('missing/foreign/stale context denied; only approved responses and distractors; incompatible studies never fall back')

            payload = {'profile': profiles['owner'], 'token': started['token'], 'step': 0}
            post('owner', 'quest-answer', {**payload, 'answer': 'synthetic wrong answer'})
            post('owner', 'quest-hint', payload)
            record = rows('SELECT * FROM class_program_steps WHERE token=?', (started['token'],))[0]
            assert record['errors'] == 1 and record['completed'] == 0
            before = rows('SELECT step,questions,xp FROM quests WHERE token=?', (started['token'],))[0]
            balance = rows('SELECT xp,coins FROM wallets WHERE profile_id=?', (profiles['owner'],))[0]
            # An injected ledger failure must roll back the game update and rewards too.
            database.execute("CREATE TRIGGER fixture_ledger_failure BEFORE UPDATE ON class_program_steps BEGIN SELECT RAISE(ABORT,'synthetic ledger failure'); END")
            database.commit()
            answer = quest_plan(started['token'])[0]['answer']
            post('owner', 'quest-answer', {**payload, 'answer': answer}, 503)
            assert rows('SELECT step,questions,xp FROM quests WHERE token=?', (started['token'],))[0] == before
            assert rows('SELECT xp,coins FROM wallets WHERE profile_id=?', (profiles['owner'],))[0] == balance
            database.execute('DROP TRIGGER fixture_ledger_failure')
            database.commit()
            post('owner', 'quest-answer', {**payload, 'answer': answer})
            record = rows('SELECT * FROM class_program_steps WHERE token=?', (started['token'],))[0]
            assert record['completed'] == record['correct'] == record['helped'] == record['errors'] == 1
            post('owner', 'quest-answer', {**payload, 'answer': answer}, 409)
            assert scalar('SELECT COUNT(*) FROM class_program_steps WHERE token=?', (started['token'],)) == 1
            assert 'synthetic wrong answer' not in json.dumps(record)
            assert not {'answer', 'raw_answer', 'response'} & set(record)
            checks.append('wrong/helped/correct evidence, retry idempotence and injected-failure atomic rollback; no raw answers')

            # The same children can study another programme without sharing its plans.
            select(second['id'])
            counts = quest(expected_b, 'counting')
            count_plan = quest_plan(counts['token'])
            assert count_plan[0]['kind'] == 'count'
            assert_words(count_plan, approved_b)
            assert len(count_plan[0]['options']) >= 2
            dialogue = quest(expected_b, 'conversation', 'football')
            assert quest_plan(dialogue['token'])[0]['kind'] == 'dialogue'
            assert_words(quest_plan(dialogue['token']), approved_b)
            post('owner', 'quest-start', {'profile': profiles['owner'], 'category': 'program', **expected_a}, 409)
            select(first['id'])
            revised_a = publish(first['id'], unit_a, 'School fixture A revision two')
            assert revised_a['programRevision'] != expected_a['programRevision']
            post('owner', 'quest-start', {'profile': profiles['owner'], 'category': 'program', **expected_a}, 409)
            historical = get('owner', f"quest-resume&profile={profiles['owner']}&token={started['token']}")
            assert historical['program']['historical'] and quest_plan(started['token'])[0]['word'] in approved_a
            assert quest(revised_a, 'animals')['token'] != started['token']
            checks.append('count/dialogue options cannot generate unassigned phrases; new revision allocates a new token and preserves explicit historical resume')

            holiday = post('owner', 'holiday-start', {'profile': profiles['owner'],
                'event': 'christmas', **revised_a})['session']
            frozen = scalar('SELECT plan FROM holiday_days WHERE token=?', (holiday['token'],))
            assert {q['word'] for q in json.loads(frozen)} <= approved_a
            assert post('owner', 'holiday-start', {'profile': profiles['owner'],
                'event': 'christmas', **revised_a})['session']['token'] == holiday['token']
            for question in json.loads(frozen):
                allowed = {w[1] for w in words_a} if question['mode'] == 'meaning' else approved_a
                if question['mode'] in ['meaning', 'word']:
                    assert set(question['options']) <= allowed
            select(second['id'])
            wallet_before = get('owner', f"hub&profile={profiles['owner']}")['wallet']
            post('owner', 'holiday-start', {'profile': profiles['owner'], 'event': 'christmas', **expected_b}, 409)
            assert scalar('SELECT COUNT(*) FROM holiday_days WHERE profile_id=?', (profiles['owner'],)) == 1
            assert scalar('SELECT COUNT(*) FROM holiday_rounds WHERE profile_id=?', (profiles['owner'],)) == 0
            assert get('owner', f"hub&profile={profiles['owner']}")['wallet'] == wallet_before
            holiday_state = get('owner', f"holiday-state&profile={profiles['owner']}")
            current = next(e for e in holiday_state['events'] if e['id'] == 'christmas')['session']
            assert current['token'] == holiday['token'] and current['program']['club'] == first['id']
            q = json.loads(frozen)[0]
            holiday_payload = {'profile': profiles['owner'], 'token': holiday['token'], 'step': 0}
            post('owner', 'holiday-answer', {**holiday_payload, 'attempt': secrets.token_hex(16), 'answer': 'wrong'})
            post('owner', 'holiday-hint', holiday_payload)
            attempt = {**holiday_payload, 'attempt': secrets.token_hex(16), 'answer': q['answer']}
            post('owner', 'holiday-answer', attempt)
            assert post('owner', 'holiday-answer', attempt)['replayed']
            evidence = rows('SELECT * FROM class_program_steps WHERE token=?', (holiday['token'],))[0]
            assert evidence['completed'] == evidence['helped'] == evidence['errors'] == 1
            journey = post('owner', 'journey-start', {'profile': profiles['owner'], **expected_b})['session']
            journey_plan = json.loads(scalar('SELECT plan FROM holiday_days WHERE token=?', (journey['token'],)))
            assert {q['word'] for q in journey_plan} <= approved_b
            assert journey['program']['club'] == second['id']
            checks.append('holiday cross-context pending is explicit without new daily rows/rewards; frozen resume, replay, hints and journey vocabulary are scoped')

            # Exact frozen membership, not any remaining common class, controls duels.
            select(first['id'])
            select(second['id'], 'rival')  # Challenger's explicit shared class wins over rival's active menu.
            create = {'profile': profiles['owner'], 'opponent': profiles['rival'],
                'category': 'program', 'activity': 'space', **revised_a}
            duel = post('owner', 'duel-create', create)['duel']
            assert post('owner', 'duel-create', create)['duel']['id'] == duel['id']
            plan = json.loads(scalar('SELECT questions FROM duels WHERE id=?', (duel['id'],)))
            assert {q['answer'] for q in plan} <= approved_a
            assert all(set(q['options']) <= approved_a for q in plan)
            bindings = rows('SELECT profile_id,club_id,revision_id FROM class_program_sessions WHERE kind="duel" AND token=?', (duel['id'],))
            assert {row['profile_id'] for row in bindings} == {profiles['owner'], profiles['rival']}
            assert {(row['club_id'], row['revision_id']) for row in bindings} == {(first['id'], revised_a['programRevision'])}
            post('owner', 'club-join', {'profile': profiles['owner'], 'code': foreign['code'], 'consent': True})
            filler_profiles = []
            outsider_account = scalar('SELECT account_id FROM profiles WHERE id=?', (profiles['outsider'],))
            for index in range(106):
                cursor = database.execute('INSERT INTO profiles(account_id,nickname,state) VALUES(?,?,?)',
                    (outsider_account, f'AAA synthetic menu fixture {index:03d}', '{}'))
                filler_profiles.append(cursor.lastrowid)
                database.execute('INSERT INTO club_profiles(club_id,profile_id) VALUES(?,?)',
                    (second['id'] if index < 53 else foreign['id'], cursor.lastrowid))
            database.commit()
            menu = get('owner', f"arena&profile={profiles['owner']}")
            assert {opponent['id'] for opponent in menu['opponents']} == {profiles['rival']}
            for filler in filler_profiles:
                database.execute('DELETE FROM club_profiles WHERE profile_id=?', (filler,))
                database.execute('DELETE FROM profiles WHERE id=?', (filler,))
            database.commit()
            post('owner', 'club-leave', {'profile': profiles['owner'], 'club': foreign['id']})
            # Newer inaccessible rows must not consume the menu's SQL LIMIT.
            account = scalar('SELECT account_id FROM profiles WHERE id=?', (profiles['owner'],))
            rival_account = scalar('SELECT account_id FROM profiles WHERE id=?', (profiles['rival'],))
            program_b = state('rival')['active']['program']
            clone_tokens = [f'{900000 + i:032x}' for i in range(45)]
            for token in clone_tokens:
                database.execute('INSERT INTO quests(token,profile_id,questions,created_at,activity,source) VALUES(?,?,?,?,?,?)',
                    (token, profiles['owner'], json.dumps(count_plan), int(time.time()) + 100, 'kart', 'program'))
                database.execute('INSERT INTO duels(id,challenger,opponent,category,questions,state,created_at,expires_at,activity) VALUES(?,?,?,?,?,?,?,?,?)',
                    (token, profiles['owner'], profiles['rival'], 'program', json.dumps(plan), 'active', int(time.time()) + 100, int(time.time()) + 604800, 'kart'))
                for who, owner in [(profiles['owner'], account), (profiles['rival'], rival_account)]:
                    database.execute('INSERT INTO duel_players(duel,profile) VALUES(?,?)', (token, who))
                    database.execute('INSERT INTO class_program_sessions(kind,token,profile_id,learner_account_id,club_id,program_id,revision_id,created_at) VALUES(?,?,?,?,?,?,?,?)',
                        ('duel', token, who, owner, second['id'], program_b, expected_b['programRevision'], int(time.time())))
                database.execute('INSERT INTO class_program_sessions(kind,token,profile_id,learner_account_id,club_id,program_id,revision_id,created_at) VALUES(?,?,?,?,?,?,?,?)',
                    ('quest', token, profiles['owner'], account, second['id'], program_b, expected_b['programRevision'], int(time.time())))
            database.commit()
            post('owner', 'club-leave', {'profile': profiles['owner'], 'club': second['id']})
            assert started['token'] in {q['token'] for q in get('owner', f"pending-games&profile={profiles['owner']}")['quests']}
            assert duel['id'] in {d['id'] for d in get('owner', f"arena&profile={profiles['owner']}")['duels']}
            for token in clone_tokens:
                database.execute('DELETE FROM class_program_sessions WHERE token=?', (token,))
                database.execute('DELETE FROM duel_players WHERE duel=?', (token,))
                database.execute('DELETE FROM duels WHERE id=?', (token,))
                database.execute('DELETE FROM quests WHERE token=?', (token,))
            database.commit()
            post('owner', 'club-join', {'profile': profiles['owner'], 'code': second['code'], 'consent': True})
            get('outsider', f"duel&profile={profiles['outsider']}&duel={duel['id']}", 404)
            post('outsider', 'duel-answer', {'profile': profiles['outsider'], 'duel': duel['id'], 'step': 0, 'answer': 0}, 404)
            post('rival', 'club-leave', {'profile': profiles['rival'], 'club': first['id']})
            assert scalar('SELECT COUNT(*) FROM club_profiles WHERE club_id=? AND profile_id IN (?,?)',
                          (second['id'], profiles['owner'], profiles['rival'])) == 2
            post('rival', 'duel-accept', {'profile': profiles['rival'], 'duel': duel['id']}, 403)
            get('owner', f"duel&profile={profiles['owner']}&duel={duel['id']}", 403)
            assert duel['id'] not in {d['id'] for d in get('owner', f"arena&profile={profiles['owner']}")['duels']}
            assert get('rival', f"pending-games&profile={profiles['rival']}")['incomingInvites'] == 0
            post('rival', 'club-join', {'profile': profiles['rival'], 'code': first['code'], 'consent': True})
            post('rival', 'duel-accept', {'profile': profiles['rival'], 'duel': duel['id']})
            option = plan[0]['options'].index(plan[0]['answer'])
            answer_payload = {'profile': profiles['owner'], 'duel': duel['id'], 'step': 0, 'answer': option}
            post('owner', 'duel-answer', answer_payload)
            post('owner', 'duel-answer', answer_payload, 409)
            assert scalar('SELECT COUNT(*) FROM class_program_steps WHERE token=?', (duel['id'],)) == 1
            post('rival', 'club-leave', {'profile': profiles['rival'], 'club': first['id']})
            post('owner', 'duel-answer', {**answer_payload, 'step': 1}, 403)
            assert scalar('SELECT step FROM duel_players WHERE duel=? AND profile=?', (duel['id'], profiles['owner'])) == 1
            assert duel['id'] not in {d['id'] for d in get('owner', f"pending-games&profile={profiles['owner']}")['duels']}
            assert scalar('SELECT COUNT(*) FROM class_program_sessions WHERE token=?', (legacy['token'],)) == 0
            checks.append('both duel bindings are exact and frozen; another common class cannot authorize read/accept/answer or pending lists; IDOR and replay denied')

            # All five pranks stay available, but never teach unassigned words.
            select(first['id'])
            for day, identifier in zip(range(8, 13), ['packages', 'letter', 'sign', 'moustache', 'colors']):
                clock.write_text(f'2026-12-{day:02d} 12:00:00')
                event = next(e for e in get('owner', f"holiday-state&profile={profiles['owner']}")['events'] if e['id'] == 'christmas')
                prank = event['elf']['prank']
                assert event['elf']['active'] and prank['id'] == identifier and prank['scoped']
                assert prank['model'].lower() in approved_a
                if prank['mode'] == 'build':
                    assert sorted(prank['tiles']) == sorted(prank['model'])
                if prank['mode'] == 'letter':
                    assert prank['answer'] in prank['options']
                    assert set(prank['options']) <= set(''.join(approved_a).upper())
                    assert prank['mask'].replace('_', prank['answer'], 1) == prank['model']
                assert 'CAT' not in prank['story'] and 'SNOWMAN' not in prank['model']

            grammar_class = post('owner', 'club-create', {'profile': profiles['owner'],
                'name': 'Synthetic worksheet class', 'consent': True})
            grammar_program = post('owner', 'class-program-save', {'club': grammar_class['id'],
                'schoolYear': '2026/2027', 'title': 'Only the supplied toy questions',
                'teacherLabel': 'Synthetic teacher', 'method': '', 'examGoal': '',
                'units': [{'id': 'toys-yes-no', 'status': 'active'}], 'expectedRevision': 0})['program']
            assert select(grammar_class['id'])['mode'] == 'blocked'
            for day in range(8, 13):
                clock.write_text(f'2026-12-{day:02d} 12:00:00')
                prank = next(e for e in get('owner', f"holiday-state&profile={profiles['owner']}")['events'] if e['id'] == 'christmas')['elf']['prank']
                assert prank['scoped'] and not any(character.isalpha() for character in prank['model'])
            post('owner', 'class-program-publish', {'program': grammar_program['id'],
                'expectedRevision': grammar_program['editVersion'], 'confirmed': True})
            grammar_expected = state()['expected']
            content = json.loads(Path(public, 'training.json').read_text())['grammarLessons']
            cases = next(pack['cases'] for pack in content['packs'] if pack['id'] == 'toys-yes-no')
            approved_cases = {case['id'] for case in cases}
            assert len(approved_cases) == 5
            for expectation in [{}, expected_a, {**grammar_expected, 'programRevision': 999999}]:
                post('owner', 'training-start', {'profile': profiles['owner'], 'track': 'grammar',
                    'pack': 'toys-yes-no', **expectation}, 409)
            wallet_before = rows('SELECT * FROM wallets WHERE profile_id=?', (profiles['owner'],))[0]
            reward_before = scalar('SELECT COUNT(*) FROM rewards WHERE profile_id=?', (profiles['owner'],))
            training = post('owner', 'training-start', {'profile': profiles['owner'], 'track': 'grammar',
                'pack': 'toys-yes-no', **grammar_expected})['session']
            grammar_plan = json.loads(scalar('SELECT plan FROM training_worksheet_sessions WHERE token=?', (training['token'],)))
            assert len(grammar_plan) == 9 and {q['item'][8:] for q in grammar_plan} <= approved_cases
            assert [q['grammar']['phase'] for q in grammar_plan] == ['model', 'short-answer', 'short-write'] * 3
            assert [q['mode'] for q in grammar_plan] == ['grammar-model', 'grammar-choice', 'grammar-write'] * 3
            get('outsider', f"training-state&profile={profiles['outsider']}&token={training['token']}", 404)

            def training_answer(session, answer=None, attempt=None):
                return {'profile': profiles['owner'], 'token': session['token'], 'step': session['step'],
                    'attempt': attempt or secrets.token_hex(16),
                    'answer': session['question']['answer'] if answer is None else answer}

            current = post('owner', 'training-answer', training_answer(training))['session']
            model = rows('SELECT * FROM class_program_steps WHERE token=? AND step=0', (training['token'],))[0]
            assert model['model'] == model['helped'] == model['completed'] == 1
            wrong = training_answer(current, 'synthetic incorrect short answer')
            post('owner', 'training-answer', wrong)
            assert post('owner', 'training-answer', wrong)['replayed']
            assert scalar('SELECT errors FROM training_worksheet_sessions WHERE token=?', (training['token'],)) == 1
            post('owner', 'training-hint', {'profile': profiles['owner'], 'token': current['token'], 'step': current['step'], 'level': 2})
            paused = get('owner', f"training-state&profile={profiles['owner']}&token={current['token']}")['session']
            assert paused['hint'] == 2 and paused['helped']
            current = post('owner', 'training-answer', training_answer(paused))['session']
            guided = rows('SELECT * FROM class_program_steps WHERE token=? AND step=1', (training['token'],))[0]
            assert guided['model'] == 0 and guided['completed'] == guided['helped'] == guided['errors'] == 1
            while not current['done']:
                current = post('owner', 'training-answer', training_answer(current))['session']
            assert scalar('SELECT COUNT(*) FROM class_program_steps WHERE token=?', (training['token'],)) == 9
            before_denied = scalar('SELECT COUNT(*) FROM class_program_sessions')
            denied_paths = [({'track': 'letters', 'block': 'ae'}, 'training-start'),
                            ({'track': 'sentences'}, 'training-start'),
                            ({'track': 'instructions'}, 'training-start'),
                            ({'lesson': 's'}, 'phonics-start')]
            for data, action in denied_paths:
                post('owner', action, {'profile': profiles['owner'], **grammar_expected, **data}, (400, 409))
            assert scalar('SELECT COUNT(*) FROM class_program_sessions') == before_denied
            assert rows('SELECT * FROM wallets WHERE profile_id=?', (profiles['owner'],))[0] == wallet_before
            assert scalar('SELECT COUNT(*) FROM rewards WHERE profile_id=?', (profiles['owner'],)) == reward_before
            checks.append('all five elf pranks retain identity with approved words or neutral draft toys; worksheet grammar is scoped, models/guided evidence persist and unassigned training/phonics never fall back or alter economy')

            # The deployment copies arena before api/platform. It must be self-contained
            # in that brief window, with the new module already installed first.
            select(second['id'])
            for filename in ['api.php', 'platform.php']:
                previous = subprocess.check_output(['git', 'show',
                    '7f03b579c14e647191779df685b6de4c45bd3beb:dist/' + filename])
                (public / filename).write_bytes(previous)
            hybrid_arena = get('owner', f"arena&profile={profiles['owner']}")
            assert profiles['rival'] in {opponent['id'] for opponent in hybrid_arena['opponents']}
            hybrid_duel = post('owner', 'duel-create', {'profile': profiles['owner'],
                'opponent': profiles['rival'], 'category': 'program', **expected_b})['duel']
            assert hybrid_duel['program']['club'] == second['id']
            hybrid_plan = json.loads(scalar('SELECT questions FROM duels WHERE id=?', (hybrid_duel['id'],)))
            assert {q['answer'] for q in hybrid_plan} <= approved_b
            assert get('owner', f"duel&profile={profiles['owner']}&duel={hybrid_duel['id']}")['duel']['id'] == hybrid_duel['id']
            checks.append('mixed deployment with old api/platform and new arena/module can list, create and resume an exactly scoped duel')
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
