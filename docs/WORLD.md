# The world beyond the city

Draft, 2026-10-11. This doc covers the open world outside cities: how it connects, how its land is made, and what is in it. Cities are in [CITY.md](CITY.md), the economy in [ECONOMY.md](ECONOMY.md), streaming rules in [DESIGN.md](DESIGN.md) (World scale and streaming).

**User decisions (2026-10-11):**
- **A couple of gather spots in the city, and countryside beyond it**, for fishing at water and mining at outcrops.
- **Walk out of the gates.** One continuous world: Gelton sits inside its countryside and you walk through a gateway into it, streamed in chunks, with no loading step.
- **Generated land with placed landmarks.** Seeded generation for terrain, water, woods and hills; hand-placed landmarks on top.
- **A ring around Gelton first**, about 64 tiles deep on every side (about 256 × 256 with the city).
- **A few enemies, away from the roads.** Mostly passive near roads, so pacifists can avoid them.

**User decisions (2026-10-12):**
- **The client and the server use the same names for the same slices of the world** (the glossary below).
- **The target world is 2,048 × 2,048 tiles**: 16 × 16 regions, 64 × 64 chunks.
- **Chunks are 32 × 32 and regions 128 × 128.** They were 16 × 16 and 64 × 64. Bigger chunks let a large building (a keep) fit inside one, and mean fewer draws. A player sees a 96 × 96 area, close to the ~104 × 104 scene Old School RuneScape loads around a player.
- **Buildings may not cross chunk or region lines** (*Design constraints*).
- **The capital was re-centred at 160 × 160** so its axis (avenue, square, keep) runs down the middle of a chunk.

## Glossary

The world is one grid, defined in `src/world-grid.js` (no DOM or three.js, so the client, a future server, the editor and the checks all share it). Each size divides the next, so every region line is also a chunk line.

| Term | Size | What it is the unit of (client and server alike) |
|---|---|---|
| **Tile** | 1 × 1 | Movement, occupancy, interaction. |
| **Chunk** | 32 × 32 tiles (`CHUNK`) | Activity: client streaming and rendering, server interest (a client subscribes to the chunks near its player and gets their changes), and waking the simulation near players. |
| **Region** | 128 × 128 tiles, 4 × 4 chunks (`REGION`) | Ownership and storage: map data files, persistence documents, and which server process owns which part of the world. City terrain is stored per region (`world-map.js`). |
| **World** | 2,048 × 2,048 tiles (`WORLD`) | The whole grid. Ids and positions are world coordinates. |

Ids are `"cx,cz"` for chunks and `"rx,rz"` for regions (`chunkId`, `regionId`). Words that are not grid sizes:
- **Area:** an authored place that owns layout and story (Gelton, Willowbank; AGENTS.md). It covers some set of regions.
- **Interior:** a separate space entered through a door (CITY.md).
- **Shard:** one running copy of the world for a set of players ("World 1", "World 2"). "World" always means the map.
- **Patch:** a connected piece of a city's grass, themed as a mini biome (`city-greens.js`).
- **Cloud region:** a data-centre location such as us-central1. Always written in full.

## Design constraints

These keep rendering, streaming, storage and a future server simple. The map checks enforce the first; the rest are rules for new code.

1. **A building fits inside one chunk.** It may not cross a chunk line (and so not a region line either), so it streams, draws, cuts away and is stored whole with its chunk. The largest building is 32 × 32. The map checks report a crossing as an error, and the world editor refuses to place one (its *Chunk and region lines* switch shows the lines). A layout that needs something bigger splits it into separate buildings.
2. **Areas line up with the grid.** An area's origin is a region corner and its extent ends on chunk lines, so its chunks and regions are the world's. Gelton's city starts at 0; its countryside runs two chunks beyond it (−64 to 223).

## How it fits together

- **One area.** Gelton's area (`main.js` `geltonReady`) is the city plus its countryside. The city is built per chunk from `src/maps/capital.json` and shown around the player. The countryside (`countryside.js`) is a chunk-streamer source (`chunk-streamer.js`). It is loaded within 1 chunk of the player (3 × 3 chunks, building each across frames), released once the player is more than 8 tiles past that (`BAND`), and keeps state by stable id. Countryside tiles stream into the area's tile map, and into the live world map while Gelton is active, so pathfinding, picking, the minimap and occupancy see one world.
- **Coordinates.** The city keeps its own tile coordinates (0–159). The countryside surrounds it, from −64 to 223 on both axes. The source returns no tiles inside the city, so the city's own tiles, walls and buildings are used there.
- **The wall and gateways.** See *City walls* below. Map data `gates` lists the gateways (west and east on the main street, south on the avenue), and the countryside's roads start at them, with a signpost outside each.

## The land (`countryside.js`)

- **Terrain:**
  - A strip of sea at the world's edge.
  - Flat meadow for about 8 tiles outside the wall.
  - Rolling, then rocky hills farther out, flattened toward the roads. Heights step in half blocks; rocky tops (3 blocks up and more) are stone.
  - Shores stay low (a dirt beach at water level plus half a block, then a step per tile), so every fishing spot can be reached.
