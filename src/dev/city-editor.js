import * as THREE from 'three';
import {h,mount} from '../ui/dom.js';
import {keyedList} from '../ui/list.js';
import {segmented,toggleSwitch} from '../ui/controls.js';
import {signal,computed,effect,untracked} from '../reactive.js';
import {createCityData,growMap,cityHeight,setCityHeight,setCitySurface,clearCitySurface,cityOffset,setCityOffset,putOnLand,takeOffLand,SURFACE_NAMES,propCells,stairCells} from '../city-map.js';
import {cityProblems} from '../city-checks.js';
import {planBuilding,BUILDING_PRESETS,ROOF_TYPES,ROOF_COLORS,AWNINGS,toShaped,shiftShaped,shapeRuns,connectedCells} from '../building-kit.js';
import {STYLE_NAMES,stylePalette} from '../edge-models.js';
import {PROPS,PROP_CATEGORIES,propFootprint,propModel} from '../props.js';
import {propThumbnail} from './prop-thumbnails.js';
import {USE_NAMES,USE_ICONS,furnishRoom,furnishingUse,upstairsUse} from '../furnish.js';
import {flightOf,floorLevels} from '../spaces.js';
import {DIRS} from '../city-terrain.js';
import {CHUNK,REGION,withinChunk,chunksAround} from '../world-grid.js';
import {createGridOverlay,createCellOutline,createBiomeOverlay,createCellFill} from './grid-overlay.js';
import {BIOME_IDS,biomeRule} from '../biome-rules.js';
import {TERRAIN_IDS,terrainRule} from '../terrain-rules.js';
import {ENEMIES} from '../combat-rules.js';
import {GEAR} from '../equipment.js';
import {ITEMS} from '../items.js';
import {ACTIVITIES} from '../townsfolk.js';
import {enemySize} from '../enemy-entity.js';
import {townSource,resourceFits,coverId,placedId} from '../town-ground.js';
import {TREE_SPECIES} from '../tree-models.js';
import {COVER_KINDS} from '../ground-cover.js';
import {CELL as BIOME_CELL,FORGET_MARGIN} from '../biome-land.js';
import {propGalleryData} from './prop-gallery.js';
import './city-editor.css';

// The playground city editor (docs/CITY.md, Authoring; city Phase 6). Dev only. It edits a city's data
// and rebuilds it in place with the production builders (city-map.js), so what you edit is exactly
// what the game builds:
//  - tools: inspect, select, raise/lower/flatten height (half blocks), paint surface, place a building (kit
//    preset, rotation), place a prop, lay stairs, draw an edge by hand, erase, set the arrival tile;
//  - fast editing (docs/TOWN.md, Authoring tools): select a building, prop, stair or townsfolk and move,
//    rotate, duplicate or delete it (buttons, or keys that never take a movement key: M, R, Ctrl/⌘+D,
//    Delete, Esc; Ctrl/⌘+Z and Ctrl/⌘+Shift+Z undo and redo; nudge and reshape are buttons); raise,
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
// The shortcut modifier as the platform shows it.
const MOD=/Mac|iPhone|iPad/.test(globalThis.navigator?.platform||'')?'⌘':'Ctrl';
// Each biome's colour in the paint overlay (distinct from one another, unlike their ground colours).
const BIOME_PAINT={meadow:'#b8e06a',forest:'#2f8f3f',pines:'#1d5d4b',hills:'#a8875a',coast:'#f0d78c',wetland:'#5f8f7a'};
// Each terrain's colour in the terrain layer's overlay; 'usual' (unpainted: the biome's own) isn't drawn.
const TERRAIN_PAINT={plains:'#e8e39a',rolling:'#9cc46a',lakeland:'#5fc0d8',uplands:'#c49a6c',hills:'#8a6a48',highlands:'#4f4038',marsh:'#4f8a76',river:'#3fa0e8',sea:'#2f62c8'};
const PAINT_TOOLS=['raise','lower','flatten','surface','footprint','biome','nature'],CLOCKWISE={n:'e',e:'s',s:'w',w:'n'},KIND_LABELS={building:'building',prop:'prop',stairs:'stairs',townsfolk:'townsfolk',resource:'resource',cover:'ground cover',crystal:'crystal',enemy:'enemy spawn'};
// Enemy spawns (docs/TOWN.md, Enemy spawns): respawn choices in seconds.
// Townsfolk (docs/TOWN.md, Townsfolk tool): what they can wear and hold, and the routine's activities.
const HEADS=Object.keys(GEAR).filter(id=>GEAR[id].slot==='head'),HANDS=Object.keys(GEAR).filter(id=>GEAR[id].slot==='hand');
const FOLK_COLOURS=['#9ccf7a','#e0a96d','#9db8e3','#c7b46a','#a4ce77','#8fc9b8','#d9a3c4','#c88d6e'];
const RESPAWNS=[['30','30 seconds'],['45','45 seconds'],['120','2 minutes'],['300','5 minutes'],['900','15 minutes']];
// The Nature brush (docs/TOWN.md, Nature by hand): trees by species, resources, ground cover, or clear.
const NATURE_CHOICES=[['grow','Grow (biome)'],['clear','Clear nature'],['fishing','Fishing spot (on water)'],...Object.entries(TREE_SPECIES).map(([id,t])=>[`tree:${id}`,`${t.name||id} tree`]),
 ...['copper','boulder','sticks','stones','flint'].map(k=>[`resource:${k}`,k[0].toUpperCase()+k.slice(1)]),...COVER_KINDS.filter(k=>k!=='lilyPad').map(k=>[`cover:${k}`,`Cover: ${k}`])];
const TOOLS=[['inspect','Inspect'],['select','Select'],['footprint','Footprint'],['walls','Walls'],['biome','Biome'],['use','Use'],['reroll','Reroll furniture'],['raise','Raise'],['lower','Lower'],['flatten','Flatten'],['nature','Nature'],['enemy','Enemy'],['townsfolk','Townsfolk'],['crystal','Crystal'],['surface','Surface'],['building','Building'],['prop','Prop'],['stairs','Stairs'],['edge','Edge'],['erase','Erase'],['spawn','Arrival']];
export function cityCatalogue(){
 // The repo's maps first (the overworld), then the playground's.
 const list=Object.entries(repoCities).map(([path,data])=>({id:'repo:'+path,mapId:data.id,name:`${data.name} (src/maps/${path.split('/').pop()})`,make:()=>structuredClone(data)}));
 list.sort((a,b)=>(b.mapId==='overworld')-(a.mapId==='overworld'));
 list.push({id:'prop-gallery',mapId:'prop-gallery',name:'Prop gallery (playground)',make:()=>propGalleryData()},{id:'blank',mapId:'new-city',name:'Blank 64 × 64',make:()=>createCityData({id:'new-city',name:'New city',size:[64,64]})});
 return list;
}

