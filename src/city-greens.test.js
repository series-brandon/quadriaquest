import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {buildCity} from './city-map.js';
import {reachableFrom} from './city-checks.js';
import {cityGreens} from './city-greens.js';
import {BIOMES,BIOME_NAMES} from './biomes.js';
import {key} from './world.js';

const data=JSON.parse(readFileSync(new URL('./maps/capital.json',import.meta.url)));
test('the city’s greens are themed mini biomes: each patch’s trees and flowers belong to its biome',()=>{
 const city=buildCity(structuredClone(data),{scene:new THREE.Group()}),g=cityGreens(city,{seed:data.greens.seed});
 assert.ok(g.patches.length>=20,'many mini biomes');
 for(const b of BIOME_NAMES)assert.ok(g.patches.some(r=>r.biome===b),`some ${b}`);
 const biomeOf=new Map();for(const r of g.patches)for(const t of r.tiles)biomeOf.set(key(t.x,t.z),r.biome);
 for(const tree of g.trees)assert.ok(BIOMES[biomeOf.get(key(tree.x,tree.z))].trees.includes(tree.species),`${tree.species} fits its patch`);
 for(const c of g.cover){const b=BIOMES[biomeOf.get(key(Math.round(c.x),Math.round(c.z)))];assert.ok(!b||b.flowers.includes(c.kind)||b.extras.includes(c.kind),`${c.kind} fits`);}
 assert.deepEqual(cityGreens(city,{seed:data.greens.seed}).trees,g.trees,'the same every time');
});
test('trees never cut off a doorstep or a home',()=>{
 const city=buildCity(structuredClone(data),{scene:new THREE.Group()}),before=reachableFrom(city.tiles,city.spawn);
 const g=cityGreens(city,{seed:data.greens.seed});for(const tr of g.trees)city.tiles.get(key(tr.x,tr.z)).blocked=true;
 const after=reachableFrom(city.tiles,city.spawn);
 for(const b of city.buildings)for(const d of b.anchors.doors)if(d.doorstep&&before.has(d.doorstep))assert.ok(after.has(d.doorstep),`doorstep ${d.doorstep.x},${d.doorstep.z}`);
 for(const f of data.townsfolk)if(f.home){const t=city.tiles.get(key(...f.home));if(t&&before.has(t))assert.ok(after.has(t)&&!t.blocked,f.id);}
});
test('city ground cover streams with the city’s chunks: none is drawn where the city is hidden',async()=>{
 const {createGroundCoverPool,chunkedCover}=await import('./ground-cover.js');
 const city=buildCity(structuredClone(data),{scene:new THREE.Group(),streamRadius:1}),g=cityGreens(city,{seed:data.greens.seed});
 const pool=createGroundCoverPool({parent:new THREE.Group(),capacity:20000}),cover=chunkedCover(pool,g.cover);
 city.onStream=chunks=>cover.sync(id=>chunks.get(id)?.root.visible);
 city.stream(city.tiles.get(key(8,8)));
 const shown=new Set([...city.chunks.values()].filter(c=>c.root.visible).map(c=>c.id));
 assert.ok(cover.shownChunks.length>0&&cover.shownChunks.every(id=>shown.has(id)),'only shown chunks have cover');
 const total=()=>Object.values(pool.stats).reduce((a,b)=>a+b,0),near=total();
 assert.ok(near>0&&near<g.cover.length,'some, not all');
 city.stream(city.tiles.get(key(120,120)));assert.ok(cover.shownChunks.every(id=>[...city.chunks.values()].find(c=>c.id===id).root.visible),'follows the player');
});
