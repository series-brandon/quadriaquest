import {Group,Mesh,Matrix4,Float32BufferAttribute,Color,MeshStandardMaterial,MeshDepthMaterial,RGBADepthPacking,Box3} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {applyCutaway,registerCutSource,sectionMaterial,restoreCutPart} from './cutaway.js';
import {setEdge,edgeBetween} from './world.js';
import {occupancy} from './world-occupancy.js';
import {edgePiece,doorModel,animateDoor,edgePlacement,cornerPost,hasPosts,setDoorHinge,STYLES,stylePalette} from './edge-models.js';

// Doors are shared entities that sit on a tile edge (docs/CITY.md, Walls and doors on tile edges).
// RuneScape-style: a closed door blocks walking, sight and reach like a wall, so routes never pass
// through one; it has to be opened first. Clicking a door walks you up to it (on whichever side is
// nearer) and opens it, or closes it if open. It stays as it was left. A locked door won't open and
// rattles. `link` is reserved for interior spaces.
// A door belongs to the building or room on its first tile (`a`) and opens into it: a quarter turn to
// lie along that tile's side edge at the hinge corner, where the open door is a wall (nobody walks or
// sees through the door itself). The door rule (doorProblems) keeps that edge free.
const doors=new Set(),SWING=4;
let services={toast(){},tile:()=>null,sound(){}};
// The game supplies feedback once (main.js); doors in every map share it.
export function configureDoors(next){services={...services,...next};}
// Follows a link to another space (a stairwell in a building's ground floor; spaces.js), as a door does.
export function enterLink(link,options){return services.enter?.(link,options);}
// The shared door sounds, for doors that aren't edge doors (a city's gates, city-walls.js).
export const doorSound=name=>services.sound(name);

