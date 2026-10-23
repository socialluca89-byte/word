# Notes for agents

- Production is `main`; every push to `main` is tested and, if tests pass, published to wordyland.eu by GitHub Actions. Read `docs/DEPLOYMENT.md` before changing anything related to publication.
- Work on the real repository files through Git HTTPS. No ZIPs, no manual uploads to SiteGround, no cron jobs.
- After JS/CSS changes run `node scripts/version-assets.mjs`; run every check of the `verify` job before merging; merge only authorised changes, never force push.
- After a merge, confirm in Actions that the `deploy` job actually ran and its live checks passed.
