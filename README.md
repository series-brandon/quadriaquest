# Project Clime

A small browser RPG prototype built with JavaScript, Three.js, HTML, and CSS. The agreed design is recorded in [DESIGN.md](docs/DESIGN.md).

Run locally with Node.js 22 or newer:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The opening introduces Quadra on a single floating tile: the slime drops in, dialogue advances by clicking/tapping the box (or Enter/Space when focused), and color and name choices each have a confirmation/retry step. Color previews update live. After a fade into the clearing and another landing, four ordered lessons teach rotation, zoom, movement, and gathering. Each lesson keeps its success message visible until the player clicks Click to continue; the final gathering confirmation begins the crafting introduction. Movement requires arrival at a different reachable tile; resource clicks only move until gathering unlocks. The old HUD remains hidden; a small tutorial card tracks all six resources. Refresh to replay the opening; profile and progress currently last only for the session.

Once the tutorial unlocks play, click terrain to move and materials to gather. Hold the left/right arrow keys to rotate smoothly and up/down to raise/lower the viewing angle. Drag with either mouse button or one finger to orbit; scroll or use a two-finger pinch to zoom. Dragging and pinching never issue movement clicks. Keyboard rotation stops on release or when the window loses focus. The perspective camera follows the slime. Its vertical angle is limited to 20–75 degrees; zoom changes the camera distance from 3 to 34 world units, with finer adjustments up close for inspecting the character.

Half-height steps are traversable in both directions. Trees, water, and tall ledges block movement. The upper meadow is reachable through smaller steps; the isolated tall lookout demonstrates an inaccessible ledge. Gathering continues without restarting when its target is clicked again. High-contrast hover brackets indicate reachability. Accepted clicks set sticky green destination corners and a single overhead status marker; blocked clicks pulse red with a cross. The marker reads Going with gray dots while approaching, Gathering with a rotating blue spinner during interaction, and Arrived! or Done! with a green check that rises and fades on completion. The marker stays visually above the slime even at steep camera angles.

```sh
npm test
npm run build
```

This first prototype has no saved progress, combat, map travel, or multiplayer yet. Inventory is held in memory and resets on refresh. Character and world assets are generated in JavaScript. The optional Google Fonts stylesheet falls back to system fonts when offline.

During the gathering lesson, gold outlines, soft gold edges, and floating arrows identify the six resources. All gold highlighting and arrows disappear immediately after the first successful pickup. Only the item under the cursor receives a white hover outline; other items remain unmarked.

Gathering awards 20 XP per completed pickup. The prototype starts Gathering at level 1 and grants level 2 at 120 XP (six items), improving gathering speed by 8%. An animated XP notification accompanies each award, and leveling up adds a celebration. The first XP award pauses the gathering tutorial for an explanation; Continue restores the collection instructions and progress. The first level pauses for its own explanation; Okay returns to the six-item success message, whose Continue button begins the crafting introduction. Skill progress currently resets with the session.


The next tutorial leg introduces crafting through one-line dialogue, then reveals a bottom-right game menu. Golden outlines and floating arrows guide the menu button, Crafting option, and Crude Axe recipe. The axe takes Sticks ×1, Rocks ×1, and two uninterrupted seconds to craft. Materials are consumed only on completion; moving cancels the action without consuming them. Crafting uses the slime’s hand animation and overhead progress marker, awards 20 Crafting XP as floating text, and ends with a success message that requires Continue. In-game item names in instructions and recipes are highlighted.

After the axe is crafted, dialogue introduces woodcutting. Trees receive golden outlines and arrows until the first tree is felled. Clicking a tree with a Crude Axe in inventory routes the player to an adjacent reachable tile and starts a 3–6 second chopping action with an animated axe. Moving interrupts chopping and restarts its progress on the next attempt; clicking the same tree does not interrupt it. The completed tree falls, clears its blocked tile, and rewards Small Logs ×1–3 and 20 Lumberjack XP. A dismissible success message completes this tutorial leg. Crafting remains accessible afterward.

## Development playground

