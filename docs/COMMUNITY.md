# Class management, feedback and owner administration

Entry links for the updated application:

- `https://wordyland.eu/#iscritti`: authenticated class roster and live presence; administrators can view all profiles and learner accounts registered today (Europe/Rome). See PRESENCE.md.

- `https://wordyland.eu/#classe-crea`: sign in as an adult, choose/create an owned profile, create a class or retrieve one of your class links.
- `https://wordyland.eu/#sfide`: opens the existing Arena tab. Select a classmate to invite. Both players must have profiles enrolled in the same class; server-side permissions and scoring remain authoritative.
- `https://wordyland.eu/#segnalazioni`: authenticated adults and pupils can send bugs or suggestions and follow the status of their own reports.
- `https://wordyland.eu/#admin`: global account/profile/class/duel views and feedback management, restricted to server-provisioned administrators.

These are screen links, not enrollment codes. The real enrollment link is returned by the server after creating a class and ends in `#classe=<24-hex-code>`. An administrator can retrieve links for any class; an adult can retrieve only their own. The persistent navigation exposes all four screens, including on mobile.

## Owner account

The authorized owner email is `luca@perrone.it`. Knowing this email does not grant privileges: public registration reserves this identity, request bodies cannot set a role, and dashboard endpoints verify the role in the database. Login supports legacy usernames and email addresses.

After a successful deployment and all live checks, GitHub Actions streams `scripts/bootstrap-admin.php` through the authenticated SSH connection. This script stays outside the public bundle. It uses the existing private SQLite database and is idempotent. For an existing adult owner account it preserves password and recovery hash, upgrades the role and invalidates old sessions. It refuses to promote a learner.

If the owner account does not exist, the helper creates an admin with an unknown random password and saves a one-time activation link in:

`/home/customer/www/wordyland.eu/.wordyland-data/admin-activation.txt`

The file is private (0600), outside `public_html`; neither the token nor a password is printed in deployment logs. The hosting account owner must open that private file through authenticated hosting access and use the link themselves. Do not paste its contents in chat, commit it, or share it with the class. The activation page lets the owner choose a password, rotates the recovery code, signs in and deletes the activation file. It immediately removes the token from the address bar. Keep the replacement recovery code privately.

Do not claim the live admin role has been configured until this provisioning step actually ran. File rollback does not undo database changes or account provisioning.

## Feedback privacy

Reports are stored in the private SQLite database. Authors see their own reports; administrators see all reports and can set Aperta, In valutazione, Risolta or Chiusa. Input is escaped in the UI, writes require CSRF, account identity comes from the session, optional profile ownership is checked, and submissions are limited to ten per hour per account. Account deletion removes its reports. Admin views never return password hashes, recovery hashes or active duel answers.

## Validation

`python3 scripts/test-community.py` runs the isolated API/bootstrap permission and recovery tests and is required in CI.

For the full browser journey, start an isolated local PHP test server with `WORDYLAND_TEST=1`, a fresh `WORDYLAND_DATA_DIR` and a private temporary session directory. Run `node scripts/test-community-browser.cjs`, setting `WORDYLAND_BROWSER_DATA` to that same fresh data directory. This test provisions an administrator only in that test database. It accepts `WORDYLAND_TEST_URL` (localhost only), `WORDYLAND_PLAYWRIGHT_MODULE`, `WORDYLAND_CHROMIUM` and optional `WORDYLAND_BROWSER_SCREENSHOT`. It covers email signup, class creation, the actual enrollment link, pupil enrollment and Arena access, report privacy, private activation, global class/report access, status updates and narrow-screen overflow.

Publication remains subject to the ordinary-homepage/cache checks in DEPLOYMENT.md. A development commit or successful local test is not proof of publication.


## Visible access, logout and password controls

A top toolbar shows the current account/profile and offers **Esci / Logout** and **Cambia password** whenever authenticated. Guests see **Accedi** and **Password dimenticata?**. The logout command flushes pending profile saves before ending the server session; unconfirmed requests do not pretend that logout succeeded. After confirmed logout, private recovery notices are removed and the UI clears the account even if the subsequent guest-session refresh fails.

The recovery command opens the existing recovery-code form directly. For a class-link visitor it opens the class-specific recovery form using that class and nickname. `#recupera-password` opens adult recovery directly. Recovery uses the one-time code supplied at registration; this flow does not send email. Reset rotates the recovery code and invalidates old sessions. Class recovery preserves the nickname for the subsequent login.

Authenticated adults and learners can change their own password using the current password, a new 12–72-byte password and confirmation. CSRF, per-account attempt limits and current-password verification apply. Other device sessions are invalidated; the current session regenerates its ID/CSRF and stays connected. Existing profiles, enrollment, rewards and recovery codes are preserved. No account roles change.

`python3 scripts/test-access.py` and `bash scripts/test-browser.sh access` verify password errors, recovery rotation, logout, private code cleanup, session invalidation, preserved wallet/class and learner flows, including mobile and interrupted logout/guest-session refresh. Both are required in CI.
