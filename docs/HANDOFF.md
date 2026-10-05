# QuadriaQuest development handoff

Snapshot: 2026-10-04. This is a restart aid, not a claim that all architecture work is finished. Read `AGENTS.md` first and verify current code/worktree state before editing. The next intended work is removing the legacy gameplay coupling below; this handoff does not implement those extractions.

## Project and working conventions

- Game name: **QuadriaQuest**. Project/repository/folder references: **quadriaquest**. The actual checkout is `/Users/brandonmanning/src/poc-workspace/quadriaquest`; some session metadata still refers to the old `project-clime` path.
- Stack: HTML, JavaScript, CSS, Three.js. No replacement game engine or other implementation language.
- Preserve existing staged and unstaged work. This snapshot includes substantial uncommitted work from multiple iterations; do not reset/revert/stage it wholesale or assume it belongs to the current task.
- `docs/DESIGN.md` holds the broader design and area-three combat outline. `docs/WILLOWBANK.md` holds the second chapter. `README.md` holds run/build/debug instructions. If these disagree with newer user decisions or actual code, reconcile them explicitly.
- New work must be reachable, repeatable, and resettable in the dev playground in the same change. Use production implementations. Ask when coverage or scope is uncertain. Keep developer tools out of normal builds.

## Architecture boundary — settled with the user

Only layout and narrative belong to a particular area. Gameplay systems must work in any world that supplies the relevant terrain/entity/target. This includes actions and state, not merely model factories and UI. Do not add `activeArea`, `enteredWillowbank`, or equivalent prerequisites for generic gameplay.

**Bridge clarification:** Willowbank's bridge collapse, Reed's dialogue, quest sequence, rescue/crossing, and one-off finger injury are local narrative. Carpentry is shared: requirements, timed work, hammering, cancellation, material consumption, XP, and progress events. Preserve the specific bridge story; extract the skill mechanics underneath it. A portable bridge model/progress presentation can be configured by that narrative.

Use shared action completion/progress callbacks for tutorial updates. Normal gameplay must not require that a tutorial objective is active. Avoid copying the same action into the next map. Do not use a debugging shortcut that teleports the player just to preview shared UI.

## Recent fixes already made

- `src/cooking.js`: app-owned cooking action, Culinary XP, cancellation, station availability, and one-recipe completion. `src/recipes.js`: shared recipe catalogue and material/tool helpers.
- `src/cooking-menu.js` / `.css`: shared recipe picker and details. The debug interface preview opens with no station and cannot cook; it must not move the player, change maps, or grant items. A real campfire provides the station context.
- Cooking header/close-button bugs came from global `header`/`footer` styles. Those styles were scoped, and the cooking UI uses its own classes.
- `src/campfires.js`: app-owned placement mode, ghost, validation, approach/placement, station clicks, packing, animation/highlights, and reset. `campfire-model.js`, `campfires.css`, and `placement-rules.js` supply shared presentation/rules.
- Campfires no longer require visiting/being in Willowbank or a special meadow flag. Clear reachable land works by default; water, occupancy, explicit non-buildable structures, and unreachable tiles reject placement. The existing one-fire-per-current-map limit is preserved. Stations retain their original tile instances across travel; matching coordinates in another map do not identify the same station. Packing refunds one Campfire.
- `src/recipe-crafting.js`: app-owned inventory recipe crafting, used for the additional tool/fire recipes previously run inside Willowbank. `main.js` drives it independently of the current area. The introductory axe/pickaxe actions still use the existing shared activity path; consolidating those pathways remains an audit item.
- Willowbank now receives campfire/cooking/crafting completion callbacks for narrative. It no longer implements their generic placement/cooking/crafting actions.
- Companions already have app-owned behavior in `companions.js`, with shared model, follow logic, menu/naming, animations, and feedback modules. Willowbank retains the stranded-animal rescue script.

## Remaining coupling — actionable backlog

These are known violations/debt, not permission to keep adding area-specific behavior. Main entry point to audit: `src/willowbank.js`; compare `src/main.js` and existing shared helpers before extracting.

