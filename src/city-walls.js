import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {applyCutaway,registerCutSource,sectionMaterial} from './cutaway.js';
import {setEdge,edgeBetween} from './world.js';

// City walls (docs/WORLD.md, City walls): a castle curtain wall around a city's square footprint, the
// keep's look at city scale. Thick (THICKNESS tiles, room for slime guards to walk the top) and tall
// (HEIGHT), with a crenellated walkway, a plinth and arrow slits; big round towers at the corners; and a
// gatehouse at each gateway with large double doors. Shared by any city (map data `walls`).
//   - The wall's tiles are solid and block sight; gateway passages stay open, with the doors across them.
//   - Each piece (a run of wall per chunk, a tower, a gatehouse) is one merged mesh and its own cutaway
//     owner (ids from WALL_IDS), so the piece near you or between you and the camera cuts down like a
//     building, and the rest stands.
//   - The double doors are one entity across the passage: open by default, clicked to close or open, and
//     an ordinary door to routes and townsfolk (each passage edge is a door feature sharing its state).
export const THICKNESS=3,HEIGHT=6,TOWER_HEIGHT=8.5,TOWER_RADIUS=3.3,GATE_OPENING=3.6,GATEHOUSE_HEIGHT=7.6,WALL_IDS=1000;
const COLOR={cut:'#8a8378',wall:'#bdb6aa',dark:'#a39c90',plinth:'#8f897f',top:'#cfc8bb',merlon:'#c6bfb3',slit:'#3a3530',wood:'#7a5233',woodDark:'#5e3f27',iron:'#4b4651',roof:'#6c7a8c'};
const SWING=1.6;

// Which tiles the wall covers, the gateway passages, and the towers, for a city `size` tiles square.
// gates: [{side, from, to}] (map `gates`).
export function wallPlan({size,gates=[],thickness=THICKNESS}){
 const N=size-1,inPassage=(x,z)=>gates.find(g=>{const along=g.side==='west'||g.side==='east'?z:x,depth=g.side==='west'?x:g.side==='east'?N-x:g.side==='north'?z:N-z;return along>=g.from&&along<=g.to&&depth>=0&&depth<thickness;})||null;
 const solid=new Set();
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){const d=Math.min(x,z,N-x,N-z);if(d<thickness&&!inPassage(x,z))solid.add(`${x},${z}`);}
 const towers=[[0,0],[N,0],[0,N],[N,N]].map(([x,z])=>({x:x===0?(thickness-1)/2:N-(thickness-1)/2,z:z===0?(thickness-1)/2:N-(thickness-1)/2}));
 return {size,thickness,solid,gates,towers,inPassage};
}

// Box and cylinder parts with a colour and a cutaway owner, merged into one non-indexed geometry with
// `color` and `cutOwner` (owner, -1, base) attributes.
function merge(parts,owner,base){
 const geometries=parts.map(({geometry,color,position,rotation=[0,0,0]})=>{
  const g=(geometry.index?geometry.toNonIndexed():geometry.clone());geometry.dispose();g.deleteAttribute('uv');
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));
  const n=g.attributes.position.count,c=new THREE.Color(color),colors=new Float32Array(n*3),own=new Float32Array(n*3);
  for(let i=0;i<n;i++){colors.set([c.r,c.g,c.b],i*3);own.set([owner,-1,base],i*3);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('cutOwner',new THREE.Float32BufferAttribute(own,3));return g;});
 const merged=mergeGeometries(geometries);for(const g of geometries)g.dispose();return merged;
}
const box=(w,h,d,color,position,rotation)=>({geometry:new THREE.BoxGeometry(w,h,d),color,position,rotation});
const cylinder=(r0,r1,h,n,color,position)=>({geometry:new THREE.CylinderGeometry(r0,r1,h,n),color,position});

