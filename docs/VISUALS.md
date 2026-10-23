# Arcade visual theme

The classroom game uses original generated illustrations with a 3D render style, rather than characters or assets from another game. It remains the existing English learning game; there is no driving simulation or WebGL runtime.

- `dist/race-world.webp`: 1672 × 941 hero panorama, fox and panda kart racers.
- `dist/race-circuits.webp`: 1536 × 1024 sprite sheet, three columns and two rows: space, animals, dinosaurs, sport, ocean, creativity.
- `dist/race-racers.webp`: 1536 × 1024 sprite sheet, three columns and two rows: fox, panda, robot, dragon, octopus, lion.
- `dist/arcade.css`: theme and responsive layouts, including sprite positions.
- `dist/arcade.js`: pointer-only scenery parallax, disabled for reduced motion and touch. No animation loop.

The three WebP illustrations total about 840 KB. Sprite sheets share a single download across cards. Run `node scripts/version-assets.mjs` after changing an illustration, stylesheet or browser script; it versions both CSS image references and HTML dependencies. The deployment allowlist and live checksum checks include all visual assets.
