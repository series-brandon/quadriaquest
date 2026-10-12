import {findPath,key,edgeBetween,edgePasses} from './world.js';
// Choose a reachable cardinal neighbor, including safe half-height ledges, that can reach the target
// across their shared edge (not through a wall or window; a counter is fine). Prefers a spot where no other
// character stands (`occupied`); characters are walk-through, so an occupied spot is still a fallback.
// cost: route cost of occupied tiles (findPath), so the walk there goes around people when it can.
// Across a counter (a tile marked reachOver, props.js): you can also stand on the far side of it, two
// tiles away, as at a shop.
export function interactionRoute(world,start,target,occupied=()=>false,cost=null){
 const routes=[];
 for(const [dx,dz,far] of [[1,0],[-1,0],[0,1],[0,-1],[2,0,1],[-2,0,1],[0,2,1],[0,-2,1]]){
  if(far){const between=world.get(key(target.x+dx/2,target.z+dz/2));if(!between?.reachOver)continue;}
  const at=world.get(key(target.x+dx,target.z+dz));
  if(!at||at.water||Math.abs(at.h-target.tile.h)>.5||!far&&!edgePasses(edgeBetween(at,target.tile),'reach'))continue;
  const route=findPath(world,start,at,cost);if(route)routes.push({at,route,taken:at!==start&&occupied(at)});
 }
 return routes.sort((a,b)=>a.taken-b.taken||a.route.length-b.route.length)[0]||null;
}
