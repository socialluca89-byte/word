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
