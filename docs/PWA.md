# Installable WordyLand and the child start screen

The main screen offers three large choices: Allenati (`#allenati`), Gioca con la classe (`#sfide`) and Il tuo personaggio (`#personaggi`). Adult/class creation, administration and assistance links are grouped in the collapsed “Per adulti e assistenza” menu. Existing direct class enrollment links still work.

## Installation

Visit https://wordyland.eu while online. Supported Chromium browsers offer **Installa WordyLand** when the native install prompt is available; otherwise **Come installare** explains the browser menu. On iPhone/iPad, open the site in Safari and use Share → Add to Home Screen. Installation availability depends on browser/device; the site remains playable in the browser. Installed mode hides the installation help button. Manifest entry/scope/id are `/`, with standalone display and original 192/512px icons plus a separate maskable icon.

## Offline revision

Wait for “Ripasso pronto anche senza Internet” before leaving the network. Cold navigation to the home page while offline opens the anonymous `offline.html` revision screen. It offers body vocabulary, counting, mouse/box positions, animals and colors, with retry and next-word controls. Device speech can require a network connection; reading remains available.

Offline revision awards no XP or coins and does not queue progress or other writes. Class challenges, accounts, profile equipment and synchronization require the server. A currently open online screen also shows an offline notice and disables its class shortcut until connectivity returns.

## Cache and privacy

The root-scoped worker uses an explicit allowlist of ten public files: offline HTML/JS, shared learning feedback JS, PWA CSS, curriculum and training JSON, manifest and three icons. It precaches content-versioned URLs without credentials. PHP/API requests, POSTs, arbitrary queries, cross-origin resources, study attachments, names, account sessions, class codes and admin/recovery links are not cached. Home navigation is network-first; cached authenticated app screens are never used as an offline fallback. A token in a fragment is neither sent to the server nor used as a cache key.

`node scripts/version-assets.mjs` first versions offline dependencies, then generates the worker’s cache revision and the registration URL, then refreshes the main page’s asset links. The revision also detects changes to the public game scripts and normalized main markup. Repeating generation is stable. Registration uses `updateViaCache: none` and a versioned script URL to avoid stale hosting/browser copies.

A new worker waits rather than refreshing an active game. A notice offers **Ricarica per aggiornare**; clicking first flushes pending account progress, then activates the waiting worker and reloads. Failed saving keeps the current version open. Activation removes only old `wordyland-offline-` caches and leaves other apps’ caches alone. SiteGround Dynamic Cache remains enabled and is invalidated by the existing private Site Tools deploy client.

## Validation

`node scripts/test-pwa.mjs` is required in CI: it executes the worker handlers and verifies public-only caching, real asset hashes and icon sizes, offline fallback, API/POST/query exclusion, explicit activation and scoped cleanup.

`scripts/test-pwa-browser.cjs` uses a real Chromium persistent profile (installability cannot be checked in incognito), real service workers and a disposable local PHP public directory under `/tmp`. Set `WORDYLAND_BROWSER_ROOT` to that copied public directory; never point it at the repository or production. The test temporarily replaces only the copied worker to exercise a real waiting update. Optional selectors: `WORDYLAND_PLAYWRIGHT_MODULE`, `WORDYLAND_CHROMIUM`, `WORDYLAND_TEST_URL` (localhost only), `WORDYLAND_BROWSER_SCREENSHOT`.

Browser coverage: manifest/installability, three start paths and repeated navigation, guidance/deferred prompt handling, authenticated cache isolation, cold offline launch, all five revision topics, retry/next, 390/360px layout, waiting update/reload and preservation of unrelated caches. Native installation on physical iOS/Android devices is not automated by this browser test.

## Safe updates and visible connection feedback

Connection, update and installation-result messages live outside the home content so they also remain visible on dedicated classroom and administration pages. An update never reloads a running document automatically. If another tab activates a newer worker, the current tab can still offer an explicit reload.

The reload action first saves pending progress. It remains blocked by an unsaved/conflicting profile, an active write or form operation, or a recovery code that has not been acknowledged. The user can finish the operation and retry without losing the current document. Saving is checked again before the actual reload if new changes appeared while the worker activated. A rejected installation prompt offers the ordinary installation instructions and leaves browser play available.

Additional synthetic browser regressions exercise blocked updates, recovery acknowledgement, pending operations, notices on focused routes and rejected installation prompts. These tests do not install a native app or change production credentials.
