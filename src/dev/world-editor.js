import * as THREE from 'three';
import {h,mount} from '../ui/dom.js';
import {keyedList} from '../ui/list.js';
import {segmented,toggleSwitch,section,slider} from '../ui/controls.js';
import {signal,computed,effect,untracked} from '../reactive.js';
import {createMapData,growMap,mapHeight,mapSurface,setMapHeight,setMapSurface,clearMapSurface,mapOffset,setMapOffset,putOnLand,takeOffLand,SURFACE_NAMES,propCells,stairCells,packMap,unpackMap,mapRamp,setMapRamp,RAMP_DIRS} from '../world-map.js';
import {mapCrystals,crystalCells} from '../map-file.js';
import {mapProblems} from '../map-checks.js';
import {createBuilding,planBuilding,BUILDING_PRESETS,ROOF_TYPES,ROOF_COLORS,AWNINGS,toShaped,shiftShaped,shapeRuns,connectedCells} from '../building-kit.js';
import {STYLE_NAMES,stylePalette,STOREY,edgePlacement} from '../edge-models.js';
import {setHiddenBox,CUT_HEIGHT} from '../cutaway.js';
import {PROPS,PROP_KINDS,propFootprint,propModel,placePropModel,propScale,rotateSide,propPieces,cleanColors,colorKey} from '../props.js';
import {COL} from '../prop-parts.js';
import {DRAW_DISTANCES} from '../render-quality.js';
import {BY_ROOM,BY_FUNCTION,DESCRIPTIONS} from './prop-catalogue.js';
import {propThumbnail} from './prop-thumbnails.js';
import {USE_NAMES,USE_ICONS,furnishRoom,furnishingUse,upstairsUse} from '../furnish.js';
import {flightOf,floorLevels,stairwellModel,ladderModel} from '../spaces.js';
import {DIRS} from '../map-terrain.js';
import {CHUNK,REGION,withinChunk,chunksAround} from '../world-grid.js';
import {createGridOverlay,createCellOutline,createBiomeOverlay,createCellFill,createFaceFill} from './grid-overlay.js';
import {BIOME_IDS,biomeRule} from '../biome-rules.js';
import {TERRAIN_IDS,terrainRule} from '../terrain-rules.js';
import {ENEMIES} from '../combat-rules.js';
import {GEAR} from '../equipment.js';
import {ITEMS} from '../items.js';
import {ACTIVITIES} from '../townsfolk.js';
import {enemySize} from '../enemy-entity.js';
import {townSource,resourceFits,coverId,placedId} from '../town-ground.js';
import {TREE_SPECIES,makeTreeModel} from '../tree-models.js';
import {makeCrystal,crystalCentre} from '../crystal-model.js';
import {createEdgeFeatures} from '../doors.js';
import {COVER_KINDS} from '../ground-cover.js';
import {CELL as BIOME_CELL,FORGET_MARGIN} from '../biome-land.js';
import {propGalleryData} from './prop-gallery.js';
import {setHeld} from '../held.js';
import {edgeBetween} from '../world.js';
import {sideToward,paintKey,wallPaint,floorPaint,floorTileColor,FLOOR_INTENSITY} from '../paint.js';
import './world-editor.css';

// The playground world editor (docs/CITY.md, Authoring; city Phase 6). Dev only. It edits a map's data
// and rebuilds it in place with the production builders (world-map.js), so what you edit is exactly
// what the game builds:
//  - tools: inspect, select, raise/lower/flatten height (half blocks), paint surface, place a building (kit
//    preset, rotation), place a prop, lay stairs, draw an edge by hand, erase, set the arrival tile;
//  - fast editing (docs/TOWN.md, Authoring tools): select a building, prop, stair or townsfolk and move,
//    rotate, duplicate or delete it (buttons, or keys that never take a movement key: M, R, Ctrl/⌘+D,
//    Delete, Esc; Ctrl/⌘+Z and Ctrl/⌘+Shift+Z undo and redo; nudge and reshape are buttons); raise,
//    lower and surface paint as you drag; each edit rebuilds only the chunks it touched (world-map.js
//    rebuild), and the checks run a moment after editing stops;
//  - Edit / Play: Play is a test walk in place (clicks move you as in the game); Reset rebuilds;
//  - live checks (map-checks.js), each a button that takes you to the problem; chunk and region lines
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
// host (main.js playground API): editMap(data, {keepPlayer, dirty}) → built map, setTileClick(fn|null),
// setTileDrag(fn('start'|'move'|'end', tile)|null), teleport(x, z), toast(text).
const repoCities=import.meta.glob('../maps/*.json',{eager:true,import:'default'});
// Stamps saved to the repo (src/stamps/; docs/TOWN.md, Box select, copy and stamps).
const repoStamps=import.meta.glob('../stamps/*.json',{eager:true,import:'default'});
// Colour presets saved to the repo (src/palettes/; docs/TOWN.md, Colours).
const repoPalettes=import.meta.glob('../palettes/*.json',{eager:true,import:'default'});
const SIDE_LABELS={n:'North',e:'East',s:'South',w:'West'};
// The shortcut modifier as the platform shows it.
const MOD=/Mac|iPhone|iPad/.test(globalThis.navigator?.platform||'')?'⌘':'Ctrl';
// Each biome's colour in the paint overlay (distinct from one another, unlike their ground colours).
const BIOME_PAINT={meadow:'#b8e06a',forest:'#2f8f3f',pines:'#1d5d4b',hills:'#a8875a',coast:'#f0d78c',wetland:'#5f8f7a'};
// Each terrain's colour in the terrain layer's overlay; 'usual' (unpainted: the biome's own) isn't drawn.
const TERRAIN_PAINT={plains:'#e8e39a',rolling:'#9cc46a',lakeland:'#5fc0d8',uplands:'#c49a6c',hills:'#8a6a48',highlands:'#4f4038',marsh:'#4f8a76',river:'#3fa0e8',sea:'#2f62c8'};
const PAINT_TOOLS=['raise','lower','flatten','smooth','ramps','surface','footprint','biome','nature'],
 // Tools that take a left-drag: the brushes, Select (a box), Edge (a fence line) and Ramp (a slope).
 DRAG_TOOLS=[...PAINT_TOOLS,'select','deco','edge','ramp','room','resize'],CLOCKWISE={n:'e',e:'s',s:'w',w:'n'},KIND_LABELS={building:'building',prop:'prop',stairs:'stairs',townsfolk:'townsfolk',resource:'resource',cover:'ground cover',crystal:'crystal',enemy:'enemy spawn'};
// Enemy spawns (docs/TOWN.md, Enemy spawns): respawn choices in seconds.
// Townsfolk (docs/TOWN.md, Townsfolk tool): what they can wear and hold, and the routine's activities.
const HEADS=Object.keys(GEAR).filter(id=>GEAR[id].slot==='head'),HANDS=Object.keys(GEAR).filter(id=>GEAR[id].slot==='hand');
const FOLK_COLOURS=['#9ccf7a','#e0a96d','#9db8e3','#c7b46a','#a4ce77','#8fc9b8','#d9a3c4','#c88d6e'];
const RESPAWNS=[['30','30 seconds'],['45','45 seconds'],['120','2 minutes'],['300','5 minutes'],['900','15 minutes']];
// The Nature brush (docs/TOWN.md, Nature by hand): trees by species, resources, ground cover, or clear.
const NATURE_CHOICES=[['grow','Grow (biome)'],['clear','Clear nature'],['fishing','Fishing spot (on water)'],...Object.entries(TREE_SPECIES).map(([id,t])=>[`tree:${id}`,`${t.name||id} tree`]),
 ...['copper','boulder','sticks','stones','flint'].map(k=>[`resource:${k}`,k[0].toUpperCase()+k.slice(1)]),...COVER_KINDS.filter(k=>k!=='lilyPad').map(k=>[`cover:${k}`,`Cover: ${k}`])];
// Tools in four groups, as in a Sims build/buy mode (docs/TOWN.md, Sims-style editor). Decorate opens the
// catalogue (Deco: pick something new and put it down); the Hand ('select') lifts what you click and has the
// whole panel for what's selected. Both hold, turn and put down the same way (HAND_TOOLS).
const TOOL_GROUPS=[
 ['decorate','Decorate',[['deco','Deco'],['design','Colours'],['eyedropper','Eyedropper'],['erase','Sledgehammer'],['floorpaint','Floor paint'],['wallpaint','Wall paint'],['stamp','Stamp']]],
 ['build','Build',[['room','Room'],['resize','Push/pull walls'],['building','Building'],['footprint','Footprint'],['walls','Walls'],['edge','Edge'],['stairs','Stairs'],['use','Use'],['reroll','Reroll furniture'],['underground','Underground']]],
 ['terrain','Terrain',[['raise','Raise'],['lower','Lower'],['flatten','Flatten'],['smooth','Smooth'],['ramp','Slope'],['ramps','Ramp ledges'],['surface','Surface'],['biome','Biome']]],
 ['world','World',[['nature','Nature'],['enemy','Enemy'],['townsfolk','Townsfolk'],['crystal','Crystal'],['spawn','Arrival']]],
 // Map: open, save and grow the map, its lines, and its checks (with Inspect).
 ['map','Map',[['inspect','Inspect']]]];
const TOOLS=TOOL_GROUPS.flatMap(([,,tools])=>tools),groupOf=id=>TOOL_GROUPS.find(([,,tools])=>tools.some(([t])=>t===id))?.[0]||'decorate';
const SIDES=['n','e','s','w'],COUNTER={n:'w',w:'s',s:'e',e:'n'};
// The colour picker's quick swatches: the game's own palette (any colour is allowed; these are only quick picks).
const GAME_SWATCHES=[...new Set(Object.values(COL).map(colorKey))];
export function mapCatalogue(){
 // The repo's maps first (the overworld), then the playground's.
 const list=Object.entries(repoCities).map(([path,data])=>({id:'repo:'+path,mapId:data.id,name:`${data.name} (src/maps/${path.split('/').pop()})`,make:()=>unpackMap(structuredClone(repoCities[path]))}));
 list.sort((a,b)=>(b.mapId==='overworld')-(a.mapId==='overworld'));
 // The game's own start (not a map file): choosing it leaves the editor for the clearing, a fresh start.
 list.push({id:'area:clearing',mapId:null,name:'The clearing (where the game starts)',area:'clearing'});
 list.push({id:'prop-gallery',mapId:'prop-gallery',name:'Prop gallery (playground)',make:()=>propGalleryData()},{id:'blank',mapId:'new-map',name:'Blank 128 × 128 (one region)',make:()=>createMapData({id:'new-map',name:'New map',size:[128,128]})});
 return list;
}

