# Performance testing

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
| `dev-gpu` | Chrome, hardware GPU (ANGLE Metal), 1280×800 @2× | Daily gate and A/B |
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

1. Batch the long performance checks once or twice per active development day, after a meaningful group of changes to rendering, the main loop, entities, models, water, frequently updated UI, or audio scheduling. Include `--env low-perf` when that batch touches fill rate or main-thread cost. Use focused tests and bounded browser checks between runs; repeat the long suite sooner only to investigate a regression.
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

## Backlog (largest expected gain first)

1. **Adaptive render quality for weak GPUs.** `low-perf` clearing-idle is about 17 fps while main-thread time is about 5 ms, so it is fill-rate bound. Options: lower pixel ratio and shadow map size, cheaper shadow filter, and antialias off when frame time stays high.
2. **Redraw the shadow map only when shadow casters move.**
3. **Remove the per-frame `document.querySelector('dialog[open]')` in the main loop.** It shows up among the hottest functions in the low-perf profile; track open dialogs on open/close instead.
4. **Skip or throttle the 3D render under opaque fullscreen menus** (mobile).
5. **Instance trees, boulders and resource meshes per kind** (Willowbank ~1,000 and Cinderhold ~1,900 scene objects).
6. **Position enemy health labels with `transform`, not `left`/`top`.** During fights it forces about one layout per frame (~40 layouts/s in `cinderhold-combat`).
7. **Render the dialogue portrait at 30 fps.** `dialogue` spends ~0.9 ms/frame in `world` on dev-gpu versus ~0.1 ms when idle.

## CI (planned)

GitHub Actions on Ubuntu will run `PERF_BUNDLED_CHROMIUM=1 node perf/run.mjs --env ci` after `npx playwright install --with-deps chromium`. Its counters gate pull requests against `perf/baselines/ci.json`. Timings aren't gated there; shared runners are too noisy.
