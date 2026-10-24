#!/usr/bin/env bash
# GitHub Actions side of the SiteGround deployment.
# Usage: deploy-siteground.sh deploy|probe|rollback [backup-name]
# Runs the versioned scripts/siteground-remote.sh from this checkout over SSH;
# nothing is downloaded or executed from elsewhere.
set -euo pipefail
mode=${1:-deploy}; backup=${2:-latest}
cd "$(dirname "$0")/.."
FILES=(community.php classroom.php arena.php api.php platform.php classroom.js presence.js arena.js curriculum.json quests.css data.js worlds.js learning.js app.js accounts.js quests.js community.js arcade.css arcade.js island.css island.js island-places.webp three.min.js race-world.webp race-circuits.webp race-racers.webp manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png offline.html offline.js pwa.css pwa.js sw.js index.html)
SITE_URL=${SITE_URL:-https://wordyland.eu}

need() { for n in "$@"; do [[ -n "${!n:-}" ]] || { echo "Missing GitHub configuration: $n" >&2; exit 1; }; done; }
need SG_HOST SG_USER SG_PORT
[[ "$SG_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || { echo 'Invalid SG_HOST' >&2; exit 1; }
[[ "$SG_USER" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo 'Invalid SG_USER' >&2; exit 1; }
[[ "$SG_PORT" =~ ^[0-9]+$ ]] || { echo 'Invalid SG_PORT' >&2; exit 1; }
if [[ -n "${SG_PATH:-}" ]]; then
  [[ "$SG_PATH" =~ ^/[a-zA-Z0-9_./-]+/wordyland\.eu/public_html$ && "$SG_PATH" != *'..'* && "$SG_PATH" != *'//'* ]] \
    || { echo 'SG_PATH must be the absolute .../wordyland.eu/public_html path' >&2; exit 1; }
fi

work=$(mktemp -d); chmod 700 "$work"
deploy_phase=configuration
cleanup() { local result=$?; if [[ "$result" != 0 && "${GITHUB_ACTIONS:-}" == true ]]; then printf '::error title=Deployment stopped::Stage %s exited with status %s\n' "$deploy_phase" "$result"; fi; [[ -n "${SSH_AGENT_PID:-}" ]] && ssh-agent -k >/dev/null 2>&1 || true; rm -rf -- "$work"; }
trap cleanup EXIT

# Fixed, non-sensitive diagnostics stay visible even when full logs need login.
live_error() { echo "$1" >&2; if [[ "${GITHUB_ACTIONS:-}" == true ]]; then printf '::error title=Live verification::%s\n' "$1"; fi; }
live_notice() { echo "$1"; if [[ "${GITHUB_ACTIONS:-}" == true ]]; then printf '::notice title=Site version::%s\n' "$1"; fi; }

# Host identity: keyscan output is only a candidate and is printed for comparison.
if [[ -z "${SG_KNOWN_HOSTS:-}" ]]; then
  [[ "$mode" == probe ]] || { echo 'Missing GitHub configuration: SG_KNOWN_HOSTS' >&2; exit 1; }
  echo "SG_KNOWN_HOSTS not set. Candidate host keys for [$SG_HOST]:$SG_PORT (verify before trusting):"
  ssh-keyscan -T 20 -p "$SG_PORT" "$SG_HOST" 2>/dev/null | sort | tee "$work/scan"
  ssh-keygen -lf "$work/scan" || true
  exit 0
fi
printf '%s\n' "$SG_KNOWN_HOSTS" > "$work/known_hosts"
ssh-keygen -F "[$SG_HOST]:$SG_PORT" -f "$work/known_hosts" >/dev/null \
  || { echo "SG_KNOWN_HOSTS has no entry for [$SG_HOST]:$SG_PORT" >&2; exit 1; }

need SG_PRIVATE_KEY
# Private key, optionally protected by SG_KEY_PASSPHRASE, loaded into a private agent.
printf '%s\n' "$SG_PRIVATE_KEY" | tr -d '\r' > "$work/key"; chmod 600 "$work/key"
eval "$(ssh-agent -s -a "$work/agent.sock")" >/dev/null
if [[ -n "${SG_KEY_PASSPHRASE:-}" ]]; then
  printf '#!/bin/sh\nprintf "%%s\\n" "$SG_KEY_PASSPHRASE"\n' > "$work/askpass"; chmod 700 "$work/askpass"
  SSH_ASKPASS="$work/askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=none ssh-add "$work/key" </dev/null >/dev/null 2>&1 \
    || { echo 'Could not load SG_PRIVATE_KEY with SG_KEY_PASSPHRASE' >&2; exit 1; }
else
  ssh-add "$work/key" </dev/null >/dev/null 2>&1 || { echo 'Could not load SG_PRIVATE_KEY (passphrase needed?)' >&2; exit 1; }
fi
rm -f -- "$work/key" "$work/askpass"
unset SG_PRIVATE_KEY SG_KEY_PASSPHRASE SG_KNOWN_HOSTS

ssh_opts=(-p "$SG_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$work/known_hosts"
  -o ConnectTimeout=20 -o ServerAliveInterval=15)
remote="$SG_USER@$SG_HOST"
run_remote() {
  local output result=0 line
  output=$(ssh "${ssh_opts[@]}" "$remote" bash -s -- "$@" < scripts/siteground-remote.sh 2>&1) || result=$?
  printf '%s\n' "$output"
  if [[ "${GITHUB_ACTIONS:-}" == true ]]; then
    while IFS= read -r line; do
      case "$line" in
        'ERROR:'*) if [[ "$1" == purge-cache ]]; then printf '::warning title=SiteGround cache::%s\n' "${line//%/%25}"; else printf '::error title=SiteGround remote::%s\n' "${line//%/%25}"; fi ;;
        'Cache purge '*) printf '::notice title=SiteGround cache::%s\n' "${line//%/%25}" ;;
      esac
    done <<< "$output"
  fi
  return "$result"
}

case "$mode" in
  probe)
    run_remote probe "${SG_PATH:-}"
    if [[ -n "${SG_PATH:-}" ]]; then
      # Only presence/role/activation availability; never print private file contents.
      private_data="${SG_PATH%/public_html}/.wordyland-data"
      ssh "${ssh_opts[@]}" "$remote" "WORDYLAND_BOOTSTRAP_DATA='$private_data' php" < scripts/owner-recovery-status.php
    fi
    exit 0 ;;
  rollback)
    need SG_PATH
    run_remote rollback "$SG_PATH" "$backup"
    ;;
  deploy)
    need SG_PATH
    sha=$(git rev-parse HEAD)
    node scripts/verify-bundle.mjs
    deploy_phase=remote-status
    status=$(run_remote status "$SG_PATH")
    printf '%s\n' "$status"
    prev=$(sed -n 's/^MARKER=//p' <<<"$status" | tail -n1)
    if [[ "$prev" =~ ^[a-f0-9]{40}$ ]]; then live_notice "Server marker before verification: $prev"; fi
    if [[ "$prev" == "$sha" ]]; then
      echo "Commit $sha is already deployed; verifying the live site only."
    else
      if [[ -n "$prev" ]]; then
        git cat-file -e "$prev^{commit}" 2>/dev/null || { echo "Deployed commit $prev is unknown to this repository; refusing." >&2; exit 1; }
        if git merge-base --is-ancestor "$sha" "$prev"; then
          echo "A newer commit ($prev) is already deployed; this run is obsolete and will not overwrite it."
          exit 0
        fi
      fi
      # Bundle exactly the 36 verified files plus checksums; upload to the private directory.
      mkdir "$work/bundle"
      for f in "${FILES[@]}"; do install -m 644 "dist/$f" "$work/bundle/$f"; done
      (cd "$work/bundle" && sha256sum "${FILES[@]}" > SHA256SUMS)
      tar -C "$work/bundle" --owner=0 --group=0 -cf "$work/bundle.tar" "${FILES[@]}" SHA256SUMS
      priv="$(dirname "$SG_PATH")/.wordyland-deploy"
      ssh "${ssh_opts[@]}" "$remote" "umask 077 && test -d '$priv/incoming' && ! test -L '$priv/incoming' && cat > '$priv/incoming/$sha.tar'" < "$work/bundle.tar"
      deploy_phase=remote-install
      install_out=$(run_remote install "$SG_PATH" "$sha" "$prev") || { printf '%s\n' "$install_out"; exit 1; }
      printf '%s\n' "$install_out"
      release_backup=$(sed -n 's|^Private backup: .*/releases/||p' <<<"$install_out" | tail -n1)
      [[ -n "$release_backup" ]] || { echo 'Install did not report its backup' >&2; exit 1; }
    fi
    ;;
  *) echo "Unknown mode $mode" >&2; exit 1 ;;
