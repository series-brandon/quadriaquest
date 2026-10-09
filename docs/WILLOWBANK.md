# Willowbank: Broken Bridge Rescue

The second tutorial focuses on dialogue, carpentry, followers, fishing, cooking, and eating. Reed is a worried fisher slime: the bridge collapsed unexpectedly while a local animal was playing on the island. The animal is a visitor, not Reed’s pet. Combat and equipment instruction belong to the planned third area, [Cinderhold](CINDERHOLD.md).

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

The shared Campfire recipe picker lists all recipes tagged with the fire station, with search, ingredient availability, and selected recipe details. Desktop uses a split pane; mobile uses a full-screen list/detail flow. Cook one consumes the selected recipe’s ingredients and produces one item; batch cooking is deferred.

Eating Cooked Pondfish restores 10 health, visibly healing the tutorial injury. Full-health eating still requires confirmation.

## Rules and materials

- Health starts at 30. Carpentry, Fishing, and Culinary use 120 XP per level; skill levels reduce activity duration.
- All required materials can be replenished locally through respawning ground bundles, trees, boulders, and Flint. Axes and pickaxes remain craftable. These are shared resource prefabs/actions: trees and boulders use a 3–6 second base duration (reduced by skill level), yield 1–3 materials and 20 XP, and respawn after eight seconds when their tile is free. Ground bundles remain walkable.
- Repair requires a Crude Hammer in inventory and consumes Small Logs ×3 on completion; six seconds with three construction stages and 40 Carpentry XP.
- Fishing waits four seconds (skill-adjusted), then plays a hook pull followed by the shared acquire celebration before returning to idle. Each bite commits one Raw Pondfish and 20 Fishing XP exactly once; click the spot again for another. Movement can interrupt the wait for no reward, or skip the flourish after the catch while retaining its fish and XP. The lesson requires one Raw Pondfish.
- Cooking is guaranteed, takes three seconds per fish, and grants 20 Culinary XP.
- Campfires use clear buildable tiles, explicit placement confirmation, and can be packed up. Flint and Stone is reusable; no fuel/bait system yet.
- Companion name defaults to Pebble (1–20 characters). Rename and Follow/Rest use the Companions tab. The follower is cosmetic and cannot take damage.
- Sword/shield recipes, equipment actions, and Combat skill are shared and available without an area prerequisite. Willowbank does not teach or require combat.
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
- **Combat → Combat practice**: explicitly spawns portable goblins in the current area; provides approach/fight, reset, remove, and actual defeat/respawn controls. Use normal recipe/inventory actions for equipment and the shared model viewer for animations. This adds no combat objectives to Willowbank.

## Shared presentation and map layout

The clearing, title garden, and Willowbank use `world-models.js` for complete grass tiles, exposed-edge rounding, seams, trees, flowers, and water construction. Ground bundles use `ground-item-models.js`; all slimes use `slime-model.js`. Water hides internal and top block faces beneath the animated surface. Resource highlights follow nested animated meshes. Add future shared assets here rather than recreating them per map.

Willowbank occupies an irregular 24 × 18 footprint. Reed and the crystal are in the safe northwest meadow; a terraced woodland (1, 1.5 and 2 block elevations) separates arrival from the bridge and island. The bridge crosses three water tiles to the eastern island. Fishing and Flint are on the southern shore with nearby campfire space. `WILLOWBANK` holds the principal landmark coordinates.

The first visit uses four narrator lines, focuses smoothly on Reed, holds until dismissed, and returns smoothly to the player. Destination camera setup happens under the teleport fade. No area-title overlay is displayed. Return visits retain quest progress and skip the introduction.

Willowbank tips use the clearing's actual tutorial component and handlers, including item emphasis, completion colors, help, dismissal and mobile journal placement. Ground pickups in both areas use the same cardinal-adjacency route selection and Gathering timing. No reachable neighboring tile means the interaction is rejected.

