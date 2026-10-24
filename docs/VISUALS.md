# WordyLand adventure island

The landing page is a real, rotatable WebGL island with original procedural low-poly models. The browser renders the geometry locally; it does not download models or call a CDN. Eight accessible destination cards and illustrated previews accompany the 3D scene. The English exercises remain the core of play: this is not a free-driving or real-time football simulation.

## Places and play

- Treehouse: three free room colours; earned plant, rug and lamp are shown in the room.
- Animal refuge: a free fox, bunny or kitten companion, water/snack/cuddle interactions and learning hearts. Care interactions award no currency or mission progress.
- Atelier: three free colour palettes and a creation that gains colours through answers.
- Kart: free blue/coral colours, earned mint colour; correct answers advance around the track.
- Football: correct answers move the ball toward the goal.
- Space: correct answers power the rocket; the class's existing weekly XP objective also has a 3D preview.
- Ocean and dinosaurs: treasure and footprint scenes with their own vocabulary.

Each completed mission contributes one discovery to its location. The milestones are 1, 3, 5 and 10 missions; all activities remain open at every level. The 3D island adds a flag, lantern, balloon and trophy at these milestones. For signed-in profiles the server derives progress from completed reward records. Wrong answers and replayed requests cannot create discoveries or additional rewards. Existing daily XP and coin caps remain in place. Guest choices and discoveries stay on that browser; account choices and discoveries follow the selected profile.

Private class duels persist a kart, football or space mode with the invitation. Scores remain server-owned; the other player's score is revealed only after both have finished. Players answer at their own pace.

## Rendering and accessibility

- `dist/island.js`: models, map controls, scene lifecycle and optional celebration sounds.
- `dist/island.css`: responsive island theme and destination cards.
- `dist/island-places.webp`: original generated 4 × 2 illustration sheet (treehouse, pets, atelier, kart; football, space, ocean, dinosaurs), 1774 × 887, about 382 KiB. It illustrates the destination cards; it is not the WebGL scene.
- `dist/three.min.js`: Three.js 0.160.0, unmodified `package/build/three.min.js` from `https://registry.npmjs.org/three/-/three-0.160.0.tgz`. SHA256 `170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa`. MIT license: [THREE-LICENSE.txt](third-party/THREE-LICENSE.txt).

Pixel ratio is capped at 1.5. Animation stops off screen or in a hidden tab; scenes release geometry, materials, renderer and WebGL context when removed. Reduced motion renders only on changes. Rotation and zoom have labelled buttons; the island's ambient animation can be paused. Sound is off by default and is enabled only through a user gesture. If WebGL is unavailable or lost, the cards, care controls, choices and exercises continue to work with a static representation.

The earlier original kart panorama (`race-world.webp`), circuit sheet (`race-circuits.webp`) and character portraits (`race-racers.webp`) are retained for the arcade/training assets. The portrait and circuit styles remain in `arcade.css`.

## Verification and updates

Run `node scripts/version-assets.mjs` after changing browser assets. It versions HTML dependencies and both illustration stylesheet references. New public files must be added to the verifier, both deployment allowlists, the live checksum loop and the isolated deployment test.

`python3 scripts/test-adventures.py` checks all eight server-verified paths, rejected forged progress, reward caps, cosmetic ownership, three duel modes and migration from the previous schema. It runs in CI alongside the account/classroom/deployment tests.

Browser validation for this release covered all eight complete guest missions, rendered WebGL scenes, free customization and reload persistence, desktop/390/360px layouts, two-pupil football and space duels including signup/login/recovery, and a WebGL-disabled reduced-motion browser. Browser tests use isolated temporary PHP data, never the production database.

## Motion and game continuity

The map includes drifting clouds, birds, ripples, swaying trees and moving miniature activities. Place/style previews are explicitly marked `preview:true`; preview movement never changes learning progress. Correct answers trigger a short themed reaction and a pool of reusable 3D particles. Mistakes show a calm retry message. The mission and duel reuse the same WebGL scene through the ready screen, subsequent questions and the mission's final celebration; leaving disposes it. Starting a mission hides the setup cards and scrolls the playable stage into view.

