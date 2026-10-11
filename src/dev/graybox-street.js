import * as THREE from 'three';
import {createTerrainBatch} from '../terrain-batch.js';
import {makeTerrainTile} from '../world-models.js';
import {createEdgeFeatures} from '../doors.js';
import {STOREY} from '../edge-models.js';
import {key} from '../world.js';
import {storeyFloors} from '../building-kit.js';
import {buildCity} from '../city-map.js';
import {kitStreetData} from './kit-street.js';

// Graybox street (playground only; docs/CITY.md, Phase 2). Plain grey buildings at the proposed scale,
// to judge the scale rules at every zoom on desktop and phone before any art:
//  - a 13 × 13 town square with a 3 × 3 fountain block and the waking crystal's spot;
//  - a 5-wide avenue north to the castle (the city is flat for now, user decision 2026-10-11: terraces
//    and stairs come back once buildings handle elevation well);
//  - 3-wide streets east, west and south; 2-wide alleys between buildings;
//  - the square ringed shoulder to shoulder by two- and three-storey buildings whose ground floors open
//    onto it (the square is the liveliest place in a city), with gaps only for the avenue and streets;
//  - small and medium houses, a terraced row of three sharing walls, and large or multi-storey shells
//    (solid, locked doors; their interiors are Phase 7), the castle and its towers.
// Ground floors are at street level (no step at the door). Every door follows the door rule. Layout only:
// walls, doors, routes and stairs are production code.
export const GRAYBOX={W:60,H:60,spawn:[30,36],plaza:{x0:24,z0:25,x1:36,z1:37},fountain:{x0:29,z0:30,x1:31,z1:32},crystal:[30,34]};
// House: enterable ground floor (upper storeys are Phase 7). Shell: solid, locked door. Doors are 'x,z,side'.
export const BUILDINGS=[
 // Around the square.
 {name:'square north-west (3 storeys)',kind:'house',storeys:3,x0:24,z0:21,x1:27,z1:24,door:'25,24,s'},
 {name:'square north-east (3 storeys)',kind:'house',storeys:3,x0:33,z0:21,x1:36,z1:24,door:'35,24,s'},
 {name:'square west (2 storeys)',kind:'house',storeys:2,x0:20,z0:25,x1:23,z1:28,door:'23,26,e'},
 {name:'square west (3 storeys)',kind:'house',storeys:3,x0:20,z0:33,x1:23,z1:37,door:'23,35,e'},
 {name:'square east (3 storeys)',kind:'house',storeys:3,x0:37,z0:25,x1:40,z1:28,door:'37,26,w'},
 {name:'square east (2 storeys)',kind:'house',storeys:2,x0:37,z0:33,x1:40,z1:37,door:'37,35,w'},
 {name:'square south-west (2 storeys)',kind:'house',storeys:2,x0:24,z0:38,x1:28,z1:41,door:'26,38,n'},
 {name:'square south-east (3 storeys)',kind:'house',storeys:3,x0:32,z0:38,x1:36,z1:41,door:'34,38,n'},
 {name:'corner north-west (2 storeys)',kind:'house',storeys:2,x0:20,z0:21,x1:23,z1:24,door:'20,22,w'},
 {name:'corner north-east (2 storeys)',kind:'house',storeys:2,x0:37,z0:21,x1:40,z1:24,door:'40,22,e'},
 {name:'corner south-west (2 storeys)',kind:'house',storeys:2,x0:20,z0:38,x1:23,z1:41,door:'20,39,w'},
 {name:'corner south-east (2 storeys)',kind:'house',storeys:2,x0:37,z0:38,x1:40,z1:41,door:'40,40,e'},
 // Along the streets.
 {name:'small house',kind:'house',x0:4,z0:25,x1:6,z1:27,door:'5,27,s'},
 {name:'small house (4×4)',kind:'house',x0:9,z0:24,x1:12,z1:27,door:'10,27,s'},
 {name:'medium house (5×5)',kind:'house',x0:13,z0:23,x1:17,z1:27,door:'15,27,s'},
 {name:'medium house (7×6)',kind:'house',x0:4,z0:34,x1:10,z1:39,door:'7,34,n'},
 {name:'large hall (6×8, two storeys)',kind:'shell',storeys:2,x0:12,z0:34,x1:17,z1:41,door:'14,34,n'},
 {name:'small house',kind:'house',x0:45,z0:25,x1:47,z1:27,door:'46,27,s'},
 {name:'two-storey house (6×5)',kind:'shell',storeys:2,x0:50,z0:23,x1:55,z1:27,door:'52,27,s'},
 {name:'terraced house 1',kind:'house',x0:43,z0:34,x1:45,z1:37,door:'44,34,n'},
 {name:'terraced house 2',kind:'house',x0:46,z0:34,x1:48,z1:37,door:'47,34,n'},
 {name:'terraced house 3',kind:'house',x0:49,z0:34,x1:51,z1:37,door:'50,34,n'},
 {name:'medium house (6×6)',kind:'house',x0:54,z0:34,x1:59,z1:39,door:'56,34,n'},
 {name:'south house (3×3)',kind:'house',x0:24,z0:45,x1:26,z1:47,door:'26,46,e'},
 {name:'south house (6×5)',kind:'house',x0:33,z0:45,x1:38,z1:49,door:'33,47,w'},
 // The north terrace and the castle.
 {name:'terrace house (6×6)',kind:'house',x0:20,z0:12,x1:25,z1:17,door:'25,14,e'},
 {name:'terrace house (4×4)',kind:'house',x0:14,z0:13,x1:17,z1:16,door:'17,14,e'},
 {name:'guild hall (8×8, two storeys)',kind:'shell',storeys:2,x0:35,z0:11,x1:42,z1:18,door:'35,14,w'},
 {name:'castle keep',kind:'shell',storeys:3,x0:24,z0:2,x1:36,z1:7,door:'30,7,s'},
 {name:'castle tower',kind:'shell',storeys:4,x0:21,z0:1,x1:23,z1:3},
 {name:'castle tower',kind:'shell',storeys:4,x0:37,z0:1,x1:39,z1:3},
 {name:'castle tower',kind:'shell',storeys:4,x0:21,z0:6,x1:23,z1:8},
 {name:'castle tower',kind:'shell',storeys:4,x0:37,z0:6,x1:39,z1:8},
];
const inRect=(r,x,z)=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;
// Ground: flat for now (one level everywhere).
export function groundHeight(){return 1;}
export const STREETS=[{x0:28,z0:9,x1:32,z1:24},{x0:2,z0:30,x1:23,z1:32},{x0:37,z0:30,x1:58,z1:32},{x0:29,z0:38,x1:31,z1:58},{x0:29,z0:8,x1:31,z1:8},{x0:2,z0:28,x1:23,z1:29},{x0:37,z0:28,x1:58,z1:29},{x0:2,z0:33,x1:23,z1:33},{x0:37,z0:33,x1:58,z1:33}];

