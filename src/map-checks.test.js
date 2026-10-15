import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMapData,fillMap,buildMap} from './world-map.js';
import {mapProblems} from './map-checks.js';
import {kitStreetData} from './dev/kit-street.js';
import {CHUNK} from './world-grid.js';

const kinds=problems=>[...new Set(problems.map(p=>p.kind))].sort();
const check=data=>mapProblems(data,buildMap(data,{scene:new THREE.Group()}));
test('a clean little city has no errors',()=>{
 const data=createMapData({size:[20,16]});data.spawn=[10,12];
 data.buildings.push({x:4,z:4,desc:{name:'cottage',footprint:[3,3],doors:[{edge:'south',at:1}]}});
 assert.deepEqual(check(data).filter(p=>p.severity==='error'),[]);
});
test('a building must fit inside one chunk: crossing a chunk or region line is an error',()=>{
 const C=CHUNK,data=createMapData({size:[C*2,20]});data.spawn=[2,18];
 data.buildings.push({x:C-2,z:4,desc:{name:'straddler',footprint:[4,3],doors:[{edge:'south',at:1}]}});
 const crossing=check(data).filter(p=>p.kind==='chunks');
 assert.equal(crossing.length,1);assert.equal(crossing[0].severity,'error');assert.match(crossing[0].text,/straddler crosses a chunk line/);
 data.buildings[0].x=C;assert.deepEqual(check(data).filter(p=>p.kind==='chunks'),[],'moved wholly into the next chunk');
});
test('checks find overlaps, a blocked doorstep, a terrace without stairs and stairs without a landing',()=>{
 const data=createMapData({size:[24,20]});data.spawn=[2,18];
 data.buildings.push({x:4,z:4,desc:{name:'cottage',footprint:[3,3],doors:[{edge:'south',at:1}]}});
 data.props.push({kind:'barrel',x:5,z:7},{kind:'crates',x:4,z:4});
 fillMap(data,{x0:14,z0:2,x1:20,z1:8},{h:2});
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
 assert.deepEqual(problems.filter(p=>p.kind==='furniture').map(p=>p.text),[],'every bed, stove and counter is reachable');
});
test('separate interiors: the door leads in, the stairwell up and down, the door back out; the crypt too',async()=>{
 const {createSpaces}=await import('./spaces.js');const {createAreaRuntime}=await import('./area-runtime.js');
 const world=new Map(),scene=new THREE.Group(),areas=createAreaRuntime({world});
 const builtMap=buildMap(kitStreetData(),{scene});builtMap.areaId='kit';areas.register({id:'kit',group:builtMap.group,tiles:builtMap.tiles});areas.activate('kit');
 const spaces=createSpaces({areas,scene}),run=()=>{for(let i=0;i<10;i++)spaces.update(.1);};
 const guild=builtMap.buildings.find(b=>b.plan.desc.name==='guild house');
 assert.ok(guild.plan.tiles.every(([x,z])=>builtMap.tiles.get(`${x},${z}`).blocked),'solid outside');
 const door=guild.doors[0];assert.ok(door.link&&!door.locked);
 assert.ok(spaces.enter(door.link));run();assert.match(areas.id,/:f0$/);
 const ground=areas.active,inside=world.get(`${door.a.x},${door.a.z}`);assert.ok(inside&&!inside.blocked,'you arrive inside the door');
 const up=[...world.values()].find(t=>t.blocked&&t.indoor);assert.ok(up,'the stairwell');
 const well=ground.group.children.flatMap(c=>[c,...c.children]).find(o=>o.children?.[0]?.isMesh&&o.children[0].userData.actor?.kind==='stairwell')?.children[0].userData.actor;
 assert.equal(well.direction,'up');well.interact();run();assert.match(areas.id,/:f1$/);
 const down=[...world.values()].map(t=>t).find(t=>t.blocked&&t.indoor);assert.ok(down);
 // Back down and out through the door to the doorstep.
 assert.ok(spaces.enter({kind:'floor',builtMap,building:builtMap.buildings.indexOf(guild),floor:0}));run();
 const exit=areas.active.tiles&&[...world.values()].length;assert.ok(exit);
 const interiorDoor=spaces.resolve({kind:'interior',builtMap,building:builtMap.buildings.indexOf(guild),door:0});assert.ok(interiorDoor[1]);
 const [, doorstep]=spaces.resolve({kind:'exit',area:'kit',tile:[door.b.x,door.b.z]});assert.equal(doorstep,door.b);
 assert.ok(spaces.enter({kind:'exit',area:'kit',tile:[door.b.x,door.b.z]}));run();assert.equal(areas.id,'kit');
 // The crypt, from its entrance in the garden.
 const entrance=builtMap.props.find(p=>p.kind==='dungeonEntrance');assert.ok(spaces.enter(entrance.link));run();assert.match(areas.id,/:d:crypt$/);
 assert.equal(areas.active.maxZoom,18);
 spaces.forget(builtMap);assert.equal(areas.list().some(a=>a.id.includes(':d:')),true,'the active space is kept');
});
test('interior checks: floors, stairwell and dungeon exits',async()=>{
 const {interiorProblems}=await import('./spaces.js');
 const data=createMapData({size:[20,20]});
 data.buildings.push({x:2,z:2,desc:{name:'hall',footprint:[4,4],storeys:1,doors:[{edge:'south',at:1}],interior:'separate'},interior:{floors:2}});
 data.interiors.cave={kind:'dungeon',size:[3,3],exit:[5,5]};
 const kinds=interiorProblems(data).map(p=>p.text).join(' | ');
 assert.match(kinds,/2 interior floors for 1 storeys/);assert.match(kinds,/at least 4 × 4/);assert.match(kinds,/exit must be inside/);assert.match(kinds,/no entrance/);
 assert.deepEqual(interiorProblems(kitStreetData()),[]);
});
test('interior stairs are two tiles along a wall into a corner, their bottom reachable from the door',async()=>{
 const {stairsPlacements,createSpaces}=await import('./spaces.js');const {planBuilding}=await import('./building-kit.js');const {createAreaRuntime}=await import('./area-runtime.js');const {findPath}=await import('./world.js');
 const plan=planBuilding({footprint:[5,4],doors:[{edge:'south',at:2}]},[0,0]),[p]=stairsPlacements(plan);
 assert.equal(Math.abs(p.top[0]-p.bottom[0])+Math.abs(p.top[1]-p.bottom[1]),1,'two tiles');
 assert.ok([0,plan.w-1].includes(p.top[0])&&[0,plan.d-1].includes(p.top[1]),'the top is a corner');
 assert.equal(p.front[0]-p.bottom[0],p.bottom[0]-p.top[0]);assert.equal(p.front[1]-p.bottom[1],p.bottom[1]-p.top[1]);
 const world=new Map(),scene=new THREE.Group(),areas=createAreaRuntime({world});
 const builtMap=buildMap(kitStreetData(),{scene});builtMap.areaId='kit';areas.register({id:'kit',group:builtMap.group,tiles:builtMap.tiles});areas.activate('kit');
 const spaces=createSpaces({areas,scene}),run=()=>{for(let i=0;i<10;i++)spaces.update(.1);};
 const guild=builtMap.buildings.find(b=>b.plan.desc.name==='guild house');spaces.enter(guild.doors[0].link);run();
 const ground=areas.active,inside=world.get(`${guild.doors[0].a.x},${guild.doors[0].a.z}`);
 const up=ground.group.children.flatMap(c=>[c,...c.children]).map(o=>o.children?.[0]?.userData?.actor).find(a=>a?.kind==='stairwell');
 assert.ok(findPath(world,inside,up.place.front),'from the door to the foot of the stairs');
 assert.ok(up.place.bottom.blocked&&up.place.top.blocked);
 up.interact();run();
 const down=areas.active.group.children.flatMap(c=>[c,...c.children]).map(o=>o.children?.[0]?.userData?.actor).find(a=>a?.kind==='stairwell');
 assert.equal(down.direction,'down');assert.equal(down.place.top.x,up.place.top.x);
 const [, landingDown]=spaces.resolve(down.link);assert.equal(landingDown,up.place.front,'going down lands in front of the bottom step');
 const [, landingUp]=spaces.resolve(up.link);assert.equal(Math.abs(landingUp.x-down.place.top.x)+Math.abs(landingUp.z-down.place.top.z),1,'going up lands beside the top');
});
