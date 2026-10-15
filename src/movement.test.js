import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {key,setEdge,canStep,canMove,diagonalOk,eachStep,findPath,makeWorld,chebyshev,DIAGONAL_MOVES} from './world.js';
import {findFootprintPath,bodyMove,reachesBody,meleeGap} from './footprint.js';
import {withinAttackRange,attackRoute} from './combat-range.js';
import {COMBAT_GEOMETRY,tileDistance} from './combat-geometry.js';
import {createNavigator} from './townsfolk.js';
import {wanderRoute} from './wander.js';

// Movement (docs/MOVEMENT-PLAN.md): diagonal steps, the corner rule, and combat geometry.
const grid=(w=5,h=5)=>new Map(Array.from({length:w*h},(_,i)=>{const t={x:i%w,z:Math.floor(i/w),h:1,blocked:false,water:false};return [key(t.x,t.z),t];}));
const at=(m,x,z)=>m.get(key(x,z));

test('a diagonal step needs both corner tiles and all four edges clear, on level ground off stairs',()=>{
 const open=grid(),a=at(open,1,1),d=at(open,2,2);
 assert.equal(canMove(open,a,d),true);assert.equal(canStep(a,d),false,'the plain step rule refuses diagonals');
 assert.equal(canMove(open,a,d,{diagonal:false}),false);assert.equal(canMove(open,a,at(open,3,3)),false,'one tile at a time');
 const blockers={
  'a solid corner tile':m=>{at(m,2,1).blocked=true;},
  'the other corner':m=>{at(m,1,2).blocked=true;},
  'a wall end on the first leg':m=>setEdge(at(m,1,1),at(m,2,1),{kind:'wall'}),
  'a wall on the second leg':m=>setEdge(at(m,2,1),at(m,2,2),{kind:'wall'}),
  'a fence':m=>setEdge(at(m,1,1),at(m,1,2),{kind:'fence'}),
  'a window':m=>setEdge(at(m,1,2),at(m,2,2),{kind:'window'}),
  'a counter':m=>setEdge(at(m,1,1),at(m,2,1),{kind:'low'}),
  'a closed door':m=>setEdge(at(m,1,1),at(m,2,1),{kind:'door',open:false}),
  'a missing corner':m=>m.delete(key(2,1)),
  'a half-block ledge':m=>{at(m,2,2).h=1.5;},
  'a raised corner':m=>{at(m,2,1).h=1.5;},
  'stairs':m=>{at(m,2,2).stair=true;},
 };
 for(const [name,make] of Object.entries(blockers)){const m=grid();make(m);assert.equal(canMove(m,at(m,1,1),at(m,2,2)),false,name);}
 // A walker's own rule applies around the corner too (water for the companion and wanderers).
 const wet=grid();at(wet,2,1).water=true;assert.equal(diagonalOk(wet,at(wet,1,1),at(wet,2,2),(f,t)=>canStep(f,t)&&!t.water),false);
 // An open door doesn't let you cut through the doorway's corner either (the door rule puts walls beside it).
 const doorway=grid();setEdge(at(doorway,2,1),at(doorway,2,2),{kind:'door',open:true});setEdge(at(doorway,1,1),at(doorway,1,2),{kind:'wall'});
 assert.equal(canMove(doorway,at(doorway,1,1),at(doorway,2,2)),false);assert.equal(canMove(doorway,at(doorway,2,1),at(doorway,2,2)),true);
});

