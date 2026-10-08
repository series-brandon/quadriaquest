# Performance testing

**These checks are VERY slow and expensive. Run them sparingly. Do NOT run performance tests after every change.** Batch them at meaningful milestones; use unit tests and short functional browser checks during iteration. A completed run covers minor follow-up fixes and documentation in the same batch. Repeat only for a substantial change, evidence of a regression, or an explicit request.

This is how we keep QuadriaQuest fast. It covers repeatable scenarios in several environments, exact counters as hard checks, and timings with confidence intervals as warnings. Each run shows where a slowdown came from. A/B comparisons let small improvements stack.

All tooling is developer-only:
- Playwright is a `devDependency`, used only by `perf/*.mjs`.
- The in-game probe and scenarios live in `src/dev/` behind the compile-time playground flag.
- `npm run check:debug-isolation` verifies that the normal build has no probe code, and that neither build contains the Playwright harness.

## Quick start

```sh
npm run perf                 # dev-gpu, all scenarios, 3 windows each, compared with the baseline (~2–3 min)
npm run perf:full            # dev-gpu + low-perf + mobile-emu + webkit, 5 windows each
npm run perf -- --scenarios clearing-idle,menus --env low-perf
npm run perf:ab              # working tree vs HEAD, interleaved, with confidence intervals
npm run perf:ab -- main --scenarios willowbank-river --rounds 8
npm run perf:baseline -- --note "why the numbers moved"   # rewrite baselines intentionally
```

Every run builds an **unminified** playground bundle into `perf/.build/current`, so CPU profiles keep function names. It serves that bundle from an in-process static server with cross-origin isolation, which gives microsecond timers. No dev server, HMR or reload is involved.

Each scenario gets a fresh page, then setup, a 1.5 s warm-up, and N measurement windows. Output goes to `perf/results/<timestamp>/`: `report.md`, per-environment JSON, a screenshot per scenario, and `.cpuprofile` files when diagnosing. Open `.cpuprofile` files in Chrome DevTools → Performance.

Runs use one browser at a time and close it in `finally`. They never touch your own browsers or servers. WebKit needs a one-time `npx playwright install webkit`. Chromium environments use the installed Google Chrome; set `PERF_BUNDLED_CHROMIUM=1` after `npx playwright install chromium` to use the bundled one instead, which CI will.

## Environments

| Name | Setup | Purpose |
|---|---|---|
| `dev-gpu` | Chrome, hardware GPU (ANGLE Metal), 1280×800 @2× | Milestone checks and deliberate A/B |
| `low-perf` | Chrome, SwiftShader software WebGL, 4× CPU throttle, 1366×768 @1× | Pessimistic weak laptop / integrated GPU. Fill-rate and main-thread problems show up first here. Never representative of normal play. |
| `mobile-emu` | Chrome, 390×844 @3×, touch, 4× CPU throttle, hardware GPU | Phone pixel density, fullscreen menus |
| `webkit` | Playwright WebKit, 1280×800 @2× | Safari-engine behaviour. No throttling, profiles, layout metrics or whole-browser CPU, and timers have 1 ms resolution, so counters and fps matter most here. |
| `ci` | Software WebGL, counters only | Planned GitHub Actions gate (draws, objects, uploads, leaks); timings not gated |

Real devices aren't part of the loop yet. When they are, use the playground **Performance → Toggle perf HUD** over remote debugging (Safari Web Inspector / `chrome://inspect`) with the same scenarios.

## Scenarios

Each scenario uses real gameplay entry points (checkpoints, travel, menus, combat fixtures). It then pins the camera, moves the pointer off the canvas and wakes the idle clock. `Math.random` is seeded by the harness. The same scenarios are in the playground under **Performance → Prepare scenario**.

| Scenario | Exercises |
|---|---|
| `splash` | Title garden and its own shadow light |
| `clearing-idle` | Terrain, pond, shadows, idle player |
| `clearing-walk` | Continuous movement and camera follow |
| `willowbank-river` | Wide view of the river, actors, companion |
| `cinderhold-combat` | Continuous real melee against practice enemies in the recruit yard (outside the safe court; health topped up, re-engages after each defeat) |
| `menus` | Inventory journal open |
| `dialogue` | Reed conversation with the portrait renderer |
| `travel` | Three crystal round trips. Measures transition spikes and checks for leaks (objects, geometries, textures, programs and heap must be steady). |

## What is measured

