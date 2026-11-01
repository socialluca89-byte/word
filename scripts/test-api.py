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
        import copy
        jar=next(handler.cookiejar for handler in a.handlers if isinstance(handler,urllib.request.HTTPCookieProcessor))
        old_cookie=copy.copy(next(cookie for cookie in jar if cookie.name=='wordyland_session'))
        signed_out=request(a, "logout", {}, token)
        new_cookie=next(cookie for cookie in jar if cookie.name=='wordyland_session')
        assert old_cookie.value!=new_cookie.value and signed_out['csrf']!=token
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as pool:
            reads=list(pool.map(lambda _:request(a,'session'),range(2)))
        assert all(result['csrf']==signed_out['csrf'] and result['username'] is None and result['profiles']==[] for result in reads)
        old_jar=http.cookiejar.CookieJar();old_jar.set_cookie(old_cookie)
        old_client=urllib.request.build_opener(urllib.request.ProxyHandler({}),urllib.request.HTTPCookieProcessor(old_jar))
        request(old_client,'profile&id='+str(profile['id']),expected=401)
        request(a,'logout',{},token,403)
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
        # Every entry path preserves class nickname uniqueness, including adult profiles.
        duplicate = request(b,'create-profile',{'nickname':'ESPLORATORE'},tb)['id']
        request(b,'club-join',{'profile':duplicate,'code':club_info['code'],'consent':True},tb,409)
        request(b,'rename-profile',{'profile':pb,'nickname':'esploratore'},tb,409)
        assert request(b,'profile&id='+str(pb))['nickname']=='Ospite del gruppo'
        assert request(b,'rename-profile',{'profile':duplicate,'nickname':'ESPLORATORE'},tb)['nickname']=='ESPLORATORE'
        second_member=request(b,'create-profile',{'nickname':'SecondaStella'},tb)['id']
        second_class=request(b,'club-create',{'profile':second_member,'name':'Seconda classe','consent':True},tb)
        request(a,'club-join',{'profile':pid,'code':second_class['code'],'consent':True},token)
        request(a,'rename-profile',{'profile':pid,'nickname':'SECONDastella'},token,409)
        assert request(a,'profile&id='+str(pid))['nickname']=='Esploratore'
        request(a,'club-leave',{'profile':pid,'club':second_class['id']},token)
        # A nickname used only in another class does not block an unrelated profile.
        assert request(a,'rename-profile',{'profile':pid,'nickname':'SecondaStella'},token)['nickname']=='SecondaStella'
        request(a,'rename-profile',{'profile':pid,'nickname':'Esploratore'},token)
        board=request(b,f'hub&profile={pb}&club={club_id}')['board']
        assert len(board)==2 and all('username' not in entry and 'id' not in entry for entry in board)
        assert sum(entry['points'] for entry in board)==60
        # Private duels use identical persisted questions and server-owned scores.
        opponents = request(a, f'arena&profile={pid}')['opponents']
        assert pb in [p['id'] for p in opponents]
        assert all('account_id' not in p and 'username' not in p for p in opponents)
        family = next(p['id'] for p in request(a, 'session')['profiles'] if p['id'] != pid)
        assert family not in [p['id'] for p in opponents]
        # Sharing an adult account alone does not make someone a classmate.
        request(a,'duel-create',{'profile':pid,'opponent':family,'category':'body'},token,403)
        request(a,'club-join',{'profile':family,'code':club_info['code'],'consent':True},token)
        roster=request(a,f'arena&profile={pid}')
        assert roster['classes']==[{'id':club_id,'name':'Gruppo di prova'}]
        assert family in [p['id'] for p in roster['opponents']]
        assert all(p['classes']==['Gruppo di prova'] for p in roster['opponents'])
        outsider = client()
        tc = request(outsider, 'session')['csrf']
        tc = request(outsider, 'register', dict(username='test_'+secrets.token_hex(5), password=password, adult=True), tc)['csrf']
        pc = request(outsider, 'create-profile', {'nickname':'Fuori dal gruppo'}, tc)['id']
        assert pc not in [p['id'] for p in request(a, f'arena&profile={pid}')['opponents']]
        request(a, f'arena&profile={pc}', expected=404)
        request(client(), f'arena&profile={pid}', expected=401)
        request(a, 'duel-create', {'profile':pid,'opponent':pc,'category':'body'}, token,403)
        request(a, 'duel-create', {'profile':pid,'opponent':pid,'category':'body'}, token,403)
        request(a, 'duel-create', {'profile':pid,'opponent':pb,'category':'unknown'}, token,400)
        request(a, 'duel-create', {'profile':pid,'opponent':pb,'category':'body'}, 'bad',403)
        invitation = request(a, 'duel-create', {'profile':pid,'opponent':pb,'category':'body'}, token)['duel']
        duel_id = invitation['id']
        assert invitation['state']=='pending' and not invitation['incoming']
        request(a, 'duel-create', {'profile':pid,'opponent':pb,'category':'body'}, token,409)
        request(b, 'duel-create', {'profile':pb,'opponent':pid,'category':'body'}, tb,409)
        request(a, 'duel-accept', {'profile':pid,'duel':duel_id}, token,403)
        request(outsider, f'duel&profile={pc}&duel={duel_id}', expected=404)
        request(outsider, 'duel-answer', {'profile':pc,'duel':duel_id,'step':0,'answer':0},tc,404)
        assert request(a, f'duel&profile={pid}&duel={duel_id}')['question'] is None
        request(a,'duel-answer',{'profile':pid,'duel':duel_id,'step':0,'answer':0},token,409)
        started = request(b,'duel-accept',{'profile':pb,'duel':duel_id},tb)
        assert started['duel']['incoming'] and started['duel']['state']=='active'
        assert 'answer' not in started['question']
        assert started['question']==request(a,f'duel&profile={pid}&duel={duel_id}')['question']
        request(b,'duel-accept',{'profile':pb,'duel':duel_id},tb,409)
        request(a,'duel-answer',{'profile':pid,'duel':duel_id,'step':1,'answer':0},token,409)
        request(a,'duel-answer',{'profile':pid,'duel':duel_id,'step':0,'answer':-1},token,400)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            stored_questions=json.loads(database.execute('SELECT questions FROM duels WHERE id=?',(duel_id,)).fetchone()[0])
        original_wallet=request(a,f'hub&profile={pid}')['wallet']
        for player_client, player_id, csrf, miss_one in [(a,pid,token,False),(b,pb,tb,True)]:
            current=request(player_client,f'duel&profile={player_id}&duel={duel_id}')
            for step, stored_question in enumerate(stored_questions):
                assert current['question']['number']==step+1 and 'answer' not in current['question']
                answer=stored_question['options'].index(stored_question['answer'])
                if miss_one and step==0:answer=(answer+1)%len(stored_question['options'])
                current=request(player_client,'duel-answer',{'profile':player_id,'duel':duel_id,'step':step,'answer':answer,'score':999999},csrf)
                assert current['correct']==(not miss_one or step!=0)
                request(player_client,'duel-answer',{'profile':player_id,'duel':duel_id,'step':step,'answer':answer},csrf,409)
                # A GET resumes the exact next step, without replaying the answer.
                resumed=request(player_client,f'duel&profile={player_id}&duel={duel_id}')
                assert resumed['duel']['step']==step+1 and resumed['question']==current['question']
            if player_id==pid:
                assert current['duel']['state']=='active' and current['duel']['rivalScore'] is None
                assert current['question'] is None
        completed=request(a,f'duel&profile={pid}&duel={duel_id}')['duel']
        assert completed['state']=='completed' and completed['score']==50 and completed['rivalScore']==40
        assert request(a,f'hub&profile={pid}')['wallet']==original_wallet
        assert request(b,f'duel&profile={pb}&duel={duel_id}')['duel']['score']==40
        rematch=request(a,'duel-create',{'profile':pid,'opponent':pb,'category':'body'},token)['duel']
        request(a,'duel-decline',{'profile':pid,'duel':rematch['id']},token,403)
        assert request(b,'duel-decline',{'profile':pb,'duel':rematch['id']},tb)['duel']['state']=='declined'
        cancelled=request(a,'duel-create',{'profile':pid,'opponent':pb,'category':'colors'},token)['duel']
        assert request(a,'duel-cancel',{'profile':pid,'duel':cancelled['id']},token)['duel']['state']=='cancelled'
        expired=request(a,'duel-create',{'profile':pid,'opponent':family,'category':'school'},token)['duel']
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            database.execute('UPDATE duels SET expires_at=0 WHERE id=?',(expired['id'],))
        assert request(a,f'duel&profile={pid}&duel={expired["id"]}')['duel']['state']=='expired'
        request(a,'duel-answer',{'profile':pid,'duel':expired['id'],'step':0,'answer':0},token,409)
        request(b,'club-leave',{'profile':pb,'club':club_id},tb)
        request(a,f'duel&profile={pid}&duel={duel_id}',expected=403)
        assert duel_id not in [d['id'] for d in request(a,f'arena&profile={pid}')['duels']]
        request(b,'club-join',{'profile':pb,'code':club_info['code'],'consent':True},tb)
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
        # A full class still accepts a repeated enrollment of an existing member.
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            account_before=database.execute('SELECT * FROM accounts ORDER BY id').fetchall()
            profile_before=database.execute('SELECT * FROM profiles ORDER BY id').fetchall()
            membership_before=database.execute('SELECT * FROM club_accounts ORDER BY club_id,account_id').fetchall()
            owner=database.execute('SELECT account_id FROM profiles WHERE id=?',(pid,)).fetchone()[0]
            count=database.execute('SELECT COUNT(*) FROM club_profiles WHERE club_id=?',(club_id,)).fetchone()[0]
            fillers=[]
            for index in range(100-count):
                cursor=database.execute('INSERT INTO profiles(account_id,nickname,state) VALUES (?,?,?)',(owner,'Capacity'+str(index),'{}'))
                fillers.append(cursor.lastrowid)
                database.execute('INSERT INTO club_profiles VALUES (?,?)',(club_id,cursor.lastrowid))
        assert request(a,'club-join',{'profile':pid,'code':club_info['code'],'consent':True},token)['id']==club_id
        request(a,'club-join',{'profile':pid,'code':club_info['code'],'consent':False},token,400)
        request(outsider,'club-join',{'profile':pc,'code':club_info['code'],'consent':True},tc,400)
        with sqlite3.connect(temporary+'/data/wordyland.sqlite') as database:
            assert database.execute('SELECT COUNT(*) FROM club_profiles WHERE club_id=?',(club_id,)).fetchone()[0]==100
            assert database.execute('SELECT * FROM club_accounts ORDER BY club_id,account_id').fetchall()==membership_before
            for filler in fillers:
                database.execute('DELETE FROM club_profiles WHERE profile_id=?',(filler,))
                database.execute('DELETE FROM profiles WHERE id=?',(filler,))
            assert database.execute('SELECT * FROM accounts ORDER BY id').fetchall()==account_before
            assert database.execute('SELECT * FROM profiles ORDER BY id').fetchall()==profile_before
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
            assert database.execute('SELECT COUNT(*) FROM duels WHERE challenger=? OR opponent=?',(pid,pid)).fetchone()[0]==0
            assert database.execute('SELECT COUNT(*) FROM duel_players WHERE profile=?',(pid,)).fetchone()[0]==0
        print('API checks passed: authentication/recovery/deletion, CSRF, isolated profiles/materials, verified rewards, replay protection, purchases, private leaderboards and two-player duels (invitations, permissions, resume, scores, expiry and replay protection).')
    finally:
        process.terminate()
        process.wait(timeout=5)
        log.close()
