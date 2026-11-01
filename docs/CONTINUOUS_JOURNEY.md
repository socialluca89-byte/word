# Passaporto delle scoperte · year-round learning journey

Prepared on work; not published. This is additive to classes, duels, all existing exercises, characters, wallets and the festive villages.

## Loop and scope

Home → La missione di oggi, Passaporto tab → Missione di oggi, direct route `#scoperte`. Three short exercises form one newly available mission per Italian calendar date. Confirmed progress opens permanent, explicitly listed rewards. Other games, the classroom and free hints remain reachable; a completed daily mission suggests a break or any other game. No lost-day reset, expiring owned item, speed ranking, consecutive-day streak, random paid reward, push/email notification or added payment service.

The first finite series has 3 collections / 12 rewards. After the complete series, daily practice still changes, but the UI honestly says that additional rewards need new collections. The engine does not pretend to invent unlimited novel characters. Add new catalog IDs/collections at higher exercise targets to extend the series; keep `journey:v1` as the lifetime progress namespace so old progress and ownership are preserved. Content/art additions follow normal tested release workflow, not an unattended code-download job.

A sustainable future release rhythm is a curated collection/learning-theme update, with rewards previewable in advance and original artwork/content. This is an editorial roadmap, not an already scheduled background task or guaranteed monthly delivery.

## Initial collections

| Collection | Reward | Confirmed exercises |
| --- | --- | ---: |
| Bosco | Cappello foglia | 3 |
| Bosco | Sciarpa dell’oceano | 6 |
| Bosco | Lucciole amiche | 9 |
| Bosco | Libro delle scoperte | 12 |
| Viaggio | Lillo il coniglietto, playable | 18 |
| Viaggio | Kart della foresta | 24 |
| Viaggio | Cappello da esploratore | 30 |
| Viaggio | Razzo dell’oceano | 36 |
| Sogni | Luna da collezione | 45 |
| Sogni | Kiki il koala, playable | 60 |
| Sogni | Comete gentili | 75 |
| Sogni | Giardino delle parole | 90 |

Targets mean saved answers in the daily Passaporto missions. They are not clicks, login attendance or reading a catalog. Hints and corrections count; mistakes never subtract rewards. The complete initial series takes 30 three-task missions, at the player's pace. Existing games retain their own unchanged coins/rewards; this path adds no XP, coins or leaderboard score.

## Content and continuity

Uses the curated foundation vocabulary and the five tested task types: meaning recognition, English word choice, missing initial letter, composition tiles and writing. Story labels are suitable year-round rather than referring to Christmas elves. The first two missions use the original six simple words. Later missions can prioritize up to two curated words already flagged for review in the selected profile's existing private practice signals; other words rotate by date. This does not diagnose a child, certify mastery or rewrite historical learning/parent-report counters.

An unfinished Passaporto mission, frozen choices, hints and confirmed step survive midnight, skipped dates and year changes. Start/state first return that owned pending mission. After completing a carried-over mission, today's separate mission may still be available. There is only one newly allocated mission per date; repeated start/answer calls do not mint duplicate credit. Unsubmitted input/tile picks within an unanswered question are not a separate cross-device draft. Guest decoration can be viewed, but earning/sync requires the existing owned online profile. Offline operation reports failure honestly and does not invent progress.

## Implementation and boundaries

`journey-state/start/answer/hint` use the existing server-owned challenge engine and additive `holiday_days` storage under the stable `journey:v1` namespace. Festive endpoints remain limited to the four actual calendars; they cannot start the permanent journey. Answer/hint tokens are checked for the correct endpoint family as well as owned profile. A winter token cannot be used through the permanent endpoint to bypass closure.

Europe/Rome server time allocates new dates. Completion and grants share an immediate SQLite transaction. Exercise totals derive from saved steps; unique inventory keys and step/attempt checks prevent duplicates. Direct buy/equip cannot grant an unearned item. Existing inventory is preserved. No credentials, roles, guardian/child links, class membership or real accounts were modified.

Two new original local 3D pilots use the same cosmetic transforms and game renderer. Compact passport/class icons use distinct native emoji instead of an incorrect old sprite. All ten new accessory/decorative objects have real local meshes. The generic collection preview routes hats/effects to the character, kart to the circuit, rocket to space and trophies to the home. Character-related collection tabs now include direct kart/football/space play controls, so a newly earned pilot is usable without having to find a different tab.

The homepage adds an evergreen portal ahead of the festive portal. The mission and next goal stay visible before the expandable collection album; all earlier destinations remain accessible. Progress bars are personal, and collection expansion supports keyboard interaction.

## Verification and release

Local API suite `test-journey.py` verifies summer/year change, festive separation, ownership/CSRF/methods, direct-purchase denial, eight-day pause/device resume, frozen plans/hints, one new daily lease, private review selection, ninety genuine synthetic exercise replies, all twelve unique permanent rewards, two owned pilots, and unchanged ordinary economy.

Browser suite exercises the actual UI, a committed lost reply, keyboard collection reachability, both pilots in kart/football/space, ten original collection meshes, still-locked future rewards, correct winter closure while the journey stays open, offline honesty and four widths. Existing holiday/adventure/catalog/PWA/navigation checks remain in place. New API/browser suites are in CI with existing thresholds and no retries. Full cumulative release CI, real-device validation, deployment and live checks remain outstanding.

The initial browser test exposed that play controls were only visible in the Personaggio tab. The collection tabs now expose those existing play actions too; no existing action was removed.

Synthetic previews: [mobile mission and next goal](review/journey-390.png), [Lillo and Kiki](review/journey-characters.png). These are local fixtures, not production screenshots.
