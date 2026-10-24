# Notes for agents

- Production is `main`; every push to `main` is tested and, if tests pass, published to wordyland.eu by GitHub Actions. Read `docs/DEPLOYMENT.md` before changing anything related to publication.
- Work on the real repository files through Git HTTPS. No ZIPs, no manual uploads to SiteGround, no cron jobs.
- After JS/CSS changes run `node scripts/version-assets.mjs`; run every check of the `verify` job before merging; merge only authorised changes, never force push.
- After a merge, confirm in Actions that the `deploy` job actually ran and its live checks passed.
- User constraint: do not remove any existing function or make it unreachable. A clearer home means reordering, grouping and clearer labels only. Preserve every game, avatar, class, account, progress and reward on mobile and desktop. Before changing navigation, inventory the existing destinations and add reachability/regression coverage; preserve permissions and data semantics.
- Deployment incident: run 40128858645 for 77e071c failed because SiteGround intercepted public health with an anti-bot page; rollback to 22f2d60 was verified. See docs/PLAN_STATUS.md. Keep independent work on work; do not trigger another main push merely to retry with another runner/IP. Before another production attempt, verify the recorded remote outcome and obtain evidence relevant to the hosting rejection or provider clarification. Never weaken live checks or bypass protection.
