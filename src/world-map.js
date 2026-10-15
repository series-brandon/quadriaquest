import * as THREE from 'three';
import {createTerrainBatch} from './terrain-batch.js';
import {createEdgeFeatures} from './doors.js';
import {createBuilding,planBuilding} from './building-kit.js';
import {createProp,propFootprint,PROPS} from './props.js';
import {makeMapTile,layStairs,railingEdges,stairRailParts,SURFACE_NAMES} from './map-terrain.js';
import {mergedMesh} from './merged-model.js';
import {mergeStatic} from './static-merge.js';
import {isHeld,notHeld} from './held.js';
import {wallPaint,floorPalette} from './paint.js';
import {shopForBuilding} from './shops.js';
import {buildCityWalls,wallPlan} from './city-walls.js';
import {doorSound,enterLink} from './doors.js';
import {createStairwell,floorLevels,flightOf} from './spaces.js';
import {furnishRoom,roomOfPlan,furnishingUse} from './furnish.js';
import {makeCrystal} from './crystal-model.js';
import {key} from './world.js';
import {CHUNK,REGION,BAND,chunkId,regionId,chunkGap} from './world-grid.js';
import {createTownGround,townLand} from './town-ground.js';
import {CELL as LAND_CELL} from './biome-land.js';
import {createMistWall} from './mist-wall.js';
import {packMap,unpackMap,unpackRegion} from './map-file.js';

// Cities as data (docs/CITY.md, Authoring and Streaming; city Phases 5, 6 and 9). A city is a plain
// object the editor edits and the repo stores, built by the shared builders:
//   {id, name, size:[w, d], style, spawn:[x, z], crystal:[x, z],
//    regions: {'rx,rz': {heights:[REGION strings], surfaces:[REGION strings]}},   // terrain per region
//    stairs:[{x, z, dir, length, width}], buildings:[{x, z, desc}], props:[{kind, x, z, rotation}],
//    edges:[{a:[x, z], b:[x, z], kind}], townsfolk:[…], interiors:{…}}
// Terrain is stored per tile by region (world-grid.js REGION; docs/WORLD.md, Glossary): heights in half
// blocks as one character each ('0' + 2h), surfaces as one letter each.
// A town on the land (`land`: {seed, default, cells, origin}; town-ground.js, docs/TOWN.md) stores no
// heights of its own: its regions hold `offsets` instead, hand edits as deltas on the land's ground in
// half blocks ('0' + 2 × (offset + 10), so 'D' is none), and '.' surfaces, which show the land's ground.
const SURFACE_CODES={grass:'g',dirt:'d',cobble:'c',flagstone:'f',plaza:'p',stone:'s',floor:'o',planks:'k',dungeon:'u',water:'w'};
const SURFACE_FROM=Object.fromEntries(Object.entries(SURFACE_CODES).map(([k,v])=>[v,k]));
const heightChar=h=>String.fromCharCode(48+Math.round(h*2)),charHeight=c=>(c.charCodeAt(0)-48)/2;
const OFFSET_BIAS=10,UNPAINTED='.';

