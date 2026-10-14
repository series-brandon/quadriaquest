import * as THREE from 'three';
import {createTerrainBatch} from './terrain-batch.js';
import {createEdgeFeatures} from './doors.js';
import {createBuilding} from './building-kit.js';
import {createProp,propFootprint} from './props.js';
import {makeCityTile,layStairs,railingEdges,stairRailParts,SURFACE_NAMES} from './city-terrain.js';
import {mergedMesh} from './merged-model.js';
import {mergeStatic} from './static-merge.js';
import {shopForBuilding} from './shops.js';
import {buildCityWalls,wallPlan} from './city-walls.js';
import {doorSound} from './doors.js';
import {furnishRoom,roomOfPlan,furnishingUse} from './furnish.js';
import {makeCrystal} from './crystal-model.js';
import {key} from './world.js';
import {CHUNK,REGION,BAND,chunkId,regionId,chunkGap} from './world-grid.js';
import {createTownGround,townLand} from './town-ground.js';

// Cities as data (docs/CITY.md, Authoring and Streaming; city Phases 5, 6 and 9). A city is a plain
// object the editor edits and the repo stores, built by the shared builders:
//   {id, name, size:[w, d], style, spawn:[x, z], crystal:[x, z],
//    regions: {'rx,rz': {heights:[REGION strings], surfaces:[REGION strings]}},   // terrain per region
//    stairs:[{x, z, dir, length, width}], buildings:[{x, z, desc}], props:[{kind, x, z, rotation}],
//    edges:[{a:[x, z], b:[x, z], kind}], townsfolk:[…], interiors:{…}}
// Terrain is stored per tile by region (world-grid.js REGION; docs/WORLD.md, Glossary): heights in half
// blocks as one character each ('0' + 2h), surfaces as one letter each.
// A town on the land (`land`: {seed, ring, default, cells}; town-ground.js, docs/TOWN.md) stores no
// heights of its own: its regions hold `offsets` instead, hand edits as deltas on the land's ground in
// half blocks ('0' + 2 × (offset + 10), so 'D' is none), and '.' surfaces, which show the land's ground.
const SURFACE_CODES={grass:'g',dirt:'d',cobble:'c',flagstone:'f',plaza:'p',stone:'s',floor:'o',planks:'k',dungeon:'u'};
const SURFACE_FROM=Object.fromEntries(Object.entries(SURFACE_CODES).map(([k,v])=>[v,k]));
const heightChar=h=>String.fromCharCode(48+Math.round(h*2)),charHeight=c=>(c.charCodeAt(0)-48)/2;
const OFFSET_BIAS=10,UNPAINTED='.';

