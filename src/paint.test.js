import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMapData,buildMap} from './world-map.js';
import {BUILDING_PRESETS,planBuilding} from './building-kit.js';
import {sideToward,wallPaint,floorPalette} from './paint.js';
import {buildFloorSpace} from './spaces.js';

// Wall and floor paint (docs/TOWN.md, Wall and floor paint).
const colorsIn=group=>{const out=new Set();group.traverse(m=>{if(m.isMesh){const c=m.geometry.attributes.color;if(c)for(let i=0;i<c.count;i++)out.add(new THREE.Color(c.getX(i),c.getY(i),c.getZ(i)).getHexString());if(m.material?.color)out.add(m.material.color.getHexString());}});return out;};
const house=()=>{const data=createMapData({id:'paint',size:[32,32]});data.buildings.push({x:8,z:8,desc:{...structuredClone(BUILDING_PRESETS.cottage),name:'Painted'}});return data;};
test('faces and keys: the side is the way from a tile to its wall',()=>{
 assert.equal(sideToward({x:1,z:1},{x:2,z:1}),'e');assert.equal(sideToward({x:1,z:1},{x:1,z:0}),'n');
 const plan={x0:4,z0:4};assert.deepEqual(wallPaint({walls:{'1,1,e':'#ff0000'}},plan,{x:5,z:5},{x:6,z:5}),{a:'#ff0000',b:null});
 assert.equal(wallPaint({walls:{}},plan,{x:5,z:5},{x:6,z:5}),null);
 assert.equal(floorPalette({floor:{'0,0':'#00ff00'}},plan,{x:4,z:4})[0],'#00ff00');
});
test('an in-place ground floor shows its floor and wall paint, and unpainted floors are the floor surface',()=>{
 const data=house(),plan=planBuilding(data.buildings[0].desc,[8,8]),[x,z]=plan.tiles[0],k=`${x-plan.x0},${z-plan.z0}`;
 // A wall face of that tile: one of its sides that faces out of the building.
 const inside=new Set(plan.tiles.map(c=>c.join(','))),side=['n','e','s','w'].find(s=>{const [dx,dz]={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]}[s];return !inside.has(`${x+dx},${z+dz}`);});
 data.buildings[0].paint={floor:{[k]:'#12ab34'},walls:{[`${k},${side}`]:'#ab1234'}};
 const built=buildMap(data,{scene:new THREE.Group()}),tile=built.tiles.get(`${x},${z}`),other=built.tiles.get(`${plan.tiles[1][0]},${plan.tiles[1][1]}`);
 assert.equal(tile.palette[0],'#12ab34');assert.equal(other.surface,'floor');assert.equal(other.palette,undefined,'unpainted: the floor surface');
 assert.ok(colorsIn(built.group).has('ab1234'),'the painted wall face');
});
test('an upper floor shows its own paint',()=>{
 const data=house(),b=data.buildings[0],plan=planBuilding(b.desc,[8,8]);b.desc.storeys=2;b.floors=[{level:1,paint:{floor:{'1,1':'#0000ff'},walls:{'0,0,n':'#ffff00'}}}];
 const space=buildFloorSpace({plan,entry:b,level:1,links:{exit:()=>null,floor:()=>null,ground:()=>null}});
 assert.equal(space.tiles.get(`${plan.x0+1},${plan.z0+1}`).palette[0],'#0000ff');assert.ok(colorsIn(space.group).has('ffff00'));
});
test('a building’s own rooms: its inside walls (local) stand where it is, belong to it, and take its paint',()=>{
 const data=house(),b=data.buildings[0];b.edges=[{a:[1,0],b:[2,0],kind:'wall'},{a:[1,1],b:[2,1],kind:'wall'}];b.paint={walls:{'1,0,e':'#c0ffee'}};
 const plan=planBuilding(b.desc,[8,8]),built=buildMap(data,{scene:new THREE.Group()}),tile=(x,z)=>built.tiles.get(`${plan.x0+x},${plan.z0+z}`);
 assert.deepEqual(built.edges.info(tile(1,0),tile(2,0))?.owners,[0]);assert.ok(colorsIn(built.group).has('c0ffee'));
 data.buildings[0]={...b,x:12,z:9};const moved=buildMap(data,{scene:new THREE.Group()}),p2=planBuilding(b.desc,[12,9]);
 assert.equal(moved.edges.info(moved.tiles.get(`${p2.x0+1},${p2.z0}`),moved.tiles.get(`${p2.x0+2},${p2.z0}`))?.kind,'wall','moved with the building');
});
