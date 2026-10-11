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
// A second row along the southern road tests building shapes: an L (one building, and the same L split
// by a solid wall into two joined buildings), a T, a U with a courtyard, a + and a Tetris S/Z.
// Every door starts closed. Layout only; all behaviour is production (world.js, doors.js).
// Shapes: one string per row, west to east. A letter is an indoor tile and each letter is one building
// part: every edge between a tile and anything outside its own part gets a wall, so neighbouring parts
// are joined but separated by a solid wall. Doors and windows are [dx, dz, side] from the shape's origin.
// Every door follows the door rule (doors.js doorProblems): a wall on each side before any corner.
export const SHAPES=[
 {name:'L (one building)',origin:[2,25],rows:['AAA...','AAA...','AAA...','AAAAAA','AAAAAA'],doors:[[1,0,'n']],windows:[[5,3,'e'],[0,1,'w']]},
 {name:'L (two buildings joined by a wall)',origin:[10,25],rows:['AAA...','AAA...','AAA...','AAABBB','AAABBB'],doors:[[1,0,'n'],[4,3,'n']],windows:[[5,4,'e']]},
 {name:'T',origin:[18,25],rows:['AAAAAAA','AAAAAAA','..AAA..','..AAA..','..AAA..'],doors:[[3,0,'n'],[3,4,'s']],windows:[[0,1,'w'],[6,1,'e']]},
 {name:'U (courtyard)',origin:[27,25],rows:['AAA...AAA','AAA...AAA','AAA...AAA','AAAAAAAAA','AAAAAAAAA'],doors:[[1,0,'n'],[4,3,'n']],windows:[[8,3,'e'],[7,0,'n']]},
 {name:'+',origin:[38,25],rows:['...AAA...','...AAA...','...AAA...','AAAAAAAAA','AAAAAAAAA','AAAAAAAAA','...AAA...','...AAA...','...AAA...'],doors:[[4,0,'n'],[0,4,'w']],windows:[[8,4,'e'],[4,8,'s']]},
 {name:'S/Z',origin:[49,25],rows:['..AAAA','..AAAA','..AAAA','AAAA..','AAAA..','AAAA..'],doors:[[3,0,'n'],[0,4,'w']],windows:[[5,1,'e'],[1,5,'s']]},
];
const abs=(shape,[dx,dz,side])=>`${shape.origin[0]+dx},${shape.origin[1]+dz},${side}`;
export const shapeDoorIds=shape=>shape.doors.map(d=>abs(shape,d));
export const BUILDING_TEST={spawn:[15,19],
 small:{x0:4,z0:4,x1:6,z1:6},
 large:{x0:10,z0:4,x1:17,z1:9},
 complex:{x0:21,z0:4,x1:28,z1:13,hall:[24,26]}};
