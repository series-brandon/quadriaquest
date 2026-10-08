# UI architecture and standards

The UI is being rebuilt on a small in-house kit (`src/ui/`) using plain JavaScript and no framework. Legacy surfaces move over one at a time. `npm run check:ui` enforces the rules below: new code follows them strictly, and legacy code may only get closer to them.

## Direction

- **Visual:** sleek and modern, with a bespoke look to come. Resource gauges and similar elements are squares with softened corners (rounded or chamfered) that echo the slime's silhouette. OSRS is a reference for gameplay, not for the look.
- **Low-poly, flat-shaded objects:** match the world. Elements read as small objects whose faces are shaded by angle to an upper-left light, rather than as flat fills or glossy, soft-shaded glass. Colors are pastel.
- **Rounded shapes:** clip with a vector mask or draw them as SVG; never clip a transformed layer with `border-radius`, which produced jagged corners.
- **Depth:** comes from facet shading, a highlight shard and a soft dark rim, not from drop shadows or blur.
- **Motion:** idle states are still. Motion conveys change and uses only transform or opacity on HTML layers; transforms inside SVG cause a layout every frame in Chrome. Constant ambient animation measurably raised browser CPU.
- **Performance:** views are built once, and only the node whose data changed is updated. Nothing polls.

## Kit

| Module | Purpose |
|---|---|
| `src/reactive.js` | `signal`, `computed`, `effect`, `batch`, `untracked`. This is the only module that imports `@preact/signals-core`. |
| `src/ui/dom.js` | `h(tag, props, ...children)` and `mount(build)`. Props and children that are signals or functions are bound to that node. |
| `src/ui/scope.js` | Ownership. Each binding belongs to the view that built it and is disposed with that view. |
| `src/ui/list.js` | `keyedList` keeps row nodes, focus and scopes across updates. |
| `src/ui/panels.js` | Entries may set `badge` (a signal) for an attention dot on their tab. `createPanelHost` holds the open page, the tab bar (open or pinned), tab availability, return-to pages, close locks and dismiss rules. Every journal page and launcher tab registers here once. |
| `src/ui/panel-tabs.js` | `panelTabs` builds tab buttons from a host: the desktop bar, the phone bar and the More sheet. Tab ids (`open-<id>`) stay stable for tutorials and tests. |
| `src/ui/modal.js` | `createModalHost` owns every utility dialog: `open({id, title, size, required, build})` builds content in its own scope inside the shared `<dialog>` frame and disposes it on close. Sizes are `sheet` and `wide` (edge-to-edge on phones) and `compact` (stays centered). `confirmModal` is the shared short confirmation. Contents live in `src/ui/dialogs/`. |
| `src/ui/controls.js` | Shared page controls: `segmented`, `toggleSwitch`, `section` (collapsible, with its current value in the header), `row`, `progressBar` (a compositor-scaled fill), `subTabs` (tablist and kept panels, arrow keys, optional badge) and `slider` (a labelled range with its value). |
| `src/ui/page.css` | Shared page and dialog building blocks: labels, fields, cards, buttons (`q-button`, `--small`, `--quiet`), chips, lists and tiles. |
| `src/ui/viewport.js` | The single breakpoint (700px) and the `compactViewport()` signal. |
| `src/ui/icon.js` | `iconNode(name)`, the shared icons as DOM nodes. |
| `src/ui/tokens.css` | Every color, shape, size, font, shadow and motion value used by the kit (`--q-*`). |
| `src/ui/ui.css` | The entry stylesheet. It imports tokens and every component sheet. |

## Rules

1. **State pushes; the UI never polls.** Use `reactiveRecord` for plain-object state such as the inventory. Systems whose getters aren't signals expose a `revision` signal that changes whenever they report a change; bindings read it before calling the getter. Gameplay state that a view shows is backed by signals at its source (`createResource` is the model). Gameplay code keeps its normal getters and setters; bindings that read those getters subscribe automatically. Do not add per-frame or timer-driven `update()` or `refresh()` calls to views.
2. **One flush per frame.** `main.js` runs each frame inside `batch`, so bindings write once, after the frame's state changes.
3. **Build with `h()`.** No HTML strings (`innerHTML` and friends), no `.onclick =` handlers and no DOM lookups by id or selector. A component keeps references to the nodes it creates. Icons come from `iconNode`.
4. **Views are owned.** Build inside `mount`, `keyedList` or `runInScope`. Bindings write to the DOM; they never build views. Call `dispose()` when removing a view.
5. **Lists are keyed.** Use `keyedList` and publish new item objects when data changes. Never clear a container and rebuild it.
6. **Components are pure UI.** A component receives the shared gameplay objects it displays and calls their actions; it never reimplements gameplay rules (AGENTS.md: shared gameplay). Components work in any area and in the playground.
7. **Styling:**
   - Classes use the `q-` prefix (`q-block`, `q-block__part`, `q-block--variant`).
   - Values come from tokens; color literals belong only in `tokens.css`.
   - No `!important`.
   - Breakpoints are 700px and 701px only.
   - Animate with `transform` and `opacity`.
   - Respect `prefers-reduced-motion`.
   - Components do not import CSS; add each sheet to `src/ui/ui.css` so components stay loadable in node tests.
