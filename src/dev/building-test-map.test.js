import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {findPath,key} from '../world.js';
import {createBuildingTestMap,BUILDING_TEST,SHAPES,shapeCells,shapeDoorIds} from './building-test-map.js';

test('every building is sealed until a door is opened, and each complex room only opens through its own door',()=>{
 const built=createBuildingTestMap({scene:new Group(),pickables:[]}),t=(x,z)=>built.tiles.get(key(x,z)),reach=(x,z)=>findPath(built.tiles,built.spawn,t(x,z));
 const {small,large,complex}=BUILDING_TEST;
 assert.equal(built.doors.length,1+2+1+4+SHAPES.reduce((n,s)=>n+s.doors.length,0),'small 1, large 2, complex front door + 4 rooms, plus the shapes');
 assert.ok(built.doors.every(d=>!d.open),'every door starts closed');
 for(const b of [small,large,complex])assert.equal(reach(b.x0,b.z0),null,'sealed while its doors are closed');
 const doorAt=(x,z)=>built.doors.find(d=>d.a===t(x,z)||d.b===t(x,z));
 doorAt(5,6).setOpen(true);assert.ok(reach(5,5),'small house: its one door');
 doorAt(13,9).setOpen(true);assert.ok(reach(12,6),'large hall: south door');doorAt(13,9).setOpen(false);doorAt(17,6).setOpen(true);assert.ok(reach(12,6),'large hall: east door too');
 doorAt(25,13).setOpen(true);assert.ok(reach(24,5)&&reach(26,5),'complex: the 3-wide hallway through the front door');
 for(const [room,[dx,dz]] of [[[22,5],[23,6]],[[22,12],[23,11]],[[28,5],[26,5]],[[28,12],[26,10]]]){
  assert.equal(reach(...room),null,`room at ${room} is shut`);doorAt(dx,dz).setOpen(true);assert.ok(reach(...room),`room at ${room} through its door`);doorAt(dx,dz).setOpen(false);
 }
});
test('L, split L, T, U, + and S/Z buildings: sealed until a door opens, every indoor tile reachable through its own doors, and split parts never joined',()=>{
 const built=createBuildingTestMap({scene:new Group(),pickables:[]}),t=(x,z)=>built.tiles.get(key(x,z)),reach=(x,z)=>!!findPath(built.tiles,built.spawn,t(x,z));
 const doorAt=id=>{const [x,z,side]=id.split(','),d={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]}[side],a=t(+x,+z),b=t(+x+d[0],+z+d[1]);return built.doors.find(door=>door.a===a&&door.b===b||door.a===b&&door.b===a);};
 for(const shape of SHAPES){
  const cells=[...shapeCells(shape)].map(([k,part])=>({tile:t(...k.split(',').map(Number)),part}));
  assert.ok(cells.every(c=>!reach(c.tile.x,c.tile.z)),`${shape.name}: sealed`);
  for(const id of shapeDoorIds(shape)){assert.ok(doorAt(id),`${shape.name}: door ${id}`);doorAt(id).setOpen(true);}
  assert.ok(cells.every(c=>reach(c.tile.x,c.tile.z)),`${shape.name}: every indoor tile reachable with its doors open`);
  for(const id of shapeDoorIds(shape))doorAt(id).setOpen(false);
 }
 // The split L: open only the long part's door; the short part stays shut behind the joining wall.
 const split=SHAPES.find(s=>s.name.startsWith('L (two')),parts=[...shapeCells(split)];
 doorAt(shapeDoorIds(split)[0]).setOpen(true);
 for(const [k,part] of parts){const [x,z]=k.split(',').map(Number);assert.equal(reach(x,z),part==='A',`split L tile ${k} (${part})`);}
 doorAt(shapeDoorIds(split)[0]).setOpen(false);
 // The U's courtyard is outdoors: reachable with every door shut.
 assert.ok(reach(30,26)&&reach(32,27),'courtyard');
});