| Source | Metrics |
|---|---|
| Harness init script (`perf/lib/inject.js`, works on any build) | rAF callback time per frame (median, p95, max), frame intervals and fps, WebGL draws, buffer uploads and KB, texture uploads and program switches per frame, DOM mutations per second, long tasks, JS heap |
| In-game probe (`src/dev/perf-probe.js`) | Time per main-loop phase (`interface`, `world`, `systems`, `player`, `hover`, `feedback`, `render`, `other`), three.js draw calls and triangles, GPU time (when `EXT_disjoint_timer_query_webgl2` is available, as in Chrome), scene census by top-level group and visible mesh kind |
| Chrome DevTools Protocol | Layouts and style recalcs per second, script ms per second, CPU profiles |
| OS process tree (`perf/lib/cpu.mjs`) | Whole-browser CPU %, including the GPU and renderer processes. This is what Activity Monitor shows. |

## Gates

Thresholds live in `perf/budgets.json`; baselines live in `perf/baselines/<env>.json` (committed).

**FAIL**, which exits non-zero. Per-second rates such as mutations and layouts use a 25% tolerance, because they move with frame rate. They aren't gated at all in scenarios marked `stochastic` (combat).
- a counter is over its absolute budget;
- an fps target is missed;
- the travel leak check fails;
- the page throws errors;
- a counter rose more than 5% (+3 slack) over baseline. Counters: draws, objects, visible meshes, programs, geometries, textures, uploads, mutations, layouts.

**WARN:** egregious timing changes against the stored baseline: frame median +50%, frame p95 +75%, browser CPU +50% or fps −5%, and only when the 95% bootstrap confidence interval excludes zero. Smaller changes appear as report lines only.

These are advisory. Each run first times a fixed JS workload in the same browser (`calibration`). Baseline frame times are scaled by the machine-speed ratio, clamped to 0.6–1.6×, to absorb background load and thermal state. Even so, cross-session timing comparisons drift. On an unchanged tree, frame times still moved +36–81% between sessions even with calibration at ×1.01. That points to GPU or compositor contention from other activity, such as the game open in another browser, which a JS benchmark can't see. Precise timing claims therefore come from `perf:ab`, which measures both sides in the same session. Counters are exact across sessions, which is why they gate.

**Targets** (initial; adjust as data arrives): `low-perf/clearing-idle` ≥ 58 fps; `mobile-emu/cinderhold-combat` ≥ 30 fps.

Non-passing scenarios are automatically re-run once with the CPU profiler on Chromium. The report then lists:
1. **phase change**: main-loop phases whose ms per frame grew;
2. **objects by group / visible meshes by kind**: what was added to the scene and where;
3. **hottest functions**: self time from the profile.

## Workflow

1. Run the long performance checks sparingly at meaningful milestones, after a substantial group of changes to rendering, the main loop, entities, models, water, frequently updated UI, or audio scheduling. Include `--env low-perf` when that batch touches fill rate or main-thread cost. Use focused tests and bounded browser checks between runs; repeat the long suite sooner only to investigate a regression.
2. A FAIL needs either a fix or a deliberate baseline update (`--update-baseline --note`) explaining why the cost is justified. Note it in the change summary and the ledger below.
3. To measure a small optimization, use `npm run perf:ab` (or `-- <ref>`).
   - An A/A check (identical builds) showed about ±10–20% CI on frame ms and ±9% on browser CPU with 4 rounds × 2 windows.
   - Detecting 2–5% effects needs `--rounds 8`–`12`, or the `low-perf` environment, where main-thread work is amplified 4×.
   - Counters such as draws are exact, so one round proves those.
4. When an improvement lands, refresh the baselines and tighten that scenario's budget in `perf/budgets.json` (a ratchet), so later work can't silently spend the gain.

## Playbook: symptom → usual fix

| Symptom in the report | Look at | Usual fix |
|---|---|---|
| draws up, visible meshes by kind up | census kind delta | Merge static geometry (`terrain-batch.js`, water layers), share materials, instance repeated models |
| objects up in a hidden or inactive group | objects by group | Detach inactive content (`area-runtime.js` parks areas); dispose on removal |
| uploads or KB per frame up | which subsystem animates geometry | Merge animated geometry into one buffer; update only changed ranges; skip invisible items |
| `render` phase up, draws flat | GPU ms, triangles, low-perf fps | Fill rate: shadow map size/filter, pixel ratio, overdraw, transparent layers |
| `world`/`systems`/`player` phase up | hottest functions | Cache lookups (`named-parts.js`), avoid per-frame allocations, throttle non-visual work (10 Hz hover) |
| layouts or mutations per second up | DOM writes in loop or UI | Write only on change; cache measurements; batch reads before writes |
| programs up | new material variants | Reuse materials; avoid per-instance `onBeforeCompile` variants |
| travel leak FAIL | objects/geometries per cycle | Dispose geometries/materials; remove listeners; don't recreate on enter |
| low-perf fps low but dev-gpu fine | GPU ms, render phase | Adaptive quality (pixel ratio, shadows, antialias) |