| System | Existing coupling | Intended separation |
| --- | --- | --- |
| Fishing | Extracted: app-owned action, skill, spot lifecycle, and rod/catch presentation. | Willowbank configures placement and observes start/catch for narrative. The clearing playground uses the same implementation before any visit. |
| Carpentry | Extracted: app-owned action/skill and portable bridge entity. | Willowbank configures availability and observes progress/completion for injury, terrain transition, and rescue. |
| Eating and health | Extracted into app-owned `player-health.js`; Willowbank still owns injury/defeat narrative and observes food completion. | Audit defeat orchestration with the later combat extraction. Food and health no longer require an area visit. |
| Gathering, chopping, mining | Willowbank's `gather()` and respawn/depletion loop differ from the clearing's action path, despite shared models/motions. | Shared resource definitions and action/lifecycle controller, including hit reactions, completion/depletion, rewards, cancellation, and respawn. Areas place/configure resources. Ground pickups remain walkable everywhere. |
| Combat and equipment | Combat/equipment state, damage, defeat, and some inventory action gates remain in Willowbank. | Shared systems available to the future third area and dev fixtures. Do not restore combat to Willowbank's narrative. Audit sword/shield recipe exposure: the latest main recipe filter hides both; older docs describe a dev sandbox exposing them. Reconcile this rather than assuming that old documentation is accurate. |
| Skill/action ownership | Some skills are created in Willowbank; multiple timed action loops remain. UI still has historical `chapter` adapters. | Shared player skill state and portable actions, with narrative observers. Reuse existing shared modules instead of introducing a second generic framework. |
| Model catalogue dependencies | Some portable factories still come from `willowbank-models.js`. | Audit factories and consumers; keep reusable definitions in shared modules. A shared filename alone is insufficient if runtime behavior still depends on a chapter. |

Suggested remaining order: resource action consolidation, then combat/equipment and remaining state/model ownership. This is a proposed work order, not a new design decision. Keep each extraction independently reviewable and test the real gameplay path.

## Design details worth preserving

- Clearing: opening/customization, movement/camera, gathering/XP/levels, menus, crafting, chopping/mining, Iter Crystal, optional practice reward/top hat.
- Willowbank quest: **Broken Bridge Rescue**. Dialogue, carpentry, companion rescue/naming, fishing, fire placement, cooking, eating. Reed is a fisher slime; the stranded corgi is a local animal, not initially Reed's pet. Combat belongs in a future third area, currently only outlined.
- Bridge work causes a one-off minor injury to motivate healing. Do not turn all carpentry into random injury or make this a universal rule.
- Cooking chooses a recipe and cooks one item, not a quantity prompt. Tutorial needs one Pondfish. Preserve reward/consumption timing and avoid double rewards when interrupted.
- Models, animations, expressions, hitboxes, feedback, and resource lifecycle should be consistent across maps, splash, and previews.
- Menus/utility popups default to edge-to-edge fullscreen on mobile. Dialogue/tips/toasts are exceptions. Tutorial information is distinct from objectives; quests retain task history. Model viewer animations and expressions are separate, with Default/automatic expressions.
- Terrain uses half-height increments, no ramps, automatic half-height traversal, safe routes for taller elevation changes. Ground items do not block walking.

## Validation and playground entry points

Commands: `npm test`, `npm run build`, `npm run build:debug`, `npm run check:debug-isolation`. Normal dev: `npm run dev`; debug dev: `npm run dev:debug` (default port 5174). Deploy the normal `dist` output, not `dist-playground`.

Last recorded validation for the shared campfire/crafting change:

- 109 unit tests passed; both builds and debug-isolation check passed. Vite still reports the existing large-bundle warning.
- Browser-tested in clearing, without a Willowbank visit: craft a Campfire (materials spent, +20 Crafting XP), place via actual pointer input, open it, cook one fish, pack it back into inventory.
- Browser-tested Willowbank campfire cooking still advances the tutorial to eating.
- Ran the unified playground checkpoint-loading sweep without reported runtime errors. Loading a checkpoint is not a substitute for completing its entire tutorial flow.
- New regression files: `campfires.test.js`, `recipe-crafting.test.js`, and `cooking.test.js`. Coverage includes map identity/persistence, cancellation, invalidated placement, packing refunds, reusable tools, and one-time rewards.

To reproduce without adding a special location-specific shortcut: use debug Inventory controls to add Small Logs ×2, Flint and Stone ×1, and Raw Pondfish. Open Crafting, craft Campfire; open Inventory, select Campfire, Place; interact to cook; Pack. Repeat in a second area. The Cooking UI preview deliberately has no usable station.

Browser checks used an isolated headless Chrome with software WebGL and temporary CDP scripts under `/tmp`. Those scripts are session artifacts, not a durable test suite. No test server/browser was intentionally left running. Do not assume their presence or stop user-owned servers.

## Eating/health extraction — 2026-10-04

