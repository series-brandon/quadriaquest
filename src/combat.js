import {Vector3} from 'three';
import {findPath,key} from './world.js';
import {withinAttackRange} from './combat-range.js';
import {createGatheringSkill,awardSkillXp} from './skills.js';
import {damageRoll,incomingHealth} from './combat-rules.js';
import {wanderDelay,shouldWander,wanderRoute} from './wander.js';
import {attackPose} from './combat-motion.js';
import {attackWindow,BLOCK_DURATION,PROJECTILE_FLIGHT} from './combat-animation.js';
import {animateTarget} from './training-models.js';
import {animateGoblin} from './enemy-model.js';
import {FAINT_FADE_START,FAINT_RESPAWN_TIME} from './faint-motion.js';

// Shared targeting, aggression, walking and recovery; maps provide encounter configuration.
export function createCombatSystem(api){
 const skill=createGatheringSkill(),enemies=new Set(),fleeing=new Map(),projected=new Vector3(),returningAfterWin=new Map(),shots=[];
 let fight=null,chase=null,defeated=0,defense=null,autoRetaliate=true;const random=api.random||Math.random;
 const attack=()=>api.attack?.()||api.equipment.attack||{min:1,max:3,interval:1.5,style:'unarmed'};
 const profile=()=>({...attack(),mainHand:api.equipment.slots?.main||null,offHand:api.equipment.slots?.off||null});
 const animate=(a,time,options)=>a.rules.inert?animateTarget(a.group,time,options.hit):animateGoblin(a.group,time,options);
 const current=a=>api.world.get(key(a.home.x,a.home.z))===a.home;
 const position=t=>new Vector3(t.x-6,t.h,t.z-6);
 const reserved=t=>t===api.tile()||api.reserved(t);
 const settled=a=>a.group.position.distanceTo(position(a.tile))<.001;
 const adjacent=a=>settled(a)&&Math.abs(a.x-api.tile().x)+Math.abs(a.z-api.tile().z)===1&&Math.abs(a.tile.h-api.tile().h)<=.5;
 function move(a,t){if(a.occupying)a.tile.blocked=false;a.tile=t;a.x=t.x;a.z=t.z;t.blocked=true;a.occupying=true;a.group.traverse(m=>{if(m.userData.actor===a)m.userData.tile=t;});}
 function resetEnemy(a){
  for(let i=shots.length-1;i>=0;i--)if(shots[i].enemy===a)shots.splice(i,1);
  returningAfterWin.delete(a);fleeing.delete(a);if(a.occupying){a.tile.blocked=false;a.occupying=false;}
  a.patrolRoute=[];a.patrolClock=wanderDelay(random);a.hitAge=a.attackAge=a.enemyClock=0;a.hp=a.rules.health;a.opened=false;a.aggro=false;
  a.group.scale.setScalar(a.scale);a.group.rotation.set(0,0,0);
  a.waitingRespawn=!!(a.home.blocked||reserved(a.home));a.returning=a.waitingRespawn;a.group.visible=current(a)&&!a.waitingRespawn;
  if(!a.waitingRespawn){move(a,a.home);a.group.position.copy(position(a.home));}
 }
 function returnHome(a){
  if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;
  a.aggro=false;a.returning=true;a.enemyClock=a.attackAge=0;a.patrolRoute=[];
  if(settled(a)&&a.tile===a.home&&!reserved(a.home)){a.returning=false;a.hp=a.rules.health;}
 }
 function cancel(){if(fight){const a=fight.enemy;fight=null;if(a.rules.inert)resetEnemy(a);else if(a.aggro)returnHome(a);}api.complete?.();}
 function clearChase(){if(chase)returnHome(chase.enemy);}
 function clear(){const affected=new Set(shots.map(s=>s.enemy));if(fight)affected.add(fight.enemy);if(chase)affected.add(chase.enemy);for(const a of enemies)if(a.returning||a.aggro)affected.add(a);shots.length=0;fight=chase=null;defense=null;for(const a of affected)resetEnemy(a);if(defeated)api.fade?.(0);defeated=0;api.clearFeedback?.();api.clearProjectiles?.();}
 function disengage(){if(!fight)return;const a=fight.enemy;fight=null;if(a.rules.inert){resetEnemy(a);return;}if(a.aggro)chase={enemy:a,age:0};}
 function start(a){
  if(fight?.enemy===a||!enemies.has(a)||!current(a)||a.opened||a.returning||defeated||api.health.value<=0||api.blocked()||!api.inReach(a))return false;
  const next=profile();if(next.ammo&&!(api.inventory?.[next.ammo]>0)){api.toast?.('You need Training Arrows.');return false;}
  const reengaging=chase?.enemy===a;if(chase&&!reengaging)clearChase();if(reengaging)chase=null;
  api.stop();fight={enemy:a,age:0,playerClock:0,profile:next};a.patrolRoute=[];
  // Selection and windup never provoke a passive enemy; strike resolves that.
  api.face(a.x,a.z);return true;
 }
 function lose(){if(api.defeatStop)api.defeatStop();else api.stop();clearChase();api.health.value=0;defense=null;defeated=.001;}
 function engage(a){
  if(a.rules.inert||a.aggro||a.opened||a.returning)return;
  a.aggro=true;a.patrolRoute=[];if(!fight&&!chase)chase={enemy:a,age:0};api.interrupt?.();
 }
 function hitPlayer(a){
  api.interrupt?.();
  const before=api.health.value,hit=random()<.85;
  if(hit){api.health.value=incomingHealth(before,damageRoll(a.rules.min,a.rules.max,random),api.equipment.mitigation??0,a.rules.protected);defense={age:0,profile:profile()};}
  api.hit(api.player.position,hit?before-api.health.value:null);api.sound('blocked');
  if(api.health.value===0){lose();return;}
  if(autoRetaliate&&!fight){if(api.inReach(a))start(a);else api.retaliate?.(a);}
 }
 function win(a,weapon){
  if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;a.aggro=false;a.opened=true;if(a.occupying){a.tile.blocked=false;a.occupying=false;}
  const at=api.tile(),escape=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>api.world.get(key(a.x+dx,a.z+dz))).filter(t=>t&&!t.water&&!t.blocked&&!reserved(t)&&Math.abs(t.h-a.tile.h)<=.5).sort((x,y)=>Math.hypot(y.x-at.x,y.z-at.z)-Math.hypot(x.x-at.x,x.z-at.z))[0];
  fleeing.set(a,{age:0,destination:!a.rules.inert&&escape&&position(escape)});if(!a.rules.inert)api.reward(awardSkillXp(skill,'Combat'));api.won?.(a,weapon);if(a.respawn!=null)returningAfterWin.set(a,a.respawn+1.2);api.complete?.();
 }
 function strike(a,weapon){
  if(!current(a)||a.opened||a.returning)return;
  engage(a); // A resolved attempt provokes even on a miss or zero damage.
  if(random()<Math.min(.98,.9+(skill.level-1)*.005)){
   const before=a.hp;a.hp=Math.max(0,a.hp-damageRoll(weapon.min,weapon.max,random));a.hitAge=.25;api.hit(a.group.position,before-a.hp);api.sound('chop');api.struck?.(a,weapon);
  }else api.hit(a.group.position,null);
  if(!a.hp)win(a,weapon);
 }
 function walkHome(a){
  if(!settled(a))return;
  if(a.tile===a.home){if(reserved(a.home))return;a.returning=false;a.hp=a.rules.health;a.patrolClock=wanderDelay(random);return;}
  if(a.home.blocked||reserved(a.home))return;
  const route=findPath(api.world,a.tile,a.home),next=route?.[0];if(next&&!reserved(next))move(a,next);
 }
 function pursue(a){
  const p=api.tile();
  if(Math.abs(p.x-a.home.x)+Math.abs(p.z-a.home.z)>(a.leash??6)||api.safe?.(p)||api.blocked()){returnHome(a);return;}
  if(!settled(a)||adjacent(a))return;
  const route=findPath(api.world,a.tile,p),next=route?.[0];
  if(!route){returnHome(a);return;}
  if(route.length>1&&next&&!next.blocked&&!reserved(next)&&!api.safe?.(next))move(a,next);
 }
 function update(dt,time,camera){
  if(defense){defense.age+=dt;if(defense.age>=BLOCK_DURATION)defense=null;}
  for(let i=shots.length-1;i>=0;i--){const shot=shots[i];shot.left-=dt;if(shot.left<=0){shots.splice(i,1);strike(shot.enemy,shot.profile);}}
  if(fight&&(!current(fight.enemy)||api.blocked())){const a=fight.enemy;fight=null;resetEnemy(a);}
  if(chase&&!current(chase.enemy)){const a=chase.enemy;chase=null;resetEnemy(a);}
  if(fight&&!api.inReach(fight.enemy))disengage();
  for(const a of enemies){
   const visible=current(a);if(visible&&returningAfterWin.has(a)){const remaining=returningAfterWin.get(a)-dt;returningAfterWin.set(a,remaining);if(remaining<=0)resetEnemy(a);}
   if(a.healthLabel)a.healthLabel.hidden=true;
   if(!visible){a.group.visible=false;continue;}
   if(a.waitingRespawn){resetEnemy(a);if(a.waitingRespawn)continue;}
   a.group.visible=!a.opened||fleeing.has(a);a.highlight?.update(!!a.guided&&!a.opened,time,api.hover?.()===a&&!a.opened);
   if(a.opened)continue;a.hitAge=Math.max(0,a.hitAge-dt);a.attackAge=Math.max(0,a.attackAge-dt);
   if(!a.aggro&&!a.returning&&!a.rules.inert&&(a.aggressive??a.rules.aggressive)&&!defeated&&!api.blocked()&&!api.safe?.(api.tile())&&settled(a)){
    const p=api.tile();if(withinAttackRange(api.world,a.tile,{x:p.x,z:p.z,tile:p},a.aggroRange??a.rules.aggroRange??3)&&findPath(api.world,a.tile,p))engage(a);
   }
   if(a.returning)walkHome(a);
   else if(a.aggro)pursue(a);
   const targeted=fight?.enemy===a||chase?.enemy===a;
   if(a.rules.inert||targeted||a.aggro||a.returning||api.blocked()||defeated||api.approaching?.()===a)a.patrolRoute=[];
   else if(settled(a)){if(!a.patrolRoute.length){a.patrolClock-=dt;if(a.patrolClock<=0){a.patrolClock=wanderDelay(random);if(shouldWander(random))a.patrolRoute=wanderRoute(api.world,a.tile,a.patrol,reserved,random);}}
    const next=a.patrolRoute[0];if(next){if(next.blocked||next.water||reserved(next))a.patrolRoute=[];else{a.patrolRoute.shift();move(a,next);}}
   }
   const destination=position(a.tile),distance=a.group.position.distanceTo(destination),moving=distance>.001;
   if(moving)a.group.rotation.y=Math.atan2(destination.x-a.group.position.x,destination.z-a.group.position.z);
   else if(a.aggro)a.group.rotation.y=Math.atan2(api.player.position.x-a.group.position.x,api.player.position.z-a.group.position.z);
   // Every path mode reserves one destination and physically finishes it before taking another.
   if(distance)a.group.position.lerp(destination,Math.min(1,dt*(a.aggro||a.returning?2:1.6)/distance));
   if(a.aggro&&adjacent(a)&&!defeated){a.enemyClock+=dt;if(a.enemyClock>=a.rules.interval){a.enemyClock-=a.rules.interval;a.attackAge=.28;hitPlayer(a);}}
   else a.enemyClock=0;
   animate(a,time+a.patrolPhase,{walk:moving?1:0,attack:a.aggro&&(a.enemyClock>=.28||a.attackAge>0)?attackPose(a.enemyClock,a.rules.interval):0,hit:Math.sin(Math.PI*a.hitAge/.25)});
   if(a.healthLabel&&fight?.enemy===a&&camera){a.healthLabel.hidden=false;projected.copy(a.group.position).add(new Vector3(0,1.7,0)).project(camera);a.healthLabel.style.left=(projected.x+1)*innerWidth/2+'px';a.healthLabel.style.top=(1-projected.y)*innerHeight/2+'px';a.healthLabel.textContent=`${a.rules.name} · ${a.hp}/${a.rules.health}`;}
  }
  for(const [a,f] of fleeing)if(current(a)){f.age+=dt;animate(a,time,{walk:1});if(f.destination){a.group.rotation.y=Math.atan2(f.destination.x-a.group.position.x,f.destination.z-a.group.position.z);a.group.position.lerp(f.destination,1-Math.exp(-dt*3));}a.group.scale.setScalar(a.scale*Math.max(.01,1-Math.max(0,(f.age-.8)/.4)));if(f.age>=1.2){a.group.visible=false;fleeing.delete(a);}}
  if(defeated){defeated+=dt;api.fade?.(Math.max(0,Math.min(1,(defeated-FAINT_FADE_START)/(FAINT_RESPAWN_TIME-FAINT_FADE_START))));if(defeated>=FAINT_RESPAWN_TIME&&api.respawn()){defeated=0;api.health.restore();api.fade?.(0);api.respawned?.();return null;}return {kind:'Defeated',time:Math.min(defeated,FAINT_RESPAWN_TIME)};}
  if(fight&&!api.eating?.()){const c=fight,a=c.enemy;c.age+=dt;c.playerClock+=dt;api.face(a.x,a.z);const weapon=c.profile;
   if(c.playerClock>=weapon.interval){
    if(weapon.ammo&&!(api.inventory?.[weapon.ammo]>0)){disengage();api.toast?.('Out of arrows. Visit a supply offer to refill.');}
    else{c.playerClock-=weapon.interval;if(weapon.ammo){api.inventory[weapon.ammo]--;api.items?.({[weapon.ammo]:-1});}
     if(['ranged','magic'].includes(weapon.style)){api.projectile?.(api.player.position.clone().add(new Vector3(0,.55,0)),a.group.position.clone().add(new Vector3(0,.55,0)),weapon.style);shots.push({enemy:a,profile:weapon,left:PROJECTILE_FLIGHT});}else strike(a,weapon);
    }
   }
   if(fight){api.interacting?.();if(!defense||attackWindow(weapon,c.age))return {kind:weapon.style==='ranged'?'Archery':weapon.style==='magic'?'Casting':'Combat',time:c.age,profile:weapon};}
  }
  return defense?{kind:'Block',time:defense.age,profile:defense.profile}:null;
 }
 return {skill,start,update,cancel,clear,disengage,lose,
  get autoRetaliate(){return autoRetaliate;},setAutoRetaliate(value){autoRetaliate=!!value;},
  add(a){enemies.add(a);a.patrolPhase=random()*10;resetEnemy(a);return a;},
  remove(a){if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;fleeing.delete(a);returningAfterWin.delete(a);for(let i=shots.length-1;i>=0;i--)if(shots[i].enemy===a)shots.splice(i,1);enemies.delete(a);if(a.occupying)a.tile.blocked=false;a.dispose?.();},
  resetWhere(predicate=()=>true){if(fight&&predicate(fight.enemy))fight=null;if(chase&&predicate(chase.enemy))chase=null;defense=null;for(const a of enemies)if(predicate(a))resetEnemy(a);},
  reset(){clear();for(const a of enemies)resetEnemy(a);},
  matches:a=>fight?.enemy===a,get working(){return !!fight||!!chase||[...enemies].some(a=>current(a)&&a.aggro&&!a.opened);},get busy(){return defeated>0;},
  get state(){return {autoRetaliate,fight:fight?.enemy.kind||null,chase:chase?.enemy.kind||null,defeated:!!defeated,blocking:!!defense,enemies:[...enemies].filter(current).map(a=>({kind:a.kind,x:a.x,z:a.z,hp:a.hp,opened:a.opened,aggressive:!!(a.aggressive??a.rules.aggressive),aggroRange:a.aggroRange??a.rules.aggroRange??3,aggro:!!a.aggro,returning:!!a.returning,moving:!settled(a),position:a.group.position.toArray()}))};}
 };
}
