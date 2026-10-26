# SiteGround deployment

Production is the `main` branch. Development happens on `work` (or feature branches) and reaches production only by merging into `main`.

## How publication works

```
push to main ──► verify (tests) ──► deploy (SSH to SiteGround) ──► live checks
```

Workflow: `.github/workflows/deploy.yml` ("Verify and deploy WordyLand").

- **verify** runs on every push to `main`, on pull requests and on manual *deploy* runs: `node --check` on all JavaScript in `dist`, `bash -n` on all scripts, `scripts/test-lessons.mjs`, `scripts/test-pwa.mjs`, `scripts/test-learning.mjs`, `scripts/test-rewards.mjs`, `php -l` on all PHP in `dist`, `scripts/test-api.py`, `scripts/test-access.py`, `scripts/test-email-recovery.py`, `scripts/test-classroom.py`, `scripts/test-adventures.py`, `php -l scripts/bootstrap-admin.php`, `php -l scripts/prepare-owner-recovery.php`, `scripts/test-owner-recovery.py`, `scripts/test-community.py`, `scripts/test-presence.py`, `scripts/test-resume.py`, `scripts/test-autonomy.py`, `scripts/test-review.py`, `scripts/test-choice-fairness.py`, `php -l scripts/siteground-cache.php`, `scripts/test-cache-purge.py`, `scripts/verify-bundle.mjs` and the isolated deployment test `scripts/test-deploy.sh`.
- **browser** runs UX, feedback, resume, presence, PWA, rewards, motion, access, email recovery and scene initialization, navigation and learning autonomy and focused review Playwright journeys in disposable local PHP environments, using pinned Playwright 1.62.1. It never uses production data.
- **deploy** runs only on `refs/heads/main` (push or manual *deploy*), only after **verify** and **browser** passed and only when the repository variable `SG_PATH` is set. Pull requests never deploy.
- All production operations share the concurrency group `wordyland-production` and never cancel each other mid-run.
- Manual button (Actions → Verify and deploy WordyLand → Run workflow, branch `main`):
  - `deploy` re-publishes the current `main` (idempotent: if already deployed, it only re-checks the live site);
  - `probe` is read-only: host keys, real path, PHP version, and (when SG_PATH is set) three owner-recovery booleans, never activation contents;
  - `rollback` restores application files from a private backup (`latest` or a backup name).

The runner executes `scripts/deploy-siteground.sh` from the tested checkout. That script streams the versioned `scripts/siteground-remote.sh` over SSH (`bash -s`); the server never downloads or executes code on its own. The old SiteGround cron (pinned pull script) stays disabled and must not be re-enabled or replaced.

## What a deploy does

1. Validates `SG_PATH`: absolute, real (no symlink), inside the hosting account, ending in `wordyland.eu/public_html`.
2. Takes a remote lock (`flock`), recognises the site (marker `.wordyland-managed` with a commit SHA, or the known WordyLand files), moves any stray `*.wordyland-next` / `*.wordyland-previous` files out of the document root, checks PHP ≥ 8.1 and PDO SQLite.
3. Reads the deployed SHA. If it equals the commit, nothing is installed. If the deployed commit is newer (the commit is its ancestor), the run stops as obsolete. An unknown deployed commit is refused.
4. Uploads a tar of exactly the 39 application files plus `SHA256SUMS` to the **private** directory `wordyland.eu/.wordyland-deploy/incoming/` (outside `public_html`).
5. On the server: extracts into `.wordyland-deploy/staging/<sha>/`, checks the exact file list, checksums, `php -l` of each PHP file.
6. Backs up the current application files to `.wordyland-deploy/releases/<UTC>-<previous sha>/` (with `INFO` and `SHA256SUMS`; last 5 kept).
7. Publishes each file by atomic rename from the private directory, in this order: `community.php classroom.php arena.php training.php api.php platform.php classroom.js presence.js arena.js curriculum.json training.json quests.css data.js worlds.js learning.js app.js accounts.js quests.js community.js training.js arcade.css arcade.js island.css island.js island-places.webp three.min.js race-world.webp race-circuits.webp race-racers.webp manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png offline.html offline.js pwa.css pwa.js sw.js index.html` (new PHP modules before API/platform, `index.html` last). On any failure the already replaced files are restored from the backup and the marker is left unchanged.
8. Verifies the published checksums, then writes the commit SHA to `public_html/.wordyland-managed`.
9. First streams the private CLI-only `scripts/siteground-cache.php` over authenticated SSH. It sends SiteGround’s local Site Tools socket the `domain-all/update` request with `flush_cache=1`, domain `wordyland.eu` and path `/(.*)`, matching the current SiteGround Optimizer protocol. This invalidates cached entries and leaves Dynamic Cache enabled. No public endpoint, credentials or hosting configuration changes are needed. Only if that local service is unavailable, from the hosting server sends `PURGE /(.*)`, `PURGE /` and `PURGE /index.html` to the server-local cache, the server’s own interface or the host-provided legacy BAN endpoint with `Host: wordyland.eu`, following the SiteGround cache protocol. No public management endpoint is installed. If the hosting cache-management endpoint is unavailable, publication can succeed only if the ordinary visitor URLs already serve the exact new release (for example with Dynamic Cache disabled in Site Tools).
10. From the runner: `https://wordyland.eu/api.php?action=health` must return `{"ready":true,"database":"sqlite"}`, the ordinary `/` and `/index.html` responses must match the release, and 33 static files are fetched with a unique query string and compared byte-for-byte with the commit. If any of these HTTPS checks fails after publication, the runner immediately restores the backup taken by this deploy (files and marker), purges the restored cache, re-checks health and fails the job. The isolated deployment test also simulates a stale ordinary homepage with fresh query URLs.

