import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {STOREY,STYLES,WALL_THICKNESS,stylePalette,buildingStyle} from './edge-models.js';
import {CUT_HEIGHT} from './cutaway.js';
import {icon} from './icons.js';

// The building kit (docs/CITY.md, The building kit; city Phase 4). A building is made from a short
// description, never modelled by hand:
//   {footprint:[6,5], storeys:1, roof:'gable', ridge:'x', style:'timber', rotation:0,
//    doors:[{edge:'south', at:2, locked:false}], windows:'auto', chimney:true,
//    sign:{icon:'hammers', edge:'south'}, awning:'striped', interior:'inPlace', seed:17}
// planBuilding turns it into gameplay data (interior tiles, edge features, doors, anchors), and
// createBuilding places that data through the shared edge features (doors.js) and adds the model:
// roof, chimney, awning, sign and flower boxes. The model and the collision come from the same plan,
// so they can't disagree. The same description always builds the same building (the seed drives
// window rhythm, chimney position, awning colour and flower boxes).
// `at` counts tiles clockwise along an edge (north west→east, east north→south, south east→west, west
// south→north), so rotating a building keeps each door's `at`.
// A shaped building (docs/TOWN.md, hand-shaped buildings) gives its footprint as tiles instead:
//   {cells:[[x, z], …] (offsets from the north-west of its bounds, any connected shape),
//    doors:[{tile:[x, z], side:'south'}], walls:{'x,z,side': 'window'|'wall'} (hand-set walls over the
//    automatic window rhythm), sign:{icon, tile:[x, z], side} (a sign on that wall; without a tile it
//    goes beside the first door on `edge`, as for rectangles), …the rest as above}
// Any building can also be hand-coloured and trimmed instead of seeded (docs/TOWN.md): colors:{wall,
// trim, base, door, roof} over its style's palette; chimney:{along (−1…1 along the ridge), side (−1 or 1)}
// for where it stands; flowerBoxes:['x,z,side', …] for which windows have them; awningColors:[stripe,
// stripe]. Unset, each comes from the seed as before.
// Its outline is split into straight runs of wall; the door rule and the window rhythm apply per run,
// and `at` counts along a run. The roof is built over rectangles the shape is split into (shapeRects).
export const ROOF_TYPES=['gable','hip','flat','cone'];
export const SIDES=['north','east','south','west'];
export const ROOF_COLORS={timber:'#b5553c',stone:'#5d6b7d',brick:'#4f5a54',graybox:'#a8a39b'};
export const AWNINGS=[['#c8463d','#f2ead8'],['#3f7d5b','#f2ead8'],['#3d63a8','#f2ead8'],['#d0913a','#f2ead8']];
const OVERHANG=.25,PITCH=.75,FLOOR_COLOR='#8a6a4f';
// Three sizes (docs/CITY.md, Scale rules) and the special shapes, ready for the catalogue and maps.
// The shaped ones show hand-shaped footprints (docs/TOWN.md): an L, a T and a U.
const block=(x0,z0,w,d)=>{const out=[];for(let z=z0;z<z0+d;z++)for(let x=x0;x<x0+w;x++)out.push([x,z]);return out;};
export const BUILDING_PRESETS={
 lHouse:{name:'L-shaped house',cells:[...block(0,0,7,3),...block(0,3,3,3)],storeys:1,roof:'gable',style:'timber',doors:[{tile:[5,2],side:'south'}],chimney:true,seed:21},
 tHall:{name:'T-shaped hall',cells:[...block(0,0,9,3),...block(3,3,3,4)],storeys:1,roof:'hip',style:'stone',doors:[{tile:[4,6],side:'south'}],chimney:false,seed:22},
 uCourt:{name:'U-shaped house',cells:[...block(0,0,8,3),...block(0,3,3,3),...block(5,3,3,3)],storeys:2,roof:'gable',style:'brick',doors:[{tile:[4,0],side:'north'}],chimney:true,seed:23},
 cottage:{name:'Cottage (small)',footprint:[3,3],storeys:1,roof:'gable',style:'timber',doors:[{edge:'south',at:1}],chimney:true,seed:3},
 shop:{name:'Shop (medium)',footprint:[6,5],storeys:1,roof:'gable',style:'timber',doors:[{edge:'south',at:2}],chimney:true,sign:{icon:'hammers',edge:'south'},awning:'striped',seed:17},
 townhouse:{name:'Townhouse (two storeys)',footprint:[4,4],storeys:2,roof:'hip',style:'brick',doors:[{edge:'south',at:1}],chimney:true,seed:8},
 hall:{name:'Hall (large)',footprint:[8,8],storeys:2,roof:'hip',style:'stone',doors:[{edge:'south',at:3,locked:true}],interior:'none',seed:5},
 terrace:{name:'Flat-roofed house',footprint:[5,4],storeys:2,roof:'flat',style:'stone',doors:[{edge:'south',at:2}],seed:11},
 tower:{name:'Tower',footprint:[3,3],storeys:4,roof:'cone',style:'stone',doors:[],interior:'none',seed:2},
};

