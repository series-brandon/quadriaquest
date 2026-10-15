import {gridDistance,meleeDistance,reachesAcross} from './combat-geometry.js';
import {key,edgeBetween,edgePasses,searchRoute,routeTo,ORTHOGONAL,DIAGONAL,DIAGONAL_MOVES} from './world.js';

// Multi-tile bodies. A body of `size` covers size×size tiles; its anchor is the minimum-x, minimum-z
// corner (the entity's `tile`). Size 1 is an ordinary one-tile entity.
export const sizeOf=entity=>entity?.size||1;
// The centre of an entity's body in tile coordinates (its tile for size 1): where to face and aim.
export function bodyCenter(entity){const offset=(sizeOf(entity)-1)/2;return {x:entity.x+offset,z:entity.z+offset};}
// The body's tiles with its anchor at `anchor`, or null when any is missing from the world.
export function footprint(world,anchor,size=1){
 const cells=[];
 for(let dx=0;dx<size;dx++)for(let dz=0;dz<size;dz++){const t=world.get(key(anchor.x+dx,anchor.z+dz));if(!t)return null;cells.push(t);}
 return cells;
}
// Manhattan gap from tile p to the body (0 inside it, 1 orthogonally beside it).
export function footprintGap(anchor,size,p){
 const dx=Math.max(0,anchor.x-p.x,p.x-(anchor.x+size-1)),dz=Math.max(0,anchor.z-p.z,p.z-(anchor.z+size-1));
 return dx+dz;
}
const gapAxes=(anchor,size,p)=>[Math.max(0,anchor.x-p.x,p.x-(anchor.x+size-1)),Math.max(0,anchor.z-p.z,p.z-(anchor.z+size-1))];
// The gap in combat terms (combat-geometry.js): melee (1 = within melee reach of the body) and range
// (attack range, aggro and leash metric).
export const meleeGap=(anchor,size,p)=>meleeDistance(...gapAxes(anchor,size,p));
export const rangeGap=(anchor,size,p)=>gridDistance(...gapAxes(anchor,size,p));
// The body's tile nearest p (ties keep the anchor-first order).
export function nearestCell(anchor,size,p){
 return {x:Math.min(Math.max(p.x,anchor.x),anchor.x+size-1),z:Math.min(Math.max(p.z,anchor.z),anchor.z+size-1)};
}
// A body may stand with its anchor here: every tile exists, is dry, level, and free (or already its own).
export function canStand(world,anchor,size,own=[]){
 const cells=footprint(world,anchor,size);if(!cells)return false;
 if(!cells.every(t=>!t.water&&(!t.blocked||own.includes(t))&&Math.abs(t.h-cells[0].h)<=.01))return false;
 // No wall may run through the body: every edge between its own cells is crossable.
 return size===1||cells.every(t=>cells.every(u=>Math.abs(t.x-u.x)+Math.abs(t.z-u.z)!==1||edgePasses(edgeBetween(t,u),'move')));
}
// A body moving one tile from `from` to `to` (orthogonally neighbouring anchors): each of its cells
// crosses one edge, and every one of those edges must be crossable. Not for diagonals (bodyMove).
export function bodyStep(world,from,to,size=1){
 const dx=to.x-from.x,dz=to.z-from.z;if(Math.abs(dx)+Math.abs(dz)!==1)return false;
 for(let x=0;x<size;x++)for(let z=0;z<size;z++){const a=world.get(key(from.x+x,from.z+z)),b=world.get(key(from.x+x+dx,from.z+z+dz));if(a&&b&&!edgePasses(edgeBetween(a,b),'move'))return false;}
 return true;
}
// One step of a body's anchor, orthogonal or diagonal. A diagonal follows the corner rule (world.js
// diagonalOk) for the whole body: it could take either L-shaped path instead, standing level on both
// orthogonal anchors on the way (`allow` holds there too), so it never cuts a corner of anything.
export function bodyMove(world,from,to,size=1,{own=[],allow=()=>true,diagonal=true}={}){
 const dx=to.x-from.x,dz=to.z-from.z,flat=t=>!!t&&Math.abs(t.h-from.h)<.01;
 if(Math.abs(dx)+Math.abs(dz)===1)return Math.abs(to.h-from.h)<=.5&&canStand(world,to,size,own)&&bodyStep(world,from,to,size)&&allow(to,footprint(world,to,size));
 if(!diagonal||Math.abs(dx)!==1||Math.abs(dz)!==1||!flat(to))return false;
 const cells=t=>footprint(world,t,size),side=t=>flat(t)&&canStand(world,t,size,own)&&!cells(t).some(c=>c.stair)&&allow(t,cells(t));
 const b=world.get(key(to.x,from.z)),c=world.get(key(from.x,to.z));
 return side(b)&&side(c)&&canStand(world,to,size,own)&&!cells(to).some(t=>t.stair)&&bodyStep(world,from,b,size)&&bodyStep(world,b,to,size)&&bodyStep(world,from,c,size)&&bodyStep(world,c,to,size)&&allow(to,cells(to));
}
// Melee reach between a body and a tile: inside it, or beside a body tile (orthogonally, or diagonally
// with '8way' melee reach) at most half a block up or down, reaching across the edge or corner between
// (combat-geometry.js reachesAcross: no wall, window, fence, closed door…).
export function reachesBody(world,anchor,size,p){
 const gap=meleeGap(anchor,size,p);if(gap===0)return true;if(gap!==1)return false;
 const c=nearestCell(anchor,size,p),cell=world.get(key(c.x,c.z));
 return !!cell&&Math.abs(cell.h-p.h)<=.5&&reachesAcross(world,cell,p);
}
// The route of anchor tiles for a size×size body to the nearest anchor where `goal(anchor)` holds.
// `allow(anchor, cells)` adds placement rules (territory, reserved tiles). Returns [] when the start
// already satisfies the goal, or null when no anchor does (within `limit` anchors).
// cost(cells): extra cost of a body standing on these cells (occupied tiles). With it the route is the
// cheapest one, the goal's own cost included, so a free stopping spot beats an occupied one.
// diagonal: diagonal steps (DIAGONAL_MOVES.enemy for one tile, .body for larger bodies by default).
export function findFootprintPath(world,start,size,goal,{own=[],allow=()=>true,limit=5000,cost=null,diagonal=size>1?DIAGONAL_MOVES.body:DIAGONAL_MOVES.enemy}={}){
 if(goal(start))return [];
 const options={own,allow,diagonal};
 const expand=(t,add)=>{
  for(const [dx,dz] of ORTHOGONAL){const n=world.get(key(t.x+dx,t.z+dz));if(n&&bodyMove(world,t,n,size,options))add(n,1+(cost?cost(footprint(world,n,size)):0));}
  if(diagonal)for(const [dx,dz] of DIAGONAL){const n=world.get(key(t.x+dx,t.z+dz));if(n&&bodyMove(world,t,n,size,options))add(n,1+(cost?cost(footprint(world,n,size)):0));}
 };
 const {end,previous}=searchRoute(start,expand,{goal,limit});
 return end?routeTo(previous,end):null;
}
