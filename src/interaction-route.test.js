import test from 'node:test';
import assert from 'node:assert/strict';
import {interactionRoute} from './interaction-route.js';
import {makeWorld,key,SPAWN} from './world.js';
test('all clearing pickups use reachable adjacent tiles, never the resource tile',()=>{
 const world=makeWorld(),start=world.get(key(SPAWN.x,SPAWN.z));
 for(const [x,z]of [[4,6],[5,3],[8,3],[7,7],[9,9],[4,10]]){
  const tile=world.get(key(x,z)),result=interactionRoute(world,start,{x,z,tile});assert.ok(result);assert.equal(Math.abs(result.at.x-x)+Math.abs(result.at.z-z),1);assert.notEqual(result.at,tile);
 }
});
test('adjacent interaction reports blocked targets and accepts standing in range',()=>{
 const world=new Map();for(let x=0;x<3;x++)for(let z=0;z<3;z++)world.set(key(x,z),{x,z,h:1,blocked:false});
 const tile=world.get('1,1'),start=world.get('0,1'),target={x:1,z:1,tile};assert.deepEqual(interactionRoute(world,start,target).route,[]);
 for(const t of world.values())if(t!==tile)t.blocked=true;assert.equal(interactionRoute(world,start,target),null);
});
test('interaction and attack spots prefer tiles where no other character stands',async()=>{
 const {attackRoute}=await import('./combat-range.js');
 const map=new Map(Array.from({length:25},(_,i)=>{const t={x:i%5,z:Math.floor(i/5),h:1,blocked:false,water:false};return [key(t.x,t.z),t];}));
 const start=map.get('2,0'),tile=map.get('2,2'),target={x:2,z:2,tile},near=map.get('2,1');
 assert.equal(interactionRoute(map,start,target).at,near);
 const free=interactionRoute(map,start,target,t=>t===near);assert.notEqual(free.at,near);assert.ok(free.route.length>1);
 assert.equal(interactionRoute(map,start,target,()=>true).at,near,'everyone occupied: still reachable, shortest wins');
 assert.equal(attackRoute(map,start,target,1).at,near);
 assert.notEqual(attackRoute(map,start,target,1,t=>t===near).at,near);
});
test('you can talk across a counter: standing on its far side counts as next to the keeper',async()=>{
 const {interactionRoute}=await import('./interaction-route.js');
 const map=new Map();for(let z=0;z<6;z++)for(let x=0;x<3;x++)map.set(`${x},${z}`,{x,z,h:1,blocked:false});
 const keeper={x:1,z:1,tile:map.get('1,1')};for(let x=0;x<3;x++){const c=map.get(`${x},2`);c.blocked=true;c.reachOver=true;}
 const route=interactionRoute(map,map.get('1,5'),keeper);assert.ok(route,'reachable over the counter');assert.equal(route.at,map.get('1,3'));
 for(let x=0;x<3;x++)delete map.get(`${x},2`).reachOver;
 assert.equal(interactionRoute(map,map.get('1,5'),keeper),null,'a plain wall of crates is not a counter');
});
