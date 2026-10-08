# QuadriaQuest development handoff

Snapshot: 2026-10-06. This is a restart aid, not a claim that all architecture work is finished. Read `AGENTS.md` first and verify current code/worktree state before editing. The latest cleanup status is recorded below; older dated verification sections are historical snapshots.

## Project and working conventions

- Game name: **QuadriaQuest**. Project/repository/folder references: **quadriaquest**. The actual checkout is `/Users/brandonmanning/src/poc-workspace/quadriaquest`; some session metadata still refers to the old `project-clime` path.
- Stack: HTML, JavaScript, CSS, Three.js. No replacement game engine or other implementation language.
- Preserve existing staged and unstaged work. This snapshot includes substantial uncommitted work from multiple iterations; do not reset/revert/stage it wholesale or assume it belongs to the current task.
- `docs/DESIGN.md` holds the broader design. `docs/COMBAT.md` is the current combat/progression design source of truth; update its rules in place rather than appending history. `docs/CINDERHOLD.md` holds the third-area design and first-playable status; `docs/WILLOWBANK.md` holds the second chapter. `README.md` holds run/build/debug instructions. If these disagree with newer user decisions or actual code, reconcile them explicitly.
- New work must be reachable, repeatable, and resettable in the dev playground in the same change. Use production implementations. Ask when coverage or scope is uncertain. Keep developer tools out of normal builds.

## Architecture boundary — settled with the user

Only layout and narrative belong to a particular area. Gameplay systems must work in any world that supplies the relevant terrain/entity/target. This includes actions and state, not merely model factories and UI. Do not add `activeArea`, `enteredWillowbank`, or equivalent prerequisites for generic gameplay.

**Bridge clarification:** Willowbank's bridge collapse, Reed's dialogue, quest sequence, rescue/crossing, and one-off finger injury are local narrative. Carpentry is shared: requirements, timed work, hammering, cancellation, material consumption, XP, and progress events. Preserve the specific bridge story; extract the skill mechanics underneath it. A portable bridge model/progress presentation can be configured by that narrative.

Use shared action completion/progress callbacks for tutorial updates. Normal gameplay must not require that a tutorial objective is active. Avoid copying the same action into the next map. Do not use a debugging shortcut that teleports the player just to preview shared UI.

## Recent fixes already made

### Journal layout pass (sidebar list/detail, expanded journal, tab bar) — 2026-10-08
- **Sidebar Inventory and Crafting:** choosing an item or recipe replaces the list with its detail, with a back button (`.q-back`: chevron + "All items" / "All recipes"). The swap now follows the journal's width (`@container (max-width: 640px)`), not the viewport, so phones keep the same behaviour. Free-play Crafting opens to the list; only the crafting lessons pre-select a recipe.
- **Expanded journal:** a near-full-screen panel over the world and the sidebar (24px margins), never narrower than the docked one. The sidebar's collapse button hides while expanded.
- **Wide pages** (`@container (min-width: 641px)`): pages are centred at a 60rem maximum, Combat and Settings at 40rem (`.q-page--form`). Attribute and skill rows flow into columns. Sub-tabs and segmented options ellipsize instead of clipping.
- **Kit font bug:** `font: 600 13px / 1.2 inherit` is invalid CSS, so buttons, segmented controls, sub-tabs and dialogue buttons rendered at the 16px body font. These are now longhand properties at the intended 13px semibold, which makes button text visibly smaller everywhere.
- **Tab bar:** the kit `.q-tabbar` with `panelTabs(…, {balance: 72})` publishes `--q-tab-columns` (one row when every tab fits at 72px, otherwise balanced rows: 10 tabs as 5 + 5, 9 as 5 + 4), with icons over labels. All legacy `#game-menu-bar` / `#open-crafting` / `#open-inventory` rules were removed (ui-theme.css, player-interface.css, style.css). The nav is built with `h()`.
- **Standards:** `check:ui` allows container queries at 640px/641px only (docs/UI.md).
- **Verified headless:** 1280 sidebar (Inventory and Crafting swap to detail and back), expanded at 1600, 1280, 900 and 760 (Character, Inventory, Crafting, Settings, Combat, Quests), and phone 390 (unchanged list/detail, tab bar). Tests cover the balanced columns.

### Eat "Show me how" — 2026-10-08
- **User report (desktop):** the Willowbank Eat step's Show me how only opened the Inventory.
- **Fix:** the inventory guide is general now. `inventoryMenu.guide({item, action})` (`true` still means the Sticks lesson) highlights the stack until it is chosen, then that item's action button with the matching label. The inventory page takes `guide` (`{item, action}` or null) instead of `guided`.
- Willowbank's `eatHelp` opens Inventory and guides Cooked Pondfish → Eat, for both the tip and the Quests-page help. The area API has `guideInventory(item, action)`. `hideGuide()` clears it, and eating clears it at once.
- **Verified headless** on desktop and phone (390×844, touch): the fish is highlighted, then Eat after choosing it, and eating finishes the chapter with no guide left. The inventory page test covers item → action.

### Finger smash damage — 2026-10-08
- The Willowbank hammer injury now costs **20 health** (was 5), from `INJURY_DAMAGE` in `bridge-injury.js`. Willowbank's playground checkpoints after the bridge use the same constant for their starting health. At the base out-of-combat rate (1 health per 6s) it takes about 2 minutes to regenerate, so it usually remains for the meal. The Eat objective text now says the fish restores 20 health, matching `FOODS.cookedFish`.

### Willowbank "Show me how" for world targets — 2026-10-08
- **User report:** on Repair the bridge, Show me how did nothing.
- **Cause:** with a Crude Hammer already in hand (the usual case after the previous step), the help only switched on the bridge highlight. The bridge is off-screen from the arrival area, so nothing visible changed. The Catch Raw Pondfish help had the same issue for the fishing spot. Without the tool, the help already worked (it opens Crafting on the recipe).
- **Fix:** `showTarget(x, z)` in willowbank.js highlights the target and pans the camera to it (the existing `introFocus` focus, with a 1.4s hold, then back). It closes menus first. `bridgeHelp` and `fishHelp` serve both the tip and the Quests-page help.
- **Verified headless:** from the bridge checkpoint, the help pans to the highlighted bridge and returns. `npm run smoke` checks the bridge comes into view after pressing help.

### Willowbank stalled after the first catch — 2026-10-08
- **User report:** Broken Bridge Rescue stopped after catching a Pondfish instead of continuing to flint, Flint and Stone, the Campfire, placing it, cooking and eating.
- **Cause:** Reed's follow-up ("A fine catch!… Look near the water for Flint") waited for `document.getElementById('journal').hidden`. The desktop journal is now docked in the sidebar and never hidden, so the follow-up never played.
- **Fix:** the journal exposes `covering` (open, and not the docked desktop sidebar: phones or the undocked journal). The area API has `menuCovering()`, and Willowbank waits on that. No other area code reads menu DOM state.
- **Verified headless (desktop, real clicks):**
  - From the Catch Raw Pondfish checkpoint, the catch leads to Reed's follow-up, then flint, then "Make yourself a Flint and Stone…".
  - From the Prepare a Campfire checkpoint: craft Campfire, place it from Inventory, "cold fish" line, cook one at the fire, "best part" line, eat from Inventory, closing lines, then "Broken Bridge Rescue — Complete!".
- `npm run smoke` now catches a Pondfish in Willowbank (walking via `screenFor`) and requires the follow-up.

