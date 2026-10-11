import {Group} from 'three';
import {setEdge,edgeBetween} from './world.js';
import {occupancy} from './world-occupancy.js';
import {edgePiece,doorModel,animateDoor,edgePlacement,cornerPost,hasPosts} from './edge-models.js';

// Doors are shared entities that sit on a tile edge (docs/CITY.md, Walls and doors on tile edges).
// RuneScape-style: a closed door blocks walking, sight and reach like a wall, so routes never pass
// through one; it has to be opened first. Clicking a door walks you up to it (on whichever side is
// nearer) and opens it, or closes it if open. It stays as it was left. A locked door won't open and
// rattles. `link` is reserved for interior spaces.
const doors=new Set(),SWING=4;
let services={toast(){},tile:()=>null,sound(){}};
// The game supplies feedback once (main.js); doors in every map share it.
export function configureDoors(next){services={...services,...next};}

export function createDoor({a,b,parent,pickables=[],locked=false,open=false,link=null}){
 const {group,leaf}=doorModel({height:edgePlacement(a,b).height}),place=edgePlacement(a,b);
 group.position.set(place.x,place.y,place.z);group.rotation.y=place.rotation;parent.add(group);
 const door={kind:'door',a,b,tile:a,x:(a.x+b.x)/2,z:(a.z+b.z)/2,group,leaf,locked,link,open:!locked&&open,amount:!locked&&open?1:0,rattle:0,ready:true,opened:false,duration:0,
  get label(){return door.locked?'Locked door':door.open?'Close door':'Open door';},
  interact(){
   if(door.locked){door.rattle=1;services.sound('blocked');services.toast("It's locked.");return;}
   door.setOpen(!door.open);
  },
  setOpen(value){value=!!value&&!door.locked;if(value===door.open)return;door.open=value;services.sound(value?'doorOpen':'doorClose');},
  setLocked(value){door.locked=!!value;if(door.locked&&door.open){door.open=false;services.sound('doorClose');}},
  dispose(){doors.delete(door);if(edgeBetween(a,b)===door)setEdge(a,b,null);group.removeFromParent();for(const m of meshes){const i=pickables.indexOf(m);if(i>=0)pickables.splice(i,1);}},
 };
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=door;m.userData.tile=a;pickables.push(m);meshes.push(m);}});
 setEdge(a,b,door);doors.add(door);return door;
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
  animateDoor(d,d.amount,d.rattle,time);
 }
}
export const activeDoors=()=>[...doors];

// Places edge features in a map: static pieces (walls, windows, fences, railings, counters) and doors.
// Maps and fixtures describe where; the pieces, rules and door behaviour are shared.
export function createEdgeFeatures({parent,pickables=[]}){
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
   if(kind==='door'){const door=createDoor({a,b,parent:root,pickables,...options});placed.set(k,{door,a,b,id:k,posts:withPosts});if(withPosts)usePosts(k,a,b,true);return door;}
   const place=edgePlacement(a,b),group=edgePiece(kind,{height:place.height}),feature={kind};
   group.position.set(place.x,place.y,place.z);group.rotation.y=place.rotation;root.add(group);
   setEdge(a,b,feature);placed.set(k,{group,feature,a,b,id:k,posts:withPosts});if(withPosts)usePosts(k,a,b,true);return group;
  },
  remove,
  get doors(){return [...placed.values()].filter(p=>p.door).map(p=>p.door);},
  get count(){return placed.size;},
  get postCount(){return posts.size;},
  clear(){for(const item of placed.values())drop(item);placed.clear();},
  dispose(){this.clear();root.removeFromParent();},
 };
}
