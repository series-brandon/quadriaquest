import {highlightResource} from './resource-highlight.js';
import {mentorModel,MENTORS} from './training-models.js';
import {createSlimeActor} from './slime-presentation.js';
import {createConversationFacing} from './conversation-facing.js';
import {blocksMovement,isCharacter,occupancy} from './world-occupancy.js';
import {key,canStep} from './world.js';
// Portable props/NPCs own picking, occupancy, availability and teardown. Props (stations, shelves) are
// solid. Characters (slimes) are walk-through and mark their tile occupied (world-occupancy.js).
// push: what a player stopping on a character's tile does. 'walk' (default) steps it to a free
// neighbouring tile, and it walks back to its home tile once that is free again (reappearing there if
// somehow pushed far away). 'never' (tutorial NPCs) keeps it in place; the player draws on top.
const movers=new Set(),HOME_FAR=8,HOME_DELAY=2;
export function createWorldActor({world,tile,parent,pickables,group,kind,label,onInteract,solid=blocksMovement({group}),push='walk'}){
 const character=!solid&&isCharacter({group});
 const actor={group,tile,x:tile.x,z:tile.z,kind,label,ready:true,opened:false,duration:0,push:character?push:'never',home:tile,world,awayFor:0};
 group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);if(solid)tile.blocked=true;if(character)occupancy.place(actor,[tile]);
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=actor;m.userData.tile=tile;pickables.push(m);meshes.push(m);}});
 let removed=false;actor.available=()=>!removed&&actor.ready&&world.get(key(actor.home.x,actor.home.z))===actor.home;
 actor.interact=()=>actor.available()&&onInteract?.(actor);
 actor.highlight=highlightResource(group,{height:1.5});
 // Moves to a tile; the model slides there (updateWorldActors).
 actor.step=t=>{actor.tile=t;actor.x=t.x;actor.z=t.z;occupancy.place(actor,[t]);for(const m of meshes)m.userData.tile=t;actor.awayFor=0;};
 if(character&&actor.push==='walk')movers.add(actor);
 actor.dispose=()=>{if(removed)return;removed=true;actor.ready=false;movers.delete(actor);occupancy.remove(actor);if(solid)actor.home.blocked=false;group.removeFromParent();for(const m of meshes){const i=pickables.indexOf(m);if(i>=0)pickables.splice(i,1);}const materials=new Set();group.traverse(m=>{if(!m.geometry?.userData.shared)m.geometry?.dispose();for(const mat of [m.material].flat())if(mat)materials.add(mat);});for(const m of materials)m.dispose();};
 return actor;
}
const free=(t,actor,taken)=>!!t&&!t.blocked&&!t.water&&!occupancy.occupied(t,actor)&&!taken(t);
// Step a 'walk' actor off a tile the player stopped on: to a free neighbour on level ground. Returns
// false when there is nowhere to go (it then stays, under the player).
export function pushWorldActor(actor,taken=()=>false){
 if(actor.push!=='walk')return false;
 const t=actor.tile,options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>actor.world.get(key(t.x+dx,t.z+dz))).filter(n=>free(n,actor,taken)&&canStep(t,n));
 const near=n=>Math.abs(n.x-actor.home.x)+Math.abs(n.z-actor.home.z);
 const spot=options.sort((a,b)=>near(a)-near(b))[0];if(!spot)return false;actor.step(spot);return true;
}
// Per frame: pushed actors slide to their tile and, once home has been free for a moment, return.
export function updateWorldActors(dt,taken=()=>false){
 for(const a of movers){
  const target={x:a.tile.x-6,z:a.tile.z-6},p=a.group.position,dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
  a.moving=d>.05;a.group.visible=!occupancy.covered(a,a.tile);
  if(d>.001){const s=Math.min(1,dt*3/d);p.x+=dx*s;p.z+=dz*s;a.group.rotation.y=Math.atan2(dx,dz);continue;}
  if(a.tile===a.home)continue;
  const far=Math.abs(a.tile.x-a.home.x)+Math.abs(a.tile.z-a.home.z);
  if(!free(a.home,a,taken)){a.awayFor=0;continue;}
  if((a.awayFor+=dt)<HOME_DELAY)continue;
  if(far>HOME_FAR){a.step(a.home);a.group.position.set(a.home.x-6,a.group.position.y,a.home.z-6);continue;}
  // One step at a time toward home (a pushed actor is rarely more than a tile away).
  const next=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,z])=>a.world.get(key(a.tile.x+x,a.tile.z+z))).filter(n=>n&&(n===a.home||free(n,a,taken))&&canStep(a.tile,n)).sort((m,n)=>Math.abs(m.x-a.home.x)+Math.abs(m.z-a.home.z)-(Math.abs(n.x-a.home.x)+Math.abs(n.z-a.home.z)))[0];
  if(next)a.step(next);
 }
}
// A mentor is a slime actor: shared presentation and motions, with the mentor's look, loadout and pace.
// update(): expression overrides the mentor's default face (dialogue); calm eases the idle in conversation. play(kind)/stop() run any shared motion.
// Tutorial mentors never get pushed (push:'never' unless a placement overrides it).
export function createMentor(options){const def=MENTORS[options.kind],rig=mentorModel(options.kind),actor=createWorldActor({push:'never',...options,group:rig.group}),facing=createConversationFacing(rig.group),slime=createSlimeActor(rig,{loadout:def.loadout,carry:def.carry,idleRate:def.idleRate});actor.rig=rig;actor.slime=slime;actor.face=target=>facing.face(target);actor.update=(dt,time,expression,calm=false)=>{facing.update(dt);slime.update(dt,time,{expression:def.expression,face:expression||null,calm});};actor.play=(kind,options)=>slime.play(kind,options);actor.stop=()=>slime.stop();actor.reset=()=>{facing.reset();slime.stop();};return actor;}
