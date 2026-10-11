import * as THREE from 'three';
import {makeSlime} from './slime-model.js';
import {createSlimeActor} from './slime-presentation.js';
import {markCharacter,occupancy} from './world-occupancy.js';
import {seatPosition} from './props.js';
import {key,canStep} from './world.js';
import {moveMotion} from './slime-motion.js';

// Townsfolk and city life (docs/CITY.md, Townsfolk and city life; city Phase 8). Routines come from
// places, not scripts: a townsfolk entry gives a look, a home door and a weighted routine, and each
// activity finds a spot offered by props and buildings (sit on a bench, browse or vend at a stall,
// gaze at a fountain or statue, drink at a well, read the noticeboard), or chats with a neighbour,
// strolls, goes indoors for a while, or patrols. Every motion is the shared slime presentation.
//   entry: {id, name, look:{color, loadout:{head…}, carry}, home:[x, z], routine:[{do, weight}],
//           patrol:[[x, z]…] (guards), pace (idle rate), hours (ignored until a clock exists)}
// Townsfolk walk through each other and the player (walk-through characters); they prefer not to stop
// where someone stands, and never idle on doorsteps, stairs or stall fronts.
// Navigation is shared: distance fields to popular destinations (every spot, every home) are cached
// and followed downhill; strolls use a bounded search. Presentation runs in rings (crowd budget):
// near and on screen, full; far on screen, a quarter rate with a fixed face; off screen, movement only.
export const ACTIVITIES=['sit','browse','vend','gaze','drink','read','chat','stroll','enter','patrol'];
// WALK: townsfolk walk a little slower than the player (the shared move's time scale).
const WALK=.72,NEAR=16,FAR=34,FIELD_CACHE=48,STROLL_RADIUS=10;
const LINES=['Lovely day for it.','Have you seen the fountain?','Mind the stairs.','The market’s busy today.','I’m just on my way home.','Hello there!','They say the castle has a hundred rooms.','Fresh bread soon, I hope.'];
const NEIGHBOURS=[[1,0],[-1,0],[0,1],[0,-1]];
// Faces while two townsfolk chat (they walk about happy).
const CHAT_FACES=['happy','pleased','shocked','sad','frown','happy','pleased'];

// Shared navigation for one map: cached distance fields (BFS over the shared step rule).
export function createNavigator(map){
 const fields=new Map();
 function field(goal){
  const id=key(goal.x,goal.z);if(fields.has(id)){const f=fields.get(id);fields.delete(id);fields.set(id,f);return f;}
  const dist=new Map([[goal,0]]),queue=[goal];
  for(let i=0;i<queue.length;i++){const t=queue[i],d=dist.get(t);for(const [dx,dz] of NEIGHBOURS){const n=map.get(key(t.x+dx,t.z+dz));if(n&&!dist.has(n)&&canStep(n,t)){dist.set(n,d+1);queue.push(n);}}}
  fields.set(id,dist);if(fields.size>FIELD_CACHE)fields.delete(fields.keys().next().value);return dist;
 }
 return {field,
  // The next step from `from` towards `goal` (null when there or unreachable), preferring free tiles.
  next(from,goal,occupied=()=>false){const dist=field(goal),here=dist.get(from);if(here===undefined||here===0)return null;
   const options=NEIGHBOURS.map(([dx,dz])=>map.get(key(from.x+dx,from.z+dz))).filter(n=>n&&dist.get(n)===here-1&&canStep(from,n));
   return options.find(n=>!occupied(n))||options[0]||null;},
  reachable:(from,goal)=>field(goal).has(from),
  // Tiles within `radius` steps (bounded search), for strolls.
  around(from,radius=STROLL_RADIUS){const seen=new Map([[from,0]]),queue=[from];for(let i=0;i<queue.length;i++){const t=queue[i],d=seen.get(t);if(d>=radius)continue;for(const [dx,dz] of NEIGHBOURS){const n=map.get(key(t.x+dx,t.z+dz));if(n&&!seen.has(n)&&canStep(t,n)){seen.set(n,d+1);queue.push(n);}}}return [...seen.keys()];},
  get cached(){return fields.size;},clear(){fields.clear();},
 };
}

const projection=new THREE.Matrix4(),viewFrustum=new THREE.Frustum();
const frustumOf=camera=>viewFrustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
function seeded(seed){let s=(seed>>>0)||1;return ()=>{s=Math.imul(s^s>>>15,s|1)+0x6D2B79F5>>>0;return (s>>>0)/4294967296;};}
const pickWeighted=(routine,random)=>{const total=routine.reduce((n,r)=>n+(r.weight??1),0);let roll=random()*total;for(const r of routine){roll-=r.weight??1;if(roll<=0)return r;}return routine[0];};

