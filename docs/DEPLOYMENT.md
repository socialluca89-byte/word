# SiteGround deployment

Production is the `main` branch. Development happens on `work` (or feature branches) and reaches production only by merging into `main`.

## How publication works

```
push to main ──► verify (tests) ──► deploy (SSH to SiteGround) ──► live checks
```

Workflow: `.github/workflows/deploy.yml` ("Verify and deploy WordyLand").

- **verify** runs on every push to `main`, on pull requests and on manual *deploy* runs: `node --check` on all JavaScript in `dist`, `bash -n` on all scripts, `scripts/test-lessons.mjs`, `php -l` on all PHP in `dist`, `scripts/test-api.py`, `scripts/test-classroom.py`, `scripts/verify-bundle.mjs` and the isolated deployment test `scripts/test-deploy.sh`.
- **deploy** runs only on `refs/heads/main` (push or manual *deploy*), only after **verify** passed and only when the repository variable `SG_PATH` is set. Pull requests never deploy.
- All production operations share the concurrency group `wordyland-production` and never cancel each other mid-run.
- Manual button (Actions → Verify and deploy WordyLand → Run workflow, branch `main`):
  - `deploy` re-publishes the current `main` (idempotent: if already deployed, it only re-checks the live site);
  - `probe` is read-only: host keys, real path, PHP version;
  - `rollback` restores application files from a private backup (`latest` or a backup name).

The runner executes `scripts/deploy-siteground.sh` from the tested checkout. That script streams the versioned `scripts/siteground-remote.sh` over SSH (`bash -s`); the server never downloads or executes code on its own. The old SiteGround cron (pinned pull script) stays disabled and must not be re-enabled or replaced.

## What a deploy does

1. Validates `SG_PATH`: absolute, real (no symlink), inside the hosting account, ending in `wordyland.eu/public_html`.
2. Takes a remote lock (`flock`), recognises the site (marker `.wordyland-managed` with a commit SHA, or the known WordyLand files), moves any stray `*.wordyland-next` / `*.wordyland-previous` files out of the document root, checks PHP ≥ 8.1 and PDO SQLite.
3. Reads the deployed SHA. If it equals the commit, nothing is installed. If the deployed commit is newer (the commit is its ancestor), the run stops as obsolete. An unknown deployed commit is refused.
4. Uploads a tar of exactly the 19 application files plus `SHA256SUMS` to the **private** directory `wordyland.eu/.wordyland-deploy/incoming/` (outside `public_html`).
5. On the server: extracts into `.wordyland-deploy/staging/<sha>/`, checks the exact file list, checksums, `php -l` of each PHP file.
6. Backs up the current application files to `.wordyland-deploy/releases/<UTC>-<previous sha>/` (with `INFO` and `SHA256SUMS`; last 5 kept).
7. Publishes each file by atomic rename from the private directory, in this order: `classroom.php arena.php api.php platform.php classroom.js arena.js curriculum.json quests.css data.js worlds.js app.js accounts.js quests.js arcade.css arcade.js race-world.webp race-circuits.webp race-racers.webp index.html` (new PHP modules before API/platform, `index.html` last). On any failure the already replaced files are restored from the backup and the marker is left unchanged.
8. Verifies the published checksums, then writes the commit SHA to `public_html/.wordyland-managed`.
9. From the runner: `https://wordyland.eu/api.php?action=health` must return `{"ready":true,"database":"sqlite"}`, and 15 static files are fetched with a unique query string and compared byte-for-byte with the commit. If any of these HTTPS checks fails after publication, the runner immediately restores the backup taken by this deploy (files and marker), re-checks health and fails the job.

Never touched: `.well-known`, hosting configuration, `wordyland.eu/.wordyland-data` (SQLite database and attachments), any other file or site. Nothing temporary, archived or backed up is ever written inside `public_html`.

## Configuration (names only — never commit values)

Repository variables: `SG_HOST`, `SG_USER`, `SG_PORT`, `SG_PATH` (absolute path of `wordyland.eu/public_html`; setting it enables deploy).

Repository secrets: `SG_PRIVATE_KEY` (dedicated deploy key, generated in SiteGround SSH Keys Manager), `SG_KEY_PASSPHRASE` (its password, if any), `SG_KNOWN_HOSTS` (OpenSSH line(s) for `[host]:port`). Host-key checking is always strict. `SG_KNOWN_HOSTS` must be confirmed through a channel independent of the GitHub runner's SSH connection (e.g. `ssh-keyscan` from another network, or fingerprints from SiteGround support) before `SG_PATH` is set.

## Restore procedure

Application files only; the database is never restored automatically. Schema migrations are additive, so older application files keep working with the current database.

1. Actions → Verify and deploy WordyLand → Run workflow → branch `main`, mode `rollback`, backup `latest` (or a name from `.wordyland-deploy/releases/`).
2. The current files are backed up first, then the chosen backup is verified against its `SHA256SUMS` and restored; the marker returns to that backup's commit and the health check runs.
3. To return to `main`, run mode `deploy` (or push a fix to `main`).

## Instructions for future agents (Codex, Cowork, …)

- Use the platform's Git HTTPS access to `socialluca89-byte/word`; work on the real files in the repository, never on ZIPs or uploads to SiteGround.
- After changing JavaScript or CSS run `node scripts/version-assets.mjs` and commit the updated `dist/index.html` (the bundle check verifies asset hashes; do not disable it).
- Run all checks listed under **verify** before merging.
- Merge into `main` only changes the user authorised; no force push, no history rewrite.
- After merging, open the Actions run for the new `main` commit and confirm the **deploy** job ran (not skipped), the live checks passed and `.wordyland-managed` shows the commit SHA.
- Do not create cron jobs, public deploy endpoints or alternative upload paths; do not weaken host-key checking or tests.

## Verified account facts

- Domain `wordyland.eu`, SiteGround Site Tools, site IP `34.1.230.193`; `ssh.wordyland.eu` resolves to the same IP.
- SSH (Site Tools → Devs → SSH Keys Manager → SSH credentials): host `ssh.wordyland.eu`, port `18765`.
- Document root (`SG_PATH`): `/home/customer/www/wordyland.eu/public_html` (confirmed by the read-only probe, 23 Oct 2026). PHP CLI on the server: 8.2 with pdo_sqlite.
- SSH host key, confirmed identical by separate `ssh-keyscan` connections from three networks (Linux, macOS and Windows runners, distinct public IPs), independent of the authenticated deploy connection: ED25519 `SHA256:aC0WvaEyDmmwRhl9ng1EGeaHqkvuwYt8oyHaClfTbKA`, RSA `SHA256:qYhSKxCHzVeKx3GJbRqYSAP39zdSaMpDJgdxmmwkyS4`. Re-run the `probe` mode to compare if the server changes.
- Deploy key in SiteGround: `github-actions-deploy` (private part only in the `SG_PRIVATE_KEY` secret).
- Database and attachments live in `wordyland.eu/.wordyland-data`, outside the document root.
- The old cron (`*/5 * * * *`, downloads `pull-siteground.sh` at commit `793bac9`) is commented out with `# DISATTIVATO` and must stay that way.