// Kit street (city Phase 4): the same layout built with the building kit, so the two compare directly.
// Districts by style: timber around the square and west street, brick for the east (craft) street,
// stone for the castle quarter; the guild hall's roof colour marks it as public. Ring buildings facing
// the square are shops with awnings and signs. Shells (no interior) keep their locked doors.
const SHOP_ICONS=['hammers','rawFish','quickEat','swords','copperShield','quickRestore','bows','campfires'];
const SIDE_NAMES={n:'north',e:'east',s:'south',w:'west'};
export function kitDescription(b,i){
 const w=b.x1-b.x0+1,d=b.z1-b.z0+1,doors=[];
 if(b.door){const [x,z,side]=b.door.split(','),edge=SIDE_NAMES[side];doors.push({edge,at:edge==='north'?x-b.x0:edge==='east'?z-b.z0:edge==='south'?b.x1-x:b.z1-z});}
 const ring=b.name.startsWith('square '),castle=b.name.startsWith('castle'),tower=b.name==='castle tower';
 const style=castle||b.name.startsWith('terrace')||b.name.startsWith('guild')?'stone':i>=17&&i<=22?'brick':'timber';
 const roof=tower?'cone':b.name==='castle keep'?'flat':b.kind==='shell'||(b.storeys||1)>=3?'hip':i%3===2?'hip':'gable';
 const shop=ring&&i%2===0?{icon:SHOP_ICONS[(i/2)%SHOP_ICONS.length],edge:doors[0].edge}:null;
 return {name:b.name,footprint:[w,d],storeys:b.storeys||1,roof,style,doors,windows:tower?'none':'auto',chimney:!castle&&b.kind==='house',
  sign:shop,awning:shop?'striped':null,interior:b.kind==='shell'?'none':'inPlace',seed:i*7+3,roofColor:b.name.startsWith('guild')?'#7a4a8c':undefined};
}

