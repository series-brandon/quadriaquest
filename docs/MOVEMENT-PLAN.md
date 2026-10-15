# Movement plan: diagonal steps and companion following

Status: **implemented (2026-10-15)**; see *As implemented* below. Open questions were decided by the user on 2026-10-15 (see Decisions at the end). Two pieces of work:

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
  - `STEPS`: the orthogonal offsets now, the eight offsets later, each costing one step (RuneScape-style timing, see Phase 2).
  - `stepsFrom(map, tile, {diagonal, passable=canStep})`: yields `{tile, cost}` for each legal neighbour.
  - `canMove(map, from, to, passable)`: the map-aware step rule. Orthogonal steps call `canStep`; diagonal steps use the corner rule below. It lets the "re-route if the path closed" check in main.js validate any step.
- Generalise `findPath` into one A*: `findRoute(map, start, {goal, cost, limit, diagonal, passable, heuristic})` (goal tile or goal predicate, optional occupancy cost, bounded search). `findPath`, `cheapestPath`, `wanderRoute`, `companionRoute` and the footprint searches become thin wrappers. Keep the binary heap. Make tie-breaking deterministic (a sequence number in the heap), because a future server must agree with the client.
- Move every movement loop onto `stepsFrom`: world.js, wander.js, footprint.js, combat.js (push, wander, escape), world-actors.js, townsfolk.js (fields and `next`), companion-follow.js. Leave the terrain and rendering loops alone, and add a one-line comment at each so nobody "fixes" them later.
- Tests: existing suites pass unchanged. That proves the refactor is behaviour-neutral.

## Phase 1: companion following

### Behaviour

| Rule | Proposal (tunable constants in companion-follow.js) |
|---|---|
| Speed | `COMPANION_PACE = .85` of the player's walk (Celerity and Rush included), about 2.0 tiles/s at base. While the player sprints it moves at **2×** that pace: faster than walking, still slower than the sprinting player. Sprint is +100 % in `playerResources.advance`, so the player sprints at (2 + bonus)× and the companion at 2 × .85 × (1 + bonus)×, which is always slower. It follows the player's sprint state frame by frame, so it drops back to walking when the player stops sprinting or runs out of stamina. It walks on the shared step timing (`moveMotion` durations ÷ pace), not its own 3.3 u/s lerp, so diagonal timing and stairs match everyone else. Its hop scales the same way. No separate catch-up trot (decided). |
| When it starts | Stays put while next to the player (any of the 8 surrounding tiles). It starts walking once the player is `FOLLOW_START = 2` or more tiles away (Chebyshev: any direction, diagonals count as 1). |
| Where it goes | Re-plans at each tile boundary toward the player's **current** tile, so it curves after you instead of walking to where you were. |
| When it stops | On any of the 8 tiles around the player (Chebyshev 1). The stop tile must be dry, standable, not the player's tile and not the player's next step tile. It prefers a tile nobody stands on and falls back to an occupied one (drawing on shared tiles already works via `occupancy.top`). It keeps walking while the player keeps walking; the stop check only applies once it is adjacent. |
| Other characters | The route **ignores** occupancy (no `PLAYER_COST` / `OCCUPIED_COST`, no detours around NPCs, enemies or the player). Terrain, water, walls, fences, closed doors and ledges still apply: it never walks through solid things. |
| Teleport | Teleport next to the player when any of these is true: Chebyshev distance > `TELEPORT_DISTANCE = 8`; the route is longer than `TELEPORT_ROUTE = 12` (the player went round a wall or through a door it can't open); no route within the bounded search; the map changed (travel, interiors); or the player was moved instantly (the existing > 3-tile jump check). The bounded A* (`limit` ≈ 400 nodes) doubles as the "too far" test. |
| Landing spot | A ring search outward from the player (replaces the whole-world sort in `spawn`). It prefers the tile **behind** the player (opposite their facing), then the other neighbours. The spot must be standable and steppable from the player's tile (never across a wall or onto a ledge they can't reach), not water, not the player's next step, and preferably unoccupied. If nothing is free within 2 tiles, it waits and tries again next frame. |
| Teleport look | It vanishes from the old spot and **pops in** at the new one: a quick scale-up with a slight overshoot (about .2 s). No puff or hop (decided). |
| Unchanged | Rest here (`following:false`), petting, sitting, scratching and sleeping. The player stopping on its tile still pushes it aside. Approaching it to pet still freezes it (`api.approaching()`). |

