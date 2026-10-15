import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMapData,fillMap,buildMap} from './world-map.js';
import {flightOf,floorLevels} from './spaces.js';
import {key} from './world.js';

// Floors by hand (spaces.js; docs/CITY.md, Floors): an in-place cottage with a cellar and an upstairs.
function cottage({separate=false}={}){
 const data=createMapData({size:[32,32]});fillMap(data,{x0:0,z0:0,x1:31,z1:31},{surface:'grass'});data.spawn=[16,20];
 data.buildings.push({x:10,z:8,desc:{name:'Cottage',footprint:[6,5],storeys:2,roof:'gable',doors:[{edge:'south',at:2}],interior:separate?'separate':'inPlace',use:'home',seed:3},
  floors:[{level:-1,up:{at:[1,2],dir:'n'},furniture:[{kind:'barrel',at:[4,3]}]},{level:0,up:{at:[4,2],dir:'n'},furniture:[{kind:'chair',at:[1,3]}]},
   {level:1,use:'bedroom',furniture:[{kind:'bed',at:[1,1]}],edges:[{a:[2,0],b:[3,0],kind:'wall'}]}]});
 return data;
}
async function world(data){
 const {createSpaces}=await import('./spaces.js'),{createAreaRuntime}=await import('./area-runtime.js'),{configureDoors}=await import('./doors.js');
 const map=new Map(),scene=new THREE.Group(),areas=createAreaRuntime({world:map}),builtMap=buildMap(data,{scene});builtMap.areaId='town';
 areas.register({id:'town',group:builtMap.group,tiles:builtMap.tiles});areas.activate('town');
 const spaces=createSpaces({areas,scene});configureDoors({enter:link=>spaces.enter(link)});
 return {areas,spaces,builtMap,map,run:()=>{for(let i=0;i<10;i++)spaces.update(.1);}};
}
const actorOf=group=>{let a=null;group.traverse(o=>{if(o.userData?.actor?.kind==='stairwell'&&!a)a=o.userData.actor;});return a;};
const wells=group=>{const out=new Set();group.traverse(o=>{if(o.userData?.actor?.kind==='stairwell')out.add(o.userData.actor);});return [...out];};

