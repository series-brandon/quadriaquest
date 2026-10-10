# Cities, buildings and doors (design draft)

Draft, 2026-10-10. Nothing here is implemented. It is the design for review before any code. Numbers are starting proposals to check in a graybox, not final tuning.

**Decisions already made by the user (2026-10-10):**
- **Hybrid interiors.** Small and medium buildings open in place: the roof lifts and walls in front of the camera drop to stubs. Large or multi-storey interiors (castle, inn upstairs, guild halls) are separate spaces entered through a door.
- **No stacked walkable layers yet.** Outdoors keeps one floor height per tile. Elevation comes from terraces and stairs. Upper floors are separate interior spaces. Castle walkways over a gate, bridges over streets and walkable balconies are out of scope for the first city.
- **Cities are built in a playground city editor**, not by typing tile strings.
- **Design doc first**, then build in the phases below.

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
| Occupancy writes `tile.blocked` | `world-occupancy.js` | A statue's or wall's permanent blocking is mixed with who is standing there right now. Removing an NPC could unblock a fountain. The two need separating. |
| `attackRoute` scans every tile in the world | `combat-range.js` | Fine for a 40 × 32 area, too slow for a city. Searches need a radius limit. |
| A whole area loads at once | `area-runtime.js` | A capital is large. It should build on the chunk streamer (`chunk-streamer.js`, 16 × 16 chunks). |
| A route is a fresh breadth-first search per walker | `world.js findPath` | Dozens of townsfolk need cheaper shared navigation. |

Already fine: half-block steps make stairs work as a run of +0.5 tiles. `footprint.js` supports multi-tile bodies (the 2×2 golem) for fountains, statues and stalls. The terrain batcher and streamer's chunk meshes keep static draw calls low.

## Scale rules (proposal)

A tile is about one slime wide, and a slime is about one block tall.

| Thing | Rule |
| --- | --- |
| Door | One tile edge wide. Double doors cover two edges (castle, hall). Always a clear **doorstep** tile outside. |
| Ground floor | Raised **+0.5** above the street outside the door, a single step. It reads as a threshold and keeps puddles out. |
| Storey height | **1.5 blocks** of wall per floor. Taller looks realistic but hides the street from the camera. |
| Small building | 3 × 3 to 4 × 4 tiles, one room, opens in place. Cottage, shed, kiosk. |
| Medium building | 5 × 4 to 7 × 6, one or two rooms, opens in place. Shop, smithy, small house, tavern ground floor. |
| Large building | 8 × 8 and up, or more than one storey. Separate interior. Inn, guild hall, temple. |
| Castle | A landmark of about 24 × 20 on the highest terrace. Separate interiors, with a grand stair and a view from the plaza. |
| Main avenue | 5 tiles wide. Street 3, alley 2. Never narrower than 2, so two slimes can pass. |
| Plaza | At least 12 × 12, with a focal point (fountain or statue) and benches around it. |
| Lot spacing | Buildings are at least one tile apart, or share a wall deliberately (terraced row). Never a one-tile slot that leads nowhere. |
| Stairs | 1 tile per half-block. 2–3 tiles wide on main routes, 1 on back routes. A landing after every 2 blocks of rise. |
| Roof overhang | 0.25 tile. It must not cover the doorstep from the default camera angle. |

Exact numbers get tuned in the graybox (Phase 2) at real zoom levels on desktop and phone.

## Walls and doors on tile edges

**Data.** Each tile can carry edge features on its north and west sides only. The south and east edges belong to the neighbouring tile, so each edge is stored once. A helper `edgeBetween(world, a, b)` returns the feature or null. Edge kinds:

| Kind | Movement | Sight / shots | Examples |
| --- | --- | --- | --- |
| `wall` | blocks | blocks | Building walls, castle walls |
| `window` | blocks | allows | Shop windows, open arches with a sill |
| `door` | allows when open or openable | blocks when closed | Every entrance |
| `fence` / `railing` | blocks | allows | Gardens, stair rails, the plaza edge |
| `low` | blocks | allows | Flower bed rims, hedges, market counters |

