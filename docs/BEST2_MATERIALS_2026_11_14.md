# Best 2 — teacher material shared on 14 November 2026

Baseline: `3614c4476101814b307dd72a80b935ca7883e2fd`, verified live by run42494775887. The user states that all material supplied so far and currently belongs to Best2 unless they specify another class. This content lot uses only the thirteen new/repeated photographs. No pupil name or photograph is copied into the application. Development fixtures must remain synthetic; adding these selectable units is not an assignment to a real class.

## Scope and provenance

| Source in the two messages | Treatment |
| --- | --- |
| 1. School objects, It is / They are | Reuse the old pen/eraser statement cases. Add the missing complete pencil and pencil-sharpener statements. |
| 2. One and more than one | Reuse the existing singular/plural material; do not rewrite frozen cases to change their picture quantities. |
| 3. School objects, singular/plural | Reuse existing noun forms and plural practice, including pencil sharpener(s), book bag(s), and glue stick(s). |
| 4. Classroom word-copy sheet | Reuse the existing twelve-word Classroom dictation pack unchanged. |
| 5. Quaderno, It is / They are and Is it a pen? | Reuse book/pen/eraser statements and the existing pen yes/no question. Add desk, boy and hand statement pairs. Margin numbers do not create new counting questions. |
| 6. Vocabulary plurals | Reuse book, egg, chair, apple and cup plural practice. |
| 7. Playground word copying | Add slide, scooter and swing spelling. |
| 8. Furniture word copying | Add shelf and cupboard; chair, table and desk are already known in the application. |
| 9. Desk/computer copying | Add computer; reuse desk. |
| 10. Apple question/answer notebook | Add What's this? / What are they? with apple/apples. |
| 11. Questions & Answers: School Objects | Add the eight desk, bookbag, pencil-sharpener and pen question/answer rows. Printed examples remain guides rather than additional duplicate cases. |
| 12. Tree notebook | Use tree/trees with the clear singular/plural This is / These are pattern. Do not introduce a different demonstrative or a new question form from unclear handwriting. |
| 13. Printed This is / These are worksheet | Add the six apple, ball and dog rows, keeping this formula distinct from It is / They are. |

Handwritten mistakes are not answer models. In the new school question sheet, bookbag and pencil sharpener follow the clear teacher corrections. The previous book bag/bookbag forms remain supported where appropriate; the unrelated shorter bag is not an accepted answer for a new bookbag case.

## Finite new grammar matrix

### best2-what-questions — 10 identify cases

| Noun | Picture quantity | Question | Canonical answer |
| --- | --- | --- | --- |
| desk | 1 | What is this? | It is a desk. |
| desks | 2 | What are they? | They are desks. |
| bookbag | 1 | What is this? | It is a bookbag. |
| bookbags | 2 | What are they? | They are bookbags. |
| pencil sharpener | 1 | What is this? | It is a pencil sharpener. |
| pencil sharpeners | 3 | What are they? | They are pencil sharpeners. |
| pen | 1 | What is this? | It is a pen. |
| pens | 2, representative plural | What are they? | They are pens. |
| apple | 1 | What's this? | It's an apple. |
| apples | 3 | What are they? | They are apples. |

The two pens represent plurality: the source row is partly covered, so this is not a claim about its exact hidden count. Contracted and full It is forms are accepted. Bookbag/book bag spacing is accepted; bare bag is not. The new pencil-sharpener answers retain the complete expression rather than silently shortening this particular writing task.

### best2-this-these — 8 demonstrative cases

Apple, ball, dog and tree each have one singular picture and a representative pair. Models are `This is an apple.`, `This is a ball.`, `This is a dog.`, `This is a tree.` and their plural `These are…` forms. Pair quantities express one/many; they are not transcriptions of unclear source-picture counts.

Each case stores a full answer/model, `prefix` (`This is` or `These are`), `ending`, two prefix choices and full sentence tokens. Four phases reuse existing modes: model; choose the prefix; compose the full model; write the full model. No That/Those or He/She is introduced, and no invented distance-comparison rule is added. The maximum three-case plan remains twelve steps.

### best2-it-they-sentences — 10 sentence cases

Pairs: pencil 1/3; pencil sharpener 1/3; desk 1/3; boy 1/2; hand 1/2. Models start with `It is a…` or `They are…`. Singular contractions are accepted. These are picture-description statements matching the supplied classroom pattern, not a new conversational-pronoun lesson. Existing book, pen and eraser cases remain unchanged and reusable.