const W=57,H=35;
// The indoor tiles of a shape, keyed 'x,z' → part letter.
export function shapeCells(shape){const cells=new Map(),[ox,oz]=shape.origin;shape.rows.forEach((row,dz)=>[...row].forEach((c,dx)=>{if(c!=='.')cells.set(key(ox+dx,oz+dz),c);}));return cells;}

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
 lay(15,19,15,15);lay(5,15,25,15);lay(5,15,5,7);lay(13,15,13,10);lay(25,15,25,14);lay(18,6,19,6);lay(19,6,19,15);
 // The southern road and a short path to each shape's north door (and into the L's crook and the U's courtyard).
 lay(15,19,15,23);lay(2,23,55,23);for(const x of [3,11,21,28,42,52])lay(x,23,x,24);lay(14,23,14,27);lay(31,23,31,27);
 const shapeTiles=new Map(SHAPES.flatMap(s=>[...shapeCells(s)]));
 // Indoor tiles (the minimap draws them as building floor).
 // Building ids (cutaway, minimap): the three first-row buildings, then one per shape part.
 const partId=(shapeIndex,letter)=>3+shapeIndex*2+(letter==='A'?0:1);
 const shapeOwner=new Map(SHAPES.flatMap((s,i)=>[...shapeCells(s)].map(([k,letter])=>[k,partId(i,letter)])));
 for(const tile of tiles){const k=key(tile.x,tile.z),rect=[small,large,complex].findIndex(b=>inside(b,tile.x,tile.z));tile.building=rect>=0?rect:shapeOwner.get(k);tile.indoor=tile.building!==undefined;}
 const material=tile=>[small,large,complex].some(b=>inside(b,tile.x,tile.z))||shapeTiles.has(key(tile.x,tile.z))?planks[(tile.x+tile.z)%2]:path.has(key(tile.x,tile.z))?stone[(tile.x*3+tile.z)%2]:grass[(tile.x*7+tile.z)%4];
 createTerrainBatch({tiles,map,factory:tile=>makeTerrainTile(tile,map,material(tile)),parent:group,pickables,preserve:[...grass,...planks,...stone],roughness:.9});

 const edges=createEdgeFeatures({parent:group,pickables,tileAt:t}),doors=[];
 // Each edge belongs to the building(s) on its sides (shared walls to both).
 const place=(a,b,kind)=>{const owner=[a.building,b.building].filter(o=>o!==undefined);const f=edges.add(a,b,kind,{owner});if(kind==='door')doors.push(f);};
 // The outline of a building: walls, except the doors and windows named by 'x,z,side'.
 function outline(b,special={}){
  const side=(x,z,s,dx,dz)=>place(t(x,z),t(x+dx,z+dz),special[`${x},${z},${s}`]||'wall');
  for(let x=b.x0;x<=b.x1;x++){side(x,b.z0,'n',0,-1);side(x,b.z1,'s',0,1);}
  for(let z=b.z0;z<=b.z1;z++){side(b.x0,z,'w',-1,0);side(b.x1,z,'e',1,0);}
 }
 outline(small,{'5,6,s':'door','6,5,e':'window','5,4,n':'window'});
 outline(large,{'13,9,s':'door','17,6,e':'door','11,4,n':'window','14,4,n':'window','16,4,n':'window','10,6,w':'window','10,8,w':'window'});
 outline(complex,{'25,13,s':'door','21,6,w':'window','21,11,w':'window','28,5,e':'window','28,11,e':'window','22,4,n':'window','27,4,n':'window','22,13,s':'window','27,13,s':'window'});
 // Inside the complex: walls either side of the hallway with one door per room, and walls between rooms.
 const [hx0,hx1]=complex.hall,roomDoors={[`${hx0-1},6`]:1,[`${hx0-1},11`]:1,[`${hx1+1},5`]:1,[`${hx1+1},10`]:1};
 for(let z=complex.z0;z<=complex.z1;z++){
  place(t(hx0-1,z),t(hx0,z),roomDoors[`${hx0-1},${z}`]?'door':'wall');
  place(t(hx1+1,z),t(hx1,z),roomDoors[`${hx1+1},${z}`]?'door':'wall');
 }
 for(let x=complex.x0;x<hx0;x++)place(t(x,8),t(x,9),'wall');
 for(let x=hx1+1;x<=complex.x1;x++)place(t(x,7),t(x,8),'wall');
 // Shapes: walls on every edge between a part's tile and anything outside that part (each shared edge
 // between two parts once), except the named doors and windows.
 const dirs={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]};
 for(const shape of SHAPES){
  const cells=shapeCells(shape),special=Object.fromEntries([...shape.doors.map(d=>[abs(shape,d),'door']),...shape.windows.map(w=>[abs(shape,w),'window'])]),used=new Set();
  for(const [k,part] of cells){const [x,z]=k.split(',').map(Number);
   for(const [side,[dx,dz]] of Object.entries(dirs)){const other=cells.get(key(x+dx,z+dz));if(other===part||other&&other<part)continue;const id=`${x},${z},${side}`;if(special[id])used.add(id);place(t(x,z),t(x+dx,z+dz),special[id]||'wall');}}
  // A door or window named off the outline would silently vanish: fail loudly instead.
  for(const id of Object.keys(special))if(!used.has(id))throw Error(`${shape.name}: ${id} is not on its outline`);
 }
 // Every door here must follow the door rule.
 const broken=edges.doorProblems();if(broken.length)throw Error('Door rule: '+broken.map(r=>`${r.door.a.x},${r.door.a.z}: ${r.problems.join('; ')}`).join(' | '));
 edges.bake();
 return {group,tiles:map,doors,edges,spawn:t(...BUILDING_TEST.spawn)};
}