Rough feel: when the player walks or sprints without stopping, the companion loses about 0.15 tiles for every tile the player covers (the 2× sprint keeps the ratio at .85). It starts once the gap is 2, then drifts out to the 8-tile teleport over roughly 40 tiles of non-stop travel. Every time the player stops it catches up and settles beside them. If teleports turn out too frequent in play, tune `COMPANION_PACE` or `TELEPORT_DISTANCE` rather than adding a trot.

### Player routes ignore the companion (decided)

The player's own routes currently pay `OCCUPIED_COST` to step around the companion (`playerRouteCost` uses the shared occupancy). With a trailing companion, that makes the player swerve around their own pet. Drop the companion from the player's route cost. NPCs and enemies keep treating it as an occupant.

### Code

- [companion-follow.js](../src/companion-follow.js): replace `companionRoute` with `followRoute(world, start, player, {stopOk, limit})` on the shared `findRoute`, with a goal predicate and no cost. `createCompanionFollower` gets a small state machine (`resting → following → settling`, plus `teleport`), takes its step timing from the shared motion helper ÷ pace, and exposes `teleport(reason)` for the playground.
- [companions.js](../src/companions.js): the conditions for calling `update` stay as they are. Hand it the player's facing, next step, walk multiplier and sprint state (from `playerResources`, not a copy of the formula). Drop the `occupied` argument from route planning; it is still used for choosing the stop tile.
- [main.js](../src/main.js): leave `companionOccupant` out of `playerRouteCost`.
- The model's gait and hop animation stay in [companion-model.js](../src/companion-model.js). The pop-in (scale pop on any group) goes in shared presentation code, so any future teleporting entity can reuse it.

### Playground (same change)

Companions fieldset, controls only:
- **Teleport to me** (calls the real `teleport`).
- **Send away**: places it N tiles behind the player (2, 5, 9). This tests the start threshold, catch-up and teleport-by-distance without walking there.
- Readouts: state (resting, following, settling, teleported), current pace (walk or sprint) and the last teleport reason.
- Tuning sliders for pace, start distance and teleport distance (session-only, resettable).
- Sprint: the existing sprint toggle and a stamina refill cover the 2× pace; verify that explicitly.
- Teleport by route: covered by the existing Walls & doors yard (go inside and lock the door). Ignoring occupants: covered by the Walk-through characters crowd fixture. Confirm both explicitly.

Explanations go in [PLAYGROUND.md](PLAYGROUND.md) → Companions.

### Tests

- Thresholds: no movement while adjacent; starts at 2; stops on an 8-neighbour.
- Ignores occupants: a straight route through a crowd is not bent.
- Never stops on the player or the player's next tile; prefers a free stop tile.
- Pace: tile time = shared step time ÷ (.85 × walk multiplier), halved while the player sprints, on level ground, a hop and stairs. It is always slower than the player in both modes, and drops back when sprint ends or stamina runs out.
- Teleport triggers: distance, long route, no route (locked door), map change, instant player move. The landing is behind the player, never across a wall. The pop-in plays and ends at normal scale.
- The player's routes are not bent by the companion; NPC and enemy routes still are.
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