esac

# Prefer Site Tools' local socket; older servers fall back to HTTP PURGE/BAN.
purge_cache() {
  local origin output result=0
  if [[ "$SITE_URL" == https://wordyland.eu ]]; then origin=http://wordyland.eu
  elif [[ "$SITE_URL" =~ ^http://127\.0\.0\.1:[0-9]+$ ]]; then origin=$SITE_URL
  else echo 'Unsupported cache origin' >&2; return 1; fi
  if [[ "$SITE_URL" == https://wordyland.eu ]]; then
    if output=$(ssh "${ssh_opts[@]}" "$remote" php < scripts/siteground-cache.php 2>&1); then
      printf '%s\n' "$output"
      if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then printf '\n### SiteGround cache\n\nSite Tools cache invalidation succeeded; dynamic cache remains enabled.\n' >> "$GITHUB_STEP_SUMMARY"; fi
      return 0
    fi
    printf '%s\n' "$output"
  fi
  output=$(run_remote purge-cache "$SG_PATH" "$origin" 2>&1) || result=$?
  printf '%s\n' "$output"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '\n### SiteGround cache\n\n' >> "$GITHUB_STEP_SUMMARY"
    printf '%s\n' "$output" | grep -E '^(Cache purge |CACHE_PURGED=|ERROR:)' >> "$GITHUB_STEP_SUMMARY" || true
  fi
  return "$result"
}
# Verify ordinary visitor URLs as well as cache-busting asset requests.
expect_sha=${sha:-}
check_health() {
  local token health
  token="verify-${GITHUB_RUN_ID:-local}-$(date +%s%N)"
  health=$(curl -fsS --retry 3 --retry-delay 5 --max-time 30 "$SITE_URL/api.php?action=health&$token") || { live_error 'Health endpoint unreachable'; return 1; }
  if [[ "$health" == *sgcaptcha* ]]; then live_error 'SiteGround anti-bot verification intercepted the health endpoint (HTML instead of JSON).'; return 1; fi
  python3 -c 'import json,sys; d=json.loads(sys.argv[1]); sys.exit(0 if d.get("ready") is True and d.get("database")=="sqlite" else 1)' "$health" 2>/dev/null \
    || { live_error 'Health check failed: the API did not confirm ready=true and database=sqlite.'; return 1; }
  echo 'Health: ready=true, database=sqlite'
}
check_files() {
  local token f want body got
  want=$(sha256sum dist/index.html | cut -d' ' -f1)
  for f in / /index.html; do
    curl -fsS --retry 2 --retry-delay 2 --max-time 30 -o "$work/live" "$SITE_URL$f" || return 1
    got=$(sha256sum "$work/live" | cut -d' ' -f1)
    if [[ "$want" != "$got" ]]; then
      if grep -q 'sgcaptcha' "$work/live"; then live_error "SiteGround anti-bot verification intercepted normal homepage $f."
      else live_error "Normal homepage $f is stale; refusing to confirm publication."; fi
      return 1
    fi
  done
  token="verify-${GITHUB_RUN_ID:-local}-$(date +%s%N)"
  for f in index.html classroom.js presence.js arena.js curriculum.json quests.css data.js worlds.js learning.js app.js accounts.js quests.js community.js arcade.css arcade.js island.css island.js island-places.webp three.min.js race-world.webp race-circuits.webp race-racers.webp manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png offline.html offline.js pwa.css pwa.js sw.js; do
    want=$(sha256sum "dist/$f" | cut -d' ' -f1)
    curl -fsS --retry 3 --retry-delay 5 --max-time 30 -o "$work/live" "$SITE_URL/$f?$token" || { live_error "Live $f unreachable"; return 1; }
    got=$(sha256sum "$work/live" | cut -d' ' -f1)
    [[ "$want" == "$got" ]] || { live_error "Live $f does not match commit $expect_sha"; return 1; }
  done
  echo "Ordinary / and /index.html match the release."
  echo "Live site serves the files of commit $expect_sha (31 static files compared byte-for-byte)."
}
if [[ "$mode" == deploy ]]; then
  deploy_phase=cache-and-live-checks
  purge_cache || echo 'Cache purge unavailable; ordinary visitor URLs must still match the release.' >&2
  if check_health && check_files; then
    echo 'Live checks passed.'
  else
    if [[ -n "${release_backup:-}" ]]; then
      echo "Live checks failed after publishing: restoring backup $release_backup." >&2
      if run_remote rollback "$SG_PATH" "$release_backup"; then
        restored_status=$(run_remote status "$SG_PATH") || restored_status=''
        restored_sha=$(sed -n 's/^MARKER=//p' <<<"$restored_status" | tail -n1)
        if [[ "$restored_sha" =~ ^[a-f0-9]{40}$ && "$restored_sha" == "$prev" ]]; then live_notice "Automatic rollback completed; verified server marker: $restored_sha"
        elif [[ -z "$prev" && -z "$restored_sha" && "$restored_status" == *MARKER=* ]]; then live_notice "Automatic rollback completed; initial unmarked site restored."
        else live_error 'Rollback returned successfully but its server marker could not be verified.'; fi
        purge_cache || echo 'Previous files restored; cache purge still failed.' >&2
      else
        live_error 'AUTOMATIC ROLLBACK FAILED - restore manually (docs/DEPLOYMENT.md)'
      fi
      check_health || echo 'Public health could not be verified after rollback; see the diagnostic above. This alone does not establish a visitor outage.' >&2
    fi
    exit 1
  fi
else
  purge_cache || echo 'Files restored; cache purge unavailable.' >&2
  check_health
fi
