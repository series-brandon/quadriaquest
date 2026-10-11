import * as THREE from 'three';
import {createTerrainBatch} from './terrain-batch.js';
import {createEdgeFeatures} from './doors.js';
import {planBuilding} from './building-kit.js';
import {createProp} from './props.js';
import {surfaceColor,DIRS} from './city-terrain.js';
import {tileTopGeometry} from './tile-top.js';
import {mergedMesh} from './merged-model.js';
import {key} from './world.js';

// Separate interiors, stairwells and dungeon entrances (docs/CITY.md, Separate interiors; city
// Phase 7). A building with `interior: 'separate'` is solid outside; its doors carry a `link` and open
// into a small space of its own, one per floor, in the same tile coordinates as its footprint (so the
// rooms line up with the outside). Upper floors and cellars are further spaces joined by a shared
// stairwell entity. A dungeon entrance is a prop with a link to a larger space. Moving between spaces is
// a quick fade (createSpaces), not a full area switch: the city stays as it was.
// Interior spec (city data, on the building entry): {floors, stairs:[dx, dz] (local), surface, furniture:[{kind, at:[dx, dz], floor}]}.
// Dungeon spec (city data.interiors[id]): {kind:'dungeon', size:[w, d], exit:[x, z], furniture:[…]}.
export const INTERIOR_MAX_ZOOM=14,DUNGEON_MAX_ZOOM=18,FADE=.25;

