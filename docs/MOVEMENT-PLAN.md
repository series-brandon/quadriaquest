# Movement plan: diagonal steps and companion following

Status: **plan only (2026-10-15)**, nothing implemented. Two pieces of work:

1. Let walkers step diagonally.
2. Give the companion its own follow behaviour: a bit slower than the player, ignores other characters when it plans a route, starts walking once you're a tile or two away, stops next to you, and teleports to you if you get too far ahead.

Both depend on the same groundwork (Phase 0), so do that first. After it, the companion work (Phase 1) and diagonals (Phase 2) can land in either order. Doing the companion first is cheaper: it then gets diagonals for free when Phase 2 lands.

---

## Where movement lives today

| Concern | Where | Notes |
|---|---|---|
| Step rule | `canStep(from,to)` in [world.js](../src/world.js) | Takes two tiles, no map. Checks that the tile exists, isn't blocked, height change ≤ .5, and the edge passes `move`. `edgeBetween` **only knows orthogonal neighbours** and returns `null` (no edge, so it passes) for anything else. |
| Player routes | `findPath` (BFS, or `cheapestPath` Dijkstra with occupancy cost) in world.js | 4 neighbours, unit step cost. |
| Interaction / attack spots | [interaction-route.js](../src/interaction-route.js), [combat-range.js](../src/combat-range.js) | Cardinal neighbours (and counters 2 away); `attackRoute` runs `findPath` once for **every tile in range**. |
| Multi-tile bodies | [footprint.js](../src/footprint.js) `findFootprintPath`, `bodyStep`, `canStand` | 4 neighbours; `bodyStep` checks each cell's edge. |
| Enemies | [combat.js](../src/combat.js) `bodyRoute`, `pushAside`, `wanderStep`, `win` escape | Leash and aggro use Manhattan distance; melee reach is cardinal (`footprintGap===1`). |
| Wanderers | [wander.js](../src/wander.js) | BFS/Dijkstra, 4 neighbours. |
| Townsfolk | [townsfolk.js](../src/townsfolk.js) `NEIGHBOURS`, `passable`, cached BFS distance fields | Doors are opened on the way. |
| Pushed NPCs | [world-actors.js](../src/world-actors.js) `pushWorldActor`, `updateWorldActors` | 4 neighbours, greedy step home. |
| Companion | [companion-follow.js](../src/companion-follow.js), [companions.js](../src/companions.js) | Dijkstra with occupancy cost to the nearest free cardinal neighbour of the player; moves 3.3 tiles/s with its own lerp and a .65 s hop; respawns next to the player when the map changes or the player jumps > 3 tiles in one frame. `spawn` sorts **every tile in the world** by distance. |
| Step motion and timing | `moveMotion` in [slime-motion.js](../src/slime-motion.js) | Slide `SLIDE_DURATION = 1/2.4` s per tile (≈ 2.4 tiles/s base), hop `STEP_DURATION = .92` s, stairs ramp. Player speed bonuses scale `segment.age` in [main.js](../src/main.js). Townsfolk walk at a `WALK = .72` time scale. |
| Line of sight | `lineOfSight` in combat-range.js | Already handles diagonals (both corner paths must be clear). |

The same `[[1,0],[-1,0],[0,1],[0,-1]]` list is copied into about 20 places. Some of them are **movement** (they should change). Others are **adjacency for terrain or rendering** (they must not): tile-top, world-models shoreline, chunk-terrain, biome-land, city-greens flood fill, countryside water fix-ups, spaces arrival order and portal spawn.

---

## Phase 0: one shared step rule (no behaviour change)

Goal: every walker asks one place "where can I step from here?", so diagonals (and companion rules) change in one spot.

- Add to world.js:
  - `STEPS`: the orthogonal offsets now, the eight offsets later, each with its length (1 or √2).
  - `stepsFrom(map, tile, {diagonal, passable=canStep})`: yields `{tile, cost}` for each legal neighbour.
  - `canMove(map, from, to, passable)`: the map-aware step rule. Orthogonal steps call `canStep`; diagonal steps use the corner rule below. It lets the "re-route if the path closed" check in main.js validate any step.
- Generalise `findPath` into one A*: `findRoute(map, start, {goal, cost, limit, diagonal, passable, heuristic})` (goal tile or goal predicate, optional occupancy cost, bounded search). `findPath`, `cheapestPath`, `wanderRoute`, `companionRoute` and the footprint searches become thin wrappers. Keep the binary heap. Make tie-breaking deterministic (a sequence number in the heap), because a future server must agree with the client.
- Move every movement loop onto `stepsFrom`: world.js, wander.js, footprint.js, combat.js (push, wander, escape), world-actors.js, townsfolk.js (fields and `next`), companion-follow.js. Leave the terrain and rendering loops alone, and add a one-line comment at each so nobody "fixes" them later.
- Tests: existing suites pass unchanged. That proves the refactor is behaviour-neutral.