export function createCityData({id='city',name='City',size=[64,64],base=1,surface='grass',style='timber',land=null}={}){
 const data={id,name,size:[...size],style,spawn:[Math.floor(size[0]/2),Math.floor(size[1]/2)],crystal:null,regions:{},stairs:[],buildings:[],props:[],edges:[],townsfolk:[],interiors:{}};
 if(land)data.land=land;
 const rows=c=>Array.from({length:REGION},()=>c.repeat(REGION));
 for(let rz=0;rz*REGION<size[1];rz++)for(let rx=0;rx*REGION<size[0];rx++)
  data.regions[`${rx},${rz}`]=land?{offsets:rows(heightChar(OFFSET_BIAS)),surfaces:rows(UNPAINTED)}:{heights:rows(heightChar(base)),surfaces:rows(SURFACE_CODES[surface])};
 return data;
}
const regionOf=(data,x,z)=>data.regions[regionId(x,z)];
const inside=(data,x,z)=>x>=0&&z>=0&&x<data.size[0]&&z<data.size[1];
export function cityHeight(data,x,z){if(!inside(data,x,z))return null;const r=regionOf(data,x,z);return charHeight(r.heights[z%REGION][x%REGION]);}
// A tile's painted surface; null where a town on the land leaves its ground unpainted.
export function citySurface(data,x,z){if(!inside(data,x,z))return null;const c=regionOf(data,x,z).surfaces[z%REGION][x%REGION];return c===UNPAINTED?null:SURFACE_FROM[c]||'grass';}
// A town on the land: the hand offset on its ground (blocks; 0 where unedited).
export function cityOffset(data,x,z){if(!inside(data,x,z))return null;return charHeight(regionOf(data,x,z).offsets[z%REGION][x%REGION])-OFFSET_BIAS;}
export function setCityOffset(data,x,z,offset){if(inside(data,x,z))setChar(regionOf(data,x,z).offsets,x,z,heightChar(OFFSET_BIAS+Math.max(-OFFSET_BIAS,Math.min(19,offset))));}
// Clears a painted surface (a town on the land): the land's own ground shows again.
export function clearCitySurface(data,x,z){if(inside(data,x,z))setChar(regionOf(data,x,z).surfaces,x,z,UNPAINTED);}
const setChar=(rows,x,z,c)=>{const row=rows[z%REGION];rows[z%REGION]=row.slice(0,x%REGION)+c+row.slice(x%REGION+1);};
export function setCityHeight(data,x,z,h){if(inside(data,x,z))setChar(regionOf(data,x,z).heights,x,z,heightChar(Math.max(0,Math.min(19,h))));}
export function setCitySurface(data,x,z,surface){if(inside(data,x,z)&&SURFACE_CODES[surface])setChar(regionOf(data,x,z).surfaces,x,z,SURFACE_CODES[surface]);}
export function fillCity(data,{x0,z0,x1,z1},{h,surface}){for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){if(h!==undefined)setCityHeight(data,x,z,h);if(surface)setCitySurface(data,x,z,surface);}}
export {SURFACE_NAMES};
// Puts a city on the land (`land`: {seed, ring, default, cells}) or takes it off. On: its heights become
// offsets on the land's ground (a terrace a block above ground level stays a block above the land) and
// its grass becomes the land's own ground. Off: the ground goes flat at level 1, keeping the offsets.
export function putOnLand(data,land){
 if(data.land){data.land=land;return data;}
 for(const r of Object.values(data.regions)){r.offsets=r.heights.map(row=>[...row].map(c=>heightChar(OFFSET_BIAS+charHeight(c)-1)).join(''));delete r.heights;r.surfaces=r.surfaces.map(row=>row.replaceAll(SURFACE_CODES.grass,UNPAINTED));}
 data.land=land;return data;
}
export function takeOffLand(data){
 if(!data.land)return data;
 for(const r of Object.values(data.regions)){r.heights=r.offsets.map(row=>[...row].map(c=>heightChar(Math.max(0,1+charHeight(c)-OFFSET_BIAS))).join(''));delete r.offsets;r.surfaces=r.surfaces.map(row=>row.replaceAll(UNPAINTED,SURFACE_CODES.grass));}
 delete data.land;return data;
}

// The tiles a placed prop covers, and the tiles a flight of stairs affects (its steps, plus the landing
// tile at each end). The editor and partial rebuilds use them to know what an edit touches.
export function propCells(p){try{const [w,d]=propFootprint(p.kind,p.rotation||0),out=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)out.push([p.x+a,p.z+b]);return out;}catch{return [[p.x,p.z]];}}
export function stairCells(s){const [dx,dz]={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]}[s.dir],right=[-dz,dx],out=[];for(let a=-1;a<=(s.length||1);a++)for(let b=0;b<(s.width||1);b++)out.push([s.x+dx*a+right[0]*b,s.z+dz*a+right[1]*b]);return out;}

// A town on the land: its ground (town-ground.js) from the land, its buildings' pads, its offsets and
// paint. `land`: the biome land to build on (shared with the land streamed around it), made from
// data.land when not given. Props, stairs and the crystal count as made (nothing grows there).
export function cityGround(data,land=townLand(data)){
 const extraMade=[...data.props.flatMap(propCells),...data.stairs.flatMap(stairCells),...data.crystal?[data.crystal]:[]];
 return createTownGround(data,land,{offset:(x,z)=>cityOffset(data,x,z)||0,surface:(x,z)=>citySurface(data,x,z),extraMade});
}
// The live tiles of a city (no models): terrain, then stairs (which set their own heights). A town on
// the land takes its terrain from its ground (cityGround).
export function cityTiles(data,ground=data.land?cityGround(data):null){
 const map=new Map();
 for(let z=0;z<data.size[1];z++)for(let x=0;x<data.size[0];x++)map.set(key(x,z),ground?ground.tile(x,z):{x,z,h:cityHeight(data,x,z),surface:citySurface(data,x,z),blocked:false,water:false,buildable:true});
 for(const s of data.stairs){const [dx,dz]={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]}[s.dir],behind=map.get(key(s.x-dx,s.z-dz));
  layStairs(map,{...s,base:s.base??behind?.h??1});}
 return map;
}