// A straight run of wall from a to b along x (local), THICKNESS deep (centred on z = 0), base y = 0.
// outward: +1 if the outside is +z. Merlons sit on both parapets; arrow slits on the outer face.
function runParts(a,b,outward,height=HEIGHT,thickness=THICKNESS){
 const len=b-a,mid=(a+b)/2,parts=[],half=thickness/2;
 parts.push(box(len,.7,thickness+.24,COLOR.plinth,[mid,.35,0]));
 parts.push(box(len,height-.7,thickness,COLOR.wall,[mid,.7+(height-.7)/2,0]));
 parts.push(box(len,.16,thickness+.16,COLOR.dark,[mid,height-.75,0]));
 parts.push(box(len,.08,thickness-.7,COLOR.top,[mid,height+.04,0]));
 for(const side of [-1,1]){
  parts.push(box(len,.42,.34,COLOR.wall,[mid,height+.21,side*(half-.17)]));
  for(let x=Math.ceil(a)+.25;x+.5<=b;x+=1)parts.push(box(.5,.46,.38,COLOR.merlon,[x+.25,height+.65,side*(half-.17)]));
 }
 for(let x=Math.ceil(a)+2;x<b-1;x+=4)parts.push(box(.14,.9,.06,COLOR.slit,[x,height*.55,outward*(half+.01)]));
 return parts;
}
function towerParts(height=TOWER_HEIGHT,radius=TOWER_RADIUS){
 const parts=[cylinder(radius+.15,radius+.25,.8,16,COLOR.plinth,[0,.4,0]),cylinder(radius,radius+.1,height-.8,16,COLOR.wall,[0,.8+(height-.8)/2,0]),
  cylinder(radius+.22,radius+.22,.22,16,COLOR.dark,[0,height-.4,0]),cylinder(radius-.4,radius-.4,.06,16,COLOR.top,[0,height+.03,0])];
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;if(i%2)continue;parts.push(box(.9,.6,.42,COLOR.merlon,[Math.cos(a)*(radius-.1),height+.3,Math.sin(a)*(radius-.1)],[0,-a+Math.PI/2,0]));}
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;parts.push(box(.16,1,.08,COLOR.slit,[Math.cos(a)*(radius+.06),height*.6,Math.sin(a)*(radius+.06)],[0,-a+Math.PI/2,0]));}
 return parts;
}
// A gatehouse over a passage `width` tiles wide (local x centred on 0), THICKNESS deep: two flanking
// blocks, the lintel over the opening, a taller crenellated top.
function gatehouseParts(width,outward,height=GATEHOUSE_HEIGHT){
 const flank=1.6,span=width+flank*2,depth=THICKNESS+.6,parts=[];
 for(const s of [-1,1]){const cx=s*(width/2+flank/2);parts.push(box(flank,.8,depth+.2,COLOR.plinth,[cx,.4,0]),box(flank,height-.8,depth,COLOR.wall,[cx,.8+(height-.8)/2,0]));}
 parts.push(box(width,height-GATE_OPENING,depth,COLOR.wall,[0,GATE_OPENING+(height-GATE_OPENING)/2,0]));
 parts.push(box(width+.2,.3,depth+.1,COLOR.dark,[0,GATE_OPENING+.15,0]));
 parts.push(box(span,.2,depth+.2,COLOR.dark,[0,height-.5,0]),box(span-.6,.08,depth-.6,COLOR.top,[0,height+.04,0]));
 for(const z of [-1,1])for(let x=-span/2+.35;x<span/2;x+=1)parts.push(box(.5,.6,.4,COLOR.merlon,[x,height+.3,z*(depth/2-.2)]));
 for(const s of [-1,1])parts.push(box(.16,1,.06,COLOR.slit,[s*(width/2+flank/2),height*.62,outward*(depth/2+.01)]));
 return parts;
}
// The double doors' model: two leaves on hinges at the passage sides (local x ±width/2).
export function cityGateModel(width=3,height=GATE_OPENING-.1){
 const group=new THREE.Group();group.name='city-gate';const leaves=[];
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,flatShading:true});
 for(const s of [-1,1]){
  const hinge=new THREE.Group();hinge.position.x=s*width/2;group.add(hinge);
  const w=width/2,parts=[box(w-.04,height,.22,COLOR.wood,[-s*w/2,height/2,0])];
  for(let i=1;i<4;i++)parts.push(box(.05,height-.1,.24,COLOR.woodDark,[-s*(i*w/4),height/2,0]));
  for(const y of [.55,height/2,height-.55])parts.push(box(w-.1,.14,.27,COLOR.iron,[-s*w/2,y,0]));
  parts.push(cylinder(.07,.07,.12,8,COLOR.iron,[-s*(w-.25),height*.48,.16]));
  const geometry=merge(parts.map(p=>({...p})),-1,0);geometry.deleteAttribute('cutOwner');
  const leaf=new THREE.Mesh(geometry,material);leaf.castShadow=leaf.receiveShadow=true;hinge.add(leaf);leaves.push({hinge,side:s});
 }
 return {group,set(amount){for(const {hinge,side} of leaves)hinge.rotation.y=side*amount*SWING;}};
}

