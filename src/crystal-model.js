import * as THREE from 'three';
function part(group,geometry,material,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
// The crystal's faceted body (2 units tall at scale 1): a pointed top, two rings and a point below.
function crystalBody(){
 const vertices=[.12,2.05,-.04],radii=[.48,.59,.46,.56,.43,.51];
 for(let ring=0;ring<2;ring++)for(let i=0;i<6;i++){const a=i*Math.PI/3,r=radii[i]*(ring?.68:1);vertices.push(Math.cos(a)*r,(ring?.52:1.4)+(i%3)*.06,Math.sin(a)*r);}
 vertices.push(-.08,.18,.05);
 const indices=[];for(let i=0;i<6;i++){const j=(i+1)%6;indices.push(0,1+j,1+i,1+i,1+j,7+j,1+i,7+j,7+i,13,7+i,7+j);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
 const flat=geometry.toNonIndexed();flat.computeVertexNormals();geometry.dispose();return flat;
}
// An Iter Crystal (docs/TOWN.md, Iter Crystals): it stands on 2 × 2 tiles, the group's origin at their middle.
// A stepped stone dais with a glowing rune ring and four shard-capped posts at its corners; above it the great
// crystal floats and turns, with three shards circling it (animateCrystal). About four units tall, so it reads as
// a landmark from across the map.
export const CRYSTAL_HEIGHT=4.4;
export function makeCrystal(){
 const group=new THREE.Group();group.name='iter-crystal';
 const stone=new THREE.MeshStandardMaterial({color:'#b9b3a8',roughness:.9}),dark=new THREE.MeshStandardMaterial({color:'#8f8a82',roughness:.92});
 const glass=new THREE.MeshStandardMaterial({color:'#82cbd2',metalness:.22,roughness:.24,emissive:'#25778c',emissiveIntensity:.45});
 const rune=new THREE.MeshStandardMaterial({color:'#bff3f7',emissive:'#5fd9e8',emissiveIntensity:.9,roughness:.4});
 part(group,new THREE.CylinderGeometry(.98,1.06,.22,8),dark,[0,.11,0],[0,Math.PI/8,0]);
 part(group,new THREE.CylinderGeometry(.78,.86,.18,8),stone,[0,.31,0],[0,Math.PI/8,0]);
 part(group,new THREE.TorusGeometry(.66,.035,6,32),rune,[0,.405,0],[Math.PI/2,0,0]);
 for(const [x,z] of [[-.78,-.78],[.78,-.78],[-.78,.78],[.78,.78]]){part(group,new THREE.BoxGeometry(.18,.62,.18),stone,[x,.31,z],[0,Math.PI/4,0]);part(group,new THREE.OctahedronGeometry(.11,0),glass,[x,.72,z],[0,0,0],[1,1.7,1]);}
 const core=new THREE.Group();core.name='crystal-core';group.add(core);
 part(core,crystalBody(),glass,[0,0,0],[0,0,0],[1.55,1.6,1.55]);
 const shards=new THREE.Group();shards.name='crystal-shards';group.add(shards);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;part(shards,new THREE.OctahedronGeometry(.16,0),glass,[Math.cos(a)*1.15,1.9+i*.25,Math.sin(a)*1.15],[0,a,0],[1,1.8,1]);}
 group.userData.crystal={core,shards,rune};
 return group;
}
// The crystal floats and turns above its dais, its shards circle, and the runes breathe. baseY: the ground under it.
export function animateCrystal(group,time,baseY=0){
 group.position.y=baseY;const c=group.userData.crystal;if(!c)return;
 c.core.position.y=.62+Math.sin(time*1.6)*.12;c.core.rotation.y=time*.35;
 c.shards.rotation.y=-time*.55;c.shards.position.y=Math.sin(time*1.1)*.08;
 c.rune.emissiveIntensity=.75+Math.sin(time*2.2)*.25;
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