export function createMapData({id='city',name='City',size=[64,64],base=1,surface='grass',style='timber',land=null}={}){
 const data={id,name,size:[...size],style,spawn:[Math.floor(size[0]/2),Math.floor(size[1]/2)],crystal:null,regions:{},stairs:[],buildings:[],props:[],edges:[],townsfolk:[],interiors:{}};
 if(land)data.land=land;
 const rows=c=>Array.from({length:REGION},()=>c.repeat(REGION));
 for(let rz=0;rz*REGION<size[1];rz++)for(let rx=0;rx*REGION<size[0];rx++)
  data.regions[`${rx},${rz}`]=land?{offsets:rows(heightChar(OFFSET_BIAS)),surfaces:rows(UNPAINTED)}:{heights:rows(heightChar(base)),surfaces:rows(SURFACE_CODES[surface])};
 return data;
}
export {packMap,unpackMap};
const regionOf=(data,x,z)=>{const r=data.regions[regionId(x,z)];if(r&&!Array.isArray(r.surfaces))unpackRegion(r);return r;};
const inside=(data,x,z)=>x>=0&&z>=0&&x<data.size[0]&&z<data.size[1];
export function mapHeight(data,x,z){if(!inside(data,x,z))return null;const r=regionOf(data,x,z);return charHeight(r.heights[z%REGION][x%REGION]);}
// A tile's painted surface; null where a town on the land leaves its ground unpainted.
export function mapSurface(data,x,z){if(!inside(data,x,z))return null;const c=regionOf(data,x,z).surfaces[z%REGION][x%REGION];return c===UNPAINTED?null:SURFACE_FROM[c]||'grass';}
// A town on the land: the hand offset on its ground (blocks; 0 where unedited).
export function mapOffset(data,x,z){if(!inside(data,x,z))return null;return charHeight(regionOf(data,x,z).offsets[z%REGION][x%REGION])-OFFSET_BIAS;}
export function setMapOffset(data,x,z,offset){if(inside(data,x,z))setChar(regionOf(data,x,z).offsets,x,z,heightChar(OFFSET_BIAS+Math.max(-OFFSET_BIAS,Math.min(19,offset))));}
// Clears a painted surface (a town on the land): the land's own ground shows again.
export function clearMapSurface(data,x,z){if(inside(data,x,z))setChar(regionOf(data,x,z).surfaces,x,z,UNPAINTED);}
const setChar=(rows,x,z,c)=>{const row=rows[z%REGION];rows[z%REGION]=row.slice(0,x%REGION)+c+row.slice(x%REGION+1);};
export function setMapHeight(data,x,z,h){if(inside(data,x,z))setChar(regionOf(data,x,z).heights,x,z,heightChar(Math.max(0,Math.min(19,h))));}
export function setMapSurface(data,x,z,surface){if(inside(data,x,z)&&SURFACE_CODES[surface])setChar(regionOf(data,x,z).surfaces,x,z,SURFACE_CODES[surface]);}
export function fillMap(data,{x0,z0,x1,z1},{h,surface}){for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){if(h!==undefined)setMapHeight(data,x,z,h);if(surface)setMapSurface(data,x,z,surface);}}
export {SURFACE_NAMES};
// Puts a city on the land (`land`: {seed, default, cells, origin}) or takes it off. On: its heights become
// offsets on the land's ground (a terrace a block above ground level stays a block above the land) and
// its grass becomes the land's own ground. Off: the ground goes flat at level 1, keeping the offsets.
export function putOnLand(data,land){
 if(data.land){data.land=land;return data;}unpackMap(data);
 for(const r of Object.values(data.regions)){r.offsets=r.heights.map(row=>[...row].map(c=>heightChar(OFFSET_BIAS+charHeight(c)-1)).join(''));delete r.heights;r.surfaces=r.surfaces.map(row=>row.replaceAll(SURFACE_CODES.grass,UNPAINTED));}
 data.land=land;return data;
}
// Grows a map by whole chunks on any side (docs/TOWN.md, Growing the overworld): new ground is plain
// (unpainted on the land, grass at level 1 otherwise), and growing west or north moves everything built
// (and, on the land, the map's origin in it, so the land stays where it was under what was built).
// Shrinking isn't supported; nor is a walled city (its walls follow its size).
// A map is whole regions (docs/TOWN.md, Whole regions): its size a multiple of REGION each way, so it grows by
// adding regions. round: padding a map that isn't whole yet up to whole regions (roundUpToRegions).
export const wholeRegions=data=>data.size.every(n=>n%REGION===0);
export function growMap(data,{north=0,east=0,south=0,west=0},{round=false}={}){
 for(const n of [north,east,south,west])if(n<0||n%CHUNK)throw Error(`Grow by whole ${CHUNK}-tile chunks.`);
 if(!round&&((data.size[0]+west+east)%REGION||(data.size[1]+north+south)%REGION))throw Error(`A map is whole ${REGION}-tile regions: grow it by whole regions.`);
 if(data.walls)throw Error('A walled city can’t grow: its walls follow its size.');
 const [W,D]=data.size,next=createMapData({id:data.id,name:data.name,size:[W+west+east,D+north+south],style:data.style,land:data.land?{...data.land}:null});
 // The ground: each tile's own values, moved (only those that differ from plain ground).
 const plainOffset=heightChar(OFFSET_BIAS),plainHeight=heightChar(1);
 for(let z=0;z<D;z++)for(let x=0;x<W;x++){const r=regionOf(data,x,z),s=r.surfaces[z%REGION][x%REGION];
  if(s!==(data.land?UNPAINTED:SURFACE_CODES.grass))setChar(regionOf(next,x+west,z+north).surfaces,x+west,z+north,s);
  if(data.land){const c=r.offsets[z%REGION][x%REGION];if(c!==plainOffset)setChar(regionOf(next,x+west,z+north).offsets,x+west,z+north,c);}
  else{const c=r.heights[z%REGION][x%REGION];if(c!==plainHeight)setChar(regionOf(next,x+west,z+north).heights,x+west,z+north,c);}}
 data.regions=next.regions;data.size=next.size;
 // Everything placed, moved with it.
 const at=p=>p&&[p[0]+west,p[1]+north],xz=o=>{o.x+=west;o.z+=north;};
 data.spawn=at(data.spawn);if(data.crystal)data.crystal=at(data.crystal);
 for(const list of [data.buildings,data.props,data.stairs,data.resources||[],data.cover||[],data.fishing||[],data.enemies||[]])list.forEach(xz);
 for(const e of data.edges){e.a=at(e.a);e.b=at(e.b);}
 for(const f of data.townsfolk||[]){if(f.home)f.home=at(f.home);if(f.patrol)f.patrol=f.patrol.map(at);}
 if(data.land){const [ox,oz]=data.land.origin||[0,0];data.land.origin=[ox-west,oz-north];
  if(data.land.removed)data.land.removed=data.land.removed.map(id=>id.replace(/(-?\d+),(-?\d+)$/,(m,x,z)=>`${+x+west},${+z+north}`));
  // The new land carries on the edge's paint (its biome and terrain), as the land already reads past its edge
  // (biome-land.js): a sea painted to the edge goes on being sea.
  const cellsOf=(o,n)=>[Math.floor(o/LAND_CELL),Math.floor((o+n-1)/LAND_CELL)],[ax0,ax1]=cellsOf(ox,W),[az0,az1]=cellsOf(oz,D),[bx0,bx1]=cellsOf(ox-west,W+west+east),[bz0,bz1]=cellsOf(oz-north,D+north+south);
  for(const layer of [data.land.cells,data.land.terrain].filter(Boolean))for(let cz=bz0;cz<=bz1;cz++)for(let cx=bx0;cx<=bx1;cx++){if(cx>=ax0&&cx<=ax1&&cz>=az0&&cz<=az1)continue;
   const from=`${Math.min(ax1,Math.max(ax0,cx))},${Math.min(az1,Math.max(az0,cz))}`,to=`${cx},${cz}`;if(layer[from]!==undefined&&layer[to]===undefined)layer[to]=layer[from];}}
 return data;
}
// Pads a map out to whole regions: half the missing tiles (in whole chunks) west and north, the rest east and south.
export function roundUpToRegions(data){const pad=n=>{const need=Math.ceil(n/REGION)*REGION-n,low=Math.floor(need/2/CHUNK)*CHUNK;return [low,need-low];};
 const [west,east]=pad(data.size[0]),[north,south]=pad(data.size[1]);return west+east+north+south?growMap(data,{north,east,south,west},{round:true}):data;}
