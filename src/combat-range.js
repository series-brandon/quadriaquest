import {findPath,key} from './world.js';
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
export function withinAttackRange(world,from,target,range=1){
 const distance=Math.abs(from.x-target.x)+Math.abs(from.z-target.z);
 return distance>0&&distance<=range&&Math.abs(from.h-target.tile.h)<=.5&&lineOfSight(world,from,target);
}
export function attackRoute(world,start,target,range=1){
 if(withinAttackRange(world,start,target,range))return {at:start,route:[]};
 let best=null;
 for(const t of world.values())if(!t.blocked&&!t.water&&withinAttackRange(world,t,target,range)){
  const route=findPath(world,start,t);if(route&&(!best||route.length<best.route.length))best={at:t,route};
 }return best;
}
