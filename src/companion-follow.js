import {Vector3} from 'three';
import {findPath,key,canStep,canMove,eachStep,searchRoute,routeTo,chebyshev,DIAGONAL_MOVES} from './world.js';
import {SLIDE_DURATION,STEP_DURATION,isRamp} from './slime-motion.js';
import {createPopIn} from './pop-in.js';
// How a companion follows the player (docs/MOVEMENT-PLAN.md, user decisions 2026-10-15). Tunable from
// the playground; FOLLOW_DEFAULTS restores them.
//   pace      share of the player's walking speed (Celerity and Rush included)
//   sprint    pace multiplier while the player sprints (still slower than the sprinting player)
//   start     it starts walking once the player is this many tiles away (any direction)
//   teleport  further than this, it pops in beside the player instead
//   route     a route longer than this (round a wall, through a door it can't open) also teleports
//   limit     tiles a route search may expand; no route within it teleports too
//   retry     seconds before trying again when there is nowhere to land
export const FOLLOW_DEFAULTS=Object.freeze({pace:.85,sprint:2,start:2,teleport:8,route:12,limit:400,retry:.5});
export const FOLLOW={...FOLLOW_DEFAULTS};
const dryStep=(from,to)=>canStep(from,to)&&!to.water;
const stepOptions=()=>({diagonal:DIAGONAL_MOVES.companion,passable:dryStep});
// The companion's route: to the nearest tile beside the player (any of the 8) where it may stop
// (`stopOk`), preferring one nobody stands on (`free`). Other characters don't bend it: it walks
// straight through people, the player included. Terrain, water, walls and closed doors still apply.
// Returns null when no such tile is found within `limit` tiles.
export function followRoute(world,start,player,{stopOk=()=>true,free=()=>true,limit=FOLLOW.limit}={}){
 const options=stepOptions(),expand=(t,add)=>eachStep(world,t,n=>add(n,1),options);
 for(const ok of [t=>stopOk(t)&&free(t),stopOk]){
  const {end,previous}=searchRoute(start,expand,{target:player,near:1,limit,goal:t=>chebyshev(t,player)===1&&ok(t)});
  if(end)return routeTo(previous,end);
 }
 return null;
}
// Where a teleporting companion lands: within two of its own steps of the player (never across a wall
// or up a ledge the player's tile can't reach), free tiles first, then the nearer ring, then the one
// most behind the player (facing: the player's yaw, forward = (sin, cos)).
export function landingSpot(world,player,{facing=0,stopOk=()=>true,free=()=>true}={}){
 const options=stepOptions(),reach=new Map([[player,0]]),queue=[player];
 for(let i=0;i<queue.length;i++){const t=queue[i],d=reach.get(t);if(d>=2)continue;eachStep(world,t,n=>{if(!reach.has(n)){reach.set(n,d+1);queue.push(n);}},options);}
 const bx=-Math.sin(facing),bz=-Math.cos(facing);
 const behind=t=>{const dx=t.x-player.x,dz=t.z-player.z;return (dx*bx+dz*bz)/(Math.hypot(dx,dz)||1);};
 const spots=[...reach.keys()].filter(t=>t!==player&&!t.blocked&&!t.water&&stopOk(t));
 spots.sort((a,b)=>free(b)-free(a)||reach.get(a)-reach.get(b)||behind(b)-behind(a));
 return spots[0]||null;
}
// The follower: resting beside the player, following (one step at a time, re-planned at every tile
// toward where the player is now), or just teleported. update() context:
//   reserved(t)  tiles it must not stop on (the player's route, a campfire being placed)
//   occupied(t)  someone stands there (only for choosing a free stopping tile)
//   next         the player's next tile; facing: the player's yaw
//   pace         the player's speed multiplier (walk bonuses; ×FOLLOW.sprint is applied by `sprinting`)
//   sprinting    whether the player is sprinting
export function createCompanionFollower(model,{toPosition=t=>new Vector3(t.x-6,t.h,t.z-6)}={}){
 let tile=null,step=null,planned=[],lastPlayer=null,gait=0,jump=null,progress=0,state='resting',lastTeleport=null,wait=0,speed=FOLLOW.pace;
 const from=new Vector3(),target=new Vector3(),before=new Vector3(),pop=createPopIn(model);
 function reset(at=null){tile=at;step=null;lastPlayer=null;jump=null;progress=0;state='resting';wait=0;pop.cancel();}
 const stopRules=(player,{reserved=()=>false,occupied=()=>false,next=null})=>({
  stopOk:t=>t!==player&&t!==next&&!reserved(t)&&!t.blocked&&!t.water,free:t=>!occupied(t)});
 // Pops in beside the player. Returns false (and waits FOLLOW.retry) when there is nowhere to land.
 function teleport(world,player,context={},reason='manual'){
  const spot=landingSpot(world,player,{facing:context.facing??0,...stopRules(player,context)});
  if(!spot){wait=FOLLOW.retry;return false;}
  tile=spot;step=null;jump=null;progress=0;model.position.copy(toPosition(tile));
  if(context.facing!=null)model.rotation.y=context.facing;
  pop.start();state='teleported';lastTeleport=reason;wait=0;return true;
 }
 function update(dt,world,player,context={}){
  pop.update(dt);if(wait>0)wait=Math.max(0,wait-dt);
  const {stopOk,free}=stopRules(player,context);
  speed=FOLLOW.pace*(context.pace??1)*(context.sprinting?FOLLOW.sprint:1);
  // A new map (travel, an interior) or a player moved at once (respawn, a jump): pop in beside them.
  const lost=!tile||world.get(key(tile.x,tile.z))!==tile,jumped=!!lastPlayer&&chebyshev(lastPlayer,player)>3;
  lastPlayer=player;
  if((lost||jumped)&&wait<=0)teleport(world,player,context,lost?'map':'moved');
  if(!tile||world.get(key(tile.x,tile.z))!==tile){model.visible=false;return false;}
  if(step&&!canMove(world,tile,step,stepOptions())){step=null;jump=null;}
  if(!step){
   const d=chebyshev(tile,player),here=stopOk(tile);
   // Beside the player (or, resting, close enough): stay.
   if(d===1&&here||state!=='following'&&d<FOLLOW.start&&d>0&&here){if(state==='following')state='resting';return false;}
   if(d>FOLLOW.teleport){if(wait<=0)teleport(world,player,context,'far');return false;}
   const route=followRoute(world,tile,player,{stopOk,free,limit:FOLLOW.limit});
   if(!route||route.length>FOLLOW.route){if(wait<=0)teleport(world,player,context,route?'detour':'no route');return false;}
   if(!route.length)return false;
   state='following';planned=route;step=route[0];progress=0;from.copy(model.position);
   jump=Math.abs(step.h-tile.h)>.01&&!isRamp(tile,step)?{height:step.h-tile.h}:null;
  }
  // The shared step timing, at the companion's pace: a diagonal takes as long as any other step.
  progress=Math.min(1,progress+dt*speed/(jump?STEP_DURATION:SLIDE_DURATION));
  target.copy(toPosition(step));before.copy(model.position);
  if(jump){const smooth=progress*progress*(3-2*progress);model.position.lerpVectors(from,target,smooth);model.position.y+=Math.sin(progress*Math.PI)*.22;}
  else model.position.lerpVectors(from,target,progress);
  const yaw=Math.atan2(target.x-from.x,target.z-from.z);
  model.rotation.y+=Math.atan2(Math.sin(yaw-model.rotation.y),Math.cos(yaw-model.rotation.y))*(1-Math.exp(-dt*14));
  gait+=Math.hypot(model.position.x-before.x,model.position.z-before.z)*4+(jump?dt*4:0);
  if(progress>=1){model.position.copy(target);tile=step;step=null;jump=null;planned.shift();}
  return true;
 }
 return {reset,update,teleport,
  get moving(){return !!step;},get jump(){return jump&&{height:jump.height,progress};},get gait(){return gait;},
  // resting, following or teleported; the last teleport's reason; the speed as a share of base walking.
  get state(){return state;},get lastTeleport(){return lastTeleport;},get speed(){return speed;},get popping(){return pop.active;},
  get tile(){return tile;},
  // The rest of the planned route while following (it re-plans at every tile), for the route overlay.
  get route(){return step?[tile,...planned]:[];},
  occupies(t){return !!t&&(t===tile||t===step);},get cells(){return [tile,step].filter(Boolean);}};
}

// Keep the arrival tile and the crossing lane clear while greeting a rescued pet.
export function rescueStandAsideRoute(world,start,landing){
 const candidates=[[0,-1],[0,1],[-1,0]].map(([dx,dz])=>world.get(key(landing.x+dx,landing.z+dz))).filter(t=>t&&!t.water&&!t.blocked&&Math.abs(t.h-landing.h)<=.5);
 return candidates.map(tile=>({tile,route:findPath(world,start,tile)})).filter(choice=>choice.route!==null&&!choice.route.some(t=>t.z===landing.z&&t.x>landing.x)).sort((a,b)=>a.route.length-b.route.length)[0]||null;
}
