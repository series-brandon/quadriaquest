import {key,edgeBetween,edgePasses,searchRoute,routeTo,eachStep,DIAGONAL_MOVES,stepCost} from './world.js';
import {sizeOf,nearestCell} from './footprint.js';
import {gridDistance,meleeDistance,reachesAcross} from './combat-geometry.js';
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
// Range 1 is melee (combat-geometry.js meleeReach); longer ranges use the combat metric.
export function withinAttackRange(world,from,target,range=1){
 const size=sizeOf(target),cell=size>1?nearestCell(target.tile,size,from):target,tile=size>1?world.get(key(cell.x,cell.z)):target.tile;
 const dx=from.x-cell.x,dz=from.z-cell.z,distance=range>1?gridDistance(dx,dz):meleeDistance(dx,dz);
 // A melee reach (range 1) also needs the edge or corner between to allow reaching across.
 return !!tile&&distance>0&&distance<=range&&Math.abs(from.h-tile.h)<=.5&&(range>1||reachesAcross(world,from,tile))&&lineOfSight(world,from,cell);
}
// Nearest spot to attack from, preferring one where no other character stands (`occupied`): one search
// outward from the start, ending on the first free spot in range (or, when every spot in range is taken,
// the nearest taken one). cost: route cost of occupied tiles, as findPath.
export function attackRoute(world,start,target,range=1,occupied=()=>false,cost=null,{diagonal=DIAGONAL_MOVES.player}={}){
 if(withinAttackRange(world,start,target,range))return {at:start,route:[]};
 const spot=t=>!t.blocked&&!t.water&&withinAttackRange(world,t,target,range);
 let taken=null;
 const options={diagonal};
 // Taken spots are remembered, not ended on; a free one within a few steps more still wins.
 const goal=(t,d)=>{if(!spot(t))return false;if(!occupied(t))return true;taken||={t,d};return false;};
 const {end,previous}=searchRoute(start,(t,add,d)=>{if(taken&&d>taken.d+8)return;eachStep(world,t,n=>add(n,stepCost(t,n)+(cost?cost(n):0)),options);},{target:{x:target.x,z:target.z},goal,near:range+sizeOf(target)-1,limit:20000});
 const at=end||taken?.t;return at?{at,route:routeTo(previous,at)}:null;
}
