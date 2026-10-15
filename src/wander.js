import {canStep,eachStep,searchRoute,routeTo,DIAGONAL_MOVES,stepCost} from './world.js';
export const wanderDelay=(random=Math.random)=>2+random()*2;
export const shouldWander=(random=Math.random)=>random()<.25;
// Sample uniformly from reachable destinations, not just immediate neighbors.
// Keep every route step inside the patrol area. Characters are walk-through: a route may pass an
// occupied tile, but never ends on one. With `cost` (occupied tiles, world-occupancy.js) each route is
// the cheapest one, so a wanderer goes around people when it can.
// diagonal: diagonal steps (NPC wanderers and creatures share the setting by default).
export function wanderRoute(map,start,area,occupied=()=>false,random=Math.random,cost=null,{diagonal=DIAGONAL_MOVES.enemy}={}){
 const inside=t=>t.x>=area.minX&&t.x<=area.maxX&&t.z>=area.minZ&&t.z<=area.maxZ;
 const passable=(from,next)=>inside(next)&&!next.water&&canStep(from,next),options={diagonal,passable};
 // A whole flood (no goal): every tile it reaches, cheapest first.
 const {previous}=searchRoute(start,(t,add)=>eachStep(map,t,n=>add(n,stepCost(t,n)+(cost?cost(n):0)),options),{goal:()=>false});
 const free=[...previous.keys()].filter(t=>t!==start&&!occupied(t));
 if(!free.length)return [];
 return routeTo(previous,free[Math.min(free.length-1,Math.floor(random()*free.length))]);
}
