import * as THREE from 'three';
import {createTerrainBatch} from './terrain-batch.js';
import {createEdgeFeatures} from './doors.js';
import {createBuilding} from './building-kit.js';
import {createProp} from './props.js';
import {makeCityTile,layStairs,railingEdges,stairRailParts,SURFACE_NAMES} from './city-terrain.js';
import {mergedMesh} from './merged-model.js';
import {mergeStatic} from './static-merge.js';
import {shopForBuilding} from './shops.js';
import {buildCityWalls,wallPlan} from './city-walls.js';
import {doorSound} from './doors.js';
import {furnishRoom,roomOfPlan,furnishingUse} from './furnish.js';
import {makeCrystal} from './crystal-model.js';
import {key} from './world.js';

// Cities as data (docs/CITY.md, Authoring and Streaming; city Phases 5, 6 and 9). A city is a plain
// object the editor edits and the repo stores, built by the shared builders:
//   {id, name, size:[w, d], style, spawn:[x, z], crystal:[x, z],
//    regions: {'rx,rz': {heights:[64 strings], surfaces:[64 strings]}},   // terrain, 64 × 64 per region
//    stairs:[{x, z, dir, length, width}], buildings:[{x, z, desc}], props:[{kind, x, z, rotation}],
//    edges:[{a:[x, z], b:[x, z], kind}], townsfolk:[…], interiors:{…}}
// Terrain is stored per tile in 64 × 64 regions (docs/DESIGN.md streaming notes): heights in half
// blocks as one character each ('0' + 2h), surfaces as one letter each.
export const REGION=64;
const SURFACE_CODES={grass:'g',dirt:'d',cobble:'c',flagstone:'f',plaza:'p',stone:'s',floor:'o',planks:'k',dungeon:'u'};
const SURFACE_FROM=Object.fromEntries(Object.entries(SURFACE_CODES).map(([k,v])=>[v,k]));
const heightChar=h=>String.fromCharCode(48+Math.round(h*2)),charHeight=c=>(c.charCodeAt(0)-48)/2;

export function createCityData({id='city',name='City',size=[64,64],base=1,surface='grass',style='timber'}={}){
 const data={id,name,size:[...size],style,spawn:[Math.floor(size[0]/2),Math.floor(size[1]/2)],crystal:null,regions:{},stairs:[],buildings:[],props:[],edges:[],townsfolk:[],interiors:{}};
 for(let rz=0;rz*REGION<size[1];rz++)for(let rx=0;rx*REGION<size[0];rx++)
  data.regions[`${rx},${rz}`]={heights:Array.from({length:REGION},()=>heightChar(base).repeat(REGION)),surfaces:Array.from({length:REGION},()=>SURFACE_CODES[surface].repeat(REGION))};
 return data;
}
const regionOf=(data,x,z)=>data.regions[`${Math.floor(x/REGION)},${Math.floor(z/REGION)}`];
const inside=(data,x,z)=>x>=0&&z>=0&&x<data.size[0]&&z<data.size[1];
export function cityHeight(data,x,z){if(!inside(data,x,z))return null;const r=regionOf(data,x,z);return charHeight(r.heights[z%REGION][x%REGION]);}
export function citySurface(data,x,z){if(!inside(data,x,z))return null;const r=regionOf(data,x,z);return SURFACE_FROM[r.surfaces[z%REGION][x%REGION]]||'grass';}
const setChar=(rows,x,z,c)=>{const row=rows[z%REGION];rows[z%REGION]=row.slice(0,x%REGION)+c+row.slice(x%REGION+1);};
export function setCityHeight(data,x,z,h){if(inside(data,x,z))setChar(regionOf(data,x,z).heights,x,z,heightChar(Math.max(0,Math.min(19,h))));}
export function setCitySurface(data,x,z,surface){if(inside(data,x,z)&&SURFACE_CODES[surface])setChar(regionOf(data,x,z).surfaces,x,z,SURFACE_CODES[surface]);}
export function fillCity(data,{x0,z0,x1,z1},{h,surface}){for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){if(h!==undefined)setCityHeight(data,x,z,h);if(surface)setCitySurface(data,x,z,surface);}}
export {SURFACE_NAMES};

