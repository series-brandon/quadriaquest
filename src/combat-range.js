import {findPath,key,edgeBetween,edgePasses} from './world.js';
import {sizeOf,nearestCell} from './footprint.js';
// Grid supercover: a shot cannot cut diagonally through a pair of solid corners, and every tile edge
// it crosses must let sight through (walls and closed doors don't; windows, fences and counters do).
export function lineOfSight(world,from,to){
 let x=from.x,z=from.z;const dx=to.x-x,dz=to.z-z,nx=Math.abs(dx),nz=Math.abs(dz),sx=Math.sign(dx),sz=Math.sign(dz);let ix=0,iz=0;
 const clear=(x,z)=>{if(x===to.x&&z===to.z||x===from.x&&z===from.z)return true;const t=world.get(key(x,z));return !!t&&!t.blocked&&!t.blocksSight;};
 const at=(x,z)=>world.get(key(x,z)),sees=(a,b)=>edgePasses(edgeBetween(a,b),'sight');
 while(ix<nx||iz<nz){const nextX=(1+2*ix)*nz,nextZ=(1+2*iz)*nx,here=at(x,z);
  if(nextX===nextZ){if(!clear(x+sx,z)||!clear(x,z+sz))return false;
   const a=at(x+sx,z),b=at(x,z+sz),d=at(x+sx,z+sz);if(!(sees(here,a)&&sees(a,d)&&sees(here,b)&&sees(b,d)))return false;
   x+=sx;z+=sz;ix++;iz++;}
  else if(nextX<nextZ){if(!sees(here,at(x+sx,z)))return false;x+=sx;ix++;}else {if(!sees(here,at(x,z+sz)))return false;z+=sz;iz++;}
  if(!clear(x,z))return false;
 }return true;
}
// A multi-tile target (size > 1, anchored at target.tile) is measured to its body tile nearest `from`.
export function withinAttackRange(world,from,target,range=1){
 const size=sizeOf(target),cell=size>1?nearestCell(target.tile,size,from):target,tile=size>1?world.get(key(cell.x,cell.z)):target.tile;
 const distance=Math.abs(from.x-cell.x)+Math.abs(from.z-cell.z);
 // A melee reach (range 1) also needs the shared edge to allow reaching across (not a wall or window).
 return !!tile&&distance>0&&distance<=range&&Math.abs(from.h-tile.h)<=.5&&(range>1||edgePasses(edgeBetween(from,tile),'reach'))&&lineOfSight(world,from,cell);
}
// Nearest spot to attack from, preferring one where no other character stands (`occupied`).
export function attackRoute(world,start,target,range=1,occupied=()=>false,cost=null){
 if(withinAttackRange(world,start,target,range))return {at:start,route:[]};
 let best=null;
 for(const t of world.values())if(!t.blocked&&!t.water&&withinAttackRange(world,t,target,range)){
  const route=findPath(world,start,t,cost),taken=occupied(t);
  if(route&&(!best||taken<best.taken||taken===best.taken&&route.length<best.route.length))best={at:t,route,taken};
 }return best&&{at:best.at,route:best.route};
}
