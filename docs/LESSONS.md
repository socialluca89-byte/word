# School exercises and new topics

The “Esercizi e temi” tab offers thirteen starting cards: three familiar revision paths and ten new topics. Content uses generic or fictional examples; no pupil or parent names from the supplied photos were copied into the shared bank.

New categories: `counting`, `penpositions`, `mousepositions`, `conversation`, `aboutme`, `family`, `food`, `clothes`, `weather`, `routines`. They are available in practice, missions and private class duels. The body revision set now also includes shoulder and finger, with letter-observation hints for the twelve words in the school material. Numbers cover one through ten.

Mission exercise kinds:

- `count`: count a group, listen to “How many…?” and choose among four English quantity phrases for that same object. One uses the singular; the other quantities use the plural. The Italian quantity is hidden during the challenge.
- `dialogue`: listen to an English prompt and choose the matching English response. Distractors have different prompts. The learning screen also offers answer audio.
- `gap`: type the omitted number word or spatial expression. A multiword expression such as “in front of” is kept intact. The server validates the missing words, rather than accepting the whole sentence.
- Existing choice, letter-building, missing-letter and full writing questions remain available.

The guest question builder lives in `dist/data.js`; server questions are assembled in `dist/platform.php`. Both use the corresponding `dist/curriculum.json` entries. New counting and dialogue entries include a fourth metadata element; older three-element entries and saved study materials remain compatible. The shared bank and question semantics are checked in `scripts/test-lessons.mjs`; API/reward/replay/duel behavior for all ten topics is covered in `scripts/test-adventures.py`.

The mouse/box worksheet adds seven positions: in, next to, on, between, under, in front of and behind. Free-practice scenes use a mouse with the boxes.

Free-practice pen/book scenes distinguish the pen from the generic position marker, and count illustrations render the actual number of items. Exercises preserve the existing reward caps, profile ownership and classroom permissions.

Browser validation covers eleven full guest missions (including the original cat-position revision), all thirteen entry cards, multiword gaps, dialogue/count choices, scene continuity and desktop/390/360px layouts. Publishing remains subject to the existing ordinary-homepage/cache checks described in DEPLOYMENT.md.

To repeat the browser check, start the app on an isolated local PHP server at port 8093 and run `node scripts/test-school-browser.cjs` with Playwright installed. Existing runtimes can be selected through `WORDYLAND_PLAYWRIGHT_MODULE` and `WORDYLAND_CHROMIUM`; `WORDYLAND_TEST_URL` changes the local test URL.

Open `https://wordyland.eu/#preposizioni` for the three spatial paths (cat/box, pen/book, mouse/box). A prominent link appears on the start screen and in the full lesson catalog; the three cards are first in the full catalog and explicitly named “Preposizioni”. The dedicated view lists the seven place expressions and links back to all thirteen topics. Browser checks cover direct navigation, reload, the home shortcut, all three spatial missions/illustrations and 390/360px layouts.