**One shared step test.** `canStep(world, from, to, mover)` combines height, `blocked`/`solid`, water, the edge feature and door rules. It replaces the separate checks in pathfinding, wandering, companion following, interaction routes and `canStand` (whose body also can't straddle an internal wall). `lineOfSight` uses the same edge table, including the corner rule its supercover already applies. This is the riskiest change in the plan, because every walker and every combat check moves onto it. It ships with tests for each caller and is verified in the clearing, Willowbank and Cinderhold, which have no edges, to prove nothing changes there.

**Permanent blocking versus occupancy.** Tiles get a fixed `solid` (terrain, props, building cores) that occupancy never writes. Who is standing on a tile is tracked separately from `blocked`. Existing maps keep working through a compatibility step before any city work depends on it.

**Doors are a shared entity**, the same model and behaviour in any map:
- A walker's route may pass through a closed, unlocked door. The door swings open as the walker reaches it, with a sound, and closes shortly after the last walker clears it. Townsfolk use the same door.
- A **locked** door is shown as locked on hover and refuses with feedback ("It's locked."). Story or keys can unlock it. No door is locked just to hide an empty room.
- A door may link to an **interior space** (below). Its doorstep and the interior's arrival tile are part of its data, and the editor checks them.
- Playground: open, close, lock and unlock any door, show edge features as an overlay, and a door model in the catalogue with Open, Close and Locked rattle motions.

## Seeing inside (hybrid)

### Buildings that open in place (small and medium)

- A building knows its interior tiles. When the player is inside, or walking through the door, its **roof and upper-floor shell fade out** (about 0.25 s). They fade back when the player leaves. Clicks go through hidden parts.
- **Cutaway walls:** walls whose outside faces the camera drop to stubs about 0.3 blocks tall. Which walls those are depends only on the camera's orbit angle, rounded to 8 directions, so it's cheap. It updates as the camera turns, with a short fade so walls don't flicker.
- **Street occlusion:** outdoors, a building that hides the player, the current target or a hovered door from the camera fades to a see-through ghost and its roof hides. A building between the camera and the player on a narrow street must never cover them completely.
- Furniture is ordinary props with footprints. Counters are `low` edges or props that shopkeepers stand behind.

### Separate interiors (large and multi-storey)

- An interior is a small **space** linked from a door (and stairs, for upper floors). Entering it is a quick fade (about 0.3 s), not a full area switch. The city stays as it was. Townsfolk inside are part of the interior.
- **Proposal:** an interior's ground floor matches the building's outside footprint, and its doors match the outside doors, so the world stays believable. No interior bigger than its building unless the user approves a specific magical exception.
- Upper floors and cellars are further spaces linked by a shared **stairwell** entity: a stair model plus a link and arrival tile. Climbing reuses the same fade.
- Camera inside: zoom is capped so the view stays within the walls, and the camera can't orbit through walls.
- Built on travel's existing safe-arrival checks and cancellation (unfinished work cancels, committed state is kept). There are no per-building special transitions.

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

## Streets, elevation and stairs

- **Surfaces:** each tile has a surface (`grass`, `dirt`, `cobble`, `flagstone`, `plaza`). The edges between surfaces are matched automatically (kerbs, worn borders), like the rounded-ledge rule. Surfaces are vertex colours and small trims in the chunk mesh, not extra objects.
- **Terraces:** districts sit at different heights. Height changes of a full block or more get **retaining walls**, built automatically in the district's style. By the existing design rule, these are only crossable by stairs.
- **Stairs** are a shared prefab placed on a run of tiles, each +0.5. The model draws two treads per tile so it reads as stairs and not ledges, with side walls and optional `railing` edges. Wide stairs repeat across tiles. No ramps.
- **Canals and bridges** are not part of the first city. A street-level bridge over a canal would be fine without stacked layers, because the bridge is the walkable floor there.

## Props and decoration

Shared prop prefabs, each with a footprint, movement and sight policy (`solid`, `low`, or walk-over), optional interaction anchors and a model catalogue entry. Starter set:

- **Seating and gathering:** bench (two `sit` spots), fountain (2×2 or 3×3, `drink`/`gaze` spots, water reuses the existing water effects), statue (pedestal, `gaze`), noticeboard (`read`).
- **Planting:** flower bed (`low` rim, uses the existing grass/flower palette), planters, trees in grates, hedges.
- **Market:** stall (counter edge, awning, `browse` spots in front, `vend` spot behind), crates, barrels, sacks.
- **Street furniture:** lamp post (emissive only, no real lights), signpost, well, banners, carts.

Props are instanced or merged per chunk. Spots are data that townsfolk and the player share. The player can sit on a bench using the same shared motion.

## Townsfolk and city life

**Routines from places, not scripts.** A townsfolk entry gives a look (colour, hat, accessories), a home door, a loadout or carried tool, and a **routine**: a weighted list of activities. Activities find spots offered by props and buildings: `sit` (bench), `browse` (stall), `vend` and `work` (shop counter, smithy anvil, using existing station motions), `gaze` (fountain, statue), `chat` (two idle townsfolk meet and face each other through `slime-social.js`), `stroll` (to a random street spot), `enter` (walk to a door, go inside, reappear later) and `patrol` (guards follow a loop). Every motion is shared slime presentation. No per-character animation code, as AGENTS.md requires.

**Movement rules (proposal):**
- Townsfolk reserve the next tile, wait briefly, and step aside or pick a new route when blocked. They never stand on doorsteps, stairs or stall fronts while idle.
- **Ambient townsfolk never block the player.** The player passes through them and they shuffle aside. Quest NPCs and shopkeepers keep their tile. This avoids street jams and blocked doors on phones.
- They react lightly to the player: a turn of the head, a wave when greeted, moving out of the way.

**Shared navigation at scale.** Townsfolk don't search the whole city each time. Proposal: a **coarse route graph** of chunk portals and doors, built when a chunk loads, gives the route between chunks. Within a chunk, a bounded search fills in the detail. Popular destinations (plaza, market, gates) get cached distance maps that anyone heading there can follow. The player keeps exact routes, and all searches have a radius limit.

**Simulation budget (to profile; proposals):**

| Ring | What runs |
| --- | --- |
| On screen, near | Full slime presentation and face. Desktop target about 60 visible, phone about 25. |
| On screen, far | Lower-rate idle, no face changes, motions held at key poses, simplified shadow. |
| Loaded, off screen | Movement and routine only, no presentation updates. |
| Not loaded | No simulation. A townsfolk's position comes from their routine and the clock when their chunk loads, so the city looks lived-in without running everything. |

The perf harness gets `city-walk` and `city-crowd` scenarios in `src/dev/perf-scenarios.js` before the crowd is tuned.

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
  - chunk and region boundaries don't split a building's interior in a way the streamer can't keep loaded
- **Test walk:** switch from editing to playing in place, with the camera and cutaway as in the game. Reset returns to the edited state.
- **Saving:** the city is a data module (`src/maps/<city>.js` or JSON) with terrain and surfaces stored in 64 × 64 regions (matching the streaming notes in DESIGN.md), plus lists of buildings, props, stairs, edges and townsfolk. In `npm run dev:debug` a dev-only Vite endpoint writes the file into the repo. Otherwise the editor offers a copy/download. Normal builds don't include the editor or the endpoint (`check:debug-isolation`).

## Streaming and the world

- A capital is far bigger than a tutorial area (first guess: 96 × 96 to 128 × 128) and builds on the chunk streamer. Buildings, props and townsfolk belong to the chunk of their anchor. A building that crosses a chunk border keeps all its chunks loaded while it's on screen.
- Door state, unlocks, and townsfolk routines and positions live outside chunk render state by stable id, so leaving and returning doesn't reset them. The streaming shared-infrastructure rules in DESIGN.md apply as written.
- Interior spaces load on demand when the player is near their door, and unload on a budget.
- Where the city sits in the world, and whether waking from the tutorial lands the player there, is an open question below.

## Plan

Each phase ends playable in the playground and keeps existing maps unchanged. Phases with rendering, entity or main-loop work end with one `npm run perf` batch, as the performance rules require.

1. **Edges, doors and the shared step test.** Edge data, `canStep`, sight through edges, `solid` versus occupancy, and the door entity. Verified first in a playground test yard with hand-placed walls, and in all three tutorial maps for no change in behaviour. Unit tests for every caller.
2. **Graybox street.** Plain-box buildings with edge walls, a raised ground floor, stairs and terraces, at real scale. Judge the scale rules at every zoom level on desktop and phone, and tune the numbers in this doc.
3. **Cutaway and occlusion.** Roof fade, angle-based wall stubs, street ghosting, click-through. This is the phase where a door has to feel right.
4. **Building kit.** The description-based builder, three sizes, styles, roofs, signs, and catalogue entries.
5. **Surfaces, retaining walls, stairs and props.** The starter prop set with spots.
6. **City editor and checks**, including saving to the repo.
7. **Separate interiors and stairwells.**
8. **Townsfolk routines and crowd budget**, with the navigation graph, perf scenarios and ring-based detail.
9. **The capital itself**, on the streamer, with the castle.

## Open questions for the user

1. **The capital:** name, mood and look (timber and plaster? pale stone? colourful roofs?), and roughly how big. Is it where the player wakes after the tutorial?
2. **Interior size:** OK to require interiors to match their building's outside footprint?
3. **Ambient townsfolk** don't block the player (pass-through). Agreed?
4. **Time of day:** do routines follow a day/night clock (shops close, lamps light up), or is it always daytime for now?
5. **Enterable buildings:** should every building open, or are some decorative with locked doors? Private homes?
6. **Shops** need buying and selling, which doesn't exist yet. Keep the economy out of scope here, with shops as buildings that have counters and shopkeepers until it's designed?