// A wall piece on its own, for the model catalogue: 'run' (8 tiles), 'tower' or 'gatehouse' (3-wide).
export function wallPiecePreview(kind){
 const parts=kind==='tower'?towerParts():kind==='gatehouse'?gatehouseParts(3,1):runParts(-4,4,1);
 const geometry=merge(parts,-1,0);geometry.deleteAttribute('cutOwner');
 const group=new THREE.Group();group.name='city-wall-'+kind;group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,flatShading:true})));
 if(kind==='gatehouse'){const gate=cityGateModel(3);gate.set(1);gate.group.position.z=THICKNESS/2-.5;group.add(gate.group);}
 return group;
}
// Builds a city's walls. chunkRoot(x, z) → the chunk group a piece belongs to; tileAt(x, z) → tile;
// sound(name) for the doors. Returns {pieces, gates, update(dt), dispose()}.
export function buildCityWalls({plan,tileAt,chunkRoot,root,pickables=[],sound=()=>{},offset=6}){
 const {size,thickness,solid,gates,towers}=plan,N=size-1,base=Math.min(...[...solid].map(k=>tileAt(...k.split(',').map(Number))?.h??1)),pieces=[];
 for(const k of solid){const t=tileAt(...k.split(',').map(Number));if(t){t.blocked=true;t.blocksSight=true;t.cityWall=true;}}
 const material=applyCutaway(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,flatShading:true})),section=sectionMaterial();
 // A cut wall this thick shows a broad cut face: stone, not the dark section of a building's thin walls.
 section.color.set(COLOR.cut);
 let nextId=WALL_IDS;
 function addPiece(parts,{x0,z0,x1,z1,top},at,rotation=0){
  const id=nextId++,geometry=merge(parts,id,base);
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.name='city-wall';
  const inside=new THREE.Mesh(geometry,section);inside.name='city-wall-section';
  const group=new THREE.Group();group.position.set(at.x-offset,base,at.z-offset);group.rotation.y=rotation;group.add(mesh,inside);
  chunkRoot(at.x,at.z).add(group);group.updateMatrixWorld(true);
  pieces.push({id,group,box:{x0:x0-offset-.5,z0:z0-offset-.5,x1:x1-offset+.5,z1:z1-offset+.5,base,top:base+top}});
 }
 const mid=(thickness-1)/2;
 // Each side: the line along its middle (`fixed`), whether it runs along x, and which way is outside.
 // Pieces are built in a local frame (x along the wall, z across, +z outward) and turned into place.
 const SIDES={north:{fixed:mid,horizontal:true,outward:-1},south:{fixed:N-mid,horizontal:true,outward:1},west:{fixed:mid,horizontal:false,outward:-1},east:{fixed:N-mid,horizontal:false,outward:1}};
 // Local +z must point outside: north (−z) turns half, south none, west (−x) a quarter one way, east the other.
 const turn=side=>({north:Math.PI,south:0,west:-Math.PI/2,east:Math.PI/2})[side];
 // A local x (along) maps to world along-coordinate: north and east run backwards after their turn.
 const flip=side=>side==='north'||side==='east'?-1:1;
 function place(side,from,to,parts,top){
  const info=SIDES[side],centre=(from+to)/2,at=info.horizontal?{x:Math.round(centre),z:Math.round(info.fixed)}:{x:Math.round(info.fixed),z:Math.round(centre)};
  const shiftAlong=(centre-(info.horizontal?at.x:at.z))*flip(side),shiftAcross=(info.fixed-(info.horizontal?at.z:at.x))*info.outward;
  const moved=parts.map(p=>({...p,position:[p.position[0]+shiftAlong,p.position[1],p.position[2]+shiftAcross]}));
  const lo=Math.round(info.fixed-mid),hi=Math.round(info.fixed+mid);
  const ext=info.horizontal?{x0:Math.floor(from+.5),x1:Math.ceil(to-.5),z0:lo,z1:hi}:{z0:Math.floor(from+.5),z1:Math.ceil(to-.5),x0:lo,x1:hi};
  addPiece(moved,{...ext,top},at,turn(side));
 }
 for(const [side,info] of Object.entries(SIDES)){
  // Runs break at the corner towers and at each gatehouse's span (the gateway ± 1.6 tiles of flank).
  const breaks=[[-Infinity,mid+TOWER_RADIUS-.6],[N-mid-TOWER_RADIUS+.6,Infinity],...gates.filter(g=>g.side===side).map(g=>[g.from-.5-1.6,g.to+.5+1.6])].sort((p,q)=>p[0]-q[0]);
  for(let i=0;i<breaks.length-1;i++){let a=breaks[i][1];const b=breaks[i+1][0];
   // Split at chunk borders so each piece lives in, streams with and cuts with its chunk.
   while(b-a>.01){const c=Math.min(b,(Math.floor((a+.5)/16)+1)*16-.5),half=(c-a)/2;place(side,a,c,runParts(-half,half,1),HEIGHT+.9);a=c;}
  }
 }
 for(const t of towers){const at={x:Math.round(t.x),z:Math.round(t.z)};addPiece(towerParts().map(p=>({...p,position:[p.position[0]+t.x-at.x,p.position[1],p.position[2]+t.z-at.z]})),{x0:Math.floor(t.x-TOWER_RADIUS),z0:Math.floor(t.z-TOWER_RADIUS),x1:Math.ceil(t.x+TOWER_RADIUS),z1:Math.ceil(t.z+TOWER_RADIUS),top:TOWER_HEIGHT+.6},at);}
 // Gatehouses and their double doors (across the passage, one tile in from the outside).
 const gateEntities=[];
 for(const g of gates){
  const width=g.to-g.from+1;
  place(g.side,g.from-.5-1.6,g.to+.5+1.6,gatehouseParts(width,1),GATEHOUSE_HEIGHT+.6);
  gateEntities.push(createCityGate({gate:g,size,tileAt,parent:chunkRoot(...(SIDES[g.side].horizontal?[Math.round((g.from+g.to)/2),Math.round(SIDES[g.side].fixed)]:[Math.round(SIDES[g.side].fixed),Math.round((g.from+g.to)/2)])),pickables,sound,offset,side:g.side}));
 }
 const source={root,boxes:()=>pieces.map(p=>[p.id,p.box]),parts:()=>[]};
 const unregister=registerCutSource(source);
 return {pieces,gates:gateEntities,base,
  update(dt){for(const g of gateEntities)g.update(dt);},
  dispose(){unregister();for(const p of pieces){p.group.removeFromParent();p.group.children[0].geometry.dispose();}for(const g of gateEntities)g.dispose();material.dispose();}};
}

