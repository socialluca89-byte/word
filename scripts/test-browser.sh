#!/usr/bin/env bash
# Disposable PHP/browser environment; never uses the live site or production data.
set -euo pipefail
cd "$(dirname "$0")/.."
check=${1:-presence}
case "$check" in rewards|ux|learning|resume|presence|pwa|community|characters|school) script="scripts/test-${check}-browser.cjs";; *) echo 'Choose rewards, ux, learning, resume, presence, pwa, community, characters or school' >&2; exit 2;; esac
fixture=$(mktemp -d /tmp/wordyland-browser.XXXXXX)
mkdir -p "$fixture/data" "$fixture/sessions" "$fixture/public"
cp dist/* "$fixture/public/"
port=$(python3 - <<'PY'
import socket
with socket.socket() as s:s.bind(('127.0.0.1',0));print(s.getsockname()[1])
PY
)
WORDYLAND_TEST=1 WORDYLAND_DATA_DIR="$fixture/data" php -d session.save_path="$fixture/sessions" -S "127.0.0.1:$port" -t "$fixture/public" > "$fixture/server.log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true; rm -rf -- "$fixture"' EXIT
export WORDYLAND_TEST_URL="http://127.0.0.1:$port" WORDYLAND_BROWSER_ROOT="$fixture/public" WORDYLAND_BROWSER_DATA="$fixture/data"
python3 - <<'PY'
import os,time,urllib.request
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
for _ in range(80):
 try:opener.open(os.environ['WORDYLAND_TEST_URL'],timeout=1);break
 except Exception:time.sleep(.05)
else:raise RuntimeError('Local PHP test server unavailable')
PY
node "$script"
