# Project Clime design brief

Project Clime is a browser-based, 3D isometric, tile-based RPG/adventure with point-and-click controls. Exploration, mystery, adventure, progression, and questing drive the experience. This brief records the agreed direction and defines a small first playable prototype; the broader systems are a roadmap, not requirements for that first build.

The world starts with cozy fantasy, with humor and mysterious or eerie places such as caves. Other settings may be introduced later. Detailed art direction remains open.

**Core gameplay.** Players explore, talk to characters, complete quests, gather resources, obtain loot, craft equipment and supplies, and fight enemies. These activities feed a loop of discovery, improving capabilities, and venturing farther. Familiar resource locations remain useful destinations to revisit.

**Player character.** The player controls one cute, customizable protagonist that can level up and occupies approximately a 1×1×1 space in tile units. A slime cube is the leading concept, with simple deformation animations and floating hands for combat and skilling actions. Its final design remains open. Mechanics are developed for single-player first; multiplayer and potentially MMO play are longer-term ambitions.

**Controls and camera.** Point-and-click controls govern movement and interaction: click terrain to move, or an object or character to approach and interact. The camera uses perspective projection with an initially isometric-style viewing angle, stays centered on the player, and supports rotation, vertical tilt, and distance-based zoom. Hold left/right arrow keys to orbit and up/down to adjust elevation, limited to 20–75 degrees. Independent panning is excluded for now. Selection, destination, and current-action feedback should be clear.

Clicking a resource or enemy initiates a continuing interaction until it finishes or is interrupted. Repeated clicks on the current target preserve the ongoing action, timing, progress, and animation; they must not restart the action or cause movement or animation stutter. Detailed cancellation and target-switching behavior can be refined during implementation.

**Terrain and visual rules.** Maps are stylized 3D tile environments, with stepped block terrain and readable ledges.

- Terrain heights use half-block increments, with no smaller terrain elevation steps.
- Both half-height and full-height ledges are supported, avoiding a uniform full-cube appearance.
- No ramps are allowed.
- Exposed edges and corners are slightly rounded for a polished appearance.
- Neighboring blocks meet continuously: shared boundaries must not have rounding that creates gaps or troughs. Rounding depends on whether an edge is actually exposed, including at changes in elevation.
- Adjacent tiles remain subtly distinguishable through a small line, shadow, or similar restrained treatment. Tile seams are distinct from rounded exterior edges.

Characters automatically climb or hop up and down half-height ledges. Uninterrupted rises or drops of one full block or more require a safe route, such as stairs or ladders. Characters cannot jump off tall ledges. Stairs should respect the half-height terrain rule.

**World structure.** Distinct maps form an interconnected world linked by transportation. The final transportation mechanism and its fiction remain undecided; teleportation is the working tutorial concept. The opening uses a linear series of tutorial maps. After the tutorial, players freely select destinations, and all non-tutorial maps remain accessible for return visits.

Character level does not gate map entry. A level 5 player may visit a level 100 area and face its danger. Any difficulty guidance should inform the player rather than prevent entry.

**Progression.** Start with equipment stats and usage-based player skills. Performing an activity grants experience in its associated skill. Higher levels improve effectiveness: chopping trees grants lumberjack experience, and a higher lumberjack level makes trees faster to cut down. Other progression systems can be explored later.

**Combat and defeat.** Combat is real-time and stat-driven, inspired by the user's description of Old School RuneScape: attack rates, combat ranges, hit and damage calculations, and equipment support strategic play. Exact formulas remain undecided.

On defeat, the player respawns with all items and progression intact. The penalty is traveling back to resume the previous activity. Respawn locations remain to be defined.

**Tutorial roadmap.** Introduce systems through small practical tasks across a sequence of maps:

1. Learn movement and gather sticks and stones.
2. Craft a crude axe.
3. Teleport to a map with trees and chop down a tree.
4. Teleport to a fishing location and catch fish.
5. Craft basic weapons and armor.
6. Prepare food.
7. Fight an introductory enemy.
8. Make potions.

This sequence describes later introductory content, not the first prototype's scope.

**First playable prototype.** Build one small map with a few collectibles and a simple controllable character. Refine clicking, movement, UI feedback, and terrain presentation before adding the larger gameplay systems.

The prototype is successful when a player can:

- Rotate and zoom the camera while it remains centered on the character.
- Reliably click destinations and navigate around obstacles.
- Traverse half-height ledges in both directions while being blocked from unsafe full-height climbs or drops.
- Click collectibles, approach them, and receive clear collection and inventory feedback.
- Repeat a click on an active target without restarting or stuttering the interaction.
- Read terrain heights and subtle tile boundaries, with rounding only on exposed edges and corners.

Combat, crafting, the full skill system, multiple maps, transportation, defeat handling, and multiplayer are subsequent milestones. They do not need to be implemented to validate this first prototype.

**Technology.** Use web technology only: HTML, CSS, JavaScript, and Three.js. The game runs in a browser. Other programming languages and game engines are excluded. The first interaction target is mouse-based desktop browser play; other input methods are not specified.

**Visual references.** The supplied mockups guide individual qualities rather than mandate their exact art style or assets:

- [Mockup 1](/Users/brandonmanning/Desktop/Mockup_1.webp): clear block-height differences and stepped map composition.
- [Mockup 2](/Users/brandonmanning/Desktop/mockup2.png): readable tiles and subtle separation between neighbors.
- [Mockup 3](/Users/brandonmanning/Desktop/mockup3.jpg): softened exposed edges, adapted to avoid rounding shared tile boundaries.
- [Mockup 4](/Users/brandonmanning/Desktop/mockup4.avif): tile separation, based on the user's description; this image could not be rendered during drafting.

These reference files currently live outside the project. Pixel art, exact colors, and the references' material styles are not requirements.

**Deferred decisions.** Final character design, detailed art direction, transportation fiction, respawn locations, combat formulas, and the broader progression systems remain open. None blocks the first playable prototype.
