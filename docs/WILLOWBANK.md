# Willowbank: A Friend Across the Water

The second tutorial replaces the Iter Crystal's placeholder destination. Reed, a fisher slime, asks the player to drive away two goblins and repair a bridge to a stranded cat-like companion. Dialogue choices add flavor and allow refusal/re-entry without losing progress. Only the active speaker's live animated model appears, sliding in from their side; player colors and cosmetics are shared with the world model.

## Flow

Talk to Reed → protected unarmed Scrapper fight → Stone Sword and Wooden Shield crafting/equipment → Bruiser fight → Crude Hammer and bridge repair → companion rescue/naming → fishing → Flint gathering → fire-starting tool and Campfire crafting → placement → cooking → eating → prototype completion.

Current objectives and completed history live under their own quest heading. Optional crafting guidance uses the real crafting menu. Tips can be dismissed; Reed and the journal retain instructions. Completed early encounters and owned equipment count. The area stays explorable after completion.

## Rules

- Player health: 30. Unarmed: 1–3 damage every 1.5 seconds. Sword: 3–5. Shield: minus 1 incoming damage, minimum 1.
- Player hit chance: 90%, increasing 0.5 percentage points per Combat level (cap 98%). Enemy hit chance: 85%.
- Scrapper: 8 health, 1 damage every 2.5 seconds. This encounter cannot reduce player health below 1.
- Disengaging allows a short pursuit within three tiles of the enemy’s home; the crystal is safe. Enemies return and reset after losing interest.
- Bruiser: 24 health, 3–5 damage every 2 seconds. Defeat respawns the player at the area's Iter Crystal with full health and inventory retained.
- Combat, Carpentry, Fishing, Culinary use 120 XP per level. Activity durations decrease with skill level.
- Ground supplies and harvest nodes regenerate, providing a renewable local source of every required material.
- Tool possession enables interactions; combat equipment must be equipped. Hats remain a separate slot.
- Crafting, repairs, and cooking consume inputs only on successful completion. Moving interrupts the current action.
- Bridge repair is one six-second interaction with three visible stages and 40 Carpentry XP.
- Fishing repeats four-second catches until interrupted: one Raw Pondfish and 20 Fishing XP each.
- Cooking is guaranteed, takes three seconds per fish, and awards 20 Culinary XP. Cooked Pondfish restores 10 health. Eating at full health requires confirmation.
- Campfires require buildable clear ground, use explicit placement confirmation, and can be packed up. Flint and Stone is reusable. No fuel or bait management yet.
- Companion naming defaults to Pebble (1–20 characters). Follow/Rest and Rename are in the Companions journal tab. Followers are cosmetic, cannot block movement or take damage, and follow across areas.

## Recipes

| Output | Consumed | Reusable tool | Seconds |
|---|---|---|---:|
| Stone Sword | Stone ×2, Sticks ×1 | — | 3 |
| Wooden Shield | Small Logs ×2, Sticks ×1 | — | 3 |
| Crude Hammer | Sticks ×1, Rocks ×1 | — | 2 |
| Crude Fishing Rod | Sticks ×2 | — | 2 |
| Flint and Stone | Flint ×1, Stone ×1 | — | 2 |
| Campfire | Small Logs ×2 | Flint and Stone | 3 |
| Cooked Pondfish | Raw Pondfish ×1 | Placed Campfire | 3 |

Crafting recipes award 20 Crafting XP; fish cooking awards Culinary XP instead.

## Playground coverage

The Willowbank section enters the real area transition, loads quest checkpoints with supplies, resets the area, replays dialogue, heals/injures/defeats the player, starts real fights/repair/fishing, previews placement and pet naming, and loops chapter animations. All new skills and items use existing arbitrary XP/level and inventory controls. Companions and crafting use the actual journal interfaces. Checkpoint controls are excluded from normal builds by `__PLAYGROUND__`.

## Shared presentation and map layout

The clearing, title garden, and Willowbank use `world-models.js` for complete grass tiles, exposed-edge rounding, seams, trees, flowers, and water construction. Ground bundles use `ground-item-models.js`; all slimes use `slime-model.js`. Water hides internal and top block faces beneath the animated surface. Resource highlights follow nested animated meshes. Add future shared assets here rather than recreating them per map.

Willowbank occupies an irregular 24 × 18 footprint. Reed and the crystal are in the safe northwest meadow; a terraced woodland (1, 1.5 and 2 block elevations) separates arrival from the two encounters. The bridge crosses three water tiles to the eastern island. Fishing and Flint are on the southern shore with nearby campfire space. `WILLOWBANK` holds the principal landmark coordinates.

The first visit uses four narrator lines, focuses smoothly on Reed, holds until dismissed, and returns smoothly to the player. Destination camera setup happens under the teleport fade. No area-title overlay is displayed. Return visits retain quest progress and skip the introduction.

Willowbank tips use the clearing's actual tutorial component and handlers, including item emphasis, completion colors, help, dismissal and mobile journal placement. Ground pickups in both areas use the same cardinal-adjacency route selection and Gathering timing. No reachable neighboring tile means the interaction is rejected.

Conversation text and actions retain fixed positions when speakers change. One close-up animated portrait appears at a time, angled inward, with the speaker's name underneath. Mobile places the portrait above the reading/action area. The portrait copies live equipment and facial state and uses the shared slime idle motion.

Goblins have articulated shoulders and legs, rounded tunics, idle/blink, patrol steps, attack windup/contact/recovery and hit reactions. Each goblin independently checks every 2–4 seconds, with a 25% chance to choose any reachable destination in its designated patrol area. Routes can span multiple tiles, stay inside the area, and avoid occupied tiles and player routes. Dialogue, combat and approaching the goblin interrupt wandering. The playground’s “Wander goblins now” button exercises the same route planner immediately; Reset Willowbank restores independent timers. The cat has a rounded oversized head, grounded paws, blinking, ear/tail motion, sad trapped posture and bounding follow movement.

The dev menu includes Shared model preview (real factories and animation functions), first-arrival replay, goblin and cat animation loops, and the existing encounter/bridge/fishing checkpoints. Crafting uses a two-column browser on desktop and list/detail navigation on mobile, with inset selection borders and separate ingredient/time/output sections.
