# Cities, buildings and doors (design draft)

Draft, 2026-10-10. Nothing here is implemented. It is the design for review before any code. Numbers are starting proposals to check in a graybox, not final tuning.

**Decisions already made by the user (2026-10-10):**
- **Hybrid interiors.** Small and medium buildings open in place: the roof lifts and the walls are cut to one storey. Large or multi-storey interiors (castle, inn upstairs, guild halls) are separate spaces entered through a door.
- **No stacked walkable layers yet.** Outdoors keeps one floor height per tile. Elevation comes from terraces and stairs. Upper floors are separate interior spaces. Castle walkways over a gate, bridges over streets and walkable balconies are out of scope for the first city.
- **Cities are built in a playground city editor**, not by typing tile strings.
- **Design doc first**, then build in the phases below.

**Answers to the first review (user, 2026-10-10):**
- **The capital** is the capital of the kingdom the player starts in, and it's very large (within reason for a game). Name to be decided; "the capital" is the working name. Look: a fantasy city of wood, plaster and stone buildings, brick and stone roads and paths, fountains and benches. **The player wakes at the Iter Crystal in the town square** after the tutorial, so the square is the first thing the real world shows.
- **Most buildings' ground floors are part of the overworld** (they open in place). Separate spaces are for upper floors, instances, very large or unique interiors, and dungeons. They follow the outside or ground-floor footprint as a rule of thumb, with sensible exceptions (see *Interior size rules*).
- **All living characters can be walked through**; every other entity stays solid. This changes what "blocked" means across the game (see *Walk-through entities*, implemented as Phase 0).
- **No day/night clock in the prototype**, but it's on the feature list. Routines, lamps and shop hours are designed so a clock can be added later without reworking them.
- **Not every building or floor has to be enterable.**
- **An economy is vital for the prototype.** Pacifists earn money through a task/job system and by selling what they craft and forage. Shops in the city are real shops. The economy gets its own design doc; the city provides the buildings, counters and shopkeepers it uses.

The city follows the same rules as everything else (AGENTS.md). Buildings, doors, props and townsfolk are portable shared entities. A city map supplies placement, configuration and story context only. Every new piece is reachable, repeatable and resettable in the playground in the same change.

## What has to feel right

- **Readable from above.** The camera looks down at an angle and orbits, so roofs are most of what the player sees. Roof shape and colour say what a building is and which district it's in before any sign does.
- **Believable scale.** Doors fit a slime. Rooms have room to turn around. Streets fit traffic. Stairs read as stairs. The castle is a landmark you can see from the plaza.
- **Never lose the player.** Buildings must not hide the player, a target or a door they're trying to click.
- **Easy to rearrange.** Moving a building or swapping it for another size must not break its walls, doors, collision or the street in front of it. Layout rules are checked automatically, not by eye.
- **Alive but affordable.** Many townsfolk going about routines that make sense (benches, stalls, fountain, chatting, going indoors), within a frame budget that holds on phones.

## What today's world can't do

| Today | Where | Why cities need more |
| --- | --- | --- |
| A tile stores one height plus `blocked` / `blocksSight` / `water` | `world.js` | Walls, doors, windows and fences sit on the boundary *between* tiles. Tile-thick walls make cramped, blocky rooms and give a door nowhere to sit. |
| Walls are tall blocked tiles (Cinderhold) | `cinderhold-rules.js` | Fine for caves. A building needs thin walls. |
| Each caller checks steps itself (`|Δh| ≤ .5`, `blocked`) | `findPath`, `wanderRoute`, `companion-follow`, `interaction-route`, `footprint.canStand` | Every caller would need to learn about edges. There should be one shared `canStep(a, b)` instead. |
| Line of sight checks only tiles | `combat-range.js lineOfSight` | Shots, sight and aggression must also stop at walls on edges. |
| Occupancy writes `tile.blocked` | `world-occupancy.js` | A statue's or wall's permanent blocking is mixed with who is standing there right now. Removing an NPC could unblock a fountain. The two need separating, and characters should stop blocking entirely (*Walk-through entities*). |
| `attackRoute` scans every tile in the world | `combat-range.js` | Fine for a 40 × 32 area, too slow for a city. Searches need a radius limit. |
| A whole area loads at once | `area-runtime.js` | A capital is large. It should build on the chunk streamer (`chunk-streamer.js`, 32 × 32 chunks). |
| A route is a fresh breadth-first search per walker | `world.js findPath` | Dozens of townsfolk need cheaper shared navigation. |

Already fine: half-block steps make stairs work as a run of +0.5 tiles. `footprint.js` supports multi-tile bodies (the 2×2 golem) for fountains, statues and stalls. The terrain batcher and streamer's chunk meshes keep static draw calls low.

## Scale rules (proposal)

A tile is about one slime wide, and a slime is about one block tall.

| Thing | Rule |
| --- | --- |
| Door | One tile edge wide. Double doors cover two edges (castle, hall). Always a clear **doorstep** tile outside. |
| Ground floor | **At street level** (user decision, 2026-10-11: a step up at every door feels bad). Door sills for genuinely different floor heights remain supported, but buildings don't use them by default. |
| Storey height | **1.5 blocks** of wall per floor. Taller looks realistic but hides the street from the camera. |
| Small building | 3 × 3 to 4 × 4 tiles, one room, opens in place. Cottage, shed, kiosk. |
| Medium building | 5 × 4 to 7 × 6, one or two rooms, opens in place. Shop, smithy, small house, tavern ground floor. |
| Large building | 8 × 8 and up, or more than one storey. Separate interior. Inn, guild hall, temple. |
| Castle | A landmark of about 24 × 20 on the highest terrace. Separate interiors, with a grand stair and a view from the plaza. |
| Main avenue | 5 tiles wide. Street 3, alley 2. Never narrower than 2, so two slimes can pass. |
| Plaza | At least 12 × 12, with a focal point (fountain or statue) and benches around it. **The square is the liveliest place in the city** (user, 2026-10-11): ringed shoulder to shoulder by multi-storey buildings whose ground floors open onto it, gaps only for the streets, and later stalls, benches and crowds (Phases 5 and 8). |
| Lot spacing | Buildings are at least one tile apart, or share a wall deliberately (terraced row). Never a one-tile slot that leads nowhere. |
| Stairs | 1 tile per half-block. 2–3 tiles wide on main routes, 1 on back routes. A landing after every 2 blocks of rise. |
| Roof overhang | 0.25 tile. It must not cover the doorstep from the default camera angle. |

Exact numbers get tuned in the graybox (Phase 2) at real zoom levels on desktop and phone.

**Graybox findings (Phase 2, 2026-10-11; playground *Graybox street*).** Judged at zoom 12, 22 (default) and 34, on desktop and a 375 × 812 phone, with roofs on and off:
- **Roofs are most of the picture.** With flat grey slabs the street reads as bunkers; the shape and colour of roofs (Phase 4) will carry the look, as expected. Toggling roofs off shows the raised floors and room sizes clearly.
- **Storey height 1.5 works for one storey:** the camera sees over single-storey houses into the next street. **Two-storey buildings (3.0) hide the street behind them** at the default angle, and on a phone a two-storey roof can fill a third of the screen. That makes Phase 3's ghosting of buildings that hide the player essential, not optional. Proposal: keep 1.5 per storey; keep multi-storey buildings to the edges of the square and main avenue, not both sides of narrow streets.
- **Street widths hold:** the 5-wide avenue reads as the main road, 3-wide streets as streets. **2-wide alleys work between single-storey buildings;** between taller ones they would be hidden. Proposal: alleys only beside single-storey buildings.
- **The 13 × 13 square** fills most of a desktop view at the default zoom, with the crystal and fountain in sight: a good waking view. A phone in portrait shows about 8 tiles across even at the farthest zoom; **phones keep that limit** (user, 2026-10-11).
- **User review (2026-10-11):** the first square felt sparse; it is now ringed by two- and three-storey buildings shoulder to shoulder. That makes the square mostly hidden at the default angle until Phase 3's ghosting, which confirms Phase 3 as the next step. The minimap now shows buildings (indoor floors, walls, windows, doors) and turns with the camera.
- ~~Raised ground floors~~: rejected by the user (a step at every door feels bad); ground floors are at street level. The door (1.3) suits the slime.
- **Terraces:** a full-block retaining edge reads clearly as a level change. Stairs drawn as plain half-block ledges read as small steps, not stairs: the stair prefab (Phase 5) is needed.
- **Castle:** three storeys (4.5) with four-storey towers reads as a landmark from the avenue; its door looks small on that much wall (a larger gate is a Phase 4 kit piece).

