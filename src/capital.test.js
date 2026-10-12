import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {buildCity} from './city-map.js';
import {cityProblems} from './city-checks.js';
import {findPath,key} from './world.js';
import {CAPITAL,capitalData} from './dev/capital-layout.js';

const data=JSON.parse(readFileSync(new URL('./maps/capital.json',import.meta.url),'utf8'));
test('the capital: 128 × 128 in 2 × 2 storage regions, with no errors in the city checks',()=>{
 assert.deepEqual(data.size,[128,128]);assert.equal(Object.keys(data.regions).length,4);
 const built=buildCity(data,{scene:new THREE.Group()});
 assert.deepEqual(cityProblems(data,built).filter(p=>p.severity==='error').map(p=>`${p.tile} ${p.text}`),[]);
});
test('you wake at the Iter Crystal in the town square, and the castle, market and sewers are all reachable',()=>{
 const built=buildCity(data,{scene:new THREE.Group()}),t=(x,z)=>built.tiles.get(key(x,z)),{square,crystal}=CAPITAL;
 const s=built.spawn;assert.ok(s.x>=square.x0&&s.x<=square.x1&&s.z>=square.z0&&s.z<=square.z1,'spawn in the square');
 assert.ok(Math.abs(s.x-crystal[0])+Math.abs(s.z-crystal[1])<=2,'beside the crystal');assert.ok(t(...crystal).blocked);
 const keep=built.buildings.find(b=>b.plan.desc.name==='castle keep');
 const up=findPath(built.tiles,s,keep.anchors.doors[0].doorstep);assert.ok(up&&up.some(tile=>tile.stair),'up the grand stair to the keep door');
 assert.ok(keep.doors[0].link,'the keep has a separate interior');
 assert.ok(findPath(built.tiles,s,t(44,70)),'the market');
 assert.ok(built.props.some(p=>p.kind==='dungeonEntrance'&&p.link));assert.ok(built.props.some(p=>p.kind==='noticeboard'));
 assert.ok(data.townsfolk.length>=30);
});
test('the capital streams: chunks around the player show, buildings show whole, and shown chunks linger a ring',()=>{
 const built=buildCity(structuredClone(data),{scene:new THREE.Group(),streamRadius:2,streamKeep:1});
 assert.equal(built.chunks.size,64);built.stream(built.spawn);
 const at=t=>[Math.floor(t.x/16),Math.floor(t.z/16)],[cx,cz]=at(built.spawn),dist=c=>Math.max(Math.abs(c.cx-cx),Math.abs(c.cz-cz));
 const shown=[...built.chunks.values()].filter(c=>c.root.visible);
 for(const c of built.chunks.values())if(dist(c)<=2)assert.ok(c.root.visible,`chunk ${c.id} within reach`);
 assert.ok(shown.length<=25,'only the 5 × 5 around you');
 // A building's floor (and walls, roof, furniture) live in its home chunk, so it shows or hides whole
 // even across a chunk line.
 for(const [i,b] of built.buildings.entries()){const home=built.chunks.get(`${Math.floor(data.buildings[i].x/16)},${Math.floor(data.buildings[i].z/16)}`);
  for(const [x,z] of b.plan.tiles){const t=built.tiles.get(`${x},${z}`);assert.ok(home.tiles.includes(t),`${b.plan.desc.name}: floor ${x},${z} in its home chunk`);}}
 // One chunk east: the old west edge stays (within radius + keep); far ones still go.
 const west=[...built.chunks.values()].find(c=>c.cz===cz&&c.cx===cx-2);built.stream(built.tiles.get(`${built.spawn.x+16},${built.spawn.z}`));
 assert.ok(west.root.visible,'lingers one ring');
 assert.equal(built.isShown(west.cx*16,west.cz*16),true);const far=[...built.chunks.values()].find(c=>!c.root.visible);assert.equal(built.isShown(far.cx*16+1,far.cz*16+1),false,'a hidden chunk’s tiles');
 assert.equal(built.isShown(-1,70),true,'outside the city: the land shows itself');
});
test('capital.json is the generator’s output unless edited (regenerate with scripts/generate-capital.mjs)',()=>{
 assert.equal(JSON.stringify(capitalData()).length>0,true);assert.equal(data.id,'capital');
});
