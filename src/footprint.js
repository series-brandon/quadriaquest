import {key} from './world.js';

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
// The body's tile nearest p (ties keep the anchor-first order).
export function nearestCell(anchor,size,p){
 return {x:Math.min(Math.max(p.x,anchor.x),anchor.x+size-1),z:Math.min(Math.max(p.z,anchor.z),anchor.z+size-1)};
}
// A body may stand with its anchor here: every tile exists, is dry, level, and free (or already its own).
export function canStand(world,anchor,size,own=[]){
 const cells=footprint(world,anchor,size);if(!cells)return false;
 return cells.every(t=>!t.water&&(!t.blocked||own.includes(t))&&Math.abs(t.h-cells[0].h)<=.01);
}
// Breadth-first route of anchor tiles for a size×size body, to the nearest anchor where `goal(anchor)`
// holds. `allow(anchor, cells)` adds placement rules (territory, reserved tiles). Returns [] when the
// start already satisfies the goal, or null when no anchor does.
export function findFootprintPath(world,start,size,goal,{own=[],allow=()=>true,limit=5000}={}){
 if(goal(start))return [];
 const startKey=key(start.x,start.z),queue=[start],previous=new Map([[startKey,null]]);
 for(let i=0;i<queue.length&&i<limit;i++){
  const t=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nk=key(t.x+dx,t.z+dz),n=world.get(nk);
   if(!n||previous.has(nk)||Math.abs(n.h-t.h)>.5||!canStand(world,n,size,own)||!allow(n,footprint(world,n,size)))continue;
   previous.set(nk,key(t.x,t.z));
   if(goal(n)){const route=[n];let cursor=key(t.x,t.z);while(cursor!==startKey){route.unshift(world.get(cursor));cursor=previous.get(cursor);}return route;}
   queue.push(n);
  }
 }
 return null;
}
