#!/usr/bin/env bash
# Disposable PHP/browser environment; never uses the live site or production data.
set -euo pipefail
cd "$(dirname "$0")/.."
check=${1:-presence}
case "$check" in motion) script="scripts/test-motion.cjs";; grammar-aids|grammar|kart-pilot|visual-journey|engine-lazy|classroom-access|learning-entry|training-memory|holiday-continuity|holiday-layout|wardrobe-layout|interaction-focus|holiday-rounds|world-driving|holiday-calendar|training-guidance|guardian|child-experience|learning-experience|account-resilience|game-resilience|journey-navigation|appearance-consistency|duel-identity|offline-audio|classic-illustrated|illustrated-actions|illustrated|world-play|christmas-cast|elf|journey|holidays|pdf-scan|ocr|materials|phonics|offline-letters|offline-training|foundations|letter-progression|duel-resilience|compatibility|training|spelling|wallet|tiles|parent-summary|wardrobe|review|autonomy|navigation|performance|email|access|rewards|ux|learning|resume|presence|pwa|community|characters|school) script="scripts/test-${check}-browser.cjs";; *) echo 'Choose grammar-aids, grammar, kart-pilot, visual-journey, engine-lazy, classroom-access, learning-entry, training-memory, holiday-continuity, holiday-layout, wardrobe-layout, interaction-focus, holiday-rounds, world-driving, holiday-calendar, training-guidance, guardian, child-experience, learning-experience, classic-illustrated, illustrated-actions, illustrated, world-play, christmas-cast, elf, journey, holidays, pdf-scan, ocr, materials, phonics, offline-letters, offline-training, foundations, letter-progression, duel-resilience, compatibility, motion, training, spelling, wallet, tiles, parent-summary, wardrobe, review, autonomy, navigation, performance, email, access, rewards, ux, learning, resume, presence, pwa, community, characters or school' >&2; exit 2;; esac
fixture=$(mktemp -d /tmp/wordyland-browser.XXXXXX)
mkdir -p "$fixture/data" "$fixture/sessions" "$fixture/public"
cp dist/* "$fixture/public/"
# Existing renderer regressions explicitly select the retained classic mode.
# The illustrated suite exercises the new production default and both choices.
if [[ "$check" != grammar-aids && "$check" != grammar && "$check" != kart-pilot && "$check" != visual-journey && "$check" != engine-lazy && "$check" != classroom-access && "$check" != learning-entry && "$check" != training-memory && "$check" != holiday-continuity && "$check" != holiday-layout && "$check" != wardrobe-layout && "$check" != interaction-focus && "$check" != holiday-rounds && "$check" != world-driving && "$check" != holiday-calendar && "$check" != training-guidance && "$check" != guardian && "$check" != illustrated && "$check" != classic-illustrated && "$check" != illustrated-actions && "$check" != account-resilience && "$check" != game-resilience && "$check" != journey-navigation && "$check" != appearance-consistency && "$check" != duel-identity && "$check" != offline-audio && "$check" != child-experience && "$check" != learning-experience ]]; then
  python3 - "$fixture/public/index.html" <<'PYMODE'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text();anchor='<script id="loadSupportGuard">';assert s.count(anchor)==1;s=s.replace(anchor,'<script>try{localStorage.setItem("wordylandSceneStyle","3d")}catch{}</script>'+anchor,1);p.write_text(s)
PYMODE
fi
port=$(python3 - <<'PY'
import socket
with socket.socket() as s:s.bind(('127.0.0.1',0));print(s.getsockname()[1])
PY
)
if [[ "$check" == holiday-continuity || "$check" == holiday-layout || "$check" == holiday-rounds || "$check" == holiday-calendar || "$check" == holidays || "$check" == journey || "$check" == elf || "$check" == christmas-cast || "$check" == illustrated ]]; then
  export WORDYLAND_TEST_CLOCK_FILE="$fixture/holiday-clock"
  if [[ "$check" == holiday-continuity ]]; then printf '2026-11-03 23:59:00'; elif [[ "$check" == holiday-layout || "$check" == holiday-rounds || "$check" == holiday-calendar ]]; then printf '2026-11-02 12:00:00'; elif [[ "$check" == journey ]]; then printf '2027-07-01 12:00:00'; elif [[ "$check" == elf ]]; then printf '2026-12-07 12:00:00'; else printf '2026-11-01 12:00:00'; fi > "$WORDYLAND_TEST_CLOCK_FILE"
fi
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
printf 'Browser suite %s starting\n' "$check"
if node "$script" 2>&1 | tee "$fixture/browser.log"; then
  if [[ "${GITHUB_ACTIONS:-}" == true ]]; then printf '::notice title=Browser suite::Suite %s passed.\n' "$check"; fi
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
location=next((m.group(1)+':'+m.group(2)+':'+m.group(3) for line in lines if (m:=re.search(r'[/\\](scripts[/\\][A-Za-z0-9_.-]+):(\d+):(\d+)',line))), 'No test source location available.')
print((message+' Location: '+location).replace('%','%25').replace('\r','%0D').replace('\n','%0A'))
PY
)
    printf '::error title=Browser suite %s::Suite %s; exit %s; %s No retry was performed.\n' "$check" "$check" "$result" "$diagnostic"
  fi
  exit "$result"
fi
