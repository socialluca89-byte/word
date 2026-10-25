#!/usr/bin/env bash
# Disposable PHP/browser environment; never uses the live site or production data.
set -euo pipefail
cd "$(dirname "$0")/.."
check=${1:-presence}
case "$check" in motion) script="scripts/test-motion.cjs";; compatibility|training|spelling|wallet|tiles|parent-summary|wardrobe|review|autonomy|navigation|performance|email|access|rewards|ux|learning|resume|presence|pwa|community|characters|school) script="scripts/test-${check}-browser.cjs";; *) echo 'Choose compatibility, motion, training, spelling, wallet, tiles, parent-summary, wardrobe, review, autonomy, navigation, performance, email, access, rewards, ux, learning, resume, presence, pwa, community, characters or school' >&2; exit 2;; esac
fixture=$(mktemp -d /tmp/wordyland-browser.XXXXXX)
mkdir -p "$fixture/data" "$fixture/sessions" "$fixture/public"
cp dist/* "$fixture/public/"
port=$(python3 - <<'PY'
import socket
with socket.socket() as s:s.bind(('127.0.0.1',0));print(s.getsockname()[1])
PY
)
test_mail=0
if [[ "$check" == email ]]; then test_mail=1; fi
WORDYLAND_TEST_MAIL="$test_mail" WORDYLAND_TEST=1 WORDYLAND_DATA_DIR="$fixture/data" php -d session.save_path="$fixture/sessions" -S "127.0.0.1:$port" -t "$fixture/public" > "$fixture/server.log" 2>&1 &
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
if node "$script" 2>&1 | tee "$fixture/browser.log"; then
  :
else
  result=$?
  # Fixed public annotation: all browser fixtures are synthetic; never expose their private files.
  if [[ "${GITHUB_ACTIONS:-}" == true ]]; then
    diagnostic=$(python3 - "$fixture/browser.log" <<'PY'
import re,sys
lines=open(sys.argv[1]).read().splitlines()
message=next((line for line in lines if re.search(r'AssertionError|(?:Error|TimeoutError):|(?:locator|page)\.[A-Za-z]+:',line)), 'No structured browser diagnostic available.')
message=re.sub(r'\x1b\[[0-9;]*m','',message)
message=re.sub(r'https?://\S+','[URL]',message)
message=re.sub(r'\b[a-fA-F0-9]{32,}\b','[redacted]',message)
message=re.sub(r'[\w.+-]+@[\w.-]+','[email]',message)[:300]
print(message.replace('%','%25').replace('\r','%0D').replace('\n','%0A'))
PY
)
    printf '::error title=Browser suite %s::Exit %s; %s No retry was performed.\n' "$check" "$result" "$diagnostic"
  fi
  exit "$result"
fi
