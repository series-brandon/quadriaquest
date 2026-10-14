import * as THREE from 'three';
import {h,mount} from '../ui/dom.js';
import {keyedList} from '../ui/list.js';
import {segmented,toggleSwitch} from '../ui/controls.js';
import {signal,computed,effect} from '../reactive.js';
import {createCityData,cityHeight,setCityHeight,setCitySurface,clearCitySurface,cityOffset,setCityOffset,putOnLand,takeOffLand,SURFACE_NAMES,propCells,stairCells} from '../city-map.js';
import {cityProblems} from '../city-checks.js';
import {planBuilding,BUILDING_PRESETS,ROOF_TYPES,ROOF_COLORS,AWNINGS,toShaped,shiftShaped,shapeRuns,connectedCells} from '../building-kit.js';
import {STYLE_NAMES,stylePalette} from '../edge-models.js';
import {PROPS,PROP_KINDS,propFootprint} from '../props.js';
import {USE_NAMES,USE_ICONS} from '../furnish.js';
import {DIRS} from '../city-terrain.js';
import {CHUNK,withinChunk,chunksAround} from '../world-grid.js';
import {createGridOverlay,createCellOutline,createBiomeOverlay} from './grid-overlay.js';
import {BIOME_IDS,biomeRule} from '../biome-rules.js';
import {townSource,resourceFits,coverId,placedId} from '../town-ground.js';
import {TREE_SPECIES} from '../tree-models.js';
import {COVER_KINDS} from '../ground-cover.js';
import {CELL as BIOME_CELL} from '../biome-land.js';
import {propGalleryData} from './prop-gallery.js';
import './city-editor.css';

// The playground city editor (docs/CITY.md, Authoring; city Phase 6). Dev only. It edits a city's data
// and rebuilds it in place with the production builders (city-map.js), so what you edit is exactly
// what the game builds:
//  - tools: inspect, select, raise/lower/flatten height (half blocks), paint surface, place a building (kit
//    preset, rotation), place a prop, lay stairs, draw an edge by hand, erase, set the arrival tile;
//  - fast editing (docs/TOWN.md, Authoring tools): select a building, prop, stair or townsfolk and move,
//    rotate, duplicate or delete it (buttons or keys: M, R, D, Delete, arrows to nudge, Esc); raise,
//    lower and surface paint as you drag; each edit rebuilds only the chunks it touched (city-map.js
//    rebuild), and the checks run a moment after editing stops;
//  - Edit / Play: Play is a test walk in place (clicks move you as in the game); Reset rebuilds;
//  - live checks (city-checks.js), each a button that takes you to the problem; chunk and region lines
//    shown on the ground (a building must fit inside one chunk; placing one across a line is refused);
//  - hand-shaped buildings (docs/TOWN.md): paint any connected footprint with the Footprint tool, or
//    Reshape a selected building, then Build it (walls follow the outline, the roof joins over it);
//  - walls (docs/TOWN.md): click beside or inside any building wall to make it a window, a plain wall
//    or a door, to hang the building's sign there, or to give a window a flower box;
//  - nature on the land (docs/TOWN.md, Nature by hand): the Nature brush places trees, resources and
//    ground cover or clears them; Select takes a tree or flower that grew there into the map's own list
//    so it moves and deletes like anything placed; the Crystal tool (or Select, M) moves the Iter Crystal;
//  - a selected building's look: wall style, storeys, roof, colours, chimney and awning;
//  - biome land (docs/BIOMES.md): Add land puts the map on generated land (docs/TOWN.md, The town on
//    the land): its ground becomes the land's, heights become offsets on it and buildings level pads;
//    paint biomes by dragging (one per 8 × 8 cell); the map rebuilds when a stroke ends;
//  - undo / redo, save to the repo (dev server endpoint), copy and download the JSON.
// host (main.js playground API): editCity(data, {keepPlayer, dirty}) → built city, setTileClick(fn|null),
// setTileDrag(fn('start'|'move'|'end', tile)|null), teleport(x, z), toast(text).
const repoCities=import.meta.glob('../maps/*.json',{eager:true,import:'default'});
const SIDE_LABELS={n:'North',e:'East',s:'South',w:'West'};
// Each biome's colour in the paint overlay (distinct from one another, unlike their ground colours).
const BIOME_PAINT={river:'#5fb0e8',meadow:'#b8e06a',forest:'#2f8f3f',pines:'#1d5d4b',hills:'#a8875a',coast:'#f0d78c',wetland:'#5f8f7a',sea:'#3a7bd5'};
const PAINT_TOOLS=['raise','lower','flatten','surface','footprint','biome','nature'],CLOCKWISE={n:'e',e:'s',s:'w',w:'n'},KIND_LABELS={building:'building',prop:'prop',stairs:'stairs',townsfolk:'townsfolk',resource:'resource',cover:'ground cover',crystal:'crystal'};
// The Nature brush (docs/TOWN.md, Nature by hand): trees by species, resources, ground cover, or clear.
const NATURE_CHOICES=[['clear','Clear nature'],...Object.entries(TREE_SPECIES).map(([id,t])=>[`tree:${id}`,`${t.name||id} tree`]),
 ...['copper','boulder','sticks','stones','flint'].map(k=>[`resource:${k}`,k[0].toUpperCase()+k.slice(1)]),...COVER_KINDS.filter(k=>k!=='lilyPad').map(k=>[`cover:${k}`,`Cover: ${k}`])];
const TOOLS=[['inspect','Inspect'],['select','Select'],['footprint','Footprint'],['walls','Walls'],['biome','Biome'],['use','Use'],['reroll','Reroll furniture'],['raise','Raise'],['lower','Lower'],['flatten','Flatten'],['nature','Nature'],['crystal','Crystal'],['surface','Surface'],['building','Building'],['prop','Prop'],['stairs','Stairs'],['edge','Edge'],['erase','Erase'],['spawn','Arrival']];
export function cityCatalogue(){
 // The repo's maps first (the overworld), then the playground's.
 const list=Object.entries(repoCities).map(([path,data])=>({id:'repo:'+path,mapId:data.id,name:`${data.name} (src/maps/${path.split('/').pop()})`,make:()=>structuredClone(data)}));
 list.sort((a,b)=>(b.mapId==='overworld')-(a.mapId==='overworld'));
 list.push({id:'prop-gallery',mapId:'prop-gallery',name:'Prop gallery (playground)',make:()=>propGalleryData()},{id:'blank',mapId:'new-city',name:'Blank 64 × 64',make:()=>createCityData({id:'new-city',name:'New city',size:[64,64]})});
 return list;
}

