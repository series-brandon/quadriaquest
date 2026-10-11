import * as THREE from 'three';
import {createTerrainBatch} from './terrain-batch.js';
import {createEdgeFeatures} from './doors.js';
import {planBuilding} from './building-kit.js';
import {createProp,propFootprint} from './props.js';
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
function createStairwell({place,direction,link,parent,pickables,services,tileAt}){
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
 for(const f of spec.furniture||[])if((f.floor??0)===floor){const [fw,fd]=propFootprint(f.kind,f.rotation||0),cells=[];for(let a=0;a<fw;a++)for(let c=0;c<fd;c++)cells.push(t(x0+f.at[0]+a,z0+f.at[1]+c));if(cells.some(c=>!c||c.blocked||keepClear.has(c)))continue;try{createProp(f.kind,{origin:[x0+f.at[0],z0+f.at[1]],rotation:f.rotation||0,tileAt:t,parent:group,pickables});}catch{}}
 createTerrainBatch({tiles:inner,map:tiles,factory:tile=>floorTile(tile,tiles),parent:group,pickables});
 edges.bake();
 // Arriving by stairs: coming up, beside the top of the opening; coming down, in front of the bottom step.
 const free=n=>n&&n.indoor&&!n.blocked,besideTop=well=>ARRIVAL_ORDER.map(([dx,dz])=>t(well.place.top.x+dx,well.place.top.z+dz)).find(free);
 return {group,tiles,doors,stairs,edges,inner,
  arrival(from){if(from?.door!==undefined){const door=doors[from.door];return door?.a||inner.find(n=>!n.blocked);}
   const down=stairs.find(s=>s.direction==='down'),up=stairs.find(s=>s.direction==='up');
   if(from==='up'&&down)return besideTop(down)||inner.find(n=>!n.blocked);
   if(up&&free(up.place.front))return up.place.front;
   return inner.find(n=>!n.blocked);},
  dispose(){edges.dispose();for(const m of [...pickables]){let o=m;while(o&&o!==group)o=o.parent;if(o===group)pickables.splice(pickables.indexOf(m),1);}group.removeFromParent();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};
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
// Interior checks (the editor lists them with the city checks): an interior matches the outside
// footprint (upper floors may be smaller, never larger), its stairwell is inside and off the door tiles,
// and a dungeon has a size and an exit inside it.
export function interiorProblems(data){
 const out=[];
 data.buildings.forEach((b,i)=>{if(b.desc.interior!=='separate')return;let plan;try{plan=planBuilding(b.desc,[b.x,b.z]);}catch{return;}
  const spec=b.interior||{},places=stairsPlacements(plan,spec),floors=spec.floors||b.desc.storeys||1;
  if(floors<1||floors>b.desc.storeys)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} has ${floors} interior floors for ${b.desc.storeys} storeys outside.`});
  if(floors>1&&!places.length)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} has no room for its stairs (two tiles along a wall and a free tile in front).`});
  if(floors>2&&places.length<2)out.push({kind:'interior',severity:'error',tile:[b.x,b.z],text:`${b.desc.name||'A building'} needs two stair corners for ${floors} floors.`});
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
   const links={exit:e=>({kind:'exit',area:city.areaId,tile:e.b}),floor:(f,via)=>({kind:'floor',city,building,floor:f,via})};
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
  if(link.kind==='floor'){const r=spacesFor(link.city,link.building);return [r.ids[link.floor],r.spaces[link.floor].arrival(link.via||null)];}
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