## Walls and doors on tile edges

**Data.** Each tile can carry edge features on its north and west sides only. The south and east edges belong to the neighbouring tile, so each edge is stored once. A helper `edgeBetween(world, a, b)` returns the feature or null. Edge kinds:

| Kind | Movement | Sight / shots | Reach (melee, talk) | Examples |
| --- | --- | --- | --- | --- |
| `wall` | blocks | blocks | blocks | Building walls, castle walls |
| `window` | blocks | allows | blocks | Shop windows, open arches with a sill |
| `door` | only while open (never when locked) | only while open | only while open | Every entrance |
| `fence` / `railing` | blocks | allows | blocks | Gardens, stair rails, the plaza edge |
| `low` | blocks | allows | allows | Market and shop counters, flower bed rims |

**One shared step test.** `canStep(world, from, to, mover)` combines height, `blocked`/`solid`, water, the edge feature and door rules. It replaces the separate checks in pathfinding, wandering, companion following, interaction routes and `canStand` (whose body also can't straddle an internal wall). `lineOfSight` uses the same edge table, including the corner rule its supercover already applies. This is the riskiest change in the plan, because every walker and every combat check moves onto it. It ships with tests for each caller and is verified in the clearing, Willowbank and Cinderhold, which have no edges, to prove nothing changes there.

**Permanent blocking versus occupancy.** Since Phase 0, `tile.blocked` means solid only (terrain, resources, stations, props, practice targets); characters never write it. Who is standing on a tile is a separate question used only for where to stop (see *Walk-through entities*). Edge features add to `blocked`; they don't replace it.

**Doors are a shared entity**, the same model and behaviour in any map (user decision, 2026-10-10, RuneScape-style):
- **A closed door blocks walking, sight and reach like a wall.** No route passes through one; it has to be opened first. An open door is like no edge at all.
- **Clicking a door** walks you up to it on whichever side is nearer and opens it (with a creak), or closes it if open (with a thud). Doors stay as they were left; nothing opens or closes them automatically.
- **Doors open inwards** (user decision, 2026-10-11): into the building or room they belong to (the first tile given when the door is placed). An open door turns a quarter and lies along that tile's side edge at its hinge corner, where it is a wall: nobody walks or sees through the door itself.
- **The door rule** (user decision, 2026-10-11): along a door's wall line there is at least one wall or window on each side of it before any perpendicular wall, so nothing meets the door's corners and an open door always has a free edge to lie on. `doorProblems` checks a door; `createEdgeFeatures().doorProblems()` checks a map (the building test map refuses to build if any door breaks it; the city editor will list them).
- A **locked** door won't open: clicking it rattles it and says "It's locked." Story or keys can unlock it. No door is locked just to hide an empty room.
- A walker whose planned route closes (a door shut or locked on the way) re-routes or stops ("The way is shut.").
- A door may later link to an **interior space** (Phase 7): its doorstep and the interior's arrival tile become part of its data, and the editor checks them.

**As implemented (Phase 1, 2026-10-10):**
- `world.js`: `EDGE_RULES` (move / sight / reach per kind), `edgeBetween`, `setEdge`, `edgePasses`, and the one shared `canStep(from,to)` used by every route search (`findPath`, cheapest-route searches, `wanderRoute`, `companionRoute`, NPC pushes and walks home). `footprint.js`: `canStand` rejects a wall inside a body, `bodyStep` checks the edges a moving body crosses, `reachesBody` is melee/interaction reach across an edge.
- Sight: `lineOfSight` checks every edge it crosses (diagonals check both corner paths). Reach: `withinAttackRange` at range 1, `interactionRoute`, and enemy reach (`adjacent`, `inReachOf`, pursuit goals) need an edge that allows reaching across, so nobody melees or talks through a wall or window; a counter (`low`) allows it. An enemy that sees the player through a window walks around to strike; one behind a wall never notices.
- Moving walkers re-check each step: the player re-routes or stops if the planned route closes; the companion and wandering enemies drop the step.
- `doors.js`: the door entity (`createDoor`, `updateDoors`, `configureDoors`, `doorApproach` for walking up to either side) and `createEdgeFeatures`, which places walls, windows, fences, railings, counters and doors in any map. `edge-models.js` holds the pieces (one plaster-and-timber look until the building kit, Phase 4). Parts stack without overlapping (stone base, plaster, timber cap), and `createEdgeFeatures` puts one timber post on each grid corner where walls, windows or doors meet, slightly thicker and taller than the pieces, so joints never flicker. A door is faced at its edge midpoint, so the player turns toward it from either side.
- Playground: *World & water → Walls & doors* builds a 3×3 room near the player in any map (door facing you, window opposite, counter and fence on the sides), opens or closes the door, walks in, locks it, removes it, and toggles an edge overlay. **Enter building test map** loads a playground-only map (`src/dev/building-test-map.js`) with a small house (one door), a large hall (two doors) and a complex building whose 3-wide hallway leads to four rooms, each with its own door. A second row along a southern road tests shapes: an L (one building, and the same L split by a solid wall into two joined buildings with a door each), a T, a U with a courtyard (and a courtyard door), a + and a Tetris S/Z. Shapes are written as small text grids (one letter per building part) and walled by one shared outline rule; a door or window named off a building's outline is an error. Every door starts closed. The model catalogue has *Wall pieces* and *Door* (Open, Close, Locked).
- Not done yet: NPCs and creatures opening doors themselves (they currently treat closed doors as walls), door links to interiors (Phase 7) and the cutaway (Phase 3). Existing maps have no edges and behave as before.

## Walk-through entities (user decision, 2026-10-10; Phase 0, implemented 2026-10-10)

The user wants every living character to be walkable-through, especially large ones, which changes what "blocked" means across the whole game. It touches combat, companions, interactions and every map, not only cities, so it gets its own review and lands **before** city Phase 1 builds on the step test. Starting proposal:

- **Movement is decided by the world, not by who is standing there.** Terrain, walls and edges, and solid world objects block movement. Characters never do: the player, companions, NPCs, townsfolk and enemies of any size. The reference is classic RuneScape, where characters don't block each other but objects do.
- **Passing versus stopping.** Routes may go through anyone. A walker's *final* tile avoids an occupied tile when a free one works as well (for example a free tile beside an NPC for talking, or beside an enemy for fighting), so characters rarely end up stacked. When two do share a tile briefly, a small visual nudge keeps both readable. Logical positions stay on whole tiles.
- **Large creatures:** the golem's 2×2 body stops blocking its tiles. Fighting still happens from beside its body (`footprintGap`), so running *through* it is allowed but never a way to attack from inside it. Its territory and leash rules are unchanged.
- **What stays solid (user, 2026-10-10):** every non-character entity blocks: walls, buildings, props such as fountains, statues, stalls and benches, stations (furnace, anvil, campfire), and resources such as trees and rocks. Every living character can be walked through: the player, other players and slimes, NPCs, enemies and companions.
- **Code impact:** `world-occupancy.js` stops writing `tile.blocked`. `blocksMovement` turns into a choice of where to stop, not a collision. Tests cover pathfinding, `canStand`, interaction routes, attack routes, companion following, wandering, portal spawns and enemy pursuit in all three tutorial maps. Each prefab's movement policy (`group.userData.blocksMovement`) stays the single source for whether it is a solid object or a character.
- **Playground:** a toggle overlay showing solid tiles versus occupied tiles, plus a fixture that walks the player and a companion through a crowd of townsfolk and through the golem.

**Occupied tiles and pushing (user decision, 2026-10-10, RuneScape-style):**
- Every living character marks its tile **occupied**. Occupied tiles never block; they cost extra in route searches (`OCCUPIED_COST` 5 steps). A tile holding a **player** costs far more (`PLAYER_COST` 30), so NPCs almost never walk through a player. Walkers go around when the detour is short, pass through when it isn't or there is no other way, and avoid stopping on anyone.
- **Pushing:** when a player *stops* on another character's tile, that character steps to a free neighbouring tile. Hostile creatures do so while staying locked on and continuing their attack. Characters configured `push: 'never'` (all tutorial NPCs: mentors, Reed) never move; the player draws on top and the NPC is hidden until the player moves on. If there is nowhere free to go, the character stays hidden under the player the same way.
- **Home:** a pushed NPC walks back to its home tile once it is free (after about 2 s). Wandering creatures keep to their home (patrol) area: pushed outside it they walk back in; pushed far beyond it (8+ tiles) or with no way back, they reappear at home.

**As implemented (2026-10-10):**
- `world-occupancy.js`: `markCharacter(group)` marks living characters (`makeSlime` marks every slime; `enemy-entity.js` marks creatures). One shared `occupancy` map (`place`, `remove`, `owners`, `occupied`, `cost`). Practice targets, resources, stations and props stay solid (`tile.blocked`).
- Route searches take a cost: `findPath(map,start,end,cost)` and `findFootprintPath(…,{cost})` (cheapest-route searches), `wanderRoute(…,cost)`, `companionRoute`. The player's routes, interaction and attack approaches use `occupancy.cost`; `combat.js` `bodyRoute` adds the player's route and other enemies.
- Registration: the player and companion each frame (`main.js`), creatures as they move (`combat.js` `move`/`release`), NPC world actors at creation (`world-actors.js`, `setWorldOccupancy`).
- Pushing: `main.js` `resolveStanding` (NPCs: `pushWorldActor`, `updateWorldActors` for the slide and return home; `push:'never'` and no-space cases hide under the player), `combat.js` `pushAside` and `homeward` (calm creatures, patrol area, `HOME_FAR`), `companions.js` (the companion yields when the player stops on it).
- **Playground:** *World & water → Walk-through characters* spawns a townsfolk crowd (one set to stay put) or a passive golem on a clear lane ahead, walks past it, stops on a townsfolk that steps aside or on the one that stays put, and toggles an overlay (red solid, blue occupied).

## Seeing inside (hybrid)

### Buildings that open in place (small and medium)

- A building knows its interior tiles. When the player is inside, its roof hides and its walls are cut to one storey; a building that hides the player from the camera is cut the same way (user, 2026-10-11: simpler than stubs and ghosting; see *As implemented (Phase 3)*). Clicks go through hidden parts.
- Furniture is ordinary props with footprints. Counters are `low` edges or props that shopkeepers stand behind.

### Separate interiors (large and multi-storey)

- An interior is a small **space** linked from a door (and stairs, for upper floors). Entering it is a quick fade (about 0.3 s), not a full area switch. The city stays as it was. Townsfolk inside are part of the interior.
- Upper floors and cellars are further spaces linked by a shared **stairwell** entity: a stair model plus a link and arrival tile. Climbing reuses the same fade.
- Camera inside: zoom is capped so the view stays within the walls, and the camera can't orbit through walls.
- Built on travel's existing safe-arrival checks and cancellation (unfinished work cancels, committed state is kept). There are no per-building special transitions.

### As implemented (Phase 3, 2026-10-11; simplified with Phase 4)

The first version (front walls to stubs, a dithered see-through cylinder) was more than needed (user, 2026-10-11). Now whole buildings are cut, in `src/cutaway.js`, in any map:
- A building is **cut** when the player stands in it (`tile.building`), stands within two tiles of its walls on the same level (`NEAR_CUT`, user 2026-10-11: walking up to a door shows the inside), or when it stands between the camera and the player (the eye-to-camera segment against the part of its box above one storey). Up to 16 at once, nearest first.
- A cut building loses its roof (and chimney) and the upper part of its doors, and **all its walls are drawn only up to one storey** (1.5, the height of the building test map's walls). A second pass draws the inside of cut walls as one flat dark face, pulled slightly towards the camera so the faces where a wall's stacked parts meet never flicker through the cut; cut walls stop casting their upper shadows. Multi-storey buildings have floors between storeys, which hide with the roof.
- Walls are cut per pixel from their baked `cutOwner` (building a, building b, base height): a wall between two buildings is cut with either, and so is a corner post where they meet. Doors, roofs and decorations hide in JS.
- Maps declare buildings with `tile.building` and `owner` on their edges; roofs and other hiding parts are added with `edges.addCutPart(object, building)`. Each map's edge features report building boxes and hiding parts; only shown maps take part, so maps may reuse ids. The building kit does all of this itself.
- Clicks pass through: walls and roofs are never pickable. The lowest render tier's simpler materials keep the cutaway.
- Playground: *City streets → Toggle cutaway*, and *Force cutaway* (every building cut, like the building test map); `getState().cutaway` = `{on, force, cut}`.
- Not done: smoothing the hide (it's instant), and camera behaviour inside separate interiors (Phase 7).

### As implemented (Phase 7, 2026-10-11)

- `src/spaces.js`. A building with `interior: 'separate'` is solid outside; its doors carry a link. Its interior is one space per floor (`buildSpace`), in the same tile coordinates as its footprint, with the outside's doors and windows, a stairwell entity on the same tile on every floor (up from all but the top, down from all but the ground; default: the corner farthest from the door), and furniture from the prop set. Interior floors sit on thin slabs over a dark background.
- `createSpaces` moves between spaces with a quick fade (0.25 s out, 0.25 s in), not a full area switch: the city stays as it was. It builds a building's spaces on first entry, registers them as areas, caps zoom inside (14; dungeons 18), restores your camera when you come back out, and drops a rebuilt city's spaces (`forget`). The door back out lands you on the doorstep.
- Dungeon entrances are props (`dungeonEntrance`) linking to a dungeon space in `data.interiors` (size, exit, furniture).
- Checks (`interiorProblems`): interior floors versus storeys outside, a stairwell inside the footprint and off the door tiles, a door; a dungeon at least 4 × 4 with its exit inside and an entrance in the city.
- Playground: the kit street's guild house (two floors) and the garden's crypt. `areas.unregister` was added for rebuilt interiors.

### Interior size rules (user decision, 2026-10-10)

- **Most ground floors are overworld**, open in place. Only large or unique ground floors are separate spaces.
- **Separate spaces follow the footprint they sit in, as a rule of thumb.** A separate ground floor matches the building outside. An upper floor matches the floor below.
- **Normal exceptions:** smaller upper floors (attics, towers, floors under a sloped roof) and partial basements or cellars. Neither may extend beyond the building's outside footprint.
- **Dungeons and caves** may be any size behind a small entrance (a cave mouth, a trapdoor, a well). With **more than one entrance**, the overworld distance between entrances has to make sense of the distance inside. A 100-tile dungeon can't have its two ends five tiles apart outside.
- **Editor checks:** a separate floor or basement outside its building's footprint is an error unless marked as an exception with a reason. For linked entrances, the editor compares overworld distance with the shortest walk inside and warns when they disagree by a large factor (starting at 3×, to tune).
- **Not every building or floor needs to be enterable.** A decorative building has no door, or a door that is visibly shut ("It's locked." / "Nobody's home."). The editor allows it but lists decorative buildings so it's always a deliberate choice.

## The building kit

Buildings are **made from a short description, not modelled by hand**:

```js
{id:'baker', footprint:[6,5], floors:1, roof:'gable', ridge:'x', style:'timber',
 doors:[{edge:'south', at:2}], windows:'auto', chimney:true,
 sign:{icon:'bread', edge:'south'}, awning:'striped', interior:'inPlace', seed:17}
```

- **One builder** turns the description into the model (walls, corners, trim, windows, door frames, roof, chimney, awning, sign, flower boxes) *and* its gameplay data: edge features, solid tiles, doors, interior tiles, doorstep, and anchor points for a shopkeeper's spot, lanterns and the sign. The model and the collision can't disagree, because they come from the same description.
- **Rotation** is 0/90/180/270. Rotating a building rotates its doors, anchors and edges with it.
- **Styles** are palettes and trim sets per district (for example timber and plaster for the market, pale stone for the castle quarter, brick for the craft quarter). A style changes only colours and trim, never collision.
- **Roof types:** gable, hip, flat with parapet, tower cone. Roofs read from above: district colour plus a different silhouette for public buildings. Shops add an awning and a hanging sign with an icon, which can be read from above.
- **Variation** (window rhythm, chimney position, flower boxes, wear) comes from the `seed`. The same description always builds the same house, so rebuilding and streaming are stable.
- **Landmarks** (castle, temple, fountain) are authored from the same parts plus a few unique pieces. They still produce edges and anchors the same way.
- **Performance:** the outside shell is merged per chunk. Each building's roof and cutaway walls stay separate, so they can hide. Repeated parts share geometry (`cachedMergedMesh`).
- **Model catalogue:** a Building entry with controls for footprint, roof, style, doors, rotation, seed, open/closed door and cutaway angle, using the real builder.

### As implemented (Phase 4, 2026-10-11)

- `src/building-kit.js`. Descriptions as above, plus `rotation`, `roofColor`, `interior:'none'` (solid, locked doors). Door `at` counts clockwise along its edge (north west→east, east north→south, south east→west, west south→north), so rotation keeps it; a door off the door rule (1 ≤ at ≤ length − 2) is refused.
- `planBuilding(desc, origin)` returns tiles, one edge per outline tile (doors, auto windows by seeded rhythm, corners solid, upper-storey windows above doors and windows), doors with inside and doorstep tiles, anchors (shopkeeper spot two tiles in, sign beside the door, awning over it) and seeded decoration (chimney place, awning colours, flower boxes, roof shade). The seed never changes collision.
- `createBuilding(desc, {origin, id, edges, tileAt, parent})` marks tiles, places walls and doors through the map's shared edge features (a wall another building already placed becomes one shared wall owned by both, as tall as the taller), adds the roof as a cut part and the decorations, and returns doors, anchors, roof and `dispose()`.
- Styles (`edge-models.js` `STYLES`): timber (plaster and timber posts on every corner), stone, brick and graybox (seamless corners). Roofs: gable with gable ends, hip, flat with parapet, tower cone; ridge along the longer side by default; district roof colours (timber terracotta, stone slate blue, brick dark slate) with a seeded shade; public buildings set `roofColor`.
- Presets (`BUILDING_PRESETS`): cottage (small), shop (medium, awning and sign), townhouse (two storeys), hall (large), flat-roofed house, tower.
- Signs hang from a pole square to the wall beside the door, the board under the pole and square to the wall, with the game's icon (`icons.js`) painted light on both faces (user preference, 2026-10-11). The sign takes the side of the door farther from the building's corner, and never a side tucked into a corner with a neighbour. Awnings are striped in a seeded colour.
- Multi-storey buildings get a floor at every storey line inside, so upper windows look into a storey.
- Playground: *City streets → Enter kit street*, the graybox layout built by the kit (districts by style, shops on the square). Model viewer → *Building* with preset, style, roof, rotation and seed, and doors closed / open / cut.
- Not done: double doors and a castle gate, chunk-level merging of building shells, lanterns at anchors, wear.

## Streets, elevation and stairs

- **Surfaces:** each tile has a surface (`grass`, `dirt`, `cobble`, `flagstone`, `plaza`). The edges between surfaces are matched automatically (kerbs, worn borders), like the rounded-ledge rule. Surfaces are vertex colours and small trims in the chunk mesh, not extra objects.
- **Terraces:** districts sit at different heights. Height changes of a full block or more get **retaining walls**, built automatically in the district's style. By the existing design rule, these are only crossable by stairs.
- **Stairs** are a shared prefab placed on a run of tiles, each +0.5. The model draws two treads per tile so it reads as stairs and not ledges, with sloped handrails along open sides. Wide stairs repeat across tiles. Walking them is a smooth ramp (slide motion, no hop; user decision 2026-10-11), unlike half-block ledges in the wild.
- **Canals and bridges** are not part of the first city. A street-level bridge over a canal would be fine without stacked layers, because the bridge is the walkable floor there.

## Props and decoration

Shared prop prefabs, each with a footprint, movement and sight policy (`solid`, `low`, or walk-over), optional interaction anchors and a model catalogue entry. Starter set:

- **Seating and gathering:** bench (two `sit` spots), fountain (2×2 or 3×3, `drink`/`gaze` spots, water reuses the existing water effects), statue (pedestal, `gaze`), noticeboard (`read`).
- **Planting:** flower bed (`low` rim, uses the existing grass/flower palette), planters, trees in grates, hedges.
- **Market:** stall (counter edge, awning, `browse` spots in front, `vend` spot behind), crates, barrels, sacks.
- **Street furniture:** lamp post (emissive only, no real lights), signpost, well, banners, carts.

Props are instanced or merged per chunk. Spots are data that townsfolk and the player share. The player can sit on a bench using the same shared motion.

### As implemented (Phase 5, 2026-10-11)

- `src/city-terrain.js`: surfaces (grass, dirt, cobble, flagstone, plaza, stone, floor, planks) with kerbs where paving meets grass or dirt; retaining walls drawn automatically on any side a full block or more above its neighbour (stone courses and a coping band); stairs (`layStairs`: one tile per half block, two treads per tile, side railings); `railingEdges` (stair sides and terrace edges, never across a stair head); `stairProblems` (no landing, or starting above the ground). `makeCityTile` is a terrain factory, so a city bakes into a few meshes.
- `src/props.js`: the starter set, each with a footprint, a policy (solid, low, walk-over; tall props block sight), spots and an optional interaction: bench (sit), fountain (gaze, drink), statue, noticeboard (read), flower bed, planter, tree in a grate, hedge, market stall (browse, vend), crates, barrel, sacks, lamp post (lit), signpost, well (drink), banner, cart, and (Phase 7) the dungeon entrance. Rotation turns footprints and spots. One merged mesh per kind.
- Sitting: a shared `Sit` motion (`slime-social.js`, held like Sleeping, `SEAT_HEIGHT`); clicking a bench walks you to a free seat and sits you, and townsfolk sit the same way. Other prop interactions answer with a line until their systems exist (jobs board: economy).
- `src/city-map.js`: cities as data (`createCityData`, 64 × 64 regions of per-tile heights and surfaces, stairs, buildings, props, edges, townsfolk, interiors) and `buildCity`, the one builder used by the kit street, the editor and the capital.
- Playground: the kit street is now city data (`src/dev/kit-street.js`) with an east annex: terraces one and two blocks up, a 3-wide stair, a 1-wide stair and a stair with a landing, retaining walls with railings, the prop set and a terrace cottage. *City streets → Kit street: go to the terraces / the garden*. Model viewer: every prop, *Stairs and terrace*, the `Sit` motion.

## Props, furniture and furnishing (Phase 10, design draft 2026-10-11)

User decisions (2026-10-11): about a hundred new props across **interior furniture, shop and trade fixtures, street and civic pieces, and nature and dungeon dressing**; interiors are **furnished automatically by building type**; props are **interactive where the use is obvious**; design first, then build.

### What every prop has

The same prefab contract as the starter set (`props.js`): a footprint, a policy (`solid`, `low`, `walk` over), sight, spots for townsfolk and the player, an optional interaction, a model catalogue entry, and one merged mesh per kind. Two new placements join the floor-standing kind:
- **Wall-mounted** props (paintings, shelves, torches, weapon racks, shackles) attach to a wall edge on the inside of a tile. They take no floor footprint, so the tile stays walkable.
- **Walk-under** structures (archway, gazebo, garden arch) block only their posts; the tiles under the roof stay walkable.

Light sources (lanterns, torches, braziers, candles, fireplaces, forges, ovens) keep their glow as a separate lit material, ready for day and night.

### Interactions (only where a system exists)

| Use | Props | Hooks into |
| --- | --- | --- |
| Sit | chairs, stools, armchair, stone bench, pews | the seat system (benches today); townsfolk `sit` |
| Sleep | beds, bunk, cot | **new, small:** lie down with the shared Sleeping motion; health regenerates faster while asleep; any action wakes you. Townsfolk sleep in their home's bed. |
| Cook | fireplace, kitchen stove, bread oven | the cooking system's fire station (as a campfire); townsfolk `cook` |
| Smith | forge, anvil | the furnace and anvil stations (`station-crafting.js`); townsfolk `work` |
| Open and close | chests, trunks, wardrobes, cupboards, dresser | **new, small:** a lid or doors swing (shared animation, like doors). City furniture holds nothing; some chests (dungeons, the wild) hold loot, taken once. |
| Read and examine | bookshelf, notice pillar, paintings, statues, gravestones | a line of text; townsfolk `read`/`gaze` |
| Drink | water trough, pump, birdbath | a line (as the well); townsfolk `drink` |
| Gates | fence gate, iron gate | the shared door entity on an edge (manual open/close, lockable, NPCs use them) |
| Work, browse, vend | workbench, loom, displays, counters | townsfolk spots only (`work`, `browse`, `vend`/`keep`) until the economy |

### The set (about a hundred)

**Interior furniture (34):** single bed (1×2), double bed (2×2), bunk bed (1×2), straw cot (1×2), chair, stool, armchair, small table, round table, long table (2×1), dining table (3×1), desk with chair spot, bookshelf, wall shelf (wall), wardrobe, dresser, chest, trunk, cupboard, rug (2×3, walk), round rug (walk), fireplace (2×1, against a wall, lit), kitchen stove (lit), washstand, cask on a stand, painting (wall), candle stand (lit), potted plant, coat rack, broom and bucket, crib, hearth rug (walk), pew (2×1), side table.

**Shop and trade (26):** shop counter (3×1, `low`, keeper behind), corner counter, display table, weapon rack (wall), armour stand, shield display (wall), bread oven (2×1, lit), flour sacks, bread shelf, forge (2×2, lit), anvil, quench barrel, workbench (2×1), tool rack (wall), apothecary shelf, alchemy table, cauldron (lit), fish counter with ice, fish drying rack, tailor's dummy, loom, cloth shelf, produce crates, bar counter (3×1, `low`), keg rack, kegs.

**Street and civic (24):** fence gate (edge), low stone wall (edge), double street lamp, wall torch (wall, lit), water trough, rain barrel, bin, notice pillar, flagpole, bunting between posts, market umbrella stall, produce stand, wagon (2×3), handcart, hay bales, woodpile, crate stack, sack pile, archway (3×1, walk-under), water pump, hitching rail, stone bench, long planter, knight statue.

**Nature and dungeon (21):** small, medium and large rocks, bush, berry bush, tall grass (walk), flower patch (walk), fallen log, tree stump, pond (2×2 water), gazebo (3×3, walk-under), garden arch (walk-under), birdbath, gravestone, dungeon wall torch (wall, lit), brazier (lit), bones and skull, cobweb (wall), broken pillar, rubble, sarcophagus, iron gate (edge), shackles (wall). Dungeons also get their own **dungeon style** (dark mossy stone walls and floor).

### Furnishing by building type

- A building description gains `use`: `home`, `inn`, `tavern`, `bakery`, `smithy`, `general store`, `grocer`, `fishmonger`, `armourer`, `weaponsmith`, `apothecary`, `tailor`, `carpenter`, `guild hall`, `keep`, `warehouse`, `barracks`. The sign icon follows from the use. In-place and separate interiors are both furnished, floor by floor (trade on the ground floor, bedrooms above).
- **One shared furnisher** (`furnish.js`) lays out a room from its use's rule, seeded so it is stable: **wall pieces** first along the walls, facing in, never across a door or its inside tile, never in front of a stair; then the **trade fixture** (a shop counter with the keeper spot behind it, a forge and anvil, an oven, a bar); then **centre pieces** (a table with chairs, a rug); then clutter. Counts scale with the room.
- **Checks** (city checks): every spot and the keeper spot can be reached from the door; the door's inside tile and stair fronts stay clear; nothing blocks a window from inside except low pieces.
- **Editor:** a building's use, a reroll of its furnishing seed, or *no furniture*. Hand-placed props inside are kept, and the furnisher works around them.
- **Townsfolk** use what is there: residents sleep in their beds and sit at their tables, keepers stand behind counters, smiths work the anvil, bakers the oven.

### Cost

Furniture is drawn only while its building is cut away (it is a cut part shown when cut, like the solid cap), and each building's static furniture is merged into one mesh. Interactive pieces stay separate. Street props merge per chunk (`static-merge.js`). The capital-square scenario covers it, and the prop gallery gets a perf look before the batch ends.

### Playground

- A **prop gallery**: every prop in labelled rows, with interactions live.
- The **kit street and the capital** get uses and furnished interiors; the annex gains street, nature and dungeon pieces, and the crypt its dungeon dressing.
- **Model viewer:** every prop, with open/close and lit motions where they apply.

### Decisions for this phase

1. **Storage (user, 2026-10-11).** Some chests hold loot (dungeons, the wild: taken once, by stable id); chests, trunks, wardrobes and cupboards in cities open and say "There is nothing interesting in here." A storage system (personal chests, a bank) comes with the economy.
2. **Sleeping (user, 2026-10-11).** Health regenerates faster while asleep. Any bed works for now; later, sleeping in a bed someone else owns is refused (an inn room or your own bed), as in many RPGs.

### As implemented (Phase 10, 2026-10-11)

- **Props** (`props.js`, sets in `src/prop-sets/`: `furniture.js`, `trade.js`, `street.js`, `nature.js`; part helpers in `prop-parts.js`): 104 new pieces on top of the 18 starters, grouped in `PROP_CATEGORIES`. New spec fields: `mount:'wall'` (stands against the wall behind its tile, blocks nothing), `block` (only these offsets block: walk-under posts for the gazebo, archway, bunting), `glow` (one shared unlit flame material), `moving` (lids, doors, drawers on pivots: `setPropOpen`; `updateProps` visits only props on their way open or shut), `station` (`fire`, `furnace`, `anvil`) and `seat` ({back, height, motion}; beds use `Sleeping`; every seat and sleep spot faces away from its piece so you settle onto it, unit-tested at all four rotations).
- **Work surfaces** come to a slime's chest (bodies are .72 tall): counters, the market stall, tables, the desk, workbench, alchemy and display tables have their tops at `SURFACE` (.55, `prop-parts.js`; `lowerTo` lowers a piece's top and shortens its legs); the side table is .5. Seats are lower to match: chairs, stools, pews and benches have their tops at `SEAT` (.3), the armchair's cushion a little higher; the shared Sit motion takes the seat's own height (`socialMotion(kind, time, {seatHeight})`, `play(kind, {seatHeight})`), so the player and townsfolk settle onto each seat (user review, 2026-10-11).
- **Interactions** (`main.js`): sit and sleep (sleeping triples regeneration: `RESTING_HEALTH`, `player-resources.js`), cook (the shared cooking menu, fire station satisfied), smith (the shared station for `furnace` or `anvil`), open (lid animates; loot once by stable id via `takeLoot`, otherwise "There is nothing interesting in here."), read, examine and drink lines.
- **Edges**: a wooden `fenceGate` and an `ironGate` (`edge-models.js`) are doors in fence, railing and low-wall lines; a gate checks only its swing side for the door rule (`doors.js`). New `dungeon` wall style and floor surface.
- **Furnishing** (`furnish.js`): `USES` rules for 18 uses; `furnishingUse(desc)` (explicit `use`, `none`, a signed shop as `store`, else `home`); `furnishRoom(room, use, seed)` keeps the doorway and the tile in from it clear, puts a shop counter 3 (or 2) tiles in with the keeper behind (`layout.keeper`), reserves each piece's use tiles so later pieces can't block a bedside or stove front, and keeps every free tile reachable from the door. In-place buildings get a furniture group shown only while cut (static pieces merged per building; its matrices are frozen). Separate interiors furnish every floor (`upstairsUse`); dungeons use `crypt` with a loot chest.
- **Townsfolk**: spots come from props and furniture; residents prefer their own house and sleep and cook there; seats use their own motion and height.
- **Checks and editor**: city checks warn when a building's bed, stove, workbench or counter can't be reached from its door, or its keeper can't get behind the counter (none on the kit street or the capital). The editor has **Use** (sets `desc.use`; a shop's sign follows `USE_ICONS`) and **Reroll furniture** (`desc.furnishSeed`).
- **Playground**: *Prop gallery* (every prop by category, plus the fence gate, low stone wall and iron gate; the gallery chest holds 2 copper ore). Every prop is in the model viewer; props with moving parts have Closed/Open motions.
- **Verified in the browser**: sleeping in a gallery bed (settles on it, eyes close), the chest (lid opens, +2 copper ore, then nothing), the stove (cooking menu), the forge (smelting with that ore), and furnished kit street interiors under force cutaway.
- **Open**: owned beds (refuse sleeping in someone else's) and storage come later (see the decisions above). City chests have no loot by design.

## Gelton: the waking city (2026-10-11)

User decisions (2026-10-11): the capital is called **Gelton**; ending the tutorial wakes you there instead of a placeholder meadow; this phase adds gold, values and shops (docs/ECONOMY.md), with jobs and drops later.

- **A production area** (`main.js` `geltonReady`): built on first need from `src/maps/capital.json` (lazy chunks in the normal build), per chunk and streamed, with its townsfolk. Its Iter Crystal is the game's travel crystal (`buildCity({crystal})` hook; `crystals.add`), so arrival, travel, the destination menu and defeat respawn use it. The area is listed once you're awake. `world-start.js` (the placeholder) is gone.
- **Waking** (`waking.js`): `destination: 'gelton'` and `prepare`, which starts the build with the farewell; the screen holds faded out until it is ready (the build runs during the farewell lines, so in practice there is no wait).
- **Shops in the city:** each enterable shop building has a shop id from its use; counters inside open it; stalls open the market; keepers and vendors greet you and open theirs. See ECONOMY.md *As implemented*.
- **Name:** `capital-layout.js` names the map Gelton (regenerated `capital.json`); the area id is `gelton`, the map id stays `capital` (loot ids use it).
- **Playground:** *Enter Gelton* uses the same production area; *Wake up now* lands there.
- **Verified in the browser:** waking with Skip lands in Gelton's square beside the crystal with the starter kit; a market stall and a weaponsmith counter open their shops; buying a Stone Sword spends gold and shows its receipt; Fenwick the keeper greets you and opens the Weaponsmith; the shop on a phone is fullscreen with a back button and "Not enough gold".

### The wall and the countryside (2026-10-11)

Gelton has a stone wall along its outer ring, with open gateways west, east and south (map `gates`, signposts). Its park has gather spots (map `resources`). The generated countryside around it is part of the same area: see [WORLD.md](WORLD.md).

**Faster cities:** baked walls, windows and railings (`doors.js` `bake`) now leave the scene graph while baked, instead of only being hidden. Hidden objects still cost a matrix update every frame. Gelton's square went from 33,900 to 7,300 objects and from 10.4 to about 5.8 ms per frame (docs/PERFORMANCE.md).

## Townsfolk and city life

**Routines from places, not scripts.** A townsfolk entry gives a look (colour, hat, accessories), a home door, a loadout or carried tool, and a **routine**: a weighted list of activities. Activities find spots offered by props and buildings: `sit` (bench), `browse` (stall), `vend` and `work` (shop counter, smithy anvil, using existing station motions), `gaze` (fountain, statue), `chat` (two idle townsfolk meet and face each other through `slime-social.js`), `stroll` (to a random street spot), `enter` (walk to a door, go inside, reappear later) and `patrol` (guards follow a loop). Every motion is shared slime presentation. No per-character animation code, as AGENTS.md requires.

**Movement rules:**
- Townsfolk walk through each other and the player, like every entity (see *Walk-through entities*). They prefer not to *stop* where someone else stands, and never idle on doorsteps, stairs or stall fronts.
- They react lightly to the player: a turn of the head, a wave when greeted, a small sidestep when the player stops beside them.

**Shared navigation at scale.** Townsfolk don't search the whole city each time. Proposal: a **coarse route graph** of chunk portals and doors, built when a chunk loads, gives the route between chunks. Within a chunk, a bounded search fills in the detail. Popular destinations (plaza, market, gates) get cached distance maps that anyone heading there can follow. The player keeps exact routes, and all searches have a radius limit.

**Simulation budget (to profile; proposals):**

| Ring | What runs |
| --- | --- |
| On screen, near | Full slime presentation and face. Desktop target about 60 visible, phone about 25. |
| On screen, far | Lower-rate idle, no face changes, motions held at key poses, simplified shadow. |
| Loaded, off screen | Movement and routine only, no presentation updates. |
| Not loaded | No simulation. A townsfolk's position comes from their routine and the clock when their chunk loads, so the city looks lived-in without running everything. |

The perf harness gets `city-walk` and `city-crowd` scenarios in `src/dev/perf-scenarios.js` before the crowd is tuned.

### Review fixes (2026-10-11, after the Phases 5–9 draft)

- **One character per tile is drawn, among those stopped there** (user rule, refined 2026-10-11): occupancy records arrival order per tile (`occupancy.top`, `covered`); when two or more are stopped on a tile, the last to arrive shows, and a stopped player always shows. Anyone moving (`owner.moving`) neither hides nor is hidden, so walking through a tile hides no one. Townsfolk, pushed NPCs and one-tile creatures (never hidden under the player mid-fight) follow it while standing. Townsfolk also stop a tile short of a tile someone stands on, or give up a taken spot.
- **Talking stops townsfolk**: they finish the step under way, stand facing you for about 4 s, then carry on. They face the way they walk (a conversation no longer leaves them looking back at you).
- **Shared locomotion for every slime**: `moveMotion` (slime-motion.js) gives the player and NPCs the same slide, the same hop on ledges, and a smooth ramp on stairs; `createSlimeActor().update({pose})` takes the movement pose. Townsfolk walk with a happy face (`walkFace`/`face` per entry), and pick varied faces while chatting.
- **Stair railings are sloped handrails** following each flight from the ground to the top (`stairRailParts`), meeting a landing's or terrace's flat railing at the same height; stair sides stay unwalkable through hidden railing edges.
- **Benches** have a deeper seat reaching forward and a back, each two boards with a small gap; a sitter rests 0.72 of a tile back from its spot (`SEAT_BACK`), against the backrest, at seat height `SEAT_HEIGHT` 0.41.
- **Interior stairs are two tiles** along a wall rising into a corner, with a free tile in front of the bottom step (`stairsPlacements`); going up lands beside the top of the opening upstairs, going down lands in front of the bottom step. Middle floors alternate corners. Furniture keeps off the stairs.

### Solid buildings, doors and residents (2026-10-11, user review)

- **Solid when cut:** a building you can't walk into (`interior: 'none'` or `'separate'`, or only locked doors; `solidWhenCut`) shows a flat grey cap flush with its cut walls while it is cut, so it reads as a solid block, not an empty room. Cut parts with `userData.showWhenCut` are shown only while their building is cut (`cutaway.js`). The graybox street's shells get the same cap.
- **Townsfolk use doors:** routes pass unlocked closed doors (`passable`); a townsfolk opens the door, waits for it to swing, goes through, and shuts it once its doorway is clear (only doors it opened). Door sounds play near the player only.
- **Residents and shopkeepers:** an entry may name its building (`house`, an index). Activities `home` (potter about inside), `keep` (mind the shop from its keeper spot, facing the door) and `tend` (linger around the building's front). The kit street has 6 residents and keepers (17 townsfolk), the capital a keeper for every other shop and a resident in every tenth house (41 townsfolk). A walking townsfolk keeps its walking face and pose between steps. Townsfolk indoors in a building that isn't cut aren't drawn (the roof hides them). Checks: a house must be enterable.
- **Planning:** townsfolk plan a bounded route (early exit, at most 3,500 tiles) to one candidate at a time, rather than scanning distance fields; whole-map fields remain for the checks.

### As implemented (Phase 8, 2026-10-11)

- `src/townsfolk.js`: `createCrowd({city})` runs a city's townsfolk (`data.townsfolk`: look, home, weighted routine, patrol, pace, an optional line). Activities: sit, browse, vend, gaze, drink, read (prop spots), chat (two townsfolk meet and wave), stroll (a bounded search within 10 tiles), enter (walk to a doorstep and vanish for a while; townsfolk don't walk into in-place buildings yet), patrol. Clicking one turns them to you, waves and says a line.
- Movement: walk-through characters that mark their tile occupied, step aside when the player stops on them, and never idle on doorsteps, stairs or prop spots. A shared navigator caches distance fields to destinations (48 at most) and follows them downhill; strolls use a bounded search.
- Crowd budget rings: near (16 tiles) and on screen, full presentation; far (to 34) a quarter rate with a fixed face; off screen or farther, movement only. `crowdStats` reports the rings.
- Each townsfolk's body group is moved by the crowd; the shared presentation animates the rig inside it (it owns the rig's height).
- Checks: a home that exists and reaches the square; a routine with something usable. Perf scenarios `city-walk`, `city-crowd` (60) and `capital-square` (`src/dev/perf-scenarios.js`).
- Playground: the kit street has 14 townsfolk (vendors, sitters, shoppers, chatters, two guards); *Crowd: 60 townsfolk* swaps in a generated crowd.

## Authoring: the playground city editor

A dev-only editor (compile-time isolated like the rest of the playground) that edits a real city map using the production builders:

- **Tools:** paint height (half-block steps) and surface. Place, move, rotate and duplicate buildings from descriptions, and edit a description in a side panel. Place stairs, props and townsfolk. Draw edge features by hand where the kit doesn't produce them. Undo/redo.
- **Live checks** listed in a panel, each clickable to jump to the problem:
  - every door has a clear doorstep that can be reached from the city's main entrance or arrival point
  - no overlaps between buildings, props and stairs. No prop on a doorstep
  - no full-block drop without stairs. Stairs have their landing
  - streets and alleys meet the minimum widths. No dead-end one-tile slots
  - every interior link has a valid arrival tile, and its footprint matches the outside
  - every townsfolk spot can be reached, and every routine has at least one usable activity
  - no building crosses a chunk or region line (an error; WORLD.md, *Design constraints*)
- **Test walk:** switch from editing to playing in place, with the camera and cutaway as in the game. Reset returns to the edited state.
- **Saving:** the city is a data module (`src/maps/<city>.js` or JSON) with terrain and surfaces stored per 128 × 128 region (WORLD.md, *Glossary*), plus lists of buildings, props, stairs, edges and townsfolk. In `npm run dev:debug` a dev-only Vite endpoint writes the file into the repo. Otherwise the editor offers a copy/download. Normal builds don't include the editor or the endpoint (`check:debug-isolation`).

### As implemented (Phase 6, 2026-10-11)

- `src/dev/city-editor.js` (dev only): a docked panel (a bottom sheet on phones) over the live map. Tools: inspect, raise and lower (half blocks, 1 or 3 × 3 brush), surface, building (kit presets, rotation), prop (kind, rotation), stairs (direction, length, width), edge (wall, window, fence, railing, counter, door, remove), erase, arrival. Placing over something taken, or a building across a chunk line, is refused. A *Chunk and region lines* switch (on by default) draws the grid on the ground (`dev/grid-overlay.js`). Every edit rebuilds the map with `buildCity` (about 0.3 s for the kit street, 1 s for the capital) and keeps you where you stand.
- Edit / Play (a test walk in place), Reset, Undo / Redo (60 steps), open the kit street, a blank 64 × 64 city or any city in `src/maps/`.
- Live checks (`src/city-checks.js`), each a button that takes you there: arrival tile; overlapping buildings, props and stairs; doorsteps blocked or unreachable from the arrival point; the door rule; stairs without a landing; open ground that can't be reached (a terrace without stairs); one-tile dead ends and passages under two tiles; prop spots that can't be used; interiors and dungeons (Phase 7); townsfolk (Phase 8); buildings across chunk or region lines (an error since 2026-10-12).
- Saving: *Save to repo* posts to a playground-only dev server endpoint (`vite.config.js`, `/__city-save`) that writes `src/maps/<id>.json`; *Copy JSON* and *Download* work anywhere. Normal builds include none of it (`check:debug-isolation` checks the markers).

## Streaming and the world

- The capital is the kingdom's capital and very large, far bigger than any tutorial area. A first graybox target was 128 × 128 tiles; it is now 160 × 160 (5 × 5 chunks, 2 × 2 regions) so its axis runs down the middle of a chunk (2026-10-12), to grow once streaming and crowds are measured. It builds on the chunk streamer.
- **The town square holds the Iter Crystal where the player wakes**, so the square is the city's focal point: the castle is visible from it, the main avenues start there, and the first shops, a noticeboard for jobs and the first townsfolk are in sight from the crystal. Buildings, props and townsfolk belong to the chunk of their anchor. A building lies inside one chunk (WORLD.md, *Design constraints*, 2026-10-12), so its walls, floor, roof and furniture show and hide with that chunk. (Before that rule, a building across a line was drawn by its home chunk; `buildCity` still does this, so data that predates the rule draws whole, but the checks report it.)
- Door state, unlocks, and townsfolk routines and positions live outside chunk render state by stable id, so leaving and returning doesn't reset them. The streaming shared-infrastructure rules in DESIGN.md apply as written.
- Interior spaces load on demand when the player is near their door, and unload on a budget.

### As implemented (Phase 9, 2026-10-11; first draft)

- `src/maps/capital.json`: the capital as city data, 160 × 160 (5 × 5 chunks, 2 × 2 regions; re-centred 2026-10-12 so the avenue, square and keep sit on x = 80, the middle of a chunk), generated once by `scripts/generate-capital.mjs` from `src/dev/capital-layout.js` and edited from there in the city editor (regenerating overwrites edits). You arrive beside the Iter Crystal in the town square, ringed by tall shops, with the fountain, the jobs noticeboard, benches and lamps; a 5-wide avenue leads north up a 5-wide grand stair to the castle terrace two blocks up (a curtain wall with a gate, four cone towers, the keep with a two-floor separate interior); a market square of stalls to the west; timber, brick and stone districts; shops with signs on the main street; an inn and a guild hall with interiors; a park with the sewer entrance; 35 townsfolk including guards on patrol. The city checks report no errors.
- Built per chunk (`buildCity`, 32 × 32 since 2026-10-12): terrain, baked walls, buildings and props go in their chunk's group, so the renderer culls by chunk, and `stream(tile)` shows only the chunks within 1 of the player (3 × 3), keeping a shown chunk until the player is 8 tiles past that (the streamer's `BAND`). An edge belongs to the chunk of its lower tile, so neighbours in different chunks still share one wall. All tiles and models are built on entry (about 1.1 s at 128 × 128).
- Playground only for now: *City streets → Enter the capital*.

