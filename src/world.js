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
// Walls and doors on tile edges (docs/CITY.md, Walls and doors on tile edges). A tile stores the
// features on its north (-z) and west (-x) edges in `tile.edges`, so every edge is stored once.
// move: walkers may cross; sight: shots and line of sight pass; reach: melee and interaction work
// across it (a shop counter is `low`). A door is like a wall while closed and like no edge at all while
// open: someone has to open it first (doors.js); locked doors never open.
export const EDGE_RULES={
 wall:{move:false,sight:false,reach:false},
 window:{move:false,sight:true,reach:false},
 fence:{move:false,sight:true,reach:false},
 railing:{move:false,sight:true,reach:false},
 low:{move:false,sight:true,reach:true},
};
export function edgeBetween(a,b){
 if(!a||!b)return null;
 if(b.x===a.x&&b.z===a.z-1)return a.edges?.n||null;
 if(b.x===a.x&&b.z===a.z+1)return b.edges?.n||null;
 if(b.z===a.z&&b.x===a.x-1)return a.edges?.w||null;
 if(b.z===a.z&&b.x===a.x+1)return b.edges?.w||null;
 return null;
}
// Put a feature ({kind, …}; a door is its own entity, doors.js) on the edge between two neighbouring
// tiles, or clear it with null.
export function setEdge(a,b,feature){
 const [owner,side]=b.z===a.z-1?[a,'n']:b.z===a.z+1?[b,'n']:b.x===a.x-1?[a,'w']:b.x===a.x+1?[b,'w']:[null];
 if(!owner)throw Error('setEdge needs neighbouring tiles');
 owner.edges||={};if(feature)owner.edges[side]=feature;else{delete owner.edges[side];if(!Object.keys(owner.edges).length)delete owner.edges;}
}
export function edgePasses(edge,what){
 if(!edge)return true;
 if(edge.kind==='door')return !!edge.open&&!edge.locked;
 return !!EDGE_RULES[edge.kind]?.[what];
}
// The one step rule every walker shares: the next tile exists, is not solid, is at most half a block
// up or down, and no wall, window, fence or locked door stands on the edge between.
export const canStep=(from,to)=>!!to&&!to.blocked&&Math.abs(to.h-from.h)<=.5&&edgePasses(edgeBetween(from,to),'move');
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
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nk=key(t.x+dx,t.z+dz),n=map.get(nk);if(!canStep(t,n)||previous.has(nk))continue;previous.set(nk,k);queue.push(nk);}
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
   const nk=key(t.x+dx,t.z+dz),n=map.get(nk);if(!canStep(t,n))continue;
   const next=d+1+(n===target?0:cost(n));if(next<(best.get(nk)??Infinity)){best.set(nk,next);previous.set(nk,k);heap.push(next,n);}
  }
 }
 return null;
}
