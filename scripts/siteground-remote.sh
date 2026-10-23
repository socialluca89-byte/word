#!/usr/bin/env bash
# Runs ON SiteGround, streamed over SSH by scripts/deploy-siteground.sh from the
# checked-out, tested commit. It is never downloaded by the server itself.
#
# Modes:
#   probe   <target>                 read-only: paths, PHP, host keys
#   status  <target>                 prepare private dir, report deployed SHA
#   install <target> <sha> <prev>    install $priv/incoming/<sha>.tar
#   rollback <target> <backup|latest> restore application files from a backup
#
# Layout (nothing private lives inside the document root):
#   <site>/public_html                      document root (target)
#   <site>/.wordyland-deploy/               private, mode 700
#       incoming/<sha>.tar                  uploaded bundle + SHA256SUMS
#       staging/<sha>/                      verified files before install
#       releases/<UTC>-<prevsha12>/         previous application files + INFO
#       quarantine/                         stray files moved out of public_html
#       deploy.lock, current, deploy.log
set -euo pipefail
umask 077
FILES=(classroom.php arena.php api.php platform.php classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js arcade.css arcade.js island.css island.js island-places.webp three.min.js race-world.webp race-circuits.webp race-racers.webp index.html)
PHP_FILES=(classroom.php arena.php api.php platform.php)
KEEP_RELEASES=5

die() { echo "ERROR: $*" >&2; exit 1; }
mode=${1:-}; target=${2:-}

