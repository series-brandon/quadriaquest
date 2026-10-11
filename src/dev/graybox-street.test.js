import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {findPath,key} from '../world.js';
import {createGrayboxStreet,GRAYBOX,BUILDINGS} from './graybox-street.js';

test('graybox street: houses open through their doors at street level, shells stay sealed, the city is flat',()=>{
 const built=createGrayboxStreet({scene:new Group(),pickables:[]}),t=(x,z)=>built.tiles.get(key(x,z)),route=(x,z)=>findPath(built.tiles,built.spawn,t(x,z));
 assert.ok(built.edges.baked,'static walls are baked');
 for(const b of BUILDINGS){
  const inside=t(b.x0+1,b.z0+1);
  assert.equal(route(inside.x,inside.z),null,`${b.name}: sealed`);
  if(!b.door)continue;
  const door=built.doors.find(d=>d.a.x>=b.x0&&d.a.x<=b.x1&&d.a.z>=b.z0&&d.a.z<=b.z1);assert.ok(door,`${b.name}: has its door`);
  if(b.kind==='shell'){assert.equal(door.locked,true,`${b.name}: locked`);continue;}
  door.setOpen(true);assert.ok(route(inside.x,inside.z),`${b.name}: reachable through its door`);
  assert.equal(door.a.h,door.b.h,`${b.name}: the ground floor is at street level (no step)`);
  assert.ok(door.a.indoor&&!door.b.indoor,`${b.name}: indoor tiles marked for the minimap`);
  door.setOpen(false);
 }
 // The city is flat for now: every tile at one level, and the castle door reached from the square.
 assert.ok([...built.tiles.values()].every(tile=>tile.h===1),'flat');
 assert.ok(route(30,8),'the castle door from the square');
 assert.equal(built.tiles.get(key(...GRAYBOX.crystal)).blocked,true);
});
test('the square is ringed by multi-storey buildings opening onto it, with gaps only for the avenue and streets',()=>{
 const {plaza}=GRAYBOX,ring=BUILDINGS.filter(b=>b.name.startsWith('square '));
 assert.equal(ring.length,8);assert.ok(ring.every(b=>b.storeys>=2),'two and three storeys');
 for(const b of ring){const [x,z,side]=b.door.split(','),d={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]}[side],ox=+x+d[0],oz=+z+d[1];
  assert.ok(ox>=plaza.x0&&ox<=plaza.x1&&oz>=plaza.z0&&oz<=plaza.z1,`${b.name}: opens onto the square`);}
});
test('kit street: the same layout built by the building kit keeps every route, door and seal',async()=>{
 const built=createGrayboxStreet({scene:new Group(),pickables:[],kit:true}),t=(x,z)=>built.tiles.get(key(x,z)),route=(x,z)=>findPath(built.tiles,built.spawn,t(x,z));
 assert.equal(built.roofs.length,built.buildings.length,'one roof per building');assert.equal(built.buildings.length,BUILDINGS.length+2,'the layout plus the annex cottage and guild house');
 for(const b of BUILDINGS){
  const inside=t(b.x0+1,b.z0+1);assert.equal(route(inside.x,inside.z),null,`${b.name}: sealed`);
  if(!b.door)continue;
  const door=built.doors.find(d=>d.a.x>=b.x0&&d.a.x<=b.x1&&d.a.z>=b.z0&&d.a.z<=b.z1);assert.ok(door,`${b.name}: has its door`);
  if(b.kind==='shell'){assert.equal(door.locked,true);continue;}
  // Furnished rooms: walk in to the door's inside tile (furniture may stand elsewhere).
  door.setOpen(true);assert.ok(route(door.a.x,door.a.z),`${b.name}: reachable through its door`);door.setOpen(false);
 }
 // The terraced row shares its walls: one wall per shared edge, owned by both houses.
 const i=BUILDINGS.findIndex(b=>b.name==='terraced house 1'),shared=built.edges.info(t(45,35),t(46,35));
 assert.equal(shared.kind,'wall');assert.deepEqual(shared.owners.sort(),[i,i+1]);
 assert.equal(built.edges.doorProblems().length,0);
});
