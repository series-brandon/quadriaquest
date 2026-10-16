import * as THREE from 'three';
import {makeJobMarker} from './job-marker.js';
import {notHeld} from './held.js';
import {makeSlime} from './slime-model.js';
import {createSlimeActor} from './slime-presentation.js';
import {markCharacter,occupancy} from './world-occupancy.js';
import {seatPosition} from './props.js';
import {key,canStep,canMove,edgeBetween,eachStep,searchRoute,routeTo,DIAGONAL_MOVES,stepCost} from './world.js';
import {isBuildingCut} from './cutaway.js';
import {moveMotion} from './slime-motion.js';

// Townsfolk and city life (docs/CITY.md, Townsfolk and city life; city Phase 8). Routines come from
// places, not scripts: a townsfolk entry gives a look, a home door and a weighted routine, and each
// activity finds a spot offered by props and buildings (sit on a bench, browse or vend at a stall,
// gaze at a fountain or statue, drink at a well, read the noticeboard), or chats with a neighbour,
// strolls, goes indoors for a while, or patrols. Every motion is the shared slime presentation.
//   entry: {id, name, look:{color, loadout:{head…}, carry}, home:[x, z], house (a building index: home,
//           keep and tend use it; home defaults to inside it), routine:[{do, weight}],
//           patrol:[[x, z]…] (guards), pace (idle rate), hours (ignored until a clock exists)}
// Townsfolk walk through each other and the player (walk-through characters); they prefer not to stop
// where someone stands, and never idle on doorsteps, stairs or stall fronts.
// Navigation is shared: distance fields to popular destinations (every spot, every home) are cached
// and followed downhill; strolls use a bounded search. Presentation runs in rings (crowd budget):
// near and on screen, full; far on screen, a quarter rate with a fixed face; off screen, movement only.
export const ACTIVITIES=['sit','sleep','cook','work','browse','vend','gaze','drink','read','chat','stroll','enter','patrol','home','keep','tend','post'];
const SPOT_ACTIVITIES=['sit','sleep','cook','work','browse','vend','gaze','drink','read'];
// WALK: townsfolk walk a little slower than the player (the shared move's time scale).
// Facing angles by compass side (props.js ANGLE), for guards at their post.
const POST_FACING={n:Math.PI,e:Math.PI/2,s:0,w:-Math.PI/2};
const WALK=.72,ROUTE_LIMIT=3500,NEAR=16,FAR=34,FIELD_CACHE=48,STROLL_RADIUS=10;
const LINES=['Lovely day for it.','Have you seen the fountain?','Mind the stairs.','The market’s busy today.','I’m just on my way home.','Hello there!','They say the castle has a hundred rooms.','Fresh bread soon, I hope.'];
// Orthogonal neighbours: where a chat partner stands and where to step aside (walking uses eachStep).
const NEIGHBOURS=[[1,0],[-1,0],[0,1],[0,-1]];
// Faces while two townsfolk chat (they walk about happy).
const CHAT_FACES=['happy','pleased','shocked','sad','frown','happy','pleased'];

