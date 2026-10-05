# Project instructions

## Keep the dev playground current

Every new game feature, system, item, skill, animation, visual effect, interaction, UI flow, or world element must receive corresponding dev playground support in the same change. Updates to existing behavior must keep its playground support current. Do not mark work complete or move on to another feature while the playground is outdated.

Make each addition easy to reach, exercise, repeat, and reset without replaying the tutorial. As applicable, extend inventory and skill controls, animation playback/looping, visual feedback triggers, test-area content, and state/reset controls. Use the real gameplay implementation so debug behavior cannot drift into a separate imitation. An existing control or test-area interaction may cover an addition if it exposes the new behavior fully; verify that coverage explicitly.

If unsure whether an addition is covered, or how it should be exposed in the playground, ask the user before proceeding with that uncertain part. Do not silently omit or defer debug support.

Verify the new behavior in the playground and the normal flow as applicable. Keep all developer-only controls and assets behind the compile-time playground flag. After code changes affecting playground support, build both variants and run `npm run check:debug-isolation` to confirm normal builds remain free of debug tooling.

See [README.md](README.md#development-playground) for local run/build commands and [docs/DESIGN.md](docs/DESIGN.md) for game design.

## Portable world entities

Treat tiles, ground items, resources, NPCs, enemies, companions, and other world objects as portable prefab-like entities. Their model factories, animations, standard interactions, feedback, and lifecycle behavior belong in shared implementations that work in any map. Maps define placement, configuration, and quest context, not copies of entity behavior. Reuse these implementations in gameplay, the splash, previews, and the dev playground wherever applicable. Fix shared behavior at its source; do not patch individual worlds with duplicate implementations. Verify affected entities across existing maps, including cancellation, completion, and reset/respawn where applicable.

## Mobile UI and model previews

Default menus and utility modal windows to fullscreen, edge-to-edge layouts on small screens, with safe-area padding. Dialogue, tutorial tips, toasts, and other transient gameplay overlays are exceptions. Tiny confirmations with a short message and a few buttons (such as eating at full health) should also remain compact, centered dialogs with touch-sized actions; use the shared compact-confirm styling. Keep controls touch-sized and preview camera aspects synchronized with actual canvas dimensions. Every new shared 3D model belongs in the dev model catalogue; list only motions it actually supports and reuse production animation functions.

## Fresh-context entry point

Read [docs/HANDOFF.md](docs/HANDOFF.md) for the current implementation state, remaining architecture work, and verification notes. Treat its status as a dated snapshot and check the code before relying on it. Keep enduring rules here and implementation status in the handoff/design docs.

## Shared gameplay, area-owned narrative

Only area layout and area narrative are location-specific. Skilling actions, recipes, skill state, equipment, health, inventory actions, UI, models, animations, feedback, and standard entity lifecycles belong to shared systems. Availability must not depend on a named area being active or having been visited. Tutorial guidance and narrative sequencing may be local; they must call shared gameplay rather than implement it. Ask if a boundary or intended behavior is unclear.

For example, Willowbank owns its broken bridge story, placement, rescue sequence, quest progression, and scripted injury moment. Shared carpentry owns tool/material checks, action timing, hammer animation, cancellation, consumption, and XP. An area configures a work target and reacts to progress/completion; it does not own the skill itself. The same distinction applies to fishing, gathering, cooking, and other skills.

Validate shared changes in the clearing before visiting Willowbank and in a second area. Exercise cancellation, completion, repeated use, travel, and reset where applicable. Merely moving a model or UI into a shared file does not prove its underlying gameplay is portable. Keep remaining coupling explicitly tracked; do not claim an extraction is complete while area gates or duplicate behavior remain.