## Phase 1: companion following

### Behaviour

| Rule | Proposal (tunable constants in companion-follow.js) |
|---|---|
| Speed | `COMPANION_PACE = .85` of the player's **base** walk, about 2.0 tiles/s. It walks on the shared step timing (`moveMotion` durations ÷ pace), not its own 3.3 u/s lerp, so diagonal timing and stairs match everyone else. Its hop scales the same way. |
| When it starts | Idle while within `FOLLOW_START = 2` tiles (Chebyshev: any direction, diagonals count as 1). It starts walking once the player is 3 or more tiles away. |
| Where it goes | Re-plans at each tile boundary toward the player's **current** tile, so it curves after you instead of walking to where you were. |
| When it stops | On any of the 8 tiles around the player (Chebyshev 1). The stop tile must be dry, standable, not the player's tile and not the player's next step tile. It prefers a tile nobody stands on and falls back to an occupied one (drawing on shared tiles already works via `occupancy.top`). It keeps walking while the player keeps walking; the stop check only applies once it is adjacent. |
| Other characters | The route **ignores** occupancy (no `PLAYER_COST` / `OCCUPIED_COST`, no detours around NPCs, enemies or the player). Terrain, water, walls, fences, closed doors and ledges still apply: it never walks through solid things. |
| Teleport | Teleport next to the player when any of these is true: Chebyshev distance > `TELEPORT_DISTANCE = 8`; the route is longer than `TELEPORT_ROUTE = 12` (the player went round a wall or through a door it can't open); no route within the bounded search; the map changed (travel, interiors); or the player was moved instantly (the existing > 3-tile jump check). The bounded A* (`limit` ≈ 400 nodes) doubles as the "too far" test. |
| Landing spot | A ring search outward from the player (replaces the whole-world sort in `spawn`). It prefers the tile **behind** the player (opposite their facing), then the other neighbours. The spot must be standable and steppable from the player's tile (never across a wall or onto a ledge they can't reach), not water, not the player's next step, and preferably unoccupied. If nothing is free within 2 tiles, it waits and tries again next frame. |
| Teleport look | A short pop-out at the old spot and a small drop-in hop at the new one: the existing companion `jump` state starting from a raised height, plus a puff. See open questions. |
| Unchanged | Rest here (`following:false`), petting, sitting, scratching and sleeping. The player stopping on its tile still pushes it aside. Approaching it to pet still freezes it (`api.approaching()`). |

Rough feel: when the player walks without stopping, the companion loses about 0.15 tiles for every tile the player walks. It waits until the gap is 3, then drifts from 3 to the 8-tile teleport over roughly 35 tiles of non-stop walking, and sooner when sprinting. Every time the player stops it catches up and settles beside them.

### Related change worth making together

The player's own routes currently pay `OCCUPIED_COST` to step around the companion (`playerRouteCost` uses the shared occupancy). With a trailing companion, that makes the player swerve around their own pet. Proposal: drop the companion from the player's route cost. NPCs and enemies keep treating it as an occupant.

### Code

- [companion-follow.js](../src/companion-follow.js): replace `companionRoute` with `followRoute(world, start, player, {stopOk, limit})` on the shared `findRoute`, with a goal predicate and no cost. `createCompanionFollower` gets a small state machine (`resting → following → settling`, plus `teleport`), takes its step timing from the shared motion helper ÷ pace, and exposes `teleport(reason)` for the playground.
- [companions.js](../src/companions.js): the conditions for calling `update` stay as they are. Hand it the player's facing and next step. Drop the `occupied` argument from route planning; it is still used for choosing the stop tile.
- [main.js](../src/main.js): leave `companionOccupant` out of `playerRouteCost`.
- The model's gait and hop animation stay in [companion-model.js](../src/companion-model.js). The pop-in effect goes in shared feedback, so any future teleporting entity can reuse it.

### Playground (same change)

Companions fieldset, controls only:
- **Teleport to me** (calls the real `teleport`).
- **Send away**: places it N tiles behind the player (2, 5, 9). This tests the start threshold, catch-up and teleport-by-distance without walking there.
- Readouts: state (resting, following, settling, teleported) and the last teleport reason.
- Tuning sliders for pace, start distance and teleport distance (session-only, resettable).
- Teleport by route: covered by the existing Walls & doors yard (go inside and lock the door). Ignoring occupants: covered by the Walk-through characters crowd fixture. Confirm both explicitly.