check_target() {
  [[ "$target" == /* ]] || die 'target must be absolute'
  [[ -d "$target" && ! -L "$target" ]] || die "target is not a real directory: $target"
  local real home
  real=$(realpath -e -- "$target")
  [[ "$real" == "$target" ]] || die "target resolves elsewhere ($real); use the real path"
  home=$(realpath -e -- "$HOME")
  [[ "$real" == "$home"/* ]] || die 'target is outside the hosting account'
  [[ $(basename -- "$real") == public_html && $(basename -- "$(dirname -- "$real")") == wordyland.eu ]] \
    || die 'target is not the wordyland.eu/public_html document root'
  site=$(dirname -- "$real")
  priv="$site/.wordyland-deploy"
  if [[ -e "$priv" || -L "$priv" ]]; then
    [[ -d "$priv" && ! -L "$priv" ]] || die 'private deploy directory is not a real directory'
  fi
}

prepare_priv() {
  mkdir -p -- "$priv"; chmod 700 -- "$priv"
  for d in incoming staging releases quarantine; do
    [[ ! -L "$priv/$d" ]] || die "$priv/$d is a symlink"
    mkdir -p -- "$priv/$d"
  done
}

lock() {
  exec 9>"$priv/deploy.lock"
  flock -w 120 9 || die 'another deployment holds the lock'
}

marker_value() {
  local m="$target/.wordyland-managed"
  [[ ! -L "$m" ]] || die 'deployment marker is a symlink'
  if [[ -f "$m" ]]; then
    local v; v=$(tr -d '[:space:]' < "$m")
    [[ "$v" =~ ^[0-9a-f]{40}$ ]] || die 'deployment marker has unexpected content'
    printf '%s' "$v"
  fi
}

recognise_site() {
  # Without a marker accept only the known WordyLand site or an untouched SiteGround placeholder.
  local m; m=$(marker_value)
  [[ -n "$m" ]] && return 0
  if [[ -f "$target/index.html" && -f "$target/api.php" ]] && grep -q WordyLand "$target/index.html"; then return 0; fi
  [[ -z $(find "$target" -mindepth 1 -maxdepth 1 ! -name Default.html ! -name .well-known -print -quit) ]] \
    || die 'unmarked directory with unknown content; nothing was changed'
}

quarantine_strays() {
  local found=0 f
  # No process substitution: SiteGround's shell has no /dev/fd.
  find "$target" -maxdepth 1 \( -name '*.wordyland-next' -o -name '*.wordyland-previous' -o -name '*.wordyland-tmp' \) -print0 > "$priv/strays.list"
  while IFS= read -r -d '' f; do
    found=1
    mv -n -- "$f" "$priv/quarantine/$(date -u +%Y%m%dT%H%M%SZ)-$(basename -- "$f")"
    echo "Moved stray deployment file out of public_html: $(basename -- "$f")"
  done < "$priv/strays.list"
  rm -f -- "$priv/strays.list"
  [[ $found == 1 ]] || echo 'No stray deployment files in public_html.'
}

php_checks() {
  command -v php >/dev/null || die 'php CLI not found'
  php -r 'exit(PHP_VERSION_ID >= 80100 ? 0 : 1);' || die "PHP 8.1+ required, found $(php -r 'echo PHP_VERSION;')"
  php -r 'exit(extension_loaded("pdo_sqlite") ? 0 : 1);' || die 'PDO SQLite extension missing'
  echo "PHP $(php -r 'echo PHP_VERSION;') with pdo_sqlite."
}

backup_current() {
  local prev=$1 dir f
  dir="$priv/releases/$(date -u +%Y%m%dT%H%M%SZ)-${prev:0:12}"
  [[ -n "$prev" ]] || dir="${dir}initial"
  mkdir -p -- "$dir"
  for f in "${FILES[@]}"; do
    [[ ! -L "$target/$f" ]] || die "$f in public_html is a symlink"
    if [[ -f "$target/$f" ]]; then cp -p -- "$target/$f" "$dir/$f"; fi
  done
  printf 'previous_sha=%s\ncreated=%s\n' "$prev" "$(date -u +%FT%TZ)" > "$dir/INFO"
  (cd -- "$dir" && find . -maxdepth 1 -type f ! -name INFO ! -name SHA256SUMS -printf '%P\0' | sort -z | xargs -0 -r sha256sum > SHA256SUMS)
  BACKUP_DIR=$dir
  echo "Private backup: $dir"
}

prune_releases() {
  local old
  old=$(find "$priv/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | tail -n +$((KEEP_RELEASES + 1)))
  for d in $old; do
    if [[ "$d" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-z]+$ ]]; then rm -rf -- "${priv:?}/releases/$d"; fi
  done
}

# Replace one public file by an atomic rename from the private directory (same filesystem).
publish_file() {
  local src=$1 name=$2
  [[ ! -L "$target/$name" ]] || die "$name in public_html is a symlink"
  chmod 644 -- "$src"
  mv -f -- "$src" "$target/$name"
}

write_marker() {
  printf '%s\n' "$1" > "$priv/marker.new"; chmod 644 -- "$priv/marker.new"
  [[ ! -L "$target/.wordyland-managed" ]] || die 'marker is a symlink'
  mv -f -- "$priv/marker.new" "$target/.wordyland-managed"
  printf '%s\n' "$1" > "$priv/current"
}

restore_from() {
  # Restore application files from backup dir $1 (files only, never the database).
  local dir=$1 f
  for f in "${FILES[@]}"; do
    if [[ -f "$dir/$f" ]]; then
      cp -p -- "$dir/$f" "$priv/restore.tmp"
      publish_file "$priv/restore.tmp" "$f"
    fi
  done
}

case "$mode" in
  probe)
    echo "HOME=$(realpath -e -- "$HOME")"
    for c in "$HOME/www/wordyland.eu/public_html" "$target"; do
      [[ -n "$c" && -d "$c" ]] && echo "CANDIDATE=$(realpath -e -- "$c")"
    done
    ( php_checks ) || echo 'PHP check failed'
    command -v flock >/dev/null && echo 'flock available' || echo 'flock MISSING'
    for k in /etc/ssh/ssh_host_*_key.pub; do [[ -r "$k" ]] && ssh-keygen -lf "$k"; done
    if [[ -n "$target" ]]; then check_target; echo "TARGET_OK=$target"; echo "MARKER=$(marker_value)"; fi
    ;;
  status)
    check_target; prepare_priv; lock; recognise_site; quarantine_strays; php_checks
    stat_t=$(stat -c %d -- "$target"); stat_p=$(stat -c %d -- "$priv")
    [[ "$stat_t" == "$stat_p" ]] || die 'private directory is on a different filesystem'
    echo "MARKER=$(marker_value)"
    ;;
  purge-cache)
    # SiteGround's NGINX cache accepts PURGE from the hosting server, scoped by Host.
    # Same request used by SG CachePress: PURGE /(.*), Host: the site's hostname.
    check_target; prepare_priv; lock; recognise_site
    cache_origin=${3:-http://wordyland.eu}
    [[ "$cache_origin" == http://wordyland.eu || "$cache_origin" =~ ^http://127\.0\.0\.1:[0-9]+$ ]] || die 'invalid cache origin'
    purge_ok=0
    cache_origins=("$cache_origin")
    [[ "$cache_origin" == http://wordyland.eu ]] && cache_origins+=(https://wordyland.eu)
    for cache_endpoint in "${cache_origins[@]}"; do
      for cache_path in '/(.*)' '/' '/index.html'; do
        cache_status=$(curl --noproxy '*' -sS --max-time 15 -o /dev/null -w '%{http_code}' -X PURGE -H 'Host: wordyland.eu' "$cache_endpoint$cache_path") || cache_status=000
        if [[ "$cache_status" == 200 ]]; then purge_ok=1; fi
        echo "Cache purge $cache_endpoint$cache_path: HTTP $cache_status"
      done
    done
    [[ "$purge_ok" == 1 ]] || die 'SiteGround cache purge failed'
    echo 'CACHE_PURGED=wordyland.eu'
    ;;
  install)
    sha=${3:-}; expected_prev=${4:-}
    [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die 'invalid commit sha'
    [[ -z "$expected_prev" || "$expected_prev" =~ ^[0-9a-f]{40}$ ]] || die 'invalid previous sha'
    check_target; prepare_priv; lock; recognise_site
    prev=$(marker_value)
    [[ "$prev" == "$expected_prev" ]] || die "deployed version changed during this run ($prev); aborting"
    archive="$priv/incoming/$sha.tar"; stage="$priv/staging/$sha"
    [[ -f "$archive" && ! -L "$archive" ]] || die 'uploaded bundle missing'
    rm -rf -- "$stage"; mkdir -p -- "$stage"
    tar -xf "$archive" -C "$stage" --no-same-owner --no-same-permissions
    # exactly the 23 application files plus the checksum list, all regular files
    expected=$(printf '%s\n' "${FILES[@]}" SHA256SUMS | sort)
    actual=$(cd -- "$stage" && find . -mindepth 1 -printf '%P\n' | sort)
    [[ "$expected" == "$actual" ]] || die 'bundle content differs from the expected file list'
    [[ -z $(find "$stage" -mindepth 1 ! -type f -print -quit) ]] || die 'bundle contains non-regular files'
    listed=$(awk '{print $2}' "$stage/SHA256SUMS" | sed 's/^\*//' | sort)
    [[ "$listed" == "$(printf '%s\n' "${FILES[@]}" | sort)" ]] || die 'checksum list incomplete'
    (cd -- "$stage" && sha256sum -c --quiet --strict SHA256SUMS) || die 'checksum mismatch after transfer'
    echo 'Transferred content matches checksums.'
    php_checks
    for f in "${PHP_FILES[@]}"; do php -l "$stage/$f" >/dev/null || die "PHP syntax error in $f"; done
    grep -q WordyLand "$stage/index.html" || die 'index.html is not WordyLand'
    echo 'PHP syntax verified on server.'
    BACKUP_DIR=''; backup_current "$prev"
    published=()
    install_ok=0
    rollback_on_error() {
      [[ $install_ok == 1 || ${#published[@]} == 0 ]] && return 0
      echo 'Install failed: restoring previous application files.' >&2
      local f
      for f in "${published[@]}"; do
        if [[ -f "$BACKUP_DIR/$f" ]]; then
          cp -p -- "$BACKUP_DIR/$f" "$priv/restore.tmp" && publish_file "$priv/restore.tmp" "$f"
        elif [[ -f "$target/$f" && ! -L "$target/$f" ]]; then
          mv -f -- "$target/$f" "$priv/quarantine/failed-$f"
        fi
      done
    }
    trap rollback_on_error EXIT
    for f in "${FILES[@]}"; do published+=("$f"); publish_file "$stage/$f" "$f"; done
    (cd -- "$target" && sha256sum -c --quiet --strict "$priv/staging/$sha/SHA256SUMS") || die 'published files do not match'
    install_ok=1
    write_marker "$sha"
    rm -rf -- "$stage" "$archive"
    prune_releases
    echo "$(date -u +%FT%TZ) deployed $sha (previous ${prev:-none}) backup $BACKUP_DIR" >> "$priv/deploy.log"
    echo "DEPLOYED=$sha"
    ;;
  rollback)
    which=${3:-latest}
    [[ "$which" == latest || "$which" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-z]{1,12}$ ]] || die 'invalid backup name'
    check_target; prepare_priv; lock; recognise_site
    if [[ "$which" == latest ]]; then
      which=$(find "$priv/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r | head -n1)
      [[ -n "$which" ]] || die 'no backup available'
    fi
    dir="$priv/releases/$which"; [[ -d "$dir" && ! -L "$dir" ]] || die "backup not found: $which"
    (cd -- "$dir" && sha256sum -c --quiet --strict SHA256SUMS) || die 'backup is corrupted'
    restore_sha=$(sed -n 's/^previous_sha=//p' "$dir/INFO")
    current=$(marker_value)
    BACKUP_DIR=''; backup_current "$current"
    restore_from "$dir"
    if [[ "$restore_sha" =~ ^[0-9a-f]{40}$ ]]; then
      write_marker "$restore_sha"
    elif [[ -f "$target/.wordyland-managed" ]]; then
      mv -f -- "$target/.wordyland-managed" "$priv/quarantine/marker-before-rollback"
    fi
    echo "$(date -u +%FT%TZ) rollback to $which (${restore_sha:-unknown}) from ${current:-none}" >> "$priv/deploy.log"
    echo "ROLLED_BACK_TO=${restore_sha:-$which}"
    ;;
  *) die "unknown mode: $mode" ;;
esac