// Townsfolk walk through unlocked doors: a closed one is opened on the way (and shut behind them).
export function passable(from,to){if(canStep(from,to))return true;const edge=edgeBetween(from,to);return !!edge&&edge.kind==='door'&&!edge.locked&&!!to&&!to.blocked&&Math.abs(to.h-from.h)<=.5;}
// Townsfolk steps, diagonals included (DIAGONAL_MOVES.townsfolk): a diagonal never opens a door, so its
// corners use the plain step rule. `back` steps run the other way (distance fields grow from the goal).
const stepOptions=()=>({diagonal:DIAGONAL_MOVES.townsfolk,passable,corner:canStep});
const backOptions=()=>({diagonal:DIAGONAL_MOVES.townsfolk,passable:(a,b)=>passable(b,a),corner:(a,b)=>canStep(b,a)});
export const townsfolkStep=(map,from,to)=>canMove(map,from,to,stepOptions());
// Shared navigation for one map: cached distance fields (the shared step rule and step costs, doors included:
// a hop costs more, world.js stepCost).
export function createNavigator(map){
 const fields=new Map();
 function field(goal){
  const back=backOptions(),id=key(goal.x,goal.z)+(back.diagonal?'d':'');if(fields.has(id)){const f=fields.get(id);fields.delete(id);fields.set(id,f);return f;}
  // Grown from the goal: the step from n to t, the way a walker goes.
  const dist=searchRoute(goal,(t,add)=>eachStep(map,t,n=>add(n,stepCost(n,t)),back),{goal:()=>false}).best;
  fields.set(id,dist);if(fields.size>FIELD_CACHE)fields.delete(fields.keys().next().value);return dist;
 }
 return {field,
  // The next step from `from` towards `goal` (null when there or unreachable), preferring free tiles,
  // then the one nearest the goal in a straight line (diagonal first, then straight).
  next(from,goal,occupied=()=>false){const dist=field(goal),here=dist.get(from);if(here===undefined||here===0)return null;
   const options=[];eachStep(map,from,n=>{const d=dist.get(n);if(d!==undefined&&Math.abs(d+stepCost(from,n)-here)<1e-6)options.push(n);},stepOptions());
   options.sort((a,b)=>Math.hypot(a.x-goal.x,a.z-goal.z)-Math.hypot(b.x-goal.x,b.z-goal.z));
   return options.find(n=>!occupied(n))||options[0]||null;},
  reachable:(from,goal)=>field(goal).has(from),
  // A route from `from` to `goal` by a bounded search (early exit; at most `limit` tiles visited):
  // townsfolk plan this way, so a new goal costs little and they keep to their neighbourhood.
  route(from,goal,limit=ROUTE_LIMIT){if(!goal||from===goal)return from===goal?[]:null;const options=stepOptions();
   const {end,previous}=searchRoute(from,(t,add)=>eachStep(map,t,n=>add(n,stepCost(t,n)),options),{target:goal,limit});
   return end?routeTo(previous,end):null;},
  // Tiles within `radius` steps (bounded search), for strolls.
  around(from,radius=STROLL_RADIUS){const seen=new Map([[from,0]]),queue=[from];for(let i=0;i<queue.length;i++){const t=queue[i],d=seen.get(t);if(d>=radius)continue;eachStep(map,t,n=>{if(!seen.has(n)){seen.set(n,d+1);queue.push(n);}},{diagonal:DIAGONAL_MOVES.townsfolk});}return [...seen.keys()];},
  get cached(){return fields.size;},clear(){fields.clear();},
 };
}

const projection=new THREE.Matrix4(),viewFrustum=new THREE.Frustum();
const frustumOf=camera=>viewFrustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
function seeded(seed){let s=(seed>>>0)||1;return ()=>{s=Math.imul(s^s>>>15,s|1)+0x6D2B79F5>>>0;return (s>>>0)/4294967296;};}
const pickWeighted=(routine,random)=>{const total=routine.reduce((n,r)=>n+(r.weight??1),0);let roll=random()*total;for(const r of routine){roll-=r.weight??1;if(roll<=0)return r;}return routine[0];};

