import {Vector3} from 'three';
import {findPath,key} from './world.js';
const same=(a,b)=>!!(a&&b&&a.x===b.x&&a.z===b.z);
// Search once at tile boundaries; never route through the player's occupied tile.
export function companionRoute(world,start,player,reserved=()=>false,occupied=()=>false){
 if(Math.abs(start.x-player.x)+Math.abs(start.z-player.z)===1&&!reserved(start)&&!start.blocked&&!start.water)return [];
 const queue=[start],previous=new Map([[key(start.x,start.z),null]]),candidates=[];
 for(let i=0;i<queue.length;i++){
  const tile=queue[i];
  if(!same(tile,player)&&!reserved(tile)&&!tile.blocked&&!tile.water)candidates.push(tile);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=world.get(key(tile.x+dx,tile.z+dz));if(!n||n.blocked||n.water||(same(n,player)||occupied(n))||Math.abs(n.h-tile.h)>.5||previous.has(key(n.x,n.z)))continue;previous.set(key(n.x,n.z),tile);queue.push(n);}
 }
 candidates.sort((a,b)=>Math.abs(a.x-player.x)+Math.abs(a.z-player.z)-(Math.abs(b.x-player.x)+Math.abs(b.z-player.z)));
 const destination=candidates[0];if(!destination)return [];
 const route=[];for(let t=destination;!same(t,start);t=previous.get(key(t.x,t.z)))route.unshift(t);
 return route;
}
export function createCompanionFollower(model,{toPosition=t=>new Vector3(t.x-6,t.h,t.z-6)}={}){
 let tile=null,step=null,lastPlayer=null,gait=0,yieldBlocked=false,jump=null;
 const target=new Vector3();
 function reset(at=null){tile=at;step=null;lastPlayer=null;yieldBlocked=false;jump=null;}
 function spawn(world,player,reserved){
  const nearby=[...world.values()].filter(t=>!t.blocked&&!t.water&&!same(t,player)&&!reserved(t)&&Math.abs(t.h-player.h)<=.5).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
  tile=nearby[0]||null;step=null;jump=null;if(tile)model.position.copy(toPosition(tile));
 }
 return {reset,get moving(){return !!step;},get jump(){return jump&&{height:jump.height,progress:Math.min(1,jump.age/.65)};},get gait(){return gait;},get yieldBlocked(){return yieldBlocked;},occupies(t){return same(t,tile)||same(t,step);},update(dt,world,player,reserved=()=>false,occupied=()=>false){
  if(!tile||world.get(key(tile.x,tile.z))!==tile||lastPlayer&&Math.hypot(lastPlayer.x-player.x,lastPlayer.z-player.z)>3)spawn(world,player,reserved);
  lastPlayer=player;if(!tile){model.visible=false;return false;}
  if(!step){const route=companionRoute(world,tile,player,reserved,occupied);step=route[0]||null;if(step&&step.h!==tile.h)jump={from:model.position.clone(),height:step.h-tile.h,age:0};yieldBlocked=reserved(tile)&&!step;}
  if(!step)return false;
  if(step.blocked||step.water||same(step,player)||occupied(step)){step=null;jump=null;return false;}
  target.copy(toPosition(step));
  if(jump){jump.age+=dt;const progress=Math.min(1,jump.age/.65),smooth=progress*progress*(3-2*progress);model.position.lerpVectors(jump.from,target,smooth);model.position.y+=Math.sin(progress*Math.PI)*.22;const yaw=Math.atan2(target.x-jump.from.x,target.z-jump.from.z);model.rotation.y+=Math.atan2(Math.sin(yaw-model.rotation.y),Math.cos(yaw-model.rotation.y))*(1-Math.exp(-dt*14));gait+=dt*4;if(progress===1){model.position.copy(target);tile=step;step=null;jump=null;}return true;}
  const distance=model.position.distanceTo(target),travel=Math.min(distance,dt*3.3);
  if(distance>.001){const yaw=Math.atan2(target.x-model.position.x,target.z-model.position.z);model.rotation.y+=Math.atan2(Math.sin(yaw-model.rotation.y),Math.cos(yaw-model.rotation.y))*(1-Math.exp(-dt*14));model.position.lerp(target,travel/distance);gait+=travel*4;}
  if(distance<=travel+.001){model.position.copy(target);tile=step;step=null;}
  return travel>.001;
 }};
}

// Keep the arrival tile and the crossing lane clear while greeting a rescued pet.
export function rescueStandAsideRoute(world,start,landing){
 const candidates=[[0,-1],[0,1],[-1,0]].map(([dx,dz])=>world.get(key(landing.x+dx,landing.z+dz))).filter(t=>t&&!t.water&&!t.blocked&&Math.abs(t.h-landing.h)<=.5);
 return candidates.map(tile=>({tile,route:findPath(world,start,tile)})).filter(choice=>choice.route!==null&&!choice.route.some(t=>t.z===landing.z&&t.x>landing.x)).sort((a,b)=>a.route.length-b.route.length)[0]||null;
}
