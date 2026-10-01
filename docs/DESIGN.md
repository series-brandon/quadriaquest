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

- [Mockup 1](references/Mockup_1.webp): clear block-height differences and stepped map composition.
- [Mockup 2](references/mockup2.png): readable tiles and subtle separation between neighbors.
- [Mockup 3](references/mockup3.jpg): softened exposed edges, adapted to avoid rounding shared tile boundaries.
- [Mockup 4](references/mockup4.avif): tile separation, based on the user's description; this image could not be rendered during drafting.

These reference files are stored in the project under `docs/references/`. Pixel art, exact colors, and the references' material styles are not requirements.

**Deferred decisions.** Final character design, detailed art direction, transportation fiction, respawn locations, combat formulas, and the broader progression systems remain open. None blocks the first playable prototype.

**Opening sequence.** Introduce the world as Quadra on a single floating grass tile, with the existing HUD hidden. After a brief pause, the default slime falls onto the tile. A mysterious speaker (???) delivers one line per click/tap, guides live slime color selection and name entry, and asks for confirmation of each choice with a retry option. Fade out to the gray background, reveal the clearing without the player, then drop the customized slime onto the spawn tile. Further dialogue introduces the clearing, followed by ordered camera rotation, camera zoom, movement, and six-resource gathering lessons. Rotation accepts arrow keys or screen dragging; zoom accepts the wheel or a two-finger pinch. Each lesson holds its success message until the player explicitly clicks Click to continue. After gathering, this button begins the crafting introduction. Movement succeeds only after arrival at a different reachable tile. Until the gathering lesson, resource clicks act only as movement commands and do not collect anything. Keep the old HUD hidden while it is redesigned; retain only dialogue, contextual interaction feedback, and the tutorial instruction/progress card.

Gathering awards 20 XP per completed pickup. The prototype starts Gathering at level 1 and grants level 2 at 120 XP (six items), improving gathering speed by 8%. An animated XP notification accompanies each award, and leveling up adds a celebration. The first XP award pauses the gathering tutorial for an explanation; Continue restores the collection instructions and progress. The first level pauses for its own explanation; Okay returns to the six-item success message, whose Continue button begins the crafting introduction. Skill progress currently resets with the session.


The next tutorial leg introduces crafting through one-line dialogue, then reveals a bottom-right game menu. Golden outlines and floating arrows guide the menu button, Crafting option, and Crude Axe recipe. The axe takes 1 Stick, 1 Stone, and two uninterrupted seconds to craft. Materials are consumed only on completion; moving cancels the action without consuming them. Crafting uses the slime’s hand animation and overhead progress marker, awards 20 Crafting XP as floating text, and ends with a success message that requires Continue. In-game item names in instructions and recipes are highlighted.

After the axe is crafted, dialogue introduces woodcutting. Trees receive golden outlines and arrows until the first tree is felled. Clicking a tree with a Crude Axe in inventory routes the player to an adjacent reachable tile and starts a 3–6 second chopping action with an animated axe. Moving interrupts chopping and restarts its progress on the next attempt; clicking the same tree does not interrupt it. The completed tree falls, clears its blocked tile, and rewards 1–3 Wooden Logs and 20 Lumberjack XP. A dismissible success message completes this tutorial leg. Crafting remains accessible afterward.


**Development playground.** A separate `playground` build mode bypasses onboarding and opens the clearing as a test area, with an axe and starter supplies. Its collapsible panel supports arbitrary quantities of existing inventory items, XP and level changes for implemented skills, play-once/loop animation previews with speed controls, independent visual feedback triggers, and resets for resources, trees, and the whole test area. It uses the same movement poses and hand animations as normal gameplay. All developer UI, styles, and mutation controls are gated by a compile-time flag and excluded from normal builds. Normal and debug modes run on separate local ports so the onboarding flow can be tested alongside the playground. See README for run/build commands and the build-isolation check.