export function createDoor({a,b,parent,pickables=[],locked=false,open=false,link=null,style,storeys=1,upperWindows=false}){
 const place=edgePlacement(a,b,storeys),acrossZ={x:Math.round(Math.sin(place.rotation)),z:Math.round(Math.cos(place.rotation))};
 // A raised floor on one side: the opening starts at the higher floor, with a step on the lower side.
 const low=a.h<b.h?a:b,high=low===a?b:a,lower=Math.sign((low.x-high.x)*acrossZ.x+(low.z-high.z)*acrossZ.z)||1;
 const model=doorModel({height:place.height,storeys,sill:Math.abs(a.h-b.h),lower,style,upperWindows}),{group,leaf}=model;
 group.position.set(place.x,place.y,place.z);group.rotation.y=place.rotation;parent.add(group);
 // The piece's local axes in tiles: +x along the wall, +z across it. `inward` is the side of `a`.
 const along={x:Math.round(Math.cos(place.rotation)),z:-Math.round(Math.sin(place.rotation))},across={x:Math.round(Math.sin(place.rotation)),z:Math.round(Math.cos(place.rotation))};
 const inward=Math.sign((a.x-b.x)*across.x+(a.z-b.z)*across.z)||1;
 let leafEdge=null;
 const door={kind:'door',a,b,tile:a,x:(a.x+b.x)/2,z:(a.z+b.z)/2,group,leaf,model,locked,link,open:false,amount:0,rattle:0,ready:true,opened:false,duration:0,
  // Tiles beside `a` along the wall, for the swing; maps supply them (createEdgeFeatures does).
  neighbour:()=>null,
  get label(){return door.locked?'Locked door':door.open?'Close door':'Open door';},
  interact(){
   if(door.locked){door.rattle=1;services.sound('blocked');services.toast("It's locked.");return;}
   // A linked door (a separate interior, city Phase 7) takes you through to the space behind it.
   if(door.link){services.sound('doorOpen');services.enter?.(door.link,{from:door});return;}
   door.setOpen(!door.open);
  },
  gate:['fenceGate','ironGate'].includes(style),
  setOpen(value,{quiet=false}={}){value=!!value&&!door.locked;if(value===door.open)return;door.open=value;
   if(value)swingOpen();else if(leafEdge){if(edgeBetween(leafEdge.a,leafEdge.b)===leafEdge.feature)setEdge(leafEdge.a,leafEdge.b,null);leafEdge=null;}
   if(!quiet)services.sound(value?'doorOpen':'doorClose');},
  setLocked(value){door.locked=!!value;if(door.locked&&door.open)door.setOpen(false);},
  dispose(){if(door.open)door.setOpen(false,{quiet:true});doors.delete(door);if(edgeBetween(a,b)===door)setEdge(a,b,null);group.removeFromParent();for(const m of meshes){const i=pickables.indexOf(m);if(i>=0)pickables.splice(i,1);}},
 };
 // Pick the hinge whose inside side edge is free (the door rule guarantees one), turn inwards, and make
 // the open door a wall on that edge.
 function swingOpen(){
  let chosen=null;
  for(const hinge of [-1,1]){const side=door.neighbour(a.x+hinge*along.x,a.z+hinge*along.z);if(side&&!edgeBetween(a,side)){chosen={hinge,side};break;}}
  setDoorHinge(model,chosen?.hinge??-1,inward);
  if(chosen){const feature={kind:'wall',door};setEdge(a,chosen.side,feature);leafEdge={a,b:chosen.side,feature};}
 }
 // The wall above a door (upper storeys) is scenery, not the door.
 const upper=new Set();model.upper.traverse(m=>upper.add(m));
 const meshes=[];group.traverse(m=>{if(m.isMesh&&!upper.has(m)){m.userData.actor=door;m.userData.tile=a;pickables.push(m);meshes.push(m);}});
 setEdge(a,b,door);doors.add(door);if(open)door.setOpen(true,{quiet:true});return door;
}
// The door rule (user decision, 2026-10-11): along a door's wall line there is at least one wall (or
// window) on each side of it before any perpendicular wall, so nothing meets the door's corners and an
// opening door always has a free edge to lie on. Returns problems (empty when the door is fine).
export function doorProblems(door,tileAt){
 const {a,b}=door,u=a.x===b.x?{x:1,z:0}:{x:0,z:1},problems=[];
 for(const s of [-1,1]){
  const a2=tileAt(a.x+s*u.x,a.z+s*u.z),b2=tileAt(b.x+s*u.x,b.z+s*u.z),inLine=a2&&b2?edgeBetween(a2,b2):null;
  // A gate in a fence line counts its fence (or railing, or low wall) as the wall beside it.
  if(!inLine||!['wall','window','fence','railing','low'].includes(inLine.kind))problems.push(`no wall beside the door on its ${s<0?'west/north':'east/south'} side`);
  // A gate only needs its swing side clear (stair railings may meet it on the far side).
  for(const [t,n] of door.gate?[[a,a2]]:[[a,a2],[b,b2]])if(n&&edgeBetween(t,n)&&!edgeBetween(t,n).door)problems.push('a perpendicular wall meets the door\u2019s corner');
 }
 return problems;
}
// Walking up to a door: to whichever of its two tiles is cheaper to reach (a door is used from either
// side; the edge itself never needs crossing). [] when already there; null when neither is reachable.
export function doorApproach(door,start,route){
 if(start===door.a||start===door.b)return {at:start,route:[]};
 return [door.a,door.b].map(at=>({at,route:route(at)})).filter(c=>c.route).sort((x,y)=>x.route.length-y.route.length)[0]||null;
}
export function updateDoors(dt,time=0){
 for(const d of doors){
  d.amount+=Math.sign((d.open?1:0)-d.amount)*Math.min(Math.abs((d.open?1:0)-d.amount),dt*SWING);
  d.rattle=Math.max(0,d.rattle-dt*2.5);
  animateDoor(d.model,d.amount,d.rattle,time);
 }
}
export const activeDoors=()=>[...doors];

