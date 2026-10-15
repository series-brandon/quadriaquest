import * as THREE from 'three';
import {createTerrainBatch} from './terrain-batch.js';
import {createEdgeFeatures} from './doors.js';
import {planBuilding} from './building-kit.js';
import {createProp,propFootprint} from './props.js';
import {furnishRoom,furnishingUse,upstairsUse} from './furnish.js';
import {mergeStatic} from './static-merge.js';
import {surfaceColor,DIRS} from './map-terrain.js';
import {tileTopGeometry} from './tile-top.js';
import {mergedMesh} from './merged-model.js';
import {key} from './world.js';

// Separate interiors, stairwells and dungeon entrances (docs/CITY.md, Separate interiors; city
// Phase 7). A building with `interior: 'separate'` is solid outside; its doors carry a `link` and open
// into a small space of its own, one per floor, in the same tile coordinates as its footprint (so the
// rooms line up with the outside). Upper floors and cellars are further spaces joined by a shared
// stairwell entity. A dungeon entrance is a prop with a link to a larger space. Moving between spaces is
// a quick fade (createSpaces), not a full area switch: the city stays as it was.
// Interior spec (map data, on the building entry): {floors, stairs:[dx, dz] (local), surface, furniture:[{kind, at:[dx, dz], floor}]}.
// Dungeon spec (map data.interiors[id]): {kind:'dungeon', size:[w, d], exit:[x, z], furniture:[…]}.
export const INTERIOR_MAX_ZOOM=14,DUNGEON_MAX_ZOOM=18,FADE=.25;

