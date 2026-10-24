#!/usr/bin/env bash
# Standalone, single SSH diagnostic using existing SG_* bindings. No workflow dispatch.
set +x
set -euo pipefail
exec 3>&2 2>/dev/null
cd "$(dirname "$0")/.."
fail() { echo 'Read-only diagnostic unavailable. No state change requested.' >&3; exit 1; }
trap fail ERR
[[ $# == 1 && $1 == --read-only ]] || fail
[[ ${SG_HOST:-} == ssh.wordyland.eu && ${SG_PORT:-} == 18765 && ${SG_PATH:-} == /home/customer/www/wordyland.eu/public_html ]] || fail
[[ ${SG_USER:-} =~ ^[a-zA-Z0-9_-]+$ && -n ${SG_PRIVATE_KEY:-} && -n ${SG_KNOWN_HOSTS:-} ]] || fail

task_tmp=$(mktemp -d "${TMPDIR:-/tmp}/wordyland-readonly.XXXXXX"); chmod 700 "$task_tmp"
task_agent_pid=''
cleanup() { [[ -z "$task_agent_pid" ]] || kill "$task_agent_pid" 2>/dev/null || true; rm -rf -- "$task_tmp"; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
printf '%s\n' "$SG_KNOWN_HOSTS" > "$task_tmp/known_hosts"
ssh-keygen -F '[ssh.wordyland.eu]:18765' -f "$task_tmp/known_hosts" >/dev/null 2>&1 || fail
printf '%s\n' "$SG_PRIVATE_KEY" | tr -d '\r' > "$task_tmp/key"; chmod 600 "$task_tmp/key"
task_agent_env=$(ssh-agent -s -a "$task_tmp/agent.sock" 2>/dev/null) || fail
eval "$task_agent_env" >/dev/null || fail
task_agent_pid=${SSH_AGENT_PID:-}
[[ "$task_agent_pid" =~ ^[0-9]+$ ]] || fail
if [[ -n ${SG_KEY_PASSPHRASE:-} ]]; then
  printf '#!/bin/sh\nprintf "%%s\\n" "$SG_KEY_PASSPHRASE"\n' > "$task_tmp/askpass"; chmod 700 "$task_tmp/askpass"
  SSH_ASKPASS="$task_tmp/askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=none timeout 5s ssh-add "$task_tmp/key" </dev/null >/dev/null 2>&1 || fail
else
  SSH_ASKPASS=/bin/false SSH_ASKPASS_REQUIRE=force DISPLAY=none timeout 5s ssh-add "$task_tmp/key" </dev/null >/dev/null 2>&1 || fail
fi
rm -f -- "$task_tmp/key" "$task_tmp/askpass"
unset SG_PRIVATE_KEY SG_KEY_PASSPHRASE SG_KNOWN_HOSTS
# No key scans, IP service, cache operations, deployment script, or host-key fallback.
timeout 35s ssh -p 18765 -o BatchMode=yes -o StrictHostKeyChecking=yes -o LogLevel=ERROR \
  -o UserKnownHostsFile="$task_tmp/known_hosts" -o ConnectTimeout=20 \
  "$SG_USER@ssh.wordyland.eu" \
  "WORDYLAND_BOOTSTRAP_DATA='/home/customer/www/wordyland.eu/.wordyland-data' php -d display_errors=0 -d log_errors=0 -- --read-only" \
  < scripts/read-only-readiness.php > "$task_tmp/result" 2> "$task_tmp/errors" || fail
# Do not relay banners, remote diagnostics, unknown keys, configuration values or malformed output.
python3 - "$task_tmp/result" <<'PY' || fail
import json,sys
try:
    with open(sys.argv[1],'rb') as f:raw=f.read(8193)
    if len(raw)>8192:raise ValueError()
    result=json.loads(raw)
    if type(result) is not dict or set(result)!={'ownerExists','ownerIsAdmin','privateActivationAvailable','mail'}:raise ValueError()
    if not all(type(result[k]) is bool for k in ['ownerExists','ownerIsAdmin','privateActivationAvailable']):raise ValueError()
    mail=result['mail']
    if type(mail) is not dict or set(mail)!={'configuration','transport','sender','phpMailAvailable','configurationReady'}:raise ValueError()
    if mail['configuration'] not in ['absent','unsafe','invalid','disabled','present']:raise ValueError()
    if mail['transport'] not in ['unset','php-mail','unsupported'] or mail['sender'] not in ['unset','invalid','valid_format']:raise ValueError()
    if type(mail['phpMailAvailable']) is not bool or type(mail['configurationReady']) is not bool:raise ValueError()
    if mail['configurationReady'] != (mail['configuration']=='present' and mail['transport']=='php-mail' and mail['sender']=='valid_format' and mail['phpMailAvailable']):raise ValueError()
    print(json.dumps(result,separators=(',',':')))
except Exception:sys.exit(1)
PY