### Tutorial menus, opening shadow and phone notices — 2026-10-08
- **Old menu button removed:** `#game-menu-toggle`, its CSS and its tutorial stages (`quests-toggle`, `skills-toggle`, `inventory-toggle`, `menu`) are gone. On desktop it soft-locked the first quest: the docked journal already showed Quests, so the tab click did nothing.
- **Lessons guide the real tabs:** "Oh wait, I forgot... here you go!" reveals the menus (desktop sidebar, phone bottom tab bar). The tip then guides the tab directly: Quests, Character (skills), Inventory, Crafting (axe, retry and pickaxe guidance).
  - `guideTab` closes any open page first, so the tab click is always the step.
  - Every tab button carries `data-tab`. Guides highlight both bars' copies, and the tutorial lock accepts either (`#id` or `[data-tab]`).
  - The docked desktop journal always pins its tabs, even during lessons. On phones the bottom bar stays visible during lessons (the old rule swapping in the journal's own tab row is gone).
- **Phones:** Quests is a primary tab. The bar is one row of equal columns for any count (5 tabs + More). The lesson tip and item receipts sit above the bar.
- **No hidden tabs:** the tutorial no longer hides Inventory and Crafting. All tabs are always available; Debug appears only in the playground build.
- **Opening shadow:** the contact shadow's receivers started visible at the origin and showed a blob left of the lone block until the slime dropped. They now start hidden, and `contactShadow.update(position, scale, visible)` hides them while the player model is hidden.
- **Follow-up (user report: nothing on desktop at the Quests step):** in a real new game the first quest comes before the camera lessons, while `opening.playable` is false, and the player UI (sidebar, tab bar, health) only showed when playable. So the line revealed an empty menu host. Playground checkpoints enter free play first and hid this. main.js `playerUiShown()` is now playable **or** the menus revealed; it drives the player interface and the health meter (updated before the opening's early return). The tip before the line now says "Check your Quests tab to view it."
- **`npm run smoke` now plays a new game** in the normal build on desktop and phone (dialogue, choices, camera and move lessons) to the first Quests lesson. It checks the guided tab is visible, and that clicking it opens Quests and advances the lesson.
- **Verified headless** (normal build and playground, 1280×800 and 390×844 with touch): no stray shadow before the drop, and the slime lands with its shadow. Through the first quest on both sizes, the line reveals the menus, Quests is highlighted, clicking it opens the page and advances the lesson, and the phone receipt clears the bar. `npm run smoke` now walks the quests, skills, inventory and crafting tab lessons through their real steps.

### Dead code and prototype HUD cleanup — 2026-10-08
- **Prototype HUD removed:** the hidden "Playable Study 01" header, journal, footer satchel, camera buttons and controls hint are gone from `index.html`, with their `style.css` rules. main.js no longer writes them: `updateUI` only reports the count to the opening, and the frame loop and move handler no longer write the activity text or the action-progress bar. The unreachable camera-button and "Reset clearing" handlers are gone (the playground has its own reset). `#game`, `#tooltip` and `#scene-fade` stay.
- **Dead code removed:**
  - `src/dev/theme-comparison.js` and `.css`;
  - unused imports and locals in main.js, enemy-entity.js, cinderhold.js, model-catalog.js, splash.js, companion-follow.js and three tests;
  - Willowbank debug hooks nothing reached, plus the action-preview state only they set. Kept: `stage`, `clearUI`, `reset`, and `hit`/`zero`/`miss`, which `sharedAction` in main.js calls by name.
- **CSS:** removed selectors that match nothing (`#skills-panel`, `.crafting-heading`, `#area-name`, `.journal-search`, `#reopen-journal`, `.q-chips`, `.q-check` and others) from `ui-theme.css`, `player-interface.css` and `ui/page.css`. Only the dead selectors were removed from combined selector lists. Rules that always lose to later ones need a browser CSS coverage pass, not yet done.
- **Kept on purpose:**
  - test- and automation-only helpers (`character.addXp`/`setLevel`, `itemChangeMessage`, `awardGatheringXp`, `enterWillow`, `screenFor` and so on);
  - the unwired combat-formula exports. `sprintDrainPerSecond` (athletics lowers drain) is planned; `player-resources.js` still drains a fixed one stamina per 0.5s.
- **Smoke check extended:** a Willowbank checkpoint, the three splats through `sharedAction`, the full reset, and a normal-build (`dist`) start from the splash with no debug API. `npm run smoke` now builds both variants.

### Playground startup fix and smoke check — 2026-10-08
- **User report:** the playground crashed on load with `ReferenceError: toastTimer is not defined`. The toast migration had missed two calls in main.js: player movement dismissing the current message, and the playground reset. Both now call the kit toast's new `clear()`, which is covered by `notices.test.js`.
- **New smoke check:** `npm run smoke` (`scripts/smoke-playground.mjs`) runs headless and dev-only.
  - It builds the playground and serves `dist-playground` with the perf harness's static server.
  - It loads the page in installed Chrome (hardware GPU, like perf `dev-gpu`), exercises the kit HUD surfaces through the real playground controls, and fails on any page or console error. One browser, always closed.
  - Use it when the Browser pane isn't available; it would have caught this crash.
- **Viewer bug found by the smoke check:** the dev model viewer threw "Cycle detected" on open. The preview-loadout rules build a real equipment instance (whose `revision` signal they write), and they ran inside `computed`s. They now run in `readLoadout()` when the loadout changes and publish into signals. The playground's action handler now also logs caught errors to the console.
- **Smoke-verified:**
  - viewer: opens with a canvas, Corgi motions listed, slime loadout and Attack fields shown, a dagger offers piercing/slashing damage, the loadout note is shown, Pause turns into Play, it closes and reopens with a fresh renderer;
  - clearing gather checkpoint: the tip shows "Gathering resources" and the quest pop-up "Collect ground items · 0/6";
  - adding Sticks shows a "+Sticks ×1" receipt; a Fishing level shows its level-up receipt;
  - no page or console errors.
- **Still to check with the Browser pane:** visuals and phone layouts for the tips, notices and viewer, the pickaxe Show me how and chapter tips, and the blocked-action toast.

### Dev model viewer on the kit — 2026-10-08 (no legacy UI surfaces left)
- **`dev/model-viewer.js`** (dev only) replaces `dev/model-preview.js`/`.css`, which had an HTML-string template, property handlers and its own `<dialog>`.
  - **Modal host:** `createModelViewer(api.modals).show()` opens it on the host (id `dev-model-viewer`, the new `size: 'large'`: 1000×820 on desktop, edge-to-edge on phones).
  - **Controls:** model, animation, expression, held item (Celebration), and for slimes combat style, attack/block motion, main/off hand with damage types, and attack hands. They are keyed selects bound to signals; motions and expressions follow the chosen model; damage choices and the loadout note come from the production preview-loadout rules.
  - **Playback:** Pause/Play (disabled for static motions), Restart, Reset view, Reset loadout.
  - **Ownership:** the view's scope owns the WebGL renderer, OrbitControls, `ResizeObserver` and rAF loop, all disposed on close. They're recreated on each open, where the legacy viewer kept one renderer forever.
  - **Same behaviour:** the camera fit and measurement, Celebration/Corgi pose sampling and production `update` calls are unchanged.
- **Wiring:** the dev API exposes `modals`. The playground's Interface → Model viewer and Combat models button use the new viewer. `check-debug-isolation.js`'s marker is now `dev-model-viewer`, and the check confirms it's in the debug build only.
- **Verification:**
  - 359 tests pass. `check:ui`, both builds and `check:debug-isolation` pass.
  - **Smoke-checked** (see "Playground startup fix and smoke check" above): open, models and motions, slime loadout, pause, close and reopen. Visual and phone checks need the Browser pane.

### Notices on the kit — 2026-10-08
- **`ui/hud/notices.js`:**
  - `messageToast()`: `#toast`, mounted in main.js; `toast(text)` plays the blocked sound and shows it for 2.6s.
  - `objectiveToast({notice})`: `#objective-update`, shown for 4.5s, then a 0.65s fade.
  - `itemFeed()`: `#item-feed`, receipts as a keyed list with icons; same merge, craft and cap rules as the legacy `createItemFeed`, which now wraps it.
  - `levelUps({notice})`: `#skill-rewards`, receipts that stack and expire after 5s.
  - Timers belong to each view's scope.
- **State modules publish notices instead of building DOM:**
  - `quests.js` exports `notice` (`{seq, title, current, total}` on each real change; null from `resetObjectives`).
  - `skills.js` exports `levelNotice` (`{seq, title, detail}` per level gained; `{clear:true}` from `clearSkillRewards`).
  - Floating "+XP" labels stay as they were: world-anchored, positioned each frame like hit splats.
- **Markup and CSS:**
  - `index.html` no longer has the static `#toast`.
  - Look in `ui/hud/notices.css` on tokens (`--q-gain`, `--q-cost`, `--q-level*`, `--q-notice-shadow`; the objective reuses the tip colours).
  - Positions reproduce the effective legacy values: objective 22/22 on desktop and 16/12 on phones; feed 24/92 on desktop and 12/20 on phones (two newest receipts); toast 190px up and centred.
  - Journal, sidebar and player-health offsets stay in the legacy layout rules by id.
  - Removed the legacy look rules and the `skill-pop`/`skill-fade`/`loot-in` keyframes.
- **Verification:**
  - 359 tests pass, including `notices.test.js`: toast replace and fade, objective progress, completion and dismiss, feed merge, craft costs, cap and expiry, level-up stack, expiry and clear.
  - `check:ui` passes; legacy debt fell (`item-feedback.js` innerHTML) and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - **Not yet checked in the browser:** the Browser pane was hidden, and hidden pages don't run. Pending, with the tip checks above: a blocked action's toast, the quest pop-up while gathering, receipts for pickups and a craft, a level-up receipt, and phone positions.

### Tutorial tip on the kit — 2026-10-08
- **Tip** (`ui/hud/tip.js`): `createTip()` (main.js) builds and owns `#gather-tutorial` (`#tutorial-title`, `#tutorial-count`, `#tutorial-copy`, `#tutorial-progress`, `#tutorial-help`, `#tutorial-continue`); `index.html` no longer has the static markup.
  - **API:** `show({title, text, emphasis, count, progress, complete, action:{label, disabled, onPress}, help:{label, onPress}})` replaces the tip; `update(patch)`, `updateAction(patch)` and `hide()`; `state` and `visible`.
  - **Emphasis:** item names in the text render as `<strong>` from a keyed list (it replaces `writeItems`).
- **One owner for the buttons:** previously the opening and the crafting tutorial each attached listeners to the shared Continue button and checked their own flags. Now each `show` names its owner's callback: the opening's `onContinue` (camera lessons, gathering, XP and level explanations) or the crafting tutorial's `continueTip` (`successNext`).
  - **Show me how:** the crafting tutorial keeps `helpShown`/`helpAction` (mining help, or the chapter's `onHelp` from `showChapterTip`) in place of the legacy button element.
- **Callers converted:**
  - `opening.js`: `showGatheringPrompt(tip, count)` and `showGatheringCompletion(tip, onPress)` now take the tip. Lesson, explanation and success cards reproduce the effective legacy state; the count and progress stay current.
  - `crafting-tutorial.js`: `tutorial()` and the overrides "A closer look" / "Got it!".
  - `tutorial-finale.js` (`api.tip.hide()`), Willowbank (`api.tipBox.hide()` ×9), Cinderhold `hideTip`, and the playground's gathering-prompt preview (`api.tip`).
  - The journal still moves the tip node into itself on phones (by id).
- **CSS:** `ui/hud/tip.css` on tokens (`--q-tip-*`): dark plum card, "TUTORIAL" eyebrow, title, 16px copy (14px inside the phone journal), cream buttons, green complete state, gold item names.
  - Removed internals from `style.css`/`ui-theme.css` (`.tutorial-heading`, `.progress-track`, `.tutorial-actions`, `#tutorial-*`, `.item-name`, the base card look). The main card rule now keeps only placement.
  - **Parity, flagged:** a later legacy rule hid the count and progress bar in every presentation, so the opening's counter and bar never showed. `tip.css` keeps them hidden; showing them would be a visible change. Ask before enabling.
- **Verification:**
  - 355 tests pass: `tip.test.js`, the crafting-tutorial tests (a real tip, via the same ids) and the opening test (a fake tip under the ids its assertions read).
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground: the rotate lesson shows the plum card with a disabled Continue; dragging the camera turns it green ("✓ Well done!", "Nice! You can look around.") and enables Continue.
  - **Still to check in the browser:** the XP and level explanations, the pickaxe Show me how, chapter tips with help, and the phone (in-journal) tip. The Browser pane was hidden mid-check, and hidden pages don't run, so these were not completed. The unit tests cover their logic.

### Dialogue boxes on the kit — 2026-10-08
- **Narrator** (`ui/hud/narrator.js`): `createNarrator()` (main.js, before the opening) builds and owns `#dialogue` (`#dialogue-line`, `#dialogue-controls`, `#dialogue-prompt`) from `h()`; `index.html` no longer has the static markup.
  - **API:** `show({text, speaker='???', presentation, input, prompt, size, next, controls})`, `setPrompt(on)`, `hide()`, and `visible` (a signal).
  - **Single input path:** click (ignoring buttons and inputs) or Enter/Space on the box calls the current line's `next`; input lines never advance from the box. Controls are built in their own scope and disposed with the line.
- **Callers converted:**
  - `opening.js`: color, name with dice and Enter, play style, confirmations. It keeps its reaction-gated `advance`.
  - `crafting-tutorial.js` `say`/hide and `tutorial-finale.js` `say`/prompt toggles keep their own pending-step variable, and the narrator calls a wrapper, so their cancel semantics are unchanged.
  - `companion-menu.js`: the rename confirmation is an input line; the capture-phase guard against other modules' listeners is gone.
  - `willowbank.js` hides through `api.narrator`; main.js ducks music on `narrator.visible`.
  - Nothing else writes to or listens on the box.
- **Character conversations** (`character-dialogue.js`): same API (`show`/`showPlayer`/`finish`/`hide`/`update`/`expressionFor`/`active`), now built with `h()`.
  - Signals hold the line, mode, side and enter/exit/choosing states; choices are a keyed list (one key per install).
  - The choice focus moves after the frame's flush.
  - The portrait renderer and model mirroring are unchanged.
- **CSS:** `ui/hud/dialogue.css` reproduces the effective look on tokens (new `--q-veil`, `--q-badge*`, `--q-dialogue-shadow`, `--q-choice-shadow`, `--q-font-display`).
  - Removed `dialogue-presentation.css`, the `#dialogue*`/`.speaker-*`/`.dialogue-speaker` rules in `style.css`, `ui-theme.css` and `willowbank.css`, and dead `.willow-modal`/`.willow-actions`/`.name-entry`/`.name-dice`/`.color-choice` rules, plus the dead `addNameDice`.
  - The body cutscene class is now `q-cutscene`.
  - `player-interface.css` still centres both boxes in the game viewport by id.
- **Verification:**
  - 353 tests pass: `narrator.test.js`, the opening test (a fake narrator building real controls) and the crafting-tutorial tests (a real narrator, clicking `#dialogue`).
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - color, then confirm, then a real click past the reaction, then the name typed with Enter, the play style, the fade, clearing lines via Enter, and the quests lesson tip and its narrator line;
    - Reed: portrait and right badge, then choices centred with the first focused, then the player's line on the left, then Reed's reply after the swap;
    - companion rename: the box ignores clicks, and Yes renames;
    - finale portal: the prompt hides during the pan back, then practice;
    - phone: the name step uses 44px controls, Reed's portrait is 230px, no overflow.
  - No console errors from the current build.

### Companions page rebuilt in the kit — 2026-10-08
- **New page:** `ui/pages/companions-page.js`, mounted by `companion-menu.js` as `#companions-panel`. It replaces the legacy list/detail (one entry, a Back button), its HTML strings, `render()` and `companion-menu.css`.
  - **Card:** the live 3D portrait, name, "Corgi", description, a follow status ("Following you" / "Resting where you left them"), plus **Rename** and **Follow me / Rest here**.
  - **Always available (user decision):** the Companions tab shows from the start, even in the clearing. Until a companion joins, the page reads "No companions yet." The ownership-driven `setAvailable`, `menu.unlock` and `companions.showMenuTab` (and Willowbank's call to it) are gone. A reset companion just returns to the empty state.
- **Source reactivity:** `createCompanionSystem` gained a `revision` signal bumped on every state change (owned, name, following); the page follows it. `renderMenu` is removed, along with Willowbank's call to it in `reset`.
- **Kept in the host:**
  - the Three.js portrait renderer (renders only while the page is visible, canvas size and camera aspect synced to its client size);
  - the rename flow: the kit name dialog, then the legacy narrator confirmation ("Is X the name you're going with?"), until dialogue moves to the kit.
  - Fixed a latent `tab.remove()` ReferenceError in `dispose`.
- **CSS:** removed `#companions-panel`/`.companion-content` and the now-unused `journal-entry`/`journal-back`/`journal-browser`/`journal-list`/`journal-detail`/`viewing-detail` rules (Companions was their last user). About 1.3 KB.
- **Verification:**
  - 350 tests pass, including `companions-page.test.js` (empty, owned, name and follow updates, Rename callback, host portrait shown).
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - empty state, then after acquiring: the portrait renders at 260×195 (520×390 backing at 2×);
    - Rest here set the world companion's `following` to false and the status followed;
    - Rename opened "Name your companion";
    - phone layout fits;
    - the Willowbank rescue checkpoint (area reset) works.
  - No console errors.

### Powers tab: Spells, Auras and Abilities — 2026-10-08
- **User decisions:**
  - One journal tab, **Powers**, with sub-tabs Spells | Auras | Abilities.
  - Unlearned powers: "a mix". A standard set shows locked with simple requirements; quest, scroll, tutor and secret powers stay hidden until learned.
  - The Combat page's Spells and Auras sections move, leaving a link.
- **New page:** `ui/pages/powers-page.js`, hosted by `powers-menu.js` (`#powers-panel`, tab `open-powers`, order 55, `spell` icon, under More on phones). `powersMenu.open(sub)` opens a given sub-tab, whose signal the host owns (remembered).
  - **Spells:** description and facts (power, cast time, range, Mana, "15 XP per cast, +1 per damage dealt", style), a quick-spell star, and **Allow auto use** (shown while Attack choice is Auto).
  - **Auras:** description, Ki per second, an **On** switch (through `assistance.toggleAuraManually`, a one-time override), a quick-toggle star, and **Allow auto use** (while Auras is Auto).
  - **Abilities:** description, Energy, style and strategy, plus **Queue**.
- **Visibility data:** `listed` and `unlock` on `SPELLS`, `AURAS` and `ABILITIES` entries.
  - Listed, not learned: a dashed card showing the `unlock` hint and requirements (e.g. "Requires Magic Technique 1", with "(you: n)" when below).
  - Not listed: hidden until learned.
  - All current powers are listed: Energy Strike (Wisp), Rush and Harden (Ember), Strong Strike (Sergeant Bristle). `SPELLS.energyStrike` gained a description.
- **Combat page:** Spells, Abilities and Auras are replaced by one compact **Powers** section: value "Quick: <spell> · n auras on", ability Queue rows, aura on/off switches and an "All spells, auras and abilities" link (`openPowers`). `.q-star` moved to `page.css`.
- **Tests:** a shared fixture `ui/pages/test-systems.js` (real styles and auras, a fake assistance and combat) serves the Combat and Powers page tests.
- **Playground:** Interface → "Powers (spells, auras, abilities)"; Training → Reset spells shows the locked state; Combat practice → quick-slot kit learns them all.
- **Verification:**
  - 349 tests pass, including `powers-page.test.js`: sub-tabs, locked listed entries with requirements and unlock hint, unlisted secret until learned, quick spell, aura on/off as an override, quick aura, Queue, permissions shown per policy, host-opened sub-tab.
  - `check:ui`, both builds and `check:debug-isolation` pass.
  - In the built playground:
    - after Reset spells, Energy Strike showed locked; after the quick-slot kit it was learned with a filled star;
    - Rush's On switch worked, and the Combat page's Powers section read "Quick: Energy Strike · 1 aura on"; its link opened Powers;
    - at 375px: no overflow, and card order is head, description, facts, controls.

### Settings page rebuilt in the kit — 2026-10-08 (UI rework pages complete)
- **New page:** `ui/pages/settings-page.js`: a "Sound" card with Music/Effects/Ambience sliders (the new kit `slider`, showing percentages) and a Mute all switch, plus a pointer to the Combat tab for modes.
- **One page in two hosts:** `settings-menu.js` (`createSettingsMenu({audio, modals})`) replaces `audio.js`'s `mountAudioControls`.
  - `journal.js` mounts `settings.page()` in `#settings-panel`.
  - `settingsUI.open()` shows it on the modal host (the splash gear button, playground Interface → Settings popup).
  - `settingsUI` is now created after the modal host in main.js.
- **Reactive at the source:** `createGameAudio`'s `settings` is a `reactiveRecord`. Sliders bind to it, so the journal copy, the popup, playground Reset audio and localStorage persistence all agree. The playground no longer pokes `[data-audio]` inputs.
- **Splash:** it inerts body children except kit modals (previously `#game-settings`), so the popup stays usable over the splash.
- **Removed:** the legacy `#game-settings` dialog, `.settings-heading`/`.settings-content` and `#settings-panel` CSS, plus dead `#audio-settings` rules (no element renders it). About 2.3 KB.
- **Verification:**
  - 344 tests pass, including `settings-page.test.js`: two copies agree, sliders and mute write through, unlock on slide, external reset shows.
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - journal Music 70% shows in the popup and saves to localStorage;
    - Mute all toggles and saves;
    - playground Reset audio updates the open popup;
    - the splash gear opens the popup above the splash (not inert) and its slider works;
    - at 375px the popup is fullscreen.
  - The preview's audio settings were reset to defaults afterwards.
- **UI rework status:** every journal page (Quests, Character with Attributes/Skills/Proficiencies, Inventory, Crafting, Combat, Settings, Equipment) and every utility dialog is on the kit.
  - Still legacy: the Companions page, dialogue boxes, tutorial tips, toasts (including the objective toast) and the dev model viewer.
  - Next per the user's plan: the Spells and Auras tabs.

### Quests page rebuilt in the kit — 2026-10-08
- **New page:** `ui/pages/quests-page.js`, mounted by `journal.js` as `#quests-panel`. It replaces `quests.js`'s `render()`/`createQuestPanel` (rebuilt the whole panel on every objective call), its HTML strings and about 1.3 KB of `#quests-panel`/`.quest-*` CSS. The `journal-entry`/`journal-back` styles stay because Companions still uses them.
  - **Quest lines:** title plus "n / m tasks" or Complete. The list is hidden when there's only one, since the detail title names it.
  - **Detail:** current tasks as cards (title, description, progress bar, count, "Show me how" when the area set help), then a collapsible **Completed (n)**. "Every task in this quest is complete." when nothing's left.
  - **Selection:** the chosen line defaults to the first with unfinished tasks.
  - **Phones:** the list, then the quest with "All quests". A single quest opens directly, so the tutorial's quests lesson lands on the task.
- **State stays in `quests.js`:** same `updateObjective`/`finishObjective`/`resetObjectives`/`setObjectiveHelp`/`registerQuestChapter` API, so areas and tutorials are unchanged.
  - New: a `questRevision` signal, `questChapters()` and `showObjectiveHelp(id)`.
  - The revision bumps only on real changes: unchanged re-sends (Cinderhold `sync()`) and replacing one help action with another don't.
  - The objective toast is still legacy; it moves with toasts.
- **Verification:**
  - 343 tests pass, including `quests-page.test.js`: shared state driving chapters and tasks, task nodes kept, completion, unfinished-first selection, help, the phone view switch, and no revision on unchanged re-sends.
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - clearing pickaxe checkpoint: one quest, no duplicate title, help shown;
    - Cinderhold smelt: "Show me how" walked the player to the furnace;
    - phone, Cinderhold ranged: two quest lines, Basic Training Complete with "Completed 13";
    - phone quests lesson: guided tab → task shown directly, close locked → continue → done.
  - No new console errors.

### Pacifist turns aggression off — 2026-10-08
- **User decisions:**
  - Attacks: Prevented also turns proximity aggression off for all enemies (one policy, never separate options) unless an enemy is configured `attacksPacifists`. That's rare: the most aggressive creatures and some bosses.
  - Switching to Pacifist doesn't calm enemies already aggressive (fighting or chasing); they keep it until leash, a safe tile or defeat.
  - Leaving Pacifist near an unaware enemy is allowed.
  - Pacifist-hunting creatures show a warning.
  - Bristle turns away a Pacifist "Yes! Teach me!".
- **Shared combat** (`combat.js`): the proximity check also requires `!api.passive?.() || a.attacksPacifists`. `passive` comes from `assistance.attacksPrevented` (a new getter on the Attacks policy, so Custom-with-prevented behaves the same). The existing `a.aggro` state carries ongoing aggression through mode switches.
- **Enemy config:** `attacksPacifists` comes from the enemy rules, overridable per placement (`createEnemyEntity({attacksPacifists})`). No enemy sets it yet. The hover label appends "⚠ Hunts pacifists".
- **Cinderhold:**
  - `bristleIntroduction` takes `pacifist()`, `turnedAway` and `returning`. A Pacifist "Yes! Teach me!" (or "I changed my mind, teach me!") gets three lines ("Wait a second! I can't teach a woo-woo do-gooder how to FIGHT." / "Go talk to the other tree huggers around here! They might talk nonsense with you!" / "Come back if you ever grow a SPINE, SLIME! DISMISSED!") and the conversation ends.
  - A tip follows: "Want to fight?" / "Change your combat mode if you wish to partake in some battle.", with Show me how and Dismiss.
  - "Show me how" opens the Combat page with the mode dropdown highlighted (`styleMenu.showModes()`, a `guide` signal cleared when a mode is chosen or the page closes).
  - `state.spurned` makes Bristle skip straight to his offer next time; `reset` clears it.
- **Combat page:** the Pacifist help now reads "You never attack, and most creatures leave you alone…".
- **Playground:** Combat practice → "Spawn pacifist-hunting enemies (3 tiles)", with a note on how to exercise the rules. Cinderhold "meet" checkpoint plus Pacifist mode exercises Bristle.
- **Verification:**
  - 340 tests pass:
    - production combat system: a Pacifist player is ignored by an aggressive bruiser in range, a hunter engages, and switching to Pacifist mid-fight keeps the enemy aggressive and attacking;
    - `attacksPrevented` follows Pacifist, Custom and the Attacks policy;
    - Bristle turns a Pacifist away (both "teach me" paths) and skips to his offer when returning.
  - `check:ui`, both builds and `check:debug-isolation` pass.
  - In the built playground:
    - aggressive goblins stood beside a Pacifist player without engaging;
    - pacifist hunters engaged, the player didn't retaliate, and the hover showed "⚠ Hunts pacifists";
    - in Simple, the Bruiser engaged; switching to Pacifist mid-fight kept it chasing and hitting (HP 100 → 54); after its aggression ended (reset), it stayed calm;
    - the Cinderhold meet checkpoint in Pacifist: Bristle's line, then the tip, and "Show me how" opened Combat with the mode dropdown highlighted.

### Opening asks for a play style — 2026-10-08
- **User request:** after the player names themselves, the narrator ("???") asks "Before we get too far, how would you like your experience to go?". There are three options with the user's copy (`PLAY_STYLES` in `ui/dialogs/mode-choice.js`):
  - "I'm a lover, not a fighter" → Pacifist (like Animal Crossing);
  - "I wanna fight stuff, but nothing complicated" → Simple (like Stardew Valley);
  - "I want to control every aspect of my game" → Expert (like RuneScape);
  - plus the "no pressure, swap any time, custom settings" note.
- **Component:** `modeChoice` is a radio group of label cards (Simple preselected; the chosen card expands its description and "You might like…" line) with a "Play as <Mode>" confirm. It uses radios rather than buttons because the legacy `#dialogue-controls button` styles override kit buttons by id.
- **Flow:** `opening.js` `chooseMode()` runs after the name is confirmed, mounts the choice into the dialogue controls (disposed on the next `show`), and calls the new `onModeChosen(mode)` option, which main.js routes to `assistance.setMode`. Then "Well, <name>, you're in for quite an adventure!" and the fade, as before.
- **Dialogue size:** input steps have a fixed 155px dialogue box, so the choice sets `data-size="tall"` (auto height up to the viewport, scrolling controls). The rule is in `dialogue-presentation.css`, and `show()` clears it.
- **Playground:** tutorial checkpoint **clearing:mode** ("Choose play style") routes through `customization()` like color and name.
- **Pacifist copy is now backed by gameplay:** see "Pacifist turns aggression off" above.
- **Verification:**
  - 337 tests pass: a `modeChoice` component test, and `opening.test.js` now picks Pacifist between naming and the adventure line and asserts `onModeChosen('pacifist')`.
  - `check:ui`, both builds and `check:debug-isolation` pass.
  - In the built playground:
    - desktop: the choice fits, choosing Pacifist expands its copy, and "Play as Pacifist" set the Combat page mode to Pacifist before continuing;
    - phone: the box grows to fit, with no horizontal overflow and the confirm button visible.

### Crafting page rebuilt in the kit — 2026-10-08
- **New page:** `ui/pages/crafting-page.js`, hosted in `game-menus.js`. It replaces the legacy recipe browser, its HTML strings and signature-diffing `refresh()`, and about 5 KB of `.recipe*`, `#crafting-panel` and `.ingredient*` CSS (`ui-theme.css`, `style.css`).
  - **Hand recipes first, then "At stations":** station recipes say "Made at a furnace / an anvil / a campfire" and their button reads "Make at …", disabled.
  - **Detail of the chosen recipe:** icon, time ("Time · N seconds", from the recipe skill's level), description, have/need ingredients and a craft button that sticks to the bottom of the scrolling journal page, so it stays clear of the phone tutorial tip.
  - **Layout:** a flex-wrap puts the detail beside the list when there's room and below it otherwise (choosing scrolls it into view). Phones show the list, then the detail with "All recipes".
  - **Shared styles:** recipe styles (`q-recipe`, `q-recipe-detail`, `q-ingredients`) moved from the station dialog to `page.css`, so both use them.
- **Stable ids for guides:** every recipe renders its detail (hidden unless chosen), keeping `choose-<id>`, `<id>-detail`, `<id>-duration` and `craft-<id>`. The tutorial's `guide()` and Willowbank's `guideElement` work unchanged.
  - The tutorial now reads `menus.selectedRecipe` instead of poking `#pickaxes-detail`, and dropped two no-op `hidden=false` writes.
  - The host owns the selection (`selectRecipe`, `events.selected`).
- **Reactivity at the source:**
  - `recipeCrafting.activeId` is a signal ("Crafting…" on the row and button).
  - Materials follow the reactive inventory, and times follow the reactive skill records.
  - A refused start says "Check the required materials and finish your current action first."
- **Removed `menus.refresh()`** and every caller: main (item changes, crystal restore, equipment `changed`, checkpoints, test armor, the playground API) and the crafting tutorial. This also ends `player-interface.js` calling it every 0.15s while the journal was open, the last polling behind the journal pages. `createGameMenus` takes `craftActive` instead of `craftState`/`craftBusy`.
- **Verification:**
  - 336 tests pass: `crafting-page.test.js` (ids, grouping, readiness and time following inventory and skill, Crafting… and reset, the phone view switch) and the menus test (reactive inventory, station button, refusal message, `selectRecipe`).
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - adding Sticks enabled Crude Fishing Rod; Craft showed Crafting… on the row and button, then made a rod, used 2 Sticks and reset the labels;
    - phone tutorial craft-menu → recipe: guided `craft-axes` visible above the tip → a real tap → craft-success with an axe;
    - the pickaxe help flow guides game menu → Crafting → `craft-pickaxes`;
    - Willowbank's hammer help opens Crafting with Crude Hammer chosen and its craft button guided.
  - No console errors from the current build.

### Character tab with Attributes / Skills / Proficiencies sub-tabs — 2026-10-08
- **User decision:** the Skills page did too much. After briefly trying three separate journal tabs, we settled on **one Character tab with sub-tabs**: it saves tab-bar space, and on phones all three views sit in the primary bar instead of two hiding under More.
- **Character tab** (`open-character`, order 20, primary, new `character` icon) replaces the Skills tab.
  - `ui/pages/character-page.js`: a slim core-level line (level, XP to the next level, progress bar) over the new kit `subTabs` control.
  - **Attributes:** points (accent while unspent) and + buttons.
  - **Skills:** non-combat skills, the 18 combat-style skills and the Light/Medium/Heavy Armor skills.
  - **Proficiencies:** weapon, armor-slot and element (`PROFICIENCY_GROUPS`); trained ones only, plus Unarmed, with an empty-state hint.
  - The lists share `skillsPage({skills, track, guidance, noun, empty})`. Without a character (isolated tests) only the two lists show.
- **Kit additions:**
  - `subTabs` in `controls.js`: `role=tablist`/`tab`/`tabpanel`, panels built once and kept (search and open rows survive switching), arrow keys, an optional badge.
  - Panel entries may set `badge` (a signal). `panelTabs` draws an `<i class="q-badge">` dot; an `<i>` rather than a span, since legacy bar CSS hides spans in icon-only layouts.
  - The Character tab and the Attributes sub-tab badge while points are unspent.
- **Navigation:** the sub-tab signal lives in `game-menus.js`, so the page remembers the last sub-tab. `menus.openSkills()` opens Character on Skills. `showSkills` (playground) and the journal's free-play fallback use Character.
- **Tutorial:**
  - The skills lesson now says "Open the Character menu to see your skills."
  - It guides `open-character`; `journalTutorialActions('skills-menu')` maps to `#open-character`.
  - The lesson opens the Skills sub-tab with Gathering highlighted and open; the sub-tabs are locked during it.
- **Verification:**
  - 333 tests pass, including sub-tab switching, aria wiring, arrow-key wrap, host-driven selection, the badge following points, the no-character mode, menus routing proficiencies, and the lock-rule mapping.
  - Both builds, `check:ui` and `check:debug-isolation` pass.
  - In the built playground:
    - the docked bar has a single Character tab with a badge dot at 3 unspent points, and the dot clears after spending;
    - a sub-tab choice is remembered across tab switches;
    - phone bar: Character · Inventory · Crafting · Combat · More;
    - the phone tutorial skills-toggle → menu → detail → summary → inventory-intro, with Gathering in view.
  - No console errors.

### Skills page rebuilt in the kit — 2026-10-08
- **New page:** `ui/pages/skills-page.js`, hosted in `game-menus.js` (`trackSkills` option). It replaces the legacy signature-checked `renderSkills`/`renderCharacter`, the HTML strings and about 2.5 KB of `.skill-entry`, `#character-summary` and `.attribute-list` CSS.
  - **Core level card:** level, core XP, a progress bar and XP to the next level, plus a collapsible **Attributes** section ("N unspent points", open while points wait) with + buttons through `character.allocate`.
  - **Search:** hides rows rather than removing them, so open state survives.
  - **One `<details>` per skill** (`data-skill` kept): icon, name, "Lv N" and a progress bar; opening shows total XP, progress toward the next level and XP remaining.
  - **New kit control:** `progressBar` in `controls.js` (`role=progressbar`, the fill scales with `transform`).
- **Reactivity at the source:**
  - `createGatheringSkill()` now returns a `reactiveRecord`, so every non-combat skill (Gathering, Crafting, Lumberjack, Mining, Fishing, Carpentry, Culinary, Smithing) notifies on any write, including resets and dev `Object.assign`.
  - Combat tracks and core level follow `character.revision`.
  - The set of skills follows `systemsReady` (renamed from `itemSystems`) for systems created after the menus, plus `character.revision` for newly trained proficiencies.
- **Tutorial:** `setSkillGuidance({locked, focus})` still drives the close lock. Focus opens and highlights the skill once (`data-guide`) and keeps Attributes collapsed so the lesson's skill is in view on phones.
- **Verification:**
  - 330 tests pass: `skills-page.test.js` on the real character and skill records, and the crafting tutorial's skills tests rewritten for the page.
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - all 27 skills list, including late systems;
    - a dev XP grant updates Fishing in place while it stays open;
    - granting Dagger levels adds its row, and core XP updates;
    - spending a point updates the count and attribute, and Constitution raised max health to 101;
    - phone tutorial checkpoint Skills menu → Gathering highlighted, open and in view with the close button locked → continue → the inventory introduction.
  - No console errors.

### Inventory page rebuilt in the kit — 2026-10-08
- **New page:** `ui/pages/inventory-page.js`, hosted by `inventory-menu.js` (`createInventoryMenu({host, inventory, actions, settings, isEquipped, track, onSelect})`). It replaces the legacy signature-diffing `refresh`, the HTML strings, the rAF tutorial overlay and about 6 KB of `#inventory-panel` CSS in `ui-theme.css` / `player-interface.css`.
  - **Search:** filters the stacks.
  - **Stack grid** in catalogue order: icon, name, ×count, and an Equipped badge.
  - **Detail of the chosen item** (the first stack until you choose): quantity, description, actions as buttons and per-item permissions as switches.
  - **Layout:** a flex-wrap puts the detail beside the stacks when there's room (expanded journal) and below them otherwise (docked); choosing scrolls the detail into view. Phones show the stacks, then the detail with "Back to items".
- **Reactivity:**
  - The reactive inventory, plus `items.track()` in main.js. `track` reads `equipment.revision`, `assistance.revision` and an `itemSystems` signal that turns true once food, campfires, equipment and assistance exist, since they're created after the menus.
  - The food permission's `checked` is now a function.
- **Action contract** (`actions(id)` → `[{label, disabled, run}]`): `disabled` covers only state the page can follow; a busy refusal is `run() === false`, and the page then says "Finish what you're doing first."
  - Food `Eat`, equipment and campfire `Place` dropped `busy()` from `disabled`.
  - Campfire `begin` returns false when busy.
  - Food readiness is a `computed`, so the menu doesn't recompute every frame during the cooldown.
- **Tutorial compatibility:** stacks keep `data-item` (the journal tutorial lock and the crafting tutorial's playground skip). `inventoryMenu.guide(true)` resets the view (`inventoryView().reset`) and highlights Sticks with `data-guide`. `lock` drives the journal close lock.
- **Verification:**
  - 326 tests pass. `inventory-page.test.js` (it replaces `inventory-menu.test.js`) covers reactive stacks, the same row node on count changes, catalogue order, actions with a busy refusal, permissions, the equip badge and label through `track`, search, the phone view switch and guidance.
  - `check:ui` passes; legacy debt fell and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - expanded desktop is side by side; docked, choosing Top Hat scrolls its detail into view;
    - Equip sets the badge and the Unequip label;
    - Allow auto eating toggles; Eat goes through the full-health confirm, the count drops, and Eat is disabled during the cooldown, then re-enabled;
    - campfire Place starts placement;
    - at 375px: no overflow and 44px controls;
    - tutorial checkpoints Inventory stacks → Select Sticks (highlighted, other stacks locked, close disabled) → a real tap → Item details → Got it → done.
  - No console errors.

### Modal host for utility dialogs — 2026-10-08
- **New kit module:** `src/ui/modal.js`.
  - `createModalHost()` (one instance in main.js, `modals`) owns every utility dialog. `open({id, title, size, flush, required, onClose, build})` builds the content in its own scope inside the shared `<dialog class="q-modal">` frame (title, close button, Escape), and closing disposes the scope and removes the dialog.
  - Sizes: `sheet` and `wide`, which go edge-to-edge on phones with safe-area padding, and `compact`, which stays a centered card.
  - Opening an open id replaces it. `closeAll(reason)` skips `required` dialogs, so an attack on a phone no longer force-closes required companion naming.
  - `confirmModal` is the shared short confirmation; AGENTS.md now points to it instead of `compact-confirm`.
- **Moved onto it** (contents in `src/ui/dialogs/`):
  - **Cooking, furnace and anvil:** `station-dialog.js`. Ingredients and "Materials ready" follow the reactive inventory. An unreachable station explains why on Make. Phones show the list, then the detail.
  - **Destinations:** `destination-dialog.js`. `createDestinationMenu`'s per-frame `update()` still closes it when the crystal becomes unusable.
  - **Companion naming:** `name-dialog.js`, with the dice built in and Enter to submit. The "Is X the name…" confirmation still uses the legacy dialogue box.
  - **Food at full health:** `confirmModal`.
  - The wrappers (`createCookingMenu`, `createDestinationMenu`, `companionMenu.editName`) keep their APIs, so callers and tutorials are unchanged.
- **Shared page styles:** primitives (`q-button`, `q-field`, `q-card`, `q-tile`, `q-list`…) moved from `combat-page.css` to `src/ui/page.css`. Added `q-button--quiet`.
- **Removed:** `cooking-menu.css`, `utility-menu.css`, the `.companion-modal` and `.food-confirm` styles, and the `compact-confirm` rules. The legacy phone `body dialog` rule now skips `.q-modal`.
- **Still legacy `<dialog>`s:** the Settings popup (`audio.js`; moves with the Settings page) and the dev model viewer.
- **Playground:** Interface → Open now closes other dialogs first. Added "Eat at full health (confirm)". Cooking, Furnace, Anvil, Destinations and Companion naming open the real dialogs; Training → Use furnace/anvil exercises the real stations.
- **Verification:**
  - 322 tests pass, including host tests (bindings disposed on close, Escape and close button, required, replace, closeAll, confirm) and dialog tests on the real recipe catalogue and reactive inventory.
  - `check:ui` passes; legacy debt fell in cooking-menu, destination-menu, companion-menu and main, and the baseline was updated. Both builds and `check:debug-isolation` pass.
  - In the built playground:
    - the anvil preview (desktop, 624×520) and destinations render;
    - the food confirm is a compact 360px card with focus on "Eat anyway", and eating proceeds;
    - companion naming is fullscreen at 375px with the input focused; the dice, Confirm, then Yes renames;
    - cooking on a phone switches from list to detail, and Escape closes and removes the dialog;
    - Training → Use furnace walks to the real furnace and opens it; Make smelts an ingot (+20 Smithing XP).
  - No console errors.
- **Not browser-checked:** a required name dialog under a real repeated Escape. Unit-tested: a browser-made close reopens it.

### Combat modes: Simple, Pacifist, Expert, Custom — 2026-10-08
- **User design** (COMBAT.md → Modes, policies and overrides is the source of truth):
  - Four modes, picked from a dropdown on the Combat page. Each policy is **Auto | Manual**; "Manual" mode was renamed **Expert** to avoid a clash.
  - Editing any policy from a preset copies that preset plus the change into **Custom** and switches to it, with a tip. Switching modes never alters Custom.
  - The Pacifist checkbox is gone; Pacifist is now a mode (`attacks: 'prevented'`, Manual abilities, Auto defensive/utility auras).
- **Quick settings never change the mode:**
  - Retaliate Smart / Always / Never. Each preset applies its default: Simple → Smart, Pacifist → Never, Expert → Always. Hidden while attacks are prevented.
  - Class is shown while Attack choice is Auto.
  - Training goal is shown while Strategy is Auto.
- **Per-item permissions are not part of a mode:** `permissions.food/spell/aura` via `setPermission` / `allowed`. They replace `foodExclusions` / `spellExclusions`, and auras now have an Allow auto use switch too.
- **One-time overrides:**
  - Acting on an Auto policy (strategy, attack, an aura) lasts until the fight ends, or through the next fight if made outside combat.
  - The Combat page shows "Your choice for this fight", an "Always choose my …" chip (sets that policy to Manual → Custom) and **Return to Auto** (`returnToAuto()` clears all).
  - Three consecutive fights with the same override earn a one-time tip through the warning chip.
- **API:** `setMode`, `setPolicy`, `setRetaliate`, `setPermission`, `allowed`, `returnToAuto()`. Removed: `setControl`, `setPacifist`, `setAdvanced`, `modeLabel`. Energy/Ki visibility now reads `policies.showEnergy/showKi`.
- **Playground:** use the real Combat page; the status line shows the mode and retaliate setting.
- **Verification:**
  - 312 tests pass, including Custom capture/memory, preset retaliate defaults, overrides ending with the fight, the tip and aura permissions.
  - Both builds pass, along with `check:ui` and `check:debug-isolation`.
  - In the built playground:
    - each mode shows the right quick settings and HUD columns (Expert 5, others 3);
    - editing a setting from Simple switches to Custom with the tip, and Custom remembers it;
    - an override shows the note, and Return to Auto clears it;
    - Pacifist with aggressive enemies never starts a fight.
  - At 375px: no horizontal scroll and no console errors.
- **Superseded:** the "Simple mode" and "Per-item Simple permissions" entries below describe the earlier Simple | Manual control and exclusion lists.

### Equipment page rebuilt in the kit — 2026-10-08
- **User's sequencing:** finish the remaining UI work (Equipment, a shared modal host for the pop-up dialogs, then Inventory, Skills, Crafting, Quests and Settings), then build the Spells and Auras tabs on that base to test it.
- **New page:** `ui/pages/equipment-page.js` replaces `renderGear`, its 0.15s refresh and the legacy `#equipment-panel` button CSS.
  - **Worn:** a slot-tile grid (Main hand, Off hand, Head, plus armor slots once armor is owned).
  - **Your gear:** a row per owned item with `gearFacts` (Power, Accuracy, Resistance, attack time, range, two-handed or either hand), an equipped highlight, and the equipment system's own `inventoryActions`.
  - **Refusals:** a refused change (busy) shows "Finish what you're doing before changing equipment" rather than a stale disabled state.
  - **Phones:** the buttons wrap below the text on narrow rows.
  - **Reactivity:** follows `equipment.revision` and the reactive inventory.
- **Verification:**
  - 308 tests pass, including page tests on the real equipment system: equip, either-hand dagger, losing a copy, and a busy refusal.
  - In the built playground: real gear equips into the slots on desktop, and at 375px there is no horizontal scroll and every button is at least 40px.
  - No console errors.

### Required before the tutorial is complete: mode-aware "I don't want to fight" (user request, 2026-10-08; not started)
In Cinderhold, when the player tells Bristle "Actually, no. I don't want to fight.", the unknown narrator ("???") currently gives one fixed speech about Threat Levels (`bristleIntroduction` in `cinderhold-dialogue.js`). Rework it to respond to the player's combat mode (`assistance.attacksPrevented` / `settings.mode`):
- **Already Pacifist:** say that most creatures won't bother them now, BUT there are some very dangerous ones that will. These are the `attacksPacifists` creatures, which show "⚠ Hunts pacifists" on hover.
- **Not Pacifist (Simple, Expert or Custom with attacks allowed):** suggest Pacifist and offer to switch to it right there, through the shared `assistance.setMode('pacifist')`, never a separate flag.
  - If they accept, continue with the Pacifist version above.
  - If they decline, talk about Threat Levels (today's speech).
- **Rules:** keep it area narrative calling shared gameplay (AGENTS.md). Cover each branch in `cinderhold-dialogue.test.js` and in the playground (Cinderhold "refused"/"meet" checkpoints with each mode).

### Per-item Simple permissions — 2026-10-08
- **User decision:** settings lists don't scale to dozens of foods or spells, so permissions now live on the items. The old "Never auto-use X" checkboxes in Simple settings are gone.
- **Food:** the inventory detail shows **Allow auto eating** (default on).
  - `createInventoryMenu` takes a generic `settingsFor(id)` returning `[{label, checked, onChange}]`, passed through as `createGameMenus({itemSettings})`.
  - `itemSettings` in main.js supplies the food entry, backed by `assistance` `foodExclusions`.
- **Spells:** each Combat page spell row has an **Allow Simple to cast** switch beside the quick-spell star (Simple mode only), backed by `spellExclusions`.
- **Unchanged:** the exclusion data and Simple's decision logic. Excluding one item leaves the rest eligible; "Auto-eat before a one-hit defeat" is the master switch.
- **Docs:** COMBAT.md → Minimal setup → Per-item permissions.

### Simple mode — 2026-10-08
- **Rename:** the player-facing "Auto" mode is now **Simple**. The internal control is still `auto`, so the rules, tests and assistance API are unchanged.
- **Combat page wording:**
  - "Simple | Manual";
  - "Chosen for you: …";
  - "X is your choice · Let Simple choose" chips;
  - a "Simple settings" section.
- **Simple hides Energy and Ki** (user decision): the meters and their quick buttons (Strong Strike, quick auras) disappear, and the vitals row shrinks to three columns . The advanced settings `showEnergy` ("Show Energy and Quick Ability") and `showKi` ("Show Ki and Quick Auras"), both off by default and first in Simple settings, show each pair independently; the row uses `data-columns` (3–5), and Ki takes column 4 when Energy is hidden. Manual always shows them. Documented in COMBAT.md → Minimal setup.
- **Verification:**
  - 304 tests pass.
  - In the built playground: Simple shows only Health, Mana and Stamina (156px row); the setting and Manual both restore all five (264px); returning to Simple hides them again.
  - On a phone the row shows 3 × 44px with no horizontal scroll.
  - No console errors.

### Combat page rebuilt in the kit — 2026-10-08
- **New page:** `ui/pages/combat-page.js` replaces the long legacy page of text buttons. `combat-style-menu.js` is now a 12-line host that mounts it and registers the panel. Layout follows COMBAT.md's "minimal setup, advanced when wanted".
- **Always visible:**
  - an Auto | Manual segmented control and a Pacifist switch, with one line of mode help;
  - an attack summary card (weapon or spell, damage, speed, hand and damage type, trained skill), with a backfire warning when relevant and "Auto chose…" in Auto.
- **Auto only:** Class (segmented), training goal, Optimize equipment and its report, plus "X is manual · Return to Auto" chips.
- **Manual only:** an Auto-Retaliate switch, "Attack with" (Weapon or learned spells), hands and per-hand damage type.
- **Collapsible sections** whose headers show the current value:
  - Strategy: a grid of six tiles;
  - Spells: the star sets the quick spell; replaces the old Quick slots section;
  - Abilities: Queue;
  - Auras: on/off switch and a quick-toggle star;
  - Auto settings: Auto only.
  - Sections without learned content are hidden.
- **New kit controls** (`ui/controls.js`): `segmented`, `toggleSwitch`, `section`, `row`. `h()` now sets `selected` as a property.
- **Reactive, no polling:** `equipment`, `character` and `assistance` gained `revision` signals. The old `styleMenu.refresh()` calls (the player-interface tick and assistance's `changed`) are gone.
- **Legacy cleanup:** the old `#combat-panel` CSS in `ui-theme.css` and `player-interface.css` is removed; only the journal page container rule remains. Legacy debt in `combat-style-menu.js` went to zero, and the baseline is updated.
- **Verification:**
  - 304 tests pass, including new page tests on the real styles and auras.
  - In the built playground, against the real systems:
    - aura switch → HUD Ki button;
    - manual chips appear and return to Auto;
    - strategy updates its header;
    - Manual shows Weapon / Energy Strike plus hands, and selecting a spell updates the card.
  - Layout:
    - desktop sidebar and expanded journal;
    - 375px full-screen sheet with no horizontal scroll and touch-sized controls.
  - No console errors.

### Combat HUD, part 3: warning chip and player effect icons — 2026-10-08
- **The always-on `#player-combat-status` line is gone**, along with its 0.15s polling and the "In combat · Auto · Balanced" mode label (mode is on the Combat page).
- **Warning chip** (`ui/hud/warning-chip.js`):
  - Announces when Auto's advice changes (now a signal in `assistance.js`), e.g. "Use caution." or "Fleeing is highly recommended!".
  - Also announces "Under attack!", but only when an attack starts (no hit in the last 10s), not on every hit.
  - Fades after 3s, clears 300ms later (also under reduced motion) and is hidden, taking no space, while idle.
  - Continuing advice doesn't re-show it; persistent danger is the skull or triangle on the enemy plate.
- **Player control effects** (stunned, immobilized, slowed, immune) appear as icons to the right of the player's health bar, which also shows while an effect is active.
- **Verification:**
  - 301 tests pass, including a chip test using mock timers.
  - In the built playground, a 50% slow showed the hourglass beside the player's bar outside combat.
  - In a Bruiser fight: "Use caution." on engage, "Under attack!" on the first hit, then the chip faded and stayed hidden through continued hits.
  - No console errors.
- **The combat HUD is done.** Next candidates: rebuild the Combat page in the kit, put utility `<dialog>`s on a shared modal host, and polish hit-splat and plate overlap.

### Fix: unarmed block no longer drops the fists — 2026-10-08
- **Bug** (reported by the user): after an unarmed block, the hands dropped to the sides and then slid back up into the boxing guard for the next punch.
- **Cause:** `blockAnimation` always eased back to the relaxed carry pose (`equipmentIdleHands`). Unarmed fighters rest in `PUNCH_GUARD` between punches, so the block ended at the sides and the pose blender then crossfaded up into the guard.
- **Fix:** the bare-hands block now settles into `PUNCH_GUARD`. Weapon, shield and bow blocks still return to the carry pose they attack from. The model viewer uses the same function.
- **Tests:** the bare-hands block ends exactly in the guard, the fists never sink below guard height during the block, and the next windup starts from the same position. 300 tests pass.
- **Verified** in a live unarmed Bruiser fight in the built playground: over 611 frames, including 104 while blocking, the lowest hand height was the guard height (0.40), both overall and right after each block.

### Bar-only plates and the opening attack — 2026-10-08
- **Plates are bars only**, at the user's request: no name, numbers or effect text.
  - Enemy bar 48×5px; player bar 44×4px.
  - **Danger symbol** left of the enemy bar (`DANGER_BANDS`): an orange triangle with "!" for caution, and a red skull for flee or imminent. Nothing shows while the fight is manageable.
  - **Effect icons** right of the bar, from the new `control.kinds`: stunned, immobilized, slowed, immune.
  - The enemy's hover label now carries the name and exact health (`Fight Goblin Bruiser · 82/100 HP`).
- **Opening attack** (user decision, written into COMBAT.md → Opening attack):
  - A ready attacker (no strike within its interval) opens after `OPENING_WINDUP` = 0.5s instead of the full 2.5s. The clock skips to the end of the windup, so the swing animation plays in full.
  - It applies to player melee (weapon or unarmed) and to aggressive enemies once in reach. Bows and spells keep their full draw and cast time (the user specified both).
  - Readiness needs a full interval without a strike, so stepping away and re-engaging gains nothing.
  - `createCombatSystem({openingWindup:null})` pins the old full-windup timing for tests that check other mechanics; dedicated tests cover the opening.
- **Verification:**
  - 299 tests pass.
  - In the built playground, the first melee hit on a Bruiser landed 516ms after engaging.
  - The caution triangle showed, and the skull appeared at 15 HP.
  - No console errors.
- **Known polish item:** hit splats can briefly overlap the bars; refine sizing and placement as the HUD settles.

### Combat HUD, part 2: health plates over combatants — 2026-10-08
- **Health plates** (`ui/hud/health-plate.js`) replace the old `.enemy-health` text label.
  - **Enemy plate (the target frame):** name, `hp/max`, a bar and current control effects, plus a danger stripe from the shared `DANGER_BANDS`: orange for caution, red for flee or imminent. The band comes from Auto's assessment via combat's `api.danger`.
  - **When shown:** over the engaged enemy and any enemy attacking the player.
  - **Width:** sized to the name, from 72px up to 140px.
- **Player plate:** a slim 44px bar just above the slime, shown in combat and whenever health is below full. This is my reading of the user's answer ("in combat AND while health is not at maximum") as either condition; it's unconfirmed, so ask the user before changing it.
- **How it updates:**
  - Enemy `a.hp` is now an accessor over a signal, so combat code is unchanged and the bar writes only when HP changes.
  - Position is a per-frame transform written by `combat.js` (enemies) and `updatePlayerPlate()` in main.js (player); the plate skips moves under 0.05px.
- **Layout fix:** floating XP text now starts 1.35 units above the player (was 1.05), above the player's bar, so the plates no longer collide with it.
- **Verification:**
  - 295 tests pass, including new plate tests.
  - In the built playground, Scrapper and Bruiser fights showed both plates following hits (Bruiser 100 → 88 → 82, player bar 100% → 81%), the caution stripe and no overlap between plates.
  - No console errors.
- **Next (part 3):** effect badges for the player and a transient warning chip, replacing the always-on `#player-combat-status` line. Then rebuild the Combat page.

### Combat HUD, part 1: quick slots and the ability row — 2026-10-08
- **The user's direction:** screen space is at a premium. Fold combat UI into existing slots: the action row becomes the ability bar, the target frame lives on the floating enemy label (combatants need health bars anyway), and effect badges and warnings appear only while relevant.
- **New gameplay, specified in docs/COMBAT.md → Quick slots:**
  - **Quick spell** (`styles.setQuickSpell`, `combat.queueSpell`): one cast in the shared pending slot. It attaches to the next attack, or opens the next fight if pressed outside combat, using the spell's own cost, range, backfire and XP; then the selected attack resumes. The newest manual request replaces the pending one, pressing again withdraws it, an unaffordable cast is cancelled with a reason, and eating clears it. A queued spell sets the attack range (`attackRange()` in main.js), so a fight can open from casting distance.
  - **Targets:** buffs and heals target the player; damage and debuff spells target the enemy. Only enemy spells exist; self-targeted resolution is **deferred to the first buff or heal spell (tracked)**.
  - **Quick auras** (`auras.setQuick`, `auras.toggleQuick`, `quickState`): if any quick aura is on, all turn off; otherwise each turns on in order, paying its fee, and shortfalls are reported. Every change goes through `assistance.toggleAuraManually`, so those auras become manual. Both quick settings last only for the session (there is no save system yet).
- **Combat page:** a Quick slots section, available in both Auto and Manual, for choosing the quick spell and quick auras.
- **HUD action row** (kit; `ui/hud/action-button.js`, `ui/hud/quick-actions.js`):
  - **Slots:** Eat (with a count badge), quick spell (replacing the disabled "Quick restore"), Sprint, Strong Strike, and quick auras (badge shows how many are on). The old Auras button opened the whole Combat page; this one toggles directly.
  - **States on the tile:** on, queued (breathing ring), partial and unavailable. Unavailable buttons stay pressable so they can explain why. Unconfigured slots open the Combat page.
  - **No polling.** It is driven by source signals:
    - `reactiveRecord` inventory in main.js (a proxy, so existing mutations notify);
    - signal-backed sprint, eating and consumable cooldown;
    - `revision` signals on combat, auras and styles;
    - combat's `inCombatState`.
  - The old per-tick button code and its CSS are gone (player-interface property handlers 6 → 2).
- **Playground:** Assistance → "Set up quick slots" learns the kit and Energy Strike and sets both quick slots. "Forget abilities, auras & spells" clears them.
- **Verification:**
  - 293 tests pass, including new quick spell, quick aura, reactive-record and action-row tests.
  - In the built playground:
    - all five slot states;
    - the quick-aura toggle (fees, badge, partial);
    - queue and withdraw, and a fight opened with Energy Strike (Mana 100 → 96 at release);
    - Combat page quick-slot editing reaching the HUD immediately.
  - No console errors.
- **Next (part 2):** the target frame and player health bar on world labels (the player's bar shows in combat and whenever health is below full; read as either condition, so confirm with the user), then effect badges and the warning chip replacing the status line.

### UI rework: panel registry and host — 2026-10-07
- **The `menus.panels` host** (`src/ui/panels.js`) now owns which journal page is open, whether the tab bar is open or pinned, tab availability, Quests' return-to behaviour, close locks and dismiss rules. Every page registers once:
  - Quests and Settings (`journal.js`)
  - Skills, Inventory and Crafting (`game-menus.js`)
  - Combat (`combat-style-menu.js`, tab id `open-combat-styles`)
  - Equipment (`player-interface.js`)
  - Companions (`companion-menu.js`; unavailable until owned)
  - the playground's Debug launcher (`api.registerTab`)
- **Tabs are built from the registry** (`src/ui/panel-tabs.js`): the desktop `#game-menu-bar`, the phone bar and the More sheet. This replaced the 0.15s `refreshNav` HTML cloning, `partitionMobileTabs` (now a `primary` flag) and the ordering via `data-journal-last`.
- **Removed:**
  - the duplicated panel-id lists in `closeMenus`, `journal.js` (`suspendedPanels`, `activeClose`, `sync`) and the policy;
  - the journal's MutationObserver `sync()`;
  - all direct page `hidden` writes from other modules.
- **The journal shell** is built with `h()` and follows the host reactively: visibility, `has-page`, title, the close lock, toggle `aria-expanded`, and the docked desktop's pinned tabs and auto-open of the last page.
- **The tutorial uses the host API:**
  - `panels.setAvailable`, `showNav` and `toggleNav`, and `isOpen` / `navShown` for reads;
  - a new read-only `stageState` signal;
  - the lock exposes `lockedState` and now owns the DOM observer the journal used to have.
- **Willowbank** unlocks tabs through `api.showTabs`. `openInterface`, `openCrafting` and `openSettings` call `panels.select`.
- **Behaviour is preserved:** docked desktop close/Escape keep the page, the journal button opens the last page in free play, and Quests returns to the page it replaced (or closes the journal). Tab order is unchanged (Quests, Skills, Inventory, Crafting, Combat, Settings, Companions, Equipment, Debug).
- **Tests:**
  - `crafting-tutorial.test.js` now runs on linkedom with the real `index.html`, replacing the hand-made fake DOM.
  - New host/tab tests, plus a keyed-list trailing-node test.
  - 285 tests pass.
  - Legacy debt fell (journal innerHTML 6 → 0, handlers 5 → 0; game-menus handlers 11 → 5; player-interface innerHTML 11 → 5); the baseline is updated.
- **Verified in the built playground:**
  - docked desktop: every tab, the HUD Auras → Combat shortcut, Quests return, the docked close rules and the Debug launcher;
  - phone: primary tabs, the More sheet, Escape, ×, journal close and the toggle reopening the last page;
  - the Quests, Skills, Inventory and Crafting lessons by real clicks from checkpoints, with locks and guides;
  - the desktop guided pickaxe flow and Willowbank tab unlocks.
  - No console errors.
- **Next:**
  - move utility `<dialog>`s onto a shared modal host;
  - rebuild page contents in the kit, starting with Combat and Equipment, then the combat HUD (ability bar, target frame, effects).

### UI rework foundation — 2026-10-07
- The user chose a plain-JS rebuild of the UI (no framework for now), an open visual direction (sleek and modern, rounded-square "slime" gauges, OSRS gameplay but not its look), and a foundation-first rollout with strict standards. Rules and migration status: `docs/UI.md`. Gate: `npm run check:ui`.
- **Kit:**
  - `src/reactive.js` re-exports `@preact/signals-core` (a new runtime dependency, about 1.5 KB).
  - `src/ui/` contains `dom.js`, `scope.js`, `list.js`, `viewport.js`, `icon.js`, `tokens.css` and `ui.css`.
  - Tests run on linkedom, a new dev dependency.
- **Signal-backed resources:** `createResource` (health and all four pools) stores `value` and `max` in signals; its API is unchanged. `main.js` runs each frame inside `batch`, so UI bindings flush once per frame.
- **Resource meters** (`ui/hud/meter.js`) replace `resource-orb.js` (deleted) and the old orb CSS. They update only when the displayed whole number or the maximum changes, and are no longer polled.
  - **Current design, in review: a low-poly bevelled tile** (mockup option B). The user called it "close, not perfect."
    - Geometry derives from one `BEVEL` width in `meter.js` (3.5 of 52 units, thinned at the user's request). The well extends 1 unit under the bevel and is clipped to the tile's outline. That prevents a flickering light seam at the bevel's anti-aliased inner edge while the level animates, and stops square well corners showing past the chamfers.
    - Look: a chamfered square whose 8 bevel faces are flat-shaded by angle to an upper-left light, in a plum frame. The well is dark. The essence is two-tone, split on the diagonal into lit and shaded faces, with a flat lit surface line, a highlight shard, a soft dark rim and the number inside.
    - Colors are pastel (`--q-health` and the others in `tokens.css`), at the user's request.
    - Nothing animates while idle. A level change slides the well's window over counter-transformed contents (transform only, 350 ms). Everything else is static SVG.
  - **Rejected along the way:**
    - flat circle-style fills;
    - SVG "jelly" waves (jagged clip, and a layout every frame);
    - a dimensional glass "essence" orb with always-rising smoke. It looked good, but the user moved to flat shading to match the game, and the constant animation raised browser CPU about 15 points in every perf scenario (perf run, 2026-10-07).
  - The last perf run measured the essence version: `willowbank-river` passed (the layout issue was fixed), `cinderhold-combat` still fails on its old baseline (unrelated), and `menus` gave a CPU WARN from the smoke. The low-poly version (with the thinner bevel) measured clean: 8/9 PASS, clearing-idle CPU 31%. The only failure is the old `cinderhold-combat` baseline; see the PERFORMANCE ledger.
  - Playground coverage: the Player health → Resource set/reset controls exercise the levels, tones and the full/empty states.
- `player-interface.js` and `journal.js` use the shared breakpoint (`compactQuery()`) instead of their own `matchMedia` calls.
- **Ratchet:** `scripts/ui-standards-baseline.json` records legacy debt (innerHTML, property handlers, `!important`). Counts may only fall.
- **Next foundation step:** a panel registry and host to replace the duplicated id lists in `game-menus.js`, `journal.js` and `player-interface-policy.js`, and to unify journal pages with utility dialogs.

### XP base 15 and until-level XP modifiers — 2026-10-07

- `XP_BASE` is now **15** (was 50; user decision), with `XP_PER_HP = 1`. Level-100 pace at starting damage is about 3.2 h unarmed, 2.4 h dagger and 3.1 h Energy Strike, within the few-hours goal.
- **Until-level XP modifiers:** `cappedAward` adds `afterCapMultiplier`. The entity `xpMultiplier` applies below `xpLevelCap`, then `xpAfterCapMultiplier` (default 0). An award crossing the threshold is split: boosted up to the threshold, the rest at the after rate. `xpModifiers(rules)` feeds every award site (attacks, defensive XP, backfire).
  - Practice targets are unchanged (0.5× then 0×).
  - **Cinderhold's creatures** (Scrappers and Bruiser, not targets) use 1.5× until level 3, then 1×. This is area configuration passed through the new `xp` option on `createEnemyEntity`. It restores a level-up during the melee lesson: about 585 XP over the Scrapper and Bruiser fights at base 15.
- COMBAT.md: formulas and examples updated to base 15 (3 HP → 18; 10-damage hit → 25 Shield/armor XP; 9-damage armor slot pool 24 → 8 each; 8 HP healed → 23; backfire base 15). The entity XP modifier section now describes the until-level rule with both examples. CINDERHOLD.md notes the creature boost. Tests compare against `XP_BASE` and cover the boost, the after-cap rate and the threshold split (264 pass).
- Verified in the built playground: a clearing fixture Scrapper gives 1× (2 damage → +17, 12 → +27); Cinderhold's recruit-yard Scrapper gives 1.5× (5 → +30, 22 → +56, 2 → +26; 111 XP to Melee Power and Unarmed).

### Damage-based XP scaled to our health — 2026-10-07

- Health and damage are 10× the source design's scale, so its +10 XP per HP made combat XP ~10× too fast. `actionXp` is now `XP_BASE + XP_PER_HP × amount` with `XP_BASE = 50`, `XP_PER_HP = 1` (user decision). It applies to every damage/healing-based award: attack strategy, weapon and elemental proficiency, Shield on hits and blocks, armor pools, backfire base XP (unchanged at 50) and future healing.
- COMBAT.md: all 11 formulas and the worked examples are recomputed (3 HP removed → 53; 10-damage hit → 60 Shield/armor XP; armor slot pool 60 → 20 each; 8 HP healed → 58), with a note explaining the coefficient. Level-100 pace at starting damage is now about 74 min unarmed, 65 min dagger and 80 min Energy Strike (was 36/22/30). That is still a bit fast for the few-hours goal; tune after playtesting.
- Tests updated to the new coefficient (264 pass). Earlier handoff entries quote XP numbers from before this change.

### Smooth motion transitions — 2026-10-07

- **Pose blender** (`src/pose-blend.js`): a shared crossfade used by gameplay and the model viewer. When the active motion's key changes, it blends hands and body pose from the last shown pose to the new motion over `duration` (default 0.22s, smoothstep).
  - Keys come from `motionKey(kind, profile)`: attack motion + striking hand, block style, or the action kind (punch ↔ stab, left ↔ right, attack ↔ block, eating → attacking…).
  - Interrupted blends restart from the partially blended pose. `instant` snaps (used for Archery, so the bow string stays exact).
  - Gameplay resets it when no action is active (idle ↔ action keeps the existing hand smoothing). The viewer snaps when you pick a different animation and blends changes within one.
  - To tune or reuse: `createPoseBlender({duration})`, then `update(key, motion, dt, {instant})`.
- **Unarmed block:** a boxing high guard. Fists move to x ±0.11 (from ±0.22), stay at face height (y 0.57) and come forward to z 0.50, clear of the body. The wrists are tilted and angled slightly inward, nearly touching. A test checks the gap, position and symmetry. In gameplay, blocks reach the guard with about a 0.015 gap between fists.
- **Casting animation:** `castMotion` (`src/combat-motion.js`) replaces the single push.
  - **Gather:** hands start wide (x ±0.40) and converge on a point in front of the chest while circling it like rolling an orb, more intensely as they close in.
  - **Pull back:** the last 0.45s draws them toward the body with a slight backward lean.
  - **Toss:** the final 0.15s drives them forward to z 0.86 with the body leaning into the throw.
  - **Follow-through:** eases back out wide (`CAST_TIMING`).
  - **Energy orb** (`src/cast-presentation.js`, gameplay and model viewer): the magic projectile model sits between the hands, grows with the motion's `charge` and disappears at release, when the real projectile launches.
  - Tests cover the phases, charge, symmetry and continuity across two cycles (no frame-to-frame jumps), plus the orb. Checked in the built viewer. Feel/tuning is for user review.
  - Follow-up: the hands sit further from the body (gather z 0.46→0.66, toss z 0.98); a test keeps them clear of the body for the whole cast.
  - Follow-up 2: `castMotion` also returns `orbScale` and `instability`. During the gather the orb surges wildly (about 0.6–1.45, two out-of-step sine surges) while the hands circle. As the hands close, it settles small and steady (0.60, instability 0) through pull-back and toss. Instability also drives the look's shimmer (`animate(group, time, intensity)`). Circling now peaks mid-gather and fades to zero at its end, so the hands arrive level before the pull-back. Tests cover the swing size, settling, stability and level hands.
  - **Changeable spell looks** (`src/spell-visuals.js`): one registry supplies each look's `charge` orb, `projectile` and optional per-frame `animate`. A spell picks its look by `visual`, else its first element, else energy. The cast orb (swaps per spell), the flying magic projectile and the model catalogue (one entry per look) all read it. Only Energy exists today; it is light yellow (`#fff1a0`) for both the cast orb and projectile, and as the default look it is also what the model viewer's magic preview shows. To add water/fire, add a registry entry; COMBAT.md "Spell visuals" records the direction (water blue with drips; fire red/orange/yellow with a bit of smoke). Tested with a temporary look.
- **Follow-through ownership:** combat commits the next attack at release, so the 0.28s recovery used to be drawn with the *next* attack's motion and hand. Combat now shows the released attack through its recovery, then the next one.
- Verification: 259 tests (blend timing, interruption, instant, reset, motion keys, and the recovery profile in an alternating dagger + fist fight). In the built playground, alternating dagger stab and off-hand punch against a target over 564 frames gave a largest per-frame hand step of 0.079, the speed of the strikes themselves, with no transition jumps.

### Skilling core XP and model viewer layout — 2026-10-07

- **Boxing punch:** `punchMotion` now starts from a symmetrical "dukes up" guard (`PUNCH_GUARD`: fists at x ±0.24, y 0.40, z 0.50, clear of the 0.72 body and in front of the chin).
  - The striking fist loads slightly back, drives forward and inward (+0.46 z) to impact, and the body twists into it.
  - The guard fist tucks back (−0.14 z) and slightly outward, then both return exactly to guard.
  - The punch builds its own guard-hand pull-back and twist, so it no longer stacks the generic stab/slash counterweight. Hand arrays always have six values.
  - Because the guard is symmetrical, the off-hand mirror is an exact left jab. Tests cover the symmetry, load/strike/pull-back/return, and finite six-value poses; the existing counterweight test still passes.
  - Checked in the built model viewer from the front and side. Feel/tuning is for user review.

- **Bug: non-combat skills gave no core XP.** Only combat tracks used `character.award`; Gathering, Lumberjack, Mining, Fishing, Crafting, Culinary and Smithing used the prototype `awardSkillXp`, and Carpentry added XP inline, so none reached the core conversion. All non-combat awards now go through one shared `addSkillXp` (Carpentry included). It reports to `character.convertProgression`, which uses the same 5:1 conversion and shared remainder as combat; core level-ups from skilling show the usual banner and grant points. The Skills caption and COMBAT.md now say non-combat XP counts. A test covers the shared remainder between skilling and combat. In the built playground, one real copper ore gave 20 Mining XP and 4 core XP.
- **Model viewer layout:** Combat style moved into the controls row, left of Attack motion. Like Attack motion, it shows only for the slime's Attack animation (the only preview it affects). The loadout is now three columns: Main hand over Main hand damage, Off hand over Off hand damage, and Attack hands alone. Positions were verified in the built viewer.

### HUD single row and whole-number player splats — 2026-10-07

- **Model viewer Attack hands:** the slime loadout gains an **Attack hands** select (Automatic, Main only, Off only, Alternate).
  - The preview equips its loadout on a real `createEquipment` instance, so eligibility, defaults and fallbacks are the gameplay rules.
  - Alternate switches hands each preview cycle, after the 0.28s follow-through, so each swing keeps its own hand.
  - The loadout note states what actually applies, including when a choice is unavailable (e.g. Off hand only with a shield).
  - Tests cover alternation timing, fallbacks, bare-hand alternation, a lone off-hand dagger and spells. Verified in the built viewer.
- **Model viewer damage types:** **Main hand damage** and **Off hand damage** selects appear only when that hand's weapon supports more than one type (Copper Dagger: Piercing/Slashing). They use the production `setDamageType`, so unsupported choices and weapon swaps fall back to the weapon default exactly as in gameplay. Automatic attack motion follows the striking hand's type (Slashing slashes, Piercing stabs). Tests and the built viewer cover dual daggers with mixed types, single-type weapons, fists, shields and fallbacks.

- **Playground sections:** the new fieldsets sat loose at the top of the panel because `playground-layout.js` only files fieldsets whose legends it lists. They now live in a collapsible **Character & abilities** section (character & combat profile) and in **Combat** (assistance, dual wield, armor, control & backfire). Any future unlisted fieldset falls into a collapsible **More** section instead of escaping. The control-test picker uses the shared label-plus-action row. Verified in the built playground: nothing loose, the sections start collapsed, and the controls still run.

- **Resource HUD:** all five orbs share one row, each with its action directly beneath (Eat, Restore, Sprint, Strong Strike, Auras).
  - Desktop sidebar: 5 × 48px. The collapsed floating HUD widens from 274px to 300px.
  - Phones: 44px orbs and actions with 4px gaps (236px) beside a 113px minimap during play, and the same single row above full-screen pages. The earlier two-row and phone-page special rules are removed.
  - Verified at desktop (sidebar and collapsed) and 375px (gameplay and Skills page); no overflow.
- **Fractional player hit splats.** Health is fractional internally (passive regeneration), but player splats showed `health before − health after`, so a lethal hit at 5.947837… HP printed the raw fraction. Player splats (enemy hits, backfire, Willowbank's scripted injury) now use `displayedLoss`: the drop in displayed (rounded-up) health. This equals the whole hit damage for every non-lethal hit and, for a lethal hit, exactly the health the orb showed (never a larger overkill number). This matches enemy splats, which already show HP actually removed.
- Verification: 252 tests (new displayed-loss unit and lethal-hit integration tests), both builds and debug isolation. A live lethal Bruiser hit from fractional health showed a whole "7!": regeneration had raised health just past 6, so the orb showed 7. A built-preview launch config (`playground-built`, port 4174) avoids the dev server's CSS watch issue during checks.

### Fixes: vanishing hands, Auto abilities — 2026-10-07

- **Hands vanished permanently after unarmed combat.** Off-hand mirroring read a sixth pose value that punch poses don't have, producing `NaN`. Hand smoothing then carried the `NaN` forever. Unarmed defaults to alternating, so the first off-hand punch triggered it. Fixed the mirror (missing rotations count as 0). The main-loop hand smoothing now treats invalid targets as 0 and snaps back from non-finite transforms, so no single bad pose can stick. A regression test checks every attack motion from both hands for finite values.
- **Auto now uses abilities when available** (user decision, recorded in COMBAT.md). During a fight, Auto queues learned abilities when the attack is eligible, Energy suffices, nothing is pending or committed, and the training goal allows it. Requests go through the same pending slot; Auto-queued requests are marked so manual requests keep priority. Auto-eat yields only to manual requests. Pressing an Auto-queued ability adopts it as manual, and a second press withdraws it.
- Verification: 250 tests (new Auto-ability and pending-slot priority tests), both builds and debug isolation. A bounded browser check on the playground server ran an unarmed Auto fight against a Bruiser: off-hand punches in 44 of 103 samples, zero non-finite hand transforms, a mirrored punch pose, and Auto spending 50 Energy on Strong Strike (Melee Power XP) then re-queuing as Energy recovered. Inspection state now includes the player's hand transforms. No performance run: the fixes add no per-frame cost beyond a finite-check on two hands.

### Assistance, dual wield, backfire, armor, control effects and Ember — 2026-10-07

- **Assistance** (`assistance.js`; Combat page rebuilt in `combat-style-menu.js`):
  - **Mode and setup:** Manual/Auto with Pacifist in both. Defaults are Auto · Balanced · Melee · no training goal.
  - **What Auto reads:** actual enemy stats (user decision). Danger bands use the final max hit after player defenses, and the warning shows in the HUD status line.
  - **Retaliation:** Adaptive retaliation is withheld at 1–3 hits unless the player deliberately clicked that enemy. That override clears at the 5s combat exit. Manual uses Auto-Retaliate. Pacifist refuses manual and automatic attacks ("Cannot attack while in pacifist mode.") and stops the unreleased windup.
  - **Auto choices:** strategy follows the training goal, otherwise as listed under "Needs review". Spells never use one with backfire risk unless allowed. Auto-eat triggers at ≤150% of the max hit, respects exclusions and manual-queue priority (unless emergency priority is enabled), and warns "Warning! Recommend fleeing!" when nothing is eligible. Auto auras follow the COMBAT.md rules (25% floor, recovery threshold, grace). Manual changes to strategy, spell or an aura stick until **Return to Auto**.
  - **Optimize Equipment:** ranks DPS → reduction → current gear and fills armor slots; it also runs on a Class change. Advanced settings hold auto-eat, emergency priority, risky spells, food/spell exclusions, aura recovery % and grace.
  - Settings are session-scoped like other preferences; Full test area resets them.
- **Dual wield:**
  - Copper Dagger is off-hand eligible; Stone Sword is not. Equipment offers main/off actions and respects owned copies. Shield hands and two-handed hands are never free fists.
  - Attack hands: Main/Off/Alternate. The default is the weapon hand, or Alternate for two weapons or two fists. One sequential timer alternates only on release, keeps the pending hand through cancellation, and resets after the 5s exit.
  - Each hand has its own damage type (dagger Piercing → stab, Slashing → slash). Off-hand strikes mirror the animation. The off-hand dagger has its own left-hand model in gameplay and the model viewer.
- **Spell backfire:** resolved at release after costs, using the unclamped requirement ratio. It hits only the caster: 50% of the normal max, against magic, armor, shield and Harden resistance, with no dodge, block or crit. It never aggroes the target, grants base XP only under the target's rules, and can defeat. The Combat summary shows the chance, the damage and a lethal warning. Energy Strike (level 1) never backfires; a playground override raises its requirement.
- **Armor:** shared slots (head = helm, chest, hands, legs, feet, back, ward). Each piece has its own armor-skill effectiveness (10% floor). Slot proficiency adds +0.02 resistance and +0.0001pp block per level. Connected hits award armor XP: the skill pool splits by class, the slot pool splits equally. Blocks give none. Only playground test pieces exist (`src/dev/test-armor.js`, excluded from normal builds).
- **Control effects** (`control-effects.js`): one shared state for the player and every enemy.
  - Stun blocks movement, attacks and casting; immobilize blocks movement only. They share movement protection.
  - Slows apply the strongest one (90% cap) with per-effect timers and a refresh-or-fail setting. Cleanse keeps the longer protection window.
  - A stun cancels the player's windup and pending action but keeps the target, then restarts with a fresh windup. The current step finishes, but no new step starts.
  - Enemies freeze, stop attacking, and walk slower. The HUD status and enemy labels show effects and immunity. Only playground test sources exist.
- **Ember (draft Ki mentor)** in the Cinderhold forge corner teaches Rush and Harden in the optional "Steady Breath" quest (see CINDERHOLD.md). It has a checkpoint, a landmark and a model-viewer entry.
- **Needs review** (provisional where COMBAT.md is open):
  - Auto strategy: highest expected damage per second, or Defensive at ≤6 hits when no goal is set.
  - A second press withdraws a queued ability; movement does not clear an unassigned one.
  - Redistribute refunds points to spend with + in Skills.
  - Optimize treats magic setups as equal on damage per second (spells ignore weapons).
  - Ember's name, look and placement.
- Verification: 247 tests (new `combat-systems.test.js` covers control, dual wield, backfire, armor and assistance), both builds and debug isolation. Test armor is absent from the normal bundle. Bounded browser checks:
  - Auto/Manual/Pacifist and Optimize (dagger+shield).
  - Two-dagger alternation training Dagger proficiency against a Scrapper.
  - Auto Bruiser fight from 45 HP: flee warning, Strong→Defensive strategy, auto-eat once.
  - Player stun+slow HUD and an enemy stun label; duplicate effects rejected.
  - Backfire risk shown at 90.25%.
  - Ember's full lesson (rush → stack → recover → done).
  - 375px Combat page with no overflow; no console errors.
  - Fixed during checks: unreadable Optimize/Auto-Retaliate buttons (cream on cream), and selected states looking identical to unselected.
  - Not done: a full tutorial replay; enemy dodge/crit content (none exists).
- Tooling note: the dev server sometimes misses CSS edits made from the shell; restart the preview server after shell-edited stylesheets.
- Performance: full dev-gpu suite, 8/9 PASS (0.53–2.67 ms/frame, 59.5–59.8 fps). `cinderhold-combat` now fails on draws 605, objects 2171 and visible meshes 458. The extra ~233 objects are Ember's slime rig (one more mentor in the map), on top of the earlier extra visible goblin. Every scene has +5 objects for the hidden off-hand dagger model. Frame time is unchanged. This is deliberate content, not a regression; the baseline (still from before these slices) needs a full `--update-baseline` run.

### Abilities, auras, Energy/Ki and crystal services — 2026-10-07

- **Energy and Ki** pools follow Tenacity/Aura and regenerate under the shared rules (Ki only while every aura is off). The HUD shows all five orbs: a second row has Energy with a Strong Strike button and Ki with an Auras shortcut. On phones with a page open, the five orbs share one row.
- **Strong Strike**: `combat.js` has one shared pending-action slot.
  - Queue from the HUD or Combat menu. The ability attaches when the next eligible melee windup begins; pressing again before then withdraws it.
  - It spends 50 Energy at impact. If Energy drops below 50 before impact, the windup and ability are cancelled (no cost, no XP).
  - It rejects ranged/spell attacks and insufficient Energy with one notice, and never repeats.
  - It uses Strong strategy (22–44 at starting stats; its −2 Speed makes it a 2.55s swing) and trains Melee Power.
  - Bristle teaches it in the `return` step; later checkpoints grant it.
- **Auras** (`auras.js`): Rush (+10% movement, additive with sprint and Celerity's +0.2%/point) and Harden (+10 resistance points per incoming portion). Each has a 0.5 Ki activation fee and 0.5 Ki/s upkeep, stacking. At zero Ki every aura turns off with a notice. Toggled in Combat. The mentor is deferred (user decision), so auras are learnable only in the playground. Auto aura management belongs to the assistance slice.
- **Food** now consumes and heals at initiation, with one shared 2s manual-consumable cooldown. An accepted meal cancels the unreleased windup and clears the pending action; attacks restart with a full windup, which may replace the eating animation. The "done" feedback fires when the animation ends; the narrative `foodEaten` fires at initiation.
- **Iter Crystal services** in the shared destination menu, outside combat (5s buffer):
  - **Restore** refills all five pools and keeps active auras.
  - **Redistribute attribute points** returns every invested point to the unspent pool, to reassign with + in Skills; it turns auras off and refills.
  - Both are preview-only without a real crystal. No cost yet (none designed).
- Playground: **Character & combat profile** adds learn/forget for the combat kit, Queue Strong Strike, and pending/cooldown/aura readouts. Player health resources include Energy and Ki (up to 5000) for exhaustion tests.
- Verification: 233 tests (new aura, respec, Strong Strike, Harden and food tests), both builds and debug isolation. Bounded hardware-browser checks:
  - Clearing: Strong Strike 34 damage → Melee Power XP, 50 Energy spent, then normal attacks; Rush+Harden on in Combat (1 Ki fee, visible drain); eating mid-Bruiser fight +20 at once with the fight kept.
  - Cinderhold: a real crystal's Restore (auras kept, Health 110 at Constitution 11) and Redistribute (2 points refunded, auras off); Bristle's `return` dialogue teaching Strong Strike and advancing to `bruiser`.
  - Desktop and 375px HUD layouts (a phone overlap with the taller HUD was found and fixed); no console errors.
  - Not checked: the full tutorial replay.
- Still open per COMBAT.md: Ki mentor; unassigned-ability edge cases (repeat presses withdraw for now); attack-hand selection/dual wield; spell backfire; armor; stuns; Manual/Auto assistance and Pacifist (next slice).
- Performance: full dev-gpu suite, 8/9 PASS (59.4–59.9 fps, 0.57–2.5 ms/frame). `cinderhold-combat` shows the same draws difference as the previous slice (584 vs 538.6, one more goblin visible); counters are otherwise unchanged (mutations ~123/s, layouts ~9/s). The baseline is still not updated.

### Player progression and formula-driven combat — 2026-10-07

- `character.js`: shared character with documented attribute bases (capacity 10, others 1), 3 creation points, 18 combat skills, Light/Medium/Heavy Armor, weapon/armor-slot/elemental proficiencies, and core XP (one /5 conversion per action with carried remainder; 3 points per core level). All tracks use the adopted curve. Session-only, like the other skills.
- `combat-profile.js` derives each committed attack (bounds, interval, crit, XP tracks, Mana cost, requirement effectiveness) and player defenses (dodge, block, resistance) from the character. `combat.js` uses it everywhere:
  - Player attacks: no miss; crit from Luck; per-portion resistance.
  - Enemy attacks: 1% miss → dodge → block → damage → resistance; Scrapper protection kept.
  - XP per resolved attack: strategy skill + weapon proficiency, or elemental proficiency for spells. Shield XP on connected or blocked hits, using a hypothetical roll on blocks. Entity multiplier and cap are applied per track. The old Combat-XP-on-win and the single Combat skill are gone.
- Items now carry bonuses: Stone Sword +6/+6, Copper Dagger +10/+10, Training Bow +10/+10 at range 6, Wooden Shield +30, Copper Shield +50 resistance. The old Stone Sword/Wooden Shield values were chosen by the user. Practice targets: 50 HP, 0.5 XP below level 3. Cooked Pondfish heals 20.
- Spark is replaced by **Energy Strike** (4 Mana, 3s base cast, 6 tiles, Energy proficiency). Unaffordable casts pause with the target kept and show one notice, then resume. Wisp's lines and the training fixture use it; the quest title "First Spark" is kept as flavor.
- Regeneration: Health, Mana and Stamina regenerate (scaled by attributes; slower in combat and for 5s after). Stamina pauses only while actively sprinting. Maxima follow Constitution/Mentis/Endurance without refilling. Resource orbs write the DOM only when the rounded-up number changes.
- UI:
  - **Skills** shows core level, attributes with 44px **+** buttons, and all combat skills. Proficiencies appear once trained; Unarmed always.
  - **Combat** adds the six strategies with their XP destination and a live summary of the attack the next windup would commit.
  - Hit splats now distinguish Miss!/Dodged!/Blocked! and orange criticals.
- Playground: the Skills select covers every track via the real award path. New **Character & combat profile** controls set attributes, grant points, print the committed attack and defenses, and reset the character. Full test area resets the character. Combat/training notes updated.
- Not yet implemented, each tracked in COMBAT.md:
  - Attack-hand selection, dual wielding and per-hand damage-type choice
  - Strong Strike, Energy, Ki and auras, and the Energy/Ki orbs
  - Food at initiation with the shared 2s cooldown
  - Spell backfire (no current spell can backfire)
  - Armor items and armor XP; Athletics and sprint efficiency
  - Iter Crystal Restore/respec
  - The 5-meal/50-arrow tutorial top-ups
  - Manual/Auto assistance and Pacifist
- Verification: 225 tests (new character tests), normal and debug builds, and debug isolation. Bounded hardware-browser checks:
  - Clearing: Constitution allocation (max 110, no refill) and an unarmed Scrapper fight (2.5s cadence, 1–10 incoming, per-attack XP, level-ups at 562, core 1,220/5 = 244).
  - Combat menu summaries (Accurate Energy Strike 6–20 every 3s) and Energy Strike vs a target (5 casts, 20 Mana, 375 half-XP each to Magic Accuracy/Energy).
  - Cinderhold: portable fixture attack and XP.
  - 375px Skills layout.
  - Not checked: the Wisp dialogue path and a full tutorial replay.
- Performance: full dev-gpu suite, 8/9 PASS. `cinderhold-combat` FAILs on draws (+8.4%) because one more goblin is visible (longer fights), not a per-object regression; frame time 2.7–2.8 ms at 59.5+ fps. Per-attack XP labels and hit splats now use one composited transform write per frame (mutations ~229 → ~123/s, layouts ~56 → ~9/s). The baseline is **not** updated; see the PERFORMANCE ledger. Run `npm run perf -- --update-baseline --note "…"` (full suite) to accept it.

### Shared combat formulas and enemy stat sheets — 2026-10-07

- `combat-formulas.js` implements the settled COMBAT.md math as pure functions: damage bounds, Strong Strike, chances, the attack resolution order, per-portion resistance, infusion shares, action timing, requirement effectiveness, backfire, Mana cost, XP curve/caps/pool splits/core conversion, resource maxima/regeneration/display, sprint drain, movement slows, character-sheet attack/resistance/dodge/critical bonuses, Threat and danger bands. Ten tests in `combat-formulas.test.js` reproduce the documented worked examples.
- `combat-rules.js` now holds the Scrapper/Bruiser stat sheets. Their health, damage bounds, interval and Threat are derived through the shared formulas, not literals. Gameplay change: Bruiser attacks every 2.5s (was 2s). Existing combat tests now step 2.5s for Bruiser hits.
- Still prototype: player offense (unarmed 1–3 etc.), the 15% enemy miss, flat shield mitigation, the single Combat skill and the 4-HP practice target. These convert together in the player-progression slice so balance doesn't break midway. The new miss, capability and resistance data is stored but not yet used by the runtime.
- Playground Combat practice: **Show enemy stat sheets** prints production-derived values and flags which ones aren't live yet; an **Enemy stat sheets** table lists every configured input. `.claude/launch.json` adds a `playground` preview configuration.
- Verification: 218 tests, normal and debug builds, and debug isolation passed. A bounded hardware-browser check in the clearing confirmed the derived sheet text and table, and Bruiser hits landing exactly 2.50s apart. With the aggressive fixture, Scrapper and Bruiser now share the 2.5s cadence, so simultaneous hits can appear as one health change. Cinderhold was not checked in the browser; it uses the same `ENEMIES` definitions. No performance run (no rendering or per-frame changes).

### Combat design consolidation — 2026-10-07

- Design-only update: COMBAT.md holds the settled formulas and assistance rules; production remains the prototype described below. DESIGN.md now references the redesign defaults and action semantics.
- First-rollout assistance defaults to Auto / Balanced / Melee / no training goal. Pacifist is available in Manual and Auto and blocks manual and automatic attacks; switching into it cancels unreleased windups. Danger bands: 1 hit (run), 2–3 (flee, retaliation withheld), 4–6 (caution, retaliates), 7+ (no warning).
- Auto deliberately uses actual enemy data for all of its decisions, so no unknown-damage estimate or discovery system is needed. The deferred bestiary is player-facing only.
- Decided 2026-10-07: Optimize ranks gear by damage per second, then incoming-damage reduction, then current gear. Simple Auto aura rules. Auto-heal triggers earlier for slow heals and warns when a heal is insufficient. Style changes map the training goal to the same skill in the new style. Combat preferences persist. The HUD shows all five resource orbs. XP coefficients ship as-is. Threat wording must caveat that it assumes appropriate gear. Cinderhold Basic Training is optional (its refusal branch already allows leaving).
- The unsourced tutorial simulation figures were removed from COMBAT.md; tutorial balance must be validated in-game. Remaining open items are listed at the end of COMBAT.md; none blocks the shared formula/progression module.
- Verification: documentation consistency review and `git diff --check`; no runtime, browser, build or performance checks for this documentation-only change.

### Enemy tuning and pending combat redesign — 2026-10-06

- Shared Goblin Scrapper now has 50 HP and max hit 10; Goblin Bruiser has 100 HP and max hit 20. Minimum hits (1/3), intervals (2.5s/2s), aggression and Scrapper protection are unchanged. Practice targets remain inert at 4 HP.
- Playground combat fixtures use these production definitions; their instructions show the new numbers. Verified fixture spawn/reset in the clearing and production Cinderhold enemies, maximum damage-roll bounds, 208 tests, both builds and debug isolation. No performance suite run.
- The user supplied an older turn-based design as a basis for a real-time combat redesign. Replacement mechanics are awaiting user decisions; do not implement its formulas, XP model, attributes, resource costs, skill curve or recipe changes as settled requirements. Player damage/food have not been rebalanced for the tougher enemies yet.

### Sidebar toggle during dialogue — 2026-10-06

- The desktop collapse/expand tab is mounted directly under body, with its own layer above the dialogue dimmer. It keeps its sidebar-edge/floating placement without raising other gameplay controls above the overlay.
- Existing playground dialogue checkpoints cover this fix; UI practice notes now describe repeated toggling. Bounded hardware-browser checks passed real collapse/expand clicks in Cinderhold and Willowbank, unchanged dialogue lines, viewport recentering and mobile toggle hiding. Both builds and debug isolation passed; no performance suite run.

### Bristle branching introduction — 2026-10-06

- `cinderhold-dialogue.js` owns the revised narrative: slime/backtalk banter, converging first responses, optional training, unseen `???` Threat Level explanation, and persistent refusal/reconsideration. Refusal is area story state, reset with training progress; shared combat is unchanged.
- Shared character dialogue supports explicit player lines and speakers without portraits. Choices still speak through the existing shared response path, exactly once. Existing distraught/concerned expressions cover upset/confused and uneasy.
- Playground arrival/meet/refused checkpoints replay each entry point without tutorial prerequisites. Meet/refused immediately open the conversation; the sarge landmark supports normal repeat interaction.
- Verification: 208 unit tests, normal/debug builds and debug isolation. A bounded hardware-browser check passed arrival, both opening branches, player-spoken choices, unseen narrator, refusal, normal world re-interaction, reconsideration and reset, with no runtime errors; its browser/server were closed. No performance suite was run for this narrative/UI change.

### Interactive minimap and player resources — 2026-10-06

- Shared health, mana and stamina start at 100. `player-resources.js` owns resource pools and sprint timing; rendering was `resource-orb.js` at the time (since replaced by the kit meter, `src/ui/hud/meter.js`, with `resourceTone` from `player-resources.js`), with white/orange/red number thresholds (>50%, 25–50%, <25%). Mana costs, quick restore and passive regeneration are not implemented.
- The boot toggles double-speed movement, spending one stamina per 0.5 seconds of movement. Idle time does not drain it; exhaustion disables sprint and smoothly resumes walking. Partial drain time survives toggles. Full playground reset restores resources and disables sprint.
- `minimap-controls.js` supports wheel/pinch zoom, keyboard +/- zoom and click/tap movement through the existing shared pathfinder. The minimap marks the current route destination, including an edge indicator outside the view. Clicking uses the displayed map center; pinch/drag does not issue movement.
- Playground Inventory & skills exposes individual resource values and restore/reset controls. The shared `minimap-sprint` performance scenario exercises movement, zoom and sprint.
- Verified: 205 unit tests, normal/debug builds and debug isolation. Bounded hardware-browser checks exercised desktop/mobile movement, destination clearing, approximately 2x sprint speed, exhaustion, exact color boundaries, wheel/pinch behavior, travel and reset without runtime errors. No full tutorial replay was performed.
- Performance: all nine GPU scenarios PASS (~59.5–59.9 FPS). Focused low-perf menus and minimap-sprint PASS; clearing-walk has a timing WARN (-11.9% versus baseline), with no FAILs or baseline changes. See the performance ledger for reports. These measurements precede minor map hit-coordinate/edge-marker polish.
- Performance checks are VERY slow: AGENTS.md and the performance guide now explicitly require sparse milestone runs, never a run after every edit. Existing measurements cover minor follow-up polish.

### Performance testing harness — 2026-10-05

- Added `perf/` (Playwright, dev-only) with `npm run perf`, `perf:full`, `perf:ab` and `perf:baseline`; docs in `docs/PERFORMANCE.md`.
  - Environments: dev-gpu, low-perf, mobile-emu, webkit, plus ci (counters only, planned for GitHub Actions).
  - Eight scenarios are shared with the playground (`src/dev/perf-scenarios.js`).
  - The playground-only probe (`src/dev/perf-probe.js`) times loop phases, GPU time and scene census; the main-loop laps compile away in normal builds.
- The playground **Performance** section prepares scenarios, toggles a HUD and logs a census.
- `scripts/profile-ui.mjs` was folded into the runner and removed.
- `check:debug-isolation` now also asserts no perf probe in normal builds, no Playwright harness in either build, and Playwright as a devDependency only.
- The first perf run's mutation counter found enemy health labels rewriting `hidden` for every enemy every frame (~360 DOM mutations/s while idle). `combat.js` now writes label visibility and text only on change (~4/s). The label was rechecked during real recruit-yard combat: it tracks HP and hides after defeat.
- First data:
  - low-perf clearing-idle misses its 58 fps target (~17 fps, fill-rate bound under SwiftShader). This is the top backlog item.
  - mobile-emu combat holds ~59 fps against a 30 fps target.
  - Travel round trips show no leaks.
  - An A/A check sets the noise floor; see the PERFORMANCE doc.

### 3D render/scene CPU pass — 2026-10-05

- Inactive areas are detached from the scene graph by `area-runtime.js` (not just hidden), so three.js no longer updates ~4,000 off-screen matrices every frame. Activation re-attaches and refreshes world matrices before use.
- `terrain-batch.js` is now the shared static terrain path for the clearing, Willowbank, Cinderhold and the splash garden. `preserve` keeps live-editable materials (the playground grass picker's grass materials) as their own merged meshes; other solid colors are vertex-baked; seams merge per material. `decorate` merges static per-tile dressing (flowers). Ray hits still resolve logical tiles through `terrainHitData`.
- Water bodies render one merged surface, one glint layer and one merged static bed/pebble/shoreline layer. Per-tile animated surfaces and water boxes remain as invisible pick proxies. The 131 always-drawn hidden water box faces in Willowbank are gone. Each water body shares one side material, and colors re-apply only when `waterSettings.color` changes.
- Hover picking happens immediately after pointer movement and otherwise at 10 Hz. It uses the cached game viewport rect and writes tooltip/cursor DOM only when picking. The companion portrait resizes only when its canvas size changes. Companion/goblin rigs cache named-part lookups (`named-parts.js`). Music gain is scheduled only when its target changes. Several per-frame `Vector3` allocations and unchanged idle/progress DOM writes were removed.
- Measured idle in the playground, GPU-backed (M1 Max, same session), main-thread rAF time per frame:
  - clearing: ~4.6 → ~1.3–2.0 ms; WebGL draws ~957 → ~180 per frame;
  - Willowbank: ~3.1 ms (after the area detach) → ~1.9 ms, ~300 draws;
  - Cinderhold: ~2.0 ms;
  - scene objects in the clearing: 5,291 → 419.
- Checks: 198 tests; both builds and debug isolation; click-to-move in all three areas; repeated travel; grass picker on batched terrain; splash garden; normal-build splash/intro smoke check; no runtime errors.
- Not done (optional follow-ups):
  - shadow map still refreshes every frame, now cheap with merged casters;
  - the main scene still renders under fullscreen mobile menus;
  - trees and resources are still per-entity meshes, because they animate and respawn individually.

### CPU investigation and bounded verification — 2026-10-05

- Previous automated checks explicitly forced SwiftShader, moving graphics rendering onto the CPU; a short comparison got ~8 FPS versus ~60 FPS with ANGLE Metal on the M1 Max. No old verification browsers/servers were running when this investigation started; the user's port-5174 server was preserved. Routine checks must use hardware rendering, one browser, bounded lifetime and finally cleanup (see AGENTS/README).
- Removed unchanged per-frame health DOM writes, redundant sidebar layout/navigation/status writes, recipe markup rebuilds and combat-option reconstruction. Recipe caches include inventory, skill levels, busy state and active recipe; combat cache includes learned/selected styles, busy state and retaliation. Cached fixed game viewport bounds refresh through the existing resize/ResizeObserver path, avoiding repeated layout measurements during rendering.
- Four four-second idle samples (Quests, Inventory, Skills, Combat), same 1200×850 GPU-backed clearing setup: sidebar mutations fell from 8,304–8,506 per sample to zero; summed main-thread task duration fell 6.007s → 5.277s (~12%). ~60 FPS retained; layout duration fell to zero during those idle samples. These are short local main-thread measurements, not total-machine CPU guarantees; 3D rendering/shadow/scene traversal work remains.
- `node scripts/profile-ui.mjs` (since folded into the perf runner and removed) profiled the running playground, reporting actual renderer/timings/mutations and saving Chrome CPU profiles under a printed temporary directory. It launched one disposable browser with a 65-second watchdog and cleaned up automatically; optional --software ran one explicit comparison. Existing health/inventory/crafting/combat/travel/reset and resize/collapse controls exercise production behavior; playground instructions updated.
- Live regression checks passed health damage/eating completion, crafting busy/completion labels, retaliation toggling, viewport cache updates through desktop/mobile/collapse/restore, Cinderhold and reset. 198 tests and both build variants/debug isolation passed. No frame-rate cap, visual-quality reduction or gameplay timing change was introduced.

### Sidebar persistence and overview refinements — 2026-10-05

- Docked desktop journal now always stays open, restoring its last page when necessary and ignoring dismissal/Escape. Its close control is hidden. Collapse/expand belongs to the player overview; collapsing moves the overview to the upper right with an integrated expand icon and restores the full game viewport. Mobile retains explicit journal dismissal. Guided tutorial controls still use the shared tutorial lock.
- Removed the player name. Health, mana and stamina now share orb frame/gloss/fill styling with separate color variables. Stamina uses a boot icon. Minimap grows to 212px desktop / 172px mobile, shrinking to available space alongside the resource grid rather than overlapping it. Existing playground navigation, travel/reset and icon catalogue cover the changes; instructions updated.
- Verification: desktop at 1200 and 701px checks persistent page, collapse/full viewport, restore and non-overlapping map; Cinderhold checks shared persistence; 320px mobile checks dismissal and layout. Normal/debug builds and isolation passed; 198 tests passed. Screenshots inspected.

### Resource orb overview — 2026-10-05

- Health uses a 48px red orb filled bottom-up from production health, current health number only, with current/max tooltip and accessible meter semantics. A 44px icon-only Quick eat button sits directly below and stays available while the mobile journal is open. The overview reserves three columns/two rows; purple Mana/Quick restore and green Stamina/Sprint toggle are explicitly inactive placeholders (dash values, disabled buttons and coming-soon labels). Desktop minimap is on the right. No mana/stamina gameplay was added.
- Existing playground Restore health/Lose 10 health, Inventory food, combat, reset and travel controls exercise the real UI. Icon sheet automatically includes quickEat/quickRestore/sprint; instructions updated. Browser checks exercised partial/full health, food completion from open journal, clearing and Cinderhold, desktop and 390/320px phone layouts; fresh built-preview checks confirmed both placeholders, disabled actions, minimap right alignment and no overflow at 1200/320px. Screenshots inspected. 198 tests, both builds and debug isolation passed.

### Compact mobile confirmations — 2026-10-05

- Tiny confirmations now opt into shared `compact-confirm` styling instead of fullscreen mobile presentation. Full-health eating is the first use: centered, content-height, safe-area margins, 44px actions, accessible name/message. Project instructions and design document record the exception. Journal Escape handling now defers to any open native dialog, preserving the page behind the confirmation.
- Existing playground Inventory/add-food and Restore health controls cover both quick Eat and Inventory Eat without tutorial replay; instructions explicitly describe confirming/cancelling/repeating. Browser checks passed in the clearing and Cinderhold at 390×844, 320×568 and 650×360: ~120px dialog height, centered bounds, Cancel/Escape preserve food, Eat anyway consumes on completion. Screenshot inspected. Tests, both builds and debug isolation checked.

### Responsive player sidebar and mobile HUD — 2026-10-05

- Viewport/navigation refinement: world dialogue and choices, tips, toasts, area/skill notices, placement controls and desktop utility dialogs center inside the rendered game bounds; their dimming/fades also stop at the sidebar. Embedded mobile lesson tips retain their journal layout. Eat is a compact button beside health (food/count in its accessible label and tooltip). The redundant launcher hides while desktop sidebar/mobile navigation is available, except guided lessons. Mobile uses four fixed primary tabs and a scrollable-height More panel for all optional/secondary tabs, including playground; no horizontal tab scrolling. More closes on selection, outside press, Escape, action, incoming attack, reset and desktop resize.
- Verification for this refinement: 198 tests, both builds and debug isolation passed. Local Chrome checked 1200px desktop, 390/320px phones and 650×360 landscape; clearing tip/sidebar hide/restore, furnace centering, real Eat completion/consumption, Cinderhold dialogue alignment, More selection/Escape/incoming-attack dismissal, and screenshots. Existing playground objective/checkpoint/interface/health/combat controls exercise production behavior; their instructions are updated.

- Persistence refinement: shared menu closing now distinguishes automatic requests from explicit dismissal and tab switching. Desktop ignores automatic dismissal (including travel, story, defeat, reset and Companion lifecycle cleanup), compacting expanded pages instead. Mobile retains automatic dismissal. Verified Inventory through travel/arrival, Combat through defeat/reset, and explicit close/tab switching; playground uses its existing travel, defeat, reset and companion controls.

- Width refinement: sidebar is now 360–420px rather than 300px. Desktop tabs wrap without horizontal scrolling, including the extra Companion/Debug tabs. Verified all nine tabs at 701, 1024, 1200 and 1440px, with at least 44px button widths and correct remaining game viewport. Mobile retains its full viewport. Both builds and debug isolation passed.

- `player-interface.js` composes production journal pages with a shared player overview: name, live health, quick food and a north-up minimap sampled from nearby active-map tiles/enemies. Desktop reserves 360–420px for the sidebar (responsive to viewport width), with wrapping journal tabs instead of horizontal scrolling; hiding it restores the full world viewport and keeps the overview available as a HUD. Closing the journal collapses only its tabbed portion. Expanded pages float beside the overview. Equipment and Combat are journal tabs using the existing gameplay systems.
- Desktop gameplay actions and incoming attacks compact expanded pages without dismissing them. Mobile uses a health/quick-food HUD and minimap, bottom tab navigation, and fullscreen pages. Any resolved incoming attack (including misses) closes the mobile journal and open utility dialogs. Journal item/recipe choices and searches survive reopening; inventory action availability refreshes while food runs. Quick food uses `createFoodSystem`, including movement buffering, confirmation, healing and consumption. Only Cooked Pondfish exists currently; its inventory action assigns quick food. No placeholder mana/stamina systems were added.
- `game-viewport.js` supplies actual renderer bounds for combat labels/hit splats and debug picking. Camera aspect and renderer dimensions follow the game container through ResizeObserver; XP projection uses the same viewport dimensions. Tutorial locks remain on production controls; guided mobile lessons retain their original tab targets instead of proxy navigation.
- Playground coverage uses the real sidebar/tab controls, Inventory and health controls, passive/aggressive combat fixtures, travel and full reset. Instructions were updated; inspection exposes responsive UI/viewport state. Full reset restores the sidebar, compact mode and default quick food. Developer-only state remains compile-time isolated.
- Verification: 197 tests passed; normal/debug builds and debug isolation passed (existing bundle-size warnings remain). Browser checks passed repeated desktop eating without reopening, crafting persistence, expanded-to-compact action/attack transitions, full viewport restoration, mobile incoming-attack dismissal and retained selection, quick food during incoming combat, Cinderhold quick food and Equipment equip, guided mobile Inventory selection, and expanded desktop overview visibility. Screenshots inspected at desktop and 390×844. Production splash/opening smoke check is separate from these checkpoint-assisted flows; a complete fresh-game tutorial replay has not been performed.


### Combat interruption, retaliation and awareness — 2026-10-05

- Shared combat provokes passive creatures only when a melee hit splat resolves or a ranged/magic projectile arrives. Damage, zero damage and misses all provoke; selecting, approaching, winding up and releasing do not. Inert practice targets remain non-retaliating.
- Shared enemy definitions/configuration now carry `aggressive` and `aggroRange`: Scrappers default passive, Bruisers aggressive within four tiles. Awareness respects range, height, sight obstruction, reachability and safe zones. Pursuit and leash return retain continuous walking. Maps can override these properties through the portable enemy factory.
- Auto-Retaliate defaults On in the real Combat menu, responds to incoming attacks including misses, and can be changed during combat. Off does not cancel a manually chosen fight. Preference survives travel; the full playground reset restores On.
- The shared cancellation policy interrupts skilling/utility actions while preserving combat and eating. Food retains the fight target, pauses outgoing attack progress while enemies keep attacking, consumes/heals at normal completion and resumes attacking afterward. Defeat, movement and explicit reset still cancel food. A food request buffered behind the current walking step survives combat interruption.
- Playground Combat offers separate passive/aggressive fixture spawns (three-tile awareness), real fight/reset/remove/defeat commands, and instructions for the existing inventory food and health controls. The real Combat menu exercises retaliation, and inspection exposes aggression/radius/preference. No location-specific combat logic was added.
- Validation: 194 tests, both build variants and debug isolation passed. Regression coverage includes all three attack styles × damage/miss/zero outcomes; passive proximity; aggressive radius/height/walls/safe zones; multiple-enemy reset; retaliation; real food completion during combat and defeat cancellation; real crafting interruption and the shared cancellation policy. Browser checks passed food during combat in the clearing before visiting later maps and in Cinderhold, plus aggressive proximity, toggling retaliation during incoming attacks, food surviving damage received while eating with retaliation Off, preference persistence through real travel, and full playground reset. The 390×844 Combat menu fills the screen without overflow and has a 47px retaliation button. Existing bundle-size warnings remain. These are focused checks, not a full tutorial replay.


### Finish the current step before inventory actions — 2026-10-05

- Shared `after-step.js` buffers one stationary action while the current movement segment finishes. Food, inventory crafting, and campfire placement use it through their production start functions. The remaining route and old interaction target are cleared, but the active step and player position remain intact. Requirements are rechecked at arrival; consumption and action timers do not start while queued.
- The latest valid action replaces the pending request. New movement/interactions, travel, defeat, and resets clear it through shared cancellation. Full-health food confirmation is shown after arrival. Station/resource interactions already approach their targets before starting and retain their existing flow.
- Playground coverage: normal Eat/Craft/Place buttons during movement, inventory and health controls, and area resets exercise the real implementation. The debug-only inspection state exposes player position, current step, queued action, and eating state. Instructions are included in the playground UI.
- Verification: 178 tests, normal/debug builds, and debug isolation passed. Browser checks confirmed no immediate position jump or backwards travel, arrival at the current step destination before food/crafting/placement, both upward and downward steps, and food/crafting in the clearing before visiting Cinderhold and again in Cinderhold. New movement and area-reset checks cancelled pending food without consumption; no browser runtime errors were reported.

### Attack momentum and bow face anchor — 2026-10-05

- Shared punch/stab/slash poses pull the off hand slightly backward and turn the torso about seven degrees in the user-corrected positive-yaw direction at impact, then settle during recovery. This also carries an equipped shield; blade rotation keys and combat timing remain unchanged.
- Setup combines the rightward torso turn, upward/sideways bow sweep, and arrow-hand placement. All three finish at a single fixed full-draw bow transform, followed by a short set beat before the draw starts. Live archery applies its already-eased authored poses directly, avoiding a second smoothing pass that lets the grip keep settling after the draw begins. During draw, the torso and bow-holding hand remain fixed; only the string hand pulls straight back to the face. Tests assert that setup contains the sweep and that the bow has no translation or rotation during draw. The arrow stays aligned with the string and target. Shield blocks preserve the main hand’s relaxed carry rotation instead of standing its weapon upright.
- Existing playground Attack overrides, main/off-hand equipment controls, looping/restart, and live equipped attacks fully expose these changes for all slime rigs. Validation: 175 tests, both builds, and debug isolation passed, including off-hand momentum, the cross-body bow sweep, face contact, hand clearance, arrow/string alignment, and main-hand orientation throughout shield blocks. Browser checks inspected impact/full-draw frames and completed live bow combat in the clearing and Cinderhold with no runtime errors.

### Relaxed weapon carry and windup — 2026-10-05

- `equipmentIdleHands` supplies the shared lowered sword/dagger/bow carry pose in gameplay and model previews, including attack/block starting and recovery poses. Dagger aiming is brief and angles inward once the hand clears the body; sword retains its rear/slash rotation keys; bow raises along a clear outward arc before drawing.
- Bow rests horizontally with the string above the wood. Its ready position is between center and left, nearer the face. Shared `bow-presentation.js` attaches an arrow to the drawing hand and rotates it into alignment before draw; it hides on release, cancellation, and non-archery actions. The draw retains its off-hand wooden grip, main-hand string contact, and forward arrow aim. Recovery returns smoothly to carry.
- Playground coverage remains Idle/Sliding plus Attack/Block with independent equipment on all slime models, and live equipped combat. Validation: 172 tests, both builds, and debug isolation passed; tests cover both bow hands through lift/draw/recovery, horizontal carry orientation, and hand-held arrow alignment and release. Browser inspection covered carry, arrow pickup/rotation, full draw, and stab impact; live bow combat completed in the clearing and Cinderhold without runtime errors.

### Combat pose polish — 2026-10-05

- Shared stab starts at the idle hand position. Slash translation follows an outward curve around the body while preserving the blade rotation and attack timing.
- Bows remain main-slot, two-handed equipment, but the shared held-tool attachment mounts the wooden grip in the off hand. The main hand follows the string as the torso turns through the draw; the arrow stays aimed forward. Bow blocking uses the same corrected attachment.
- Existing playground Attack motion overrides and independent equipment selectors expose these changes on the player and every mentor; live equipped attacks use the same production functions.
- Verification: 170 tests passed, including sampled hand clearance, preserved slash rotations, and bow grip/string alignment. Normal/debug builds and debug isolation passed. Browser checks inspected player/mentor poses and completed real bow target combat in the clearing before travel and in Cinderhold, with no runtime errors. These checks were focused combat checks, not a fresh full tutorial playthrough.

- `src/cooking.js`: app-owned cooking action, Culinary XP, cancellation, station availability, and one-recipe completion. `src/recipes.js`: shared recipe catalogue and material/tool helpers.
- `src/cooking-menu.js` / `.css`: shared recipe picker and details. The debug interface preview opens with no station and cannot cook; it must not move the player, change maps, or grant items. A real campfire provides the station context.
- Cooking header/close-button bugs came from global `header`/`footer` styles. Those styles were scoped, and the cooking UI uses its own classes.
- `src/campfires.js`: app-owned placement mode, ghost, validation, approach/placement, station clicks, packing, animation/highlights, and reset. `campfire-model.js`, `campfires.css`, and `placement-rules.js` supply shared presentation/rules.
- Campfires no longer require visiting/being in Willowbank or a special meadow flag. Clear reachable land works by default; water, occupancy, explicit non-buildable structures, and unreachable tiles reject placement. The existing one-fire-per-current-map limit is preserved. Stations retain their original tile instances across travel; matching coordinates in another map do not identify the same station. Packing refunds one Campfire.
- `src/recipe-crafting.js`: app-owned inventory recipe crafting, used for the additional tool/fire recipes previously run inside Willowbank. `main.js` drives it independently of the current area. The introductory axe/pickaxe recipes now use this same controller; the legacy activities loop has been removed.
- Willowbank now receives campfire/cooking/crafting completion callbacks for narrative. It no longer implements their generic placement/cooking/crafting actions.
- Companions already have app-owned behavior in `companions.js`, with shared model, follow logic, menu/naming, animations, and feedback modules. Willowbank retains the stranded-animal rescue script.

## Shared-system ownership — current audit

The requested crafting consolidation and compatibility cleanup are implemented. Area narrative remains local and calls shared systems. Keep future additions aligned with these boundaries.

| System | Existing coupling | Intended separation |
| --- | --- | --- |
| Fishing | Extracted: app-owned action, skill, spot lifecycle, and rod/catch presentation. | Willowbank configures placement and observes start/catch for narrative. The clearing playground uses the same implementation before any visit. |
| Carpentry | Extracted: app-owned action/skill and portable bridge entity. | Willowbank configures availability and observes progress/completion for injury, terrain transition, and rescue. |
| Eating and health | Extracted into app-owned `player-health.js`; Willowbank owns its scripted injury and observes food completion. | Combat owns shared defeat/recovery. Food and health no longer require an area visit. |
| Gathering, chopping, mining | Extracted: shared resource prefabs and app-owned action/depletion/respawn controller. | Areas configure finite/respawning placement and observe rewards for narrative. Ground pickups stay walkable. |
| Combat and equipment | Extracted into app-owned combat/equipment and portable enemy entities. | Normal Willowbank remains peaceful; explicit playground fixtures exercise the shared implementation in any map. Sword/shield recipes and equip actions are available without area gates. |
| Skill/action/menu ownership | App-owned skills (including Culinary), one inventory recipe controller, and shared journal pages. | Tutorial supplies guidance and observes action callbacks; no chapter recipe/skill wrapper or separate introductory timer. |
| Model catalogue dependencies | Portable factories are imported directly from shared modules; the Willowbank re-export barrel is removed. | Reed uses `fisher-model.js` in gameplay and the catalogue. Map rules export only layout/configuration. |

The two requested cleanup items are complete in code. Cinderhold now implements the third-area combat narrative; see the latest implementation section below. This is not a claim that every generic actor uses an identical schema: non-resource actors retain their own lifecycle fields; resources now share `depleted`.

## Design details worth preserving

- Clearing: opening/customization, movement/camera, gathering/XP/levels, menus, crafting, chopping/mining, Iter Crystal, optional practice reward/top hat.
- Willowbank quest: **Broken Bridge Rescue**. Dialogue, carpentry, companion rescue/naming, fishing, fire placement, cooking, eating. Reed is a fisher slime; the stranded corgi is a local animal, not initially Reed's pet. Combat is taught in Cinderhold, the third area.
- Bridge work causes a one-off minor injury to motivate healing. Do not turn all carpentry into random injury or make this a universal rule.
- Cooking chooses a recipe and cooks one item, not a quantity prompt. Tutorial needs one Pondfish. Preserve reward/consumption timing and avoid double rewards when interrupted.
- Models, animations, expressions, hitboxes, feedback, and resource lifecycle should be consistent across maps, splash, and previews.
- Menus/utility popups default to edge-to-edge fullscreen on mobile. Dialogue/tips/toasts are exceptions. Tutorial information is distinct from objectives; quests retain task history. Model viewer animations and expressions are separate, with Default/automatic expressions.
- Terrain uses half-height increments, no ramps, automatic half-height traversal, safe routes for taller elevation changes. Ground items do not block walking.

## Validation and playground entry points

Commands: `npm test`, `npm run build`, `npm run build:debug`, `npm run check:debug-isolation`. Normal dev: `npm run dev`; debug dev: `npm run dev:debug` (default port 5174). Deploy the normal `dist` output, not `dist-playground`.

Last recorded validation for the shared campfire/crafting change:

- 109 unit tests passed; both builds and debug-isolation check passed. Vite still reports the existing large-bundle warning.
- Browser-tested in clearing, without a Willowbank visit: craft a Campfire (materials spent, +20 Crafting XP), place via actual pointer input, open it, cook one fish, pack it back into inventory.
- Browser-tested Willowbank campfire cooking still advances the tutorial to eating.
- Ran the unified playground checkpoint-loading sweep without reported runtime errors. Loading a checkpoint is not a substitute for completing its entire tutorial flow.
- New regression files: `campfires.test.js`, `recipe-crafting.test.js`, and `cooking.test.js`. Coverage includes map identity/persistence, cancellation, invalidated placement, packing refunds, reusable tools, and one-time rewards.

To reproduce without adding a special location-specific shortcut: use debug Inventory controls to add Small Logs ×2, Flint and Stone ×1, and Raw Pondfish. Open Crafting, craft Campfire; open Inventory, select Campfire, Place; interact to cook; Pack. Repeat in a second area. The Cooking UI preview deliberately has no usable station.

Browser checks used an isolated headless Chrome with software WebGL and temporary CDP scripts under `/tmp`. Those scripts are session artifacts, not a durable test suite. No test server/browser was intentionally left running. Do not assume their presence or stop user-owned servers.

## Eating/health extraction — 2026-10-04

- `player-health.js` owns bounded player health and timed food consumption. `main.js` owns its update, cancellation, full-health confirmation, and HUD. Inventory exposes Eat before any Willowbank visit. Existing eating motion/expression is reused.
- Willowbank observes successful meals for its tutorial and uses the shared health object for its scripted bridge injury and legacy combat. Combat/defeat orchestration, equipment gates, fishing, carpentry, and resources remain coupled; this change does not claim those extractions are complete.
- Playground coverage: existing Player health controls restore/damage the shared state; Inventory controls grant Cooked Pondfish, and the production Inventory Eat action exercises completion and full-health confirmation. Movement cancels; Full test area resets health and cancels work. Willowbank Eat checkpoint exercises the same shared controller and tutorial callback.
- Validation: 112 tests passed; normal/debug builds and debug isolation passed (existing bundle-size warning). Isolated Chrome exercised clearing eating before a chapter visit (20→30 health, one fish consumed), repeated full-health consumption with confirmation, movement cancellation (no consumption/healing), and Willowbank Eat checkpoint completion (phase finished, one meal observed). Checkpoint validation does not represent a full tutorial replay. Unit tests also cover missing food, confirmation cancellation, repeated completion, and health bounds.

## Fishing extraction — 2026-10-04

- `fishing.js` owns the action, skill, tool/reach checks, skill-adjusted wait, one-time fish/XP reward at the bite, and cancellation. `main.js` drives it independently of the chapter and exposes Fishing directly to normal Skills and playground controls.
- `fishing-spots.js` owns portable spot registration, hit targets, ripples, highlights, availability, and removal. Tile identity prevents spots from another map with matching coordinates from being used. `fishing-spot-model.js` supplies the same model and motion to the catalogue.
- `fishing-presentation.js` owns the player's rod and caught fish, using existing cast, hook, line-anchoring, and celebration animations. Willowbank retains only its spot placement and tutorial start/catch observers. First-catch dialogue waits for shared actions, movement, and journal use. Removed stale area-owned eating-update and fishing-preview timing branches.
- Playground: World & water → Fishing practice documents the clearing pond fixture at (4, 4). Add a Crude Fishing Rod through Inventory controls and click the ripples. Skills controls adjust Fishing XP/levels; the model viewer exposes cast, wait, catch, and celebration; Full test area cancels and resets rewards. The fixture, its instructions, and inspection state remain behind the compile-time flag. Full test area now restores clearing visibility after customization preview; browser-verified a catch after that reset.
- Validation: 119 unit tests, both builds, and debug isolation passed (existing bundle-size warning). Browser checks covered the real pointer path in the clearing before any chapter visit: missing rod, cancellation before the bite, repeated catches, one-time reward timing, opening Inventory/skipping the flourish without losing rewards, and reset. Willowbank's fishing checkpoint awarded one fish/20 XP and advanced to Flint with delayed dialogue. A separate actual crystal-travel run verified retained rewards and fishing in Willowbank's initial meet phase, before its quest began; returning to the clearing preserved rewards and allowed a third catch. Unit tests cover return-map identity, invalidated/removed spots, reusable tools, configured loot, and rod-line anchors.
- Remaining extraction order: carpentry, resource action/lifecycle consolidation, combat/equipment, then remaining skill/model/UI adapters. Fishing does not remove those other area dependencies.

## Carpentry extraction — 2026-10-04

- `carpentry.js` owns the app-level skill, tool/material checks, skill-adjusted timing, progress stages, cancellation, material consumption, XP, and repair motion. Targets configure recipe/stages and availability and receive start/progress/completion callbacks. A target may pause for local narrative without spending materials early.
- `carpentry-bridge.js` owns the portable bridge model, picking, highlight, progress, completed interaction state, reset, and map identity checks. `bridge-model.js` and `tool-models.js` now supply gameplay and catalogue factories. Willowbank retains the bridge quest gate, scripted finger injury/dialogue, terrain transition, and rescue sequence.
- Playground: World & water → Carpentry practice documents the clearing fixture at (2, 4). Inventory grants hammer/logs, Skills adjusts Carpentry, the model catalogue reuses real hammering/bridge models, and Full test area cancels and resets the fixture and rewards. These controls and the fixture stay behind the playground flag.
- Validation: 122 tests; normal/debug builds and debug isolation passed (existing Vite bundle-size warning). Browser exercised real pointer interactions in the clearing before any Willowbank visit: missing hammer, movement cancellation, completion with three logs consumed/hammer retained/40 XP, full reset, and repeated completion. Willowbank's repair checkpoint exercised the injury pause at 25 health, resumed repair, exactly three logs/40 XP, and companion crossing/acquisition. Screenshots inspected for clearing completion and injury dialogue. This is checkpoint coverage, not a complete replay from the opening. Unit tests cover travel/map replacement cancellation and return-map identity; actual crystal travel was not rerun for this extraction.
- Next: resource action/depletion/respawn consolidation, then combat/equipment and remaining UI/model adapters. Existing earlier verification notes are historical snapshots.

## Resource extraction — 2026-10-04

- `resource-entities.js` owns shared tree/boulder/ground-bundle models, picking, highlights, and occupancy. Both maps now place those prefabs. `resource-actions.js` owns the app-level gathering/chopping/mining action, tool and reach checks, skill speed, hit feedback, committed depletion, one-time rewards, cancellation, reset, and respawn. `resource-rules.js` supplies the shared tool-work roll. Removed the obsolete chopping/mining factories and migrated their coverage to the real controller tests.
- User decision: trees/boulders in every area use a 3–6 second base duration and 1–3 item yield. Skill levels reduce duration. Clearing resources remain finite for opening/practice objectives; Willowbank configures eight-second respawns. Ground bundles yield one item. All successful actions award 20 corresponding skill XP.
- Solid respawns wait for a free tile, including player movement reservations, companion occupancy, and placement reservations. Ground pickups never block walking or clear another occupant. Off-map depletion/respawn pauses and resumes on return; unfinished work cancels on map identity changes. Reset removes queued depletion rewards and respawns.
- Narrative callbacks remain local: clearing XP/chop/mine guidance and Willowbank Flint progression observe shared rewards. Generic resource work no longer depends on a crafting tutorial stage. Existing `felled`, `collected`, and `opened` flags are aliases for one shared depletion state, retained for opening/finale/UI adapters; those adapters remain an explicit cleanup item. Crafting's introductory axe/pickaxe path and combat/equipment still require later consolidation.
- Playground coverage: existing Inventory/Skills controls, real map resources, model catalogue animations, targeted clearing resets, Full test area, and Willowbank checkpoints exercise the shared implementation. Resource picking instructions describe cancellation/repeat/respawn. Repeated clicks no longer cancel work through the playground stop hook. Fixed Willowbank checkpoint setup to create the clearing return crystal using the production helper, so actual return travel has a landing point.
- Validation: 126 tests passed; both builds and debug isolation passed with the existing Vite bundle-size warning. New controller tests cover all five resource kinds, missing tools, bounded rolls/skill speed, cancellation/restart, map identity, delayed single rewards, pending-depletion reset, return-map continuation, and occupied/reserved respawns. Browser checks passed clearing pickup, chop cancellation, chop/mine completion, Full test area reset/repeat; Willowbank shared chopping, timed respawn/repeat, Flint-to-fire narrative; clearing gathering/chop/mine tutorial checkpoint callbacks and non-restarting repeated clicks; Willowbank pickup in the meet phase and actual crystal return with inventory/XP preserved. Inspected the clearing reward screenshot. Tutorial checks used checkpoints rather than a full opening replay. Test server and isolated browser were stopped afterward.
- Next: combat/equipment extraction, then remaining skill/model/UI adapters and introductory crafting consolidation.

## Combat and equipment extraction — 2026-10-04

- `combat.js` owns the app-level Combat skill, timed attacks, hit/miss and damage rules, pursuit/reengagement/leashing, configured patrols, enemy defeat/fleeing, reset/cancellation, and player defeat/recovery. `combat-rules.js` retains the existing balance. `enemy-entity.js` and `enemy-model.js` supply portable models, picking, health labels, highlights, and animation. Willowbank no longer owns enemy placement, combat state, equipment, or defeat handling.
- `equipment.js` owns sword, shield, and top-hat state, inventory validation, and equip actions. `equipment-presentation.js` owns worn models and held weapons. Gear persists across travel/defeat; losing the last item unequips it. The clearing finale retains only its reward/held-hat celebration. Sword/shield recipes, equip actions, and Combat skill are now available without an area visit; this supersedes older notes about hidden recipes.
- Maps configure enemy placement/patrol bounds and provide world/respawn context. No normal map gains combat encounters or objectives. Defeat prefers a safe crystal-adjacent tile, falls back to a free current-map tile when no crystal landing is available, and waits if none is safe. Returning enemies wait for occupied home tiles rather than overlapping another entity. Cancellation and map identity checks prevent stale fights or duplicate rewards.
- Playground: Combat → Combat practice explicitly spawns both shared enemies near the player in the current map, approaches/fights either, resets/removes them, or triggers the real defeat/respawn flow. Inventory, Skills, health, normal crafting/equipping/eating, and the existing model catalogue exercise the shared systems. Full test area removes fixtures and resets gear/XP; current-area reset removes combat fixtures. Fixtures, commands, and inspection state remain behind the compile-time flag; debug isolation now checks their markers. Companion updates continue during combat.
- Validation: 134 tests passed; normal/debug builds and debug isolation passed with the existing Vite bundle-size warning. Controller tests cover equipment/stale actions/missing items, hat state, unarmed/equipped wins and single XP, misses/shields/protected training health, pursuit/reengagement/leash, occupied homes, repeated defeat with unavailable/safe respawn, inventory preservation, map replacement, removal, and configured wandering occupancy. Browser checks passed sword/shield crafting and unarmed/equipped wins in the clearing before a Willowbank visit; pointer retreat/pursuit/leash; real enemy-caused defeat and repeated recovery with gear/items retained; explicit second-map combat before Reed's quest with narrative unchanged; actual crystal travel preserving equipment/Combat XP; shared top-hat equip/presentation/travel and unequipping on removal; enemy-model pointer picking and live wandering. Inspected equipped-combat screenshot. Test server and isolated browser were stopped afterward. These are focused flows/checkpoints, not a complete tutorial replay or a new third-area implementation.
- Remaining work: consolidate introductory axe/pickaxe crafting with the shared recipe path; remove historical chapter/skill/UI adapters and resource flag aliases where useful; audit remaining model/export ownership. Third-area layout and combat narrative remain design work, distinct from this shared-system extraction.

## Dialogue button style repair — 2026-10-05

- Corrected the accidental `#character-dialogue button button` selector introduced in the earlier shared-system extraction. Character dialogue buttons once again receive their theme background, text color, border, and rounding; the continuation prompt retains its explicit transparent override.
- Existing Willowbank → Reed conversation playground checkpoint covers the production dialogue implementation. Browser-checked its three actual response buttons at 1000px and 390px widths: themed purple background/cream text, solid borders, 10px corners, and 54px height. No new playground controls needed. This was checkpoint coverage, not a full opening replay.
- Normal/debug builds and debug isolation passed (existing bundle-size warning).

## Action marker completion repair — 2026-10-05

- Stationary movement feedback previously called `complete()` with a partial list of busy-system guards, omitting cooking, eating, shared recipes, and combat. It could overwrite an active action's marker on its first frame. Movement now calls `arrived()`, which only completes an approaching marker; gameplay completion callbacks retain ownership of “Done!”.
- Regression coverage drives the real cooking controller and feedback through the frame ordering, repeated completion, cancellation, ordinary arrival, and other action labels. All 135 tests, both builds, and debug isolation passed (existing bundle-size warning).
- Existing playground Inventory/place/cook controls and Willowbank Cook checkpoint fully expose this fix. Browser screenshots confirmed “Cooking” with spinner before reward in both areas, and “Done!” at reward in the clearing before visiting Willowbank. Willowbank completion awarded food/XP and advanced to eating dialogue, which clears the marker. Willowbank pointer targeting required camera rotation to avoid a foreground tree. These are focused checks, not a full tutorial replay.

## Crafting consolidation and legacy adapter cleanup — 2026-10-05

- `recipes.js` now includes Crude Axe and Crude Pickaxe; `recipe-crafting.js` owns all inventory crafting. Removed `activities.js` and the separate main-loop action/timer. Both tools retain Sticks ×1/Rocks ×1 and a two-second level-1 duration, now using the same Crafting-level speed adjustment as other recipes. Materials/output/20 XP commit once on completion; explicit cancellation notifies narrative, and repeated starts cannot replace active work. Shared crafting also owns the timing callback used for crafting audio.
- `game-menus.js` owns recipe rendering/availability, skill-adjusted duration display, Inventory, and Skills. Main and the journal call those pages directly. The crafting tutorial only supplies guidance/navigation locks and observes shared start/cancel/complete events. Recipes use canonical item IDs (`axes`, `pickaxes`) throughout, including journal guidance and checkpoints. Removed obsolete tutorial `canChop`/`canMine` and chapter recipe adapters. Culinary is read directly from app-owned cooking for normal menus, playground controls, and reset.
- Resources expose `kind` and one `depleted` state; removed `type`, `felled`, `collected`, and `opened` aliases. Picking, highlights, practice goals, and both maps use the canonical fields. Shared resource reset supports depleted checkpoint fixtures without rewards or queued respawn. Finale/Willowbank resets no longer repeat resource lifecycle transforms themselves. Other actor types retain their own lifecycle fields.
- Removed the Willowbank shared-model export barrel and recipe/placement re-exports. Reed's rig is in `fisher-model.js`, reused by gameplay and the existing model catalogue. Removed the redundant Willowbank resource matching wrapper and finale/inventory hat-equipment adapters; shared equipment owns reconciliation and normal inventory actions.
- Playground coverage: existing Inventory/Skills controls and normal Crafting page exercise every recipe in both maps; instructions now describe tool crafting/cancellation/level timing. Guided axe/pickaxe checkpoints use the same controller and pages. Resource controls, map resources, Full test area, practice reset, and model catalogue remain production-backed. No new debug-only production controls were introduced.
- Validation: 136 tests passed, both builds passed, debug isolation passed, and diff whitespace checks passed. Existing Vite bundle-size warning remains. Regression coverage includes both tools' exact reward timing, cancellation/restart, missing ingredients, duplicate starts and skill speed; menu use without tutorial/area adapters; and resource checkpoint reset without pending rewards/respawn.
- Browser verification: clearing before Willowbank—Culinary visible, axe completion, pickaxe movement cancellation/retry/reward, desktop/mobile recipe pages; guided axe completion and continuation, guided pickaxe cancellation/retry/completion; both tool recipes and level-adjusted duration in Willowbank before its quest; actual return-crystal travel preserving tools/XP. Clearing pickup/chop/mine, cancellation and Full test area repeat passed. Willowbank chop/respawn/repeat passed (use gameplay-state polling on software-rendered browsers; a fixed wall-clock wait can expire before the simulation timer). All 24 affected menu/crafting/practice checkpoint loaders passed, plus shared hat equip/removal. Normal production startup reached opening dialogue without runtime errors or the playground API. These are focused real interactions/checkpoint checks, not a complete opening-to-finale replay.
- The requested two cleanup items are complete. The next feature is not implied by this cleanup; area-three layout/combat narrative remains separate design work. Temporary browser and production preview were stopped; the pre-existing playground server was left running.

## Boundary audit clarification — 2026-10-05

Completing the two cleanup items above does not establish that all reusable behavior is separated from maps. A follow-up code inspection confirmed these remaining boundaries to address:

- Travel/crystal lifecycle: `tutorial-finale.js` still owns generic travel validation, fade timing, crystal interaction/idle motion and a hardcoded clearing-versus-destination transition. Extract reusable travel/crystal behavior; retain the clearing's reveal, quest and reward narrative locally.
- App orchestration: `main.js` directly combines opening/finale/Willowbank busy state, camera focus, cancellation and a two-area visibility switch. Introduce an active-area interface and shared transition/input coordination before treating additional maps as configuration-only additions. Story completion callbacks themselves are legitimate integration, not defects.
- NPC presentation: Reed's model and conversation facing are shared, but his idle body/hand animation still lives in `willowbank.js`; the catalogue uses the generic slime preview motion. Extract the production NPC idle behavior and reuse it in the catalogue.

The verified skill/action controllers and menus are portable across the two current maps. That is narrower than a complete architecture audit or a guarantee that adding a third area requires no application changes.


## Travel, active-area routing, and NPC presentation cleanup — 2026-10-05

- Addressed the three boundaries in the audit above. `travel.js` owns destination validation, fade timing, switching, cancellation and arrival notification. It rechecks the destination and source at the switch, rejects repeated requests, and enters the destination quietly if cancelled after the switch. `portal-spawn.js` supports occupied landing exclusions. Tutorial finale retains crystal reveal, practice/reward sequencing and quest completion callbacks.
- `crystals.js` owns portable crystal actors, picking, readiness, highlights, interaction and removal; `crystal-model.js` owns their model and floating animation. Clearing and Willowbank use the same implementation. Removing a crystal cancels its pending travel and removes its picking/occupancy state.
- `area-runtime.js` registers arbitrary areas and routes active visibility, tile identity, lifecycle, input state, camera focus, animation and narrative events. Main registers current area content and hooks; the old two-way switch and cross-area busy/camera combinations are removed. Clearing content now has one parent group, preserving individual entity visibility across trips. NPC/chest narrative interactions route through the active area. Opening presentation and area registration remain application composition; this is not a claim that every line of main is map-independent.
- `fisher-model.js` exports Reed's production idle motion, used by Willowbank and the model catalogue. Removed the catalogue's obsolete generic Reed animation branch. Crystal previews also use production motion without importing gameplay controllers.
- Playground: World & water → Travel practice exposes destination travel, walking to the current crystal and cancelling travel; existing reset/checkpoint controls and model viewer cover reset, narrative and presentation. Controls and inspection state remain compile-time gated; isolation checks include their markers.
- Validation: 142 tests passed, including arbitrary three-area routing, one-time entry/reward, cancellation before/after switching, blocked/occupied destination revalidation, source removal, repeat trips, crystal identity/lifecycle and production/preview motion agreement. Both builds and debug isolation passed with the existing bundle-size warning. Browser checks covered cancellation on both sides of the switch, repeated travel, actual approach to the return crystal, inventory preservation and reset. All 24 affected menu/crafting/practice checkpoint loaders passed; Reed and crystal previews opened/restarted successfully; normal production startup reached opening dialogue with no runtime errors or playground API. Inspected the clearing screenshot. Final affected tests and both builds/isolation passed after the last edits. These are focused interaction/checkpoint checks, not a full tutorial replay. Temporary browser/production preview were stopped; the pre-existing playground server was left running.

## Third tutorial design draft — 2026-10-05

- Added [CINDERHOLD.md](CINDERHOLD.md), a planning document only. The requested direction is a rocky/cavern combat area with an angry drill-sergeant slime, a dwarf-like mining/smithing guide, unarmed combat → copper mining → furnace ingots → anvil/hammer dagger and shield → tougher fight, plus optional bow/arrows and magic mentors.
- Replaced the superseded area-three sword/shield tutorial outline in DESIGN.md with a linked overview. Existing Stone Sword/Wooden Shield gameplay remains intact. The draft includes a shared three-destination Iter Crystal picker, architecture boundaries, playground coverage, and normal-flow/cross-map acceptance criteria.
- Working names, recipe quantities, Smithing/Combat skill assignments, optional-style resource rules, and destination availability are proposals for review. In particular, making all three destinations available after the first crystal reveal is a proposed refinement of the earlier linear tutorial order.
- Code inspection confirmed that shared area/travel/crystal infrastructure and melee already exist; equipment still uses item-specific boolean slots, crystals still request a fixed destination, and copper stations/ranged/spells are not implemented. No runtime changes, builds, or gameplay validation were performed for this documentation-only change.

## Third tutorial ownership and world-scale review — 2026-10-05

- User accepted the overall Cinderhold direction and requested the largest tutorial area so far, with tutorial maps escalating toward a massive open world streamed in nearby chunks.
- CINDERHOLD.md now proposes roughly 40 × 32 tiles and at least twice Willowbank's reachable floor area, with larger connected chambers, optional side wings/outer loop, and a short legible required crafting route. Dimensions remain a layout proposal; the size progression is a requirement.
- Tightened ownership for safe zones/protected encounters, supply refill offers, one-time item/spell grants, practice targets, generic progression events across areas, registry-driven destination UI and scoped lifecycle/reset. These must be shared systems/definitions; Cinderhold supplies placement/configuration and story/tutorial only. Added corresponding cross-map playground and acceptance coverage.
- DESIGN.md records the future continuous chunk-streamed world and shared residency/lifecycle/spatial-query requirements, stable logical identities, retained state, travel readiness and future streaming playground coverage. Existing tile identity/pathfinding/whole-area activation are not claimed to support streaming. Implementing the open-world streamer is separate from the current chapter plan.
- Documentation review only; no gameplay changes or runtime/build verification. Check numerical layout and performance targets during implementation.


## Cinderhold first playable implementation — 2026-10-05

Cinderhold is playable through the normal Iter Crystal destination menu. The required chapter covers Bristle's unarmed Scrapper fight, Borin's copper mining → furnace ingots → anvil dagger/shield chain, equipping both items, and the Bruiser fight/graduation. Fletch's bow lesson and Wisp's Spark lesson are independent optional quests. All three destinations are available after the clearing's crystal reveal; Willowbank remains the recommended second stop.

- Layout: 40 × 32 bounding grid, 1,244 placed tiles and 1,089 walkable floor tiles before entities, compared with Willowbank's 416/285. Connected slate halls, copper terraces, arches, forge and side wings establish the first dungeon visual pass. `terrain-batch.js` merges static terrain in spatial groups and preserves per-tile ray picking. This is rendering batching, **not chunk streaming**; area residency/pathfinding still use the existing whole-area model.
- Area ownership: `cinderhold.js` owns placement, dialogue and quest sequencing; `cinderhold-rules.js` owns layout and narrative progress rules. Shared gathering handles copper, `station-crafting.js` handles furnace/anvil transactions and Smithing, `equipment.js` owns item-based slots and two-handed conflicts, and `combat-styles.js` owns learned Spark/style state. `combat.js`, `combat-range.js` and `projectile-effects.js` supply shared ranged/magic combat, wall obstruction, projectile timing, ammunition and encounter lifecycle. Inert targets do not retaliate or award XP. `supply-offers.js` owns reusable supply/grant rules; maps only invoke configured offers.
- Presentation: `training-models.js`, `world-actors.js` and existing shared motion/face modules provide portable mentors, stations, ore, equipment and target models. `destination-menu.js` reads the area registry; `combat-style-menu.js` selects equipped weapon/bare hands or a learned spell. Station and utility dialogs use fullscreen mobile layouts. Area events are broadcast so relevant generic actions can advance an entered chapter while performed elsewhere.
- Playground: 16 Cinderhold checkpoints, landmark jumps, portable production fixtures in any map, supply/spell controls, area/full resets, new item/skill controls, interface previews and shared model entries. Fixtures use real controllers and stay hidden in other maps. Full reset clears shared spells/supply grants as well as gear/items/skills; area reset restarts local narrative and encounters. Preview station/destination menus cannot craft or travel without a real source.

Validation: **154 tests passed**, normal and playground builds passed, and `npm run check:debug-isolation` passed. Vite retains its existing bundle-size warning. Added tests cover station transactions/cancellation, item slots, supply/spell state, ranged line of sight, projectile timing/ammo, inert targets, map reachability/size, narrative ordering and batched tile picking.

Browser verification used compiled builds and real pointer interactions with checkpoint-assisted setup: unarmed victory/referral, four ingots and copper equipment crafting/equipping, equipped Bruiser victory/graduation, both optional target/live-enemy lessons, and all 16 checkpoint loaders. Portable furnace/anvil/Spark worked in the clearing before visiting either later chapter; smelting also worked in Willowbank before Reed's quest. Every directed crystal route among the three maps preserved inventory and learned spells. Additional checks covered station cancellation without material loss, supply-food healing, companion travel, current-area reset, new model catalogue entries, and desktop/mobile menu rendering. No runtime errors were recorded. A representative forge view reported 247 render calls/53,694 triangles on the test browser; this is not a device performance benchmark.

Verification limits and follow-up: the normal build passed opening/customization/first journal-lesson smoke checks and exposed no playground controls. The full fresh-game sequence through all three chapters has **not** been replayed continuously; checkpoint-assisted chapter checks do not replace that acceptance pass. Environmental dressing, longer authored camera beats, device performance and combat tuning remain polish. No open-world streamer, durable save system or mana system was added. Existing architecture audit notes remain historical evidence, not a claim that every legacy system was re-audited in this change.


## Dialogue ownership and Cinderhold presentation repairs — 2026-10-05

- Found a real shared-system boundary leak: Willowbank manually echoed response text through its own `playerLine` wrapper, while Cinderhold ran choice callbacks immediately. `character-dialogue.js` now always presents a chosen option as a left-side player line and waits for continuation before running its callback. Choice data may supply a player expression; it cannot opt out of the spoken line. Removed Willowbank's duplicate choice echoes. Its scripted injury utterance remains narrative. The application supplies the current player name/model, ticks dialogue once regardless of area, and reads the player expression directly from shared dialogue.
- Cinderhold no longer forces the shared Point animation whenever a mentor speaks; mentors retain their ordinary idle hands. Bristle's shared model now wears a brimless iron helmet with ridge and cheek guards. The existing Sergeant Bristle catalogue entry uses that exact factory; Point/Stomp remain available as explicit preview motions.
- Filled the missing corner terrain and raised all dungeon wall tiles three units above their local floor (at least 2.5 units beside a half-height terrace transition). The rectangle now contains 1,280 tiles/1,105 walkable tiles before entities. A regression test verifies continuous blocked/sight-blocking perimeter corners, minimum adjacent wall height, and existing landmark reachability.
- Existing playground coverage: Cinderhold meet checkpoint and Sarge/ranger/mage landmarks expose accept/decline/repeat; Willowbank Reed conversation exposes the same shared response flow. Current-area reset cancels dialogue and allows replay. Sarge's existing shared model preview and Cinderhold landmarks expose the updated model and walls. No separate debug implementation was added.
- Browser checks passed Sarge accept and decline (player line before phase change/close), both optional mentor acceptances (player line before grants/progression), and Reed's response before exposition without a duplicate echo. Inspected player entrance, resting Sarge hands, fantasy helmet in both live portrait and catalogue, and the tall-wall forge view; no runtime errors were recorded. These checks used real interactions with checkpoint setup, not a fresh-game replay. This fixes the identified dialogue boundary; it is not a claim that the entire repository has received another architecture audit.

- Final validation for these repairs: 155 tests passed, both builds passed, debug isolation and diff whitespace checks passed (existing Vite bundle-size warning remains). Reset during a pending player reply cancelled its continuation; replay and mobile player-response rendering passed. Temporary browser/preview server were stopped; the existing development server was preserved.


## All-slime animation access — 2026-10-05

- Player Slime, Reed, Bristle, Borin, Fletch and Wisp now expose the same 31 motions in Shared model preview, using one animation list and playback implementation. Character-specific idle motion/default expression remains intact. Reed's idle fishing rod hides during other motions; shared action props supply the appropriate tools and clear them on switching.
- Point and Stomp moved into the shared `playerActionMotion` pose source. Mentor gesture playback and the live player Animation preview consume those same poses. Both gestures support the existing speed, loop, restart and Stop controls without an area visit or gameplay rewards. All slime models also expose Spawn landing, which was previously only in the live-player preview.
- Tests exercise every advertised motion on every model, require all six slime motion lists to match, check tool cleanup and pointing/idle transitions, and retain production Reed-idle/facing verification. 156 tests, both builds and debug isolation passed; the existing Vite bundle-size warning remains.

- Browser verification confirmed identical 31-motion menus for all six slimes; Point/Stomp/Mining/Wave/Idle playback and transitions; Reed pointing without the idle rod; and live player Point/Stomp play/stop in the clearing before later-area visits and in Cinderhold. No runtime errors were recorded.

## Copperbelly apron proportions — 2026-10-05

Widened the shared smith apron from .46 to .66 units (body width .72), shortened it from .38 to .24, and lowered its top to .33, below the mouth. Existing Borin catalogue and smith landmark cover the change. Visually verified the model preview and live dialogue portrait; no runtime errors. Both builds and debug isolation passed.


## Combat presentation and pursuit in progress — 2026-10-05

Shared weapon-specific attacks and equipment-aware blocks are implemented in `combat-animation.js`, used by gameplay and all slime previews. Bow strings/nocked arrows animate with release. Attack windup/follow-through takes priority over a hit reaction. Targeting does not aggro; resolved impact does (including misses and zero damage, as refined below). Pursuit and leash return walk continuously through reserved destinations, with health restored on arriving home. Explicit reset/travel may reset entities; ordinary retreat does not teleport them. Playground pointer actions no longer force-stop combat when no animation preview is active.

164 tests and both builds/debug isolation passed. Browser checks passed attack/block previews on all six slimes, live equipped previews, ranged passivity until damage and smooth pursuit in the clearing, and equipped Cinderhold victory plus retreat/walk-home (maximum observed displacement .10 units/frame). Spark check setup needed selecting the learned spell through the normal Combat menu. Full fresh-game replay has not been performed.

The subsequent design discussion selected independent motion and equipment controls with automatic gameplay resolution and explicit overrides; see the completed viewer section below.


## Combat viewer and equipped casting completed — 2026-10-05

- All six slime models now expose one **Attack** and one **Block** animation, replacing equipment-permutation entries. Contextual Attack motion (Automatic/Punch/Stab/Slash/Bow draw-release/Cast) and Block motion (Automatic/Fists/Blade/Shield/Bow guard) select the pose independently of Main hand, Off hand and Weapon/Magic combat style. Automatic uses the shared gameplay motion resolver. Explicit overrides never change gear; bow loadouts clear/disable the off hand. Selections persist when comparing slime models; Reset loadout restores empty hands, Weapon style and automatic motions. Non-slime models hide these controls.
- Casting retains equipped combat gear in both gameplay and previews; spell damage remains separate from weapon damage. Fishing/mining and other actions needing their own props temporarily hide combat gear, restoring it afterward through the same shared visibility policy. Casting hands sit together just in front of the body to keep equipment from clipping inside it. Shared bow string/arrow presentation and every attack/block pose remain production-backed.
- Mobile model viewer remains edge-to-edge with safe-area padding, touch-sized controls and a scrollable controls section so the actual-size camera canvas retains usable space. Existing live-player Attack (equipped)/Block (equipped), combat fixtures, inventory, spell controls and tutorial checkpoints remain the production test paths.
- Final validation: **167 tests passed**, normal and playground builds passed, debug isolation and whitespace checks passed. Existing Vite bundle-size warning remains. Regression coverage includes automatic/explicit motion selection, independent gear, legal bow slots, casting visibility, temporary skilling-tool substitution/restoration on all six slime rigs, and production equipment presentation.
- Browser checks passed independent selectors, six slime models, override persistence, off-hand restrictions, resets, non-slime hiding and fullscreen 390 × 844 layout without horizontal overflow (306px of model canvas). Inspected corrected equipped casting in the viewer and live gameplay. Spark target victories with dagger/shield equipped passed in the clearing before later-area visits and in Cinderhold. The earlier Cinderhold test's pointer coordinates missed the target; clicking its visible model completed the check without a code change. No runtime errors were recorded. Earlier pursuit/return and melee browser checks remain recorded above; these are focused checkpoint/fixture checks, not a full fresh-game replay.


## Minimap layout and ground pickups — 2026-10-05

- Desktop overview centers a 246px minimap above the resource orbs/actions. Collapse is a tab outside the sidebar; the collapsed overview has no panel background/border and restores from a bottom-right button. Mobile retains its existing side-by-side HUD.
- Minimap canvas cells and gutters use whole device pixels at the actual display size, including fractional pixel densities. Gold squares represent live ground pickups from the shared resource controller; active tile identity excludes other maps, and collection/reset/respawn automatically refresh markers.
- Existing playground Ground items/reset, real gathering, travel and sidebar controls cover the changes; instructions updated. Focused browser checks verified desktop collapse/restore, 701px layout, 320px mobile, collection removing a marker, and Willowbank. Screenshots inspected; no runtime errors. All 200 tests, both builds and debug isolation passed (existing bundle-size warning remains).
- Per user guidance, long performance suites are batched once or twice per active development day, with focused verification between runs. This change did not rerun the long suite; today's existing results remain the latest performance evidence.
