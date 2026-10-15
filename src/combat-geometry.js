import {key,edgeBetween,edgePasses} from './world.js';
// How combat measures the grid (docs/COMBAT.md, Reach and range; docs/MOVEMENT-PLAN.md). Provisional
// first-pass values (user decision, 2026-10-15), tunable from the playground:
//   meleeReach 'cardinal': melee reaches the four orthogonal neighbours only, so standing diagonally
//              beside an enemy is a spot where neither side can strike; '8way' adds the diagonals.
//   metric     how attack range (beyond melee), aggro range and the leash are counted: 'manhattan',
//              'chebyshev' or 'euclidean' tiles.
export const COMBAT_GEOMETRY={meleeReach:'cardinal',metric:'manhattan'};
export const METRICS=['manhattan','chebyshev','euclidean'];
export function gridDistance(dx,dz,metric=COMBAT_GEOMETRY.metric){
 dx=Math.abs(dx);dz=Math.abs(dz);
 return metric==='chebyshev'?Math.max(dx,dz):metric==='euclidean'?Math.hypot(dx,dz):dx+dz;
}
export const tileDistance=(a,b,metric)=>gridDistance(a.x-b.x,a.z-b.z,metric);
// The melee gap: 1 means within melee reach of a tile (diagonals count only with '8way').
export const meleeDistance=(dx,dz)=>gridDistance(dx,dz,COMBAT_GEOMETRY.meleeReach==='8way'?'chebyshev':'manhattan');
// Whether a strike reaches from tile a to its neighbour b: across the shared edge (not a wall or window;
// a counter is fine), or, for a diagonal ('8way'), around the corner by both L-shaped paths with neither
// corner tile solid (as line of sight treats diagonals).
export function reachesAcross(world,a,b){
 const dx=b.x-a.x,dz=b.z-a.z;
 if(Math.abs(dx)+Math.abs(dz)===1)return edgePasses(edgeBetween(a,b),'reach');
 if(COMBAT_GEOMETRY.meleeReach!=='8way'||Math.abs(dx)!==1||Math.abs(dz)!==1)return false;
 const c=world.get(key(b.x,a.z)),d=world.get(key(a.x,b.z)),reach=(p,q)=>edgePasses(edgeBetween(p,q),'reach');
 return !!c&&!!d&&!c.blocked&&!d.blocked&&reach(a,c)&&reach(c,b)&&reach(a,d)&&reach(d,b);
}
