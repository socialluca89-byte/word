# SiteGround deployment

## Pending release: classroom design and classmate duels

The new design and classroom arena are implemented and validated locally; this is not a claim of publication. Opponents must share an invitation-only class; family profiles without a shared class are excluded. This release requires twelve public files, including the new `arena.php` and `arena.js`. Older ten-file archives or pinned deployment scripts omit these modules and must not be used for this release. Upload new backend modules before replacing `platform.php`, and publish `index.html` last. Preserve the private database and attachments; duel tables migrate additively.

The latest workflow uses manual publication after disabling the old cron. Do not re-enable or install recurring remote-code execution as part of this release. Verify the new assets, API health and a two-profile invitation/acceptance/game/result cycle after publication. Local browser checks cover invitation, acceptance, saved-game resume, a 50–40 result, rematch and desktop/mobile layouts; production checks remain outstanding.

## Verified account facts — 23 October 2026

- Domain: `wordyland.eu`, active on Piano hosting 10.
- Site Tools showed IP `34.1.230.193`.
- SSH credentials displayed host `ssh.wordyland.eu`, user `u696-hhgazckal0ad`, port `18765`.
- Existing imported key: `wordyland-deploy` (Ed25519).
- File Manager initially contained `public_html/Default.html` and `.well-known` only.

## Server pull deployment

A SiteGround cron job was created for `*/5 * * * *`. It downloads the reviewed pull script pinned to commit `793bac9c2a38a9ff93e0c0433d27f8799ee9aa23`, then runs it. This original script publishes the four static files only. The first release was subsequently published through SiteGround File Manager. The cron still needs diagnosis and must be updated to a reviewed commit containing the six-file deployment before automated releases can be claimed.

The latest `scripts/pull-siteground.sh` discovers exactly one WordyLand document root, refuses an existing unrelated site, stages assets, checks PHP syntax and PDO SQLite, retains previous public files privately and publishes `index.html` last. Source checkout, backups and log stay outside the public directory. Replacement is per-file, not a globally atomic release. The database stays outside `public_html` and is never overwritten by deployment.

Browser access recovered. File Manager confirmed the API upload, and `https://wordyland.eu/api.php?action=health` returned `{"ready":true,"database":"sqlite"}`. The six-file release was published and the root page at `https://wordyland.eu/` opened successfully. Live browser checks passed both the missing-preposition and full-sentence writing steps. The adult account form loaded with the guest/session status. Live registration and cross-session profile synchronization have not yet been tested. The SQLite data directory was visibly outside `public_html`. The installation archive and duplicate API copy were moved outside the public directory.

## Optional GitHub Actions SSH deployment

GitHub checks run on main and pull requests. An SSH deployment is optional and remains disabled unless `SG_PATH` is configured. Do not activate it concurrently with cron deployment.

Variables: `SG_HOST`, `SG_USER`, `SG_PORT`, `SG_PATH` (actual verified absolute public directory).
Secrets: `SG_PRIVATE_KEY`, `SG_KNOWN_HOSTS` (verified host key).

Never commit either secret. Do not disable host-key verification. The SSH script accepts only an empty directory or one carrying the WordyLand deployment marker.

## Remaining release checks

1. Verify browser account creation, profile switching and synchronization across two sessions.
2. Diagnose the existing cron, update its pinned script to the reviewed six-file version, verify a subsequent release and keep only one deployment mechanism active.
3. Add account recovery, deletion and backup/restore operations before a wider rollout.
