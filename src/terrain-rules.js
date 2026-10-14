// Terrain rules (docs/BIOMES.md, Terrain and biome): the shape of the land and its water, painted apart
// from the biome (what grows and lives there, how it looks and sounds), so any biome can sit on any
// terrain: a pine forest on plains, a meadow in the hills, wetland in lakeland. An unpainted cell uses its
// biome's usual terrain (biome-rules.js `terrain`). A terrain states only what differs from
// TERRAIN_DEFAULTS; terrainRule(id) merges.
//   base         ground height (blocks)
//   relief       how far it may rise above base; scale how broad the rises are (tiles)
//   roughness    small bumps on top, roughScale their size
//   rockAt       the height where the biome's rock ground shows (stone on hilltops)
//   cliffs       whether full-block drops may appear (without them land only steps by half blocks)
//   water        sea (all water), river (all water, flowing), ponds (chance of a pond per 24-tile cell),
//                pools (marsh pools, 0–1)
//   minimap      the editor's paint colour for it
export const TERRAIN_DEFAULTS={
 name:'',base:1,relief:1,scale:32,roughness:.1,roughScale:9,rockAt:Infinity,cliffs:false,
 water:{sea:false,river:false,ponds:0,pools:0},
};
export const TERRAIN_RULES={
 plains:{name:'Plains',relief:.5,scale:36,roughness:.06},
 rolling:{name:'Rolling',relief:1,scale:36,roughness:.1,water:{ponds:.05}},
 lakeland:{name:'Lakeland',relief:1,scale:30,roughness:.08,water:{ponds:.35}},
 uplands:{name:'Uplands',relief:3,scale:46,roughness:.15,rockAt:4},
 hills:{name:'Hills',relief:5,scale:60,roughness:.15,roughScale:11,rockAt:5},
 highlands:{name:'Highlands',relief:8,scale:80,roughness:.2,roughScale:12,rockAt:6},
 marsh:{name:'Marsh',relief:.25,scale:24,roughness:.05,water:{ponds:.3,pools:.22}},
 river:{name:'River',water:{river:true}},
 sea:{name:'Sea',water:{sea:true}},
};
export const TERRAIN_IDS=Object.keys(TERRAIN_RULES);
const merged=new Map();
export function terrainRule(id){
 if(merged.has(id))return merged.get(id);
 const own=TERRAIN_RULES[id]||{},out={...TERRAIN_DEFAULTS,...own,water:{...TERRAIN_DEFAULTS.water,...own.water},id:TERRAIN_RULES[id]?id:'rolling'};
 merged.set(id,out);return out;
}
