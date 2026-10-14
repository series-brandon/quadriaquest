import {createBiomeLand} from './biome-land.js';
import {normalizeBuilding} from './building-kit.js';
import * as THREE from 'three';
import {key} from './world.js';
import {surfaceColor} from './city-terrain.js';
import {hash} from './noise.js';

// Towns built on the world's land (docs/TOWN.md, The town on the land). A town with `land` has no ground
// of its own: every tile starts as the generated biome land (biome-land.js), the same heights, colours
// and water as the land around it, and the town layer only adds what people made:
//  - pads: each building levels its footprint and a one-tile apron to one height (the land's average
//    under it, to the half block), and the land around eases back to its own height by half a block a
//    tile, so a building sits on a cut into a slope or a low platform, never on a cliff;
//  - offsets: hand edits to height are deltas on that ground (raise, lower and flatten in the editor),
//    stored per tile in the town's regions;
//  - surfaces: painted tiles (roads, paths, planks) replace the land's own ground; unpainted tiles show
//    the biome's ground and colours.
// Water stays where nothing is made on it; a made tile over water (a road across a pond) is dry ground.
// Made tiles (painted, offset, pads, props, the crystal) grow no trees, cover or enemies (townSource).
// createTownGround(data, land?) → {land, inside(x, z), tile(x, z), base(x, z), made(x, z), pads}
//   tile(x, z): the town's ground there (a fresh tile, for the city to build on; null past the map's edge)
export const PAD_APRON=1;
// data.land.origin [ox, oz]: where the map's 0, 0 lies in the land (world tiles); cells are painted in
// the land's own cells. A map that grows west or north moves its origin, so the land stays put under
// what was built (growMap, city-map.js).
// The land covers the map exactly (user, 2026-10-14: no unusable land; everything you see can be edited
// and reached). The map's edge is the world's edge.
export function townLand(data){
 const {seed=1,default:fallback='meadow',cells={},origin:[ox,oz]=[0,0]}=data.land,[w,d]=data.size;
 const land=createBiomeLand({seed,bounds:[ox,oz,ox+w,oz+d],map:{default:fallback,cells}});
 return ox||oz?shiftLand(land,ox,oz):land;
}
// The land seen from a map whose 0, 0 lies at ox, oz: tiles, entities (their ids too), extras and cover
// in the map's own tiles.
const ID_AT=/(-?\d+),(-?\d+)$/;
function shiftLand(land,ox,oz){
 const tiles=new Map(),world=t=>land.tile(t.x+ox,t.z+oz),back=e=>({...e,x:e.x-ox,z:e.z-oz,...e.id?{id:e.id.replace(ID_AT,(m,x,z)=>`${+x-ox},${+z-oz}`)}:{}});
 return {...land,
  tile(x,z){const k=key(x,z);if(tiles.has(k))return tiles.get(k);const t=land.tile(x+ox,z+oz),out=t&&{...t,x,z};tiles.set(k,out);return out;},
  entities:list=>land.entities(list.map(world).filter(Boolean)).map(back),extras:list=>land.extras(list.map(world).filter(Boolean)).map(back),cover:list=>land.cover(list.map(world).filter(Boolean)).map(back),
  useCells:next=>land.useCells(next),
  forget(x0,z0,x1,z1){land.forget(x0+ox,z0+oz,x1+ox,z1+oz);for(const k of [...tiles.keys()]){const [x,z]=k.split(',').map(Number);if(x>=x0&&x<=x1&&z>=z0&&z<=z1)tiles.delete(k);}},
  biomeAt:(x,z)=>land.biomeAt(x+ox,z+oz),heightAt:(x,z)=>land.heightAt(x+ox,z+oz),describe:(x,z)=>land.describe(x+ox,z+oz).replace(/^-?\d+,-?\d+/,`${x},${z}`)};
}
// The tiles a building stands on, without the door rule's checks (a pad needs only the footprint).
export function footprintCells(b){
 const desc=normalizeBuilding(b.desc);
 if(desc.cells)return desc.cells.map(([x,z])=>[b.x+x,b.z+z]);
 const [w,d]=desc.footprint,out=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)out.push([b.x+x,b.z+z]);return out;
}
const half=h=>Math.round(h*2)/2;
export function createTownGround(data,land=townLand(data),{offset=()=>0,surface=()=>null,extraMade=[]}={}){
 const [w,d]=data.size,inside=(x,z)=>x>=0&&z>=0&&x<w&&z<d;
 // Pads, in building order: the level (average land height under the footprint, never below the
 // ground level of 1) and the cells, with a box for quick lookups.
 const pads=[];
 for(const b of data.buildings){let cells;try{cells=footprintCells(b);}catch{continue;}
  const heights=cells.map(([x,z])=>land.tile(x,z)).filter(Boolean).map(t=>t.water?1:t.h);
  const level=Math.max(1,half(heights.reduce((n,h)=>n+h,0)/Math.max(1,heights.length)));
  const set=new Set(cells.map(c=>key(...c))),xs=cells.map(c=>c[0]),zs=cells.map(c=>c[1]);
  pads.push({level,cells,set,x0:Math.min(...xs),z0:Math.min(...zs),x1:Math.max(...xs),z1:Math.max(...zs)});}
 // Tiles from a pad's footprint (Chebyshev; 0 on it). Within the apron the ground is the pad's level.
 const padDistance=(p,x,z)=>{if(x<p.x0-40||x>p.x1+40||z<p.z0-40||z>p.z1+40)return Infinity;if(p.set.has(key(x,z)))return 0;
  let best=Infinity;for(const [a,b] of p.cells){const n=Math.max(Math.abs(a-x),Math.abs(b-z));if(n<best)best=n;}return best;};
 const onPad=(x,z)=>pads.some(p=>padDistance(p,x,z)<=PAD_APRON);
 // Ground height with the pads eased in: each pad clamps the land to within half a block a tile of its
 // level, past its apron.
 function padded(x,z,h){
  for(const p of pads){const n=padDistance(p,x,z);if(n===Infinity)continue;
   if(n<=PAD_APRON){h=p.level;continue;}const reach=(n-PAD_APRON)*.5;h=Math.min(p.level+reach,Math.max(p.level-reach,h));}
  return h;}
 const made=new Set(extraMade.map(c=>key(...c)));
 const isMade=(x,z)=>made.has(key(x,z))||!!surface(x,z)||offset(x,z)!==0||onPad(x,z);
 // The made ground before hand offsets: the land with the pads in it (water counts as ground level, as
 // a made tile over water is dry ground).
 function base(x,z){const t=land.tile(x,z);if(!t)return null;return padded(x,z,t.water?1:t.h);}
 function tile(x,z){
  if(!inside(x,z))return null;const t=land.tile(x,z);if(!t)return null;
  const own=surface(x,z),m=isMade(x,z);
  if(t.water&&!m)return {...t};
  const h=Math.max(.5,base(x,z)+offset(x,z));
  // Unpainted: the biome's ground (its surface and colours); painted: the town's surface.
  return own?{x,z,h,surface:own,blocked:false,water:false,buildable:true,biome:t.biome,made:true}
   :{x,z,h,surface:t.water?'dirt':t.surface,palette:t.water?null:t.palette,blocked:false,water:false,buildable:true,biome:t.biome,shore:t.shore,rocky:t.rocky,made:m};
 }
 return {land,inside,tile,base,made:isMade,pads,padded};
}
// The land as a chunk-streamer source around and under a town (docs/TOWN.md): a town's chunks are
// regular chunks that happen to have buildings on them. Inside the town the streamer gets the town's own
// tiles (townTiles(), the same objects the city built on) and draws their ground like any other: one
// renderer, one look (topColor: painted surfaces, else the biome's colours, else water). Outside, the land
// ends at the map's edge (ground(): the town's current ground, which a rebuild replaces). Generated trees,
// resources, enemies, ground cover and fishing spots grow only on free tiles (nothing made, built or
// placed there).
// Nature by hand (townData(): the map's data; docs/TOWN.md, Nature by hand), anywhere in the land:
//   data.resources [{kind, species, x, z}]: placed trees and resources, with the shared resource entities;
//   data.cover [{kind, x, z}]: placed ground cover (ground-cover.js kinds);
//   data.land.removed ['tree:x,z', 'cover:x,z', …]: generated things taken away (entity ids, and cover by
//   tile). One resource and one piece of cover per tile; a placed one replaces what grew there.
export const coverId=(x,z)=>`cover:${x},${z}`;
export const placedId=r=>`placed:${r.kind}:${r.x},${r.z}`;
// Where a hand-placed resource may stand: dry ground with nothing built, placed or laid there.
export const resourceFits=t=>!!t&&!t.water&&t.building===undefined&&!t.prop&&!t.stair&&!t.indoor&&!t.cityWall;
export function townSource(land,ground,townTiles,townData=()=>null){
 const inside=(x,z)=>ground().inside(x,z);
 // Free: nothing made, built or placed (not `blocked`, which a tree sets on its own tile).
 const free=t=>!t.made&&!t.cityWall&&t.building===undefined&&!t.prop&&!t.stair&&!t.indoor;
 const keep=list=>list.filter(t=>!inside(t.x,t.z)||free(t));
 const colors=new Map(),color=hex=>{if(!colors.has(hex))colors.set(hex,new THREE.Color(hex));return colors.get(hex);};
 // The hand edits, by tile, for the tiles asked about.
 const hand=list=>{const data=townData(),removed=new Set(data?.land?.removed||[]),at=new Set(list.map(t=>key(t.x,t.z)));
  const pick=entries=>new Map((entries||[]).filter(e=>at.has(key(e.x,e.z))).map(e=>[key(e.x,e.z),e]));
  return {removed,resources:pick(data?.resources),cover:pick(data?.cover)};};
  const source={...land,
  tile(x,z){if(!inside(x,z))return ground().tile(x,z);return townTiles()?.get(key(x,z))||null;},
  topColor:t=>t.water?land.topColor(t):color(surfaceColor(t)),
  entities(list){const {removed,resources}=hand(list),byKey=new Map(list.map(t=>[key(t.x,t.z),t]));
   const grown=land.entities(keep(list)).filter(e=>!removed.has(e.id)&&!resources.has(key(e.x,e.z)));
   const crystal=townData()?.crystal,placed=[...resources.values()].filter(r=>resourceFits(byKey.get(key(r.x,r.z)))&&!(crystal&&crystal[0]===r.x&&crystal[1]===r.z)).map(r=>({id:placedId(r),kind:r.kind,x:r.x,z:r.z,...r.kind==='tree'?{species:r.species||'oak'}:{}}));
   return [...grown,...placed];},
  extras:list=>land.extras(keep(list)),
  cover(list){const {removed,cover}=hand(list),byKey=new Map(list.map(t=>[key(t.x,t.z),t]));
   const grown=land.cover(keep(list)).filter(c=>{const k=key(Math.round(c.x),Math.round(c.z));return !removed.has(`cover:${k}`)&&!cover.has(k);});
   const placed=[...cover.values()].map(c=>{const t=byKey.get(key(c.x,c.z));if(!t||t.water||t.building!==undefined)return null;const r=hash(c.x,c.z,77),r2=hash(c.x,c.z,78);
    return {kind:c.kind,x:c.x+(r2-.5)*.3,y:t.h,z:c.z+(r-.5)*.3,rotation:r2*6.28,scale:.9+r*.2};}).filter(Boolean);
   return [...grown,...placed];},
  // What grows on one tile, generated or placed (the editor's Select and Erase): {resource, cover}, each
  // {kind, species?, placed, id}.
  natureAt(t){if(!t)return {resource:null,cover:null};const e=source.entities([t])[0]||null,c=source.cover([t])[0]||null,data=townData(),k=key(t.x,t.z);
   const placedCover=(data?.cover||[]).find(p=>key(p.x,p.z)===k);
   return {resource:e&&{kind:e.kind,species:e.species,placed:e.id.startsWith('placed:'),id:e.id},cover:c&&{kind:c.kind,placed:!!placedCover,id:coverId(t.x,t.z)}};},
 };
 return source;
}
