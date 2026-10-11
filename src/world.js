// Heights are in half-block units. Missing tiles are outside the island.
export const rows = [
'    22222    ',
'  222222222  ',
' 22222222222 ',
'2222222222222',
'2222222222222',
'2222223333222',
'2222234443222',
'2222234443222',
'2222234443222',
'2222223332222',
' 22222222222 ',
'  222222222  ',
'    22222    ',
];
// A clear corner of the central upper meadow, away from its rock pile.
export const SPAWN = {x:6,z:6};
export const key = (x,z) => `${x},${z}`;
export function makeWorld(){
 const map=new Map();rows.forEach((row,z)=>[...row].forEach((v,x)=>{if(v!==' ')map.set(key(x,z),{x,z,h:Number(v)/2,blocked:false,water:false});}));
 for(const [x,z] of [[2,3],[3,3],[2,4],[3,4],[4,4],[3,5]]){const t=map.get(key(x,z));t.water=true;t.blocked=true;}
 for(const [x,z] of [[3,1],[7,1],[10,3],[1,7],[3,9],[10,9],[8,11]])map.get(key(x,z)).blocked=true;
 // A high lookout deliberately has no safe route from its immediate neighbors.
 map.get(key(10,6)).h=2.5;map.get(key(10,7)).h=2.5;
 return map;
}
// cost(tile): extra cost of stepping onto a tile (occupied tiles, world-occupancy.js). With it the
// route is the cheapest one (each step costs 1 plus the tile's extra); without it, the shortest.
export function findPath(map,start,end,cost=null){
 const target=map.get(key(end.x,end.z));if(!target||target.blocked)return null;
 if(cost)return cheapestPath(map,start,target,cost);
 const startKey=key(start.x,start.z),endKey=key(end.x,end.z),queue=[startKey],previous=new Map([[startKey,null]]);
 for(let i=0;i<queue.length;i++){
  const k=queue[i];if(k===endKey){const route=[];let cursor=k;while(cursor!==startKey){route.unshift(map.get(cursor));cursor=previous.get(cursor);}return route;}
  const t=map.get(k);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nk=key(t.x+dx,t.z+dz),n=map.get(nk);if(!n||n.blocked||Math.abs(n.h-t.h)>.5||previous.has(nk))continue;previous.set(nk,k);queue.push(nk);}
 }
 return null;
}

// A tiny binary heap of [priority, item] for the cheapest-route searches.
export function createHeap(){
 const items=[];
 return {get size(){return items.length;},
  push(priority,item){items.push([priority,item]);let i=items.length-1;while(i>0){const p=(i-1)>>1;if(items[p][0]<=items[i][0])break;[items[p],items[i]]=[items[i],items[p]];i=p;}},
  pop(){const top=items[0],last=items.pop();if(items.length){items[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<items.length&&items[l][0]<items[m][0])m=l;if(r<items.length&&items[r][0]<items[m][0])m=r;if(m===i)break;[items[m],items[i]]=[items[i],items[m]];i=m;}}return top;}};
}
// Cheapest route under the same step rules as findPath; ties prefer fewer steps.
function cheapestPath(map,start,target,cost){
 const startKey=key(start.x,start.z),best=new Map([[startKey,0]]),previous=new Map([[startKey,null]]),heap=createHeap();heap.push(0,start);
 while(heap.size){
  const [d,t]=heap.pop(),k=key(t.x,t.z);if(d>best.get(k))continue;
  if(t===target){const route=[];let cursor=k;while(cursor!==startKey){route.unshift(map.get(cursor));cursor=previous.get(cursor);}return route;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nk=key(t.x+dx,t.z+dz),n=map.get(nk);if(!n||n.blocked||Math.abs(n.h-t.h)>.5)continue;
   const next=d+1+(n===target?0:cost(n));if(next<(best.get(nk)??Infinity)){best.set(nk,next);previous.set(nk,k);heap.push(next,n);}
  }
 }
 return null;
}