- **Step time: RuneScape-style (decided).** A diagonal step takes the same time as an orthogonal one (`SLIDE_DURATION`), so diagonals cover √2 the ground per step. One shared step duration fits a future tick-based server. The slide keeps one propulsion cycle per step; on a diagonal it just travels further.
- Path cost: 1 per step in any direction (Chebyshev), which matches the timing. A* heuristic: Chebyshev distance. Occupancy costs are added per tile as now.
- Straightness: with every step costing 1 there are many equally short routes, and an unordered search picks staircases. Break ties deterministically toward the straight line from start to goal (a small cross-product nudge), so a route reads as "diagonal, then straight". Cross-check with RuneScape's fixed neighbour order if that reads better in play.

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
- Travel is faster: with equal-time diagonals, a route of n diagonals takes n steps instead of 2n, **up to 50 % less time** across open ground. That changes tutorial pacing, resource loops, how fast enemies catch you, leash return times, townsfolk schedules and companion catch-up. Walk the tutorials and check that nothing scripted now arrives too early.
- **Melee reach stays cardinal (decided)** (COMBAT.md, "one adjacent cardinal tile"). Diagonal adjacency becomes a common resting spot: a player standing diagonally to an enemy can't hit it or be hit, as in RuneScape. Pursuit and attack-route goals already aim for cardinal reach tiles, so the AI takes one extra orthogonal step. Make sure enemies never idle on a diagonal tile while hostile, and that the player's attack approach never stops on one.
- **Ranges, aggro and leash stay Manhattan (decided)** (attack range > 1, aggro range, 6-tile leash). One diagonal step changes the Manhattan distance by 2, so kiting gets stronger and you leave aggro or leash range sooner by moving diagonally. That is accepted; check that the Bruiser and Cinderhold encounters still feel right and record it in COMBAT.md.
- Ground-target attacks (`lockTiles`, square areas) get more escape options, and a diagonal escape takes no longer than a straight one. Re-check windup timings against the dodge windows in COMBAT.md.
- Push-aside and step-aside could use 8 neighbours. Keep them orthogonal at first: less to verify.

**Presentation**
- Diagonal slides are visibly √2 faster in world units. Check the slide pose still reads as one push, not a skid.
- A diagonal step sweeps past the two corner tiles. A character standing there clips visually for a moment. Everyone is walk-through, so that's acceptable, but look at it in the crowd fixture.
- Facing has 8 directions; the existing shortest-arc turn smooths it. Check the companion and the 2×2 golem.
- `tileAtPosition` rounding mid-diagonal stays on the from/to tiles (x and z move together), so `actor.tile` never reports a corner tile. Keep a test.

**Performance**
- 8 neighbours roughly double the edges looked at per search. BFS becomes A* or Dijkstra.
- Hot spots: the hover route check (`findPath` while the pointer moves; unreachable targets still flood the whole region); `attackRoute` (one `findPath` per in-range tile; worth replacing with a single multi-goal search in Phase 0); townsfolk distance fields (cached, but each rebuild costs more); `findFootprintPath` `limit` (counts pops, so check the golem still finds routes).
- A* with a Chebyshev heuristic makes routes to reachable targets cheaper than today's BFS. Measure with `npm run perf` once after Phase 2 (city-walk, city-crowd, willowbank-river), plus a `--env low-perf` run if main-thread time moves. Record the result in PERFORMANCE.md. Consider a `route-heavy` scenario in `src/dev/perf-scenarios.js` (many enemies pursuing, plus hover routing).

**Future server**
- Routes must be deterministic (ordered ties). Equal-time steps mean one shared step duration the server can also use as its tick.

### Playground (same change)

World & water → **Movement**:
- **Diagonal moves** toggle per walker group (player and companion, NPCs, townsfolk, enemies, bodies). It flips the real `diagonal` option, so you can compare with and without.
- **Route overlay**: draws the planned route for the player, the companion and pursuing enemies. It sits next to the existing occupancy overlay.
- **Combat geometry (for tuning melee and ranges):** melee reach (cardinal or 8-way) and distance metric (Manhattan, Chebyshev or Euclidean) for attack range, aggro and leash. Both are options on the shared combat-range and pursuit code, not playground copies, so a tuned value can become the default with no rewrite. Pair them with the existing Combat practice enemies.
- **Corner yard** fixture near the player: one each of blocked tile, water, wall end, fence, window, counter, closed and open door, a ledge and a stair flight, for testing corner cutting in any map. It reuses the edge fixtures and Walls & doors yard pieces where they already exist.

