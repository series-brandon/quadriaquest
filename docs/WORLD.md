# The world beyond the city

Draft, 2026-10-11. This doc covers the open world outside cities: how it connects, how its land is made, and what is in it. Cities are in [CITY.md](CITY.md), the economy in [ECONOMY.md](ECONOMY.md), streaming rules in [DESIGN.md](DESIGN.md) (World scale and streaming).

**User decisions (2026-10-11):**
- **A couple of gather spots in the city, and countryside beyond it**, for fishing at water and mining at outcrops.
- **Walk out of the gates.** One continuous world: Gelton sits inside its countryside and you walk through a gateway into it, streamed in chunks, with no loading step.
- **Generated land with placed landmarks.** Seeded generation for terrain, water, woods and hills; hand-placed landmarks on top.
- **A ring around Gelton first**, about 64 tiles deep on every side (about 256 × 256 with the city).
- **A few enemies, away from the roads.** Mostly passive near roads, so pacifists can avoid them.

## How it fits together

- **One area.** Gelton's area (`main.js` `geltonReady`) is the city plus its countryside. The city is built per 16 × 16 chunk from `src/maps/capital.json` and shown around the player. The countryside (`countryside.js`) is a chunk-streamer source (`chunk-streamer.js`). It is loaded within 2 chunks of the player, released past a band of one more, and keeps state by stable id. Countryside tiles stream into the area's tile map, and into the live world map while Gelton is active, so pathfinding, picking, the minimap and occupancy see one world.
- **Coordinates.** The city keeps its own tile coordinates (0–127). The countryside surrounds it, from −64 to 191 on both axes. The source returns no tiles inside the city, so the city's own tiles, walls and buildings are used there.
- **The wall and gateways.** Gelton's map has a stone wall along its outer ring of tiles, with open gateways where the main street leaves west and east, and where the south avenue leaves south. Map data `gates` lists them, and a signpost stands at each. The countryside's roads start at those gateways.

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
- In the hills: copper outcrops, boulders and three goblins (one passive, two aggressive); mining copper (+1 ore, 20 XP).
- The bridge on the east road.
- Unit tests:
  - The land is the same every time.
  - Each road end and the bridge are reachable from the square.
  - Resource, fishing, goblin and landmark rules hold.
  - Streamer extras keep busy chunks loaded and remember their state.

## Open and next

- **Water** is a flat colour, not the animated water of the tutorial areas.
- **The bridge** is a plank crossing with no rails or model.
- **No city gates to close:** the gateways are open archways.
- **Roads don't connect** to each other or around the city.
- **More landmarks and places:** farms, a mine entrance, villages, more enemy kinds and camps.
- **Grow the world** beyond the ring.
- **Edit layers** for the generated land (move a landmark, paint a road) in the city editor.
