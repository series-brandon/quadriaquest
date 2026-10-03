# Willowbank: Broken Bridge Rescue

The second tutorial focuses on dialogue, carpentry, followers, fishing, cooking, and eating. Reed is a worried fisher slime: the bridge collapsed unexpectedly while a local animal was playing on the island. The animal is a visitor, not Reed’s pet. Combat and sword/shield instruction belong to the planned third area.

## Flow

Talk to Reed → agree to help → thank-you and camera view of the broken bridge/island → craft Crude Hammer → repair bridge → one-time hammer injury → finish repair → rescue/name companion → craft fishing rod → catch fish → gather Flint → craft fire starter and Campfire → place Campfire → cook → eat → Willowbank completion.

Reed’s choices remain flavor choices with refusal and re-entry. Accepting completes the dialogue objective and opens the bridge task directly. The island camera stays focused until the player advances; the world is undimmed and the portrait hidden during the pan.

## Bridge injury and healing

The first tutorial repair pauses at 75% progress. The slime recoils and shakes its hand for 1.2 seconds, loses 5 health (never below 1), and displays the existing damage splat. The player says: “Youch! I smashed my finger!” Dismissing the line resumes the same repair from its saved progress. Inputs and XP are awarded only when repair finishes.

The event is chapter-specific, not a random carpentry penalty. It remains consumed if the player later cancels/restarts the repair or changes areas. Explicit chapter reset resets the event. Ordinary repairs and animation previews do not apply this injury.

After the rescue and companion naming, Reed says:
- “Thanks for helping that little one! How’s your hand?”
- “Here—let me teach you how to catch yourself a meal. A little food should help you feel better.”
- “First, you’ll need a fishing rod. A simple one will do.”

Eating Cooked Pondfish restores 10 health, visibly healing the tutorial injury. Full-health eating still requires confirmation.

## Rules and materials

- Health starts at 30. Carpentry, Fishing, and Culinary use 120 XP per level; skill levels reduce activity duration.
- All required materials can be replenished locally through respawning ground bundles, trees, boulders, and Flint. Axes and pickaxes remain craftable.
- Repair requires a Crude Hammer in inventory and consumes Small Logs ×3 on completion; six seconds with three construction stages and 40 Carpentry XP.
- Fishing repeats four-second catches until interrupted: one Raw Pondfish and 20 Fishing XP each. The lesson requires two fish.
- Cooking is guaranteed, takes three seconds per fish, and grants 20 Culinary XP.
- Campfires use clear buildable tiles, explicit placement confirmation, and can be packed up. Flint and Stone is reusable; no fuel/bait system yet.
- Companion name defaults to Pebble (1–20 characters). Rename and Follow/Rest use the Companions tab. The follower is cosmetic and cannot take damage.
- Sword/shield recipes and Combat skill are not exposed by the Willowbank lesson. The explicit dev combat sandbox enables them for testing.
- Completion leaves the area explorable and the return crystal usable. There is no third destination or prototype-ending message here while area three awaits design.

## Recipes

| Output | Consumed | Reusable tool | Seconds |
|---|---|---|---:|
| Crude Hammer | Sticks ×1, Rocks ×1 | — | 2 |
| Crude Fishing Rod | Sticks ×2 | — | 2 |
| Flint and Stone | Flint ×1, Stone ×1 | — | 2 |
| Campfire | Small Logs ×2 | Flint and Stone | 3 |
| Cooked Pondfish | Raw Pondfish ×1 | Placed Campfire | 3 |

Crafting awards 20 Crafting XP; cooking awards Culinary XP instead.

## Playground coverage

- **Replay bridge introduction**: revised acceptance dialogue and island camera view.
- **bridge checkpoint → Repair bridge**: actual approach, repair stages, injury, damage, dialogue pause/resume, costs, rescue, and naming.
- **Hammer injury** animation: repeatable recoil/hand-shake preview with no damage.
- Later checkpoints start with the repaired bridge, owned companion, 25 health, and the injury marked consumed so cooking/eating has the proper context.
- **Reset Willowbank**: removes combat fixtures and clears injury, repair, companion, effects, health, and quests.
- **Load combat sandbox (deferred area 3)**: explicitly spawns existing goblins and enables combat recipes/skill; fight, pursuit, defeat, equipment, splat, wander, and model controls remain available. This does not add combat objectives to Willowbank.

