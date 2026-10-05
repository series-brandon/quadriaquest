# QuadriaQuest design brief

QuadriaQuest is a browser-based, 3D isometric, tile-based RPG/adventure with point-and-click controls. Exploration, mystery, adventure, progression, and questing drive the experience. This brief records the agreed direction and defines a small first playable prototype; the broader systems are a roadmap, not requirements for that first build.

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

1. Learn movement and gather sticks and rocks.
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

**Opening sequence.** Introduce the world as Quadria on a single floating grass tile, with the existing HUD hidden. After a brief pause, the default slime falls onto the tile. A mysterious speaker (???) delivers one line per click/tap, guides live slime color selection and name entry, and asks for confirmation of each choice with a retry option. Fade out to the gray background, reveal the clearing without the player, then drop the customized slime onto the spawn tile. Further dialogue introduces the clearing, followed by ordered camera rotation, camera zoom, movement, and six-resource gathering lessons. Rotation accepts arrow keys or screen dragging; zoom accepts the wheel or a two-finger pinch. Each lesson holds its success message until the player explicitly clicks Click to continue. After gathering, this button begins the crafting introduction. Movement succeeds only after arrival at a different reachable tile. Until the gathering lesson, resource clicks act only as movement commands and do not collect anything. Keep the old HUD hidden while it is redesigned; retain only dialogue, contextual interaction feedback, and the tutorial instruction/progress card.

Gathering awards 20 XP per completed pickup. The prototype starts Gathering at level 1 and grants level 2 at 120 XP (six items), improving gathering speed by 8%. An animated XP notification accompanies each award, and leveling up adds a celebration. The first XP award pauses the gathering tutorial for an explanation; Continue restores the collection instructions and progress. The first level pauses for its own explanation; Okay returns to the six-item success message, whose Continue button begins the crafting introduction. Skill progress currently resets with the session.


The next tutorial leg introduces crafting through one-line dialogue, then reveals a bottom-right game menu. Golden outlines and floating arrows guide the menu button, Crafting option, and Crude Axe recipe. The axe takes Sticks ×1, Rocks ×1, and two uninterrupted seconds to craft. Materials are consumed only on completion; moving cancels the action without consuming them. Crafting uses the slime’s hand animation and overhead progress marker, awards 20 Crafting XP as floating text, and ends with a success message that requires Continue. In-game item names in instructions and recipes are highlighted.

After the axe is crafted, dialogue introduces woodcutting. Trees receive golden outlines and arrows until the first tree is felled. Clicking a tree with a Crude Axe in inventory routes the player to an adjacent reachable tile and starts a 3–6 second chopping action with an animated axe. Moving interrupts chopping and restarts its progress on the next attempt; clicking the same tree does not interrupt it. The completed tree falls, clears its blocked tile, and rewards Small Logs ×1–3 and 20 Lumberjack XP. A dismissible success message completes this tutorial leg. Crafting remains accessible afterward.


**Development playground.** A separate `playground` build mode bypasses onboarding and opens the clearing as a test area, with an axe and starter supplies. Its collapsible panel supports arbitrary quantities of existing inventory items, XP and level changes for implemented skills, play-once/loop animation previews with speed controls, independent visual feedback triggers, and resets for resources, trees, and the whole test area. It uses the same movement poses and hand animations as normal gameplay. All developer UI, styles, and mutation controls are gated by a compile-time flag and excluded from normal builds. Normal and debug modes run on separate local ports so the onboarding flow can be tested alongside the playground. See README for run/build commands and the build-isolation check.


