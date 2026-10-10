import {key} from './world.js';
export const wanderDelay=(random=Math.random)=>2+random()*2;
export const shouldWander=(random=Math.random)=>random()<.25;
// Sample uniformly from reachable destinations, not just immediate neighbors.
// Keep every route step inside the patrol area. Characters are walk-through: a route may pass an
// occupied tile, but never ends on one.
export function wanderRoute(map,start,area,occupied=()=>false,random=Math.random){
 const queue=[start],previous=new Map([[key(start.x,start.z),null]]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const next=map.get(key(queue[i].x+dx,queue[i].z+dz));
  if(!next||next.x<area.minX||next.x>area.maxX||next.z<area.minZ||next.z>area.maxZ||next.water||next.blocked||Math.abs(next.h-queue[i].h)>.5||previous.has(key(next.x,next.z)))continue;
  previous.set(key(next.x,next.z),queue[i]);queue.push(next);
 }
 const free=queue.slice(1).filter(t=>!occupied(t));
 if(!free.length)return [];
 let tile=free[Math.min(free.length-1,Math.floor(random()*free.length))];const route=[];
 while(tile!==start){route.unshift(tile);tile=previous.get(key(tile.x,tile.z));}
 return route;
}
