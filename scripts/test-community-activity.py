"""Real synthetic answers count in the roster; feedback matches native UTF-16 limits.

Disposable copied public files, local-only HTTP and a private SQLite fixture.
No hosting access, pupil data, credentials, mail or public account mutations.
"""
from pathlib import Path
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
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
checks = []


def passed(label):
    checks.append(label)
    print('PASS ' + label, flush=True)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise AssertionError('Local fixture must not redirect')


def client():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                                      urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


with tempfile.TemporaryDirectory(prefix='wordyland-community-activity-') as temporary:
    fixture = Path(temporary)
    public = fixture / 'public'
    shutil.copytree(ROOT / 'dist', public)
    clock = fixture / 'clock'
    clock.write_text('2026-11-03 12:00:00')
    sessions = fixture / 'sessions'
    sessions.mkdir()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    log = (fixture / 'server.log').open('w+')
    php = shlex.split(os.environ.get('PHP_COMMAND', 'php'))
    server = subprocess.Popen(php + ['-d', 'session.save_path=' + str(sessions), '-S',
                                    '127.0.0.1:' + str(port), '-t', str(public)],
                              env=dict(os.environ, WORDYLAND_TEST='1', WORDYLAND_TEST_CLOCK_FILE=str(clock),
                                       WORDYLAND_DATA_DIR=str(fixture / 'data')), stdout=log, stderr=log)
    database = None

    def request(person, action, body=None, csrf='', status=200):
        url = 'http://127.0.0.1:' + str(port) + '/api.php?action=' + action
        assert urllib.parse.urlparse(url).hostname == '127.0.0.1'
        req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(),
                                     headers={'Content-Type': 'application/json', 'X-CSRF-Token': csrf})
        try:
            response = person.open(req, timeout=8)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            data = json.loads(response.read())
            assert response.status == status, (action.split('&')[0], response.status, status, data.get('error'))
            return data

    try:
        admin, player, outsider, feedback, anonymous = [client() for _ in range(5)]
        for attempt in range(100):
            assert server.poll() is None, 'Local PHP stopped'
            try:
                request(anonymous, 'session')
                break
            except urllib.error.URLError:
                time.sleep(.03)
        else:
            raise AssertionError('Local PHP did not start')

        def register(person, name):
            csrf = request(person, 'session')['csrf']
            csrf = request(person, 'register', {'username': name, 'password': 'Community-activity-synthetic-123',
                                               'adult': True}, csrf)['csrf']
            profile = request(person, 'create-profile', {'nickname': name}, csrf)['id']
            return profile, csrf

        admin_id, ta = register(admin, 'activity_admin')
        idle, tp = register(player, 'activity_player')
        outsider_id, to = register(outsider, 'activity_outside')
        feedback_id, tf = register(feedback, 'activity_feedback')
        database = sqlite3.connect(fixture / 'data/wordyland.sqlite')
        database.row_factory = sqlite3.Row
        database.execute('UPDATE accounts SET role="admin" WHERE id=(SELECT account_id FROM profiles WHERE id=?)', (admin_id,))
        database.commit()

        def roster(filter='all', person=admin, scope='all', offset=0):
            return request(person, 'roster&scope=' + scope + '&filter=' + filter + '&offset=' + str(offset))

        def answered_profiles():
            return {row['id'] for row in roster('played')['items']}

        def profile(name):
            return request(player, 'create-profile', {'nickname': name}, tp)['id']

        assert roster('played')['total'] == 0
        assert roster()['counts']['played'] == 0
        assert database.execute("SELECT COUNT(*) FROM sqlite_master WHERE name IN ('holiday_days','training_items','phonics_practice')").fetchone()[0] == 0
        passed('fresh optional tables absent: registered/start-only profiles are not counted and roster works')

        holiday = profile('Holiday only')
        models = profile('Models and hints only')
        training = profile('Training only')
        holiday_wrong = profile('Holiday wrong answer')
        round_only = profile('Round only')
        phonics = profile('Phonics only')
        training_wrong = profile('Training wrong answer')

        def holiday_start(pid, after=None):
            body = {'profile': pid, 'event': 'christmas'}
            if after:
                body.update(another=True, after=after['token'])
            return request(player, 'holiday-start', body, tp)['session']

        def holiday_answer(pid, session, wrong=False):
            row = database.execute('SELECT plan FROM holiday_days WHERE token=? UNION ALL SELECT plan FROM holiday_rounds WHERE token=?',
                                   (session['token'], session['token'])).fetchone()
            question = json.loads(row['plan'])[session['step']]
            return request(player, 'holiday-answer', {'profile': pid, 'token': session['token'], 'step': session['step'],
                                                      'attempt': secrets.token_hex(16), 'answer': 'wrong' if wrong else question['answer']}, tp)

        pending = holiday_start(models)
        request(player, 'holiday-hint', {'profile': models, 'token': pending['token'], 'step': 0}, tp)
        assert answered_profiles() == set()
        session = holiday_start(holiday)
        while not session['done']:
            response = holiday_answer(holiday, session)
            assert response['correct']
            session = response['session']
        assert answered_profiles() == {holiday}
        assert next(row for row in roster()['items'] if row['id'] == holiday)['has_server_activity'] == 1
        assert roster()['counts']['online'] == 0
        wrong = holiday_answer(holiday_wrong, holiday_start(holiday_wrong), wrong=True)
        assert wrong['correct'] is False and wrong['session']['step'] == 0
        assert answered_profiles() == {holiday, holiday_wrong}
        passed('saved festive answers count, including an incorrect answer; hints/start do not imply play or presence')

        session = holiday_start(round_only)
        while not session['done']:
            session = holiday_answer(round_only, session)['session']
        additional = holiday_start(round_only, session)
        assert additional['round'] == 2
        additional = holiday_answer(round_only, additional)['session']
        assert additional['step'] == 1
        # Remove only this synthetic daily row to prove round history is independently queried.
        database.execute('DELETE FROM holiday_days WHERE profile_id=?', (round_only,))
        database.commit()
        assert round_only in answered_profiles()
        passed('a confirmed additional-round answer is independently detected without a daily record')

        def training_start(pid):
            return request(player, 'training-start', {'profile': pid, 'track': 'letters', 'block': 'ae'}, tp)['session']

        def training_answer(pid, session, wrong=False):
            return request(player, 'training-answer', {'profile': pid, 'token': session['token'], 'step': session['step'],
                                                       'attempt': secrets.token_hex(16), 'answer': 'wrong' if wrong else session['question']['answer']}, tp)

        for pid in [models, training, training_wrong]:
            state = training_start(pid)
            assert state['question']['mode'] == 'model'
            request(player, 'training-hint', {'profile': pid, 'token': state['token'], 'step': 0}, tp)
            assert pid not in answered_profiles()
            state = training_answer(pid, state)['session']
            assert state['question']['mode'] == 'letter' and pid not in answered_profiles()
            if pid == models:
                continue
            result = training_answer(pid, state, wrong=pid == training_wrong)
            assert result['correct'] == (pid == training)
            assert pid in answered_profiles()
        passed('training counts meaningful correct or incorrect answers; model confirmations and hints remain excluded')

        state = request(player, 'phonics-start', {'profile': phonics, 'lesson': 's'}, tp)['session']
        assert state['question']['kind'] == 'model'
        for index in range(2):
            result = request(player, 'phonics-answer', {'profile': phonics, 'token': state['token'], 'step': state['step'],
                                                       'attempt': secrets.token_hex(16), 'answer': state['question']['answer']}, tp)
            state = result['session']
            if index == 0:
                assert phonics not in answered_profiles()
        assert phonics in answered_profiles()
        expected = {holiday, holiday_wrong, round_only, training, training_wrong, phonics}
        assert answered_profiles() == expected and models not in expected and idle not in expected
        passed('guided phonics counts answers but not the initial model; complete activity set has no duplicate profiles')

        request(player, 'presence-heartbeat', {'profile': idle, 'tab': '1' * 32, 'state': 'ready'}, tp)
        assert roster('online')['total'] == 1 and roster('online')['items'][0]['id'] == idle
        assert roster()['counts']['ready'] == 1 and idle not in answered_profiles()
        request(outsider, 'roster&scope=all&filter=played', status=403)
        request(player, 'roster&scope=class&filter=played', status=403)
        request(anonymous, 'roster&scope=all&filter=played', status=401)
        own = roster(person=player, scope='class')
        assert outsider_id not in {row['id'] for row in own['items']}
        assert 'played' not in own['counts'] and all('has_server_activity' not in row and 'username' not in row for row in own['items'])
        passed('online/ready and played filters remain separate; admin-only activity and cross-account privacy preserved')

        # Standard fixture seeding tests pagination, not a claim about actual pupil history.
        owner_id = database.execute('SELECT account_id FROM profiles WHERE id=?', (idle,)).fetchone()[0]
        for index in range(25):
            pid = database.execute('INSERT INTO profiles(account_id,nickname,state) VALUES (?,?,?)',
                                   (owner_id, 'Pagination ' + str(index).zfill(2), '{}')).lastrowid
            database.execute('INSERT INTO training_items(profile_id,item,skill,completed) VALUES (?,?,?,1)',
                             (pid, 'letter:A', 'letter-reading.letter'))
        database.commit()
        first, second = roster('played'), roster('played', offset=20)
        assert first['total'] == second['total'] == len(expected) + 25
        assert len(first['items']) == 20 and len(second['items']) == len(expected) + 5
        assert {row['id'] for row in first['items']}.isdisjoint({row['id'] for row in second['items']})
        assert first['counts']['played'] == first['total']
        before = {table: [tuple(row) for row in database.execute('SELECT * FROM ' + table + ' ORDER BY 1')]
                  for table in ['accounts', 'wallets', 'inventory', 'practice', 'practice_outcomes', 'rewards', 'training_items', 'holiday_days', 'holiday_rounds']}
        roster('played')
        roster('all')
        after = {table: [tuple(row) for row in database.execute('SELECT * FROM ' + table + ' ORDER BY 1')] for table in before}
        assert after == before
        passed('played counts and pagination agree across 31 profiles; roster reads preserve wallets and progress')

        payload = {'kind': 'idea', 'title': 'Un nuovo gioco', 'body': 'Una descrizione chiara.', 'screen': 'lessons', 'profile': feedback_id}
        cases = [('ascii100', 'A' * 100), ('accent100', 'è' * 100), ('emoji50', '🚀' * 50),
                 ('combining100units', 'e\u0301' * 50), ('surrogateMinimum', '🚀🚀')]
        for label, title in cases:
            ident = request(feedback, 'feedback-create', {**payload, 'title': title}, tf)['id']
            assert any(row['id'] == ident and row['title'] == title for row in request(feedback, 'feedback-list')['items'])
        for title in ['A' * 101, 'è' * 101, '🚀' * 51, 'AB']:
            response = request(feedback, 'feedback-create', {**payload, 'title': title}, tf, 400)
            assert 'titolo' in response['error'].lower()
        for body in ['à' * 2000, '🚀' * 1000, '🚀🚀🚀']:
            request(feedback, 'feedback-create', {**payload, 'body': body}, tf)
        for body in ['à' * 2001, '🚀' * 1001, 'quà', '🚀🚀']:
            response = request(feedback, 'feedback-create', {**payload, 'body': body}, tf, 400)
            assert 'descrizione' in response['error'].lower()
        response = request(feedback, 'feedback-create', {**payload, 'kind': 'unknown'}, tf, 400)
        assert 'problema' in response['error']
        response = request(feedback, 'feedback-create', {**payload, 'screen': '#private'}, tf, 400)
        assert 'dove' in response['error'].lower()
        request(outsider, 'feedback-create', payload, to, 404)
        assert request(outsider, 'feedback-list')['total'] == 0
        passed('UTF-16 title/body limits match HTML for accents, surrogate pairs and combining marks; field-specific rejection and ownership hold')
        print(json.dumps({'status': 'passed', 'checks': checks, 'real_data': False, 'remote_requests': 0}, ensure_ascii=False))
    finally:
        if database is not None:
            database.close()
        if server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
        log.close()
