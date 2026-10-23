# WordyLand

English learning adventures for children around seven, based on their own school programme.

The current pilot is a classroom game. An adult creates a private class and shares its invitation code. Each participating profile must join that class to appear in its opponent list or class festival; merely sharing an adult account is insufficient. The current account model supports up to eight profiles per adult and up to 100 participating profiles per class.

## This release

- Illustrated adventure clubhouse with responsive layouts, clearer controls and a dedicated friends arena.
- Turn-based private duels: choose a classmate in a shared invitation-only class, send an invitation, accept, answer the same 3–5 questions and compare server-verified scores. Games resume across devices and invitations expire after seven days. Sharing an adult account alone does not make another profile eligible: both must join the same class. No public player search or chat; duels do not award spendable coins or mission XP.
- Six worlds and a personal adventure passport.
- Three-step missions: picture listening, missing letters / rearranging letters, and writing.
- Server-verified experience and coins, daily reward limits, owned inventory and cosmetic avatar abilities.
- Adult signup, recovery code, password recovery, profile rename/deletion and account deletion.
- Up to eight isolated child profiles, with nicknames rather than child email addresses.
- School programmes: review proposed words from pasted text, confirm the programme, optionally attach a photo/PDF privately, then play missions using those words.
- Private weekly class leaderboard and invitation-only class groups; optional participation per profile, improvement badges and a cooperative target.
- Guest play with local progress, local coins and a local wardrobe. Guest coins are not imported into online accounts.

## Rewards

New words earn 10 XP each, up to 15 words per UTC day. The first three completed missions with newly credited words earn 15 coins, with a 5-coin bonus for overcoming a previously failed word. Replays still allow practice but do not repeatedly pay for the same words. Purchases and rewards are transactional. Requests cannot set wallet balances through the progress API.

## School materials

Paste `English = Italian` per line, or existing vocabulary words. The adult reviews the proposed programme before saving. Photos and PDFs (4 MB each, 40 MB total per adult account) are optional reference attachments outside the public directory. **Automatic OCR / AI interpretation of photos and PDFs is not implemented.** No material is sent to an external AI service.

## Hosting

PHP 8.1+ with PDO SQLite. Deploy the twelve allowlisted files in `dist/` to `public_html`, including `arena.php` and `arena.js`. Install the new modules before replacing `platform.php` and publish `index.html` last. SQLite and reference attachments live in `.wordyland-data` in the directory above `public_html`; preserve that directory across releases. Duel tables are created additively; deleting a participant profile removes its duels. Existing accounts are migrated additively and can generate a recovery code after login. New accounts receive their recovery code once. Password reset rotates the recovery code and invalidates older sessions.

Passwords are hashed, sessions use Secure/HttpOnly/SameSite Strict cookies, writes require CSRF tokens, SQL uses prepared statements, and every profile/material/group operation checks ownership or membership. Recovery is via the adult's recovery code, not email. Handwriting is checked with an adult, not automatically graded.

## Checks

```sh
node scripts/test-lessons.mjs
node scripts/verify-bundle.mjs
php -l dist/api.php
php -l dist/platform.php
php -l dist/arena.php
python3 scripts/test-api.py
```

The API suite uses temporary accounts and databases. It covers account isolation, password recovery and deletion, concurrent saves, materials access, mission payouts, replay protection, duplicate purchases, daily coin limits, group privacy and two-player duels (invitations, eligible opponents, acceptance, resume, duplicate answers, verified scores, expiry and loss of group membership).

See `docs/DEPLOYMENT.md` for deployment evidence and remaining live checks.