// Stairwell models, two tiles long along local z (−1 … +1, the top at +z): a flight of eight steps up
// with a sloped handrail on the open side (railX), or the opening of a flight going down, railed on its
// open side and far end.
export function stairwellModel(direction='up',{railX=.42}={}){
 const wood=['#a27a55','#9a7350'],rail='#5a3d28',steps=8,rise=1.36/steps,parts=[];
 if(direction==='down'){
  parts.push({geometry:new THREE.BoxGeometry(.9,.02,1.9),color:'#1d1915',position:[0,.015,0]});
  for(let i=0;i<4;i++)parts.push({geometry:new THREE.BoxGeometry(.82,.03,.25),color:wood[i%2],position:[0,.01-i*.002,.86-i*.25]});
  for(const z of [-.92,0,.92])parts.push({geometry:new THREE.BoxGeometry(.06,.72,.06),color:rail,position:[railX,.36,z]});
  parts.push({geometry:new THREE.BoxGeometry(.06,.06,1.9),color:rail,position:[railX,.72,0]},{geometry:new THREE.BoxGeometry(.9,.06,.06),color:rail,position:[0,.72,-.92]},{geometry:new THREE.BoxGeometry(.06,.72,.06),color:rail,position:[-railX,.36,-.92]});
  return mergedMesh(parts);
 }
 for(let i=0;i<steps;i++)parts.push({geometry:new THREE.BoxGeometry(.86,rise*(i+1),.25),color:wood[i%2],position:[0,rise*(i+1)/2,-1+.125+.25*i]});
 const slope=Math.atan2(rise*steps,2),length=Math.hypot(2,rise*steps);
 parts.push({geometry:new THREE.BoxGeometry(.05,.05,length),color:rail,position:[railX,.8+rise*steps/2,0],rotation:[-slope,0,0]});
 for(const z of [-.9,0,.9])parts.push({geometry:new THREE.BoxGeometry(.05,.8,.05),color:rail,position:[railX,rise*Math.ceil((z+1)/.25)+.4,z]});
 return mergedMesh(parts);
}
// An interior floor tile: its surface on a thin dark slab (a space floats in darkness, not on a hill).
const floorMaterials=new Map(),floorMaterial=color=>{if(!floorMaterials.has(color))floorMaterials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return floorMaterials.get(color);};
function floorTile(tile,map){
 const group=new THREE.Group();group.add(new THREE.Mesh(tileTopGeometry(tile,map),floorMaterial(surfaceColor(tile))));
 const slab=new THREE.Mesh(new THREE.BoxGeometry(1,.3,1),floorMaterial('#3a322b'));slab.position.y=tile.h-.065-.15;group.add(slab);return group;
}
export const SPACE_BACKGROUND='#2b2622';
const ARRIVAL_ORDER=[[0,1],[1,0],[-1,0],[0,-1]];
// A stairwell entity on two tiles (bottom and top): solid, picked like any actor; interact() follows its
// link. Going up you approach the bottom step; going down, the top.
export function createStairwell({place,direction,link,parent,pickables,services,tileAt}){
 const {bottom,top}=place,ux=top.x-bottom.x,uz=top.z-bottom.z,angle=Math.atan2(ux,uz);
 // The rail goes on the side away from the wall.
 const side=[Math.cos(angle),-Math.sin(angle)],beside=tileAt(bottom.x+Math.round(side[0]),bottom.z+Math.round(side[1]));
 const group=new THREE.Group();group.add(stairwellModel(direction,{railX:beside&&beside.indoor?.42:-.42}));
 group.position.set((bottom.x+top.x)/2-6,bottom.h,(bottom.z+top.z)/2-6);group.rotation.y=angle;parent.add(group);
 bottom.blocked=top.blocked=true;
 const anchor=direction==='up'?bottom:top;
 const well={kind:'stairwell',direction,tile:anchor,x:anchor.x,z:anchor.z,place,group,link,ready:true,opened:false,duration:0,label:direction==='up'?'Go upstairs':'Go downstairs',available:()=>true,interact(){services.enter(link,{from:well});}};
 group.traverse(m=>{if(m.isMesh){m.userData.actor=well;m.userData.tile=anchor;pickables.push(m);}});
 return well;
}
// Builds one floor of a building's interior (or a dungeon) as a space: tiles, walls, doors, stairwells.
// plan: the building's plan (building-kit.js), or null for a dungeon with `size`.
// use: the room's furnishing (furnish.js; the building's trade below, bedrooms or storage above, the
// crypt in a dungeon). lootId: a stable id for the dungeon chest's loot.
export function buildSpace({pickables=[],plan=null,size=null,origin=[0,0],floor=0,floors=1,spec={},style='timber',base=1,kind='house',links,services,use=null,lootId=null,loot=null}){
 const group=new THREE.Group(),tiles=new Map(),inner=[];
 const [x0,z0]=plan?[plan.x0,plan.z0]:origin,[w,d]=plan?[plan.w,plan.d]:size,surface=spec.surface||(kind==='dungeon'?'dungeon':floor?'planks':'floor');
 for(let z=z0-1;z<=z0+d;z++)for(let x=x0-1;x<=x0+w;x++){const inside=x>=x0&&x<x0+w&&z>=z0&&z<z0+d;const t={x,z,h:base,surface,blocked:!inside,water:false,indoor:inside,building:inside?0:undefined,space:true};tiles.set(key(x,z),t);if(inside)inner.push(t);}
 const t=(x,z)=>tiles.get(key(x,z));
 const edges=createEdgeFeatures({parent:group,pickables,tileAt:t,style:kind==='dungeon'?'dungeon':style});
 const doors=[];
 if(plan){for(const e of plan.edges){const a=t(...e.a),b=t(...e.b);
   if(e.kind==='door'&&floor===0){const door=edges.add(a,b,'door',{owner:0,style,locked:!!e.door?.locked});door.link=links.exit(e);doors.push(door);}
   else edges.add(a,b,e.kind==='window'?'window':'wall',{owner:0,style});}}
 else for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+d;z++)for(const [dx,dz] of Object.values(DIRS)){const n=t(x+dx,z+dz);if(n&&!n.indoor&&!edges.info(t(x,z),n))edges.add(t(x,z),n,'wall',{owner:0,style:'dungeon'});}
 // Stairs: two tiles along a wall rising into a corner. A floor's flight up uses placement k % 2 and the
 // opening down to it from above sits on the same tiles one floor up, so a middle floor has both.
 const stairs=[],placements=plan?stairsPlacements(plan,spec):spec.exit?stairsPlacements({x0,z0,w,d,doors:[]},{stairs:spec.exit}):[];
 const live=p=>p&&{bottom:t(x0+p.bottom[0],z0+p.bottom[1]),top:t(x0+p.top[0],z0+p.top[1]),front:t(x0+p.front[0],z0+p.front[1])};
 if(plan){
  if(floor<floors-1&&placements.length)stairs.push(createStairwell({place:live(placements[floor%placements.length]),direction:'up',link:links.floor(floor+1,'up'),parent:group,pickables,services,tileAt:t}));
  if(floor>0&&placements.length)stairs.push(createStairwell({place:live(placements[(floor-1)%placements.length]),direction:'down',link:links.floor(floor-1,'down'),parent:group,pickables,services,tileAt:t}));
 }else if(placements.length)stairs.push(createStairwell({place:live(placements[0]),direction:'up',link:links.exit(null),parent:group,pickables,services,tileAt:t}));
 // Furniture never goes on stairs or in front of them.
 const keepClear=new Set(stairs.flatMap(w=>[w.place.front].filter(Boolean)));
 for(const f of spec.furniture||[])if((f.floor??0)===floor){const [fw,fd]=propFootprint(f.kind,f.rotation||0),cells=[];for(let a=0;a<fw;a++)for(let c=0;c<fd;c++)cells.push(t(x0+f.at[0]+a,z0+f.at[1]+c));if(cells.some(c=>!c||c.blocked||keepClear.has(c)))continue;try{createProp(f.kind,{origin:[x0+f.at[0],z0+f.at[1]],rotation:f.rotation||0,tileAt:t,parent:group,pickables,colors:f.colors||null});}catch{}}
 // Furnishing (furnish.js) around the stairs, their fronts and any hand-placed furniture; static pieces
 // merge into one mesh.
 const furniture=[];
 if(use){
  const keep=inner.filter(n=>n.blocked).map(n=>[n.x,n.z]),fronts=stairs.map(w=>w.place.front).filter(Boolean);
  const doors=plan&&floor===0?plan.doors.map(d=>({inside:d.inside,out:d.out})):fronts.map(f=>({inside:[f.x,f.z],out:[0,0]}));
  const room={tiles:inner.map(n=>[n.x,n.z]),doors,keeper:plan&&floor===0?plan.anchors.keeper:null,keep:[...keep,...fronts.map(f=>[f.x,f.z])]};
  const layout=furnishRoom(room,use,(spec.seed??1)*31+floor);
  for(const f of layout){try{furniture.push(createProp(f.kind,{origin:[f.x,f.z],rotation:f.rotation,tileAt:t,parent:group,pickables,loot:f.loot&&loot?{id:lootId,items:loot}:null}));}catch{}}
  if(layout.keeper)group.userData.keeper=t(...layout.keeper);
  mergeStatic(group,furniture.filter(p=>!p.def.interaction).map(p=>p.group),{name:'furniture-merged'});
 }
 createTerrainBatch({tiles:inner,map:tiles,factory:tile=>floorTile(tile,tiles),parent:group,pickables});
 edges.bake();
 // Arriving by stairs: coming up, beside the top of the opening; coming down, in front of the bottom step.
 const free=n=>n&&n.indoor&&!n.blocked,besideTop=well=>ARRIVAL_ORDER.map(([dx,dz])=>t(well.place.top.x+dx,well.place.top.z+dz)).find(free);
 return {group,tiles,doors,stairs,edges,inner,furniture,
  arrival(from){if(from?.door!==undefined){const door=doors[from.door];return door?.a||inner.find(n=>!n.blocked);}
   const down=stairs.find(s=>s.direction==='down'),up=stairs.find(s=>s.direction==='up');
   if(from==='up'&&down)return besideTop(down)||inner.find(n=>!n.blocked);
   if(up&&free(up.place.front))return up.place.front;
   return inner.find(n=>!n.blocked);},
  dispose(){edges.dispose();for(const m of [...pickables]){let o=m;while(o&&o!==group)o=o.parent;if(o===group)pickables.splice(pickables.indexOf(m),1);}group.removeFromParent();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};
}
// Floors by hand (docs/CITY.md, Floors; user, 2026-10-14). A building entry may carry
//   floors: [{level, use, surface, cells:[[dx, dz]…] (its own shape, any size; default the footprint), furniture:
//     [{kind, at:[dx, dz], rotation}], edges:[{a:[dx, dz], b:[dx, dz], kind}] (inside walls, doors…),
//     up:{at:[dx, dz], dir} (the flight up from this floor: its bottom step and the way up)}]
// Levels: −1 a cellar, 0 the ground, 1… upper floors. An in-place building's ground floor is the overworld
// (its level-0 entry only holds the flight up, and the opening down to a cellar is the cellar's flight);
// a separate building's ground floor is a space too. Floors start empty: furniture is placed, or rolled
// with the editor's Generate (furnish.js). Every coordinate is local to the building's north-west tile.
export const FLOOR_DIRS={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]};
export const floorLevels=entry=>Array.isArray(entry?.floors)?[...entry.floors].sort((a,b)=>a.level-b.level):null;
// A flight's tiles (local): its bottom step, its top and the tile in front of the bottom.
export function flightOf(up){const [dx,dz]=FLOOR_DIRS[up.dir]||FLOOR_DIRS.n,[x,z]=up.at;return {bottom:[x,z],top:[x+dx,z+dz],front:[x-dx,z-dz]};}
// One floor of a building as a space: its shape walled (the outside's windows on a full floor, its doors
// on a separate ground floor), inside walls and doors, stairwells to the floors above and below, and its
// furniture. links: {exit(edge) (a door out), floor(level, via), ground(via, tile) (an in-place building's
// overworld floor)}.
// underground: {wall, surface} defaults below the ground (a dungeon's own stone).
export function buildFloorSpace({pickables=[],plan,entry,level,style='timber',base=1,links,services,inPlace=true,underground={wall:'stone',surface:'stone'}}){
 const levels=new Map(floorLevels(entry).map(f=>[f.level,f])),spec=levels.get(level)||{level},group=new THREE.Group(),tiles=new Map(),inner=[];
 const local=(x,z)=>[x-plan.x0,z-plan.z0],world=([dx,dz])=>[plan.x0+dx,plan.z0+dz];
 const footprint=plan.tiles.map(([x,z])=>local(x,z)),shape=new Set((spec.cells?.length?spec.cells:footprint).map(c=>c.join(',')));
 const surface=spec.surface||(level<0?underground.surface:level>0?'planks':'floor'),wallStyle=level<0?underground.wall:style;
 // The floor's own shape (any size: user, 2026-10-14), with a ring of solid tiles around it.
 for(const [dx,dz] of [...shape].map(k=>k.split(',').map(Number)))for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const [x,z]=world([dx+a,dz+b]),k=key(x,z);if(tiles.has(k))continue;const inside=shape.has(`${dx+a},${dz+b}`);
  const t={x,z,h:base,surface,blocked:!inside,water:false,indoor:inside,building:inside?0:undefined,space:true};tiles.set(k,t);if(inside)inner.push(t);}
 const t=(x,z)=>tiles.get(key(x,z)),tl=([dx,dz])=>t(...world([dx,dz]));
 const edges=createEdgeFeatures({parent:group,pickables,tileAt:t,style:wallStyle}),doors=[];
 // The outside walls: where a floor's edge lies on the building's, it keeps the outside's windows (and, a
 // separate ground floor, its doors); anywhere else it's a plain wall.
 const outside=new Map(plan.edges.map(e=>[[e.a.join(','),e.b.join(',')].join('|'),e]));
 for(const n of inner)for(const [dx,dz] of Object.values(DIRS)){const m=t(n.x+dx,n.z+dz);if(!m||m.indoor)continue;const e=outside.get(`${n.x},${n.z}|${m.x},${m.z}`);
  if(e?.kind==='door'&&level===0&&!inPlace){const door=edges.add(n,m,'door',{owner:0,style,locked:!!e.door?.locked});door.link=links.exit(e);doors.push(door);}
  else edges.add(n,m,level>=0&&e?.kind==='window'?'window':'wall',{owner:0,style:wallStyle});}
 for(const e of spec.edges||[]){const a=tl(e.a),b=tl(e.b);if(a&&b&&!edges.info(a,b))edges.add(a,b,e.kind,{style:wallStyle});}
 // Stairwells: this floor's flight up, and the opening down where the floor below's flight arrives.
 const stairs=[],live=f=>({bottom:tl(f.bottom),top:tl(f.top),front:tl(f.front)}),ok=p=>p.bottom?.indoor&&p.top?.indoor;
 const toLevel=(l,via)=>l===0&&inPlace?links.ground(via,flightOf(via==='up'?levels.get(-1).up:levels.get(0).up)):links.floor(l,via);
 if(spec.up&&(levels.has(level+1)||level+1===0&&inPlace)){const place=live(flightOf(spec.up));if(ok(place))stairs.push(createStairwell({place,direction:'up',link:toLevel(level+1,'up'),parent:group,pickables,services,tileAt:t}));}
 const below=levels.get(level-1);if(below?.up&&(levels.has(level-1)||level-1===0)){const place=live(flightOf(below.up));if(ok(place))stairs.push(createStairwell({place,direction:'down',link:toLevel(level-1,'down'),parent:group,pickables,services,tileAt:t}));}
 const furniture=[];
 for(const f of spec.furniture||[]){try{furniture.push(createProp(f.kind,{origin:world(f.at),rotation:f.rotation||0,tileAt:t,parent:group,pickables,colors:f.colors||null}));}catch{}}
 mergeStatic(group,furniture.filter(p=>!p.def.interaction).map(p=>p.group),{name:'furniture-merged'});
 createTerrainBatch({tiles:inner,map:tiles,factory:tile=>floorTile(tile,tiles),parent:group,pickables});
 edges.bake();
 const free=n=>n&&n.indoor&&!n.blocked,besideTop=well=>ARRIVAL_ORDER.map(([dx,dz])=>t(well.place.top.x+dx,well.place.top.z+dz)).find(free);
 return {group,tiles,doors,stairs,edges,inner,furniture,level,
  arrival(from){if(from?.door!==undefined){const door=doors[from.door];return door?.a||inner.find(free);}
   const down=stairs.find(s=>s.direction==='down'),up=stairs.find(s=>s.direction==='up');
   if(from==='up'&&down)return besideTop(down)||inner.find(free);
   if(from==='down'&&up&&free(up.place.front))return up.place.front;
   return (up&&free(up.place.front)?up.place.front:null)||inner.find(free);},
  dispose(){edges.dispose();for(const m of [...pickables]){let o=m;while(o&&o!==group)o=o.parent;if(o===group)pickables.splice(pickables.indexOf(m),1);}group.removeFromParent();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});for(const p of furniture)p.dispose?.();}};
}
// Where stairs can go: two tiles along a wall rising into a corner (the top), with a free tile in front
// of the bottom step, none of them a door's inside tile. Corners are tried farthest from the door
// first (spec.stairs: a top tile of your own first). Returns local placements {top, bottom, front}
// on distinct tiles.
export function stairsPlacements(plan,spec={}){
 const inside=(x,z)=>x>=0&&z>=0&&x<plan.w&&z<plan.d,doors=plan.doors.map(d=>[d.inside[0]-plan.x0,d.inside[1]-plan.z0]),door=doors[0]||[0,0];
 const isDoor=(x,z)=>doors.some(([a,b])=>a===x&&b===z);
 const corners=[[0,0],[plan.w-1,0],[0,plan.d-1],[plan.w-1,plan.d-1]].sort((a,b)=>Math.hypot(b[0]-door[0],b[1]-door[1])-Math.hypot(a[0]-door[0],a[1]-door[1]));
 const tops=spec.stairs?[spec.stairs,...corners]:corners,out=[],used=new Set();
 for(const top of tops){
  const inward=[[top[0]===0?1:-1,0],[0,top[1]===0?1:-1]].sort((a,b)=>(b[0]?plan.w:plan.d)-(a[0]?plan.w:plan.d));
  for(const [vx,vz] of inward){const bottom=[top[0]+vx,top[1]+vz],front=[top[0]+2*vx,top[1]+2*vz],cells=[top,bottom,front];
   if(!cells.every(([x,z])=>inside(x,z)&&!isDoor(x,z)&&!used.has(`${x},${z}`)))continue;
   out.push({top,bottom,front});for(const [x,z] of cells)used.add(`${x},${z}`);break;}
  if(out.length>=2)break;
 }
 return out;
}
// Interior checks (the editor lists them with the map checks): an interior matches the outside
// footprint (upper floors may be smaller, never larger), its stairwell is inside and off the door tiles,
// and a dungeon has a size and an exit inside it.
export function interiorProblems(data){
 const out=[];
 data.buildings.forEach((b,i)=>{if(b.desc.interior!=='separate')return;let plan;try{plan=planBuilding(b.desc,[b.x,b.z]);}catch{return;}
  if(floorLevels(b))return;
  const spec=b.interior||{},places=stairsPlacements(plan,spec),floors=spec.floors||b.desc.storeys||1;
  if(floors<1||floors>b.desc.storeys)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} has ${floors} interior floors for ${b.desc.storeys} storeys outside.`});
  if(floors>1&&!places.length)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} has no room for its stairs (two tiles along a wall and a free tile in front).`});
  if(floors>2&&places.length<2)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} needs two stair corners for ${floors} floors.`});
  if(!plan.doors.length)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} has a separate interior but no door.`});
  void i;});
 // Floors by hand (user, 2026-10-14): a floor may be any size, but one above the ground that is wider or
 // deeper than the floor below it is a warning (underground floors aren't limited at all); each flight is on
 // both floors it joins; the outside is tall enough for the floors above the ground.
 data.buildings.forEach(b=>{const levels=floorLevels(b);if(!levels)return;let plan;try{plan=planBuilding(b.desc,[b.x,b.z]);}catch{return;}
  const name=b.desc.name||'A building',at=[b.x,b.z],foot=plan.tiles.map(([x,z])=>[x-plan.x0,z-plan.z0]),byLevel=new Map(levels.map(f=>[f.level,f]));
  const cellsOf=f=>f?.cells?.length?f.cells:foot,shape=f=>new Set(cellsOf(f).map(c=>c.join(','))),span=cells=>{const xs=cells.map(c=>c[0]),zs=cells.map(c=>c[1]);return [Math.max(...xs)-Math.min(...xs)+1,Math.max(...zs)-Math.min(...zs)+1];};
  const label=l=>l<0?'the cellar':l===0?'the ground':`floor ${l+1}`;
  const above=levels.filter(f=>f.level>0).length;if(above>(b.desc.storeys||1)-1)out.push({kind:'floors',severity:'error',tile:at,text:`${name} has ${above} floor${above>1?'s':''} above the ground but ${b.desc.storeys||1} storey${(b.desc.storeys||1)>1?'s':''} outside.`});
  for(const f of levels){
   if(f.level>0){const [w,d]=span(cellsOf(f)),[bw,bd]=span(cellsOf(byLevel.get(f.level-1)));
    if(w>bw||d>bd)out.push({kind:'floors',severity:'warning',tile:at,text:`${name}: floor ${f.level+1} is ${w} × ${d}, bigger than the floor below (${bw} × ${bd}).`});}
   if(!f.up)continue;const next=byLevel.get(f.level+1);if(!next&&f.level!==-1)continue;const fl=flightOf(f.up),own=shape(f),onto=shape(next);
   for(const [part,c] of [['bottom',fl.bottom],['top',fl.top]])if(!own.has(c.join(','))||!onto.has(c.join(',')))out.push({kind:'floors',severity:'error',tile:[plan.x0+c[0],plan.z0+c[1]],text:`${name}: the stairs up from ${label(f.level)} leave the floor (${part}).`});}
  for(const f of levels)if(f.level!==0&&!levels.some(o=>o.level===f.level-1&&o.up||f.level<0&&f.up))out.push({kind:'floors',severity:'warning',tile:at,text:`${name}: ${f.level<0?'the cellar':`floor ${f.level+1}`} has no stairs to it.`});
 });
 for(const [id,spec] of Object.entries(data.interiors||{})){if(spec.kind!=='dungeon')continue;
  // Dungeons and caves by hand: a way out from the top level, stairs to every level below, an entrance.
  const levels=floorLevels(spec);if(levels){const name=spec.name||`Dungeon ${id}`,top=levels.find(f=>f.level===-1);
   if(!top?.up)out.push({kind:'dungeon',severity:'error',tile:data.spawn,text:`${name} has no stairs up out of it.`});
   for(const f of levels)if(f.level<-1&&!f.up)out.push({kind:'dungeon',severity:'warning',tile:data.spawn,text:`${name}: level ${-f.level} has no stairs up.`});
   if(!data.props.some(p=>p.kind==='dungeonEntrance'&&p.link===id))out.push({kind:'dungeon',severity:'warning',tile:data.spawn,text:`${name} has no entrance on the map.`});
   continue;}
  const [w,d]=spec.size||[0,0];
  if(!(w>=4&&d>=4))out.push({kind:'dungeon',severity:'error',tile:data.spawn,text:`Dungeon ${id} needs a size of at least 4 × 4.`});
  if(!spec.exit||spec.exit[0]<0||spec.exit[1]<0||spec.exit[0]>=w||spec.exit[1]>=d)out.push({kind:'dungeon',severity:'error',tile:data.spawn,text:`Dungeon ${id}'s exit must be inside it.`});
  if(!data.props.some(p=>p.kind==='dungeonEntrance'&&p.link===id))out.push({kind:'dungeon',severity:'warning',tile:data.spawn,text:`Dungeon ${id} has no entrance in the city.`});}
 return out;
}

