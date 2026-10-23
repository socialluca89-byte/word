# SiteGround deployment

## Verified account facts — 23 October 2026

- Domain: `wordyland.eu`, active on Piano hosting 10.
- Site Tools showed IP `34.1.230.193`.
- SSH credentials displayed host `ssh.wordyland.eu`, user `u696-hhgazckal0ad`, port `18765`.
- Existing imported key: `wordyland-deploy` (Ed25519).
- File Manager initially contained `public_html/Default.html` and `.well-known` only.

## Server pull deployment

A SiteGround cron job was created for `*/5 * * * *`. It downloads the reviewed pull script pinned to commit `793bac9c2a38a9ff93e0c0433d27f8799ee9aa23`, then runs it. This original script publishes the four static files only. **The first publication has not been verified. The cron must be updated to a reviewed commit containing the new six-file deployment before it can deploy accounts.**

The latest `scripts/pull-siteground.sh` discovers exactly one WordyLand document root, refuses an existing unrelated site, stages assets, checks PHP syntax and PDO SQLite, retains previous public files privately and publishes `index.html` last. Source checkout, backups and log stay outside the public directory. Replacement is per-file, not a globally atomic release. The database stays outside `public_html` and is never overwritten by deployment.

Browser upload of the API timed out. Its final state is unknown. Check the File Manager and `https://wordyland.eu/api.php?action=health` before retrying; a successful health result is `ready: true`. The cloud browser stopped responding even to recovery. No completed public deployment or live database operation is claimed.

## Optional GitHub Actions SSH deployment

GitHub checks run on main and pull requests. An SSH deployment is optional and remains disabled unless `SG_PATH` is configured. Do not activate it concurrently with cron deployment.

Variables: `SG_HOST`, `SG_USER`, `SG_PORT`, `SG_PATH` (actual verified absolute public directory).
Secrets: `SG_PRIVATE_KEY`, `SG_KNOWN_HOSTS` (verified host key).

Never commit either secret. Do not disable host-key verification. The SSH script accepts only an empty directory or one carrying the WordyLand deployment marker.

## Remaining release checks

1. Verify server-side PHP/PDO SQLite availability and database creation outside the public directory.
2. Publish all six files in `dist/` and verify the root page and API over HTTPS.
3. Verify browser account creation, profile switching and synchronization across two sessions.
4. Update the cron’s pinned script to the reviewed six-file version, verify a subsequent release and keep only one deployment mechanism active.
5. Add account recovery, deletion and backup/restore operations before a wider rollout.
