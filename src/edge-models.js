import * as THREE from 'three';

// Models for features on tile edges (docs/CITY.md, Walls and doors on tile edges): walls, windows,
// fences, railings, low counters and door frames. Each piece runs along local X, one tile long,
// centred on the edge, with its base at y = 0.
// Styles (docs/CITY.md, The building kit) are palettes and trim, never collision: 'timber' (plaster and
// timber, the default), 'stone' (pale stone, the castle quarter), 'brick' (the craft quarter) and
// 'graybox' (plain grey boxes for judging scale and massing before art).
export const STOREY=1.5,WALL_THICKNESS=.14,DOOR_HEIGHT=1.3;
export const STYLES={
 timber:{base:'#b6afa3',wall:'#e8dcc5',trim:'#8a5b3c',door:'#7b4b2d'},
 stone:{base:'#9c968c',wall:'#cfc8bb',trim:'#a8a094',door:'#6e4a33',seamless:true},
 brick:{base:'#8f8a84',wall:'#b8644a',trim:'#5a4436',door:'#4f6a5a',seamless:true},
 graybox:{base:'#c9c6c1',wall:'#c9c6c1',trim:'#9d9a95',door:'#7b4b2d',flat:true,seamless:true},
 dungeon:{base:'#4a4740',wall:'#5e5a52',trim:'#3d3a35',door:'#4b3a2a',seamless:true},
};
export const STYLE_NAMES=Object.keys(STYLES);
// A style's palette. A style is a name, or a name with its own colours (a hand-coloured building,
// docs/TOWN.md): {name, wall?, trim?, base?, door?} over that style's palette.
export function stylePalette(style){
 if(!style||typeof style==='string')return STYLES[style]||STYLES.timber;
 const base=STYLES[style.name]||STYLES.timber,out={...base};for(const role of ['wall','trim','base','door'])if(style[role])out[role]=style[role];return out;
}
// A building's style as edge pieces take it: just the name, or the name with its colours.
export const buildingStyle=(name,colors)=>colors&&['wall','trim','base','door'].some(r=>colors[r])?{name,...Object.fromEntries(['wall','trim','base','door'].filter(r=>colors[r]).map(r=>[r,colors[r]]))}:name;
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
const shared={glass:mat('#a9d3e3',{transparent:true,opacity:.45,roughness:.15}),fence:mat('#9b6c46'),iron:mat('#4b4651',{roughness:.5,metalness:.3}),sill:mat('#b6afa3')};
const materials=new Map();
function material(style,role){
 if(shared[role])return shared[role];
 // Materials are shared by colour, so hand-coloured buildings reuse them too.
 const color=stylePalette(style)[role],id=`${role}:${color}`;
 if(!materials.has(id))materials.set(id,mat(color));return materials.get(id);
}
const geometries=new Map();
function box(w,h,d){const id=`${w},${h},${d}`;if(!geometries.has(id))geometries.set(id,new THREE.BoxGeometry(w,h,d));return geometries.get(id);}
function piece(parent,w,h,d,m,x,y,z=0){const mesh=new THREE.Mesh(box(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
// Parts are stacked without overlapping (stone base, wall, trim cap, floor bands), so no two faces
// share a plane and nothing flickers. Trim stands slightly proud of the wall. Corner posts are not
// part of a piece: createEdgeFeatures (doors.js) puts one post on each grid corner where pieces meet.
const BASE=.16,CAP=.1,PROUD=.04,FLOOR_BAND=.08;
export const POST_SIZE=WALL_THICKNESS+.06;
export const hasPosts=kind=>kind==='wall'||kind==='window'||kind==='door';
export function cornerPost(height,{style}={}){const g=new THREE.Group();piece(g,POST_SIZE,height,POST_SIZE,material(style,'trim'),0,height/2);return g;}

// The rows of a piece: storey i spans [rows[i], rows[i+1]]. A lower floor on one side (height beyond
// the storeys) all goes into the ground storey.
function storeyRows(height,storeys){const extra=Math.max(0,height-STOREY*storeys),rows=[0];for(let i=1;i<storeys;i++)rows.push(extra+STOREY*i);rows.push(height);return rows;}
// One storey of wall between y0 and y1: a base (ground storey) or a floor band (upper storeys), the
// wall or a window opening, and the cap (top storey).
function storeyBand(g,style,y0,y1,{ground,top,window}){
 const m=role=>material(style,role),flat=!!stylePalette(style).flat,proud=flat?0:PROUD;
 const band=(a,b,role,thickness=WALL_THICKNESS,width=1)=>{if(b>a+1e-4)piece(g,width,b-a,thickness,m(role),0,(a+b)/2);};
 let lo=y0,hi=y1;
 if(!flat){if(ground){band(y0,y0+BASE,'base',WALL_THICKNESS+proud);lo=y0+BASE;}else{band(y0,y0+FLOOR_BAND,'trim',WALL_THICKNESS+proud);lo=y0+FLOOR_BAND;}
  if(top){band(y1-CAP,y1,'trim',WALL_THICKNESS+proud);hi=y1-CAP;}}
 if(!window){band(lo,hi,'wall');return;}
 const sill=y0+.55,lintel=Math.min(hi-.12,y0+1.2);
 band(lo,sill,'wall');
 if(!flat)band(sill,sill+.06,'trim',WALL_THICKNESS+proud+.02);
 const glass0=flat?sill:sill+.06;
 band(glass0,lintel,'glass',.03,.9);
 if(!flat)piece(g,.05,lintel-glass0,WALL_THICKNESS,m('trim'),0,(glass0+lintel)/2);
 // Jambs either side of the glass, flush with the wall.
 for(const x of [-.475,.475])piece(g,.05,lintel-glass0,WALL_THICKNESS,m('wall'),x,(glass0+lintel)/2);
 if(flat)band(lintel,hi,'wall');else{band(lintel,lintel+.07,'trim',WALL_THICKNESS+proud);band(lintel+.07,hi,'wall');}
}
// Paint (docs/TOWN.md, Wall and floor paint): a coloured skin on one face of a wall's ground storey, between
// its base and the band above (around a window's glass). front: the face towards local +z, back: −z.
const paintMaterials=new Map();
function paintMaterial(color){if(!paintMaterials.has(color))paintMaterials.set(color,mat(color));return paintMaterials.get(color);}
const SKIN=.006;
function paintFaces(g,{front,back},{ground,top,window,y0,y1,flat}){
 const lo=y0+(ground&&!flat?BASE:0),hi=y1-(top&&!flat?CAP:0),spans=window?[[lo,y0+.55],[Math.min(hi-.12,y0+1.2)+(flat?0:.07),hi]]:[[lo,hi]];
 for(const [side,color] of [[1,front],[-1,back]])if(color)for(const [a,b] of spans)if(b>a+.01)piece(g,1,b-a,SKIN,paintMaterial(color),0,(a+b)/2,side*(WALL_THICKNESS/2+SKIN/2+.002));
}
// height: the piece's full height (storeys above the higher of the two tiles, from the lower one).
// upperWindows: a wall with windows on its upper storeys (the ground storey stays solid).
// paint: {front, back} colours for the ground storey's two faces (null: unpainted).
export function edgePiece(kind,{height=STOREY,storeys=Math.max(1,Math.floor(height/STOREY+.01)),style,upperWindows=false,paint=null}={}){
 const g=new THREE.Group();g.name='edge-'+kind;
 if(kind==='wall'||kind==='window'){
  const rows=storeyRows(height,storeys);
  for(let i=0;i<storeys;i++)storeyBand(g,style,rows[i],rows[i+1],{ground:i===0,top:i===storeys-1,window:kind==='window'||upperWindows&&i>0});
  if(paint)paintFaces(g,paint,{ground:true,top:storeys===1,window:kind==='window',y0:rows[0],y1:rows[1],flat:!!stylePalette(style).flat});
 }else if(kind==='fence'||kind==='railing'){
  const h=kind==='fence'?.6:.7;
  for(const x of [-.46,.46])piece(g,.08,h,.08,shared.fence,x,h/2);
  for(const y of kind==='fence'?[.22,.5]:[.32,.66])piece(g,.84,.06,.05,shared.fence,0,y);
 }else if(kind==='low'){
  piece(g,1,.42,WALL_THICKNESS+.12,material(style,'base'),0,.21);piece(g,1.02,.06,WALL_THICKNESS+.22,material(style,'trim'),0,.45);
 }
 return g;
}
// A door in its frame. `leaf` is the hinge pivot and `panel` the door itself; setDoorHinge puts the
// hinge on either jamb (the panel mirrors so its handle stays opposite), animateDoor sets the swing.
// sill: how far the higher floor stands above the lower one (a raised ground floor). The opening starts
// at the higher floor, with a stone step on the lower side (lower: ±1 along local z) up to it.
// `upper` holds everything above the ground storey (it hides when its building is cut, cutaway.js).
// Gates: a door entity in a fence line (fenceGate) or a dungeon's iron gate (ironGate). Same leaf and
// hinge as a door, with posts instead of a wall above.
export const GATE_STYLES=['fenceGate','ironGate'];
function gateModel(style){
 const g=new THREE.Group();g.name='edge-gate';const iron=style==='ironGate',h=iron?1.5:.9,post=iron?shared.iron:shared.fence;
 for(const x of [-.47,.47])piece(g,.09,h+.1,.09,post,x,(h+.1)/2);
 if(iron)piece(g,1,.08,.1,shared.iron,0,h+.06);
 const upper=new THREE.Group();upper.name='door-upper';g.add(upper);
 const leaf=new THREE.Group();leaf.name='door-leaf';g.add(leaf);const panel=new THREE.Group();panel.name='door-panel';leaf.add(panel);
 if(iron){for(const x of [-.36,-.18,0,.18,.36])piece(panel,.04,h-.1,.04,shared.iron,x,(h-.1)/2+.05);for(const y of [.2,h-.15])piece(panel,.84,.05,.05,shared.iron,0,y);}
 else{for(const y of [.25,.6])piece(panel,.84,.07,.05,shared.fence,0,y);for(const x of [-.36,0,.36])piece(panel,.08,.75,.05,shared.fence,x,.42);piece(panel,.07,.9,.04,shared.fence,0,.45).rotation.z=.85;}
 const door={group:g,leaf,panel,upper,swing:-Math.PI/2};setDoorHinge(door,-1,1);return door;
}
export function doorModel({height=STOREY,storeys=Math.max(1,Math.floor((height)/STOREY+.01)),sill=0,lower=1,style,upperWindows=false}={}){
 if(GATE_STYLES.includes(style))return gateModel(style);
 const g=new THREE.Group();g.name='edge-door';const m=role=>material(style,role),flat=!!stylePalette(style).flat,proud=flat?0:PROUD;
 const band=(parent,a,b,role,thickness=WALL_THICKNESS)=>{if(b>a+1e-4)piece(parent,1,b-a,thickness,m(role),0,(a+b)/2);};
 const rows=storeyRows(height,storeys),ground=rows[1];
 for(const x of [-.465,.465])piece(g,.07,DOOR_HEIGHT,WALL_THICKNESS+PROUD,m('trim'),x,sill+DOOR_HEIGHT/2);
 band(g,sill+DOOR_HEIGHT,sill+DOOR_HEIGHT+.1,'trim',WALL_THICKNESS+PROUD);
 if(storeys===1&&!flat){band(g,sill+DOOR_HEIGHT+.1,ground-CAP,'wall');band(g,ground-CAP,ground,'trim',WALL_THICKNESS+proud);}
 else band(g,sill+DOOR_HEIGHT+.1,ground,'wall');
 const upper=new THREE.Group();upper.name='door-upper';g.add(upper);
 for(let i=1;i<storeys;i++)storeyBand(upper,style,rows[i],rows[i+1],{ground:false,top:i===storeys-1,window:upperWindows});
 if(sill>0)piece(g,.9,sill,.32,m('base'),0,sill/2,lower*(WALL_THICKNESS/2+.16));
 piece(g,.86,.03,WALL_THICKNESS+.06,shared.sill,0,sill+.015);
 const leaf=new THREE.Group();leaf.name='door-leaf';leaf.position.y=sill;g.add(leaf);
 const panel=new THREE.Group();panel.name='door-panel';leaf.add(panel);
 piece(panel,.86,DOOR_HEIGHT-.05,.06,m('door'),0,(DOOR_HEIGHT-.05)/2+.03);
 for(const y of [.28,DOOR_HEIGHT-.3])piece(panel,.8,.05,.075,shared.iron,0,y);
 piece(panel,.06,.06,.12,shared.iron,.33,DOOR_HEIGHT*.48);
 const door={group:g,leaf,panel,upper,swing:-Math.PI/2};setDoorHinge(door,-1,1);return door;
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
// Where an edge between two neighbouring tiles sits in the world, and the height a piece needs there
// (`storeys` storeys above the higher tile).
export function edgePlacement(a,b,storeys=1){
 const base=Math.min(a.h,b.h),height=Math.abs(a.h-b.h)+STOREY*storeys;
 return {x:(a.x+b.x)/2-6,y:base,z:(a.z+b.z)/2-6,rotation:a.x!==b.x?Math.PI/2:0,height};
}
