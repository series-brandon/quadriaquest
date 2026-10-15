import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildMap,createMapData,fillMap,setMapHeight,setMapSurface} from './world-map.js';
import {kitStreetData} from './dev/kit-street.js';
import {CHUNK,chunkId} from './world-grid.js';
import {key} from './world.js';

// Everything a rebuilt map must agree on with a fresh build: each tile's state and edges, and the
// city's doors, props, buildings and roofs.
function signature(builtMap){
 const tiles=[...builtMap.tiles.values()].sort((a,b)=>a.z-b.z||a.x-b.x).map(t=>[t.x,t.z,t.h,t.surface,!!t.blocked,!!t.indoor,t.building??-1,t.stair?.dir??'',!!t.blocksSight,
  t.edges?.n?.kind??t.edges?.n?.door?.kind??(t.edges?.n?'door':''),t.edges?.w?.kind??(t.edges?.w?'door':'')].join(','));
 return {tiles,doors:builtMap.doors.length,props:builtMap.props.map(p=>`${p.kind}@${p.tile.x},${p.tile.z}`).sort(),buildings:builtMap.buildings.map(b=>b?`${b.plan.x0},${b.plan.z0}`:null),roofs:builtMap.roofs.length,furniture:builtMap.furniture.length};
}
// The chunks an edit touches: every changed tile's chunk, one tile out.
const dirtyAround=cells=>[...new Set(cells.flatMap(([x,z])=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>chunkId(x+dx,z+dz))))];
const fresh=data=>buildMap(structuredClone(data),{scene:new THREE.Group()});

test('a partial rebuild matches a fresh build: terrain paint, a moved building, a moved prop, new stairs',()=>{
 const data=kitStreetData(),builtMap=buildMap(data,{scene:new THREE.Group()}),pickables=[];
 // Paint a path and raise a patch in one chunk.
 const cells=[];for(let x=4;x<9;x++){setMapSurface(data,x,50,'dirt');cells.push([x,50]);}setMapHeight(data,6,52,2);cells.push([6,52]);
 assert.ok(builtMap.rebuild(dirtyAround(cells)));assert.deepEqual(signature(builtMap),signature(fresh(data)));
 // Move a building within its chunk (old and new footprints both dirty).
 const i=data.buildings.findIndex(b=>b.desc.name!=='guild house'&&b.x%CHUNK<CHUNK-8),b=data.buildings[i],before=[[b.x,b.z]];
 const old=builtMap.buildings[i].plan.tiles;b.z+=1;
 assert.ok(builtMap.rebuild(dirtyAround([...old,...before])));assert.deepEqual(signature(builtMap),signature(fresh(data)));
 // Move a prop; add stairs.
 const p=data.props[0],from=[p.x,p.z];p.x+=1;data.stairs.push({x:10,z:55,dir:'n',length:2,width:1});
 assert.ok(builtMap.rebuild(dirtyAround([from,[p.x,p.z],[10,55],[10,54],[10,56]])));assert.deepEqual(signature(builtMap),signature(fresh(data)));
 // Only the dirty chunks were rebuilt: an untouched chunk keeps its very group.
 const far=[...builtMap.chunks.values()].find(c=>c.cx===2&&c.cz===0),root=far?.root;
 builtMap.rebuild([chunkId(4,50)]);if(far)assert.equal(builtMap.chunks.get(far.id)?.root,root,'untouched chunk kept');
});
test('a partial rebuild leaves no stray clickable meshes or scene objects behind',()=>{
 const pickables=[],data=kitStreetData(),builtMap=buildMap(data,{scene:new THREE.Group(),pickables});
 const count=()=>{let n=0;builtMap.group.traverse(()=>n++);return n;};
 const before={picks:pickables.length,objects:count()};
 for(let i=0;i<3;i++)assert.ok(builtMap.rebuild([...builtMap.chunks.keys()]));
 assert.equal(pickables.length,before.picks,'pickables');assert.equal(count(),before.objects,'scene objects');
});
test('new and removed buildings rebuild only the chunks whose building ids changed',()=>{
 const data=createMapData({size:[40,40]});fillMap(data,{x0:0,z0:0,x1:39,z1:39},{surface:'grass'});data.spawn=[20,20];
 data.buildings.push({x:4,z:4,desc:{name:'cottage',footprint:[3,3],doors:[{edge:'south',at:1}]}});
 const builtMap=buildMap(data,{scene:new THREE.Group()});
 data.buildings.push({x:10,z:4,desc:{name:'cottage 2',footprint:[3,3],doors:[{edge:'south',at:1}]}});
 assert.ok(builtMap.rebuild([chunkId(10,4)]),'a new building: built in its chunk');
 assert.equal(builtMap.buildings.length,2);assert.equal(builtMap.tiles.get(key(11,5)).building,1);assert.equal(builtMap.roofs.length,2);
 // Removing the first shifts the second's id: it rebuilds in its chunk as building 0.
 data.buildings.shift();
 assert.ok(builtMap.rebuild([chunkId(4,4)]),'a removed building: rebuilt where the ids changed');
 assert.equal(builtMap.buildings.length,1);assert.equal(builtMap.tiles.get(key(4,4)).building,undefined);assert.equal(builtMap.tiles.get(key(11,5)).building,0);assert.equal(builtMap.roofs.length,1);
 const fresh=buildMap(structuredClone(data),{scene:new THREE.Group()});for(const [k,t] of fresh.tiles)assert.equal(builtMap.tiles.get(k).building,t.building,k);
});