Explanations go in [PLAYGROUND.md](PLAYGROUND.md) → Companions.

### Tests

- Hysteresis: no movement within 2 tiles; starts at 3; stops on an 8-neighbour.
- Ignores occupants: a straight route through a crowd is not bent.
- Never stops on the player or the player's next tile; prefers a free stop tile.
- Pace: tile time = shared step time ÷ .85, on level ground, a hop and stairs.
- Teleport triggers: distance, long route, no route (locked door), map change, instant player move. The landing is behind the player, never across a wall.
- Ring search doesn't scan the whole map. Assert on a 2048-wide sparse map.
- Existing rescue and ledge-hop tests keep passing.

## Phase 2: diagonal steps

### The corner rule (the important part)

A diagonal step from A to D, with orthogonal intermediates B and C, is allowed only if:

1. both L-paths are legal: `canStep(A,B) && canStep(B,D) && canStep(A,C) && canStep(C,D)` (no corner cutting past a blocked tile, water, a wall, fence, railing, window, counter or closed door on any of the four edges); and
2. all four tiles are **level** (same `h`) and none is a stair tile. Hops and stair ramps stay orthogonal.

This matches how `lineOfSight` already treats diagonals. It has a useful consequence: **reachability doesn't change.** Any allowed diagonal can be replaced by two orthogonal steps, so map checks, "No way there", the "no safe route" hover tooltip, the door rule and quest gating all give the same answers. Only the shape, length and timing of routes change. Keep a test that proves this on every shipped map: same reachable set with and without diagonals.

Doorways: the door rule (a wall on each side of every door) together with condition 1 means nobody can step diagonally through a doorway. Townsfolk `passable` never opens a door for a diagonal step.

### Cost and timing

- Path cost: 1 for orthogonal, √2 for diagonal (octile). A* heuristic: octile distance. Occupancy costs are added per tile as now.
- Step time: diagonal = √2 × the orthogonal slide, so speed in world units is the same in every direction. The slide keeps one propulsion cycle per step, stretched over the longer step. The alternative is RuneScape's rule (a diagonal takes the same time as an orthogonal step, so diagonals are 41 % faster). That only makes sense on a tick-based server. See open questions.
- Straightness: equal-cost routes can still zigzag. Break ties toward the straight line from start to goal (a small cross-product nudge), so a route looks like "diagonal, then straight" rather than a staircase.

### Rollout by walker

Add a `diagonal` option per walker kind, so each group can be switched on and checked on its own:

1. Player (click-to-move, interaction and attack approaches) and companion.
2. World-actor NPCs and wanderers (wander.js; pushes stay orthogonal).
3. Townsfolk (distance fields become Dijkstra; doors orthogonal only).
4. Size-1 enemies (pursuit, patrol, leash return).
5. Multi-tile bodies (golem) last, or never. A diagonal for an N×N body needs both orthogonal intermediate anchors to `canStand` and `bodyStep`.

### What could go wrong

**Correctness**
- **Walls leak.** `edgeBetween` returns `null` for diagonals, so any code that calls `canStep` on diagonal tiles walks through walls and closed doors. Phase 0 removes direct `canStep` calls from search loops. Add a test that `canStep` on non-neighbours throws, or route it through `canMove`.
- **Corner cutting** past trees, rocks, stations, water corners, railings, bridge ends (the Willowbank bridge is a narrow lane over water) and building corners. The corner rule covers all of these. Test each.
- **Ledges and stairs**: diagonal hops would need a new hop motion, and a diagonal across a wide flight of stairs would cut the ramp. Excluded by condition 2.
- **Scripted routes**: Willowbank's rescue walk (`rescueStandAsideRoute` checks the route never crosses the lane), `walkRoute` callers and tutorial checkpoints that expect particular tiles. Re-verify the rescue, bridge injury and finale.
- The mid-route re-route in main.js (`!canStep(tile,path[0])`) must use `canMove`.

