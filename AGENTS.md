# Notes for agents

- Production is `main`; every push to `main` is tested and, if tests pass, published to wordyland.eu by GitHub Actions. Read `docs/DEPLOYMENT.md` before changing anything related to publication.
- Work on the real repository files through Git HTTPS. No ZIPs, no manual uploads to SiteGround, no cron jobs.
- After JS/CSS changes run `node scripts/version-assets.mjs`; run every check of the `verify` job before merging; merge only authorised changes, never force push.
- After a merge, confirm in Actions that the `deploy` job actually ran and its live checks passed.
- User constraint: do not remove any existing function or make it unreachable. A clearer home means reordering, grouping and clearer labels only. Preserve every game, avatar, class, account, progress and reward on mobile and desktop. Before changing navigation, inventory the existing destinations and add reachability/regression coverage; preserve permissions and data semantics.
- Deployment history: run 40128858645 rolled back after SiteGround intercepted health. The hold was resolved by verified release a52715b61e4deb36e96193650d6d1937d8b3b8de, successful run40391137928 on26October2026, with independent HTTPS/guest checks. See docs/RELEASE_2026_10_26.md. Deployment now checks public health before loading SSH credentials; if rejection reoccurs, stop and diagnose rather than changing runner/IP, weakening checks or bypassing protection. Do not confuse a main push or passing tests with a verified live release.
