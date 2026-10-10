import {findPath,key} from './world.js';
// Choose a reachable cardinal neighbor, including safe half-height ledges. Prefers a spot where no other
// character stands (`occupied`); characters are walk-through, so an occupied spot is still a fallback.
export function interactionRoute(world,start,target,occupied=()=>false){
 const routes=[];
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const at=world.get(key(target.x+dx,target.z+dz));
  if(!at||at.water||Math.abs(at.h-target.tile.h)>.5)continue;
  const route=findPath(world,start,at);if(route)routes.push({at,route,taken:at!==start&&occupied(at)});
 }
 return routes.sort((a,b)=>a.taken-b.taken||a.route.length-b.route.length)[0]||null;
}