// Any diagonal can be replaced by its two orthogonal steps, so no map gains or loses reachable tiles.
function reachable(map,start,diagonal){const seen=new Set([start]),queue=[start];for(let i=0;i<queue.length;i++)eachStep(map,queue[i],n=>{if(!seen.has(n)){seen.add(n);queue.push(n);}},{diagonal});return seen;}
const mapsToCheck=async()=>{
 const {makeWillowbankTiles}=await import('./willowbank-rules.js'),{makeCinderholdTiles}=await import('./cinderhold-rules.js'),{buildMap}=await import('./world-map.js');
 const asMap=tiles=>new Map(tiles.map(t=>[key(t.x,t.z),t]));
 const built=file=>{const data=JSON.parse(readFileSync(new URL(`./maps/${file}`,import.meta.url),'utf8'));const b=buildMap(structuredClone(data),{scene:new THREE.Group()});return {tiles:b.tiles,spawn:b.tiles.get(key(...data.spawn))};};
 const clearing=makeWorld(),willow=asMap(makeWillowbankTiles()),cinder=asMap(makeCinderholdTiles());
 const first=m=>[...m.values()].find(t=>!t.blocked&&!t.water);
 return {clearing:{tiles:clearing,spawn:at(clearing,6,6)},willowbank:{tiles:willow,spawn:first(willow)},cinderhold:{tiles:cinder,spawn:first(cinder)},capital:built('capital.json'),overworld:built('overworld.json')};
};
test('diagonals change no map’s reachable tiles (clearing, Willowbank, Cinderhold, capital, overworld)',async()=>{
 for(const [name,{tiles,spawn}] of Object.entries(await mapsToCheck())){
  assert.ok(spawn,name);const plain=reachable(tiles,spawn,false),diag=reachable(tiles,spawn,true);
  assert.equal(diag.size,plain.size,name);for(const t of diag)assert.ok(plain.has(t),`${name} ${t.x},${t.z}`);
 }
});

test('routes take Chebyshev steps, run diagonally then straight, and are the same every time',()=>{
 const m=grid(9,9),route=findPath(m,at(m,0,0),at(m,6,3));
 assert.equal(route.length,6,'six steps: three diagonal, three straight');
 const turns=route.reduce((n,t,i)=>{if(i<2)return n;const p=route[i-1],q=route[i-2];return n+((t.x-p.x)!==(p.x-q.x)||(t.z-p.z)!==(p.z-q.z)?1:0);},0);
 assert.ok(turns<=1,`one turn at most, not a zigzag (${turns})`);
 assert.deepEqual(findPath(m,at(m,0,0),at(m,6,3)).map(t=>[t.x,t.z]),route.map(t=>[t.x,t.z]));
 assert.deepEqual(findPath(m,at(m,0,0),at(m,4,0)).map(t=>t.z),[0,0,0,0],'a straight line stays straight');
 assert.equal(findPath(m,at(m,0,0),at(m,6,3),null,{diagonal:false}).length,9,'without diagonals: Manhattan');
});

test('every walker group steps diagonally, and each can be switched off',()=>{
 const m=grid(7,7),saved={...DIAGONAL_MOVES};
 try{
  const nav=createNavigator(m);assert.equal(nav.route(at(m,0,0),at(m,3,3)).length,3,'townsfolk');
  assert.equal(findFootprintPath(m,at(m,0,0),1,t=>t===at(m,3,3)).length,3,'one-tile creatures');
  assert.equal(findFootprintPath(m,at(m,0,0),2,t=>t===at(m,3,3)).length,3,'bodies');
  DIAGONAL_MOVES.townsfolk=DIAGONAL_MOVES.enemy=DIAGONAL_MOVES.body=false;nav.clear();
  assert.equal(nav.route(at(m,0,0),at(m,3,3)).length,6);assert.equal(findFootprintPath(m,at(m,0,0),1,t=>t===at(m,3,3)).length,6);
  assert.equal(findFootprintPath(m,at(m,0,0),2,t=>t===at(m,3,3)).length,6);
  for(const r of [0,.3,.6,.99])for(const [i,t] of wanderRoute(m,at(m,3,3),{minX:0,maxX:6,minZ:0,maxZ:6},()=>false,()=>r).entries())assert.ok(i||Math.abs(t.x-3)+Math.abs(t.z-3)===1);
 }finally{Object.assign(DIAGONAL_MOVES,saved);}
 // A townsfolk diagonal never goes through a doorway.
 const d=grid();setEdge(at(d,1,1),at(d,1,2),{kind:'door',open:false});setEdge(at(d,2,1),at(d,2,2),{kind:'wall'});setEdge(at(d,0,1),at(d,0,2),{kind:'wall'});
 setEdge(at(d,3,1),at(d,3,2),{kind:'wall'});setEdge(at(d,4,1),at(d,4,2),{kind:'wall'});
 const path=createNavigator(d).route(at(d,0,0),at(d,2,3));assert.ok(path);
 for(let i=0,p=at(d,0,0);i<path.length;p=path[i++])if(p.z===1&&path[i].z===2)assert.equal(path[i].x,p.x,'through the doorway straight on');
});