// The live tiles of a city (no models): terrain, then stairs (which set their own heights).
export function cityTiles(data){
 const map=new Map();
 for(let z=0;z<data.size[1];z++)for(let x=0;x<data.size[0];x++)map.set(key(x,z),{x,z,h:cityHeight(data,x,z),surface:citySurface(data,x,z),blocked:false,water:false,buildable:true});
 for(const s of data.stairs){const [dx,dz]={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]}[s.dir],behind=map.get(key(s.x-dx,s.z-dz));
  layStairs(map,{...s,base:s.base??behind?.h??1});}
 return map;
}

// Builds a city into the scene with the production builders. Returns its tiles, doors, buildings,
// props, edge features, roofs and spawn, and dispose(). Building ids are their index in data.buildings.
// Everything is built per chunk (CHUNK tiles square, the streamer's size): terrain, walls (one baked
// mesh per chunk), buildings and props go into their chunk's group, so the renderer culls by chunk and
// stream(tile) shows only the chunks around the player (docs/CITY.md, Streaming and the world). An edge
// belongs to the chunk of its lower tile, so two buildings in different chunks still share one wall.
export const CHUNK=16;
// crystal(tile, parent): places the game's Iter Crystal (crystals.js) instead of a plain model.
// outside(x, z): the land around the city (countryside.js), so its edge tiles join it without a lip.
export function buildCity(data,{scene,pickables=[],visible=false,streamRadius=null,crystal:placeCrystal=null,outside=null}){
 const group=new THREE.Group();group.name='city '+data.id;group.visible=visible;scene.add(group);
 const map=cityTiles(data),t=(x,z)=>map.get(key(x,z)),tiles=[...map.values()];
 // Townsfolk posted just outside the city (gate guards) stand on the land around it: those tiles join
 // the city's map (not its terrain, which the land draws) so they have somewhere to stand.
 if(outside)for(const f of data.townsfolk||[])if(f.home&&!map.has(key(...f.home))){const o=outside(...f.home);if(o)map.set(key(...f.home),o);}
 const chunks=new Map(),chunkOf=(x,z)=>`${Math.floor(x/CHUNK)},${Math.floor(z/CHUNK)}`;
 function chunk(x,z){const id=chunkOf(x,z);if(!chunks.has(id)){const root=new THREE.Group();root.name='chunk '+id;group.add(root);const [cx,cz]=id.split(',').map(Number);
  chunks.set(id,{id,cx,cz,root,tiles:[],edges:createEdgeFeatures({parent:root,pickables,tileAt:t,style:data.style})});}return chunks.get(id);}
 const edgeChunk=(a,b)=>{const [p]=[a,b].sort((m,n)=>m.z-n.z||m.x-n.x);return chunk(p.x,p.z);};
 // One edges interface over every chunk's edge features (buildings and checks see a single city).
 const edges={
  add:(a,b,kind,options)=>edgeChunk(a,b).edges.add(a,b,kind,options),remove:(a,b)=>edgeChunk(a,b).edges.remove(a,b),info:(a,b)=>edgeChunk(a,b).edges.info(a,b),
  doorProblems:()=>[...chunks.values()].flatMap(c=>c.edges.doorProblems()),get count(){return [...chunks.values()].reduce((n,c)=>n+c.edges.count,0);},
  get buildingBoxes(){const all=new Map();for(const c of chunks.values())for(const [id,b] of c.edges.buildingBoxes){const o=all.get(id);all.set(id,o?{x0:Math.min(o.x0,b.x0),z0:Math.min(o.z0,b.z0),x1:Math.max(o.x1,b.x1),z1:Math.max(o.z1,b.z1),base:Math.min(o.base,b.base),top:Math.max(o.top,b.top)}:{...b});}return all;},
  dispose(){for(const c of chunks.values())c.edges.dispose();},
 };
 const doors=[],roofs=[],buildings=[],props=[];
 // The city object exists from the start, so links (separate interiors, dungeons) can point at it.
 const city={data,areaId:null};
 data.buildings.forEach((b,i)=>{
  const home=chunk(b.x,b.z),local={...edges,addCutPart:(o,owner,opt)=>home.edges.addCutPart(o,owner,opt),removeCutPart:o=>home.edges.removeCutPart(o)};
  const built=createBuilding(b.desc,{origin:[b.x,b.z],id:i,edges:local,tileAt:t,parent:home.root});built.data=b;buildings.push(built);
  if(b.desc.interior==='separate')built.doors.forEach((door,j)=>{door.link={kind:'interior',city,building:i,door:j};});
  for(const p of built.plan.tiles){const tile=t(...p);if(tile&&!['planks','stone'].includes(tile.surface))tile.surface='floor';}doors.push(...built.doors);roofs.push(built.roof);});
 // Hand-placed edges never replace a building's own walls (a curtain wall flush with a tower).
 for(const e of data.edges){const a=t(...e.a),b=t(...e.b);if(a&&b&&!(edges.info(a,b)?.owners.length)){const f=edges.add(a,b,e.kind,e.options||{});if(e.kind==='door')doors.push(f);}}
 // City walls (city-walls.js): a curtain wall with corner towers and gatehouses, solid tiles and its own
 // cut pieces; the city's `gates` are its gateways.
 const walls=data.walls?buildCityWalls({plan:wallPlan({size:data.size[0],gates:data.gates||[],thickness:data.walls.thickness}),tileAt:t,chunkRoot:(x,z)=>chunk(x,z).root,root:group,pickables,sound:doorSound}):null;
 // Railings along stair sides and terrace edges (city-terrain.js), unless an edge is already there.
 const stairSides=new Map();
 for(const [high,low,stair] of railingEdges(tiles,map))if(!edges.info(high,low)&&!high.indoor&&!low.indoor){edges.add(high,low,'railing',{hidden:!!stair});
  if(stair){const c=chunk(high.x,high.z);if(!stairSides.has(c))stairSides.set(c,[]);stairSides.get(c).push([high,low]);}}
 // Stair sides: sloped handrails, one merged mesh per chunk.
 for(const [c,list] of stairSides){const rails=mergedMesh(stairRailParts(list));rails.name='stair-rails';c.root.add(rails);}
 for(const p of data.props){try{const prop=createProp(p.kind,{origin:[p.x,p.z],rotation:p.rotation||0,tileAt:t,parent:chunk(p.x,p.z).root,pickables,id:p.id??null,loot:p.loot?{id:`${data.id}:${p.x},${p.z}`,items:p.loot}:null,shop:p.shop??null});if(p.link)prop.link={kind:'dungeon',city,id:p.link};props.push(prop);}catch(error){console.warn(error.message);}}
 // Furniture (furnish.js): each in-place building furnished by its use, around hand-placed props, in a
 // group of its own that shows only while the building is cut (the roof hides it otherwise). Static
 // pieces merge into one mesh per building; interactive ones stay pickable.
 const furniture=[];
 data.buildings.forEach((b,i)=>{const built=buildings[i],use=furnishingUse(b.desc);built.furniture=[];built.shop=use?shopForBuilding(b.desc,use):null;if(!use||b.desc.interior!=='inPlace')return;
  const keep=built.plan.tiles.filter(([x,z])=>t(x,z)?.blocked);
  const layout=furnishRoom(roomOfPlan(built.plan,{keep}),use,b.desc.furnishSeed??b.desc.seed??i);if(!layout.length)return;
  if(layout.keeper)built.anchors.keeper=t(...layout.keeper);
  const home=chunk(b.x,b.z),group=new THREE.Group();group.name='furniture';group.userData.showWhenCut=true;group.visible=false;home.root.add(group);
  for(const f of layout){try{const prop=createProp(f.kind,{origin:[f.x,f.z],rotation:f.rotation,tileAt:t,parent:group,pickables,shop:built.shop});prop.building=i;built.furniture.push(prop);furniture.push(prop);}catch{}}
  mergeStatic(group,built.furniture.filter(p=>!p.def.interaction).map(p=>p.group),{name:'furniture-merged'});
  home.edges.addCutPart(group,i);
  // Furniture never moves: its matrices are worked out once and the frame's matrix pass skips it
  // (an opening chest refreshes its own, props.js).
  group.updateWorldMatrix(true,true);group.matrixWorldAutoUpdate=false;for(const p of built.furniture)p.frozen=true;
 });
 let crystal=null;
 // The Iter Crystal: a model, or (with `crystal`) the game's travel crystal (crystals.js).
 if(data.crystal){const tile=t(...data.crystal);if(tile){const parent=chunk(tile.x,tile.z).root;
  if(placeCrystal)crystal=placeCrystal(tile,parent);else{crystal=makeCrystal();crystal.position.set(tile.x-6,tile.h,tile.z-6);parent.add(crystal);tile.blocked=true;}}}
 // Always-visible decoration merged per chunk (static-merge.js): building decor (awnings, sign boards,
 // flower boxes) and props nobody clicks. Clickable props, doors, sign icons, roofs and caps stay apart.
 const statics=new Map(),addStatic=(c,o)=>{if(!statics.has(c))statics.set(c,[]);statics.get(c).push(o);};
 data.buildings.forEach((b,i)=>{if(buildings[i])addStatic(chunk(b.x,b.z),buildings[i].decor);});
 for(const p of props)if(!p.def.interaction)addStatic(chunk(p.tile.x,p.tile.z),p.group);
 for(const [c,objects] of statics)mergeStatic(c.root,objects,{name:'chunk-statics'});
 for(const tile of tiles)chunk(tile.x,tile.z).tiles.push(tile);
 const terrainMap=outside?{get:k=>map.get(k)??outside(...k.split(',').map(Number))}:map;
 for(const c of chunks.values()){if(c.tiles.length)createTerrainBatch({tiles:c.tiles,map:terrainMap,factory:tile=>makeCityTile(tile,terrainMap,{style:'stone'}),parent:c.root,pickables,roughness:.95,batchSize:CHUNK});c.edges.bake();}
 const broken=edges.doorProblems();if(broken.length)console.warn('Door rule: '+broken.map(r=>`${r.door.a.x},${r.door.a.z}: ${r.problems.join('; ')}`).join(' | '));
 let roofsShown=true,streamCenter=null;
 // defineProperties, not Object.assign: assign would copy the getters as fixed values.
 return Object.defineProperties(city,Object.getOwnPropertyDescriptors({group,tiles:map,doors,edges,roofs,buildings,props,furniture,crystal,chunks,walls,spawn:t(...data.spawn)||tiles[0],
  get roofsShown(){return roofsShown;},setRoofs(on){roofsShown=!!on;for(const r of roofs){r.userData.hiddenByMap=!roofsShown;r.visible=roofsShown;}},
  // Shows only the chunks within `radius` chunks of the tile (render streaming; tiles stay resident).
  stream(tile,radius=streamRadius){if(!tile||radius===null)return;const id=chunkOf(tile.x,tile.z);if(id===streamCenter)return;streamCenter=id;const [cx,cz]=id.split(',').map(Number);
   for(const c of chunks.values())c.root.visible=Math.max(Math.abs(c.cx-cx),Math.abs(c.cz-cz))<=radius;},
  get shownChunks(){return [...chunks.values()].filter(c=>c.root.visible).length;},
  dispose(){walls?.dispose();edges.dispose();for(const p of props)p.dispose();const owned=new Set();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)owned.add(o.geometry);});for(const g of owned)g.dispose();
   for(const m of [...pickables])if(isUnder(m,group))pickables.splice(pickables.indexOf(m),1);group.removeFromParent();}}));
}
const isUnder=(o,root)=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
