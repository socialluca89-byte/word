# Class programme core

`dist/class-program.php` is loaded after authentication and before the older platform modules. It provides the facade in `CLASS_PROGRAM_CONTRACT_2026_11_08.md`; helpers do not begin or commit transactions. The adapter owns atomic session creation and answer recording.

## Revisions and content

Management `expectedRevision` is the draft's `program.editVersion`; each successful save increments it. Learner `programRevision` and `active.revision` are the global ID of an immutable published revision, not the edit counter. Published payloads copy the assigned units, permitted words/IDs, and the filtered `training` records. Subsequent catalogue edits cannot change a published lesson or a resumed plan. Public `classroomArt` and sticker metadata can still be refreshed without changing educational content.

Only active/review units reach the learner; planned units remain in adult management/history. The public catalogue has eight worksheet units plus explicitly assignable `alphabet-it-en` (26 existing letter names, no added words or phonics). Class-private material units require adult confirmation. None of these units are assigned automatically, including to Best 2.

An unconfigured class preserves legacy behaviour. A configured draft blocks new play until publication. Multiple classes require an explicit choice. New starts validate both expected class and revision; mismatches return 409. An explicit frozen session can resume while the profile still belongs to that exact class and still has the recorded account owner. Retrying a publication cannot overwrite a newer published programme with an old revision.

## Response details

- `class-program-state` and `class-program-context` return the manifest directly. A class manifest includes `training` with only the frozen assigned content.
- `class-program-save` returns `{ok,program}`; publish returns `{ok,replayed,program}`.
- Manage returns `{classes,program,units,catalog,teachers,history,consentTargets}`. A progress-only teacher receives published metadata and empty unit catalogue, staff and history arrays; draft/private/planned material is excluded.
- `material-save` returns `{ok,unit}`. Word rows are `[english,italian,icon]`; the short icon is plaintext, never HTML.
- Teacher invite returns `{ok,staff,token,expires}`. The token is returned once, stored only as a hash, and bound to the named existing adult account. It is not sent by email.
- Accept `{token,confirmed:false}` is a read-only preview returning `{invitation:{className,scopes,expires}}`. It checks recipient, adult role, issuer/current class owner, revocation and expiry. It does not consume the token, accept a scope, or increment the write rate limit. `{token,confirmed:true}` separately accepts and consumes the token.
- Consent targets contain only actor-owned profiles or accepted, currently valid guardian links: `{club,profile,nickname,className,allowed,source,guardianLink?}`. Consent never creates a guardian link or ownership.
- Progress returns `{scope,class,program,profiles,notes}`. Profiles without current consent contain only ID, nickname and `shared:false`. Shared entries contain totals and per-item counters for new, class-bound server evidence. Models are separate; these are practice indicators, not mastery scores or retrospective global grades.

`cpSessionMetadata` returns null for legacy, otherwise `{club,program,revision,historical,accessible,expected,...}`. Accessible bindings also include frozen labels and `active`. Revoked membership returns `accessible:false` without private labels. `cpAssertSessionAccess` denies access instead. `cpVisibleSessionSql` filters inaccessible bindings before list limits; adapters still recheck the final binding, and duels require matching bindings for both participants.

## Permissions and storage

Teacher labels are descriptive only. Accepted `program-edit` and `progress-read` capabilities are independent and checked per class on every request. Owner changes and account role changes irreversibly revoke old staff grants. Membership deletion and profile transfer revoke affected consents; accepted guardian link version is checked on every consent read, so revoke/reissue cannot revive consent. No helper expands global profile ownership.

Storage consists only of `class_program_*` tables, indices and triggers. Initialization uses additive `CREATE IF NOT EXISTS`; the optional `guardian_version` column addition supports an earlier local schema candidate. No legacy rows are moved or regraded. Deployment rollback must preserve these tables and new programme history; removing the module while leaving configured classes would restore old global-content behaviour, so a code rollback across the feature boundary needs coordinated handling rather than deleting data.

Menu resolution uses membership/context/head queries plus the frozen revision payload. Pending lists filter with correlated membership lookups before their existing limits. Progress aggregates class-bound steps per consented profile and rechecks consent and teacher scope before returning; its work grows with class size and accumulated programme evidence. No production performance benchmark or real student data was used. Larger classes may need measured batching/index tuning later; reporting remains explicit and outside the game answer loop.

All current tests use synthetic accounts, classes and documents. No real invitation, consent, membership, email, or account privilege was created by the tools.
