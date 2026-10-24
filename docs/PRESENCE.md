# Class roster and foreground presence

Open `https://wordyland.eu/#iscritti`, also linked in the adult menu, the admin dashboard and the Arena. The Arena displays availability beside each opponent and prioritizes ready players. Its list of invitations/results updates automatically without resetting a selected topic, activity or opponent, or replacing an active game.

## Scope and registration dates

Learners see their own profile and classmates only. Adults see their own profiles and members of their managed/joined classes. A peer's memberships in unrelated classes are not disclosed. Email/username, account role and account creation date are reserved for the administrator's global roster. `scope=all` is enforced server-side and rejected for other roles.

Administrators can filter all profiles, online profiles and **Iscritti oggi**. The latter means learner accounts created since midnight in **Europe/Rome**. Adult-owned profiles do not have their own creation timestamps in the legacy schema, so their displayed date is explicitly “Account dal”; they are not counted as new learner registrations. Counts distinguish total profiles, online profiles, ready profiles and new learners today. Lists are paginated in groups of 20.

Do not invent production names/counts from fixtures or infer them from the repository. Actual rosters require an authenticated account through the API/UI. API responses remain `Cache-Control: no-store`; the offline worker does not intercept or cache them.

## What the states mean

- **Online:** a selected authenticated profile has the app in a foreground tab with a recent server heartbeat.
- **Pronto a giocare:** the player explicitly checked “Sono pronto a una sfida”.
- **In partita:** the foreground tab is showing an active learning question or duel. Busy takes priority over ready when a profile has multiple foreground tabs.
- **Non online:** no valid lease received within 90 seconds.
- **Stato non aggiornato:** the most recent refresh failed; the interface does not assert availability from a failed request.

An open browser does not imply willingness to accept an invitation. Ready is opt-in, kept only in memory, reset on profile/account changes, hidden pages and network loss. Presence is not a guarantee that a child will accept. Duels remain turn-based and can also be answered later.

## Lifecycle and security

`presence.js` sends one heartbeat every 25 seconds while the app is visible and connected. State transitions update sooner. A hidden/closed page attempts an authenticated CSRF-protected keepalive release and stops polling; abrupt disconnects expire within 90 seconds. The server owns timestamps, verifies profile ownership, hashes the PHP session ID, binds each tab lease to the account's session version and caps concurrent tabs per session. Raw session/tab keys and precise last-seen timestamps never appear in roster/Arena responses.

Multiple tabs share account authentication but have separate random tab keys. Releasing a tab does not remove another tab's lease. Logout clears all leases for that server session. Password recovery/session invalidation immediately excludes old-version leases from presence queries. Profile/account deletion cascades to leases. Stale lease rows are removed on subsequent heartbeats; no historical online timeline is stored.

## Verification

`python3 scripts/test-presence.py` is required in CI: authentication/CSRF, foreign profile denial, class/email isolation, global/today filters, multi-tab precedence/release, stale expiry, logout, session invalidation, per-session cap and deletion cleanup.

The reusable isolated browser runner is `bash scripts/test-browser.sh presence`. It copies `dist` to a temporary public directory, starts a local PHP server with a disposable database/session directory, runs the browser test, then removes the fixture. It also accepts `pwa`, `community`, `characters` and `school`. Set `WORDYLAND_PLAYWRIGHT_MODULE` and `WORDYLAND_CHROMIUM` for an existing installation; optional `WORDYLAND_BROWSER_SCREENSHOT` captures only fixture data.

The browser test accelerates only its own polling interval and exercises two class players plus an outsider, ready/online/busy transitions, selection preservation, automatic invite/accept updates, visibility pause, logout, admin filters and narrow screens. It never signs into production or sends invitations to real pupils.


## Guests, accounts and saved game activity

The roster explicitly labels its server-authorized scope: global administrator or own classes. It shows the current account, and distinguishes registered profiles from accounts without profiles. Only the administrator receives global account totals and the count of accounts with no player profile; a link points to the existing Account dashboard.

The administrator-only `played` filter and count cover confirmed mission attempts (including wrong answers), completed mission rewards and duel answers. The UI calls these mission/duel activities; absence of such activity is not proof that someone never practiced through an older local exercise mode. The default view still lists all registered profiles. Other roles cannot use this filter or receive per-profile activity flags.

Anonymous guest play remains local to that browser and is not an account or enrollment. No guest tracking has been added and past guest identities cannot be recovered from the server. The home screen explains this and tells families to use their class enrollment link. A signed-in adult without a selected profile gets a profile-selection prompt. The configured owner admin account is `luca@perrone.it`; a guest name or another email does not automatically confer its privileges.

API/browser tests cover role scope, activity filtering, registration without a profile, wrong-answer activity, guest notices and absence of diagnostic fields in class-only responses.