## Ledger

Each entry: change, then measured effect (environment and scenario).

| Date | Change | Effect |
|---|---|---|
| 2026-10-05 | Detach inactive areas; batch clearing/Willowbank/splash terrain; merged water layers; 10 Hz hover; cached part lookups | dev-gpu clearing: main thread ~4.6 → ~1.4 ms/frame, draws ~957 → ~179, objects 5,291 → ~407 |
| 2026-10-05 | DOM/UI write deduplication (earlier sweep) | Sidebar mutations ~8,400 per 4 s → 0 |
| 2026-10-05 | Enemy health labels wrote `hidden` for every enemy every frame (found by the first perf run's mutation counter) | dev-gpu idle DOM mutations ~360/s → ~4/s in every scenario |
| 2026-10-05 | Initial baselines recorded | dev-gpu: all scenarios 59.5+ fps at 0.6–2.3 ms main thread/frame. mobile-emu: 59.5 fps at 1.8–7.1 ms. low-perf: 9.6–46 fps, render-bound (clearing-idle 22 fps fails its 58 fps target). webkit: 59.5 fps. Travel: no leaks. |

| 2026-10-06 | Interactive minimap, 100-point resources, sprint drain, shared orb UI; added minimap-sprint scenario | dev-gpu: all 9 scenarios PASS (~59.5–59.9 fps); minimap-sprint 1.81 ms/frame, 183 draws. Focused low-perf: menus and minimap-sprint PASS (~20 fps); clearing-walk WARN for −11.9% fps vs stored baseline, no FAILs. Software-rendered results are not representative of normal gameplay. Reports: `perf/results/2026-10-06T07-01-32-115Z` and `perf/results/2026-10-06T07-03-52-379Z`. No baseline changes. |

| 2026-10-07 | Player progression slice: formula-driven combat, per-attack XP labels, passive regeneration, character Skills/Combat UI | dev-gpu full suite: 8/9 PASS (59.5–59.8 fps, 0.6–2.6 ms/frame). `cinderhold-combat` FAIL on draws 584 vs 538.6 (+8.4%): its screenshot shows one more goblin on screen, because fights now last long enough for the recruit-yard Scrapper to stay alive, and a fight in progress where the baseline frame showed none. Frame time stays 2.7–2.8 ms at 59.5+ fps. Per-attack XP labels first raised mutations to ~229/s and layouts to ~56/s; floating XP and hit splats now write one composited transform per frame (no left/top), giving ~123/s and ~9/s. Enemy health labels also use transform; that did not measurably change layouts (insertion/text changes dominate). **Baseline not yet updated**: `--update-baseline` rewrites every scenario, so it needs a full run with a note. |
| 2026-10-07 | Energy/Ki, Strong Strike, Rush/Harden upkeep, food at initiation, five-orb HUD, crystal services | dev-gpu full suite: 8/9 PASS, 0.57–2.5 ms/frame, 59.4–59.9 fps. `cinderhold-combat` unchanged from the previous entry (draws 584, mutations ~123/s, layouts ~9/s); no new cost from per-frame aura upkeep, regeneration or HUD buttons. |
| 2026-10-07 | Assistance (10 Hz decisions), dual wield, backfire, armor, control effects, Ember mentor | dev-gpu full suite: 8/9 PASS, 0.53–2.67 ms/frame, 59.5–59.8 fps. `cinderhold-combat`: draws 605 (+21 vs the previous entry), objects 2171 (+233 = Ember's slime rig, same construction as the other mentors), visible meshes 458; frame time unchanged. Every scene has +5 objects for the hidden off-hand dagger model. Accept via a deliberate full baseline update; instancing NPC rigs is already in the backlog (item 5). |
| 2026-10-07 | UI kit foundation (signal-backed resources, one batched UI flush per frame) and redesigned resource meters, measured across three designs | dev-gpu full suite each time. **SVG "jelly" waves**: `willowbank-river` FAIL on layouts ~62/s vs 0. Health sits below full after the scripted injury, and Chrome lays out SVG-internal transform animations every frame. **Glass "essence" meters with always-rising smoke on masked HTML layers**: `willowbank-river` PASS (layouts back to 0), but browser CPU rose about 15 points in every scenario (clearing-idle 28 → 44%, `menus` WARN +55%) from ten continuously composited layers. **Low-poly bevelled tiles, idle-still, level slides only on change (adopted)**: 8/9 PASS, 0.58–2.69 ms/frame, 59.4–59.9 fps, clearing-idle CPU 31%, interface phase ≤0.02 ms. An intermediate run of this design gave frame-time WARNs across unrelated phases (world, player); a clean re-run cleared them, so it was machine noise. `cinderhold-combat` FAIL is the unchanged draws/objects baseline from the previous entry. Reports: `perf/results/2026-10-07T21-42-35-124Z`, `…T22-12-48-892Z`, `…T22-33-42-617Z`. No baseline changes. Lesson: animate UI only with transform/opacity on HTML layers, and keep idle UI still. |
| 2026-10-08 | Panel registry and host: journal pages and tabs are reactive. Removed the 0.15 s phone-nav cloning poll and the journal's MutationObserver sync. | dev-gpu full suite: 8/9 PASS, 0.67–3.0 ms/frame, 59.5–59.7 fps. `menus`: 1.68 ms/frame, 41% CPU, interface phase ≤0.03 ms. `cinderhold-combat` FAIL is the unchanged draws/objects baseline. Report: `perf/results/2026-10-08T00-52-29-704Z`. No baseline changes. |
| 2026-10-08 | Combat HUD parts 1–2: reactive inventory proxy, signal-backed sprint/eating/cooldown, revision signals, kit action row, health plates over combatants (per-frame transform writes) | dev-gpu full suite: 8/9 PASS, 0.64–2.73 ms/frame, 59.5–59.8 fps, interface phase ≤0.02 ms; clearing-idle 31% CPU, menus 30%. `cinderhold-combat` FAIL is the unchanged draws/objects baseline (mutations ~121/s are hit splats and XP labels, as before). Report: `perf/results/2026-10-08T01-37-35-327Z`. No baseline changes. |
| 2026-10-08 | UI rework pages and dialogs: modal host (stations, destinations, naming, confirm, settings popup), Inventory, Character (Attributes/Skills/Proficiencies), Crafting, Quests and Settings pages; removed `menus.refresh()` and the 0.15 s journal refresh poll; reactive skill records, audio settings and crafting state; Pacifist aggression gate in the enemy loop | dev-gpu full suite: 8/9 PASS, 0.69–2.85 ms/frame, 59.5–59.7 fps; menus 1.29 ms / 32% CPU, clearing-idle 1.25 ms / 34% CPU. `cinderhold-combat` FAIL is the unchanged draws/objects baseline (605 draws, 2172 objects; mutations ~123/s as before). Report: `perf/results/2026-10-08T05-49-15-136Z`. No baseline changes. Afterwards the main loop's per-frame `dialog[open]` query became `modals.anyOpen.peek()` (to-do 3; not separately measured). |

1. **Adaptive render quality for weak GPUs.** `low-perf` clearing-idle is about 17 fps while main-thread time is about 5 ms, so it is fill-rate bound. Options: lower pixel ratio and shadow map size, cheaper shadow filter, and antialias off when frame time stays high.
2. **Redraw the shadow map only when shadow casters move.**
3. ~~**Remove the per-frame `document.querySelector('dialog[open]')` in the main loop.**~~ Done 2026-10-08: the main loop reads the modal host's `anyOpen` signal (every utility dialog is on the host; only the dev model viewer is a legacy `<dialog>`).
4. **Skip or throttle the 3D render under opaque fullscreen menus** (mobile).
5. **Instance trees, boulders and resource meshes per kind** (Willowbank ~1,000 and Cinderhold ~1,900 scene objects).
6. **Render the dialogue portrait at 30 fps.** `dialogue` spends ~0.9 ms/frame in `world` on dev-gpu versus ~0.1 ms when idle.

## CI (planned)

GitHub Actions on Ubuntu will run `PERF_BUNDLED_CHROMIUM=1 node perf/run.mjs --env ci` after `npx playwright install --with-deps chromium`. Its counters gate pull requests against `perf/baselines/ci.json`. Timings aren't gated there; shared runners are too noisy.