**Playground maintenance requirement.** Every addition must also be available for debugging in the dev playground in the same change, with appropriate controls or test-area coverage to exercise, repeat, and reset it. Existing support must stay current as behavior changes. Never move forward leaving debug support outdated. If unsure whether or how to add that support, ask the user rather than omitting or deferring it. Share actual gameplay implementations and preserve exclusion from normal builds. See [project instructions](../AGENTS.md#keep-the-dev-playground-current) for the standing workflow and verification requirements.


**Chopping motion.** The slime uses its right hand for the axe. Each repeating swing draws back, lifts, starts the strike with a vertical drop, then sweeps sideways halfway through to form an L-shaped path, rolling the axe outward roughly 45 degrees and turning the blade into the side of the tree, briefly holds, and recovers. The free hand reaches forward during the wind-up and retracts to the side during the strike. Body lean and twist follow the same cycle, and the axe blade faces forward toward the tree. Gameplay and the playground Chopping preview share this motion, including full-cycle looping and slow-motion playback.

**Tutorial clearing finale.** After the first mining success is acknowledged, ??? congratulates the player and introduces the Iter Portal. A roughly two-player-high, irregular faceted crystal drops into a free reachable tile, settles into a gentle hover, and receives the familiar gold outline and arrow. A final line offers more practice; all trees, boulders, and ground items drop back into place. This reset preserves inventory and skills. Players can click the portal when ready to approach it and fade into a simple placeholder area. A return portal preserves access to the clearing and its remaining practice objects.

**Hidden practice reward.** Clearing every tree, boulder, and ground item after the practice reset triggers the supplied surprise dialogue, without a visible checklist. A wooden chest drops near the player on a reachable free tile. Opening it works like gathering: approach, wait briefly, and restart if interrupted by movement. It grants one fancy Top Hat once. The slime turns away from the chest and happily raises the hat in both hands while the camera closes in, then returns to normal play. The player can wear or remove the hat using Equip/Unequip in the Top Hat inventory details. The reward is tracked by cleared world objects rather than inventory totals.

All finale beats have dev playground replay/reset controls, including actual portal/chest approach interactions, optional-practice completion, travel both ways, Top Hat inventory edits and gain/loss previews, and looping/slowed hat presentation. Portal/chest highlighting and all drop animations use shared gameplay effects. The placeholder area is intentionally just a navigable island and return portal until the next tutorial area is designed.


Confirming the slime color plays a happy hop; confirming the name plays a small leaning wave with the right hand above the head. Dialogue waits for each brief reaction to finish. After 30 seconds of inactivity, the slime dozes with closed eyes, soft breathing, and floating Zs. Movement, work, and cinematic sequences prevent sleep; clicks/taps and dialogue activation wake it, while orbit dragging, pinch/scroll zoom, and camera keys leave it asleep. It settles into a lopsided squish over two seconds before the Zs begin; Zs spawn every 1.4 seconds and rise slowly with a gentle sine-wave drift. The playground Sleeping loop settles once, then keeps breathing; Doze off and Wake up exercise the natural sleep/wake behavior without waiting 30 seconds. Happy hop, Wave, and Sleeping are shared animations available in the playground with play-once, loop, and speed controls.


The wave bends the upper body away from the raised hand while keeping the base flat and stationary. The face follows the curved body, and a worn hat follows the crown. The hand follows the bend as it rises, reaching slightly over the head with a short side-to-side wobble. Sleeping uses the same grounded bend for its lopsided slump instead of rotating the base off the ground. These deformations are shared by gameplay and the playground previews.

### Title screen and prototype ending

The current title is **QuadriaQuest**. Normal play starts on a title screen with a Play button and a live 3D vignette: a sleeping slime, drifting Zs, and a distinct floating garden with tile-centered trees at gameplay scale, flowers, a small pond, and half-height ledges. The opening tutorial waits until Play is pressed. The playground skips this screen by default and provides **Preview splash screen**; Play returns to the test area there. Entering the second area displays “You've reached the end of the prototype! Thanks for playing!” after the transition. Dismiss it to explore or return through the portal. The playground's **Enter placeholder** control exercises this same ending.

The playground’s **Compare UI styles** opens four experimental directions: Twilight Storybook, Pocket Adventure, Clay & Linen, and Moonlit Arcade. Each has title, dialogue, and gathering-card samples, plus a live splash preview with a theme selector and current-default comparison. Twilight Storybook is the selected production direction: plum text and buttons, warm ivory panels, muted peach accents, a Georgia title, and readable humanist sans-serif UI text. The other directions remain session-only, developer-only studies.

### Skills menu introduction

After the first Gathering level-up explanation, introduce Skills before returning to the “All six collected!” success. Move the “Oh, right, sorry, just a sec…” menu-button reveal here. Guide the player through the game menu and Skills, highlight Gathering, then explain that skills can be checked any time. Continue and Got it explicitly advance these explanations. Crafting later reuses the revealed game menu and unlocks its Crafting option.

The Skills menu lists every implemented skill (Gathering, Crafting, Lumberjack), with level, total XP, progress toward the next level, and XP remaining. The current prototype uses 120 XP per level. The playground provides Open Skills menu and Replay Skills tutorial, which sets Gathering to level 2 / 120 XP; XP and level controls refresh an open Skills menu. The replay also restores the shared “All six collected!” card after Got it, with its count, full progress bar, and dismiss button, so the return step is testable.

Game surfaces and dialogue suppress browser text selection and mobile tap highlights. Editable fields retain text selection and editing behavior. Horizontal mouse/touch dragging reverses orbit relative to its original direction; keyboard arrow behavior is unchanged. These shared input rules are exercised in the playground using camera dragging, Skills tutorial replay, and editable debug fields.

Ground resources have an invisible 0.5 × 0.5 × 0.5 tile-unit picking cube, centered on the tile and resting on its surface. Existing model hits still work outside the cube. Hover and click share these targets; collection, visibility, and movement-lesson restrictions remain shared with normal resource selection. The playground’s Show half-tile hitboxes toggle reveals the actual picking volumes, and Ground items resets them with the resources.

### Inventory menu introduction

Skills now leads into Inventory before restoring “All six collected!” and continuing to crafting. The narrator says: “Now, what happened to all those sticks and rocks you picked up?”, “Assuming no holes in reality, you should have them stored safe and sound.”, and “Everything you collect goes into your inventory. Let's have a look!” The menu button, Inventory option, and Sticks stack receive gold guidance in order. Explain stacks, require selecting Sticks to read their description, then use Got it to close the window and restore gathering success.

Inventory lists owned item stacks with icons, names, actual quantities, and selectable descriptions. It includes Sticks, Rocks, Crude Axe, Small Logs, and Top Hat; empty inventory has an explicit empty state. The menu stays accessible after its introduction. Playground controls open the real menu or replay its tutorial; replay supplies Sticks ×3 and Rocks ×3. Skills replay includes this subsequent Inventory lesson. Existing add/remove controls update an open inventory and its selected details.

After the Iter Crystal lands, the camera eases to a close view of it, holds with the gold guide visible until the player clicks/taps to continue, then returns to the player's prior orbit and zoom. Movement and camera gestures pause during this reveal; the reset-area dialogue waits until it finishes. Playground Drop portal runs the same reveal, and Reset finale cancels it.
The portal instruction dialogue stays visible throughout the crystal drop and camera reveal. Its continue hint is hidden while zooming in, then appears at the close-up. The close-up holds indefinitely until the player clicks/taps (or presses Enter/Space) to continue. The camera then eases back for one second; only after it returns does the practice-reset dialogue appear. Playground Drop portal shows the same explanatory dialogue during its reveal.

Crystal travel places the player on a valid cardinally adjacent tile beside the destination crystal, in both directions. Arrival prefers the south neighbor, then east, north, and west; blocked tiles, water, missing tiles, and elevation differences greater than a half block are excluded. If no safe neighbor exists, travel is cancelled with a message. Playground **Enter placeholder**, **Return to clearing**, and **Use portal** exercise the same arrival logic; direct placeholder travel supplies a clearing crystal when one has not yet been introduced.

**Water polish.** Inland water and ocean water have distinct visual directions. Ponds use translucent, faceted water with a shallow bed and scattered pebbles. Rivers should eventually add directional flow; ocean shoreline motion remains a future treatment.

The clearing and splash garden share these pond defaults:

| Setting | Default |
| --- | --- |
| Animate water | On |
| Shimmer strips | Off |
| Surface waves | On |
| Fixed shoreline | On |
| Water color | RGB (0, 64, 112), #004070 |
| Faceted water lighting | On |
| Wave strength | 4 |
| Water roughness | 0 |
| Reflection strength | 3.5 |
| Water opacity | 0.75 |
| Water speed | 1.25 |
| Water intensity | 1 (only affects shimmer strips) |

Waves remain continuous across tiles and fade to zero at banks by default, with displacement bounded to 0.072 tile. Uncheck **Fixed shoreline** to let them lap against banks. **Shimmer strips** independently enables the decorative pale lines. Both ponds use a generated sky reflection with soft clouds and a sun highlight; this does not reflect live trees or the slime. Roughness controls highlight sharpness, and reflection strength 0 removes the sky contribution while direct lights still produce highlights. Transparency uses alpha blending without refraction.

All settings have playground controls, shared with **Preview splash screen**. **Replay water** restarts animation; **Reset water** restores the defaults above from the same preset used by normal play. Speed 0 pauses animation. Developer controls remain exclusive to playground builds.

**Item naming.** Display names remain unchanged for all stack sizes; show the quantity separately as ×N. Current names: Sticks, Rocks, Crude Axe, Small Logs, and Top Hat. Sticks, Rocks, and Small Logs are deliberate grouped-unit exceptions, including at ×1. One Sticks item represents a small handful of sticks; one Rocks item represents a handful of moderately sized rocks. Future exceptions such as Coins must be deliberate rather than automatic pluralization. Inventory IDs remain unchanged.

**Mining tutorial.** After the first tree success is dismissed, the narrator introduces boulders and says “See those boulders? We can mine some Stone from them.” The player is asked to recall crafting and make a Crude Pickaxe (Sticks ×1 + Rocks ×1, two seconds, +20 Crafting XP). Guidance is optional: **Show me how** highlights the current next step in the game menu → Crafting → Crude Pickaxe sequence. Moving cancels crafting without spending materials and restores the task.

After crafting success is acknowledged, the narrator compares mining to chopping. The player can independently click a boulder, or use a second **Show me how** button to highlight the boulders and explain the interaction. A Crude Pickaxe must be in inventory. Mining takes 3–6 uninterrupted seconds, uses a centered vertical pickaxe swing with both hands gripping the shaft and the head facing the boulder, and awards Stone ×1–3 and +20 Mining XP when the boulder disappears. Moving cancels mining; a later attempt starts fresh. The success text is: “You mined your first Stone! With better resources comes the ability to craft better tools. Be on the lookout for better materials on your adventures!” Continue starts the existing Iter Portal finale.

The clearing has four trees and three boulders (replacing trees at 7,1; 1,7; 10,9). Practice reset drops boulders back in alongside trees and loose resources; the hidden clearing reward requires all three kinds to be cleared. Stone is a larger mined resource distinct from Rocks (the small handful used in crude tools).

Playground support includes Crude Pickaxe and Stone inventory edits/feedback, Mining skill XP/level controls, Mining animation playback/loop/speed, Mining marker preview, boulder reset, a real **Mine nearest boulder** interaction, and **Replay Mining tutorial** / **Stop Mining tutorial**. Replay supplies ingredients and restores boulders, with both optional-help paths available. Full test-area reset supplies both tools. Normal builds exclude the playground controls.

Crafting recipes display required/owned counts per ingredient (for example, Sticks 1/3), green when sufficient and red when missing. The full inventory summary is omitted. Playground inventory edits exercise these counts; adding a Top Hat and opening Inventory exposes the real equip/unequip controls. Removing the last hat unequips it.

## Journal, objectives, and feedback polish

Conversations retain a warm paper panel near the bottom. Dismissible tutorial tips share the bottom message area in a plum card with explicit continuation. Objectives live in Quests and produce brief upper-left progress updates. Conversations temporarily hide tutorial tips. Tutorial guidance still targets actual menu controls.

The adventurer’s journal shares persistent Skills, Inventory, and Crafting navigation. In ordinary play its button opens the last-used page directly; teaching steps retain explicit tab selection. Desktop can expand the compact right-side journal into a centered layout, with the size preference saved locally. Mobile uses a large sheet. Inventory uses searchable compact rows, item details, and equipment actions; skills use searchable compact rows with always-visible level/progress and expandable XP details. Crafting separates recipe selection, material requirements, timing, output, and the craft button. Crude recipes remain subject to the existing tutorial restrictions.

Menu, skill, and item illustrations share rounded SVG strokes from `src/icons.js`. The playground includes an icon sheet for review. The existing icon set is a first visual pass, intended for further art refinement.

Item gains and losses use a separate four-entry loot feed. Consecutive changes to the same item and sign merge while visible. Crafting shows an output receipt with its material costs. Movement errors retain their separate click/location feedback. Item feedback remains available through inventory edits, gain/loss previews, a crafting receipt preview, and a clear-feed control in the playground.

## Audio sketch

The current sound layer is an original procedural Web Audio sketch, not a finished recorded acoustic score. Music uses sparse melodic phrases with pauses and different pacing for splash, introduction, and clearing; dialogue lowers the music. Effects include pickup, crafting taps/completion, animation-timed chopping/mining impacts, resource collapse, levels, portals, and UI/error cues. Wind, birds, and insects are sparse randomized ambient sketches. Audio begins only after a gesture and suspends when the page is hidden. Separate Music, Effects, and Ambience sliders plus Mute are saved locally.

The playground exposes each effect individually, music-context selection, all shared sound settings, and existing real interactions for timing checks. Future work can replace the synthesized voices with recorded material sounds and composed acoustic tracks without changing gameplay events. Spatial attenuation and distinct destination soundscapes remain future audio refinements.

**Phone journal layout.** At widths up to 700px the journal fills the safe viewport, with persistent tabs and an explicit close control. Inventory is a list/detail drill-down with Back to items; it does not split limited phone height between two scrolling panes. The same tutorial card docks inside the journal during menu lessons and returns to the world overlay when the journal closes. Crafting text wraps, inputs avoid mobile focus zoom, and primary touch targets are at least 44px. Desktop compact/expanded layouts remain separate. Existing playground menu and tutorial replay controls exercise both layouts; its collapsed mobile launcher moves away from the journal header.

**Settings access.** The game menu launcher stays at the top right. Its Settings entry and the splash-screen cog open the same sound-settings dialog, sharing saved Music, Effects, Ambience, and Mute values. Settings can be adjusted before Play without advancing the tutorial. The separate floating Sound launcher is removed. Playground Open Settings and splash preview exercise both entry points.


### Tutorial tips and quest objectives

Dialogue and dismissible tutorial tips share the bottom message area. Dialogue uses warm paper with a speaker; tips use plum with a Tutorial label and explicit Continue. Tips explain controls or systems; they do not serve as a permanent progress tracker. Opening the journal preserves the current tip.

Objectives persist independently in the Quests tab under A Small Beginning, with detailed instructions, counts/progress, and a visible completed-task history beneath the active tasks. Assignment, changes, and completion produce a compact top-left notification that fades after a few seconds. Updates replace the existing notification; completion records immediately, before any Continue click. Camera, movement, gathering, skills/inventory lessons, crafting, chopping, mining, and the Iter Crystal are tracked. Optional mining/crafting guidance remains accessible from quest details. After the narrator asks the player to pick up Sticks and Rocks, the gathering quest is assigned. A dismissible tip announces the quest, followed by “Oh wait, I forgot... here you go!” as the menu appears with golden guidance. The player opens the menu, selects the highlighted Quests tab, and reads a brief explanation before continuing into the camera and movement lessons.

The playground exposes tip preview and objective add/update/complete/reset controls, plus direct Quests access and Replay Quests tutorial for the complete menu-reveal sequence. Existing tutorial replays exercise real objective updates; full test-area reset clears objectives.

The Rotate, Zoom, and Move tips remain visible while performing their actions. Continue stays disabled until success (movement requires arrival at a different tile). The playground can replay these three lessons using the real opening controller. Quests show task bullets, followed by completed tasks with a checkmark and Completed label.

## Second tutorial area: Willowbank

The Iter Crystal now leads to **Willowbank**, where the rescue quest teaches branching NPC dialogue, Carpentry, companions, Fishing, placement, and Culinary skills. Combat and equipment instruction belong to the planned third area. See [WILLOWBANK.md](WILLOWBANK.md) for the detailed flow, recipes, and playground coverage. The prototype ending appears after cooking and eating, rather than on arrival.


## Area three: combat tutorial outline

Status: planned, not implemented. Willowbank now teaches the rescue/carpentry/follower/fishing/cooking/eating sequence; area three owns combat. Final location name, NPC, premise, map, and exact dialogue need design approval before implementation.

### Proposed sequence

1. Arrive beside the destination Iter Crystal with inventory, skills, equipment, health, and follower retained. Introduce a safe staging area and point out the first enemy using the shared camera/dialogue presentation.
2. Fight the forgiving Goblin Scrapper unarmed. Teach click-to-approach, continuous attacks, timing/range, damage/miss feedback, and clicking away to disengage. Preserve its existing protection against lethal damage.
3. Craft a Stone Sword (Stone ×2, Sticks ×1) and Wooden Shield (Small Logs ×2, Sticks ×1). Reveal their recipes here; use optional “Show me how” guidance instead of repeating mandatory crafting instruction.
4. Equip both through the shared inventory detail actions and equipped badges. Equipment possession and equipment use remain distinct.
5. Fight the stronger Goblin Bruiser. Preserve real defeat, animation, and respawn at a valid adjacent tile beside the destination crystal; keep all inventory. Explain using food already learned in Willowbank.
6. Mark combat objectives complete and show the prototype-ending message here. Keep the area and earlier maps revisitable.

### Reuse and extraction handoff

| Existing implementation | Reuse in area three |
|---|---|
| `enemy-model.js` and `tool-models.js`: goblin/tool factories and `animateGoblin` | Identical goblin rigs, equipment orientation, idle, walk, attack and hit reactions; no map-specific model copies. |
| `combat-motion.js` and player combat motion in `main.js` | Same punch windup/contact/recovery, sword/shield presentation and attack clocks. |
| `combat-feedback.js` | Damage, block and miss splats; clear on defeat, travel and reset. |
| `combat-rules.js`: `ENEMIES`, `damageRoll`, `incomingHealth`; `recipes.js`: sword/shield recipes | Preserve current balance as an initial baseline. Reuse the shared combat/recipe modules. |
| `combat.js`, `enemy-entity.js`, `equipment.js`, `equipment-presentation.js`, `player-health.js` | Reuse the app-owned combat, enemy lifecycle, worn gear (including top hat), and health state. Areas configure placement/patrol/respawn context and narrative; travel must not create a second health pool. |
| `wander.js` | Independent randomized patrols; supply area-three patrol bounds instead of reusing Willowbank coordinates. |
| `character-dialogue.js`, `conversation-facing.js`, shared camera focus | Same NPC turning, live portraits, standalone choices, quiet cutscene presentation and held focus until Continue. |
| Crafting, inventory, skills, quests, item feedback | Reuse real menus, skill rewards, recipe availability and objective history. New area owns only its quest sequence. |
| `portal-spawn.js`, shared terrain/resources/water/follower | Place crystals and reusable entities; ensure four-neighbor arrival selection and follower travel. |

Existing combat baseline: player 30 health; unarmed 1–3 damage / 1.5 s, sword 3–5, shield reduces incoming damage by 1 (minimum 1). Scrapper has 8 health, 1 damage / 2.5 s, and cannot reduce the player below 1. Bruiser has 24 health and 3–5 damage / 2 s. Hits, pursuit/leashing, enemy health reset, and defeat already exist. Preserve or deliberately rebalance them, not reimplement them independently.

### Map and progression requirements

Provide a safe crystal/NPC/crafting space, an isolated first encounter, and a separate stronger encounter. Supply renewable Sticks, Rocks, Stone, and Small Logs so arriving with an empty inventory cannot block crafting. Keep food and recovery accessible without requiring a return trip. Combat may be attempted early; the stronger fight should reward preparation without making equipment an invisible gate. The follower remains cosmetic, occupies its own tile, and cannot be targeted.

### Playground and acceptance checklist

Combat is shared through `combat.js`, `equipment.js`, `combat-rules.js`, `enemy-entity.js`, and `enemy-model.js`. The playground Combat section explicitly places test enemies in the current map, with reset/remove and real defeat/respawn controls; normal maps contain no combat encounters yet. Individual rig animations remain in the shared model viewer. Area three should configure these same entities and systems. Add direct entry/reset and checkpoints for unarmed, recipes, equip, stronger fight and completion. Verify both enemies, random wander, retreat/pursuit/leash, repeated defeat/respawn, food healing, inventory preservation, companion travel, recipe visibility, camera return and journal history. Retest the clearing and peaceful Willowbank to ensure no combat actors or objectives leak into them. Build both variants and verify debug isolation.

## Small-screen menus and model previews

Menus and modal utility windows should fill the screen edge to edge at widths of 700px or less, with safe-area padding. Dialogue, tutorial tips, and transient feedback remain overlays. Use 44px minimum controls and 16px input/select text. Preview canvases must measure their actual layout bounds and update the renderer resolution and camera aspect together; never stretch a fixed camera render to fit a different display ratio.

The development model viewer uses a catalogue of shared factories and supported motions. Static objects expose only Static; characters expose their actual expressions/animations. Switching models resets animation selection and playback; view rotation is independent of animation. Close disposes instance geometry/materials and stops rendering. New world model factories must be registered here in the same change.

### Model catalogue audit

Included: Slime and Reed (single active expression), both goblins, corgi, tree, boulder, flowers, Sticks, Rocks, Flint, Crude Axe, Crude Pickaxe, Stone Sword, Wooden Shield, Crude Hammer, Crude Fishing Rod, Top Hat, Campfire and placement ghost, fishing ripples, Iter Crystal, wooden chest, broken/repaired bridge and repair marker, single/joined grass tiles, half-height ledge, water tiles. The bridge and axe now use the same factories in gameplay and previews. Campfire motion also uses the shared gameplay animation.

Small Logs, Stone inventory stacks, Flint and Stone, Raw Pondfish, and Cooked Pondfish currently have inventory icons, not standalone 3D model factories. They are not represented by invented substitutes in the model viewer. Character body parts/cosmetics belonging to a rig (for example Reed's cap) are previewed with that rig. Temporary click markers, highlights, and hit splats remain in the playground's visual-feedback controls.

The Slime viewer also exposes Punching, Sword and shield, Gathering, Crafting, Chopping, Mining, Carpentry, Ouch / hammer injury, Fishing, Cooking, and Defeated. Action poses and gathering-hand trajectories are shared with gameplay through `player-action-motion.js`; held tools use the gameplay factories and attachment orientation. Changing actions clears the old tools, updates both-hand grips, and refits the camera to visible geometry. Injury playback repeats with a short settled interval so it can be inspected without replaying the quest.

Animation and Expression are independent model-viewer selectors. Expression defaults to Default (the animation's authored expression) and can be overridden without restarting or changing the action. Switching models resets both selectors. Slime/Reed expose their supported faces; the corgi offers Happy/Sad separately from Idle/Walk. Non-facial objects show a disabled Not applicable expression selector.

Guided menu safety: required journal lessons allow only the current action, with unrelated tabs, close, resize, search, and item actions disabled. A shared capture guard also rejects stray activation, and Escape cannot dismiss a guided journal. Scripted lesson transitions can still close panels. Recipe availability remains authoritative; optional recipe help cannot trap a player who needs more supplies.

Deferred: closing a menu to regain full agency should explicitly suspend the menu lesson, preserve its objective/checkpoint, release its input ownership, and provide a resume action in Quests. Do not simply clear movement locks while leaving a tutorial waiting for an invisible control. This suspend/resume behavior is not implemented yet.

Companion interaction and idle life: clicking an owned follower approaches it and triggers a happy petting response with floating hearts. The follower sits after four seconds without movement, then may scratch its ear after a randomized 12–24-second delay. After the player begins dozing, the follower waits another 2.5 seconds, then settles over 1.8 seconds into a sploot with a sideways head resting on the ground, closed eyes, gentle breathing, and drifting Zs. Waking the player wakes the follower; camera orbit and zoom do not. The shared Corgi Sleeping preview, chapter animation loop, and Doze off/Wake up controls exercise this behavior without waiting through the idle timer. Movement interrupts resting/flavor behavior. Followers hop over both ascending and descending half-height ledges. These poses and effects are shared with the model viewer and travel with the companion between areas. A deliberately resting companion remains visible and yields to the player's route.

Consuming food uses a 1.8-second eating action: bring both hands to the mouth, nibble, lower hands, and smile. No food model is shown, so the animation works for any edible item. Food consumption/healing commits on completion; moving cancels without spending food. The name confirmation uses Reed's happy expression, a separate yes/no choice, and aligned name/dice controls on desktop and mobile.


### Shared companion ownership

Companions are an app-level system, not a Willowbank subsystem. `companions.js` owns acquisition, name/state, follow/rest behavior, cross-world placement, click targets, petting, idle/sleep behavior, cancellation, and reset. `companion-menu.js` and its stylesheet own the journal panel and reusable naming/confirmation UI. `companion-model.js` owns the corgi prefab and its shared animations; the model viewer and gameplay import it directly. `companion-follow.js` accepts a world-coordinate adapter instead of requiring a particular map origin.

Worlds supply terrain, placement, and quest context. Willowbank places the stranded animal and scripts its bridge crossing, then calls the shared acquisition API. Reed's initial name acknowledgement remains quest dialogue supplied as a callback; later renaming works anywhere without Reed or Willowbank. The app updates and dispatches companion interactions directly, including when the current area is not Willowbank. Area changes preserve the follower's name and follow/rest preference.

The playground has an independent **Companions** section available in every area: add a follower, pet, rename, rest/follow, reset, and loop shared animations. Model/expression inspection remains in the shared model viewer. Doze off/Wake up tests delayed companion sleeping. Chapter checkpoints call the same acquisition/reset APIs and do not contain copies of companion behavior.


**Playground organization.** A unified tutorial checkpoint catalogue in `src/dev/tutorial-checkpoints.js` covers both worlds and individual tutorial/menu steps. Loading a step automatically prepares its world and prerequisites, clears stale UI state, and uses production tutorial transitions. Interface previews use one selector, including cooking. Companion actions use a label above a selector/action row. Shared health and hit-feedback controls have no world prerequisite. The playground stays interactive over splash previews and uses an opaque, edge-to-edge mobile takeover.

### World-independent gameplay boundary

Only area layout and area narrative belong to an area module. Skills, recipes, inventory actions, stations, models, animations, UI, collision policies, and rewards must be portable shared systems. Availability comes from materials, tools, terrain, and current action state—not from having visited or currently being in a named area. Tutorial guidance may teach an action; it must not become the implementation of that action. If the intended boundary is unclear, ask before adding area-specific behavior.

Campfire placement/use/packing and inventory recipe crafting are app-owned (`campfires.js`, `recipe-crafting.js`); cooking uses `cooking.js` and `cooking-menu.js`. Stations remain attached to their original tile instances across travel. Clear reachable land accepts placement by default; water, occupied tiles, explicit non-buildable structures, and unreachable tiles reject it. Areas receive completion callbacks only for their narrative. A fire can be packed back into inventory; movement cancels pending placement/crafting without spending materials.

Every added shared capability must also be exercisable in the development playground without first entering its tutorial area. Regression checks must exercise the behavior in more than one world, including the clearing before visiting Willowbank. For campfires, add supplies through Inventory & skills, then use the normal crafting and inventory menus to craft, place, cook, cancel, and pack. The Cooking interface preview remains a non-mutating preview, without teleportation.

**Existing architecture debt, not an exception to this rule:** Combat/equipment have also moved out of Willowbank into app-owned systems. Gathering/chopping/mining, fishing, carpentry, eating/health, cooking, and campfire placement now use app-owned systems. These need extraction into shared systems; the existing file placement does not authorize copying those implementations into another world. The bridge collapse and repair/rescue story, scripted injury moment, stranded-animal sequence, Reed's lines, tutorial objectives, and map coordinates remain legitimate Willowbank narrative/layout. Shared carpentry owns tool/material checks, timing, hammering, cancellation, consumption, and XP; the chapter configures the target and reacts to its progress/completion. See [HANDOFF.md](HANDOFF.md) for the actionable backlog and current verification status.


Resource gameplay is shared through `resource-actions.js`, `resource-entities.js`, and `resource-rules.js`. Trees and boulders use a 3–6 second base work roll, reduced by skill level, and yield 1–3 materials plus 20 skill XP after their depletion animation. Ground bundles yield one item and 20 Gathering XP. The clearing configures finite resources for its tutorial/practice; Willowbank configures an eight-second respawn. Solid respawns wait until their tile is free of players, reserved movement, companions, and other occupants. Off-map depletion and respawn clocks pause; committed depletion resumes on return, and reset discards pending rewards.


Equipment state and worn sword/shield/top-hat presentation are app-owned and persist through travel/defeat. The clearing finale only owns its held-hat reward celebration. Sword/shield recipes and equip actions are available without visiting an area. Removing the last item unequips it. Equip changes are blocked while working or fighting. Combat retains the existing damage/attack cadence, protected Scrapper, pursuit timeout/distance leash, fleeing win presentation, and 20 XP reward. Enemy homes and patrol bounds are placement configuration. Returning enemies wait if their home is occupied. Defeat uses a safe crystal-adjacent tile when available, otherwise a free tile in the current map; if no safe tile exists, recovery waits. Items, equipment, and skills are preserved.
