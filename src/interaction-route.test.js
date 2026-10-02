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