8. **Dialogs go through the modal host.** Open utility dialogs with `modals.open` (or `confirmModal`) instead of creating `<dialog>` elements. Closing is the host's job: content calls the `close(reason)` it was given.
9. **Pages and tabs go through the panel host.** Register a page (`menus.panels.register`) instead of appending tabs or showing and hiding pages yourself. Open, close and check pages with `panels.open/close/dismiss/isOpen`, and toggle tabs with `setAvailable`. Never set a registered page's `hidden`, list panel ids, or read another module's DOM to find which page is open.
10. **Breakpoints in JS** come from `ui/viewport.js`. Legacy code uses `compactQuery()`.
11. **Accessibility:** use real roles (`meter`, `button`, `dialog`), keep labels and values current, give controls at least a 44px touch target (`--q-touch`), and keep focus stable across updates.
12. **Tests:** each component has a `node --test` file that runs on linkedom (`src/ui/test-dom.js`). Cover its bindings: the values shown, updates when state changes, and that unchanged state causes no DOM writes.
13. **Legacy ratchet:** `scripts/ui-standards-baseline.json` records the debt in legacy files: HTML strings, property event handlers, `matchMedia` and `!important`. Counts may fall but never rise. After reducing debt, run `node scripts/check-ui-standards.js --update`. To change a legacy surface substantially, move it into the kit rather than extending it.

## Migration status

