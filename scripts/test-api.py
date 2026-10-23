"""Integration checks against a temporary PHP server and SQLite database."""
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import shlex
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

with tempfile.TemporaryDirectory(prefix="wordyland-test-") as temporary:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    command = shlex.split(os.environ.get("PHP_COMMAND", "php"))
    environment = dict(os.environ, WORDYLAND_TEST="1", WORDYLAND_DATA_DIR=temporary + "/data")
    log = open(temporary + "/php.log", "w+")
    process = subprocess.Popen(command + ["-d", "session.save_path=" + temporary, "-S", f"127.0.0.1:{port}", "-t", "dist"], env=environment, stdout=log, stderr=log)
    base = f"http://127.0.0.1:{port}/api.php?action="

    def client():
        return urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(session, action, data=None, token="", expected=200):
        req = urllib.request.Request(base + action, data=None if data is None else json.dumps(data).encode(), headers={"Content-Type": "application/json", "X-CSRF-Token": token})
        try:
            response = session.open(req, timeout=5)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read().decode()
        assert response.status == expected, (action, response.status, body)
        return json.loads(body)

    try:
        a, b = client(), client()
        for attempt in range(40):
            try:
                token = request(a, "session")["csrf"]
                break
            except urllib.error.URLError:
                time.sleep(0.05)
        else:
            raise RuntimeError("PHP server did not start")
        request(a, "register", {}, "bad-token", 403)
        username, password = "test_" + secrets.token_hex(5), "Local-test-password-123"
        registration = request(a, "register", dict(username=username, password=password, adult=True), token)
        token = registration["csrf"]
        recovery = registration["recovery"]
        profile = request(a, "create-profile", {"nickname": "Esploratore"}, token)
        assert profile["state"]["stats"] == {}
        payload = {"id": profile["id"], "revision": 0, "state": {"stats": {"cat": {"good": 3, "attempts": 4, "review": False}}, "stars": 2}}
        assert request(a, "save", payload, token)["revision"] == 1
        request(a, "save", payload, token, 409)
        tb = request(b, "session")["csrf"]
        tb = request(b, "register", dict(username="test_" + secrets.token_hex(5), password=password, adult=True), tb)["csrf"]
        request(b, "profile&id=" + str(profile["id"]), expected=404)
        request(b, "save", payload, tb, 404)
        request(a, "logout", {}, token)
        request(a, "profile&id=" + str(profile["id"]), expected=401)
        token = request(a, "session")["csrf"]
        token = request(a, "login", dict(username=username, password=password), token)["csrf"]
        assert request(a, "profile&id=" + str(profile["id"]))["state"]["stats"]["cat"]["good"] == 3
        for index in range(7):
            request(a, "create-profile", {"nickname": str(index)}, token)
        request(a, "create-profile", {"nickname": "oltre"}, token, 400)
        import sqlite3
        with sqlite3.connect(temporary + "/data/wordyland.sqlite") as database:
            stored = database.execute("SELECT password_hash FROM accounts WHERE username=?", (username,)).fetchone()[0]
            assert stored != password and password not in stored
        assert os.stat(temporary + "/data/wordyland.sqlite").st_mode & 0o077 == 0
        pid = profile['id']
        h = request(a, f'hub&profile={pid}')
        assert h['wallet']['coins'] == 0
        request(b, f'hub&profile={pid}', expected=404)
        request(a, 'buy', {'profile':pid, 'item':'dragon'}, token, 409)
        request(a, 'equip', {'profile':pid, 'item':'dragon'}, token, 403)
        study = {'profile':pid,'title':'Una scheda personale','confirmed':True,'words':[['cat','gatto','🐈'],['dog','cane','🐕'],['sun','sole','☀️']]}
        request(a, 'study-save', {**study,'confirmed':False}, token, 400)
        import base64
        png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6VmcAAAAASUVORK5CYII='
        request(a, 'study-save', {**study,'attachment':{'name':'scheda.png','data':png}}, token)
        studies = request(a, f'hub&profile={pid}')['studies']
        sid = studies[0]['id']
        download=a.open(base+f'study-file&profile={pid}&study={sid}')
        assert download.read()==base64.b64decode(png)
        assert download.headers['Content-Type']=='application/octet-stream'
        request(b,f'study-file&profile={pid}&study={sid}',expected=404)
        request(a,'study-save',{**study,'attachment':{'name':'bad.php','data':base64.b64encode(b'<?php exit; ?>').decode()}},token,400)
        request(b, 'quest-start', {'profile':pid,'study':sid}, tb, 404)
        def finish_quest(lesson):
            quest = request(a, 'quest-start', {'profile':pid,'study':lesson}, token)
            q = quest['question']
            while True:
                if q['kind']=='missing':
                    index=q['mask'].index('_')
                    answer=q['word'][index]
                else: answer=q['word']
                result=request(a, 'quest-answer', {'profile':pid,'token':quest['token'],'step':q['number']-1,'answer':answer}, token)
                if result['done']:
                    request(a, 'quest-answer', {'profile':pid,'token':quest['token'],'step':q['number']-1,'answer':answer}, token, 409)
                    return result
                q=result['question']
        first=finish_quest(sid)
        assert first['coins']==15 and first['wallet']['coins']==15 and first['xp']==30
        second=finish_quest(sid)
        assert second['coins']==0 and second['xp']==0 and second['wallet']['coins']==15
        study['title']='Altre parole';study['words']=[['one','uno','1'],['two','due','2'],['three','tre','3']]
        request(a,'study-save',study,token)
        sid2=request(a,f'hub&profile={pid}')['studies'][0]['id']
        third=finish_quest(sid2)
        assert third['wallet']['coins']==30
        bought=request(a,'buy',{'profile':pid,'item':'panda'},token)
        assert bought['wallet']['coins']==0 and 'panda' in bought['wallet']['inventory']
        bought=request(a,'buy',{'profile':pid,'item':'panda'},token)
        assert bought['wallet']['coins']==0 and bought['wallet']['inventory'].count('panda')==1
        club_info=request(a,'club-create',{'profile':pid,'name':'Gruppo di prova','consent':True},token)
        club_id=club_info['id']
        request(b,f'hub&profile={pid}&club={club_id}',expected=404)
        pb=request(b,'create-profile',{'nickname':'Ospite del gruppo'},tb)['id']
        request(b,f'hub&profile={pb}&club={club_id}',expected=403)
        request(b,'club-join',{'profile':pb,'code':club_info['code'],'consent':True},tb)
        board=request(b,f'hub&profile={pb}&club={club_id}')['board']
        assert len(board)==2 and all('username' not in entry and 'id' not in entry for entry in board)
        assert sum(entry['points'] for entry in board)==60
        for index, words in enumerate([
            [['red','rosso','🔴'],['blue','blu','🔵'],['green','verde','🟢']],
            [['pen','penna','✏️'],['car','auto','🚗'],['ball','palla','⚽']]
        ]):
            request(a,'study-save',{'profile':pid,'title':f'Nuovo programma {index}','words':words,'confirmed':True},token)
            lesson=request(a,f'hub&profile={pid}')['studies'][0]['id']
            result=finish_quest(lesson)
            assert result['coins']==(15 if index==0 else 0)
        renamed=request(a,'rename-profile',{'profile':pid,'nickname':'Nuovo esploratore'},token)
        assert renamed['nickname']=='Nuovo esploratore'
        request(b,'rename-profile',{'profile':pid,'nickname':'altro'},tb,404)
        request(b,'club-leave',{'profile':pb,'club':club_id},tb)
        request(b,f'hub&profile={pb}&club={club_id}',expected=403)
        reset=request(a,'recover',{'username':username,'code':recovery,'password':'New-test-password-456'},token)
        token=reset['csrf']
        request(a,'recover',{'username':username,'code':recovery,'password':'New-test-password-456'},token,401)
        token=request(a,'login',{'username':username,'password':'New-test-password-456'},token)['csrf']
        assert request(a,f'hub&profile={pid}')['wallet']['xp']==120
        extra=request(a,'profile&id='+str(pid))
        assert extra['nickname']=='Nuovo esploratore'
        request(b,'delete-profile',{'profile':pb,'password':password,'confirm':'ELIMINA'},tb)
        request(b,f'hub&profile={pb}',expected=404)
        request(a,'delete-account',{'password':'wrong','confirm':'ELIMINA'},token,401)
        request(a,'delete-account',{'password':'New-test-password-456','confirm':'ELIMINA'},token)
        assert request(a,'session')['username'] is None
        assert not list(Path(temporary + '/data/materials').glob('*.bin'))
        with sqlite3.connect(temporary + '/data/wordyland.sqlite') as database:
            assert database.execute('SELECT COUNT(*) FROM profiles WHERE account_id=(SELECT id FROM accounts WHERE username=?)',(username,)).fetchone()[0]==0
            assert database.execute('SELECT COUNT(*) FROM wallets WHERE profile_id=?',(pid,)).fetchone()[0]==0
        print('API checks passed: authentication/recovery/deletion, CSRF, isolated profiles/materials, verified rewards, replay protection, purchases and private leaderboards.')
    finally:
        process.terminate()
        process.wait(timeout=5)
        log.close()
