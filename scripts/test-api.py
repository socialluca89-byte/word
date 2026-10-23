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
        token = request(a, "register", dict(username=username, password=password, adult=True), token)["csrf"]
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
        print("API checks passed: CSRF, password hashing, login, persistence, account isolation, concurrent edits and profile limit.")
    finally:
        process.terminate()
        process.wait(timeout=5)
        log.close()
