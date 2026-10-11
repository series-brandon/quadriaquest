import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCityData,fillCity,buildCity} from './city-map.js';
import {cityProblems} from './city-checks.js';
import {kitStreetData} from './dev/kit-street.js';

const kinds=problems=>[...new Set(problems.map(p=>p.kind))].sort();
const check=data=>cityProblems(data,buildCity(data,{scene:new THREE.Group()}));
test('a clean little city has no errors',()=>{
 const data=createCityData({size:[20,16]});data.spawn=[10,12];
 data.buildings.push({x:4,z:4,desc:{name:'cottage',footprint:[3,3],doors:[{edge:'south',at:1}]}});
 assert.deepEqual(check(data).filter(p=>p.severity==='error'),[]);
});
test('checks find overlaps, a blocked doorstep, a terrace without stairs and stairs without a landing',()=>{
 const data=createCityData({size:[24,20]});data.spawn=[2,18];
 data.buildings.push({x:4,z:4,desc:{name:'cottage',footprint:[3,3],doors:[{edge:'south',at:1}]}});
 data.props.push({kind:'barrel',x:5,z:7},{kind:'crates',x:4,z:4});
 fillCity(data,{x0:14,z0:2,x1:20,z1:8},{h:2});
 data.stairs.push({x:10,z:15,dir:'e',length:2,width:1});
 const problems=check(data);
 for(const kind of ['overlap','door','unreachable','stairs'])assert.ok(kinds(problems).includes(kind),kind);
 assert.ok(problems.some(p=>p.kind==='door'&&/doorstep/.test(p.text)&&p.tile.join()==='5,7'),'the barrel on the doorstep');
 assert.ok(problems.some(p=>p.kind==='unreachable'&&p.severity==='warning'),'the terrace needs stairs');
 // Adding stairs up to the terrace clears it.
 data.stairs.length=0;data.stairs.push({x:16,z:10,dir:'n',length:2,width:2});
 assert.ok(!check(data).some(p=>p.kind==='unreachable'&&p.tile[0]>=14));
});
test('the kit street has no errors (warnings are its known narrow gaps)',()=>{
 const problems=check(kitStreetData());
 assert.deepEqual(problems.filter(p=>p.severity==='error').map(p=>p.text),[]);
});
test('separate interiors: the door leads in, the stairwell up and down, the door back out; the crypt too',async()=>{
 const {createSpaces}=await import('./spaces.js');const {createAreaRuntime}=await import('./area-runtime.js');
 const world=new Map(),scene=new THREE.Group(),areas=createAreaRuntime({world});
 const city=buildCity(kitStreetData(),{scene});city.areaId='kit';areas.register({id:'kit',group:city.group,tiles:city.tiles});areas.activate('kit');
 const spaces=createSpaces({areas,scene}),run=()=>{for(let i=0;i<10;i++)spaces.update(.1);};
 const guild=city.buildings.find(b=>b.plan.desc.name==='guild house');
 assert.ok(guild.plan.tiles.every(([x,z])=>city.tiles.get(`${x},${z}`).blocked),'solid outside');
 const door=guild.doors[0];assert.ok(door.link&&!door.locked);
 assert.ok(spaces.enter(door.link));run();assert.match(areas.id,/:f0$/);
 const ground=areas.active,inside=world.get(`${door.a.x},${door.a.z}`);assert.ok(inside&&!inside.blocked,'you arrive inside the door');
 const up=[...world.values()].find(t=>t.blocked&&t.indoor);assert.ok(up,'the stairwell');
 const well=ground.group.children.flatMap(c=>[c,...c.children]).find(o=>o.children?.[0]?.isMesh&&o.children[0].userData.actor?.kind==='stairwell')?.children[0].userData.actor;
 assert.equal(well.direction,'up');well.interact();run();assert.match(areas.id,/:f1$/);
 const down=[...world.values()].map(t=>t).find(t=>t.blocked&&t.indoor);assert.ok(down);
 // Back down and out through the door to the doorstep.
 assert.ok(spaces.enter({kind:'floor',city,building:city.buildings.indexOf(guild),floor:0}));run();
 const exit=areas.active.tiles&&[...world.values()].length;assert.ok(exit);
 const interiorDoor=spaces.resolve({kind:'interior',city,building:city.buildings.indexOf(guild),door:0});assert.ok(interiorDoor[1]);
 const [, doorstep]=spaces.resolve({kind:'exit',area:'kit',tile:[door.b.x,door.b.z]});assert.equal(doorstep,door.b);
 assert.ok(spaces.enter({kind:'exit',area:'kit',tile:[door.b.x,door.b.z]}));run();assert.equal(areas.id,'kit');
 // The crypt, from its entrance in the garden.
 const entrance=city.props.find(p=>p.kind==='dungeonEntrance');assert.ok(spaces.enter(entrance.link));run();assert.match(areas.id,/:d:crypt$/);
 assert.equal(areas.active.maxZoom,18);
 spaces.forget(city);assert.equal(areas.list().some(a=>a.id.includes(':d:')),true,'the active space is kept');
});
test('interior checks: floors, stairwell and dungeon exits',async()=>{
 const {interiorProblems}=await import('./spaces.js');
 const data=createCityData({size:[20,20]});
 data.buildings.push({x:2,z:2,desc:{name:'hall',footprint:[4,4],storeys:1,doors:[{edge:'south',at:1}],interior:'separate'},interior:{floors:2}});
 data.interiors.cave={kind:'dungeon',size:[3,3],exit:[5,5]};
 const kinds=interiorProblems(data).map(p=>p.text).join(' | ');
 assert.match(kinds,/2 interior floors for 1 storeys/);assert.match(kinds,/at least 4 × 4/);assert.match(kinds,/exit must be inside/);assert.match(kinds,/no entrance/);
 assert.deepEqual(interiorProblems(kitStreetData()),[]);
});
