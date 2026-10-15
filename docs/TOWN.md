# Mistrom, the starting village

Draft, 2026-10-13. This doc covers Mistrom, the small hand-built village where players wake after the tutorial, the coast and countryside around it, what happens to Gelton meanwhile, and the authoring tools Mistrom needs. Cities in general are in [CITY.md](CITY.md), the land and the grid in [WORLD.md](WORLD.md), shops and jobs in [ECONOMY.md](ECONOMY.md).

**User decisions (2026-10-13):**
- **Wake in a smaller, focused village, not Gelton.** Gelton felt generated: too many buildings, townsfolk, jobs and shops, and lots of samey custom buildings. Maps should be hand-detailed rather than generated.
- **The village is Mistrom,** 96 × 96 tiles (3 × 3 chunks), with about 10–12 hand-placed buildings. It sits **where a river meets the ocean**, which gives room for fishing areas and coastal landmarks.
- **Generated land around it, with hand-placed spots, and a decent amount of it.** Terrain, water and woods stay generated from a seed (that part of Gelton's countryside worked). Landmarks, resource clusters, fishing spots and camps are placed by hand.
- **The world ends in a tall mist wall, all the way round.** It surrounds the whole world map (a 1,000 × 1,000 world just as much as today's), not a single area. It's only a soft border instead of a hard "end of the world", with no story planned.
- **Gelton is hidden for the prototype, with no hint of it.** Normal play can't reach it and nothing mentions it; the playground still can.
- **Ground floors open in place; upper floors and dungeons are separate locations.** Upper storeys, cellars and dungeons are separate spaces as the norm. A separate location for a *ground* floor is rare, kept for exceedingly large, detailed or instanced places.
- **Every shop has a shopkeeper.** Beyond the shopkeepers, there are no townsfolk to start; people are added as the game needs them.
- **The ??? voice welcomes you on first waking,** and can give a hint towards the first quest (still to be designed).
- **Better authoring tools, all four:** hand-shaped buildings, fast editing, a townsfolk tool, and prop polish with a visual palette.

## What Mistrom is for

The first real place a player sees, so it should:
- **Teach the loop by showing it.** Every skill from the tutorial has a place in Mistrom:
  - woodcutting and carpentry at the mill;
  - mining and smithing at the smithy;
  - fishing and cooking on the quay, the river and the inn;
  - gathering on the green, in the gardens and on the beach.
- **Be learnable in a few minutes.** A player can name every building after one walk around the green.
- **Point outward.** Every road leads somewhere worth going:
  - woods to the north;
  - a quarry up the river;
  - the coast and a lighthouse to the east;
  - a goblin camp to the west.

## Waking

The first time you wake in Mistrom (from the tutorial or by skipping it), you land beside the Iter Crystal on the green. The **??? voice** speaks, the same voice that ends the tutorial:

> "Welcome to Quadria. It's time for you to begin your adventure."

- It then offers **a hint**. Asking for one points you towards the first quest. Until that quest is designed, the hint points to the noticeboard on the green.
- **You can dismiss it and explore instead.**
- **It only happens once.** Later arrivals (travel, respawn) are quiet.

## Layout

96 × 96 tiles at the world origin, so its chunks and regions are the world's (WORLD.md, *Design constraints*). That's nine 32 × 32 chunks, and every building stays inside one. **The village axis runs down x = 48 and z = 48, the middle of the centre chunk**, so the green and the crystal are centred without touching a chunk line.

**Where it sits:**
- the river comes down from the north woods along Mistrom's east side;
- it widens into an estuary at the south-east corner;
- it meets the ocean, which lies along the village's south edge.

| | West (x 0–31) | Centre (x 32–63) | East (x 64–95) |
|---|---|---|---|
| **North** (z 0–31) | **The farm**: barn, fenced fields, scarecrow | **The inn**, facing the green; the north path to the woods | **The mill** on the river, with a waterwheel |
| **Middle** (z 32–63) | **The smithy** with an open yard (furnace, anvil, quench barrel); the west road out | **The green**: Iter Crystal, well, noticeboard, an old oak, benches | **The general store**; the east road over the river on a timber bridge |
| **South** (z 64–95) | An L-shaped house, a cottage and a small shrine | A two-storey townhouse, two cottages, the lane down to the shore | **The quay at the river mouth**: the fish stall, a jetty, moored rowboats |

- **The green** (about 16 × 16, centred on 48, 48): grass with a gravel ring path. The Iter Crystal is at the centre, so waking shows the inn to the north, the store to the east, the smithy to the west and the noticeboard beside you. The lane south gives a glimpse of the sea.
- **Roads:** a 3-wide dirt road crosses west to east through the green and leaves at both edges. Lanes 2 wide run north to the woods and south to the shore. Gravel and dirt, no cobble: this isn't a city.
- **The shore:** a strip of sand along the south edge. The quay is timber, at the river mouth. The sea starts just beyond the village and fills the south of the countryside.
- **No wall.** A low fence and gateposts mark each road where it leaves the village.

### Buildings

Sizes follow CITY.md *Scale rules*. Every building is placed and detailed by hand: doors, windows, roof, colours and trim chosen per building, nothing from a seed.
- **Ground floors open in place.**
- **An upper floor is a separate space** reached by an inside stair, where it adds something. Otherwise it's part of the outside look.

| Building | Size (about) | What it is | Notes |
|---|---|---|---|
| The inn | 10 × 8, two storeys | Inn: food and drink | The ground floor opens in place: bar, tables, hearth. **Upstairs is a separate space**, with guest rooms and beds to rest in. |
| General store | 6 × 5 | General store: buys everything, sells basic tools, food and materials | Sign, awning, counter. |
| Smithy | 6 × 5, plus a fenced yard | Smith: metal, tools, weapons and shields | The yard's furnace and anvil are free to use. |
| The mill | 7 × 6, plus a waterwheel | Carpenter: planks and carpentry supplies | A new waterwheel prop, turning. |
| Fish stall | Stall on the quay | Fishmonger | Beside the jetty, where the river and sea fishing meet. |
| L-shaped house | About 7 × 7 | Home | The showcase for hand-shaped buildings. |
| Townhouse | 4 × 5, two storeys | Home | Upstairs is outside look only, until someone lives there. |
| Cottages ×3 | 3 × 3 to 5 × 4 | Homes | Each different: roof, colour, flower boxes, a bench or barrel outside. |
| Barn | 7 × 6 | Farm | Hay, a cart, tools. |
| Shrine | 3 × 3 | Landmark | A statue and flowers; somewhere to sit. |

That's 12 structures, plus the quay.

### Shops and their keepers

Every shop has a shopkeeper, who stands behind its counter (or the stall) and opens it when you talk to them. The counter still opens it too.

| Shop | Keeper | Where they live |
|---|---|---|
| The inn | Innkeeper | Upstairs at the inn |
| General store | Shopkeeper | The townhouse |
| Smith | Smith | A cottage |
| The mill | Miller | The mill |
| Fish stall | Fishmonger | A cottage by the shore |

- **Keepers mind their shop.** Each has the shared keeper routine (`keep`, `tend`), plus a name, look and line. They give no jobs yet.
- **There are five shops,** down from Gelton's twelve. The smith's stock is a curated mix of the smithy, weaponsmith and armourer lists, so it needs its own shop id.
- **Jobs** come from the noticeboard on the green (board jobs, ECONOMY.md). Job givers come later.
- **Other townsfolk are added as the game needs them,** with the townsfolk tool. Homes are already there for them.

## The coast and countryside

The same approach as Gelton's countryside (WORLD.md, *The land*), with more of it:
- **A ring of generated land and sea about 96 tiles deep.** The whole area is about 288 × 288 tiles (9 × 9 chunks), tuned once we walk it.
- **Mistrom's roads continue into it and end at places, not at the edge.**

**Generated** by biome rules ([BIOMES.md](BIOMES.md)): coast to the south, wetland at the estuary, meadow and broadleaf forest inland, pine forest and hills to the north.
- **Land:** height, hills, and the woods' tree cover.
- **The coastline:** beaches, a headland and rocks.
- **The river:** coming from the north, with a pond upstream.
- **The sea:** filling the south.

**Hand-placed** (stored in Mistrom's map data, editable in the editor):

| Spot | Where | What |
|---|---|---|
| Woodcutter's grove | North woods, at the end of the north path | A camp (stump, sawhorse, log pile) and dense, easy trees |
| The quarry | Up the river, north-east hills | Copper outcrops and boulders, a cart and a tool rack |
| Upriver pond | North-east, above the quarry | Quiet freshwater fishing spots |
| The estuary | South-east, beyond the quay | Fishing where river meets sea; mudflats to gather from |
| The lighthouse | East, on the headland at the end of the east road | A landmark you can walk up to, with a view along the coast |
| The beach | South-west along the shore | Tide pools to gather from, and a shipwreck as a landmark |
| Goblin camp | West, off the west road | Scrappers near the road side, bruisers deeper in (as Gelton's) |
| Old watchtower | North-west, on a rise | A ruined landmark; sticks and stones around it |

**Fishing:** there's only one fish today (Pondfish). The pond, river, estuary and sea are laid out as distinct spots now, so later fish types can differ by water.

## The mist wall

**The whole world ends in a tall wall of mist, all the way round,** out over the sea too. It's a property of the world, not of Mistrom: when the world is 1,000 × 1,000 tiles (or the planned 2,048 × 2,048), the mist still runs along its outer edge. Until the world is one map, it runs along the outer edge of the map in play (Mistrom's countryside, Gelton's in the playground).
- **It's clearly a boundary:**
  - soft, white and slowly drifting;
  - taller than anything near it;
  - visible from a distance, so you see it coming.
- **Beyond it there are no tiles,** and the last tiles before it are unwalkable. Clicking into it does nothing, or shows "The mist is too thick to go on" as a short toast.
- **It's one shared effect,** made of a few soft layers drawn per chunk along the edge (no per-frame CPU work). It belongs to the world's edge, so maps don't place it.
- **It has no story.** It's a soft border instead of a hard "end of the world".

## Gelton during the prototype

- **Not reachable in normal play, and not mentioned:**
  - waking lands in Mistrom;
  - Gelton isn't a crystal destination and isn't listed;
  - no sign, road or line refers to it.
- **Kept:**
  - `src/maps/capital.json`, its layout generator and its countryside;
  - its tests;
  - its perf scenarios (`capital-square`, `countryside-walk`);
  - the playground's *Enter Gelton*.
- **Mistrom gets its own perf scenarios:** standing on the green, and a coast and countryside walk.

## Authoring tools (Phase 1)

What Mistrom needs from the editor, in build order. Each is general: it works for any map, not just this one.

1. **Fast editing** (done 2026-10-13; CITY.md, *Fast editing*):
   - select a building, prop, stair or townsfolk and move, rotate, duplicate or delete it, with undo;
   - drag to paint terrain height and surfaces (paths, gardens, fields, sand);
   - rebuild only the chunks an edit touches, not the whole map.

   Hand-drawn edges keep their own tools.
2. **Hand-shaped buildings:**
   - **any connected footprint, painted tile by tile** (done 2026-10-14; CITY.md, *Hand-shaped buildings*), with joined roofs over L, T and U shapes;
   - click a wall to add, move or remove a door, window or sign (done 2026-10-14; CITY.md, *Hand-shaped buildings*);
   - per building: roof style and colour, wall style and colour, trim, chimney, flower boxes and awning, chosen rather than seeded (done 2026-10-14);
   - an upper floor as a separate space with an inside stair (the inn's rooms) (done 2026-10-14; CITY.md, *Floors*);
   - the one-chunk rule still holds.
3. **Prop polish and palette:**
   - **A searchable palette** with a thumbnail per prop, grouped as now.
   - **Reworked props, the most-used first:** stalls, counters, fences and gates, lamps, crates and barrels, trees.
   - **New props Mistrom needs:**
     - a waterwheel (turning);
     - crop rows (cabbage, wheat);
     - a scarecrow;
     - a shrine;
     - quay and jetty pieces;
     - a moored rowboat;
     - a lighthouse;
     - a shipwreck;
     - tide pools;
     - a sawhorse.
4. **Townsfolk tool** (done 2026-10-14; see *Townsfolk tool* below):
   - place a person;
   - set their name, look (colour, hat, carried tool), home, routine, line, shop and job;
   - see their routine spots drawn on the map.

   It replaces editing `townsfolk` JSON by hand. Mistrom's five shopkeepers are its first use.
5. **Editing the surrounding land:**
   - place spots outside Mistrom's own 96 × 96: landmarks, resource clusters, fishing spots, camps;
   - shape the coast's generation (where the shore and headland fall);
   - these are saved with the map.
6. **The mist wall,** as a shared world-edge effect with its blocking rule.

Every tool gets playground coverage, as AGENTS.md requires. The editor is playground-only. The mist wall is a game feature, so it also gets a playground control to show and inspect it.

## Phases

1. **Tools and the mist wall** (above), each verified on the kit street and a blank map.
2. **Mistrom:**
   - I build it in the editor from this plan;
   - you refine it, and it's saved as `src/maps/overworld.json` (the overworld map, below);
   - its shopkeepers;
   - its coast, countryside and spots;
   - the mist wall at its edge;
   - the waking welcome and hint;
   - Gelton hidden.
3. **Verify:**
   - the tutorial-to-Mistrom flow and skipping the tutorial;
   - the welcome showing once;
   - every shop and keeper, and the noticeboard;
   - the inn's upstairs;
   - the mist wall all round;
   - travel and defeat respawn;
   - the playground controls for everything new;
   - both builds;
   - one perf pass with Mistrom's scenarios.

## Dock, whole regions and checks (2026-10-15)

User requests: the panel where the catalogue is (no Show / Hide panel), maps in whole regions, clearer grid lines, a way to raise ground beside a full-block step, and the "17421 tiles can't be reached" warning.
- **The dock** (bottom left): the tool's options and what's selected, and in Decorate the catalogue below them.
  - Outside Decorate the options always show there.
  - In Decorate they show only for something selected, paint and stamps.
  - The status line moved into the bar.
  - A fifth tool group, **Map**, holds Inspect and the map's settings (open, save, copy, download, grow, round up, free camera, lines) and its checks.
  - Show / Hide panel is gone.
- **Whole regions** (`world-map.js`): a world map is whole 128-tile regions each way.
  - `growMap` refuses a size that isn't (`wholeRegions`); Grow adds 1 or 2 regions a side.
  - `roundUpToRegions` (*Round up to whole regions* in Map, shown only for a map that isn't whole) pads half the missing tiles west and north (in whole chunks) and the rest east and south.
  - New land carries on the edge's biome and terrain paint, so a sea painted to the edge goes on being sea.
  - The map checks warn about a land map that isn't whole regions. A blank map is 128 × 128.
  - The overworld was padded from 288 × 288 to 384 × 384 (3 × 3 regions): 32 tiles west and north, 64 east and south. Its crystal is now at 176, 176.
- **Grid lines** (`grid-overlay.js`): flat ribbons, a bright core on a dark edge, so they read on light ground. Region lines (gold) are wider than chunk lines (pink).
- **Raising beside a step:** in the editor, a click on a tile's side (a cliff's face) means the lower ground that face looks onto, not the top above it (`editorTile`, main.js). Before, clicking "next to" a raised block usually hit its face and raised the block again.
  - Raise steps by half a block, so the tile in front of a full-block step becomes the half step up to it.
- **Raising water** (user, 2026-10-15: the beach-height tiles beside the sea and river): water raised by hand alone (no path, pad or prop over it) counts its height from the water's level (`town-ground.js`). One Raise makes dry ground at the banks' height (1, a beach, with the biome's shore look), the next 1.5; lowering it back to the water's level makes it water again. A path, pad or prop over water still stands at ground level. Before, the first Raise on water jumped to 1.5 and one Lower went straight back to water, so a beach-height tile couldn't be made.
- **Unreachable ground:** land cut off only by water (across the river or the sea) is now one note, "N tiles of land across the water: no bridge or boat reaches them yet", not a warning.
  - Ground a full-block drop cuts off is still a warning (`reachableAcrossWater`, map-checks.js: crossing water, then out onto a beach).
  - The overworld's checks: the river's far side (35,299 tiles) and an islet are notes; one warning is left (a one-tile slot).
- **Checked in the browser:**
  - the dock in Decorate (catalogue only), in Terrain (the brush options) and in Map;
  - the overworld at 384 × 384 with its lines;
  - a full-block tile, then clicks on its two faces raising the tiles in front to half steps (the block stayed put).

## Opening in the editor, compact catalogue (2026-10-15)

User request: open the editor on the overworld when the playground starts (the game's start an area switch), free camera and a hidden panel by default, and a compact catalogue like the Sims'.
- **On start:** the playground opens the world editor on the overworld (`mountPlayground`), unless the address has `?game` (the perf harness always adds it). *The clearing (where the game starts)* in the Map list closes the editor and starts the game afresh there.
- **Defaults:** the free camera is on while the editor is open (back on the slime on Close). (The side panel has since moved into the dock: see *Dock, whole regions and checks* below.)
- **Checks:** clicking one moves the camera over its place (`lookAt`, main.js: the free camera's focus) and marks it in its severity's colour (red, amber or blue), filled with an outline around it, with the check shown as chosen in the list. Your next click in the world, Esc or another check clears it.
- **Compact:** the bar sits top left at its own width. The catalogue sits bottom left (up to 640 wide): Function / Room and Search along its top, the groups on the left, and square icons only on the right (the name on hover), two rows tall, scrolling down.

## Decorating indoors, doors and stairs (2026-10-14)

User request: hide what's lifted, wall and floor paint, Sims-like doors and stairs, and steps 4 and 5 (decorating indoors, the room tool).
- **What's lifted leaves the world** (`src/held.js`). The Hand marks it as held:
  - the builders skip it (buildings, props, stairs, a building's or floor's furniture, the map's edges, placed nature, fishing, enemies, townsfolk and the crystal);
  - only its ghost shows until you put it down or back.
  - Its data stays in the map, so indices and undo hold. The map checks wait while something is held.
- **Walls** (the bar): *Walls up* (as in the game), *Cutaway* (every building cut to one storey; the default while editing) or *Walls down* (every wall just above the floor).
  - This is a cut-height uniform in the cutaway shader (`setCutHeight`, `cutaway.js`) and `setWalls` in main.js.
  - Play shows the game's own cutaway again.
  - Inside walls now belong to their building, so they cut with it.
- **Levels:** Page Up / Page Down or the bar's ▲ ▼ go up and down in the building you're in, the selected one, or the one under the pointer. The bar shows where you are.
- **Doors and stairs, as in the Sims:**
  - The Hand picks up a building's door; it goes down on another of that building's walls (where you click). The door rule still applies, and a refused door stays in your hand.
  - The Hand picks up a floor's stairs: they go down where you click (their bottom step), `,` and `.` turn them, and Esc puts them back.
  - Map stairs (outdoor flights) turn with `,` and `.` too.
  - Inspect still goes through doors and up and down stairs.
- **Decorating a ground floor in place:** the catalogue works inside an in-place building on the map. What you put down there is that building's ground-floor furniture.
  - The first time, the game's own furnishing becomes placed (as it stands, one undo step), so nothing jumps.
  - Furniture on the map can then be lifted, recoloured, eyedropped and removed like any other.
  - The same works on every floor.
- **Room** (Build): drag a rectangle.
  - On open ground it's a new building on that footprint, as *Build it* makes one.
  - Inside a building (its ground floor on the map, or the floor you're on), the rectangle's sides that aren't already the building's walls become walls, with a door in the middle of the longest side (at least 3 long).
  - A ground floor's rooms are the building's own (`edges` on the building entry, local to its north-west tile), so they move with it.
- **Push/pull walls** (Build): drag from a tile along a building's outside wall, outwards to push that wall out or inwards to pull it in, with a green or red preview of the tiles gained or lost.
  - The building is reshaped as Reshape does.
  - Its rooms, paint and floors stay where they were when its north-west corner moves. Reshaping no longer drops a building's floors either.

## Wall and floor paint (2026-10-14)

- **Floor paint and Wall paint** (Decorate): any colour (a picker, the game's palette, your recent colours), on the whole room or one tile or wall; *Remove paint* takes it off.
  - A room is the tiles reached without crossing a wall, window or door, inside one building (its ground floor on the map, or the floor you're on).
  - One wall: the wall of that tile you click towards.
  - Doors aren't painted.
- **Data** (`src/paint.js`): `paint: {floor: {'dx,dz': colour}, walls: {'dx,dz,side': colour}}`, local to the building's north-west tile; a wall face is keyed by the tile in front of it and the side the wall is on.
  - An in-place building's ground floor keeps it on the building entry. Upper floors, cellars, a separate ground floor and dungeon levels keep it on their floor.
- **Drawing:**
  - A painted floor tile takes a two-tone checker of its colour; unpainted building floors show the floor surface, not the land's colours (they used to show grass on land maps).
  - A painted wall face is a thin coloured skin on that face of the ground storey (around a window's glass, between the base and the band above; `edge-models.js`), baked with the walls, so it cuts with them.
- **Checked in the browser:**
  - a 7 × 6 house from the Room tool, then a 4 × 3 room inside it with its door;
  - room floors blue and tan, room walls yellow and blue, one wall red;
  - Walls down and Cutaway;
  - a chair from the catalogue as ground-floor furniture (the game's own kept);
  - lifting it (gone from the world while held) and putting it down;
  - moving the door to the north wall;
  - pushing the east wall out and pulling the south and west walls in (rooms and paint kept);
  - moving the house with the Hand, its room going with it;
  - a second floor, its stairs placed, picked up, turned, refused, and put down;
  - Page Up and Down;
  - a lifted building gone while held and back on Esc.
  - Tests: `paint.test.js` (keys, ground floor and upper floor paint, a building's own rooms moving with it).

## Sims-style editor (2026-10-14)

User request: make the world editor work like the Sims 4 build/buy editor, for a collaborator who loves the Sims and leans towards decorating. Freeform Sims walls and roofs are out: building stays on the tile grid with the kit.
- **Layout** (`src/dev/world-editor.js`, `world-editor.css`):
  - While editing, the world fills the window and the player interface hides (`setEditorScreen`, main.js). Play shows it again for the test walk.
  - A bar along the top: the map, Edit / Play, Undo, Redo, Reset, Hide panel and Close; then the tool groups and that group's tools.
  - A side panel: the status line, the tool's options, what's selected (colours, look, spawn, townsfolk, floors) and two sections, *Map* (open, save, copy, download, grow, free camera, chunk lines) and *Checks*.
  - In Decorate, the catalogue along the bottom.
  - Phones: the panel starts hidden (*Show panel*), the bar's rows and the catalogue scroll sideways, and the world stays in view.
  - The game's hover hint ("Move here") hides while editing.
- **Tool groups:**
  - **Decorate:** Hand, Colours, Eyedropper, Sledgehammer (Erase), Stamp;
  - **Build:** Building, Footprint, Walls, Edge, Stairs, Use, Reroll furniture, Underground;
  - **Terrain:** Raise, Lower, Flatten, Smooth, Ramp, Surface, Biome;
  - **World:** Nature, Enemy, Townsfolk, Crystal, Arrival, Inspect.
  - The old Prop tool and its palette are gone: the catalogue replaces them.
- **Catalogue** (`src/dev/prop-catalogue.js`): every prop by function (seating, beds, tables and counters, storage, lighting…) or by room (bedroom, kitchen and dining, tavern, shop, workshop, garden and farm, harbour…), with search.
  - A prop may be in several groups; a test checks every prop has a room and a function.
  - A click puts a new one in your hand. Inside a floor it's furniture on that floor.
  - Once you've picked an item, its saved colour presets show beside *Own colours*.
- **The Hand** (Decorate's main tool, `select`):
  - Click something to lift it: it follows the pointer, as a green or red ghost, and keeps the spot you took hold of under the pointer. Click again to put it down.
  - Put it down where it was and nothing changes; anywhere else is one undo step.
  - Click inside a box-selected group to lift the whole group.
  - Turning: `,` and `.` turn what you hold one way or the other (R clockwise). Or press where it goes and drag the way its front should face, then let go.
  - Something new (from the catalogue, the eyedropper, a duplicate or a paste) stays in your hand when a spot is refused, with the reason under the status line.
  - Shift-click places one and keeps another in your hand. Esc puts a lifted thing back, or puts away what you hold; Delete also puts away something new.
  - Dragging from empty ground still draws a selection box.
- **Colours** selects without lifting; the selection panels show what you can change.
- **Eyedropper:** click anything (a prop, building, stairs, townsfolk, enemy spawn, or a tree or flower that grew there) for a copy in your hand, colours and all.
- **Sledgehammer:** the Erase tool.
- **Kept:** box select, Ctrl/⌘+C and V, Ctrl/⌘+D, M, nudges, undo and redo, and every other tool works as before.
- **Checked in the browser** (overworld, and floor 2 of a new townhouse):
  - placed a bench from the catalogue and saw its ghost follow the pointer;
  - lifted it, turned it by dragging, and put it down;
  - a refused spot kept the item in hand;
  - Shift-placed two eyedropped chairs;
  - put a bed on an upper floor from the catalogue;
  - Play brought back the player interface beside the editor;
  - the phone layout.

## Colours (2026-10-14)

User request: a colour picker for every piece of every item, any colour, with saved presets of combinations (the collaborator misses the Sims 2 and 3 colour picker).
- **Pieces** (`props.js`): each distinct colour in a prop's model is a piece.
  - `propPieces(kind)` lists them, largest first, with names from the shared palette (wood, dark wood, iron, linen…) or a colour word ("pale blue"). Names are unique within a prop.
  - A placed prop or piece of furniture stores `colors: {original: new}` ('#rrggbb'). `cleanColors` keeps only real changes.
  - `propModel(kind, colors)` and `createProp(…, {colors})` draw them. Every prop of a kind with the same colours shares one geometry.
  - Maps, floors and dungeons pass a prop's colours through (`world-map.js`, `spaces.js`). Stamps, copies and the eyedropper carry them.
- **The panel** (Colours or the Hand, with a prop or furniture selected):
  - one row per piece: its name, a colour picker (any colour; no limits) and Reset;
  - quick colours for the chosen piece: the game's palette, then your last 12 colours;
  - Reset all colours.
  - Dragging a picker recolours live (the prop's chunk or floor rebuilds), and the whole drag is one undo step.
- **Presets** (`src/palettes/<id>.json`, saved through the playground dev server like stamps; Vite ignores the folder while it runs, so saving doesn't reload the page):
  - **for this item:** its colours, for props of the same kind;
  - **for any item (a scheme):** colours by piece name ("dark wood", "cloth"…), for any prop with pieces of those names.
  - Apply one to the selected prop, or a scheme to every prop in a box-selected group. Props without those pieces are left as they are.
- **Checked in the browser:**
  - recoloured a bench's wood (any colour) and a chair's dark wood (a quick swatch);
  - undid and redid a recolour;
  - saved an item preset and a scheme, and applied the scheme to a box of three chairs and a bench (the bench has no dark wood, so it stayed as it was);
  - the chair's preset showed in the catalogue;
  - recoloured a bed on an upper floor.
- **Since:** wall and floor paint per room (*Wall and floor paint* below).

## Box select, copy and stamps (2026-10-14)

User request: editor next steps, section 2 (box select and group moves; copy, paste and stamps).
- **Box select:** with Select, drag a box. Everything placed inside it is selected as a group:
  - buildings, props, stairs, edges, resources, ground cover, fishing spots, enemy spawns and townsfolk;
  - on a floor, its furniture.
  - A click without dragging still selects one thing.
- **A group** moves (M or the nudge buttons), duplicates (Ctrl/⌘+D), deletes (Delete), and shows its tiles. It can't rotate.
  - Deleting keeps townsfolk homes pointing at the right buildings.
  - Each of these is one undo step.
- **Copy and paste:** Ctrl/⌘+C copies the selection (one thing or a group). Ctrl/⌘+V then a click places it with its north-west corner there, with a green or red preview.
- **Stamps:** a saved group that can be placed again (Stamp tool).
  - *Save selection as stamp* (with a name) writes `src/stamps/<id>.json` through the playground dev server, and keeps it for the session.
  - A saved stamp doesn't reload the page: Vite ignores `src/stamps` while it runs, and the next start lists it.
  - A stamp holds its items relative to its corner (`{name, size, items: {building: […], prop: […], …}}`). It doesn't hold the ground.
  - Pick one in the Stamp tool, then click to place it, with a preview.
- **Checked in the browser** (overworld):
  - boxed a 7-tile fence, copied, pasted and nudged it, deleted it, and undid that;
  - saved it as a stamp with no page reload, then stamped it elsewhere.

## Lines and brushes (2026-10-14)

User request: editor next steps, section 2 (path and fence lines; bigger brushes, smooth, ramp, water by hand).
- **Brush sizes:** 1, 3, 5, 7 and 9 tiles square, for raise, lower, flatten, smooth, ramp, nature, surface and footprint.
- **Shape** (raise, lower, flatten, smooth, nature and surface):
  - *Paint as you drag* (as before);
  - *A straight line*: drag from one end to the other, with a blue preview of the line at the brush's width; it's one undo step on release.
- **Edge lines:** with Edge, drag to lay the chosen edge (fence, wall, railing, counter, door, window, or Remove) along a straight row or column, on the chosen side of each tile.
  - The line follows whichever axis the drag mostly follows.
  - A click still sets one edge. Inside a floor, the line goes on the floor's own edges.
- **Smooth:** each tile eases to the average height of the tiles around it, to the half block.
- **Ramp:** drag from one end to the other. The ground slopes evenly from the start tile's height to the end tile's, to the half block, at the brush's width.
  - The status warns when it's too steep to walk (more than half a block a tile).
- **Water by hand:** the Surface tool's *water* paints still pond water (`w` in the surfaces; land maps only, not on floors).
  - *Land's own* clears it back to the ground.
  - It's a tile like the land's ponds: it blocks walking and is drawn as water.
- **Checked in the browser** (overworld):
  - a ramp from 1 to 3.5 over nine tiles;
  - a 7-tile fence line from a diagonal drag;
  - smooth with a 5 × 5 brush;
  - a 3-wide line of water;
  - a 3-wide line raised by half a block.
  - Unit test: painted water is a still pond tile, and clearing it gives the land back.

## Townsfolk tool (2026-10-14)

User request: build the townsfolk tool (authoring tools, item 4). It replaces editing `townsfolk` JSON by hand.
- **Townsfolk tool:** click to place a person (with a preview). They start with a name, a colour and a routine (stroll, chat, gaze), and are selected so you can set them up.
- **Townsfolk panel** (any selected townsfolk), each change one undo step with the crowd rebuilt:
  - name and line;
  - colour;
  - hat, and right-hand and left-hand items (`look.loadout`, from the game's gear);
  - pace;
  - the building they live in or keep (`house`, a list that follows the map's buildings);
  - post-office jobs (`giver: 'post'`; shopkeepers give their shop's jobs anyway);
  - which way they face at a post.
- **Routine:** a weight from 0 to 9 for each activity (sit, sleep, cook, work, browse, vend, gaze, drink, read, chat, stroll, enter, patrol, home, keep, tend, post).
- **Patrol:** *Draw patrol route*, then click tiles to add stops (adding `patrol` to the routine) and Esc or *Done* to finish. *Clear patrol* removes the route.
- **Their places on the map:** while a townsfolk is selected, their home is drawn gold, their building sand, patrol stops pink, and the props and furniture spots their routine uses (within 48 tiles) blue.
- **Moving:** select a townsfolk to move them (M) or delete them. Duplicate gives a new id.
- **Checks:** the map checks report a townsfolk who can't do anything in their routine, or whose building isn't one they can live in.
- **Checked in the browser:**
  - placed a person beside a shop and a bench;
  - set their name, line, hat, home building, a sit weight and a two-stop patrol;
  - the crowd rebuilt with each change, and the overlay showed their places;
  - no townsfolk check problems and no console errors.

## Enemy spawns (2026-10-14)

User request: an enemy spawn placement tool (generated enemies are off; spawns are placed, docs/BIOMES.md).
- **Data:** `enemies: [{x, z, enemy, aggressive, respawn}]` in the map.
  - `enemy` is a combat-rules.js kind: practice target, goblin scrapper, goblin bruiser or Cinder Golem.
  - `respawn` is in seconds.
  - The golem's 2 × 2 body has its spawn tile as the north-west corner.
- **In play:** spawns come in through the land's streamer (town-ground.js `townSource` extras) like any other enemy, with their own respawn time (main.js `placeLandExtra`). A defeated enemy stays away for that time, even while its chunk is unloaded.
- **World editor:**
  - The **Enemy** tool sets the enemy, its behaviour (passive, which fights back, or aggressive) and its respawn time (30 s to 15 min). Its preview turns red, with the reason, on water, blocked tiles or another spawn.
  - **Select** picks a spawn. Move (M), Delete and Duplicate (Ctrl/⌘+D) work, and a **Spawn** panel changes its enemy, behaviour and respawn in place.
  - **Erase** removes one.
  - Spawns move with the map when it grows, and undo covers them.
- **Tests:** `town-ground.test.js` checks placed spawns stream with their settings while generated enemies are off, and move with growth.
- **Checked in the browser:**
  - placed a scrapper and an aggressive golem (both spawned);
  - refused over the crystal;
  - changed the scrapper to a bruiser from the Spawn panel;
  - erased the golem;
  - no errors in the checks.

## Auto graphics recovers (2026-10-14)

User report: Auto made the game look like Low or Lowest although High ran at a steady 60 fps.
- **Cause:** Auto stepped down after two 5-second windows averaging over 28 ms a frame. Editor rebuilds, map loading and streaming bursts on a fast machine look exactly like that. It never stepped back up, and it saved the lowered tier, so every later load started low.
- **Fixes** (`render-quality.js`):
  - Editor rebuilds call `quality.settle()`, a warm-up before frame times count again, as arrivals already did.
  - Auto steps back up one tier after three windows in a row at the display's own rate. A tier it had to leave isn't tried again in the same session, so it can't flicker.
  - Saved settings carry a version. Auto tiers saved before this start over at High, and a chosen mode is kept.
- **Tests:** `render-quality.test.js` covers climbing back up, not retrying a tier that failed, and the old saved tier resetting.

## No land outside the map; free camera speed (2026-10-14)

User request: "All the map should be editable and reachable. There shouldn't be any unusable map."
- **The land covers the map exactly.** `townLand` no longer generates a ring around it, and `land.ring` is gone from the data and the editor (*Add land* just puts the map on the land). The overworld's 288 × 288 is all the land there is, and its edge is the world's edge (where the mist wall will go).
- **Free camera:**
  - Panning was slow and stuttery. The fixes:
    - goblins share their geometry and materials, so a chunk spawning one builds nothing new;
    - hover picking pauses while the camera pans;
    - chunk terrain is indexed, about a quarter of the mesh per chunk;
    - nothing streams outside the map any more.
  - A middle-drag now grabs the ground (it stays under the pointer), and WASD is faster.
  - Measured with the `overworld-pan` perf scenario (PERFORMANCE.md ledger): 95th-percentile frame from 18 ms to about 10 ms, the worst from 80 ms to about 28 ms, no long tasks.

## Shortcuts and preview ghosts (2026-10-14)

User request: more intuitive shortcuts that never rebind movement keys, and preview ghosts.
- **Shortcuts** (world editor, Edit mode):

  | Key | Action |
  |---|---|
  | Ctrl/⌘+D | duplicate |
  | R | rotate |
  | M | move |
  | Delete | delete |
  | Esc | cancel |
  | Ctrl/⌘+Z | undo |
  | Ctrl/⌘+Shift+Z or Ctrl/⌘+Y | redo |

  - WASD and the arrow keys always belong to the camera (and the free camera).
  - Nudging one tile is four buttons.
  - *Reshape* (repaint a selected building's footprint tile by tile, then *Build*) is a button with no key.
- **Previews:** under the pointer, what a click or a stroke would change. Green means it fits, red means it doesn't, and the reason shows under the status line ("Can't place here: …"). They use the same checks as placing (`validate(…, {dry: true})`), without changing anything:
  - **props:** their footprint plus a see-through model, the real one, rotated, at its height;
  - **buildings:** the footprint of the chosen preset and rotation (the one-chunk rule and overlaps);
  - **stairs:** the flight with its landings;
  - **the crystal and the arrival spot;**
  - **moving and placing a copy:** the selection where it would go, with its model for props;
  - **nature:** the brush, green where each choice can go and grey where it can't (red when clearing);
  - **raise, lower, flatten and surface:** the brush area, in blue;
  - **footprint:** green to add, red to remove;
  - **biome:** the cells, in the biome's colour;
  - **erase:** what would go, in red;
  - **use and reroll:** the building under the pointer.
- **How it works:**
  - The game tells the editor the tile under the pointer (`setTileHover`, only in Edit mode and only when the tile changes).
  - The fill is one instanced mesh (`createCellFill`, grid-overlay.js).
  - Previews follow the tool, its options, the brush size, the selection and moving, and redraw after each rebuild. Play mode clears them.
- **Checked in the browser:**
  - a lighthouse (green fill and ghost), and refused over the crystal (red, with the reason);
  - a 3 × 3 raise brush, a cottage's footprint, the biome cells, and Play clearing them;
  - Ctrl+D showing the copy's ghost and placing it, then Ctrl+Z;
  - an arrow key no longer nudging the selection.

## Editor speed, draw distance and the free camera (2026-10-14)

User report: editor performance was "atrocious". Measured on the 288 × 288 overworld:
- **Strokes:**
  - The cause: every brush step rebuilt a chunk in about 70 ms, so drags ran at about 13 fps. Several loops in `rebuild`/`populate` walked every tile of the map (about 83,000), building a chunk id string for each.
  - The fix: a per-chunk tile index (`byChunk`), so a partial rebuild visits only its chunks and their border. A step now takes about 16 ms (about 9 ms for the city's part).
- **Adding and deleting buildings:**
  - These no longer force a full rebuild. Buildings whose place in the list changed (added, or after a removed one) rebuild in their chunks.
  - Adding a building took about 1 s; it now takes about 0.1–0.4 s.
  - Deleting one took about 2 s; it now takes about 0.2 s.
- **Biome painting:**
  - The land forgets only the area around the painted cells (`forget`, 48 tiles past them) and only those chunks rebuild. A warm stroke went from about 2 s to about 0.6 s.
  - The land is kept between full builds while its settings are unchanged (`useCells` reads a new paint object after undo).
- **Undo and redo:**
  - They apply the saved state in place and rebuild only what differs: ground rows, entries, the crystal and arrival, removed nature, and repainted cells.
  - A change of size or land settings still rebuilds everything.
- **Still slow:**
  - The first open generates the whole map's land (about 1.3 s).
  - A full rebuild takes about 0.7 s once the land is generated.
  - The checks take about 0.15 s, run once after editing stops.
  - Building the map's content per chunk, streamed like its ground, is the next step for large maps.
- **Draw distance** (Settings → Graphics; `render-quality.js` `drawDistance`):
  - Near, Medium, Far or Very far: 1–4 chunks around you, saved per device.
  - Every streamed land and town streams that far, and the camera's far plane follows.
  - Far took the overworld from 326 to 1,093 draw calls.
- **Free camera** (playground; docs/PLAYGROUND.md): the camera pans on its own and zooms out to 140, with streaming and shadows following it, so you can edit anywhere without walking.
- **Naming:** `growMap` (not `growMap`). Maps aren't cities; the remaining `city` names (`world-map.js`, `buildMap`, the world editor) are older and can be renamed separately.

## Growing the overworld (2026-10-14)

User request: grow the overworld, so the river, coast and sea (and the woods and hills) are part of the map you edit.
- **The overworld:** 288 × 288 tiles (9 × 9 chunks). Mistrom's 96 × 96 sits in the middle, with the crystal at 144, 144. The woods and hills to the north and west, the river to the east, and the coast and sea to the south are all its own tiles now. `src/dev/overworld-layout.js` builds the wild start, then grows it by three chunks on every side.
- **`growMap(data, {north, east, south, west})`** (world-map.js):
  - grows a map by whole chunks on any side;
  - growing west or north moves everything built: ground paint and offsets, buildings, props, stairs, edges, resources, cover, the crystal, the arrival spot, townsfolk homes and patrols, and removed nature;
  - on the land it moves the map's `land.origin` (where its 0, 0 lies in the land), so the land stays exactly where it was under what was built. Biome cells stay in the land's own cells.
  - It refuses a walled city.
- **Land origin:** `townLand` shows the land from the map's origin, covering tiles, entities and their ids, extras, cover and biomes. The editor's biome brush and overlay follow it.
- **Faster partial rebuilds:**
  - a rebuild now works out fresh ground only for the chunks an edit touched, plus the chunks within 16 tiles of any building pad that moved or changed level;
  - it no longer works out the whole map's ground.
- **Editor:** *Grow* (all sides or one) *by* 1–3 chunks, then *Grow map*. It's one undo step and a full rebuild, and you stay on the same ground.
- **Measured in the browser (288 × 288 overworld):**
  - opening the editor takes about 1.2 s;
  - a surface stroke takes 0.1 s;
  - moving a building takes 0.14 s;
  - adding a building (a full rebuild) takes about 1 s;
  - growing by a chunk takes about 1 s.
- **Checked in the browser:**
  - placed a lighthouse on the coast's sand, a jetty out into the sea with a rowboat, and a shipwreck;
  - grew the map west by a chunk (everything moved with it, the land stayed) and undid it;
  - no errors in the checks.
- **Tests:**
  - `town-ground.test.js` checks that growth keeps the land and what was built where they were;
  - `overworld.test.js` checks the size, the origin, the middle chunk, and the river and sea being the map's own tiles.
- **Not yet:**
  - Adding a building still does a full rebuild.
  - The map file is about 330 KB, mostly unedited rows; a sparser format can come later.
  - The overworld will need to stream its city content (not only its ground) as it nears the world's 2048 × 2048.

## Prop palette and village props (2026-10-14)

User request: the prop palette next, then the props the village needs.
- **Palette** (world editor, Prop tool; since replaced by the catalogue, *Sims-style editor* below):
  - a search box over the prop groups;
  - each prop is a button with a thumbnail and its name, and the footprint shows on hover;
  - thumbnails are drawn from each prop's real model, from the game's angle, a few per frame the first time the tool opens (`src/dev/prop-thumbnails.js`, dev only; one offscreen renderer, freed when done).
- **Village and coast** (`src/prop-sets/village.js`), a new palette group:
  - waterwheel (turning);
  - cabbage and wheat rows;
  - scarecrow;
  - shrine (look at it);
  - quay and jetty pieces;
  - mooring post;
  - rowboat;
  - lighthouse (lit lantern);
  - shipwreck;
  - tide pools;
  - sawhorse.
- **New shared prop options** (props.js), for any prop:
  - `water: 'any' | 'only'` lets a prop stand on water tiles. The editor and `createProp` refuse a land prop on water and a boat on land. In a town on the land, a water prop's tiles stay water instead of becoming made ground.
  - `deck`: the prop's water tiles become walkable boards at ground level, with the water still drawn below (`overWater`, like the countryside bridge). They're clicked as their tile, and given back when the prop goes.
  - `spin: {pivot, axis, speed, parts}`: a part that turns every frame (`updateProps`, `spinProp`). The model catalogue shows it Turning or Still. Spinning and deck props stay out of the per-chunk static merge.
- **Prop gallery:** shows every prop that stands on land. Water-only props (the rowboat) are in the model catalogue and can be placed on water in the editor.
- **Tests:** `village-props.test.js`, which checks:
  - every new prop builds;
  - a jetty's boards are walkable and given back when it goes;
  - water props are refused off water, and land props on it;
  - the waterwheel turns;
  - a jetty on a town pond keeps its water.
- **Checked in the browser (overworld):**
  - searched and placed from the palette;
  - placed two jetty pieces, a rowboat and a mooring post on a pond, and walked out onto the jetty in Play mode;
  - placed the waterwheel, crops, scarecrow, shrine, sawhorse, lighthouse and tide pools;
  - no errors in the checks or the console.
- **Not yet:**
  - The coast, the river and the sea lie outside the overworld's 96 × 96 editable bounds, so the quay, lighthouse and shipwreck can only go by ponds for now. That waits on growing the overworld.
  - Reworking the most-used existing props (stalls, counters, fences, lamps, crates, barrels, trees) is the palette's second half.

## The overworld map (2026-10-14)

User decision: the map holding Mistrom is the start of the whole world map, not a town map.
- It's called `overworld`, shown as *Quadria overworld*. It lives in `src/maps/overworld.json`, and the editor's *Save to repo* writes that file, since saving names the file by the map's id.
- Its starting point is generated by `src/dev/overworld-layout.js` (`node scripts/generate-overworld.mjs`), and its tests are `src/overworld.test.js`.
- Mistrom is still the starting village's name. It's the first place built on the overworld.

## Nature by hand and the crystal (2026-10-14)

User request: move the Iter Crystal, and add, move or delete resources and the small ground cover (ferns, grass, flowers).
- **Data** (any map on the land):
  - `resources: [{kind, species, x, z}]`: placed trees and resources;
  - `cover: [{kind, x, z}]`: placed ground cover;
  - `land.removed: ['tree:x,z', 'cover:x,z', …]`: generated things taken away.
- **Placement rules:** one resource and one piece of cover per tile. Placing replaces whatever grew or was placed there.
- **One path:** `townSource` (town-ground.js) merges these with what the land grows. They stream, chop, gather and respawn through the same resource entities and cover pool as anything generated. Placed resource ids are `placed:kind:x,z`.
- **World editor:**
  - **Nature** brush: drag to place an oak, birch, pine, willow, cherry or maple tree, copper, a boulder, sticks, stones, flint, or any cover kind. *Clear nature* takes away whatever is there. The 1 or 3 × 3 brush applies.
  - **Select** on a generated tree, resource or flower takes it into the map's own list, so it can be moved (M, arrows) or deleted like anything placed.
  - **Erase** clears nature on a tile with nothing else on it.
  - **Crystal** tool places the Iter Crystal. Select also picks it, and M or the arrows move it. It can't be duplicated or rotated, and needs dry, empty ground.
- **Limits:** editing works inside the map's bounds. A resource can't go on a building, prop, stair, water or the crystal's tile.
- **Tests:** `town-ground.test.js`, which checks:
  - removed things stay gone;
  - placed ones stream with their kind and species;
  - a placed resource replaces what grew there.
- **Checked in the browser (Mistrom):**
  - placed and moved the crystal;
  - painted cherry trees, red flowers, ferns and a boulder;
  - adopted a generated birch and moved it, freeing its old tile;
  - erased, undid, and cleared with the brush;
  - no errors in the checks or the console.

## Cleared to the wild (2026-10-14)

User request: clear out every building, prop, decoration and path, and start from a wild biome to build the village by hand.
- `src/dev/overworld-layout.js` now writes only the starting point:
  - the 96 × 96 bounds on the land;
  - the painted biomes around it;
  - the Iter Crystal at 48, 48 and the arrival spot at 48, 51.
- **Nothing built:** no buildings, props, paths, townsfolk, village trees or height edits. The ground is all the land's own.
- From here Mistrom is built in the world editor (*Save to repo*). Rerunning the generator would wipe that work.
- The first layout below is kept as a record; it's no longer in the data.

## As implemented: the first layout (2026-10-14, since cleared)

User request: generate Mistrom now, so the tools are built against it.
- **Files** (since renamed; see *The overworld map*): `src/dev/mistrom-layout.js` wrote `src/maps/mistrom.json` once (`node scripts/generate-mistrom.mjs`). From then on Mistrom is refined in the world editor (*City → Mistrom*, *Save to repo*), and regenerating overwrites hand edits, as with the capital.
- **The layout:** 96 × 96 at the origin.
  - **The green:** 16 × 16 in the middle chunk, with a ring path, the Iter Crystal at 48, 48, a well, the noticeboard, benches, flower beds and lamps.
  - **Buildings:** the inn to the north; the general store east; the smithy (stone) west, with its yard across the high road; the mill north-east by the river; a red barn and fields north-west; the long (L-shaped) house, cottages, a townhouse and the shrine to the south; the fisher's cottage and the fish stall on the planks by the river mouth.
  - **Roads:** dirt, ending at gateposts.
- **Shopkeepers:** five, one per shop: Mabel at the inn, Tobin at the general store, Greta at the smithy (the new `villageSmith` shop: copper, blades, shields and tools), Oswin at the mill, and Pip at the fish stall.
- **Land** (`land` in the map; BIOMES.md):
  - 96 tiles around the village, seed 3, meadow where unpainted;
  - forest, pines and hills to the north, with a quarry's hills up the river;
  - woods with goblins to the west;
  - the river (a new *river* biome) down the east side into an estuary marsh;
  - coast along the south, then the sea.

  The village stands on this land (*The town on the land*, below).
- **Tests** (`mistrom.test.js`, now `overworld.test.js`):
  - no check errors, and every building inside one chunk;
  - the crystal in the middle of the green, with a way to every shop door;
  - a keeper for every shop;
  - the river, coast and sea where they belong.
- **Not yet:**
  - **No bridge or quay:** the high road east ends at the river.
  - **Proper props:** the waterwheel, quay pieces and lighthouse.
  - **Village trees:** they're listed (`resources`), but only an area places those, not the editor.
  - **Play:** Mistrom isn't yet an area you play in. Waking into it and hiding Gelton come with Phase 2.
  - **Tidy-up:** the checks list a few narrow one-tile gaps by props and the map edge, to tidy in the editor.

## The town on the land (2026-10-14)

User report: the village felt cut out of the world ("spawned as a huge flat area that doesn't render like the rest of the world"). The cause: the town had its own flat grid of ground, and the land around it was cut away under the town and flattened towards its edge.

**Decisions** (user, 2026-10-14):
- **One terrain everywhere.** A town is what people built on the world's land, not a separate patch of ground. Under the town the ground is the generated biome land: the same heights, colours, water, trees and ground cover.
- **Buildings level a pad.** Each building flattens its footprint and a one-tile apron to one height, and the land eases back to its own height by half a block a tile.
- **Height edits are offsets on the land.** Raise and lower add to the generated height, and *Flatten* levels to the height where the stroke began. Reseeding or repainting the land keeps the edits as deltas.
- **Unpainted ground is the biome's ground.** It uses the biome's surface and colours. Roads, paths, fields and the quay are painted on top.

**As implemented:**
- **`src/town-ground.js`:**
  - `townLand(data)`: the biome land under and around a town, from `data.land`.
  - `createTownGround`: the town's tiles from that land, with pads, offsets and paint.
  - `townSource`: the chunk-streamer source for the land.
    - A town's chunks are regular chunks that happen to have buildings on them (user, 2026-10-14). Inside the town the streamer gets the town's own tiles and draws their ground like any other chunk: same renderer, seams and colours, with painted surfaces in their own colours.
    - The city adds only what is built on the land: buildings, props, edges, and the stairs' treads (chunk terrain skips stair tiles). It streams with the land's radius, so ground and buildings appear together.
    - Trees, resources, enemies, cover and fishing spots appear only on free tiles: nothing painted, offset, padded, built, placed or stair there.
- **Data:**
  - A town on the land (`data.land`) stores `offsets` in its regions instead of `heights`.
  - Its surfaces use `.` for "the land's own ground".
  - `putOnLand` and `takeOffLand` (world-map.js) convert a map either way. Terraces keep their height above the ground, and grass becomes the land's ground.
- **Water:** stays where nothing is made on it. A road painted across a pond is dry ground.
- **Rebuilds:** moving a building re-levels its pad. `rebuild` compares the fresh ground with what was built and also rebuilds any chunk whose ground moved. The land's streamer reloads those chunks around the rebuild (`reload`), so trees and cover follow the edit.
- **Editor:**
  - **Flatten** tool.
  - The Surface tool has *Land's own*, which clears paint.
  - *Add land* puts a map on the land, and *Remove land* takes it off.
  - Any change to the land rebuilds the whole map, since the town stands on it.
- **Removed:** biome-land.js's `exclude` (the hole under the town) and `flat` (the flattened edge).
- **Mistrom:** regenerated on the land. Its ground rolls between heights 1 and 2 with a few meadow ponds. Its eleven pads are at 1, 1.5 or 2, with no full-block steps and no step at the village edge.
- **Gelton:** unchanged. It keeps its own ground while it's hidden.
- **Tests:** `town-ground.test.js`, which checks:
  - the ground is the land's, in the biome's colours;
  - pads and their apron are level, with no cliffs;
  - offsets apply, and water stays only where nothing is made;
  - nothing grows on made ground;
  - a moved building's rebuild matches a fresh build;
  - putting a map on the land and taking it off again.
- **Checked in the browser (Mistrom in the editor):**
  - raise, flatten, *Land's own*, moving a building onto a new pad, and painting forest inside the village;
  - no errors in the checks or the console.
- **Not yet:**
  - A pad's ease past the town's edge only refreshes on a full rebuild.
  - Trees and cover now grow on the open village ground, the green included. Paint a surface wherever they shouldn't.

## Open questions

1. **The first quest.** The welcome's hint needs somewhere to point. The noticeboard is the stand-in until it's designed.