## Planned later: day and night

Not in the prototype (user, 2026-10-10), but on the list. Design for it now so it can be added without rework:
- Routine activities carry optional hours, ignored until the clock exists. Shops carry opening hours, ignored the same way.
- Lamps, windows and signs keep their lit look as a separate material or state that a clock can switch later.
- Saving townsfolk positions as "routine plus time" already suits a clock.

## Shops and the economy

An economy is vital for the prototype (user, 2026-10-10). Pacifists earn money through a **task/job system** and by **selling what they craft and forage**. The economy (Gold Pieces, prices, buying and selling, jobs, how shop stock works) is designed in [ECONOMY.md](ECONOMY.md). The city supplies what it uses:
- **Shop buildings** with a counter, a shopkeeper spot behind it, a sign icon, and a `shop` id that the economy looks up. The building doesn't know what is sold.
- **Shopkeepers** are ordinary townsfolk with a `vend` routine. Talking to one opens the shared shop UI, in any map.
- **A jobs noticeboard** in the town square, a prop with a `read` spot that opens the job system.
- **Market stalls** reuse the same shop link.

## Plan

Each phase ends playable in the playground and keeps existing maps unchanged. Phases with rendering, entity or main-loop work end with one `npm run perf` batch, as the performance rules require.

0. **Walk-through entities** (own design review first). Characters stop blocking; permanent `solid` is separated from occupancy. Verified in all three tutorial maps.
1. **Edges, doors and the shared step test.** Edge data, `canStep`, sight through edges and the door entity. Verified first in a playground test yard with hand-placed walls, and in all three tutorial maps for no change in behaviour. Unit tests for every caller.
2. **Graybox street.** Plain-box buildings with edge walls, a raised ground floor, stairs and terraces, at real scale. Judge the scale rules at every zoom level on desktop and phone, and tune the numbers in this doc.
3. **Cutaway and occlusion.** Roof hide, walls cut to one storey for the building you're in or that hides you, click-through (implemented 2026-10-11, simplified with Phase 4; see *As implemented (Phase 3)*). The graybox city is flat for now (user, 2026-10-11): terraces and stairs come back later.
4. **Building kit.** The description-based builder, three sizes, styles, roofs, signs, and catalogue entries (implemented 2026-10-11, see *As implemented (Phase 4)*).
5. **Surfaces, retaining walls, stairs and props.** The starter prop set with spots (first draft 2026-10-11, see *As implemented (Phase 5)*).
6. **City editor and checks**, including saving to the repo (first draft 2026-10-11, see *As implemented (Phase 6)*).
7. **Separate interiors, stairwells and dungeon entrances**, with the interior size checks (first draft 2026-10-11, see *As implemented (Phase 7)*).
8. **Townsfolk routines and crowd budget**, with the navigation graph, perf scenarios and ring-based detail (first draft 2026-10-11, see *As implemented (Phase 8)*).
9. **The capital itself**, on the streamer, with the castle and the waking crystal in the town square (first draft 2026-10-11, see *As implemented (Phase 9)*).
10. **Props, furniture and furnishing** by building type, with the interactions above (first draft 2026-10-11, see *As implemented (Phase 10)*).