// A crowd for a built map (world-map.js): its townsfolk, from data.townsfolk.
export function createCrowd({builtMap,parent,pickables=[],seed=1,services={}}){
 const map=builtMap.tiles,nav=createNavigator(map),random=seeded(seed),folk=[];
 const doorsteps=new Set(builtMap.doors.map(d=>d.b).filter(Boolean)),doorways=new Set(builtMap.doors.flatMap(d=>[d.a,d.b]).filter(Boolean));
 // Spots from street props and furniture (furnish.js); furniture spots are inside buildings.
 const spotsOf=kind=>[...builtMap.props,...(builtMap.furniture||[])].flatMap(p=>p.spots.filter(s=>s.kind===kind&&s.tile&&!s.tile.blocked));
 const avoid=t=>t.stair||doorways.has(t)||builtMap.props.some(p=>p.spots.some(s=>s.tile===t));
 const strollable=t=>!t.blocked&&!t.water&&!t.indoor&&!avoid(t);
 const taken=(t,me)=>occupancy.owners(t).some(o=>o!==me);
 const group=new THREE.Group();group.name='townsfolk';parent.add(group);
 // A townsfolk's own building (entry.house: its index): its free inside tiles, keeper spot and doorstep.
 const houseOf=entry=>{const b=entry.house!==undefined?builtMap.buildings[entry.house]:null;if(!b)return null;
  const inside=b.plan.tiles.map(([x,z])=>map.get(key(x,z))).filter(t=>t&&!t.blocked&&!doorways.has(t));
  return {building:b,inside,keeper:b.anchors.keeper&&!b.anchors.keeper.blocked?b.anchors.keeper:null,doorstep:b.anchors.doors[0]?.doorstep||null,door:b.anchors.doors[0]?.inside||null};};
 for(const entry of notHeld(builtMap.data.townsfolk)){
  const house=houseOf(entry),home=entry.home?map.get(key(...entry.home)):house?.inside[0];if(!home)continue;
  // The crowd moves a body; the shared presentation animates the rig inside it (it owns the rig's height).
  const rig=makeSlime(entry.look?.color||'#9ccf7a');markCharacter(rig.group);
  const slime=createSlimeActor(rig,{loadout:entry.look?.loadout||null,carry:entry.look?.carry||null,idleRate:entry.pace||1});
  const body=new THREE.Group();body.name='townsfolk-'+(entry.id||'');body.add(rig.group);body.userData.character=true;body.userData.blocksMovement=false;
  body.position.set(home.x-6,home.h,home.z-6);group.add(body);
  const person={kind:'townsfolk',id:entry.id,name:entry.name||'Townsfolk',entry,rig,slime,group:body,tile:home,x:home.x,z:home.z,home,house,giver:entry.giver||null,marker:null,
   ready:true,opened:false,duration:0,label:`Talk to ${entry.name||'townsfolk'}`,available:()=>!person.hidden,
   state:'idle',timer:1+random()*3,goal:null,spot:null,step:null,facing:0,hidden:false,ring:'near',acc:0,
   // A keeper minding their shop or a vendor at a stall trades (shops.js); anyone else says a line.
   get shop(){return person.state==='staying'&&(person.activity==='vend'&&person.spot?.prop?.shop||person.activity==='keep'&&person.house?.building.shop)||null;},
   interact(){person.talkTo=services.player?.()||null;person.talking=4;slime.play('Wave',{loop:false});const line=person.entry.line||LINES[Math.floor(random()*LINES.length)];
    if(services.talk)services.talk(person,line);else if(person.shop&&services.trade)services.trade(person,person.shop);else services.say?.(person,line);},
   // A job marker over their head (job-marker.js): 'offer', 'due' or null.
   setMarker(kind){if((person.marker?.kind||null)===kind)return;person.marker?.group.removeFromParent();person.marker=null;
    if(kind){const group=makeJobMarker(kind);group.position.y=1.25;body.add(group);person.marker={kind,group};}}};
  body.traverse(m=>{if(m.isMesh){m.userData.actor=person;m.userData.tile=home;pickables.push(m);}});
  occupancy.place(person,[home]);folk.push(person);
 }
 function choose(p){
  const routine=p.entry.routine?.length?p.entry.routine:[{do:'stroll'}];
  // One candidate at a time, nearest first, routed with the bounded search (no whole-map scans).
  const routeTo=goal=>goal?nav.route(p.tile,goal):null;
  const nearest=(list,tile=t=>t)=>list.map(x=>({x,d:Math.abs(tile(x).x-p.tile.x)+Math.abs(tile(x).z-p.tile.z)})).sort((a,b)=>a.d-b.d+(random()-.5)*6).map(o=>o.x);
  const firstRouted=(list,tile=t=>t)=>{for(const x of nearest(list,tile).slice(0,3)){const path=routeTo(tile(x));if(path)return {x,path};}return null;};
  for(let tries=0;tries<4;tries++){const a=pickWeighted(routine,random).do;
   if(SPOT_ACTIVITIES.includes(a)){
    // Residents use their own house's beds, stoves and chairs first.
    const all=spotsOf(a).filter(s=>!taken(s.tile,p)),own=p.house?all.filter(s=>s.prop.building===p.entry.house):[];
    const found=firstRouted(own.length?own:a==='sleep'?[]:all,s=>s.tile);if(!found)continue;
    return {activity:a,goal:found.x.tile,spot:found.x,path:found.path,stay:a==='vend'?20+random()*20:a==='sleep'?20+random()*25:a==='sit'?8+random()*12:a==='cook'||a==='work'?8+random()*8:4+random()*6};}
   if(a==='stroll'){const options=nav.around(p.tile).filter(t=>t!==p.tile&&strollable(t));if(!options.length)continue;const goal=options[Math.floor(random()*options.length)],path=routeTo(goal);if(!path)continue;return {activity:a,goal,path,stay:1+random()*3};}
   if(a==='enter'){const step=p.entry.door?map.get(key(...p.entry.door)):[...doorsteps].sort((x,y)=>Math.hypot(x.x-p.home.x,x.z-p.home.z)-Math.hypot(y.x-p.home.x,y.z-p.home.z))[0],path=routeTo(step);if(!path)continue;return {activity:a,goal:step,path,stay:10+random()*15};}
   if(a==='chat'){const other=folk.find(o=>o!==p&&o.state==='idle'&&!o.hidden&&Math.abs(o.tile.x-p.tile.x)+Math.abs(o.tile.z-p.tile.z)<8);if(!other)continue;
    const found=firstRouted(NEIGHBOURS.map(([dx,dz])=>map.get(key(other.tile.x+dx,other.tile.z+dz))).filter(n=>n&&strollable(n)&&!taken(n,p)));if(!found)continue;
    other.state='chatting';other.timer=6;other.face=p;return {activity:a,goal:found.x,path:found.path,stay:6,partner:other};}
   // Home: potter about inside your own house. Keep: mind your shop from its keeper spot. Tend: linger
   // around your own building's front.
   if(a==='home'&&p.house){const free=p.house.inside.filter(t=>t!==p.tile&&!taken(t,p));if(!free.length)continue;const goal=free[Math.floor(random()*free.length)],path=routeTo(goal);if(!path)continue;return {activity:a,goal,path,stay:5+random()*9};}
   // Post: stand guard at your home tile (a gate guard), facing entry.facing ('n', 'e', 's' or 'w').
   if(a==='post'){if(p.tile===p.home)return {activity:a,goal:p.home,path:[],stay:30+random()*30};const path=routeTo(p.home);if(path)return {activity:a,goal:p.home,path,stay:30+random()*30};continue;}
   if(a==='keep'&&p.house?.keeper&&!taken(p.house.keeper,p)){const path=routeTo(p.house.keeper);if(path)return {activity:a,goal:p.house.keeper,path,stay:20+random()*20};}
   if(a==='tend'&&p.house?.doorstep){const options=nav.around(p.house.doorstep,2).filter(t=>strollable(t)&&!taken(t,p));if(!options.length)continue;const goal=options[Math.floor(random()*options.length)],path=routeTo(goal);if(!path)continue;return {activity:a,goal,path,stay:3+random()*6};}
   if(a==='patrol'&&p.entry.patrol?.length){p.patrolIndex=((p.patrolIndex??-1)+1)%p.entry.patrol.length;const goal=map.get(key(...p.entry.patrol[p.patrolIndex])),path=routeTo(goal);if(path)return {activity:a,goal,path,stay:1+random()*2};}
  }
  return {activity:'idle',goal:null,path:null,stay:2+random()*3};
 }
 function begin(p){const plan=choose(p);Object.assign(p,{activity:plan.activity,goal:plan.goal,path:plan.path||null,spot:plan.spot||null,stay:plan.stay,partner:plan.partner||null,state:plan.goal&&plan.goal!==p.tile?'walking':'arrived',timer:plan.stay});if(p.state==='arrived')arrive(p);}
 function arrive(p){
  p.state='staying';p.timer=p.stay;
  // A seat (bench, chair, bed): settle onto it with its own motion (Sit, or Sleeping in a bed).
  if(p.spot?.seat){p.slime.play(p.spot.seat.motion||'Sit',{seatHeight:p.spot.seat.height});p.facing=p.spot.angle;}
  else if(p.activity==='cook')p.slime.play('Cooking',{duration:2});
  else if(p.activity==='work')p.slime.play(p.spot?.prop?.station==='anvil'?'Smithing':'Crafting',{duration:2});
  else if(p.spot)p.facing=p.spot.angle;
  if(p.activity==='enter'){p.hidden=true;p.group.visible=false;occupancy.remove(p);}
  if(p.activity==='chat'&&p.partner){p.face=p.partner;p.chatFace=CHAT_FACES[Math.floor(random()*CHAT_FACES.length)];p.partner.chatFace=CHAT_FACES[Math.floor(random()*CHAT_FACES.length)];p.slime.play(random()<.5?'Wave':'Happy hop',{loop:false});}
  if(p.activity==='drink')p.slime.play('Gathering',{loop:false,duration:1.6});
  if(p.activity==='vend'&&random()<.5)p.slime.play('Point',{loop:false,duration:1.2});
  if(p.activity==='keep'&&p.house.door)p.facing=angleTo(p.tile,p.house.door);
  if(p.activity==='post'&&POST_FACING[p.entry.facing]!==undefined)p.facing=POST_FACING[p.entry.facing];
  if(p.activity==='tend'&&random()<.5)p.slime.play('Gathering',{loop:false,duration:2});
 }
 function leave(p){
  if(p.spot?.seat||p.activity==='cook'||p.activity==='work')p.slime.stop();
  if(p.hidden){p.hidden=false;p.group.visible=true;occupancy.place(p,[p.tile]);}
  p.face=null;p.partner=null;p.spot=null;p.state='idle';p.timer=.5+random()*2.5;
 }
 const angleTo=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
 // Shut a door you opened once you are through and its doorway is clear (nobody on either side of it).
 function shutBehind(p){const door=p.openedDoor;if(!door)return;if(p.tile===door.a||p.tile===door.b)return;
  if(occupancy.owners(door.a).length||occupancy.owners(door.b).length){return;}if(door.open)door.setOpen(false,{quiet:!services.near?.(p.tile)});p.openedDoor=null;}
 const stats={near:0,far:0,off:0,walking:0,updated:0};
 return {group,folk,navigator:nav,stats,
  // Per frame. view: {camera, player:{x,z} (tile), frustum (THREE.Frustum, optional)}. playerTile:
  // the player's tile (townsfolk step aside if the player stops on them).
  update(dt,time,{camera,frustum=camera?frustumOf(camera):null,playerTile=services.playerTile?.()||null}={}){
   stats.near=stats.far=stats.off=stats.walking=stats.updated=0;
   const focus=camera?{x:camera.position.x,z:camera.position.z}:null;
   for(const p of folk){
    // Logic: always. Moving townsfolk never hide or get hidden (world-occupancy.js top).
    if(p.openedDoor&&!p.step)shutBehind(p);
    p.moving=!!p.step;
    // Talking to the player: finish the step under way, then stand and face them until done.
    if(p.talking>0){p.talking-=dt;if(p.talking<=0)p.talkTo=null;}
    const listening=p.talking>0&&!p.step;
    if(p.state==='walking'&&!listening){
     if(!p.step){
      // Don't end on someone else's tile: stop a tile short, or give up a taken spot.
      // Follow the planned route; re-plan if it no longer holds (a door locked, someone moved a prop).
      let next=p.path?.[0]||null;
      if(next&&!townsfolkStep(map,p.tile,next)){p.path=nav.route(p.tile,p.goal);next=p.path?.[0]||null;}
      if(next&&next===p.goal&&taken(next,p)){if(p.spot){p.state='idle';p.timer=1+random()*2;next=null;}else{arrive(p);next=null;}}
      if(p.state==='walking'&&!next){if(p.tile===p.goal)arrive(p);else{p.state='idle';p.timer=1;}}
      else if(next){
       // A closed door on the way: open it, give it a moment to swing, then go through.
       const edge=edgeBetween(p.tile,next);
       if(edge?.kind==='door'&&!edge.open){p.facing=angleTo(p.tile,next);if(!(p.doorWait>0)){edge.setOpen(true,{quiet:!services.near?.(p.tile)});p.openedDoor=edge;p.doorWait=.35;}}
       else{p.step={from:p.tile,to:next,age:0};p.facing=angleTo(p.tile,next);occupancy.place(p,[p.tile,next]);}}}
     if(p.doorWait>0)p.doorWait-=dt;
     if(p.step){p.step.age+=dt*WALK;const {from,to}=p.step,move=moveMotion(p.step.age,from,to);p.move=move;
      p.group.position.set(THREE.MathUtils.lerp(from.x,to.x,move.distance)-6,from.h+move.rise,THREE.MathUtils.lerp(from.z,to.z,move.distance)-6);
      if(p.step.age>=move.duration){if(p.path?.[0]===to)p.path.shift();p.tile=to;p.x=to.x;p.z=to.z;p.step=null;occupancy.place(p,[to]);shutBehind(p);for(const m of pickables)if(m.userData.actor===p)m.userData.tile=to;if(to===p.goal)arrive(p);}}
     stats.walking++;
    }else if(p.state!=='walking'){p.timer-=dt;
     if(p.state==='staying'&&p.timer<=0&&!(p.talking>0))leave(p);
     else if((p.state==='idle'||p.state==='chatting')&&p.timer<=0&&!(p.talking>0)){if(p.state==='chatting')leave(p);else begin(p);}
     // The player stopped on this townsfolk: step aside (never mid-activity on a seat).
     if(playerTile&&p.tile===playerTile&&!p.spot?.seat&&!p.hidden){const aside=NEIGHBOURS.map(([dx,dz])=>map.get(key(p.tile.x+dx,p.tile.z+dz))).find(n=>n&&strollable(n)&&canStep(p.tile,n)&&!taken(n,p));if(aside){leave(p);p.goal=aside;p.path=[aside];p.activity='stroll';p.stay=1;p.state='walking';}}
    }
    // Seat position while sitting; standing on the tile otherwise.
    if(p.state==='staying'&&p.spot?.seat){const s=seatPosition(p.spot),k=Math.min(1,(p.stay-p.timer)/.45),lift=p.spot.seat.motion==='Sit'?0:p.spot.seat.height*k;p.group.position.set(THREE.MathUtils.lerp(p.tile.x-6,s.x,k),p.tile.h+lift,THREE.MathUtils.lerp(p.tile.z-6,s.z,k));}
    else if(!p.step)p.group.position.set(p.tile.x-6,p.tile.h,p.tile.z-6);
    // Facing: the way they walk; someone they talk to once standing.
    const facingWho=p.step?null:p.talking>0&&p.talkTo?p.talkTo:p.face;
    if(facingWho&&!facingWho.hidden)p.facing=angleTo(p.tile,facingWho.tile);
    p.group.rotation.y+=Math.atan2(Math.sin(p.facing-p.group.rotation.y),Math.cos(p.facing-p.group.rotation.y))*(1-Math.exp(-dt*10));
    // Presentation rings (crowd budget). Only one character shows per tile: the last to arrive.
    if(p.hidden){stats.off++;continue;}
    const d=focus?Math.hypot(p.group.position.x-focus.x,p.group.position.z-focus.z):0,onScreen=!frustum||frustum.containsPoint(p.group.position);
    p.ring=!onScreen||d>FAR*1.6?'off':d>FAR?'far':'near';
    // Indoors behind a roof (the building not cut) nobody can see them, so they aren't drawn.
    const indoors=p.tile.indoor&&p.tile.building!==undefined&&!isBuildingCut(p.tile.building);
    if(p.state!=='walking')p.move=null;
    p.moving=!!p.step;p.group.visible=(p.ring!=='off'||d<FAR)&&!indoors&&(builtMap.isShown?.(p.tile.x,p.tile.z)??true)&&!occupancy.covered(p,p.tile);
    if(p.ring==='off'){stats.off++;continue;}
    p.acc+=dt;
    // The walking face holds for the whole walk (between steps too, or it flashes once per tile).
    const mood=p.talking>0?'happy':p.state==='chatting'||p.activity==='chat'&&p.state==='staying'?p.chatFace||'happy':p.state==='walking'?p.entry.walkFace||'happy':p.entry.face||'idle';
    if(p.ring==='far'){stats.far++;if(p.acc<.25)continue;p.slime.update(p.acc,time,{expression:mood,pose:p.move?.pose||null,lean:true});p.acc=0;stats.updated++;continue;}
    stats.near++;p.slime.update(p.acc,time,{expression:mood,pose:p.move?.pose||null});p.acc=0;stats.updated++;
   }
  },
  dispose(){for(const p of folk){occupancy.remove(p);for(const m of [...pickables])if(m.userData.actor===p)pickables.splice(pickables.indexOf(m),1);}group.removeFromParent();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});folk.length=0;},
 };
}
// Townsfolk checks (map-checks.js): a home that exists and is reachable, and a routine with at least
// one usable activity.
// reach (tiles reachable from the arrival point) and connected(a, b) are optional answers the map checks
// already have (map-checks.js), so no whole-map navigator search runs per townsperson or spot.
export function townsfolkProblems(data,builtMap,{reach=null,connected=null}={}){
 // The navigator covers the whole map, so it is only made when there are townsfolk to check.
 const out=[];let navigator=null;const nav={reachable:(a,b)=>(navigator??=createNavigator(builtMap.tiles)).reachable(a,b)},spots=kind=>builtMap.props.flatMap(p=>p.spots.filter(s=>s.kind===kind&&s.tile&&!s.tile.blocked));
 for(const entry of data.townsfolk||[]){
  const house=entry.house!==undefined?builtMap.buildings[entry.house]:null;
  if(entry.house!==undefined&&(!house||house.plan.desc.interior!=='inPlace'||house.plan.doors.every(d=>d.locked))){out.push({kind:'townsfolk',severity:'error',tile:entry.home||data.spawn,text:`${entry.name||entry.id}'s house can't be walked into.`});continue;}
  const where=entry.home||(house&&house.plan.tiles.find(([x,z])=>!builtMap.tiles.get(key(x,z))?.blocked)),home=where&&builtMap.tiles.get(key(...where));
  // Posted outside the city (a gate guard on the land around it): checked where that land exists.
  const [w,d]=builtMap.data?.size||[Infinity,Infinity];if(where&&!home&&(where[0]<0||where[1]<0||where[0]>=w||where[1]>=d))continue;
  if(!home||home.blocked){out.push({kind:'townsfolk',severity:'error',tile:where||data.spawn,text:`${entry.name||entry.id}'s home tile is missing or blocked.`});continue;}
  if(builtMap.spawn&&!(reach?reach.has(home):nav.reachable(home,builtMap.spawn)))out.push({kind:'townsfolk',severity:'warning',tile:where,text:`${entry.name||entry.id} can't reach the town square from home.`});
  const usable=(entry.routine||[{do:'stroll'}]).some(r=>['stroll','chat','enter','post'].includes(r.do)||house&&['home','keep','tend'].includes(r.do)||r.do==='patrol'&&entry.patrol?.length||spots(r.do).some(s=>connected?connected(home,s.tile):nav.reachable(home,s.tile)));
  if(!usable)out.push({kind:'townsfolk',severity:'warning',tile:where,text:`${entry.name||entry.id} has nothing in their routine they can do here.`});}
 return out;
}
// A generated crowd for playground and perf scenarios: n townsfolk with mixed routines around a city.
export function generateTownsfolk(builtMap,n,seed=7){
 const random=seeded(seed),open=[...builtMap.tiles.values()].filter(t=>!t.blocked&&!t.indoor&&!t.stair&&!t.water),colors=['#a4ce77','#e0a96d','#9db8e3','#d98fa6','#c7b46a','#8fc9b8','#b49ad6','#e3c07c'],hats=[null,null,null,'minersCap','fishersHat','ironSkullcap'];
 const routines=[[{do:'stroll',weight:3},{do:'sit',weight:2},{do:'gaze',weight:1},{do:'chat',weight:2}],[{do:'browse',weight:3},{do:'stroll',weight:2},{do:'drink',weight:1}],[{do:'vend',weight:5},{do:'stroll',weight:1}],[{do:'read',weight:1},{do:'enter',weight:2},{do:'stroll',weight:2}]];
 return Array.from({length:n},(_,i)=>{const home=open[Math.floor(random()*open.length)],hat=hats[Math.floor(random()*hats.length)];
  return {id:`folk-${i}`,name:`Townsfolk ${i+1}`,look:{color:colors[i%colors.length],loadout:hat?{head:hat}:null},home:[home.x,home.z],routine:routines[i%routines.length],pace:.8+random()*.5};});
}