## New word-only material and nouns

Seven foundation records and one `wordOnly` pack `best2-new-words`:

- slide — scivolo;
- scooter — monopattino;
- swing — altalena;
- shelf — mensola;
- cupboard — armadietto;
- computer — computer;
- tree — albero.

Tree already exists in the legacy Dino vocabulary; the new teacher source makes it part of this foundation spelling material. Every new word has `phrase=id`, `phraseMeaning=meaning`, `gap=___`, and `wordOnly:true`. No extra model sentence, phoneme claim or automatically invented plural is included. In particular, shelves is not introduced. Specific illustrations are provided by the frontend author; fallback symbols are decorative, not an additional assessment target.

Four grammar nouns are appended: tree/trees, boy/boys, hand/hands and bookbag/bookbags. Tree, boy and hand use `grammar-tree`, `grammar-boy` and `grammar-hand` artwork. Bookbag reuses the existing bookbag atlas art and supports the spaced aliases book bag/book bags. The other six new singular vocabulary words do not acquire new grammar-noun/plural records.

## Programme units and compatibility

Append four selectable units: `best2-20261114-words`, `best2-20261114-questions`, `best2-20261114-this-these`, and `best2-20261114-statements`. Titles and provenance identify Best2. There is no class-ID/name matching, real-class assignment, teacher grant, consent or membership mutation. A configured programme without the units must not receive their activities; published programme revisions remain frozen.

The integration contract requires capability `trainingSchema:3` and isolated new owned/guest session stores so cached old clients and a rollback to3614 do not enumerate unfamiliar plans or prune new progress. Existing plans, help, rewards, account roles and economy remain unchanged. Root/backend/frontend/QA coordinate that implementation and its exact verification separately from these content files.

Newly published revisions retain two frozen content views: `trainingV3` for the current application and a legacy-safe `training` view for application3614. The legacy view excludes the three new grammar packs and the explicit new word-pack identifier; supported generic programme spelling can still use approved words. This is safe degradation, not full playback of the new activities on old application files. Existing revisions are never rewritten. The new public offline word pack uses `wordylandBest2OfflineTrainingV1`; scoped offline copies retain their pre-existing random programme key and content fingerprint. Offline results remain local, with no account/API cache or sync queue.

Mixed old-script/new-JSON pages are covered explicitly. A word session already started by application3614 in its original guest store remains resumable there, with its token, plan, help and draft; new starts use only the dedicated store. The public offline loader can recover a valid old-store session read-only when the dedicated key is absent, and adopts it only on the first successful write. Source and destination stamps guard conflicts; the original bytes remain unchanged and completed totals are not imported twice. No destructive migration or reward duplication is introduced.

Final data inventory: **103 cases,34 grammar nouns,71 foundation words,10 word packs,14 grammar packs,13 programme units**. The old75cases/30nouns/64foundation words/9word packs/11grammar packs/9programme units retain all values and order. This document records content preparation; browser, CI and live publication results must be taken from the final exact candidate rather than inferred from this inventory.

## Local verification of the frozen candidate

- All54 mandatory verify command groups passed, including the three independent content/API oracles and isolated deployment/rollback simulation.
- All66 browser suites passed:30 world/event regressions,34 learning/account regressions, the new Best2 suite, and performance run alone. New browser cases use actual UI for all28 cases and7 words, synthetic accounts only, and320/390/1360 viewports.
- Real3614 script/PHP/JSON fixtures cover old snapshots, new dual-view programmes, mixed old-script/new-JSON pages, guest token/help/draft resume, offline first-write atomicity, quota, conflicts and unchanged legacy bytes.
- Six final real-render screenshots were inspected. Nine local SVG illustrations are original; worksheet photos and pupil identifiers are not shipped.
- Isolated local load541.6ms, unchanged5-second deadline; no claim about a physical old tablet or real-device speech quality. All59 frozen application file hashes remained unchanged throughout final verification.

CI uses the pinned Chromium151 and must pass the same54/66 gates before normal deployment. A successful local run is not evidence that this candidate is online. Publication requires the exact commit's successful deploy step and its existing marker/health/51static hash/MIME/ordinary-homepage checks, without an additional production probe.