// The double doors across a gateway passage, one tile in from the outside: one entity, one model, and a
// door feature on each passage edge sharing its open state.
function createCityGate({gate,size,tileAt,parent,pickables,sound,offset,side}){
 const N=size-1,horizontal=side==='north'||side==='south',outward=side==='north'||side==='west'?-1:1,depth=outward<0?0:N,inner=outward<0?1:N-1,edges=[];
 for(let i=gate.from;i<=gate.to;i++){const [a,b]=horizontal?[tileAt(i,inner),tileAt(i,depth)]:[tileAt(inner,i),tileAt(depth,i)];if(a&&b)edges.push([a,b]);}
 const width=gate.to-gate.from+1,model=cityGateModel(width),centre=(gate.from+gate.to)/2,line=outward<0?.5:N-.5;
 model.group.position.set((horizontal?centre:line)-offset,(edges[0]?.[0].h??1),(horizontal?line:centre)-offset);
 // The leaves open towards local +z: turn the model so that is inwards.
 model.group.rotation.y=({north:0,south:Math.PI,west:Math.PI/2,east:-Math.PI/2})[side];parent.add(model.group);
 const gateEntity={kind:'cityGate',label:'',open:true,amount:1,locked:false,ready:true,opened:false,duration:0,tile:edges[1]?.[0]||edges[0]?.[0],
  get x(){return gateEntity.tile.x;},get z(){return gateEntity.tile.z;},
  setOpen(value,{quiet=false}={}){value=!!value;if(value===gateEntity.open)return;gateEntity.open=value;if(!quiet)sound(value?'doorOpen':'doorClose');},
  interact(){gateEntity.setOpen(!gateEntity.open);},
  update(dt){const target=gateEntity.open?1:0;if(gateEntity.amount!==target){gateEntity.amount+=Math.sign(target-gateEntity.amount)*Math.min(Math.abs(target-gateEntity.amount),dt*1.2);model.set(gateEntity.amount);}},
  dispose(){for(const [a,b] of edges)if(edgeBetween(a,b)?.cityGate===gateEntity)setEdge(a,b,null);model.group.removeFromParent();for(const m of meshes){const i=pickables.indexOf(m);if(i>=0)pickables.splice(i,1);}}};
 Object.defineProperty(gateEntity,'label',{get:()=>gateEntity.open?'Close the city gate':'Open the city gate'});
 // Each edge: an ordinary door to routes and townsfolk (open → passable), sharing the gate's state.
 for(const [a,b] of edges)setEdge(a,b,{kind:'door',cityGate:gateEntity,a,b,get open(){return gateEntity.open;},get locked(){return gateEntity.locked;},setOpen:(v,o)=>gateEntity.setOpen(v,o),gate:true});
 model.set(1);
 const meshes=[];model.group.traverse(m=>{if(m.isMesh){m.userData.actor=gateEntity;m.userData.tile=gateEntity.tile;pickables.push(m);meshes.push(m);}});
 return gateEntity;
}
