import test from 'node:test';
import assert from 'node:assert/strict';
import {BOULDER_TILES,miningMotion,MINING_DURATION} from './mining.js';
import {makeWorld,findPath,key,SPAWN} from './world.js';
test('three replaced trees remain reachable for mining from the spawn',()=>{
 const world=makeWorld(),spawn=world.get(key(SPAWN.x,SPAWN.z));assert.equal(BOULDER_TILES.size,3);
 for(const id of BOULDER_TILES){const t=world.get(id);assert.ok(t.blocked&&!t.water);assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const n=world.get(key(t.x+dx,t.z+dz));return n&&Math.abs(n.h-t.h)<=.5&&findPath(world,spawn,n)!==null;}));}
});
test('mining swing loops smoothly with both hands participating',()=>{
 assert.deepEqual(miningMotion(0),miningMotion(MINING_DURATION));
 assert.notDeepEqual(miningMotion(0).right,miningMotion(.4).right);
 assert.notDeepEqual(miningMotion(0).left,miningMotion(.4).left);
});