export function takeOffLand(data){
 if(!data.land)return data;unpackMap(data);
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
export function mapGround(data,land=townLand(data)){
 // Props that may stand on water (a jetty, a boat) leave the water as it is under them.
 const extraMade=[...notHeld(data.props).filter(p=>!PROPS[p.kind]?.water).flatMap(propCells),...notHeld(data.stairs).flatMap(stairCells),...data.crystal&&!isHeld(data.crystal)?[data.crystal]:[]];
 return createTownGround(data,land,{offset:(x,z)=>mapOffset(data,x,z)||0,surface:(x,z)=>mapSurface(data,x,z),extraMade});
}
// The live tiles of a city (no models): terrain, then stairs (which set their own heights). A town on
// the land takes its terrain from its ground (mapGround).
// chunkIds: only the tiles of these chunks (a partial rebuild), with `around` (the built tiles) to look
// up a stair's foot outside them.
export function mapTiles(data,ground=data.land?mapGround(data):null,chunkIds=null,around=null){
 const map=new Map(),[W,D]=data.size,add=(x,z)=>map.set(key(x,z),ground?ground.tile(x,z):{x,z,h:mapHeight(data,x,z),surface:mapSurface(data,x,z),blocked:false,water:false,buildable:true});
 if(!chunkIds){for(let z=0;z<D;z++)for(let x=0;x<W;x++)add(x,z);}
 else for(const id of chunkIds){const [cx,cz]=id.split(',').map(Number);for(let z=Math.max(0,cz*CHUNK);z<Math.min(D,(cz+1)*CHUNK);z++)for(let x=Math.max(0,cx*CHUNK);x<Math.min(W,(cx+1)*CHUNK);x++)add(x,z);}
 for(const s of notHeld(data.stairs)){if(chunkIds&&!stairCells(s).some(([x,z])=>map.has(key(x,z))))continue;
  const [dx,dz]={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]}[s.dir],behind=map.get(key(s.x-dx,s.z-dz))??around?.get(key(s.x-dx,s.z-dz));
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
// lazy (docs/TOWN.md, Streaming a map's content): tiles are made a chunk at a time when first asked for, and
// a chunk's content (buildings, props, edges, furniture) is built when it comes within the stream radius,
// a few milliseconds a frame (stream()). The chunks townsfolk live and work in, the spawn's and the
// crystal's are always built. Otherwise everything is built at once.
export function buildMap(data,{scene,pickables=[],visible=false,streamRadius=null,streamBand=BAND,crystal:placeCrystal=null,outside=null,land=null,lazy=false}){
 const group=new THREE.Group();group.name='city '+data.id;group.visible=visible;scene.add(group);
 const onLand=data.land?land||townLand(data):null;let ground=onLand?mapGround(data,onLand):null;
 if(ground&&!outside)outside=(x,z)=>ground.inside(x,z)?null:ground.tile(x,z);
 // Each tile's ground as built (before buildings and props mark it), for rebuild() to compare against, and
 // the tiles of each chunk: partial rebuilds visit only the chunks they rebuild (a large map has tens of
 // thousands of tiles).
 const tiles=[],groundOf=new WeakMap(),byChunk=new Map();
 const keep=list=>{for(const tile of list){tiles.push(tile);groundOf.set(tile,{...tile});const id=chunkId(tile.x,tile.z);if(!byChunk.has(id))byChunk.set(id,[]);byChunk.get(id).push(tile);}};
 const map=lazy?chunkTiles(data.size,id=>{const fresh=[];for(const [k,tile] of mapTiles(data,ground,[id],map))if(!map.peek(k)){map.put(k,tile);fresh.push(tile);}keep(fresh);}):mapTiles(data,ground);
 if(!lazy)keep([...map.values()]);
 const t=(x,z)=>map.get(key(x,z));
 const tilesOf=ids=>[...ids].flatMap(id=>byChunk.get(id)||[]);
 // The tiles just outside these chunks, along their edges (railings on a chunk's border look one tile out).
 const borderOf=ids=>{const out=[];for(const id of ids){const [cx,cz]=id.split(',').map(Number),x0=cx*CHUNK,z0=cz*CHUNK;
  for(let i=0;i<CHUNK;i++)for(const [x,z] of [[x0-1,z0+i],[x0+CHUNK,z0+i],[x0+i,z0-1],[x0+i,z0+CHUNK]]){const tile=map.get(key(x,z));if(tile&&!ids.has(chunkOf(x,z)))out.push(tile);}}return out;};
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
 // One edges interface over every chunk's edge features (buildings and checks see a single map).
 const edges={
  add:(a,b,kind,options)=>addIn(edgeChunk(a,b),a,b,kind,options),remove:(a,b)=>edgeChunk(a,b).edges.remove(a,b),info:(a,b)=>edgeChunk(a,b).edges.info(a,b),
  doorProblems:()=>[...chunks.values()].flatMap(c=>c.edges.doorProblems()),get count(){return [...chunks.values()].reduce((n,c)=>n+c.edges.count,0);},
  get buildingBoxes(){const all=new Map();for(const c of chunks.values())for(const [id,b] of c.edges.buildingBoxes){const o=all.get(id);all.set(id,o?{x0:Math.min(o.x0,b.x0),z0:Math.min(o.z0,b.z0),x1:Math.max(o.x1,b.x1),z1:Math.max(o.z1,b.z1),base:Math.min(o.base,b.base),top:Math.max(o.top,b.top)}:{...b});}return all;},
  dispose(){for(const c of chunks.values())c.edges.dispose();},
 };
 // City-wide lists, gathered from the chunks after each build (the same arrays, refilled in place).
 const doors=[],roofs=[],buildings=[],props=[],furniture=[];
 // The city object exists from the start, so links (separate interiors, dungeons) can point at it.
 const builtMap={data,areaId:null};
 let crystal=null,crystalChunk=null;
 // City walls (city-walls.js): a curtain wall with corner towers and gatehouses, solid tiles and its own
 // cut pieces; the city's `gates` are its gateways. Built once, with the first full build.
 let walls=null;
 // Builds the content of the chunks in `only` (a Set of chunk ids), or of every chunk (null). The same
 // steps serve the first build and a partial rebuild, so they can't drift apart.
 function populate(only=null){
  // A lazy map makes these chunks' tiles first (their stairs and floors need them even with nothing built there).
  if(only)for(const id of only){populated.add(id);if(lazy)map.get(firstTileOf(id));}
  const want=c=>!only||only.has(typeof c==='string'?c:c.id);
  data.buildings.forEach((b,i)=>{
   if(!want(chunkOf(b.x,b.z)))return;const home=chunk(b.x,b.z);if(isHeld(b)){buildings[i]=null;return;}
   // Wall paint (paint.js): the ground floor's, on its walls' inside faces.
   let plan=null;try{plan=planBuilding(b.desc,[b.x,b.z]);}catch{}
   const local={...edges,add:(a,c,kind,options)=>addIn(home,a,c,kind,{...options,paint:wallPaint(b.paint,plan,a,c)}),addCutPart:(o,owner,opt)=>home.edges.addCutPart(o,owner,opt),removeCutPart:o=>home.edges.removeCutPart(o)};
   const built=createBuilding(b.desc,{origin:[b.x,b.z],id:i,edges:local,tileAt:t,parent:home.root});built.data=b;buildings[i]=built;home.items.buildings.push(i);
   if(b.desc.interior==='separate')built.doors.forEach((door,j)=>{door.link={kind:'interior',builtMap,building:i,door:j};});
   // Its floor: the floor surface (not the land's colours), or its paint.
   for(const p of built.plan.tiles){const tile=t(...p);if(!tile)continue;if(!['planks','stone'].includes(tile.surface))tile.surface='floor';const painted=floorPalette(b.paint,built.plan,tile);if(painted)tile.palette=painted;else if(tile.surface==='floor')delete tile.palette;}home.items.doors.push(...built.doors);});
  // A hand-placed wall inside a building (a room's wall) takes that building's paint on each face.
  const edgePaint=(a,b)=>{const of=p=>{const i=p.building;return i!==undefined&&buildings[i]?{paint:data.buildings[i].paint,plan:buildings[i].plan}:null;},pa=of(a),pb=of(b);
   const fa=pa&&wallPaint(pa.paint,pa.plan,a,b)?.a,fb=pb&&wallPaint(pb.paint,pb.plan,a,b)?.b;return fa||fb?{a:fa||null,b:fb||null}:null;};
  // Hand-placed edges never replace a building's own walls (a curtain wall flush with a tower).
  for(const e of notHeld(data.edges)){if(only&&!only.has(chunkOf(...e.a))&&!only.has(chunkOf(...e.b)))continue;const a=t(...e.a),b=t(...e.b);if(!a||!b)continue;const home=edgeChunk(a,b);if(!want(home))continue;
   // A wall inside a building belongs to it, so it's cut with it (cutaway.js).
   const owner=[...new Set([a.building,b.building].filter(i=>i!==undefined&&buildings[i]))];
   if(!(edges.info(a,b)?.owners.length)){const f=edges.add(a,b,e.kind,{...e.options,...owner.length?{owner}:{},paint:edgePaint(a,b)});if(e.kind==='door')home.items.doors.push(f);}}
  if(!only&&data.walls)walls=buildCityWalls({plan:wallPlan({size:data.size[0],gates:data.gates||[],thickness:data.walls.thickness}),tileAt:t,chunkRoot:(x,z)=>chunk(x,z).root,root:group,pickables,sound:doorSound});
  // An in-place building's rooms (its own inside walls and doors, `edges`, local to its north-west tile, so
  // they move with it): its own, cut with it, painted with its paint.
  data.buildings.forEach((b,i)=>{const built=buildings[i];if(!built||!b.edges?.length||!want(chunkOf(b.x,b.z)))return;const {x0,z0}=built.plan;
   for(const e of b.edges){const a=t(x0+e.a[0],z0+e.a[1]),c=t(x0+e.b[0],z0+e.b[1]);if(!a||!c||edges.info(a,c)?.owners.length)continue;
    const f=addIn(chunk(b.x,b.z),a,c,e.kind,{owner:i,paint:wallPaint(b.paint,built.plan,a,c)});if(e.kind==='door')chunk(b.x,b.z).items.doors.push(f);}});
  // Railings along stair sides and terrace edges (map-terrain.js), unless an edge is already there.
  // A partial rebuild looks one tile past its chunks, for railings on their borders.
  const scope=only?[...tilesOf(only),...borderOf(only)]:tiles;
  const stairSides=new Map();
  for(const [high,low,stair] of railingEdges(scope,map)){const home=edgeChunk(high,low);if(!want(home)||edges.info(high,low)||high.indoor||low.indoor)continue;
   edges.add(high,low,'railing',{hidden:!!stair});if(stair){if(!stairSides.has(home))stairSides.set(home,[]);stairSides.get(home).push([high,low]);}}
  // Stair sides: sloped handrails, one merged mesh per chunk.
  for(const [c,list] of stairSides){const rails=mergedMesh(stairRailParts(list));rails.name='stair-rails';c.root.add(rails);}
  for(const p of notHeld(data.props)){if(!want(chunkOf(p.x,p.z)))continue;const home=chunk(p.x,p.z);
   try{const prop=createProp(p.kind,{origin:[p.x,p.z],rotation:p.rotation||0,tileAt:t,parent:home.root,pickables,id:p.id??null,loot:p.loot?{id:`${data.id}:${p.x},${p.z}`,items:p.loot}:null,shop:p.shop??null,colors:p.colors||null});if(p.link)prop.link={kind:'dungeon',builtMap,id:p.link};home.items.props.push(prop);}catch(error){console.warn(error.message);}}
  // Furniture (furnish.js): each in-place building furnished by its use, around hand-placed props, in a
  // group of its own that shows only while the building is cut (the roof hides it otherwise). Static
  // pieces merge into one mesh per building; interactive ones stay pickable.
  data.buildings.forEach((b,i)=>{if(!want(chunkOf(b.x,b.z))||!buildings[i])return;const home=chunk(b.x,b.z);const built=buildings[i],use=furnishingUse(b.desc);built.furniture=[];built.shop=use?shopForBuilding(b.desc,use):null;
   // Floors by hand (spaces.js; docs/CITY.md, Floors): an in-place building's ground floor shows its own
   // placed furniture and the stairwells to the floors above and below; nothing is furnished for it.
   const levels=built.plan.desc.interior==='inPlace'?floorLevels(b):null;
   if(levels){const byLevel=new Map(levels.map(f=>[f.level,f])),plan=built.plan,tl=([dx,dz])=>t(plan.x0+dx,plan.z0+dz),live=f=>({bottom:tl(f.bottom),top:tl(f.top),front:tl(f.front)});
    const group=new THREE.Group();group.name='furniture';group.userData.showWhenCut=true;group.visible=false;home.root.add(group);
    const well=(up,direction,level)=>{const place=live(flightOf(up));if(place.bottom?.building===i&&place.top?.building===i)built.stairwells.push(createStairwell({place,direction,link:{kind:'floor',builtMap,building:i,level,via:direction},parent:group,pickables,services:{enter:enterLink},tileAt:t}));};
    built.stairwells=[];if(byLevel.get(0)?.up&&byLevel.has(1))well(byLevel.get(0).up,'up',1);if(byLevel.get(-1)?.up)well(byLevel.get(-1).up,'down',-1);
    for(const f of notHeld(byLevel.get(0)?.furniture)){try{const prop=createProp(f.kind,{origin:[plan.x0+f.at[0],plan.z0+f.at[1]],rotation:f.rotation||0,tileAt:t,parent:group,pickables,shop:built.shop,colors:f.colors||null});prop.building=i;built.furniture.push(prop);home.items.furniture.push(prop);}catch{}}
    mergeStatic(group,built.furniture.filter(p=>!p.def.interaction).map(p=>p.group),{name:'furniture-merged'});home.edges.addCutPart(group,i);return;}
   if(!use||b.desc.interior!=='inPlace')return;
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
  if(data.crystal&&!isHeld(data.crystal)&&want(chunkOf(...data.crystal))){const tile=t(...data.crystal);if(tile){const parent=chunk(tile.x,tile.z).root;crystalChunk=chunkOf(tile.x,tile.z);
   if(placeCrystal)crystal=placeCrystal(tile,parent);else{crystal=makeCrystal();crystal.position.set(tile.x-6,tile.h,tile.z-6);parent.add(crystal);tile.blocked=true;}}}
  // Always-visible decoration merged per chunk (static-merge.js): building decor (awnings, sign boards,
  // flower boxes) and props nobody clicks. Clickable props, doors, sign icons, roofs and caps stay apart.
  for(const c of chunks.values()){if(!want(c))continue;
   const objects=[...c.items.buildings.map(i=>buildings[i].decor),...c.items.props.filter(p=>!p.def.interaction&&!p.def.spin&&!p.def.deck).map(p=>p.group)];
   if(objects.length)mergeStatic(c.root,objects,{name:'chunk-statics'});}
  // A building's floor tiles belong to its home chunk too.
  for(const tile of only?tilesOf(only):tiles){const c=tile.building!==undefined&&data.buildings[tile.building]?chunk(data.buildings[tile.building].x,data.buildings[tile.building].z):chunk(tile.x,tile.z);if(want(c))c.tiles.push(tile);}
  const terrainMap=outside?{get:k=>map.get(k)??outside(...k.split(',').map(Number))}:map;
  for(const c of chunks.values()){if(!want(c))continue;const dry=c.tiles.filter(tile=>ground?tile.stair:!tile.water);if(dry.length)createTerrainBatch({tiles:dry,map:terrainMap,factory:tile=>makeMapTile(tile,terrainMap,{style:'stone'}),parent:c.root,pickables,roughness:.95,batchSize:CHUNK});c.edges.bake();}
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
  populated.delete(id);const c=chunks.get(id);if(!c)return;
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
 // Lazy: the chunks whose content is built, those waiting (nearest first), and those always built.
 const populated=new Set(),queue=[],pinned=new Set();
 if(lazy){const pin=(x,z)=>{if(x>=0&&z>=0&&x<data.size[0]&&z<data.size[1])pinned.add(chunkOf(x,z));};pin(...data.spawn);if(data.crystal)pin(...data.crystal);
  for(const f of data.townsfolk||[]){if(f.home)pin(...f.home);const b=Number.isInteger(f.house)?data.buildings[f.house]:null;if(b)pin(b.x,b.z);}
  populate(new Set(pinned));}
 else populate();
 // Builds waiting chunks' content for up to `budget` ms (at least one chunk).
 function pump(budget=4){if(!queue.length)return 0;const start=performance.now();let n=0;
  while(queue.length&&(n===0||performance.now()-start<budget)){const id=queue.shift();if(populated.has(id))continue;populate(new Set([id]));n++;}
  if(n){if(!roofsShown)for(const r of roofs){r.userData.hiddenByMap=true;r.visible=false;}builtMap.onStream?.(chunks);}return n;}
 // A map on the land is the world: its edge is the world's edge, where the mist wall stands (mist-wall.js).
 const mist=data.land?createMistWall({x0:0,z0:0,x1:data.size[0]-1,z1:data.size[1]-1,parent:group}):null;
 const broken=edges.doorProblems();if(broken.length)console.warn('Door rule: '+broken.map(r=>`${r.door.a.x},${r.door.a.z}: ${r.problems.join('; ')}`).join(' | '));
 // defineProperties, not Object.assign: assign would copy the getters as fixed values.
 return Object.defineProperties(builtMap,Object.getOwnPropertyDescriptors({group,tiles:map,doors,edges,roofs,buildings,props,furniture,chunks,walls,spawn:t(...data.spawn)||tiles[0],mist,
  get crystal(){return crystal;},get ground(){return ground;},
  get roofsShown(){return roofsShown;},setRoofs(on){roofsShown=!!on;for(const r of roofs){r.userData.hiddenByMap=!roofsShown;r.visible=roofsShown;}},
  // Rebuilds only the given chunks from the (edited) data, leaving the rest of the city as it is: the
  // world editor's fast path (docs/TOWN.md, Authoring tools). `dirty`: chunk ids an edit touched; pass
  // the chunks of every tile it changed, before and after, one tile out. Anything spanning chunks
  // (props, stairs) pulls its other chunks in, and so does any chunk whose ground changed. Returns the
  // chunk ids it rebuilt (a Set), or false, leaving the city untouched, when only a full build will do: the city has walls (they span every edge
  // chunk) and an edit touches one of their chunks. wrap(only, run): runs the rebuild itself (run()), so
  // the land streamed under a town can step aside for it (chunk-streamer.js reload).
  rebuild(dirty,{wrap=null}={}){
   const only=new Set(dirty);
   // Buildings whose place in the list changed (added, or after a removed one: their ids shifted, and
   // ids mark their tiles and walls) rebuild in their chunks, where they were and where they are.
   for(let i=0;i<Math.max(buildings.length,data.buildings.length);i++){const old=buildings[i],now=data.buildings[i];if(old?.data===now)continue;
    if(old)only.add(chunkOf(old.plan.x0,old.plan.z0));if(now)only.add(chunkOf(now.x,now.z));}
   // Buildings sharing a wall across a chunk line: the wall lives in one of their chunks, but both
   // buildings shape it, so they rebuild together.
   const homeOf=i=>data.buildings[i]?chunkOf(data.buildings[i].x,data.buildings[i].z):null,shared=[];
   for(const tile of tiles)if(tile.building!==undefined)for(const [dx,dz] of [[1,0],[0,1]]){const n=map.get(key(tile.x+dx,tile.z+dz));
    if(n?.building!==undefined&&n.building!==tile.building&&homeOf(n.building)!==homeOf(tile.building))shared.push([homeOf(tile.building),homeOf(n.building)].filter(Boolean));}
   const spans=[...shared,...data.props.map(p=>spanChunks(propCells(p))),...data.stairs.map(s=>spanChunks(stairCells(s))),...[...chunks.values()].flatMap(c=>c.items.props.map(p=>spanChunks((p.tiles||[p.tile]).map(tile=>tile&&[tile.x,tile.z]))))];
   const spread=()=>{for(let grew=true;grew;){grew=false;for(const ids of spans)if(ids.some(id=>only.has(id)))for(const id of ids)if(!only.has(id)){only.add(id);grew=true;}}};
   spread();
   // The ground as the data now has it. A town on the land re-levels its pads, so an edit can move
   // ground well past the tiles it touched: the chunks around any pad that moved or changed level are
   // checked too, and those whose ground changed rebuild. Only these chunks' ground is worked out.
   const check=new Set();
   if(ground){const before=ground.pads,padKey=p=>p&&`${p.level}|${p.cells.join(';')}`;ground=mapGround(data,onLand);
    for(let i=0;i<Math.max(before.length,ground.pads.length);i++){if(padKey(before[i])===padKey(ground.pads[i]))continue;
     for(const p of [before[i],ground.pads[i]].filter(Boolean))for(let cz=Math.floor((p.z0-PAD_REACH)/CHUNK);cz<=Math.floor((p.z1+PAD_REACH)/CHUNK);cz++)for(let cx=Math.floor((p.x0-PAD_REACH)/CHUNK);cx<=Math.floor((p.x1+PAD_REACH)/CHUNK);cx++)if(chunks.has(`${cx},${cz}`))check.add(`${cx},${cz}`);}}
   const shape=tile=>tile&&`${tile.h}|${tile.surface}|${!!tile.water}|${tile.stair?.dir||''}|${tile.palette?.[0]||''}`;
   const fresh=mapTiles(data,ground,[...new Set([...only,...check])],map);
   for(const tile of tilesOf([...check].filter(id=>!only.has(id)))){if(shape(fresh.get(key(tile.x,tile.z)))!==shape(groundOf.get(tile)))only.add(chunkOf(tile.x,tile.z));}
   // Chunks pulled in by what spans them get their fresh ground too.
   spread();
   for(const [k,v] of mapTiles(data,ground,[...only].filter(id=>!fresh.has(firstTileOf(id))),map))fresh.set(k,v);
   if(walls&&tilesOf(only).some(tile=>tile.cityWall))return false;
   const run=()=>{
   for(const id of only)clearChunk(id);buildings.length=data.buildings.length;
   // Fresh terrain for their tiles, the same objects refilled (edges on their borders that other chunks
   // own are kept: they live in those chunks' edge features).
   for(const tile of tilesOf(only)){const next=fresh.get(key(tile.x,tile.z));if(!next)continue;
    for(const k of [...GROUND_KEYS,'stair','indoor','building','prop','blocksSight','reachOver','cityWall'])delete tile[k];
    Object.assign(tile,next,{x:tile.x,z:tile.z});groundOf.set(tile,{...next});}
   populate(only);};
   if(wrap)wrap(only,run);else run();
   builtMap.spawn=t(...data.spawn)||tiles[0];
   return only;
  },
  // Shows only the chunks within `radius` chunks of the tile (render streaming; tiles stay resident).
  // Lazy: queues the content of the chunks within the radius (nearest first) and builds some each call.
  stream(tile,radius=streamRadius){if(!tile||radius===null)return;if(lazy)pump();const at=`${tile.x},${tile.z}`;if(at===streamTile)return;const first=streamCenter===null;streamTile=at;const id=chunkOf(tile.x,tile.z);streamCenter=id;const [cx,cz]=id.split(',').map(Number);
   if(lazy){queue.length=0;const [W,D]=data.size,near=[];for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){const x=cx+dx,z=cz+dz;if(x<0||z<0||x*CHUNK>=W||z*CHUNK>=D)continue;const c=`${x},${z}`;if(!populated.has(c))near.push([Math.max(Math.abs(dx),Math.abs(dz)),Math.abs(dx)+Math.abs(dz),c]);}
    near.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);queue.push(...near.map(n=>n[2]));pump();}
   const shown=new Set();
   // The first time, only the radius (a fresh city starts with everything shown).
   for(const c of chunks.values()){const d=Math.max(Math.abs(c.cx-cx),Math.abs(c.cz-cz));if(d<=radius||!first&&c.root.visible&&chunkGap(c.cx,c.cz,tile.x,tile.z)<=radius*CHUNK+streamBand)shown.add(c);}
   if([...chunks.values()].every(c=>c.root.visible===shown.has(c)))return;
   for(const c of chunks.values())c.root.visible=shown.has(c);
   // Things kept outside the chunk groups (instanced ground cover) follow the shown chunks.
   builtMap.onStream?.(chunks);},
  // Is this tile's chunk shown? (true when the city doesn't stream). Things kept outside the chunk
  // groups (townsfolk, sentries) hide with it.
  // Tiles outside the city (gate guards on the land around it) count as shown.
  isShown:(x,z)=>{const c=chunks.get(chunkOf(x,z));return streamCenter===null||!c||c.root.visible;},
  // The streaming radius (chunks; a draw distance change): the next stream() call applies it.
  get streamRadius(){return streamRadius;},set streamRadius(value){streamRadius=value;streamTile=null;},
  get shownChunks(){return [...chunks.values()].filter(c=>c.root.visible).length;},
  // Lazy maps: content built, waiting, and tiles made so far (the playground and perf report them).
  // Every tile made so far, without making more (a lazy map's checks); the tiles themselves otherwise.
  get loadedTiles(){return lazy?map.loaded():map;},
  get content(){return {lazy,built:lazy?populated.size:chunks.size,queued:queue.length,pinned:pinned.size,tiles:map.size};},
  // Builds every waiting chunk now (tests; a save that needs the whole map).
  settle(){while(queue.length)pump(1e9);},
  dispose(){mist?.dispose();walls?.dispose();edges.dispose();for(const p of props)p.dispose();const owned=new Set();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)owned.add(o.geometry);});for(const g of owned)g.dispose();
   for(const m of [...pickables])if(isUnder(m,group))pickables.splice(pickables.indexOf(m),1);group.removeFromParent();}}));
}
// How far a building pad's ease can reach past it (tiles; town-ground.js), for partial rebuilds.
const PAD_REACH=16;
// A chunk's first tile key (to tell whether a partial ground covers it).
const firstTileOf=id=>{const [cx,cz]=id.split(',').map(Number);return key(Math.max(0,cx*CHUNK),Math.max(0,cz*CHUNK));};
// A lazy map's tiles (buildMap lazy): get and has make the chunk a key falls in (inside the map) the first
// time it's asked for, with fill(id); iterating sees only the chunks made so far. peek and put skip that.
function chunkTiles([W,D],fill){
 const filled=new Set();
 class Tiles extends Map{
  get(k){const v=super.get(k);if(v!==undefined)return v;const i=k.indexOf(','),x=+k.slice(0,i),z=+k.slice(i+1);if(!(x>=0&&z>=0&&x<W&&z<D))return undefined;
   const id=chunkId(x,z);if(filled.has(id))return undefined;filled.add(id);fill(id);return super.get(k);}
  has(k){return this.get(k)!==undefined;}
  peek(k){return super.get(k);}
  put(k,v){return super.set(k,v);}
  // The tiles made so far, read-only and without making more (the map checks: a flood fill from the spawn
  // would otherwise make the whole map).
  loaded(){const self=this,size=Object.getOwnPropertyDescriptor(Map.prototype,'size').get;
   return {get:k=>self.peek(k),has:k=>self.peek(k)!==undefined,get size(){return size.call(self);},values:()=>Map.prototype.values.call(self),keys:()=>Map.prototype.keys.call(self),entries:()=>Map.prototype.entries.call(self),
    forEach:fn=>Map.prototype.forEach.call(self,fn),[Symbol.iterator]:()=>Map.prototype.entries.call(self)};}
 }
 return new Tiles();
}
// What a tile's ground sets (cleared before a rebuild refills a tile).
const GROUND_KEYS=['h','surface','blocked','water','buildable','palette','biome','shore','rocky','made','still','waterKind'];
const isUnder=(o,root)=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