| Surface | Status |
|---|---|
| Resource meters (Health, Mana, Stamina, Energy, Ki) | Kit (`ui/hud/meter.js`): low-poly bevelled tile, signal-backed resources, idle-still (in design review) |
| Breakpoint (player interface, journal) | Shared `ui/viewport.js` |
| HUD action row (Eat, quick spell, Sprint, Strong Strike, quick auras) | Kit (`ui/hud/action-button.js`, `ui/hud/quick-actions.js`). Driven by source signals: reactive inventory, signal-backed sprint and eating, and `revision` signals on combat, auras and styles. |
| Combat warnings and player effects | Kit. The warning chip (`ui/hud/warning-chip.js`) announces new advice and the start of an attack, fades after 3s and takes no space while idle. Player control effects show as icons on the player's health plate. Assistance's `warning` is signal-backed. The polled status line is gone. |
| Health plates over combatants (enemy target frame, player bar) | Kit (`ui/hud/health-plate.js`). Enemy HP is signal-backed (`enemy-entity.js`). The owner's frame loop writes only position, effects text and danger band, and each reaches the DOM only on change. |
| Panel registry and host (journal pages, tab bars, mobile nav and More) | Kit (`ui/panels.js`, `ui/panel-tabs.js`). Every page registers once; the journal shell, docking and Quests return are reactive. |
| Journal shell (`journal.js`) | Built with `h()`. The page contents (Skills, Inventory, Crafting, Quests, Settings, Combat, Equipment, Companions) are still legacy markup. |
| Tutorial journal lock | Legacy: id-based rules plus a MutationObserver (moved out of the journal). It exposes `lockedState` for the kit. Retire it once guide highlights are tutorial state. |
| Utility dialogs (cooking, furnace, anvil, destinations, companion name, food confirm) | Kit: the modal host (`ui/modal.js`) with `ui/dialogs/station-dialog.js`, `destination-dialog.js`, `name-dialog.js` and `confirmModal`. Station ingredients follow the reactive inventory. The dev model viewer is the only legacy `<dialog>` left. |
| Combat page | Kit (`ui/pages/combat-page.js`, hosted by `combat-style-menu.js`). Reactive through the revisions of styles, combat, auras, assistance, equipment and character; no refresh calls. Mode dropdown, quick settings, one-time override note with Return to Auto, and a Mode settings section of Auto/Manual policies. |
| Equipment page | Kit (`ui/pages/equipment-page.js`): worn slot tiles plus owned gear rows with stats and the equipment system's own actions. Refused changes explain why. |
| Inventory page | Kit (`ui/pages/inventory-page.js`, hosted by `inventory-menu.js`): searchable stack grid plus the chosen item's detail, with actions and per-item permissions from their owning systems. It is side by side when there's room, the detail goes below in the docked journal, and phones show one view at a time. It follows the reactive inventory and system revisions. The tutorial guide is a `data-guide` attribute (the rAF overlay is gone). |
| Character page (Attributes, Skills, Proficiencies) | Kit: one journal tab (`open-character`, primary on phones, with a badge while points are unspent) hosted in `game-menus.js`. `ui/pages/character-page.js` shows a slim core-level line over `subTabs`: **Attributes** (points and + buttons), **Skills** (non-combat, combat-style and armor skills) and **Proficiencies** (weapon, armor-slot and element; `PROFICIENCY_GROUPS`). The two lists share `ui/pages/skills-page.js` (search, rows with the level, a `progressBar` and an XP breakdown). Skill records are `reactiveRecord`s (`createGatheringSkill`) and combat tracks follow `character.revision`. The host owns the sub-tab signal, so it's remembered and `openSkills()` opens Skills. |
| Crafting page | Kit (`ui/pages/crafting-page.js`, hosted in `game-menus.js`): hand recipes, then station recipes ("Made at a furnace"), and the chosen recipe's detail with ingredients, time and a sticky craft button. It's side by side when there's room and one view at a time on phones. Materials follow the reactive inventory, times the reactive skill records, and "Crafting…" the crafting system's `activeId` signal. Every recipe keeps its stable ids (`choose-<id>`, `<id>-detail`, `<id>-duration`, `craft-<id>`) for tutorial and area guides. `menus.refresh()` is gone. |
| Quests page | Kit (`ui/pages/quests-page.js`, hosted by `journal.js`): quest lines (hidden when there's only one), then the chosen one's current tasks (description, `progressBar`, count, Show me how) and a collapsible Completed list. Phones show one view at a time. Quest state stays in `quests.js` (same API for areas and tutorials) with a `questRevision` signal that changes only on real changes, plus `questChapters()` / `showObjectiveHelp()`. The objective toast (`#objective-update`) is still legacy, with toasts. |
| Settings page | Kit (`ui/pages/settings-page.js`): Music, Effects and Ambience `slider`s and a Mute all switch, writing through `audio.set`. One page in two hosts via `settings-menu.js`: the journal tab and a popup on the modal host (the splash gear button, the playground). Audio settings are a `reactiveRecord`, so both copies, playground reset and localStorage stay in sync. |
| Companions page | Kit (`ui/pages/companions-page.js`, hosted by `companion-menu.js`): the live 3D portrait (the host's Three.js canvas, aspect synced to its size), name, Corgi, follow status, Rename (the kit name dialog) and Follow me / Rest here. The tab is always available; before a companion joins, an empty-state hint shows. It follows the companion system's new `revision`. The rename confirmation still uses the legacy narrator box. |
| Dialogue boxes | Kit. **Narrator** (`ui/hud/narrator.js`, `createNarrator()` in main.js): one owner of `#dialogue` and its input. `show({text, speaker, presentation, input, prompt, size, next, controls})`, `setPrompt` and `hide`. The opening, crafting tutorial, finale, Willowbank and companion rename call it instead of writing to the box or attaching their own listeners. **Character conversations** (`character-dialogue.js`): the same API, built with `h()` and signals (portrait renderer kept). Both are styled by `ui/hud/dialogue.css` (tokens; the ids stay for shared layout rules, tests and perf scenarios). |
| Tutorial tip | Kit (`ui/hud/tip.js`, `createTip()` in main.js): one owner of `#gather-tutorial`. `show({title, text, emphasis, count, progress, complete, action, help})`, `update`, `updateAction` and `hide`. Continue and Show me how run the current owner's callbacks. The opening, crafting tutorial (and area chapters through `showChapterTip`), finale, Willowbank and the playground use it. Look in `ui/hud/tip.css`; placement stays in the shared HUD layout rules (by id). The count and progress bar stay hidden, as before. |
| Toasts (including the objective toast) | Legacy |
| Powers page (Spells, Auras, Abilities) | Kit (`ui/pages/powers-page.js`, hosted by `powers-menu.js`, the `open-powers` tab under More on phones). One card per power: description, facts (power, cast time, range, cost, XP; Ki per second; Energy), quick-slot star, aura on/off, ability Queue and per-power **Allow auto use** (shown while that policy is Auto). `listed` powers appear locked with requirements and an `unlock` hint; unlisted ones stay secret until learned. The Combat page keeps only a compact Powers section (Queue, aura switches) with a link. |
