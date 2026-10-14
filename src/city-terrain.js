import * as THREE from 'three';
import {tileTopGeometry} from './tile-top.js';
import {key} from './world.js';

// City ground (docs/CITY.md, Streets, elevation and stairs; city Phase 5). Shared by every map with
// streets, the city editor and the capital:
//  - Surfaces: each tile may carry `surface` (grass, dirt, cobble, flagstone, plaza, stone). Paved
//    surfaces meeting grass or dirt at the same height get a kerb strip on the paved side.
//  - Retaining walls: a tile standing a full block or more above its neighbour shows a stone wall on
//    that side with a coping band along the top, in the district's stone. Collision needs nothing
//    extra: canStep already refuses steps of more than half a block.
//  - Stairs: a tile with `stair` ({dir: 'n'|'e'|'s'|'w', the way up}) is drawn as two treads, so a run
//    reads as stairs, not ledges. Runs are laid out by layStairs (one tile per half block).
// Everything here is terrain: makeCityTile is a terrain factory for createTerrainBatch, so a whole city
// bakes into a few vertex-coloured meshes.
export const SURFACES={
 grass:['#8fb071','#88aa6b'],dirt:['#b39b78','#ab9372'],cobble:['#a9a39a','#a29c92'],flagstone:['#c3b9a6','#bbb19e'],
 plaza:['#cbc4b6','#c2bbad'],stone:['#b7b0a5','#aea79c'],floor:['#a49c90','#9c9488'],planks:['#a27a55','#9a7350'],
 dungeon:['#55524b','#4f4c45'],
};
export const SURFACE_NAMES=Object.keys(SURFACES);
const PAVED=new Set(['cobble','flagstone','plaza','stone']),SOFT=new Set(['grass','dirt','sand','mud']);
export const WALL_STONES={timber:['#a8a196','#9f988d'],stone:['#b9b2a6','#aea79b'],brick:['#9a8f86','#8f857c'],graybox:['#bdb9b3','#b3afa9']};
const COPING='#d2ccc0',KERB='#d8d2c6',DIRT_SIDE='#a5a084';
export const DIRS={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]};
export const surfaceOf=tile=>tile.surface||'grass';
// A town on the land (town-ground.js) leaves unpainted tiles with their biome's own colours (`palette`).
export function surfaceColor(tile){const pair=tile.palette||SURFACES[surfaceOf(tile)]||SURFACES.grass;return pair[(tile.x+tile.z)&1];}

const materials=new Map();
const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.92}));return materials.get(color);};
const boxes=new Map();
const box=(w,h,d)=>{const id=`${w},${h},${d}`;if(!boxes.has(id))boxes.set(id,new THREE.BoxGeometry(w,h,d));return boxes.get(id).clone();};
function add(group,geometry,color,x,y,z){const mesh=new THREE.Mesh(geometry,material(color));mesh.position.set(x,y,z);group.add(mesh);return mesh;}

// Is the edge from `tile` towards (dx, dz) a retaining wall (a drop of a full block or more)?
export function retainingDrop(tile,neighbour){return !!neighbour&&!neighbour.water&&tile.h-neighbour.h>=1-1e-6;}
// A terrain factory (tile, map) → group, for createTerrainBatch. style: the district (wall stones).
export function makeCityTile(tile,map,{style='stone'}={}){
 const group=new THREE.Group(),near=(dx,dz)=>map.get(key(tile.x+dx,tile.z+dz)),top=surfaceColor(tile),R=.065;
 const stones=WALL_STONES[tile.district||style]||WALL_STONES.stone;
 if(tile.stair){
  // Two treads: the half towards the way down at h − 0.25, the half towards the way up at h.
  const [dx,dz]=DIRS[tile.stair.dir],h=tile.h,half=y=>dz?box(1,y,.5):box(.5,y,1);
  add(group,box(1,h-.31,1),stones[0],0,(h-.31)/2,0);
  add(group,half(.06),top,-dx*.25,h-.28,-dz*.25);
  add(group,half(.25),stones[1],dx*.25,h-.185,dz*.25);
  add(group,half(.06),top,dx*.25,h-.03,dz*.25);
  return group;
 }
 group.add(new THREE.Mesh(tileTopGeometry(tile,map),material(top)));
 // The block under the top: dirt sides, or stone where it stands a block or more above a neighbour.
 const drops=Object.entries(DIRS).filter(([,d])=>retainingDrop(tile,near(...d)));
 add(group,box(1,tile.h-R,1),drops.length?stones[0]:DIRT_SIDE,0,(tile.h-R)/2,0);
 for(const [side,[dx,dz]] of drops){
  const from=near(dx,dz).h;
  // Courses of stone: a slightly proud band every half block, and a coping band along the top.
  for(let y=from+.5;y<tile.h-.2;y+=.5)add(group,box(dz?1:.03,.05,dz?.03:1),stones[1],dx*.505,y,dz*.505);
  add(group,box(dz?1.04:.14,.1,dz?.14:1.04),COPING,dx*.45,tile.h-.035,dz*.45);
 }
 // Kerbs: a paved tile beside grass or dirt at the same height.
 if(PAVED.has(surfaceOf(tile)))for(const [dx,dz] of Object.values(DIRS)){const n=near(dx,dz);
  if(n&&!n.water&&!n.stair&&Math.abs(n.h-tile.h)<.01&&SOFT.has(surfaceOf(n)))add(group,box(dz?1:.1,.04,dz?.1:1),KERB,dx*.45,tile.h+.02,dz*.45);}
 return group;
}