// A small deterministic random source.
export function seeded(seed){let s=(seed>>>0)||1;return ()=>{s=s+0x6D2B79F5>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const turn=(side,steps)=>SIDES[(SIDES.indexOf(side)+steps)%4];
const OUT={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
// A shaped footprint turned clockwise a number of quarter turns, moved so its bounds start at 0, 0.
function turnCells(cells,steps){
 let out=cells.map(([x,z])=>[x,z]);
 for(let i=0;i<steps;i++){const d=Math.max(...out.map(c=>c[1]))+1;out=out.map(([x,z])=>[d-1-z,x]);}
 const mx=Math.min(...out.map(c=>c[0])),mz=Math.min(...out.map(c=>c[1]));return out.map(([x,z])=>[x-mx,z-mz]);
}
function turnTile([x,z],cells,steps){
 const marked=turnCells([...cells,[x,z]].map((c,i)=>[...c,i]).map(([a,b])=>[a,b]),steps);return marked.at(-1);
}
// The description with defaults filled in and its rotation (0/90/180/270, clockwise from above) applied.
export function normalizeBuilding(desc){
 const steps=((Math.round((desc.rotation||0)/90)%4)+4)%4;
 if(desc.cells){
  const cells=turnCells(desc.cells,steps),w=Math.max(...cells.map(c=>c[0]))+1,d=Math.max(...cells.map(c=>c[1]))+1;
  const walls=Object.fromEntries(Object.entries(desc.walls||{}).map(([id,kind])=>{const [x,z,side]=id.split(',');return [[...turnTile([+x,+z],desc.cells,steps),turn(side,steps)].join(','),kind];}));
  return {storeys:1,roof:'gable',style:'timber',windows:'auto',chimney:false,awning:null,sign:null,interior:'inPlace',seed:1,...desc,
   rotation:steps*90,cells,footprint:[w,d],walls,
   ...Array.isArray(desc.flowerBoxes)?{flowerBoxes:desc.flowerBoxes.map(id=>{const [x,z,side]=id.split(',');return [...turnTile([+x,+z],desc.cells,steps),turn(side,steps)].join(',');})}:{},
   doors:(desc.doors||[]).map(door=>({...door,tile:turnTile(door.tile,desc.cells,steps),side:turn(door.side,steps)})),
   sign:desc.sign?{...desc.sign,edge:turn(desc.sign.edge||desc.sign.side||desc.doors?.[0]?.side||'south',steps),...desc.sign.tile?{tile:turnTile(desc.sign.tile,desc.cells,steps),side:turn(desc.sign.side,steps)}:{}}:null};
 }
 const [w,d]=desc.footprint||[3,3];
 const longer=w>=d?'x':'z',ridge=desc.ridge||longer;
 return {storeys:1,roof:'gable',style:'timber',windows:'auto',chimney:false,awning:null,sign:null,interior:'inPlace',seed:1,...desc,
  rotation:steps*90,footprint:steps%2?[d,w]:[w,d],ridge:steps%2?(ridge==='x'?'z':'x'):ridge,
  doors:(desc.doors||[]).map(door=>({...door,edge:turn(door.edge,steps)})),
  sign:desc.sign?{...desc.sign,edge:turn(desc.sign.edge||desc.doors?.[0]?.edge||'south',steps)}:null};
}
// The outline, clockwise from the north-west corner: each tile on an edge, with the step outwards.
export function perimeter(w,d){
 const list=[];
 for(let i=0;i<w;i++)list.push({side:'north',at:i,x:i,z:0,out:[0,-1]});
 for(let i=0;i<d;i++)list.push({side:'east',at:i,x:w-1,z:i,out:[1,0]});
 for(let i=0;i<w;i++)list.push({side:'south',at:i,x:w-1-i,z:d-1,out:[0,1]});
 for(let i=0;i<d;i++)list.push({side:'west',at:i,x:0,z:d-1-i,out:[-1,0]});
 return list;
}
const sideLength=(side,w,d)=>side==='north'||side==='south'?w:d;

// Gameplay data for a building whose north-west tile is `origin` [x, z]. Throws on a door that can't
// follow the door rule (a door needs a wall on each side before a corner: 1 ≤ at ≤ length − 2).
export function planBuilding(description,origin=[0,0]){
 const desc=normalizeBuilding(description),[w,d]=desc.footprint,[ox,oz]=origin,random=seeded(desc.seed);
 if(desc.cells)return planShape(desc,origin,random);
 for(const door of desc.doors){const len=sideLength(door.edge,w,d);if(!(door.at>=1&&door.at<=len-2))throw Error(`${desc.name||'building'}: a ${door.edge} door at ${door.at} breaks the door rule (1…${len-2})`);}
 const period=2+Math.floor(random()*2),offset=Math.floor(random()*period);
 const tiles=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)tiles.push([ox+x,oz+z]);
 const edges=perimeter(w,d).map(p=>{
  const len=sideLength(p.side,w,d),door=desc.doors.find(o=>o.edge===p.side&&o.at===p.at),rhythm=(p.at-offset+period)%period===0&&p.at>0&&p.at<len-1;
  const kind=door?'door':desc.windows==='auto'&&rhythm?'window':'wall';
  return {a:[ox+p.x,oz+p.z],b:[ox+p.x+p.out[0],oz+p.z+p.out[1]],side:p.side,at:p.at,out:p.out,kind,door:door||null,upperWindows:desc.windows==='auto'&&desc.storeys>1&&(kind==='door'||rhythm)};
 });
 const doors=edges.filter(e=>e.door).map(e=>({edge:e.side,at:e.at,locked:!!e.door.locked||desc.interior==='none',inside:e.a,doorstep:e.b,out:e.out}));
 // Anchors: each door's doorstep and inside tile, a shopkeeper's spot two tiles in from the first door
 // (or as far in as fits), and the sign beside the door on its edge.
 const first=doors[0],keeper=first?[0,1,2].map(n=>[first.inside[0]-first.out[0]*n,first.inside[1]-first.out[1]*n]).filter(([x,z])=>x>=ox&&x<ox+w&&z>=oz&&z<oz+d).at(-1):null;
 const signEdge=desc.sign&&(edges.find(e=>e.side===desc.sign.edge&&e.kind==='door')||edges.find(e=>e.side===desc.sign.edge&&e.at===1));
 // The sign goes beside the door, on the side farther from the building's own corner first; the map
 // check in createBuilding skips a side tucked into a corner with a neighbour.
 const len=signEdge?sideLength(signEdge.side,w,d):0;
 const signOptions=signEdge?[signEdge.at+1,signEdge.at-1].filter(at=>at>=0&&at<len).sort((p,q)=>Math.min(q,len-1-q)-Math.min(p,len-1-p))
  .map(at=>edges.find(e=>e.side===signEdge.side&&e.at===at&&e.kind!=='door')).filter(Boolean).map(e=>({edge:e.side,tile:e.a,out:e.out,along:[e.a[0]-signEdge.a[0],e.a[1]-signEdge.a[1]]})):[];
 return {desc,x0:ox,z0:oz,x1:ox+w-1,z1:oz+d-1,w,d,tiles,edges,doors,
  anchors:{doors:doors.map(o=>({doorstep:o.doorstep,inside:o.inside})),keeper,sign:signOptions[0]||null,signOptions,awning:desc.awning&&first?{edge:first.edge,tile:first.inside,out:first.out}:null},
  // Variation from the seed (decorations only, never collision).
  chimney:desc.chimney?{along:(random()-.5)*.6,side:random()<.5?-1:1}:null,
  awningColors:AWNINGS[Math.floor(random()*AWNINGS.length)],
  flowerBoxes:edges.filter(e=>e.kind==='window'&&random()<.55&&desc.style!=='graybox').map(e=>e.a.join(',')+','+e.side),
  roofShade:(random()-.5)*.12,...handChoices(desc,edges,[ox,oz])};
}

// The outline of a shaped footprint as straight runs of wall, clockwise within each side: north runs go
// west→east, east runs north→south, south runs east→west, west runs south→north (as `at` on a
// rectangle). Each run: {side, out, cells:[[x, z]…] in order}.
export function shapeRuns(cells){
 const has=new Set(cells.map(c=>c.join(','))),bySide={north:[],east:[],south:[],west:[]};
 for(const [x,z] of cells)for(const [side,[dx,dz]] of Object.entries(OUT))if(!has.has(`${x+dx},${z+dz}`))bySide[side].push([x,z]);
 const runs=[];
 for(const side of SIDES){
  const horizontal=side==='north'||side==='south',line=c=>horizontal?c[1]:c[0],pos=c=>horizontal?c[0]:c[1];
  const sorted=bySide[side].sort((a,b)=>line(a)-line(b)||pos(a)-pos(b));
  let run=null;
  for(const c of sorted){if(run&&line(run.cells.at(-1))===line(c)&&pos(c)===pos(run.cells.at(-1))+1)run.cells.push(c);else{run={side,out:OUT[side],cells:[c]};runs.push(run);}}
 }
 for(const r of runs)if(r.side==='south'||r.side==='west')r.cells.reverse();
 return runs;
}
// A shaped footprint split into rectangles for its roof, largest first: [{x, z, w, d}] (ties go to the
// one nearest the north-west, so the same shape always splits the same way).
export function shapeRects(cells){
 const left=new Set(cells.map(c=>c.join(','))),rects=[];
 while(left.size){
  let best=null;
  for(const id of left){const [x,z]=id.split(',').map(Number);
   for(let w=1;left.has(`${x+w-1},${z}`);w++){let d=0;while([...Array(w).keys()].every(i=>left.has(`${x+i},${z+d}`)))d++;
    const area=w*d;if(!best||area>best.w*best.d||area===best.w*best.d&&(z<best.z||z===best.z&&x<best.x))best={x,z,w,d};}}
  for(let i=0;i<best.w;i++)for(let j=0;j<best.d;j++)left.delete(`${best.x+i},${best.z+j}`);
  rects.push(best);
 }
 return rects;
}
// Whether a set of tiles is one piece (edge to edge).
export function connectedCells(cells){
 if(!cells.length)return false;const has=new Set(cells.map(c=>c.join(','))),seen=new Set([cells[0].join(',')]),queue=[cells[0]];
 while(queue.length){const [x,z]=queue.pop();for(const [dx,dz] of Object.values(OUT)){const id=`${x+dx},${z+dz}`;if(has.has(id)&&!seen.has(id)){seen.add(id);queue.push([x+dx,z+dz]);}}}
 return seen.size===has.size;
}
// planBuilding for a shaped footprint (see the header): the same plan, walls following the outline.
function planShape(desc,[ox,oz],random){
 const cells=[...desc.cells].sort((a,b)=>a[1]-b[1]||a[0]-b[0]),[w,d]=desc.footprint,has=new Set(cells.map(c=>c.join(',')));
 if(!connectedCells(cells))throw Error(`${desc.name||'building'}: its footprint must be one connected piece`);
 const runs=shapeRuns(cells),period=2+Math.floor(random()*2),offset=Math.floor(random()*period);
 for(const door of desc.doors){const run=runs.find(r=>r.side===door.side&&r.cells.some(c=>c[0]===door.tile[0]&&c[1]===door.tile[1]));
  if(!run)throw Error(`${desc.name||'building'}: a door at ${door.tile} isn't on a ${door.side} outside wall`);
  const at=run.cells.findIndex(c=>c[0]===door.tile[0]&&c[1]===door.tile[1]);
  if(!(at>=1&&at<=run.cells.length-2))throw Error(`${desc.name||'building'}: a ${door.side} door at ${door.tile} breaks the door rule (it needs wall on both sides before a corner)`);}
 const tiles=cells.map(([x,z])=>[ox+x,oz+z]);
 const edges=runs.flatMap((run,r)=>run.cells.map(([x,z],at)=>{
  const len=run.cells.length,door=desc.doors.find(o=>o.side===run.side&&o.tile[0]===x&&o.tile[1]===z),rhythm=(at-offset+period)%period===0&&at>0&&at<len-1;
  // A hand-set wall (window or plain) wins over the rhythm; a door wins over both.
  const set=desc.walls?.[`${x},${z},${run.side}`],kind=door?'door':set||(desc.windows==='auto'&&rhythm?'window':'wall');
  return {a:[ox+x,oz+z],b:[ox+x+run.out[0],oz+z+run.out[1]],side:run.side,at,run:r,out:run.out,kind,door:door||null,upperWindows:desc.storeys>1&&(set?set==='window':desc.windows==='auto'&&(kind==='door'||rhythm))};
 }));
 const doors=edges.filter(e=>e.door).map(e=>({edge:e.side,at:e.at,locked:!!e.door.locked||desc.interior==='none',inside:e.a,doorstep:e.b,out:e.out}));
 const first=doors[0],keeper=first?[0,1,2].map(n=>[first.inside[0]-first.out[0]*n,first.inside[1]-first.out[1]*n]).filter(([x,z])=>has.has(`${x-ox},${z-oz}`)).at(-1):null;
 // A sign set on a wall hangs there; otherwise beside the first door on its side.
 const placed=desc.sign?.tile&&edges.find(e=>e.side===desc.sign.side&&e.a[0]===ox+desc.sign.tile[0]&&e.a[1]===oz+desc.sign.tile[1]&&e.kind!=='door');
 const signEdge=!placed&&desc.sign&&(edges.find(e=>e.side===desc.sign.edge&&e.kind==='door')||edges.find(e=>e.side===desc.sign.edge&&e.at===1));
 const runLen=e=>runs[e.run].cells.length;
 const signOptions=placed?[{edge:placed.side,tile:placed.a,out:placed.out,along:[0,0]}]:signEdge?[signEdge.at+1,signEdge.at-1].filter(at=>at>=0&&at<runLen(signEdge)).sort((p,q)=>Math.min(q,runLen(signEdge)-1-q)-Math.min(p,runLen(signEdge)-1-p))
  .map(at=>edges.find(e=>e.run===signEdge.run&&e.at===at&&e.kind!=='door')).filter(Boolean).map(e=>({edge:e.side,tile:e.a,out:e.out,along:[e.a[0]-signEdge.a[0],e.a[1]-signEdge.a[1]]})):[];
 return {desc,x0:ox,z0:oz,x1:ox+w-1,z1:oz+d-1,w,d,tiles,edges,doors,cells,rects:shapeRects(cells),
  anchors:{doors:doors.map(o=>({doorstep:o.doorstep,inside:o.inside})),keeper,sign:signOptions[0]||null,signOptions,awning:desc.awning&&first?{edge:first.edge,tile:first.inside,out:first.out}:null},
  chimney:desc.chimney?{along:(random()-.5)*.6,side:random()<.5?-1:1}:null,
  awningColors:AWNINGS[Math.floor(random()*AWNINGS.length)],
  flowerBoxes:edges.filter(e=>e.kind==='window'&&random()<.55&&desc.style!=='graybox').map(e=>e.a.join(',')+','+e.side),
  roofShade:(random()-.5)*.12,...handChoices(desc,edges,[ox,oz])};
}
// A shaped description's doors, hand-set walls and sign moved `dx`, `dz` tiles in its own frame: when a
// reshaped footprint's north-west corner moves, the editor keeps them on the same walls in the world.
export function shiftShaped(desc,dx,dz){
 const out=structuredClone(desc),move=([x,z])=>[x+dx,z+dz];
 out.doors=(desc.doors||[]).map(d=>({...d,tile:move(d.tile)}));
 if(desc.walls)out.walls=Object.fromEntries(Object.entries(desc.walls).map(([id,kind])=>{const [x,z,side]=id.split(',');return [[x*1+dx,z*1+dz,side].join(','),kind];}));
 if(desc.sign?.tile)out.sign={...desc.sign,tile:move(desc.sign.tile)};
 return out;
}
// A rectangular description as a shaped one (cells, doors by tile and side, rotation folded in), so the
// editor can reshape any building.
export function toShaped(description){
 // A shaped one with a rotation: the turn folded into its cells, doors, walls and sign.
 if(description.cells){if(!description.rotation)return structuredClone(description);
  const n=normalizeBuilding(description),out={...structuredClone(description),cells:n.cells,doors:n.doors.map(d=>({...d})),walls:n.walls,rotation:0};
  if(description.sign)out.sign=description.sign.tile?{...description.sign,tile:n.sign.tile,side:n.sign.side,edge:undefined}:{...description.sign,edge:n.sign.edge};
  if(out.sign&&out.sign.edge===undefined)delete out.sign.edge;return out;}
 const desc=normalizeBuilding(description),[w,d]=desc.footprint,cells=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)cells.push([x,z]);
 const outline=perimeter(w,d),doors=desc.doors.map(o=>{const p=outline.find(e=>e.side===o.edge&&e.at===o.at);return {...o,tile:[p.x,p.z],side:o.edge,edge:undefined,at:undefined};}).map(o=>{delete o.edge;delete o.at;return o;});
 const out={...structuredClone(description),cells,doors,rotation:0};delete out.footprint;delete out.ridge;
 if(desc.sign)out.sign={...desc.sign};return out;
}

// What the description chooses by hand over the seed (applied after the seed has been drawn from, so a
// hand choice never reshuffles the seeded ones): chimney position, flower boxes, awning colours.
function handChoices(desc,edges,[ox,oz]){
 const out={};
 if(desc.chimney&&typeof desc.chimney==='object')out.chimney={along:Math.max(-1,Math.min(1,desc.chimney.along??0))*.3,side:desc.chimney.side<0?-1:1};
 if(Array.isArray(desc.flowerBoxes)){const want=new Set(desc.flowerBoxes);out.flowerBoxes=edges.filter(e=>e.kind==='window'&&want.has(`${e.a[0]-ox},${e.a[1]-oz},${e.side}`)).map(e=>e.a.join(',')+','+e.side);}
 if(Array.isArray(desc.awningColors)&&desc.awningColors.length===2)out.awningColors=[...desc.awningColors];
 return out;
}

// Geometry helpers: flat-shaded, vertex-coloured triangles, merged per building.
function faces(list){
 const positions=[],colors=[],c=new THREE.Color();
 for(const {points,color} of list){c.set(color);const tris=points.length===3?[[0,1,2]]:points.length===4?[[0,1,2],[0,2,3]]:points.slice(1,-1).map((_,i)=>[0,i+1,i+2]);
  for(const tri of tris)for(const i of tri){positions.push(...points[i]);colors.push(c.r,c.g,c.b);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function solid(geometry,color,{x=0,y=0,z=0,ry=0,rx=0}={}){
 const g=geometry.index?geometry.toNonIndexed():geometry.clone();if(g.attributes.uv)g.deleteAttribute('uv');
 g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx,ry,0,'YXZ')).setPosition(x,y,z));
 const c=new THREE.Color(color),n=g.attributes.position.count,colors=new Float32Array(n*3);for(let i=0;i<n;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
 g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g;
}
// Lighten or darken in sRGB (as the eye sees it): in linear space a dark roof shaded twice turns black.
const shade=(color,amount)=>{const c=new THREE.Color(color),hsl={};c.getHSL(hsl,THREE.SRGBColorSpace);return c.setHSL(hsl.h,hsl.s,Math.min(1,Math.max(0,hsl.l+amount)),THREE.SRGBColorSpace).getStyle();};
// The roof (and chimney) of a w × d building whose walls top out at local y = 0, centred on the origin,
// and the floors between its storeys: seen through an upper window, a storey has a floor, not a drop
// to the ground. Floors hide with the roof when the building is cut.
export function roofGeometry({roof,w,d,ridge='x',style='timber',color,chimney=null,storeys=1}){
 const palette=stylePalette(style),roofColor=color||ROOF_COLORS[style?.name??style]||ROOF_COLORS.timber,trim=palette.trim,end=palette.wall;
 const along=ridge==='x'?w:d,across=ridge==='x'?d:w,L=along/2+OVERHANG,S=across/2+OVERHANG,wallL=along/2+WALL_THICKNESS/2,wallS=across/2+WALL_THICKNESS/2,parts=[];
 const dark=shade(roofColor,-.06),r=PITCH*S;
 if(roof==='gable'||roof==='hip'){
  const ridgeL=roof==='hip'?Math.max(0,L-S):L;
  parts.push(faces([
   {points:[[-L,0,-S],[L,0,-S],[ridgeL,r,0],[-ridgeL,r,0]],color:dark},
   {points:[[L,0,S],[-L,0,S],[-ridgeL,r,0],[ridgeL,r,0]],color:roofColor},
   // Fascia boards along the eaves give the roof an edge.
   {points:[[-L,-.1,-S],[L,-.1,-S],[L,0,-S],[-L,0,-S]],color:trim},{points:[[L,-.1,S],[-L,-.1,S],[-L,0,S],[L,0,S]],color:trim},
  ]));
  if(roof==='hip')parts.push(faces([{points:[[L,0,-S],[L,0,S],[ridgeL,r,0]],color:roofColor},{points:[[-L,0,S],[-L,0,-S],[-ridgeL,r,0]],color:dark},
   {points:[[L,-.1,-S],[L,-.1,S],[L,0,S],[L,0,-S]],color:trim},{points:[[-L,-.1,S],[-L,-.1,-S],[-L,0,-S],[-L,0,S]],color:trim}]));
  else{const h=r*(1-wallS/S);for(const s of [-1,1])parts.push(faces([{points:[[s*wallL,0,-s*wallS],[s*wallL,0,s*wallS],[s*wallL,h,s*wallS],[s*wallL,r,0],[s*wallL,h,-s*wallS]],color:end}]));}
  if(ridgeL>0)parts.push(solid(new THREE.BoxGeometry(ridgeL*2+.1,.08,.16),trim,{y:r+.02}));
 }else if(roof==='flat'){
  const W=along/2+.1,D=across/2+.1;
  parts.push(solid(new THREE.BoxGeometry(W*2,.12,D*2),shade(palette.base,-.05),{y:.06}));
  for(const s of [-1,1]){parts.push(solid(new THREE.BoxGeometry(W*2,.35,.14),palette.wall,{y:.29,z:s*(D-.07)}));parts.push(solid(new THREE.BoxGeometry(.14,.35,D*2-.28),palette.wall,{y:.29,x:s*(W-.07)}));}
  for(const s of [-1,1]){parts.push(solid(new THREE.BoxGeometry(W*2+.04,.06,.2),trim,{y:.49,z:s*(D-.07)}));parts.push(solid(new THREE.BoxGeometry(.2,.06,D*2-.28),trim,{y:.49,x:s*(W-.07)}));}
 }else if(roof==='cone'){
  const radius=Math.max(along,across)/2*1.45+.2,height=radius*1.8;
  parts.push(solid(new THREE.ConeGeometry(radius,height,8),roofColor,{y:height/2,ry:Math.PI/8}));
  parts.push(solid(new THREE.ConeGeometry(.06,.5,6),trim,{y:height+.2}));
 }
 if(chimney&&roof!=='cone'){
  const cx=chimney.along*(along/2),cz=roof==='flat'?chimney.side*(across/2-.6):chimney.side*S*.4,top=(roof==='flat'?.5:r)+.45;
  parts.push(solid(new THREE.BoxGeometry(.42,top,.42),palette.base,{x:cx,y:top/2,z:cz}),solid(new THREE.BoxGeometry(.5,.08,.5),trim,{x:cx,y:top+.04,z:cz}));
 }
 for(let k=1;k<storeys;k++)parts.push(solid(new THREE.BoxGeometry(along-WALL_THICKNESS-.02,.1,across-WALL_THICKNESS-.02),FLOOR_COLOR,{y:-k*STOREY-.05}));
 const merged=mergeGeometries(parts.map(g=>{if(!g.attributes.normal)g.computeVertexNormals();return g;}));for(const g of parts)g.dispose();
 if(ridge==='z')merged.rotateY(Math.PI/2);
 return merged;
}
// The roof of a shaped building in its local frame (centred on its bounds, eaves at y = 0): a roof over
// each rectangle of the shape. A smaller wing's ridge runs on into the bigger roof it joins, to that
// roof's ridge, so the two meet as one roof (its gable end hidden inside). A flat roof is one slab per
// rectangle with a parapet around the whole outline. Floors between storeys follow the rectangles.
export function shapeRoofGeometry({plan,roof,style='timber',color,chimney=null,storeys=1}){
 const {rects,w:W,d:D}=plan,palette=stylePalette(style),parts=[];
 const centre=r=>[r.x+(r.w-1)/2-(W-1)/2,r.z+(r.d-1)/2-(D-1)/2];
 // Ridges: the main (largest) block runs lengthwise; a wing joined to a bigger block on one axis
 // points its ridge at that block, so the roofs meet.
 const bigger=(o,r)=>rects.indexOf(o)<rects.indexOf(r);
 const touches=(r,side)=>rects.some(o=>o!==r&&bigger(o,r)&&(side==='north'?o.z+o.d===r.z&&o.x<r.x+r.w&&o.x+o.w>r.x:side==='south'?o.z===r.z+r.d&&o.x<r.x+r.w&&o.x+o.w>r.x:side==='west'?o.x+o.w===r.x&&o.z<r.z+r.d&&o.z+o.d>r.z:o.x===r.x+r.w&&o.z<r.z+r.d&&o.z+o.d>r.z));
 const ridgeOf=r=>{const ns=touches(r,'north')||touches(r,'south'),ew=touches(r,'west')||touches(r,'east');return ns&&!ew?'z':ew&&!ns?'x':r.w>=r.d?'x':'z';};
 const ridges=new Map(rects.map(r=>[r,ridgeOf(r)]));
 if(roof==='flat'){
  for(const r of rects){const [cx,cz]=centre(r);parts.push(solid(new THREE.BoxGeometry(r.w+.2,.12,r.d+.2),shade(palette.base,-.05),{x:cx,y:.06,z:cz}));}
  for(const e of plan.edges){const lx=e.a[0]-plan.x0-(W-1)/2+e.out[0]*.43,lz=e.a[1]-plan.z0-(D-1)/2+e.out[1]*.43,across=e.out[0]!==0;
   parts.push(solid(new THREE.BoxGeometry(across?.14:1.08,.35,across?1.08:.14),palette.wall,{x:lx,y:.29,z:lz}),solid(new THREE.BoxGeometry(across?.2:1.12,.06,across?1.12:.2),palette.trim,{x:lx,y:.49,z:lz}));}
 }else for(const r of rects){
  const ridge=ridges.get(r);let [cx,cz]=centre(r),w=r.w,d=r.d;
  // Run a wing's ridge on into a bigger roof across its ends (one that is at least as tall).
  for(const side of ridge==='z'?['north','south']:['west','east']){
   const other=rects.find(o=>o!==r&&ridges.get(o)!==ridge&&(side==='north'?o.z+o.d===r.z&&o.x<=r.x&&o.x+o.w>=r.x+r.w:side==='south'?o.z===r.z+r.d&&o.x<=r.x&&o.x+o.w>=r.x+r.w:side==='west'?o.x+o.w===r.x&&o.z<=r.z&&o.z+o.d>=r.z+r.d:o.x===r.x+r.w&&o.z<=r.z&&o.z+o.d>=r.z+r.d)&&(ridge==='z'?o.d>=r.w:o.w>=r.d));
   if(!other)continue;const reach=(ridge==='z'?other.d:other.w)/2;
   if(ridge==='z'){d+=reach;cz+=side==='north'?-reach/2:reach/2;}else{w+=reach;cx+=side==='west'?-reach/2:reach/2;}
  }
  const g=roofGeometry({roof:roof==='cone'?'hip':roof,w,d,ridge,style,color,chimney:r===rects[0]?chimney:null,storeys:1});g.translate(cx,0,cz);parts.push(g);
 }
 if(roof==='flat'&&chimney){const r=rects[0],[cx,cz]=centre(r),along=ridges.get(r)==='x'?r.w:r.d,across=ridges.get(r)==='x'?r.d:r.w,top=.95,
  x=ridges.get(r)==='x'?cx+chimney.along*along/2:cx+chimney.side*(across/2-.6),z=ridges.get(r)==='x'?cz+chimney.side*(across/2-.6):cz+chimney.along*along/2;
  parts.push(solid(new THREE.BoxGeometry(.42,top,.42),palette.base,{x,y:top/2,z}),solid(new THREE.BoxGeometry(.5,.08,.5),palette.trim,{x,y:top+.04,z}));}
 for(const r of rects){const [cx,cz]=centre(r);for(let k=1;k<storeys;k++)parts.push(solid(new THREE.BoxGeometry(r.w-WALL_THICKNESS-.02,.1,r.d-WALL_THICKNESS-.02),FLOOR_COLOR,{x:cx,y:-k*STOREY-.05,z:cz}));}
 const merged=mergeGeometries(parts.map(g=>{if(!g.attributes.normal)g.computeVertexNormals();return g;}));for(const g of parts)g.dispose();
 return merged;
}
// Just the floors between storeys (for buildings with their own roofs, like the graybox street).
export function storeyFloors({w,d,storeys}){
 const parts=[];for(let k=1;k<storeys;k++)parts.push(solid(new THREE.BoxGeometry(w-WALL_THICKNESS-.02,.1,d-WALL_THICKNESS-.02),FLOOR_COLOR,{y:k*STOREY-.05}));
 if(!parts.length)return null;const merged=mergeGeometries(parts);for(const g of parts)g.dispose();
 const mesh=new THREE.Mesh(merged,decorMaterial);mesh.name='building-floors';mesh.receiveShadow=true;return mesh;
}
const capMaterial=new THREE.MeshStandardMaterial({color:'#8d8a85',roughness:.95});
// Can't be walked into: no interior, a separate interior (its door leads elsewhere), or every door locked.
export const solidWhenCut=(desc,plan)=>desc.interior==='none'||desc.interior==='separate'||plan.doors.every(d=>d.locked);
const roofMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide});
const decorMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});
export function roofModel(options){const mesh=new THREE.Mesh(options.plan?.rects?shapeRoofGeometry(options):roofGeometry(options),roofMaterial);mesh.name='building-roof';mesh.castShadow=mesh.receiveShadow=true;return mesh;}

