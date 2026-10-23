"""Real API checks for island progress, cosmetic ownership and persisted duel modes."""
import http.cookiejar
import json
import os
import secrets
import shlex
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

with tempfile.TemporaryDirectory(prefix='wordyland-island-test-') as temporary:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    log = open(temporary + '/php.log', 'w+')
    environment = dict(os.environ, WORDYLAND_TEST='1', WORDYLAND_DATA_DIR=temporary + '/data')
    process = subprocess.Popen(shlex.split(os.environ.get('PHP_COMMAND', 'php')) + ['-d', 'session.save_path='+temporary, '-S', f'127.0.0.1:{port}', '-t', 'dist'], env=environment, stdout=log, stderr=log)
    base = f'http://127.0.0.1:{port}/api.php?action='

    def client():
        return urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(session, action, body=None, csrf='', expected=200):
        req = urllib.request.Request(base+action, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type':'application/json', 'X-CSRF-Token':csrf})
        try:
            response = session.open(req, timeout=5)
        except urllib.error.HTTPError as error:
            response = error
        result = response.read().decode()
        assert response.status == expected, (action, response.status, result)
        return json.loads(result)

    try:
        a, b = client(), client()
        for attempt in range(50):
            try:
                request(a, 'session')
                break
            except urllib.error.URLError:
                time.sleep(.05)
        def register(session, nickname):
            token = request(session, 'session')['csrf']
            token = request(session, 'register', {'username':'island_'+secrets.token_hex(5),'password':'Adventure-test-123','adult':True}, token)['csrf']
            return request(session, 'create-profile', {'nickname':nickname}, token)['id'], token
        pid, token = register(a, 'Luna')
        other, other_token = register(b, 'Nico')
        request(a, 'quest-start', {'profile':pid,'activity':'unknown'}, token, 400)
        request(a, 'quest-start', {'profile':pid,'activity':[]}, token, 400)
        request(b, 'quest-start', {'profile':pid,'activity':'kart'}, other_token, 404)
        activities = dict(treehouse='home', pets='animals', creative='colors', kart='transport', football='sport', space='space', ocean='ocean', dino='dino')
        curriculum = json.loads(Path('dist/curriculum.json').read_text())
        completed = {}
        for activity, category in activities.items():
            quest = request(a, 'quest-start', {'profile':pid,'category':category,'activity':activity}, token)
            q = quest['question']
            assert q['word'] in [w[0] for w in curriculum[category]]
            wrong = request(a, 'quest-answer', {'profile':pid,'token':quest['token'],'step':0,'answer':'definitely wrong','activity':'dino','coins':99999}, token)
            assert not wrong['correct']
            assert request(a, f'hub&profile={pid}')['adventures'] == completed
            while True:
                answer = q['word'][q['mask'].index('_')] if q['kind']=='missing' else q['word']
                payload = {'profile':pid,'token':quest['token'],'step':q['number']-1,'answer':answer,'activity':'dino','xp':999999}
                result = request(a, 'quest-answer', payload, token)
                assert result['correct']
                if result['done']:
                    request(a, 'quest-answer', payload, token, 409)
                    break
                q = result['question']
            completed[activity] = 1
            hub = request(a, f'hub&profile={pid}')
            assert hub['adventures'] == completed
            assert hub['wallet']['coins'] <= 60 and hub['wallet']['xp'] <= 150
        request(b, f'hub&profile={pid}', expected=404)
        assert request(b, f'hub&profile={other}')['adventures'] == {}
        for item, slot in [('pet-bunny','pet'),('room-peach','room'),('kart-pink','kart'),('paint-berry','palette')]:
            before = request(a, f'hub&profile={pid}')['wallet']['coins']
            result = request(a, 'buy', {'profile':pid,'item':item}, token)['wallet']
            assert result['coins']==before and result['equipped'][slot]==item
            repeated = request(a, 'buy', {'profile':pid,'item':item}, token)['wallet']
            assert repeated['inventory'].count(item)==1
        request(b, 'equip', {'profile':other,'item':'plant'}, other_token, 403)
        request(a, 'buy', {'profile':pid,'item':'plant'}, token)
        assert request(a, f'hub&profile={pid}')['wallet']['equipped']['plant']=='plant'
        club = request(a, 'club-create', {'profile':pid,'name':'Classe isola','consent':True}, token)
        request(b, 'club-join', {'profile':other,'code':club['code'],'consent':True}, other_token)
        request(a, 'duel-create', {'profile':pid,'opponent':other,'activity':'unknown'}, token, 400)
        for mode in ['kart','football','space']:
            duel = request(a, 'duel-create', {'profile':pid,'opponent':other,'category':{'kart':'transport','football':'sport','space':'space'}[mode],'activity':mode}, token)['duel']
            assert duel['activity']==mode
            accepted = request(b, 'duel-accept', {'profile':other,'duel':duel['id']}, other_token)
            assert accepted['duel']['activity']==mode
            assert request(a, f'duel&profile={pid}&duel={duel["id"]}')['duel']['activity']==mode
            # Finish with server-stored answers; no client-supplied score is trusted.
            with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
                questions = json.loads(db.execute('SELECT questions FROM duels WHERE id=?',(duel['id'],)).fetchone()[0])
            for session, player, csrf in [(a,pid,token),(b,other,other_token)]:
                for step,q in enumerate(questions):
                    result=request(session,'duel-answer',{'profile':player,'duel':duel['id'],'step':step,'answer':q['options'].index(q['answer']),'score':99999},csrf)
                assert result['duel']['score']==50
            assert result['duel']['state']=='completed' and result['duel']['rivalScore']==50
        # Simulate the previous schema and verify additive migration preserves rows.
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as db:
            for table in ['quests','rewards','duels']:
                db.execute(f'ALTER TABLE {table} DROP COLUMN activity')
        legacy = request(a, f'hub&profile={pid}')
        assert legacy['adventures']=={'classic':8}
        assert legacy['wallet']['equipped']['pet']=='pet-bunny'
        assert request(a, f'arena&profile={pid}')['duels'][0]['activity']=='kart'
        print('Adventure checks passed: eight verified paths, incorrect answers/replays cannot forge progress, daily caps, isolated ownership, free and earned cosmetics, all three persisted duel modes, and legacy migration.')
    finally:
        process.terminate()
        process.wait(timeout=5)
        log.close()