Dialogue uses a short fixed-height card. Advance a question to reveal standalone centered responses without a model or card. Consecutive lines from one speaker keep their portrait in place. Conversation text and actions retain fixed positions when speakers change. One close-up animated portrait appears at a time, angled inward, with an overlapping speaker nameplate. Mobile places the portrait above the reading/action area. The portrait copies live equipment and facial state and uses the shared slime idle motion.

The corgi uses the same shared model and walk cycle for rescue, following, previews, and its journal portrait. Its trapped expression lowers its ears, head, and tail; after rescue it trots across the repaired bridge, approaches the player, and becomes their first companion.

Combat models, equipment, damage rules, pursuit, defeat, hit splats, and animation previews remain available through the explicit dev combat sandbox. No goblin actors are created for ordinary Willowbank play. The combat narrative is reserved for area three; see the implementation handoff in [DESIGN.md](DESIGN.md#area-three-combat-tutorial-outline).

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

Carpentry uses a steady, forward-centered off hand to brace an imaginary board near eye level, with short wrist-led hammer taps forward beside it. Both hands remain in front of the body; the shared Crude Hammer has a compact head and short handle. The hammer winds up gently, pauses, strikes quickly, and settles briefly. This shared Repairing pose is exposed as Slime → Carpentry in the model viewer and Repairing in the chapter animation controls.

Defeat uses the shared Fainted expression (spiral eyes) and a 2.4-second brief teeter and quick 0.52-second backward flop ending face-up, followed by a slower squish starting at 0.72 seconds and ending at 65% vertical thickness. A small landing bob precedes the lopsided squish. During deflation, three small, quicker side-to-side sways taper away into the resting pose, giving the face side a balloon-like wobble. Hands stay with the body through the fall, then drop in 0.18 seconds as the squish starts. The body stays uncompressed during the fall, and hands remain round, tucked close beside the body on the ground. A brief resting beat precedes the respawn fade, with return to the Iter Crystal at 3.6 seconds. The model viewer exposes Defeated plus an independent Fainted expression; chapter animation controls loop the same defeat sequence.

The shared model viewer includes Fishing catch, Celebration, Jump up, and Jump down, all using gameplay motion functions. Raw Pondfish is a portable model in the catalogue. The Willowbank Fishing catch loop previews without rewards; the fish checkpoint exercises the real one-catch interaction, rewards, and tutorial continuation.

The rod flexes under tension and its line is rebuilt from the bent tip to a fixed world-space water anchor after player transforms update. Fishing catch is only the sideways hook pull; gameplay chains it into Celebration with Raw Pondfish. Celebration accepts any held model; the viewer offers Generic item, Raw Pondfish, and Top Hat. Model and expression lists are alphabetized, with Default first for expressions. Animation lists put Idle (or Static) first and preselect it; remaining animations are alphabetized. Models without either use their catalogue default first.

Fishing catch swings the rod tip outward from the slime while keeping the line anchored. Celebration uses one lift curve for hands and item, with hands closer together and the item just above them.

The hook pull pivots close to the bottom of the rod, with only a small outward grip shift. Celebration props stay visible throughout the full animation; the owning sequence hides them only when it ends.

Fishing catch defaults to Struggle, raises the rod closer to vertical with a restrained outward tilt, and adds extra flex at full line tension.

The catch now pairs a stronger backward body lean with a nearly upright rod and minimal sideways tilt, keeping the lower-end pivot steady while the slime pulls against the line.

At full catch pull, the lower shaft is parallel to the slime’s face (sharing its backward lean), while the upper shaft bows markedly toward the fixed water anchor under full tension.

Fishing catch preserves the rod tip’s pre-catch world position while the grip pulls back. Cubic flex weighting keeps the thick lower shaft stiff and concentrates bending toward the thin tip; the line still connects that tip to its fixed water anchor. Each new cast or preview loop captures a fresh tip position.

Rod flex preserves the 1.7-unit shaft length using equal-length sections. During the catch it favors the pre-catch tip height while allowing horizontal retreat toward the player, avoiding stretch from a fully pinned tip. Curvature increases toward the thin upper section.

Celebration placement accounts for each prop origin: the top hat rests by its brim, while centered fish and generic models use smaller clearances above the hands.

The shared bridge has mirrored support posts on both sides (six for the three-tile bridge). Boards use uniform spacing across tile boundaries. Repair fills half the deck, completes the deck, then adds side railings; invisible picking surfaces preserve completed-bridge navigation without a solid block beneath the boards. Broken/Repair stages/Repaired previews use the same factory.

Bridge repair starts by clicking any broken bridge tile. All boards/posts provide hover and tutorial highlighting, with a picking target on every tile covering gaps. Every tile selects the same repair interaction; the player approaches from safe land at the mainland end. Completion converts it back into walkable bridge decking; reset restores repair interaction. The separate bridge repair marker model has been removed from gameplay and the catalogue. The Repair bridge debug action uses this same target.

After bridge repair, the player slides to a clear tile beside the mainland landing and turns toward the companion. The dog waits for that move to finish before crossing, then arrives on the empty landing. The playground bridge checkpoint and Repair bridge action replay this same sequence; Reset Willowbank clears it.

Fishing begins with a shared 1.2-second Fishing cast (backswing, forward toss, line flight and settle), using the struggle expression by default like Fishing catch. Catch holds the full pull for a short damped wobble before celebration. Both motions are available independently in the shared Slime preview and chapter animation controls; the fishing checkpoint plays the complete sequence.

Campfire placement previews the shared ghost on the hovered tile, green when empty and reachable from an adjacent tile, red otherwise. The tooltip describes placement rather than movement. A valid click pins the ghost and immediately walks the player over to place it; an invalid click shows a toast and keeps placement active. Cancelling or changing actions removes the ghost without consuming the item. The companion avoids the pending placement tile. Use the playground place checkpoint and placement action to repeat the same inventory placement flow.

The shared corgi now uses a much smaller rounded rectangular torso and an overall 0.78 scale, keeping its expressive head prominent. Each of its four paws and its tail is a single sphere. Walking animates the paws with a small stepping motion; the tail nub sways, while existing ear, eye, head and mouth expressions remain. The shared Corgi Idle/Walk preview with Happy/Sad expressions and Willowbank follower controls use this same model.

Corgi ear refinement: smaller ears sit deeper inside the rounded head so their lower edges remain hidden when upright; curved tips and smoother bevels soften the silhouette. The spherical tail shares the tan coat material. Shared Idle/Walk and Happy/Sad previews cover these changes.

Sad corgi ears now rotate outward into a sideways droop. The tail nub sits slightly higher, above two softly rounded cream rectangles on the rump. These details remain part of the shared model and Happy/Sad animation previews.

Player and companion naming share a dice button with separate pools: the original 58 player names and the 33 corgi names use title case (each word starts uppercase, with its remaining letters lowercase) (such as Sass Potato and Sir Nubsalot). Rolls avoid the current name. Opening input dialogues use the same compact height as other dialogue; the introductory island supports drag/arrow rotation and scroll/pinch zoom without unlocking movement. Playground → Tutorials & objectives → Replay color & name setup replays the real opening customization, and the Willowbank name action covers companion naming.

Opening camera framing follows the area, not dialogue presentation: the single-tile island keeps its customization framing from before the drop through naming, and the clearing switches to its normal framing during the fully obscured transition. Showing the first dialogue no longer changes the camera aim. The customization replay uses the same camera path.

Cooking execution is app-owned in `src/cooking.js`, with shared recipes in `src/recipes.js`. Willowbank supplies a campfire availability/pack adapter and a quest-completion callback; it does not own the cooking timer, item conversion, or Culinary XP. Debug UI preview opens the shared menu without teleporting, granting items, or attaching a fake station.

Fishing is app-owned in `fishing.js`, with portable spots in `fishing-spots.js`, the shared ripple model in `fishing-spot-model.js`, and rod/fish presentation in `fishing-presentation.js`. Willowbank configures its pond placement, hides its lesson tip when work starts, and observes the first catch for quest progression. Reed waits until shared actions, movement, and journal use finish before giving his follow-up.
