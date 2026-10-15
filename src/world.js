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
// The one step rule every walker shares, between orthogonal neighbours: the next tile exists, is not
// solid, is at most half a block up or down, and no wall, window, fence or locked door stands on the
// edge between. Anything that isn't an orthogonal neighbour is refused here (edgeBetween only knows
// those edges); diagonal steps go through canMove.
export const canStep=(from,to)=>!!from&&!!to&&Math.abs(to.x-from.x)+Math.abs(to.z-from.z)===1&&!to.blocked&&Math.abs(to.h-from.h)<=.5&&edgePasses(edgeBetween(from,to),'move');
export function makeWorld(){
 const map=new Map();rows.forEach((row,z)=>[...row].forEach((v,x)=>{if(v!==' ')map.set(key(x,z),{x,z,h:Number(v)/2,blocked:false,water:false});}));
 for(const [x,z] of [[2,3],[3,3],[2,4],[3,4],[4,4],[3,5]]){const t=map.get(key(x,z));t.water=true;t.blocked=true;}
 for(const [x,z] of [[3,1],[7,1],[10,3],[1,7],[3,9],[10,9],[8,11]])map.get(key(x,z)).blocked=true;
 // A high lookout deliberately has no safe route from its immediate neighbors.
 map.get(key(10,6)).h=2.5;map.get(key(10,7)).h=2.5;
 return map;
}
// Movement (docs/MOVEMENT-PLAN.md). Walkers step to the four orthogonal neighbours and, where their
// group allows it, to the four diagonals. A diagonal takes as long as any other step (RuneScape-style),
// so every step costs 1 and route length is Chebyshev distance.
export const ORTHOGONAL=[[1,0],[-1,0],[0,1],[0,-1]],DIAGONAL=[[1,1],[-1,1],[1,-1],[-1,-1]];
// Which walker groups step diagonally. Bodies are multi-tile creatures (footprint.js). The playground
// flips these to compare.
export const DIAGONAL_MOVES={player:true,companion:true,npc:true,townsfolk:true,enemy:true,body:true};
export const chebyshev=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z));
const level=(a,b)=>Math.abs(a.h-b.h)<.01&&!a.stair&&!b.stair;
// The corner rule for a diagonal from `from` to `to`: both orthogonal tiles beside it exist, all four tiles
// are level and off stairs (hops and ramps stay orthogonal), and both L-shaped paths around the corner
// are steps `corner` allows. So a diagonal never cuts past a solid tile, water, a wall end or a doorway,
// and anything reachable is still reachable without diagonals.
export function diagonalOk(map,from,to,corner=canStep){
 const b=map.get(key(to.x,from.z)),c=map.get(key(from.x,to.z));
 return !!b&&!!c&&level(from,to)&&level(from,b)&&level(from,c)&&corner(from,b)&&corner(b,to)&&corner(from,c)&&corner(c,to);
}
// Whether a walker may take this one step: orthogonal by `passable`, diagonal by the corner rule.
export function canMove(map,from,to,{diagonal=true,passable=canStep,corner=passable}={}){
 if(!from||!to)return false;const dx=Math.abs(to.x-from.x),dz=Math.abs(to.z-from.z);
 if(dx+dz===1)return passable(from,to);
 return diagonal&&dx===1&&dz===1&&diagonalOk(map,from,to,corner);
}
// Calls visit(n) for each tile a walker may step to from t: orthogonal neighbours first, then diagonals.
export function eachStep(map,t,visit,{diagonal=false,passable=canStep,corner=passable}={}){
 for(const [dx,dz] of ORTHOGONAL){const n=map.get(key(t.x+dx,t.z+dz));if(n&&passable(t,n))visit(n);}
 if(diagonal)for(const [dx,dz] of DIAGONAL){const n=map.get(key(t.x+dx,t.z+dz));if(n&&diagonalOk(map,t,n,corner))visit(n);}
}

// A tiny binary heap of [priority, item]; equal priorities pop in push order, so searches are
// deterministic (a future server must agree with the client).
export function createHeap(){
 const items=[];let order=0;
 const less=(a,b)=>a[0]<b[0]||a[0]===b[0]&&a[2]<b[2];
 return {get size(){return items.length;},
  push(priority,item){items.push([priority,item,order++]);let i=items.length-1;while(i>0){const p=(i-1)>>1;if(!less(items[i],items[p]))break;[items[p],items[i]]=[items[i],items[p]];i=p;}},
  pop(){const top=items[0],last=items.pop();if(items.length){items[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<items.length&&less(items[l],items[m]))m=l;if(r<items.length&&less(items[r],items[m]))m=r;if(m===i)break;[items[m],items[i]]=[items[i],items[m]];i=m;}}return top;}};
}
// The one route search every walker uses (A* toward `target`, Dijkstra without one).
//   expand(t, add, cost): calls add(n, stepCost) for each step from t (reached at `cost`).
//   target: a tile to head for (Chebyshev heuristic; the nearer tile in a straight line breaks ties, so
//           routes run diagonally first, then straight, instead of zigzagging).
//   goal(t, cost): the search ends on the first tile it holds for (the start excluded); default: t === target.
//   near: the heuristic's slack for a goal around the target (1 for "beside it").
//   limit: at most this many tiles expanded.
// Returns {end, cost, previous, best}; end is null when no goal was found.
export function searchRoute(start,expand,{target=null,goal=null,near=0,limit=Infinity}={}){
 const best=new Map([[start,0]]),previous=new Map([[start,null]]),done=new Set(),heap=createHeap();
 const h=target?t=>Math.max(0,chebyshev(t,target)-near)+.001*Math.hypot(t.x-target.x,t.z-target.z):()=>0;
 const isGoal=goal||(t=>t===target);
 heap.push(h(start),start);
 let expanded=0;
 while(heap.size&&expanded<limit){
  const [,t]=heap.pop();if(done.has(t))continue;done.add(t);
  const d=best.get(t);
  if(t!==start&&isGoal(t,d))return {end:t,cost:d,previous,best};
  expanded++;
  expand(t,(n,step)=>{const nd=d+step;if(nd<(best.get(n)??Infinity)){best.set(n,nd);previous.set(n,t);heap.push(nd+h(n),n);}},d);
 }
 return {end:null,cost:Infinity,previous,best};
}
// The tiles from just after the start to `end`, following `previous`.
export function routeTo(previous,end){const route=[];for(let t=end;previous.get(t)!==null&&t!==undefined;t=previous.get(t))route.unshift(t);return route;}
// The player's route (and anyone's shortest route between two tiles). cost(tile): extra cost of
// stepping onto a tile (occupied tiles, world-occupancy.js); the target's own cost doesn't count.
// diagonal: whether diagonal steps are allowed (the player's setting by default).
export function findPath(map,start,end,cost=null,{diagonal=DIAGONAL_MOVES.player,passable=canStep,limit=Infinity}={}){
 const target=map.get(key(end.x,end.z));if(!target||target.blocked)return null;
 const from=map.get(key(start.x,start.z))||start;if(from===target)return [];
 const options={diagonal,passable};
 const {end:found,previous}=searchRoute(from,(t,add)=>eachStep(map,t,n=>add(n,1+(cost&&n!==target?cost(n):0)),options),{target,limit});
 return found?routeTo(previous,found):null;
}
