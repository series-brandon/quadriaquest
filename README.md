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


The next tutorial leg introduces crafting through one-line dialogue, then reveals a bottom-right game menu. Golden outlines and floating arrows guide the menu button, Crafting option, and Crude Axe recipe. The axe takes 1 Stick, 1 Stone, and two uninterrupted seconds to craft. Materials are consumed only on completion; moving cancels the action without consuming them. Crafting uses the slime’s hand animation and overhead progress marker, awards 20 Crafting XP as floating text, and ends with a success message that requires Continue. In-game item names in instructions and recipes are highlighted.

After the axe is crafted, dialogue introduces woodcutting. Trees receive golden outlines and arrows until the first tree is felled. Clicking a tree with a Crude Axe in inventory routes the player to an adjacent reachable tile and starts a 3–6 second chopping action with an animated axe. Moving interrupts chopping and restarts its progress on the next attempt; clicking the same tree does not interrupt it. The completed tree falls, clears its blocked tile, and rewards 1–3 Wooden Logs and 20 Lumberjack XP. A dismissible success message completes this tutorial leg. Crafting remains accessible afterward.