The economy ([ECONOMY.md](ECONOMY.md)) is designed alongside and doesn't wait for the city: selling, buying and jobs can be tested at a playground counter before the capital exists.

## Open questions for the user


1. ~~**The capital's name.**~~ **Gelton** (user, 2026-10-11).

Flagged during the Phases 5–9 first draft (2026-10-11), for review:
2. ~~**When does the player reach the capital?**~~ Waking from the tutorial lands you in Gelton beside its Iter Crystal, now a real travel crystal (user, 2026-10-11; see *Gelton: the waking city*).
3. **Real streaming.** The capital is built whole on entry (about 1.1 s) and only its rendering is streamed by chunk. Loading and unloading chunk contents through the chunk streamer (DESIGN.md) is not done.
4. **Railings on every terrace edge and stair side.** Automatic railings make terraces safe and readable but add a lot of fence; a per-edge or per-district option may be wanted.
5. ~~**Townsfolk and doors.**~~ Townsfolk open and shut doors and live in houses (2026-10-11); shopkeepers and stall vendors trade (economy, 2026-10-11).
6. **Interior furniture.** Done in Phase 10 (furnishing by use, dungeon look). Dungeons still need enemies.
7. **Placeholder prop lines.** Stalls and counters now trade. The noticeboard, well, fountain and statue still answer with a line; the jobs board waits for jobs.
8. **Editor scale.** Every edit rebuilds the whole map (about 1 s for the capital); drag painting, incremental rebuilds and an editor tool for townsfolk and interiors are not done.
9. **Seeing the player behind a front wall.** Interiors and one-storey buildings keep full one-storey walls, which can hide the player standing just inside a front wall (as in the building test map).
10. **Chunk borders.** Walls of one building that cross a chunk border can get a doubled corner post at the border.
11. **Capital performance.** The capital square runs at 59 fps on a desktop GPU but at about 9.5 ms a frame and ~1,150 draws (docs/PERFORMANCE.md). Before phones: merge building shells per chunk and instance townsfolk rigs.
12. **Townsfolk count and bends.** Trimmed at the user's request (2026-10-11): the capital has 41 townsfolk (a keeper for every other shop, a resident in every tenth house, three vendors, ten wanderers, guards), the kit street 17. Gesturing slimes (waving, sitting) re-upload their bent bodies.