11. Ordinary publication stops after the live checks. It never runs `scripts/bootstrap-admin.php`, provisions accounts, promotes users, changes passwords or generates activation/recovery credentials. The private CLI provisioning script is available only for a separately authorised owner operation; it is not installed in public_html or invoked by the workflow. The deployment regression covers both an absent owner and an existing adult owner, checking that role, password/recovery hashes, session version and private activation instructions remain unchanged.

Never replaced or removed by file deployment: `.well-known`, hosting configuration, `wordyland.eu/.wordyland-data` (SQLite database and attachments), any other file or site. The application performs additive schema initialization, and ordinary deployment does not provision or modify the owner account. Nothing temporary, archived or backed up is ever written inside `public_html`.

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

## Cache protocol source

SiteGround Optimizer’s current `Supercacher::flush_dynamic_cache` and `Site_Tools_Client::call_site_tools_client` use the local UNIX socket `/chroot/tmp/site-tools.sock`, newline-delimited JSON and the domain-scoped request above. The SSH chroot may expose it as `/tmp/site-tools.sock`. Reviewed source mirrors: https://github.com/common-repository/sg-cachepress/blob/main/core/Supercacher/Supercacher.php and https://github.com/common-repository/sg-cachepress/blob/main/core/Site_Tools_Client/Site_Tools_Client.php. The deploy does not download or execute that plugin; the small versioned client only implements this protocol. Socket rejection/malformed replies do not confirm publication: the ordinary `/` and `/index.html` must still match the release byte-for-byte.

PWA/offline behavior and update instructions are documented in PWA.md. The worker caches only the dedicated public revision files. Account and classroom API responses must never enter CacheStorage. The release generator versions both offline content and the registration URL; keep `sw.js` before `index.html` in the publish order and verify the full allowlist.


## Public diagnostics for failed live checks

GitHub annotations now distinguish a hosting anti-bot HTML challenge, an unavailable health endpoint, invalid health JSON, and an outdated ordinary homepage or asset. Only fixed diagnostics and validated commit SHAs are published; health response bodies are not printed. A successful automatic rollback is confirmed by reading the server marker and comparing it to the pre-deployment marker; an unverifiable recovery is reported as an error. The isolated deploy suite simulates an HTML hosting challenge and verifies both restored files and marker. Protection responses remain failures; no check is skipped and no hosting protection is disabled.

## Optional account email recovery

See [ACCOUNT_RECOVERY.md](ACCOUNT_RECOVERY.md). Delivery is disabled unless a private hosting configuration explicitly enables it. Test transports and synthetic outboxes are unavailable in production. The read-only owner recovery diagnostic is CLI-only, is never installed in public_html and has not been run against production. Enabling mail or resetting the real owner requires the owner’s specific confirmation.

Owner-recovery preparation remains a separate CLI-only operation requiring specific owner confirmation; ordinary deployment and probe never call it. See ACCOUNT_RECOVERY.md.

## Hosting incident: verification is not an outage diagnosis

Run 40128858645 returned SiteGround's `sgcaptcha` HTML at public health instead of the required JSON. The pipeline refused confirmation and verified rollback marker `22f2d6028b87c0ae22029eaa211c148a7964ef69`. This proves that the runner could not verify the API through that response; it does not prove that ordinary visitors were unable to play. A second intercepted check after rollback must remain described as unverified health, not as a confirmed visitor outage.

Before another production attempt, obtain the hosting rule/reason and an approved resolution from SiteGround or the account owner using their existing Site Tools access. Correlate the failed run time 2026-10-24 20:16:49 UTC with the hosting security log; do not expose credentials, cookies or children's data. No authenticated hosting log access is available in this runtime, so the rule/root cause is not established. Do not disable protections, simulate challenge cookies, change egress to evade the rejection, weaken JSON/checksum checks, or trigger new main pushes merely to retry. Keep independently tested changes on work until there is relevant new evidence. Existing checks and automatic rollback stay in force.

## Standalone readiness diagnostic — prepared on work

See [READ_ONLY_READINESS.md](READ_ONLY_READINESS.md). scripts/read-only-readiness.sh streams only the private read-only PHP diagnostic over one existing authenticated SSH connection, with strict host checking and fixed project scope. It is not invoked by deployment or the multi-runner probe. Its synthetic unit test and PHP lint are added to the future verify job. The single-runner workflow is only a review template under docs, not an active workflow. Never register it by a main push while the production hold remains, and never treat synthetic results as live account/mail evidence.

## Training assets prepared on work (not deployed)

The reviewed bundle now contains 39 public application files, adding training.php, training.js and training.json. Both runner and remote allowlists include them; training.php precedes api.php, index.html remains last, 33 static assets are checked over HTTPS. The isolated deploy/rollback suite passed with this allowlist; this does not confirm a production deploy. The catalog URL is hashed in training.js, and all private APIs remain excluded from the offline cache. New training-only schema does not change game wallets, credits, rewards or standings. See TRAINING_SPELLING.md.

## Preflight pubblico prima di SSH (preparato il26ottobre)

Il modo deploy ora verifica per primo l'health pubblico, prima di caricare credenziali SSH o eseguire operazioni remote. Il rifiuto/intercettazione blocca il run senza upload/install/cache purge; nessun retry nel preflight. Controlli dopo installazione e rollback restano obbligatori. Probe/rollback non cambiano. Vedi [ripresa del26ottobre](RELEASE_2026_10_26.md) per evidenze e differenza fra test/cloud/CI/live. Le prove fittizie coprono sia un problema già presente sia uno comparso dopo l'installazione; non è un'esenzione per l'anti-bot.