// Stairwell models: a short flight going up along local +z, or a hatch with steps going down.
export function stairwellModel(direction='up'){
 if(direction==='down')return mergedMesh([{geometry:new THREE.BoxGeometry(.9,.04,.9),color:'#5a3d28',position:[0,.02,0]},{geometry:new THREE.BoxGeometry(.78,.02,.78),color:'#1d1915',position:[0,.035,0]},
  ...[0,1,2].map(i=>({geometry:new THREE.BoxGeometry(.7,.02,.18),color:'#6e5a46',position:[0,.03-i*.001,-.26+i*.2]})),{geometry:new THREE.BoxGeometry(.05,.5,.05),color:'#4b4651',position:[-.42,.25,-.42]},{geometry:new THREE.BoxGeometry(.05,.5,.05),color:'#4b4651',position:[.42,.25,-.42]},{geometry:new THREE.BoxGeometry(.9,.05,.05),color:'#4b4651',position:[0,.5,-.42]}]);
 return mergedMesh([...[0,1,2,3,4].map(i=>({geometry:new THREE.BoxGeometry(.8,.25*(i+1),.2),color:i%2?'#a27a55':'#9a7350',position:[0,.125*(i+1),-.4+i*.2]})),
  {geometry:new THREE.BoxGeometry(.05,.9,.05),color:'#5a3d28',position:[.42,.45+.6,.4]},{geometry:new THREE.BoxGeometry(.05,.05,1),color:'#5a3d28',position:[.42,.9,0],rotation:[-.9,0,0]}]);
}
// An interior floor tile: its surface on a thin dark slab (a space floats in darkness, not on a hill).
const floorMaterials=new Map(),floorMaterial=color=>{if(!floorMaterials.has(color))floorMaterials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return floorMaterials.get(color);};
function floorTile(tile,map){
 const group=new THREE.Group();group.add(new THREE.Mesh(tileTopGeometry(tile,map),floorMaterial(surfaceColor(tile))));
 const slab=new THREE.Mesh(new THREE.BoxGeometry(1,.3,1),floorMaterial('#3a322b'));slab.position.y=tile.h-.065-.15;group.add(slab);return group;
}
export const SPACE_BACKGROUND='#2b2622';
const ARRIVAL_ORDER=[[0,1],[1,0],[-1,0],[0,-1]];
// A stairwell entity on a tile: solid, picked like any actor; interact() follows its link.
function createStairwell({tile,direction,facing='s',link,parent,pickables,services}){
 const group=new THREE.Group();group.add(stairwellModel(direction));group.position.set(tile.x-6,tile.h,tile.z-6);group.rotation.y={n:Math.PI,e:Math.PI/2,s:0,w:-Math.PI/2}[facing];parent.add(group);
 tile.blocked=true;
 const well={kind:'stairwell',direction,tile,x:tile.x,z:tile.z,group,link,ready:true,opened:false,duration:0,label:direction==='up'?'Go upstairs':'Go downstairs',available:()=>true,interact(){services.enter(link,{from:well});}};
 group.traverse(m=>{if(m.isMesh){m.userData.actor=well;m.userData.tile=tile;pickables.push(m);}});
 return well;
}
// Builds one floor of a building's interior (or a dungeon) as a space: tiles, walls, doors, stairwells.
// plan: the building's plan (building-kit.js), or null for a dungeon with `size`.
export function buildSpace({pickables=[],plan=null,size=null,origin=[0,0],floor=0,floors=1,spec={},style='timber',base=1,kind='house',links,services}){
 const group=new THREE.Group(),tiles=new Map(),inner=[];
 const [x0,z0]=plan?[plan.x0,plan.z0]:origin,[w,d]=plan?[plan.w,plan.d]:size,surface=spec.surface||(kind==='dungeon'?'stone':floor?'planks':'floor');
 for(let z=z0-1;z<=z0+d;z++)for(let x=x0-1;x<=x0+w;x++){const inside=x>=x0&&x<x0+w&&z>=z0&&z<z0+d;const t={x,z,h:base,surface,blocked:!inside,water:false,indoor:inside,building:inside?0:undefined,space:true};tiles.set(key(x,z),t);if(inside)inner.push(t);}
 const t=(x,z)=>tiles.get(key(x,z));
 const edges=createEdgeFeatures({parent:group,pickables,tileAt:t,style:kind==='dungeon'?'stone':style});
 const doors=[];
 if(plan){for(const e of plan.edges){const a=t(...e.a),b=t(...e.b);
   if(e.kind==='door'&&floor===0){const door=edges.add(a,b,'door',{owner:0,style,locked:!!e.door?.locked});door.link=links.exit(e);doors.push(door);}
   else edges.add(a,b,e.kind==='window'?'window':'wall',{owner:0,style});}}
 else for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+d;z++)for(const [dx,dz] of Object.values(DIRS)){const n=t(x+dx,z+dz);if(n&&!n.indoor&&!edges.info(t(x,z),n))edges.add(t(x,z),n,'wall',{owner:0,style:'stone'});}
 // Stairwells: up from every floor but the top, down from every floor but the ground, on the same tile.
 const stairs=[];
 const local=spec.stairs||(plan?defaultStairs(plan):[0,0]),wellTile=t(x0+local[0],z0+local[1]);
 if(plan&&wellTile){if(floor<floors-1)stairs.push(createStairwell({tile:wellTile,direction:'up',link:links.floor(floor+1),parent:group,pickables,services}));
  else if(floor>0)stairs.push(createStairwell({tile:wellTile,direction:'down',link:links.floor(floor-1),parent:group,pickables,services}));}
 if(!plan&&spec.exit){const exitTile=t(...spec.exit);if(exitTile)stairs.push(createStairwell({tile:exitTile,direction:'up',facing:'n',link:links.exit(null),parent:group,pickables,services}));}
 for(const f of spec.furniture||[])if((f.floor??0)===floor){try{createProp(f.kind,{origin:[x0+f.at[0],z0+f.at[1]],rotation:f.rotation||0,tileAt:t,parent:group,pickables});}catch{}}
 createTerrainBatch({tiles:inner,map:tiles,factory:tile=>floorTile(tile,tiles),parent:group,pickables});
 edges.bake();
 const arrivalBeside=well=>ARRIVAL_ORDER.map(([dx,dz])=>t(well.x+dx,well.z+dz)).find(n=>n&&n.indoor&&!n.blocked)||inner.find(n=>!n.blocked);
 return {group,tiles,doors,stairs,edges,inner,
  arrival(from){if(from?.door!==undefined){const door=doors[from.door];return door?.a||inner.find(n=>!n.blocked);}return stairs[0]?arrivalBeside(stairs[0].tile):inner.find(n=>!n.blocked);},
  dispose(){edges.dispose();for(const m of [...pickables]){let o=m;while(o&&o!==group)o=o.parent;if(o===group)pickables.splice(pickables.indexOf(m),1);}group.removeFromParent();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};
}
// The stairwell's default tile: the inside corner farthest from the first door, kept off every door's
// inside tile.
export function defaultStairs(plan){
 const door=plan.doors[0]?.inside||[plan.x0,plan.z0],corners=[[0,0],[plan.w-1,0],[0,plan.d-1],[plan.w-1,plan.d-1]];
 return corners.sort((a,b)=>Math.hypot(plan.x0+b[0]-door[0],plan.z0+b[1]-door[1])-Math.hypot(plan.x0+a[0]-door[0],plan.z0+a[1]-door[1]))[0];
}

// Interior checks (the editor lists them with the city checks): an interior matches the outside
// footprint (upper floors may be smaller, never larger), its stairwell is inside and off the door tiles,
// and a dungeon has a size and an exit inside it.
export function interiorProblems(data){
 const out=[];
 data.buildings.forEach((b,i)=>{if(b.desc.interior!=='separate')return;let plan;try{plan=planBuilding(b.desc,[b.x,b.z]);}catch{return;}
  const spec=b.interior||{},s=spec.stairs||defaultStairs(plan),floors=spec.floors||b.desc.storeys||1;
  if(floors<1||floors>b.desc.storeys)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} has ${floors} interior floors for ${b.desc.storeys} storeys outside.`});
  if(floors>1&&(s[0]<0||s[1]<0||s[0]>=plan.w||s[1]>=plan.d))out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'}'s stairwell is outside its footprint.`});
  if(floors>1&&plan.doors.some(d=>d.inside[0]===plan.x0+s[0]&&d.inside[1]===plan.z0+s[1]))out.push({kind:'interior',severity:'error',tile:[plan.x0+s[0],plan.z0+s[1]],text:`${b.desc.name||'A building'}'s stairwell blocks a door.`});
  if(!plan.doors.length)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} has a separate interior but no door.`});
  void i;});
 for(const [id,spec] of Object.entries(data.interiors||{})){if(spec.kind!=='dungeon')continue;const [w,d]=spec.size||[0,0];
  if(!(w>=4&&d>=4))out.push({kind:'dungeon',severity:'error',tile:data.spawn,text:`Dungeon ${id} needs a size of at least 4 × 4.`});
  if(!spec.exit||spec.exit[0]<0||spec.exit[1]<0||spec.exit[0]>=w||spec.exit[1]>=d)out.push({kind:'dungeon',severity:'error',tile:data.spawn,text:`Dungeon ${id}'s exit must be inside it.`});
  if(!data.props.some(p=>p.kind==='dungeonEntrance'&&p.link===id))out.push({kind:'dungeon',severity:'warning',tile:data.spawn,text:`Dungeon ${id} has no entrance in the city.`});}
 return out;
}

