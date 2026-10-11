import * as THREE from 'three';
import {createTerrainBatch} from './terrain-batch.js';
import {createEdgeFeatures} from './doors.js';
import {createBuilding} from './building-kit.js';
import {createProp} from './props.js';
import {makeCityTile,layStairs,railingEdges,SURFACE_NAMES} from './city-terrain.js';
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
const SURFACE_CODES={grass:'g',dirt:'d',cobble:'c',flagstone:'f',plaza:'p',stone:'s',floor:'o',planks:'k'};
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
export function buildCity(data,{scene,pickables=[],visible=false,streamRadius=null}){
 const group=new THREE.Group();group.name='city '+data.id;group.visible=visible;scene.add(group);
 const map=cityTiles(data),t=(x,z)=>map.get(key(x,z)),tiles=[...map.values()];
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
 // Railings along stair sides and terrace edges (city-terrain.js), unless an edge is already there.
 for(const [high,low] of railingEdges(tiles,map))if(!edges.info(high,low)&&!high.indoor&&!low.indoor)edges.add(high,low,'railing');
 for(const p of data.props){try{const prop=createProp(p.kind,{origin:[p.x,p.z],rotation:p.rotation||0,tileAt:t,parent:chunk(p.x,p.z).root,pickables,id:p.id??null});if(p.link)prop.link={kind:'dungeon',city,id:p.link};props.push(prop);}catch(error){console.warn(error.message);}}
 let crystal=null;
 if(data.crystal){const tile=t(...data.crystal);if(tile){crystal=makeCrystal();crystal.position.set(tile.x-6,tile.h,tile.z-6);chunk(tile.x,tile.z).root.add(crystal);tile.blocked=true;}}
 for(const tile of tiles)chunk(tile.x,tile.z).tiles.push(tile);
 for(const c of chunks.values()){if(c.tiles.length)createTerrainBatch({tiles:c.tiles,map,factory:tile=>makeCityTile(tile,map,{style:'stone'}),parent:c.root,pickables,roughness:.95,batchSize:CHUNK});c.edges.bake();}
 const broken=edges.doorProblems();if(broken.length)console.warn('Door rule: '+broken.map(r=>`${r.door.a.x},${r.door.a.z}: ${r.problems.join('; ')}`).join(' | '));
 let roofsShown=true,streamCenter=null;
 // defineProperties, not Object.assign: assign would copy the getters as fixed values.
 return Object.defineProperties(city,Object.getOwnPropertyDescriptors({group,tiles:map,doors,edges,roofs,buildings,props,crystal,chunks,spawn:t(...data.spawn)||tiles[0],
  get roofsShown(){return roofsShown;},setRoofs(on){roofsShown=!!on;for(const r of roofs){r.userData.hiddenByMap=!roofsShown;r.visible=roofsShown;}},
  // Shows only the chunks within `radius` chunks of the tile (render streaming; tiles stay resident).
  stream(tile,radius=streamRadius){if(!tile||radius===null)return;const id=chunkOf(tile.x,tile.z);if(id===streamCenter)return;streamCenter=id;const [cx,cz]=id.split(',').map(Number);
   for(const c of chunks.values())c.root.visible=Math.max(Math.abs(c.cx-cx),Math.abs(c.cz-cz))<=radius;},
  get shownChunks(){return [...chunks.values()].filter(c=>c.root.visible).length;},
  dispose(){edges.dispose();for(const p of props)p.dispose();const owned=new Set();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)owned.add(o.geometry);});for(const g of owned)g.dispose();
   for(const m of [...pickables])if(isUnder(m,group))pickables.splice(pickables.indexOf(m),1);group.removeFromParent();}}));
}
const isUnder=(o,root)=>{for(let p=o;p;p=p.parent)if(p===root)return true;return false;};
