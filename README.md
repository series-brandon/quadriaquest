# Project Clime

A small browser RPG prototype built with JavaScript, Three.js, HTML, and CSS. The agreed design is recorded in [DESIGN.md](DESIGN.md).

Run locally with Node.js 22 or newer:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Click terrain to move and materials to gather. Hold the left/right arrow keys to rotate smoothly and up/down to raise/lower the viewing angle. Right-drag also orbits, and the rotation buttons make discrete turns; scroll or use the plus/minus buttons to zoom. Keyboard rotation stops on release or when the window loses focus. The perspective camera follows the slime. Its vertical angle is limited to 20–75 degrees; zoom changes the camera distance from 3 to 34 world units, with finer adjustments up close for inspecting the character. Use Reset clearing to replenish the six collectibles.

Half-height steps are traversable in both directions. Trees, water, and tall ledges block movement. The upper meadow is reachable through smaller steps; the isolated tall lookout demonstrates an inaccessible ledge. Gathering continues without restarting when its target is clicked again. High-contrast hover brackets indicate reachability. Accepted clicks set sticky green destination corners and a single overhead status marker; blocked clicks pulse red with a cross. The marker reads Going with gray dots while approaching, Gathering with a rotating blue spinner during interaction, and Arrived! or Done! with a green check that rises and fades on completion. The marker stays visually above the slime even at steep camera angles.

```sh
npm test
npm run build
```

This first prototype has no saved progress, combat, crafting, map travel, or multiplayer yet. Inventory is held in memory and resets on refresh. Character and world assets are generated in JavaScript. The optional Google Fonts stylesheet falls back to system fonts when offline.
