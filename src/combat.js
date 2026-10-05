import {Vector3} from 'three';
import {findPath,key} from './world.js';
import {createGatheringSkill,awardSkillXp} from './skills.js';
import {damageRoll,incomingHealth} from './combat-rules.js';
import {wanderDelay,shouldWander,wanderRoute} from './wander.js';
import {attackPose} from './combat-motion.js';
import {animateGoblin} from './enemy-model.js';
import {FAINT_FADE_START,FAINT_RESPAWN_TIME} from './faint-motion.js';

// Area-independent combat and enemy lifecycle. Maps supply entities and safe respawn context.
export function createCombatSystem(api){
 const skill=createGatheringSkill(),enemies=new Set(),fleeing=new Map(),projected=new Vector3();
 let fight=null,chase=null,defeated=0;const random=api.random||Math.random;
 const current=a=>api.world.get(key(a.home.x,a.home.z))===a.home;
 const position=t=>new Vector3(t.x-6,t.h,t.z-6);
 const reserved=t=>t===api.tile()||api.reserved(t);
 function move(a,t){if(a.occupying)a.tile.blocked=false;a.tile=t;a.x=t.x;a.z=t.z;t.blocked=true;a.occupying=true;a.group.traverse(m=>{if(m.userData.actor===a)m.userData.tile=t;});}
 function resetEnemy(a){
  fleeing.delete(a);if(a.occupying){a.tile.blocked=false;a.occupying=false;}
  a.patrolRoute=[];a.patrolClock=wanderDelay(random);a.hitAge=a.attackAge=0;a.hp=a.rules.health;a.opened=false;
  a.group.scale.setScalar(a.scale);a.group.rotation.set(0,0,0);
  // Defer return if its home is occupied. Never place an enemy over another entity.
  a.returning=a.home.blocked||reserved(a.home);a.group.visible=current(a)&&!a.returning;
  if(!a.returning){move(a,a.home);a.group.position.copy(position(a.home));}
 }
 function cancel(){if(fight){const a=fight.enemy;fight=null;resetEnemy(a);}api.complete?.();}
 function clearChase(){if(chase){const a=chase.enemy;chase=null;resetEnemy(a);}}
 function clear(){cancel();clearChase();if(defeated)api.fade?.(0);defeated=0;api.clearFeedback?.();}
 function disengage(){if(fight){chase={enemy:fight.enemy,origin:fight.enemy.tile,age:0,stepClock:0,attackClock:0};fight=null;}}
 function start(a){
  if(fight?.enemy===a||!enemies.has(a)||!current(a)||a.opened||a.returning||defeated||api.health.value<=0||api.blocked()||!api.inReach(a))return false;
  const reengaging=chase?.enemy===a;if(chase&&!reengaging)clearChase();if(reengaging)chase=null;
  api.stop();fight={enemy:a,age:0,playerClock:0,enemyClock:0};a.patrolRoute=[];api.face(a.x,a.z);return true;
 }
 function lose(){api.stop();clearChase();api.health.value=0;defeated=.001;}
 function hitPlayer(a){const before=api.health.value,hit=random()<.85;if(hit)api.health.value=incomingHealth(before,damageRoll(a.rules.min,a.rules.max,random),api.equipment.isEquipped('shields'),a.rules.protected);api.hit(api.player.position,hit?before-api.health.value:null);api.sound('blocked');if(api.health.value===0)lose();}
 function win(a){
  fight=null;a.opened=true;if(a.occupying){a.tile.blocked=false;a.occupying=false;}
  const at=api.tile(),escape=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>api.world.get(key(a.x+dx,a.z+dz))).filter(t=>t&&!t.water&&!t.blocked&&!reserved(t)&&Math.abs(t.h-a.tile.h)<=.5).sort((x,y)=>Math.hypot(y.x-at.x,y.z-at.z)-Math.hypot(x.x-at.x,x.z-at.z))[0];
  fleeing.set(a,{age:0,destination:escape&&position(escape)});api.reward(awardSkillXp(skill,'Combat'));api.complete?.();
 }
 function update(dt,time,camera){
  if(fight&&(!current(fight.enemy)||api.blocked()))cancel();
  if(chase&&!current(chase.enemy))clearChase();
  if(fight&&!api.inReach(fight.enemy))disengage();
  if(chase){const c=chase,a=c.enemy,p=api.tile();c.age+=dt;c.stepClock+=dt;c.attackClock+=dt;
   if(c.age>3||Math.abs(p.x-c.origin.x)+Math.abs(p.z-c.origin.z)>3||api.safe?.(p)||api.blocked())clearChase();
   else {const route=findPath(api.world,a.tile,p);if(!route)clearChase();else if(route.length>1&&c.stepClock>=.55){const next=route[0];if(!reserved(next)){move(a,next);c.stepClock=0;}}else if(route.length===1&&c.attackClock>=a.rules.interval){c.attackClock=0;a.attackAge=.35;hitPlayer(a);}}
  }
  for(const a of enemies){
   const visible=current(a);if(a.healthLabel)a.healthLabel.hidden=true;
   if(!visible){a.group.visible=false;continue;}
   if(a.returning){resetEnemy(a);if(a.returning)continue;}
   a.group.visible=!a.opened||fleeing.has(a);a.highlight?.update(false,time,api.hover?.()===a&&!a.opened);
   if(a.opened)continue;a.hitAge=Math.max(0,a.hitAge-dt);a.attackAge=Math.max(0,a.attackAge-dt);
   const fighting=fight?.enemy===a||chase?.enemy===a,settled=a.group.position.distanceTo(position(a.tile))<.025;
   if(fighting||api.blocked()||defeated||api.approaching?.()===a)a.patrolRoute=[];
   else if(settled){if(!a.patrolRoute.length){a.patrolClock-=dt;if(a.patrolClock<=0){a.patrolClock=wanderDelay(random);if(shouldWander(random))a.patrolRoute=wanderRoute(api.world,a.tile,a.patrol,reserved,random);}}
    const next=a.patrolRoute[0];if(next){if(next.blocked||next.water||reserved(next)){a.patrolRoute=[];}else {a.patrolRoute.shift();move(a,next);}}
   }
   const destination=position(a.tile),distance=a.group.position.distanceTo(destination),moving=distance>.025;
   if(fighting)a.group.rotation.y=Math.atan2(api.player.position.x-a.group.position.x,api.player.position.z-a.group.position.z);
   else if(moving)a.group.rotation.y=Math.atan2(destination.x-a.group.position.x,destination.z-a.group.position.z);
   if(distance)a.group.position.lerp(destination,Math.min(1,dt*(chase?.enemy===a?3:1.6)/distance));
   const clock=fight?.enemy===a?fight.enemyClock:chase?.enemy===a?chase.attackClock:0;
   animateGoblin(a.group,time+a.patrolPhase,{walk:moving?1:0,attack:fighting&&(clock>=.28||a.attackAge>0)?attackPose(clock,a.rules.interval):0,hit:Math.sin(Math.PI*a.hitAge/.25)});
   if(a.healthLabel&&fight?.enemy===a&&camera){a.healthLabel.hidden=false;projected.copy(a.group.position).add(new Vector3(0,1.7,0)).project(camera);a.healthLabel.style.left=(projected.x+1)*innerWidth/2+'px';a.healthLabel.style.top=(1-projected.y)*innerHeight/2+'px';a.healthLabel.textContent=`${a.rules.name} · ${a.hp}/${a.rules.health}`;}
  }
  for(const [a,f] of fleeing)if(current(a)){f.age+=dt;animateGoblin(a.group,time,{walk:1});if(f.destination){a.group.rotation.y=Math.atan2(f.destination.x-a.group.position.x,f.destination.z-a.group.position.z);a.group.position.lerp(f.destination,1-Math.exp(-dt*3));}a.group.scale.setScalar(a.scale*Math.max(.01,1-Math.max(0,(f.age-.8)/.4)));if(f.age>=1.2){a.group.visible=false;fleeing.delete(a);}}
  if(defeated){defeated+=dt;api.fade?.(Math.max(0,Math.min(1,(defeated-FAINT_FADE_START)/(FAINT_RESPAWN_TIME-FAINT_FADE_START))));if(defeated>=FAINT_RESPAWN_TIME&&api.respawn()){defeated=0;api.health.restore();api.fade?.(0);api.respawned?.();return null;}return {kind:'Defeated',time:Math.min(defeated,FAINT_RESPAWN_TIME)};}
  if(!fight)return null;const c=fight,a=c.enemy;c.age+=dt;c.playerClock+=dt;c.enemyClock+=dt;api.face(a.x,a.z);
  if(c.playerClock>=1.5){c.playerClock-=1.5;if(random()<Math.min(.98,.9+(skill.level-1)*.005)){const before=a.hp,sword=api.equipment.isEquipped('swords');a.hp=Math.max(0,a.hp-damageRoll(sword?3:1,sword?5:3,random));a.hitAge=.25;api.hit(a.group.position,before-a.hp);api.sound('chop');}else api.hit(a.group.position,null);if(!a.hp){win(a);return null;}}
  if(c.enemyClock>=a.rules.interval){c.enemyClock-=a.rules.interval;a.attackAge=.35;hitPlayer(a);if(defeated)return {kind:'Defeated',time:0};}
  api.interacting?.();return {kind:'Combat',time:c.age};
 }
 return {skill,start,update,cancel,clear,disengage,lose,
  add(a){enemies.add(a);a.patrolPhase=random()*10;resetEnemy(a);return a;},
  remove(a){if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;fleeing.delete(a);enemies.delete(a);if(a.occupying)a.tile.blocked=false;a.dispose?.();},
  reset(){clear();for(const a of enemies)resetEnemy(a);},
  matches:a=>fight?.enemy===a,get working(){return !!fight||!!chase;},get busy(){return defeated>0;},
  get state(){return {fight:fight?.enemy.kind||null,chase:chase?.enemy.kind||null,defeated:!!defeated,enemies:[...enemies].filter(current).map(a=>({kind:a.kind,x:a.x,z:a.z,hp:a.hp,opened:a.opened,returning:!!a.returning}))};}
 };
}