**Required for every addition:** Update playground support in the same change whenever anything new is added, and keep it current when behavior changes. Never finish or move on with outdated debug coverage. If unsure whether or how something should be exposed, ask the user. The standing contributor rules are in [AGENTS.md](AGENTS.md#keep-the-dev-playground-current).

Run `npm run dev:debug`, then open **http://127.0.0.1:5174/**. It skips the opening and all tutorials and drops Pip into the clearing with Sticks ×10, Rocks ×10, and Crude Axe ×1. Normal movement, gathering, crafting, and chopping are available immediately. Refreshing retains debug mode but resets the session.

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

`vite.config.js` defines the compile-time `__PLAYGROUND__` flag **only** for the `playground` mode. The panel and CSS live in `src/dev/`, dynamically imported inside that flag. Normal builds eliminate the import, mutation adapter, preview hooks, and `window.clime` inspection API. The isolation check scans both outputs to confirm the debug panel/control/style markers are absent from the normal build and present in the debug build. To remove the tooling entirely, remove `src/dev/`, the guarded hooks in `src/main.js`, the debug scripts, and the flag/config; the production gameplay modules remain independent of the debug module.

After the first woodcutting success is dismissed, the tutorial closes with dialogue and drops an uneven floating crystal—the Iter Portal—into a free tile. Trees and all six ground items then fall back into place for optional practice, preserving inventory and skills. Clicking the crystal walks to it and fades into a small placeholder island; its return crystal brings you back with the clearing's state and your rewards preserved.

Clearing every restored ground item and tree triggers an untracked bonus: dialogue, a falling wooden chest near Pip, and an interruptible chest-opening interaction. The chest grants one Top Hat, once. Pip turns away from the chest for a happy, two-handed hat presentation while the camera moves in, then the normal camera returns. Use Wear Top Hat / Remove Top Hat to toggle the cosmetic.

The playground's **Tutorial finale** section replays the closing dialogue, portal and chest drops, practice reset, hidden reward dialogue, travel, and hat celebration. **Complete practice** clears the world objects without adding loot to exercise the real hidden-goal check after Practice reset. **Use portal** and **Open chest** use the same approach/interact path as clicking their models. The Top Hat is available in inventory editing and item feedback previews; removing the last hat unequips it. **Hat celebration** also appears in animation playback with looping and speed controls. Reset finale cancels the sequence and removes its actors; Full test area additionally restores skills, starter inventory, trees, and ground items.


Confirming the slime color plays a happy hop; confirming the name plays a small leaning wave with the right hand above the head. Dialogue waits for each brief reaction to finish. After 30 seconds of inactivity, the slime dozes with closed eyes, soft breathing, and floating Zs. Movement, work, and cinematic sequences prevent sleep; clicks/taps and dialogue activation wake it, while orbit dragging, pinch/scroll zoom, and camera keys leave it asleep. It settles into a lopsided squish over two seconds before the Zs begin; Zs spawn every 1.4 seconds and rise slowly with a gentle sine-wave drift. The playground Sleeping loop settles once, then keeps breathing; Doze off and Wake up exercise the natural sleep/wake behavior without waiting 30 seconds. Happy hop, Wave, and Sleeping are shared animations available in the playground with play-once, loop, and speed controls.

Mining follows chopping before the Iter Portal finale. Three former trees are boulders. Craft a Crude Pickaxe with Sticks ×1 and Rocks ×1, then mine boulders for Stone ×1–3 and Mining XP. Both lessons offer optional **Show me how** guidance. In the playground, use **Replay Mining tutorial**, **Mine nearest boulder**, **Boulders** reset, and the **Mining** animation to iterate without replaying earlier lessons; both new inventory items and Mining skill controls are included.

### UI and audio polish previews
The **UI & audio polish** playground section opens real crafting, previews grouped crafting receipts, clears the loot feed, shows the SVG icon sheet, and auditions individual sounds or music contexts. Inventory/Skills controls open the shared journal; its own search, tabs, and expand button exercise the real layouts. Settings in the top-right journal menu or the splash-screen cog control Music, Effects, Ambience, and Mute. Audio is a procedural first pass and starts after a user gesture.

The playground’s **Tips & objectives** controls preview dismissible tips, add/update/complete/reset objectives, and open Quests. Tutorial replays use the same quest tracking as normal play.

Open the game menu and choose **Debug** (Show debug menu) to access playground controls. The playground starts closed and has no floating launcher; close it using its header. This entry is excluded from normal builds.

The playground’s **Terrain colors** section provides a live **Grass color** picker for the clearing and splash map. The standard base is RGB **53, 141, 61** (`#358d3d`). The selected color centers the existing subtle tile hue, saturation, and lightness variations. Changes are session-only; **Reset grass color** restores the original palette exactly.

The splash slime receives a random body/hand color on each page load, with adaptive face contrast. Its appearance is independent of player customization. **Randomize splash slime** in the playground rerolls and previews it; **Preview splash screen** retains the current roll. Future random splash cosmetics should use the same appearance entry point.

Willowbank is the second playable tutorial area. See [the chapter design](docs/WILLOWBANK.md) for its quest flow and rules. The playground’s **Willowbank chapter** controls provide direct entry, checkpoints, encounters, health, repair/fishing/placement, naming, and animation previews.

The playground's **Shared model preview** opens the real terrain, foliage, resource and character models with repeatable animation controls. Willowbank's **arrival** button replays the narrator/camera introduction; chapter animation options include goblin idle/walk/attack/hit, cat happy/sad/walk, and Reed idle. Existing area/reset controls exercise the shared water and adjacent resource gathering.
