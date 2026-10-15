import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PROPS,PROP_KINDS,propPieces,propModel,cleanColors,colorKey,createProp} from './props.js';

// Colours by hand (docs/TOWN.md, Colours): a prop's pieces are its distinct colours, recoloured per placed prop.
const vertexColors=group=>{const out=new Set();group.traverse(m=>{const c=m.isMesh&&m.geometry.attributes.color;if(!c)return;for(let i=0;i<c.count;i++)out.add(new THREE.Color(c.getX(i),c.getY(i),c.getZ(i)).getHexString());});return out;};
test('every prop has named pieces, one per distinct colour, with unique names',()=>{
 for(const kind of PROP_KINDS){const pieces=propPieces(kind);assert.ok(pieces.length>0,kind);
  assert.equal(new Set(pieces.map(p=>p.id)).size,pieces.length,kind);assert.equal(new Set(pieces.map(p=>p.name)).size,pieces.length,`${kind}: names`);
  for(const p of pieces)assert.match(p.id,/^#[0-9a-f]{6}$/);}
 assert.deepEqual(propPieces('bench').map(p=>p.name),['Iron','Wood'],'the bench: iron frame, wooden boards');
});
test('a recoloured prop draws its piece in the new colour, any colour; the plain one is unchanged',()=>{
 const wood=propPieces('bench').find(p=>p.name==='Wood').id,plain=vertexColors(propModel('bench')),blue=vertexColors(propModel('bench',{[wood]:'#00FF7f'}));
 assert.ok(plain.has(wood.slice(1)));assert.ok(!blue.has(wood.slice(1)),'the wood is gone');assert.ok(blue.has('00ff7f'),'neon green, as asked');
 assert.ok(vertexColors(propModel('bench')).has(wood.slice(1)),'the shared plain model is untouched');
});
test('colours are cleaned: unknown pieces and unchanged colours drop, keys and values normalised',()=>{
 const wood=propPieces('bench').find(p=>p.name==='Wood').id;
 assert.equal(cleanColors('bench',{}),null);assert.equal(cleanColors('bench',{[wood]:wood}),null,'no change');
 assert.deepEqual(cleanColors('bench',{[wood.toUpperCase()]:'#ABCDEF','#123456':'#ffffff'}),{[wood]:'#abcdef'});
 assert.equal(colorKey('#FFF'),'#ffffff');
});
test('the same colours share one geometry; createProp takes colours',()=>{
 const wood=propPieces('bench').find(p=>p.name==='Wood').id,mesh=g=>g.children[0].geometry;
 assert.equal(mesh(propModel('bench',{[wood]:'#ff0000'})),mesh(propModel('bench',{[wood]:'#FF0000'})));
 assert.notEqual(mesh(propModel('bench',{[wood]:'#ff0000'})),mesh(propModel('bench')));
 const tiles=new Map();for(let x=0;x<4;x++)for(let z=0;z<4;z++)tiles.set(`${x},${z}`,{x,z,h:1});
 const prop=createProp('bench',{origin:[1,1],tileAt:(x,z)=>tiles.get(`${x},${z}`),parent:new THREE.Group(),colors:{[wood]:'#ff0000'}});
 assert.ok(vertexColors(prop.group).has('ff0000'));assert.ok(PROPS.bench);
});
test('a map keeps its props’ colours: the shared builder draws them (world-map.js)',async()=>{
 const {createMapData,buildMap}=await import('./world-map.js');
 const wood=propPieces('bench').find(p=>p.name==='Wood').id,data=createMapData({id:'paint',size:[16,16]});
 data.props.push({kind:'bench',x:4,z:4,rotation:0,colors:{[wood]:'#123456'}},{kind:'bench',x:4,z:8,rotation:0});
 const built=buildMap(data,{scene:new THREE.Group()}),seen=new Set();for(const p of built.props)for(const c of vertexColors(p.group))seen.add(c);
 assert.ok(seen.has('123456'),'the recoloured bench');assert.ok(seen.has(wood.slice(1)),'and the plain one beside it');
});
