#!/usr/bin/env bash
# SiteGround runs this pinned, reviewed script; only public assets are copied.
set -euo pipefail
umask 077
repo=https://github.com/socialluca89-byte/word.git
mapfile -t roots < <(find "$HOME" -maxdepth 5 -type d -path '*/wordyland.eu/public_html' -print 2>/dev/null || true)
[[ ${#roots[@]} == 1 ]] || { echo 'Expected exactly one WordyLand document root'; exit 1; }
target=${roots[0]}
[[ ! -L "$target" ]] || exit 1
source_dir="$HOME/.wordyland-github"
mkdir -p "$source_dir"
exec 9>"$source_dir/deploy.lock"
flock -n 9 || exit 0
if [[ ! -d "$source_dir/repo.git" ]]; then git clone --bare "$repo" "$source_dir/repo.git"; fi
git_dir="$source_dir/repo.git"
[[ $(git --git-dir="$git_dir" remote get-url origin) == "$repo" ]] || exit 1
git --git-dir="$git_dir" fetch --quiet origin main
revision=$(git --git-dir="$git_dir" rev-parse FETCH_HEAD)
if [[ -f "$target/.wordyland-managed" && $(cat "$target/.wordyland-managed") == "$revision" ]]; then exit 0; fi
# Preserve SiteGround's Default.html and certificate files. Refuse other sites.
if [[ ! -f "$target/.wordyland-managed" ]]; then
  [[ -z $(find "$target" -mindepth 1 -maxdepth 1 ! -name Default.html ! -name .well-known -print -quit) ]] || { echo 'Existing site detected; deployment refused'; exit 1; }
fi
staging=$(mktemp -d "$source_dir/staging.XXXXXX")
trap 'rm -rf -- "$staging"' EXIT
files=(classroom.php arena.php api.php platform.php classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js index.html)
for file in "${files[@]}"; do
  [[ $(git --git-dir="$git_dir" ls-tree "$revision" "dist/$file") == '100644 blob '* ]] || exit 1
  git --git-dir="$git_dir" show "$revision:dist/$file" > "$staging/$file"
  [[ -s "$staging/$file" ]] || exit 1
done
php -l "$staging/api.php"
php -l "$staging/platform.php"
php -l "$staging/arena.php"
php -l "$staging/classroom.php"
php -r 'exit(extension_loaded("pdo_sqlite") ? 0 : 1);'
grep -q WordyLand "$staging/index.html"
mkdir -p "$source_dir/previous"
for file in "${files[@]}"; do
  [[ ! -L "$target/$file" && ! -L "$target/$file.wordyland-next" ]] || exit 1
  if [[ -f "$target/$file" ]]; then cp -p -- "$target/$file" "$source_dir/previous/$file"; fi
  cp -- "$staging/$file" "$target/$file.wordyland-next"
  chmod 644 "$target/$file.wordyland-next"
done
for file in "${files[@]}"; do mv -- "$target/$file.wordyland-next" "$target/$file"; done
printf '%s\n' "$revision" > "$target/.wordyland-managed"
echo "Published WordyLand $revision to $target"
