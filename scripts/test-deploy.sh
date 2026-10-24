#!/usr/bin/env bash
# Isolated test of the SiteGround deployment: a fake "ssh" runs the remote side
# locally against a temporary hosting account; a local PHP server stands in for
# the public site. Never touches the real server.
set -euo pipefail
cd "$(dirname "$0")/.."
root=$(mktemp -d); trap 'kill ${php_pid:-0} 2>/dev/null || true; rm -rf -- "$root"' EXIT
home="$root/home"; site="$home/www/wordyland.eu"; docroot="$site/public_html"
mkdir -p "$docroot/.well-known" "$site/.wordyland-data" "$root/bin"
echo keep > "$docroot/.well-known/acme"; echo db > "$site/.wordyland-data/keep"
fail() { echo "TEST FAILED: $*" >&2; exit 1; }

# Fake ssh: drop options, run the remote command locally with the fake HOME.
cat > "$root/bin/ssh" <<'FAKE'
#!/usr/bin/env bash
while [[ $# -gt 0 ]]; do case "$1" in -p|-o|-i) shift 2;; -*) shift;; *) break;; esac; done
shift # user@host
[[ -n "${FAKE_SSH_FAIL_ON:-}" && "$*" == *"$FAKE_SSH_FAIL_ON"* ]] && { echo 'simulated transfer failure' >&2; exit 255; }
cd "$FAKE_HOME"; HOME="$FAKE_HOME" exec bash -c "$*"
FAKE
chmod +x "$root/bin/ssh"
# A proxy can serve a stale plain homepage while cache-busting URLs are fresh.
real_curl=$(command -v curl); export WORDYLAND_REAL_CURL="$real_curl"
cat > "$root/bin/curl" <<'FAKE'
#!/usr/bin/env bash
if [[ " $* " == *' -X PURGE '* ]]; then
  [[ "${!#}" =~ ^http://127\.0\.0\.1:[0-9]+/ ]] || { echo 'TEST REFUSES NON-LOCAL PURGE' >&2; exit 99; }
  printf '%s\n' "${!#}" >> "$FAKE_HOME/cache-purges"
  printf '%s' "${FAKE_PURGE_STATUS:-200}"; exit 0
fi
"$WORDYLAND_REAL_CURL" "$@" || exit $?

if [[ "${FAKE_HTML_CHALLENGE:-}" == 1 && "${!#}" == *'api.php?action=health'* ]]; then printf '%s' '<html>sgcaptcha hosting verification</html>'; fi
if [[ "${FAKE_STALE_HOME:-}" == 1 ]]; then
  output=''; previous=''
  for arg in "$@"; do [[ "$previous" == -o ]] && output=$arg; previous=$arg; done
  if [[ -n "$output" && "$output" != /dev/null && ( "${!#}" == "$SITE_URL/" || "${!#}" == "$SITE_URL/index.html" ) ]]; then printf '%s' 'stale cached homepage' > "$output"; fi
fi
FAKE
chmod +x "$root/bin/curl"
export PATH="$root/bin:$PATH" FAKE_HOME="$home"

ssh-keygen -q -t ed25519 -N 'test pass' -f "$root/key" -C test >/dev/null
export SG_HOST=ssh.example.test SG_USER=tester SG_PORT=18765 SG_PATH="$docroot"
export SG_PRIVATE_KEY="$(cat "$root/key")" SG_KEY_PASSPHRASE='test pass'
export SG_KNOWN_HOSTS="[ssh.example.test]:18765 $(cat "$root/key.pub")"
export SITE_URL=http://127.0.0.1:8765 GITHUB_RUN_ID=test
php -S 127.0.0.1:8765 -t "$docroot" >/dev/null 2>&1 & php_pid=$!

# Existing site: older WordyLand version with an unmarked root and a stray PHP copy.
cp dist/index.html dist/api.php dist/platform.php "$docroot/"
echo '<?php echo "secret";' > "$docroot/api.php.wordyland-previous"
git_sha=$(git rev-parse HEAD)

echo '--- remote script avoids process substitution (SiteGround has no /dev/fd)'
! grep -n '<(' scripts/siteground-remote.sh || fail 'process substitution in remote script'

echo '--- refuses a directory outside wordyland.eu/public_html'
SG_PATH="$home/www/other/public_html" bash scripts/deploy-siteground.sh deploy >/dev/null 2>&1 && fail 'accepted wrong path'
echo '--- refuses a symlinked document root'
ln -s "$docroot" "$home/www/link"; mkdir -p "$home/www/l2/wordyland.eu"; ln -s "$docroot" "$home/www/l2/wordyland.eu/public_html"
SG_PATH="$home/www/l2/wordyland.eu/public_html" bash scripts/deploy-siteground.sh deploy >/dev/null 2>&1 && fail 'accepted symlink'

echo '--- simulated transfer failure leaves the site untouched'
before=$(sha256sum "$docroot/index.html")
FAKE_SSH_FAIL_ON='incoming/' bash scripts/deploy-siteground.sh deploy >/dev/null 2>&1 && fail 'transfer failure not detected'
[[ $(sha256sum "$docroot/index.html") == "$before" ]] || fail 'site changed after failed transfer'

echo '--- first deploy'
bash scripts/deploy-siteground.sh deploy | tee "$root/out1"
[[ $(cat "$docroot/.wordyland-managed") == "$git_sha" ]] || fail 'marker not set'
[[ $(wc -l < "$home/cache-purges") == 3 ]] || fail 'cache was not purged before checking the public site'
[[ ! -e "$docroot/api.php.wordyland-previous" ]] || fail 'stray PHP copy still public'
[[ -z $(find "$docroot" \( -name '*.wordyland-*' -o -name '*.tar' -o -name SHA256SUMS \) ! -name .wordyland-managed) ]] || fail 'temporary files in docroot'
[[ -f "$docroot/.well-known/acme" && -f "$site/.wordyland-data/keep" ]] || fail 'preserved files lost'
for f in community.php classroom.php arena.php api.php platform.php classroom.js presence.js arena.js curriculum.json quests.css data.js worlds.js learning.js app.js accounts.js quests.js community.js arcade.css arcade.js island.css island.js island-places.webp three.min.js race-world.webp race-circuits.webp race-racers.webp manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png offline.html offline.js pwa.css pwa.js sw.js index.html; do
  cmp -s "dist/$f" "$docroot/$f" || fail "$f differs"
done
priv="$site/.wordyland-deploy"; [[ $(stat -c %a "$priv") == 700 ]] || fail 'private dir not 700'
ls "$priv/releases" | grep -q initial || fail 'no initial backup'

echo '--- publication never provisions the owner or writes activation credentials'
WORDYLAND_FIXTURE_DB="$site/.wordyland-data/wordyland.sqlite" php -r '
$db=new PDO("sqlite:".getenv("WORDYLAND_FIXTURE_DB"));
if($db->query("SELECT COUNT(*) FROM accounts WHERE username=\"luca@perrone.it\"")->fetchColumn()!=0)exit(1);
$db->exec("INSERT INTO accounts(username,password_hash,created_at,recovery_hash,session_version,role) VALUES (\"luca@perrone.it\",\"synthetic-password-hash\",1,\"synthetic-recovery-hash\",23,\"adult\")");
' || fail 'ordinary deploy created an owner account'
[[ ! -e "$site/.wordyland-data/admin-activation.txt" ]] || fail 'ordinary deploy generated activation credentials'
printf '%s' 'synthetic private activation fixture' > "$site/.wordyland-data/admin-activation.txt"

echo '--- repeat deploy is idempotent'
out=$(bash scripts/deploy-siteground.sh deploy); grep -q 'already deployed' <<<"$out" || fail 'not idempotent'
WORDYLAND_FIXTURE_DB="$site/.wordyland-data/wordyland.sqlite" php -r '
$db=new PDO("sqlite:".getenv("WORDYLAND_FIXTURE_DB"));$row=$db->query("SELECT password_hash,recovery_hash,session_version,role FROM accounts WHERE username=\"luca@perrone.it\"")->fetch(PDO::FETCH_ASSOC);
if($row!==["password_hash"=>"synthetic-password-hash","recovery_hash"=>"synthetic-recovery-hash","session_version"=>23,"role"=>"adult"])exit(1);
' || fail 'ordinary redeploy changed owner credentials or privileges'
[[ $(cat "$site/.wordyland-data/admin-activation.txt") == 'synthetic private activation fixture' ]] || fail 'activation instructions changed'

echo '--- the read-only probe reports owner metadata without activation contents'
probe_output=$(bash scripts/deploy-siteground.sh probe)
grep -q '"ownerExists":true,"ownerIsAdmin":false,"privateActivationAvailable":true' <<<"$probe_output" || fail 'owner probe metadata missing'
[[ "$probe_output" != *'synthetic private activation fixture'* && "$probe_output" != *'synthetic-password-hash'* ]] || fail 'private owner data leaked by probe'

echo '--- unavailable cache management is acceptable only with fresh ordinary visitor URLs'
FAKE_PURGE_STATUS=403 bash scripts/deploy-siteground.sh deploy >/dev/null 2>&1 || fail 'fresh ordinary homepage rejected with cache management disabled'

echo '--- failed install (symlinked file) restores previous files and keeps the marker'
parent=$(git rev-parse HEAD~1)
printf '%s\n' "$parent" > "$docroot/.wordyland-managed"
echo '<?php // old' > "$docroot/classroom.php"; echo 'old page WordyLand' > "$docroot/index.html"
rm "$docroot/quests.js"; ln -s /etc/hostname "$docroot/quests.js"
bash scripts/deploy-siteground.sh deploy >/dev/null 2>&1 && fail 'install over symlink succeeded'
grep -q '// old' "$docroot/classroom.php" || fail 'classroom.php not restored after failure'
grep -q 'old page' "$docroot/index.html" || fail 'index.html changed despite failure'
[[ $(cat "$docroot/.wordyland-managed") == "$parent" ]] || fail 'marker changed after failure'
rm "$docroot/quests.js"
bash scripts/deploy-siteground.sh deploy >/dev/null || fail 'deploy after fix failed'
[[ $(cat "$docroot/.wordyland-managed") == "$git_sha" ]] || fail 'marker not updated'

echo '--- an obsolete run does not overwrite a newer deployed commit'
printf '%s\n' "$git_sha" > "$docroot/.wordyland-managed"
git worktree add -q "$root/old" HEAD~1
cp scripts/deploy-siteground.sh scripts/siteground-remote.sh "$root/old/scripts/"
out=$(cd "$root/old" && bash scripts/deploy-siteground.sh deploy); grep -q 'obsolete' <<<"$out" || fail 'obsolete run not skipped'
git worktree remove --force "$root/old"
cmp -s dist/index.html "$docroot/index.html" || fail 'obsolete run changed the site'

echo '--- rollback restores the previous files'
bash scripts/deploy-siteground.sh rollback latest | tail -n 3
grep -q 'old page' "$docroot/index.html" || fail 'rollback did not restore the previous release files'
[[ $(cat "$docroot/.wordyland-managed") == "$parent" ]] || fail 'rollback marker wrong'
bash scripts/deploy-siteground.sh deploy >/dev/null || fail 'redeploy after rollback failed'
cmp -s dist/index.html "$docroot/index.html" || fail 'redeploy did not restore release'

echo '--- failed HTTPS checks after publishing restore the previous release'
parent=$(git rev-parse HEAD~1)
printf '%s\n' "$parent" > "$docroot/.wordyland-managed"; echo 'previous page WordyLand' > "$docroot/index.html"
SITE_URL=http://127.0.0.1:1 bash scripts/deploy-siteground.sh deploy >"$root/out_live" 2>&1 && fail 'deploy passed with failing live checks'
grep -q 'restoring backup' "$root/out_live" || fail 'no rollback after live check failure'
grep -q 'previous page' "$docroot/index.html" || fail 'previous index.html not restored after live failure'
[[ $(cat "$docroot/.wordyland-managed") == "$parent" ]] || fail 'marker not restored after live failure'
bash scripts/deploy-siteground.sh deploy >/dev/null || fail 'redeploy after live failure'
cmp -s dist/index.html "$docroot/index.html" || fail 'redeploy content'

echo '--- a stale ordinary homepage fails even when cache-busting checks are fresh'
printf '%s\n' "$parent" > "$docroot/.wordyland-managed"; echo 'previous cached page WordyLand' > "$docroot/index.html"
FAKE_STALE_HOME=1 FAKE_PURGE_STATUS=403 bash scripts/deploy-siteground.sh deploy >"$root/out_stale" 2>&1 && fail 'stale normal homepage was accepted'
grep -q 'Normal homepage / is stale' "$root/out_stale" || fail 'normal URL was not checked'
grep -q 'previous cached page' "$docroot/index.html" || fail 'stale-home failure did not restore previous release'
bash scripts/deploy-siteground.sh deploy >/dev/null || fail 'redeploy after cache failure'

echo '--- hosting verification is diagnosed and rollback marker is confirmed'
printf '%s\n' "$parent" > "$docroot/.wordyland-managed"; echo 'previous verified release WordyLand' > "$docroot/index.html"
FAKE_HTML_CHALLENGE=1 GITHUB_ACTIONS=true bash scripts/deploy-siteground.sh deploy >"$root/out_challenge" 2>&1 && fail 'hosting HTML was accepted as API health'
grep -q 'anti-bot verification intercepted the health endpoint' "$root/out_challenge" || fail 'hosting challenge not diagnosed'
grep -q "Automatic rollback completed; verified server marker: $parent" "$root/out_challenge" || fail 'rollback marker not confirmed'
grep -q 'previous verified release' "$docroot/index.html" || fail 'challenge rollback lost previous files'
grep -q 'Public health could not be verified after rollback' "$root/out_challenge" || fail 'uncertain public verification not distinguished'
if grep -q 'Site still unhealthy' "$root/out_challenge"; then fail 'hosting challenge incorrectly presented as a visitor outage'; fi
[[ $(cat "$docroot/.wordyland-managed") == "$parent" ]] || fail 'challenge rollback marker mismatch'

echo '--- refuses unknown site without marker'
rm "$docroot/.wordyland-managed"; echo '<html>other</html>' > "$docroot/index.html"
bash scripts/deploy-siteground.sh deploy >/dev/null 2>&1 && fail 'overwrote unknown site'
echo 'Deployment tests passed: path/symlink refusal, transfer failure, private staging, checksums, idempotence, stale/unknown marker, rollback, live-check rollback, preservation.'