**Gameplay and balance**
- Travel is faster: across open ground a route of n diagonals takes n·√2 slides instead of 2n, about 29 % less time. That changes tutorial pacing, resource loops, how fast enemies catch you, leash return times, townsfolk schedules and companion catch-up.
- **Melee reach stays cardinal** (COMBAT.md, "one adjacent cardinal tile"). Diagonal adjacency becomes a common resting spot: a player standing diagonally to an enemy can't hit it or be hit. Pursuit and attack-route goals already aim for cardinal reach tiles, so the AI takes one extra orthogonal step. Decide whether that safe spot is a feature (RuneScape has it) or should go (diagonal melee reach).
- **Ranges and leashes are Manhattan** (attack range > 1, aggro range, 6-tile leash). With diagonal movement, a Manhattan range is a diamond and a diagonal step changes it by 2. Kiting gets easier, and leaving aggro or leash range diagonally happens sooner. Consider Chebyshev or Euclidean ranges as a separate combat decision.
- Ground-target attacks (`lockTiles`, square areas) get more escape options and diagonal escapes take √2 longer. Re-check windup timings against the dodge windows in COMBAT.md.
- Push-aside and step-aside could use 8 neighbours. Keep them orthogonal at first: less to verify.

**Presentation**
- A diagonal step sweeps past the two corner tiles. A character standing there clips visually for a moment. Everyone is walk-through, so that's acceptable, but look at it in the crowd fixture.
- Facing has 8 directions; the existing shortest-arc turn smooths it. Check the companion and the 2×2 golem.
- `tileAtPosition` rounding mid-diagonal stays on the from/to tiles (x and z move together), so `actor.tile` never reports a corner tile. Keep a test.

**Performance**
- 8 neighbours roughly double the edges looked at per search. BFS becomes A* or Dijkstra.
- Hot spots: the hover route check (`findPath` while the pointer moves; unreachable targets still flood the whole region); `attackRoute` (one `findPath` per in-range tile; worth replacing with a single multi-goal search in Phase 0); townsfolk distance fields (cached, but each rebuild costs more); `findFootprintPath` `limit` (counts pops, so check the golem still finds routes).
- A* with an octile heuristic makes routes to reachable targets cheaper than today's BFS. Measure with `npm run perf` once after Phase 2 (city-walk, city-crowd, willowbank-river), plus a `--env low-perf` run if main-thread time moves. Record the result in PERFORMANCE.md. Consider a `route-heavy` scenario in `src/dev/perf-scenarios.js` (many enemies pursuing, plus hover routing).

**Future server**
- Routes must be deterministic (ordered ties). The timing choice (√2 vs tick) should be one shared constant the server can also use.

### Playground (same change)

World & water → **Movement**:
- **Diagonal moves** toggle per walker group (player and companion, NPCs, townsfolk, enemies, bodies). It flips the real `diagonal` option, so you can compare with and without.
- **Route overlay**: draws the planned route for the player, the companion and pursuing enemies. It sits next to the existing occupancy overlay.
- **Corner yard** fixture near the player: one each of blocked tile, water, wall end, fence, window, counter, closed and open door, a ledge and a stair flight, for testing corner cutting in any map. It reuses the edge fixtures and Walls & doors yard pieces where they already exist.

Explanations go in PLAYGROUND.md.

### Tests

- Corner rule: each blocker kind on B or C or on any of the four edges; ledges and stairs; doorways.
- The reachability invariant on every shipped map (clearing, Willowbank, Cinderhold, Gelton or overworld chunks).
- Octile costs; deterministic and straight-leaning ties.
- Diagonal step duration = √2 × slide, including speed bonuses and slows.
- Enemy pursuit still ends on a cardinal reach tile; leash and aggro behave as documented.
- Update the tests that assert exact orthogonal routes (wander, companion, interaction, footprint, edges, townsfolk).

### Docs to update when implemented

DESIGN.md (movement, companion), COMBAT.md (reach, range metric, leash), CITY.md (edges: movement diagonals next to the sight note), PLAYGROUND.md, HANDOFF.md, PERFORMANCE.md (ledger).

---

## Open questions (decide before implementing)

1. **Diagonal timing**: √2 per diagonal (same speed in every direction; recommended) or RuneScape-style equal time (diagonals 41 % faster, tick-friendly)?
2. **Diagonal melee reach**: keep cardinal-only (the diagonal safe spot stays; recommended for now) or allow diagonal melee and interaction?
3. **Range metric**: keep Manhattan for range, aggro and leash, or move to Chebyshev or Euclidean with diagonals?
4. **Companion and sprint**: should the companion's pace follow the player's *current* speed (Celerity, Rush), so sprinting doesn't make it teleport much more often, or stay tied to base walk?
5. **Companion catch-up**: with teleporting roughly every 35 tiles of non-stop walking, is that the intended feel, or should it break into a short trot when more than ~5 tiles behind?
6. **Start distance**: start following at 3 tiles (a two-tile gap; proposed) or at 2?
7. **Teleport look**: pop-and-hop with a puff (proposed), a plain blink, or something themed (it runs to the edge of the screen)?
8. **Player routing around the companion**: drop the companion from the player's route cost (proposed)?
