# Private progress for a learner with a separate classroom account

An already registered adult opens **Area adulti → Genitori · progressi di un alunno della classe** and explicitly generates a private pairing code. The code expires after 15 minutes, is stored only as a SHA-256 hash, and is replaced when another code is generated. The raw code appears only in that response and the open page; it is never put in a URL or browser storage.

The current class owner verifies the adult's relationship and authorization outside the application, selects a learner currently enrolled in that class, and confirms the authorization. WordyLand does not establish legal guardianship from an email, nickname, shared class link, or possession of a pairing code. The resulting invitation is already bound to that adult account; another adult cannot claim it. The intended adult sees it in their own account and must explicitly accept the readonly scope within 24 hours. There are no token-bearing invitation URLs, automatic emails, new accounts, or credential changes.

## Scope and retention

The guardian dashboard reads only aggregate online progress through separate `guardian-*` endpoints. It never adds the learner to the adult's owned profiles or selects the learner as the active player. Existing `ownedProfile` checks and classroom access remain unchanged. Guardians cannot read classmates, source words, custom materials, attachments, raw state, wallets, password data, or class invitations, nor edit the learner or play as that learner.

- Missions and Training use 90 UTC calendar dates, including today and the preceding 89 dates. Future dated training rows are excluded. Missing source tables are reported as unavailable rather than fabricated zero activity.
- Guided phonics uses a separate cohort: paths **started in the last 30 UTC calendar dates and concluded by now**. This matches the existing session retention. It is explicitly not a lifetime total, a complete 90 day total, a pronunciation assessment, or an exam readiness score. If the source is absent, its count is unavailable/null.
- Guest progress and public offline practice are not imported or included. Counts reflect only their stated online sources; no comparison between children or mastery diagnosis is introduced.

Either the authorized adult or the authorizing class owner can revoke the capability. Current owners, membership, roles, scope, and the target account are checked for every read. Removing class membership cascades the capability away, and re-enrollment does not restore it. Namespaced SQLite triggers modify only guardian tables: changing and restoring a class owner, account role, or profile owner permanently invalidates existing capabilities. Reissue requires a new pairing/authorization/acceptance; version checks prevent a stale form from accepting or revoking a later invitation. Invitation IDs are not recycled.

## Validation and limits

`scripts/test-guardian.py` verifies CSRF, IDOR, roles, expiration, hashed codes, readonly responses, unchanged owned-profile boundaries,90/30 day boundaries, monotonic revocation, membership removal/re-enrollment, version/replay behavior, rate limits, and two-server acceptance/code races. Controlled snapshot/role scheduling barriers exist only in a disposable test copy, never in application PHP. Authorization and metadata are read in one SQLite snapshot; an old class owner cannot receive freshly renamed metadata after concurrent revocation. The API session verification cursor is explicitly closed before subsequent writes to avoid conflicting SQLite lock upgrades.

`scripts/test-guardian-browser.cjs` uses synthetic manager, parent, other adult, and learner accounts. It covers both explicit confirmations, keyboard actions, volatile codes, one POST after a lost acceptance response and double-click, manual GET reconciliation, readonly progress without switching profiles, revocation, late response after logout/account switch, and 320/390/768/1360 pixel widths. Preview captures contain synthetic data only.

No real learner records, production credentials, email deliveries, or account recovery/reset operations were used for development or validation. The actual family relationship still requires the class owner's external verification. These local results do not establish live publication or prove real email delivery. Email recovery remains independently opt-in through its existing private configuration; this feature sends no email.
