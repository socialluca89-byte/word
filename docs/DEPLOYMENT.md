# Automatic SiteGround deployment

This workflow deploys the existing static prototype, not a user/database backend.

Create a **private** GitHub repository named `wordyland` and push the project to `main`.

Repository variables (Settings → Secrets and variables → Actions → Variables):

- `SG_HOST`: the hostname shown in SiteGround SSH credentials
- `SG_USER`: the username shown in SiteGround SSH credentials
- `SG_PORT`: `18765`
- `SG_PATH`: the actual absolute document root or empty application directory, verified in SiteGround. Do not guess this path.

Repository secrets:

- `SG_PRIVATE_KEY`: private deployment key corresponding to the public key imported into SiteGround. Never commit it.
- `SG_KNOWN_HOSTS`: verified server host-key entry for `[gnldm1125.siteground.biz]:18765`. Obtain and confirm the server fingerprint from a trusted connection before storing the entry. The workflow enforces host-key verification.

An unencrypted, dedicated deployment key is required for this unattended workflow. It must be restricted to this use and revoked when no longer needed.

The first deployment requires an empty target directory. Existing sites are not overwritten. Later deployments accept only a directory carrying `.wordyland-managed`. Files are transferred under temporary names and the index page is activated last. Previous public files are retained as `.wordyland-previous`; no database or uploads are removed. File replacement is per-file, not an atomic release of the entire application.

Pushes to `main` run validation followed by deployment. Pull requests run checks only. Configuration and network access have not yet been verified from a GitHub runner.

## Remaining work

Create the repository, configure variables and secrets, run the first workflow, verify the public URL, then implement and test the PHP/MySQL backend for accounts and synchronized progress. Database migrations must be added explicitly to a future backend deployment; this workflow does not run migrations.