export function createCityEditor(host){
 const catalogue=cityCatalogue(),choice=signal(catalogue[0].id);
 let view=null,data=null,built=null,stopDrag=null,stopBiomes=null,stopPreview=null,stopFloors=null;
 const tool=signal('inspect'),mode=signal('edit'),brush=signal('1'),status=signal(''),problems=signal([]),revision=signal(0);
 const options={enemyKind:signal('scrapper'),enemyMood:signal('passive'),enemyRespawn:signal('45'),growSide:signal('all'),growBy:signal('1'),nature:signal('tree:oak'),wallKind:signal('window'),biome:signal('meadow'),terrain:signal('plains'),landLayer:signal('biome'),biomeBrush:signal('1'),landDefault:signal('meadow'),draftMode:signal('add'),storeys:signal('1'),roof:signal('gable'),style:signal('timber'),use:signal('home'),surface:signal('cobble'),preset:signal('cottage'),rotation:signal('0'),prop:signal('bench'),dir:signal('n'),length:signal('2'),width:signal('2'),edge:signal('wall'),side:signal('s')};
 const undo=[],redo=[],history=signal({undo:0,redo:0}),grid=signal(true);
 let overlay=null,outline=null,draftOutline=null,biomeOverlay=null,checkTimer=null;
 // The footprint being painted: tiles ('x,z'), and the building it reshapes (its index) or null for a new one.
 const draft=signal(new Set());let draftFor=null;
 // What is selected ({kind, index} into data.buildings/props/stairs/townsfolk) and whether the next
 // click moves it; a duplicate waits for its click as `placing`.
 const selection=signal(null),moving=signal(false);let placing=null;
 const showDraft=()=>{draftOutline?.dispose();draftOutline=null;const cells=[...draft.peek()].map(id=>id.split(',').map(Number));if(built&&cells.length)draftOutline=createCellOutline({cells,tiles:built.tiles,parent:built.group,color:'#5fe0ff'});};
 const showBiomes=()=>{biomeOverlay?.dispose();biomeOverlay=null;if(!built||!data?.land||tool.peek()!=='biome')return;
  const terrain=options.landLayer.peek()==='terrain';
  biomeOverlay=createBiomeOverlay({cells:(terrain?data.land.terrain:data.land.cells)||{},cell:BIOME_CELL,colors:terrain?TERRAIN_PAINT:BIOME_PAINT,heightAt:(x,z)=>at(x,z)?.h,parent:built.group,origin:data.land.origin||[0,0],bounds:[0,0,data.size[0]-1,data.size[1]-1]});};
 const showGrid=()=>{overlay?.dispose();overlay=grid.peek()&&built?createGridOverlay({tiles:built.tiles,parent:built.group}):null;};
 const showSelection=()=>{outline?.dispose();outline=null;showPersonSpots();const sel=selection.peek(),entry=entryOf(sel);if(!built||!entry)return;outline=createCellOutline({cells:cellsOf(sel.kind,entry),tiles:built.tiles,parent:built.group,color:moving.peek()?'#5fe0ff':'#ffe14d'});};
 // Checks run a moment after editing stops (they take seconds on the capital).
 const scheduleChecks=(delay=250)=>{clearTimeout(checkTimer);checkTimer=setTimeout(()=>{if(built&&data)problems.value=cityProblems(data,built);},delay);};
 // Rebuilds run one at a time; edits that arrive meanwhile merge into the next one.
 let rebuilding=null,queued=null;
 async function rebuild({keepPlayer=true,dirty=null}={}){
  if(rebuilding){queued=queued?{keepPlayer,dirty:queued.dirty&&dirty?[...new Set([...queued.dirty,...dirty])]:null}:{keepPlayer,dirty};return rebuilding;}
  rebuilding=(async()=>{built=await host.editCity(data,{keepPlayer,dirty});scheduleChecks(dirty?250:0);showGrid();showSelection();showDraft();showBiomes();refreshPreview();revision.value++;})();
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
 // Inside a building's floor (docs/CITY.md, Floors) the tiles are that floor's; otherwise the map's.
 const floorHere=host.floorHere||signal(null);
 const at=(x,z)=>{const own=floorHere.peek()&&host.floorTiles;return own?own.get(`${x},${z}`):built?.tiles.get(`${x},${z}`);};
 const covers=(entry,x,z,kind)=>{try{if(kind==='building')return planBuilding(entry.desc,[entry.x,entry.z]).tiles.some(([a,b])=>a===x&&b===z);const [w,d]=propFootprint(entry.kind,entry.rotation||0);return x>=entry.x&&x<entry.x+w&&z>=entry.z&&z<entry.z+d;}catch{return false;}};
 function describe(x,z){const t=at(x,z);if(!t)return `${x},${z}: off the map`;
  const what=[t.stair?`stairs (${SIDE_LABELS[t.stair.dir]} up)`:null,data.buildings.find(b=>covers(b,x,z,'building'))?.desc.name,(()=>{const p=data.props.find(p=>covers(p,x,z,'prop'));return p&&PROPS[p.kind]?.name;})(),t.blocked?'solid':null].filter(Boolean);
  return `${x},${z} · height ${t.h} · ${t.surface}${what.length?' · '+what.join(', '):''}`;}
 // Placing over a building, a solid prop, stairs or off the map is refused (the checks still catch overlaps in loaded data).
 const oneChunk=cells=>{const xs=cells.map(c=>c[0]),zs=cells.map(c=>c[1]);if(!withinChunk(Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)))throw Error(`A building must fit inside one ${CHUNK} × ${CHUNK} chunk: this one crosses a chunk line.`);};
 // kind: a prop's kind, for the props that stand on water (props.js `water`).
 const taken=(cells,own=[],kind=null)=>{const mine=new Set(own.map(c=>c.join(','))),water=PROPS[kind]?.water;
  for(const [a,b] of cells){const t=at(a,b);if(!t)throw Error(`${a},${b} is off the map.`);
   if(water==='only'&&!t.water&&!t.overWater)throw Error(`${PROPS[kind].name} goes on water.`);
   if(!water&&t.water)throw Error(`${a},${b} is water.`);
   if(!mine.has(`${a},${b}`)&&(t.indoor||t.stair||t.prop||t.blocked&&!t.water))throw Error(`${a},${b} is taken.`);}};
 // Selection: what's at a tile, the tiles a thing covers, and the edits on it.
 const lists=()=>({building:data.buildings,prop:data.props,stairs:data.stairs,townsfolk:data.townsfolk||(data.townsfolk=[]),resource:data.resources||(data.resources=[]),cover:data.cover||(data.cover=[]),fishing:data.fishing||(data.fishing=[]),enemy:data.enemies||(data.enemies=[])});
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
 function cellsOf(kind,entry){if(!entry)return [];if(kind==='crystal')return [entry];if(kind==='resource'||kind==='cover')return [[entry.x,entry.z]];if(kind==='enemy'){const n=enemySize(entry.enemy),out=[];for(let b=0;b<n;b++)for(let a=0;a<n;a++)out.push([entry.x+a,entry.z+b]);return out;}if(kind==='building')return planBuilding(entry.desc,[entry.x,entry.z]).tiles;if(kind==='prop')return propCells(entry);if(kind==='stairs')return stairSteps(entry);return entry.home?[entry.home]:[];}
 function pickAt(x,z){const hit=(kind,list,test)=>{const index=list.findIndex(test);return index>=0?{kind,index}:null;},on=cells=>cells.some(([a,b])=>a===x&&b===z),l=lists();
  return hit('townsfolk',l.townsfolk,f=>f.home&&f.home[0]===x&&f.home[1]===z)||(data.crystal&&data.crystal[0]===x&&data.crystal[1]===z?{kind:'crystal',index:0}:null)||hit('building',l.building,b=>on(cellsOf('building',b)))||hit('prop',l.prop,p=>on(propCells(p)))||hit('stairs',l.stairs,s=>on(stairSteps(s)))||hit('enemy',l.enemy,e=>on(cellsOf('enemy',e)))||hit('resource',l.resource,r=>r.x===x&&r.z===z)||hit('cover',l.cover,c=>c.x===x&&c.z===z);}
 const nameOf=(kind,entry)=>kind==='enemy'?`${ENEMIES[entry.enemy]?.name||entry.enemy}${entry.aggressive?' (aggressive)':''}`:kind==='crystal'?'the Iter Crystal':kind==='resource'?natureName(entry):kind==='cover'?`${entry.kind} (cover)`:kind==='building'?entry.desc.name||'Building':kind==='prop'?PROPS[entry.kind]?.name||entry.kind:kind==='stairs'?`Stairs up ${SIDE_LABELS[entry.dir].toLowerCase()}`:entry.name||entry.id||'Townsfolk';
 const anchorOf=(kind,entry)=>kind==='townsfolk'?entry.home:kind==='crystal'?entry:[entry.x,entry.z];
 const setAnchor=(kind,entry,[x,z])=>{if(kind==='townsfolk')entry.home=[x,z];else if(kind==='crystal')data.crystal=[x,z];else{entry.x=x;entry.z=z;}};
 // Checks an entry where it now stands (own: the tiles it covered before, which it may reuse).
 // dry: only check (previews); otherwise placing nature also takes away what grew on its tile.
 function validate(kind,entry,own,{dry=false}={}){const cells=cellsOf(kind,entry);
  if(kind==='building'){oneChunk(cells);taken(cells,own);}else if(kind==='prop')taken(cells,own,entry.kind);
  else if(kind==='crystal'){if(at(...cells[0])?.water)throw Error('The crystal needs dry ground.');taken(cells,own);}
  // An enemy spawn: dry, open ground for its whole body, not on another spawn.
  else if(kind==='enemy'){const mine=new Set(own.map(c=>c.join(',')));for(const [a,b] of cells){const t=at(a,b);if(!t)throw Error(`${a},${b} is off the map.`);if(t.water)throw Error(`${a},${b} is water.`);
    if(!mine.has(`${a},${b}`)&&(t.blocked||t.indoor||t.stair))throw Error(`${a},${b} is taken.`);
    if(!mine.has(`${a},${b}`)&&lists().enemy.some(e=>e!==entry&&cellsOf('enemy',e).some(([p,q])=>p===a&&q===b)))throw Error(`${a},${b} already has a spawn.`);}}
  else if(kind==='resource'||kind==='cover'){const [x,z]=cells[0],t=at(x,z);if(!t)throw Error(`${x},${z} is off the map.`);
   if(kind==='resource'&&(!resourceFits(t)||data.crystal&&data.crystal[0]===x&&data.crystal[1]===z))throw Error(`${x},${z} has no room for it.`);if(kind==='cover'&&(t.water||t.building!==undefined))throw Error(`${x},${z} has no room for it.`);
   if(lists()[kind].filter(e=>e.x===x&&e.z===z).length>1)throw Error(`${x},${z} already has one.`);
   const grown=natureAt(x,z)[kind];if(grown&&!grown.placed&&!dry)removeGrown(grown.id);}
  else if(kind==='townsfolk'){for(const [a,b] of cells){const t=at(a,b);if(!t)throw Error(`${a},${b} is off the map.`);if(t.water||t.blocked)throw Error(`${a},${b} isn’t somewhere to stand.`);}}
  else for(const [a,b] of cells)if(!at(a,b))throw Error(`${a},${b} is off the map.`);
  return cells;}
 function selected(){const sel=selection.peek(),entry=entryOf(sel);if(!entry)throw Error('Select something first.');return {sel,entry};}
 async function moveSelection(x,z){const {sel,entry}=selected(),own=cellsOf(sel.kind,entry);moving.value=false;
  if(await change(()=>{setAnchor(sel.kind,entry,[x,z]);return validate(sel.kind,entry,own);},own))status.value=`Moved ${nameOf(sel.kind,entry)} to ${x},${z}.`;showSelection();}
 const startMove=()=>{selected();moving.value=true;status.value='Click where it goes.';showSelection();};
 async function nudge(dx,dz){const {sel,entry}=selected(),[x,z]=anchorOf(sel.kind,entry);await moveSelection(x+dx,z+dz);}
 async function rotateSelection(){const {sel,entry}=selected(),own=cellsOf(sel.kind,entry);if(sel.kind==='townsfolk')throw Error('Townsfolk face where they go.');if(['crystal','resource','cover','enemy'].includes(sel.kind))throw Error('Nothing to rotate.');
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
 const addLand=()=>setLand(()=>{putOnLand(data,{seed:1,default:options.landDefault.peek(),cells:{}});status.value=`On the land: ${biomeRule(data.land.default).name.toLowerCase()} under the whole map.`;});
 const removeLand=()=>setLand(()=>{takeOffLand(data);status.value='Land removed: the ground is flat again.';});
 const landDefault=id=>setLand(()=>{data.land.default=id;status.value=`Unpainted land: ${biomeRule(id).name}.`;});
 const reseedLand=()=>setLand(()=>{data.land.seed=(data.land.seed||1)+1;status.value=`Land seed ${data.land.seed}.`;});
 // Biome cells are the land's (data.land.origin: the map's 0, 0 in the land).
 // Rebuilds only around repainted biome cells (the land forgets them first; town-ground.js, biome-land.js).
 function repaintLand(cells){
  if(!cells.size||!built?.ground)return rebuild();
  const [ox,oz]=data.land.origin||[0,0],xs=[...cells].map(k=>+k.split(',')[0]),zs=[...cells].map(k=>+k.split(',')[1]);
  const x0=Math.min(...xs)*BIOME_CELL-ox-FORGET_MARGIN,z0=Math.min(...zs)*BIOME_CELL-oz-FORGET_MARGIN,x1=(Math.max(...xs)+1)*BIOME_CELL-ox+FORGET_MARGIN,z1=(Math.max(...zs)+1)*BIOME_CELL-oz+FORGET_MARGIN;
  built.ground.land.forget(x0,z0,x1,z1);
  const dirty=[];for(let cz=Math.floor(z0/CHUNK);cz<=Math.floor(z1/CHUNK);cz++)for(let cx=Math.floor(x0/CHUNK);cx<=Math.floor(x1/CHUNK);cx++)dirty.push(`${cx},${cz}`);
  return rebuild({dirty});}
 const cellOf=(x,z)=>{const [ox,oz]=data.land?.origin||[0,0];return [Math.floor((x+ox)/BIOME_CELL),Math.floor((z+oz)/BIOME_CELL)];};
 // The Biome tool paints the biome layer or the terrain layer (docs/BIOMES.md, Terrain and biome): painting
 // the unpainted value (the default biome; 'usual' terrain, the biome's own) erases.
 function paintBiome({x,z}){if(!data.land)return;const r=options.biomeBrush.peek()==='3'?1:options.biomeBrush.peek()==='5'?2:0,[cx,cz]=cellOf(x,z),terrain=options.landLayer.peek()==='terrain',id=terrain?options.terrain.peek():options.biome.peek(),layer=terrain?(data.land.terrain??={}):data.land.cells,unpainted=terrain?'usual':data.land.default;
  for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const k=`${cx+dx},${cz+dz}`;stroke?.cells?.add(k);if(id===unpainted)delete layer[k];else layer[k]=id;}}
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
 // A selected enemy spawn's settings, changed in place (one undo step each).
 const spawnOf=()=>{const sel=selection.peek();return sel?.kind==='enemy'?data.enemies[sel.index]:null;};
 async function setSpawn(apply,label){const e=spawnOf();if(!e)throw Error('Select an enemy spawn.');const own=cellsOf('enemy',e);
  if(await change(()=>{apply(e);return [...own,...validate('enemy',e,own)];},own))status.value=`${nameOf('enemy',e)}: ${label}.`;}
 const spawnControl=(label,value,choices,apply)=>h('label',{class:'q-city-editor__field'},label,h('select',{class:'q-select',on:{change:e=>setSpawn(s=>apply(s,e.target.value),label.toLowerCase()).catch(error=>{status.value=error.message;})}},
  choices.map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;selection.value;const s=spawnOf();return !!s&&value(s)===id;}},name))));
 function spawnPanel(){
  return h('div',{class:'q-city-editor__look',hidden:()=>{revision.value;return selection.value?.kind!=='enemy';}},
   h('strong',null,'Spawn'),
   h('div',{class:'q-city-editor__options'},h('div',null,
    spawnControl('Enemy',s=>s.enemy,Object.entries(ENEMIES).map(([id,e])=>[id,e.name]),(s,v)=>{s.enemy=v;}),
    spawnControl('Behaviour',s=>s.aggressive?'aggressive':'passive',[['passive','Passive'],['aggressive','Aggressive']],(s,v)=>{s.aggressive=v==='aggressive';}),
    spawnControl('Respawns after',s=>String(s.respawn??45),RESPAWNS,(s,v)=>{s.respawn=+v;}))));
 }
 // A selected townsfolk (docs/TOWN.md, Townsfolk tool): everything about them, changed in place (one undo
 // step each, the crowd rebuilt), and their places drawn on the map.
 let patrolling=false,spotsFill=null;const patrolOn=signal(false);
 const personOf=()=>{const sel=selection.peek();return sel?.kind==='townsfolk'?data.townsfolk[sel.index]:null;};
 const uniqueFolkId=base=>{const ids=new Set((data.townsfolk||[]).map(f=>f.id));let id=base.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'townsfolk',n=1;const root=id;while(ids.has(id))id=`${root}-${++n}`;return id;};
 async function setPerson(apply,label){const p=personOf();if(!p)throw Error('Select a townsfolk.');const own=cellsOf('townsfolk',p);
  if(await change(()=>{apply(p);return [...own,...validate('townsfolk',p,own),...(p.patrol||[])];},own)){status.value=`${p.name}: ${label}.`;showSelection();}}
 const weightOf=(p,a)=>p.routine?.find(r=>r.do===a)?.weight??0;
 // Their places: home (gold), their building (sand), patrol stops (pink) and the spots their routine uses (blue).
 function showPersonSpots(){spotsFill?.dispose();spotsFill=null;const p=personOf();if(!built||!p)return;const cells=[],seen=new Set(),add=(x,z,color)=>{const k=`${x},${z}`;if(seen.has(k))return;seen.add(k);cells.push({x,z,color});};
  if(p.home)add(...p.home,'#ffd23f');for(const pt of p.patrol||[])add(...pt,'#ff7ac8');
  const b=p.house!==undefined?data.buildings[p.house]:null;if(b)for(const [x,z] of cellsOf('building',b))add(x,z,'#e8d6a8');
  const kinds=new Set((p.routine||[]).filter(r=>(r.weight??1)>0).map(r=>r.do)),[hx,hz]=p.home||b&&[b.x,b.z]||[0,0];
  for(const prop of [...built.props,...(built.furniture||[])])for(const s of prop.spots||[])if(kinds.has(s.kind)&&s.tile&&Math.abs(s.tile.x-hx)+Math.abs(s.tile.z-hz)<=48)add(s.tile.x,s.tile.z,'#5fc8ff');
  spotsFill=createCellFill({cells,heightAt,parent:built.group,opacity:.55});}
 const field=(label,input)=>h('label',{class:'q-city-editor__field'},label,input);
 const personSelect=(label,value,choices,apply)=>field(label,h('select',{class:'q-select',on:{change:e=>setPerson(p=>apply(p,e.target.value),label.toLowerCase()).catch(error=>{status.value=error.message;})}},
  choices.map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;selection.value;const p=personOf();return !!p&&value(p)===id;}},name))));
 const personText=(label,value,apply)=>field(label,h('input',{type:'text',class:'q-input',value:()=>{revision.value;selection.value;const p=personOf();return p?value(p)??'':'';},
  on:{change:e=>setPerson(p=>apply(p,e.target.value.trim()),label.toLowerCase()).catch(error=>{status.value=error.message;})}}));
 const loadoutSlot=(slot,ids)=>personSelect({head:'Hat',rightHand:'Right hand',leftHand:'Left hand'}[slot],p=>p.look?.loadout?.[slot]||'',[['','None'],...ids.map(id=>[id,ITEMS[id]?.name||GEAR[id]?.name||id])],
  (p,v)=>{p.look??={};p.look.loadout??={};if(v)p.look.loadout[slot]=v;else delete p.look.loadout[slot];if(!Object.keys(p.look.loadout).length)delete p.look.loadout;});
 const houseChoices=computed(()=>{revision.value;return [{id:'',name:'No building'},...(data?.buildings||[]).map((b,i)=>({id:String(i),name:b.desc.name||`Building ${i+1}`}))];});
 function personPanel(){
  return h('div',{class:'q-city-editor__look',hidden:()=>{revision.value;return selection.value?.kind!=='townsfolk';}},
   h('strong',null,'Townsfolk'),
   h('div',{class:'q-city-editor__options'},h('div',null,
    personText('Name',p=>p.name,(p,v)=>{if(!v)throw Error('A townsfolk needs a name.');p.name=v;}),
    personText('Line',p=>p.line,(p,v)=>{if(v)p.line=v;else delete p.line;}),
    field('Colour',h('input',{type:'color',class:'q-city-editor__colour',value:()=>{revision.value;selection.value;return personOf()?.look?.color||'#9ccf7a';},on:{change:e=>setPerson(p=>{(p.look??={}).color=e.target.value;},'colour').catch(error=>{status.value=error.message;})}})),
    loadoutSlot('head',HEADS),loadoutSlot('rightHand',HANDS),loadoutSlot('leftHand',HANDS),
    personSelect('Pace',p=>String(p.pace??1),[['0.8','Unhurried'],['1','Usual'],['1.3','Brisk']],(p,v)=>{p.pace=+v;}),
    // The map's buildings change as you build: the choices follow them (a keyed list).
    field('Lives or works in',keyedList(h('select',{class:'q-select',on:{change:e=>setPerson(p=>{if(e.target.value==='')delete p.house;else p.house=+e.target.value;},'home building').catch(error=>{status.value=error.message;})}}),
     houseChoices,c=>c.id,c=>h('option',{value:c.peek().id,selected:()=>{revision.value;selection.value;const p=personOf();return !!p&&(p.house===undefined?'':String(p.house))===c.value.id;}},()=>c.value.name))),
    personSelect('Gives jobs',p=>p.giver==='post'?'post':'',[['','Only their shop’s'],['post','Post office deliveries']],(p,v)=>{if(v)p.giver=v;else delete p.giver;}),
    personSelect('Faces at their post',p=>p.facing||'',[['','Any way'],...Object.entries(SIDE_LABELS)],(p,v)=>{if(v)p.facing=v;else delete p.facing;}))),
   h('strong',null,'Routine'),
   h('p',{class:'q-page__help'},'How often they do each (0: never). Spots they use are blue on the map.'),
   h('div',{class:'q-city-editor__routine'},ACTIVITIES.map(a=>field(a,h('input',{type:'number',min:0,max:9,class:'q-input',value:()=>{revision.value;selection.value;const p=personOf();return p?String(weightOf(p,a)):'0';},
    on:{change:e=>setPerson(p=>{const w=Math.max(0,Math.min(9,Math.round(+e.target.value||0)));p.routine=(p.routine||[]).filter(r=>r.do!==a);if(w)p.routine.push({do:a,weight:w});if(!p.routine.length)p.routine=[{do:'stroll',weight:1}];},`${a} ${e.target.value}`).catch(error=>{status.value=error.message;})}})))),
   h('div',{class:'q-city-editor__row'},
    h('button',{type:'button',class:'q-button q-button--small','aria-pressed':()=>String(patrolOn.value),on:{click:()=>{patrolling=!patrolling;patrolOn.value=patrolling;status.value=patrolling?'Click tiles to add patrol stops (Esc when done).':'Patrol route done.';}}},()=>patrolOn.value?'Done drawing patrol':'Draw patrol route'),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>setPerson(p=>{delete p.patrol;p.routine=(p.routine||[]).filter(r=>r.do!=='patrol');if(!p.routine.length)p.routine=[{do:'stroll',weight:1}];},'patrol cleared').catch(error=>{status.value=error.message;})}},'Clear patrol')));
 }
 // The Floors panel: a selected building's floors (or the one you're in), with Go, Add and Remove, and the
 // floor's own actions: its use, Generate and Clear furniture, Place stairs up.
 const floorRows=computed(()=>{revision.value;floorHere.value;const i=ownerHere();if(i===null||!data?.buildings[i])return [];const b=data.buildings[i];
  const levels=[...new Set([0,...floorsOf(i).map(f=>f.level)])].sort((a,c)=>a-c);return levels.map(level=>({id:`${i}:${level}`,building:i,level,here:floorHere.value?.level===level||!floorHere.value&&level===0,
   label:`${LEVEL_NAME(level)}${level===0&&b.desc.interior!=='separate'?' (the map)':''}`,furniture:(floorsOf(i).find(f=>f.level===level)?.furniture||[]).length}));});
 const floorAction=(label,act)=>h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>Promise.resolve().then(act).catch(error=>{status.value=error.message;})}},label);
 const currentLevel=()=>floorHere.peek()?.level??0;
 async function addFloor(where){const i=ownerHere();if(i===null)throw Error('Select a building.');const b=data.buildings[i],levels=floorsOf(i).map(f=>f.level);
  const level=where==='above'?Math.max(0,...levels)+1:Math.min(0,...levels)-1;
  if(where==='above'&&level>(b.desc.storeys||1)-1)throw Error(`${b.desc.name||'This building'} has ${b.desc.storeys||1} storey${(b.desc.storeys||1)>1?'s':''}: raise its storeys first.`);
  const label=`${LEVEL_NAME(level)} added. Place its stairs, then Go.`;
  if(floorHere.peek())await changeFloor(()=>{floorAt(i,level);},label);else if(await change(()=>{floorAt(i,level);return cellsOf('building',b);},cellsOf('building',b)))status.value=label;}
 async function removeFloor(level){const i=ownerHere(),b=data.buildings[i];if(level===0)throw Error('The ground floor stays.');const levels=floorsOf(i).map(f=>f.level);
  if(level!==Math.max(...levels)&&level!==Math.min(...levels))throw Error('Remove the top floor or the bottom cellar first.');
  if(floorHere.peek()?.level===level)throw Error('Step off this floor first (Go to another, or Back outside).');
  const apply=()=>{b.floors=floorsOf(i).filter(f=>f.level!==level);const below=b.floors.find(f=>f.level===level-1);if(below&&level>0)delete below.up;};
  if(floorHere.peek())await changeFloor(apply,`${LEVEL_NAME(level)} removed.`);else if(await change(()=>{apply();return cellsOf('building',b);},cellsOf('building',b)))status.value=`${LEVEL_NAME(level)} removed.`;}
 async function generateFurniture(){const i=ownerHere();if(i===null)throw Error('Select a building.');const level=currentLevel(),f=floorAt(i,level);
  const apply=()=>{f.roll=(f.roll??0)+1;f.furniture=furnishFloor(i,level);};
  if(floorHere.peek())await changeFloor(apply,()=>`Furnished ${ON_LEVEL(level).replace(/^(on|in) /,'')} (${f.use||'its usual use'}): ${f.furniture.length} pieces. Generate again for another roll.`);
  else if(await change(()=>{apply();return cellsOf('building',data.buildings[i]);},cellsOf('building',data.buildings[i])))status.value=`Furnished the ground floor. Generate again for another roll.`;}
 async function clearFurniture(){const i=ownerHere();if(i===null)throw Error('Select a building.');const level=currentLevel(),f=floorAt(i,level);
  if(floorHere.peek())await changeFloor(()=>{f.furniture=[];},'Furniture cleared.');else if(await change(()=>{f.furniture=[];return cellsOf('building',data.buildings[i]);},cellsOf('building',data.buildings[i])))status.value='Ground floor furniture cleared.';}
 function floorsPanel(){
  return h('div',{class:'q-city-editor__look',hidden:()=>{revision.value;return !floorHere.value&&selection.value?.kind!=='building';}},
   h('strong',null,()=>{const here=floorHere.value;return here?`Floors · in ${LEVEL_NAME(here.level).toLowerCase()}`:'Floors';}),
   keyedList(h('div',{class:'q-city-editor__floors'}),floorRows,r=>r.id,r=>h('div',{class:'q-city-editor__row'},
    h('span',null,()=>`${r.value.label}${r.value.furniture?` · ${r.value.furniture} pieces`:''}`),
    h('button',{type:'button',class:'q-button q-button--small',disabled:()=>r.value.here,on:{click:()=>{status.value=host.enterFloor?.(r.peek().building,r.peek().level)?`To the ${LEVEL_NAME(r.peek().level).toLowerCase()}.`:'No way there yet: place the stairs to it.';}}},'Go'),
    h('button',{type:'button',class:'q-button q-button--small',hidden:()=>r.value.level===0,on:{click:()=>removeFloor(r.peek().level).catch(error=>{status.value=error.message;})}},'Remove'))),
   h('div',{class:'q-city-editor__row'},floorAction('Add floor above',()=>addFloor('above')),floorAction('Add cellar',()=>addFloor('below'))),
   h('div',{class:'q-city-editor__row'},floorAction('Place stairs up',()=>{const i=ownerHere();if(i===null)throw Error('Select a building.');pendingFlight={building:i,level:currentLevel()};status.value='Click the bottom step of the stairs (they rise the way the Stairs tool’s “Up towards” says).';}),
    floorAction('Generate furniture',generateFurniture),floorAction('Clear furniture',clearFurniture)),
   h('label',{class:'q-city-editor__field'},'This floor is a',h('select',{class:'q-select',on:{change:e=>{const i=ownerHere(),level=currentLevel();if(i===null)return;const apply=()=>{const f=floorAt(i,level);if(e.target.value)f.use=e.target.value;else delete f.use;};
     (floorHere.peek()?changeFloor(apply,'Use set.'):change(()=>{apply();return [];})).catch(error=>{status.value=error.message;});}}},
    [['','Its usual use'],...USE_NAMES.map(u=>[u,u])].map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;floorHere.value;selection.value;const i=ownerHere();return i!==null&&(floorsOf(i).find(f=>f.level===currentLevel())?.use||'')===id;}},name)))),
   h('div',{class:'q-city-editor__row',hidden:()=>!floorHere.value},floorAction('Back outside',()=>{status.value=host.leaveFloor?.()?'Back outside.':'';})));
 }
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
 // The prop palette (docs/TOWN.md, Prop palette): a search box over the prop groups, each prop a button
 // with its thumbnail (drawn from its real model the first time the Prop tool opens) and name.
 const propSearch=signal('');
 const matches=kind=>{const q=propSearch.value.trim().toLowerCase();return !q||`${PROPS[kind].name} ${kind}`.toLowerCase().includes(q);};
 function propPalette(){
  const item=kind=>{const [w,d]=PROPS[kind].footprint;
   return h('button',{type:'button',class:'q-city-editor__prop',title:`${PROPS[kind].name} (${w} × ${d})`,'aria-pressed':()=>String(options.prop.value===kind),hidden:()=>!matches(kind),on:{click:()=>{options.prop.value=kind;}}},
    h('img',{class:'q-city-editor__thumb',alt:'',width:48,height:48,src:()=>tool.value==='prop'?propThumbnail(kind).value||undefined:undefined}),h('span',null,PROPS[kind].name));};
  return h('div',{class:'q-city-editor__palette'},
   h('input',{type:'search',class:'q-input',placeholder:'Search props',value:()=>propSearch.value,on:{input:e=>{propSearch.value=e.target.value;}}}),
   h('p',{class:'q-page__help'},()=>`${PROPS[options.prop.value]?.name||''} selected.`),
   h('div',{class:'q-city-editor__shelf'},...Object.entries(PROP_CATEGORIES).map(([group,kinds])=>h('section',{class:'q-city-editor__group',hidden:()=>!kinds.some(matches)},h('strong',null,group),h('div',{class:'q-city-editor__props'},kinds.map(item))))));
 }
 // Previews (docs/TOWN.md, Preview ghosts): under the pointer, what a click or a stroke would change,
 // green where it fits and red where it doesn't, with a see-through model for props and the reason a
 // spot is refused. They use the same checks as placing, without changing anything.
 const OK='#45d483',NO='#ff5a5a',BRUSH='#5fc8ff';
 let hoverAt=null,fill=null,ghost=null;const previewNote=signal('');
 const ghostMaterials={ok:new THREE.MeshBasicMaterial({color:OK,transparent:true,opacity:.5,depthWrite:false}),no:new THREE.MeshBasicMaterial({color:NO,transparent:true,opacity:.5,depthWrite:false})};
 const heightAt=(x,z)=>at(x,z)?.h??built?.ground?.tile(x,z)?.h??1;
 function clearPreview(){fill?.dispose();fill=null;ghost?.group.removeFromParent();previewNote.value='';}
 // A prop's model, see-through, where it would stand (as createProp places it).
 function showGhost(kind,rotation,x,z,ok){
  if(!ghost||ghost.kind!==kind){ghost?.group.removeFromParent();const group=propModel(kind);group.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=false;m.renderOrder=23;}});ghost={kind,group};}
  ghost.group.traverse(m=>{if(m.isMesh)m.material=ok?ghostMaterials.ok:ghostMaterials.no;});
  const [w,d]=propFootprint(kind,rotation),steps=((Math.round(rotation/90)%4)+4)%4;let base=0;for(let b=0;b<d;b++)for(let a=0;a<w;a++)base=Math.max(base,heightAt(x+a,z+b));
  ghost.group.rotation.y=-steps*Math.PI/2;ghost.group.position.set(x+(w-1)/2-6,base,z+(d-1)/2-6);built.group.add(ghost.group);}
 const fits=check=>{try{check();return null;}catch(error){return error.message;}};
 const tint=(cells,color)=>cells.map(([x,z])=>({x,z,color}));
 // What the current tool would do at a tile: {cells:[{x, z, color}], prop:{kind, rotation, x, z}, refused}.
 function previewAt(x,z){const o=Object.fromEntries(Object.entries(options).map(([k,v])=>[k,v.peek()])),rotation=+o.rotation,inMap=(a,b)=>a>=0&&b>=0&&a<data.size[0]&&b<data.size[1];
  const placed=(kind,entry,own=[])=>{let cells=[];try{cells=cellsOf(kind,entry);}catch{return {cells:[],refused:'That doesn’t fit here.'};}const refused=fits(()=>validate(kind,entry,own,{dry:true}));
   return {cells:tint(cells,refused?NO:OK),refused,prop:kind==='prop'?{kind:entry.kind,rotation:entry.rotation||0,x:entry.x,z:entry.z}:null};};
  // On a floor: furniture fits on open floor tiles; the shape, walls and stairs show the tile.
  if(floorHere.peek()){if(pendingFlight){const fl=flightOf({at:[0,0],dir:o.dir}),cells=[fl.bottom,fl.top,fl.front].map(([a,b])=>[x+a,z+b]),bad=cells.some(([a,b])=>!at(a,b)?.indoor);return {cells:tint(cells,bad?NO:OK),refused:bad?'The stairs and the tile in front must be on the floor.':null};}
   if(tool.peek()==='prop'){const [w,d]=propFootprint(o.prop,rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push([x+a,z+b]);const bad=cells.some(([a,b])=>{const t=at(a,b);return !t||!t.indoor||t.blocked;});
    return {cells:tint(cells,bad?NO:OK),refused:bad?'No room for it here.':null,prop:{kind:o.prop,rotation,x,z}};}
   return ['footprint','surface','edge','erase'].includes(tool.peek())?{cells:tint([[x,z]],tool.peek()==='erase'?NO:BRUSH)}:null;}
  if(pendingFlight){const fl=flightOf({at:[0,0],dir:o.dir}),cells=[fl.bottom,fl.top,fl.front].map(([a,b])=>[x+a,z+b]),own=data.buildings[pendingFlight.building],inB=new Set(cellsOf('building',own).map(c=>c.join(','))),bad=cells.some(c=>!inB.has(c.join(',')));return {cells:tint(cells,bad?NO:OK),refused:bad?'The stairs and the tile in front must be inside the building.':null};}
  if(tool.peek()==='select'){
   if(placing)return placed(placing.kind,{...structuredClone(placing.entry),...anchorPatch(placing.kind,[x,z])});
   const sel=selection.peek(),entry=entryOf(sel);if(moving.peek()&&entry){const own=cellsOf(sel.kind,entry);return placed(sel.kind,sel.kind==='crystal'?[x,z]:{...structuredClone(entry),...anchorPatch(sel.kind,[x,z])},own);}
   return null;}
  switch(tool.peek()){
   case 'prop':return placed('prop',{kind:o.prop,x,z,rotation});
   case 'townsfolk':return placed('townsfolk',{home:[x,z]});
   case 'enemy':return placed('enemy',{enemy:o.enemyKind,aggressive:o.enemyMood==='aggressive',respawn:+o.enemyRespawn,x,z});
   case 'building':{const desc={...structuredClone(BUILDING_PRESETS[o.preset]),rotation};let cells=[];try{cells=planBuilding(desc,[x,z]).tiles;}catch(error){return {cells:[],refused:error.message};}
    const refused=fits(()=>{oneChunk(cells);taken(cells);});return {cells:tint(cells,refused?NO:OK),refused};}
   case 'stairs':{const cells=stairCells({x,z,dir:o.dir,length:+o.length,width:+o.width}),missing=cells.find(([a,b])=>!at(a,b));return {cells:tint(cells,missing?NO:OK),refused:missing?`${missing.join(',')} is off the map.`:null};}
   case 'crystal':return placed('crystal',[x,z],data.crystal?[data.crystal]:[]);
   case 'spawn':{const t=at(x,z),bad=!t||t.blocked||t.water;return {cells:tint([[x,z]],bad?NO:OK),refused:bad?'You can’t arrive there.':null};}
   case 'nature':{if(!data.land)return null;const choice=o.nature,[group]=choice.split(':');
    return {cells:brushTiles(x,z).filter(([a,b])=>inMap(a,b)).map(([a,b])=>{const t=at(a,b),n=natureAt(a,b);
     const ok=choice==='fishing'?!!t?.water:choice==='grow'?!!t&&!t.water:choice==='clear'?!!(n.resource||n.cover):group==='cover'?!!t&&!t.water&&t.building===undefined:resourceFits(t)&&!(data.crystal&&data.crystal[0]===a&&data.crystal[1]===b);
     return {x:a,z:b,color:ok?(choice==='clear'?NO:OK):'#8a8a8a'};})};}
   case 'raise':case 'lower':case 'flatten':case 'surface':return {cells:brushTiles(x,z).filter(([a,b])=>inMap(a,b)).map(([a,b])=>({x:a,z:b,color:BRUSH}))};
   case 'footprint':return {cells:brushTiles(x,z).filter(([a,b])=>inMap(a,b)).map(([a,b])=>({x:a,z:b,color:o.draftMode==='add'?OK:NO}))};
   case 'biome':{if(!data.land)return null;const r=o.biomeBrush==='3'?1:o.biomeBrush==='5'?2:0,[cx,cz]=cellOf(x,z),[ox,oz]=data.land.origin||[0,0],cells=[];
    for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)for(let b=0;b<BIOME_CELL;b++)for(let a=0;a<BIOME_CELL;a++)cells.push({x:(cx+dx)*BIOME_CELL+a-ox,z:(cz+dz)*BIOME_CELL+b-oz,color:(o.landLayer==='terrain'?TERRAIN_PAINT[o.terrain]:BIOME_PAINT[o.biome])||BRUSH});return {cells};}
   case 'erase':{const hit=pickAt(x,z);if(hit&&hit.kind!=='townsfolk')return {cells:tint(cellsOf(hit.kind,entryOf(hit)),NO)};
    const n=data.land?natureAt(x,z):{};return n.resource||n.cover||n.fishing||data.edges.some(e=>e.a[0]===x&&e.a[1]===z||e.b[0]===x&&e.b[1]===z)?{cells:tint([[x,z]],NO)}:null;}
   case 'use':case 'reroll':{const b=data.buildings.find(e=>covers(e,x,z,'building'));return b?{cells:tint(cellsOf('building',b),BRUSH)}:null;}
  }
  return null;}
 // An entry's anchor moved to a tile, as a patch (townsfolk are anchored by their home).
 const anchorPatch=(kind,[x,z])=>kind==='townsfolk'?{home:[x,z]}:kind==='crystal'?{0:x,1:z}:{x,z};
 function refreshPreview(){clearPreview();if(!built||!view||mode.peek()!=='edit'||!hoverAt)return;
  let p=null;try{p=previewAt(hoverAt.x,hoverAt.z);}catch{p=null;}if(!p)return;
  if(p.cells?.length)fill=createCellFill({cells:p.cells,heightAt,parent:built.group});
  if(p.prop&&PROPS[p.prop.kind])showGhost(p.prop.kind,p.prop.rotation,p.prop.x,p.prop.z,!p.refused);
  previewNote.value=p.refused?`Can’t place here: ${p.refused}`:'';}
 function hover(tile){hoverAt=tile?{x:tile.x,z:tile.z}:null;refreshPreview();}
 function cancel(){if(patrolling){patrolling=false;patrolOn.value=false;status.value='Patrol route done.';return;}if(placing||moving.peek()){placing=null;moving.value=false;status.value='Cancelled.';}else if(draft.peek().size&&tool.peek()==='footprint'){clearDraft();status.value='Footprint cleared.';}else selection.value=null;showSelection();}
 // Keys while editing (not while typing in the panel): they never reach the camera.
 // Keys never take a movement key (WASD, arrows: the camera and the free camera keep them): Ctrl/⌘+Z undo,
 // Ctrl/⌘+Shift+Z or Ctrl/⌘+Y redo, and with a selection Ctrl/⌘+D duplicate, R rotate, M move, Delete.
 function onKey(e){if(!view||mode.peek()!=='edit'||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName||''))return;
  const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  let act=null;
  if(e.key==='Escape')act=cancel;
  else if(mod&&k==='z')act=e.shiftKey?()=>step(redo,undo):()=>step(undo,redo);else if(mod&&k==='y')act=()=>step(redo,undo);
  else if(selection.peek()){if(mod&&k==='d')act=duplicateSelection;else if(mod||e.altKey)act=null;else if(k==='r')act=rotateSelection;else if(k==='m')act=startMove;else if(e.key==='Delete'||e.key==='Backspace')act=deleteSelection;}
  if(!act)return;e.preventDefault();e.stopImmediatePropagation();Promise.resolve().then(act).catch(error=>{status.value=error.message;});}
 // Brushes paint as you drag: each tile once per stroke, the stroke one undo step, and the chunks it
 // reached rebuilt as it goes.
 let stroke=null;
 function paint(phase,tile){
  // The biome tool paints the land's cells; the map and its land rebuild when the stroke ends.
  if(tool.peek()==='nature'&&!data.land){if(phase==='end')status.value='Add land first.';return Promise.resolve();}
  if(tool.peek()==='biome'){
   if(!data.land){if(phase==='end')status.value='Add land first.';return Promise.resolve();}
   if(phase==='start'){snapshot();stroke={last:tile,cells:new Set()};paintBiome(tile);showBiomes();return Promise.resolve();}
   if(phase==='move'&&stroke){const {x:x0,z:z0}=stroke.last,n=Math.max(Math.abs(tile.x-x0),Math.abs(tile.z-z0));for(let i=1;i<=n;i++)paintBiome({x:Math.round(x0+(tile.x-x0)*i/n),z:Math.round(z0+(tile.z-z0)*i/n)});stroke.last=tile;showBiomes();return Promise.resolve();}
   // The land forgets what it worked out around the painted cells, and only the chunks there rebuild.
   if(phase==='end'){const done=stroke;stroke=null;return repaintLand(done?.cells||new Set()).then(()=>{status.value=options.landLayer.peek()==='terrain'?`Painted ${options.terrain.peek()==='usual'?'the biomes’ usual terrain':terrainRule(options.terrain.peek()).name}: ${Object.keys(data.land.terrain||{}).length} terrain cells painted in all.`:`Painted ${biomeRule(options.biome.peek()).name}: ${Object.keys(data.land.cells).length} cells painted in all.`;});}
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
 function clearNature(x,z){const n=natureAt(x,z);for(const which of ['resource','cover','fishing']){const e=n[which];if(!e)continue;
  if(e.placed){const list=lists()[which];list.splice(list.findIndex(r=>r.x===x&&r.z===z),1);}else removeGrown(e.id);}}
 // Grow: what the biome grows on this tile from the map's seed (the land's own pick, placed as the map's
 // own), so a blank map can be filled by hand with biome-appropriate nature.
 function growNature(x,z){const t=at(x,z),land=built?.ground?.land;if(!t||!land||t.water)return false;let placed=false;
  const [e]=land.entities([t]),[c]=land.cover([t]);
  if(e&&resourceFits(t)&&!(data.crystal&&data.crystal[0]===x&&data.crystal[1]===z)){const list=lists().resource;const i=list.findIndex(r=>r.x===x&&r.z===z);if(i>=0)list.splice(i,1);list.push(e.kind==='tree'?{kind:'tree',species:e.species,x,z}:{kind:e.kind,x,z});placed=true;}
  if(c&&t.building===undefined){const list=lists().cover;const i=list.findIndex(r=>r.x===x&&r.z===z);if(i>=0)list.splice(i,1);list.push({kind:c.kind,x,z});placed=true;}
  return placed;}
 function putNature(x,z,choice){const t=at(x,z);if(choice==='clear'){clearNature(x,z);return true;}if(choice==='grow')return growNature(x,z);
  // A fishing spot goes on water; one per tile, replacing a generated one there.
  if(choice==='fishing'){if(!t?.water)return false;const n=natureAt(x,z).fishing;if(n?.placed)return false;if(n)removeGrown(n.id);lists().fishing.push({x,z});return true;}
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
 // Floors by hand (docs/CITY.md, Floors; spaces.js): a building's floors by level (−1 a cellar, 0 the
 // ground, 1… above), each its own data: shape, material, inside walls, furniture and the flight up.
 // Edits inside a floor rebuild only that building's floors, and you stay where you are.
 const LEVEL_NAME=l=>l<0?'Cellar':l===0?'Ground floor':`Floor ${l+1}`,ON_LEVEL=l=>l<0?'in the cellar':l===0?'on the ground floor':`on floor ${l+1}`;
 const floorsOf=i=>data.buildings[i].floors??=[];
 const floorAt=(i,level)=>{const list=floorsOf(i);let f=list.find(e=>e.level===level);if(!f){f={level};list.push(f);}return f;};
 const planOf=i=>planBuilding(data.buildings[i].desc,[data.buildings[i].x,data.buildings[i].z]);
 const localOf=(i,x,z)=>{const p=planOf(i);return [x-p.x0,z-p.z0];};
 let pendingFlight=null;
 // Buildings whose floors changed while you were inside one: their map chunks rebuild when you step out.
 const staleBuildings=new Set();
 async function changeFloor(apply,label){const here=floorHere.peek();snapshot();if(here)staleBuildings.add(here.building);
  try{apply();}catch(error){undo.pop();history.value={undo:undo.length,redo:redo.length};status.value=error.message;return false;}
  if(here)host.rebuildFloors(here.building);revision.value++;refreshPreview();if(label)status.value=typeof label==='function'?label():label;return true;}
 // A floor's tiles (world) for furnishing: its shape, minus its stairs and their fronts.
 function furnishFloor(i,level){const b=data.buildings[i],plan=planOf(i),f=floorAt(i,level),levels=new Map(floorLevels(b).map(e=>[e.level,e]));
  const world=([dx,dz])=>[plan.x0+dx,plan.z0+dz],shape=(f.cells?.length?f.cells.map(world):plan.tiles);
  const flights=[f.up,levels.get(level-1)?.up].filter(Boolean).map(flightOf),keep=flights.flatMap(fl=>[fl.bottom,fl.top,fl.front]).map(world);
  const doors=level===0?plan.doors.map(d=>({inside:d.inside,out:d.out})):flights.map(fl=>({inside:world(fl.front),out:[0,0]}));
  const use=f.use||(level===0?furnishingUse(b.desc):level<0?'warehouse':upstairsUse(furnishingUse(b.desc)||'home'))||'home';
  const layout=furnishRoom({tiles:shape,doors,keeper:level===0?plan.anchors.keeper:null,keep},use,(b.desc.seed??1)*31+level+(f.roll??0)*97);
  return layout.map(p=>({kind:p.kind,at:[p.x-plan.x0,p.z-plan.z0],rotation:p.rotation||0}));}
 const ownerHere=()=>floorHere.peek()?.building??(selection.peek()?.kind==='building'?selection.peek().index:null);
 // Clicks on a floor: furniture (Prop), Erase, inside walls and doors (Edge), the floor's shape (Footprint), its
 // material (Surface), and the flight up (Place stairs up).
 async function floorClick(tile){const here=floorHere.peek(),i=here.building,f=floorAt(i,here.level),[lx,lz]=localOf(i,tile.x,tile.z),o=Object.fromEntries(Object.entries(options).map(([k,v])=>[k,v.peek()]));
  switch(tool.peek()){
   case 'inspect':status.value=`${LEVEL_NAME(here.level)} · ${lx},${lz} · ${tile.surface}${tile.blocked?' · solid':''}`;return;
   case 'prop':{const [w,d]=propFootprint(o.prop,+o.rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push(at(tile.x+a,tile.z+b));
    if(cells.some(c=>!c||!c.indoor||c.blocked))throw Error('No room for it here.');
    await changeFloor(()=>{(f.furniture??=[]).push({kind:o.prop,at:[lx,lz],rotation:+o.rotation});},`${PROPS[o.prop].name} ${ON_LEVEL(here.level)}.`);return;}
   case 'erase':{const list=f.furniture||[],hit=list.findIndex(p=>{const [w,d]=propFootprint(p.kind,p.rotation||0);return lx>=p.at[0]&&lx<p.at[0]+w&&lz>=p.at[1]&&lz<p.at[1]+d;});
    if(hit>=0){await changeFloor(()=>{list.splice(hit,1);},'Removed.');return;}
    const edge=(f.edges||[]).findIndex(e=>e.a[0]===lx&&e.a[1]===lz||e.b[0]===lx&&e.b[1]===lz);if(edge>=0){await changeFloor(()=>{f.edges.splice(edge,1);},'Removed the wall.');return;}
    throw Error('Nothing to erase here.');}
   case 'edge':{const [dx,dz]=DIRS[o.side],b=[lx+dx,lz+dz],same=e=>[e.a,e.b].map(String).sort().join('|')===[[lx,lz],b].map(String).sort().join('|');
    await changeFloor(()=>{f.edges=(f.edges||[]).filter(e=>!same(e));if(o.edge!=='none')f.edges.push({a:[lx,lz],b,kind:o.edge});},o.edge==='none'?'Wall removed.':`${o.edge} placed.`);return;}
   case 'surface':await changeFloor(()=>{f.surface=o.surface==='land'?undefined:o.surface;},`Floor: ${o.surface}.`);return;
   // A floor's shape may be any size (paint onto the solid ring around it to grow it); one bigger than the
   // floor below is a warning in the checks, and underground floors aren't limited.
   case 'footprint':{const plan=planOf(i),foot=plan.tiles.map(([x,z])=>[x-plan.x0,z-plan.z0]),cells=new Set((f.cells?.length?f.cells:foot).map(c=>c.join(','))),k=`${lx},${lz}`;
    await changeFloor(()=>{if(o.draftMode==='add')cells.add(k);else cells.delete(k);f.cells=[...cells].map(c=>c.split(',').map(Number));if(f.cells.length===foot.length)delete f.cells;},`${LEVEL_NAME(here.level)}: ${cells.size} tiles.`);return;}
  }
  throw Error('On a floor: Inspect, Prop, Edge, Footprint, Surface and Erase work (and the Floors panel).');}
 // The flight up from a floor (or the ground floor, on the map): its bottom step where you click, rising
 // the way the Stairs tool's "Up towards" says.
 async function placeFlight(tile){const {building:i,level}=pendingFlight;pendingFlight=null;const [lx,lz]=localOf(i,tile.x,tile.z),dir=options.dir.peek();
  const apply=()=>{const f=floorAt(i,level),fl=flightOf({at:[lx,lz],dir}),plan=planOf(i),inside=c=>plan.tiles.some(([x,z])=>x===plan.x0+c[0]&&z===plan.z0+c[1]);
   // On this floor: a floor's own shape (or, on the map, the building's footprint).
   const own=floorHere.peek()?c=>!!at(plan.x0+c[0],plan.z0+c[1])?.indoor:inside;
   if(![fl.bottom,fl.top,fl.front].every(own))throw Error('The stairs and the tile in front of them must be on this floor.');f.up={at:[lx,lz],dir};};
  if(floorHere.peek())await changeFloor(apply,`Stairs up from ${ON_LEVEL(level).replace(/^(on|in) /,'')}.`);
  else if(await change(()=>{apply();return cellsOf('building',data.buildings[i]);},cellsOf('building',data.buildings[i])))status.value=`Stairs up from the ground floor.`;}
 async function click(tile,point=null,actor=null){
  // A door into a building, or a stairwell: Inspect and Select follow it (docs/CITY.md, Floors).
  if(mode.peek()==='edit'&&actor?.link&&['inspect','select'].includes(tool.peek())){status.value=host.enterLink?.(actor.link)?`Through the ${actor.kind==='stairwell'?'stairs':'door'}.`:'Can’t go that way.';return true;}
  if(mode.peek()==='edit'&&pendingFlight){await placeFlight(tile).catch(error=>{status.value=error.message;});return true;}
  if(mode.peek()==='edit'&&floorHere.peek()){await floorClick(tile).catch(error=>{status.value=error.message;});return true;}
  if(mode.peek()!=='edit')return false;
  // Drawing a patrol route: each click adds a stop (docs/TOWN.md, Townsfolk tool).
  if(patrolling&&personOf()){const p=personOf(),{x:px,z:pz}=tile;await setPerson(e=>{(e.patrol??=[]).push([px,pz]);if(!e.routine.some(r=>r.do==='patrol'))e.routine.push({do:'patrol',weight:3});},`patrol stop ${p.patrol?.length+1||1} at ${px},${pz}`);return true;}
  const {x,z}=tile,o=Object.fromEntries(Object.entries(options).map(([k,s])=>[k,s.peek()])),rotation=+o.rotation;
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
   case 'prop':if(await change(()=>{const [w,d]=propFootprint(o.prop,rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push([x+a,z+b]);taken(cells,[],o.prop);data.props.push({kind:o.prop,x,z,rotation});return cells;}))status.value=`Placed ${PROPS[o.prop].name} at ${x},${z}.`;break;
   case 'stairs':await change(()=>{const s={x,z,dir:o.dir,length:+o.length,width:+o.width};data.stairs.push(s);return stairCells(s);});status.value=`Stairs from ${x},${z}, going up ${SIDE_LABELS[o.dir].toLowerCase()}.`;break;
   case 'edge':await change(()=>{const [dx,dz]=DIRS[o.side],b=[x+dx,z+dz],same=e=>[e.a,e.b].map(String).sort().join('|')===[[x,z],b].map(String).sort().join('|');
    data.edges=data.edges.filter(e=>!same(e));if(o.edge!=='none')data.edges.push({a:[x,z],b,kind:o.edge});return [[x,z],b];});break;
   case 'erase':{const hit=pickAt(x,z);
    if(hit&&hit.kind!=='townsfolk'){selection.value=hit;await deleteSelection();break;}
    if(data.land&&(natureAt(x,z).resource||natureAt(x,z).cover||natureAt(x,z).fishing)){await change(()=>{clearNature(x,z);return [[x,z]];});status.value=`Cleared nature at ${x},${z}.`;break;}
    await change(()=>{const before=data.edges.length;data.edges=data.edges.filter(e=>!(e.a[0]===x&&e.a[1]===z||e.b[0]===x&&e.b[1]===z));if(data.edges.length===before)throw Error('Nothing to erase here.');return [[x,z]];});break;}
   // Use: what a building is furnished as (furnish.js); a shop's sign follows its trade. Reroll: a new
   // furnishing seed for the same use.
   case 'use':case 'reroll':await change(()=>{const b=data.buildings.find(e=>covers(e,x,z,'building'));if(!b)throw Error('Click a building.');
    if(tool.peek()==='use'){b.desc.use=o.use;if(b.desc.sign&&USE_ICONS[o.use])b.desc.sign={...b.desc.sign,icon:USE_ICONS[o.use]};status.value=`${b.desc.name||'Building'}: ${o.use}.`;}
    else{b.desc.furnishSeed=Math.floor(Math.random()*1e6);status.value=`${b.desc.name||'Building'}: refurnished.`;}return cellsOf('building',b);});break;
   case 'townsfolk':{const n=(data.townsfolk||[]).length+1,person={id:uniqueFolkId('townsfolk'),name:`Townsfolk ${n}`,look:{color:FOLK_COLOURS[n%FOLK_COLOURS.length]},home:[x,z],routine:[{do:'stroll',weight:2},{do:'chat',weight:1},{do:'gaze',weight:1}],pace:1};
    if(await change(()=>{const cells=validate('townsfolk',person,[]);lists().townsfolk.push(person);return cells;})){selection.value={kind:'townsfolk',index:data.townsfolk.length-1};showSelection();status.value=`${person.name} lives at ${x},${z}. Set them up in the Townsfolk panel.`;}break;}
   case 'spawn':await change(()=>{data.spawn=[x,z];return [];});status.value=`Arrival at ${x},${z}.`;break;
   case 'enemy':{const spawn={enemy:o.enemyKind,aggressive:o.enemyMood==='aggressive',respawn:+o.enemyRespawn,x,z};
    if(await change(()=>{const cells=validate('enemy',spawn,[]);lists().enemy.push(spawn);return cells;}))status.value=`${nameOf('enemy',spawn)} spawns at ${x},${z}.`;break;}
   case 'crystal':{const old=data.crystal?[data.crystal]:[];if(await change(()=>{data.crystal=[x,z];return validate('crystal',data.crystal,old);},old))status.value=`The Iter Crystal at ${x},${z}.`;break;}
  }
  return true;
 }
 // at: where to put the player (the tile they stand on, when the editor opens on the map they're in).
 async function load(next,{at=null}={}){data=next;undo.length=0;redo.length=0;history.value={undo:0,redo:0};selection.value=null;placing=null;moving.value=false;draft.value=new Set();draftFor=null;
  const listed=catalogue.find(c=>c.mapId===data.id);if(listed)choice.value=listed.id;
  if(rebuilding)await rebuilding;built=await host.editCity(data,{keepPlayer:false,at});scheduleChecks(0);showGrid();showSelection();showDraft();showBiomes();revision.value++;status.value=`Editing ${data.name} (${data.size.join(' × ')}).`;}
 // Undo and redo: the saved state replaces the data in place (the city being edited stays the same
 // object), and only what differs between the two states rebuilds (whole when the map's size or land
 // settings differ).
 async function step(from,to){if(!from.length)return;to.push(JSON.stringify(data));const next=JSON.parse(from.pop()),diff=differences(data,next);
  for(const k of Object.keys(data))delete data[k];Object.assign(data,next);history.value={undo:undo.length,redo:redo.length};if(!entryOf(selection.peek()))selection.value=null;
  // Inside a floor: rebuild that building's floors (you stay); the map catches up when you step out.
  const here=floorHere.peek();if(here){host.rebuildFloors(here.building);staleBuildings.add(here.building);revision.value++;refreshPreview();return;}
  if(!diff||!built?.ground&&data.land){await rebuild();return;}
  if(built?.ground){built.ground.land.useCells(data.land.cells,data.land.terrain);for(const r of diff.forget)built.ground.land.forget(...r);}
  await rebuild({dirty:[...new Set([...chunksAround(diff.cells),...diff.chunks])]});}
 // What differs between two states of a map: tiles to rebuild around, extra chunk ids and land areas to
 // forget (repainted biome cells); null when only a full rebuild will do.
 function differences(a,b){
  const settings=d=>JSON.stringify([d.size,d.style,d.walls,d.gates,d.land&&{...d.land,cells:null,terrain:null,removed:null}]);if(settings(a)!==settings(b))return null;
  const cells=[],chunks=[],forget=[];
  // Ground, row by row and then tile by tile where a row differs.
  for(const [id,r] of Object.entries(b.regions)){const o=a.regions[id],[rx,rz]=id.split(',').map(Number);if(!o)return null;
   for(const layer of ['heights','offsets','surfaces'])(r[layer]||[]).forEach((row,z)=>{const old=o[layer]?.[z];if(row===old)return;for(let x=0;x<row.length;x++)if(row[x]!==old?.[x])cells.push([rx*REGION+x,rz*REGION+z]);});}
  // Placed things, entry by entry: the tiles of both versions of any that differ.
  const placed={buildings:e=>{try{return planBuilding(e.desc,[e.x,e.z]).tiles;}catch{return [[e.x,e.z]];}},props:propCells,stairs:stairCells,resources:e=>[[e.x,e.z]],cover:e=>[[e.x,e.z]],fishing:e=>[[e.x,e.z]],enemies:e=>cellsOf('enemy',e),
   edges:e=>[e.a,e.b],townsfolk:e=>[e.home,...e.patrol||[]].filter(Boolean)};
  for(const [list,of] of Object.entries(placed)){const p=a[list]||[],q=b[list]||[];for(let i=0;i<Math.max(p.length,q.length);i++)if(JSON.stringify(p[i])!==JSON.stringify(q[i]))cells.push(...(p[i]?of(p[i]):[]),...(q[i]?of(q[i]):[]));}
  for(const k of ['crystal','spawn'])if(JSON.stringify(a[k])!==JSON.stringify(b[k]))cells.push(...[a[k],b[k]].filter(Boolean));
  if(b.land){const [ox,oz]=b.land.origin||[0,0],at=id=>id.match(/(-?\d+),(-?\d+)$/)?.slice(1).map(Number);
   const removed=new Set(a.land.removed||[]),now=new Set(b.land.removed||[]);for(const id of [...removed,...now])if(removed.has(id)!==now.has(id)){const c=at(id);if(c)cells.push(c);}
   const changedCells=layer=>[...new Set([...Object.keys(a.land[layer]||{}),...Object.keys(b.land[layer]||{})])].filter(k=>a.land[layer]?.[k]!==b.land[layer]?.[k]);
   for(const k of new Set([...changedCells('cells'),...changedCells('terrain')])){const [cx,cz]=k.split(',').map(Number),
    r=[cx*BIOME_CELL-ox-FORGET_MARGIN,cz*BIOME_CELL-oz-FORGET_MARGIN,(cx+1)*BIOME_CELL-ox+FORGET_MARGIN,(cz+1)*BIOME_CELL-oz+FORGET_MARGIN];forget.push(r);
    for(let z=Math.floor(r[1]/CHUNK);z<=Math.floor(r[3]/CHUNK);z++)for(let x=Math.floor(r[0]/CHUNK);x<=Math.floor(r[2]/CHUNK);x++)chunks.push(`${x},${z}`);}}
  return {cells,chunks,forget};
 }
 // Grows the map by whole chunks (docs/TOWN.md, Growing the overworld): one undo step, a full rebuild,
 // and you stay on the same spot of ground (it moves with everything else when the map grows west or north).
 async function growBy(){const n=+options.growBy.peek()*CHUNK,side=options.growSide.peek(),sides=side==='all'?{north:n,east:n,south:n,west:n}:{[side]:n};
  const here=host.currentCity?.()?.at;snapshot();
  try{growMap(data,sides);}catch(error){undo.pop();history.value={undo:undo.length,redo:redo.length};status.value=error.message;return;}
  if(rebuilding)await rebuilding;built=await host.editCity(data,{keepPlayer:false,at:here&&{x:here.x+(sides.west||0),z:here.z+(sides.north||0)}});
  scheduleChecks(0);showGrid();showSelection();showDraft();showBiomes();revision.value++;status.value=`${data.name} is now ${data.size.join(' × ')}.`;}
 const json=()=>JSON.stringify(data,null,1);
 async function save(){
  try{const response=await fetch('/__city-save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:data.id,json:json()})});
   const result=await response.json();status.value=response.ok?`Saved to ${result.path}.`:`Not saved: ${result.error}`;}catch{status.value='Saving needs the playground dev server (npm run dev:debug). Use Copy or Download instead.';}}
 function download(){const link=h('a',{href:URL.createObjectURL(new Blob([json()],{type:'application/json'})),download:`${data.id}.json`});link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
 // A colour swatch choice (biomes, terrains): the colour the overlay paints, and the name.
 const swatch=(value,id,name,color)=>h('button',{type:'button',class:'q-city-editor__swatch','aria-pressed':()=>String(value.value===id),on:{click:()=>{value.value=id;}}},h('span',{class:'q-city-editor__chip',style:color?`background:${color}`:'background:transparent'}),h('span',null,name));
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
    h('button',{type:'button',class:'q-button q-button--small',title:`${MOD}+Z`,disabled:()=>!history.value.undo,on:{click:()=>step(undo,redo)}},'Undo'),
    h('button',{type:'button',class:'q-button q-button--small',title:`${MOD}+Shift+Z`,disabled:()=>!history.value.redo,on:{click:()=>step(redo,undo)}},'Redo')),
   h('div',{class:'q-city-editor__tools',hidden:()=>mode.value!=='edit'},TOOLS.map(([id,name])=>h('button',{type:'button',class:'q-button q-button--small','aria-pressed':()=>tool.value===id,on:{click:()=>{tool.value=id;}}},name))),
   h('div',{class:'q-city-editor__options',hidden:()=>mode.value!=='edit'},
    h('div',{hidden:shown('walls')},select('Make it',options.wallKind,[['window','A window'],['wall','A plain wall'],['door','A door'],['sign','The sign'],['nosign','No sign'],['flowers','Flower box (toggle)']]),h('p',{class:'q-page__help'},'Click beside a wall.')),
    h('div',{hidden:shown('biome')},
     h('div',{hidden:()=>{revision.value;return !!data?.land;}},select('Unpainted land',options.landDefault,BIOME_IDS.map(id=>[id,biomeRule(id).name])),
      h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>addLand()}},'Add land')),
     h('div',{hidden:()=>{revision.value;return !data?.land;}},
      segmented({label:'Layer',value:()=>options.landLayer.value,onChange:v=>{options.landLayer.value=v;showBiomes();},options:[{value:'biome',label:'Biome'},{value:'terrain',label:'Terrain'}]}),
      h('div',{class:'q-city-editor__swatches',hidden:()=>options.landLayer.value!=='biome'},BIOME_IDS.map(id=>swatch(options.biome,id,biomeRule(id).name,BIOME_PAINT[id]))),
      h('div',{class:'q-city-editor__swatches',hidden:()=>options.landLayer.value!=='terrain'},[['usual','Biome’s usual',null],...TERRAIN_IDS.map(id=>[id,terrainRule(id).name,TERRAIN_PAINT[id]])].map(([id,name,color])=>swatch(options.terrain,id,name,color))),
      select('Brush',options.biomeBrush,[['1','1 cell (8 × 8)'],['3','3 × 3 cells'],['5','5 × 5 cells']]),
      toggleSwitch({label:'Generated fishing',description:'Fishing spots the water gets on its own',on:()=>{revision.value;return data?.land?.fishing!==false;},onChange:v=>setLand(()=>{data.land.fishing=v;status.value=v?'Generated fishing spots on.':'Generated fishing spots off: only placed ones.';})}),
      toggleSwitch({label:'Generated enemies',description:'Goblins and others the biomes spawn',on:()=>{revision.value;return data?.land?.enemies!==false;},onChange:v=>setLand(()=>{data.land.enemies=v;status.value=v?'Generated enemies on.':'Generated enemies off.';})}),
      toggleSwitch({label:'Generated nature',description:'Trees, resources and ground cover the biomes grow',on:()=>{revision.value;return data?.land?.nature!==false;},onChange:v=>setLand(()=>{data.land.nature=v;status.value=v?'Generated nature on.':'Generated nature off: only what you place.';})}),
      h('label',{class:'q-city-editor__field'},'Unpainted land',h('select',{class:'q-select',on:{change:e=>landDefault(e.target.value)}},BIOME_IDS.map(id=>h('option',{value:id,selected:()=>{revision.value;return data?.land?.default===id;}},biomeRule(id).name)))),
      h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>reseedLand()}},'New seed'),h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>removeLand()}},'Remove land')))),
    h('div',{hidden:shown('footprint')},select('Paint',options.draftMode,[['add','Add tiles'],['remove','Remove tiles']]),select('Storeys',options.storeys,[['1','1'],['2','2'],['3','3']]),select('Roof',options.roof,ROOF_TYPES.filter(r=>r!=='cone').map(r=>[r,r])),select('Walls',options.style,STYLE_NAMES.map(n=>[n,n])),select('Use',options.use,[...USE_NAMES,'none'].map(u=>[u,u])),
     h('p',{class:'q-page__help'},()=>{draft.value;revision.value;return `${draft.value.size} tiles${draftFor!==null?` · reshaping ${nameOf('building',data.buildings[draftFor])}`:''}`;}),
     h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>buildDraft().catch(error=>{status.value=error.message;})}},'Build it'),h('button',{type:'button',class:'q-button q-button--small',on:{click:clearDraft}},'Clear'))),
    h('div',{hidden:shown('nature')},select('Nature',options.nature,NATURE_CHOICES)),
    h('div',{hidden:shown('enemy')},select('Enemy',options.enemyKind,Object.entries(ENEMIES).map(([id,e])=>[id,e.name])),select('Behaviour',options.enemyMood,[['passive','Passive (fights back)'],['aggressive','Aggressive']]),select('Respawns after',options.enemyRespawn,RESPAWNS)),
    h('div',{hidden:shown('raise','lower','flatten','nature','surface','footprint')},select('Brush',brush,[['1','1 tile'],['3','3 × 3']]),h('p',{class:'q-page__help'},'Drag to paint.')),
    h('div',{class:'q-city-editor__selection',hidden:()=>tool.value!=='select'},
     h('p',{class:'q-page__help'},()=>{revision.value;const sel=selection.value,entry=entryOf(sel);return entry?`${nameOf(sel.kind,entry)} · ${KIND_LABELS[sel.kind]} at ${anchorOf(sel.kind,entry)?.join(',')}${moving.value?' · click where it goes':''}`:'Click something to select it.';}),
     floorsPanel(),lookPanel(),spawnPanel(),personPanel(),
     h('div',{class:'q-city-editor__row',hidden:()=>!selection.value},
      ...[['Move','M',startMove],['Rotate','R',rotateSelection],['Reshape',null,reshapeSelection],['Duplicate',`${MOD}+D`,duplicateSelection],['Delete','Del',deleteSelection],['Deselect','Esc',cancel],
       ['← Nudge',null,()=>nudge(-1,0)],['Nudge →',null,()=>nudge(1,0)],['↑ Nudge',null,()=>nudge(0,-1)],['Nudge ↓',null,()=>nudge(0,1)]]
       .map(([name,keyName,act])=>h('button',{type:'button',class:'q-button q-button--small','aria-keyshortcuts':keyName?.replace('⌘','Meta').replace('Del','Delete')||undefined,on:{click:()=>Promise.resolve().then(act).catch(error=>{status.value=error.message;})}},keyName?`${name} (${keyName})`:name)))),
    h('div',{hidden:shown('surface')},select('Surface',options.surface,[['land',"Land's own"],...SURFACE_NAMES.map(s=>[s,s])])),
    h('div',{hidden:shown('use')},select('Use',options.use,[...USE_NAMES,'none'].map(u=>[u,u]))),
    h('div',{hidden:shown('building')},select('Building',options.preset,Object.entries(BUILDING_PRESETS).map(([id,p])=>[id,p.name]))),
    h('div',{hidden:shown('prop')},propPalette()),
    h('div',{hidden:shown('building','prop')},select('Rotation',options.rotation,[['0','0°'],['90','90°'],['180','180°'],['270','270°']])),
    h('div',{hidden:shown('stairs')},select('Up towards',options.dir,Object.entries(SIDE_LABELS)),select('Length',options.length,[1,2,3,4].map(n=>[String(n),`${n} (${n/2} block${n>2?'s':''})`])),select('Width',options.width,[1,2,3,4,5].map(n=>[String(n),String(n)]))),
    h('div',{hidden:shown('edge')},select('Edge',options.edge,[['wall','Wall'],['window','Window'],['fence','Fence'],['railing','Railing'],['low','Counter'],['door','Door'],['none','Remove']]),select('Side',options.side,Object.entries(SIDE_LABELS)))),
   h('p',{class:'q-page__help',role:'status'},status),
   h('p',{class:'q-page__help q-city-editor__refused',hidden:()=>!previewNote.value},previewNote),
   h('div',{class:'q-city-editor__row'},select('Grow',options.growSide,[['all','All sides'],['north','North'],['east','East'],['south','South'],['west','West']]),select('By',options.growBy,[['1',`1 chunk (${CHUNK})`],['2','2 chunks'],['3','3 chunks']]),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>growBy()}},'Grow map')),
   h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:save}},'Save to repo'),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:async()=>{try{await navigator.clipboard.writeText(json());status.value='Copied the city JSON.';}catch{status.value='Copy failed: use Download.';}}}},'Copy JSON'),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:download}},'Download')),
   host.freeCameraOn?toggleSwitch({label:'Free camera',description:'WASD or middle-drag to pan',on:()=>host.freeCameraOn.value,onChange:v=>host.freeCamera(v)}):null,
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
    stopDrag=effect(()=>{const editing=mode.value==='edit';host.setTileClick(editing?(tile,point,actor)=>click(tile,point,actor):null);host.setTileHover?.(editing?hover:null);if(!editing)clearPreview();host.setTileDrag?.(editing&&PAINT_TOOLS.includes(tool.value)?paint:null);});
    // The biome overlay shows while the Biome tool is chosen.
    stopBiomes=effect(()=>{tool.value;showBiomes();});
    // Previews follow the tool and its options, the selection and moving.
    // Stepping out of a floor: the map's chunks for buildings whose floors changed rebuild (their stairwells).
    stopFloors=effect(()=>{if(floorHere.value||!staleBuildings.size)return;const cells=[...staleBuildings].flatMap(i=>data.buildings[i]?cellsOf('building',data.buildings[i]):[]);staleBuildings.clear();untracked(()=>rebuild({dirty:chunksAround(cells)}));});
    stopPreview=effect(()=>{tool.value;brush.value;selection.value;moving.value;for(const s of Object.values(options))s.value;untracked(refreshPreview);});}
   if(next){await load(next);return editor;}
   const here=host.currentCity?.();
   if(data&&here?.areaId==='city-editor'){showGrid();showSelection();showDraft();showBiomes();scheduleChecks(0);status.value=`Editing ${data.name} (${data.size.join(' × ')}).`;return editor;}
   if(here?.data){await load(structuredClone(here.data),{at:here.at});return editor;}
   await load(catalogue[0].make());return editor;},
  close(){stopFloors?.();stopFloors=null;host.setTileClick(null);host.setTileHover?.(null);spotsFill?.dispose();spotsFill=null;patrolling=false;patrolOn.value=false;stopPreview?.();stopPreview=null;clearPreview();hoverAt=null;stopDrag?.();stopDrag=null;stopBiomes?.();stopBiomes=null;biomeOverlay?.dispose();biomeOverlay=null;host.setTileDrag?.(null);window.removeEventListener('keydown',onKey,{capture:true});clearTimeout(checkTimer);overlay?.dispose();overlay=null;outline?.dispose();outline=null;draftOutline?.dispose();draftOutline=null;view?.dispose();view=null;},
  get grid(){return grid.peek();},set grid(v){grid.value=!!v;showGrid();},
  click,undo:()=>step(undo,redo),redo:()=>step(redo,undo),
  // Fast editing, for scripted checks: the same actions as the panel and keys.
  selection,moving,select(kind,index){selection.value={kind,index};showSelection();},moveSelection,nudge,rotateSelection,duplicateSelection,placeCopy,deleteSelection,paint,
  growMap:growBy,draft,reshapeSelection,buildDraft,clearDraft,setWall,wallAt,setLook,addLand,removeLand,landDefault,reseedLand,
  get checksPending(){return !!checkTimer;},runChecks(){clearTimeout(checkTimer);if(built)problems.value=cityProblems(data,built);return problems.peek();},
 };
 return editor;
}
