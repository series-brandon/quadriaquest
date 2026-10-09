# Project instructions

## Keep the dev playground current

Every new game feature, system, item, skill, animation, visual effect, interaction, UI flow, or world element must receive corresponding dev playground support in the same change. Updates to existing behavior must keep its playground support current. Do not mark work complete or move on to another feature while the playground is outdated.

Make each addition easy to reach, exercise, repeat, and reset without replaying the tutorial. As applicable, extend inventory and skill controls, animation playback/looping, visual feedback triggers, test-area content, and state/reset controls. Use the real gameplay implementation so debug behavior cannot drift into a separate imitation. An existing control or test-area interaction may cover an addition if it exposes the new behavior fully; verify that coverage explicitly.

If unsure whether an addition is covered, or how it should be exposed in the playground, ask the user before proceeding with that uncertain part. Do not silently omit or defer debug support.

Verify the new behavior in the playground and the normal flow as applicable. Keep all developer-only controls and assets behind the compile-time playground flag. After code changes affecting playground support, build both variants and run `npm run check:debug-isolation` to confirm normal builds remain free of debug tooling.

See [README.md](README.md#development-playground) for local run/build commands and [docs/DESIGN.md](docs/DESIGN.md) for game design.

## UI standards

Build new UI with the plain-JS kit in `src/ui/`, following [docs/UI.md](docs/UI.md): signal-backed state instead of polling, `h()` instead of HTML strings, owned and keyed views, `--q-*` tokens, and one breakpoint. Run `npm run check:ui` after UI changes. Legacy debt may only fall. When substantially changing a legacy surface, move it into the kit instead of extending the old pattern.

## Portable world entities

Treat tiles, ground items, resources, NPCs, enemies, companions, and other world objects as portable prefab-like entities. Their model factories, animations, standard interactions, feedback, and lifecycle behavior belong in shared implementations that work in any map. Maps define placement, configuration, and quest context, not copies of entity behavior. Reuse these implementations in gameplay, the splash, previews, and the dev playground wherever applicable. Fix shared behavior at its source; do not patch individual worlds with duplicate implementations. Verify affected entities across existing maps, including cancellation, completion, and reset/respawn where applicable.

## Mobile UI and model previews

Default menus and utility modal windows to fullscreen, edge-to-edge layouts on small screens, with safe-area padding. Dialogue, tutorial tips, toasts, and other transient gameplay overlays are exceptions. Tiny confirmations with a short message and a few buttons (such as eating at full health) should also remain compact, centered dialogs with touch-sized actions; use the modal host's compact confirmation (`confirmModal` in `src/ui/modal.js`). Keep controls touch-sized and preview camera aspects synchronized with actual canvas dimensions. Every new shared 3D model belongs in the dev model catalogue; list only motions it actually supports and reuse production animation functions.

## Fresh-context entry point

Read [docs/HANDOFF.md](docs/HANDOFF.md) for the current implementation state, remaining architecture work, and verification notes. Treat its status as a dated snapshot and check the code before relying on it. Keep enduring rules here and implementation status in the handoff/design docs.

## Shared gameplay, area-owned narrative

Only area layout and area narrative are location-specific. Skilling actions, recipes, skill state, equipment, health, inventory actions, UI, models, animations, feedback, and standard entity lifecycles belong to shared systems. Availability must not depend on a named area being active or having been visited. Tutorial guidance and narrative sequencing may be local; they must call shared gameplay rather than implement it. Ask if a boundary or intended behavior is unclear.

For example, Willowbank owns its broken bridge story, placement, rescue sequence, quest progression, and scripted injury moment. Shared carpentry owns tool/material checks, action timing, hammer animation, cancellation, consumption, and XP. An area configures a work target and reacts to progress/completion; it does not own the skill itself. The same distinction applies to fishing, gathering, cooking, and other skills.

Validate shared changes in the clearing before visiting Willowbank and in a second area. Exercise cancellation, completion, repeated use, travel, and reset where applicable. Merely moving a model or UI into a shared file does not prove its underlying gameplay is portable. Keep remaining coupling explicitly tracked; do not claim an extraction is complete while area gates or duplicate behavior remain.

## Bounded browser verification

Use GPU-backed browser rendering for routine game checks. Do not force SwiftShader/software rendering except through the `low-perf`/`ci` perf environments or an explicit investigation; never report it as representative gameplay performance. Run one verification browser at a time, bound its lifetime, and close your browser/processes in a finally block. Do not leave preview servers or animation-heavy tabs running after verification. Preserve the user's own browsers and servers.

## Performance checks

Performance checks are **VERY slow and expensive**. Run them sparingly, in batches at meaningful milestones. **Do NOT run performance tests after every change or small iteration.** Use focused unit tests and short, bounded functional browser checks while developing.

For a completed batch affecting rendering, the main loop, shared entities/models, water, per-frame UI or audio scheduling, run `npm run perf` once (and a focused `--env low-perf` run when the batch affects fill-rate or main-thread work) and report the results. Existing runs cover follow-up polish in that batch; repeat only when evidence suggests a regression, a substantial new change invalidates the measurements, or the user explicitly requests it. Do not repeat a long run merely to check documentation, formatting, or a minor correction.

Fix FAILs or update the baseline deliberately with `--update-baseline --note`, and record meaningful changes in the ledger in [docs/PERFORMANCE.md](docs/PERFORMANCE.md). Use `npm run perf:ab` when a deliberate measurement of a small optimization is needed, not as a routine per-edit check. New scenarios belong in `src/dev/perf-scenarios.js` so the runner and playground share them. Playwright and the perf harness stay dev-only; `check:debug-isolation` enforces this.
