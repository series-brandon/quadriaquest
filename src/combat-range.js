import {findPath,key} from './world.js';
import {sizeOf,nearestCell} from './footprint.js';
// Grid supercover: a shot cannot cut diagonally through a pair of solid corners.
export function lineOfSight(world,from,to){
 let x=from.x,z=from.z;const dx=to.x-x,dz=to.z-z,nx=Math.abs(dx),nz=Math.abs(dz),sx=Math.sign(dx),sz=Math.sign(dz);let ix=0,iz=0;
 const clear=(x,z)=>{if(x===to.x&&z===to.z||x===from.x&&z===from.z)return true;const t=world.get(key(x,z));return !!t&&!t.blocked&&!t.blocksSight;};
 while(ix<nx||iz<nz){const nextX=(1+2*ix)*nz,nextZ=(1+2*iz)*nx;
  if(nextX===nextZ){if(!clear(x+sx,z)||!clear(x,z+sz))return false;x+=sx;z+=sz;ix++;iz++;}
  else if(nextX<nextZ){x+=sx;ix++;}else {z+=sz;iz++;}
  if(!clear(x,z))return false;
 }return true;
}
// A multi-tile target (size > 1, anchored at target.tile) is measured to its body tile nearest `from`.
export function withinAttackRange(world,from,target,range=1){
 const size=sizeOf(target),cell=size>1?nearestCell(target.tile,size,from):target,tile=size>1?world.get(key(cell.x,cell.z)):target.tile;
 const distance=Math.abs(from.x-cell.x)+Math.abs(from.z-cell.z);
 return !!tile&&distance>0&&distance<=range&&Math.abs(from.h-tile.h)<=.5&&lineOfSight(world,from,cell);
}
export function attackRoute(world,start,target,range=1){
 if(withinAttackRange(world,start,target,range))return {at:start,route:[]};
 let best=null;
 for(const t of world.values())if(!t.blocked&&!t.water&&withinAttackRange(world,t,target,range)){
  const route=findPath(world,start,t);if(route&&(!best||route.length<best.route.length))best={at:t,route};
 }return best;
}