// A crowd for a built city (city-map.js): its townsfolk, from data.townsfolk.
export function createCrowd({city,parent,pickables=[],seed=1,services={}}){
 const map=city.tiles,nav=createNavigator(map),random=seeded(seed),folk=[];
 const doorsteps=new Set(city.doors.map(d=>d.b).filter(Boolean));
 const spotsOf=kind=>city.props.flatMap(p=>p.spots.filter(s=>s.kind===kind&&s.tile&&!s.tile.blocked));
 const avoid=t=>t.stair||doorsteps.has(t)||city.props.some(p=>p.spots.some(s=>s.tile===t));
 const strollable=t=>!t.blocked&&!t.water&&!t.indoor&&!avoid(t);
 const taken=(t,me)=>occupancy.owners(t).some(o=>o!==me);
 const group=new THREE.Group();group.name='townsfolk';parent.add(group);
 for(const entry of city.data.townsfolk||[]){
  const home=map.get(key(...entry.home));if(!home)continue;
  // The crowd moves a body; the shared presentation animates the rig inside it (it owns the rig's height).
  const rig=makeSlime(entry.look?.color||'#9ccf7a');markCharacter(rig.group);
  const slime=createSlimeActor(rig,{loadout:entry.look?.loadout||null,carry:entry.look?.carry||null,idleRate:entry.pace||1});
  const body=new THREE.Group();body.name='townsfolk-'+(entry.id||'');body.add(rig.group);body.userData.character=true;body.userData.blocksMovement=false;
  body.position.set(home.x-6,home.h,home.z-6);group.add(body);
  const person={kind:'townsfolk',id:entry.id,name:entry.name||'Townsfolk',entry,rig,slime,group:body,tile:home,x:home.x,z:home.z,home,
   ready:true,opened:false,duration:0,label:`Talk to ${entry.name||'townsfolk'}`,available:()=>!person.hidden,
   state:'idle',timer:1+random()*3,goal:null,spot:null,step:null,facing:0,hidden:false,ring:'near',acc:0,
   interact(){person.talkTo=services.player?.()||null;person.talking=4;slime.play('Wave',{loop:false});services.say?.(person,person.entry.line||LINES[Math.floor(random()*LINES.length)]);}};
  body.traverse(m=>{if(m.isMesh){m.userData.actor=person;m.userData.tile=home;pickables.push(m);}});
  occupancy.place(person,[home]);folk.push(person);
 }
 function choose(p){
  const routine=p.entry.routine?.length?p.entry.routine:[{do:'stroll'}];
  for(let tries=0;tries<4;tries++){const a=pickWeighted(routine,random).do;
   if(['sit','browse','vend','gaze','drink','read'].includes(a)){const spots=spotsOf(a).filter(s=>!taken(s.tile,p)&&nav.reachable(p.tile,s.tile));if(!spots.length)continue;
    const s=spots[Math.floor(random()*spots.length)];return {activity:a,goal:s.tile,spot:s,stay:a==='vend'?20+random()*20:a==='sit'?8+random()*12:4+random()*6};}
   if(a==='stroll'){const options=nav.around(p.tile).filter(t=>t!==p.tile&&strollable(t));if(!options.length)continue;return {activity:a,goal:options[Math.floor(random()*options.length)],stay:1+random()*3};}
   if(a==='enter'){const step=p.entry.door?map.get(key(...p.entry.door)):[...doorsteps].sort((x,y)=>Math.hypot(x.x-p.home.x,x.z-p.home.z)-Math.hypot(y.x-p.home.x,y.z-p.home.z))[0];if(!step||!nav.reachable(p.tile,step))continue;return {activity:a,goal:step,stay:10+random()*15};}
   if(a==='chat'){const other=folk.find(o=>o!==p&&o.state==='idle'&&!o.hidden&&Math.abs(o.tile.x-p.tile.x)+Math.abs(o.tile.z-p.tile.z)<8);if(!other)continue;
    const near=NEIGHBOURS.map(([dx,dz])=>map.get(key(other.tile.x+dx,other.tile.z+dz))).find(n=>n&&strollable(n)&&!taken(n,p)&&nav.reachable(p.tile,n));if(!near)continue;
    other.state='chatting';other.timer=6;other.face=p;return {activity:a,goal:near,stay:6,partner:other};}
   if(a==='patrol'&&p.entry.patrol?.length){p.patrolIndex=((p.patrolIndex??-1)+1)%p.entry.patrol.length;const goal=map.get(key(...p.entry.patrol[p.patrolIndex]));if(goal&&nav.reachable(p.tile,goal))return {activity:a,goal,stay:1+random()*2};}
  }
  return {activity:'idle',goal:null,stay:2+random()*3};
 }
 function begin(p){const plan=choose(p);Object.assign(p,{activity:plan.activity,goal:plan.goal,spot:plan.spot||null,stay:plan.stay,partner:plan.partner||null,state:plan.goal&&plan.goal!==p.tile?'walking':'arrived',timer:plan.stay});if(p.state==='arrived')arrive(p);}
 function arrive(p){
  p.state='staying';p.timer=p.stay;
  if(p.activity==='sit'){p.slime.play('Sit');p.facing=p.spot.angle;}
  else if(p.spot)p.facing=p.spot.angle;
  if(p.activity==='enter'){p.hidden=true;p.group.visible=false;occupancy.remove(p);}
  if(p.activity==='chat'&&p.partner){p.face=p.partner;p.chatFace=CHAT_FACES[Math.floor(random()*CHAT_FACES.length)];p.partner.chatFace=CHAT_FACES[Math.floor(random()*CHAT_FACES.length)];p.slime.play(random()<.5?'Wave':'Happy hop',{loop:false});}
  if(p.activity==='drink')p.slime.play('Gathering',{loop:false,duration:1.6});
  if(p.activity==='vend'&&random()<.5)p.slime.play('Point',{loop:false,duration:1.2});
 }
 function leave(p){
  if(p.activity==='sit')p.slime.stop();
  if(p.hidden){p.hidden=false;p.group.visible=true;occupancy.place(p,[p.tile]);}
  p.face=null;p.partner=null;p.spot=null;p.state='idle';p.timer=.5+random()*2.5;
 }
 const angleTo=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
 const stats={near:0,far:0,off:0,walking:0,updated:0};
 return {group,folk,navigator:nav,stats,
  // Per frame. view: {camera, player:{x,z} (tile), frustum (THREE.Frustum, optional)}. playerTile:
  // the player's tile (townsfolk step aside if the player stops on them).
  update(dt,time,{camera,frustum=camera?frustumOf(camera):null,playerTile=services.playerTile?.()||null}={}){
   stats.near=stats.far=stats.off=stats.walking=stats.updated=0;
   const focus=camera?{x:camera.position.x,z:camera.position.z}:null;
   for(const p of folk){
    // Logic: always. Moving townsfolk never hide or get hidden (world-occupancy.js top).
    p.moving=!!p.step;
    // Talking to the player: finish the step under way, then stand and face them until done.
    if(p.talking>0){p.talking-=dt;if(p.talking<=0)p.talkTo=null;}
    const listening=p.talking>0&&!p.step;
    if(p.state==='walking'&&!listening){
     if(!p.step){
      // Don't end on someone else's tile: stop a tile short, or give up a taken spot.
      let next=nav.next(p.tile,p.goal,t=>taken(t,p));
      if(next&&next===p.goal&&taken(next,p)){if(p.spot){p.state='idle';p.timer=1+random()*2;next=null;}else{arrive(p);next=null;}}
      if(p.state==='walking'&&!next){if(p.tile===p.goal)arrive(p);else{p.state='idle';p.timer=1;}}
      else if(next){p.step={from:p.tile,to:next,age:0};p.facing=angleTo(p.tile,next);occupancy.place(p,[p.tile,next]);}}
     if(p.step){p.step.age+=dt*WALK;const {from,to}=p.step,move=moveMotion(p.step.age,from,to);p.move=move;
      p.group.position.set(THREE.MathUtils.lerp(from.x,to.x,move.distance)-6,from.h+move.rise,THREE.MathUtils.lerp(from.z,to.z,move.distance)-6);
      if(p.step.age>=move.duration){p.tile=to;p.x=to.x;p.z=to.z;p.step=null;p.move=null;occupancy.place(p,[to]);for(const m of pickables)if(m.userData.actor===p)m.userData.tile=to;if(to===p.goal)arrive(p);}}
     stats.walking++;
    }else if(p.state!=='walking'){p.timer-=dt;
     if(p.state==='staying'&&p.timer<=0&&!(p.talking>0))leave(p);
     else if((p.state==='idle'||p.state==='chatting')&&p.timer<=0&&!(p.talking>0)){if(p.state==='chatting')leave(p);else begin(p);}
     // The player stopped on this townsfolk: step aside (never mid-activity on a seat).
     if(playerTile&&p.tile===playerTile&&p.activity!=='sit'&&!p.hidden){const aside=NEIGHBOURS.map(([dx,dz])=>map.get(key(p.tile.x+dx,p.tile.z+dz))).find(n=>n&&strollable(n)&&canStep(p.tile,n)&&!taken(n,p));if(aside){leave(p);p.goal=aside;p.activity='stroll';p.stay=1;p.state='walking';}}
    }
    // Seat position while sitting; standing on the tile otherwise.
    if(p.state==='staying'&&p.activity==='sit'&&p.spot){const s=seatPosition(p.spot),k=Math.min(1,(p.stay-p.timer)/.45);p.group.position.set(THREE.MathUtils.lerp(p.tile.x-6,s.x,k),p.tile.h,THREE.MathUtils.lerp(p.tile.z-6,s.z,k));}
    else if(!p.step)p.group.position.set(p.tile.x-6,p.tile.h,p.tile.z-6);
    // Facing: the way they walk; someone they talk to once standing.
    const facingWho=p.step?null:p.talking>0&&p.talkTo?p.talkTo:p.face;
    if(facingWho&&!facingWho.hidden)p.facing=angleTo(p.tile,facingWho.tile);
    p.group.rotation.y+=Math.atan2(Math.sin(p.facing-p.group.rotation.y),Math.cos(p.facing-p.group.rotation.y))*(1-Math.exp(-dt*10));
    // Presentation rings (crowd budget). Only one character shows per tile: the last to arrive.
    if(p.hidden){stats.off++;continue;}
    const d=focus?Math.hypot(p.group.position.x-focus.x,p.group.position.z-focus.z):0,onScreen=!frustum||frustum.containsPoint(p.group.position);
    p.ring=!onScreen||d>FAR*1.6?'off':d>FAR?'far':'near';
    p.moving=!!p.step;p.group.visible=(p.ring!=='off'||d<FAR)&&!occupancy.covered(p,p.tile);
    if(p.ring==='off'){stats.off++;continue;}
    p.acc+=dt;
    const mood=p.talking>0?'happy':p.state==='chatting'||p.activity==='chat'&&p.state==='staying'?p.chatFace||'happy':p.step?p.entry.walkFace||'happy':p.entry.face||'idle';
    if(p.ring==='far'){stats.far++;if(p.acc<.25)continue;p.slime.update(p.acc,time,{expression:mood,pose:p.move?.pose||null});p.acc=0;stats.updated++;continue;}
    stats.near++;p.slime.update(p.acc,time,{expression:mood,pose:p.move?.pose||null});p.acc=0;stats.updated++;
   }
  },
  dispose(){for(const p of folk){occupancy.remove(p);for(const m of [...pickables])if(m.userData.actor===p)pickables.splice(pickables.indexOf(m),1);}group.removeFromParent();group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});folk.length=0;},
 };
}
// Townsfolk checks (city-checks.js): a home that exists and is reachable, and a routine with at least
// one usable activity.
export function townsfolkProblems(data,city){
 const out=[],nav=createNavigator(city.tiles),spots=kind=>city.props.flatMap(p=>p.spots.filter(s=>s.kind===kind&&s.tile&&!s.tile.blocked));
 for(const entry of data.townsfolk||[]){const home=city.tiles.get(key(...entry.home));
  if(!home||home.blocked){out.push({kind:'townsfolk',severity:'error',tile:entry.home,text:`${entry.name||entry.id}'s home tile is missing or blocked.`});continue;}
  if(city.spawn&&!nav.reachable(home,city.spawn))out.push({kind:'townsfolk',severity:'warning',tile:entry.home,text:`${entry.name||entry.id} can't reach the town square from home.`});
  const usable=(entry.routine||[{do:'stroll'}]).some(r=>['stroll','chat','enter'].includes(r.do)||r.do==='patrol'&&entry.patrol?.length||spots(r.do).some(s=>nav.reachable(home,s.tile)));
  if(!usable)out.push({kind:'townsfolk',severity:'warning',tile:entry.home,text:`${entry.name||entry.id} has nothing in their routine they can do here.`});}
 return out;
}
// A generated crowd for playground and perf scenarios: n townsfolk with mixed routines around a city.
export function generateTownsfolk(city,n,seed=7){
 const random=seeded(seed),open=[...city.tiles.values()].filter(t=>!t.blocked&&!t.indoor&&!t.stair&&!t.water),colors=['#a4ce77','#e0a96d','#9db8e3','#d98fa6','#c7b46a','#8fc9b8','#b49ad6','#e3c07c'],hats=[null,null,null,'minersCap','fishersHat','ironSkullcap'];
 const routines=[[{do:'stroll',weight:3},{do:'sit',weight:2},{do:'gaze',weight:1},{do:'chat',weight:2}],[{do:'browse',weight:3},{do:'stroll',weight:2},{do:'drink',weight:1}],[{do:'vend',weight:5},{do:'stroll',weight:1}],[{do:'read',weight:1},{do:'enter',weight:2},{do:'stroll',weight:2}]];
 return Array.from({length:n},(_,i)=>{const home=open[Math.floor(random()*open.length)],hat=hats[Math.floor(random()*hats.length)];
  return {id:`folk-${i}`,name:`Townsfolk ${i+1}`,look:{color:colors[i%colors.length],loadout:hat?{head:hat}:null},home:[home.x,home.z],routine:routines[i%routines.length],pace:.8+random()*.5};});
}
