# Villaggi delle festività

The existing villages, Classroom dictation and Christmas collection are included in published baseline `f99e498`. The new same-day additional rounds described below are a subsequent implementation candidate, not a claim of publication. All existing items, earned ownership and calendars remain unchanged.

## Calendar and access

Home portal and Passaporto → Villaggi delle feste. `#festivita` opens the festival area, `#natale` selects Christmas. All earlier destinations remain available. Guests can see the decorative village but must choose an owned online profile to play challenges and retain rewards across devices. No new account, pupil access, class or parental permission is created.

The PHP server clock in Europe/Rome determines availability and the daily date. Browser clock and request-provided dates are never authoritative. No cron or hosting configuration is needed.

| Festival | Annual availability (inclusive) |
| --- | --- |
| Christmas | 1 November through 7 January of the following year |
| Carnival | Easter minus 61 days through Easter minus 47 days (Shrove Tuesday) |
| Easter | Easter minus 14 days through Easter plus 7 days |
| Halloween | 15 October through 1 November |

The first Christmas edition is 1 November 2026–7 January 2027. Its exclusive server cutoff is 8 January 2027 00:00 Europe/Rome. Other ranges are product defaults configured in `holidayEvents`; more festivals can use the same engine. They are not imported from a school calendar. Gregorian Easter is calculated locally.

## Daily mission, further rounds and permanent souvenirs

The original daily mission remains three short tasks per active festival/profile/day, using the existing curated foundation vocabulary. After completing it, **Un’altra sfida** opens another three-task round on the same date. More rounds may follow while the festival is open: exercise-based characters and accessories no longer require waiting for a new day. Starting an additional round is always an explicit choice; the UI also allows stopping or choosing other games.

Meaning recognition and writing remain, while the middle task alternates writing, a missing-letter hunt, cookie letter tiles and an English word-choice game. Additional rounds vary the server-selected words/rotation rather than counting a replay of already-confirmed answers. A saved plan freezes choices and step. Hints and errors do not reduce rewards. An unfinished current round resumes on another device or after closing the page during the same Italian calendar day. A previous day's unfinished challenge expires at local midnight; a new mission is then available. Challenges cannot be started, answered or helped after their event closes, including an already-open browser tab.

Three event-only badge souvenirs per festival remain at 1, 3 and 5 **distinct completed dates** in that edition. Multiple rounds on one date still count as one date; days need not be consecutive. Christmas also gates all twelve cosmetic accessories/decorations and twelve playable characters behind confirmed exercises (1–30 exercises), including answers from additional rounds. The scarf-removal control remains free. See CHRISTMAS_COLLECTION.md for the exact finite list. This does not revoke any already-owned item or change an existing unlock threshold.

Replaying/reloading never counts twice. The 30-exercise character/accessory thresholds can now be reached through ten completed three-task rounds, without requiring ten separate dates. The badge milestones remain dated participation milestones and are explained separately. After collecting the finite collection, practice remains available during the event; the product does not promise a new unique item on every later round. There are no streak penalties, speed ranking, purchases or added coins/XP. Correct answers with hints/corrections also count.

The year-round Passaporto delle scoperte uses its existing one-new-mission-per-date rules; this change is limited to the four seasonal villages. Birillo's optional pranks and his 8 December–7 January visiting window are unchanged.

Thirty-six earned entries across all four festivals are distinct from ordinary paid cosmetics. They cannot be bought/claimed directly before being earned. Once in inventory, accessories, characters and badges can be used all year. Annual editions reset participation counts; previous items stay owned. This starter catalog reuses souvenir IDs on later editions; future artwork variants require explicit catalog additions.

## State and privacy

The existing `holiday_days` table and historical daily rows are preserved. An additional rounds table holds new same-date rounds with owned-profile FK/cascade, edition/date/round identity, random unique token, frozen three-question plan, current step, hint/error state and last attempt ID. Exercise totals include both sources; day milestones use distinct completed dates. Every correct-answer step and any resulting inventory grants run in the same immediate SQLite transaction. Unique keys plus step/attempt validation prevent repeat awards.

A normal start remains idempotent. An explicit additional-round start supplies `another: true` and the owned completed predecessor token in `after`; repeated/delayed requests recover the current successor rather than allocating an unplayed extra round. The UI disables actions while a request is pending. If a reply is lost, it offers a manual **Verifica e riprendi** GET to reconcile the saved server session and wallet; it never automatically repeats the POST. Other accounts cannot resume or allocate a round from someone else's token. No class leaderboard, public participation history, microphone, third-party service, child document upload or private/API cache is introduced. The local test clock exists only when the disposable server environment enables WORDYLAND_TEST and supplies its private fixture clock file, never via HTTP parameters.

State refresh also retrieves the owned canonical wallet. A browser regression caught a real stale-wallet defect after a committed response was lost: the gift existed in SQLite but looked locked in the wardrobe. Refresh now reconciles that inventory before returning to the wardrobe; the regression verifies permanent equipping after closure.

## Same-day UI design and acceptance

The child sees the next exercise-based prize and its actual saved progress before the current exercise, with a single **Un’altra sfida** action after completion. The optional collection album, character wardrobe link, calendars, all other games and Birillo remain reachable. Date-based badges are labelled separately from exercise-based unlocks. Nothing starts automatically, no countdown is introduced and there is no penalty for stopping.

The component reuses the published palette: ink `#193e55`, pine `#22654f`, ice `#d6ebf0`, paper `#fffdf6` and muted gold `#d6b667`; existing Outfit headings and instruction type remain. Layout is a compact left-aligned progress strip followed by the exercise and a calm completion action, not another mandatory catalog screen. Labels remain large, actions at least 48px, wrapping at 320px and focus moves to the real question/completion or explicit recovery control.

New browser acceptance must cover repeated same-day rounds, double-click and committed-start reply loss with one POST and manual GET, pause/reload, retained next-prize progress, distinct-day badge separation, keyboard/touch and four viewport widths. These are verification requirements, not a statement that the pending candidate has passed.

## Earlier visual checks

Original local low-poly village, houses, Christmas tree, snowman and parcels; alternate color/decoration sets for the other three festivals. Finite snow meshes reuse the existing lifecycle/pause/reduced-motion controls. No remote assets. [Synthetic preview](review/holiday-village-390.png).

Passed locally: `test-holidays.py` (calendar/Easter/timezone/cutoff, skipped-step rejection, midnight expiry, private ownership/CSRF/methods, frozen per-day token, second-device hints/resume, replay, 1/3/5 nonconsecutive participation, cross-festival rewards, unchanged economy and persistent inventory/new edition); holidays browser (guest, real geometry, double-click, pause/reload/error/hint, committed lost reply, permanent gift after closure, offline honesty, four viewports); existing adventure/training APIs, navigation browser, wardrobe browser, motion browser and performance browser (local homepage load 2835.5 ms within unchanged 5000 ms budget, deferred map initialized once); catalog matching, PWA/public bundle, JS/PHP/shell syntax and whitespace checks. The new API and browser suites are included in CI without reducing earlier coverage or raising timeouts.

The preceding checks describe the original village implementation. The additional-round candidate still requires its own API/browser, cumulative CI and publication/live verification. No live account, hosting configuration or security setting is changed by preparing it.