- `player-health.js` owns bounded player health and timed food consumption. `main.js` owns its update, cancellation, full-health confirmation, and HUD. Inventory exposes Eat before any Willowbank visit. Existing eating motion/expression is reused.
- Willowbank observes successful meals for its tutorial and uses the shared health object for its scripted bridge injury and legacy combat. Combat/defeat orchestration, equipment gates, fishing, carpentry, and resources remain coupled; this change does not claim those extractions are complete.
- Playground coverage: existing Player health controls restore/damage the shared state; Inventory controls grant Cooked Pondfish, and the production Inventory Eat action exercises completion and full-health confirmation. Movement cancels; Full test area resets health and cancels work. Willowbank Eat checkpoint exercises the same shared controller and tutorial callback.
- Validation: 112 tests passed; normal/debug builds and debug isolation passed (existing bundle-size warning). Isolated Chrome exercised clearing eating before a chapter visit (20→30 health, one fish consumed), repeated full-health consumption with confirmation, movement cancellation (no consumption/healing), and Willowbank Eat checkpoint completion (phase finished, one meal observed). Checkpoint validation does not represent a full tutorial replay. Unit tests also cover missing food, confirmation cancellation, repeated completion, and health bounds.

## Fishing extraction — 2026-10-04

- `fishing.js` owns the action, skill, tool/reach checks, skill-adjusted wait, one-time fish/XP reward at the bite, and cancellation. `main.js` drives it independently of the chapter and exposes Fishing directly to normal Skills and playground controls.
- `fishing-spots.js` owns portable spot registration, hit targets, ripples, highlights, availability, and removal. Tile identity prevents spots from another map with matching coordinates from being used. `fishing-spot-model.js` supplies the same model and motion to the catalogue.
- `fishing-presentation.js` owns the player's rod and caught fish, using existing cast, hook, line-anchoring, and celebration animations. Willowbank retains only its spot placement and tutorial start/catch observers. First-catch dialogue waits for shared actions, movement, and journal use. Removed stale area-owned eating-update and fishing-preview timing branches.
- Playground: World & water → Fishing practice documents the clearing pond fixture at (4, 4). Add a Crude Fishing Rod through Inventory controls and click the ripples. Skills controls adjust Fishing XP/levels; the model viewer exposes cast, wait, catch, and celebration; Full test area cancels and resets rewards. The fixture, its instructions, and inspection state remain behind the compile-time flag. Full test area now restores clearing visibility after customization preview; browser-verified a catch after that reset.
- Validation: 119 unit tests, both builds, and debug isolation passed (existing bundle-size warning). Browser checks covered the real pointer path in the clearing before any chapter visit: missing rod, cancellation before the bite, repeated catches, one-time reward timing, opening Inventory/skipping the flourish without losing rewards, and reset. Willowbank's fishing checkpoint awarded one fish/20 XP and advanced to Flint with delayed dialogue. A separate actual crystal-travel run verified retained rewards and fishing in Willowbank's initial meet phase, before its quest began; returning to the clearing preserved rewards and allowed a third catch. Unit tests cover return-map identity, invalidated/removed spots, reusable tools, configured loot, and rod-line anchors.
- Remaining extraction order: carpentry, resource action/lifecycle consolidation, combat/equipment, then remaining skill/model/UI adapters. Fishing does not remove those other area dependencies.

## Carpentry extraction — 2026-10-04

- `carpentry.js` owns the app-level skill, tool/material checks, skill-adjusted timing, progress stages, cancellation, material consumption, XP, and repair motion. Targets configure recipe/stages and availability and receive start/progress/completion callbacks. A target may pause for local narrative without spending materials early.
- `carpentry-bridge.js` owns the portable bridge model, picking, highlight, progress, completed interaction state, reset, and map identity checks. `bridge-model.js` and `tool-models.js` now supply gameplay and catalogue factories. Willowbank retains the bridge quest gate, scripted finger injury/dialogue, terrain transition, and rescue sequence.
- Playground: World & water → Carpentry practice documents the clearing fixture at (2, 4). Inventory grants hammer/logs, Skills adjusts Carpentry, the model catalogue reuses real hammering/bridge models, and Full test area cancels and resets the fixture and rewards. These controls and the fixture stay behind the playground flag.
- Validation: 122 tests; normal/debug builds and debug isolation passed (existing Vite bundle-size warning). Browser exercised real pointer interactions in the clearing before any Willowbank visit: missing hammer, movement cancellation, completion with three logs consumed/hammer retained/40 XP, full reset, and repeated completion. Willowbank's repair checkpoint exercised the injury pause at 25 health, resumed repair, exactly three logs/40 XP, and companion crossing/acquisition. Screenshots inspected for clearing completion and injury dialogue. This is checkpoint coverage, not a complete replay from the opening. Unit tests cover travel/map replacement cancellation and return-map identity; actual crystal travel was not rerun for this extraction.
- Next: resource action/depletion/respawn consolidation, then combat/equipment and remaining UI/model adapters. Existing earlier verification notes are historical snapshots.