// Lays a stair run into a map: `length` tiles from (x, z) going up in `dir`, `width` tiles wide (to the
// right of the way up), each tile half a block above the one before, starting half a block above
// `base`. Returns the stair tiles. The tile beyond the run should stand at base + 0.5 × length.
export function layStairs(map,{x,z,dir,length,width=1,base,surface='stone'}){
 const [dx,dz]=DIRS[dir],right=[-dz,dx],out=[];
 for(let i=0;i<length;i++)for(let j=0;j<width;j++){
  const t=map.get(key(x+dx*i+right[0]*j,z+dz*i+right[1]*j));if(!t)continue;
  t.h=base+.5*(i+1);t.stair={dir};t.surface=surface;out.push(t);
 }
 return out;
}
// Stair sides that drop to lower ground get a railing, so stairs aren't left by their sides and read as
// stairs; the high side of every retaining wall gets one too, except at stair heads. Returns
// [[high, low, 'stair'?]] edges for createEdgeFeatures().add(…, 'railing'): stair sides are placed
// hidden (collision only) and drawn by stairRailParts as a sloped handrail along the flight.
export function railingEdges(tiles,map){
 const out=[],seen=new Set();
 for(const t of tiles)for(const [dx,dz] of Object.values(DIRS)){
  const n=map.get(key(t.x+dx,t.z+dz));if(!n||n.water)continue;
  const id=[t,n].map(o=>`${o.x},${o.z}`).sort().join('|');if(seen.has(id))continue;
  const along=t.stair&&(DIRS[t.stair.dir][0]===dx&&DIRS[t.stair.dir][1]===dz||DIRS[t.stair.dir][0]===-dx&&DIRS[t.stair.dir][1]===-dz);
  if(t.stair&&!along&&!n.stair&&t.h-n.h>=.5-1e-6){seen.add(id);out.push([t,n,'stair']);continue;}
  if(!t.stair&&!n.stair&&retainingDrop(t,n)){seen.add(id);out.push([t,n]);}
 }
 return out;
}
// Map checks (the city editor lists them): a drop of a full block with no stairs anywhere along the
// terrace edge can't be climbed. A stair run must end on a tile at its top height (its landing).
export function stairProblems(map){
 const problems=[];
 for(const t of map.values()){if(!t.stair)continue;const [dx,dz]=DIRS[t.stair.dir],next=map.get(key(t.x+dx,t.z+dz)),prev=map.get(key(t.x-dx,t.z-dz));
  if(!next||(!next.stair&&Math.abs(next.h-t.h)>.01&&Math.abs(next.h-t.h)>.5))problems.push({tile:t,problem:'stairs end against a drop (no landing at the top)'});
  if(!prev||(!prev.stair&&Math.abs(t.h-.5-prev.h)>.01&&Math.abs(prev.h-t.h)>.5))problems.push({tile:t,problem:'stairs start above the ground below them'});}
 return problems;
}

// Sloped handrails along stair sides (user, 2026-10-11: angled, meeting the ground and the next flight).
// For each stair-side edge [stair, lower]: a rail rising half a block across the tile, from its low end
// (the ground before it) to its high end, with posts standing on the treads. Consecutive tiles of a
// flight join into one straight rail; a landing's flat railing meets it at the same height.
const RAIL=.66;
export function stairRailParts(edges){
 const parts=[],color='#9b6c46',tilt=Math.atan(.5),length=Math.hypot(1,.5);
 for(const [t,n] of edges){
  const [sx,sz]=DIRS[t.stair.dir],side=[n.x-t.x,n.z-t.z],cx=t.x-6+side[0]*.44,cz=t.z-6+side[1]*.44,yaw=Math.atan2(-sz,sx);
  for(const [rise,thick] of [[RAIL,.06],[RAIL-.3,.045]])parts.push({geometry:new THREE.BoxGeometry(length,thick,.05),color,position:[cx,t.h-.25+rise,cz],rotation:[0,yaw,tilt]});
  for(const [along,floor] of [[-.42,t.h-.25],[0,t.h-.25],[.42,t.h]]){const top=t.h-.25+RAIL+along*.5,h=top-floor;
   parts.push({geometry:new THREE.BoxGeometry(.06,h,.06),color,position:[cx+sx*along,floor+h/2,cz+sz*along]});}
 }
 return parts;
}