// Places edge features in a map: static pieces (walls, windows, fences, railings, counters) and doors.
// Maps and fixtures describe where; the pieces, rules and door behaviour are shared.
// style: the default style (edge-models.js STYLES); each add may override it.
// Buildings: edges carry their owner building(s), and the features report each building's box and its
// hiding parts (door tops, plus roofs and other parts added with addCutPart) to the cutaway.
// cutParts(): every hiding part with its owners.
export function createEdgeFeatures({parent,pickables=[],tileAt=()=>null,style,cutaway=true}){
 const root=new Group();root.name='edge-features';parent.add(root);
 const placed=new Map(),id=(a,b)=>[a,b].map(t=>`${t.x},${t.z}`).sort().join('|');
 // One timber post per grid corner where walls, windows or doors end, covering every joint (a corner,
 // a T-junction, a run of wall) and rising just above the tallest cap, so pieces never fight there.
 const posts=new Map();
 const corners=(a,b)=>a.x===b.x?[[a.x-.5,(a.z+b.z)/2],[a.x+.5,(a.z+b.z)/2]]:[[(a.x+b.x)/2,a.z-.5],[(a.x+b.x)/2,a.z+.5]];
 function refreshPost(k){
  const post=posts.get(k);post.group?.removeFromParent();post.group=null;
  if(!post.users.size){posts.delete(k);return;}
  const spans=[...post.users.values()];
  // Seamless styles (stone, brick, graybox) have a post only where walls turn, meet, or end; timber
  // keeps one on every corner, which reads as half-timbering.
  if(stylePalette(spans[0].style).seamless&&spans.length===2&&spans[0].axis===spans[1].axis)return;
  const base=Math.min(...spans.map(s=>s.base)),top=Math.max(...spans.map(s=>s.top));
  post.group=cornerPost(top-base+.03,{style:spans[0].style});post.group.position.set(post.x-6,base,post.z-6);root.add(post.group);
 }
 function usePosts(itemId,a,b,on,storeys=1){
  boxesDirty=true;
  const place=edgePlacement(a,b,storeys);
  for(const [x,z] of corners(a,b)){const k=`${x},${z}`;if(!posts.has(k))posts.set(k,{x,z,users:new Map(),group:null});const post=posts.get(k);
   if(on)post.users.set(itemId,{base:place.y,top:place.y+place.height,axis:a.x===b.x?'x':'z',style:placed.get(itemId)?.style??style});else post.users.delete(itemId);refreshPost(k);}
 }
 function drop(item){if(item.posts)usePosts(item.id,item.a,item.b,false);if(item.door)item.door.dispose();else{item.group.removeFromParent();if(edgeBetween(item.a,item.b)===item.feature)setEdge(item.a,item.b,null);}}
 function remove(a,b){const k=id(a,b),item=placed.get(k);if(!item)return;unbake();boxesDirty=true;placed.delete(k);drop(item);}
 // Building boxes for the cutaway's line-of-sight test, from every edge each building owns plus its
 // extra parts; recomputed only after changes.
 let boxesDirty=true,boxes=new Map(),links=[];const cutParts=[];
 function grow(id,x0,z0,x1,z1,base,top){if(id<0)return;const b=boxes.get(id);if(!b){boxes.set(id,{x0,z0,x1,z1,base,top});return;}
  b.x0=Math.min(b.x0,x0);b.z0=Math.min(b.z0,z0);b.x1=Math.max(b.x1,x1);b.z1=Math.max(b.z1,z1);b.base=Math.min(b.base,base);b.top=Math.max(b.top,top);}
 function buildingBoxes(){
  if(!boxesDirty)return boxes;boxesDirty=false;boxes=new Map();
  links=[...placed.values()].filter(p=>p.owners[0]>=0&&p.owners[1]>=0).map(p=>p.owners);
  for(const p of placed.values()){const place=edgePlacement(p.a,p.b,p.storeys||1);for(const o of p.owners)grow(o,place.x-.5,place.z-.5,place.x+.5,place.z+.5,place.y,place.y+place.height);}
  root.updateWorldMatrix(true,true);
  for(const {object,owners,box} of cutParts){const b=box||new Box3().setFromObject(object);if(b.isEmpty())continue;for(const o of owners)grow(o,b.min.x,b.min.z,b.max.x,b.max.z,b.min.y,b.max.y);}
  return boxes;
 }
 // cutaway: false for previews (the model viewer), which cut by hand.
 // links: buildings joined by a shared wall ([a, b] pairs, kept with the boxes), so the cutaway cuts a
 // whole terrace together.
 const unregister=!cutaway?()=>{}:registerCutSource({root,boxes:()=>buildingBoxes().entries(),links:()=>{buildingBoxes();return links;},
  parts:()=>[...[...placed.values()].filter(p=>p.door).map(p=>({object:p.door.model.upper,owners:p.owners})),...cutParts]});
 // Baking merges every static piece and post (not doors) into one vertex-coloured mesh, and glass into
 // one see-through mesh: a street of hundreds of wall pieces draws in a few calls. Each vertex keeps its
 // building(s) and base height (`cutOwner`) for the cutaway (cutaway.js). Any later add or remove
 // unbakes first. A second mesh draws the walls' inside as the cut face of cut walls (cutaway.js).
 let baked=null;
 const solidMaterial=applyCutaway(new MeshStandardMaterial({vertexColors:true,roughness:.85})),cutFaceMaterial=sectionMaterial();
 const glassMaterial=applyCutaway(new MeshStandardMaterial({vertexColors:true,roughness:.15,transparent:true,opacity:.45}));
 const depthMaterial=applyCutaway(new MeshDepthMaterial({depthPacking:RGBADepthPacking}));
 function bake(){
  unbake();root.updateMatrixWorld(true);const inverse=new Matrix4().copy(root.matrixWorld).invert(),solid=[],glass=[],hidden=[],color=new Color();
  // A post belongs to every building whose edges meet at it (up to two), so it is cut with either.
  const postOwners=p=>{const ids=[...new Set([...p.users.keys()].flatMap(k=>placed.get(k)?.owners||[]).filter(o=>o>=0))];return [ids[0]??-1,ids[1]??-1];};
  const statics=[...[...placed.values()].filter(p=>p.group).map(p=>({group:p.group,owners:p.owners,base:edgePlacement(p.a,p.b).y})),...[...posts.values()].filter(p=>p.group).map(p=>({group:p.group,owners:postOwners(p),base:p.group.position.y}))];
  for(const {group:g,owners,base} of statics){
   g.traverse(m=>{if(!m.isMesh)return;
    const geometry=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone());geometry.deleteAttribute('uv');geometry.applyMatrix4(new Matrix4().multiplyMatrices(inverse,m.matrixWorld));
    const n=geometry.attributes.position.count,colors=new Float32Array(n*3),own=new Float32Array(n*3);color.copy(m.material.color);
    for(let i=0;i<n;i++){colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;own[i*3]=owners[0];own[i*3+1]=owners[1];own[i*3+2]=base;}
    geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setAttribute('cutOwner',new Float32BufferAttribute(own,3));
    (m.material.transparent?glass:solid).push(geometry);m.visible=false;hidden.push(m);});
   g.visible=false;}
  const meshes=[];
  for(const [list,material,name] of [[solid,solidMaterial,'edge-features-baked'],[glass,glassMaterial,'edge-features-glass']]){
   if(!list.length)continue;const mesh=new Mesh(mergeGeometries(list),material);mesh.castShadow=mesh.receiveShadow=material!==glassMaterial;mesh.customDepthMaterial=depthMaterial;mesh.name=name;root.add(mesh);meshes.push(mesh);for(const g of list)g.dispose();
   if(material===solidMaterial){const section=new Mesh(mesh.geometry,cutFaceMaterial);section.name='edge-features-section';root.add(section);meshes.push(section);}}
  // The originals leave the scene graph while baked (hidden objects still cost a matrix update every
  // frame); unbaking puts them back where they were.
  const groups=statics.map(s=>({group:s.group,parent:s.group.parent}));for(const {group} of groups)group.removeFromParent();
  baked={meshes,hidden,groups};
 }
 function unbake(){if(!baked)return;for(const mesh of baked.meshes){mesh.removeFromParent();mesh.geometry.dispose();}for(const m of baked.hidden)m.visible=true;for(const {group,parent} of baked.groups){parent?.add(group);group.visible=true;}baked=null;}
 return {root,
  // options: storeys, owner (a building id, or two for a shared wall), style, upperWindows (a wall with
  // windows on its upper storeys), paint ({a, b}: wall paint on the face towards each tile), and door
  // options (locked, open, link).
  add(a,b,kind,options={}){
   remove(a,b);
   const k=id(a,b),withPosts=hasPosts(kind),storeys=options.storeys||1,owner=[options.owner??[]].flat(),owners=[owner[0]??-1,owner[1]??-1],pieceStyle=options.style??style;
   unbake();boxesDirty=true;
   if(kind==='door'){const door=createDoor({a,b,parent:root,pickables,...options,style:pieceStyle});door.neighbour=tileAt;placed.set(k,{door,a,b,id:k,posts:withPosts,storeys,owners,style:pieceStyle});if(withPosts)usePosts(k,a,b,true,storeys);return door;}
   // hidden: the edge's rules without a model (stair sides, drawn by their own sloped rail).
   // paint {a, b}: the colour of the face towards each tile; the piece's own front is local +z.
   const place=edgePlacement(a,b,storeys),facesA=Math.sign((a.x-b.x)*Math.sin(place.rotation)+(a.z-b.z)*Math.cos(place.rotation))>0;
   const paint=options.paint&&(options.paint.a||options.paint.b)?{front:facesA?options.paint.a:options.paint.b,back:facesA?options.paint.b:options.paint.a}:null;
   const group=options.hidden?new Group():edgePiece(kind,{height:place.height,storeys,style:pieceStyle,upperWindows:options.upperWindows,paint}),feature={kind};
   // Fences, railings and counters stand on the higher tile (a railing along the top of a retaining wall).
   group.position.set(place.x,['fence','railing','low'].includes(kind)?Math.max(a.h,b.h):place.y,place.z);group.rotation.y=place.rotation;root.add(group);
   setEdge(a,b,feature);placed.set(k,{group,feature,a,b,id:k,posts:withPosts,storeys,owners,style:pieceStyle});if(withPosts)usePosts(k,a,b,true,storeys);return group;
  },
  remove,
  // What stands on an edge: its kind, storeys, owner buildings and style (null when nothing).
  info(a,b){const p=placed.get(id(a,b));return p?{kind:p.door?'door':p.feature.kind,storeys:p.storeys||1,owners:p.owners.filter(o=>o>=0),style:p.style}:null;},
  // Something that hides while its building(s) are cut (a roof, chimney, sign); it also counts towards
  // the building's box. box: optional world-space Box3 (default: the object's bounds).
  addCutPart(object,owner,{box}={}){cutParts.push({object,owners:[owner].flat(),box});boxesDirty=true;return object;},
  removeCutPart(object){const i=cutParts.findIndex(p=>p.object===object);if(i>=0){cutParts.splice(i,1);restoreCutPart(object);boxesDirty=true;}},
  get buildingBoxes(){return new Map(buildingBoxes());},
  cutParts(){return [...[...placed.values()].filter(p=>p.door).map(p=>({object:p.door.model.upper,owners:p.owners})),...cutParts];},
  get doors(){return [...placed.values()].filter(p=>p.door).map(p=>p.door);},
  get count(){return placed.size;},
  get postCount(){return posts.size;},
  // Every door that breaks the door rule, with what is wrong.
  doorProblems(){return [...placed.values()].filter(p=>p.door).map(p=>({door:p.door,problems:doorProblems(p.door,tileAt)})).filter(r=>r.problems.length);},
  bake,unbake,get baked(){return !!baked;},
  clear(){unbake();for(const item of placed.values())drop(item);placed.clear();for(const p of cutParts)restoreCutPart(p.object);cutParts.length=0;boxesDirty=true;},
  dispose(){this.clear();unregister();root.removeFromParent();},
 };
}
