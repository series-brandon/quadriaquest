import * as THREE from 'three';
import {createTerrainBatch} from '../terrain-batch.js';
import {makeTerrainTile} from '../world-models.js';
import {createGrassColors} from '../grass-palette.js';
import {createEdgeFeatures} from '../doors.js';
import {key} from '../world.js';

// Building test map (playground only; docs/CITY.md, Phase 1). Three buildings made only of shared edge
// features and doors, so walls, doors, routes, sight and reach can be exercised in one place:
//  - a small house with one door (and two windows);
//  - a large hall with two doors (south and east);
//  - a complex building: a hallway from its front door with four rooms off it, each with its own door.
// Every door starts closed. Layout only; all behaviour is production (world.js, doors.js).
export const BUILDING_TEST={spawn:[15,19],
 small:{x0:4,z0:4,x1:6,z1:6},
 large:{x0:10,z0:4,x1:17,z1:9},
 complex:{x0:21,z0:4,x1:28,z1:13,hall:[24,25]}};
const W=30,H=22;

export function createBuildingTestMap({scene,pickables}){
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const tiles=[];for(let z=1;z<=H;z++)for(let x=1;x<=W;x++)tiles.push({x,z,h:1,blocked:false,water:false,buildable:true});
 const map=new Map(tiles.map(t=>[key(t.x,t.z),t])),t=(x,z)=>map.get(key(x,z));
 const {small,large,complex}=BUILDING_TEST;
 const inside=(b,x,z)=>x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1;
 // Floors: grass outside, planks indoors, flagstone paths from the spawn to each front door.
 const grass=createGrassColors().map(color=>new THREE.MeshStandardMaterial({color,roughness:.9}));
 const planks=['#a27a55','#9a7350'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}));
 const stone=['#b8ad98','#aea38f'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.95}));
 const path=new Set();
 const lay=(x0,z0,x1,z1)=>{for(let z=Math.min(z0,z1);z<=Math.max(z0,z1);z++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)path.add(key(x,z));};
 lay(15,19,15,15);lay(5,15,25,15);lay(5,15,5,7);lay(13,15,13,10);lay(24,15,24,14);lay(18,6,19,6);lay(19,6,19,15);
 const material=tile=>[small,large,complex].some(b=>inside(b,tile.x,tile.z))?planks[(tile.x+tile.z)%2]:path.has(key(tile.x,tile.z))?stone[(tile.x*3+tile.z)%2]:grass[(tile.x*7+tile.z)%4];
 createTerrainBatch({tiles,map,factory:tile=>makeTerrainTile(tile,map,material(tile)),parent:group,pickables,preserve:[...grass,...planks,...stone],roughness:.9});

 const edges=createEdgeFeatures({parent:group,pickables}),doors=[];
 const place=(a,b,kind)=>{const f=edges.add(a,b,kind);if(kind==='door')doors.push(f);};
 // The outline of a building: walls, except the doors and windows named by 'x,z,side'.
 function outline(b,special={}){
  const side=(x,z,s,dx,dz)=>place(t(x,z),t(x+dx,z+dz),special[`${x},${z},${s}`]||'wall');
  for(let x=b.x0;x<=b.x1;x++){side(x,b.z0,'n',0,-1);side(x,b.z1,'s',0,1);}
  for(let z=b.z0;z<=b.z1;z++){side(b.x0,z,'w',-1,0);side(b.x1,z,'e',1,0);}
 }
 outline(small,{'5,6,s':'door','6,5,e':'window','5,4,n':'window'});
 outline(large,{'13,9,s':'door','17,6,e':'door','11,4,n':'window','14,4,n':'window','16,4,n':'window','10,6,w':'window','10,8,w':'window'});
 outline(complex,{'24,13,s':'door','21,6,w':'window','21,11,w':'window','28,5,e':'window','28,11,e':'window','22,4,n':'window','27,4,n':'window','22,13,s':'window','27,13,s':'window'});
 // Inside the complex: walls either side of the hallway with one door per room, and walls between rooms.
 const [hx0,hx1]=complex.hall,roomDoors={[`${hx0-1},6`]:1,[`${hx0-1},11`]:1,[`${hx1+1},5`]:1,[`${hx1+1},10`]:1};
 for(let z=complex.z0;z<=complex.z1;z++){
  place(t(hx0-1,z),t(hx0,z),roomDoors[`${hx0-1},${z}`]?'door':'wall');
  place(t(hx1,z),t(hx1+1,z),roomDoors[`${hx1+1},${z}`]?'door':'wall');
 }
 for(let x=complex.x0;x<hx0;x++)place(t(x,8),t(x,9),'wall');
 for(let x=hx1+1;x<=complex.x1;x++)place(t(x,7),t(x,8),'wall');
 return {group,tiles:map,doors,edges,spawn:t(...BUILDING_TEST.spawn)};
}