// Sign icons: the game's ink icons painted light on a dark board with a gilt edge (browser only; a plain board elsewhere).
const iconTextures=new Map();
function iconTexture(name){
 if(typeof document==='undefined')return null;
 if(iconTextures.has(name))return iconTextures.get(name);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#5a3d28';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#c9a24a';ctx.lineWidth=6;ctx.strokeRect(5,5,118,118);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;iconTextures.set(name,texture);
 const svg=icon(name).replace('class="game-icon"','width="96" height="96"').replaceAll('currentColor','#f3e6c8').replace('stroke-width="1.7"','stroke-width="2.4"');
 const image=new Image();image.addEventListener('load',()=>{ctx.drawImage(image,18,18,92,92);texture.needsUpdate=true;});image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 return texture;
}
// The building's small outside parts in its local frame (x along the wall, +z outwards): the awning
// over the door, the hanging sign, flower boxes under windows. world: tile → world position.
function decorFor(plan,world,sign=plan.anchors.sign){
 const parts=[],icons=[],palette=stylePalette(buildingStyle(plan.desc.style,plan.desc.colors)),face=WALL_THICKNESS/2;
 const frame=(tile,out)=>{const p=world(tile),ry=Math.atan2(out[0],out[1]);return {x:p.x+out[0]*.5,y:p.y,z:p.z+out[1]*.5,ry};};
 const place=(geometry,color,f,lx,ly,lz,extra={})=>{const c=Math.cos(f.ry),s=Math.sin(f.ry);parts.push(solid(geometry,color,{x:f.x+lx*c+lz*s,y:f.y+ly,z:f.z-lx*s+lz*c,ry:f.ry,...extra}));};
 if(plan.anchors.awning){
  const f=frame(plan.anchors.awning.tile,plan.anchors.awning.out),stripes=5,width=1.1;
  for(let i=0;i<stripes;i++)place(new THREE.BoxGeometry(width/stripes,.04,.72),plan.awningColors[i%2],f,-width/2+(i+.5)*width/stripes,1.36,face+.34,{rx:.32});
  for(const x of [-.53,.53])place(new THREE.BoxGeometry(.04,.04,.62),'#4b4651',f,x,1.3,face+.31);
 }
 // The sign: a pole straight out from the wall beside the door, with the board hanging under it, also
 // square to the wall; the icon is painted on both faces.
 if(sign){
  const f=frame(sign.tile,sign.out),c=Math.cos(f.ry),sn=Math.sin(f.ry);
  place(new THREE.BoxGeometry(.05,.05,.78),'#4b4651',f,0,1.42,face+.39);
  place(new THREE.BoxGeometry(.03,.32,.03),'#4b4651',f,0,1.3,face+.07,{rx:0});
  for(const z of [face+.22,face+.62])place(new THREE.BoxGeometry(.015,.07,.015),'#4b4651',f,0,1.36,z);
  place(new THREE.BoxGeometry(.05,.46,.52),'#4a3222',f,0,1.09,face+.42);
  const texture=iconTexture(plan.desc.sign.icon);
  if(texture)for(const side of [-1,1]){const plane=new THREE.Mesh(new THREE.PlaneGeometry(.46,.4),new THREE.MeshStandardMaterial({map:texture,roughness:.8})),lx=side*.027,lz=face+.42;
   plane.position.set(f.x+lx*c+lz*sn,f.y+1.09,f.z-lx*sn+lz*c);plane.rotation.y=f.ry+side*Math.PI/2;plane.name='building-sign-icon';icons.push(plane);}
 }
 for(const e of plan.edges)if(plan.flowerBoxes.includes(e.a.join(',')+','+e.side)){
  const f=frame(e.a,e.out);place(new THREE.BoxGeometry(.78,.16,.18),palette.trim,f,0,.47,face+.1);place(new THREE.BoxGeometry(.72,.08,.13),'#5f8f45',f,0,.58,face+.1);
  for(const [x,color] of [[-.24,'#e46f8e'],[0,'#f2d35b'],[.24,'#e46f8e']])place(new THREE.BoxGeometry(.1,.08,.1),color,f,x,.65,face+.1);
 }
 const group=new THREE.Group();group.name='building-decor';
 if(parts.length){const mesh=new THREE.Mesh(mergeGeometries(parts),decorMaterial);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);for(const g of parts)g.dispose();}
 for(const p of icons)group.add(p);
 return group;
}