// Builds a city into the scene with the production builders. Returns its tiles, doors, buildings,
// props, edge features, roofs and spawn, and dispose(). Building ids are their index in data.buildings.
// Everything is built per chunk (world-grid.js CHUNK tiles square, the streamer's size): terrain, walls (one baked
// mesh per chunk), buildings and props go into their chunk's group, so the renderer culls by chunk and
// stream(tile) shows only the chunks around the player (docs/CITY.md, Streaming and the world). An edge
// belongs to the chunk of its lower tile, so two buildings in different chunks still share one wall.
// crystal(tile, parent): places the game's Iter Crystal (crystals.js) instead of a plain model.
// outside(x, z): the land around the city (countryside.js), so its edge tiles join it without a lip.
// land: a town on the land (data.land) builds on this biome land (the one streamed around it); its edge
// tiles join that land (its ground, unless `outside` says otherwise). Its ground is drawn by the land's
// streamer like any other chunk (town-ground.js townSource); the city adds only what is built on it
// (buildings, props, edges, stairs).
// streamRadius / streamBand: chunks within the radius show; shown ones stay until the player is more than
// radius × CHUNK + band tiles from them (the chunk streamer's rule, so a city and the land streamed around
// it always match).
export function buildCity(data,{scene,pickables=[],visible=false,streamRadius=null,streamBand=BAND,crystal:placeCrystal=null,outside=null,land=null}){
 const group=new THREE.Group();group.name='city '+data.id;group.visible=visible;scene.add(group);
 const onLand=data.land?land||townLand(data):null;let ground=onLand?cityGround(data,onLand):null;
 if(ground&&!outside)outside=(x,z)=>ground.inside(x,z)?null:ground.tile(x,z);
 const map=cityTiles(data,ground),t=(x,z)=>map.get(key(x,z)),tiles=[...map.values()];
 // Each tile's ground as built (before buildings and props mark it), for rebuild() to compare against.
 const groundOf=new WeakMap();for(const tile of tiles)groundOf.set(tile,{...tile});
 // Townsfolk posted just outside the city (gate guards) stand on the land around it: those tiles join
 // the city's map (not its terrain, which the land draws) so they have somewhere to stand.
 if(outside)for(const f of data.townsfolk||[])if(f.home&&!map.has(key(...f.home))){const o=outside(...f.home);if(o)map.set(key(...f.home),o);}
 const chunks=new Map(),chunkOf=chunkId;
 // Each chunk keeps what it built, so it can be torn down and rebuilt on its own (rebuild()).
 function chunk(x,z){const id=chunkOf(x,z);if(!chunks.has(id)){const root=new THREE.Group();root.name='chunk '+id;group.add(root);const [cx,cz]=id.split(',').map(Number);
  chunks.set(id,{id,cx,cz,root,tiles:[],edges:createEdgeFeatures({parent:root,pickables,tileAt:t,style:data.style}),items:{buildings:[],props:[],furniture:[],doors:[]}});}return chunks.get(id);}
 // An edge lives in the chunk of its lower tile, unless a building placed it: a building's walls live in
 // its home chunk (with its roof, floor and furniture), so it shows or hides whole across a chunk line.
 const edgeKey=(a,b)=>[key(a.x,a.z),key(b.x,b.z)].sort().join('|'),edgeHome=new Map();
 const edgeChunk=(a,b)=>edgeHome.get(edgeKey(a,b))||(()=>{const [p]=[a,b].sort((m,n)=>m.z-n.z||m.x-n.x);return chunk(p.x,p.z);})();
 const addIn=(c,a,b,kind,options)=>{const k=edgeKey(a,b);if(!edgeHome.has(k))edgeHome.set(k,c);return edgeHome.get(k).edges.add(a,b,kind,options);};
 // One edges interface over every chunk's edge features (buildings and checks see a single city).
 const edges={
  add:(a,b,kind,options)=>addIn(edgeChunk(a,b),a,b,kind,options),remove:(a,b)=>edgeChunk(a,b).edges.remove(a,b),info:(a,b)=>edgeChunk(a,b).edges.info(a,b),
  doorProblems:()=>[...chunks.values()].flatMap(c=>c.edges.doorProblems()),get count(){return [...chunks.values()].reduce((n,c)=>n+c.edges.count,0);},
  get buildingBoxes(){const all=new Map();for(const c of chunks.values())for(const [id,b] of c.edges.buildingBoxes){const o=all.get(id);all.set(id,o?{x0:Math.min(o.x0,b.x0),z0:Math.min(o.z0,b.z0),x1:Math.max(o.x1,b.x1),z1:Math.max(o.z1,b.z1),base:Math.min(o.base,b.base),top:Math.max(o.top,b.top)}:{...b});}return all;},
  dispose(){for(const c of chunks.values())c.edges.dispose();},
 };
 // City-wide lists, gathered from the chunks after each build (the same arrays, refilled in place).
 const doors=[],roofs=[],buildings=[],props=[],furniture=[];
 // The city object exists from the start, so links (separate interiors, dungeons) can point at it.
 const city={data,areaId:null};
 let crystal=null,crystalChunk=null;
 // City walls (city-walls.js): a curtain wall with corner towers and gatehouses, solid tiles and its own
 // cut pieces; the city's `gates` are its gateways. Built once, with the first full build.
 let walls=null;
 // Builds the content of the chunks in `only` (a Set of chunk ids), or of every chunk (null). The same
 // steps serve the first build and a partial rebuild, so they can't drift apart.
 function populate(only=null){
  const want=c=>!only||only.has(c.id);
  data.buildings.forEach((b,i)=>{
   const home=chunk(b.x,b.z);if(!want(home))return;
   const local={...edges,add:(a,c,kind,options)=>addIn(home,a,c,kind,options),addCutPart:(o,owner,opt)=>home.edges.addCutPart(o,owner,opt),removeCutPart:o=>home.edges.removeCutPart(o)};
   const built=createBuilding(b.desc,{origin:[b.x,b.z],id:i,edges:local,tileAt:t,parent:home.root});built.data=b;buildings[i]=built;home.items.buildings.push(i);
   if(b.desc.interior==='separate')built.doors.forEach((door,j)=>{door.link={kind:'interior',city,building:i,door:j};});
   for(const p of built.plan.tiles){const tile=t(...p);if(tile&&!['planks','stone'].includes(tile.surface))tile.surface='floor';}home.items.doors.push(...built.doors);});
  // Hand-placed edges never replace a building's own walls (a curtain wall flush with a tower).
  for(const e of data.edges){const a=t(...e.a),b=t(...e.b);if(!a||!b)continue;const home=edgeChunk(a,b);if(!want(home))continue;
   if(!(edges.info(a,b)?.owners.length)){const f=edges.add(a,b,e.kind,e.options||{});if(e.kind==='door')home.items.doors.push(f);}}
  if(!only&&data.walls)walls=buildCityWalls({plan:wallPlan({size:data.size[0],gates:data.gates||[],thickness:data.walls.thickness}),tileAt:t,chunkRoot:(x,z)=>chunk(x,z).root,root:group,pickables,sound:doorSound});
  // Railings along stair sides and terrace edges (city-terrain.js), unless an edge is already there.
  // A partial rebuild looks one tile past its chunks, for railings on their borders.
  const scope=only?tiles.filter(tile=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>only.has(chunkOf(tile.x+dx,tile.z+dz)))):tiles;
  const stairSides=new Map();
  for(const [high,low,stair] of railingEdges(scope,map)){const home=edgeChunk(high,low);if(!want(home)||edges.info(high,low)||high.indoor||low.indoor)continue;
   edges.add(high,low,'railing',{hidden:!!stair});if(stair){if(!stairSides.has(home))stairSides.set(home,[]);stairSides.get(home).push([high,low]);}}
  // Stair sides: sloped handrails, one merged mesh per chunk.
  for(const [c,list] of stairSides){const rails=mergedMesh(stairRailParts(list));rails.name='stair-rails';c.root.add(rails);}
  for(const p of data.props){const home=chunk(p.x,p.z);if(!want(home))continue;
   try{const prop=createProp(p.kind,{origin:[p.x,p.z],rotation:p.rotation||0,tileAt:t,parent:home.root,pickables,id:p.id??null,loot:p.loot?{id:`${data.id}:${p.x},${p.z}`,items:p.loot}:null,shop:p.shop??null});if(p.link)prop.link={kind:'dungeon',city,id:p.link};home.items.props.push(prop);}catch(error){console.warn(error.message);}}
  // Furniture (furnish.js): each in-place building furnished by its use, around hand-placed props, in a
  // group of its own that shows only while the building is cut (the roof hides it otherwise). Static
  // pieces merge into one mesh per building; interactive ones stay pickable.
  data.buildings.forEach((b,i)=>{const home=chunk(b.x,b.z);if(!want(home))return;const built=buildings[i],use=furnishingUse(b.desc);built.furniture=[];built.shop=use?shopForBuilding(b.desc,use):null;if(!use||b.desc.interior!=='inPlace')return;
   const keep=built.plan.tiles.filter(([x,z])=>t(x,z)?.blocked);
   const layout=furnishRoom(roomOfPlan(built.plan,{keep}),use,b.desc.furnishSeed??b.desc.seed??i);if(!layout.length)return;
   if(layout.keeper)built.anchors.keeper=t(...layout.keeper);
   const group=new THREE.Group();group.name='furniture';group.userData.showWhenCut=true;group.visible=false;home.root.add(group);
   for(const f of layout){try{const prop=createProp(f.kind,{origin:[f.x,f.z],rotation:f.rotation,tileAt:t,parent:group,pickables,shop:built.shop});prop.building=i;built.furniture.push(prop);home.items.furniture.push(prop);}catch{}}
   mergeStatic(group,built.furniture.filter(p=>!p.def.interaction).map(p=>p.group),{name:'furniture-merged'});
   home.edges.addCutPart(group,i);
   // Furniture never moves: its matrices are worked out once and the frame's matrix pass skips it
   // (an opening chest refreshes its own, props.js).
   group.updateWorldMatrix(true,true);group.matrixWorldAutoUpdate=false;for(const p of built.furniture)p.frozen=true;
  });
  // The Iter Crystal: a model, or (with `crystal`) the game's travel crystal (crystals.js).
  if(data.crystal){const tile=t(...data.crystal);if(tile&&want(chunk(tile.x,tile.z))){const parent=chunk(tile.x,tile.z).root;crystalChunk=chunkOf(tile.x,tile.z);
   if(placeCrystal)crystal=placeCrystal(tile,parent);else{crystal=makeCrystal();crystal.position.set(tile.x-6,tile.h,tile.z-6);parent.add(crystal);tile.blocked=true;}}}
  // Always-visible decoration merged per chunk (static-merge.js): building decor (awnings, sign boards,
  // flower boxes) and props nobody clicks. Clickable props, doors, sign icons, roofs and caps stay apart.
  for(const c of chunks.values()){if(!want(c))continue;
   const objects=[...c.items.buildings.map(i=>buildings[i].decor),...c.items.props.filter(p=>!p.def.interaction).map(p=>p.group)];
   if(objects.length)mergeStatic(c.root,objects,{name:'chunk-statics'});}
  // A building's floor tiles belong to its home chunk too.
  for(const tile of tiles){const c=tile.building!==undefined&&data.buildings[tile.building]?chunk(data.buildings[tile.building].x,data.buildings[tile.building].z):chunk(tile.x,tile.z);if(want(c))c.tiles.push(tile);}
  const terrainMap=outside?{get:k=>map.get(k)??outside(...k.split(',').map(Number))}:map;
  for(const c of chunks.values()){if(!want(c))continue;const dry=c.tiles.filter(tile=>ground?tile.stair:!tile.water);if(dry.length)createTerrainBatch({tiles:dry,map:terrainMap,factory:tile=>makeCityTile(tile,terrainMap,{style:'stone'}),parent:c.root,pickables,roughness:.95,batchSize:CHUNK});c.edges.bake();}
  // The city-wide lists, in chunk order.
  const all=[...chunks.values()];
  doors.length=0;doors.push(...all.flatMap(c=>c.items.doors));
  props.length=0;props.push(...all.flatMap(c=>c.items.props));
  furniture.length=0;furniture.push(...all.flatMap(c=>c.items.furniture));
  roofs.length=0;roofs.push(...buildings.filter(Boolean).map(b=>b.roof));
  if(!roofsShown)for(const r of roofs){r.userData.hiddenByMap=true;r.visible=false;}
 }
 // Tears a chunk down completely: its buildings, props, furniture, edges, terrain and meshes.
 function clearChunk(id){
  const c=chunks.get(id);if(!c)return;
  for(const p of [...c.items.props,...c.items.furniture])p.dispose();
  for(const i of c.items.buildings){buildings[i]?.dispose();buildings[i]=undefined;}
  if(crystalChunk===id&&crystal){if(crystal.dispose)crystal.dispose();else crystal.removeFromParent();crystal=null;crystalChunk=null;}
  c.edges.dispose();for(const [k,owner] of [...edgeHome])if(owner===c)edgeHome.delete(k);
  for(const m of [...pickables])if(isUnder(m,c.root))pickables.splice(pickables.indexOf(m),1);
  const owned=new Set();c.root.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)owned.add(o.geometry);});for(const g of owned)g.dispose();
  c.root.removeFromParent();chunks.delete(id);
 }
 // Which chunks a placed thing covers: anything spanning chunks is rebuilt with all of them.
 const spanChunks=cells=>[...new Set(cells.filter(Boolean).map(([x,z])=>chunkOf(x,z)))];
 let roofsShown=true,streamCenter=null,streamTile=null;
 populate();
 const broken=edges.doorProblems();if(broken.length)console.warn('Door rule: '+broken.map(r=>`${r.door.a.x},${r.door.a.z}: ${r.problems.join('; ')}`).join(' | '));
 // defineProperties, not Object.assign: assign would copy the getters as fixed values.
 return Object.defineProperties(city,Object.getOwnPropertyDescriptors({group,tiles:map,doors,edges,roofs,buildings,props,furniture,chunks,walls,spawn:t(...data.spawn)||tiles[0],
  get crystal(){return crystal;},get ground(){return ground;},
  get roofsShown(){return roofsShown;},setRoofs(on){roofsShown=!!on;for(const r of roofs){r.userData.hiddenByMap=!roofsShown;r.visible=roofsShown;}},
  // Rebuilds only the given chunks from the (edited) data, leaving the rest of the city as it is: the
  // city editor's fast path (docs/TOWN.md, Authoring tools). `dirty`: chunk ids an edit touched; pass
  // the chunks of every tile it changed, before and after, one tile out. Anything spanning chunks
  // (props, stairs) pulls its other chunks in, and so does any chunk whose ground changed. Returns the
  // chunk ids it rebuilt (a Set), or false, leaving the city untouched, when only a full build will do: the building list changed length, or the city has walls (they span every edge
  // chunk) and an edit touches one of their chunks. wrap(only, run): runs the rebuild itself (run()), so
  // the land streamed under a town can step aside for it (chunk-streamer.js reload).
  rebuild(dirty,{wrap=null}={}){
   if(data.buildings.length!==buildings.length)return false;
   const only=new Set(dirty);
   // Buildings sharing a wall across a chunk line: the wall lives in one of their chunks, but both
   // buildings shape it, so they rebuild together.
   const homeOf=i=>data.buildings[i]?chunkOf(data.buildings[i].x,data.buildings[i].z):null,shared=[];
   for(const tile of tiles)if(tile.building!==undefined)for(const [dx,dz] of [[1,0],[0,1]]){const n=map.get(key(tile.x+dx,tile.z+dz));
    if(n?.building!==undefined&&n.building!==tile.building&&homeOf(n.building)!==homeOf(tile.building))shared.push([homeOf(tile.building),homeOf(n.building)].filter(Boolean));}
   for(let grew=true;grew;){grew=false;
    const spans=[...shared,...data.props.map(p=>spanChunks(propCells(p))),...data.stairs.map(s=>spanChunks(stairCells(s))),...[...chunks.values()].flatMap(c=>c.items.props.map(p=>spanChunks((p.tiles||[p.tile]).map(tile=>tile&&[tile.x,tile.z]))))];
    for(const ids of spans)if(ids.some(id=>only.has(id)))for(const id of ids)if(!only.has(id)){only.add(id);grew=true;}}
   // The ground as the data now has it. A town on the land re-levels its pads, so an edit can move
   // ground well past the tiles it touched: any chunk whose ground changed rebuilds too.
   if(ground)ground=cityGround(data,onLand);
   const fresh=cityTiles(data,ground),shape=tile=>tile&&`${tile.h}|${tile.surface}|${!!tile.water}|${tile.stair?.dir||''}|${tile.palette?.[0]||''}`;
   for(const tile of tiles){const id=chunkOf(tile.x,tile.z);if(!only.has(id)&&chunks.has(id)&&ground&&shape(fresh.get(key(tile.x,tile.z)))!==shape(groundOf.get(tile)))only.add(id);}
   if(walls&&[...only].some(id=>tiles.some(tile=>tile.cityWall&&chunkOf(tile.x,tile.z)===id)))return false;
   const run=()=>{
   for(const id of only)clearChunk(id);
   // Fresh terrain for their tiles, the same objects refilled (edges on their borders that other chunks
   // own are kept: they live in those chunks' edge features).
   for(const tile of tiles){if(!only.has(chunkOf(tile.x,tile.z)))continue;const next=fresh.get(key(tile.x,tile.z));if(!next)continue;
    for(const k of [...GROUND_KEYS,'stair','indoor','building','prop','blocksSight','reachOver','cityWall'])delete tile[k];
    Object.assign(tile,next,{x:tile.x,z:tile.z});groundOf.set(tile,{...next});}
   populate(only);};
   if(wrap)wrap(only,run);else run();
   city.spawn=t(...data.spawn)||tiles[0];
   return only;
  },
  // Shows only the chunks within `radius` chunks of the tile (render streaming; tiles stay resident).
  stream(tile,radius=streamRadius){if(!tile||radius===null)return;const at=`${tile.x},${tile.z}`;if(at===streamTile)return;const first=streamCenter===null;streamTile=at;const id=chunkOf(tile.x,tile.z);streamCenter=id;const [cx,cz]=id.split(',').map(Number);
   const shown=new Set();
   // The first time, only the radius (a fresh city starts with everything shown).
   for(const c of chunks.values()){const d=Math.max(Math.abs(c.cx-cx),Math.abs(c.cz-cz));if(d<=radius||!first&&c.root.visible&&chunkGap(c.cx,c.cz,tile.x,tile.z)<=radius*CHUNK+streamBand)shown.add(c);}
   if([...chunks.values()].every(c=>c.root.visible===shown.has(c)))return;
   for(const c of chunks.values())c.root.visible=shown.has(c);
   // Things kept outside the chunk groups (instanced ground cover) follow the shown chunks.
   city.onStream?.(chunks);},
  // Is this tile's chunk shown? (true when the city doesn't stream). Things kept outside the chunk
  // groups (townsfolk, sentries) hide with it.
  // Tiles outside the city (gate guards on the land around it) count as shown.
  isShown:(x,z)=>{const c=chunks.get(chunkOf(x,z));return streamCenter===null||!c||c.root.visible;},
  get shownChunks(){return [...chunks.values()].filter(c=>c.root.visible).length;},
  dispose(){walls?.dispose();edges.dispose();for(const p of props)p.dispose();const owned=new Set();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)owned.add(o.geometry);});for(const g of owned)g.dispose();
   for(const m of [...pickables])if(isUnder(m,group))pickables.splice(pickables.indexOf(m),1);group.removeFromParent();}}));
}
// What a tile's ground sets (cleared before a rebuild refills a tile).
const GROUND_KEYS=['h','surface','blocked','water','buildable','palette','biome','shore','rocky','made','still','waterKind'];
const isUnder=(o,root)=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
