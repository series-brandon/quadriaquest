import * as THREE from 'three';
import {mergedMesh,sharedVertexColorMaterial} from './merged-model.js';
// The crystal's faceted body (2 units tall at scale 1): a pointed top, two rings and a point below.
function crystalBody(){
 const vertices=[.12,2.05,-.04],radii=[.48,.59,.46,.56,.43,.51];
 for(let ring=0;ring<2;ring++)for(let i=0;i<6;i++){const a=i*Math.PI/3,r=radii[i]*(ring?.68:1);vertices.push(Math.cos(a)*r,(ring?.52:1.4)+(i%3)*.06,Math.sin(a)*r);}
 vertices.push(-.08,.18,.05);
 const indices=[];for(let i=0;i<6;i++){const j=(i+1)%6;indices.push(0,1+j,1+i,1+i,1+j,7+j,1+i,7+j,7+i,13,7+i,7+j);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
 const flat=geometry.toNonIndexed();flat.computeVertexNormals();geometry.dispose();return flat;
}
// Everything shared by every crystal (one geometry and material per part, built once): the stone dais and posts
// (one merged mesh), the glass caps on the posts, the rune ring, the great crystal and its circling shards.
let shared=null;
function parts(){
 if(shared)return shared;
 const keep=g=>{g.userData.shared=true;return g;},mat=o=>{const m=new THREE.MeshStandardMaterial(o);m.userData.shared=true;return m;};
 const posts=[[-.78,-.78],[.78,-.78],[-.78,.78],[.78,.78]];
 const dais=mergedMesh([{geometry:new THREE.CylinderGeometry(.98,1.06,.22,8),color:'#8f8a82',position:[0,.11,0],rotation:[0,Math.PI/8,0]},{geometry:new THREE.CylinderGeometry(.78,.86,.18,8),color:'#b9b3a8',position:[0,.31,0],rotation:[0,Math.PI/8,0]},
  ...posts.map(([x,z])=>({geometry:new THREE.BoxGeometry(.18,.62,.18),color:'#b9b3a8',position:[x,.31,z],rotation:[0,Math.PI/4,0]}))],{roughness:.9}).geometry;
 const glassPart=(geometry,position,scale,rotation=[0,0,0])=>{geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale)));return geometry.index?geometry.toNonIndexed():geometry;};
 const merge=list=>{const out=new THREE.BufferGeometry(),pos=[],norm=[];for(const g of list){pos.push(...g.attributes.position.array);norm.push(...g.attributes.normal.array);}out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));return out;};
 const caps=merge(posts.map(([x,z])=>glassPart(new THREE.OctahedronGeometry(.11,0),[x,.72,z],[1,1.7,1])));
 const shards=merge([0,1,2].map(i=>{const a=i*Math.PI*2/3;return glassPart(new THREE.OctahedronGeometry(.16,0),[Math.cos(a)*1.15,1.9+i*.25,Math.sin(a)*1.15],[1,1.8,1],[0,a,0]);}));
 shared={dais:keep(dais),caps:keep(caps),shards:keep(shards),core:keep(crystalBody()),ring:keep(new THREE.TorusGeometry(.66,.035,6,32)),
  stone:sharedVertexColorMaterial({roughness:.9}),glass:mat({color:'#82cbd2',metalness:.22,roughness:.24,emissive:'#25778c',emissiveIntensity:.45}),
  rune:mat({color:'#bff3f7',emissive:'#5fd9e8',emissiveIntensity:.9,roughness:.4})};
 return shared;
}
const mesh=(geometry,material,parent)=>{const m=new THREE.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
// An Iter Crystal (docs/TOWN.md, Iter Crystals): it stands on 2 × 2 tiles, the group's origin at their middle.
// A stepped stone dais with a glowing rune ring and four shard-capped posts at its corners; above it the great
// crystal floats and turns, with three shards circling it (animateCrystal). About four units tall, so it reads as
// a landmark from across the map. Five meshes, every geometry and material shared by all crystals.
export const CRYSTAL_HEIGHT=4.4;
export function makeCrystal(){
 const p=parts(),group=new THREE.Group();group.name='iter-crystal';
 mesh(p.dais,p.stone,group);mesh(p.caps,p.glass,group);
 const ring=mesh(p.ring,p.rune,group);ring.position.y=.405;ring.rotation.x=Math.PI/2;ring.castShadow=false;
 const core=mesh(p.core,p.glass,group);core.name='crystal-core';core.scale.set(1.55,1.6,1.55);
 const shards=mesh(p.shards,p.glass,group);shards.name='crystal-shards';
 group.userData.crystal={core,shards};
 return group;
}
// The crystal floats and turns above its dais, its shards circle, and the runes breathe (every crystal's at once:
// their material is shared). baseY: the ground under it.
export function animateCrystal(group,time,baseY=0){
 group.position.y=baseY;const c=group.userData.crystal;if(!c)return;
 c.core.position.y=.62+Math.sin(time*1.6)*.12;c.core.rotation.y=time*.35;
 c.shards.rotation.y=-time*.55;c.shards.position.y=Math.sin(time*1.1)*.08;
 if(shared)shared.rune.emissiveIntensity=.75+Math.sin(time*2.2)*.25;
}
// The 2 × 2 tiles an Iter Crystal stands on: the square with `tile` as its north-west corner if it fits, else
// another square holding `tile`: four open, dry tiles at one height. A crystal with no such square stands on
// its one tile. tileAt(x, z) → tile.
export function crystalFootprint(tile,tileAt){
 for(const [ox,oz] of [[0,0],[-1,0],[0,-1],[-1,-1]]){
  const tiles=[[0,0],[1,0],[0,1],[1,1]].map(([dx,dz])=>tileAt(tile.x+ox+dx,tile.z+oz+dz));
  if(tiles.every(t=>t&&!t.water&&(t===tile||!t.blocked)&&Math.abs(t.h-tile.h)<.01))return tiles;
 }
 return [tile];
}
// Where a crystal's model stands over its footprint (world units): the footprint's middle, on its ground.
export function crystalCentre(tiles){const n=tiles.length;return {x:tiles.reduce((s,t)=>s+t.x,0)/n-6,y:Math.max(...tiles.map(t=>t.h)),z:tiles.reduce((s,t)=>s+t.z,0)/n-6};}
