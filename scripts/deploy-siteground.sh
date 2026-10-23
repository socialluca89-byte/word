#!/usr/bin/env bash
set -euo pipefail
for name in SG_HOST SG_USER SG_PORT SG_PATH SG_PRIVATE_KEY SG_KNOWN_HOSTS; do
  if [[ -z "${!name:-}" ]]; then echo "Missing GitHub configuration: $name" >&2; exit 1; fi
done
[[ "$SG_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 1
[[ "$SG_USER" =~ ^[a-zA-Z0-9_-]+$ ]] || exit 1
[[ "$SG_PORT" =~ ^[0-9]+$ ]] || exit 1
[[ "$SG_PATH" =~ ^/[a-zA-Z0-9_./-]+$ && "$SG_PATH" != *'..'* && "$SG_PATH" != / && "$SG_PATH" != /home && "$SG_PATH" != /www ]] || { echo 'Invalid deployment directory' >&2; exit 1; }
node scripts/verify-bundle.mjs
key_dir=$(mktemp -d)
trap 'rm -rf -- "$key_dir"' EXIT
chmod 700 "$key_dir"
printf '%s\n' "$SG_PRIVATE_KEY" > "$key_dir/key"
printf '%s\n' "$SG_KNOWN_HOSTS" > "$key_dir/known_hosts"
chmod 600 "$key_dir/key" "$key_dir/known_hosts"
unset SG_PRIVATE_KEY SG_KNOWN_HOSTS
ssh_args=(-i "$key_dir/key" -p "$SG_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$key_dir/known_hosts" -o ConnectTimeout=20)
remote="$SG_USER@$SG_HOST"
# Refuse to write into an existing site unless already marked as WordyLand.
ssh "${ssh_args[@]}" "$remote" bash -s -- "$SG_PATH" <<'REMOTE'
set -euo pipefail
target=$1
[[ ! -L "$target" ]] || { echo 'Deployment target must not be a symlink'; exit 1; }
mkdir -p -- "$target"
if [[ ! -f "$target/.wordyland-managed" && -n "$(find "$target" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo 'Target contains an existing site. Choose an empty directory; nothing was overwritten.' >&2
  exit 1
fi
touch "$target/.wordyland-managed"
REMOTE
# Transfer only the verified public bundle; never a repository or configuration file.
# index.html is copied last so a failed asset transfer cannot publish a new page.
for file in classroom.php arena.php api.php platform.php classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js index.html; do
  scp -i "$key_dir/key" -P "$SG_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$key_dir/known_hosts" "dist/$file" "$remote:$SG_PATH/$file.wordyland-next"
done
ssh "${ssh_args[@]}" "$remote" bash -s -- "$SG_PATH" <<'REMOTE'
set -euo pipefail
cd -- "$1"
for file in classroom.php arena.php api.php platform.php classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js index.html; do
  [[ -f "$file.wordyland-next" ]] || exit 1
done
for file in classroom.php arena.php api.php platform.php classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js index.html; do
  if [[ -f "$file" ]]; then cp -p -- "$file" "$file.wordyland-previous"; fi
  mv -- "$file.wordyland-next" "$file"
  chmod 644 "$file"
done
printf '%s\n' 'WordyLand static bundle deployed.'
REMOTE
