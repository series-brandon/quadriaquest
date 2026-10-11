import * as THREE from 'three';

// Models for features on tile edges (docs/CITY.md, Walls and doors on tile edges): walls, windows,
// fences, railings, low counters and door frames. Each piece runs along local X, one tile long,
// centred on the edge, with its base at y = 0. The building kit (city Phase 4) will restyle these;
// for now one plaster-and-timber look serves every map, the playground yard and the catalogue.
export const STOREY=1.5,WALL_THICKNESS=.14,DOOR_HEIGHT=1.3;
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const MATERIALS={plaster:mat('#e8dcc5'),timber:mat('#8a5b3c'),stone:mat('#b6afa3'),glass:mat('#a9d3e3',{transparent:true,opacity:.45,roughness:.15}),fence:mat('#9b6c46'),door:mat('#7b4b2d'),iron:mat('#4b4651',{roughness:.5,metalness:.3})};
const geometries=new Map();
function box(w,h,d){const id=`${w},${h},${d}`;if(!geometries.has(id))geometries.set(id,new THREE.BoxGeometry(w,h,d));return geometries.get(id);}
function piece(parent,w,h,d,material,x,y,z=0){const m=new THREE.Mesh(box(w,h,d),MATERIALS[material]);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
// Parts are stacked without overlapping (stone base, plaster, timber cap), so no two faces share a
// plane and nothing flickers. Trim stands slightly proud of the plaster. Corner posts are not part of
// a piece: createEdgeFeatures (doors.js) puts one post on each grid corner where pieces meet.
const BASE=.16,CAP=.1,PROUD=.04;
function band(g,y0,y1,material,thickness=WALL_THICKNESS,width=1){if(y1>y0)piece(g,width,y1-y0,thickness,material,0,(y0+y1)/2);}
export const POST_SIZE=WALL_THICKNESS+.06;
export const hasPosts=kind=>kind==='wall'||kind==='window'||kind==='door';
export function cornerPost(height){const g=new THREE.Group();piece(g,POST_SIZE,height,POST_SIZE,'timber',0,height/2);return g;}

// height: the piece's full height (a storey above the higher of the two tiles, from the lower one).
export function edgePiece(kind,{height=STOREY}={}){
 const g=new THREE.Group();g.name='edge-'+kind;
 if(kind==='wall'){
  band(g,0,BASE,'stone',WALL_THICKNESS+PROUD);band(g,BASE,height-CAP,'plaster');band(g,height-CAP,height,'timber',WALL_THICKNESS+PROUD);
 }else if(kind==='window'){
  const sill=.55,lintel=Math.min(height-CAP-.15,1.2);
  band(g,0,BASE,'stone',WALL_THICKNESS+PROUD);band(g,BASE,sill,'plaster');
  band(g,sill,sill+.06,'timber',WALL_THICKNESS+PROUD+.02);
  band(g,sill+.06,lintel,'glass',.03,.9);piece(g,.05,lintel-sill-.06,WALL_THICKNESS,'timber',0,(sill+.06+lintel)/2);
  // Jambs either side of the glass, flush with the plaster.
  for(const x of [-.475,.475])piece(g,.05,lintel-sill-.06,WALL_THICKNESS,'plaster',x,(sill+.06+lintel)/2);
  band(g,lintel,lintel+.07,'timber',WALL_THICKNESS+PROUD);band(g,lintel+.07,height-CAP,'plaster');band(g,height-CAP,height,'timber',WALL_THICKNESS+PROUD);
 }else if(kind==='fence'||kind==='railing'){
  const h=kind==='fence'?.6:.7;
  for(const x of [-.46,.46])piece(g,.08,h,.08,'fence',x,h/2);
  for(const y of kind==='fence'?[.22,.5]:[.32,.66])piece(g,.84,.06,.05,'fence',0,y);
 }else if(kind==='low'){
  band(g,0,.42,'stone',WALL_THICKNESS+.12);band(g,.42,.48,'timber',WALL_THICKNESS+.22,1.02);
 }
 return g;
}
// A door in its frame. `leaf` is the hinge pivot and `panel` the door itself; setDoorHinge puts the
// hinge on either jamb (the panel mirrors so its handle stays opposite), animateDoor sets the swing.
export function doorModel({height=STOREY}={}){
 const g=new THREE.Group();g.name='edge-door';
 for(const x of [-.465,.465])piece(g,.07,DOOR_HEIGHT,WALL_THICKNESS+PROUD,'timber',x,DOOR_HEIGHT/2);
 band(g,DOOR_HEIGHT,DOOR_HEIGHT+.1,'timber',WALL_THICKNESS+PROUD);band(g,DOOR_HEIGHT+.1,height-CAP,'plaster');band(g,height-CAP,height,'timber',WALL_THICKNESS+PROUD);
 piece(g,.86,.03,WALL_THICKNESS+.06,'stone',0,.015);
 const leaf=new THREE.Group();leaf.name='door-leaf';g.add(leaf);
 const panel=new THREE.Group();panel.name='door-panel';leaf.add(panel);
 piece(panel,.86,DOOR_HEIGHT-.05,.06,'door',0,(DOOR_HEIGHT-.05)/2+.03);
 for(const y of [.28,DOOR_HEIGHT-.3])piece(panel,.8,.05,.075,'iron',0,y);
 piece(panel,.06,.06,.12,'iron',.33,DOOR_HEIGHT*.48);
 const door={group:g,leaf,panel,swing:-Math.PI/2};setDoorHinge(door,-1,1);return door;
}
// hinge: -1 the local −x jamb, +1 the +x jamb. inward: ±1 along local z, the side it opens towards.
// Fully open, the panel lies flat along the tile edge at the hinge corner (a quarter turn).
export function setDoorHinge(door,hinge,inward){
 door.leaf.position.x=hinge*.43;door.panel.position.x=-hinge*.43;door.panel.scale.x=-hinge;
 door.swing=inward*hinge*Math.PI/2;
}
// open: 0 shut → 1 swung fully open (a quarter turn, inwards). rattle (0..1, decaying): a locked door shakes.
export function animateDoor(door,open,rattle=0,time=0){
 door.leaf.rotation.y=(door.swing??-Math.PI/2)*open+Math.sin(time*60)*.03*rattle;
}
// Where an edge between two neighbouring tiles sits in the world, and the height a piece needs there.
export function edgePlacement(a,b){
 const base=Math.min(a.h,b.h),height=Math.abs(a.h-b.h)+STOREY;
 return {x:(a.x+b.x)/2-6,y:base,z:(a.z+b.z)/2-6,rotation:a.x!==b.x?Math.PI/2:0,height};
}
