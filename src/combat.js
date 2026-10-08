import {gameViewport} from './game-viewport.js';
import {Vector3} from 'three';
import {findPath,key} from './world.js';
import {withinAttackRange} from './combat-range.js';
import {resolveAttack,resolvePortions,rollDamage,actionXp,backfireBaseDamage,displayedLoss,xpModifiers} from './combat-formulas.js';
import {playerAttackProfile,playerDefense,strongStrikeProfile,armorAwards,offHandFollowUp,pairStrikes,FOLLOW_UP_DELAY} from './combat-profile.js';
import {ABILITIES,SPELLS} from './combat-styles.js';
import {signal} from './reactive.js';
import {createControlState} from './control-effects.js';
import {wanderDelay,shouldWander,wanderRoute} from './wander.js';
import {attackPose} from './combat-motion.js';
import {attackWindow,BLOCK_DURATION,PROJECTILE_FLIGHT} from './combat-animation.js';
// Follow-through window after a release (matches the attack animation's recovery).
const RECOVERY=.28;
import {animateTarget} from './training-models.js';
import {animateGoblin} from './enemy-model.js';
import {FAINT_FADE_START,FAINT_RESPAWN_TIME} from './faint-motion.js';

// Opening attack (docs/COMBAT.md): a ready attacker (no strike within its attack interval) opens with
// this short windup instead of the full interval. Applies to player melee and to aggressive enemies;
// bows and spells keep their full draw and cast time.
export const OPENING_WINDUP=.5;

