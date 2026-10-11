import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {findPath,key} from '../world.js';
import {createBuildingTestMap,BUILDING_TEST} from './building-test-map.js';

test('every building is sealed until a door is opened, and each complex room only opens through its own door',()=>{
 const built=createBuildingTestMap({scene:new Group(),pickables:[]}),t=(x,z)=>built.tiles.get(key(x,z)),reach=(x,z)=>findPath(built.tiles,built.spawn,t(x,z));
 const {small,large,complex}=BUILDING_TEST;
 assert.equal(built.doors.length,1+2+1+4,'small 1, large 2, complex front door + 4 rooms');
 assert.ok(built.doors.every(d=>!d.open),'every door starts closed');
 for(const b of [small,large,complex])assert.equal(reach(b.x0,b.z0),null,'sealed while its doors are closed');
 const doorAt=(x,z)=>built.doors.find(d=>d.a===t(x,z)||d.b===t(x,z));
 doorAt(5,6).setOpen(true);assert.ok(reach(5,5),'small house: its one door');
 doorAt(13,9).setOpen(true);assert.ok(reach(12,6),'large hall: south door');doorAt(13,9).setOpen(false);doorAt(17,6).setOpen(true);assert.ok(reach(12,6),'large hall: east door too');
 doorAt(24,13).setOpen(true);assert.ok(reach(24,5),'complex: the hallway through the front door');
 for(const [room,[dx,dz]] of [[[22,5],[23,6]],[[22,12],[23,11]],[[27,5],[26,5]],[[27,12],[26,10]]]){
  assert.equal(reach(...room),null,`room at ${room} is shut`);doorAt(dx,dz).setOpen(true);assert.ok(reach(...room),`room at ${room} through its door`);doorAt(dx,dz).setOpen(false);
 }
});
