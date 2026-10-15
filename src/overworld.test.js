import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {buildMap} from './world-map.js';
import {withinChunk,REGION} from './world-grid.js';
import {biomeRule} from './biome-rules.js';
import {townLand} from './town-ground.js';
import {mapCrystals} from './map-file.js';

// The Quadria overworld (src/maps/overworld.json): the start of the world map, where Mistrom, the starting
// village, is built (docs/TOWN.md), as saved in the repo (and built up in the editor).
const data=JSON.parse(readFileSync(new URL('./maps/overworld.json',import.meta.url),'utf8'));
// The overworld is edited by hand (the world editor), so these check what any valid overworld is, not what's on
// it or where (user, 2026-10-15): the editor's map checks catch authoring problems as you work.
test('the overworld loads and builds: whole regions on the land, every building in one chunk',()=>{
 assert.ok(data.size.every(n=>n>0&&n%REGION===0),'whole regions');assert.ok(data.land,'on the land');
 const built=buildMap(structuredClone(data),{scene:new THREE.Group()});assert.ok(built.spawn,'somewhere to arrive');
 for(const b of built.buildings.filter(Boolean))assert.ok(withinChunk(b.plan.x0,b.plan.z0,b.plan.x1,b.plan.z1),b.plan.desc.name);
 assert.equal(townLand(data).tile(-1,10),null,'the land ends at the map\u2019s edge: all of it can be edited');
 for(const biome of Object.values(data.land.cells||{}))assert.ok(biomeRule(biome).name,`a real biome: ${biome}`);
});
test('its Iter Crystals have unique ids and names, and at least one is known from the start (you wake by it)',()=>{
 const crystals=mapCrystals(structuredClone(data)),ids=crystals.map(c=>c.id);
 assert.ok(crystals.length>0);assert.equal(new Set(ids).size,ids.length,'unique ids');assert.ok(crystals.every(c=>c.id&&c.name),'each named');assert.ok(crystals.some(c=>c.known),'one known from the start');
});
test('a lazy build opens with only what it must, streams the rest, and matches a full build (docs/TOWN.md, Streaming a map’s content)',()=>{
 const lazy=buildMap(structuredClone(data),{scene:new THREE.Group(),lazy:true,streamRadius:1}),eager=buildMap(structuredClone(data),{scene:new THREE.Group()});
 assert.ok(lazy.content.built<=lazy.content.pinned+1&&lazy.content.tiles<eager.tiles.size/4,'little at first');
 lazy.stream(lazy.spawn);lazy.settle();assert.ok(lazy.content.built>=4&&lazy.content.built<lazy.chunks.size+9,'the chunks round the spawn');
 for(const [k,tile] of lazy.tiles){const e=eager.tiles.get(k);for(const f of ['h','blocked','building','water','indoor','surface','prop'])assert.equal(tile[f],e[f],`${k} ${f}`);}
 // A townsfolk's house is always built, wherever it is.
 const far=structuredClone(data);far.buildings.push({x:300,z:300,desc:{name:'Far house',footprint:[4,4],doors:[{edge:'south',at:1}],storeys:1,interior:'inPlace'}});far.townsfolk=[{name:'Pip',house:far.buildings.length-1,routine:[{do:'stroll'}]}];
 const pinned=buildMap(far,{scene:new THREE.Group(),lazy:true,streamRadius:1});assert.ok(pinned.buildings[far.buildings.length-1],'the far house is built');
});
