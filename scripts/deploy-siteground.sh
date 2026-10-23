#!/usr/bin/env bash
# GitHub Actions side of the SiteGround deployment.
# Usage: deploy-siteground.sh deploy|probe|rollback [backup-name]
# Runs the versioned scripts/siteground-remote.sh from this checkout over SSH;
# nothing is downloaded or executed from elsewhere.
set -euo pipefail
mode=${1:-deploy}; backup=${2:-latest}
cd "$(dirname "$0")/.."
FILES=(classroom.php arena.php api.php platform.php classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js index.html)
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
cleanup() { [[ -n "${SSH_AGENT_PID:-}" ]] && ssh-agent -k >/dev/null 2>&1 || true; rm -rf -- "$work"; }
trap cleanup EXIT

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
run_remote() { ssh "${ssh_opts[@]}" "$remote" bash -s -- "$@" < scripts/siteground-remote.sh; }

case "$mode" in
  probe)
    run_remote probe "${SG_PATH:-}"
    exit 0 ;;
  rollback)
    need SG_PATH
    run_remote rollback "$SG_PATH" "$backup"
    ;;
  deploy)
    need SG_PATH
    sha=$(git rev-parse HEAD)
    node scripts/verify-bundle.mjs
    status=$(run_remote status "$SG_PATH")
    printf '%s\n' "$status"
    prev=$(sed -n 's/^MARKER=//p' <<<"$status" | tail -n1)
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
      # Bundle exactly the 14 verified files plus checksums; upload to the private directory.
      mkdir "$work/bundle"
      for f in "${FILES[@]}"; do install -m 644 "dist/$f" "$work/bundle/$f"; done
      (cd "$work/bundle" && sha256sum "${FILES[@]}" > SHA256SUMS)
      tar -C "$work/bundle" --owner=0 --group=0 -cf "$work/bundle.tar" "${FILES[@]}" SHA256SUMS
      priv="$(dirname "$SG_PATH")/.wordyland-deploy"
      ssh "${ssh_opts[@]}" "$remote" "umask 077 && test -d '$priv/incoming' && ! test -L '$priv/incoming' && cat > '$priv/incoming/$sha.tar'" < "$work/bundle.tar"
      install_out=$(run_remote install "$SG_PATH" "$sha" "$prev") || { printf '%s\n' "$install_out"; exit 1; }
      printf '%s\n' "$install_out"
      release_backup=$(sed -n 's|^Private backup: .*/releases/||p' <<<"$install_out" | tail -n1)
      [[ -n "$release_backup" ]] || { echo 'Install did not report its backup' >&2; exit 1; }
    fi
    ;;
  *) echo "Unknown mode $mode" >&2; exit 1 ;;
esac

# Live checks against the public site with unique cache-busting queries.
expect_sha=${sha:-}
check_health() {
  local token health
  token="verify-${GITHUB_RUN_ID:-local}-$(date +%s%N)"
  health=$(curl -fsS --retry 3 --retry-delay 5 --max-time 30 "$SITE_URL/api.php?action=health&$token") || { echo 'Health endpoint unreachable' >&2; return 1; }
  echo "Health: $health"
  python3 -c 'import json,sys; d=json.loads(sys.argv[1]); sys.exit(0 if d.get("ready") is True and d.get("database")=="sqlite" else 1)' "$health" \
    || { echo 'Health check failed' >&2; return 1; }
}
check_files() {
  local token f want body got
  token="verify-${GITHUB_RUN_ID:-local}-$(date +%s%N)"
  for f in index.html classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js; do
    want=$(sha256sum "dist/$f" | cut -d' ' -f1)
    curl -fsS --retry 3 --retry-delay 5 --max-time 30 -o "$work/live" "$SITE_URL/$f?$token" || { echo "Live $f unreachable" >&2; return 1; }
    got=$(sha256sum "$work/live" | cut -d' ' -f1)
    [[ "$want" == "$got" ]] || { echo "Live $f does not match commit $expect_sha" >&2; return 1; }
  done
  echo "Live site serves the files of commit $expect_sha (10 static files compared byte-for-byte)."
}
if [[ "$mode" == deploy ]]; then
  if check_health && check_files; then
    echo 'Live checks passed.'
  else
    if [[ -n "${release_backup:-}" ]]; then
      echo "Live checks failed after publishing: restoring backup $release_backup." >&2
      run_remote rollback "$SG_PATH" "$release_backup" || echo 'AUTOMATIC ROLLBACK FAILED - restore manually (docs/DEPLOYMENT.md)' >&2
      check_health || echo 'Site still unhealthy after rollback.' >&2
    fi
    exit 1
  fi
else
  check_health
fi
