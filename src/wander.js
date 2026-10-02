import {key} from './world.js';
export const PATROL_AREAS={scrapper:{minX:8,maxX:13,minZ:5,maxZ:11},bruiser:{minX:13,maxX:16,minZ:7,maxZ:12}};
export const wanderDelay=(random=Math.random)=>2+random()*2;
export const shouldWander=(random=Math.random)=>random()<.25;
// Sample uniformly from reachable destinations, not just immediate neighbors.
// Keep every route step inside the patrol area and clear of reserved tiles.
export function wanderRoute(map,start,area,occupied=()=>false,random=Math.random){
 const queue=[start],previous=new Map([[key(start.x,start.z),null]]);
 for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const next=map.get(key(queue[i].x+dx,queue[i].z+dz));
  if(!next||next.x<area.minX||next.x>area.maxX||next.z<area.minZ||next.z>area.maxZ||next.water||next.blocked||occupied(next)||Math.abs(next.h-queue[i].h)>.5||previous.has(key(next.x,next.z)))continue;
  previous.set(key(next.x,next.z),queue[i]);queue.push(next);
 }
 if(queue.length<2)return [];
 let tile=queue[1+Math.min(queue.length-2,Math.floor(random()*(queue.length-1)))];const route=[];
 while(tile!==start){route.unshift(tile);tile=previous.get(key(tile.x,tile.z));}
 return route;
}