- **Roads:** three winding 3-wide dirt roads from the gateways nearly to the sea. The east road crosses the river on a plank **bridge**.
- **Water:** a river through the east, a lake to the north-west and a pond to the south-west.
- **Resources** (shared entities; the same depletion and regrowth as everywhere):
  - Woods in patches of trees with fallen sticks.
  - Scattered trees, sticks and rocks in the meadows.
  - Boulders, **copper outcrops** and loose rocks on rocky hills.
  - Nothing on roads, water, landmarks, or within 4 tiles of the wall.
- **Fishing spots:** pondfish ripples on lake, pond and river water beside a reachable bank.
- **Goblins:** single goblins, more than 10 tiles from any road and 22 from the wall. Passive scrappers nearer roads; aggressive bruisers only more than 18 tiles from a road. They drop loot (ECONOMY.md). A defeated one returns after 45 s, even if its chunk was unloaded meanwhile.
- **Landmarks** (props, placed in world tiles):
  - A woodcutter's camp at the end of the west road.
  - Ruins in the hills north of the city.
  - A lakeside rest.
  - A wagon past the bridge.
  - A signpost near the end of the south road.
- **Seed:** the same seed always gives the same land. Generated tiles are cached, so a tile keeps its identity across chunk loads.

## City walls (`city-walls.js`; user request, 2026-10-11)

The user asked for walls like the castle keep's: very tall, with large towers at the corners; very wide, 2–3 tiles, as if slime guards could walk on them; large double doors into the city; and pieces that join cleanly.

- **The wall:** 3 tiles thick on the city's outer ring (map `walls: {thickness}`), 6 blocks high (four storeys).
  - A plinth, a string course, a walkway on top between two crenellated parapets, and arrow slits on the outer face.
  - Its tiles are solid and block sight.
- **Corner towers:** round, radius 3.3, 8.5 high, crenellated. They stand half outside the city, and the countryside tiles under them are solid.
- **Gatehouses:** at each gateway, a taller block (7.6) with flanks, a lintel over a 3.6-high opening, and crenellations.
- **Joins:** each run of wall, tower and gatehouse is one merged mesh (vertex colours, flat-shaded) built from solid boxes and cylinders. Runs stop inside the towers and against the gatehouse flanks, so no posts or steps show between edge pieces.
- **Double doors:** one entity per gateway (`cityGateModel`: two iron-banded leaves on hinges at the passage sides), one tile in from the outside.
  - Open by default; click to close or open, with the shared door sounds.
  - Each passage edge carries a door feature sharing the gate's state, so routes, the player and townsfolk treat it as a door.
- **Cutaway:** each piece (a run per chunk, a tower, a gatehouse) is its own cut owner (ids from 1000, a cut source per city). The piece beside you or between you and the camera cuts down like a building and the rest stands. Its cut face is stone-coloured, because a 3-tile wall shows a broad face.
- **The seam:** the city's edge tiles were drawn as if nothing lay beyond them (a rounded lip and a side). `buildMap({outside})` now gives the city's terrain the countryside's tiles, so the edge joins without a seam.

## Guards and houses by the wall (user request, 2026-10-11)

- **Wall sentries** (`wall-sentries.js`): guards pace the walkway on top of the wall, using the shared slime presentation (`GUARD_LOOK`: red, copper dagger and shield, iron skullcap).
  - One guard per 40 tiles of walkway (`walls.walkways`, the stretches between towers and gatehouses), 15 in Gelton, each with its own beat.
  - They walk tile by tile with the shared step motion, and pause at the ends to look out over the wall.
  - They hide where the wall is cut down (`walls.cutAt`), and leave the scene graph when more than 40 tiles away.
- **Gate guards:** two townsfolk at every entrance, outside the city against the wall either side of the gateway, facing out along the road (user, 2026-10-11). Their tiles are countryside land; `buildMap({outside})` adds the tiles its townsfolk stand on to the city's map, and the townsfolk checks skip homes outside the city when that land isn't there. They use a new townsfolk activity, `post`: stand at your home tile facing `entry.facing`. You can talk to them like other townsfolk.
- **Houses by the wall:** rows of houses backing onto the wall face their block's yard instead (reached by the alleys), so no door opens a tile from the wall (`capital-layout.js`).
- **Playground:** Countryside jumps to the west and south gates (inside).

## Water and the bridge (2026-10-11)

- **Animated water:** `createStreamedWater` in `water-effects.js`. It has the ponds' look (colour, opacity, reflections, facets, glints, following `waterSettings`), but the waves run in the vertex shader. That's one surface mesh per chunk, so lakes, the river and the sea cost nothing per frame on the CPU. Shore vertices stay still. The chunk streamer's `dress` hook builds and releases it with the chunk; the terrain under water is the ponds' bed colour.
- **The bridge:** the shared `makeBridge` gained `{width}`, plus stringers and stone piers for wide spans. The east road's bridge is that model, road-wide, spanning the river plus a tile of bank each side. Its tiles have no terrain (`noTerrain`), water shows beneath, and the deck is the click target.

