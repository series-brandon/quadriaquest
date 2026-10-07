# QuadriaQuest

A small browser RPG prototype built with JavaScript, Three.js, HTML, and CSS. The agreed design is recorded in [DESIGN.md](docs/DESIGN.md). For a fresh development session, start with [the current handoff and refactor backlog](docs/HANDOFF.md).

Run locally with Node.js 22 or newer:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The opening introduces Quadria on a single floating tile: the slime drops in, dialogue advances by clicking/tapping the box (or Enter/Space when focused), and color and name choices each have a confirmation/retry step. Color previews update live. After a fade into the clearing and another landing, four ordered lessons teach rotation, zoom, movement, and gathering. Each lesson keeps its success message visible until the player clicks Click to continue; the final gathering confirmation begins the crafting introduction. Movement requires arrival at a different reachable tile; resource clicks only move until gathering unlocks. The old HUD remains hidden; a small tutorial card tracks all six resources. Refresh to replay the opening; profile and progress currently last only for the session.

Once the tutorial unlocks play, click terrain to move and materials to gather. Hold the left/right arrow keys to rotate smoothly and up/down to raise/lower the viewing angle. Drag with either mouse button or one finger to orbit; scroll or use a two-finger pinch to zoom. Dragging and pinching never issue movement clicks. Keyboard rotation stops on release or when the window loses focus. The perspective camera follows the slime. Its vertical angle is limited to 20–75 degrees; zoom changes the camera distance from 3 to 34 world units, with finer adjustments up close for inspecting the character.

Half-height steps are traversable in both directions. Trees, water, and tall ledges block movement. The upper meadow is reachable through smaller steps; the isolated tall lookout demonstrates an inaccessible ledge. Gathering continues without restarting when its target is clicked again. High-contrast hover brackets indicate reachability. Accepted clicks set sticky green destination corners and a single overhead status marker; blocked clicks pulse red with a cross. The marker reads Going with gray dots while approaching, Gathering with a rotating blue spinner during interaction, and Arrived! or Done! with a green check that rises and fades on completion. The marker stays visually above the slime even at steep camera angles.

```sh
npm test
npm run build
```

The prototype has no saved progress or multiplayer yet. It includes the clearing and Willowbank; combat remains in an explicit dev sandbox while its third area is planned. Inventory is held in memory and resets on refresh. Character and world assets are generated in JavaScript. The optional Google Fonts stylesheet falls back to system fonts when offline.

During the gathering lesson, gold outlines, soft gold edges, and floating arrows identify the six resources. All gold highlighting and arrows disappear immediately after the first successful pickup. Only the item under the cursor receives a white hover outline; other items remain unmarked.

Gathering awards 20 XP per completed pickup. The prototype starts Gathering at level 1 and grants level 2 at 120 XP (six items), improving gathering speed by 8%. An animated XP notification accompanies each award, and leveling up adds a celebration. The first XP award pauses the gathering tutorial for an explanation; Continue restores the collection instructions and progress. The first level pauses for its own explanation; Okay returns to the six-item success message, whose Continue button begins the crafting introduction. Skill progress currently resets with the session.


The next tutorial leg introduces crafting through one-line dialogue, then reveals a bottom-right game menu. Golden outlines and floating arrows guide the menu button, Crafting option, and Crude Axe recipe. The axe takes Sticks ×1, Rocks ×1, and two uninterrupted seconds to craft. Materials are consumed only on completion; moving cancels the action without consuming them. Crafting uses the slime’s hand animation and overhead progress marker, awards 20 Crafting XP as floating text, and ends with a success message that requires Continue. In-game item names in instructions and recipes are highlighted.

