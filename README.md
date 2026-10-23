# WordyLand

English learning adventures for children around seven, based on their own school programme.

The current pilot is one private classroom. An adult creates the class once, then shares its stable signup link (`#classe=…`). Pupils opening that link see the class already selected and register with a nickname and password; a personal learner profile is created and enrolled automatically. No email or separate adult account is needed for each pupil. Returning pupils use the same link and credentials. Nicknames are unique within the class, case-insensitively. The class supports up to 100 participating profiles; pupils have individual accounts and are not subject to the eight-profiles-per-adult limit.

## One class, one signup link

1. Sign in to the adult area, choose an adult-managed profile, and create the class once.
2. In the class section, select **Mostra link della classe**. The same link is returned on subsequent visits and only the class owner may retrieve it. Existing classes acquire a stable link without invalidating their earlier invitation code.
3. Share that link with the class. Pupils choose a nickname (3–20 letters/digits, `_` or `-`) and password (12–72 characters), acknowledge participation, and enter their class automatically. Only nicknames, avatars and scores are shown to classmates.
4. Save each pupil's one-time recovery code with an adult. The same link provides password recovery and rotates used recovery codes. Signing out clears the on-screen code; no passwords are stored in browser storage.

Learner accounts may play, save progress and challenge classmates; they cannot create classes, retrieve class links, add profiles, rename their login nickname or use adult material-management endpoints. The server enforces this separation. Adult accounts and existing profiles remain compatible with an additive database migration.

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

PHP 8.1+ with PDO SQLite. Deploy the fourteen allowlisted files in `dist/` to `public_html`, including `classroom.php`, `classroom.js`, `arena.php` and `arena.js`. Install the new modules before replacing API/platform files and publish `index.html` last. SQLite and reference attachments live in `.wordyland-data` in the directory above `public_html`; preserve that directory across releases. Schema changes are additive; deleting a learner account removes its enrollments and duels. Existing accounts retain the adult role and their profiles. Password reset rotates the recovery code and invalidates older sessions.

Passwords are hashed, sessions use Secure/HttpOnly/SameSite Strict cookies, writes require CSRF tokens, SQL uses prepared statements, and every profile/material/group operation checks ownership or membership. Recovery is via the adult's recovery code, not email. Handwriting is checked with an adult, not automatically graded.

## Checks

```sh
node scripts/test-lessons.mjs
node scripts/verify-bundle.mjs
php -l dist/api.php
php -l dist/platform.php
php -l dist/arena.php
php -l dist/classroom.php
python3 scripts/test-api.py
python3 scripts/test-classroom.py
```

The suites use temporary accounts and databases. They cover account isolation, recovery and deletion, concurrent saves, materials, rewards, purchases, private duels, legacy migrations, class-link enrollment and learner permissions. After editing browser assets, run `node scripts/version-assets.mjs` and commit the updated HTML; bundle verification checks the content hashes so returning browsers load the correct JavaScript and styles.

See `docs/DEPLOYMENT.md` for deployment evidence and remaining live checks.