export function createCityEditor(host){
 const catalogue=cityCatalogue(),choice=signal(catalogue[0].id);
 let view=null,data=null,built=null,stopDrag=null,stopBiomes=null;
 const tool=signal('inspect'),mode=signal('edit'),brush=signal('1'),status=signal(''),problems=signal([]),revision=signal(0);
 const options={nature:signal('tree:oak'),wallKind:signal('window'),biome:signal('meadow'),biomeBrush:signal('1'),landRing:signal('64'),landDefault:signal('meadow'),draftMode:signal('add'),storeys:signal('1'),roof:signal('gable'),style:signal('timber'),use:signal('home'),surface:signal('cobble'),preset:signal('cottage'),rotation:signal('0'),prop:signal('bench'),dir:signal('n'),length:signal('2'),width:signal('2'),edge:signal('wall'),side:signal('s')};
 const undo=[],redo=[],history=signal({undo:0,redo:0}),grid=signal(true);
 let overlay=null,outline=null,draftOutline=null,biomeOverlay=null,checkTimer=null;
 // The footprint being painted: tiles ('x,z'), and the building it reshapes (its index) or null for a new one.
 const draft=signal(new Set());let draftFor=null;
 // What is selected ({kind, index} into data.buildings/props/stairs/townsfolk) and whether the next
 // click moves it; a duplicate waits for its click as `placing`.
 const selection=signal(null),moving=signal(false);let placing=null;
 const showDraft=()=>{draftOutline?.dispose();draftOutline=null;const cells=[...draft.peek()].map(id=>id.split(',').map(Number));if(built&&cells.length)draftOutline=createCellOutline({cells,tiles:built.tiles,parent:built.group,color:'#5fe0ff'});};
 const showBiomes=()=>{biomeOverlay?.dispose();biomeOverlay=null;if(!built||!data?.land||tool.peek()!=='biome')return;
  biomeOverlay=createBiomeOverlay({cells:data.land.cells||{},cell:BIOME_CELL,colors:BIOME_PAINT,heightAt:(x,z)=>at(x,z)?.h,parent:built.group});};
 const showGrid=()=>{overlay?.dispose();overlay=grid.peek()&&built?createGridOverlay({tiles:built.tiles,parent:built.group}):null;};
 const showSelection=()=>{outline?.dispose();outline=null;const sel=selection.peek(),entry=entryOf(sel);if(!built||!entry)return;outline=createCellOutline({cells:cellsOf(sel.kind,entry),tiles:built.tiles,parent:built.group,color:moving.peek()?'#5fe0ff':'#ffe14d'});};
 // Checks run a moment after editing stops (they take seconds on the capital).
 const scheduleChecks=(delay=250)=>{clearTimeout(checkTimer);checkTimer=setTimeout(()=>{if(built&&data)problems.value=cityProblems(data,built);},delay);};
 // Rebuilds run one at a time; edits that arrive meanwhile merge into the next one.
 let rebuilding=null,queued=null;
 async function rebuild({keepPlayer=true,dirty=null}={}){
  if(rebuilding){queued=queued?{keepPlayer,dirty:queued.dirty&&dirty?[...new Set([...queued.dirty,...dirty])]:null}:{keepPlayer,dirty};return rebuilding;}
  rebuilding=(async()=>{built=await host.editCity(data,{keepPlayer,dirty});scheduleChecks(dirty?250:0);showGrid();showSelection();showDraft();showBiomes();revision.value++;})();
  try{await rebuilding;}finally{rebuilding=null;}
  if(queued){const next=queued;queued=null;await rebuild(next);}
 }
 const snapshot=()=>{undo.push(JSON.stringify(data));if(undo.length>60)undo.shift();redo.length=0;history.value={undo:undo.length,redo:0};};
 // An edit: apply() changes the data and returns the tiles it touched afterwards; `before` are the tiles
 // it touched before. Only their chunks are rebuilt. A refused edit (apply throws) leaves the data as it
 // was, in place, so the city being edited stays the same object.
 async function change(apply,before=[]){
  const saved=JSON.stringify(data);snapshot();let after;
  try{after=apply()||[];}catch(error){const restored=JSON.parse(saved);for(const k of Object.keys(data))delete data[k];Object.assign(data,restored);undo.pop();history.value={undo:undo.length,redo:redo.length};status.value=error.message;return false;}
  await rebuild({dirty:chunksAround([...before,...after])});return true;}
 const at=(x,z)=>built?.tiles.get(`${x},${z}`);
 const covers=(entry,x,z,kind)=>{try{if(kind==='building')return planBuilding(entry.desc,[entry.x,entry.z]).tiles.some(([a,b])=>a===x&&b===z);const [w,d]=propFootprint(entry.kind,entry.rotation||0);return x>=entry.x&&x<entry.x+w&&z>=entry.z&&z<entry.z+d;}catch{return false;}};
 function describe(x,z){const t=at(x,z);if(!t)return `${x},${z}: off the map`;
  const what=[t.stair?`stairs (${SIDE_LABELS[t.stair.dir]} up)`:null,data.buildings.find(b=>covers(b,x,z,'building'))?.desc.name,(()=>{const p=data.props.find(p=>covers(p,x,z,'prop'));return p&&PROPS[p.kind]?.name;})(),t.blocked?'solid':null].filter(Boolean);
  return `${x},${z} · height ${t.h} · ${t.surface}${what.length?' · '+what.join(', '):''}`;}
 // Placing over a building, a solid prop, stairs or off the map is refused (the checks still catch overlaps in loaded data).
 const oneChunk=cells=>{const xs=cells.map(c=>c[0]),zs=cells.map(c=>c[1]);if(!withinChunk(Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)))throw Error(`A building must fit inside one ${CHUNK} × ${CHUNK} chunk: this one crosses a chunk line.`);};
 const taken=(cells,own=[])=>{const mine=new Set(own.map(c=>c.join(',')));for(const [a,b] of cells){const t=at(a,b);if(!t)throw Error(`${a},${b} is off the map.`);if(!mine.has(`${a},${b}`)&&(t.indoor||t.blocked||t.stair))throw Error(`${a},${b} is taken.`);}};
 // Selection: what's at a tile, the tiles a thing covers, and the edits on it.
 const lists=()=>({building:data.buildings,prop:data.props,stairs:data.stairs,townsfolk:data.townsfolk||(data.townsfolk=[]),resource:data.resources||(data.resources=[]),cover:data.cover||(data.cover=[])});
 function entryOf(sel){if(!sel||!data)return null;if(sel.kind==='crystal')return data.crystal||null;return lists()[sel.kind]?.[sel.index]??null;}
 // Nature on the land (town-ground.js): what grows on a tile, generated or placed, as the streamer sees it.
 const nature=()=>built?.ground?townSource(built.ground.land,()=>built.ground,()=>built.tiles,()=>data):null;
 const natureAt=(x,z)=>nature()?.natureAt(at(x,z))||{resource:null,cover:null};
 const removeGrown=id=>{const list=data.land.removed||(data.land.removed=[]);if(!list.includes(id))list.push(id);};
 const natureName=e=>e.kind==='tree'?`${TREE_SPECIES[e.species]?.name||e.species||'oak'} tree`:e.kind;
 // Takes what grew on a tile into the map's own list (so it can be moved or deleted like anything placed).
 function adopt(x,z){const n=natureAt(x,z),which=n.resource?'resource':n.cover?'cover':null;if(!which)return null;const e=n[which];
  if(!e.placed){removeGrown(e.id);lists()[which].push({kind:e.kind,...e.species?{species:e.species}:{},x,z});}
  return {kind:which,index:lists()[which].findIndex(r=>r.x===x&&r.z===z)};}
 const stairSteps=s=>stairCells(s).slice((s.width||1),-(s.width||1));
 function cellsOf(kind,entry){if(!entry)return [];if(kind==='crystal')return [entry];if(kind==='resource'||kind==='cover')return [[entry.x,entry.z]];if(kind==='building')return planBuilding(entry.desc,[entry.x,entry.z]).tiles;if(kind==='prop')return propCells(entry);if(kind==='stairs')return stairSteps(entry);return entry.home?[entry.home]:[];}
 function pickAt(x,z){const hit=(kind,list,test)=>{const index=list.findIndex(test);return index>=0?{kind,index}:null;},on=cells=>cells.some(([a,b])=>a===x&&b===z),l=lists();
  return hit('townsfolk',l.townsfolk,f=>f.home&&f.home[0]===x&&f.home[1]===z)||(data.crystal&&data.crystal[0]===x&&data.crystal[1]===z?{kind:'crystal',index:0}:null)||hit('building',l.building,b=>on(cellsOf('building',b)))||hit('prop',l.prop,p=>on(propCells(p)))||hit('stairs',l.stairs,s=>on(stairSteps(s)))||hit('resource',l.resource,r=>r.x===x&&r.z===z)||hit('cover',l.cover,c=>c.x===x&&c.z===z);}
 const nameOf=(kind,entry)=>kind==='crystal'?'the Iter Crystal':kind==='resource'?natureName(entry):kind==='cover'?`${entry.kind} (cover)`:kind==='building'?entry.desc.name||'Building':kind==='prop'?PROPS[entry.kind]?.name||entry.kind:kind==='stairs'?`Stairs up ${SIDE_LABELS[entry.dir].toLowerCase()}`:entry.name||entry.id||'Townsfolk';
 const anchorOf=(kind,entry)=>kind==='townsfolk'?entry.home:kind==='crystal'?entry:[entry.x,entry.z];
 const setAnchor=(kind,entry,[x,z])=>{if(kind==='townsfolk')entry.home=[x,z];else if(kind==='crystal')data.crystal=[x,z];else{entry.x=x;entry.z=z;}};
 // Checks an entry where it now stands (own: the tiles it covered before, which it may reuse).
 function validate(kind,entry,own){const cells=cellsOf(kind,entry);
  if(kind==='building'){oneChunk(cells);taken(cells,own);}else if(kind==='prop')taken(cells,own);
  else if(kind==='crystal'){if(at(...cells[0])?.water)throw Error('The crystal needs dry ground.');taken(cells,own);}
  else if(kind==='resource'||kind==='cover'){const [x,z]=cells[0],t=at(x,z);if(!t)throw Error(`${x},${z} is off the map.`);
   if(kind==='resource'&&(!resourceFits(t)||data.crystal&&data.crystal[0]===x&&data.crystal[1]===z))throw Error(`${x},${z} has no room for it.`);if(kind==='cover'&&(t.water||t.building!==undefined))throw Error(`${x},${z} has no room for it.`);
   if(lists()[kind].filter(e=>e.x===x&&e.z===z).length>1)throw Error(`${x},${z} already has one.`);
   const grown=natureAt(x,z)[kind];if(grown&&!grown.placed)removeGrown(grown.id);}
  else for(const [a,b] of cells)if(!at(a,b))throw Error(`${a},${b} is off the map.`);
  return cells;}
 function selected(){const sel=selection.peek(),entry=entryOf(sel);if(!entry)throw Error('Select something first.');return {sel,entry};}
 async function moveSelection(x,z){const {sel,entry}=selected(),own=cellsOf(sel.kind,entry);moving.value=false;
  if(await change(()=>{setAnchor(sel.kind,entry,[x,z]);return validate(sel.kind,entry,own);},own))status.value=`Moved ${nameOf(sel.kind,entry)} to ${x},${z}.`;showSelection();}
 async function nudge(dx,dz){const {sel,entry}=selected(),[x,z]=anchorOf(sel.kind,entry);await moveSelection(x+dx,z+dz);}
 async function rotateSelection(){const {sel,entry}=selected(),own=cellsOf(sel.kind,entry);if(sel.kind==='townsfolk')throw Error('Townsfolk face where they go.');if(['crystal','resource','cover'].includes(sel.kind))throw Error('Nothing to rotate.');
  if(await change(()=>{if(sel.kind==='building')entry.desc.rotation=((entry.desc.rotation||0)+90)%360;else if(sel.kind==='prop')entry.rotation=((entry.rotation||0)+90)%360;else entry.dir=CLOCKWISE[entry.dir];return validate(sel.kind,entry,own);},own))status.value=`Rotated ${nameOf(sel.kind,entry)}.`;}
 function duplicateSelection(){const {sel,entry}=selected();if(sel.kind==='crystal')throw Error('A map has one crystal.');const copy=structuredClone(entry);
  if(sel.kind==='building')copy.desc.name=`${entry.desc.name||'Building'} copy`;if(sel.kind==='townsfolk'&&copy.id)copy.id=`${copy.id}-copy`;
  placing={kind:sel.kind,entry:copy};moving.value=false;status.value=`Click where the copy of ${nameOf(sel.kind,entry)} goes (Esc to cancel).`;}
 async function placeCopy(x,z){const {kind,entry}=placing;placing=null;
  if(await change(()=>{setAnchor(kind,entry,[x,z]);const cells=validate(kind,entry,[]);lists()[kind].push(entry);return cells;})){selection.value={kind,index:lists()[kind].length-1};status.value=`Placed a copy at ${x},${z}.`;showSelection();}}
 async function deleteSelection(){const {sel,entry}=selected(),own=cellsOf(sel.kind,entry),name=nameOf(sel.kind,entry);
  if(await change(()=>{if(sel.kind==='building'){const living=(data.townsfolk||[]).find(f=>f.house===sel.index);if(living)throw Error(`${living.name||'Someone'} lives in ${name}; move them first.`);
   for(const f of data.townsfolk||[])if(f.house>sel.index)f.house--;}if(sel.kind==='crystal')data.crystal=null;else lists()[sel.kind].splice(sel.index,1);return [];},own)){selection.value=null;status.value=`Deleted ${name}.`;showSelection();}}
 // Footprints: paint tiles into the draft, then build it as a new building or as the reshaped one.
 function reshapeSelection(){const {sel,entry}=selected();if(sel.kind!=='building')throw Error('Only buildings can be reshaped.');
  draft.value=new Set(cellsOf('building',entry).map(c=>c.join(',')));draftFor=sel.index;tool.value='footprint';showDraft();
  status.value=`Reshaping ${nameOf('building',entry)}.`;}
 function clearDraft(){draft.value=new Set();draftFor=null;showDraft();}
 // The first door of a new footprint: in the middle of its longest south-facing wall, or of its longest
 // wall if it has no south wall long enough (a door needs wall on both sides).
 function autoDoor(cells){const runs=shapeRuns(cells).filter(r=>r.cells.length>=3).sort((a,b)=>(b.side==='south')-(a.side==='south')||b.cells.length-a.cells.length);
  if(!runs.length)throw Error('A building needs a straight wall at least 3 tiles long for its door.');const r=runs[0];return {tile:r.cells[Math.floor(r.cells.length/2)],side:r.side};}
 async function buildDraft(){
  const world=[...draft.peek()].map(id=>id.split(',').map(Number));if(world.length<4)throw Error('Paint at least 4 tiles.');
  if(!connectedCells(world))throw Error('The footprint must be one connected piece.');
  const ox=Math.min(...world.map(c=>c[0])),oz=Math.min(...world.map(c=>c[1])),cells=world.map(([x,z])=>[x-ox,z-oz]),o=Object.fromEntries(Object.entries(options).map(([k,v])=>[k,v.peek()]));
  const index=draftFor,old=index!==null?data.buildings[index]:null,own=old?cellsOf('building',old):[];
  const done=await change(()=>{
   let desc;
   if(old){desc=shiftShaped(toShaped(old.desc),old.x-ox,old.z-oz);desc.cells=cells;
    // Doors that no longer sit on an outside wall (or break the door rule) give way to a new one.
    try{planBuilding(desc,[ox,oz]);}catch{desc.doors=[autoDoor(cells)];}}
   else desc={name:`Building ${data.buildings.length+1}`,cells,doors:[autoDoor(cells)],storeys:+o.storeys,roof:o.roof,style:o.style,chimney:true,windows:'auto',interior:'inPlace',use:o.use==='none'?undefined:o.use,seed:data.buildings.length*7+3};
   const entry={x:ox,z:oz,desc},placed=validate('building',entry,own);
   if(old)data.buildings[index]=entry;else data.buildings.push(entry);
   return placed;},own);
  if(done){const at=old?index:data.buildings.length-1;selection.value={kind:'building',index:at};clearDraft();status.value=`${old?'Reshaped':'Built'} ${nameOf('building',data.buildings[at])}: ${world.length} tiles.`;showSelection();}
 }
 // Biome land (docs/BIOMES.md): add or remove it, its default and seed, and painting its cells. The
 // town stands on the land (docs/TOWN.md, The town on the land), so any change rebuilds the whole map.
 async function setLand(apply){snapshot();apply();revision.value++;await rebuild();}
 const addLand=()=>setLand(()=>{putOnLand(data,{seed:1,ring:+options.landRing.peek(),default:options.landDefault.peek(),cells:{}});status.value=`On the land: ${data.land.ring} tiles of ${biomeRule(data.land.default).name.toLowerCase()} around and under the map.`;});
 const removeLand=()=>setLand(()=>{takeOffLand(data);status.value='Land removed: the ground is flat again.';});
 const landDefault=id=>setLand(()=>{data.land.default=id;status.value=`Unpainted land: ${biomeRule(id).name}.`;});
 const reseedLand=()=>setLand(()=>{data.land.seed=(data.land.seed||1)+1;status.value=`Land seed ${data.land.seed}.`;});
 const cellOf=(x,z)=>[Math.floor(x/BIOME_CELL),Math.floor(z/BIOME_CELL)];
 function paintBiome({x,z}){if(!data.land)return;const r=options.biomeBrush.peek()==='3'?1:options.biomeBrush.peek()==='5'?2:0,[cx,cz]=cellOf(x,z),id=options.biome.peek();
  for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const k=`${cx+dx},${cz+dz}`;if(id===data.land.default)delete data.land.cells[k];else data.land.cells[k]=id;}}
 // Walls: the building wall nearest a click. A click lands on the ground (walls aren't pickable), on a
 // tile inside or just outside a building; `point` (where the ray met the ground) picks between that
 // tile's walls: the one it was clicked towards.
 function wallAt(tile,point){
  const off=point?[point.x-(tile.x-6),point.z-(tile.z-6)]:[0,0],options=[];
  built.buildings.forEach((b,i)=>{if(!b)return;for(const e of b.plan.edges){
   if(e.a[0]===tile.x&&e.a[1]===tile.z)options.push({i,e,score:off[0]*e.out[0]+off[1]*e.out[1]});
   else if(e.b[0]===tile.x&&e.b[1]===tile.z)options.push({i,e,score:-(off[0]*e.out[0]+off[1]*e.out[1])});}});
  return options.sort((a,b)=>b.score-a.score)[0]||null;
 }
 async function setWall(tile,point){
  const hit=wallAt(tile,point);if(!hit)throw Error('Click beside or inside a building wall.');
  const kind=options.wallKind.peek(),b=data.buildings[hit.i],name=nameOf('building',b),side=hit.e.side;
  const done=await change(()=>{
   // Walls are set in the building's own (unturned) frame: fold any turn in first.
   if(!b.desc.cells||b.desc.rotation)b.desc=toShaped(b.desc);
   const cell=[hit.e.a[0]-b.x,hit.e.a[1]-b.z],key=`${cell.join(',')},${side}`,isDoor=d=>d.tile[0]===cell[0]&&d.tile[1]===cell[1]&&d.side===side;
   if(kind==='window'||kind==='wall'){b.desc.doors=b.desc.doors.filter(d=>!isDoor(d));(b.desc.walls||={})[key]=kind;}
   else if(kind==='door'){if(b.desc.doors.some(isDoor))throw Error('That wall is already a door.');b.desc.doors.push({tile:cell,side});if(b.desc.walls)delete b.desc.walls[key];}
   else if(kind==='sign'){if(b.desc.doors.some(isDoor))throw Error('A sign hangs on a wall, not a door: choose the wall beside it.');b.desc.sign={...b.desc.sign,icon:b.desc.sign?.icon||USE_ICONS[b.desc.use]||'star',tile:cell,side};delete b.desc.sign.edge;}
   else if(kind==='nosign'){if(!b.desc.sign)throw Error(`${name} has no sign.`);delete b.desc.sign;}
   else if(kind==='flowers'){if(hit.e.kind!=='window')throw Error('Flower boxes go under windows.');
    // The first hand-set box keeps the seeded ones, then toggles this window's.
    if(!Array.isArray(b.desc.flowerBoxes))b.desc.flowerBoxes=built.buildings[hit.i].plan.flowerBoxes.map(id=>{const [x,z,s]=id.split(',');return `${x-b.x},${z-b.z},${s}`;});
    b.desc.flowerBoxes=b.desc.flowerBoxes.includes(key)?b.desc.flowerBoxes.filter(k=>k!==key):[...b.desc.flowerBoxes,key];}
   // The door rule and an outside door: planBuilding says what's wrong.
   try{planBuilding(b.desc,[b.x,b.z]);}catch(error){throw Error(error.message.replace(/^[^:]*: /,''));}
   return cellsOf('building',b);});
  if(done)status.value=kind==='flowers'?`${name}: flower box toggled on the ${side} wall.`:`${name}: ${{window:'a window',wall:'a plain wall',door:'a door',sign:'the sign',nosign:'no sign'}[kind]} on the ${side} wall.`;
 }
 // A selected building's look (docs/TOWN.md, hand-shaped buildings): chosen, not seeded.
 const CHIMNEYS=[['none','No chimney'],['seed','Chimney (seeded)'],['-1,-1','Back left'],['0,-1','Back middle'],['1,-1','Back right'],['-1,1','Front left'],['0,1','Front middle'],['1,1','Front right']];
 const AWNING_NAMES=['Red','Green','Blue','Orange'];
 const lookOf=()=>{const sel=selection.peek();return sel?.kind==='building'?data.buildings[sel.index]:null;};
 async function setLook(apply,label){const b=lookOf();if(!b)throw Error('Select a building.');const own=cellsOf('building',b);
  if(await change(()=>{apply(b.desc);return validate('building',b,own);},own))status.value=`${nameOf('building',b)}: ${label}.`;}
 const colourOf=(b,role)=>b.desc.colors?.[role]||(role==='roof'?b.desc.roofColor||ROOF_COLORS[b.desc.style]||ROOF_COLORS.timber:stylePalette(b.desc.style)[role]);
 const lookControl=(label,value,choices,apply)=>h('label',{class:'q-city-editor__field'},label,h('select',{class:'q-select',on:{change:e=>apply(e.target.value).catch(error=>{status.value=error.message;})}},
  choices.map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;selection.value;const b=lookOf();return !!b&&value(b)===id;}},name))));
 const colourControl=role=>h('label',{class:'q-city-editor__field'},role[0].toUpperCase()+role.slice(1),h('input',{type:'color',class:'q-city-editor__colour',
  value:()=>{revision.value;selection.value;const b=lookOf();return b?new THREE.Color(colourOf(b,role)).getHexString().replace(/^/,'#'):'#000000';},
  on:{change:e=>setLook(d=>{(d.colors||={})[role]=e.target.value;},`${role} colour`).catch(error=>{status.value=error.message;})}}));
 function lookPanel(){
  return h('div',{class:'q-city-editor__look',hidden:()=>{revision.value;return selection.value?.kind!=='building';}},
   h('strong',null,'Look'),
   h('div',{class:'q-city-editor__options'},h('div',null,
    lookControl('Walls',b=>b.desc.style||'timber',STYLE_NAMES.filter(n=>n!=='dungeon').map(n=>[n,n]),v=>setLook(d=>{d.style=v;},`${v} walls`)),
    lookControl('Storeys',b=>String(b.desc.storeys||1),[['1','1'],['2','2'],['3','3']],v=>setLook(d=>{d.storeys=+v;},`${v} storeys`)),
    lookControl('Roof',b=>b.desc.roof||'gable',ROOF_TYPES.map(r=>[r,r]),v=>setLook(d=>{d.roof=v;},`${v} roof`)),
    lookControl('Chimney',b=>!b.desc.chimney?'none':typeof b.desc.chimney==='object'?`${b.desc.chimney.along},${b.desc.chimney.side}`:'seed',CHIMNEYS,v=>setLook(d=>{if(v==='none')d.chimney=false;else if(v==='seed')d.chimney=true;else{const [along,side]=v.split(',').map(Number);d.chimney={along,side};}},'chimney')),
    lookControl('Awning',b=>!b.desc.awning?'none':Array.isArray(b.desc.awningColors)?String(AWNINGS.findIndex(a=>a[0]===b.desc.awningColors[0])):'seed',[['none','No awning'],['seed','Awning (seeded)'],...AWNING_NAMES.map((n,i)=>[String(i),`${n} awning`])],
     v=>setLook(d=>{if(v==='none')d.awning=null;else{d.awning='striped';if(v==='seed')delete d.awningColors;else d.awningColors=[...AWNINGS[+v]];}},'awning'))),
    h('div',null,...['wall','trim','base','door','roof'].map(colourControl))),
   h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>setLook(d=>{delete d.colors;delete d.roofColor;},'colours reset').catch(error=>{status.value=error.message;})}},'Reset colours')));
 }
 function cancel(){if(placing||moving.peek()){placing=null;moving.value=false;status.value='Cancelled.';}else if(draft.peek().size&&tool.peek()==='footprint'){clearDraft();status.value='Footprint cleared.';}else selection.value=null;showSelection();}
 // Keys while editing (not while typing in the panel): they never reach the camera.
 function onKey(e){if(!view||mode.peek()!=='edit'||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName||''))return;
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},k=e.key.toLowerCase();
  let act=null;
  if(e.key==='Escape')act=cancel;else if(selection.peek()){if(arrows[e.key])act=()=>nudge(...arrows[e.key]);else if(k==='r')act=rotateSelection;else if(k==='d')act=duplicateSelection;else if(k==='m')act=()=>{moving.value=true;status.value='Click where it goes.';showSelection();};else if(k==='s')act=reshapeSelection;else if(e.key==='Delete'||e.key==='Backspace')act=deleteSelection;}
  if(!act)return;e.preventDefault();e.stopImmediatePropagation();Promise.resolve().then(act).catch(error=>{status.value=error.message;});}
 // Brushes paint as you drag: each tile once per stroke, the stroke one undo step, and the chunks it
 // reached rebuilt as it goes.
 let stroke=null;
 function paint(phase,tile){
  // The biome tool paints the land's cells; the map and its land rebuild when the stroke ends.
  if(tool.peek()==='nature'&&!data.land){if(phase==='end')status.value='Add land first.';return Promise.resolve();}
  if(tool.peek()==='biome'){
   if(!data.land){if(phase==='end')status.value='Add land first.';return Promise.resolve();}
   if(phase==='start'){snapshot();stroke={last:tile};paintBiome(tile);showBiomes();return Promise.resolve();}
   if(phase==='move'&&stroke){const {x:x0,z:z0}=stroke.last,n=Math.max(Math.abs(tile.x-x0),Math.abs(tile.z-z0));for(let i=1;i<=n;i++)paintBiome({x:Math.round(x0+(tile.x-x0)*i/n),z:Math.round(z0+(tile.z-z0)*i/n)});stroke.last=tile;showBiomes();return Promise.resolve();}
   if(phase==='end'){stroke=null;return rebuild().then(()=>{status.value=`Painted ${biomeRule(options.biome.peek()).name}: ${Object.keys(data.land.cells).length} cells painted in all.`;});}
   return Promise.resolve();
  }
  // The footprint tool paints the draft, not the map: no rebuild, no undo step until it's built.
  if(tool.peek()==='footprint'){
   if(phase==='end'){stroke=null;status.value=`Footprint: ${draft.peek().size} tiles. Build it when it's ready.`;return Promise.resolve();}
   if(phase==='start')stroke={last:tile};const from=phase==='move'?stroke?.last||tile:tile,n=Math.max(Math.abs(tile.x-from.x),Math.abs(tile.z-from.z)),next=new Set(draft.peek()),add=options.draftMode.peek()==='add';
   for(let i=0;i<=n;i++){const x=Math.round(from.x+(tile.x-from.x)*(n?i/n:0)),z=Math.round(from.z+(tile.z-from.z)*(n?i/n:0));for(const [a,b] of brushTiles(x,z)){if(!at(a,b))continue;if(add)next.add(`${a},${b}`);else next.delete(`${a},${b}`);}}
   if(stroke)stroke.last=tile;draft.value=next;showDraft();return Promise.resolve();
  }
  if(phase==='start'){snapshot();stroke={seen:new Set(),pending:[],last:tile,flushing:null};paintAt(tile);flushStroke();}
  else if(phase==='move'&&stroke){const {x:x0,z:z0}=stroke.last,n=Math.max(Math.abs(tile.x-x0),Math.abs(tile.z-z0));
   for(let i=1;i<=n;i++)paintAt({x:Math.round(x0+(tile.x-x0)*i/n),z:Math.round(z0+(tile.z-z0)*i/n)});stroke.last=tile;flushStroke();}
  else if(phase==='end'&&stroke){const done=stroke;stroke=null;return flushStroke(done).then(()=>{status.value=describe(done.last.x,done.last.z);});}
  return Promise.resolve();
 }
 // On the land (docs/TOWN.md), heights are offsets on its ground: raise and lower move them, flatten
 // sets each tile's offset so it stands at the height of the tile the stroke began on, and 'land'
 // clears paint so the biome's own ground shows.
 // Nature (docs/TOWN.md, Nature by hand): clear a tile, or put a tree, resource or cover on it, replacing
 // what grew or was placed there. A tile that can't take it is skipped.
 function clearNature(x,z){const n=natureAt(x,z);for(const which of ['resource','cover']){const e=n[which];if(!e)continue;
  if(e.placed){const list=lists()[which];list.splice(list.findIndex(r=>r.x===x&&r.z===z),1);}else removeGrown(e.id);}}
 function putNature(x,z,choice){const t=at(x,z);if(choice==='clear'){clearNature(x,z);return true;}
  const [group,kind]=choice.split(':');
  if(group==='cover'){if(!t||t.water||t.building!==undefined)return false;const n=natureAt(x,z).cover;if(n?.placed)lists().cover.splice(lists().cover.findIndex(c=>c.x===x&&c.z===z),1);else if(n)removeGrown(n.id);lists().cover.push({kind,x,z});return true;}
  if(!resourceFits(t)||data.crystal&&data.crystal[0]===x&&data.crystal[1]===z)return false;const n=natureAt(x,z).resource;
  if(n?.placed)lists().resource.splice(lists().resource.findIndex(r=>r.x===x&&r.z===z),1);else if(n)removeGrown(n.id);
  lists().resource.push(group==='tree'?{kind:'tree',species:kind,x,z}:{kind,x,z});return true;}
 function paintAt({x,z}){const o=tool.peek(),surface=options.surface.peek(),onLand=!!data.land;
  if(o==='flatten')stroke.level??=at(x,z)?.h??1;
  for(const [a,b] of brushTiles(x,z)){const id=`${a},${b}`;if(stroke.seen.has(id)||a<0||b<0||a>=data.size[0]||b>=data.size[1])continue;stroke.seen.add(id);
   if(o==='nature'){if(putNature(a,b,options.nature.peek()))stroke.pending.push([a,b]);continue;}
   if(o==='surface'){if(surface==='land')clearCitySurface(data,a,b);else setCitySurface(data,a,b,surface);}
   else if(o==='flatten'){const base=onLand?built.ground.base(a,b):0;if(onLand)setCityOffset(data,a,b,stroke.level-base);else setCityHeight(data,a,b,stroke.level);}
   else{const step=o==='raise'?.5:-.5;if(onLand)setCityOffset(data,a,b,cityOffset(data,a,b)+step);else setCityHeight(data,a,b,cityHeight(data,a,b)+step);}
   stroke.pending.push([a,b]);}}
 function flushStroke(s=stroke){if(!s?.pending.length)return rebuilding||Promise.resolve();const cells=s.pending;s.pending=[];return rebuild({dirty:chunksAround(cells)});}
 function brushTiles(x,z){const r=brush.peek()==='3'?1:0,out=[];for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)out.push([x+dx,z+dz]);return out;}
 // A world click in Edit mode applies the tool; in Play mode the game handles it.
 async function click(tile,point=null){
  if(mode.peek()!=='edit')return false;const {x,z}=tile,o=Object.fromEntries(Object.entries(options).map(([k,s])=>[k,s.peek()])),rotation=+o.rotation;
  switch(tool.peek()){
   case 'inspect':status.value=describe(x,z);break;
   case 'walls':await setWall(tile,point).catch(error=>{status.value=error.message;});break;
   case 'select':
    if(placing){await placeCopy(x,z);break;}
    if(moving.peek()&&selection.peek()){await moveSelection(x,z);break;}
    selection.value=pickAt(x,z);moving.value=false;
    // Nothing placed here: a tree, resource or cover that grew here becomes the map's own to move or delete.
    if(!selection.peek()&&data.land&&(natureAt(x,z).resource||natureAt(x,z).cover)){let hit=null;await change(()=>{hit=adopt(x,z);return [[x,z]];});selection.value=hit;}
    showSelection();
    {const entry=entryOf(selection.peek());status.value=entry?`Selected ${nameOf(selection.peek().kind,entry)}.`:describe(x,z);}
    break;
   // Brushes: a click is a one-tile stroke (dragging paints; see paint()).
   case 'raise':case 'lower':case 'flatten':case 'nature':case 'surface':case 'footprint':case 'biome':await paint('start',tile);await paint('end',tile);break;
   case 'building':if(await change(()=>{const desc={...structuredClone(BUILDING_PRESETS[o.preset]),rotation};delete desc.name;desc.name=`${BUILDING_PRESETS[o.preset].name} ${data.buildings.length+1}`;const cells=planBuilding(desc,[x,z]).tiles;oneChunk(cells);taken(cells);data.buildings.push({x,z,desc});return cells;}))status.value=`Placed ${BUILDING_PRESETS[o.preset].name} at ${x},${z}.`;break;
   case 'prop':if(await change(()=>{const [w,d]=propFootprint(o.prop,rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push([x+a,z+b]);taken(cells);data.props.push({kind:o.prop,x,z,rotation});return cells;}))status.value=`Placed ${PROPS[o.prop].name} at ${x},${z}.`;break;
   case 'stairs':await change(()=>{const s={x,z,dir:o.dir,length:+o.length,width:+o.width};data.stairs.push(s);return stairCells(s);});status.value=`Stairs from ${x},${z}, going up ${SIDE_LABELS[o.dir].toLowerCase()}.`;break;
   case 'edge':await change(()=>{const [dx,dz]=DIRS[o.side],b=[x+dx,z+dz],same=e=>[e.a,e.b].map(String).sort().join('|')===[[x,z],b].map(String).sort().join('|');
    data.edges=data.edges.filter(e=>!same(e));if(o.edge!=='none')data.edges.push({a:[x,z],b,kind:o.edge});return [[x,z],b];});break;
   case 'erase':{const hit=pickAt(x,z);
    if(hit&&hit.kind!=='townsfolk'){selection.value=hit;await deleteSelection();break;}
    if(data.land&&(natureAt(x,z).resource||natureAt(x,z).cover)){await change(()=>{clearNature(x,z);return [[x,z]];});status.value=`Cleared nature at ${x},${z}.`;break;}
    await change(()=>{const before=data.edges.length;data.edges=data.edges.filter(e=>!(e.a[0]===x&&e.a[1]===z||e.b[0]===x&&e.b[1]===z));if(data.edges.length===before)throw Error('Nothing to erase here.');return [[x,z]];});break;}
   // Use: what a building is furnished as (furnish.js); a shop's sign follows its trade. Reroll: a new
   // furnishing seed for the same use.
   case 'use':case 'reroll':await change(()=>{const b=data.buildings.find(e=>covers(e,x,z,'building'));if(!b)throw Error('Click a building.');
    if(tool.peek()==='use'){b.desc.use=o.use;if(b.desc.sign&&USE_ICONS[o.use])b.desc.sign={...b.desc.sign,icon:USE_ICONS[o.use]};status.value=`${b.desc.name||'Building'}: ${o.use}.`;}
    else{b.desc.furnishSeed=Math.floor(Math.random()*1e6);status.value=`${b.desc.name||'Building'}: refurnished.`;}return cellsOf('building',b);});break;
   case 'spawn':await change(()=>{data.spawn=[x,z];return [];});status.value=`Arrival at ${x},${z}.`;break;
   case 'crystal':{const old=data.crystal?[data.crystal]:[];if(await change(()=>{data.crystal=[x,z];return validate('crystal',data.crystal,old);},old))status.value=`The Iter Crystal at ${x},${z}.`;break;}
  }
  return true;
 }
 // at: where to put the player (the tile they stand on, when the editor opens on the map they're in).
 async function load(next,{at=null}={}){data=next;undo.length=0;redo.length=0;history.value={undo:0,redo:0};selection.value=null;placing=null;moving.value=false;draft.value=new Set();draftFor=null;
  const listed=catalogue.find(c=>c.mapId===data.id);if(listed)choice.value=listed.id;
  if(rebuilding)await rebuilding;built=await host.editCity(data,{keepPlayer:false,at});scheduleChecks(0);showGrid();showSelection();showDraft();showBiomes();revision.value++;status.value=`Editing ${data.name} (${data.size.join(' × ')}).`;}
 async function step(from,to){if(!from.length)return;to.push(JSON.stringify(data));data=JSON.parse(from.pop());history.value={undo:undo.length,redo:redo.length};if(!entryOf(selection.peek()))selection.value=null;await rebuild();}
 const json=()=>JSON.stringify(data,null,1);
 async function save(){
  try{const response=await fetch('/__city-save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:data.id,json:json()})});
   const result=await response.json();status.value=response.ok?`Saved to ${result.path}.`:`Not saved: ${result.error}`;}catch{status.value='Saving needs the playground dev server (npm run dev:debug). Use Copy or Download instead.';}}
 function download(){const link=h('a',{href:URL.createObjectURL(new Blob([json()],{type:'application/json'})),download:`${data.id}.json`});link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
 const select=(label,value,choices)=>h('label',{class:'q-city-editor__field'},label,h('select',{class:'q-select',on:{change:e=>{value.value=e.target.value;}}},choices.map(([id,name])=>h('option',{value:id,selected:()=>value.value===id},name))));
 const shown=(...tools)=>()=>!tools.includes(tool.value);
 const label=p=>`${p.severity==='error'?'Error':p.severity==='warning'?'Warning':'Note'} · ${p.tile.join(',')} · ${p.text}`;
 const counts=computed(()=>{const list=problems.value;return `${list.filter(p=>p.severity==='error').length} errors · ${list.filter(p=>p.severity==='warning').length} warnings · ${list.filter(p=>p.severity==='info').length} notes`;});
 function build(){
  return h('aside',{class:'q-city-editor','aria-label':'City editor'},
   h('header',{class:'q-city-editor__head'},h('strong',null,()=>{revision.value;return data?`${data.name} · ${data.size.join(' × ')}`:'City editor';}),h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>editor.close()}},'Close')),
   h('div',{class:'q-city-editor__row'},select('City',choice,catalogue.map(c=>[c.id,c.name])),h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>load(catalogue.find(c=>c.id===choice.peek()).make())}},'Open')),
   segmented({label:'Mode',options:[{value:'edit',label:'Edit'},{value:'play',label:'Play (test walk)'}],value:mode,onChange:v=>{mode.value=v;status.value=v==='play'?'Test walk: clicks move you. Reset rebuilds the edited state.':'Edit: clicks use the tool.';}}),
   h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>rebuild({keepPlayer:false})}},'Reset'),
    h('button',{type:'button',class:'q-button q-button--small',disabled:()=>!history.value.undo,on:{click:()=>step(undo,redo)}},'Undo'),
    h('button',{type:'button',class:'q-button q-button--small',disabled:()=>!history.value.redo,on:{click:()=>step(redo,undo)}},'Redo')),
   h('div',{class:'q-city-editor__tools',hidden:()=>mode.value!=='edit'},TOOLS.map(([id,name])=>h('button',{type:'button',class:'q-button q-button--small','aria-pressed':()=>tool.value===id,on:{click:()=>{tool.value=id;}}},name))),
   h('div',{class:'q-city-editor__options',hidden:()=>mode.value!=='edit'},
    h('div',{hidden:shown('walls')},select('Make it',options.wallKind,[['window','A window'],['wall','A plain wall'],['door','A door'],['sign','The sign'],['nosign','No sign'],['flowers','Flower box (toggle)']]),h('p',{class:'q-page__help'},'Click beside a wall.')),
    h('div',{hidden:shown('biome')},
     h('div',{hidden:()=>{revision.value;return !!data?.land;}},select('Land around the map',options.landRing,[['32','32 tiles'],['64','64 tiles'],['96','96 tiles']]),select('Unpainted land',options.landDefault,BIOME_IDS.map(id=>[id,biomeRule(id).name])),
      h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>addLand()}},'Add land')),
     h('div',{hidden:()=>{revision.value;return !data?.land;}},select('Paint',options.biome,BIOME_IDS.map(id=>[id,biomeRule(id).name])),select('Brush',options.biomeBrush,[['1','1 cell (8 × 8)'],['3','3 × 3 cells'],['5','5 × 5 cells']]),
      h('label',{class:'q-city-editor__field'},'Unpainted land',h('select',{class:'q-select',on:{change:e=>landDefault(e.target.value)}},BIOME_IDS.map(id=>h('option',{value:id,selected:()=>{revision.value;return data?.land?.default===id;}},biomeRule(id).name)))),
      h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>reseedLand()}},'New seed'),h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>removeLand()}},'Remove land')))),
    h('div',{hidden:shown('footprint')},select('Paint',options.draftMode,[['add','Add tiles'],['remove','Remove tiles']]),select('Storeys',options.storeys,[['1','1'],['2','2'],['3','3']]),select('Roof',options.roof,ROOF_TYPES.filter(r=>r!=='cone').map(r=>[r,r])),select('Walls',options.style,STYLE_NAMES.map(n=>[n,n])),select('Use',options.use,[...USE_NAMES,'none'].map(u=>[u,u])),
     h('p',{class:'q-page__help'},()=>{draft.value;revision.value;return `${draft.value.size} tiles${draftFor!==null?` · reshaping ${nameOf('building',data.buildings[draftFor])}`:''}`;}),
     h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>buildDraft().catch(error=>{status.value=error.message;})}},'Build it'),h('button',{type:'button',class:'q-button q-button--small',on:{click:clearDraft}},'Clear'))),
    h('div',{hidden:shown('nature')},select('Nature',options.nature,NATURE_CHOICES)),
    h('div',{hidden:shown('raise','lower','flatten','nature','surface','footprint')},select('Brush',brush,[['1','1 tile'],['3','3 × 3']]),h('p',{class:'q-page__help'},'Drag to paint.')),
    h('div',{class:'q-city-editor__selection',hidden:()=>tool.value!=='select'},
     h('p',{class:'q-page__help'},()=>{revision.value;const sel=selection.value,entry=entryOf(sel);return entry?`${nameOf(sel.kind,entry)} · ${KIND_LABELS[sel.kind]} at ${anchorOf(sel.kind,entry)?.join(',')}${moving.value?' · click where it goes':''}`:'Click something to select it.';}),
     lookPanel(),
     h('div',{class:'q-city-editor__row',hidden:()=>!selection.value},
      ...[['Move','M',()=>{moving.value=true;status.value='Click where it goes.';showSelection();}],['Rotate','R',rotateSelection],['Reshape','S',reshapeSelection],['Duplicate','D',duplicateSelection],['Delete','Del',deleteSelection],['Deselect','Esc',cancel]]
       .map(([name,keyName,act])=>h('button',{type:'button',class:'q-button q-button--small','aria-keyshortcuts':keyName,on:{click:()=>Promise.resolve().then(act).catch(error=>{status.value=error.message;})}},`${name} (${keyName})`)))),
    h('div',{hidden:shown('surface')},select('Surface',options.surface,[['land',"Land's own"],...SURFACE_NAMES.map(s=>[s,s])])),
    h('div',{hidden:shown('use')},select('Use',options.use,[...USE_NAMES,'none'].map(u=>[u,u]))),
    h('div',{hidden:shown('building')},select('Building',options.preset,Object.entries(BUILDING_PRESETS).map(([id,p])=>[id,p.name]))),
    h('div',{hidden:shown('prop')},select('Prop',options.prop,PROP_KINDS.map(k=>[k,PROPS[k].name]))),
    h('div',{hidden:shown('building','prop')},select('Rotation',options.rotation,[['0','0°'],['90','90°'],['180','180°'],['270','270°']])),
    h('div',{hidden:shown('stairs')},select('Up towards',options.dir,Object.entries(SIDE_LABELS)),select('Length',options.length,[1,2,3,4].map(n=>[String(n),`${n} (${n/2} block${n>2?'s':''})`])),select('Width',options.width,[1,2,3,4,5].map(n=>[String(n),String(n)]))),
    h('div',{hidden:shown('edge')},select('Edge',options.edge,[['wall','Wall'],['window','Window'],['fence','Fence'],['railing','Railing'],['low','Counter'],['door','Door'],['none','Remove']]),select('Side',options.side,Object.entries(SIDE_LABELS)))),
   h('p',{class:'q-page__help',role:'status'},status),
   h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:save}},'Save to repo'),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:async()=>{try{await navigator.clipboard.writeText(json());status.value='Copied the city JSON.';}catch{status.value='Copy failed: use Download.';}}}},'Copy JSON'),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:download}},'Download')),
   toggleSwitch({label:'Chunk and region lines',description:`Chunks ${CHUNK} × ${CHUNK} (pink), regions (gold)`,on:grid,onChange:v=>{grid.value=v;showGrid();}}),
   h('h3',{class:'q-city-editor__title'},'Checks · ',counts),
   keyedList(h('ol',{class:'q-city-editor__checks'}),problems,p=>`${p.kind}:${p.tile.join(',')}:${p.text}`,p=>h('li',null,h('button',{type:'button',class:'q-city-editor__check','data-severity':p.peek().severity,
    on:{click:()=>{const [x,z]=p.peek().tile;const ok=[[0,0],[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,-1]].some(([dx,dz])=>host.teleport(x+dx,z+dz));status.value=ok?label(p.peek()):`Couldn't stand near ${x},${z}.`;}}},label(p.peek())))));
 }
 const editor={
  get active(){return !!view;},get data(){return data;},get built(){return built;},get problems(){return problems.peek();},tool,mode,options,brush,
  // Opens on the map you're on: the one being edited (as you left it), else the city map you stand in
  // (you stay where you are), else the overworld. `next` opens that data instead.
  async open(next=null){if(!view){view=mount(build);document.body.append(view.node);window.addEventListener('keydown',onKey,{capture:true});
    // World clicks and left-drag belong to the editor only in Edit mode; in Play they reach the game.
    stopDrag=effect(()=>{const editing=mode.value==='edit';host.setTileClick(editing?(tile,point)=>click(tile,point):null);host.setTileDrag?.(editing&&PAINT_TOOLS.includes(tool.value)?paint:null);});
    // The biome overlay shows while the Biome tool is chosen.
    stopBiomes=effect(()=>{tool.value;showBiomes();});}
   if(next){await load(next);return editor;}
   const here=host.currentCity?.();
   if(data&&here?.areaId==='city-editor'){showGrid();showSelection();showDraft();showBiomes();scheduleChecks(0);status.value=`Editing ${data.name} (${data.size.join(' × ')}).`;return editor;}
   if(here?.data){await load(structuredClone(here.data),{at:here.at});return editor;}
   await load(catalogue[0].make());return editor;},
  close(){host.setTileClick(null);stopDrag?.();stopDrag=null;stopBiomes?.();stopBiomes=null;biomeOverlay?.dispose();biomeOverlay=null;host.setTileDrag?.(null);window.removeEventListener('keydown',onKey,{capture:true});clearTimeout(checkTimer);overlay?.dispose();overlay=null;outline?.dispose();outline=null;draftOutline?.dispose();draftOutline=null;view?.dispose();view=null;},
  get grid(){return grid.peek();},set grid(v){grid.value=!!v;showGrid();},
  click,undo:()=>step(undo,redo),redo:()=>step(redo,undo),
  // Fast editing, for scripted checks: the same actions as the panel and keys.
  selection,moving,select(kind,index){selection.value={kind,index};showSelection();},moveSelection,nudge,rotateSelection,duplicateSelection,placeCopy,deleteSelection,paint,
  draft,reshapeSelection,buildDraft,clearDraft,setWall,wallAt,setLook,addLand,removeLand,landDefault,reseedLand,
  get checksPending(){return !!checkTimer;},runChecks(){clearTimeout(checkTimer);if(built)problems.value=cityProblems(data,built);return problems.peek();},
 };
 return editor;
}
