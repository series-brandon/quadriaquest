import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundItemModel} from './ground-item-models.js';
import {setWorldOccupancy,blocksMovement} from './world-occupancy.js';
import {findPath,key} from './world.js';

test('all shared ground pickups remain traversable through spawn, collection, respawn and reset',()=>{
 for(const kind of ['sticks','stones','flint']){
  const tiles=[0,1,2].map(x=>({x,z:0,h:1,water:false,blocked:false}));
  const world=new Map(tiles.map(t=>[key(t.x,t.z),t]));
  const item={group:createGroundItemModel(kind),tile:tiles[1]};
  assert.equal(blocksMovement(item),false);
  for(const present of [true,false,true,true]){
   setWorldOccupancy(item,present);
   assert.equal(item.tile.blocked,false);
   assert.equal(findPath(world,tiles[0],tiles[2]).length,2);
   assert.equal(findPath(world,tiles[0],tiles[1]).length,1);
  }
  item.tile.blocked=true;setWorldOccupancy(item,false);
  assert.equal(item.tile.blocked,true,'collecting a pickup must not unblock another occupant');
 }
});
test('solid world actors still block when present and release when removed',()=>{
 const actor={group:{userData:{}},tile:{blocked:false}};
 setWorldOccupancy(actor,true);assert.equal(actor.tile.blocked,true);
 setWorldOccupancy(actor,false);assert.equal(actor.tile.blocked,false);
});