test('an in-place building: its ground floor has stairwells up and down, and its own placed furniture only',async()=>{
 const data=cottage(),{builtMap}=await world(data),b=builtMap.buildings[0];
 assert.deepEqual(b.stairwells.map(w=>w.direction).sort(),['down','up']);
 const up=flightOf(data.buildings[0].floors[1].up);assert.ok(builtMap.tiles.get(key(10+up.bottom[0],8+up.bottom[1])).blocked,'the stairwell is solid');
 assert.deepEqual(b.furniture.map(p=>p.kind),['chair'],'only what was placed (floors start empty)');
});
test('stairs lead up and down between the overworld and each floor, and back',async()=>{
 const data=cottage(),{areas,spaces,builtMap,map,run}=await world(data),b=builtMap.buildings[0],up=b.stairwells.find(w=>w.direction==='up');
 up.interact();run();assert.match(areas.id,/:L1#/);assert.equal(areas.active.level,1);
 assert.ok(areas.active.group.getObjectByName('furniture-merged')||wells(areas.active.group).length,'the floor is built');
 const down=wells(areas.active.group).find(w=>w.direction==='down');assert.ok(down,'a way down');
 down.interact();run();assert.equal(areas.id,'town','back on the overworld');
 b.stairwells.find(w=>w.direction==='down').interact();run();assert.equal(areas.active.level,-1,'the cellar');
 const cellarUp=wells(areas.active.group).find(w=>w.direction==='up');cellarUp.interact();run();assert.equal(areas.id,'town');
 void map;void spaces;
});
test('a floor is its shape: a smaller attic, inside walls, its furniture; a separate building’s ground floor is a space with its door',async()=>{
 const data=cottage();data.buildings[0].floors[2].cells=[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1]];
 const {areas,builtMap,run}=await world(data);builtMap.buildings[0].stairwells.find(w=>w.direction==='up').interact();run();
 const indoor=[...areas.active.tiles.values()].filter(t=>t.indoor);assert.equal(indoor.length,8,'the attic’s shape');
 const sep=cottage({separate:true});sep.buildings[0].floors[1].furniture=[{kind:'table',at:[2,2]}];
 const s=await world(sep),door=s.builtMap.buildings[0].doors[0];assert.ok(door.link);s.spaces.enter(door.link);s.run();
 assert.equal(s.areas.active.level,0,'the ground floor is a space');assert.ok(wells(s.areas.active.group).some(w=>w.direction==='up'));
 assert.deepEqual(floorLevels(sep.buildings[0]).map(f=>f.level),[-1,0,1]);
});
test('the editor rebuilds a floor you stand in and keeps you there',async()=>{
 const data=cottage(),{areas,spaces,builtMap,run}=await world(data);builtMap.buildings[0].stairwells.find(w=>w.direction==='up').interact();run();
 const before=areas.id;data.buildings[0].floors[2].furniture.push({kind:'chair',at:[3,3]});
 spaces.rebuild(builtMap,0,{at:[11,9]});assert.notEqual(areas.id,before,'a fresh space');assert.equal(areas.active.level,1,'on the same floor');
 assert.equal(areas.list().filter(a=>a.id.includes(':L1#')).length,1,'the old one is gone');
});
test('floor checks: any size, but a warning when bigger than the floor below; cellars unlimited; stairs on both floors; storeys',async()=>{
 const {interiorProblems}=await import('./spaces.js'),floorsOf=d=>interiorProblems(d).filter(p=>p.kind==='floors');
 assert.deepEqual(floorsOf(cottage()),[],'a sound cottage');
 const wide=cottage();wide.buildings[0].floors[2].cells=[...Array.from({length:8},(_,x)=>[x-1,0]),[4,1],[4,2]];
 const w=floorsOf(wide);assert.equal(w.length,1);assert.equal(w[0].severity,'warning');assert.match(w[0].text,/floor 2 is 8 × 3, bigger than the floor below \(6 × 5\)/);
 const deep=cottage();deep.buildings[0].floors[0].cells=Array.from({length:40},(_,k)=>[k%10-2,Math.floor(k/10)-1]);deep.buildings[0].floors[0].up={at:[1,2],dir:'n'};
 assert.deepEqual(floorsOf(deep).filter(p=>/bigger/.test(p.text)),[],'a cellar of any size');
 const small=cottage();small.buildings[0].floors[2].cells=[[0,0],[1,0]];assert.ok(!floorsOf(small).some(p=>/bigger/.test(p.text)),'smaller above is fine');
 const bad=cottage();bad.buildings[0].desc.storeys=1;bad.buildings[0].floors[1].up={at:[0,0],dir:'n'};
 const texts=floorsOf(bad).map(p=>p.text).join(' | ');assert.match(texts,/1 floor above the ground but 1 storey/);assert.match(texts,/leave the floor/);
});
test('a floor bigger than its building is built at its own size',async()=>{
 const data=cottage();data.buildings[0].floors[2].cells=Array.from({length:8},(_,x)=>[x-1,0]).concat([[1,1],[1,2],[1,3]]);
 const {areas,builtMap,run}=await world(data);builtMap.buildings[0].stairwells.find(w=>w.direction==='up').interact();run();
 assert.equal([...areas.active.tiles.values()].filter(t=>t.indoor).length,11,'every tile of its shape, past the walls outside');
});
test('a cave by hand: in from its entrance, down a level and back out to the entrance',async()=>{
 const data=cottage(),rect=(w,d,ox=0,oz=0)=>{const out=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)out.push([x+ox,z+oz]);return out;};
 data.interiors.cave={kind:'dungeon',name:'Old cave',floors:[{level:-1,cells:rect(12,8),up:{at:[2,3],dir:'n'},furniture:[{kind:'barrel',at:[10,6]}]},{level:-2,cells:rect(20,6,-4,0),up:{at:[6,3],dir:'n'}}]};
 data.props.push({kind:'dungeonEntrance',x:20,z:20,link:'cave'});
 const {areas,spaces,builtMap,run}=await world(data),entrance=builtMap.props.find(p=>p.kind==='dungeonEntrance');entrance.link={kind:'dungeon',builtMap,id:'cave'};
 assert.ok(spaces.enter(entrance.link));run();assert.equal(areas.active.dungeon,'cave');assert.equal(areas.active.level,-1);
 assert.equal([...areas.active.tiles.values()].filter(t=>t.indoor).length,96,'its own shape');
 const down=wells(areas.active.group).find(w=>w.direction==='down');assert.ok(down,'a way down');down.interact();run();assert.equal(areas.active.level,-2);
 assert.equal([...areas.active.tiles.values()].filter(t=>t.indoor).length,120,'any size underground');
 wells(areas.active.group).find(w=>w.direction==='up').interact();run();assert.equal(areas.active.level,-1);
 wells(areas.active.group).find(w=>w.direction==='up').interact();run();assert.equal(areas.id,'town','out by the entrance');
 const {interiorProblems}=await import('./spaces.js');assert.deepEqual(interiorProblems(data).filter(p=>p.kind==='dungeon'),[]);
});