## Shared presentation and map layout

The clearing, title garden, and Willowbank use `world-models.js` for complete grass tiles, exposed-edge rounding, seams, trees, flowers, and water construction. Ground bundles use `ground-item-models.js`; all slimes use `slime-model.js`. Water hides internal and top block faces beneath the animated surface. Resource highlights follow nested animated meshes. Add future shared assets here rather than recreating them per map.

Willowbank occupies an irregular 24 × 18 footprint. Reed and the crystal are in the safe northwest meadow; a terraced woodland (1, 1.5 and 2 block elevations) separates arrival from the bridge and island. The bridge crosses three water tiles to the eastern island. Fishing and Flint are on the southern shore with nearby campfire space. `WILLOWBANK` holds the principal landmark coordinates.

The first visit uses four narrator lines, focuses smoothly on Reed, holds until dismissed, and returns smoothly to the player. Destination camera setup happens under the teleport fade. No area-title overlay is displayed. Return visits retain quest progress and skip the introduction.

Willowbank tips use the clearing's actual tutorial component and handlers, including item emphasis, completion colors, help, dismissal and mobile journal placement. Ground pickups in both areas use the same cardinal-adjacency route selection and Gathering timing. No reachable neighboring tile means the interaction is rejected.

Dialogue uses a short fixed-height card. Advance a question to reveal standalone centered responses without a model or card. Consecutive lines from one speaker keep their portrait in place. Conversation text and actions retain fixed positions when speakers change. One close-up animated portrait appears at a time, angled inward, with an overlapping speaker nameplate. Mobile places the portrait above the reading/action area. The portrait copies live equipment and facial state and uses the shared slime idle motion.

The corgi uses the same shared model and walk cycle for rescue, following, previews, and its journal portrait. Its trapped expression lowers its ears, head, and tail; after rescue it trots across the repaired bridge, approaches the player, and becomes their first companion.

Combat models, equipment, damage rules, pursuit, defeat, hit splats, and animation previews remain available through the explicit dev combat sandbox. No goblin actors are created for ordinary Willowbank play. These mechanics are reserved for area three; see the implementation handoff in [DESIGN.md](DESIGN.md#area-three-combat-tutorial-outline).

## Presentation polish

The quest journal calls this chapter **Broken Bridge Rescue**. Reed's acceptance cutscene focuses on the stranded animal itself. The player's first conversation uses branch-specific expressions, then switches to a happy smile for ‘I’ll help.’ This transition is replayable through the playground’s meet checkpoint and talk action.

The shared Campfire factory uses three crossed logs with flames at their center. Fishing spots use three pale expanding rings contained within the fishable tile, rather than a floating bobber. Fishing holds the rod centrally with both hands and leans it forward over the water; the supporting hand follows the actual shaft transform. Hammer heads face the work rather than sideways.

Playground coverage: Concerned in animation controls; Repairing and Fishing in chapter animation loops; Replay bridge introduction for the animal camera focus; talk at the meet checkpoint for the actual concerned portrait; fish/cook checkpoints for real interactions. Campfire and Fishing spot are also available in the shared rotating model preview. Reset Willowbank restores these interactions.

## Dialogue expression rules

Every character dialogue line must explicitly specify a supported expression, including neutral `idle`. The shared dialogue renderer rejects missing/unknown expressions. Expressions belong to lines, never inferred from quest phase. A speaker keeps their last expression while listening; closing/resetting the conversation clears these overrides. Switching expression on the same speaker must not restart the portrait entrance animation. The unseen narrator has no character portrait to animate.

| Moment | Player | Reed |
| --- | --- | --- |
| Initial plea | — | Distraught |
| “What’s wrong??” and explanation | Shocked | Distraught throughout explanation |
| “Calm down, tell me what’s going on.” and explanation | Idle (slight smile) | Idle throughout deep-breath explanation |
| “I don’t have time for this” / “Oh… okay…” | Slight frown | Sad |
| “I’ll help.” / thanks | Happy | Happy |
| “I need a moment.” / acknowledgement | Idle | Idle |

Later lines also carry authored expressions: happy for celebrations, idle for instruction, struggle for the hammer injury. Playground animation previews include Shocked, Distraught, Sad, and Frown; the meet checkpoint and talk action replay all dialogue branches through the real renderer.
