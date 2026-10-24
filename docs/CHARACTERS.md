# Character selection and use

Open **Personaggi** in the top navigation (`#personaggi`), or **Il mio stile → Personaggio** in the passport. The fox is available immediately. The other five characters use mission coins: panda 30, robot 45, dragon 60, octopus 45, lion 60. There are no real-money purchases. Unlocking an item equips it; an owned character can be selected again with **Usa personaggio**, without another charge. **In uso ✓** identifies the active choice.

The selected character appears in the passport, as the kart driver, and alongside the other solo adventure scenes including football and space. The wardrobe provides direct buttons for those three games. The companion in the animal refuge is a separate pet selection. Hats appear on all six character models, including robot and octopus, and do not decorate pets.

Guest choices stay in this browser. An account profile stores inventory, coins and equipment in the server wallet, so another signed-in device can retrieve them. Different profiles keep separate choices. Logging out restores the guest wardrobe. The legacy, hidden emoji picker was removed to keep character selection in one wardrobe. The server always returns the default fox when the equipment has only non-avatar items.

## Checks

Run the normal API/adventure suite, then the local browser regression `scripts/test-characters-browser.cjs` with Playwright and Chromium. Start a disposable local PHP test server with `WORDYLAND_TEST=1`, a fresh `WORDYLAND_DATA_DIR` and a temporary session directory. Pass that same data directory as `WORDYLAND_BROWSER_DATA` to the browser test. Supported selectors: `WORDYLAND_PLAYWRIGHT_MODULE`, `WORDYLAND_CHROMIUM`, `WORDYLAND_TEST_URL` (localhost only), optional `WORDYLAND_BROWSER_SCREENSHOT`.

The browser test funds disposable fixtures to test every cosmetic without repeating lessons. It exercises normal purchase/equip endpoints for the account checks; the separate API tests verify earned rewards and server ownership. Coverage includes all six rendered models and crowns, guest reload, insufficient coins, kart/football/space scenes, same-link navigation, two profiles, separate pets, no double charge, unowned-item denial, a second browser context, logout, 390/360px layouts, unavailable WebGL and JavaScript errors.

These development checks do not establish that the production site has been updated. Publication still requires the live cache checks documented in DEPLOYMENT.md.


## Additional rewards and earned badges

The catalog now contains 48 items (22 additions). New coin cosmetics: wizard/flower hats; bubbles/rainbow effects; turtle/penguin companions; lavender/sunset rooms; sun/galaxy karts; forest/candy paints; three display trophies; sun/ocean footballs; mint/galaxy rockets. New categories in the wardrobe: Trofei, Calcio, Razzi and Distintivi. Each selection is rendered in the corresponding Three.js scene; a selected badge also appears in the passport. Prices and equipment rules are shared between browser and server and checked in `scripts/test-rewards.mjs`. No real-money purchases or scoring advantages are introduced.

Three badges are awarded automatically: first completed mission, three distinct adventure activities, ten completed missions. They have transparent requirements, no randomness, no daily streak or expiration, and award no extra coins/XP. Server eligibility uses persisted completed mission rewards, never browser-supplied counts. Badges cannot be bought or equipped before earning them; unique inventory rows make grants idempotent. Existing players receive eligible badges when their wallet loads. Guest eligibility uses local completed adventures and stays separate from server progress. Newly earned badges are announced on the completion screen, with a button to view and equip them.

Test coverage: all 19 new priced items, all three milestone thresholds, ownership and no duplicate charges, preserved equipment across legacy migration, catalog parity, real rendered models, guest reload, mobile layout and a real account earning/equipping its first badge after verified answers. Run `bash scripts/test-browser.sh rewards`; this check is also required in the browser deployment job.