// Shared targeting, aggression, walking and recovery; maps provide encounter configuration.
export function createCombatSystem(api){
 const enemies=new Set(),fleeing=new Map(),projected=new Vector3(),LABEL_LIFT=new Vector3(0,1.7,0),returningAfterWin=new Map(),shots=[],followUps=[];
 let fight=null,chase=null,defeated=0,defense=null,autoRetaliate=true,sinceActivity=Infinity,pending=null,sinceRelease=Infinity;
 // `openingWindup` may be null to pin full-windup timing in tests of other mechanics.
 const opening=api.openingWindup===undefined?OPENING_WINDUP:api.openingWindup;
 // UI bindings follow `revision` (pending/committed actions, fights) and `inCombatState`.
 const revision=signal(0),inCombatState=signal(false),notify=()=>{revision.value++;api.changed?.();};const random=api.random||Math.random,character=api.character;
 // Spells use no hand. Weapon and fist attacks follow the Attack hands choice: Main only, Off only,
 // or Both (dual wielding: the main hand strikes, then the off hand a beat later, each attack).
 const attack=()=>{
  const selected=api.attack?.()||api.equipment.attack;if(selected.spell||!api.equipment.handAttack)return selected;
  const choice=api.equipment.attackHands;
  return api.equipment.handAttack(choice==='both'?'main':choice)||selected;
 };
 const dualWielding=a=>!a.spell&&a.hand==='main'&&api.equipment.attackHands==='both'&&!!api.equipment.handAttack?.('off');
 // Both hands: the main-hand attack carries the off hand's follow-up on one cycle (combat-profile.js).
 const withOffHand=(main,a,strategy)=>{
  if(!dualWielding(a))return main;
  const off=api.equipment.handAttack('off'),twoWeapons=!!(a.item&&off.item);
  return pairStrikes(main,offHandFollowUp({...playerAttackProfile(character,off,strategy),rightHand:main.rightHand,leftHand:main.leftHand},twoWeapons?character.level('prof.dualWield'):null));
 };
 // Commit-time snapshot: later equipment, strategy or spell changes affect only the next attack.
 const profile=()=>{const a=attack(),strategy=api.strategy?.()||'technical';return withOffHand({...playerAttackProfile(character,a,strategy),rightHand:api.equipment.slots?.right||null,leftHand:api.equipment.slots?.left||null},a,strategy);};
 const reward=(result,a)=>{if(result.tracks.length||result.core.xp)api.reward?.(result,a);};
 // One shared pending combat-action slot. An ability attaches to the next attack when its windup begins;
 // a cancelled attack takes its ability with it (never restored).
 function commit(c){commitAttack(c);openingWindup(c);}
 // The swing animation still plays in full: the clock skips to the last part of the windup.
 function openingWindup(c){
  if(!opening||c.profile.combatStyle!=='melee'||c.profile.spell||sinceRelease<c.profile.interval)return;
  c.playerClock=Math.max(c.playerClock,c.profile.interval-opening);
 }
 function commitAttack(c){
  const hadAbility=!!c.ability;
  c.profile=profile();c.ability=null;
  if(!pending){if(hadAbility)notify();return;}
  if(pending.spell){commitSpell(c);return;}
  const ability=ABILITIES[pending.ability],reason=c.profile.combatStyle!==ability.style||c.profile.spell?`${ability.name} needs a melee attack.`:!(api.energy?.value>=ability.energy)?`Not enough Energy for ${ability.name} (${ability.energy} needed).`:null;
  pending=null;notify();
  if(reason){api.toast?.(reason);return;}
  // The ability empowers the main-hand strike; a dual-wield follow-up still lands as normal.
  const strong={...strongStrikeProfile(character,attack(),ability),rightHand:c.profile.rightHand,leftHand:c.profile.leftHand};
  c.profile=c.profile.followUp?pairStrikes(strong,c.profile.followUp):strong;c.ability=ability;notify();
 }
 // A queued quick spell turns this attack into one cast (docs/COMBAT.md, Quick slots). It is
 // refused at attach time when unaffordable; afterwards the selected attack resumes.
 function commitSpell(c){
  const id=pending.spell,spell=SPELLS[id];pending=null;notify();
  const cast={...playerAttackProfile(character,{...spell,spell:id,item:null},api.strategy?.()||'technical'),rightHand:c.profile.rightHand,leftHand:c.profile.leftHand};
  if(cast.manaCost&&!(api.mana?.value>=cast.manaCost)){api.toast?.(`Not enough Mana for ${spell.name} (${cast.manaCost} needed). It was cancelled.`);return;}
  c.profile=cast;
 }
 // Quick spell: one cast in the shared pending slot. Pressing again before it attaches withdraws it;
 // it replaces any other pending request.
 function queueSpell(id){
  if(!SPELLS[id]||!api.knowsSpell?.(id))return 'Not learned';
  if(pending?.spell===id){pending=null;notify();return true;}
  pending={spell:id,auto:false};notify();return true;
 }
 // auto: requested by Auto assistance. A player's press on an Auto request adopts it as manual;
 // pressing again on a manual request (before it attaches) withdraws it.
 function queue(id,{auto=false}={}){
  if(!ABILITIES[id]||!api.knowsAbility?.(id))return 'Not learned';
  if(pending?.ability===id){if(auto)return true;if(pending.auto){pending.auto=false;notify();return true;}pending=null;notify();return true;}
  if(auto&&pending)return 'Busy';
  pending={ability:id,auto};notify();return true;
 }
 // An accepted consumable cancels the unreleased windup (no cost, no XP) and clears the pending slot.
 function consumableUsed(){
  pending=null;if(fight){fight.playerClock=0;fight.struck=false;commit(fight);}notify();
 }
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
  a.patrolRoute=[];a.patrolClock=wanderDelay(random);a.hitAge=a.attackAge=a.enemyClock=0;a.sinceStrike=Infinity;a.hp=a.rules.health;a.opened=false;a.aggro=false;(a.control||=createControlState()).reset();
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
 function clear(){pending=null;sinceRelease=Infinity;const affected=new Set(shots.map(s=>s.enemy));if(fight)affected.add(fight.enemy);if(chase)affected.add(chase.enemy);for(const a of enemies)if(a.returning||a.aggro)affected.add(a);shots.length=0;followUps.length=0;fight=chase=null;defense=null;for(const a of affected)resetEnemy(a);if(defeated)api.fade?.(0);defeated=0;api.clearFeedback?.();api.clearProjectiles?.();}
 function disengage(){if(!fight)return;const a=fight.enemy;fight=null;if(a.rules.inert){resetEnemy(a);return;}if(a.aggro)chase={enemy:a,age:0};}
 function start(a){
  if(fight?.enemy===a||!enemies.has(a)||!current(a)||a.opened||a.returning||defeated||api.health.value<=0||api.blocked()||!api.inReach(a))return false;
  // Pacifist (assistance) forbids both manual attacks and retaliation.
  if(api.canAttack&&!api.canAttack(a))return false;
  const next=profile();if(next.ammo&&!(api.inventory?.[next.ammo]>0)){api.toast?.('You need Training Arrows.');return false;}
  const reengaging=chase?.enemy===a;if(chase&&!reengaging)clearChase();if(reengaging)chase=null;
  api.stop();fight={enemy:a,age:0,playerClock:0,profile:next};commit(fight);a.patrolRoute=[];
  // Selection and windup never provoke a passive enemy; strike resolves that.
  api.face(a.x,a.z);return true;
 }
 function lose(){pending=null;if(api.defeatStop)api.defeatStop();else api.stop();clearChase();api.health.value=0;defense=null;defeated=.001;}
 function engage(a){
  if(a.rules.inert||a.aggro||a.opened||a.returning)return;
  a.aggro=true;a.patrolRoute=[];if(!fight&&!chase)chase={enemy:a,age:0};api.interrupt?.();
 }
 function hitPlayer(a){
  api.attacked?.(a);api.interrupt?.();
  const before=api.health.value,rules=a.rules,current=profile(),shield=api.equipment.shield||null,armor=api.equipment.armorPieces||[];
  // Defender stats are evaluated at hit time: miss → dodge → block → damage → mitigation.
  const d=playerDefense(character,{activeStyle:current.combatStyle,strategy:current.strategy,incomingStyle:rules.style||'melee',shield,armor,bonusResistancePct:api.resistanceBonus?.()||0});
  const r=resolveAttack({missPercent:rules.missPercent||0,dodgePercent:d.dodgePercent,blockPercent:d.blockPercent,canCritical:!!rules.canCritical,criticalPercent:rules.criticalPercent||0,min:rules.min,max:rules.max,random,
   mitigate:raw=>resolvePortions([{amount:raw,resistancePct:d.resistancePct}])});
  if(r.outcome==='hit'){api.health.value=Math.max(rules.protected&&before>=1?1:0,before-r.damage);defense={age:0,profile:current};}
  else if(r.outcome==='block')defense={age:0,profile:current};
  // Shield XP: connected hits use pre-mitigation damage; a block rolls hypothetical noncritical damage for XP only.
  // Armor XP only for connected hits (pre-mitigation damage); blocks never reach armor. One conversion per incoming action.
  const defensive=[];
  if(shield&&(r.outcome==='hit'||r.outcome==='block'))defensive.push({track:'prof.shield',amount:actionXp(r.outcome==='hit'?r.raw:rollDamage(rules.min,rules.max,random))});
  if(r.outcome==='hit')defensive.push(...armorAwards(armor,actionXp(r.raw)));
  if(defensive.length)reward(character.award(defensive,xpModifiers(rules)),a);
  api.hit(api.player.position,r.outcome==='hit'?displayedLoss(before,api.health.value):null,r.outcome);api.sound('blocked');
  if(api.health.value<=0){lose();return;}
  // Assistance decides retaliation when present (Pacifist, Adaptive danger); otherwise the Auto-Retaliate preference.
  const retaliate=api.shouldRetaliate?api.shouldRetaliate(a):autoRetaliate;
  if(retaliate&&!fight){if(api.inReach(a))start(a);else api.retaliate?.(a);}
 }
 function win(a,weapon){
  if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;a.aggro=false;a.opened=true;if(a.occupying){a.tile.blocked=false;a.occupying=false;}
  const at=api.tile(),escape=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>api.world.get(key(a.x+dx,a.z+dz))).filter(t=>t&&!t.water&&!t.blocked&&!reserved(t)&&Math.abs(t.h-a.tile.h)<=.5).sort((x,y)=>Math.hypot(y.x-at.x,y.z-at.z)-Math.hypot(x.x-at.x,x.z-at.z))[0];
  fleeing.set(a,{age:0,destination:!a.rules.inert&&escape&&position(escape)});api.won?.(a,weapon);if(a.respawn!=null)returningAfterWin.set(a,a.respawn+1.2);api.complete?.();
 }
 function strike(a,weapon){
  if(!current(a)||a.opened||a.returning)return;
  engage(a); // A resolved attempt provokes even on a miss or zero damage.
  const rules=a.rules,resistancePct=rules.resistancePct?.[weapon.combatStyle]||0;
  const r=resolveAttack({dodgePercent:rules.canDodge?rules.dodgePercent||0:0,canCritical:true,criticalPercent:weapon.critPercent,min:weapon.min,max:weapon.max,random,
   mitigate:raw=>resolvePortions([{amount:raw*(weapon.damageScale??1),resistancePct}])});
  const before=a.hp;a.hp=Math.max(0,a.hp-r.damage);const removed=before-a.hp,xp=actionXp(removed);
  if(r.outcome==='hit'){a.hitAge=.25;api.hit(a.group.position,removed,r.critical?'critical':'hit');api.sound('chop');api.struck?.(a,weapon);}
  else api.hit(a.group.position,null,r.outcome);
  // Strategy skill and weapon/elemental proficiency each receive the full base award, capped per track.
  const awards=[{track:weapon.xpTrack,amount:xp}];
  if(weapon.proficiencyTrack)awards.push({track:weapon.proficiencyTrack,amount:xp});
  if(weapon.dualWieldTrack)awards.push({track:weapon.dualWieldTrack,amount:xp});
  for(const [element,share] of Object.entries(weapon.elements||{}))awards.push({track:`prof.${element}`,amount:xp*share});
  reward(character.award(awards,xpModifiers(rules)),a);
  if(!a.hp)win(a,weapon);
 }
 // Backfire (under-level spells only): resolved at release after paying costs. It replaces the spell,
 // hits only the caster (no dodge, block or crit; resistances apply), can defeat, never aggroes the target,
 // and grants only base XP to the cast's pools under the intended target's rules. No defensive XP.
 function backfire(a,weapon){
  const before=api.health.value,current=profile();
  const d=playerDefense(character,{activeStyle:current.combatStyle,strategy:current.strategy,incomingStyle:'magic',shield:api.equipment.shield||null,armor:api.equipment.armorPieces||[],bonusResistancePct:api.resistanceBonus?.()||0});
  const base=backfireBaseDamage(weapon.max),portions=Object.entries(weapon.elements||{none:1}).map(([,share])=>({amount:base*share,resistancePct:d.resistancePct}));
  const damage=resolvePortions(portions);api.health.value=Math.max(0,before-damage);
  api.hit(api.player.position,displayedLoss(before,api.health.value),'backfire');api.sound('blocked');api.toast?.(`${weapon.name} backfired!`);
  const awards=[{track:weapon.xpTrack,amount:actionXp(0)}];for(const [element,share] of Object.entries(weapon.elements||{}))awards.push({track:`prof.${element}`,amount:actionXp(0)*share});
  reward(character.award(awards,xpModifiers(a.rules)),a);
  if(api.health.value<=0)lose();
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
   sinceRelease+=dt;
  sinceActivity=fight||chase||[...enemies].some(a=>current(a)&&a.aggro&&!a.opened)?0:sinceActivity+dt;
  inCombatState.value=sinceActivity<5;
  if(defense){defense.age+=dt;if(defense.age>=BLOCK_DURATION)defense=null;}
  for(let i=shots.length-1;i>=0;i--){const shot=shots[i];shot.left-=dt;if(shot.left<=0){shots.splice(i,1);strike(shot.enemy,shot.profile);}}
  // Off-hand follow-ups are committed once the main hand releases: moving away doesn't lose them, but a
  // stun or other effect preventing attacks cancels them (as it does an unreleased windup).
  if(followUps.length&&(defeated||api.control&&!api.control.can('attack')))followUps.length=0;
  for(let i=followUps.length-1;i>=0;i--){const f=followUps[i];f.left-=dt;if(f.left<=0){followUps.splice(i,1);strike(f.enemy,f.profile);}}
  if(fight&&(!current(fight.enemy)||api.blocked())){const a=fight.enemy;fight=null;resetEnemy(a);}
  if(chase&&!current(chase.enemy)){const a=chase.enemy;chase=null;resetEnemy(a);}
  if(fight&&!api.inReach(fight.enemy))disengage();
  for(const a of enemies){
   const visible=current(a);if(visible&&returningAfterWin.has(a)){const remaining=returningAfterWin.get(a)-dt;returningAfterWin.set(a,remaining);if(remaining<=0)resetEnemy(a);}
   // Health plates (target frames) over the engaged enemy and any enemy attacking the player.
   // The plate writes the DOM only when its state changes.
   const labelled=!!(a.plate&&visible&&camera&&!a.opened&&(fight?.enemy===a||a.aggro));if(a.plate)a.plate.visible.value=labelled;
   if(!visible){a.group.visible=false;continue;}
   if(a.waitingRespawn){resetEnemy(a);if(a.waitingRespawn)continue;}
   a.group.visible=!a.opened||fleeing.has(a);a.highlight?.update(!!a.guided&&!a.opened,time,api.hover?.()===a&&!a.opened);
   if(a.opened)continue;a.hitAge=Math.max(0,a.hitAge-dt);a.attackAge=Math.max(0,a.attackAge-dt);a.control.update(dt);const canMove=a.control.can('move');
   // Players whose attacks are prevented (Pacifist) draw no aggression, except from creatures configured
   // to attack pacifists. Aggression that already started is kept until it ends normally (leash, safety, defeat).
   if(!a.aggro&&!a.returning&&!a.rules.inert&&(a.aggressive??a.rules.aggressive)&&(!api.passive?.()||(a.attacksPacifists??a.rules.attacksPacifists))&&!defeated&&!api.blocked()&&!api.safe?.(api.tile())&&settled(a)){
    const p=api.tile();if(withinAttackRange(api.world,a.tile,{x:p.x,z:p.z,tile:p},a.aggroRange??a.rules.aggroRange??3)&&findPath(api.world,a.tile,p))engage(a);
   }
   // Stun and immobilize hold the enemy in place; slows scale its walking below.
   if(canMove){if(a.returning)walkHome(a);else if(a.aggro)pursue(a);}
   const targeted=fight?.enemy===a||chase?.enemy===a;
   if(a.rules.inert||targeted||a.aggro||a.returning||api.blocked()||defeated||api.approaching?.()===a||!canMove)a.patrolRoute=[];
   else if(settled(a)){if(!a.patrolRoute.length){a.patrolClock-=dt;if(a.patrolClock<=0){a.patrolClock=wanderDelay(random);if(shouldWander(random))a.patrolRoute=wanderRoute(api.world,a.tile,a.patrol,reserved,random);}}
    const next=a.patrolRoute[0];if(next){if(next.blocked||next.water||reserved(next))a.patrolRoute=[];else{a.patrolRoute.shift();move(a,next);}}
   }
   const destination=position(a.tile),distance=a.group.position.distanceTo(destination),moving=distance>.001;
   if(moving)a.group.rotation.y=Math.atan2(destination.x-a.group.position.x,destination.z-a.group.position.z);
   else if(a.aggro)a.group.rotation.y=Math.atan2(api.player.position.x-a.group.position.x,api.player.position.z-a.group.position.z);
   // Every path mode reserves one destination and physically finishes it before taking another.
   if(distance)a.group.position.lerp(destination,Math.min(1,dt*(a.aggro||a.returning?2:1.6)*(1-a.control.slowFraction)/distance));
   a.sinceStrike=(a.sinceStrike??Infinity)+dt;
   if(a.aggro&&adjacent(a)&&!defeated&&a.control.can('attack')){
    // Opening attack: a ready enemy swings after OPENING_WINDUP rather than a full interval.
    if(opening&&a.enemyClock===0&&a.sinceStrike>=a.rules.interval)a.enemyClock=Math.max(0,a.rules.interval-opening);
    a.enemyClock+=dt;if(a.enemyClock>=a.rules.interval){a.enemyClock-=a.rules.interval;a.sinceStrike=0;a.attackAge=.28;hitPlayer(a);}}
   else a.enemyClock=0;
   animate(a,time+a.patrolPhase,{walk:moving?1:0,attack:a.aggro&&(a.enemyClock>=.28||a.attackAge>0)?attackPose(a.enemyClock,a.rules.interval):0,hit:Math.sin(Math.PI*a.hitAge/.25)});
   if(labelled){projected.copy(a.group.position).add(LABEL_LIFT).project(camera);const view=gameViewport();a.plate.place(view.left+(projected.x+1)*view.width/2,view.top+(1-projected.y)*view.height/2);a.plate.effects.value=a.control.kinds.join(',');a.plate.danger.value=api.danger?.(a)||null;}
  }
  for(const [a,f] of fleeing)if(current(a)){f.age+=dt;animate(a,time,{walk:1});if(f.destination){a.group.rotation.y=Math.atan2(f.destination.x-a.group.position.x,f.destination.z-a.group.position.z);a.group.position.lerp(f.destination,1-Math.exp(-dt*3));}a.group.scale.setScalar(a.scale*Math.max(.01,1-Math.max(0,(f.age-.8)/.4)));if(f.age>=1.2){a.group.visible=false;fleeing.delete(a);}}
  if(defeated){defeated+=dt;api.fade?.(Math.max(0,Math.min(1,(defeated-FAINT_FADE_START)/(FAINT_RESPAWN_TIME-FAINT_FADE_START))));if(defeated>=FAINT_RESPAWN_TIME&&api.respawn()){defeated=0;api.health.restore();api.fade?.(0);api.respawned?.();return null;}return {kind:'Defeated',time:Math.min(defeated,FAINT_RESPAWN_TIME)};}
  // Eating no longer pauses attacks: an accepted consumable restarts the windup via consumableUsed().
  if(fight){const c=fight,a=c.enemy;api.face(a.x,a.z);const weapon=c.profile;
   // Unaffordable attacks pause with their target retained; any windup progress is lost.
   // Stun (or any effect preventing this action) cancels the unreleased windup and clears the pending action;
   // the target is kept and a fresh full windup starts when it ends.
   const prevented=api.control&&!api.control.can(weapon.spell?'cast':'attack');
   if(prevented){pending=null;c.playerClock=0;c.struck=false;if(c.ability)commit(c);}
   const short=!prevented&&weapon.manaCost&&!(api.mana?.value>=weapon.manaCost);
   if(short){c.playerClock=0;if(!c.waiting){c.waiting=true;api.toast?.(`Not enough Mana for ${weapon.name} (${weapon.manaCost} needed).`);}}
   else if(!prevented){c.waiting=false;c.playerClock+=dt;}
   if(!prevented&&!short&&c.playerClock>=weapon.interval){
    if(weapon.ammo&&!(api.inventory?.[weapon.ammo]>0)){disengage();api.toast?.('Out of arrows. Visit a supply offer to refill.');}
    else if(weapon.energyCost&&!(api.energy?.value>=weapon.energyCost)){
     // Recheck at release: an unaffordable ability cancels this windup and the ability use (no cost, no XP).
     api.toast?.(`Not enough Energy for ${weapon.abilityName}. It was cancelled.`);c.playerClock=0;c.struck=false;commit(c);
    }
    else{c.playerClock-=weapon.interval;sinceRelease=0;if(weapon.ammo){api.inventory[weapon.ammo]--;api.items?.({[weapon.ammo]:-1});}
     if(weapon.manaCost)api.mana.value-=weapon.manaCost;
     if(weapon.energyCost)api.energy.value-=weapon.energyCost;
     if(weapon.backfirePercent>0&&random()*100<weapon.backfirePercent)backfire(a,weapon);
     else if(['ranged','magic'].includes(weapon.style)){api.projectile?.(api.player.position.clone().add(new Vector3(0,.55,0)),a.group.position.clone().add(new Vector3(0,.55,0)),weapon.style,weapon);shots.push({enemy:a,profile:weapon,left:PROJECTILE_FLIGHT});}else strike(a,weapon);
     if(weapon.followUp)followUps.push({enemy:a,profile:weapon.followUp,left:FOLLOW_UP_DELAY});
     // The follow-through belongs to the attack that just released, even though the next one is committed.
     c.released=weapon;c.struck=true;if(fight===c)commit(c);
    }
   }
   // Animation time follows the committed attack clock, including recovery after each release.
   const shown=c.struck&&c.released&&c.playerClock<RECOVERY+(c.released.followUp?FOLLOW_UP_DELAY:0)?c.released:c.profile;
   c.age=(c.struck?shown.interval:0)+c.playerClock;
   if(fight){api.interacting?.();if(!defense||attackWindow(shown,c.age))return {kind:shown.style==='ranged'?'Archery':shown.style==='magic'?'Casting':'Combat',time:c.age,profile:shown};}
  }
  return defense?{kind:'Block',time:defense.age,profile:defense.profile}:null;
 }
 return {start,update,cancel,clear,disengage,lose,preview:profile,queue,queueSpell,consumableUsed,
  get queuedSpell(){return pending?.spell||null;},
  get pending(){return pending?.ability||null;},get pendingManual(){return pending&&!pending.auto?pending.ability:null;},get fighting(){return !!fight;},get committedAbility(){return fight?.ability?.name||null;},
  // Regeneration uses the slower rate during combat activity and for 5 seconds afterwards.
  get inCombat(){return sinceActivity<5;},
   // Reactive: in combat or within 5 seconds of it (written each frame; notifies only on edges).
   inCombatState,revision,
  get autoRetaliate(){return autoRetaliate;},setAutoRetaliate(value){autoRetaliate=!!value;},
  add(a){enemies.add(a);a.patrolPhase=random()*10;resetEnemy(a);return a;},
  remove(a){if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;fleeing.delete(a);returningAfterWin.delete(a);for(let i=shots.length-1;i>=0;i--)if(shots[i].enemy===a)shots.splice(i,1);enemies.delete(a);if(a.occupying)a.tile.blocked=false;a.dispose?.();},
  resetWhere(predicate=()=>true){if(fight&&predicate(fight.enemy))fight=null;if(chase&&predicate(chase.enemy))chase=null;defense=null;for(const a of enemies)if(predicate(a))resetEnemy(a);},
  reset(){clear();for(const a of enemies)resetEnemy(a);},
  matches:a=>fight?.enemy===a,get working(){return !!fight||!!chase||[...enemies].some(a=>current(a)&&a.aggro&&!a.opened);},get busy(){return defeated>0;},
  nearestEnemy(){const p=api.tile();return [...enemies].filter(a=>current(a)&&!a.opened).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;},
  // The enemy currently fighting or pursuing the player (single-enemy assistance scope).
  get engagedEnemy(){return fight?.enemy||chase?.enemy||[...enemies].find(a=>current(a)&&a.aggro&&!a.opened&&!a.returning)||null;},
  // Pacifist switch: cancel the unreleased windup and pending action; released projectiles still land.
  stopAttacking(){pending=null;disengage();notify();},
  get state(){return {followUps:followUps.length,pending:pending?.ability||null,queuedSpell:pending?.spell||null,committedAbility:fight?.ability?.name||null,autoRetaliate,fight:fight?.enemy.kind||null,chase:chase?.enemy.kind||null,defeated:!!defeated,blocking:!!defense,enemies:[...enemies].filter(current).map(a=>({kind:a.kind,x:a.x,z:a.z,hp:a.hp,opened:a.opened,aggressive:!!(a.aggressive??a.rules.aggressive),aggroRange:a.aggroRange??a.rules.aggroRange??3,aggro:!!a.aggro,returning:!!a.returning,moving:!settled(a),position:a.group.position.toArray()}))};}
 };
}