Explanations go in PLAYGROUND.md.

### Tests

- Corner rule: each blocker kind on B or C or on any of the four edges; ledges and stairs; doorways.
- The reachability invariant on every shipped map (clearing, Willowbank, Cinderhold, Gelton or overworld chunks).
- Chebyshev costs; deterministic and straight-leaning ties.
- Diagonal step duration = orthogonal slide, including speed bonuses, sprint and slows.
- Enemy pursuit still ends on a cardinal reach tile; leash and aggro behave as documented.
- Update the tests that assert exact orthogonal routes (wander, companion, interaction, footprint, edges, townsfolk).

### Docs to update when implemented

DESIGN.md (movement, companion), COMBAT.md (reach, range metric, leash), CITY.md (edges: movement diagonals next to the sight note), PLAYGROUND.md, HANDOFF.md, PERFORMANCE.md (ledger).

---

## Decisions (user, 2026-10-15)

1. **Diagonal timing:** RuneScape-style. A diagonal step takes the same time as an orthogonal one; route cost is 1 per step.
2. **Melee reach:** stays cardinal-only for the first pass. Standing diagonally next to an enemy is a deliberate no-melee spot. Provisional: may be tuned after playtesting diagonals.
3. **Range, aggro and leash:** stay Manhattan for the first pass. Provisional: may be tuned after playtesting diagonals.
4. **Companion and sprint:** the companion moves at 2× its pace while the player sprints. That is still slower than the player, but faster than walking.
5. **Catch-up trot:** none. The sprint speed-up should keep teleports rare; tune pace or distance if they aren't.
6. **Start distance:** the companion starts following once the player is 2 tiles away.
7. **Teleport look:** a simple pop-in.
8. **Player routing:** the player's routes ignore the companion.

---

## As implemented (2026-10-15)

- `world.js`: `canStep` (orthogonal only), `diagonalOk`, `canMove`, `eachStep`, `DIAGONAL_MOVES` (per walker group, all on), `searchRoute` (A* toward a target or Dijkstra over a goal predicate; Chebyshev heuristic with a straight-line tiebreak; deterministic heap) and `routeTo`; `findPath` is a wrapper. Every walker's search uses them: `footprint.js` (`bodyMove`, `findFootprintPath`), `wander.js`, `combat-range.js` (`attackRoute` is now one search instead of a route per in-range tile), `townsfolk.js` (fields, `next`, `route`, `around`; a diagonal never opens a door), `world-actors.js` (walking home), `companion-follow.js`.
- Step timing: the player and townsfolk use `moveMotion` (same duration in any direction); creatures and pushed NPCs scale their slide speed by the step length.
- `combat-geometry.js`: `COMBAT_GEOMETRY` (`meleeReach`, `metric`), `gridDistance`/`tileDistance`, `meleeDistance`, `reachesAcross`. `footprint.js` gained `meleeGap`/`rangeGap`; `withinAttackRange`, `reachesBody`, enemy pursuit, ranged punish range and the leash use them.
- Companion: `companion-follow.js` (`FOLLOW`, `followRoute`, `landingSpot`, the follower state machine), `pop-in.js` (shared pop), `companions.js` (`follow`, `teleport`, `sendAway`, `route`), `main.js` (`walkBonus`, the follow context, player route cost ignores the companion via `occupancy.cost(tile, mover, ignore)`).
- Playground: *World & water → Movement* (diagonal toggles, melee reach, range metric, corner yard, route overlay; `src/dev/movement-fixtures.js`) and the Companions controls (teleport, send away, follow state, tuning).
- Tests: `movement.test.js` (corner rule per blocker, the reachability invariant on the clearing, Willowbank, Cinderhold, capital and overworld maps, straight deterministic routes, per-group toggles, body diagonals, combat geometry, attack approach) and a rewritten `companion-follow.test.js`.
- Not done: the body diagonal is on for the golem (it could be turned off if it reads badly); the corner yard has no solid tile, water or ledge of its own (use the clearing's).