After the axe is crafted, dialogue introduces woodcutting. Trees receive golden outlines and arrows until the first tree is felled. Clicking a tree with a Crude Axe in inventory routes the player to an adjacent reachable tile and starts a 3–6 second chopping action with an animated axe. Moving interrupts chopping and restarts its progress on the next attempt; clicking the same tree does not interrupt it. The completed tree falls, clears its blocked tile, and rewards Small Logs ×1–3 and 20 Lumberjack XP. A dismissible success message completes this tutorial leg. Crafting remains accessible afterward.

## Development playground

**Required for every addition:** Update playground support in the same change whenever anything new is added, and keep it current when behavior changes. Never finish or move on with outdated debug coverage. If unsure whether or how something should be exposed, ask the user. The standing contributor rules are in [AGENTS.md](AGENTS.md#keep-the-dev-playground-current).

Run `npm run dev:debug`, then open **http://127.0.0.1:5174/**. It skips the opening and all tutorials and drops Pip into the clearing with Sticks ×10, Rocks ×10, and Crude Axe ×1. Normal movement, gathering, crafting, and chopping are available immediately. Refreshing retains debug mode but resets the session.

The collapsible DEV PLAYGROUND panel fills the viewport on mobile and stays usable during splash previews. **Exit splash preview** returns to play.

**Tutorials & objectives → Tutorial step → Load step** is the single entry point for both areas. All 61 checkpoints select the correct world, clear previous dialogue/menu locks, and seed required resources automatically. Pick an individual camera lesson, menu step, crafting/gathering lesson, finale, rescue, or food lesson. **Reset current area** stays in the active world. Loading a checkpoint replaces the current test session.

**Interface & audio → Interface → Open** exposes Quests, Inventory, Skills, Crafting, Companions, companion naming, Cooking, Settings (tab and popup), the model viewer, and the splash screen. Cooking opens a read-only UI preview in the current area without changing position or inventory; interact with a real campfire to cook. To test the real flow in any area, add Small Logs ×2, Flint and Stone ×1, and Raw Pondfish through the inventory controls; craft a Campfire, select it in Inventory and choose Place, click a clear tile, interact to cook, then Pack. No Willowbank visit is required. Tutorial checkpoints still prepare their required stations and supplies. **Inventory & skills → Player health** and **Visual feedback** expose healing, injury, and damage/blocked/miss splats in either area. Removed encounters are not listed as chapter actions; rig animations remain in the shared model viewer.

The collapsible DEV PLAYGROUND panel provides:

- Play once or loop idle, sliding, jumps, spawn landing, gathering, crafting, chopping, and facial expressions. Use ¼×, ½×, 1×, or 2× speed and Face camera. Previews run in place and do not spend items or earn XP; Stop returns to normal play.
- Add any whole-number XP or level amount (up to 1,000,000 per operation) to Gathering, Crafting, or Lumberjack. Levels and XP stay consistent with the prototype's 120 XP per level.
- Add/remove quantities of any currently implemented item. Removal clamps at zero. Edits show the actual item gain/loss using the same notification as gameplay; zero changes do not show a notification.
- Trigger Going, interaction spinners, Arrived/Done, blocked clicks, XP text, level-up feedback, and item gain/loss notifications independently of gameplay rewards.
- Restore ground items, restore trees, or reset the entire test area (including skills, starter inventory, player position, and camera).

Run `npm run dev` for the normal tutorial experience on port 5173. Both servers can run side by side; no URL parameter or saved browser setting enables debug mode in the normal app.

Build and compare both variants:

```sh
npm run build
npm run build:debug
npm run check:debug-isolation
```

`dist/` is the normal distributable. `dist-playground/` is explicitly debug-only. `npm run preview` serves the normal build on port 4173; `npm run preview:debug` serves the debug build on port 4174. Never deploy `dist-playground/` as the normal game.

`vite.config.js` defines the compile-time `__PLAYGROUND__` flag **only** for the `playground` mode. The panel and CSS live in `src/dev/`, dynamically imported inside that flag. Normal builds eliminate the import, mutation adapter, preview hooks, and `window.quadriaquest` inspection API. The isolation check scans both outputs to confirm the debug panel/control/style markers are absent from the normal build and present in the debug build. To remove the tooling entirely, remove `src/dev/`, the guarded hooks in `src/main.js`, the debug scripts, and the flag/config; the production gameplay modules remain independent of the debug module.

After the first woodcutting success is dismissed, the tutorial closes with dialogue and drops an uneven floating crystal—the Iter Portal—into a free tile. Trees and all six ground items then fall back into place for optional practice, preserving inventory and skills. Clicking the crystal walks to it and fades into a small placeholder island; its return crystal brings you back with the clearing's state and your rewards preserved.

Clearing every restored ground item and tree triggers an untracked bonus: dialogue, a falling wooden chest near Pip, and an interruptible chest-opening interaction. The chest grants one Top Hat, once. Pip turns away from the chest for a happy, two-handed hat presentation while the camera moves in, then the normal camera returns. Use Wear Top Hat / Remove Top Hat to toggle the cosmetic.

Clearing finale checkpoints cover farewell, crystal reveal, practice reset, reward dialogue, and the reward chest. The Top Hat remains available through inventory editing; shared Celebration previews cover the acquire animation.


Confirming the slime color plays a happy hop; confirming the name plays a small leaning wave with the right hand above the head. Dialogue waits for each brief reaction to finish. After 30 seconds of inactivity, the slime dozes with closed eyes, soft breathing, and floating Zs. Movement, work, and cinematic sequences prevent sleep; clicks/taps and dialogue activation wake it, while orbit dragging, pinch/scroll zoom, and camera keys leave it asleep. It settles into a lopsided squish over two seconds before the Zs begin; Zs spawn every 1.4 seconds and rise slowly with a gentle sine-wave drift. The playground Sleeping loop settles once, then keeps breathing; Doze off and Wake up exercise the natural sleep/wake behavior without waiting 30 seconds. Happy hop, Wave, and Sleeping are shared animations available in the playground with play-once, loop, and speed controls.

Mining follows chopping before the Iter Portal finale. Three former trees are boulders. Craft a Crude Pickaxe with Sticks ×1 and Rocks ×1, then mine boulders for Stone ×1–3 and Mining XP. Both lessons offer optional **Show me how** guidance. In the playground, use **Clearing · Mining introduction**, **Clearing · Mine a boulder**, **Boulders** reset, and the **Mining** animation to iterate without replaying earlier lessons; both new inventory items and Mining skill controls are included.

### UI and audio polish previews
The **UI & audio polish** playground section opens real crafting, previews grouped crafting receipts, clears the loot feed, shows the SVG icon sheet, and auditions individual sounds or music contexts. Inventory/Skills controls open the shared journal; its own search, tabs, and expand button exercise the real layouts. Settings in the top-right journal menu or the splash-screen cog control Music, Effects, Ambience, and Mute. Audio is a procedural first pass and starts after a user gesture.

The playground’s **Tips & objectives** controls preview dismissible tips, add/update/complete/reset objectives, and open Quests. Tutorial replays use the same quest tracking as normal play.

Open the game menu and choose **Debug** (Show debug menu) to access playground controls. The playground starts closed and has no floating launcher; close it using its header. This entry is excluded from normal builds.

The playground’s **Terrain colors** section provides a live **Grass color** picker for the clearing and splash map. The standard base is RGB **53, 141, 61** (`#358d3d`). The selected color centers the existing subtle tile hue, saturation, and lightness variations. Changes are session-only; **Reset grass color** restores the original palette exactly.

The splash slime receives a random body/hand color on each page load, with adaptive face contrast. Its appearance is independent of player customization. **Randomize splash slime** in the playground rerolls and previews it; **Preview splash screen** retains the current roll. Future random splash cosmetics should use the same appearance entry point.

Willowbank is the second playable tutorial area. See [the chapter design](docs/WILLOWBANK.md). Use the unified tutorial selector for arrival, dialogue, hammer crafting, repair, naming, fishing, Flint, fire-starting, placement, cooking, and eating. Each selection automatically enters the area.

The playground's **Shared model preview** opens the real terrain, foliage, resource and character models with repeatable animation controls. Willowbank's **arrival** button replays the narrator/camera introduction; chapter animation options include goblin idle/walk/attack/hit, corgi happy/sad/walk, and Reed idle. Existing area/reset controls exercise the shared water and adjacent resource gathering.

Use the shared model viewer for individual rig animations, Visual feedback for hit splats, and Companions for follower behavior. Load Willowbank · Repair bridge to replay the real rescue crossing.

In **Shared model preview**, drag with a mouse or one finger to orbit horizontally and vertically while animations play. **Reset view** restores the default angle; selecting a different model also resets and centers the view.

Journal layout checks: compact journals use icon tabs (with accessible names and hover labels), wide journals keep text labels, and Debug stays last. Inventory uses the same desktop list/detail pattern as crafting, selects the first available item automatically, and keeps mobile list → detail → back navigation. Use playground Inventory, Crafting, Skills and Quests buttons plus Willowbank entry to check every tab, including the empty Companions page. The shared journal close button replaces individual page headers.

The playground stays open after actions (close it explicitly with its header). Controls are grouped into collapsible Models & animation, Inventory & skills, Tutorials & objectives, Willowbank, World & water, Interface & audio, Visual feedback, and Session state sections. Tutorial/chapter actions, sound effects, and feedback use selectors with repeatable Run buttons. Inventory/skill edits, Play/Stop, checkpoints, and resets remain direct controls.

Compact journal navigation (desktop and mobile) uses list → detail → Back for inventory, recipes, quests, and companions. Only expanded desktop journals show lists and details together; the desktop expand control sits beside Close. Resize to mobile to exercise compact navigation even when the desktop expanded preference is saved. Playground menu launchers, quest controls, and Test follower expose all four browsers.
Expanded desktop journals are anchored 24px from the top, so taller tabs grow downward without moving the header.

Resource reactions and depletion use `src/resource-depletion.js` in both areas. In the playground, enter Willowbank and run **Chop a tree** or **Mine a boulder** to exercise the real approach, impact, completion, reward, and respawn flow. **Cancel** interrupts a strike; **Reset Willowbank** restores resources for another pass.

Dialogue presentation uses a shared twilight scrim and bottom card, with an overlapping speaker nameplate and one animated model above the card. Playground → Willowbank → **talk** exercises choices and speaker transitions; **arrival** exercises narrator-only dialogue. Preview the splash and opening for narrator customization controls. Check these at desktop and mobile sizes.

Character dialogue uses a fixed short reading card. Advance a question to reveal its standalone centered responses; choosing a response restores the speaker card. Repeated lines from the same speaker do not replay the entrance. The Willowbank **talk** playground action covers this entire flow; **arrival** covers the smaller cutscene card.

NPC conversation facing uses `createConversationFacing` on the world model, independently of portrait framing. In the playground, enter Willowbank, move to different sides of Reed, and use **talk** (or interact with Reed) to exercise the smooth turn; **Reset Willowbank** clears it.

Willowbank → **Replay bridge introduction** resets the chapter and replays Reed’s thank-you and the camera focus on the broken bridge and island. Advance the instruction to return the camera and open the carpentry tutorial. This uses the same sequence as accepting Reed’s request.

Willowbank is now a peaceful rescue tutorial. **bridge → Load checkpoint + supplies → Repair bridge** exercises the one-time injury and resumed repair; **Hammer injury** previews the motion. Later checkpoints preserve the 25-health healing setup. **Combat → Combat practice** spawns portable enemies in the current map and provides fight/reset/remove and real defeat/respawn controls. Inventory/Skills controls, normal crafting/equipping, and model previews exercise the same shared systems without combat quests. See the [area-three handoff outline](docs/DESIGN.md#area-three-combat-tutorial-outline).

### Testing on a phone on your local network

Connect the phone and development computer to the same Wi-Fi. Run `npm run dev:debug -- --host 0.0.0.0` (or `npm run dev -- --host 0.0.0.0` for regular play), then open the **Network** URL printed by Vite on the phone. The debug port is 5174; normal play defaults to 5173. Use the computer's LAN address, not `localhost` on the phone. Allow your terminal/Node app through the local firewall if prompted; VPNs or guest Wi-Fi client isolation may prevent the connection. This exposes the dev server on the local network while it runs; stop it with Ctrl+C when finished. No router port forwarding is needed.

The model viewer is under **Debug → Models & animation → Shared model preview**. Model-specific motions, pause/restart, view reset, drag rotation and pinch zoom are available. On mobile the viewer fills the screen and keeps the camera aspect matched to the canvas.

Guided journal regression checks: use **Replay Quests tutorial**, **Replay Skills tutorial**, **Replay Inventory tutorial**, and **Replay Mining tutorial → Show me how**. Only the required menu/tab/stack/recipe action is available during a guided step; close, expand, other tabs, search, and unrelated item actions are inert. Check Escape and the top-right toggle too, then finish the lesson and verify normal controls return. Willowbank's recipe help uses the same highlighted-action lock when that recipe is craftable; missing supplies must remain obtainable. These replays exercise the production journal lock, not a debug imitation.

Journal locks subscribe directly to tutorial stage changes, including transitions whose only visible change is dialogue outside the journal. Regression coverage must include the real controller's `quests-reveal → quests-toggle`, Skills introduction, and Inventory introduction without relying on a journal DOM mutation to refresh the lock. Also verify a new normal game through the first menu lesson; playground replays alone are insufficient.

Shared fishing playground: before visiting Willowbank, add a Crude Fishing Rod through Inventory & skills → Inventory, then click the ripples in the clearing pond at (4, 4). This uses the production fishing spot, action, skill, rod/line, and catch presentation. Repeat without resetting; move to cancel; use Full test area to cancel work, clear fish/XP, and restore the starter inventory. Fishing levels are available in the existing Skills controls. The fixture and its instructions are excluded from normal builds.

Fishing agency checks: Tutorials & objectives → Willowbank · Catch Pondfish → Load step, then click the fishing spot runs the real cast/wait/catch/celebration sequence. Fish and Fishing XP are committed once at the start of the catch. Open Inventory during the flourish, or click reachable ground to skip it; the reward must remain. Cancel before the bite for no reward. The first catch advances the objective immediately, with Reed's follow-up waiting until actions, walking, and journal use finish. Reset Willowbank clears pending follow-up. Use a low camera angle near the pond to verify Flint remains clickable above the flat fishing target.
The fishing click plane tracks the maximum wave crest from the current water settings (including playground wave-strength changes), rather than becoming a tall box. Willowbank now has four Sticks pickups, spread across the mainland; Enter/Reset Willowbank exposes and restores all four through the shared ground-resource implementation.

Ground-item movement regression: shared ground-item prefabs declare `blocksMovement: false`, consumed by both maps through `setWorldOccupancy`. Willowbank Enter/Reset and the existing eight-second pickup respawn must leave Sticks, Rocks, and Flint tiles walkable; pickups may respawn under a player. Trees/boulders remain solid. Test walking through pickup tiles and clicking the exposed tile edge to stand on them, then repeat after gathering/respawn and Reset Willowbank. Building on an occupied pickup tile remains disallowed.

Follower polish: click your owned companion in either area to approach and pet it (happy eyes, tail wag, floating hearts). After four idle seconds it settles into sitting; after a randomized 12–24-second rest delay it scratches an ear with its rear paw. Movement cancels rest/flavor poses, and half-height route steps use a proper hop. Companions → Rest now leaves the follower visible and it still yields when needed. Shared model preview → Corgi exposes Sit, Scratch, Petting, Jump up/down; Companions controls exercise live petting, naming, and follow/rest. The eating checkpoint and Reset current area repeat/reset the food lesson. Eating is also in Slime's shared model preview; it uses hand-to-mouth movement without a food prop, shared by every edible item. Food is consumed and health restored at the end of the 1.8-second action; movement cancels it without spending food. Verify name input/dice alignment on desktop/mobile and both confirmation choices.

Eating uses lowered hands that draw closer together below the eyes, and defaults to Pleased (happy eyes with the idle smile). Pleased is selectable independently in the shared model viewer and as a playground expression preview.


Companion debugging is world-independent: use **Dev playground → Companions** to add a follower in the current map, pet or rename it, toggle Rest/Follow, loop animations, or reset it. No Willowbank visit is required. **Shared model preview → Corgi** uses the same prefab and animation code. The app-owned runtime lives in `src/companions.js`; maps only configure placement and quest-specific rescue events.

## Development logs

Public dev logs live at `/dev-logs/`, with dated entries at `/dev-logs/YYYY-MM-DD/title/`. These are standalone HTML pages in `public/dev-logs/`; Vite serves them locally and copies them into both builds. They do not load the game or developer tooling, so no playground control is needed for this editorial content.

To add an entry, copy `public/dev-logs/2026-10-04/a-small-beginning/index.html` into a new date/slug directory. Update its title, machine-readable date, introduction, changes, next steps, metadata, and image caption/alt text. Put its header image in `public/dev-logs/images/` and use that same image for a new card at the top of `public/dev-logs/index.html`, including the title, date, and short blurb. Use `/dev-logs/dev-logs.css` for shared styling. The first entry is starter copy that can be edited before publishing. Deploy `dist/` as usual; hosting should serve nested `index.html` files for directory URLs.

Carpentry practice: World & water documents the clearing pond bridge at **(2, 4)**. Use Inventory controls to add a Crude Hammer and three Small Logs, then click the bridge. Moving cancels without spending materials; successful work spends three logs and awards 40 Carpentry XP. Full test area resets the fixture and skill for another run. Skills controls and the shared model viewer cover Carpentry levels, hammering, and bridge repair stages. The Willowbank repair checkpoint uses the same system with the local injury and rescue sequence.

Resource practice: World & water → Resource picking describes the shared gathering, chopping, mining, and respawn flow. Existing Inventory, Skills, model viewer, and Ground items/Trees/Boulders/Full test area resets exercise production behavior. Willowbank's Collect Flint checkpoint checks quest progression; its trees, boulders, and bundles respawn after eight seconds. Both areas use a 3–6 second base tool action and 1–3 material yield. Moving cancels unfinished work; rewards arrive once depletion finishes.


Shared crafting checks in the playground: use Inventory controls to grant Sticks and Rocks, then open the normal Crafting page to craft a Crude Axe or Crude Pickaxe. Move while crafting to cancel, retry, and adjust Crafting through Skills controls to verify the displayed duration. Both recipes work in the clearing and Willowbank before their quests. Tutorial checkpoints cover the guided axe/pickaxe lessons; Full test area resets the shared items, skills, and resource lifecycle. The normal Skills page includes Culinary before visiting Willowbank.


### Cinderhold: combat and equipment

The Iter Crystal now opens **Where to?**, with The Clearing, Willowbank, and Cinderhold available after the clearing's crystal reveal. Cinderhold is the largest tutorial map: a 40 × 32 stone training complex. Talk to Sergeant Bristle, win an unarmed fight, learn copper mining/smelting/smithing from Borin, equip a Copper Dagger and Copper Shield, and defeat a Bruiser. Fletch's bow lesson and Wisp's Energy Strike lesson are independent optional quests. **Combat** in the journal selects your equipped weapon/bare hands or a learned spell and your strategy, which decides the combat skill each attack trains. **Skills** shows core level, attributes and unspent attribute points. See [the chapter design](docs/CINDERHOLD.md).

Playground entry points (run `npm run dev:debug`):

- **Tutorials & objectives → Tutorial checkpoints → Cinderhold · arrival** starts the chapter. Individual checkpoints cover every required step and both optional lessons. **Reset current area** restarts chapter state and placed resources/encounters; **Full test area** also resets shared items, skills, gear, spells and supply grants.
- **Combat → Training systems → Visit landmark** jumps to a Cinderhold guide, encounter or station. **Spawn portable fixtures** places production copper, furnace, anvil, provision shelf, inert target and live enemy in the current map, including the clearing before any chapter visit. Use its approach actions or click the actual models. Reset/remove controls make these repeatable.
- **Inventory & skills** includes ore, ingots, copper equipment, bow/arrows, and Smithing. Keep a pickaxe/hammer in inventory for mining/smithing. One ore makes one ingot; dagger uses one ingot and shield uses three. Tools are reusable. Movement cancels unfinished station work without consuming inputs.
- **Training systems** also exposes production bow/ammo supply offers and learn/reset Energy Strike. Use the ordinary Combat menu and inventory equip actions to test styles, two-handed equipment conflicts, ammunition exhaustion, range and wall obstruction. Every resolved attack awards XP; targets give half XP until the receiving track reaches level 3. **Character & combat profile** sets attributes, grants points and prints the committed attack and defenses.
- **Interface & audio** previews Furnace, Anvil, Destinations, and Combat styles. Station/destination previews cannot craft or teleport. Real crystal approach and three-way trips are under **Travel practice**.
- **Shared model preview** contains all four mentors, Angry expression, copper outcrop/gear/ingot, bow/arrow, furnace/anvil/shelf, stone terrain/arch, practice target and Energy Strike projectile. Slime motions include copper gear, Archery, Casting, Smithing and Smelting using production motion functions.

Validate portability by using the fixtures before visiting Willowbank, repeating in another map, cancelling work, depleting/respawning resources, retreating, using supplies, and resetting. Checkpoints prepare scenarios; they do not replace a complete tutorial playthrough. Desktop/mobile station and destination menus use the same implementations. New developer fixtures and controls remain compile-time isolated.

All slime entries in **Shared model preview** (player, Reed and all four Cinderhold mentors) share the complete animation menu. **Animation preview → Point / Stomp** also runs those shared gestures on the live player; speed, loop, restart and Stop work in any area. Character-specific idle poses and default expressions remain available.

Combat previews: choose **Shared model preview → Attack / Block**, then use **Attack motion / Block motion** for Automatic or an explicit pose. **Main hand**, **Off hand**, and **Combat style** independently control the loadout; selecting a bow clears the off hand. **Reset loadout** restores defaults. Casting retains equipment, while fishing/mining temporarily show their own tools. All slime entries share these controls. Live **Animation preview → Attack (equipped) / Block (equipped)** uses your current gear and style; existing combat fixtures exercise real hits, pursuit and walk-home behavior.

### Performance testing

See [docs/PERFORMANCE.md](docs/PERFORMANCE.md). `npm run perf` builds an unminified playground bundle and runs fixed scenarios in a headless, GPU-backed Chrome via Playwright (dev-only). It compares counters and timings with `perf/baselines/` and explains regressions: loop phases, scene census changes and hottest functions. `npm run perf:full` adds the low-perf (SwiftShader + 4× CPU throttle), mobile-emu and WebKit environments. `npm run perf:ab` compares the working tree with a git ref in interleaved rounds. Results land in `perf/results/` (ignored).

In the playground, **Performance** prepares the same scenarios, toggles an on-screen HUD and logs a scene census. The HUD shows frame time, GPU time when available, draws, objects and the slowest loop phases.
