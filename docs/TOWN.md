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
   - an upper floor as a separate space with an inside stair (the inn's rooms);
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
4. **Townsfolk tool:**
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
- **City editor:**
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
- From here Mistrom is built in the city editor (*Save to repo*). Rerunning the generator would wipe that work.
- The first layout below is kept as a record; it's no longer in the data.

## As implemented: the first layout (2026-10-14, since cleared)

User request: generate Mistrom now, so the tools are built against it.
- **Files** (since renamed; see *The overworld map*): `src/dev/mistrom-layout.js` wrote `src/maps/mistrom.json` once (`node scripts/generate-mistrom.mjs`). From then on Mistrom is refined in the city editor (*City → Mistrom*, *Save to repo*), and regenerating overwrites hand edits, as with the capital.
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
  - `putOnLand` and `takeOffLand` (city-map.js) convert a map either way. Terraces keep their height above the ground, and grass becomes the land's ground.
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
