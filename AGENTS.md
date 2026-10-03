# Project instructions

## Keep the dev playground current

Every new game feature, system, item, skill, animation, visual effect, interaction, UI flow, or world element must receive corresponding dev playground support in the same change. Updates to existing behavior must keep its playground support current. Do not mark work complete or move on to another feature while the playground is outdated.

Make each addition easy to reach, exercise, repeat, and reset without replaying the tutorial. As applicable, extend inventory and skill controls, animation playback/looping, visual feedback triggers, test-area content, and state/reset controls. Use the real gameplay implementation so debug behavior cannot drift into a separate imitation. An existing control or test-area interaction may cover an addition if it exposes the new behavior fully; verify that coverage explicitly.

If unsure whether an addition is covered, or how it should be exposed in the playground, ask the user before proceeding with that uncertain part. Do not silently omit or defer debug support.

Verify the new behavior in the playground and the normal flow as applicable. Keep all developer-only controls and assets behind the compile-time playground flag. After code changes affecting playground support, build both variants and run `npm run check:debug-isolation` to confirm normal builds remain free of debug tooling.

See [README.md](README.md#development-playground) for local run/build commands and [docs/DESIGN.md](docs/DESIGN.md) for game design.

## Portable world entities

Treat tiles, ground items, resources, NPCs, enemies, companions, and other world objects as portable prefab-like entities. Their model factories, animations, standard interactions, feedback, and lifecycle behavior belong in shared implementations that work in any map. Maps define placement, configuration, and quest context, not copies of entity behavior. Reuse these implementations in gameplay, the splash, previews, and the dev playground wherever applicable. Fix shared behavior at its source; do not patch individual worlds with duplicate implementations. Verify affected entities across existing maps, including cancellation, completion, and reset/respawn where applicable.