export function createGrayboxStreet({scene,pickables,kit=false}){
 // Kit street: the same layout as city data (kit-street.js), built by the shared city builder.
 if(kit)return buildCity(kitStreetData(),{scene,pickables});
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const {W,H,plaza,fountain}=GRAYBOX,tiles=[];
 for(let z=1;z<=H;z++)for(let x=1;x<=W;x++){
  const building=BUILDINGS.find(b=>inRect(b,x,z)),base=groundHeight(x,z);
  tiles.push({x,z,h:base,indoor:!!building,building:building?BUILDINGS.indexOf(building):undefined,blocked:building?.kind==='shell'||inRect(fountain,x,z)||x===GRAYBOX.crystal[0]&&z===GRAYBOX.crystal[1],water:false,buildable:true});
 }
 const map=new Map(tiles.map(t=>[key(t.x,t.z),t])),t=(x,z)=>map.get(key(x,z));
 // Surfaces: the square, streets and stairs paved; house floors; grass elsewhere.
 const mats=Object.fromEntries(Object.entries({grass:'#8fb071',grass2:'#88aa6b',paving:'#b9b4aa',paving2:'#b1aca2',square:'#c8c2b6',square2:'#c0baae',floor:'#a49c90',floor2:'#9c9488'}).map(([k,c])=>[k,new THREE.MeshStandardMaterial({color:c,roughness:.95})]));
 const pick=(a,b,tile)=>mats[(tile.x+tile.z)%2?a:b];
 const surface=tile=>{const building=BUILDINGS.find(b=>inRect(b,tile.x,tile.z));
  if(building)return pick('floor','floor2',tile);if(inRect(plaza,tile.x,tile.z))return pick('square','square2',tile);
  if(STREETS.some(s=>inRect(s,tile.x,tile.z)))return pick('paving','paving2',tile);return pick('grass','grass2',tile);};
 createTerrainBatch({tiles,map,factory:tile=>makeTerrainTile(tile,map,surface(tile)),parent:group,pickables,preserve:Object.values(mats),roughness:.95});

 // Walls on every building outline; houses get windows every third tile, shells stand storeys tall.
 const edges=createEdgeFeatures({parent:group,pickables,tileAt:t,style:'graybox'}),doors=[],roofs=[];
 const dirs={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]};
 for(const b of BUILDINGS){
  const faces=[];for(let x=b.x0;x<=b.x1;x++){faces.push([x,b.z0,'n',x-b.x0]);faces.push([x,b.z1,'s',x-b.x0]);}for(let z=b.z0;z<=b.z1;z++){faces.push([b.x0,z,'w',z-b.z0]);faces.push([b.x1,z,'e',z-b.z0]);}
  for(const [x,z,side,i] of faces){
   const [dx,dz]=dirs[side],inside=t(x,z),outside=t(x+dx,z+dz),id=`${x},${z},${side}`;if(!outside)continue;
   // A wall shared with a neighbouring building is placed once, as tall as the taller of the two.
   const neighbour=BUILDINGS.find(o=>o!==b&&inRect(o,outside.x,outside.z));
   if(neighbour&&BUILDINGS.indexOf(neighbour)<BUILDINGS.indexOf(b))continue;
   const kind=id===b.door?'door':b.kind==='house'&&i%3===1&&!neighbour?'window':'wall';
   const f=edges.add(inside,outside,kind,{storeys:Math.max(b.storeys||1,neighbour?.storeys||1),locked:kind==='door'&&b.kind==='shell',owner:neighbour?[BUILDINGS.indexOf(b),BUILDINGS.indexOf(neighbour)]:BUILDINGS.indexOf(b)});if(kind==='door')doors.push(f);
  }
  // A flat grey roof over the walls (toggle with setRoofs); it hides while its building is cut.
  const top=Math.max(...[t(b.x0,b.z0),t(b.x1,b.z1)].map(tile=>tile.h))+STOREY*(b.storeys||1),roof=new THREE.Mesh(new THREE.BoxGeometry(b.x1-b.x0+1.3,.18,b.z1-b.z0+1.3),new THREE.MeshStandardMaterial({color:b.kind==='shell'?'#8d8a85':'#a8a39b',roughness:.9}));
  roof.position.set((b.x0+b.x1)/2-6,top+.09,(b.z0+b.z1)/2-6);roof.castShadow=roof.receiveShadow=true;roof.userData.building=b.name;group.add(roof);roofs.push(roof);edges.addCutPart(roof,BUILDINGS.indexOf(b));
  // Floors between storeys, so upper windows look into a storey, not down to the ground.
  const floors=storeyFloors({w:b.x1-b.x0+1,d:b.z1-b.z0+1,storeys:b.storeys||1});
  if(floors){floors.position.set((b.x0+b.x1)/2-6,top-STOREY*(b.storeys||1),(b.z0+b.z1)/2-6);group.add(floors);roofs.push(floors);edges.addCutPart(floors,BUILDINGS.indexOf(b));}
 }
 // The fountain block and the crystal's spot (placeholders until props, Phase 5).
 const fountainBlock=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.45,.55,24),new THREE.MeshStandardMaterial({color:'#9fb3c0',roughness:.6}));fountainBlock.position.set((fountain.x0+fountain.x1)/2-6,1.27,(fountain.z0+fountain.z1)/2-6);group.add(fountainBlock);
 const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.32,0),new THREE.MeshStandardMaterial({color:'#7fd6d0',roughness:.3,emissive:'#2a6b67'}));crystal.scale.y=2;crystal.position.set(GRAYBOX.crystal[0]-6,1.8,GRAYBOX.crystal[1]-6);group.add(crystal);
 const broken=edges.doorProblems();if(broken.length)throw Error('Door rule: '+broken.map(r=>`${r.door.a.x},${r.door.a.z}: ${r.problems.join('; ')}`).join(' | '));
 edges.bake();
 let roofsShown=true;
 return {group,tiles:map,doors,edges,roofs,spawn:t(...GRAYBOX.spawn),get roofsShown(){return roofsShown;},setRoofs(on){roofsShown=!!on;for(const r of roofs){r.userData.hiddenByMap=!roofsShown;r.visible=roofsShown;}}};
}
