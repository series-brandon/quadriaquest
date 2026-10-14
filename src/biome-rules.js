// Biome rules (docs/BIOMES.md): what each kind of land is like, as data the land generator
// (biome-land.js) reads. A biome states only what differs from BIOME_DEFAULTS; biomeRule(id) merges.
// Look and sound only for now (user, 2026-10-14): nothing here changes how the game plays.
//   terrain     base height (blocks), relief (how far it may rise), scale (how broad the rises are,
//               tiles), roughness and roughScale (small bumps), rockAt (height where stone shows), cliffs
//               (whether full-block drops may appear; without them land only steps by half blocks)
//   water       sea (all water), river (all water, flowing), ponds (chance of a pond per 24-tile cell), pools (marsh pools, 0–1)
//   ground      surface and its two-tone palette; rock and shore surfaces with theirs; minimap colour
//   trees       density in the open, clusters (share of the land that is woodland), clusterDensity in
//               woodland, species {name: weight}, byWater / onHigh overrides
//   cover       ground cover kinds (ground-cover.js) with densities and where they grow
//   resources   {kind, chance, where}: where is any, open, forest, high (rocky) or shore
//   fishing     spot chance on water beside land; fish by water kind (one fish exists today)
//   enemies     density per tile and a weighted table {enemy, weight, aggressive}
//   wildlife, npcs, landmarks, audio {music, ambience}, atmosphere {fog, light, particles}: data for
//               later steps (docs/BIOMES.md, Building it)
export const BIOME_DEFAULTS={
 name:'',
 terrain:{base:1,relief:1,scale:32,roughness:.1,roughScale:9,rockAt:Infinity,cliffs:false},
 water:{sea:false,river:false,ponds:0,pools:0},
 ground:{surface:'grass',palette:['#8fb071','#88aa6b'],rock:{surface:'stone',palette:['#b7b0a5','#aea79c']},shore:{surface:'dirt',palette:['#b39b78','#ab9372']},minimap:'#8fb071'},
 trees:{density:0,clusters:0,clusterScale:30,clusterDensity:0,species:{oak:1},byWater:null,onHigh:null},
 cover:[],
 resources:[],
 fishing:{spots:.06,fish:{pond:'rawFish',river:'rawFish',sea:'rawFish',marsh:'rawFish'}},
 enemies:{density:0,table:[]},
 wildlife:[],npcs:[],landmarks:[],
 audio:{music:null,ambience:'meadow'},
 atmosphere:{fog:null,light:null,particles:null},
};
// The starter set (docs/BIOMES.md, The starter set), plus the open sea.
export const BIOME_RULES={
 meadow:{name:'Meadow',
  terrain:{relief:1,scale:36,roughness:.1},
  water:{ponds:.18},
  trees:{density:.006,species:{oak:3,birch:2}},
  cover:[{kind:'flowerWhite',density:.05},{kind:'flowerYellow',density:.05},{kind:'flowerPink',density:.03},{kind:'flowerPurple',density:.025},{kind:'flowerBlue',density:.02},{kind:'grass',density:.14}],
  resources:[{kind:'sticks',chance:.004,where:'open'},{kind:'stones',chance:.004,where:'open'},{kind:'flint',chance:.0015,where:'open'}],
  enemies:{density:.0002,table:[{enemy:'scrapper',weight:1,aggressive:false}]},
  wildlife:['butterflies','songbirds'],landmarks:['picnic','standing stone'],
  audio:{ambience:'meadow'},atmosphere:{particles:'pollen'}},
 forest:{name:'Broadleaf forest',
  ground:{palette:['#6f9a58','#689352'],minimap:'#5f8a4c'},
  terrain:{relief:2,scale:44,roughness:.15},
  water:{ponds:.1},
  trees:{density:.03,clusters:.6,clusterScale:26,clusterDensity:.2,species:{oak:4,birch:2,maple:2},byWater:{species:'willow'}},
  cover:[{kind:'fern',density:.08,where:'forest'},{kind:'mushrooms',density:.03,where:'forest'},{kind:'grass',density:.1},{kind:'flowerWhite',density:.015,where:'open'},{kind:'shrub',density:.02}],
  resources:[{kind:'sticks',chance:.02,where:'forest'},{kind:'stones',chance:.003}],
  enemies:{density:.0006,table:[{enemy:'scrapper',weight:2,aggressive:false},{enemy:'bruiser',weight:1,aggressive:true}]},
  wildlife:['squirrels','woodland birds'],npcs:['woodcutter'],landmarks:["woodcutter's camp",'hunter\'s hide'],
  audio:{ambience:'meadow'},atmosphere:{particles:'falling leaves'}},
 pines:{name:'Pine forest',
  ground:{palette:['#5f8a55','#58834f'],minimap:'#4c7349'},
  terrain:{relief:3,scale:46,roughness:.15,rockAt:4},
  trees:{density:.05,clusters:.7,clusterScale:30,clusterDensity:.24,species:{pine:6,birch:1}},
  cover:[{kind:'fern',density:.06,where:'forest'},{kind:'grass',density:.06},{kind:'pebbles',density:.04,where:'high'}],
  resources:[{kind:'sticks',chance:.015,where:'forest'},{kind:'boulder',chance:.02,where:'high'},{kind:'stones',chance:.006,where:'high'}],
  enemies:{density:.0006,table:[{enemy:'scrapper',weight:1,aggressive:false},{enemy:'bruiser',weight:1,aggressive:true}]},
  wildlife:['owls'],landmarks:["hunter's hide"],
  audio:{ambience:'meadow'},atmosphere:{particles:'falling needles'}},
 hills:{name:'Hills',
  ground:{palette:['#94ad73','#8ca66c'],minimap:'#8fa36e'},
  terrain:{relief:5,scale:60,roughness:.15,roughScale:11,rockAt:5},
  trees:{density:.004,species:{oak:1,birch:1},onHigh:{at:3,species:'pine'}},
  cover:[{kind:'grass',density:.18},{kind:'flowerYellow',density:.02,where:'open'},{kind:'pebbles',density:.06,where:'high'}],
  resources:[{kind:'copper',chance:.012,where:'high'},{kind:'boulder',chance:.02,where:'high'},{kind:'stones',chance:.006},{kind:'flint',chance:.002}],
  enemies:{density:.0004,table:[{enemy:'scrapper',weight:1,aggressive:false},{enemy:'bruiser',weight:2,aggressive:true}]},
  wildlife:['hawks'],landmarks:['old watchtower','cairn'],
  audio:{ambience:'breeze'}},
 coast:{name:'Coast',
  ground:{surface:'sand',palette:['#e3d3a3','#dccb99'],shore:{surface:'sand',palette:['#d8c48e','#d1bd86']},minimap:'#e3d3a3'},
  terrain:{relief:.5,scale:16,roughness:.05},
  trees:{density:0},
  cover:[{kind:'grass',density:.05},{kind:'shrub',density:.01},{kind:'pebbles',density:.03}],
  resources:[{kind:'flint',chance:.004},{kind:'stones',chance:.004},{kind:'sticks',chance:.002}],
  fishing:{spots:.05},
  wildlife:['gulls','crabs'],landmarks:['shipwreck','tide pools','lighthouse'],
  audio:{ambience:'river'}},
 wetland:{name:'Wetland',
  ground:{surface:'mud',palette:['#7f9a5c','#789455'],shore:{surface:'mud',palette:['#7a6f52','#73684c']},minimap:'#6f8a52'},
  terrain:{relief:.25,scale:24,roughness:.05},
  water:{ponds:.3,pools:.22},
  trees:{density:.01,species:{willow:3,birch:1},byWater:{species:'willow'}},
  cover:[{kind:'reeds',density:.12,where:'shore'},{kind:'grass',density:.12},{kind:'flowerPurple',density:.02,where:'open'},{kind:'flowerBlue',density:.02,where:'open'}],
  resources:[{kind:'sticks',chance:.006}],
  fishing:{spots:.09},
  wildlife:['frogs','dragonflies','herons'],landmarks:['boardwalk'],
  audio:{ambience:'river'},atmosphere:{fog:{color:'#c9d3c4',density:.2},particles:'midges'}},
 // A river: painted as a channel of cells (Mistrom's, down the village's east side to the sea).
 river:{name:'River',
  ground:{minimap:'#6fa8d6'},
  water:{river:true},
  fishing:{spots:.08},
  audio:{ambience:'river'}},
 sea:{name:'Sea',
  ground:{minimap:'#6fa8d6'},
  water:{sea:true},
  fishing:{spots:.03},
  audio:{ambience:'river'}},
};
export const BIOME_IDS=Object.keys(BIOME_RULES);
// A biome's full rules: its own over the defaults, one level deep (so a biome can set one terrain value).
const merged=new Map();
export function biomeRule(id,rules=BIOME_RULES){
 const key=rules===BIOME_RULES?id:null;if(key&&merged.has(key))return merged.get(key);
 const own=rules[id]||{},out={};
 for(const [k,v] of Object.entries(BIOME_DEFAULTS))out[k]=v&&typeof v==='object'&&!Array.isArray(v)?{...v,...own[k]}:own[k]??v;
 out.ground={...out.ground,rock:{...BIOME_DEFAULTS.ground.rock,...own.ground?.rock},shore:{...BIOME_DEFAULTS.ground.shore,...own.ground?.shore}};
 out.id=id;if(key)merged.set(key,out);return out;
}