// Moving between spaces. A link is {kind:'interior', city, building, door} (a city door into a
// building), {kind:'floor', city, building, floor}, {kind:'dungeon', city, id} or {kind:'exit', area,
// tile:[x, z]}. city: a built map (world-map.js) with `areaId`. The spaces for a building or dungeon
// are built on first use and registered as areas; forget(builtMap) drops them (the editor rebuilds).
export function createSpaces({areas,scene,pickables=[],stop=()=>{},fade=()=>{},arrived=()=>{},view={get:()=>null,set(){}}}){
 const built=new Map();let transition=null,serial=0;
 const services={enter:(link,options)=>enter(link,options)};
 function mapKey(builtMap){builtMap.spaceKey??=`s${++serial}`;return builtMap.spaceKey;}
 function spacesFor(builtMap,building){
  const id=`${mapKey(builtMap)}:${building}`;if(built.has(id))return built.get(id);
  const entry=builtMap.data.buildings[building],plan=builtMap.buildings[building].plan,spec=entry.interior||{},floors=Math.min(spec.floors||entry.desc.storeys||1,entry.desc.storeys||1),base=builtMap.buildings[building].top-(entry.desc.storeys||1)*1.5;
  const record={ids:[],spaces:[],byLevel:new Map()};built.set(id,record);
  // Floors by hand: one space per level (an in-place building's ground floor is the overworld itself).
  const levels=floorLevels(entry);
  if(levels){const inPlace=entry.desc.interior!=='separate',ground=builtMap.buildings[building].groundHeight??(plan.tiles.map(([x,z])=>builtMap.tiles.get(key(x,z))?.h??1).reduce((a,b)=>Math.max(a,b),1));
   for(const f of levels){if(f.level===0&&inPlace)continue;
    const links={exit:e=>({kind:'exit',area:builtMap.areaId,tile:e.b}),floor:(level,via)=>({kind:'floor',builtMap,building,level,via}),
     ground:(via,flight)=>({kind:'exit',area:builtMap.areaId,tile:[plan.x0+flight[via==='up'?'top':'front'][0],plan.z0+flight[via==='up'?'top':'front'][1]]})};
    const space=buildFloorSpace({pickables,plan,entry,level:f.level,style:entry.desc.style,base:ground,links,services,inPlace}),areaId=`${id}:L${f.level}#${++serial}`;scene.add(space.group);
    const name=entry.desc.name||'Building',floorName=f.level<0?'cellar':f.level===0?'ground floor':`floor ${f.level+1}`;
    areas.register({id:areaId,name:`${name} (${floorName})`,description:'Interior',listed:()=>false,group:space.group,tiles:space.tiles,maxZoom:INTERIOR_MAX_ZOOM,interior:true,camera:{background:SPACE_BACKGROUND},building,level:f.level,builtMap});
    record.ids.push(areaId);record.spaces.push(space);record.byLevel.set(f.level,{areaId,space});}
   return record;}
  for(let floor=0;floor<floors;floor++){
   const links={exit:e=>({kind:'exit',area:builtMap.areaId,tile:e.b}),floor:(f,via)=>({kind:'floor',builtMap,building,floor:f,via})};
   const use=floor===0?furnishingUse(entry.desc):upstairsUse(entry.desc.use);
   const space=buildSpace({pickables,plan,floor,floors,spec,style:entry.desc.style,base,links,services,use});
   const areaId=`${id}:f${floor}`;scene.add(space.group);
   areas.register({id:areaId,name:`${entry.desc.name||'Building'}${floors>1?` (floor ${floor+1})`:''}`,description:'Interior',listed:()=>false,group:space.group,tiles:space.tiles,maxZoom:INTERIOR_MAX_ZOOM,interior:true,camera:{background:SPACE_BACKGROUND}});
   record.ids.push(areaId);record.spaces.push(space);
  }
  return record;
 }
 function dungeonFor(builtMap,dungeon){
  const id=`${mapKey(builtMap)}:d:${dungeon}`;if(built.has(id))return built.get(id);
  const spec=builtMap.data.interiors[dungeon],entrance=builtMap.data.props.find(p=>p.kind==='dungeonEntrance'&&p.link===dungeon);
  const back=entrance?builtMap.props.find(p=>p.kind==='dungeonEntrance'&&p.tile.x===entrance.x&&p.tile.z===entrance.z)?.spots[0]?.tile:null;
  // Dungeons and caves by hand (docs/CITY.md, Dungeons and caves): levels −1, −2… like a building's floors
  // with no building (any shape, stone walls, stairs between levels); the top level's stairs up lead out
  // to the entrance.
  const levels=floorLevels(spec);
  if(levels){const top=levels.at(-1),plan={x0:0,z0:0,w:0,d:0,tiles:(top.cells||[]).map(c=>[...c]),edges:[],doors:[],anchors:{}},record={ids:[],spaces:[],byLevel:new Map()};built.set(id,record);
   const out=()=>({kind:'exit',area:builtMap.areaId,tile:back?[back.x,back.z]:[...builtMap.data.spawn]});
   for(const f of levels){const links={exit:out,floor:(level,via)=>({kind:'floor',builtMap,dungeon,level,via}),ground:out};
    const space=buildFloorSpace({pickables,plan,entry:spec,level:f.level,style:'dungeon',base:1,links,services,inPlace:true,underground:{wall:spec.wall||'dungeon',surface:spec.surface||'dungeon'}}),areaId=`${id}:L${f.level}#${++serial}`;scene.add(space.group);
    areas.register({id:areaId,name:`${spec.name||'Dungeon'}${levels.length>1?` (level ${-f.level})`:''}`,description:'Dungeon',listed:()=>false,group:space.group,tiles:space.tiles,maxZoom:DUNGEON_MAX_ZOOM,interior:true,camera:{background:SPACE_BACKGROUND},dungeon,level:f.level,builtMap});
    record.ids.push(areaId);record.spaces.push(space);record.byLevel.set(f.level,{areaId,space});}
   return record;}
  const links={exit:()=>({kind:'exit',area:builtMap.areaId,tile:back?[back.x,back.z]:[...builtMap.data.spawn]}),floor:()=>null};
  const space=buildSpace({pickables,size:spec.size,origin:[0,0],spec,kind:'dungeon',base:1,links,services,use:spec.use||'crypt',lootId:`${builtMap.data.id}:${dungeon}:chest`,loot:spec.loot||{copperOre:3,logs:2}}),areaId=id;scene.add(space.group);
  areas.register({id:areaId,name:spec.name||'Dungeon',description:'Dungeon',listed:()=>false,group:space.group,tiles:space.tiles,maxZoom:DUNGEON_MAX_ZOOM,interior:true,camera:{background:SPACE_BACKGROUND}});
  const record={ids:[areaId],spaces:[space]};built.set(id,record);return record;
 }
 // Where a link leads: [area id, landing tile].
 function resolve(link,from){
  if(link.kind==='interior'){const r=spacesFor(link.builtMap,link.building),g=r.byLevel.get(0);if(g)return [g.areaId,g.space.arrival({door:link.door})];return [r.ids[0],r.spaces[0].arrival({door:link.door})];}
  if(link.kind==='floor'&&link.dungeon!==undefined){const r=dungeonFor(link.builtMap,link.dungeon),f=r.byLevel?.get(link.level);return f?[f.areaId,f.space.arrival(link.via||null)]:[null,null];}
  if(link.kind==='floor'&&link.level!==undefined&&link.dungeon===undefined){const r=spacesFor(link.builtMap,link.building),f=r.byLevel.get(link.level);return f?[f.areaId,f.space.arrival(link.via||null)]:[null,null];}
  if(link.kind==='floor'){const r=spacesFor(link.builtMap,link.building);return [r.ids[link.floor],r.spaces[link.floor].arrival(link.via||null)];}
  if(link.kind==='dungeon'){const r=dungeonFor(link.builtMap,link.id),top=r.byLevel?.get(-1);if(top)return [top.areaId,top.space.arrival('down')];return [r.ids[0],r.spaces[0].arrival(null)];}
  if(link.kind==='exit'){const area=areas.get(link.area);return [link.area,area?.tiles.get(key(...link.tile))];}
  void from;return [null,null];
 }
 let saved=null;
 function enter(link,{from}={}){
  if(transition||!link)return false;
  const [area,landing]=resolve(link,from);if(!area||!landing)return false;
  stop();transition={area,landing,age:0,switched:false,leaving:areas.active?.interior&&link.kind==='exit'};return true;
 }
 return {services,enter,resolve,
  get busy(){return !!transition;},
  update(dt){
   if(!transition)return;const tr=transition;tr.age+=dt;
   if(!tr.switched&&tr.age>=FADE){
    const wasInside=!!areas.active?.interior;if(!wasInside)saved=view.get();
    if(!areas.activate(tr.area,{landing:tr.landing,announce:false})){transition=null;fade(0);return;}
    tr.switched=true;const next=areas.active;
    if(next.interior){const v=view.get();if(v&&v.zoom>next.maxZoom)view.set({...v,zoom:next.maxZoom});}else if(saved){view.set(saved);saved=null;}
    arrived(tr.landing);
   }
   if(tr.age>=FADE*2){transition=null;fade(0);areas.enter({arrival:false});}
   else fade(tr.age<FADE?tr.age/FADE:1-(tr.age-FADE)/FADE);
  },
  // Rebuilds one building's spaces from its (edited) data, the one you stand in included: the editor's
  // floors (docs/CITY.md, Floors). Returns the record; the caller re-activates where you were.
  // at: [x, z] where you stand, kept when you're inside one of them.
  rebuild(builtMap,building,{at=null,dungeon=null}={}){const id=dungeon!==null?`${mapKey(builtMap)}:d:${dungeon}`:`${mapKey(builtMap)}:${building}`,old=built.get(id),inside=old&&old.ids.includes(areas.id)?areas.active.level:null;built.delete(id);
   const record=dungeon!==null?dungeonFor(builtMap,dungeon):spacesFor(builtMap,building);
   if(inside!==null){const next=record.byLevel?.get(inside)||[...(record.byLevel?.values()||[])][0];
    if(next){const landing=(at&&next.space.tiles.get(key(...at)))||next.space.arrival(null);const t=landing&&!landing.blocked&&landing.indoor?landing:next.space.arrival(null);areas.activate(next.areaId,{landing:t,announce:false,arrival:false});arrived(t);}
    else{const area=areas.get(builtMap.areaId);if(area)areas.activate(builtMap.areaId,{landing:builtMap.spawn,announce:false,arrival:false});}}
   if(old){for(const a of old.ids)areas.unregister?.(a);for(const sp of old.spaces)sp.dispose();}
   return record;},
  // The building and level of the space you're in (floors by hand), or null.
  get here(){const a=areas.active;return a?.interior&&a.level!==undefined?{builtMap:a.builtMap,building:a.building,dungeon:a.dungeon,level:a.level,tiles:a.tiles,group:a.group}:null;},
  // Drop every space built for a city (before it is rebuilt or disposed).
  forget(builtMap){if(!builtMap?.spaceKey)return;for(const [id,record] of [...built])if(id.startsWith(builtMap.spaceKey+':')&&!record.ids.includes(areas.id)){for(const a of record.ids)areas.unregister?.(a);for(const s of record.spaces)s.dispose();built.delete(id);}},
 };
}
