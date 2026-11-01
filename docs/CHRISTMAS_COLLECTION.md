# Collezione Natale · premi con gli esercizi

Latest user instruction supersedes the original free-access design. Developed on work, not published. Existing owned inventory is never revoked; unearned Christmas cosmetics cannot be obtained with buy/equip or a guest button click.

There are now 27 earnable Christmas items: 12 accessories/decorations, twelve original 3D characters, and three milestone badges. The latest cast expansion is documented in CHRISTMAS_CHARACTERS.md. A separate free `neck-none` control only removes the scarf. The Christmas expansion brought the catalog to 76 entries; the later year-round journey brings the combined pending catalog to 88 entries; the subsequent festive-cast expansion brings it to 97; the original 48 IDs/prices and every earlier function remain intact.

| Reward | Confirmed village exercises required |
| --- | ---: |
| Cappello di Babbo Natale | 1 |
| Sciarpa natalizia | 2 |
| Cappello da elfo | 3 |
| Alberello di Natale | 4 |
| Fiocchi di neve | 5 |
| Corna da renna | 6 |
| Rudy la renna (playable character) | 6 |
| Cappello del pupazzo | 7 |
| Kart delle feste | 9 |
| Cappello biscotto | 10 |
| Stelline delle feste | 11 |
| Pip il pinguino (playable character) | 12 |
| Cappello pacchetto | 13 |
| Razzo pan di zenzero | 15 |
| Fiocco il pupazzo (playable character) | 18 |

The three additional badges still require 1, 3 and 5 completed days, nonconsecutive. Exercise credit comes from saved correct answers, including answers completed with hints/corrections. No coin purchase, timer, speed bonus, consecutive-day requirement or penalty. Three exercises per day means the expanded set of 27 items can be collected in ten participating days. They remain usable after 7 January; starting or completing an exercise outside the event remains server-blocked. Other games do not retroactively mint event credit.

Server completion, per-edition counters and inventory insertion share one immediate SQLite transaction. A repeated answer does not count twice. State reports the canonical owned wallet and per-item exercise/day targets, and the UI announces newly earned items immediately. Direct buy/equip is blocked for unearned event items regardless of coin balance. Existing owned items remain wearable without waiting or re-earning.

Five activity variants: 🎁 Regalo misterioso (meaning), 📮 Posta degli elfi (word choice), 🔎 Caccia alla lettera (missing initial), 🍪 Biscotti da riordinare (letter tiles, including spaces and keyboard undo), ✍️ Bottega delle parole (writing). The three-task daily plan alternates these variants over the dates, remains frozen for resume, and accepts older saved meaning/writing plans unchanged. This is not a new listening/phonics test or pronunciation assessment.

The new pilots have original local Three.js meshes: brown reindeer with antlers, penguin and snowman. All can wear existing cosmetics and appear in preview, kart, football and space. Compact passport/class icons use distinct native emoji portraits rather than an incorrect old sprite. Companions keep their separate appearance. New hats, stars and rocket have real local geometry with existing disposal/reduced-motion rules.

Checks: catalog JS/PHP parity; holiday API confirms all 18 earnings through real answers, pre-unlock denials, rewards before daily completion, repeat safety, permanent use, isolation and unchanged economy; holiday browser completes six synthetic days, exercises all five types, keyboard tile undo, and uses all three earned pilots in all three games; wardrobe verifies the five new accessory meshes and locked controls; wallet/adventure/motion regressions. Tests use synthetic accounts only. Full release CI, deployment and live checks are still outstanding.

[Synthetic 3D character showcase](review/winter-characters.png): the three original pilots with earned cosmetics. This is a local visual preview, not a production screenshot.

The expanded wardrobe regression also caught the Christmas rocket being previewed as a pet. The festive slot map now routes rocket items to the space scene; all twelve accessory meshes are checked.

Final performance check: local homepage loaded in 2673.9 ms within the unchanged 5000 ms budget; map still initializes once when exposed. This is a single local sample, not a real-device benchmark.

Latest nine additional actor thresholds and the new Personaggi Natale filter: [Christmas cast](CHRISTMAS_CHARACTERS.md). Earlier three-character previews remain historical local artifacts.