test('a body steps diagonally only where it could take either L-shaped path',()=>{
 const m=grid(6,6);assert.equal(bodyMove(m,at(m,0,0),at(m,1,1),2),true);
 at(m,3,0).blocked=true;assert.equal(bodyMove(m,at(m,1,0),at(m,2,1),2),false,'the corner anchor would stand on a rock');
 const w=grid(6,6);setEdge(at(w,2,2),at(w,3,2),{kind:'wall'});assert.equal(bodyMove(w,at(w,1,1),at(w,2,2),2),false,'a wall through the swept corner');
 assert.equal(bodyMove(m,at(m,0,0),at(m,1,1),2,{allow:t=>t!==at(m,1,0)}),false,'placement rules hold on the way');
});

test('melee reach is cardinal by default; 8-way reaches diagonals round clear corners',()=>{
 const m=grid(),here=at(m,2,2),enemy={x:3,z:3,tile:at(m,3,3)};
 assert.equal(withinAttackRange(m,here,enemy,1),false,'a diagonal is out of melee reach');
 assert.equal(meleeGap(at(m,3,3),1,here),2);assert.equal(reachesBody(m,at(m,3,3),1,here),false);
 const saved={...COMBAT_GEOMETRY};
 try{
  COMBAT_GEOMETRY.meleeReach='8way';
  assert.equal(withinAttackRange(m,here,enemy,1),true);assert.equal(reachesBody(m,at(m,3,3),1,here),true);
  at(m,3,2).blocked=true;assert.equal(withinAttackRange(m,here,enemy,1),false,'a rock at the corner');at(m,3,2).blocked=false;
  setEdge(at(m,2,2),at(m,2,3),{kind:'wall'});assert.equal(withinAttackRange(m,here,enemy,1),false,'a wall end at the corner');
 }finally{Object.assign(COMBAT_GEOMETRY,saved);}
});

test('range, aggro and leash count Manhattan tiles by default; the metric can change',()=>{
 const m=grid(9,9),here=at(m,0,0),enemy={x:3,z:3,tile:at(m,3,3)};
 assert.equal(tileDistance(here,enemy),6);assert.equal(withinAttackRange(m,here,enemy,4),false);
 const saved={...COMBAT_GEOMETRY};
 try{
  COMBAT_GEOMETRY.metric='chebyshev';assert.equal(tileDistance(here,enemy),3);assert.equal(withinAttackRange(m,here,enemy,4),true);
  COMBAT_GEOMETRY.metric='euclidean';assert.ok(Math.abs(tileDistance(here,enemy)-Math.hypot(3,3))<1e-9);assert.equal(withinAttackRange(m,here,enemy,4),false);assert.equal(withinAttackRange(m,here,enemy,5),true);
 }finally{Object.assign(COMBAT_GEOMETRY,saved);}
});

test('the player’s attack approach ends on a cardinal reach tile, preferring a free one',()=>{
 const m=grid(9,9),enemy={x:6,z:6,tile:at(m,6,6)},start=at(m,0,0);
 const {at:spot,route}=attackRoute(m,start,enemy,1);
 assert.equal(Math.abs(spot.x-6)+Math.abs(spot.z-6),1,'cardinal, never the diagonal no-melee spot');assert.equal(route.at(-1),spot);assert.equal(route.length,chebyshev(start,spot));
 const taken=attackRoute(m,start,enemy,1,t=>t===spot);assert.notEqual(taken.at,spot);assert.equal(Math.abs(taken.at.x-6)+Math.abs(taken.at.z-6),1);
 // Every reach tile taken: it still goes to one.
 const all=attackRoute(m,start,enemy,1,t=>Math.abs(t.x-6)+Math.abs(t.z-6)===1);assert.ok(all);assert.equal(Math.abs(all.at.x-6)+Math.abs(all.at.z-6),1);
 assert.equal(attackRoute(m,at(m,6,5),enemy,1).route.length,0,'already in reach');
});