The pause button applies to all scenes and interface animations. Reduced motion shows static, timed feedback and immediately displays the resulting progress. Animation clocks stop while scenes are outside the viewport or the tab is hidden. CSS ambient accents are also paused off screen. Interface transitions last under 0.7 seconds; exercise answer timing and scoring are unchanged.

Optional browser regression test: start the app with an isolated PHP data/session directory on port 8093, then run `node scripts/test-motion.cjs` with Playwright installed. Set `WORDYLAND_PLAYWRIGHT_MODULE`, `WORDYLAND_CHROMIUM` or `WORDYLAND_TEST_URL` when using an existing runtime. It compares rendered frames for movement/pause/reduced motion and checks goal feedback, retained canvas identity across questions, disposal on leave and mobile overflow.

## Direct scene play

The hero switches between the island and large kart/football/space scenes. Map pins open a place preview in the hero. Each preview has a labelled action button and supports tapping the canvas; dragging still rotates. Every destination also has its own action: lights, pet jump, paint mixing, kart turbo, goal kick, rocket launch, treasure lid or dinosaur greeting. These controls are cosmetic free play and do not call a reward or progress API. “Gioca in inglese” enters the matching verified mission. Pause and reduced motion apply to previews too, with discrete resulting poses when animation is disabled.

The original normal homepage was found stale in SiteGround's cache while unique query URLs were fresh. Deployment now sends SiteGround-scoped PURGE requests from the hosting server over SSH, and compares both the ordinary `/` and `/index.html` responses byte-for-byte. The existing cache-busting checks remain. A stale ordinary homepage causes failure and rollback. No hosting configuration or public cache-management endpoint is added.


## Early readers, ages 6–7

Exercises use 20–26px instructions/options, 36–48px model words, 32px writing fields and large touch controls. This applies to missions, class duels, classic practice and anonymous offline revision. Shared `learning.js` shows a static large red X with a specific explanation (position meanings, letter/spelling differences, dialogue or quantities) and the correct example. Children can retry in practice; duels show the correction before continuing, without altering server scoring. Correct answers show a large green check and three stars, including the final mission answer. Stars animate once and respect reduced motion and the global animation pause.

Italian explanations and English examples have explicit audio buttons, with no autoplay. Voice availability depends on the device. Feedback remains until the child continues. Strings are escaped, and feedback is announced with a polite live region. Browser coverage: `bash scripts/test-browser.sh learning`, plus school, resume and PWA regressions, against disposable local data.


## Focused child UX

The start screen includes an explicitly suggested rotating three-question mission, with the existing resume section ahead of it and the three exploration/class/character shortcuts. This is a suggestion, not a teacher assignment or an adaptive assessment. Six secondary tabs wrap into a readable grid. Lesson cards, class forms and Arena controls have larger labels and touch targets.

An active mission or duel uses `body[data-play]` to hide surrounding landing/account/passport UI. The pause control remains visible; leaving, completing a mission or opening another route restores navigation. A sticky mission toolbar keeps pause and listening reachable. Illustrated options use a compact two-column grid from 350px upward, retaining 21–22px text. Phrase choices remain full-width on small screens. Save confirmations distinguish online profiles from this-browser guest storage; timeouts, HTML hosting challenges and lost connections no longer imply that an unconfirmed answer was saved. No writes are automatically replayed.

The authenticated pending-games response includes only the selected owned profile’s valid class-scoped incoming invitation count. The class shortcut updates from that count; logout/profile changes clear it. Incoming invitations have a stronger visual treatment. Duel listening reads the Italian question without revealing the English answer. Existing server grading, rewards and privacy boundaries remain in effect.

Validation: `bash scripts/test-browser.sh ux`, plus learning, resume, presence, community, characters, school and PWA. Core browser journeys now block deployment alongside existing API/content/deployment verification. Screenshots contain only temporary fixture data.


## Repeatable motion regression

Run `bash scripts/test-browser.sh motion` in the same disposable local environment as the other browser suites. The test checks moving frames, global pause, reduced motion, free scene interactions without rewards, retained canvas identity through questions, cleanup when pausing and mobile overflow. It follows the focused exercise UX: success feedback must be visible, the decorative in-question scene remains hidden, and navigation is restored through Pause. This regression is now part of the required browser job before deployment.
