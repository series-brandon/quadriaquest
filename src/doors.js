import {Group} from 'three';
import {setEdge,edgeBetween} from './world.js';
import {occupancy} from './world-occupancy.js';
import {edgePiece,doorModel,animateDoor,edgePlacement,cornerPost,hasPosts,setDoorHinge} from './edge-models.js';

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

export function createDoor({a,b,parent,pickables=[],locked=false,open=false,link=null}){
 const model=doorModel({height:edgePlacement(a,b).height}),{group,leaf}=model,place=edgePlacement(a,b);
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
   door.setOpen(!door.open);
  },
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
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=door;m.userData.tile=a;pickables.push(m);meshes.push(m);}});
 setEdge(a,b,door);doors.add(door);if(open)door.setOpen(true,{quiet:true});return door;
}
// The door rule (user decision, 2026-10-11): along a door's wall line there is at least one wall (or
// window) on each side of it before any perpendicular wall, so nothing meets the door's corners and an
// opening door always has a free edge to lie on. Returns problems (empty when the door is fine).
export function doorProblems(door,tileAt){
 const {a,b}=door,u=a.x===b.x?{x:1,z:0}:{x:0,z:1},problems=[];
 for(const s of [-1,1]){
  const a2=tileAt(a.x+s*u.x,a.z+s*u.z),b2=tileAt(b.x+s*u.x,b.z+s*u.z),inLine=a2&&b2?edgeBetween(a2,b2):null;
  if(!inLine||!['wall','window'].includes(inLine.kind))problems.push(`no wall beside the door on its ${s<0?'west/north':'east/south'} side`);
  for(const [t,n] of [[a,a2],[b,b2]])if(n&&edgeBetween(t,n)&&!edgeBetween(t,n).door)problems.push('a perpendicular wall meets the door\u2019s corner');
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
export function createEdgeFeatures({parent,pickables=[],tileAt=()=>null}){
 const root=new Group();root.name='edge-features';parent.add(root);
 const placed=new Map(),id=(a,b)=>[a,b].map(t=>`${t.x},${t.z}`).sort().join('|');
 // One timber post per grid corner where walls, windows or doors end, covering every joint (a corner,
 // a T-junction, a run of wall) and rising just above the tallest cap, so pieces never fight there.
 const posts=new Map();
 const corners=(a,b)=>a.x===b.x?[[a.x-.5,(a.z+b.z)/2],[a.x+.5,(a.z+b.z)/2]]:[[(a.x+b.x)/2,a.z-.5],[(a.x+b.x)/2,a.z+.5]];
 function refreshPost(k){
  const post=posts.get(k);post.group?.removeFromParent();post.group=null;
  if(!post.users.size){posts.delete(k);return;}
  const spans=[...post.users.values()],base=Math.min(...spans.map(s=>s.base)),top=Math.max(...spans.map(s=>s.top));
  post.group=cornerPost(top-base+.03);post.group.position.set(post.x-6,base,post.z-6);root.add(post.group);
 }
 function usePosts(itemId,a,b,on){
  const place=edgePlacement(a,b);
  for(const [x,z] of corners(a,b)){const k=`${x},${z}`;if(!posts.has(k))posts.set(k,{x,z,users:new Map(),group:null});const post=posts.get(k);
   if(on)post.users.set(itemId,{base:place.y,top:place.y+place.height});else post.users.delete(itemId);refreshPost(k);}
 }
 function drop(item){if(item.posts)usePosts(item.id,item.a,item.b,false);if(item.door)item.door.dispose();else{item.group.removeFromParent();if(edgeBetween(item.a,item.b)===item.feature)setEdge(item.a,item.b,null);}}
 function remove(a,b){const k=id(a,b),item=placed.get(k);if(!item)return;placed.delete(k);drop(item);}
 return {root,
  add(a,b,kind,options={}){
   remove(a,b);
   const k=id(a,b),withPosts=hasPosts(kind);
   if(kind==='door'){const door=createDoor({a,b,parent:root,pickables,...options});door.neighbour=tileAt;placed.set(k,{door,a,b,id:k,posts:withPosts});if(withPosts)usePosts(k,a,b,true);return door;}
   const place=edgePlacement(a,b),group=edgePiece(kind,{height:place.height}),feature={kind};
   group.position.set(place.x,place.y,place.z);group.rotation.y=place.rotation;root.add(group);
   setEdge(a,b,feature);placed.set(k,{group,feature,a,b,id:k,posts:withPosts});if(withPosts)usePosts(k,a,b,true);return group;
  },
  remove,
  get doors(){return [...placed.values()].filter(p=>p.door).map(p=>p.door);},
  get count(){return placed.size;},
  get postCount(){return posts.size;},
  // Every door that breaks the door rule, with what is wrong.
  doorProblems(){return [...placed.values()].filter(p=>p.door).map(p=>({door:p.door,problems:doorProblems(p.door,tileAt)})).filter(r=>r.problems.length);},
  clear(){for(const item of placed.values())drop(item);placed.clear();},
  dispose(){this.clear();root.removeFromParent();},
 };
}
