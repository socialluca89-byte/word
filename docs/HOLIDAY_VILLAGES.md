# Villaggi delle festività

Developed on work, not deployed. This lot preserves the pending Classroom dictation and Christmas collection. Production has not been changed.

## Calendar and access

Home portal and Passaporto → Villaggi delle feste. `#festivita` opens the festival area, `#natale` selects Christmas. All earlier destinations remain available. Guests can see the decorative village but must choose an owned online profile to play daily challenges and retain rewards across devices. No new account, pupil access, class or parental permission is created.

The PHP server clock in Europe/Rome determines availability and the daily date. Browser clock and request-provided dates are never authoritative. No cron or hosting configuration is needed.

| Festival | Annual availability (inclusive) |
| --- | --- |
| Christmas | 1 November through 7 January of the following year |
| Carnival | Easter minus 61 days through Easter minus 47 days (Shrove Tuesday) |
| Easter | Easter minus 14 days through Easter plus 7 days |
| Halloween | 15 October through 1 November |

The first Christmas edition is 1 November 2026–7 January 2027. Its exclusive server cutoff is 8 January 2027 00:00 Europe/Rome. Other ranges are product defaults configured in `holidayEvents`; more festivals can use the same engine. They are not imported from a school calendar. Gregorian Easter is calculated locally.

## Daily mission and permanent souvenirs

Three short tasks per active festival/profile/day, using the existing curated foundation vocabulary. Meaning recognition and writing remain, while the middle task alternates writing, a missing-letter hunt, cookie letter tiles and an English word-choice game. A saved plan freezes choices and step. Hints and errors do not reduce rewards. One unfinished daily session resumes on another device or after closing the page during the same Italian calendar day. A previous day's unfinished challenge expires at local midnight; a new mission is then available. Challenges cannot be started, answered or helped after their event closes, including an already-open browser tab.

Three event-only badge souvenirs per festival, at 1, 3 and 5 completed days in that edition. Days need not be consecutive. Christmas now additionally gates all twelve cosmetic accessories/decorations and twelve playable characters behind confirmed exercises (1–30 exercises); the previous free-cosmetics rule is superseded by the user's latest request. The scarf-removal control remains free. See CHRISTMAS_COLLECTION.md for the exact finite list. This does not revoke any already-owned item.

Replaying/reloading never counts twice. Three daily exercises means the expanded complete Christmas collection is reachable in ten nonconsecutive participating days. After collecting it, daily practice remains available during the event; the product does not promise a new unique item on every later day. There are no streak penalties, speed ranking, purchases or added coins/XP. Correct answers with hints/corrections also count.

Thirty-six earned entries across all four festivals are distinct from ordinary paid cosmetics. They cannot be bought/claimed directly before being earned. Once in inventory, accessories, characters and badges can be used all year. Annual editions reset participation counts; previous items stay owned. This starter catalog reuses souvenir IDs on later editions; future artwork variants require explicit catalog additions.

## State and privacy

One additive `holiday_days` table with owned-profile FK/cascade, edition/date primary key, random unique token, frozen three-question plan, current step, hint/error state and last attempt ID. Every correct-answer step and any resulting inventory grants run in the same immediate SQLite transaction. Unique keys plus step/attempt validation prevent repeat awards. No class leaderboard, public participation history, microphone, third-party service, child document upload or private/API cache is introduced. The local test clock exists only when the disposable server environment enables WORDYLAND_TEST and supplies its private fixture clock file, never via HTTP parameters.

State refresh also retrieves the owned canonical wallet. A browser regression caught a real stale-wallet defect after a committed response was lost: the gift existed in SQLite but looked locked in the wardrobe. Refresh now reconciles that inventory before returning to the wardrobe; the regression verifies permanent equipping after closure.

## Visuals and checks

Original local low-poly village, houses, Christmas tree, snowman and parcels; alternate color/decoration sets for the other three festivals. Finite snow meshes reuse the existing lifecycle/pause/reduced-motion controls. No remote assets. [Synthetic preview](review/holiday-village-390.png).

Passed locally: `test-holidays.py` (calendar/Easter/timezone/cutoff, skipped-step rejection, midnight expiry, private ownership/CSRF/methods, frozen per-day token, second-device hints/resume, replay, 1/3/5 nonconsecutive participation, cross-festival rewards, unchanged economy and persistent inventory/new edition); holidays browser (guest, real geometry, double-click, pause/reload/error/hint, committed lost reply, permanent gift after closure, offline honesty, four viewports); existing adventure/training APIs, navigation browser, wardrobe browser, motion browser and performance browser (local homepage load 2835.5 ms within unchanged 5000 ms budget, deferred map initialized once); catalog matching, PWA/public bundle, JS/PHP/shell syntax and whitespace checks. The new API and browser suites are included in CI without reducing earlier coverage or raising timeouts.

Full cumulative release CI, real-device visual validation and deployment/live checks remain to be run before publication. No live account, hosting configuration or security setting was changed.
