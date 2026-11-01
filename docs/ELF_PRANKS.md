# Birillo, l’elfo birichino

Developed on work; not deployed. The existing Christmas village, permanent collection and year-round journey remain intact.

## Schedule

The authenticated Christmas state exposes optional `elf` metadata. Before 8 December, while the Christmas village is active, it contains an inactive teaser. From 8 December 00:00 Europe/Rome through 7 January inclusive it provides the active daily prank. Outside the Christmas window and in all other festivals/the year-round journey it is null.

The year comes from the active Christmas edition, so January belongs to the preceding December and next year's 8 December reopens correctly. The PHP server clock is authoritative. Browser date, HTTP body flags and local toy clicks cannot enable the server event. Appearance updates when opening/refreshing the village; no cron, background service, notification or hosting/security change was added.

## Five original optional pranks

The same date has the same prank for everyone; five variants repeat through the 31-date window. This is not a claim of 31 unique authored stories.

| Variant | Interaction |
| --- | --- |
| Pacchi mescolati | Recompose CAT from three parcel letters; keyboard input and undo, written model provided |
| Lettera nascosta | Complete _EN using P, with PEN/penna as the model |
| Cartello al contrario | Turn KOOB back into BOOK/libro |
| Baffi del pupazzo | Remove the drawn moustache from the village snowman |
| Neve colorata | Restore white snow after the elf's pastel colors |

All can be replayed/reset, or skipped with Vai agli esercizi. Large controls and polite text feedback are available without WebGL. Wrong attempts provide a model and no penalty. No microphone, synthetic phoneme claim or pronunciation assessment.

## Scene and rewards

Birillo is an original local Three.js NPC with green clothing, pointed cap and a gentle waving arm. He is a village visitor, not a newly granted playable/inventory character. The scene reflects shuffled parcels, the sign, moustache and snow colors; resolving/resetting redraws the decorative scene using the existing disposal and reduced-motion rules.

Toy resolution is transient within the current view. It survives ordinary mission redraws in that view, but does not create a per-child prank history or cross-device completion record. Regular mission answers continue to save through the existing owned server API. Toy clicks neither grant nor remove coins, XP, items or exercise credit; completing the ordinary missions remains the reward path. Existing owned outfits and progress are untouched.

## Verification

Passed locally:

- `test-elf.py`: Italian midnight on 8 December, 7 January inclusive, next-year reset, all 31 dates and five stable variants, no elf in other events/journey, no wallet mutation from metadata, ignored forged prank reward flags and unchanged real exercise grants/retries.
- Elf browser: real NPC absent before date/present afterward, all five pranks, error/model/undo and keyboard controls, real restored moustache/snow, replay, exercise shortcut, four viewports and minimum touch targets, absence outside Christmas/after cutoff, WebGL fallback, unchanged wallet and no prank write calls.
- Existing holiday and journey API suites, holiday browser, motion, catalog parity, PWA/bundle, PHP/JS/shell syntax and whitespace checks.

The initial browser write-request assertion caught a normal pre-existing presence heartbeat. The observer now explicitly excludes only presence-heartbeat/presence-leave leases, retaining detection of every other POST/write. Presence was not disabled or changed. No test timeout was raised and no retry was added.

Local fixtures only. Full cumulative release CI, real-device review, publication and live verification remain outstanding. No real account, child data, role, class, credential or hosting configuration was changed.

Synthetic previews: [village visitor](review/elf-village-390.png), [parcel word game](review/elf-prank-390.png).