// Moving between spaces. A link is {kind:'interior', city, building, door} (a city door into a
// building), {kind:'floor', city, building, floor}, {kind:'dungeon', city, id} or {kind:'exit', area,
// tile:[x, z]}. city: a built city (city-map.js) with `areaId`. The spaces for a building or dungeon
// are built on first use and registered as areas; forget(city) drops them (the editor rebuilds).
export function createSpaces({areas,scene,pickables=[],stop=()=>{},fade=()=>{},arrived=()=>{},view={get:()=>null,set(){}}}){
 const built=new Map();let transition=null,serial=0;
 const services={enter:(link,options)=>enter(link,options)};
 function cityKey(city){city.spaceKey??=`s${++serial}`;return city.spaceKey;}
 function spacesFor(city,building){
  const id=`${cityKey(city)}:${building}`;if(built.has(id))return built.get(id);
  const entry=city.data.buildings[building],plan=city.buildings[building].plan,spec=entry.interior||{},floors=Math.min(spec.floors||entry.desc.storeys||1,entry.desc.storeys||1),base=city.buildings[building].top-(entry.desc.storeys||1)*1.5;
  const record={ids:[],spaces:[]};built.set(id,record);
  for(let floor=0;floor<floors;floor++){
   const links={exit:e=>({kind:'exit',area:city.areaId,tile:e.b}),floor:f=>({kind:'floor',city,building,floor:f})};
   const space=buildSpace({pickables,plan,floor,floors,spec,style:entry.desc.style,base,links,services});
   const areaId=`${id}:f${floor}`;scene.add(space.group);
   areas.register({id:areaId,name:`${entry.desc.name||'Building'}${floors>1?` (floor ${floor+1})`:''}`,description:'Interior',listed:()=>false,group:space.group,tiles:space.tiles,maxZoom:INTERIOR_MAX_ZOOM,interior:true,camera:{background:SPACE_BACKGROUND}});
   record.ids.push(areaId);record.spaces.push(space);
  }
  return record;
 }
 function dungeonFor(city,dungeon){
  const id=`${cityKey(city)}:d:${dungeon}`;if(built.has(id))return built.get(id);
  const spec=city.data.interiors[dungeon],entrance=city.data.props.find(p=>p.kind==='dungeonEntrance'&&p.link===dungeon);
  const back=entrance?city.props.find(p=>p.kind==='dungeonEntrance'&&p.tile.x===entrance.x&&p.tile.z===entrance.z)?.spots[0]?.tile:null;
  const links={exit:()=>({kind:'exit',area:city.areaId,tile:back?[back.x,back.z]:[...city.data.spawn]}),floor:()=>null};
  const space=buildSpace({pickables,size:spec.size,origin:[0,0],spec,kind:'dungeon',base:1,links,services}),areaId=id;scene.add(space.group);
  areas.register({id:areaId,name:spec.name||'Dungeon',description:'Dungeon',listed:()=>false,group:space.group,tiles:space.tiles,maxZoom:DUNGEON_MAX_ZOOM,interior:true,camera:{background:SPACE_BACKGROUND}});
  const record={ids:[areaId],spaces:[space]};built.set(id,record);return record;
 }
 // Where a link leads: [area id, landing tile].
 function resolve(link,from){
  if(link.kind==='interior'){const r=spacesFor(link.city,link.building);return [r.ids[0],r.spaces[0].arrival({door:link.door})];}
  if(link.kind==='floor'){const r=spacesFor(link.city,link.building);return [r.ids[link.floor],r.spaces[link.floor].arrival(null)];}
  if(link.kind==='dungeon'){const r=dungeonFor(link.city,link.id);return [r.ids[0],r.spaces[0].arrival(null)];}
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
  // Drop every space built for a city (before it is rebuilt or disposed).
  forget(city){if(!city?.spaceKey)return;for(const [id,record] of [...built])if(id.startsWith(city.spaceKey+':')&&!record.ids.includes(areas.id)){for(const a of record.ids)areas.unregister?.(a);for(const s of record.spaces)s.dispose();built.delete(id);}},
 };
}