// Places a building in a map: marks its tiles (indoor, building id; solid when it has no interior),
// adds its walls, windows and doors through the map's edge features (a wall another building already
// placed becomes a shared wall of both), and adds roof and decorations. The roof hides when the
// building is cut (cutaway.js). Returns the plan, the door entities, the roof, anchors and a dispose().
export function createBuilding(description,{origin,id,edges,tileAt,parent}){
 const plan=planBuilding(description,origin),{desc}=plan,tile=([x,z])=>tileAt(x,z),style=buildingStyle(desc.style,desc.colors);
 const base=Math.max(...plan.tiles.map(p=>tile(p)?.h??0)),top=base+STOREY*desc.storeys;
 // Without an interior, or with a separate one (city Phase 7, spaces.js), the outside is solid.
 for(const p of plan.tiles){const t=tile(p);if(!t)continue;t.indoor=true;t.building=id;if(desc.interior==='none'||desc.interior==='separate')t.blocked=true;}
 const doors=[];
 for(const e of plan.edges){
  const a=tile(e.a),b=tile(e.b);if(!a||!b)continue;
  const existing=edges.info(a,b);
  if(existing&&!existing.owners.includes(id)){edges.add(a,b,'wall',{storeys:Math.max(existing.storeys,desc.storeys),owner:[existing.owners[0],id],style:existing.style});continue;}
  const f=edges.add(a,b,e.kind,{storeys:desc.storeys,owner:id,style,upperWindows:e.upperWindows,...e.kind==='door'?{locked:!!e.door.locked||desc.interior==='none'}:{}});
  if(e.kind==='door')doors.push(f);
 }
 const world=([x,z])=>({x:x-6,y:base,z:z-6});
 const roof=roofModel({plan,roof:desc.roof,w:plan.w,d:plan.d,ridge:desc.ridge,style,color:desc.colors?.roof||desc.roofColor&&shade(desc.roofColor,plan.roofShade)||shade(ROOF_COLORS[desc.style]||ROOF_COLORS.timber,plan.roofShade),chimney:plan.chimney,storeys:desc.storeys});
 roof.position.set((plan.x0+plan.x1)/2-6,top,(plan.z0+plan.z1)/2-6);roof.userData.building=id;parent.add(roof);edges.addCutPart(roof,id);
 // A building you can't walk into (no interior, a separate one, or only locked doors) shows a flat grey
 // cap flush with its cut walls while it is cut, so it reads as a solid block, not an empty room.
 let cap=null;
 if(solidWhenCut(desc,plan)){
  const capGeometry=plan.rects?mergeGeometries(plan.rects.map(r=>new THREE.BoxGeometry(r.w-WALL_THICKNESS,.06,r.d-WALL_THICKNESS).translate(r.x+(r.w-1)/2-(plan.w-1)/2,0,r.z+(r.d-1)/2-(plan.d-1)/2))):new THREE.BoxGeometry(plan.w-WALL_THICKNESS,.06,plan.d-WALL_THICKNESS);
  cap=new THREE.Mesh(capGeometry,capMaterial);cap.name='building-cap';
  cap.position.set((plan.x0+plan.x1)/2-6,base+CUT_HEIGHT-.05,(plan.z0+plan.z1)/2-6);cap.userData.showWhenCut=true;cap.visible=false;cap.receiveShadow=true;parent.add(cap);edges.addCutPart(cap,id);}
 // A sign side tucked into a corner (the next tile along, outside, belongs to another building or is
 // missing) can't be seen: take the other side.
 const open=o=>{const step=[o.tile[0]+o.out[0],o.tile[1]+o.out[1]];return [0,1].every(n=>{const t=tile([step[0]+o.along[0]*n,step[1]+o.along[1]*n]);return t&&!t.blocked&&(t.building===undefined||t.building===id);});};
 const sign=plan.anchors.signOptions.find(open)||plan.anchors.sign;
 const decor=decorFor(plan,world,sign);parent.add(decor);
 const anchors={...plan.anchors,sign,doors:plan.anchors.doors.map(o=>({doorstep:tile(o.doorstep),inside:tile(o.inside)})),keeper:plan.anchors.keeper&&tile(plan.anchors.keeper)};
 return {id,plan,doors,roof,cap,decor,anchors,top,
  dispose(){edges.removeCutPart(roof);roof.removeFromParent();roof.geometry.dispose();if(cap){edges.removeCutPart(cap);cap.removeFromParent();cap.geometry.dispose();}decor.removeFromParent();decor.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material!==decorMaterial)o.material.dispose();}});
   for(const e of plan.edges){const a=tile(e.a),b=tile(e.b);if(a&&b)edges.remove(a,b);}
   for(const p of plan.tiles){const t=tile(p);if(t&&t.building===id){t.indoor=false;delete t.building;if(desc.interior==='none'||desc.interior==='separate')t.blocked=false;}}}};
}
