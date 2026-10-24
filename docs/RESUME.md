# Resume interrupted missions and class duels

The home page displays **Da continuare** with completed-question counts and a **Riprendi** button for each saved activity. `#continua` opens that area. A pause button inside a mission or duel returns to a selection screen; pausing is optional because every confirmed answer is already saved. Unsubmitted text/letter choices are not treated as answers.

## Authenticated profiles

- `GET pending-games&profile=<id>` returns only that owned profile's incomplete missions and active duels for which the player has questions left. Duel membership is rechecked against shared classes. Completed, expired and no-longer-shared duels are excluded.
- `GET quest-resume&profile=<id>&token=<token>` reads the persisted question snapshot and current step; it never rebuilds random questions or awards points. Other profiles/accounts cannot read the snapshot.
- Mission metadata gains an additive `source` column. Legacy spatial questions can recover a topic label from their known word bank. A new index supports per-profile pending lookups.
- Individual missions are now available for seven days from creation, replacing the previous one-hour answer lifetime. Duels retain their existing seven-day deadline. Resuming does not extend either deadline.
- Closing the app after a confirmed answer, including before pressing Next, resumes at the next unanswered question. Another signed-in device can use the same profile. A response lost after the server commits can be reconciled through **Riprendi dal salvataggio**.
- Scores and rewards remain server-authoritative. Replaying a step or completing the same mission again is rejected. The home list clears when switching profiles/logging out, and private APIs remain outside the PWA cache.

## Guest play

The most recent unfinished guest mission can be resumed in this browser for up to seven days. The draft contains the word sequence, step, activity, source and local XP; questions are reconstructed from the available local word bank rather than trusting arbitrary saved markup. A guest has no class duels or cross-device recovery. Clearing browser data removes this draft.

The existing guest wallet includes a short-lived completion-ID ledger. The completion marker and wallet are saved together, so an old draft left behind after a close cannot award coins again. If local storage is unavailable, the UI tells the player to keep the page open and does not discard the only in-memory mission on Pause. Guest progress is never submitted as verified server rewards.

## Verification

`python3 scripts/test-resume.py` is required in CI: owner-only reads, pending filters, exact next step, new authenticated device, overnight continuity, legacy spatial metadata, expiry, one reward per completion and class-scoped duels.

`bash scripts/test-browser.sh resume` uses disposable data and covers guest close/reopen, pause after an answer but before Next, guest completion deduplication, authenticated resume from another browser context, a deliberately lost network response after a real server commit, profile isolation, and duel close/reopen with the same question number and score. Other browser checks continue to use the same isolated runner.