export function createWorldEditor(host){
 const catalogue=mapCatalogue(),choice=signal(catalogue[0].id);
 let view=null,data=null,built=null,stopDrag=null,stopBiomes=null,stopPreview=null,stopFloors=null,stopScreen=null;
 const tool=signal('select'),toolGroup=signal('decorate'),mode=signal('edit'),brush=signal('1'),status=signal(''),problems=signal([]),revision=signal(0);
 const options={rampMode:signal('add'),rampPaths:signal(true),paintColour:signal('#e8c8a0'),floorPattern:signal('checker'),floorIntensity:signal(String(FLOOR_INTENSITY)),paintScope:signal('room'),paintErase:signal(false),wallsMode:signal('cut'),brushShape:signal('brush'),enemyKind:signal('scrapper'),enemyMood:signal('passive'),enemyRespawn:signal('45'),growSide:signal('all'),growBy:signal('1'),nature:signal('tree:oak'),wallKind:signal('window'),biome:signal('meadow'),terrain:signal('plains'),landLayer:signal('biome'),biomeBrush:signal('1'),landDefault:signal('meadow'),draftMode:signal('add'),storeys:signal('1'),roof:signal('gable'),style:signal('timber'),use:signal('home'),surface:signal('cobble'),preset:signal('cottage'),rotation:signal('0'),prop:signal('bench'),dir:signal('n'),flight:signal('up'),flightKind:signal('stairs'),length:signal('2'),width:signal('2'),edge:signal('wall'),side:signal('s')};
 const undo=[],redo=[],history=signal({undo:0,redo:0}),grid=signal(true);
 let overlay=null,outline=null,draftOutline=null,biomeOverlay=null,checkTimer=null;
 // The footprint being painted: tiles ('x,z'), and the building it reshapes (its index) or null for a new one.
 const draft=signal(new Set());let draftFor=null;
 // What is selected ({kind, index} into data.buildings/props/stairs/townsfolk) and whether the next
 // click moves it; a duplicate waits for its click as `placing`.
 const selection=signal(null),moving=signal(false);let placing=null;
 // Overlays draw where you are: a floor's space, or the map.
 const overlayParent=()=>floorHere.peek()&&host.floorGroup||built?.group;
 const showDraft=()=>{draftOutline?.dispose();draftOutline=null;const cells=[...draft.peek()].map(id=>id.split(',').map(Number));if(built&&cells.length)draftOutline=createCellOutline({cells,tiles:built.tiles,parent:built.group,color:'#5fe0ff'});};
 const showBiomes=()=>{biomeOverlay?.dispose();biomeOverlay=null;if(!built||!data?.land||tool.peek()!=='biome')return;
  const terrain=options.landLayer.peek()==='terrain';
  biomeOverlay=createBiomeOverlay({cells:(terrain?data.land.terrain:data.land.cells)||{},cell:BIOME_CELL,colors:terrain?TERRAIN_PAINT:BIOME_PAINT,heightAt:(x,z)=>at(x,z)?.h,parent:built.group,origin:data.land.origin||[0,0],bounds:[0,0,data.size[0]-1,data.size[1]-1]});};
 // Chunk and region lines: while editing only (Play looks like the game).
 const showGrid=()=>{overlay?.dispose();overlay=grid.peek()&&built&&mode.peek()==='edit'?createGridOverlay({tiles:built.tiles,parent:built.group}):null;};
 const showSelection=()=>{outline?.dispose();outline=null;showPersonSpots();const sel=selection.peek(),entry=entryOf(sel);if(!built||!entry)return;outline=createCellOutline({cells:cellsOf(sel.kind,entry),tiles:{get:k=>at(...k.split(',').map(Number))},parent:overlayParent(),color:moving.peek()?'#5fe0ff':'#ffe14d'});};
 // Checks run a moment after editing stops (they take seconds on the capital).
 const scheduleChecks=(delay=250)=>{clearTimeout(checkTimer);checkTimer=setTimeout(()=>{if(heldEntries.length){scheduleChecks(500);return;}if(built&&data)problems.value=mapProblems(data,built);},delay);};
 // Rebuilds run one at a time; edits that arrive meanwhile merge into the next one.
 let rebuilding=null,queued=null;
 async function rebuild({keepPlayer=true,dirty=null}={}){
  if(rebuilding){queued=queued?{keepPlayer,dirty:queued.dirty&&dirty?[...new Set([...queued.dirty,...dirty])]:null}:{keepPlayer,dirty};return rebuilding;}
  rebuilding=(async()=>{built=await host.editMap(data,{keepPlayer,dirty});scheduleChecks(dirty?250:0);showGrid();showSelection();showDraft();showBiomes();refreshPreview();revision.value++;})();
  try{await rebuilding;}finally{rebuilding=null;}
  if(queued){const next=queued;queued=null;await rebuild(next);}
 }
 // Unsaved changes since the map was opened or last saved (the bar's Save shows a dot).
 const unsaved=signal(false);
 // Live edits (colour pickers): the first change of a drag takes the undo snapshot, each one shows at once (the
 // world catches up every 80 ms), and the whole drag is one undo step. Any other edit ends it.
 let liveKey=null,liveTimer=null;
 function liveEdit(key,apply,cells){if(liveKey!==key){snapshot();liveKey=key;}apply();clearTimeout(liveTimer);liveTimer=setTimeout(()=>showChange(cells),80);}
 function showChange(cells){const owner=hereOwner();if(owner!==null){if(!isDungeon(owner))staleBuildings.add(owner);host.rebuildFloors(owner);revision.value++;showSelection();refreshPreview();return Promise.resolve();}return rebuild({dirty:chunksAround(cells)});}
 const snapshot=()=>{endWallTrial();liveKey=null;unsaved.value=true;undo.push(JSON.stringify(packMap(data)));if(undo.length>60)undo.shift();redo.length=0;history.value={undo:undo.length,redo:0};};
 // An edit: apply() changes the data and returns the tiles it touched afterwards; `before` are the tiles
 // it touched before. Only their chunks are rebuilt. A refused edit (apply throws) leaves the data as it
 // was, in place, so the map being edited stays the same object.
 async function change(apply,before=[]){
  paintedFloor.value=null;snapshot();const saved=undo.at(-1);let after;
  try{after=apply()||[];}catch(error){const restored=unpackMap(JSON.parse(saved));for(const k of Object.keys(data))delete data[k];Object.assign(data,restored);undo.pop();history.value={undo:undo.length,redo:redo.length};status.value=error.message;return false;}
  // Inside a floor every edit rebuilds that floor's building (or dungeon), and you stay where you are.
  const owner=hereOwner();if(owner!==null){if(!isDungeon(owner))staleBuildings.add(owner);host.rebuildFloors(owner);revision.value++;showSelection();refreshPreview();return true;}
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
 const lists=()=>({building:data.buildings,prop:data.props,stairs:data.stairs,townsfolk:data.townsfolk||(data.townsfolk=[]),resource:data.resources||(data.resources=[]),cover:data.cover||(data.cover=[]),fishing:data.fishing||(data.fishing=[]),enemy:data.enemies||(data.enemies=[]),crystal:mapCrystals(data),
  // Inside a floor: its furniture.
  furniture:floorHere.peek()?floorAt(hereOwner(),floorHere.peek().level).furniture??=[]:[],edge:data.edges});
 // Furniture (docs/TOWN.md, Decorating indoors) lives on a floor: the one you're on, or, on the map, an in-place
 // building's ground floor. A selection of it carries its home ({owner, level}); a piece's home is found from
 // its floor, and a held new piece keeps the home it was given.
 const homes=new WeakMap();
 function homeOf(e){if(homes.has(e))return homes.get(e);const here=floorHere.peek();if(here)return {owner:hereOwner(),level:here.level};
  for(const [i,b] of (data?.buildings||[]).entries())if((b.floors||[]).some(f=>f.level===0&&f.furniture?.includes(e)))return {owner:i,level:0};return null;}
 const furnitureList=(owner,level)=>floorAt(owner,level).furniture??=[];
 // The list a selection's entry is in.
 const listFor=sel=>sel.kind==='furniture'&&sel.owner!==undefined?furnitureList(sel.owner,sel.level):lists()[sel.kind];
 // Selections that aren't entries in a list (Select, user 2026-10-16): a floor's stairs or ladder ({kind: 'flight',
 // owner, level (the floor it rises from), view: 'up' | 'down'}), a building's door ({kind: 'door', actor}), and what
 // grew on the land or the game furnished but isn't placed yet ({kind: 'grown', x, z}, {kind: 'furnished', owner, x,
 // z}). Selecting them writes nothing; the first edit makes the grown and furnished ones the map's own (real()).
 const SPECIAL={
  flight:{entry:sel=>{const up=floorsOf(sel.owner).find(f=>f.level===sel.level)?.up;return up?{flight:up,owner:sel.owner,level:sel.level,view:sel.view}:null;},
   cells:e=>{const plan=planOf(e.owner),fl=flightOf(e.flight),w=([a,b])=>[plan.x0+a,plan.z0+b];return fl.ladder?[w(fl.bottom)]:[w(fl.bottom),w(fl.top)];},
   name:e=>`${e.flight.kind==='ladder'?'Ladder':'Stairs'} from ${LEVEL_NAME(e.level,e.owner).toLowerCase()} to ${isDungeon(e.owner)&&e.level===-1?'outside':LEVEL_NAME(e.level+1,e.owner).toLowerCase()}`,
   anchor:e=>{const plan=planOf(e.owner);return [plan.x0+e.flight.at[0],plan.z0+e.flight.at[1]];}},
  door:{entry:sel=>sel.actor?.group?.parent?sel.actor:null,cells:e=>[[e.a.x,e.a.z],[e.b.x,e.b.z]],
   name:e=>{const i=[e.a,e.b].map(t=>at(t.x,t.z)?.building).find(v=>v!==undefined);return i!==undefined&&data.buildings[i]?`${nameOf('building',data.buildings[i])}’s door`:'a door';},anchor:e=>[e.a.x,e.a.z]},
  grown:{entry:sel=>{const n=natureAt(sel.x,sel.z),e=n.resource||n.cover;return e&&!e.placed?{...e,x:sel.x,z:sel.z}:null;},cells:e=>[[e.x,e.z]],name:e=>`${natureName(e)} (grew here)`,anchor:e=>[e.x,e.z]},
  furnished:{entry:sel=>built?.buildings[sel.owner]?.furniture?.find(p=>p.tiles.some(t=>t.x===sel.x&&t.z===sel.z))||null,cells:e=>e.tiles.map(t=>[t.x,t.z]),name:e=>PROPS[e.kind]?.name||e.kind,anchor:e=>[e.tiles[0].x,e.tiles[0].z]}};
 // Each kind's own tab: selecting brings it forward (Select stays the tool).
 const HOME_GROUP={building:'build',stairs:'build',edge:'build',door:'build',flight:'build',prop:'decorate',furniture:'decorate',furnished:'decorate',group:'decorate',townsfolk:'world',enemy:'world',crystal:'world',resource:'world',cover:'world',fishing:'world',grown:'world'};
 function entryOf(sel){if(!sel||!data)return null;if(SPECIAL[sel.kind])return SPECIAL[sel.kind].entry(sel);if(sel.kind==='group')return sel.items.length?sel:null;
  if(sel.kind==='furniture'&&sel.owner!==undefined)return floorsOf(sel.owner).find(f=>f.level===sel.level)?.furniture?.[sel.index]??null;return lists()[sel.kind]?.[sel.index]??null;}
 // An in-place building whose ground floor is the map, at a tile (its index), or null.
 const inPlaceAt=(x,z)=>{const t=at(x,z),i=t?.building;return !floorHere.peek()&&i!==undefined&&data.buildings[i]&&!['separate','none'].includes(data.buildings[i].desc.interior)?i:null;};
 // Furniture the game furnished (a building with no floors of its own yet) becomes placed, as it stands, so it
 // can be moved, recoloured and added to; one undo step.
 async function adoptFurniture(i){const b=data.buildings[i];if(Array.isArray(b.floors))return true;const plan=planOf(i);
  const pieces=(built.buildings[i]?.furniture||[]).map(p=>({kind:p.kind,at:[p.tiles[0].x-plan.x0,p.tiles[0].z-plan.z0],rotation:((Math.round(-p.group.rotation.y/(Math.PI/2))%4)+4)%4*90}));
  return change(()=>{b.floors=[{level:0,furniture:pieces}];return cellsOf('building',b);});}
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
 function cellsOf(kind,entry){if(!entry)return [];if(SPECIAL[kind])return SPECIAL[kind].cells(entry);if(kind==='crystal')return crystalCells(entry);if(kind==='group')return entry.items.flatMap(r=>cellsOf(r.kind,entryOf(r)));if(kind==='edge')return [entry.a,entry.b];if(kind==='resource'||kind==='cover')return [[entry.x,entry.z]];if(kind==='furniture'){const p=planOf(homeOf(entry)?.owner??hereOwner()),[w,d]=propFootprint(entry.kind,entry.rotation||0),out=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)out.push([p.x0+entry.at[0]+a,p.z0+entry.at[1]+b]);return out;}
  if(kind==='enemy'){const n=enemySize(entry.enemy),out=[];for(let b=0;b<n;b++)for(let a=0;a<n;a++)out.push([entry.x+a,entry.z+b]);return out;}if(kind==='building')return planBuilding(entry.desc,[entry.x,entry.z]).tiles;if(kind==='prop')return propCells(entry);if(kind==='stairs')return stairSteps(entry);return entry.home?[entry.home]:[];}
 // What's at a tile; a wall decoration on the wall face you aim at comes first (its tile is the one in front of it).
 function pickAt(x,z){const aim=hoverRay&&aimedWall(hoverRay,wallEdge);if(aim){const hit=pickTile(aim.t.x,aim.t.z),e=hit&&hit.kind!=='furnished'&&entryOf(hit);
  if(e&&(hit.kind==='prop'||hit.kind==='furniture')&&PROPS[e.kind]?.mount==='wall'&&rotateSide('n',e.rotation||0)===aim.side)return hit;}
  return pickTile(x,z);}
 // The stairs (or ladder) on a tile of floor `here`: its own flight up, or the opening down to the floor below.
 function flightAt(o,here,x,z){if(o===null||o===undefined)return null;for(const [level,view] of [[here,'up'],[here-1,'down']]){const sel={kind:'flight',owner:o,level,view},e=SPECIAL.flight.entry(sel);
  if(e&&SPECIAL.flight.cells(e).some(([a,b])=>a===x&&b===z))return sel;}return null;}
 function pickTile(x,z){const hit=(kind,list,test)=>{const index=list.findIndex(test);return index>=0?{kind,index}:null;},on=cells=>cells.some(([a,b])=>a===x&&b===z),l=lists();
  if(floorHere.peek())return hit('furniture',l.furniture,f=>on(cellsOf('furniture',f)))||flightAt(hereOwner(),floorHere.peek().level,x,z);
  const inside=inPlaceAt(x,z);if(inside!==null){const list=floorsOf(inside).find(f=>f.level===0)?.furniture||[],index=list.findIndex(f=>on(cellsOf('furniture',f)));
   if(index>=0)return {kind:'furniture',index,owner:inside,level:0};
   const flight=flightAt(inside,0,x,z);if(flight)return flight;
   if(!Array.isArray(data.buildings[inside].floors)&&built.buildings[inside]?.furniture?.some(p=>p.tiles.some(t=>t.x===x&&t.z===z)))return {kind:'furnished',owner:inside,x,z};}
  return hit('townsfolk',l.townsfolk,f=>f.home&&f.home[0]===x&&f.home[1]===z)||hit('crystal',l.crystal,c=>on(crystalCells(c)))||hit('building',l.building,b=>on(cellsOf('building',b)))||hit('prop',l.prop,p=>on(propCells(p)))||hit('stairs',l.stairs,s=>on(stairSteps(s)))||hit('enemy',l.enemy,e=>on(cellsOf('enemy',e)))||hit('resource',l.resource,r=>r.x===x&&r.z===z)||hit('cover',l.cover,c=>c.x===x&&c.z===z);}
 const nameOf=(kind,entry)=>SPECIAL[kind]?SPECIAL[kind].name(entry):kind==='group'?`${entry.items.length} things`:kind==='edge'?`a ${entry.kind}`:kind==='furniture'?PROPS[entry.kind]?.name||entry.kind:kind==='enemy'?`${ENEMIES[entry.enemy]?.name||entry.enemy}${entry.aggressive?' (aggressive)':''}`:kind==='crystal'?`the Iter Crystal ${entry.name||entry.id||''}`.trim():kind==='resource'?natureName(entry):kind==='cover'?`${entry.kind} (cover)`:kind==='building'?entry.desc.name||'Building':kind==='prop'?PROPS[entry.kind]?.name||entry.kind:kind==='stairs'?`Stairs up ${SIDE_LABELS[entry.dir].toLowerCase()}`:entry.name||entry.id||'Townsfolk';
 const anchorOf=(kind,entry)=>SPECIAL[kind]?SPECIAL[kind].anchor(entry):kind==='group'?(c=>[Math.min(...c.map(p=>p[0])),Math.min(...c.map(p=>p[1]))])(cellsOf('group',entry)):kind==='edge'?entry.a:kind==='townsfolk'?entry.home:kind==='furniture'?(p=>[p.x0+entry.at[0],p.z0+entry.at[1]])(planOf(homeOf(entry)?.owner??hereOwner())):[entry.x,entry.z];
 const setAnchor=(kind,entry,[x,z])=>{if(kind==='edge'){const [ax,az]=entry.a;entry.b=[entry.b[0]+x-ax,entry.b[1]+z-az];entry.a=[x,z];return;}if(kind==='furniture'){const p=planOf(homeOf(entry)?.owner??hereOwner());entry.at=[x-p.x0,z-p.z0];return;}if(kind==='townsfolk')entry.home=[x,z];else{entry.x=x;entry.z=z;}};
 // Checks an entry where it now stands (own: the tiles it covered before, which it may reuse).
 // dry: only check (previews); otherwise placing nature also takes away what grew on its tile.
 function validate(kind,entry,own,{dry=false}={}){const cells=cellsOf(kind,entry);
  if(kind==='building'){oneChunk(cells);taken(cells,own);}else if(kind==='prop')taken(cells,own,entry.kind);
  // Furniture on a floor: on open floor tiles (its own old ones may be reused).
  else if(kind==='furniture'){const mine=new Set(own.map(c=>c.join(','))),home=homeOf(entry),onMap=!floorHere.peek();
   for(const [a,b] of cells){const t=at(a,b);if(!t||!t.indoor&&!(onMap&&t.building!==undefined)||onMap&&t.building!==home?.owner)throw Error(onMap?`${a},${b} isn’t inside this building.`:`${a},${b} isn’t on this floor.`);
    if((t.blocked||onMap&&t.prop)&&!mine.has(`${a},${b}`))throw Error(`${a},${b} is taken.`);}}
  // An Iter Crystal: 2 × 2 dry, level tiles, and an id of its own.
  else if(kind==='crystal'){const ts=cells.map(c=>at(...c));if(ts.some(t=>!t))throw Error('The crystal runs off the map.');if(ts.some(t=>t.water))throw Error('The crystal needs dry ground.');
   if(ts.some(t=>Math.abs(t.h-ts[0].h)>.01))throw Error('The crystal needs level ground (2 × 2).');if(lists().crystal.some(c=>c!==entry&&c.id===entry.id))throw Error(`Another crystal has the id "${entry.id}".`);taken(cells,own);}
  // An enemy spawn: dry, open ground for its whole body, not on another spawn.
  else if(kind==='enemy'){const mine=new Set(own.map(c=>c.join(',')));for(const [a,b] of cells){const t=at(a,b);if(!t)throw Error(`${a},${b} is off the map.`);if(t.water)throw Error(`${a},${b} is water.`);
    if(!mine.has(`${a},${b}`)&&(t.blocked||t.indoor||t.stair))throw Error(`${a},${b} is taken.`);
    if(!mine.has(`${a},${b}`)&&lists().enemy.some(e=>e!==entry&&cellsOf('enemy',e).some(([p,q])=>p===a&&q===b)))throw Error(`${a},${b} already has a spawn.`);}}
  else if(kind==='resource'||kind==='cover'){const [x,z]=cells[0],t=at(x,z);if(!t)throw Error(`${x},${z} is off the map.`);
   if(kind==='resource'&&(!resourceFits(t)||onCrystal(x,z)))throw Error(`${x},${z} has no room for it.`);if(kind==='cover'&&(t.water||t.building!==undefined))throw Error(`${x},${z} has no room for it.`);
   if(lists()[kind].filter(e=>e.x===x&&e.z===z).length>1)throw Error(`${x},${z} already has one.`);
   const grown=natureAt(x,z)[kind];if(grown&&!grown.placed&&!dry)removeGrown(grown.id);}
  else if(kind==='townsfolk'){for(const [a,b] of cells){const t=at(a,b);if(!t)throw Error(`${a},${b} is off the map.`);if(t.water||t.blocked)throw Error(`${a},${b} isn’t somewhere to stand.`);}}
  else for(const [a,b] of cells)if(!at(a,b))throw Error(`${a},${b} is off the map.`);
  return cells;}
 // Groups (docs/TOWN.md, Box select, copy and stamps): everything placed inside a box, moved, nudged,
 // duplicated, deleted or copied together. Stamps are groups saved with the ground painted under them.
 const GROUP_KINDS=['building','prop','stairs','edge','resource','cover','fishing','enemy','townsfolk'];
 function pickBox(x0,z0,x1,z1){const inBox=([x,z])=>x>=x0&&x<=x1&&z>=z0&&z<=z1,items=[],l=lists();
  if(floorHere.peek()){(l.furniture||[]).forEach((e,index)=>{if(cellsOf('furniture',e).every(inBox))items.push({kind:'furniture',index});});return items;}
  for(const kind of GROUP_KINDS)(l[kind]||[]).forEach((e,index)=>{const cells=cellsOf(kind,e);if(cells.length&&cells.every(inBox))items.push({kind,index});});
  return items;}
 // An entry moved by (dx, dz): every coordinate it holds.
 function shiftEntry(kind,e,dx,dz){if(kind==='townsfolk'){if(e.home)e.home=[e.home[0]+dx,e.home[1]+dz];if(e.patrol)e.patrol=e.patrol.map(([x,z])=>[x+dx,z+dz]);return e;}
  if(kind==='edge'){e.a=[e.a[0]+dx,e.a[1]+dz];e.b=[e.b[0]+dx,e.b[1]+dz];return e;}if(kind==='furniture'){e.at=[e.at[0]+dx,e.at[1]+dz];return e;}e.x+=dx;e.z+=dz;return e;}
 // A group as a stamp: its things relative to its north-west corner, and (on the map) the ground painted in
 // its box. A townsfolk's building, when it's in the stamp too, is kept as its place in the stamp.
 function makeStamp(group,{ground=true}={}){const cells=cellsOf('group',group),x0=Math.min(...cells.map(c=>c[0])),z0=Math.min(...cells.map(c=>c[1])),x1=Math.max(...cells.map(c=>c[0])),z1=Math.max(...cells.map(c=>c[1]));
  const items={},buildingAt=new Map();for(const r of group.items){const e=structuredClone(entryOf(r));if(r.kind==='building')buildingAt.set(r.index,(items.building||[]).length);(items[r.kind]??=[]).push(shiftEntry(r.kind,e,-x0,-z0));}
  for(const f of items.townsfolk||[]){if(f.house!==undefined&&buildingAt.has(f.house))f.stampHouse=buildingAt.get(f.house);delete f.house;}
  const stamp={size:[x1-x0+1,z1-z0+1],items};
  if(ground&&!floorHere.peek()){const surfaces={},heights={};for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const k=`${x-x0},${z-z0}`,sf=mapSurface(data,x,z);if(sf)surfaces[k]=sf;
    const h=data.land?mapOffset(data,x,z):mapHeight(data,x,z);if(h!==null&&h!==(data.land?0:1))heights[k]=h;}
   if(Object.keys(surfaces).length)stamp.surfaces=surfaces;if(Object.keys(heights).length)stamp.heights=heights;stamp.onLand=!!data.land;}
  return stamp;}
 // Places a stamp with its north-west corner at (x, z): its ground, then its things (each checked as if
 // placed by hand), as one undo step. Returns the new group.
 async function applyStamp(stamp,x,z){let added=null;
  const ok=await change(()=>{const baseBuildings=data.buildings.length,refs=[];
   for(const [k,v] of Object.entries(stamp.surfaces||{})){const [dx,dz]=k.split(',').map(Number);if(v==='water'&&!data.land)continue;setMapSurface(data,x+dx,z+dz,v);}
   for(const [k,v] of Object.entries(stamp.heights||{})){const [dx,dz]=k.split(',').map(Number);if(data.land&&stamp.onLand)setMapOffset(data,x+dx,z+dz,v);else if(!data.land&&!stamp.onLand)setMapHeight(data,x+dx,z+dz,v);}
   const order=floorHere.peek()?['furniture']:['building','prop','stairs','edge','resource','cover','fishing','enemy','townsfolk'];
   for(const kind of order)for(const src of stamp.items[kind]||[]){const e=shiftEntry(kind,structuredClone(src),x,z);
    if(kind==='townsfolk'){e.id=uniqueFolkId(e.id||e.name||'townsfolk');if(e.stampHouse!==undefined)e.house=baseBuildings+e.stampHouse;delete e.stampHouse;}
    validate(kind,e,[]);lists()[kind].push(e);refs.push({kind,index:lists()[kind].length-1});}
   added={kind:'group',items:refs};const [w,d]=stamp.size;const cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push([x+a,z+b]);return cells;});
  if(ok&&added?.items.length){selection.value=added.items.length===1?added.items[0]:added;showSelection();}return ok;}
 let clipboard=null;
 // A stamp's footprint where it would go, green or red by the same checks as placing.
 function stampPreview(stamp,x,z){if(!stamp)return null;const cells=[],errors=[];
  const list=[];for(const [kind,items] of Object.entries(stamp.items))for(const src of items){const e=shiftEntry(kind,structuredClone(src),x,z);let c=[];try{c=cellsOf(kind,e);validate(kind,e,[],{dry:true});}catch(error){errors.push(error.message);}cells.push(...c);list.push(ghostOf(kind,e));}
  const [w,d]=stamp.size;for(let b=0;b<d;b++)for(let a=0;a<w;a++)if(!cells.some(([p,q])=>p===x+a&&q===z+b))cells.push([x+a,z+b]);
  return {cells:tint(cells,errors.length?NO:OK),refused:errors[0]||null,ghosts:list};}
 // Stamps: the repo's (src/stamps/), and those saved this session.
 const savedStamps=signal(Object.entries(repoStamps).map(([path,stamp])=>({id:path.split('/').pop().replace(/\.json$/,''),stamp})));
 const chosenStamp=signal('');const stampName=signal('');
 const stampOf=id=>savedStamps.peek().find(s=>s.id===id)?.stamp||null;
 async function saveStamp(){const {sel,entry}=selected(),stamp={name:stampName.peek().trim()||'Stamp',...makeStamp(sel.kind==='group'?entry:{kind:'group',items:[sel]})};
  const id=stamp.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'stamp';
  savedStamps.value=[...savedStamps.peek().filter(s=>s.id!==id),{id,stamp}];chosenStamp.value=id;
  try{const response=await fetch('/__map-save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'stamp',id,json:JSON.stringify(stamp,null,1)})});const result=await response.json();
   status.value=response.ok?`Saved the stamp ${stamp.name} to ${result.path}.`:`Kept for this session (not saved: ${result.error}).`;}catch{status.value=`Kept the stamp ${stamp.name} for this session (saving needs the playground dev server).`;}}
 function stampsPanel(){
  return opts(['stamp'],
   wideGroup('Stamps',keyedList(h('div',{class:'q-world-editor__swatches'}),savedStamps,st=>st.id,st=>h('button',{type:'button',class:'q-world-editor__swatch','aria-pressed':()=>String(chosenStamp.value===st.value.id),on:{click:()=>{chosenStamp.value=st.peek().id;refreshPreview();}}},
     h('span',null,()=>`${st.value.stamp.name||st.value.id} · ${st.value.stamp.size.join(' × ')}`))),
    h('p',{class:'q-page__help',hidden:()=>savedStamps.value.length>0},'No stamps yet: select a group (drag a box with the Hand), then save it here.')),
   group('Save the selection',fields(h('label',{class:'q-world-editor__field'},'Name',h('input',{type:'text',class:'q-input',placeholder:'Stamp',value:()=>stampName.value,on:{input:e=>{stampName.value=e.target.value;}}}))),
    buttons(smallButton('Save as a stamp',saveStamp))));
 }

 // Box select (Select, drag): everything inside the box becomes the selection. A drag that starts on what's
 // selected moves it instead: it lifts once the pointer leaves the tile, and goes down where you let go.
 let boxing=null,boxFill=null,dragMove=null;
 const sameSel=(a,b)=>!!a&&!!b&&a.kind===b.kind&&a.kind!=='group'&&a.index===b.index&&JSON.stringify(a.owner)===JSON.stringify(b.owner)&&a.level===b.level&&a.x===b.x&&a.z===b.z&&a.actor===b.actor;
 function onSelection(tile){const sel=selection.peek();if(!sel||!tile)return false;if(sel.kind==='group')return cellsOf('group',sel).some(([a,b])=>a===tile.x&&b===tile.z);return sameSel(sel,pickAt(tile.x,tile.z));}
 function drawBox(){boxFill?.dispose();boxFill=null;if(!boxing)return;const [x0,x1]=[boxing.from.x,boxing.to.x].sort((a,b)=>a-b),[z0,z1]=[boxing.from.z,boxing.to.z].sort((a,b)=>a-b),cells=[];
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)cells.push({x,z,color:'#ffe14d'});boxFill=createCellFill({cells,heightAt,parent:overlayParent(),opacity:.25});}
 async function boxSelect(phase,tile,actor,point=null){
  // Holding something: press where it goes and drag the way it should face; let go to put it down.
  if(phase==='start'&&holding()){turning={at:tile};pinned=tile;refreshPreview();return;}
  if(turning){if(phase==='move'&&tile)faceTowards(turning.at,tile);if(phase==='end'){const at=turning.at;turning=null;pinned=null;await drop(at);}return;}
  if(phase==='start'&&!heldDoor&&!pendingFlight&&(onSelection(tile)||actor&&sameSel(selection.peek(),{kind:'door',actor}))){dragMove={from:tile,actor,point,lifted:false};return;}
  if(dragMove){const d=dragMove;
   if(phase==='move'&&tile&&!d.lifted&&(tile.x!==d.from.x||tile.z!==d.from.z)){d.lifted=true;try{liftSelection(await real(),d.from);}catch(error){status.value=error.message;dragMove=null;return;}refreshPreview();}
   if(phase==='end'){dragMove=null;if(!d.lifted)await click(d.from,d.point,d.actor);else if(tile)await click(tile,point);else cancel();}return;}
  if(phase==='start'){boxing={from:tile,to:tile,actor,point};clearPreview();return;}
  if(phase==='move'&&boxing){if(tile&&(tile.x!==boxing.to.x||tile.z!==boxing.to.z)){boxing.to=tile;drawBox();}return;}
  if(phase==='end'&&boxing){const b=boxing;boxing=null;drawBox();
   if(b.from.x===b.to.x&&b.from.z===b.to.z){await click(b.from,b.point,b.actor);return;}
   const [x0,x1]=[b.from.x,b.to.x].sort((p,q)=>p-q),[z0,z1]=[b.from.z,b.to.z].sort((p,q)=>p-q),items=pickBox(x0,z0,x1,z1);
   selection.value=items.length===1?items[0]:items.length?{kind:'group',items}:null;moving.value=false;showSelection();
   status.value=items.length?`Selected ${items.length===1?nameOf(items[0].kind,entryOf(items[0])):`${items.length} things`}: M or the nudge buttons move, ${MOD}+D duplicates, ${MOD}+C copies, Delete deletes.`:'Nothing placed in that box.';}}
 function copySelection(){const {sel,entry}=selected();clipboard=makeStamp(sel.kind==='group'?entry:{kind:'group',items:[sel]});status.value=`Copied ${nameOf(sel.kind,entry)}. ${MOD}+V, then click where it goes.`;}
 function pasteClipboard(){if(!clipboard)throw Error('Copy something first.');hold('stamp',clipboard);status.value='Click where it goes (its north-west corner). Esc to cancel.';refreshPreview();}
 function selected(){const sel=selection.peek(),entry=entryOf(sel);if(!entry)throw Error('Select something first.');return {sel,entry};}
 // A selected flight: moved (held, like the Hand's stairs), turned, made stairs or a ladder, removed or nudged.
 function moveFlight(sel){const up=entryOf(sel)?.flight;if(!up)throw Error('Those stairs have gone.');options.dir.value=up.dir;options.flightKind.value=up.kind==='ladder'?'ladder':'stairs';
  pendingFlight={building:sel.owner,level:sel.level,view:sel.view};status.value='Click where the bottom step goes; , and . turn them. Esc puts them back.';refreshPreview();}
 async function commitFlight(sel,up,label){if(up){const refused=flightRefused(sel.owner,sel.level,up);if(refused)throw Error(refused);}
  const apply=()=>{const f=floorAt(sel.owner,sel.level);if(up)f.up=up;else delete f.up;};
  if(floorHere.peek())return changeFloor(apply,label);if(isDungeon(sel.owner))throw Error('Go into it first.');
  const b=data.buildings[sel.owner];if(await change(()=>{apply();return cellsOf('building',b);},cellsOf('building',b))){status.value=label;return true;}return false;}
 async function editFlight(change,label){const sel=selection.peek(),e=entryOf(sel);if(!e)throw Error('Those stairs have gone.');await commitFlight(sel,change({...e.flight}),label);showSelection();}
 async function moveSelection(x,z,rotation=null){const {sel,entry}=selected(),own=cellsOf(sel.kind,entry);
  if(sel.kind==='flight'){const [lx,lz]=localOf(sel.owner,x,z);return editFlight(up=>({...up,at:[lx,lz]}),'Moved the stairs.');}
  if(sel.kind==='door')throw Error('Move the door with Move (or drag it onto another wall).');moving.value=false;
  if(sel.kind==='group'){const [ax,az]=anchorOf('group',entry),dx=x-ax,dz=z-az;
   const ok=await change(()=>{for(const r of entry.items)shiftEntry(r.kind,entryOf(r),dx,dz);for(const r of entry.items)validate(r.kind,entryOf(r),own);return cellsOf('group',entry);},own);if(ok)status.value=`Moved ${nameOf('group',entry)} by ${dx},${dz}.`;showSelection();return ok;}
  const ok=await change(()=>{setAnchor(sel.kind,entry,[x,z]);if(rotation!==null&&turnable(sel.kind))withRotation(sel.kind,entry,rotation);return validate(sel.kind,entry,own);},own);if(ok)status.value=`Moved ${nameOf(sel.kind,entry)} to ${x},${z}.`;showSelection();return ok;}
 // Holding (docs/TOWN.md, Sims-style editor): the Hand lifts what you click and it follows the pointer until
 // the next click puts it down (Esc puts it back). Something new (the catalogue, the eyedropper, a duplicate)
 // is held as `placing`; a lifted thing is the selection, `moving`. heldRotation is how it will face (, and .
 // turn it, or drag where you put it down); grab keeps the spot you took hold of under the pointer.
 // The tools that hold things: the Hand and Deco.
 const HAND_TOOLS=['select','deco'];
 const heldRotation=signal(0);let grab=[0,0],turning=null,pinned=null,shiftHeld=false;
 const holding=()=>!!placing||moving.peek()&&!!entryOf(selection.peek());
 // Stairs turn too: their rotation is the way up (north at 0, clockwise).
 const turnable=kind=>kind==='prop'||kind==='furniture'||kind==='building'||kind==='stairs';
 const rotationOf=(kind,e)=>kind==='building'?e.desc.rotation||0:kind==='stairs'?SIDES.indexOf(e.dir)*90:e.rotation||0;
 const withRotation=(kind,e,r)=>{if(kind==='building')e.desc.rotation=r;else if(kind==='stairs')e.dir=SIDES[(r/90)%4];else if(kind==='prop'||kind==='furniture')e.rotation=r;return e;};
 const heldKind=()=>placing?placing.kind:selection.peek()?.kind;
 // A lifted thing leaves the world while you hold it (held.js: the builders skip it); putting it down or back
 // brings it back. Only what's held changes, so there's no undo step for lifting.
 let heldEntries=[];
 function showWorld(sel){if(floorHere.peek()){host.rebuildFloors(hereOwner());revision.value++;refreshPreview();return Promise.resolve();}return rebuild({dirty:chunksAround(cellsOf(sel.kind,entryOf(sel)))});}
 function hideHeld(sel){const items=sel.kind==='group'?sel.items:[sel];heldEntries=items.map(entryOf).filter(Boolean);for(const e of heldEntries)setHeld(e,true);return showWorld(sel);}
 function unhide(){for(const e of heldEntries)setHeld(e,false);const had=heldEntries.length>0;heldEntries=[];return had;}
 function lift(sel,tile){const entry=entryOf(sel),[ax,az]=anchorOf(sel.kind,entry);selection.value=sel;grab=tile?[ax-tile.x,az-tile.z]:[0,0];heldRotation.value=turnable(sel.kind)?rotationOf(sel.kind,entry):0;moving.value=true;showSelection();
  hideHeld(sel);status.value=`Holding ${nameOf(sel.kind,entry)}: click to put it down${turnable(sel.kind)?'; , and . turn it':''}. Esc puts it back.`;}
 function hold(kind,entry){placing={kind,entry};grab=[0,0];if(turnable(kind)&&!entry.fresh)heldRotation.value=rotationOf(kind,entry);delete entry.fresh;moving.value=false;if(!HAND_TOOLS.includes(tool.peek()))tool.value='deco';toolGroup.value='decorate';refreshPreview();}
 // What's selected, made the map's own first if it grew or was furnished (one undo step); the selection after.
 async function real(){const sel=selection.peek();
  if(sel?.kind==='grown'){let hit=null;if(!await change(()=>{hit=adopt(sel.x,sel.z);return [[sel.x,sel.z]];}))throw Error('Couldn’t take it.');selection.value=hit;showSelection();return hit;}
  if(sel?.kind==='furnished'){if(!await adoptFurniture(sel.owner))throw Error('Couldn’t take it.');const hit=pickTile(sel.x,sel.z);selection.value=hit;showSelection();return hit;}
  return sel;}
 const withReal=fn=>(...args)=>real().then(()=>fn(...args));
 // Lifting what's selected: a door or stairs as the Hand lifts them, anything else follows the pointer.
 function liftSelection(sel,tile){if(sel.kind==='door'){liftDoor(sel.actor);return;}if(sel.kind==='flight'){moveFlight(sel);return;}lift(sel,tile);}
 const startMove=withReal(()=>{const {sel}=selected();liftSelection(sel,null);});
 function turnHeld(dir){if(!holding())return false;if(!turnable(heldKind()))throw Error('That doesn’t turn.');heldRotation.value=((heldRotation.peek()+dir*90)%360+360)%360;refreshPreview();return true;}
 // Dragging from where it goes: it turns to face the way you drag (its front is south at rotation 0).
 function faceTowards(from,to){if(!turnable(heldKind()))return;const dx=to.x-from.x,dz=to.z-from.z;if(!dx&&!dz)return;const side=Math.abs(dx)>=Math.abs(dz)?(dx>0?'e':'w'):(dz>0?'s':'n');
  const r=((SIDES.indexOf(side)-2+4)%4)*90;if(r!==heldRotation.peek()){heldRotation.value=r;refreshPreview();}}
 // Puts down what you hold at a tile: something new is placed (Shift keeps another in your hand); a lifted
 // thing moves (and turns), one undo step, or just goes back down if it stays where it was.
 async function drop(tile){const at=wallAim?wallAim.at:[tile.x+grab[0],tile.z+grab[1]];
  if(placing?.kind==='prop'&&inPlaceAt(...at)!==null)return dropIndoors(at);
  if(placing){const {kind,entry}=placing,again=shiftHeld&&kind!=='stamp'?structuredClone(entry):null;if(turnable(kind))withRotation(kind,entry,heldRotation.peek());
   // Refused (the reason is in the status line): it stays in your hand.
   const held=placing;if(!await placeCopy(...at)){placing=held;refreshPreview();return;}if(again&&!placing){if(kind==='townsfolk'&&again.id)again.id=uniqueFolkId(again.id);placing={kind,entry:again};refreshPreview();}return;}
  const {sel,entry}=selected(),[ax,az]=anchorOf(sel.kind,entry),r=heldRotation.peek();unhide();
  if(sel.kind!=='group'&&ax===at[0]&&az===at[1]&&(!turnable(sel.kind)||rotationOf(sel.kind,entry)===r)){moving.value=false;showSelection();status.value=`Put ${nameOf(sel.kind,entry)} down.`;await showWorld(sel);return;}
  // Refused: still in your hand (the reason is in the status line).
  if(!await moveSelection(at[0],at[1],turnable(sel.kind)?r:null)){const reason=status.peek(),keep=grab;lift(sel,null);grab=keep;status.value=reason;}}
 // Something new put down inside an in-place building is furniture of its ground floor (the game's own
 // furnishing becomes placed first, so it stays as it was).
 async function dropIndoors(at){const i=inPlaceAt(...at),held=placing;if(!await adoptFurniture(i))return;placing=held;const plan=planOf(i),src=placing.entry;
  const e={kind:src.kind,at:[at[0]-plan.x0,at[1]-plan.z0],rotation:heldRotation.peek(),...src.colors?{colors:{...src.colors}}:{},...src.scale?{scale:src.scale}:{}};homes.set(e,{owner:i,level:0});
  if(!await change(()=>{const cells=validate('furniture',e,[]);furnitureList(i,0).push(e);return cells;}))return;homes.delete(e);
  selection.value={kind:'furniture',owner:i,level:0,index:furnitureList(i,0).length-1};showSelection();status.value=`${PROPS[e.kind].name} in ${nameOf('building',data.buildings[i])}.`;
  if(!shiftHeld)placing=null;refreshPreview();}
 // Doors and stairs by hand (docs/TOWN.md, Doors and stairs by hand): the Hand lifts a building's door, which
 // goes down on another of that building's walls, and a floor's stairs, which go down where you click (their
 // bottom step), turned with , and . (Inspect still goes through doors and up and down stairs.)
 let heldDoor=null;const LONG={n:'north',e:'east',s:'south',w:'west'};
 function liftDoor(actor){const i=built.buildings.findIndex(b=>b?.doors?.includes(actor));
  if(i<0){const p=[actor.a.x,actor.a.z],q=[actor.b.x,actor.b.z],r=roomsAt(...p)||roomsAt(...q),own=r?roomEdge(r,p,q):-1;
   if(own>=0&&r.list[own].kind==='door'){heldDoor={room:r,index:own,actor};actor.group.visible=false;if(r.level===null){selection.value={kind:'building',index:r.owner};moving.value=false;showSelection();}
    status.value='Holding a room’s door: click one of the room’s walls to put it there. Esc puts it back.';refreshPreview();return true;}
   const k=[p,q].map(String).sort().join('|'),index=floorHere.peek()?-1:data.edges.findIndex(e=>e.kind==='door'&&[e.a,e.b].map(String).sort().join('|')===k);
   if(index<0){status.value='That door can’t be moved: change it with Edge.';return true;}lift({kind:'edge',index},actor.a);return true;}
  const b=data.buildings[i];heldDoor={building:i,from:{cell:[actor.a.x-b.x,actor.a.z-b.z],side:LONG[sideToward(actor.a,actor.b)]},actor};actor.group.visible=false;
  selection.value={kind:'building',index:i};moving.value=false;showSelection();status.value=`Holding a door of ${nameOf('building',b)}: click one of its walls to put it there. Esc puts it back.`;refreshPreview();return true;}
 // The building's description with the held door moved to a wall (throws when the door rule says no).
 function doorMoved(i,hit){const b=data.buildings[i],d=!b.desc.cells||b.desc.rotation?toShaped(b.desc):structuredClone(b.desc),{cell:fromCell,side:fromSide}=heldDoor.from,cell=[hit.e.a[0]-b.x,hit.e.a[1]-b.z],side=hit.e.side;
  const same=(o,c,sd)=>o.tile[0]===c[0]&&o.tile[1]===c[1]&&o.side===sd,old=d.doors.find(o=>same(o,fromCell,fromSide));if(!old)throw Error('That door has gone.');
  if(d.doors.some(o=>o!==old&&same(o,cell,side)))throw Error('There’s a door there already.');old.tile=cell;old.side=side;if(d.walls)delete d.walls[`${cell.join(',')},${side}`];
  try{planBuilding(d,[b.x,b.z]);}catch(error){throw Error(error.message.replace(/^[^:]*: /,''));}return d;}
 async function dropDoor(tile,point){const i=heldDoor.building,b=data.buildings[i],hit=wallAt(tile,point,i);if(!hit){status.value=`Click one of ${nameOf('building',b)}’s walls.`;return;}
  if(await change(()=>{b.desc=doorMoved(i,hit);return cellsOf('building',b);},cellsOf('building',b))){heldDoor=null;status.value=`${nameOf('building',b)}: the door is on its ${hit.e.side} wall.`;}}
 // Rooms you drew (docs/TOWN.md, Rooms and walls): their walls and doors are `edges` on an in-place building
 // (its ground floor on the map) or on the floor you're on, local to the building's north-west tile.
 // roomsAt: those of the building or floor a tile is in, or null.
 function roomsAt(x,z){const here=floorHere.peek();
  if(here){if(!at(x,z)?.indoor)return null;const owner=hereOwner();return {owner,level:here.level,plan:planOf(owner),inside:c=>!!at(...c)?.indoor,get list(){return floorsOf(owner).find(f=>f.level===here.level)?.edges||[];},edit:()=>floorAt(owner,here.level).edges??=[]};}
  const i=inPlaceAt(x,z);if(i===null)return null;const b=data.buildings[i];
  return {owner:i,level:null,plan:planOf(i),inside:c=>at(...c)?.building===i,get list(){return b.edges||[];},edit:()=>b.edges??=[]};}
 const pairKey=(p,q)=>[p,q].map(String).sort().join('|');
 // The index of the room edge between two tiles (world), or -1.
 function roomEdge(r,p,q){const loc=c=>[c[0]-r.plan.x0,c[1]-r.plan.z0],k=pairKey(loc(p),loc(q));return r.list.findIndex(e=>pairKey(e.a,e.b)===k);}
 // A held room door goes on the room wall of the tile you click that the click leans towards.
 function roomWallAt(tile,point){const r=heldDoor.room,off=point?[point.x-(tile.x-6),point.z-(tile.z-6)]:[0,0];let best=null;
  for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[tile.x+d[0],tile.z+d[1]],index=roomEdge(r,[tile.x,tile.z],q);if(index<0||index!==heldDoor.index&&r.list[index].kind!=='wall')continue;
   const score=off[0]*d[0]+off[1]*d[1];if(!best||score>best.score)best={index,cells:[[tile.x,tile.z],q],score};}
  return best;}
 async function dropRoomDoor(tile,point){const hit=roomWallAt(tile,point),{room:r,index}=heldDoor;if(!hit){status.value='Click one of the room’s walls.';return;}
  if(hit.index===index){cancel();return;}const from=r.list[index],cells=[[from.a[0]+r.plan.x0,from.a[1]+r.plan.z0],[from.b[0]+r.plan.x0,from.b[1]+r.plan.z0],...hit.cells];
  if(await change(()=>{const list=r.edit();list[index].kind='wall';list[hit.index].kind='door';return cells;})){heldDoor=null;status.value='Moved the room’s door.';refreshPreview();}}
 function liftFlight(well){const l=well.link;if(l?.kind!=='floor')return false;const owner=l.dungeon!==undefined?{dungeon:l.dungeon}:l.building,level=l.via==='up'?l.level-1:l.level,f=floorsOf(owner).find(e=>e.level===level);if(!f?.up)return false;
  pendingFlight={building:owner,level,view:well.direction==='down'?'down':'up',well};options.dir.value=f.up.dir;options.flightKind.value=f.up.kind==='ladder'?'ladder':'stairs';well.group.visible=false;status.value='Holding the stairs: click where their bottom step goes; , and . turn them. Esc puts them back.';refreshPreview();return true;}
 async function nudge(dx,dz){const {sel,entry}=selected(),[x,z]=anchorOf(sel.kind,entry);await moveSelection(x+dx,z+dz);}
 // dir: 1 clockwise, −1 the other way.
 async function rotateSelection(dir=1){await real();const {sel,entry}=selected(),own=cellsOf(sel.kind,entry);
  if(sel.kind==='flight')return editFlight(up=>({...up,dir:(dir>0?CLOCKWISE:COUNTER)[up.dir]}),'Turned.');if(sel.kind==='door')throw Error('Move the door onto another wall instead.');if(sel.kind==='group')throw Error('Rotate things one at a time.');if(sel.kind==='townsfolk')throw Error('Townsfolk face where they go.');if(['crystal','resource','cover','enemy','edge','fishing'].includes(sel.kind))throw Error('Nothing to rotate.');
  const turn=v=>(((v||0)+90*dir)%360+360)%360;
  if(await change(()=>{if(sel.kind==='building')entry.desc.rotation=turn(entry.desc.rotation);else if(sel.kind==='prop'||sel.kind==='furniture')entry.rotation=turn(entry.rotation);else entry.dir=(dir>0?CLOCKWISE:COUNTER)[entry.dir];return validate(sel.kind,entry,own);},own))status.value=`Rotated ${nameOf(sel.kind,entry)}.`;}
 // Sizing (docs/TOWN.md, Sizing props): + and − make a prop or furniture 5% bigger or smaller, held or selected,
 // within propScale's range (its tiles never change).
 const SIZE_STEP=.05;
 async function resize(dir){const next=v=>Math.round(propScale((v||1)+dir*SIZE_STEP)*100)/100,said=v=>`${Math.round(v*100)}%`;
  if(placing&&(placing.kind==='prop'||placing.kind==='furniture')){const e=placing.entry,v=next(e.scale);if(v===1)delete e.scale;else e.scale=v;status.value=`${PROPS[e.kind].name}: ${said(v)}.`;refreshPreview();return;}
  if(placing)throw Error('Only props and furniture change size.');
  const {sel,entry}=selected();if(sel.kind!=='prop'&&sel.kind!=='furniture')throw Error('Only props and furniture change size.');
  const v=next(entry.scale);if(v===(entry.scale||1))throw Error(`${nameOf(sel.kind,entry)} is as ${dir>0?'big':'small'} as it goes (${said(v)}).`);
  const own=cellsOf(sel.kind,entry);if(await change(()=>{if(v===1)delete entry.scale;else entry.scale=v;return own;},own)){status.value=`${nameOf(sel.kind,entry)}: ${said(v)}.`;refreshPreview();}}
 function duplicateSelection(){const {sel,entry}=selected();if(SPECIAL[sel.kind])throw Error(sel.kind==='grown'||sel.kind==='furnished'?'Move it first (it becomes yours), then duplicate it.':'That can’t be duplicated.');
  if(sel.kind==='group'){hold('stamp',makeStamp(entry,{ground:false}));status.value=`Click where the copy of ${nameOf('group',entry)} goes (its north-west corner). Esc to cancel.`;refreshPreview();return;}const copy=structuredClone(entry);
  if(sel.kind==='building')copy.desc.name=`${entry.desc.name||'Building'} copy`;if(sel.kind==='townsfolk'&&copy.id)copy.id=`${copy.id}-copy`;
  if(sel.kind==='townsfolk')copy.id=uniqueFolkId(copy.id||copy.name||'townsfolk');if(sel.kind==='crystal'){copy.id=uniqueCrystalId(copy.id);copy.name=`${entry.name||'Iter Crystal'} copy`;copy.known=false;}
  hold(sel.kind,copy);status.value=`Holding a copy of ${nameOf(sel.kind,entry)}: click where it goes (Esc to cancel).`;}
 async function placeCopy(x,z){const {kind,entry}=placing;placing=null;if(kind==='furniture'&&!homes.has(entry)&&floorHere.peek())homes.set(entry,{owner:hereOwner(),level:floorHere.peek().level});
  if(kind==='stamp'){const ok=await applyStamp(entry,x,z);if(ok)status.value=`Placed at ${x},${z}.`;return ok;}
  if(await change(()=>{setAnchor(kind,entry,[x,z]);const cells=validate(kind,entry,[]);const list=kind==='furniture'?furnitureList(homeOf(entry).owner,homeOf(entry).level):lists()[kind];list.push(entry);return cells;})){homes.delete(entry);const home=kind==='furniture'?homeOf(entry):null;selection.value=home?{kind,owner:home.owner,level:home.level,index:furnitureList(home.owner,home.level).length-1}:{kind,index:lists()[kind].length-1};status.value=`Placed ${nameOf(kind,entry)} at ${x},${z}.`;showSelection();return true;}
  return false;}
 async function deleteSelection(){await real();const {sel,entry}=selected(),own=cellsOf(sel.kind,entry),name=nameOf(sel.kind,entry);
  if(sel.kind==='flight'){if(await commitFlight(sel,null,`Removed the ${entry.flight.kind==='ladder'?'ladder':'stairs'}.`)){selection.value=null;showSelection();}return;}
  if(sel.kind==='door')throw Error('A building keeps its doors: move it, or change that wall with Walls.');
  // A group: each kind from the end of its list (so indices hold); townsfolk move off removed buildings first.
  if(sel.kind==='group'){if(await change(()=>{const byKind={};for(const r of entry.items)(byKind[r.kind]??=[]).push(r.index);
    const gone=new Set(byKind.building||[]);const living=(data.townsfolk||[]).find((f,i)=>gone.has(f.house)&&!(byKind.townsfolk||[]).includes(i));if(living)throw Error(`${living.name||'Someone'} lives in one of these; move them first.`);
    for(const [kind,list] of Object.entries(byKind))for(const i of list.sort((a,b)=>b-a)){lists()[kind].splice(i,1);if(kind==='building')for(const f of data.townsfolk||[])if(f.house>i)f.house--;}return [];},own)){selection.value=null;status.value=`Deleted ${name}.`;showSelection();}return;}
  if(await change(()=>{if(sel.kind==='building'){const living=(data.townsfolk||[]).find(f=>f.house===sel.index);if(living)throw Error(`${living.name||'Someone'} lives in ${name}; move them first.`);
   for(const f of data.townsfolk||[])if(f.house>sel.index)f.house--;}listFor(sel).splice(sel.index,1);return [];},own)){selection.value=null;status.value=`Deleted ${name}.`;showSelection();}}
 // Footprints: paint tiles into the draft, then build it as a new building or as the reshaped one.
 function reshapeSelection(){const {sel,entry}=selected();if(sel.kind!=='building')throw Error('Only buildings can be reshaped.');
  draft.value=new Set(cellsOf('building',entry).map(c=>c.join(',')));draftFor=sel.index;tool.value='footprint';showDraft();
  status.value=`Reshaping ${nameOf('building',entry)}.`;}
 function clearDraft(){draft.value=new Set();draftFor=null;showDraft();}
 // The first door of a new footprint: in the middle of its longest south-facing wall, or of its longest
 // wall if it has no south wall long enough (a door needs wall on both sides).
 function autoDoor(cells){const runs=shapeRuns(cells).filter(r=>r.cells.length>=3).sort((a,b)=>(b.side==='south')-(a.side==='south')||b.cells.length-a.cells.length);
  if(!runs.length)throw Error('A building needs a straight wall at least 3 tiles long for its door.');const r=runs[0];return {tile:r.cells[Math.floor(r.cells.length/2)],side:r.side};}
 // What a building holds inside, local to its north-west tile (its rooms, paint and floors), kept in place
 // when that tile moves (a reshape that grows or shrinks it north or west).
 function shiftInside(b,dx,dz){if(!dx&&!dz)return;const at2=c=>[c[0]+dx,c[1]+dz],keys=o=>o&&Object.fromEntries(Object.entries(o).map(([k,v])=>{const p=k.split(',');p[0]=+p[0]+dx;p[1]=+p[1]+dz;return [p.join(','),v];}));
  const paint=p=>p&&{...p,...p.floor?{floor:keys(p.floor)}:{},...p.walls?{walls:keys(p.walls)}:{}};
  if(b.edges)b.edges=b.edges.map(e=>({...e,a:at2(e.a),b:at2(e.b)}));if(b.paint)b.paint=paint(b.paint);
  if(b.floors)b.floors=b.floors.map(f=>({...f,...f.cells?{cells:f.cells.map(at2)}:{},...f.furniture?{furniture:f.furniture.map(p=>({...p,at:at2(p.at)}))}:{},...f.edges?{edges:f.edges.map(e=>({...e,a:at2(e.a),b:at2(e.b)}))}:{},...f.up?{up:{...f.up,at:at2(f.up.at)}}:{},...f.paint?{paint:paint(f.paint)}:{}}));}
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
   const entry=old?{...old,x:ox,z:oz,desc}:{x:ox,z:oz,desc};if(old)shiftInside(entry,old.x-ox,old.z-oz);const placed=validate('building',entry,own);
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
 function wallAt(tile,point,only=null){
  const aim=aimedWall(hoverRay,(t,n)=>!!planEdge(t,n,only));if(aim){const hit=planEdge(aim.t,aim.n,only);return {...hit,face:{t:aim.t,n:aim.n}};}
  if(!tile)return null;const off=point?[point.x-(tile.x-6),point.z-(tile.z-6)]:[0,0],options=[];
  built.buildings.forEach((b,i)=>{if(!b||only!==null&&i!==only)return;for(const e of b.plan.edges){
   if(e.a[0]===tile.x&&e.a[1]===tile.z)options.push({i,e,score:off[0]*e.out[0]+off[1]*e.out[1]});
   else if(e.b[0]===tile.x&&e.b[1]===tile.z)options.push({i,e,score:-(off[0]*e.out[0]+off[1]*e.out[1])});}});
  return options.sort((a,b)=>b.score-a.score)[0]||null;
 }
 // The building wall between two tiles: {i, e} (a plan edge), or null.
 function planEdge(t,n,only=null){let found=null;built.buildings.forEach((b,i)=>{if(found||!b||only!==null&&i!==only)return;const e=b.plan.edges.find(e=>e.a[0]===t.x&&e.a[1]===t.z&&e.b[0]===n.x&&e.b[1]===n.z||e.b[0]===t.x&&e.b[1]===t.z&&e.a[0]===n.x&&e.a[1]===n.z);if(e)found={i,e};});return found;}
 // What Walls would make of a building's wall: its new description (a copy; throws when it can't be done).
 function wallChanged(b,hit,kind){const name=nameOf('building',b),side=hit.e.side;
  // Walls are set in the building's own (unturned) frame: fold any turn in first.
  let d=structuredClone(b.desc);if(!d.cells||d.rotation)d=toShaped(d);
  const cell=[hit.e.a[0]-b.x,hit.e.a[1]-b.z],key=`${cell.join(',')},${side}`,isDoor=e=>e.tile[0]===cell[0]&&e.tile[1]===cell[1]&&e.side===side;
  if(kind==='window'||kind==='wall'){d.doors=d.doors.filter(e=>!isDoor(e));(d.walls||={})[key]=kind;}
  else if(kind==='door'){if(d.doors.some(isDoor))throw Error('That wall is already a door.');d.doors.push({tile:cell,side});if(d.walls)delete d.walls[key];}
  else if(kind==='sign'){if(d.doors.some(isDoor))throw Error('A sign hangs on a wall, not a door: choose the wall beside it.');d.sign={...d.sign,icon:d.sign?.icon||USE_ICONS[d.use]||'star',tile:cell,side};delete d.sign.edge;}
  else if(kind==='nosign'){if(!d.sign)throw Error(`${name} has no sign.`);delete d.sign;}
  else if(kind==='flowers'){if(hit.e.kind!=='window')throw Error('Flower boxes go under windows.');
   // The first hand-set box keeps the seeded ones, then toggles this window's.
   if(!Array.isArray(d.flowerBoxes))d.flowerBoxes=planBuilding(b.desc,[b.x,b.z]).flowerBoxes.map(id=>{const [x,z,s]=id.split(',');return `${x-b.x},${z-b.z},${s}`;});
   d.flowerBoxes=d.flowerBoxes.includes(key)?d.flowerBoxes.filter(k=>k!==key):[...d.flowerBoxes,key];}
  // The door rule and an outside door: planBuilding says what's wrong.
  try{planBuilding(d,[b.x,b.z]);}catch(error){throw Error(error.message.replace(/^[^:]*: /,''));}
  return d;}
 async function setWall(tile,point){
  const hit=wallAt(tile,point);if(!hit)throw Error('Click beside or inside a building wall.');
  const kind=options.wallKind.peek(),b=data.buildings[hit.i],name=nameOf('building',b),side=hit.e.side;
  const done=await change(()=>{b.desc=wallChanged(b,hit,kind);return cellsOf('building',b);});
  if(done)status.value=kind==='flowers'?`${name}: flower box toggled on the ${side} wall.`:`${name}: ${{window:'a window',wall:'a plain wall',door:'a door',sign:'the sign',nosign:'no sign'}[kind]} on the ${side} wall.`;
 }
 // Walls' preview (docs/TOWN.md, Walls and paint follow you): what Walls would make of the wall you aim at, as it
 // would really look, without touching the map. The building is planned again with the change, off to the side
 // (createBuilding with a stand-in for the map's edges, on copies of its tiles). What it would put on that edge
 // (a window, a plain wall, a door) and its decorations (sign, flower boxes) stand in for the real ones: the real
 // piece is left out of the baked walls (cutaway.js setHiddenBox), a real door there and the decorations hidden.
 let wallGhost=null;
 function endWallTrial(){if(!wallGhost)return;const g=wallGhost;wallGhost=null;g.dispose();}
 function tryWall(hit){const kind=options.wallKind.peek(),walls=options.wallsMode.peek(),id=`${hit.i}|${hit.e.a}|${hit.e.b}|${kind}|${walls}|${revision.peek()}`;if(wallGhost?.id===id)return;endWallTrial();
  const b=data.buildings[hit.i],real=built.buildings[hit.i],ra=at(...hit.e.a),rb=at(...hit.e.b);if(!b||!real||!ra||!rb)return;let desc;try{desc=wallChanged(b,hit,kind);}catch{return;}
  const copies=new Map(),tileAt=(x,z)=>{const k=`${x},${z}`;if(!copies.has(k)){const t=at(x,z);copies.set(k,t?{...t}:null);}return copies.get(k);};
  const plan=planBuilding(desc,[b.x,b.z]),on=(p,q)=>p.x===ra.x&&p.z===ra.z&&q.x===rb.x&&q.z===rb.z||p.x===rb.x&&p.z===rb.z&&q.x===ra.x&&q.z===ra.z;let piece=null;
  const stub={info:(p,q)=>built.edges?.info?.(at(p.x,p.z),at(q.x,q.z))??null,add(p,q,k,o){if(on(p,q))piece={p,q,kind:k,options:{...o,paint:wallPaint(b.paint,plan,p,q)}};return {};},addCutPart:o=>o,removeCutPart(){},remove(){}};
  let trial;try{trial=createBuilding(desc,{origin:[b.x,b.z],id:hit.i,edges:stub,tileAt,parent:new THREE.Group()});}catch{return;}
  const group=new THREE.Group();group.name='wall-ghost';overlayParent().add(group);const edges=createEdgeFeatures({parent:group,tileAt,cutaway:false}),clones=[];
  // Cut walls stop at the cut (Cutaway one storey up, Walls down just above the floor): so does the ghost.
  const place=edgePlacement(ra,rb,piece?.options.storeys||1),cut=walls==='up'?null:new THREE.Plane(new THREE.Vector3(0,-1,0),place.y+(walls==='down'?.35:CUT_HEIGHT));
  const show=object=>object.traverse(m=>{if(!m.isMesh)return;m.material=m.material.clone();if(cut)m.material.clippingPlanes=[cut];clones.push(m.material);});
  if(piece){const made=edges.add(piece.p,piece.q,piece.kind,piece.options),object=made?.model?.group||made;for(const c of edges.root.children)if(c!==object)c.visible=false;if(object)show(object);}
  group.add(trial.decor);show(trial.decor);real.decor.visible=false;
  const door=real.doors.find(d=>on(d.a,d.b));if(door)door.group.visible=false;
  const along=ra.x===rb.x;setHiddenBox({x0:place.x-(along?.39:.12),x1:place.x+(along?.39:.12),z0:place.z-(along?.12:.39),z1:place.z+(along?.12:.39),y0:place.y-.02,y1:place.y+place.height+.4});
  wallGhost={id,dispose(){setHiddenBox(null);real.decor.visible=true;if(door)door.group.visible=true;trial.dispose();edges.dispose();group.removeFromParent();for(const m of clones)m.dispose();}};}
 // A selected building's look (docs/TOWN.md, hand-shaped buildings): chosen, not seeded.
 const CHIMNEYS=[['none','No chimney'],['seed','Chimney (seeded)'],['-1,-1','Back left'],['0,-1','Back middle'],['1,-1','Back right'],['-1,1','Front left'],['0,1','Front middle'],['1,1','Front right']];
 const AWNING_NAMES=['Red','Green','Blue','Orange'];
 const lookOf=()=>{const sel=selection.peek();return sel?.kind==='building'?data.buildings[sel.index]:null;};
 async function setLook(apply,label){const b=lookOf();if(!b)throw Error('Select a building.');const own=cellsOf('building',b);
  if(await change(()=>{apply(b.desc);return validate('building',b,own);},own))status.value=`${nameOf('building',b)}: ${label}.`;}
 const colourOf=(b,role)=>b.desc.colors?.[role]||(role==='roof'?b.desc.roofColor||ROOF_COLORS[b.desc.style]||ROOF_COLORS.timber:stylePalette(b.desc.style)[role]);
 const lookControl=(label,value,choices,apply)=>h('label',{class:'q-world-editor__field'},label,h('select',{class:'q-select',on:{change:e=>apply(e.target.value).catch(error=>{status.value=error.message;})}},
  choices.map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;selection.value;const b=lookOf();return !!b&&value(b)===id;}},name))));
 const colourControl=role=>h('label',{class:'q-world-editor__field'},role[0].toUpperCase()+role.slice(1),h('input',{type:'color',class:'q-world-editor__colour',
  value:()=>{revision.value;selection.value;const b=lookOf();return b?new THREE.Color(colourOf(b,role)).getHexString().replace(/^/,'#'):'#000000';},
  on:{focus:()=>{activeRole.value=role;},input:e=>liveLook(role,e.target.value),change:e=>commitLook(role,e.target.value)}}));
 // A building's colour: live while you drag the picker; the quick colours set the active part's.
 const activeRole=signal('wall');
 function liveLook(role,value){const b=lookOf(),sel=selection.peek();if(!b)return;activeRole.value=role;liveEdit(`look:${sel.index}:${role}`,()=>{(b.desc.colors||={})[role]=value;},cellsOf('building',b));}
 function commitLook(role,value){const b=lookOf();if(!b)return;if(liveKey!==`look:${selection.peek().index}:${role}`)return setLook(d=>{(d.colors||={})[role]=value;},`${role} colour`).then(()=>remember(value)).catch(error=>{status.value=error.message;});
  liveKey=null;(b.desc.colors||={})[role]=value;clearTimeout(liveTimer);remember(value);status.value=`${nameOf('building',b)}: ${role} colour.`;return showChange(cellsOf('building',b));}
 // A selected enemy spawn's settings, changed in place (one undo step each).
 const spawnOf=()=>{const sel=selection.peek();return sel?.kind==='enemy'?data.enemies[sel.index]:null;};
 async function setSpawn(apply,label){const e=spawnOf();if(!e)throw Error('Select an enemy spawn.');const own=cellsOf('enemy',e);
  if(await change(()=>{apply(e);return [...own,...validate('enemy',e,own)];},own))status.value=`${nameOf('enemy',e)}: ${label}.`;}
 const spawnControl=(label,value,choices,apply)=>h('label',{class:'q-world-editor__field'},label,h('select',{class:'q-select',on:{change:e=>setSpawn(s=>apply(s,e.target.value),label.toLowerCase()).catch(error=>{status.value=error.message;})}},
  choices.map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;selection.value;const s=spawnOf();return !!s&&value(s)===id;}},name))));
 function spawnPanel(){
  return h('div',{class:'q-world-editor__group',hidden:()=>{revision.value;return selection.value?.kind!=='enemy';}},heading('Spawn'),
   fields(spawnControl('Enemy',s=>s.enemy,Object.entries(ENEMIES).map(([id,e])=>[id,e.name]),(s,v)=>{s.enemy=v;}),
    spawnControl('Behaviour',s=>s.aggressive?'aggressive':'passive',[['passive','Passive'],['aggressive','Aggressive']],(s,v)=>{s.aggressive=v==='aggressive';}),
    spawnControl('Respawns after',s=>String(s.respawn??45),RESPAWNS,(s,v)=>{s.respawn=+v;})));
 }

 // A selected townsfolk (docs/TOWN.md, Townsfolk tool): everything about them, changed in place (one undo
 // step each, the crowd rebuilt), and their places drawn on the map.
 let patrolling=false,spotsFill=null;const patrolOn=signal(false);
 // Iter Crystals (docs/TOWN.md, Iter Crystals): ids are unique on the map; a selected one is renamed, given a new
 // id or made known from the start in its panel (one undo step each).
 const onCrystal=(x,z)=>mapCrystals(data).some(c=>crystalCells(c).some(([a,b])=>a===x&&b===z));
 const uniqueCrystalId=base=>{const ids=new Set(mapCrystals(data).map(c=>c.id)),root=String(base||'crystal').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'crystal';let id=root,n=1;while(ids.has(id))id=`${root}-${++n}`;return id;};
 const crystalOf=()=>{const sel=selection.peek();return sel?.kind==='crystal'?mapCrystals(data)[sel.index]:null;};
 async function setCrystal(apply,label){const c=crystalOf();if(!c)throw Error('Select an Iter Crystal.');const own=crystalCells(c);
  if(await change(()=>{apply(c);return [...own,...validate('crystal',c,own)];},own)){status.value=`${c.name||c.id}: ${label}.`;showSelection();}}
 function crystalPanel(){const value=get=>()=>{revision.value;selection.value;const c=crystalOf();return c?get(c)??'':'';};
  return h('div',{class:'q-world-editor__opts q-world-editor__opts--inline',hidden:()=>{revision.value;return selection.value?.kind!=='crystal';}},
   group('Iter Crystal',fields(
    field('Name',h('input',{type:'text',class:'q-input',value:value(c=>c.name),on:{change:e=>setCrystal(c=>{c.name=e.target.value.trim();},'renamed').catch(error=>{status.value=error.message;})}})),
    field('Id',h('input',{type:'text',class:'q-input',value:value(c=>c.id),on:{change:e=>setCrystal(c=>{const id=e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-');if(!id)throw Error('A crystal needs an id.');c.id=id;},'new id').catch(error=>{status.value=error.message;})}}))),
    h('div',{class:'q-world-editor__toggles'},toggleSwitch({label:'Known from the start',description:'Listed before it’s discovered',on:()=>{revision.value;selection.value;return !!crystalOf()?.known;},onChange:v=>setCrystal(c=>{if(v)c.known=true;else delete c.known;},v?'known from the start':'found by discovery').catch(error=>{status.value=error.message;})}))));}
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
  spotsFill=createCellFill({cells,heightAt,parent:overlayParent(),opacity:.55});}
 const field=(label,input)=>h('label',{class:'q-world-editor__field'},label,input);
 const personSelect=(label,value,choices,apply)=>field(label,h('select',{class:'q-select',on:{change:e=>setPerson(p=>apply(p,e.target.value),label.toLowerCase()).catch(error=>{status.value=error.message;})}},
  choices.map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;selection.value;const p=personOf();return !!p&&value(p)===id;}},name))));
 const personText=(label,value,apply)=>field(label,h('input',{type:'text',class:'q-input',value:()=>{revision.value;selection.value;const p=personOf();return p?value(p)??'':'';},
  on:{change:e=>setPerson(p=>apply(p,e.target.value.trim()),label.toLowerCase()).catch(error=>{status.value=error.message;})}}));
 const loadoutSlot=(slot,ids)=>personSelect({head:'Hat',rightHand:'Right hand',leftHand:'Left hand'}[slot],p=>p.look?.loadout?.[slot]||'',[['','None'],...ids.map(id=>[id,ITEMS[id]?.name||GEAR[id]?.name||id])],
  (p,v)=>{p.look??={};p.look.loadout??={};if(v)p.look.loadout[slot]=v;else delete p.look.loadout[slot];if(!Object.keys(p.look.loadout).length)delete p.look.loadout;});
 const houseChoices=computed(()=>{revision.value;return [{id:'',name:'No building'},...(data?.buildings||[]).map((b,i)=>({id:String(i),name:b.desc.name||`Building ${i+1}`}))];});
 // A townsfolk's panel (the Hand or the Townsfolk tool): four cards side by side. Who they are (name, the line they
 // say, colour, pace), their look (hat and what they carry), home and work (their building, the jobs they give,
 // the way they face at their post, a patrol route), and their routine: how often they do each thing.
 const stack=(...children)=>h('div',{class:'q-world-editor__fields q-world-editor__fields--stack'},...children);
 const title=a=>a[0].toUpperCase()+a.slice(1);
 function personPanel(){
  const colour=field('Colour',h('input',{type:'color',class:'q-world-editor__colour',value:()=>{revision.value;selection.value;return personOf()?.look?.color||'#9ccf7a';},on:{input:e=>{const p=personOf();if(p)liveEdit(`folk:${selection.peek().index}`,()=>{(p.look??={}).color=e.target.value;},cellsOf('townsfolk',p));},
   change:e=>{const p=personOf();if(!p)return;if(liveKey===`folk:${selection.peek().index}`){liveKey=null;clearTimeout(liveTimer);(p.look??={}).color=e.target.value;status.value=`${p.name}: colour.`;showChange(cellsOf('townsfolk',p));return;}
    setPerson(p=>{(p.look??={}).color=e.target.value;},'colour').catch(error=>{status.value=error.message;});}}}));
  // The map's buildings change as you build: the choices follow them (a keyed list).
  const house=field('Lives or works in',keyedList(h('select',{class:'q-select',on:{change:e=>setPerson(p=>{if(e.target.value==='')delete p.house;else p.house=+e.target.value;},'home building').catch(error=>{status.value=error.message;})}}),
   houseChoices,c=>c.id,c=>h('option',{value:c.peek().id,selected:()=>{revision.value;selection.value;const p=personOf();return !!p&&(p.house===undefined?'':String(p.house))===c.value.id;}},()=>c.value.name)));
  const weight=a=>h('label',{class:'q-world-editor__weight'},h('span',null,title(a)),h('input',{type:'number',min:0,max:9,class:'q-input','aria-label':`${title(a)}: how often`,
   value:()=>{revision.value;selection.value;const p=personOf();return p?String(weightOf(p,a)):'0';},'data-on':()=>{revision.value;selection.value;const p=personOf();return String(!!p&&weightOf(p,a)>0);},
   on:{change:e=>setPerson(p=>{const w=Math.max(0,Math.min(9,Math.round(+e.target.value||0)));p.routine=(p.routine||[]).filter(r=>r.do!==a);if(w)p.routine.push({do:a,weight:w});if(!p.routine.length)p.routine=[{do:'stroll',weight:1}];},`${a} ${e.target.value}`).catch(error=>{status.value=error.message;})}}));
  return h('div',{class:'q-world-editor__opts q-world-editor__opts--inline q-world-editor__person',hidden:()=>{revision.value;return selection.value?.kind!=='townsfolk';}},
   group('Who',stack(
    personText('Name',p=>p.name,(p,v)=>{if(!v)throw Error('A townsfolk needs a name.');p.name=v;}),
    personText('Line',p=>p.line,(p,v)=>{if(v)p.line=v;else delete p.line;}),
    h('div',{class:'q-world-editor__pair'},colour,personSelect('Pace',p=>String(p.pace??1),[['0.8','Unhurried'],['1','Usual'],['1.3','Brisk']],(p,v)=>{p.pace=+v;})))),
   group('Look',stack(loadoutSlot('head',HEADS),loadoutSlot('rightHand',HANDS),loadoutSlot('leftHand',HANDS))),
   group('Home and work',stack(house,
    personSelect('Gives jobs',p=>p.giver==='post'?'post':'',[['','Only their shop’s'],['post','Post office deliveries']],(p,v)=>{if(v)p.giver=v;else delete p.giver;}),
    personSelect('Faces at their post',p=>p.facing||'',[['','Any way'],...Object.entries(SIDE_LABELS)],(p,v)=>{if(v)p.facing=v;else delete p.facing;})),
    buttons(
     h('button',{type:'button',class:'q-button q-button--small','aria-pressed':()=>String(patrolOn.value),on:{click:()=>{patrolling=!patrolling;patrolOn.value=patrolling;status.value=patrolling?'Click tiles to add patrol stops (Esc when done).':'Patrol route done.';}}},()=>patrolOn.value?'Done':'Draw patrol'),
     h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>setPerson(p=>{delete p.patrol;p.routine=(p.routine||[]).filter(r=>r.do!=='patrol');if(!p.routine.length)p.routine=[{do:'stroll',weight:1}];},'patrol cleared').catch(error=>{status.value=error.message;})}},'Clear'))),
   group('Routine',h('p',{class:'q-page__help'},'How often (0: never). Their spots are blue on the map.'),h('div',{class:'q-world-editor__routine'},ACTIVITIES.map(weight))));
 }
 // The Floors panel: a selected building's floors (or the one you're in), with Go, Add and Remove, and the
 // floor's own actions: its use, Generate and Clear furniture, and its stairs up and down.
 // A floor is reached when stairs come to it: from below for an upper floor, its own flight up below the ground.
 const reached=(o,level)=>level===0||(level>0?!!floorsOf(o).find(f=>f.level===level-1)?.up:!!floorsOf(o).find(f=>f.level===level)?.up);
 const floorRows=computed(()=>{revision.value;floorHere.value;const i=ownerHere();if(i===null||!ownerEntry(i))return [];const b=ownerEntry(i),cave=isDungeon(i);
  const levels=[...new Set([...(cave?[]:[0]),...floorsOf(i).map(f=>f.level)])].sort((a,c)=>c-a),top=levels[0],bottom=levels[levels.length-1];
  return levels.map(level=>({id:`${cave?i.dungeon:i}:${level}`,building:i,level,here:floorHere.value?.level===level||!floorHere.value&&level===0,
   label:`${LEVEL_NAME(level,i)}${!cave&&level===0&&b.desc.interior!=='separate'?' (the map)':''}`,furniture:(floorsOf(i).find(f=>f.level===level)?.furniture||[]).length,
   reached:reached(i,level),removable:level!==0&&!(cave&&level===-1)&&(level===top||level===bottom)}));});
 // This floor's stairs: up (to the floor above, or out of a dungeon) and down (the flight up from the floor below).
 const thisFloor=computed(()=>{revision.value;floorHere.value;selection.value;const i=ownerHere();if(i===null||!ownerEntry(i))return null;const level=floorHere.value?.level??0,list=floorsOf(i);
  return {level,name:LEVEL_NAME(level,i),up:hasLevel(i,level+1)||isDungeon(i)&&level===-1,down:hasLevel(i,level-1),hasUp:!!list.find(f=>f.level===level)?.up,hasDown:!!list.find(f=>f.level===level-1)?.up};});
 function startFlight(way){const i=ownerHere();if(i===null)throw Error('Select a building.');const {level,view}=flightFrom(i,currentLevel(),way),f=floorsOf(i).find(e=>e.level===level);
  if(f?.up){options.dir.value=f.up.dir;options.flightKind.value=f.up.kind==='ladder'?'ladder':'stairs';}pendingFlight={building:i,level,view};status.value=`Click where the bottom step goes; , and . turn them. Esc to stop.`;refreshPreview();}
 const floorAction=(label,act)=>h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>Promise.resolve().then(act).catch(error=>{status.value=error.message;})}},label);
 const currentLevel=()=>floorHere.peek()?.level??0;
 async function addFloor(where){const i=ownerHere();if(i===null)throw Error('Select a building.');const b=ownerEntry(i),levels=floorsOf(i).map(f=>f.level);
  const level=where==='above'?Math.max(0,...levels)+1:Math.min(0,...levels)-1;
  if(where==='above'&&!isDungeon(i)&&level>(b.desc.storeys||1)-1)throw Error(`${b.desc.name||'This building'} has ${b.desc.storeys||1} storey${(b.desc.storeys||1)>1?'s':''}: raise its storeys first.`);
  // A dungeon's new level starts as the level above it (it has no building to follow).
  const make=()=>{const f=floorAt(i,level);if(isDungeon(i)&&!f.cells)f.cells=(floorsOf(i).find(e=>e.level===level+1)?.cells||[]).map(c=>[...c]);};
  const label=`${LEVEL_NAME(level,i)} added. Place its stairs, then Go.`;
  if(floorHere.peek()||isDungeon(i))await changeFloor(make,label);else if(await change(()=>{make();return cellsOf('building',b);},cellsOf('building',b)))status.value=label;}
 async function removeFloor(level){const i=ownerHere(),b=ownerEntry(i);if(level===0||isDungeon(i)&&level===-1)throw Error(isDungeon(i)?'The top level stays.':'The ground floor stays.');const levels=floorsOf(i).map(f=>f.level);
  if(level!==Math.max(...levels)&&level!==Math.min(...levels))throw Error('Remove the top floor or the bottom cellar first.');
  if(floorHere.peek()?.level===level)throw Error('Step off this floor first (Go to another, or Back outside).');
  const apply=()=>{b.floors=floorsOf(i).filter(f=>f.level!==level);const below=b.floors.find(f=>f.level===level-1);if(below&&level>0)delete below.up;};
  if(floorHere.peek()||isDungeon(i))await changeFloor(apply,`${LEVEL_NAME(level,i)} removed.`);else if(await change(()=>{apply();return cellsOf('building',b);},cellsOf('building',b)))status.value=`${LEVEL_NAME(level)} removed.`;}
 async function generateFurniture(){const i=ownerHere();if(i===null)throw Error('Select a building.');const level=currentLevel(),f=floorAt(i,level);
  const apply=()=>{f.roll=(f.roll??0)+1;f.furniture=furnishFloor(i,level);};
  if(floorHere.peek())await changeFloor(apply,()=>`Furnished ${ON_LEVEL(level).replace(/^(on|in) /,'')} (${f.use||'its usual use'}): ${f.furniture.length} pieces. Generate again for another roll.`);
  else if(await change(()=>{apply();return cellsOf('building',data.buildings[i]);},cellsOf('building',data.buildings[i])))status.value=`Furnished the ground floor. Generate again for another roll.`;}
 async function clearFurniture(){const i=ownerHere();if(i===null)throw Error('Select a building.');const level=currentLevel(),f=floorAt(i,level);
  if(floorHere.peek())await changeFloor(()=>{f.furniture=[];},'Furniture cleared.');else if(await change(()=>{f.furniture=[];return cellsOf('building',data.buildings[i]);},cellsOf('building',data.buildings[i])))status.value='Ground floor furniture cleared.';}
 // A selected floor's stairs or ladder: move, turn, stairs or ladder, go up or down it, remove.
 function flightButtons(){const sel=()=>{revision.value;const s=selection.value;return s?.kind==='flight'?s:null;},e=()=>entryOf(sel());
  return h('div',{class:'q-world-editor__buttons',hidden:()=>!e()},
   smallButton('Move',()=>moveFlight(sel())),smallButton('Turn',()=>rotateSelection(1)),
    smallButton(()=>e()?.flight.kind==='ladder'?'Make it stairs':'Make it a ladder',()=>editFlight(up=>{if(up.kind==='ladder')delete up.kind;else up.kind='ladder';return up;},'Changed.')),
    smallButton(()=>sel()?.view==='down'?'Go down':'Go up',()=>goLevel(sel().view==='down'?-1:1)),smallButton('Remove',deleteSelection));}
 // A selected door: move it to another wall, or go through it (into a separate building).
 function doorButtons(){const door=()=>{revision.value;const s=selection.value;return s?.kind==='door'?entryOf(s):null;};
  return h('div',{class:'q-world-editor__buttons',hidden:()=>!door()},
   smallButton('Move',()=>{const d=door();if(d)liftDoor(d);}),h('span',{hidden:()=>!door()?.link},smallButton('Go through',()=>{status.value=host.enterLink?.(door().link)?'Through the door.':'Can’t go that way.';})));}
 function floorsPanel(){
  const t=()=>thisFloor.value;
  return h('div',{class:'q-world-editor__opts q-world-editor__opts--inline',hidden:()=>{revision.value;return !floorHere.value&&selection.value?.kind!=='building';}},
   h('div',{class:'q-world-editor__group q-world-editor__floors-group'},heading('Floors'),
    keyedList(h('div',{class:'q-world-editor__list'}),floorRows,r=>r.id,r=>h('div',{class:'q-world-editor__list-row q-world-editor__floor-row','aria-current':()=>String(r.value.here)},
     h('span',{class:'q-world-editor__floor-name'},h('span',null,()=>r.value.label),
      h('small',{class:'q-world-editor__floor-note','data-tone':()=>r.value.reached?'':'warning'},()=>[r.value.reached?null:'no stairs',r.value.furniture?`${r.value.furniture} pieces`:null].filter(Boolean).join(' · '))),
     h('span',{class:'q-world-editor__buttons'},
      h('span',{class:'q-world-editor__here',hidden:()=>!r.value.here},'Here'),
      h('button',{type:'button',class:'q-button q-button--small',hidden:()=>r.value.here,on:{click:()=>{status.value=host.enterFloor?.(r.peek().building,r.peek().level)?`To the ${LEVEL_NAME(r.peek().level).toLowerCase()}.`:'No way there yet: place the stairs to it.';}}},'Go'),
      h('button',{type:'button',class:'q-button q-button--small',hidden:()=>!r.value.removable||r.value.here,on:{click:()=>removeFloor(r.peek().level).catch(error=>{status.value=error.message;})}},'Remove')))),
    buttons(h('span',{hidden:()=>{floorHere.value;return isDungeon(ownerHere());}},floorAction('Add floor above',()=>addFloor('above'))),floorAction(()=>{floorHere.value;return isDungeon(ownerHere())?'Add level below':'Add cellar';},()=>addFloor('below'))),
    h('div',{class:'q-world-editor__buttons',hidden:()=>!floorHere.value},floorAction('Back outside',()=>{status.value=host.leaveFloor?.()?'Back outside.':'';}))),
   h('div',{class:'q-world-editor__group q-world-editor__floors-group'},heading(()=>t()?`This floor · ${t().name}`:'This floor'),
    buttons(h('span',{hidden:()=>!t()?.up},floorAction(()=>t()?.hasUp?'Move stairs up':'Place stairs up',()=>startFlight('up'))),
     h('span',{hidden:()=>!t()?.down},floorAction(()=>t()?.hasDown?'Move stairs down':'Place stairs down',()=>startFlight('down'))),
     floorAction('Generate furniture',generateFurniture),floorAction('Clear furniture',clearFurniture)),
    fields(h('label',{class:'q-world-editor__field'},'Used as',h('select',{class:'q-select',on:{change:e=>{const i=ownerHere(),level=currentLevel();if(i===null)return;const apply=()=>{const f=floorAt(i,level);if(e.target.value)f.use=e.target.value;else delete f.use;};
     (floorHere.peek()?changeFloor(apply,'Use set.'):change(()=>{apply();return [];})).catch(error=>{status.value=error.message;});}}},
    [['','Its usual use'],...USE_NAMES.map(u=>[u,u])].map(([id,name])=>h('option',{value:id,selected:()=>{revision.value;floorHere.value;selection.value;const i=ownerHere();return i!==null&&(floorsOf(i).find(f=>f.level===currentLevel())?.use||'')===id;}},name)))))));
 }
 // How a building is inside (docs/CITY.md, Floors): open in place (its ground floor is the map), a separate
 // space (its ground floor is a floor of its own, entered by its doors; it starts empty, like any floor), or
 // decorative (no way in).
 async function setInterior(v){const b=lookOf();if(!b)throw Error('Select a building.');const own=cellsOf('building',b);
  if(await change(()=>{b.desc.interior=v;if(v==='separate'){b.floors??=[];if(!b.floors.some(f=>f.level===0))b.floors.push({level:0});}return validate('building',b,own);},own))
   status.value=v==='separate'?`${nameOf('building',b)} is a separate space: click its door (Inspect) or Go to its ground floor.`:v==='none'?`${nameOf('building',b)} is decorative: its doors stay shut.`:`${nameOf('building',b)} opens in place.`;}
 // Dungeons and caves by hand (docs/CITY.md, Dungeons and caves): the Underground tool makes one, places its
 // entrance on the map, and Go takes you in; inside, the floor tools and the Floors panel edit it.
 const caveName=signal('Old cave'),caveSize=signal('16x12');let pendingEntrance=null;
 const caves=computed(()=>{revision.value;return Object.entries(data?.interiors||{}).filter(([,d])=>d.kind==='dungeon'&&Array.isArray(d.floors)).map(([id,d])=>({id,name:d.name||id,levels:d.floors.length,entrances:(data.props||[]).filter(p=>p.kind==='dungeonEntrance'&&p.link===id).length}));});
 async function newCave(){const [w,d]=caveSize.peek().split('x').map(Number),name=caveName.peek().trim()||'Cave',ids=new Set(Object.keys(data.interiors||{}));let id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cave',n=1;const root=id;while(ids.has(id))id=`${root}-${++n}`;
  const cells=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)cells.push([x,z]);
  if(await change(()=>{(data.interiors??={})[id]={kind:'dungeon',name,floors:[{level:-1,cells,up:{at:[1,2],dir:'n'}}]};return [];})){pendingEntrance=id;status.value=`${name} made (${w} × ${d}). Click the map where its entrance goes.`;}}
 async function placeEntrance(tile){const id=pendingEntrance;pendingEntrance=null;const cells=[];const [w,dd]=propFootprint('dungeonEntrance',0);for(let b=0;b<dd;b++)for(let a=0;a<w;a++)cells.push([tile.x+a,tile.z+b]);
  if(await change(()=>{taken(cells,[],'dungeonEntrance');data.props.push({kind:'dungeonEntrance',x:tile.x,z:tile.z,rotation:0,link:id});return cells;}))status.value=`The entrance to ${data.interiors[id].name} is at ${tile.x},${tile.z}. Inspect-click it to go in.`;}
 async function deleteCave(id){if(floorHere.peek()?.dungeon===id)throw Error('Step out of it first.');if(await change(()=>{delete data.interiors[id];data.props=data.props.filter(p=>!(p.kind==='dungeonEntrance'&&p.link===id));return [];}))status.value='Removed.';}
 function cavesPanel(){
  return opts(['underground'],
   group('New',fields(h('label',{class:'q-world-editor__field'},'Name',h('input',{type:'text',class:'q-input',value:()=>caveName.value,on:{input:e=>{caveName.value=e.target.value;}}})),
    select('Size',caveSize,[['8x8','8 × 8'],['16x12','16 × 12'],['24x16','24 × 16'],['32x24','32 × 24']])),
    buttons(smallButton('Make it',newCave))),
   wideGroup('Dungeons and caves',keyedList(h('div',{class:'q-world-editor__list'}),caves,c=>c.id,c=>h('div',{class:'q-world-editor__list-row'},
    h('span',null,()=>`${c.value.name} · ${c.value.levels} level${c.value.levels>1?'s':''}${c.value.entrances?'':' · no entrance'}`),
    buttons(smallButton('Go',()=>{status.value=host.enterFloor?.({dungeon:c.peek().id},-1)?`Into ${c.peek().name}.`:'Can’t go in yet.';}),
     smallButton('Place entrance',()=>{pendingEntrance=c.peek().id;status.value='Click the map where its entrance goes.';}),
     smallButton('Delete',()=>deleteCave(c.peek().id))))),
    h('p',{class:'q-page__help',hidden:()=>caves.value.length>0},'None yet.')));
 }


 function lookPanel(){
  const building=()=>{revision.value;return selection.value?.kind==='building';};
  return h('div',{class:'q-world-editor__opts',hidden:()=>!building()},
   h('div',{class:'q-world-editor__group',hidden:()=>tool.value!=='select'},heading('Look'),h('div',{class:'q-world-editor__fields q-world-editor__fields--grid'},
    field('Name',h('input',{type:'text',class:'q-input',value:()=>{revision.value;selection.value;return lookOf()?.desc.name||'';},on:{change:e=>{const name=e.target.value.trim();if(!name){status.value='A building needs a name.';revision.value++;return;}setLook(d=>{d.name=name;},'renamed').catch(error=>{status.value=error.message;});}}})),
    lookControl('Inside',b=>b.desc.interior||'inPlace',[['inPlace','Open in place'],['separate','A separate space'],['none','Decorative (no way in)']],v=>setInterior(v)),
    lookControl('Walls',b=>b.desc.style||'timber',STYLE_NAMES.filter(n=>n!=='dungeon').map(n=>[n,n]),v=>setLook(d=>{d.style=v;},`${v} walls`)),
    lookControl('Storeys',b=>String(b.desc.storeys||1),[['1','1'],['2','2'],['3','3']],v=>setLook(d=>{d.storeys=+v;},`${v} storeys`)),
    lookControl('Roof',b=>b.desc.roof||'gable',ROOF_TYPES.map(r=>[r,r]),v=>setLook(d=>{d.roof=v;},`${v} roof`)),
    lookControl('Chimney',b=>!b.desc.chimney?'none':typeof b.desc.chimney==='object'?`${b.desc.chimney.along},${b.desc.chimney.side}`:'seed',CHIMNEYS,v=>setLook(d=>{if(v==='none')d.chimney=false;else if(v==='seed')d.chimney=true;else{const [along,side]=v.split(',').map(Number);d.chimney={along,side};}},'chimney')),
    lookControl('Awning',b=>!b.desc.awning?'none':Array.isArray(b.desc.awningColors)?String(AWNINGS.findIndex(a=>a[0]===b.desc.awningColors[0])):'seed',[['none','No awning'],['seed','Awning (seeded)'],...AWNING_NAMES.map((n,i)=>[String(i),`${n} awning`])],
     v=>setLook(d=>{if(v==='none')d.awning=null;else{d.awning='striped';if(v==='seed')delete d.awningColors;else d.awningColors=[...AWNINGS[+v]];}},'awning')))),
   h('div',{class:'q-world-editor__group'},heading('Colours'),h('div',{class:'q-world-editor__colour-rows'},...['wall','trim','base','door','roof'].map(colourControl)),buttons(smallButton('Reset colours',()=>setLook(d=>{delete d.colors;delete d.roofColor;},'colours reset')))),
   h('div',{class:'q-world-editor__group q-world-editor__quick'},heading(()=>`Quick colours · ${activeRole.value}`),...quickColours(c=>{liveKey=null;commitLook(activeRole.peek(),c);})));
 }

 // Colours (docs/TOWN.md, Colours): a selected prop's pieces (each distinct colour in its model), any colour
 // for each; quick swatches (the game's palette, then your recent colours) for the chosen piece; presets for
 // its kind, and schemes by piece name for anything. Dragging a picker recolours live, and the whole drag is
 // one undo step.
 const colourTarget=()=>{const sel=selection.peek(),e=entryOf(sel);return e&&(sel.kind==='prop'||sel.kind==='furniture')?{sel,entry:e}:null;};
 const activePiece=signal(''),recentColours=signal([]);let colourDrag=false,colourTimer=null;
 const piecesOf=computed(()=>{revision.value;selection.value;const t=colourTarget();if(!t)return [];const colors=t.entry.colors||{};
  return propPieces(t.entry.kind).map(p=>({...p,key:`${t.entry.kind}:${p.id}`,color:colors[p.id]||p.id,changed:!!colors[p.id]}));});
 const activePieceId=()=>{const list=piecesOf.value;return list.some(p=>p.id===activePiece.value)?activePiece.value:list[0]?.id||'';};
 const pieceName=(kind,id)=>propPieces(kind).find(p=>p.id===id)?.name.toLowerCase()||id;
 const remember=c=>{c=colorKey(c);recentColours.value=[c,...recentColours.peek().filter(x=>x!==c)].slice(0,12);};
 function recolour(t,id,value){const next={...(t.entry.colors||{})};if(value===null)delete next[id];else next[id]=value;const clean=cleanColors(t.entry.kind,next);if(clean)t.entry.colors=clean;else delete t.entry.colors;}
 // Furniture on a floor rebuilds that floor; a prop on the map, its chunk.
 function showColours(t){if(t.sel.kind==='furniture'){const o=hereOwner();if(o!==null){if(!isDungeon(o))staleBuildings.add(o);host.rebuildFloors(o);}revision.value++;return Promise.resolve();}return rebuild({dirty:chunksAround(cellsOf(t.sel.kind,t.entry))});}
 function liveColour(id,value){const t=colourTarget();if(!t)return;if(!colourDrag){snapshot();colourDrag=true;}recolour(t,id,value);clearTimeout(colourTimer);colourTimer=setTimeout(()=>showColours(t),80);}
 // value null: the piece's own colour again.
 function commitColour(id,value){const t=colourTarget();if(!t||!id)return;if(!colourDrag)snapshot();colourDrag=false;clearTimeout(colourTimer);recolour(t,id,value);if(value)remember(value);showColours(t);
  status.value=`${nameOf(t.sel.kind,t.entry)}: ${pieceName(t.entry.kind,id)} ${value?colorKey(value):'back to its own colour'}.`;}
 function resetColours(){const t=colourTarget();if(!t||!t.entry.colors)return;snapshot();delete t.entry.colors;showColours(t);status.value=`${nameOf(t.sel.kind,t.entry)}: its own colours.`;}
 // Presets: the repo's (src/palettes/) and those saved this session. An item preset ({kind, colors by piece})
 // fits its kind; a scheme ({kind: null, colors by piece name}) fits any prop with pieces of those names.
 const palettes=signal(Object.entries(repoPalettes).map(([path,p])=>({id:path.split('/').pop().replace(/\.json$/,''),...p})));
 const presetName=signal(''),presetFor=signal('item');
 function presetColours(p,kind){if(p.kind)return p.kind===kind?cleanColors(kind,p.colors):null;const out={};for(const piece of propPieces(kind)){const c=p.colors?.[piece.name.toLowerCase()];if(c)out[piece.id]=c;}return cleanColors(kind,out);}
 // Onto the selection: a prop, or every prop in a box-selected group; one undo step.
 async function applyPreset(p){const sel=selection.peek(),refs=sel?.kind==='group'?sel.items.filter(r=>r.kind==='prop'||r.kind==='furniture'):sel&&(sel.kind==='prop'||sel.kind==='furniture')?[sel]:[];
  if(!refs.length)throw Error('Select a prop, or box-select a group.');let n=0;const cells=refs.flatMap(r=>cellsOf(r.kind,entryOf(r)));
  if(await change(()=>{for(const r of refs){const e=entryOf(r),c=presetColours(p,e.kind);if(!c)continue;const merged=cleanColors(e.kind,p.kind?c:{...(e.colors||{}),...c});if(merged)e.colors=merged;else delete e.colors;n++;}
   if(!n)throw Error(`${p.name} doesn’t fit ${refs.length>1?'any of these':'this'}.`);return cells;},cells))status.value=`${p.name} on ${n} thing${n>1?'s':''}.`;}
 async function savePreset(){const t=colourTarget();if(!t)throw Error('Select a prop to save its colours.');const colors=t.entry.colors||{};if(!Object.keys(colors).length)throw Error('Change a colour first.');
  const name=presetName.peek().trim()||'Colours',scheme=presetFor.peek()==='scheme',slug=v=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const preset=scheme?{name,kind:null,colors:Object.fromEntries(propPieces(t.entry.kind).filter(p=>colors[p.id]).map(p=>[p.name.toLowerCase(),colors[p.id]]))}:{name,kind:t.entry.kind,colors:{...colors}};
  const id=scheme?`scheme-${slug(name)||'colours'}`:`${slug(t.entry.kind)}-${slug(name)||'colours'}`;palettes.value=[...palettes.peek().filter(p=>p.id!==id),{id,...preset}];
  try{const response=await fetch('/__map-save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'palette',id,json:JSON.stringify(preset,null,1)})});const result=await response.json();
   status.value=response.ok?`Saved ${name} to ${result.path}.`:`Kept ${name} for this session (not saved: ${result.error}).`;}catch{status.value=`Kept ${name} for this session (saving needs the playground dev server).`;}}
 const fail=act=>()=>Promise.resolve().then(act).catch(error=>{status.value=error.message;});
 const dot=(colour,act)=>h('button',{type:'button',class:'q-world-editor__dot',style:{background:colour},title:colour,'aria-label':`Colour ${colour}`,on:{click:act}});
 // Quick colours: the game's palette, then your recent colours; pick(colour) uses one.
 const recentList=computed(()=>recentColours.value.map(c=>({c})));
 const quickColours=pick=>[h('div',{class:'q-world-editor__dots'},GAME_SWATCHES.map(c=>dot(c,()=>pick(c)))),keyedList(h('div',{class:'q-world-editor__dots'}),recentList,r=>r.c,r=>dot(r.peek().c,()=>pick(r.peek().c)))];
 function coloursPanel(){
  const target=computed(()=>{revision.value;selection.value;return colourTarget();}),isGroup=computed(()=>selection.value?.kind==='group');
  const fitting=computed(()=>{const t=target.value;return t?palettes.value.filter(p=>!p.kind||p.kind===t.entry.kind):isGroup.value?palettes.value.filter(p=>!p.kind):[];});
  return h('div',{class:'q-world-editor__opts',hidden:()=>!target.value&&!isGroup.value},
   h('div',{class:'q-world-editor__group q-world-editor__colours',hidden:()=>!target.value},heading('Colours'),
    keyedList(h('div',{class:'q-world-editor__pieces'}),piecesOf,p=>p.key,p=>h('div',{class:'q-world-editor__piece','data-active':()=>String(activePieceId()===p.value.id)},
     h('button',{type:'button',class:'q-world-editor__piece-name',on:{click:()=>{activePiece.value=p.peek().id;}}},()=>p.value.name),
     h('input',{type:'color',class:'q-world-editor__colour','aria-label':()=>`${p.value.name} colour`,value:()=>p.value.color,
      on:{focus:()=>{activePiece.value=p.peek().id;},input:e=>liveColour(p.peek().id,e.target.value),change:e=>commitColour(p.peek().id,e.target.value)}}),
     h('button',{type:'button',class:'q-button q-button--small',disabled:()=>!p.value.changed,on:{click:()=>commitColour(p.peek().id,null)}},'Reset'))),
    buttons(smallButton('Reset all colours',resetColours))),
   h('div',{class:'q-world-editor__group q-world-editor__quick',hidden:()=>!target.value},heading(()=>{const p=piecesOf.value.find(e=>e.id===activePieceId());return p?`Quick colours · ${p.name.toLowerCase()}`:'Quick colours';}),
    ...quickColours(c=>commitColour(activePieceId(),c))),
   h('div',{class:'q-world-editor__group q-world-editor__presets'},heading(()=>isGroup.value?'Colour schemes':'Presets'),
    keyedList(h('div',{class:'q-world-editor__list'}),fitting,p=>p.id,p=>h('div',{class:'q-world-editor__list-row'},
     h('span',null,()=>`${p.value.name}${p.value.kind?'':' · scheme'}`),smallButton('Apply',()=>applyPreset(p.peek())))),
    h('p',{class:'q-page__help',hidden:()=>fitting.value.length>0},'None saved yet.'),
    h('div',{class:'q-world-editor__save',hidden:()=>!target.value},
     fields(h('label',{class:'q-world-editor__field'},'Preset name',h('input',{type:'text',class:'q-input',placeholder:'Harbour blue',value:()=>presetName.value,on:{input:e=>{presetName.value=e.target.value;}}})),
      select('Save for',presetFor,[['item','This item'],['scheme','Any item (by piece name)']])),
     buttons(smallButton('Save colours',savePreset)))));
 }
 // Wall and floor paint (docs/TOWN.md, Wall and floor paint; paint.js): inside a building (its ground floor on
 // the map, or the floor you're on), a whole room at a time (the tiles reached without crossing a wall, window
 // or door) or one tile or one wall. Any colour; Remove takes the paint off.
 const DIVIDES=new Set(['wall','window','door']),divides=f=>!!f&&DIVIDES.has(f.door?'door':f.kind);
 // Where a tile's paint goes: {tiles (its room), plan, record() (the paint, made when written), owner, level}.
 function paintTarget(tile){if(!tile||!data)return null;const here=floorHere.peek();let owner,level,inside,plan,record;
  if(here){if(!tile.indoor)return null;owner=hereOwner();level=here.level;inside=t=>!!t?.indoor;plan=planOf(owner);record=()=>floorAt(owner,level).paint??={};}
  else{const i=inPlaceAt(tile.x,tile.z);if(i===null||!built.buildings[i])return null;const b=data.buildings[i];owner=i;level=0;inside=t=>t?.building===i;plan=built.buildings[i].plan;record=()=>b.paint??={};}
  const tiles=[tile],seen=new Set([`${tile.x},${tile.z}`]);
  for(let n=0;n<tiles.length&&tiles.length<4000;n++){const t=tiles[n];for(const [dx,dz] of Object.values(DIRS)){const m=at(t.x+dx,t.z+dz),k=`${t.x+dx},${t.z+dz}`;if(!m||seen.has(k)||!inside(m)||divides(edgeBetween(t,m)))continue;seen.add(k);tiles.push(m);}}
  return {tiles,plan,record,owner,level};}
 // A tile's walls: the sides with a wall or window on them, and the face's paint key.
 const wallFaces=(target,t)=>Object.values(DIRS).map(([dx,dz])=>({t,n:at(t.x+dx,t.z+dz)})).filter(({t,n})=>n&&['wall','window'].includes(edgeBetween(t,n)?.kind)).map(({t,n})=>({key:`${paintKey(target.plan,t)},${sideToward(t,n)}`,t,n}));
 // The wall a click is nearest to, among a tile's (the click's point picks).
 function nearestFace(target,tile,point){const faces=wallFaces(target,tile);if(!faces.length)return null;if(!point)return faces[0];const off=[point.x-(tile.x-6),point.z-(tile.z-6)];
  return faces.sort((p,q)=>((q.n.x-q.t.x)*off[0]+(q.n.z-q.t.z)*off[1])-((p.n.x-p.t.x)*off[0]+(p.n.z-p.t.z)*off[1]))[0];}
 // Aiming at walls (docs/TOWN.md, Aiming at walls): the wall face the pointer's ray meets first on its way down to
 // the ground, tile edge by tile edge, as {t (the tile the face looks onto), n (the tile behind it), side (t → n)}.
 // isWall(t, n): which edges count. Walls are as tall as they stand (low with Walls down).
 const WALL_KINDS=new Set(['wall','window']),wallEdge=(t,n)=>WALL_KINDS.has(edgeBetween(t,n)?.kind);
 const wallHeight=()=>options.wallsMode.peek()==='down'?.35:STOREY;
 function aimedWall(ray,isWall){if(!ray||ray.direction.y>-.01)return null;const o=ray.origin,d=ray.direction,ground=hoverPoint?.y??heightAt(hoverAt?.x??0,hoverAt?.z??0),H=wallHeight();
  let s=Math.max(0,(ground+H+1-o.y)/d.y);const end=(ground-1-o.y)/d.y;let ix=Math.round(o.x+d.x*s+6),iz=Math.round(o.z+d.z*s+6);const sx=Math.sign(d.x),sz=Math.sign(d.z);
  for(let i=0;i<256;i++){const tx=sx?(ix+sx*.5-6-o.x)/d.x:Infinity,tz=sz?(iz+sz*.5-6-o.z)/d.z:Infinity;s=Math.min(tx,tz);if(s>end)return null;
   const [nx,nz]=tx<tz?[ix+sx,iz]:[ix,iz+sz],t=at(ix,iz),n=at(nx,nz),y=o.y+d.y*s;
   if(t&&n&&isWall(t,n)&&y>=Math.min(t.h,n.h)-.05&&y<=Math.max(t.h,n.h)+H)return {t,n,side:sideToward(t,n)};ix=nx;iz=nz;}
  return null;}
 // The faces wall paint would cover: the room seen past the face you aim at (or the room you point into), all its
 // walls or just that face; {target, faces}.
 const paintable=t=>floorHere.peek()?!!t.indoor:inPlaceAt(t.x,t.z)!==null;
 function paintFaces(tile,point){const room=options.paintScope.peek()==='room',hit=aimedWall(hoverRay,(t,n)=>wallEdge(t,n)&&paintable(t)),target=paintTarget(hit?hit.t:tile);if(!target)return null;
  const faces=room?target.tiles.flatMap(t=>wallFaces(target,t)):hit?wallFaces(target,hit.t).filter(f=>f.n.x===hit.n.x&&f.n.z===hit.n.z):[nearestFace(target,tile,point)].filter(Boolean);
  return {target,faces};}
 // The floor you last painted (docs/TOWN.md, Walls and paint follow you): its building is selected, and changing the
 // colour, pattern or intensity repaints it at once (one undo step for those changes), until you paint another,
 // edit anything else, undo, leave Floor paint or press Esc. {name, keys, record(), cells, away (out of view)}.
 const paintedFloor=signal(null);
 function followPaint(){const f=paintedFloor.peek();if(!f||tool.peek()!=='floorpaint'||options.paintErase.peek())return;const value=floorValue();
  liveEdit(`paint:${f.id}`,()=>{const list=f.record().floor??={};for(const k of f.keys)list[k]=value;},f.cells);
  const away=!(host.inView?.(f.cells)??true);if(away!==f.away)paintedFloor.value={...f,away};}
 // A floor tile's colour in the chosen paint and pattern.
 const floorValue=()=>floorPaint(colorKey(options.paintColour.peek()),options.floorPattern.peek(),+options.floorIntensity.peek());
 async function paintRoom(tile,point,which){let target=paintTarget(tile);if(!target&&which==='walls')target=paintFaces(tile,point)?.target;if(!target)throw Error('Paint goes inside a building: click a floor tile.');
  const room=options.paintScope.peek()==='room',colour=options.paintErase.peek()?null:colorKey(options.paintColour.peek()),value=which==='floor'&&colour?floorValue():colour,pf=which==='walls'?paintFaces(tile,point):null;
  if(pf)target=pf.target;
  const keys=which==='floor'?(room?target.tiles:[tile]).map(t=>paintKey(target.plan,t)):pf.faces.map(f=>f.key);
  if(!keys.length)throw Error(room?'This room has no walls to paint.':'Click beside a wall.');
  const layer=which==='floor'?'floor':'walls',cells=target.tiles.map(t=>[t.x,t.z]);
  if(await change(()=>{const rec=target.record(),list=rec[layer]??={};for(const k of keys){if(colour)list[k]=value;else delete list[k];}if(!Object.keys(list).length)delete rec[layer];return cells;},cells)){
   if(colour)remember(colour);
   if(which==='floor'&&colour){paintedFloor.value={id:`${target.owner}:${target.level}:${keys[0]}`,name:typeof target.owner==='number'?nameOf('building',data.buildings[target.owner]):'this floor',keys,record:target.record,cells,away:false};
    if(typeof target.owner==='number'&&!floorHere.peek()){selection.value={kind:'building',index:target.owner};showSelection();}}
   status.value=`${colour?'Painted':'Took the paint off'} ${room?'the room’s':'the'} ${which==='floor'?`floor (${keys.length} tile${keys.length>1?'s':''})`:`walls (${keys.length} face${keys.length>1?'s':''})`}.`;}}
 effect(()=>{options.paintColour.value;options.floorPattern.value;options.floorIntensity.value;untracked(followPaint);});
 effect(()=>{tool.value;mode.value;untracked(()=>{if(tool.peek()!=='walls'||mode.peek()!=='edit')endWallTrial();if(tool.peek()!=='floorpaint'||mode.peek()!=='edit')paintedFloor.value=null;});});
 function paintPanel(){
  return opts(['floorpaint','wallpaint'],
   group('Paint',fields(h('label',{class:'q-world-editor__field'},'Colour',h('input',{type:'color',class:'q-world-editor__colour',value:()=>options.paintColour.value,on:{input:e=>{options.paintColour.value=e.target.value;options.paintErase.value=false;}}})),
    select('Paint',options.paintScope,[['room','The whole room'],['one','One tile or wall']])),
    h('div',{class:'q-world-editor__toggles'},toggleSwitch({label:'Remove paint',description:'Clicks take paint off',on:options.paintErase,onChange:v=>{options.paintErase.value=v;}}))),
   h('div',{class:'q-world-editor__group',hidden:()=>tool.value!=='floorpaint'||!paintedFloor.value},heading('Changing'),h('p',{class:'q-page__help'},()=>paintedFloor.value?.name||''),
    h('p',{class:'q-page__help q-world-editor__refused',hidden:()=>!paintedFloor.value?.away},'Out of view'),buttons(smallButton('Show',()=>{const f=paintedFloor.peek();if(!f)return;const [x,z]=f.cells[Math.floor(f.cells.length/2)];host.lookAt?.(x,z);paintedFloor.value={...f,away:false};}),smallButton('Done',()=>cancel()))),
   h('div',{class:'q-world-editor__group',hidden:()=>tool.value!=='floorpaint'},heading('Pattern'),fields(select('Pattern',options.floorPattern,[['plain','Plain'],['checker','Checkered'],['stripes-ns','Stripes north–south'],['stripes-ew','Stripes east–west'],['random','Random']]),
    slider({label:'Intensity',value:()=>+options.floorIntensity.value,min:0,max:100,step:1,format:v=>String(v),onInput:v=>{options.floorIntensity.value=String(v);}}))),
   wideGroup('Quick colours',...quickColours(c=>{options.paintColour.value=c;options.paintErase.value=false;})));
 }

 // The catalogue (docs/TOWN.md, Sims-style editor): every prop by room or by function, with search; a click puts
 // a new one in your hand (on a floor, as furniture). Once you've picked an item, its saved presets show too.
 const catalogueBy=signal('function'),catalogueGroup=signal('All'),catalogueSearch=signal(''),catalogueKind=signal('');
 // The catalogue shows for Decorate's own tools; paint and stamps take its place with their options.
 const CATALOGUE_TOOLS=['deco'];
 // Deco always shows the catalogue (what's selected shows only its colours beside it).
 const catalogueShown=()=>mode.value==='edit'&&toolGroup.value==='decorate'&&CATALOGUE_TOOLS.includes(tool.value);
 function pickUpNew(kind,colors=null){catalogueKind.value=kind;const here=floorHere.peek(),entry=here?{kind,at:[0,0],rotation:heldRotation.peek(),fresh:true}:{kind,x:0,z:0,rotation:heldRotation.peek(),fresh:true};
  if(colors)entry.colors={...colors};selection.value=null;showSelection();hold(here?'furniture':'prop',entry);
  status.value=`${PROPS[kind].name}: click where it goes. , and . turn it; Shift-click places more; Esc puts it away.`;}
 function cataloguePanel(){
  const groups=()=>catalogueBy.value==='room'?BY_ROOM:BY_FUNCTION;
  const chips=computed(()=>['All',...Object.keys(groups())].map(id=>({id})));
  const shows=kind=>{const g=catalogueGroup.value,q=catalogueSearch.value.trim().toLowerCase();return (g==='All'||(groups()[g]||[]).includes(kind))&&(!q||`${PROPS[kind].name} ${kind}`.toLowerCase().includes(q));};
  // Hovering (or focusing) an icon shows a little card above it, as in the Sims: the name, what it is, and a line
  // of facts (size, whether you can walk over it, what you do with it, where it goes).
  const hovered=signal(null);let section=null;
  const facts=kind=>{const d=PROPS[kind],[w,dd]=d.footprint,uses=Object.entries(BY_FUNCTION).filter(([,k])=>k.includes(kind)).map(([g])=>g);
   return [`${w} × ${dd}`,d.policy==='walk'?'Walk over it':d.policy==='low'?'Low (see over it)':'Solid',d.interaction?.label,d.water==='only'?'Goes on water':d.water==='any'?'Land or water':null,uses.slice(0,2).join(', ')].filter(Boolean).join(' · ');};
  const show=(kind,button)=>{if(!section)return;const r=button.getBoundingClientRect(),c=section.getBoundingClientRect();hovered.value={kind,x:Math.max(130,Math.min(c.width-130,r.left-c.left+r.width/2)),y:c.bottom-r.top+8};};
  const tipCard=h('div',{class:'q-world-editor__tip',role:'tooltip',id:'q-world-editor-tip',hidden:()=>!hovered.value,style:{left:()=>`${hovered.value?.x??0}px`,bottom:()=>`${hovered.value?.y??0}px`}},
   h('strong',{class:'q-world-editor__tip-name'},()=>hovered.value?PROPS[hovered.value.kind].name:''),
   h('p',{class:'q-world-editor__tip-text'},()=>hovered.value?DESCRIPTIONS[hovered.value.kind]||'':''),
   h('p',{class:'q-world-editor__tip-facts'},()=>hovered.value?facts(hovered.value.kind):''));
  // Square icons only (the name is on the hover card and read to screen readers), as in the Sims.
  const item=kind=>h('button',{type:'button',class:'q-world-editor__prop','aria-label':PROPS[kind].name,'aria-describedby':'q-world-editor-tip','aria-pressed':()=>String(catalogueKind.value===kind),hidden:()=>!shows(kind),on:{click:fail(()=>{chosenPreset.value='default';pickUpNew(kind);}),pointerenter:e=>show(kind,e.currentTarget),focus:e=>show(kind,e.currentTarget),pointerleave:()=>{if(hovered.peek()?.kind===kind)hovered.value=null;},blur:()=>{if(hovered.peek()?.kind===kind)hovered.value=null;}}},
   h('img',{class:'q-world-editor__thumb',alt:'',width:56,height:56,src:()=>catalogueShown()?propThumbnail(kind).value||undefined:undefined}));
  // Compact, bottom left: how to browse and search along the top; the groups on the left and the items on the
  // right, two rows tall, scrolling down.
  section=h('section',{class:'q-world-editor__catalogue','aria-label':'Catalogue',hidden:()=>!catalogueShown()},tipCard,
   h('div',{class:'q-world-editor__catalogue-head'},
    segmented({label:'Browse',options:[{value:'function',label:'Function'},{value:'room',label:'Room'}],value:catalogueBy,onChange:v=>{catalogueBy.value=v;catalogueGroup.value='All';}}),
    h('input',{type:'search',class:'q-input','aria-label':'Search the catalogue',placeholder:'Search',value:()=>catalogueSearch.value,on:{input:e=>{catalogueSearch.value=e.target.value;}}})),
   keyedList(h('div',{class:'q-world-editor__groups'}),chips,c=>c.id,c=>h('button',{type:'button',class:'q-world-editor__group-button','aria-pressed':()=>String(catalogueGroup.value===c.value.id),on:{click:()=>{catalogueGroup.value=c.peek().id;}}},()=>c.value.id)),
   h('div',{class:'q-world-editor__catalogue-main'},
    h('div',{class:'q-world-editor__strip'},PROP_KINDS.map(item))));
  return section;
 }
 // Deco's presets (docs/TOWN.md, Deco's presets): always beside the catalogue. With nothing picked, "No item
 // selected"; with an item, its looks as square pictures: its own colours (Default, chosen whenever you pick a new
 // item) and every preset saved for it. A click holds the item in that look.
 const chosenPreset=signal('default');
 function presetsWindow(){
  const looks=computed(()=>{const k=catalogueKind.value;return k?[{id:'default',name:'Default',kind:k,colors:null},...palettes.value.filter(p=>p.kind===k).map(p=>({id:p.id,name:p.name,kind:k,colors:p.colors}))]:[];});
  return h('div',{class:'q-world-editor__group q-world-editor__deco-presets',hidden:()=>tool.value!=='deco'},heading(()=>catalogueKind.value?`${PROPS[catalogueKind.value].name} · presets`:'Presets'),
   h('p',{class:'q-page__help',hidden:()=>!!catalogueKind.value},'No item selected.'),
   keyedList(h('div',{class:'q-world-editor__preset-grid'}),looks,p=>`${p.kind}:${p.id}`,p=>h('button',{type:'button',class:'q-world-editor__prop q-world-editor__preset','aria-pressed':()=>String(chosenPreset.value===p.value.id),title:()=>p.value.name,'aria-label':()=>p.value.name,
    on:{click:fail(()=>{chosenPreset.value=p.peek().id;pickUpNew(p.peek().kind,p.peek().colors);})}},
    h('img',{class:'q-world-editor__thumb',alt:'',width:56,height:56,src:()=>propThumbnail(p.value.kind,p.value.colors).value||undefined}),h('span',{class:'q-world-editor__preset-name'},()=>p.value.name))));
 }
 // Previews (docs/TOWN.md, Preview ghosts): under the pointer, what a click or a stroke would change,
 // green where it fits and red where it doesn't, with see-through models of what would stand there and the
 // reason a spot is refused. They use the same checks as placing, without changing anything.
 const OK='#45d483',NO='#ff5a5a',BRUSH='#5fc8ff';
 let hoverAt=null,hoverPoint=null,hoverRay=null,lastPreview=null,fill=null,faceFill=null;const previewNote=signal('');
 const ghostMaterials={ok:new THREE.MeshBasicMaterial({color:OK,transparent:true,opacity:.5,depthWrite:false}),no:new THREE.MeshBasicMaterial({color:NO,transparent:true,opacity:.5,depthWrite:false})};
 const heightAt=(x,z)=>at(x,z)?.h??built?.ground?.tile(x,z)?.h??1;
 const ghosts=new Map();let shownGhosts=new Set();
 function clearPreview(){fill?.dispose();fill=null;faceFill?.dispose();faceFill=null;for(const id of shownGhosts)ghosts.get(id)?.group.removeFromParent();shownGhosts=new Set();previewNote.value='';}
 // A stand-in body for someone placed (townsfolk, an enemy spawn): a squat blob, as big as they are.
 const blobGeometry=new THREE.SphereGeometry(.42,16,10);
 // A building's model built off to the side, on flat ground of its own, at origin [0, 0] (planBuilding is the
 // same plan wherever it stands): the real walls, roof and doors, without touching the map.
 function buildingGhost(desc){const group=new THREE.Group(),tiles=new Map(),tileAt=(x,z)=>{const k=`${x},${z}`;if(!tiles.has(k))tiles.set(k,{x,z,h:0});return tiles.get(k);};
  const edges=createEdgeFeatures({parent:group,tileAt,cutaway:false}),b=createBuilding(desc,{origin:[0,0],id:-2,edges,tileAt,parent:group});edges.bake();
  return {group,dispose(){b.dispose();edges.dispose();}};}
 // What a ghost looks like and where it stands: {key (its look), make() → {group, dispose?}, place(group)}.
 function ghostSpec(kind,e){
  if(kind==='prop'&&PROPS[e.kind])return {key:`prop:${e.kind}`,make:()=>({group:propModel(e.kind)}),place(g){const r=e.rotation||0,[w,d]=propFootprint(e.kind,r);let base=0;for(let b=0;b<d;b++)for(let a=0;a<w;a++)base=Math.max(base,heightAt(e.x+a,e.z+b));
   placePropModel(g,e.kind,[e.x,e.z],r,base,e.scale);}};
  if(kind==='building'){const desc={...e.desc};delete desc.name;const cells=planBuilding(e.desc,[e.x,e.z]).tiles;
   return {key:`building:${JSON.stringify(desc)}`,make:()=>buildingGhost(desc),place(g){g.position.set(e.x,Math.max(...cells.map(([a,b])=>heightAt(a,b))),e.z);}};}
  // Stairs between floors: the real stairwell model (a flight up, or the opening of one going down).
  if(kind==='flight'){const [bx,bz]=e.bottom,[tx,tz]=e.top,[dx,dz]=e.dir;return {key:`flight:${e.ladder?'ladder':'stairs'}:${e.view}`,make:()=>{const group=new THREE.Group();group.add((e.ladder?ladderModel:stairwellModel)(e.view));return {group,dispose(){group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};},
   place(g){g.position.set((bx+tx)/2-6,heightAt(bx,bz),(bz+tz)/2-6);g.rotation.y=Math.atan2(dx,dz);}};}
  if(kind==='crystal')return {key:'crystal',make:()=>({group:makeCrystal()}),place(g){const c=crystalCentre(crystalCells(e).map(([x,z])=>({x,z,h:heightAt(x,z)})));g.position.set(c.x,c.y,c.z);}};
  if(kind==='resource'&&e.kind==='tree')return {key:`tree:${e.species||'oak'}`,make:()=>({group:makeTreeModel(e.species||'oak')}),place(g){g.position.set(e.x-6,heightAt(e.x,e.z),e.z-6);}};
  if(kind==='townsfolk'||kind==='enemy'){const n=kind==='enemy'?enemySize(e.enemy):1,[x,z]=kind==='townsfolk'?e.home||[]:[e.x,e.z];if(x===undefined)return null;
   return {key:`blob:${n}`,make:()=>{const group=new THREE.Group(),m=new THREE.Mesh(blobGeometry);m.scale.set(n,n*.8,n);m.position.y=.34*n;group.add(m);return {group};},place(g){g.position.set(x+(n-1)/2-6,heightAt(x,z),z+(n-1)/2-6);}};}
  return null;}
 // Shows a ghost for each {kind, entry} (green, or red when refused); a look is built once and kept.
 function showGhosts(list,ok){const count=new Map(),shown=new Set();
  for(const {kind,entry} of list){let spec=null;try{spec=ghostSpec(kind,entry);}catch{spec=null;}if(!spec)continue;const n=count.get(spec.key)||0;count.set(spec.key,n+1);const id=`${spec.key}#${n}`;
   let g=ghosts.get(id);if(!g){try{g=spec.make();}catch{continue;}g.meshes=[];g.group.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=false;o.renderOrder=23;g.meshes.push({o,was:o.material});}else if(o.isSprite||o.isPoints||o.isLine)o.visible=false;});ghosts.set(id,g);}
   for(const {o} of g.meshes)o.material=ok?ghostMaterials.ok:ghostMaterials.no;spec.place(g.group);overlayParent().add(g.group);shown.add(id);}
  for(const id of shownGhosts)if(!shown.has(id))ghosts.get(id)?.group.removeFromParent();shownGhosts=shown;
  // Looks not in use go when there are many (a building's is a whole model).
  if(ghosts.size>24)for(const [id,g] of ghosts)if(!shown.has(id)){for(const {o,was} of g.meshes)o.material=was;g.dispose?.();ghosts.delete(id);}}
 const fits=check=>{try{check();return null;}catch(error){return error.message;}};
 const tint=(cells,color)=>cells.map(([x,z])=>({x,z,color}));
 // An entry as a ghost: furniture as the prop it is, where it stands on the map.
 const ghostOf=(kind,e)=>{if(kind!=='furniture')return {kind,entry:e};const [x,z]=anchorOf('furniture',e);return {kind:'prop',entry:{kind:e.kind,rotation:e.rotation||0,scale:e.scale,x,z}};};
 // What the current tool would do at a tile: {cells:[{x, z, color}], prop:{kind, rotation, x, z}, refused}.
 function previewAt(x,z){const o=Object.fromEntries(Object.entries(options).map(([k,v])=>[k,v.peek()])),rotation=+o.rotation,inMap=(a,b)=>a>=0&&b>=0&&a<data.size[0]&&b<data.size[1];
  const placed=(kind,entry,own=[])=>{let cells=[];try{cells=cellsOf(kind,entry);}catch{return {cells:[],refused:'That doesn’t fit here.'};}const refused=fits(()=>validate(kind,entry,own,{dry:true}));
   return {cells:tint(cells,refused?NO:OK),refused,ghosts:[ghostOf(kind,entry)]};};
  // On a floor: furniture fits on open floor tiles; the shape, walls and stairs show the tile.
  if(pendingFlight)return flightPreview(pendingFlight.building,pendingFlight.level,pendingFlight.view,x,z);
  if(floorHere.peek()&&!HAND_TOOLS.includes(tool.peek())){if(tool.peek()==='stairs')return stairsPreview(hereOwner(),floorHere.peek().level,x,z);
   if(tool.peek()==='prop'){[x,z]=wallAim?.at||[x,z];const [w,d]=propFootprint(o.prop,rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push([x+a,z+b]);const bad=cells.some(([a,b])=>{const t=at(a,b);return !t||!t.indoor||t.blocked;});
    return {cells:tint(cells,bad?NO:OK),refused:bad?'No room for it here.':null,ghosts:[{kind:'prop',entry:{kind:o.prop,rotation,x,z}}]};}
   return ['footprint','surface','edge','erase'].includes(tool.peek())?{cells:tint([[x,z]],tool.peek()==='erase'?NO:BRUSH)}:null;}
  if(placing?.kind==='stamp'||tool.peek()==='stamp'&&chosenStamp.peek())return stampPreview(placing?.kind==='stamp'?placing.entry:stampOf(chosenStamp.peek()),x,z);
  if(boxing)return null;
  // Select: what a click would pick, faintly (the selection keeps its outline).
  if(tool.peek()==='select'&&!holding()&&!heldDoor){const hit=pickAt(x,z)||grownAt(x,z),e=entryOf(hit);return e?{cells:tint(cellsOf(hit.kind,e),'#fff3a8'),opacity:.22}:null;}
  if(HAND_TOOLS.includes(tool.peek())){const at=wallAim?wallAim.at:[x+grab[0],z+grab[1]];
   // A held door: the wall it would go on.
   if(heldDoor?.room){const hit=roomWallAt({x,z},null);return hit?{cells:tint(hit.cells,OK)}:{cells:[],refused:'Point at one of the room’s walls.'};}
   if(heldDoor){const hit=wallAt({x,z},null,heldDoor.building);if(!hit)return {cells:[],refused:'Point at one of its walls.'};const refused=fits(()=>doorMoved(heldDoor.building,hit));return {cells:tint([hit.e.a,hit.e.b],refused?NO:OK),refused};}
   // What you hold, where it would go and how it would face (furniture on its own floor; a new prop inside an
   // in-place building is that building's furniture).
   const heldAt=(kind,src,home=null)=>{const e=structuredClone(src);if(kind==='furniture'){const h=home||homeOf(src)||{owner:hereOwner(),level:floorHere.peek()?.level??0};homes.set(e,h);const p=planOf(h.owner);e.at=[at[0]-p.x0,at[1]-p.z0];}else Object.assign(e,anchorPatch(kind,at));return turnable(kind)?withRotation(kind,e,heldRotation.peek()):e;};
   if(placing?.kind==='prop'&&inPlaceAt(...at)!==null){const i=inPlaceAt(...at);const src=placing.entry;return placed('furniture',heldAt('furniture',{kind:src.kind,at:[0,0],rotation:0,...src.colors?{colors:src.colors}:{},...src.scale?{scale:src.scale}:{}},{owner:i,level:0}));}
   if(placing)return placed(placing.kind,heldAt(placing.kind,placing.entry));
   const sel=selection.peek(),entry=entryOf(sel);if(!moving.peek()||!entry)return null;const own=cellsOf(sel.kind,entry);
   if(sel.kind==='group'){const [ax,az]=anchorOf('group',entry),cells=[],errors=[],list=[];
    for(const r of entry.items){const src=entryOf(r),e=shiftEntry(r.kind,structuredClone(src),at[0]-ax,at[1]-az);if(r.kind==='furniture')homes.set(e,homeOf(src));try{cells.push(...cellsOf(r.kind,e));validate(r.kind,e,own,{dry:true});}catch(error){errors.push(error.message);}list.push(ghostOf(r.kind,e));}
    return {cells:tint(cells,errors.length?NO:OK),refused:errors[0]||null,ghosts:list};}
   return placed(sel.kind,heldAt(sel.kind,entry,sel.kind==='furniture'?homeOf(entry):null),own);}
  switch(tool.peek()){
   // Paint: the room (or the tile) it would cover, in the paint's colour.
   // Paint: the floor it would cover in its colours and pattern; the wall faces it would cover, in its colour.
   case 'floorpaint':{const room=paintTarget(at(x,z));if(!room)return {cells:[],refused:'Point inside a building.'};const cells=o.paintScope==='room'?room.tiles:[at(x,z)],value=floorValue();
    return {opacity:o.paintErase?.42:.9,cells:cells.map(t=>({x:t.x,z:t.z,color:o.paintErase?NO:floorTileColor(value,t.x-room.plan.x0,t.z-room.plan.z0)}))};}
   case 'wallpaint':{const pf=paintFaces(at(x,z),hoverPoint);if(!pf?.faces.length)return {cells:[],refused:'Point at a wall inside a building.'};return {cells:[],faces:pf.faces.map(f=>({t:f.t,n:f.n,color:o.paintErase?NO:o.paintColour}))};}
   // Walls: the wall you aim at.
   case 'walls':{const hit=wallAt(at(x,z),hoverPoint);if(!hit){endWallTrial();return {cells:[],refused:'Point at a building’s wall.'};}try{tryWall(hit);}catch(error){endWallTrial();console.warn(error);}const [a,b]=hit.face?[hit.face.t,hit.face.n]:[at(...hit.e.a),at(...hit.e.b)];
    return {cells:[],faceOpacity:.18,faces:a&&b?[{t:a,n:b,color:BRUSH},...hit.face?[]:[{t:b,n:a,color:BRUSH}]]:[]};}
   case 'room':case 'resize':return null;
   case 'prop':{const [px,pz]=wallAim?.at||[x,z];return placed('prop',{kind:o.prop,x:px,z:pz,rotation});}
   case 'townsfolk':return (data.townsfolk||[]).some(f=>f.home&&f.home[0]===x&&f.home[1]===z)?{cells:[{x,z,color:BRUSH}]}:placed('townsfolk',{home:[x,z]});
   case 'enemy':return placed('enemy',{enemy:o.enemyKind,aggressive:o.enemyMood==='aggressive',respawn:+o.enemyRespawn,x,z});
   case 'building':{const desc={...structuredClone(BUILDING_PRESETS[o.preset]),rotation};let cells=[];try{cells=planBuilding(desc,[x,z]).tiles;}catch(error){return {cells:[],refused:error.message};}
    const refused=fits(()=>{oneChunk(cells);taken(cells);});return {cells:tint(cells,refused?NO:OK),refused,ghosts:[{kind:'building',entry:{x,z,desc}}]};}
   case 'stairs':{if(inPlaceAt(x,z)!==null)return stairsPreview(inPlaceAt(x,z),0,x,z);const cells=stairCells({x,z,dir:o.dir,length:+o.length,width:+o.width}),missing=cells.find(([a,b])=>!at(a,b));return {cells:tint(cells,missing?NO:OK),refused:missing?`${missing.join(',')} is off the map.`:null};}
   case 'crystal':return onCrystal(x,z)?{cells:[{x,z,color:BRUSH}]}:placed('crystal',{id:'new',x,z},[]);
   case 'spawn':{const t=at(x,z),bad=!t||t.blocked||t.water;return {cells:tint([[x,z]],bad?NO:OK),refused:bad?'You can’t arrive there.':null};}
   case 'nature':{if(!data.land)return null;const choice=o.nature,[group]=choice.split(':');
    return {cells:brushTiles(x,z).filter(([a,b])=>inMap(a,b)).map(([a,b])=>{const t=at(a,b),n=natureAt(a,b);
     const ok=choice==='fishing'?!!t?.water:choice==='grow'?!!t&&!t.water:choice==='clear'?!!(n.resource||n.cover):group==='cover'?!!t&&!t.water&&t.building===undefined:resourceFits(t)&&!onCrystal(a,b);
     return {x:a,z:b,color:ok?(choice==='clear'?NO:OK):'#8a8a8a'};})};}
   case 'raise':case 'lower':case 'flatten':case 'smooth':case 'ramp':case 'ramps':case 'surface':return {cells:brushTiles(x,z).filter(([a,b])=>inMap(a,b)).map(([a,b])=>({x:a,z:b,color:BRUSH}))};
   case 'footprint':return {cells:brushTiles(x,z).filter(([a,b])=>inMap(a,b)).map(([a,b])=>({x:a,z:b,color:o.draftMode==='add'?OK:NO}))};
   case 'biome':{if(!data.land)return null;const r=o.biomeBrush==='3'?1:o.biomeBrush==='5'?2:0,[cx,cz]=cellOf(x,z),[ox,oz]=data.land.origin||[0,0],cells=[];
    for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)for(let b=0;b<BIOME_CELL;b++)for(let a=0;a<BIOME_CELL;a++)cells.push({x:(cx+dx)*BIOME_CELL+a-ox,z:(cz+dz)*BIOME_CELL+b-oz,color:(o.landLayer==='terrain'?TERRAIN_PAINT[o.terrain]:BIOME_PAINT[o.biome])||BRUSH});return {cells};}
   case 'erase':{const hit=pickAt(x,z);if(hit&&hit.kind!=='townsfolk')return {cells:tint(cellsOf(hit.kind,entryOf(hit)),NO)};
    const n=data.land?natureAt(x,z):{};return n.resource||n.cover||n.fishing||data.edges.some(e=>e.a[0]===x&&e.a[1]===z||e.b[0]===x&&e.b[1]===z)?{cells:tint([[x,z]],NO)}:null;}
   case 'use':case 'reroll':{const b=data.buildings.find(e=>covers(e,x,z,'building'));return b?{cells:tint(cellsOf('building',b),BRUSH)}:null;}
  }
  return null;}
 // An entry's anchor moved to a tile, as a patch (townsfolk are anchored by their home).
 const anchorPatch=(kind,[x,z])=>kind==='townsfolk'?{home:[x,z]}:{x,z};
 function refreshPreview(){clearPreview();const where=pinned||hoverAt;if(!built||!view||mode.peek()!=='edit'||!where)return;
  let p=null;try{p=previewAt(where.x,where.z);}catch{p=null;}lastPreview=p;if(!p)return;
  if(p.cells?.length)fill=createCellFill({cells:p.cells,heightAt,parent:overlayParent(),...p.opacity?{opacity:p.opacity}:{}});
  if(p.faces?.length)faceFill=createFaceFill({faces:p.faces,height:wallHeight(),parent:overlayParent(),...p.faceOpacity?{opacity:p.faceOpacity}:{}});
  showGhosts(p.ghosts||[],!p.refused);
  previewNote.value=p.refused?`Can’t place here: ${p.refused}`:'';}
 // The pointer moved (a tile, or within one: point and ray aim at walls). A wall decoration held (or the Prop tool's)
 // snaps against the wall face aimed at, turned with its back to it: wallAim {at, rotation}.
 let wallAim=null;
 function wallPropKind(){const sel=selection.peek(),kind=placing?(placing.kind==='prop'||placing.kind==='furniture'?placing.entry.kind:null):moving.peek()&&(sel?.kind==='prop'||sel?.kind==='furniture')?entryOf(sel)?.kind:HAND_TOOLS.includes(tool.peek())?null:tool.peek()==='prop'?options.prop.peek():null;
  return kind&&PROPS[kind]?.mount==='wall'?kind:null;}
 function aimWallProp(){const kind=wallPropKind();if(!kind)return null;const hit=aimedWall(hoverRay,wallEdge);if(!hit)return null;
  const rotation=SIDES.indexOf(hit.side)*90,[w,d]=propFootprint(kind,rotation),{x,z}=hit.t,mid=v=>Math.floor((v-1)/2);
  return {at:{n:[x-mid(w),z],s:[x-mid(w),z-(d-1)],e:[x-(w-1),z-mid(d)],w:[x,z-mid(d)]}[hit.side],rotation};}
 const aimsAtWalls=()=>['walls','wallpaint'].includes(tool.peek())||!!heldDoor||!!wallPropKind();
 function hover(tile,point=null,ray=null){
  // Off the map (on the panel): paint's preview stays where it was, so changing the colour or pattern shows on it.
  if(!tile&&hoverAt&&['floorpaint','wallpaint'].includes(tool.peek()))return;
  const moved=!tile||!hoverAt||tile.x!==hoverAt.x||tile.z!==hoverAt.z;hoverAt=tile?{x:tile.x,z:tile.z}:null;hoverPoint=point;hoverRay=ray;
  if(!moved&&!aimsAtWalls())return;wallAim=tile?aimWallProp():null;
  if(wallAim){if(holding()){if(heldRotation.peek()!==wallAim.rotation){heldRotation.value=wallAim.rotation;return;}}else if(+options.rotation.peek()!==wallAim.rotation){options.rotation.value=String(wallAim.rotation);return;}}
  refreshPreview();}
 function cancel(){if(problemMarks.length){clearProblem();return true;}if(paintedFloor.peek()){paintedFloor.value=null;if(selection.peek()?.kind==='building'&&tool.peek()==='floorpaint')selection.value=null;showSelection();status.value='Done with that floor.';return true;}if(patrolling){patrolling=false;patrolOn.value=false;status.value='Patrol route done.';return true;}
  if(heldDoor){heldDoor.actor.group.visible=true;heldDoor=null;status.value='Put back.';refreshPreview();return true;}
  if(pendingFlight){pendingFlight.well&&(pendingFlight.well.group.visible=true);pendingFlight=null;status.value='Put back.';refreshPreview();return true;}
  if(placing||moving.peek()){const put=!placing,sel=selection.peek();placing=null;moving.value=false;turning=null;pinned=null;if(unhide()&&sel)showWorld(sel);status.value=put?'Put back.':'Put away.';}else if(draft.peek().size&&tool.peek()==='footprint'){clearDraft();status.value='Footprint cleared.';}else if(selection.peek())selection.value=null;else{showSelection();return false;}showSelection();return true;}
 // Keys while editing (not while typing in the panel): they never reach the camera.
 // Keys never take a movement key (WASD, arrows: the camera and the free camera keep them): Ctrl/⌘+Z undo,
 // Ctrl/⌘+Shift+Z or Ctrl/⌘+Y redo, and with a selection Ctrl/⌘+D duplicate, R rotate, M move, Delete.
 const onKeyUp=e=>{shiftHeld=e.shiftKey;};
 function onKey(e){shiftHeld=e.shiftKey;if(!view||mode.peek()!=='edit'||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName||''))return;
  const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  let act=null;
  // Esc steps back towards Select: what you hold goes back, then the selection, then the tool becomes Select.
  if(e.key==='Escape')act=()=>{if(!cancel()&&tool.peek()!=='select')setTool('select');};
  else if(mod&&k==='s')act=save;else if(mod&&k==='z')act=e.shiftKey?()=>step(redo,undo):()=>step(undo,redo);else if(mod&&k==='y')act=()=>step(redo,undo);
  else if(mod&&k==='v')act=pasteClipboard;else if(mod&&k==='c'&&selection.peek())act=copySelection;
  else if(e.key==='PageUp'||e.key==='PageDown'){const dir=e.key==='PageUp'?1:-1;act=()=>goLevel(dir,{pointer:true});}
  // Held stairs, and the Stairs tool's, turn with , and . too.
  else if(!mod&&(e.key===','||e.key==='.'||k==='r')&&(pendingFlight||tool.peek()==='stairs'&&!holding())){const dir=e.key===','?-1:1;act=()=>{options.dir.value=(dir>0?CLOCKWISE:COUNTER)[options.dir.peek()];refreshPreview();};}
  // , and . turn what you hold (or the selection) one way and the other; R turns it clockwise.
  else if(!mod&&(e.key===','||e.key==='.'||k==='r')&&(holding()||selection.peek())){const dir=e.key===','?-1:1;act=()=>turnHeld(dir)||rotateSelection(dir);}
  else if(!mod&&(e.key==='Delete'||e.key==='Backspace')&&placing)act=cancel;
  // + and − size a prop held or selected.
  else if(!mod&&['=','+','-','_'].includes(e.key)&&(holding()||selection.peek())){const dir=e.key==='-'||e.key==='_'?-1:1;act=()=>resize(dir);}
  else if(selection.peek()){if(mod&&k==='d')act=withReal(duplicateSelection);else if(mod||e.altKey)act=null;else if(k==='r')act=rotateSelection;else if(k==='m')act=startMove;else if(e.key==='Delete'||e.key==='Backspace')act=deleteSelection;}
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
  if(e&&resourceFits(t)&&!onCrystal(x,z)){const list=lists().resource;const i=list.findIndex(r=>r.x===x&&r.z===z);if(i>=0)list.splice(i,1);list.push(e.kind==='tree'?{kind:'tree',species:e.species,x,z}:{kind:e.kind,x,z});placed=true;}
  if(c&&t.building===undefined){const list=lists().cover;const i=list.findIndex(r=>r.x===x&&r.z===z);if(i>=0)list.splice(i,1);list.push({kind:c.kind,x,z});placed=true;}
  return placed;}
 function putNature(x,z,choice){const t=at(x,z);if(choice==='clear'){clearNature(x,z);return true;}if(choice==='grow')return growNature(x,z);
  // A fishing spot goes on water; one per tile, replacing a generated one there.
  if(choice==='fishing'){if(!t?.water)return false;const n=natureAt(x,z).fishing;if(n?.placed)return false;if(n)removeGrown(n.id);lists().fishing.push({x,z});return true;}
  const [group,kind]=choice.split(':');
  if(group==='cover'){if(!t||t.water||t.building!==undefined)return false;const n=natureAt(x,z).cover;if(n?.placed)lists().cover.splice(lists().cover.findIndex(c=>c.x===x&&c.z===z),1);else if(n)removeGrown(n.id);lists().cover.push({kind,x,z});return true;}
  if(!resourceFits(t)||onCrystal(x,z))return false;const n=natureAt(x,z).resource;
  if(n?.placed)lists().resource.splice(lists().resource.findIndex(r=>r.x===x&&r.z===z),1);else if(n)removeGrown(n.id);
  lists().resource.push(group==='tree'?{kind:'tree',species:kind,x,z}:{kind,x,z});return true;}
 function paintAt({x,z}){const o=tool.peek(),surface=options.surface.peek(),onLand=!!data.land;
  if(o==='flatten')stroke.level??=at(x,z)?.h??1;
  for(const [a,b] of brushTiles(x,z)){const id=`${a},${b}`;if(stroke.seen.has(id)||a<0||b<0||a>=data.size[0]||b>=data.size[1])continue;stroke.seen.add(id);
   if(o==='nature'){if(putNature(a,b,options.nature.peek()))stroke.pending.push([a,b]);continue;}
   if(o==='surface'){if(surface==='water'&&!onLand)continue;if(surface==='land')clearMapSurface(data,a,b);else setMapSurface(data,a,b,surface);}
   // Ramp ledges (docs/TOWN.md, Ramps): a tile half a block above a neighbour slopes down to it instead (on
   // paths only, unless that's turned off), or goes back to a ledge.
   else if(o==='ramps'){const t=at(a,b);if(!t||t.water||t.stair)continue;if(options.rampMode.peek()==='remove'){if(!mapRamp(data,a,b))continue;setMapRamp(data,a,b,null);}
    else{if(options.rampPaths.peek()&&!PATH_SURFACES.has(t.surface))continue;const dir=rampDirFor(t);if(!dir)continue;setMapRamp(data,a,b,dir);}}
   else if(o==='flatten'){const base=onLand?built.ground.base(a,b):0;if(onLand)setMapOffset(data,a,b,stroke.level-base);else setMapHeight(data,a,b,stroke.level);}
   // Smooth: each tile eases to the average of the tiles around it (to the half block).
   else if(o==='smooth'){const near=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const t=at(a+dx,b+dz);if(t&&!t.water)near.push(t.h);}if(!near.length)continue;
    const target=Math.round(near.reduce((p,q)=>p+q,0)/near.length*2)/2;setHeight(a,b,target);}
   else{const step=o==='raise'?.5:-.5;if(onLand)setMapOffset(data,a,b,mapOffset(data,a,b)+step);else setMapHeight(data,a,b,mapHeight(data,a,b)+step);}
   stroke.pending.push([a,b]);}}
 // Which way a ramp on this tile goes up: away from a neighbour half a block below it (a path one first).
 const PATH_SURFACES=new Set(['dirt','cobble','flagstone','plaza','stone','planks']),OPPOSITE={n:'s',s:'n',e:'w',w:'e'};
 function rampDirFor(t){const down=Object.entries(RAMP_DIRS).filter(([,[dx,dz]])=>{const n=at(t.x+dx,t.z+dz);return n&&!n.water&&!n.stair&&Math.abs(n.h-(t.h-.5))<.01;});
  if(!down.length)return null;const pick=down.find(([,[dx,dz]])=>PATH_SURFACES.has(at(t.x+dx,t.z+dz)?.surface))||down[0];return OPPOSITE[pick[0]];}
 // A tile's height set outright (an offset on the land, or the height itself on a flat map).
 function setHeight(x,z,h){if(data.land)setMapOffset(data,x,z,h-built.ground.base(x,z));else setMapHeight(data,x,z,h);}
 // The tiles of a straight line from a to b (both ends included).
 function lineTiles(a,b){const n=Math.max(Math.abs(b.x-a.x),Math.abs(b.z-a.z)),out=[];for(let i=0;i<=n;i++)out.push({x:Math.round(a.x+(b.x-a.x)*(n?i/n:0)),z:Math.round(a.z+(b.z-a.z)*(n?i/n:0)),t:n?i/n:0});return out;}
 // Rooms and walls (docs/TOWN.md, Rooms and walls). The Room tool: drag a rectangle. On open ground it's a new
 // building on that footprint (as Build it makes one); inside one building (its ground floor on the map, or the
 // floor you're on), the rectangle's sides that aren't already the building's walls become walls, with a door
 // in the middle of the longest. Push/pull walls: drag from a tile along a building's outside wall, outwards to
 // push that wall out or inwards to pull it in, and the building is reshaped.
 let roomBox=null,roomFill=null;
 const rectOf=(a,b)=>{const [x0,x1]=[a.x,b.x].sort((p,q)=>p-q),[z0,z1]=[a.z,b.z].sort((p,q)=>p-q),cells=[];for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)cells.push([x,z]);return {x0,x1,z0,z1,cells};};
 // What pushing or pulling would do: {i, next (the new footprint's tiles), added, removed}, or throws.
 function resizePlan({from,to}){const inner=roomWallPlan({from,to});if(inner!==undefined)return inner;const s=at(from.x,from.z),i=s?.building;if(i===undefined||inPlaceAt(s.x,s.z)===null)throw Error(floorHere.peek()?'Start beside a room’s wall.':'Start on a tile along a building’s outside wall, or beside a room’s wall.');
  const dx=to.x-from.x,dz=to.z-from.z;if(!dx&&!dz)return null;const along=Math.abs(dx)>=Math.abs(dz),n=along?Math.abs(dx):Math.abs(dz),dir=along?[Math.sign(dx),0]:[0,Math.sign(dz)];
  const cells=new Set(cellsOf('building',data.buildings[i]).map(c=>c.join(','))),has=(x,z)=>cells.has(`${x},${z}`),out=!has(s.x+dir[0],s.z+dir[1]),side=out?dir:[-dir[0],-dir[1]];
  if(!out&&has(s.x+side[0],s.z+side[1]))throw Error('Start on a tile along an outside wall.');
  // The wall: the tiles in line with the start along that side, each with that side outside.
  const step=[Math.abs(side[1]),Math.abs(side[0])],wall=[[s.x,s.z]];for(const k of [1,-1]){let [x,z]=[s.x+step[0]*k,s.z+step[1]*k];while(has(x,z)&&!has(x+side[0],z+side[1])){wall.push([x,z]);x+=step[0]*k;z+=step[1]*k;}}
  const next=new Set(cells),added=[],removed=[];
  for(const [x,z] of wall)for(let k=out?1:0;out?k<=n:k<n;k++){const c=out?[x+side[0]*k,z+side[1]*k]:[x-side[0]*k,z-side[1]*k],id=c.join(',');if(out&&!next.has(id)){next.add(id);added.push(c);}if(!out&&next.has(id)){next.delete(id);removed.push(c);}}
  return {i,next,added,removed};}
 // A room's wall (one you drew): drag from a tile beside it, and the straight run of room wall there (its doors
 // too) moves the way you drag. Room walls meeting its ends on one side only (that room's own) stretch or
 // shrink with it. undefined when the drag doesn't start beside a room wall; null when it hasn't moved yet.
 function roomWallPlan({from,to}){const r=roomsAt(from.x,from.z);if(!r)return undefined;const dx=to.x-from.x,dz=to.z-from.z,along=Math.abs(dx)>=Math.abs(dz),n=along?Math.abs(dx):Math.abs(dz);
  const step=(c,d,k=1)=>[c[0]+d[0]*k,c[1]+d[1]*k],has=(p,q)=>roomEdge(r,p,q)>=0,s=[from.x,from.z];
  // Which wall: the one beside the start tile across the drag's line (or, before it moves, either axis).
  const dirs=n?[along?[Math.sign(dx),0]:[0,Math.sign(dz)]]:[[1,0],[0,1]];let dir=null,c=null;
  for(const d of dirs){if(has(s,step(s,d))){dir=d;c=s;break;}if(has(step(s,d,-1),s)){dir=d;c=step(s,d,-1);break;}}
  if(!c)return undefined;if(!n)return null;
  // The run: tiles c along the wall with the wall between c and c+dir.
  const perp=[Math.abs(dir[1]),Math.abs(dir[0])],run=[c];for(const k of [1,-1]){let p=step(c,perp,k);while(has(p,step(p,dir))){run.push(p);p=step(p,perp,k);}}
  run.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);
  const moves=[],add=[],remove=[],swept=[],blocked=m=>{throw Error(m);};
  for(const p of run){const a=step(p,dir,n),b=step(p,dir,n+1);if(!r.inside(a)||!r.inside(b))blocked('That runs into the building’s outside wall.');
   for(let j=1;j<n;j++)if(has(step(p,dir,j),step(p,dir,j+1)))blocked('It would cross another wall.');
   moves.push({index:roomEdge(r,p,step(p,dir)),a,b});for(let j=1;j<=n;j++)swept.push(step(p,dir,j));}
  // The ends: a wall meeting a corner on one side only (its room's) stretches (moving away) or shrinks.
  for(const [q,o] of [[run[0],[-perp[0],-perp[1]]],[run[run.length-1],perp]]){const aSide=has(q,step(q,o)),bSide=has(step(q,dir),step(step(q,dir),o));if(aSide===bSide)continue;
   for(let j=1;j<=n;j++){const t=step(q,dir,j),u=step(t,o);if(aSide){if(!has(t,u)){if(!r.inside(u))blocked('That runs into the building’s outside wall.');add.push([t,u]);}}else if(has(t,u))remove.push([t,u]);}}
  return {room:r,moves,add,remove,swept,dir,n};}
 async function moveRoomWall(p){const r=p.room,loc=c=>[c[0]-r.plan.x0,c[1]-r.plan.z0],cells=[...p.swept,...p.moves.flatMap(m=>[m.a,m.b]),...p.add.flat(),...p.remove.flat()];
  const run=new Set(p.moves.map(m=>m.index));
  if(!await change(()=>{const list=r.edit(),moved=p.moves.map(m=>({...list[m.index],a:loc(m.a),b:loc(m.b)}));
   const gone=new Set([...run,...p.remove.map(([t,u])=>roomEdge(r,t,u)),...moved.map(e=>list.findIndex((f,k)=>!run.has(k)&&pairKey(f.a,f.b)===pairKey(e.a,e.b)))].filter(k=>k>=0));
   const kept=list.filter((e,k)=>!gone.has(k));kept.push(...moved,...p.add.map(([t,u])=>({a:loc(t),b:loc(u),kind:'wall'})));list.splice(0,list.length,...kept);return cells;}))return;
  status.value=`Moved the room’s wall ${p.n} tile${p.n>1?'s':''}.`;}
 function drawRoom(){roomFill?.dispose();roomFill=null;if(!roomBox)return;let cells=[];
  if(roomBox.tool==='room')cells=tint(rectOf(roomBox.from,roomBox.to).cells,BRUSH);else{try{const p=resizePlan(roomBox);if(p?.room)cells=[...tint(p.swept,OK),...tint(p.add.flat(),OK)];else if(p)cells=[...tint(p.added,OK),...tint(p.removed,NO)];previewNote.value='';}catch(error){previewNote.value=error.message;}}
  roomFill=createCellFill({cells,heightAt,parent:overlayParent(),opacity:.45});}
 async function roomDrag(phase,tile){
  if(phase==='start'){roomBox={from:tile,to:tile,tool:tool.peek()};clearPreview();drawRoom();return;}
  if(phase==='move'&&roomBox){if(tile&&(tile.x!==roomBox.to.x||tile.z!==roomBox.to.z)){roomBox.to=tile;drawRoom();}return;}
  if(phase!=='end'||!roomBox)return;const box=roomBox;roomBox=null;drawRoom();
  try{if(box.tool==='room')await makeRoom(box.from,box.to);else await pushWall(box);}catch(error){status.value=error.message;}}
 async function pushWall(box){const p=resizePlan(box);if(!p)return;if(p.room)return moveRoomWall(p);if(!p.added.length&&!p.removed.length)throw Error('Nothing to move there.');
  draft.value=new Set(p.next);draftFor=p.i;try{await buildDraft();}finally{if(draftFor===p.i)clearDraft();}
  status.value=`${nameOf('building',data.buildings[p.i])}: ${p.added.length?`pushed out by ${p.added.length} tile${p.added.length>1?'s':''}`:`pulled in by ${p.removed.length} tile${p.removed.length>1?'s':''}`}.`;}
 async function makeRoom(a,b){const r=rectOf(a,b),tiles=r.cells.map(([x,z])=>at(x,z));if(r.cells.length<4)throw Error('Drag out a room (at least 2 × 2).');if(tiles.some(t=>!t))throw Error('The room runs off the map.');const here=floorHere.peek();
  // Open ground: a new building.
  if(!here&&tiles.every(t=>t.building===undefined&&!t.indoor)){draft.value=new Set(r.cells.map(c=>c.join(',')));draftFor=null;try{await buildDraft();}finally{if(draft.peek().size)clearDraft();}return;}
  const i=tiles[0].building,inside=here?t=>!!t?.indoor:t=>t?.building===i;
  if(!(here?tiles.every(t=>t.indoor):i!==undefined&&inPlaceAt(tiles[0].x,tiles[0].z)!==null&&tiles.every(inside)))throw Error(here?'Keep the room on this floor.':'A room goes on open ground (a new building) or inside one building.');
  // Its sides, as straight runs of edges whose far tile is inside too (the building's own walls are already there).
  const sides=[];for(const [cells,out] of [[r.cells.filter(c=>c[1]===r.z0),[0,-1]],[r.cells.filter(c=>c[1]===r.z1),[0,1]],[r.cells.filter(c=>c[0]===r.x0),[-1,0]],[r.cells.filter(c=>c[0]===r.x1),[1,0]]]){let run=[];
   for(const c of cells){const q=[c[0]+out[0],c[1]+out[1]];if(inside(at(...q)))run.push([c,q]);else{if(run.length)sides.push(run);run=[];}}if(run.length)sides.push(run);}
  const pairs=sides.flat();if(!pairs.length)throw Error('That’s the whole building: draw a smaller room inside it.');
  const longest=sides.filter(s=>s.length>=3).sort((p,q)=>q.length-p.length)[0],door=longest?longest[Math.floor(longest.length/2)]:null;
  const same=(e,[p,q])=>[e.a,e.b].map(String).sort().join('|')===[p,q].map(String).sort().join('|');
  // On a floor, that floor's walls; on the map, the building's own (they move with it).
  const plan=planOf(here?hereOwner():i),loc=c=>[c[0]-plan.x0,c[1]-plan.z0],list=here?(floorAt(hereOwner(),here.level).edges??=[]):(data.buildings[i].edges??=[]);
  if(await change(()=>{for(const pr of pairs){const lp=[loc(pr[0]),loc(pr[1])];for(let k=list.length-1;k>=0;k--)if(same(list[k],lp))list.splice(k,1);list.push({a:lp[0],b:lp[1],kind:pr===door?'door':'wall'});}return pairs.flat();}))
   status.value=`A room ${r.x1-r.x0+1} × ${r.z1-r.z0+1}${door?' with a door':' (no side long enough for a door: add one with Walls or Edge)'}.`;}
 // Drags (docs/TOWN.md, Lines and brushes): Select draws a box; Edge lays a fence (or wall, railing…) along
 // a straight row; Ramp slopes the ground from where the drag starts to where it ends; a brush in Line
 // shape paints a straight line; any other brush paints as you drag.
 let line=null,lineFill=null;
 function drawLine(){lineFill?.dispose();lineFill=null;if(!line)return;const seen=new Set(),cells=[];for(const p of lineTiles(line.from,line.to))for(const [a,b] of tool.peek()==='edge'?[[p.x,p.z]]:brushTiles(p.x,p.z)){const k=`${a},${b}`;if(seen.has(k))continue;seen.add(k);cells.push({x:a,z:b,color:BRUSH});}
  lineFill=createCellFill({cells,heightAt,parent:overlayParent(),opacity:.4});}
 async function drag(phase,tile,actor,point){
  if(HAND_TOOLS.includes(tool.peek()))return boxSelect(phase,tile,actor,point);
  if(tool.peek()==='room'||tool.peek()==='resize')return roomDrag(phase,tile);
  const lineTool=tool.peek()==='edge'||tool.peek()==='ramp'||options.brushShape.peek()==='line'&&['raise','lower','flatten','smooth','ramps','nature','surface'].includes(tool.peek());
  if(!lineTool)return paint(phase,tile);
  if(phase==='start'){line={from:tile,to:tile};clearPreview();drawLine();return;}
  if(phase==='move'&&line){if(tile&&(tile.x!==line.to.x||tile.z!==line.to.z)){line.to=tile;drawLine();}return;}
  if(phase!=='end'||!line)return;const l=line;line=null;drawLine();
  if(tool.peek()==='edge'){if(l.from.x===l.to.x&&l.from.z===l.to.z)return click(l.from);
   // A fence line keeps to the row or column the drag mostly follows.
   const along=Math.abs(l.to.x-l.from.x)>=Math.abs(l.to.z-l.from.z),end=along?{x:l.to.x,z:l.from.z}:{x:l.from.x,z:l.to.z},[dx,dz]=DIRS[options.side.peek()],kind=options.edge.peek(),tiles=lineTiles(l.from,end);
   const here=floorHere.peek(),owner=hereOwner(),plan=here?planOf(owner):null,list=here?(floorAt(owner,here.level).edges??=[]):data.edges,loc=([x,z])=>plan?[x-plan.x0,z-plan.z0]:[x,z];
   const pairs=tiles.map(p=>[loc([p.x,p.z]),loc([p.x+dx,p.z+dz])]),same=(e,[a,b])=>[e.a,e.b].map(String).sort().join('|')===[a,b].map(String).sort().join('|');
   if(await change(()=>{for(const pr of pairs){for(let i=list.length-1;i>=0;i--)if(same(list[i],pr))list.splice(i,1);if(kind!=='none')list.push({a:pr[0],b:pr[1],kind});}return tiles.flatMap(p=>[[p.x,p.z],[p.x+dx,p.z+dz]]);}))
    status.value=kind==='none'?`Removed ${tiles.length} edges.`:`A ${kind} line, ${tiles.length} tiles long.`;return;}
  if(tool.peek()==='ramp'){const ha=at(l.from.x,l.from.z)?.h,hb=at(l.to.x,l.to.z)?.h;if(ha===undefined||hb===undefined)return;const tiles=lineTiles(l.from,l.to),cells=[];
   if(await change(()=>{for(const p of tiles){const target=Math.round((ha+(hb-ha)*p.t)*2)/2;for(const [a,b] of brushTiles(p.x,p.z)){if(!at(a,b))continue;setHeight(a,b,target);cells.push([a,b]);}}return cells;})){
    const steep=Math.abs(hb-ha)/Math.max(1,tiles.length-1)>.5;status.value=`A ramp from ${ha} to ${hb} over ${tiles.length} tiles${steep?': too steep to walk (more than half a block a tile); drag it longer.':'.'}`;}return;}
  // A brush in Line shape: one stroke along the line.
  paint('start',l.from);for(const p of lineTiles(l.from,l.to).slice(1))paintAt(p);await paint('end',l.to);}
 function flushStroke(s=stroke){if(!s?.pending.length)return rebuilding||Promise.resolve();const cells=s.pending;s.pending=[];return rebuild({dirty:chunksAround(cells)});}
 function brushTiles(x,z){const r=(Number(brush.peek())-1)/2|0,out=[];for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)out.push([x+dx,z+dz]);return out;}
 // A world click in Edit mode applies the tool; in Play mode the game handles it.
 // Floors by hand (docs/CITY.md, Floors; spaces.js): a building's floors by level (−1 a cellar, 0 the
 // ground, 1… above), each its own data: shape, material, inside walls, furniture and the flight up.
 // Edits inside a floor rebuild only that building's floors, and you stay where you are.
 // An owner is a building's index or {dungeon: id} (dungeons and caves by hand: levels −1, −2…, no building).
 const isDungeon=o=>o?.dungeon!==undefined,ownerEntry=o=>isDungeon(o)?data.interiors?.[o.dungeon]:data.buildings[o];
 const LEVEL_NAME=(l,o=ownerHere())=>isDungeon(o)?`Level ${-l}`:l<0?'Cellar':l===0?'Ground floor':`Floor ${l+1}`;
 const ON_LEVEL=(l,o=ownerHere())=>isDungeon(o)?`on level ${-l}`:l<0?'in the cellar':l===0?'on the ground floor':`on floor ${l+1}`;
 const floorsOf=o=>ownerEntry(o)?.floors||[];
 const floorAt=(o,level)=>{const list=ownerEntry(o).floors??=[];let f=list.find(e=>e.level===level);if(!f){f={level};list.push(f);}return f;};
 // A dungeon has no building: its plan is its top level's shape at the origin.
 const planOf=o=>isDungeon(o)?{x0:0,z0:0,tiles:(floorsOf(o).find(f=>f.level===-1)?.cells||[]).map(c=>[...c]),edges:[],doors:[],anchors:{}}:planBuilding(data.buildings[o].desc,[data.buildings[o].x,data.buildings[o].z]);
 const localOf=(o,x,z)=>{const p=planOf(o);return [x-p.x0,z-p.z0];};
 const hereOwner=()=>{const h=floorHere.peek();return !h?null:h.dungeon!==undefined?{dungeon:h.dungeon}:h.building;};
 let pendingFlight=null;
 // Buildings whose floors changed while you were inside one: their map chunks rebuild when you step out.
 const staleBuildings=new Set();
 async function changeFloor(apply,label){const owner=hereOwner();snapshot();if(owner!==null&&!isDungeon(owner))staleBuildings.add(owner);
  try{apply();}catch(error){undo.pop();history.value={undo:undo.length,redo:redo.length};status.value=error.message;return false;}
  if(owner!==null)host.rebuildFloors(owner);revision.value++;refreshPreview();if(label)status.value=typeof label==='function'?label():label;return true;}
 // A floor's tiles (world) for furnishing: its shape, minus its stairs and their fronts.
 function furnishFloor(i,level){const b=ownerEntry(i),plan=planOf(i),f=floorAt(i,level),levels=new Map(floorLevels(b).map(e=>[e.level,e]));
  const world=([dx,dz])=>[plan.x0+dx,plan.z0+dz],shape=(f.cells?.length?f.cells.map(world):plan.tiles);
  const flights=[f.up,levels.get(level-1)?.up].filter(Boolean).map(flightOf),keep=flights.flatMap(fl=>[fl.bottom,fl.top,fl.front,fl.landing]).map(world);
  const doors=level===0?plan.doors.map(d=>({inside:d.inside,out:d.out})):flights.map(fl=>({inside:world(fl.front),out:[0,0]}));
  const use=f.use||(isDungeon(i)?'crypt':level===0?furnishingUse(b.desc):level<0?'warehouse':upstairsUse(furnishingUse(b.desc)||'home'))||'home';
  const layout=furnishRoom({tiles:shape,doors,keeper:level===0&&!isDungeon(i)?plan.anchors.keeper:null,keep},use,((b.desc?.seed)??7)*31+level+(f.roll??0)*97);
  return layout.map(p=>({kind:p.kind,at:[p.x-plan.x0,p.z-plan.z0],rotation:p.rotation||0}));}
 const ownerHere=()=>hereOwner()??(selection.peek()?.kind==='building'?selection.peek().index:null);
 // Clicks on a floor: furniture (Prop), Erase, inside walls and doors (Edge), the floor's shape (Footprint), its
 // material (Surface), and the flight up (Place stairs up).
 async function floorClick(tile){const here=floorHere.peek(),i=hereOwner(),f=floorAt(i,here.level),[lx,lz]=localOf(i,tile.x,tile.z),o=Object.fromEntries(Object.entries(options).map(([k,v])=>[k,v.peek()]));
  switch(tool.peek()){
   case 'inspect':status.value=`${LEVEL_NAME(here.level)} · ${lx},${lz} · ${tile.surface}${tile.blocked?' · solid':''}`;return;
   case 'prop':{const [px,pz]=wallAim?.at||[tile.x,tile.z],[w,d]=propFootprint(o.prop,+o.rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push(at(px+a,pz+b));
    if(cells.some(c=>!c||!c.indoor||c.blocked))throw Error('No room for it here.');const [ax,az]=localOf(i,px,pz);
    await changeFloor(()=>{(f.furniture??=[]).push({kind:o.prop,at:[ax,az],rotation:+o.rotation});},`${PROPS[o.prop].name} ${ON_LEVEL(here.level)}.`);return;}
   case 'erase':{const list=f.furniture||[],hit=list.findIndex(p=>{const [w,d]=propFootprint(p.kind,p.rotation||0);return lx>=p.at[0]&&lx<p.at[0]+w&&lz>=p.at[1]&&lz<p.at[1]+d;});
    if(hit>=0){await changeFloor(()=>{list.splice(hit,1);},'Removed.');return;}
    const edge=(f.edges||[]).findIndex(e=>e.a[0]===lx&&e.a[1]===lz||e.b[0]===lx&&e.b[1]===lz);if(edge>=0){await changeFloor(()=>{f.edges.splice(edge,1);},'Removed the wall.');return;}
    throw Error('Nothing to erase here.');}
   case 'edge':{const [dx,dz]=DIRS[o.side],b=[lx+dx,lz+dz],same=e=>[e.a,e.b].map(String).sort().join('|')===[[lx,lz],b].map(String).sort().join('|');
    await changeFloor(()=>{f.edges=(f.edges||[]).filter(e=>!same(e));if(o.edge!=='none')f.edges.push({a:[lx,lz],b,kind:o.edge});},o.edge==='none'?'Wall removed.':`${o.edge} placed.`);return;}
   case 'stairs':await setFlight(i,flightFrom(i,here.level,o.flight).level,tile);return;
   case 'surface':if(o.surface==='water')throw Error('Water is for the land, not floors.');await changeFloor(()=>{f.surface=o.surface==='land'?undefined:o.surface;},`Floor: ${o.surface}.`);return;
   // A floor's shape may be any size (paint onto the solid ring around it to grow it); one bigger than the
   // floor below is a warning in the checks, and underground floors aren't limited.
   case 'footprint':{const plan=planOf(i),foot=plan.tiles.map(([x,z])=>[x-plan.x0,z-plan.z0]),cells=new Set((f.cells?.length?f.cells:foot).map(c=>c.join(','))),k=`${lx},${lz}`;
    await changeFloor(()=>{if(o.draftMode==='add')cells.add(k);else cells.delete(k);f.cells=[...cells].map(c=>c.split(',').map(Number));if(f.cells.length===foot.length)delete f.cells;},`${LEVEL_NAME(here.level)}: ${cells.size} tiles.`);return;}
  }
  throw Error('On a floor: Inspect, Prop, Room, Edge, Stairs, Footprint, Surface and Erase work (and the Floors panel).');}
 // Levels (docs/TOWN.md, Decorating indoors): Page Up / Page Down, or the bar's ▲ and ▼, go up and down. Which
 // building: the one you're in, the selected one, the one under the pointer (the keys only: on the way to the bar
 // the pointer crosses others), the one in the middle of the view,
 // or else the nearest one to the middle of the view that has a floor that way (going down, a dungeon's entrance
 // counts too). Nothing needs selecting first.
 const LEVEL_REACH=16;
 const levelsOf=o=>new Set([0,...floorsOf(o).map(f=>f.level)]);
 function levelOwner(dir=0,pointer=false){const h=hereOwner();if(h!==null)return h;const sel=selection.peek();if(sel?.kind==='building')return sel.index;if(sel?.kind==='furniture'&&sel.owner!==undefined)return sel.owner;if(sel?.kind==='flight')return sel.owner;
  const building=t=>t?.building!==undefined&&data.buildings[t.building]?t.building:null,hovered=pointer?building(hoverAt&&at(hoverAt.x,hoverAt.z)):null;if(hovered!==null)return hovered;
  const view=host.viewTile?.(),centre=building(view&&at(view.x,view.z));if(centre!==null)return centre;
  if(view){const gap=(x0,z0,x1,z1)=>Math.max(0,x0-view.x,view.x-x1)+Math.max(0,z0-view.z,view.z-z1),near=[];
   data.buildings.forEach((b,i)=>{if(!dir||!levelsOf(i).has(dir))return;let cells;try{cells=cellsOf('building',b);}catch{return;}const xs=cells.map(c=>c[0]),zs=cells.map(c=>c[1]);near.push({o:i,d:gap(Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs))});});
   if(dir<0)for(const p of data.props||[])if(p.kind==='dungeonEntrance'&&data.interiors?.[p.link]?.floors)near.push({o:{dungeon:p.link},d:gap(p.x,p.z,p.x+1,p.z+1)});
   const best=near.filter(n=>n.d<=LEVEL_REACH).sort((a,c)=>a.d-c.d)[0];if(best)return best.o;}
  return null;}
 // The view moves onto a building's (or dungeon level's) tiles when it isn't over them already.
 function focusOn(o,level){let cells;
  // Out of a dungeon: its entrance on the map.
  if(isDungeon(o)&&level===0){const p=(data.props||[]).find(q=>q.kind==='dungeonEntrance'&&q.link===o.dungeon);if(p)host.lookAt?.(p.x,p.z);return;}
  try{cells=isDungeon(o)?(floorsOf(o).find(f=>f.level===level)?.cells||[]):cellsOf('building',ownerEntry(o));}catch{return;}if(!cells.length)return;
  const view=host.viewTile?.();if(view&&cells.some(([x,z])=>x===view.x&&z===view.z))return;
  const xs=cells.map(c=>c[0]),zs=cells.map(c=>c[1]);host.lookAt?.(Math.round((Math.min(...xs)+Math.max(...xs))/2),Math.round((Math.min(...zs)+Math.max(...zs))/2));}
 const ownerName=o=>isDungeon(o)?ownerEntry(o)?.name||'The dungeon':ownerEntry(o)?.desc?.name||'The building';
 function goLevel(dir,{pointer=false}={}){const o=levelOwner(dir,pointer);if(o===null)throw Error(dir>0?'No building with a floor above near the view: pan to one.':'No cellar or dungeon near the view: pan to one.');
  const now=floorHere.peek()?.level??0,next=now+dir;
  if(!levelsOf(o).has(next))throw Error(dir>0?`${ownerName(o)} has no floor above: select it and Add floor above.`:`${ownerName(o)} has nothing below.`);
  if(holding()||heldDoor||pendingFlight)cancel();
  const ok=next===0&&(isDungeon(o)||ownerEntry(o).desc?.interior!=='separate')?host.leaveFloor?.():host.enterFloor?.(o,next);
  if(ok)focusOn(o,next);
  status.value=ok?(next===0?(isDungeon(o)?`Out of ${ownerName(o)}.`:`${ownerName(o)}: ground floor.`):`${ownerName(o)}: ${LEVEL_NAME(next,o).toLowerCase()}.`):'No way there yet: place the stairs to it.';}
 // Stairs between floors (docs/CITY.md, Floors): a flight belongs to the floor it rises from (that floor's `up`),
 // its bottom step where you click, rising the Stairs tool's “Up towards” way (, and . turn it). Stairs down from
 // a floor are the flight up from the floor below, on the same two tiles.
 const hasLevel=(o,level)=>floorsOf(o).some(f=>f.level===level)||level===0&&!isDungeon(o);
 // A floor's shape (local "x,z" keys): its own cells, or the building's footprint.
 const floorShape=(o,level)=>{const f=floorsOf(o).find(e=>e.level===level),plan=planOf(o);return new Set((f?.cells?.length?f.cells:plan.tiles.map(([x,z])=>[x-plan.x0,z-plan.z0])).map(c=>c.join(',')));};
 // Which flight the Stairs tool means from floor `here`: {level (the floor it rises from), view: 'up' | 'down'}.
 function flightFrom(o,here,way){
  if(way==='down'){if(!hasLevel(o,here-1))throw Error(isDungeon(o)?'No level below: add one in the Floors panel first.':here===0?'No cellar: add one in the Floors panel first.':'Nothing below.');return {level:here-1,view:'down'};}
  if(!hasLevel(o,here+1)&&!(isDungeon(o)&&here===-1))throw Error(!isDungeon(o)&&here+1>(ownerEntry(o).desc?.storeys||1)-1?`No floor above: raise ${ownerEntry(o).desc?.name||'the building'}’s storeys, then Add floor above.`:'No floor above: Add floor above first (Floors panel).');
  return {level:here,view:'up'};}
 // The flight the Stairs tool would put down: its `up` entry (a ladder carries kind).
 const flightEntry=(at,dir)=>({at,dir,...options.flightKind.peek()==='ladder'?{kind:'ladder'}:{}});
 // Why the flight up from `level` can't go there (`up`: {at, dir, kind}), or null: its steps on both floors it
 // joins, the tile in front of the foot on its own floor and the landing at the top on the floor above, all clear
 // of the other stairs on those floors.
 function flightRefused(o,level,up){const fl=flightOf(up),k=c=>c.join(','),own=floorShape(o,level),next=hasLevel(o,level+1)?floorShape(o,level+1):null,levels=floorsOf(o),what=fl.ladder?'The ladder':'The stairs';
  if(![fl.bottom,fl.top].every(c=>own.has(k(c))))return `${what} must be on ${LEVEL_NAME(level,o).toLowerCase()}.`;
  if(!own.has(k(fl.front)))return `${what} need room to stand at the foot.`;
  if(next&&![fl.bottom,fl.top].every(c=>next.has(k(c))))return `${what} must be under ${LEVEL_NAME(level+1,o).toLowerCase()} too.`;
  if(next&&!next.has(k(fl.landing)))return `${what} need room to step off at the top, on ${LEVEL_NAME(level+1,o).toLowerCase()}.`;
  const below=levels.find(f=>f.level===level-1)?.up,above=levels.find(f=>f.level===level+1)?.up,here=new Set([fl.bottom,fl.top,fl.front].map(k)),upstairs=new Set([fl.bottom,fl.top,fl.landing].map(k));
  // Furniture in the way, on either floor.
  const furnished=lv=>{const out=new Set();for(const p of floorsOf(o).find(f=>f.level===lv)?.furniture||[]){const [w,d]=propFootprint(p.kind,p.rotation||0);for(let b=0;b<d;b++)for(let a=0;a<w;a++)out.add(k([p.at[0]+a,p.at[1]+b]));}return out;};
  if([...here].some(c=>furnished(level).has(c)))return 'There’s furniture in the way: move it first.';
  if(next&&[...upstairs].some(c=>furnished(level+1).has(c)))return `There’s furniture in the way on ${LEVEL_NAME(level+1,o).toLowerCase()}.`;
  // On this floor: the opening down (and its landing); upstairs, that floor's own flight (and its foot).
  if(below){const b=flightOf(below);if([b.bottom,b.top,b.landing].some(c=>here.has(k(c))))return 'That’s on the way down.';}
  if(above&&next){const a=flightOf(above);if([a.bottom,a.top,a.front].some(c=>upstairs.has(k(c))))return `That’s on ${LEVEL_NAME(level+1,o).toLowerCase()}’s way up.`;}
  return null;}
 // The preview of a flight: its tiles (and the tile you stand on to use it, kept clear) and its ghost.
 function flightPreview(o,level,view,x,z){const up=flightEntry(localOf(o,x,z),options.dir.peek()),refused=flightRefused(o,level,up),fl=flightOf(up),plan=planOf(o),w=([a,b])=>[plan.x0+a,plan.z0+b];
  return {cells:[...tint([...new Set([fl.bottom,fl.top].map(String))].map(c=>w(c.split(',').map(Number))),refused?NO:OK),...tint([w(view==='up'?fl.front:fl.landing)],refused?NO:BRUSH)],refused,ghosts:[{kind:'flight',entry:{bottom:w(fl.bottom),top:w(fl.top),dir:fl.dir,ladder:fl.ladder,view}}]};}
 function stairsPreview(o,here,x,z){try{const {level,view}=flightFrom(o,here,options.flight.peek());return flightPreview(o,level,view,x,z);}catch(error){return {cells:tint([[x,z]],NO),refused:error.message};}}
 const flightSaid=(o,level,up)=>{const what=up?.kind==='ladder'?'A ladder':'Stairs';return isDungeon(o)&&level===-1?`${what} up to the entrance.`:`${what} from ${LEVEL_NAME(level,o).toLowerCase()} up to ${LEVEL_NAME(level+1,o).toLowerCase()}.`;};
 // Puts the flight up from `level` with its bottom step on a tile (world); it replaces the one there was.
 async function setFlight(o,level,tile){const up=flightEntry(localOf(o,tile.x,tile.z),options.dir.peek()),refused=flightRefused(o,level,up);if(refused)throw Error(refused);
  const apply=()=>{floorAt(o,level).up=up;};
  if(floorHere.peek())return changeFloor(apply,flightSaid(o,level,up));
  if(isDungeon(o))throw Error('Go into it first.');
  const b=data.buildings[o];if(await change(()=>{apply();return cellsOf('building',b);},cellsOf('building',b))){status.value=flightSaid(o,level,up);return true;}return false;}
 async function placeFlight(tile){const {building:o,level}=pendingFlight;pendingFlight=null;return setFlight(o,level,tile);}
 // Something is selected (or nothing, on empty ground): its outline, its tab brought forward (Select stays the
 // tool) and a status line.
 function selectThing(sel,x,z){selection.value=sel;moving.value=false;showSelection();const entry=entryOf(sel);
  if(entry&&HOME_GROUP[sel.kind])toolGroup.value=HOME_GROUP[sel.kind];
  status.value=entry?`Selected ${nameOf(sel.kind,entry)}: click it again, or drag it, to move it.`:x!==undefined?describe(x,z):'';}
 // What grew on a tile and isn't placed: a selection that writes nothing yet.
 const grownAt=(x,z)=>{if(floorHere.peek()||!data.land)return null;const n=natureAt(x,z),e=n.resource||n.cover;return e&&!e.placed?{kind:'grown',x,z}:null;};
 function actorsBuildingSelected(actor){const sel=selection.peek();if(sel?.kind!=='building')return false;const tiles=actor.kind==='door'?[actor.a,actor.b]:[actor.tile];return tiles.some(t=>t&&at(t.x,t.z)?.building===sel.index);}
 async function click(tile,point=null,actor=null){if(problemMarks.length)clearProblem();
  // A door into a building, or a stairwell: Inspect and Select follow it (docs/CITY.md, Floors).
  // The Hand lifts a door or a floor's stairs; Inspect goes through doors and up and down stairs.
  // On the map, a building's door or stairs lift once that building is selected (the first click selects it).
  // Select: a door is selected (a second click lifts it); stairs are picked by their tiles (pickAt).
  if(mode.peek()==='edit'&&tool.peek()==='select'&&actor?.kind==='door'&&!holding()&&!heldDoor&&!pendingFlight){const sel={kind:'door',actor};if(sameSel(selection.peek(),sel))liftDoor(actor);else selectThing(sel);return true;}
  if(mode.peek()==='edit'&&tool.peek()==='deco'&&actor&&!holding()&&!heldDoor&&!pendingFlight&&(floorHere.peek()||actorsBuildingSelected(actor))){if(actor.kind==='door'&&liftDoor(actor))return true;if(actor.kind==='stairwell'&&liftFlight(actor))return true;}
  if(mode.peek()==='edit'&&actor?.link&&tool.peek()==='inspect'){status.value=host.enterLink?.(actor.link)?`Through the ${actor.kind==='stairwell'?'stairs':'door'}.`:'Can’t go that way.';return true;}
  if(mode.peek()==='edit'&&pendingEntrance&&!floorHere.peek()){await placeEntrance(tile).catch(error=>{status.value=error.message;});return true;}
  if(mode.peek()==='edit'&&pendingFlight){const keep=pendingFlight;const ok=await placeFlight(tile).catch(error=>{status.value=error.message;return false;});if(!ok){pendingFlight=keep;refreshPreview();}return true;}
  if(mode.peek()==='edit'&&floorHere.peek()&&!['select','deco','design','eyedropper','floorpaint','wallpaint'].includes(tool.peek())){await floorClick(tile).catch(error=>{status.value=error.message;});return true;}
  if(mode.peek()!=='edit')return false;
  // Drawing a patrol route: each click adds a stop (docs/TOWN.md, Townsfolk tool).
  if(patrolling&&personOf()){const p=personOf(),{x:px,z:pz}=tile;await setPerson(e=>{(e.patrol??=[]).push([px,pz]);if(!e.routine.some(r=>r.do==='patrol'))e.routine.push({do:'patrol',weight:3});},`patrol stop ${p.patrol?.length+1||1} at ${px},${pz}`);return true;}
  const {x,z}=tile,o=Object.fromEntries(Object.entries(options).map(([k,s])=>[k,s.peek()])),rotation=+o.rotation;
  switch(tool.peek()){
   case 'inspect':status.value=describe(x,z);break;
   case 'walls':await setWall(tile,point).catch(error=>{status.value=error.message;});break;
   // The Hand: put down what you hold, or lift what you click (a box-selected group lifts as one when you
   // click inside it). Colours selects without lifting.
   case 'select':case 'deco':case 'design':{
    if(heldDoor){await (heldDoor.room?dropRoomDoor:dropDoor)(tile,point);break;}
    if(HAND_TOOLS.includes(tool.peek())&&holding()){await drop(tile);break;}
    const group=selection.peek()?.kind==='group'&&cellsOf('group',selection.peek()).some(([a,b])=>a===x&&b===z)?selection.peek():null;
    const before=selection.peek();let hit=group||pickAt(x,z);moving.value=false;
    // Select (user, 2026-10-16): a click selects and writes nothing (what grew or was furnished becomes yours on its
    // first edit); a second click on what's selected lifts it. Empty ground deselects and names the tile.
    if(tool.peek()==='select'){if(!hit)hit=grownAt(x,z);
     if(hit&&(hit===group||sameSel(before,hit))){liftSelection(await real(),tile);break;}
     selectThing(hit,x,z);break;}
    // The game's own furnishing: placed first (one undo step), then it's yours to lift or recolour.
    if(hit?.kind==='furnished'){if(!await adoptFurniture(hit.owner))break;hit=pickAt(x,z);}
    // Nothing placed here: a tree, resource or cover that grew here becomes the map's own to move or delete.
    if(!hit&&!floorHere.peek()&&data.land&&(natureAt(x,z).resource||natureAt(x,z).cover))await change(()=>{hit=adopt(x,z);return [[x,z]];});
    selection.value=hit;showSelection();
    // A click selects; a second click on what's selected (or a box-selected group) lifts it (user, 2026-10-16).
    if(hit&&HAND_TOOLS.includes(tool.peek())&&(hit===group||sameSel(before,hit)))lift(hit,tile);
    else{const entry=entryOf(hit);status.value=entry?`Selected ${nameOf(hit.kind,entry)}${HAND_TOOLS.includes(tool.peek())?': click it again, or drag it, to move it':''}.`:describe(x,z);}
    break;}
   // The eyedropper: a copy of what you click, colours and all, in your hand.
   case 'floorpaint':case 'wallpaint':await paintRoom(tile,point,tool.peek()==='floorpaint'?'floor':'walls').catch(error=>{status.value=error.message;});break;
   case 'eyedropper':{let hit=pickAt(x,z),kind=null,entry=null;if(hit?.kind==='furnished'){if(!await adoptFurniture(hit.owner))break;hit=pickAt(x,z);}
    // A ground floor's furniture copies as a prop: it becomes furniture wherever it's put down indoors.
    if(hit?.kind==='furniture'&&!floorHere.peek()){const e=entryOf(hit);kind='prop';entry={kind:e.kind,x,z,rotation:e.rotation||0,...e.colors?{colors:{...e.colors}}:{}};}
    else if(hit){kind=hit.kind;entry=structuredClone(entryOf(hit));if(kind==='crystal'){entry.id=uniqueCrystalId(entry.id);entry.name=`${entry.name||'Iter Crystal'} copy`;entry.known=false;}if(kind==='building')entry.desc.name=`${entry.desc.name||'Building'} copy`;if(kind==='townsfolk')entry.id=uniqueFolkId(entry.id||entry.name||'townsfolk');}
    else if(!floorHere.peek()&&data.land){const n=natureAt(x,z);if(n.resource){kind='resource';entry=n.resource.kind==='tree'?{kind:'tree',species:n.resource.species,x,z}:{kind:n.resource.kind,x,z};}else if(n.cover){kind='cover';entry={kind:n.cover.kind,x,z};}}
    if(!entry){status.value='Nothing to copy here.';break;}
    hold(kind,entry);status.value=`Copied ${nameOf(kind,entry)}: click where it goes (Shift-click places more; Esc to stop).`;break;}
   // Brushes: a click is a one-tile stroke (dragging paints; see paint()).
   case 'raise':case 'lower':case 'flatten':case 'nature':case 'ramps':case 'surface':case 'footprint':case 'biome':await paint('start',tile);await paint('end',tile);break;
   case 'building':if(await change(()=>{const desc={...structuredClone(BUILDING_PRESETS[o.preset]),rotation};delete desc.name;desc.name=`${BUILDING_PRESETS[o.preset].name} ${data.buildings.length+1}`;const cells=planBuilding(desc,[x,z]).tiles;oneChunk(cells);taken(cells);data.buildings.push({x,z,desc});return cells;}))status.value=`Placed ${BUILDING_PRESETS[o.preset].name} at ${x},${z}.`;break;
   case 'prop':{const [px,pz]=wallAim?.at||[x,z];if(await change(()=>{const [w,d]=propFootprint(o.prop,rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push([px+a,pz+b]);taken(cells,[],o.prop);data.props.push({kind:o.prop,x:px,z:pz,rotation});return cells;}))status.value=`Placed ${PROPS[o.prop].name} at ${px},${pz}.`;break;}
   // Inside an open building the Stairs tool joins its floors; outside it climbs the land.
   case 'stairs':if(inPlaceAt(x,z)!==null){const i=inPlaceAt(x,z);await setFlight(i,flightFrom(i,0,o.flight).level,tile).catch(error=>{status.value=error.message;});break;}
    await change(()=>{const s={x,z,dir:o.dir,length:+o.length,width:+o.width};data.stairs.push(s);return stairCells(s);});status.value=`Stairs from ${x},${z}, going up ${SIDE_LABELS[o.dir].toLowerCase()}.`;break;
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
   // Clicking someone already there selects them (their panel opens); anywhere else places a new townsfolk,
   // selected so their panel opens to set them up.
   case 'townsfolk':{const there=(data.townsfolk||[]).findIndex(f=>f.home&&f.home[0]===x&&f.home[1]===z);
    if(there>=0){selection.value={kind:'townsfolk',index:there};showSelection();status.value=`${data.townsfolk[there].name||'Townsfolk'}: change them in the panel, or click open ground to place someone new.`;break;}
    const n=(data.townsfolk||[]).length+1,person={id:uniqueFolkId('townsfolk'),name:`Townsfolk ${n}`,look:{color:FOLK_COLOURS[n%FOLK_COLOURS.length]},home:[x,z],routine:[{do:'stroll',weight:2},{do:'chat',weight:1},{do:'gaze',weight:1}],pace:1};
    if(await change(()=>{const cells=validate('townsfolk',person,[]);lists().townsfolk.push(person);return cells;})){selection.value={kind:'townsfolk',index:data.townsfolk.length-1};showSelection();status.value=`${person.name} lives at ${x},${z}. Set them up in the Townsfolk panel.`;}break;}
   case 'stamp':{const st=stampOf(chosenStamp.peek());if(!st){status.value='Pick a stamp first.';break;}if(await applyStamp(st,x,z))status.value=`Stamped ${st.name||chosenStamp.peek()} at ${x},${z}.`;break;}
   case 'spawn':await change(()=>{data.spawn=[x,z];return [];});status.value=`Arrival at ${x},${z}.`;break;
   case 'enemy':{const spawn={enemy:o.enemyKind,aggressive:o.enemyMood==='aggressive',respawn:+o.enemyRespawn,x,z};
    if(await change(()=>{const cells=validate('enemy',spawn,[]);lists().enemy.push(spawn);return cells;}))status.value=`${nameOf('enemy',spawn)} spawns at ${x},${z}.`;break;}
   // A new Iter Crystal (docs/TOWN.md, Iter Crystals): a unique id and a name to change in its panel (the Hand).
   case 'crystal':{const there=mapCrystals(data).findIndex(c=>crystalCells(c).some(([a,b])=>a===x&&b===z));
    if(there>=0){selection.value={kind:'crystal',index:there};showSelection();status.value=`${mapCrystals(data)[there].name}: name it in the panel, or click open ground for a new one.`;break;}
    const entry={id:uniqueCrystalId('crystal'),name:'New crystal',x,z};if(await change(()=>{const cells=validate('crystal',entry,[]);lists().crystal.push(entry);return cells;})){selection.value={kind:'crystal',index:lists().crystal.length-1};showSelection();status.value=`${entry.name} (${entry.id}) at ${x},${z}: name it in the panel.`;}break;}
  }
  return true;
 }
 // at: where to put the player (the tile they stand on, when the editor opens on the map they're in).
 async function load(next,{at=null}={}){data=next;unsaved.value=false;undo.length=0;redo.length=0;history.value={undo:0,redo:0};selection.value=null;placing=null;moving.value=false;draft.value=new Set();draftFor=null;
  const listed=catalogue.find(c=>c.mapId===data.id);if(listed)choice.value=listed.id;
  if(rebuilding)await rebuilding;built=await host.editMap(data,{keepPlayer:false,at});scheduleChecks(0);showGrid();showSelection();showDraft();showBiomes();revision.value++;status.value=`Editing ${data.name} (${data.size.join(' × ')}).`;}
 // Undo and redo: the saved state replaces the data in place (the map being edited stays the same
 // object), and only what differs between the two states rebuilds (whole when the map's size or land
 // settings differ).
 async function step(from,to){if(!from.length)return;endWallTrial();paintedFloor.value=null;liveKey=null;clearTimeout(liveTimer);unsaved.value=true;to.push(JSON.stringify(packMap(data)));const next=unpackMap(JSON.parse(from.pop())),diff=differences(unpackMap(data),next);
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
   for(const layer of ['heights','offsets','surfaces','ramps'])(r[layer]||[]).forEach((row,z)=>{const old=o[layer]?.[z];if(row===old)return;for(let x=0;x<row.length;x++)if(row[x]!==old?.[x])cells.push([rx*REGION+x,rz*REGION+z]);});}
  // Placed things, entry by entry: the tiles of both versions of any that differ.
  const placed={buildings:e=>{try{return planBuilding(e.desc,[e.x,e.z]).tiles;}catch{return [[e.x,e.z]];}},props:propCells,stairs:stairCells,resources:e=>[[e.x,e.z]],cover:e=>[[e.x,e.z]],fishing:e=>[[e.x,e.z]],enemies:e=>cellsOf('enemy',e),
   edges:e=>[e.a,e.b],townsfolk:e=>[e.home,...e.patrol||[]].filter(Boolean),crystals:crystalCells};
  for(const [list,of] of Object.entries(placed)){const p=a[list]||[],q=b[list]||[];for(let i=0;i<Math.max(p.length,q.length);i++)if(JSON.stringify(p[i])!==JSON.stringify(q[i]))cells.push(...(p[i]?of(p[i]):[]),...(q[i]?of(q[i]):[]));}
  for(const k of ['spawn'])if(JSON.stringify(a[k])!==JSON.stringify(b[k]))cells.push(...[a[k],b[k]].filter(Boolean));
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
 // Grows by whole regions (docs/TOWN.md, Whole regions); round: pads a map that isn't whole regions yet.
 async function growBy(round=false){const n=+options.growBy.peek()*REGION,side=options.growSide.peek(),sides=round?roundSides(data.size):side==='all'?{north:n,east:n,south:n,west:n}:{[side]:n};
  const here=host.currentMap?.()?.at;snapshot();
  try{growMap(data,sides,{round});}catch(error){undo.pop();history.value={undo:undo.length,redo:redo.length};status.value=error.message;return;}
  if(rebuilding)await rebuilding;built=await host.editMap(data,{keepPlayer:false,at:here&&{x:here.x+(sides.west||0),z:here.z+(sides.north||0)}});
  scheduleChecks(0);showGrid();showSelection();showDraft();showBiomes();revision.value++;status.value=`${data.name} is now ${data.size.join(' × ')}.`;}
 const roundSides=([W,D])=>{const pad=v=>{const need=Math.ceil(v/REGION)*REGION-v,low=Math.floor(need/2/CHUNK)*CHUNK;return [low,need-low];},[west,east]=pad(W),[north,south]=pad(D);return {north,east,south,west};};
 // Saved compact (world-map.js packMap): only ground rows that differ from their region's plain ground.
 const json=()=>{endWallTrial();return JSON.stringify(packMap(data),null,1);};
 async function save(){
  const text=json();
  try{const response=await fetch('/__map-save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:data.id,json:text})});
   // The dev server doesn't reload for it (vite.config.js): the session's copy of the repo map is what you saved.
   const result=await response.json();if(response.ok){unsaved.value=false;repoCities[`../maps/${data.id}.json`]=JSON.parse(text);}status.value=response.ok?`Saved to ${result.path}.`:`Not saved: ${result.error}`;}catch{status.value='Saving needs the playground dev server (npm run dev:debug). Use Copy or Download instead.';}}
 function download(){const link=h('a',{href:URL.createObjectURL(new Blob([json()],{type:'application/json'})),download:`${data.id}.json`});link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
 // A colour swatch choice (biomes, terrains): the colour the overlay paints, and the name.
 const swatch=(value,id,name,color)=>h('button',{type:'button',class:'q-world-editor__swatch','aria-pressed':()=>String(value.value===id),on:{click:()=>{value.value=id;}}},h('span',{class:'q-world-editor__chip',style:{background:color||'transparent'}}),h('span',null,name));
 const select=(label,value,choices)=>h('label',{class:'q-world-editor__field'},label,h('select',{class:'q-select',on:{change:e=>{value.value=e.target.value;}}},choices.map(([id,name])=>h('option',{value:id,selected:()=>value.value===id},name))));
 const shown=(...tools)=>()=>!tools.includes(tool.value);
 // A check's place (docs/TOWN.md, Opening in the editor): the camera moves over it and it's marked in its
 // severity's colour (filled, with an outline around it) until your next click in the world, or Esc.
 const PROBLEM_COLOURS={error:NO,warning:'#ffb84d',info:BRUSH};const shownProblem=signal(null);let problemMarks=[];
 function clearProblem(){for(const m of problemMarks)m.dispose();problemMarks=[];shownProblem.value=null;}
 function showProblem(p){clearProblem();const [x,z]=p.tile,color=PROBLEM_COLOURS[p.severity]||BRUSH,ring=[];for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++)ring.push([x+a,z+b]);
  const moved=host.lookAt?host.lookAt(x,z):[[0,0],[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,-1]].some(([dx,dz])=>host.teleport(x+dx,z+dz));
  problemMarks=[createCellFill({cells:[{x,z,color}],heightAt,parent:overlayParent(),opacity:.75}),createCellOutline({cells:ring,tiles:{get:k=>{const [a,b]=k.split(',').map(Number);return at(a,b)||{x:a,z:b,h:heightAt(a,b)};}},parent:overlayParent(),color})];
  shownProblem.value=p;status.value=moved?label(p):`${label(p)} (couldn’t go there).`;}
 const label=p=>`${p.severity==='error'?'Error':p.severity==='warning'?'Warning':'Note'} · ${p.tile.join(',')} · ${p.text}`;
 const counts=computed(()=>{const list=problems.value;return `${list.filter(p=>p.severity==='error').length} errors · ${list.filter(p=>p.severity==='warning').length} warnings · ${list.filter(p=>p.severity==='info').length} notes`;});
 // Choosing a tool puts down nothing: what you hold goes away unless the new tool is the Hand.
 // Every tool's hint, shown in the status line as you switch to it (never what the last tool said).
 const TOOL_HINTS={deco:'Pick from the catalogue, then click where it goes (, and . turn it). Click something to select it; again, or drag it, to move it.',select:'Click something to select it; click it again, or drag it, to move it. Drag a box to select several.',design:'Click something to change its colours.',eyedropper:'Click something to copy it, colours and all.',erase:'Click something to remove it.',
  floorpaint:'Click inside a room to paint its floor.',wallpaint:'Point at a wall inside a room to paint it (or the whole room’s walls).',stamp:'Pick a stamp, then click where its north-west corner goes.',
  room:'Drag a rectangle: on open ground a new building, inside one a room with a door.',resize:'Drag from beside a wall (outside or a room’s) the way it should move.',building:'Click where the building’s north-west corner goes.',
  footprint:'Drag to paint a footprint, then Build it.',walls:'Point at a building’s wall and click to change it.',edge:'Click a tile, or drag a line, to put an edge on its chosen side.',stairs:'Click where the bottom step goes (inside a building: stairs or a ladder to another floor); , and . turn them.',
  use:'Click a building to set what it’s used for.',reroll:'Click a building to roll its furniture again.',underground:'Make a dungeon or cave here, then place its entrance.',
  raise:'Click or drag to raise the ground half a block.',lower:'Click or drag to lower the ground half a block.',flatten:'Drag to level the ground to where you start.',smooth:'Drag to ease the ground to its neighbours.',
  ramp:'Drag from the low end to the high end.',ramps:'Click or drag over ledges to turn them into ramps (or back).',surface:'Click or drag to paint the ground.',biome:'Drag to paint biomes or terrain (8 × 8 cells).',nature:'Click or drag to place nature, or clear it.',
  enemy:'Click to place an enemy spawn.',townsfolk:'Click to place a townsfolk, or click one to change them.',crystal:'Click to set an Iter Crystal (2 × 2), or click one to name it.',spawn:'Click where you arrive on this map.',inspect:'Click a tile to see what’s there.'};
  // On a floor some tools say what they do there.
 const FLOOR_HINTS={room:'Drag a rectangle on this floor: a room with a door.',stairs:'Click where the bottom step goes; , and . turn them.'};
 function setTool(id){if(!HAND_TOOLS.includes(id)&&holding())cancel();tool.value=id;toolGroup.value=groupOf(id)??toolGroup.peek();const hint=floorHere.peek()&&FLOOR_HINTS[id]||TOOL_HINTS[id];if(hint)status.value=hint;}
 // The dock's panel: always outside Decorate; in Decorate only for what's selected, paint and stamps.
 // The panel: always outside Decorate; in Decorate for paint and stamps, and for what's selected (the Hand and Colours
 // give it the whole card; Deco, a column beside the catalogue for a selected prop).
 const panelShown=computed(()=>{revision.value;const kind=selection.value?.kind;if(tool.value==='select')return !!kind||!!floorHere.value;return toolGroup.value!=='decorate'||!['deco','select','design','eyedropper','erase'].includes(tool.value)||tool.value==='select'&&!!kind||tool.value==='design'&&['prop','furniture','group','building'].includes(kind)||tool.value==='deco';});
 const smallButton=(label,act,props={})=>h('button',{type:'button',class:'q-button q-button--small',...props,on:{click:fail(act)}},label);
 // Laying out the options (docs/TOWN.md, The bottom panels): a tool's options are groups side by side (opts), each
 // a heading over its fields (in a row), buttons, toggles or a list; a wide group takes the room left (swatches,
 // lists). tools: the tools it shows for, or a function that says when it's hidden.
 const heading=title=>title?h('span',{class:'q-world-editor__heading'},title):null;
 const group=(title,...children)=>h('div',{class:'q-world-editor__group'},heading(title),...children);
 const wideGroup=(title,...children)=>h('div',{class:'q-world-editor__group q-world-editor__group--wide'},heading(title),...children);
 const fields=(...children)=>h('div',{class:'q-world-editor__fields'},...children);
 const buttons=(...children)=>h('div',{class:'q-world-editor__buttons'},...children);
 const opts=(tools,...groups)=>h('div',{class:'q-world-editor__opts',hidden:typeof tools==='function'?tools:shown(...tools)},...groups);
 // The layout (docs/TOWN.md, Sims-style editor): the world fills the window (the player interface hides while
 // editing); a bar along the top (the map, Edit / Play, undo, the tool groups and their tools), a side panel
 // (status, the tool's options, what's selected, the map and its checks) and, in Decorate, the catalogue
 // along the bottom.
 function build(){
  return h('div',{class:'q-world-editor','data-mode':()=>mode.value},
   // One row along the top: Edit / Play, the walls, levels, the tool groups, and Undo, Redo, Reset, Close.
   h('header',{class:'q-world-editor__bar','aria-label':'World editor'},
    segmented({label:'Mode',options:[{value:'edit',label:'Edit'},{value:'play',label:'Play'}],value:mode,onChange:v=>{if(v==='play'&&holding())cancel();mode.value=v;
     // Play is the game: you're put where you were working, and the camera follows you; Edit frees it again.
     if(v==='play'){const here=host.playerHere?.();host.freeCamera?.(false);if(!here)host.toast?.('No open ground near the view: you’re where you were.');}
     else{host.freeCamera?.(true);status.value='Edit: clicks use the tool.';}}}),
    h('div',{class:'q-world-editor__edit',hidden:()=>mode.value!=='edit'},
     segmented({label:'Walls',options:[{value:'up',label:'Walls up'},{value:'cut',label:'Cutaway'},{value:'down',label:'Walls down'}],value:options.wallsMode,onChange:v=>{options.wallsMode.value=v;}}),
     h('div',{class:'q-world-editor__actions q-world-editor__levels'},smallButton('▲',()=>goLevel(1),{title:'Up a floor in the building you’re looking at (Page Up)','aria-label':'Up a floor'}),smallButton('▼',()=>goLevel(-1),{title:'Down a floor in the building you’re looking at (Page Down)','aria-label':'Down a floor'}),
      h('span',{class:'q-world-editor__level',hidden:()=>!floorHere.value},()=>{revision.value;const h0=floorHere.value;return h0?`${ownerName(hereOwner())} · ${LEVEL_NAME(h0.level,hereOwner())}`:'';})),
     // Select (user, 2026-10-16): the editor's resting tool, before the tabs; Esc comes back to it.
     h('button',{type:'button',class:'q-button q-button--small q-world-editor__select','aria-pressed':()=>String(tool.value==='select'),title:'Select: click something to select it, again or drag to move it (Esc)',on:{click:()=>setTool('select')}},'Select'),
     segmented({label:'Tools',options:TOOL_GROUPS.map(([value,label])=>({value,label})),value:toolGroup,onChange:v=>{setTool(TOOL_GROUPS.find(([g])=>g===v)[2][0][0]);}})),
    // Draw distance: how far the land streams around the view (the game's setting; Settings shows the same).
    host.drawDistance?h('label',{class:'q-world-editor__draw',title:'Draw distance: how far the world shows around the view'},'Draw',h('select',{class:'q-select','aria-label':'Draw distance',on:{change:e=>host.setDrawDistance(+e.target.value)}},
     DRAW_DISTANCES.map(d=>h('option',{value:String(d.chunks),selected:()=>host.drawDistance.value===d.chunks},d.label)))):null,
    h('div',{class:'q-world-editor__actions'},
     // Save to the map's file in the repo (as Map → Save to repo); a dot while there are unsaved changes.
     smallButton(()=>unsaved.value?'Save •':'Save',save,{title:`Save to src/maps (${MOD}+S)`,'aria-label':()=>unsaved.value?'Save (unsaved changes)':'Save'}),
     smallButton('Undo',()=>step(undo,redo),{title:`${MOD}+Z`,disabled:()=>!history.value.undo}),
     smallButton('Redo',()=>step(redo,undo),{title:`${MOD}+Shift+Z`,disabled:()=>!history.value.redo}),
     smallButton('Reset',()=>rebuild({keepPlayer:false})),
     smallButton('Close',()=>editor.close()))),
   // The bottom: the group's tools in their own card in the bottom-left corner, and beside it, out to the right
   // edge, the content: the status line and the tool's options laid out in groups side by side (or in Decorate
   // the catalogue, with what's selected in a column on its right).
   h('div',{class:'q-world-editor__dock'},
    h('div',{class:'q-world-editor__tool-card',hidden:()=>mode.value!=='edit'},h('span',{class:'q-world-editor__heading'},()=>TOOL_GROUPS.find(([g])=>g===toolGroup.value)?.[1]||''),
     h('div',{class:'q-world-editor__tools'},TOOLS.map(([id,name])=>h('button',{type:'button',class:'q-button q-button--small',hidden:()=>groupOf(id)!==toolGroup.value,'aria-pressed':()=>String(tool.value===id),on:{click:()=>setTool(id)}},name)))),
    h('div',{class:'q-world-editor__content',hidden:()=>mode.value!=='edit','data-catalogue':()=>String(catalogueShown())},
     h('div',{class:'q-world-editor__status'},h('p',{class:'q-page__help',role:'status'},status),h('p',{class:'q-page__help q-world-editor__refused',hidden:()=>!previewNote.value},previewNote)),
     h('div',{class:'q-world-editor__body'},
      cataloguePanel(),
      h('section',{class:'q-world-editor__panel','aria-label':'Tool options',hidden:()=>mode.value!=='edit'||!panelShown.value},
       h('div',{class:'q-world-editor__options'},
        opts(['walls'],group(null,select('Make it',options.wallKind,[['window','A window'],['wall','A plain wall'],['door','A door'],['sign','The sign'],['nosign','No sign'],['flowers','Flower box (toggle)']]))),
        // Biome: no land yet; or the layer and its swatches, the brush and unpainted land, and what the land grows.
        opts(()=>{revision.value;return tool.value!=='biome'||!!data?.land;},group('Land',fields(select('Unpainted land',options.landDefault,BIOME_IDS.map(id=>[id,biomeRule(id).name]))),buttons(smallButton('Add land',()=>addLand())))),
        opts(()=>{revision.value;return tool.value!=='biome'||!data?.land;},
         wideGroup('Paint',segmented({label:'Layer',value:()=>options.landLayer.value,onChange:v=>{options.landLayer.value=v;showBiomes();},options:[{value:'biome',label:'Biome'},{value:'terrain',label:'Terrain'}]}),
          h('div',{class:'q-world-editor__swatches',hidden:()=>options.landLayer.value!=='biome'},BIOME_IDS.map(id=>swatch(options.biome,id,biomeRule(id).name,BIOME_PAINT[id]))),
          h('div',{class:'q-world-editor__swatches',hidden:()=>options.landLayer.value!=='terrain'},[['usual','Biome’s usual',null],...TERRAIN_IDS.map(id=>[id,terrainRule(id).name,TERRAIN_PAINT[id]])].map(([id,name,color])=>swatch(options.terrain,id,name,color)))),
         group('Brush',fields(select('Brush',options.biomeBrush,[['1','1 cell (8 × 8)'],['3','3 × 3 cells'],['5','5 × 5 cells']]),
          h('label',{class:'q-world-editor__field'},'Unpainted land',h('select',{class:'q-select',on:{change:e=>landDefault(e.target.value)}},BIOME_IDS.map(id=>h('option',{value:id,selected:()=>{revision.value;return data?.land?.default===id;}},biomeRule(id).name))))),
          buttons(smallButton('New seed',()=>reseedLand()),smallButton('Remove land',()=>removeLand()))),
         group('The land grows',h('div',{class:'q-world-editor__toggles'},
          toggleSwitch({label:'Fishing spots',description:'Where the water gets its own',on:()=>{revision.value;return data?.land?.fishing!==false;},onChange:v=>setLand(()=>{data.land.fishing=v;status.value=v?'Generated fishing spots on.':'Generated fishing spots off: only placed ones.';})}),
          toggleSwitch({label:'Enemies',description:'Goblins and others the biomes spawn',on:()=>{revision.value;return data?.land?.enemies!==false;},onChange:v=>setLand(()=>{data.land.enemies=v;status.value=v?'Generated enemies on.':'Generated enemies off.';})}),
          toggleSwitch({label:'Nature',description:'Trees, resources and ground cover',on:()=>{revision.value;return data?.land?.nature!==false;},onChange:v=>setLand(()=>{data.land.nature=v;status.value=v?'Generated nature on.':'Generated nature off: only what you place.';})})))),
        opts(['footprint'],
         group('New building',h('div',{class:'q-world-editor__fields q-world-editor__fields--grid'},select('Storeys',options.storeys,[['1','1'],['2','2'],['3','3']]),select('Roof',options.roof,ROOF_TYPES.filter(r=>r!=='cone').map(r=>[r,r])),select('Walls',options.style,STYLE_NAMES.map(n=>[n,n])),select('Use',options.use,[...USE_NAMES,'none'].map(u=>[u,u])))),
         group('Footprint',fields(select('Paint',options.draftMode,[['add','Add tiles'],['remove','Remove tiles']])),
          h('p',{class:'q-page__help'},()=>{draft.value;revision.value;return `${draft.value.size} tiles${draftFor!==null?` · reshaping ${nameOf('building',data.buildings[draftFor])}`:''}`;}),
          buttons(smallButton('Build it',buildDraft),smallButton('Clear',clearDraft)))),
        // The Townsfolk tool shows the selected person's panel too (the one the Hand shows).
        opts(['townsfolk'],personPanel()),
        opts(['crystal'],crystalPanel()),
        opts(['nature'],group(null,fields(select('Nature',options.nature,NATURE_CHOICES)))),
        opts(['enemy'],group(null,fields(select('Enemy',options.enemyKind,Object.entries(ENEMIES).map(([id,e])=>[id,e.name])),select('Behaviour',options.enemyMood,[['passive','Passive (fights back)'],['aggressive','Aggressive']]),select('Respawns after',options.enemyRespawn,RESPAWNS)))),
        opts(['raise','lower','flatten','smooth','ramp','ramps','nature','surface','footprint'],group(null,fields(select('Brush',brush,[['1','1 tile'],['3','3 × 3'],['5','5 × 5'],['7','7 × 7'],['9','9 × 9']]),
         h('label',{class:'q-world-editor__field',hidden:shown('raise','lower','flatten','smooth','ramps','nature','surface')},'Shape',h('select',{class:'q-select',on:{change:e=>{options.brushShape.value=e.target.value;}}},[['brush','Paint as you drag'],['line','A straight line']].map(([id,name])=>h('option',{value:id,selected:()=>options.brushShape.value===id},name))))))),
        opts(['ramps'],group(null,fields(select('Ramps',options.rampMode,[['add','Ledges to ramps'],['remove','Ramps to ledges']])),
         h('div',{class:'q-world-editor__toggles'},toggleSwitch({label:'Only on paths',description:'Paths and paving; the wild keeps its ledges',on:()=>options.rampPaths.value,onChange:v=>{options.rampPaths.value=v;}})))),
        opts(['surface'],group(null,fields(select('Surface',options.surface,[['land',"Land's own"],...SURFACE_NAMES.map(s=>[s,s]),['water','water (land maps)']])))),
        opts(['use'],group(null,fields(select('Use',options.use,[...USE_NAMES,'none'].map(u=>[u,u]))))),
        opts(['building'],group(null,fields(select('Building',options.preset,Object.entries(BUILDING_PRESETS).map(([id,p])=>[id,p.name])),select('Rotation',options.rotation,[['0','0°'],['90','90°'],['180','180°'],['270','270°']])))),
        // Stairs: which way they rise; inside a building, up or down to the next floor; outside, their size.
        opts(['stairs'],group(null,fields(select('Up towards',options.dir,Object.entries(SIDE_LABELS)),select(()=>floorHere.value?'Goes':'In a building',options.flight,[['up','Up a floor'],['down','Down a floor']]),select('As',options.flightKind,[['stairs','Stairs'],['ladder','A ladder']]),
         h('span',{class:'q-world-editor__fields',hidden:()=>!!floorHere.value},select('Length',options.length,[1,2,3,4].map(n=>[String(n),`${n} (${n/2} block${n>2?'s':''})`])),select('Width',options.width,[1,2,3,4,5].map(n=>[String(n),String(n)])))))),
        opts(['edge'],group(null,fields(select('Edge',options.edge,[['wall','Wall'],['window','Window'],['fence','Fence'],['railing','Railing'],['low','Counter'],['door','Door'],['none','Remove']]),select('Side',options.side,Object.entries(SIDE_LABELS))))),
        cavesPanel(),stampsPanel(),paintPanel(),presetsWindow(),
        // What's selected: its own panels side by side, then what you can do with it.
        h('div',{class:'q-world-editor__opts',hidden:()=>!selection.value||!['select','design'].includes(tool.value)},
         coloursPanel(),lookPanel(),
         // The rest of what's selected, and what you can do with it: the Hand's.
         h('div',{class:'q-world-editor__opts',hidden:()=>tool.value!=='select'},spawnPanel(),personPanel(),crystalPanel(),floorsPanel(),
         group(()=>{revision.value;heldRotation.value;const sel=selection.value,entry=entryOf(sel);return entry?`${nameOf(sel.kind,entry)} · ${anchorOf(sel.kind,entry)?.join(',')}${entry.scale&&entry.scale!==1?` · ${Math.round(entry.scale*100)}%`:''}${moving.value?' · held':''}`:'';},flightButtons(),doorButtons(),
          h('div',{class:'q-world-editor__actions-grid',hidden:()=>['flight','door'].includes(selection.value?.kind)},
           h('button',{type:'button',class:'q-button q-button--small',hidden:()=>{revision.value;const e=entryOf(selection.value);return selection.value?.kind!=='prop'||e?.kind!=='dungeonEntrance';},on:{click:fail(()=>{const e=entryOf(selection.peek());status.value=host.enterFloor?.({dungeon:e.link},-1)?`Into ${data.interiors?.[e.link]?.name||'it'}.`:'Can’t go in yet.';})}},'Go in'),
           ...[['Move','M',startMove],['Rotate',', .',()=>rotateSelection(1)],['Reshape',null,reshapeSelection],['Duplicate',`${MOD}+D`,withReal(duplicateSelection)],['Delete','Del',deleteSelection],['Deselect','Esc',cancel],
           ['← Nudge',null,withReal(()=>nudge(-1,0))],['Nudge →',null,withReal(()=>nudge(1,0))],['↑ Nudge',null,withReal(()=>nudge(0,-1))],['Nudge ↓',null,withReal(()=>nudge(0,1))]]
           .map(([name,keyName,act])=>h('button',{type:'button',class:'q-button q-button--small',title:keyName||undefined,on:{click:fail(act)}},name)),
           ...[['Smaller','−',()=>resize(-1)],['Bigger','+',()=>resize(1)]].map(([name,keyName,act])=>h('button',{type:'button',class:'q-button q-button--small',title:keyName,hidden:()=>!['prop','furniture'].includes(selection.value?.kind),on:{click:fail(act)}},name)))))),
        // Floors show with a selected building (Build) or while you're on one.
        h('div',{class:'q-world-editor__opts',hidden:()=>{revision.value;return !floorHere.value||tool.value==='deco'||!!selection.value&&['select','design'].includes(tool.value);}},floorsPanel())),
       // Map: the map itself, its size, the view, and its checks.
       h('div',{class:'q-world-editor__opts',hidden:()=>toolGroup.value!=='map'||tool.value==='select'},
        group('Map',h('div',{class:'q-world-editor__fields q-world-editor__fields--wide'},select('Map',choice,catalogue.map(c=>[c.id,c.name]))),buttons(smallButton('Open',()=>{const c=catalogue.find(m=>m.id===choice.peek());if(c.area){editor.close();host.reset?.('all');return;}return load(c.make());}),
          smallButton('Save to repo',save),smallButton('Copy JSON',async()=>{try{await navigator.clipboard.writeText(json());status.value='Copied the map JSON.';}catch{status.value='Copy failed: use Download.';}}),smallButton('Download',download))),
        group(()=>{revision.value;return data?`Size · ${data.size.join(' × ')}`:'Size';},fields(select('Grow',options.growSide,[['all','All sides'],['north','North'],['east','East'],['south','South'],['west','West']]),select('By',options.growBy,[['1',`1 region (${REGION})`],['2','2 regions']])),
         buttons(smallButton('Grow map',()=>growBy()),h('span',{hidden:()=>{revision.value;return !data||data.size.every(v=>v%REGION===0);}},smallButton('Round up to whole regions',()=>growBy(true))))),
        group('View',h('div',{class:'q-world-editor__toggles'},host.freeCameraOn?toggleSwitch({label:'Free camera',description:'WASD or middle-drag to pan',on:()=>host.freeCameraOn.value,onChange:v=>host.freeCamera(v)}):null,
         host.atmosphereOn?toggleSwitch({label:'Atmosphere',description:'Fog and light by biome (the haze stays)',on:()=>host.atmosphereOn.value,onChange:v=>{host.atmosphereOn.value=v;}}):null,
         toggleSwitch({label:'Chunk and region lines',description:`Chunks ${CHUNK} × ${CHUNK} (pink), regions (gold)`,on:grid,onChange:v=>{grid.value=v;showGrid();}})),
         buttons(smallButton('Show the mist wall',showMist,{title:'Look at the world’s edge nearest the view'}),host.playerHere?smallButton('Player here',()=>{status.value=host.playerHere()?'The slime is where the view is.':'No open ground near the view.';},{title:'Move the slime to where the view is (Play does too)'}):null)),
        wideGroup(()=>`Checks · ${counts.value}`,
         keyedList(h('ol',{class:'q-world-editor__checks'}),problems,p=>`${p.kind}:${p.tile.join(',')}:${p.text}`,p=>h('li',null,h('button',{type:'button',class:'q-world-editor__check','data-severity':p.peek().severity,
          'aria-current':()=>String(shownProblem.value===p.value),on:{click:()=>showProblem(p.peek())}},label(p.peek())))))))))));
 }
 // The mist wall (mist-wall.js): the camera looks at the world's edge nearest the view.
 function showMist(){if(!data?.land){status.value='Only a map on the land has the world’s edge.';return;}const at=host.viewTile?.()||{x:data.size[0]/2,z:data.size[1]/2},[w,d]=data.size;
  const sides=[[at.x,0,'north'],[at.x,d-1,'south'],[0,at.z,'west'],[w-1,at.z,'east']].map(([x,z,n])=>({x:Math.max(0,Math.min(w-1,Math.round(x))),z:Math.max(0,Math.min(d-1,Math.round(z))),n,dist:Math.abs(x-at.x)+Math.abs(z-at.z)})).sort((a,b)=>a.dist-b.dist),s=sides[0];
  host.lookAt?.(s.x,s.z);status.value=`The mist wall on the ${s.n} edge.`;}
 const editor={
  get active(){return !!view;},get data(){return data;},get built(){return built;},get problems(){return problems.peek();},tool,mode,options,brush,
  // Opens on the map you're on: the one being edited (as you left it), else the map you stand in
  // (you stay where you are), else the overworld. `next` opens that data instead.
  async open(next=null){if(!view){view=mount(build);document.body.append(view.node);window.addEventListener('keydown',onKey,{capture:true});window.addEventListener('keyup',onKeyUp,{capture:true});
    // Editing fills the window (the player interface hides); Play shows it again for the test walk.
    // The free camera while editing (the slime stays where it is); it comes back to the slime on Close.
    if(host.freeCameraOn&&!host.freeCameraOn.peek())host.freeCamera(true);
    stopScreen=effect(()=>{const editing=mode.value==='edit';host.setEditorScreen?.(editing);host.setWalls?.(editing?options.wallsMode.value:'up');untracked(showGrid);});
    // World clicks and left-drag belong to the editor only in Edit mode; in Play they reach the game.
    stopDrag=effect(()=>{const editing=mode.value==='edit';host.setTileClick(editing?(tile,point,actor)=>click(tile,point,actor):null);host.setTileHover?.(editing?hover:null);if(!editing)clearPreview();host.setTileDrag?.(editing&&DRAG_TOOLS.includes(tool.value)?drag:null);});
    // The biome overlay shows while the Biome tool is chosen.
    stopBiomes=effect(()=>{tool.value;showBiomes();});
    // Previews follow the tool and its options, the selection and moving.
    // Stepping out of a floor: the map's chunks for buildings whose floors changed rebuild (their stairwells).
    stopFloors=effect(()=>{if(floorHere.value||!staleBuildings.size)return;const cells=[...staleBuildings].flatMap(i=>data.buildings[i]?cellsOf('building',data.buildings[i]):[]);staleBuildings.clear();untracked(()=>rebuild({dirty:chunksAround(cells)}));});
    stopPreview=effect(()=>{tool.value;brush.value;selection.value;moving.value;heldRotation.value;for(const s of Object.values(options))s.value;untracked(refreshPreview);});}
   if(next){await load(next);return editor;}
   const here=host.currentMap?.();
   if(data&&here?.areaId==='world-editor'){showGrid();showSelection();showDraft();showBiomes();scheduleChecks(0);status.value=`Editing ${data.name} (${data.size.join(' × ')}).`;return editor;}
   if(here?.data){await load(structuredClone(here.data),{at:here.at});return editor;}
   await load(catalogue[0].make());return editor;},
  close(){clearProblem();endWallTrial();paintedFloor.value=null;if(holding()||heldDoor||pendingFlight)cancel();if(host.freeCameraOn?.peek())host.freeCamera(false);stopScreen?.();stopScreen=null;host.setEditorScreen?.(false);host.setWalls?.('up');placing=null;moving.value=false;turning=null;pinned=null;window.removeEventListener('keyup',onKeyUp,{capture:true});stopFloors?.();stopFloors=null;host.setTileClick(null);host.setTileHover?.(null);spotsFill?.dispose();spotsFill=null;patrolling=false;patrolOn.value=false;stopPreview?.();stopPreview=null;clearPreview();hoverAt=null;stopDrag?.();stopDrag=null;stopBiomes?.();stopBiomes=null;biomeOverlay?.dispose();biomeOverlay=null;host.setTileDrag?.(null);window.removeEventListener('keydown',onKey,{capture:true});clearTimeout(checkTimer);overlay?.dispose();overlay=null;outline?.dispose();outline=null;draftOutline?.dispose();draftOutline=null;view?.dispose();view=null;},
  get grid(){return grid.peek();},set grid(v){grid.value=!!v;showGrid();},
  click,undo:()=>step(undo,redo),redo:()=>step(redo,undo),
  // Fast editing, for scripted checks: the same actions as the panel and keys.
  // Moves the view over a tile (the free camera's focus).
  lookAt:(x,z)=>host.lookAt?.(x,z),
  selection,moving,select(kind,index){selection.value={kind,index};showSelection();},moveSelection,toolGroup,setTool,heldRotation,get holding(){return holding();},get placing(){return placing;},pickUpNew,drop,turnHeld,lift,cancel,goLevel,paintRoom,makeRoom,pushWall,get heldDoor(){return heldDoor;},get pendingFlight(){return pendingFlight;},commitColour,resetColours,applyPreset,savePreset,presetName,presetFor,palettes,catalogueBy,catalogueGroup,catalogueSearch,nudge,rotateSelection,duplicateSelection,placeCopy,deleteSelection,paint,drag,copySelection,pasteClipboard,
  growMap:growBy,draft,reshapeSelection,buildDraft,clearDraft,setWall,wallAt,setLook,addLand,removeLand,landDefault,reseedLand,
  hover,get preview(){return {note:previewNote.peek(),ghosts:[...shownGhosts].map(id=>`${id}@${ghosts.get(id)?.group.scale.x}`),cells:lastPreview?.cells||[],faces:(lastPreview?.faces||[]).length};},get checksPending(){return !!checkTimer;},runChecks(){clearTimeout(checkTimer);if(built)problems.value=mapProblems(data,built);return problems.peek();},
 };
 return editor;
}