**Playground maintenance requirement.** Every addition must also be available for debugging in the dev playground in the same change, with appropriate controls or test-area coverage to exercise, repeat, and reset it. Existing support must stay current as behavior changes. Never move forward leaving debug support outdated. If unsure whether or how to add that support, ask the user rather than omitting or deferring it. Share actual gameplay implementations and preserve exclusion from normal builds. See [project instructions](../AGENTS.md#keep-the-dev-playground-current) for the standing workflow and verification requirements.


**Chopping motion.** The slime uses its right hand for the axe. Each repeating swing draws back, lifts, starts the strike with a vertical drop, then sweeps sideways halfway through to form an L-shaped path, rolling the axe outward roughly 45 degrees and turning the blade into the side of the tree, briefly holds, and recovers. The free hand reaches forward during the wind-up and retracts to the side during the strike. Body lean and twist follow the same cycle, and the axe blade faces forward toward the tree. Gameplay and the playground Chopping preview share this motion, including full-cycle looping and slow-motion playback.

**Tutorial clearing finale.** After the first tree's success is acknowledged, ??? congratulates the player and introduces the Iter Portal. A roughly two-player-high, irregular faceted crystal drops into a free reachable tile, settles into a gentle hover, and receives the familiar gold outline and arrow. A final line offers more practice; all trees and ground items drop back into place. This reset preserves inventory and skills. Players can click the portal when ready to approach it and fade into a simple placeholder area. A return portal preserves access to the clearing and its remaining practice objects.

**Hidden practice reward.** Clearing every tree and ground item after the practice reset triggers the supplied surprise dialogue, without a visible checklist. A wooden chest drops near the player on a reachable free tile. Opening it works like gathering: approach, wait briefly, and restart if interrupted by movement. It grants one fancy Top Hat once. The slime turns away from the chest and happily raises the hat in both hands while the camera closes in, then returns to normal play. The player can wear or remove the hat using a dedicated cosmetic button. The reward is tracked by cleared world objects rather than inventory totals.

All finale beats have dev playground replay/reset controls, including actual portal/chest approach interactions, optional-practice completion, travel both ways, Top Hat inventory edits and gain/loss previews, and looping/slowed hat presentation. Portal/chest highlighting and all drop animations use shared gameplay effects. The placeholder area is intentionally just a navigable island and return portal until the next tutorial area is designed.


Confirming the slime color plays a happy hop; confirming the name plays a small leaning wave with the right hand above the head. Dialogue waits for each brief reaction to finish. After 30 seconds of inactivity, the slime dozes with closed eyes, soft breathing, and floating Zs. Movement, work, and cinematic sequences prevent sleep; clicks/taps and dialogue activation wake it, while orbit dragging, pinch/scroll zoom, and camera keys leave it asleep. It settles into a lopsided squish over two seconds before the Zs begin; Zs spawn every 1.4 seconds and rise slowly with a gentle sine-wave drift. The playground Sleeping loop settles once, then keeps breathing; Doze off and Wake up exercise the natural sleep/wake behavior without waiting 30 seconds. Happy hop, Wave, and Sleeping are shared animations available in the playground with play-once, loop, and speed controls.


The wave bends the upper body away from the raised hand while keeping the base flat and stationary. The face follows the curved body, and a worn hat follows the crown. The hand follows the bend as it rises, reaching slightly over the head with a short side-to-side wobble. Sleeping uses the same grounded bend for its lopsided slump instead of rotating the base off the ground. These deformations are shared by gameplay and the playground previews.

### Title screen and prototype ending

The current title is **Quadra Quest**. Normal play starts on a title screen with a Play button and a live 3D vignette: a sleeping slime, drifting Zs, and a distinct floating garden with tile-centered trees at gameplay scale, flowers, a small pond, and half-height ledges. The opening tutorial waits until Play is pressed. The playground skips this screen by default and provides **Preview splash screen**; Play returns to the test area there. Entering the second area displays “You've reached the end of the prototype! Thanks for playing!” after the transition. Dismiss it to explore or return through the portal. The playground's **Enter placeholder** control exercises this same ending.

The playground’s **Compare UI styles** opens four experimental directions: Twilight Storybook, Pocket Adventure, Clay & Linen, and Moonlit Arcade. Each has title, dialogue, and gathering-card samples, plus a live splash preview with a theme selector and current-default comparison. Twilight Storybook is the selected production direction: plum text and buttons, warm ivory panels, muted peach accents, a Georgia title, and readable humanist sans-serif UI text. The other directions remain session-only, developer-only studies.

### Skills menu introduction

After the first Gathering level-up explanation, introduce Skills before returning to the “All six collected!” success. Move the “Oh, right, sorry, just a sec…” menu-button reveal here. Guide the player through the game menu and Skills, highlight Gathering, then explain that skills can be checked any time. Continue and Got it explicitly advance these explanations. Crafting later reuses the revealed game menu and unlocks its Crafting option.

The Skills menu lists every implemented skill (Gathering, Crafting, Lumberjack), with level, total XP, progress toward the next level, and XP remaining. The current prototype uses 120 XP per level. The playground provides Open Skills menu and Replay Skills tutorial, which sets Gathering to level 2 / 120 XP; XP and level controls refresh an open Skills menu. The replay also restores the shared “All six collected!” card after Got it, with its count, full progress bar, and dismiss button, so the return step is testable.

Game surfaces and dialogue suppress browser text selection and mobile tap highlights. Editable fields retain text selection and editing behavior. Horizontal mouse/touch dragging reverses orbit relative to its original direction; keyboard arrow behavior is unchanged. These shared input rules are exercised in the playground using camera dragging, Skills tutorial replay, and editable debug fields.

Ground resources have an invisible 0.5 × 0.5 × 0.5 tile-unit picking cube, centered on the tile and resting on its surface. Existing model hits still work outside the cube. Hover and click share these targets; collection, visibility, and movement-lesson restrictions remain shared with normal resource selection. The playground’s Show half-tile hitboxes toggle reveals the actual picking volumes, and Ground items resets them with the resources.

### Inventory menu introduction

Skills now leads into Inventory before restoring “All six collected!” and continuing to crafting. The narrator says: “Now, what happened to all those sticks and stones you picked up?”, “Assuming no holes in reality, you should have them stored safe and sound.”, and “Everything you collect goes into your inventory. Let's have a look!” The menu button, Inventory option, and Stick stack receive gold guidance in order. Explain stacks, require selecting Sticks to read their description, then use Got it to close the window and restore gathering success.

Inventory lists owned item stacks with icons, names, actual quantities, and selectable descriptions. It includes Sticks, Stones, Crude Axes, Wooden Logs, and Top Hats; empty inventory has an explicit empty state. The menu stays accessible after its introduction. Playground controls open the real menu or replay its tutorial; replay supplies three Sticks and three Stones. Skills replay includes this subsequent Inventory lesson. Existing add/remove controls update an open inventory and its selected details.
