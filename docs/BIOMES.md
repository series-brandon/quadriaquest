# Biomes

Draft, 2026-10-14, for review. A **biome** is a set of rules for generating a kind of land: how high and rough it is, what grows there and how much, what can be gathered and fought, what it looks and sounds like. The generator reads the rules, so making new land means choosing biomes and painting where they go, not writing new generation code. The world and its grid are in [WORLD.md](WORLD.md); Mistrom's countryside, the first land to use this, is in [TOWN.md](TOWN.md).

**User decisions (2026-10-14):**
- **Biomes are painted by hand** in the editor, with natural edges (no noise-generated layout).
- **Starter set first;** the later biomes (mountains, desert, snowfields, deadlands, blossom valley) come later.
- **Look and sound only for now:** no effects on play (movement, enemy strength).
- **No region names on entry for now.**

**User request (2026-10-14):** rules per biome for:
- verticality (flat to extreme);
- foliage: how much, and which kinds;
- enemies and NPC types;
- resources;
- colours;
- music;
- anything else that belongs.

## Where we are today

- **`countryside.js`** (Gelton's land) hard-codes one landscape's rules:
  - hills grow with distance from the wall and the roads;
  - woods appear by noise, pines above height 2, willows by water, cherries in groves;
  - goblins appear away from roads;
  - fixed resource odds.
- **`biomes.js`** has five *mini biomes* for green spaces in a city (blossom, willow, autumn, birch, meadow). Each is just tree species and flowers.
- **Terrain colour** comes from the surface (`SURFACES` in `map-terrain.js`): one fixed pair of greens for grass.
- **Music and ambience** are per area (`areas.register({music, ambience})`).

The biome system generalises these. The countryside's rules become data, and Gelton's land keeps working as it is until it's moved over.

## A biome's rules

One entry per biome in a shared registry (`src/biome-rules.js`). Every field has a default, so a new biome only states what differs.

| Group | Rules | Example (Pine forest) |
|---|---|---|
| **Terrain** | `base` height (blocks), `relief` (how much it can rise above base), `scale` (how broad the rises are, in tiles), `roughness` (small bumps on top), `cliffs` (whether full-block drops are allowed, which make retaining walls and cliffs, or the land only steps by half blocks), `terraces` (flat shelves), `ponds` (small ponds per 1,000 tiles) | base 1, relief 3, scale 30, roughness .3, cliffs false |
| **Surfaces and colours** | Ground surface (grass, sand, snow, ash, mud), a two-tone `palette` for it, the high-ground surface (stone, scree), shore and path surfaces, `water` tint, minimap colour | Dark green palette, stone above height 2.5 |
| **Foliage** | `trees`: density, how clumped (`clusters`), species by weight. `cover`: flowers, grass, ferns, mushrooms and so on, each with a density. `byWater` and `onHigh` overrides (willows by water, pines up high) | Dense, clumped; pine 6, birch 1; ferns and mushrooms |
| **Resources** | A table of what can be gathered and where: `{kind, chance, where}`, with `where` as anywhere, forest, open, high, shore or water edge | Trees (from foliage), sticks .01, stones .004, boulders up high |
| **Fishing** | Spot chance along water, and the fish table by water kind (pond, river, sea, marsh) | Pondfish now; later trout in rivers, etc. |
| **Enemies** | A spawn table: `{enemy, weight, aggressive, minRoadDistance}`, a density, and a difficulty band | Goblin scrappers near paths, bruisers deeper in |
| **Wildlife and NPCs** | Harmless critters (birds, butterflies, frogs, crabs) and travelling NPC types that suit the land | Squirrels, a woodcutter |
| **Landmarks** | Which landmark kits fit here (camps, ruins, shrines, shipwrecks), for hand placement or suggestions | Woodcutter's camp, hunter's hide |
| **Audio** | `music` (a song id) and `ambience` (a profile in `ambience.js`) | Forest theme, woodland birds |
| **Atmosphere** | Fog colour and density, light warmth, and drifting particles (falling leaves, snow, dust, fireflies at night) | Light fog, falling needles |
| **Name** | What the area is called when you enter it ("The Whispering Pines"). Not shown for now. | |

**Other things worth deciding per biome (later, not in the first pass):**
- footstep sounds by surface;
- movement on sand or snow (open question 3);
- the difficulty band of its enemies;
- ground items that only appear there (seashells, pinecones);
- the style of water (sea waves, still pond, murky marsh);
- weather.

## The starter set

The first pass covers the biomes around Mistrom. The others are defined now, so the rules are ready, but most need new models or enemies first.

| Biome | Verticality | Foliage | Colours | Gather and fight | Sound |
|---|---|---|---|---|---|
| **Meadow** (grassland) | Flat to gentle (relief 1) | Sparse oaks and birches; lots of wildflowers | Fresh green | Sticks, stones, flint; few enemies | Meadow birds, breeze |
| **Broadleaf forest** | Gentle (relief 2) | Dense oak, birch and maple, clumped; ferns, mushrooms | Deep green | Logs, sticks; goblins deeper in | Woodland birds |
| **Pine forest** | Rolling (relief 3) | Dense pines, some birch | Dark green, stone on rises | Logs, boulders up high | Wind in the pines |
| **Hills** | Rolling to steep (relief 5); no cliffs | Few trees, pines on tops; grass tufts | Green to grey stone | Copper, boulders, stones | Wind, distant birds |
| **Coast** (beach and dunes) | Flat; dunes a half block | Dune grass, a few hardy shrubs | Sand, pale | Tide pools (gather), shells, flint; sea fishing | Waves, gulls |
| **Wetland** (marsh, estuary) | Flat, low, many small pools | Reeds, willows, lily pads | Olive green, dark water | Reeds, river and marsh fishing | Frogs, insects, water |
| *Mountains* | Extreme (relief 10+), cliffs allowed | Sparse, low pines below the treeline | Grey rock, snow up high | Copper and later ores | Wind |
| *Desert* | Flat with dunes | Almost none: cacti, dry shrubs (new models) | Yellow and tan | Flint, later sandstone | Dry wind |
| *Snowfields* | Gentle | Snowy pines (new model) | White and pale blue | Later ice and furs | Muffled wind |
| *Deadlands* | Broken, some cliffs | Dead trees (new model), no flowers | Dark grey, ash | Later bones and ores; tougher enemies | Silence, wind |
| *Blossom valley* | Gentle | Cherry groves, pink flowers | Bright green | Logs | Soft birds |

The city mini biomes in `biomes.js` (blossom, willow, autumn, birch, meadow) fold in as foliage themes, so green spaces in towns use the same tree and flower lists.

## Placing biomes

**Painted by hand, with natural edges.** Each map stores a coarse biome map, one biome per 8 × 8 tiles (a quarter of a chunk). You paint it in the editor with a Biome brush, and anything unpainted uses the map's default biome.
- **Edges aren't square:** the lookup is warped by noise, so a border wanders over several tiles.
- **Transitions are gradual:** height rules are averaged over nearby biomes (about 6 tiles), so mountains rise out of the hills instead of jumping. Colours blend across the same band, and foliage thins out near a border before the next biome's begins.
- **Hand-placed features win:**
  - roads flatten the land beside them;
  - villages and spots keep their own terrain;
  - water stays reachable (the shore rule from the countryside).
- **The same seed and paint always give the same land,** and every tile, tree and goblin keeps a stable id, as in the countryside streamer.

## Music and ambience

The area's music plays by default. When you stand in a biome with its own music or ambience for a few seconds, they crossfade to it. Hysteresis (as with zones) keeps a walk along a border from flipping back and forth. This needs one change to the music system: a song can be chosen by where you stand inside an area, not only by the area.

## Building it

1. **The rules and the generator:**
   - `biome-rules.js` (the registry, with defaults);
   - a land generator that reads a biome map and the rules: terrain, surfaces and colours, foliage, resources, fishing spots, enemies;
   - the six starter biomes.

   **Tests:** the same seed gives the same land; each biome stays inside its height range (meadow stays flat, hills don't cliff); foliage density and species follow the rules; borders blend.
   **Playground:** a *Biome test* area with every biome side by side. You can jump to each, show biome borders, and regenerate with a new seed.
2. **The editor's Biome brush,** a default biome per map, and the biome map saved with the map.
3. **Music and ambience by biome.**
4. **Atmosphere** (fog, light, particles), then the models the later biomes need: cactus, dry shrub, snowy pine, dead tree, dune grass, tide pool.
5. **Mistrom's countryside** uses it: coast to the south, wetland at the estuary, meadow and broadleaf forest inland, pine forest and hills to the north.

**Gelton's countryside stays as it is for now.** Moving it onto biomes is a later, separate change, because it has its own tests and perf baselines.

## As implemented (step 1, 2026-10-14)

- **`src/biome-rules.js`:** the registry.
  - `BIOME_DEFAULTS`, and `BIOME_RULES` for the six starter biomes plus the sea.
  - `biomeRule(id)` merges a biome over the defaults, one level deep.
  - Wildlife, NPCs, landmarks, audio and atmosphere are data only so far.
- **`src/biome-land.js`:** the generator, a chunk-streamer source (`tile`, `entities`, `extras`, `cover`, `topColor`).
  - **The biome map:** one biome per 8 × 8 cell, with a default for unpainted cells, looked up through a gentle warp so borders wander.
  - **Heights:** each tile mixes the nearby cells' biome heights, weighted by (1 − d/20)², then rounds to half blocks.
  - **Water:** the sea, ponds (one chance per 24-tile cell) and marsh pools.
  - **Shores:** land rises from water half a block a tile, as far out as its height needs, so water is always reachable.
  - **Trees, resources, fishing spots, enemies and ground cover** come from the biome tables, with stable ids.
  - A 32 × 32 chunk of tiles takes about 10 ms. The streamer spreads that across frames.
- **Tuned so the no-cliff biomes never step a full block.** Measured on each biome alone (two seeds, 160 × 160) and on six random patchworks of biomes (320 × 320):
  - meadow at most 2 blocks;
  - coast and wetland at most 1.5;
  - forest about 3;
  - pines about 4;
  - hills up to 6, with stone from 5.
- **Tests** (`biome-land.test.js`):
  - every rule names a real tree, cover kind, resource, enemy and ambience;
  - determinism and stable ids;
  - height ranges per biome, and no cliffs, alone or in a patchwork;
  - borders wander;
  - shores are always one block high;
  - densities and species: woods four times denser than meadows, no trees on the coast, pines mostly pine, ore only where the rules allow;
  - fishing spots, enemies and cover come from the tables.
- **Shared gameplay:** fishing spots, bridges, props and enemies in streamed land are placed by one shared function (`placeLandExtra`), and water and ground cover by one dressing (`landDress`). Gelton's countryside and the biome land both use them.
- **Playground:** *Biome test* (docs/PLAYGROUND.md) has all six biomes in bands. Checked in the browser:
  - every band;
  - a goblin attacking in the pines;
  - reseeding;
  - Gelton's countryside still streaming its resources and goblins after the refactor;
  - no console errors.
- **Step 2, the Biome brush (2026-10-14):**
  - **Data:** a map can have land around it, `land: {seed, ring, default, cells:{'cx,cz': biome}}`, saved with the map's JSON.
  - **In the editor,** the world editor generates that land under and around the map and streams it with the shared land gameplay. Since 2026-10-14 the town stands on the land rather than in a hole cut out of it (TOWN.md, *The town on the land*).
  - **The Biome tool:**
    - *Add land* (32, 64 or 96 tiles around the map, with a biome for unpainted land);
    - paint a biome by dragging, one cell (8 × 8 tiles) or 3 × 3 or 5 × 5 cells at a time (painting the default biome erases);
    - the unpainted biome, *New seed* and *Remove land*.
  - **Painting:** each stroke is one undo step, and the land regenerates when the stroke ends. While the tool is chosen, painted cells show as a tint in each biome's colour.
  - **Checked in the browser:** added land around a blank map, painted forest and coast, undid a stroke, reseeded, changed the default, saved, and removed the land, with no errors.
- **Not yet:**
  - music and ambience by biome (step 3);
  - atmosphere and the later biomes' models (step 4);
  - the minimap doesn't show biome colours yet.

## Terrain and biome (2026-10-14)

User request: separate terrain from biome, so any combination works.
- **Two painted layers, both 8 × 8 cells:**
  - **Biome** (`land.cells`, biome-rules.js): what grows and lives on the land, and how it looks and sounds (ground and colours, trees, cover, resources, fishing, enemies, ambience).
  - **Terrain** (`land.terrain`, terrain-rules.js): the land's shape and its water (base, relief, scale, roughness, where rock shows, sea, river, ponds, marsh pools).
- **Unpainted terrain** uses the biome's usual terrain:

  | Biome | Usual terrain |
  |---|---|
  | meadow | rolling |
  | forest | rolling |
  | pines | uplands |
  | hills | hills |
  | coast | plains |
  | wetland | marsh |

- **Terrains:**

  | Terrain | Shape and water |
  |---|---|
  | plains | flat, no ponds |
  | rolling | gentle, a few ponds |
  | lakeland | many ponds |
  | uplands | rises to 4, stone on top |
  | hills | rises to 6 |
  | highlands | rises to about 9 |
  | marsh | pools and ponds |
  | river | water |
  | sea | water |

- **River and sea** are terrain now, no longer biomes. A sea cell's biome (coast, say) sets its fishing and ambience.
- **Fewer ponds:** a meadow's ponds dropped from a 0.18 chance per 24-tile cell (its old built-in terrain) to 0.05 (rolling). Plains have none; lakeland has many.
- **Generator:** heights blend between cells' terrains; water, ponds and pools follow the terrain; rock shows at the terrain's `rockAt` in the biome's rock colours. Tiles carry `biome` and `terrain`, and *What's here?* names both.
- **World editor, Biome tool:**
  - a **Layer** switch (Biome or Terrain);
  - colour swatches instead of dropdowns (*Biome's usual* erases terrain paint);
  - a stronger overlay: tints at 50% and dark borders wherever the paint changes, drawn over everything.
- **Generated nature switch** (`land.nature: false`): the land grows no trees, resources or cover of its own, only what you place. The overworld starts this way: a blank slate.
- **Generated enemies switch** (`land.enemies: false`, 2026-10-14): the biomes spawn no goblins or other enemies. The overworld starts this way too; spawns are placed with the editor's Enemy tool (TOWN.md, *Enemy spawns*).
- **Generated fishing switch** (`land.fishing: false`): the water gets no fishing spots of its own.
  - Placed spots (`data.fishing: [{x, z}]`) come from the Nature tool's *Fishing spot (on water)*.
  - *Clear nature* and Erase remove them, and the map moves them when it grows.
  - The overworld starts with none.
- **The principle** (user, 2026-10-14): generation sets a map up and makes quick changes; what is placed is the map. Almost everything should be placed thoughtfully, not generated live. The overworld has generated nature, enemies and fishing all off.
- **Grow (biome)** in the Nature tool: places, on each brushed tile, what the biome would grow there from the map's seed, as the map's own (movable, deletable) nature.
- **Ground cover pools** grow when full (they used to stop at 5,000 of a kind, leaving the last chunks to load bare at far draw distances).
- **The overworld:** migrated in place (its sea cells became sea terrain under the coast biome, its river cells river terrain).
- **Tests:** biome-land.test.js covers any biome on any terrain, plains without ponds, lakeland with many, sea under any biome, and the usual terrain. town-ground.test.js covers the blank slate and Grow's pick. ground-cover-pool.test.js covers the pool growing.

## Open questions

None for now. Later biomes, effects on play and region names on entry were each deferred (*User decisions*, above).