## Green spaces (user request, 2026-10-11: "more flowers, ponds, different types of trees")

- **Tree species** (`tree-models.js`): one per Lumberjack tier (`lumberjack.js`; [DESIGN.md](DESIGN.md#skill-tiers-and-pacing)): poplar, asla, pine, oak, willow, maple, walnut, ironwood, mungil and cherry. All share the chop action, falling animation, depletion and regrowth; a species sets the level needed, the wood it yields, its effort, its look, the outline height and the label ("Chop Willow Tree"). Generated land picks the species by place (`countryside.js`); hand placement sets the real mix:
  - pines on the hills;
  - willows within 2 tiles of water;
  - cherry blossoms in groves in the meadows;
  - elsewhere the local wood drifts between poplar, oak and maple.

  Gelton's park has a cherry and a willow (map `resources[].species`).
- **Ponds:** small ponds dotted about the meadows and woods (one chance per 36-tile cell, away from the wall, roads and big water). They come with low shores, fishing spots and lily pads.
- **Ground cover** (`ground-cover.js`): templates for flower clumps in six colours, grass tufts, ferns, mushrooms, reeds, lily pads, shrubs and pebbles. `countryside.js` `cover(tiles)` places them:
  - flower meadows in patches of one or two colours;
  - wildflowers and grass in open grass;
  - ferns and mushrooms in woods;
  - reeds on shores, lily pads on still water, pebbles on stone;
  - nothing on roads, the bridge, the wall or landmarks.

  It's drawn **instanced**: one mesh per kind for all loaded chunks (about 13 draws), and a chunk writes only its instances' matrices into free slots. The first merged-per-chunk version uploaded up to 435k vertices per chunk; the templates are now low-poly (cone stems, octahedron heads).
- **Model catalogue:** every tree species and ground-cover kind.
- **Density (user, 2026-10-12: "a bit busy"):** thinned.
  - Countryside meadows: patches where the meadow noise is above 0.6, about two clumps per three tiles there.
  - Elsewhere in the countryside: stray wildflowers on 7% of tiles and grass tufts on 8%.
  - Woods, shores and stone: roughly halved.
  - City greens: a flower clump on about 1 tile in 5 and another piece on 1 in 10. That's 1,825 pieces in Gelton, down from 4,692.
- **City mini biomes** (`biomes.js`, `city-greens.js`; user request, 2026-10-12): five themes that belong together:
  - *blossom garden*: cherries, pink and white flowers;
  - *willow green*: willows, purple and blue flowers, reeds and ferns;
  - *autumn grove*: maples, red and yellow flowers, mushrooms;
  - *poplar copse*: poplars, white and yellow flowers, ferns;
  - *meadow*: oaks, mixed flowers.

  Each separate patch of grass in a city is one biome. The big joined-up grass is split into organic cells about 14 tiles across, each its own theme: 80 mini biomes in Gelton (map `greens: {seed}`). The trees are shared choppable resources in their chunk. They stand only where every neighbour is grass and no other tree is within 2 tiles, and never by a doorstep or a townsfolk home, so no route closes (tested). The ground cover uses the same instanced pool as the countryside, and streams with the city's chunks (`chunkedCover`, driven by `city.onStream`). Each chunk's flowers are in the pool only while that chunk is shown. Before this fix they were all added at once, and drew in the void beyond the shown chunks (user report, 2026-10-12).
- **Playground:** *City biome* jumps to the biggest patch of each theme.

## In the city

- **Park gather spots:** two trees, fallen sticks and loose rocks in Gelton's park. They are map data `resources`, placed by the host as shared resource entities.

## Playground

- **Countryside fieldset:**
  - Jump to a place (west road end, lake, pond, bridge, ruins, north-east hills, south-west woods, south road). The place's chunks load first.
  - Toggle chunk outlines, show streaming stats, set the radius to 2 or 3.
- `useResourceNearest(kind)` on the inspection API uses the nearest tree, boulder, copper, sticks or rocks in any map as a click would.
- **Perf scenario** `countryside-walk`: walks the west road out and back.

## Verified (2026-10-11)

- Walking out of the west gateway onto the road, past woods.
- At the lake shore: fishing from the bank (+1 Raw Pondfish).
- In the hills: copper outcrops, boulders and three goblins (one passive, two aggressive); mining copper (+1 ore, Mining XP).
- The bridge on the east road.
- Unit tests:
  - The land is the same every time.
  - Each road end and the bridge are reachable from the square.
  - Resource, fishing, goblin and landmark rules hold.
  - Streamer extras keep busy chunks loaded and remember their state.

## Open and next

- **Wall sentries are flavour:** they pace the walkway but aren't townsfolk (you can't climb up or talk to them). A walkable wall top would need a raised path and stairs.
- **Seen from behind:** the default camera looks from the south-east, so the west gate's face points away from it (rotate the camera to see it).
- **Roads don't connect** to each other or around the city.
- **More landmarks and places:** farms, a mine entrance, villages, more enemy kinds and camps.
- **Grow the world** beyond the ring.
- **Edit layers** for the generated land (move a landmark, paint a road) in the world editor.
