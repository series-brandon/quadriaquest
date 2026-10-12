import {key,createHeap,canStep} from './world.js';
export const wanderDelay=(random=Math.random)=>2+random()*2;
export const shouldWander=(random=Math.random)=>random()<.25;
// Sample uniformly from reachable destinations, not just immediate neighbors.
// Keep every route step inside the patrol area. Characters are walk-through: a route may pass an
// occupied tile, but never ends on one. With `cost` (occupied tiles, world-occupancy.js) each route is
// the cheapest one, so a wanderer goes around people when it can.
export function wanderRoute(map,start,area,occupied=()=>false,random=Math.random,cost=null){
 const inside=t=>t.x>=area.minX&&t.x<=area.maxX&&t.z>=area.minZ&&t.z<=area.maxZ;
 const step=(from,next)=>!!next&&inside(next)&&!next.water&&canStep(from,next);
 const previous=new Map([[key(start.x,start.z),null]]),reached=[];
 if(cost){
  const best=new Map([[key(start.x,start.z),0]]),heap=createHeap();heap.push(0,start);
  while(heap.size){const [d,t]=heap.pop(),k=key(t.x,t.z);if(d>best.get(k))continue;if(t!==start)reached.push(t);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const next=map.get(key(t.x+dx,t.z+dz));if(!step(t,next))continue;const nk=key(next.x,next.z),nd=d+1+cost(next);if(nd<(best.get(nk)??Infinity)){best.set(nk,nd);previous.set(nk,t);heap.push(nd,next);}}}
 }else{
  const queue=[start];
  for(let i=0;i<queue.length;i++)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=map.get(key(queue[i].x+dx,queue[i].z+dz));
   if(!step(queue[i],next)||previous.has(key(next.x,next.z)))continue;
   previous.set(key(next.x,next.z),queue[i]);queue.push(next);reached.push(next);
  }
 }
 const free=reached.filter(t=>!occupied(t));
 if(!free.length)return [];
 let tile=free[Math.min(free.length-1,Math.floor(random()*free.length))];const route=[];
 while(tile!==start){route.unshift(tile);tile=previous.get(key(tile.x,tile.z));}
 return route;
}
