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
export const key = (x,z) => `${x},${z}`;
export function makeWorld(){
 const map=new Map();rows.forEach((row,z)=>[...row].forEach((v,x)=>{if(v!==' ')map.set(key(x,z),{x,z,h:Number(v)/2,blocked:false,water:false});}));
 for(const [x,z] of [[2,3],[3,3],[2,4],[3,4],[4,4],[3,5]]){const t=map.get(key(x,z));t.water=true;t.blocked=true;}
 for(const [x,z] of [[3,1],[7,1],[10,3],[1,7],[3,9],[10,9],[8,11]])map.get(key(x,z)).blocked=true;
 // A high lookout deliberately has no safe route from its immediate neighbors.
 map.get(key(10,6)).h=2.5;map.get(key(10,7)).h=2.5;
 return map;
}
export function findPath(map,start,end){
 const target=map.get(key(end.x,end.z));if(!target||target.blocked)return null;
 const startKey=key(start.x,start.z),endKey=key(end.x,end.z),queue=[startKey],previous=new Map([[startKey,null]]);
 for(let i=0;i<queue.length;i++){
  const k=queue[i];if(k===endKey){const route=[];let cursor=k;while(cursor!==startKey){route.unshift(map.get(cursor));cursor=previous.get(cursor);}return route;}
  const t=map.get(k);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nk=key(t.x+dx,t.z+dz),n=map.get(nk);if(!n||n.blocked||Math.abs(n.h-t.h)>.5||previous.has(nk))continue;previous.set(nk,k);queue.push(nk);}
 }
 return null;
}
