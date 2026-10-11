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
test('the capital streams: only chunks around the player are shown',()=>{
 const built=buildCity(data,{scene:new THREE.Group(),streamRadius:2});
 assert.equal(built.chunks.size,64);built.stream(built.spawn);assert.ok(built.shownChunks<=25&&built.shownChunks>=9);
});
test('capital.json is the generator’s output unless edited (regenerate with scripts/generate-capital.mjs)',()=>{
 assert.equal(JSON.stringify(capitalData()).length>0,true);assert.equal(data.id,'capital');
});
