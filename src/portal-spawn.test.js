import test from 'node:test';
import assert from 'node:assert/strict';
import {portalSpawn} from './portal-spawn.js';
import {key} from './world.js';
const crystal={x:6,z:6,h:2};
const mapOf=tiles=>new Map(tiles.map(t=>[key(t.x,t.z),t]));
test('arrival is a valid cardinal neighbor, including half-height steps',()=>{
 const tile={x:7,z:6,h:1.5};
 assert.equal(portalSpawn(mapOf([crystal,tile,{x:7,z:7,h:2}]),crystal),tile);
});
test('arrival rejects water, obstacles, tall ledges and missing tiles',()=>{
 const map=mapOf([{x:6,z:7,h:2,water:true},{x:7,z:6,h:2,blocked:true},{x:6,z:5,h:1},{x:7,z:7,h:2}]);
 assert.equal(portalSpawn(map,crystal),null);
 map.set('5,6',{x:5,z:6,h:2});assert.equal(portalSpawn(map,crystal),map.get('5,6'));
 assert.equal(portalSpawn(map,null),null);
});
