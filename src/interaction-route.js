import {findPath,key} from './world.js';
// Choose a reachable cardinal neighbor, including safe half-height ledges.
export function interactionRoute(world,start,target){
 const routes=[];
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const at=world.get(key(target.x+dx,target.z+dz));
  if(!at||at.water||Math.abs(at.h-target.tile.h)>.5)continue;
  const route=findPath(world,start,at);if(route)routes.push({at,route});
 }
 return routes.sort((a,b)=>a.route.length-b.route.length)[0]||null;
}
