import {gameViewport} from './game-viewport.js';
import {Vector3} from 'three';
import {findPath,key} from './world.js';
import {withinAttackRange,lineOfSight} from './combat-range.js';
import {sizeOf,footprint,footprintGap,canStand,findFootprintPath,bodyCenter,nearestCell} from './footprint.js';
import {resolveAttack,resolvePortions,rollDamage,actionXp,backfireBaseDamage,displayedLoss,xpModifiers} from './combat-formulas.js';
import {playerAttackProfile,playerDefense,strongStrikeProfile,armorAwards,offHandFollowUp,pairStrikes,FOLLOW_UP_DELAY} from './combat-profile.js';
import {ABILITIES,SPELLS} from './combat-styles.js';
import {spellAttack} from './equipment.js';
import {signal} from './reactive.js';
import {createControlState} from './control-effects.js';
import {wanderDelay,shouldWander,wanderRoute} from './wander.js';
import {blocksMovement,occupancy,OCCUPIED_COST,PLAYER_COST} from './world-occupancy.js';
import {attackPose,CAST_TIMING} from './combat-motion.js';
import {attackWindow,BLOCK_DURATION,PROJECTILE_FLIGHT} from './combat-animation.js';
// Follow-through window after a release (matches the attack animation's recovery).
const RECOVERY=.28;
import {animateTarget} from './training-models.js';
import {animateGoblin} from './enemy-model.js';
import {FAINT_FADE_START,FAINT_RESPAWN_TIME} from './faint-motion.js';

// Opening attack (docs/COMBAT.md): a ready attacker (no strike within its attack interval) starts its
// attack at once and waits only for its windup, not the full interval. Each attack's windup comes from
// its weapon or spell (`windup`); otherwise from its style: melee is short (OPENING_WINDUP, also used by
// aggressive enemies), ranged moderate (RANGED_WINDUP: the bow's raise, nock and draw), and magic is the
// whole cast. Later attacks take their full interval (windup plus cooldown).
export const OPENING_WINDUP=.5;
export const RANGED_WINDUP=1.15;
export function attackWindup(profile,melee=OPENING_WINDUP){
 const interval=profile.interval||1.5,style=profile.combatStyle||profile.style;
 const windup=profile.windup??(style==='melee'||style==='unarmed'?melee:style==='ranged'?RANGED_WINDUP:interval);
 return Math.min(interval,windup);
}

// Shared targeting, aggression, walking and recovery; maps provide encounter configuration.
export function createCombatSystem(api){
 const enemies=new Set(),fleeing=new Map(),projected=new Vector3(),returningAfterWin=new Map(),shots=[],followUps=[];
 // The playing spell-gathering sound ({fight, sound}), stopped when its cast ends for any reason.
 let gather=null;
 const stopGather=()=>{gather?.sound?.stop();gather=null;};
 const enemyShots=[];let lastInterval=0;
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
 // An attack lands no earlier than its own windup, nor before the last released attack's interval has
 // passed (docs/COMBAT.md, Opening attack and Equipment changes): a slower weapon after a quicker one
 // strikes on the quicker one's timer. A negative clock waits out a longer previous timer.
 function openingWindup(c){if(opening)schedule(c,opening);}
 function schedule(c,melee){
  const timer=Math.max(0,lastInterval-sinceRelease),target=c.profile.interval-Math.max(timer,attackWindup(c.profile,melee));
  c.playerClock=target>0?Math.max(c.playerClock,target):c.playerClock+target;
 }
 // Changing what a hand holds interrupts the attack that has not landed: its windup and any ability it
 // carried are lost, unstruck off-hand follow-ups are cancelled (projectiles in flight still land), and
 // the new setup winds up in full from now, still respecting the last released attack's timer.
 function handsChanged(){
  followUps.length=0;
  if(!fight)return;
  const c=fight;stopGather();c.playerClock=0;c.struck=false;c.ability=null;c.waiting=false;
  commitAttack(c);schedule(c,opening??OPENING_WINDUP);notify();
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
  c.profile=c.profile.followUp?pairStrikes(strong,c.profile.followUp):strong;c.ability=ability;notify();api.sound?.('strongCharge');
 }
 // A queued quick spell turns this attack into one cast (docs/COMBAT.md, Quick slots). It is
 // refused at attach time when unaffordable; afterwards the selected attack resumes.
 function commitSpell(c){
  const id=pending.spell,spell=SPELLS[id];pending=null;notify();
  const cast={...playerAttackProfile(character,spellAttack(id,spell,api.equipment.slots||{}),api.strategy?.()||'technical'),rightHand:c.profile.rightHand,leftHand:c.profile.leftHand};
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
 const animate=(a,time,options)=>a.rules.inert?animateTarget(a.group,time,options.hit):(a.animate||animateGoblin)(a.group,time,options);
 // A territory (boss arena) bounds both the enemy's steps and how far it pursues.
 const inTerritory=(a,t)=>!a.territory||!!t&&t.x>=a.territory.minX&&t.x<=a.territory.maxX&&t.z>=a.territory.minZ&&t.z<=a.territory.maxZ;
 const current=a=>api.world.get(key(a.home.x,a.home.z))===a.home;
 const position=t=>new Vector3(t.x-6,t.h,t.z-6);
 // Multi-tile enemies (size > 1, footprint.js): `tile` is the anchor corner, the body covers size×size
 // tiles and the model stands at the body's centre. Size 1 keeps the one-tile rules.
 const cellsOf=(a,t=a.tile)=>footprint(api.world,t,sizeOf(a))||[t];
 const bodyPosition=(a,t=a.tile)=>{const v=position(t),offset=(sizeOf(a)-1)/2;v.x+=offset;v.z+=offset;return v;};
 const bodyInTerritory=(a,t)=>cellsOf(a,t).every(c=>inTerritory(a,c));
 // Creatures are walk-through characters (world-occupancy.js): they never write `tile.blocked`, and only
 // avoid *stopping* where someone else stands. Solid practice targets still block their cells.
 function release(a){if(a.occupying){if(blocksMovement(a))for(const c of a.cells||[a.tile])c.blocked=false;else occupancy.remove(a);a.occupying=false;}}
 const reserved=t=>t===api.tile()||api.reserved(t);
 const enemyAt=(t,self)=>{for(const b of enemies)if(b!==self&&b.occupying&&(b.cells||[b.tile]).includes(t))return true;return false;};
 // Somewhere `self` should not stop: the player, the player's route, the companion or another enemy.
 const taken=(t,self)=>reserved(t)||enemyAt(t,self);
 const bodyTaken=(a,t)=>cellsOf(a,t).some(c=>taken(c,a));
 // Occupied tiles cost extra (world-occupancy.js): the player's tile PLAYER_COST, the player's route,
 // the companion, NPCs and other enemies OCCUPIED_COST.
 const cellCost=(c,a)=>c===api.tile()?PLAYER_COST:Math.max(occupancy.cost(c,a),api.reserved(c)||enemyAt(c,a)?OCCUPIED_COST:0);
 // The cheapest route for any body size: around people unless the detour is long, ending on a free spot
 // when one is near (never through the player being fought or onto solid tiles: `allow`). [] at the
 // goal, null if none.
 function bodyRoute(a,goal,allow=()=>true){
  return findFootprintPath(api.world,a.tile,sizeOf(a),goal,{own:a.cells||[a.tile],allow,cost:cells=>cells.reduce((sum,c)=>sum+cellCost(c,a),0)});
 }
 const inPatrol=(a,t)=>cellsOf(a,t).every(c=>c.x>=a.patrol.minX&&c.x<=a.patrol.maxX&&c.z>=a.patrol.minZ&&c.z<=a.patrol.maxZ);
 const patrolGap=(a,t)=>Math.max(0,a.patrol.minX-t.x,t.x-a.patrol.maxX)+Math.max(0,a.patrol.minZ-t.z,t.z-a.patrol.maxZ);
 // A player stopping on a calm enemy pushes it to a free neighbouring spot (hostile ones shuffle aside
 // while pursuing and keep attacking).
 function pushAside(a){
  const size=sizeOf(a),options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>api.world.get(key(a.tile.x+dx,a.tile.z+dz))).filter(t=>t&&Math.abs(t.h-a.tile.h)<=.5&&canStand(api.world,t,size,a.cells)&&!bodyTaken(a,t)&&bodyInTerritory(a,t));
  const spot=options.find(t=>inPatrol(a,t))||options[0];if(spot){a.patrolRoute=[];move(a,spot);}
 }
 // Wanderers keep to their home area: pushed outside it they walk back; pushed far beyond it (or with
 // no way back) they reappear at home.
 const HOME_FAR=8;
 function homeward(a){
  const route=patrolGap(a,a.tile)<=HOME_FAR?bodyRoute(a,t=>inPatrol(a,t)):null;
  if(route?.[0]){move(a,route[0]);return;}
  if(!bodyTaken(a,a.home)){a.patrolRoute=[];move(a,a.home);a.group.position.copy(bodyPosition(a,a.home));}
 }
 const settled=a=>a.group.position.distanceTo(bodyPosition(a))<.001;
 const adjacent=a=>settled(a)&&footprintGap(a.tile,sizeOf(a),api.tile())===1&&Math.abs(a.tile.h-api.tile().h)<=.5;
 function move(a,t){release(a);a.cells=cellsOf(a,t);a.tile=t;a.x=t.x;a.z=t.z;if(blocksMovement(a))for(const c of a.cells)c.blocked=true;else occupancy.place(a,a.cells);a.occupying=true;a.group.traverse(m=>{if(m.userData.actor===a)m.userData.tile=t;});}
 function resetEnemy(a){
  for(let i=shots.length-1;i>=0;i--)if(shots[i].enemy===a)shots.splice(i,1);
  for(let i=enemyShots.length-1;i>=0;i--)if(enemyShots[i].enemy===a)enemyShots.splice(i,1);
  cancelWindup(a);a.awayFor=0;a.thrownAge=null;
  returningAfterWin.delete(a);fleeing.delete(a);release(a);
  a.patrolRoute=[];a.patrolClock=wanderDelay(random);a.hitAge=a.attackAge=a.enemyClock=0;a.sinceStrike=Infinity;a.hp=a.rules.health;a.opened=false;a.aggro=false;(a.control||=createControlState()).reset();
  a.group.scale.setScalar(a.scale);a.group.rotation.set(0,0,0);
  a.waitingRespawn=cellsOf(a,a.home).some(c=>c.blocked||taken(c,a));a.returning=a.waitingRespawn;a.group.visible=current(a)&&!a.waitingRespawn;
  if(!a.waitingRespawn){move(a,a.home);a.group.position.copy(bodyPosition(a,a.home));}
 }
 function returnHome(a){
  if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;
  a.aggro=false;a.returning=true;a.enemyClock=a.attackAge=0;a.patrolRoute=[];cancelWindup(a);a.awayFor=0;
  if(settled(a)&&a.tile===a.home&&!bodyTaken(a,a.home)){a.returning=false;a.hp=a.rules.health;}
 }
 function cancel(){if(fight){const a=fight.enemy;fight=null;if(a.rules.inert)resetEnemy(a);else if(a.aggro)returnHome(a);}api.complete?.();}
 function clearChase(){if(chase)returnHome(chase.enemy);}
 function clear(){pending=null;sinceRelease=Infinity;lastInterval=0;const affected=new Set(shots.map(s=>s.enemy));if(fight)affected.add(fight.enemy);if(chase)affected.add(chase.enemy);for(const a of enemies)if(a.returning||a.aggro)affected.add(a);shots.length=0;followUps.length=0;for(const s of enemyShots)api.telegraph?.(s.enemy,null);enemyShots.length=0;fight=chase=null;defense=null;for(const a of affected)resetEnemy(a);if(defeated)api.fade?.(0);defeated=0;api.clearFeedback?.();api.clearProjectiles?.();}
 function disengage(){if(!fight)return;const a=fight.enemy;fight=null;if(a.rules.inert){resetEnemy(a);return;}if(a.aggro)chase={enemy:a,age:0};}
 function start(a){
  if(fight?.enemy===a||!enemies.has(a)||!current(a)||a.opened||a.returning||defeated||api.health.value<=0||api.blocked()||!api.inReach(a))return false;
  // Pacifist (assistance) forbids both manual attacks and retaliation.
  if(api.canAttack&&!api.canAttack(a))return false;
  const next=profile();if(next.ammo&&!(api.inventory?.[next.ammo]>0)){api.toast?.('You need Training Arrows.');return false;}
  const reengaging=chase?.enemy===a;if(chase&&!reengaging)clearChase();if(reengaging)chase=null;
  api.stop();fight={enemy:a,age:0,playerClock:0,profile:next};commit(fight);a.patrolRoute=[];
  // Selection and windup never provoke a passive enemy; strike resolves that.
  const centre=bodyCenter(a);api.face(centre.x,centre.z);return true;
 }
 function lose(){pending=null;if(api.defeatStop)api.defeatStop();else api.stop();clearChase();api.health.value=0;defense=null;defeated=.001;}
 function engage(a){
  if(a.rules.inert||a.aggro||a.opened||a.returning)return;
  a.aggro=true;a.patrolRoute=[];if(opening===null&&a.sinceStrike===Infinity)a.sinceStrike=0;if(!fight&&!chase)chase={enemy:a,age:0};api.interrupt?.();
 }
 function hitPlayer(a,rules=a.rules){
  api.attacked?.(a);api.interrupt?.();
  const before=api.health.value,current=profile(),shield=api.equipment.shield||null,armor=api.equipment.armorPieces||[];
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
  if(defensive.length)reward(character.award(defensive,xpModifiers(a.rules)),a);
  api.hit(api.player.position,r.outcome==='hit'?displayedLoss(before,api.health.value):null,r.outcome);api.sound(r.outcome==='hit'?'hurt':'whiff');
  if(api.health.value<=0){lose();return;}
  // Assistance decides retaliation when present (Pacifist, Adaptive danger); otherwise the Auto-Retaliate preference.
  const retaliate=api.shouldRetaliate?api.shouldRetaliate(a):autoRetaliate;
  if(retaliate&&!fight){if(api.inReach(a))start(a);else api.retaliate?.(a);}
 }
 // Enemy attack commitment (docs/COMBAT.md). Each enemy attack (its own, or its optional ranged punish)
 // has an interval ending in a windup. The cooldown runs whether or not the player is in reach; the
 // windup starts once the player is in reach (or, for the ranged punish, has stayed out of reach long
 // enough). Leaving reach in the first half cancels it, without a new cooldown. At the halfway commit
 // point it will land: a character-targeted attack hits the player wherever they are; a tile-targeted
 // one locks the (2r+1)² tiles around the player and hits whoever stands on them at impact.
 const attackOf=(a,kind)=>kind==='ranged'?{...a.rules,...a.rules.rangedAttack}:a.rules;
 const windupOf=x=>x.telegraphed?x.interval:attackWindup({interval:x.interval,combatStyle:x.style||'melee',windup:x.windup});
 const inReachOf=a=>{const p=api.tile();return footprintGap(a.tile,sizeOf(a),p)<=1&&Math.abs(a.tile.h-p.h)<=.5;};
 function canThrow(a){
  const p=api.tile(),r=a.rules.rangedAttack,size=sizeOf(a),from=size>1?nearestCell(a.tile,size,p):a.tile;
  return !!r&&inTerritory(a,p)&&footprintGap(a.tile,size,p)<=r.range&&lineOfSight(api.world,from,p)&&!api.safe?.(p);
 }
 // Solid tiles (walls, rock) are left out: nobody can stand there, so they are never marked.
 function lockTiles(area){const p=api.tile(),tiles=[];for(let dz=-area;dz<=area;dz++)for(let dx=-area;dx<=area;dx++){const t=api.world.get(key(p.x+dx,p.z+dz));if(t&&(!t.blocked||t===p))tiles.push(t);}return tiles;}
 function cancelWindup(a){if(a.windup){a.windup=null;api.telegraph?.(a,null);}}
 function impact(a,attack,tiles){
  api.telegraph?.(a,null);
  if(defeated||!current(a)||a.opened)return;
  if(!tiles||tiles.includes(api.tile()))hitPlayer(a,attack);
  else{api.hit(api.player.position,null,'dodge');api.sound('whiff');}
 }
 function enemyAttackUpdate(a,dt,settledNow){
  const reach=inReachOf(a);a.awayFor=reach?0:(a.awayFor||0)+dt;
  if(!a.windup){
   const kind=reach?'melee':a.rules.rangedAttack&&a.awayFor>=a.rules.rangedAttack.after&&canThrow(a)?'ranged':null;
   if(!kind||!settledNow)return;
   const attack=attackOf(a,kind),windup=windupOf(attack);
   // Cooldown: the rest of the interval before this windup, counted from the last strike.
   if(a.sinceStrike<attack.interval-windup)return;
   a.windup={kind,attack,windup,age:0,tiles:null};
  }
  const w=a.windup;w.age+=dt;
  if(!w.committed){
   const valid=w.kind==='melee'?reach:!reach&&canThrow(a);
   if(!valid){cancelWindup(a);return;}
   if(w.age>=w.windup/2){w.committed=true;w.at=api.tile();if(w.attack.target==='tile')w.tiles=lockTiles(w.attack.area??0);}
  }
  if(w.tiles)api.telegraph?.(a,w.tiles,Math.min(1,(w.age-w.windup/2)/(w.windup/2)));
  if(w.age<w.windup)return;
  a.windup=null;a.sinceStrike=0;a.attackAge=.28;
  // After a throw it chases again for the full delay before the next one (never a standing turret).
  if(w.kind==='ranged'){a.thrownAge=0;a.awayFor=0;
   // The rock flies to the locked centre (a character-targeted throw follows the player).
   api.projectile?.(a.group.position.clone().add(new Vector3(0,(a.aimHeight??.55)+.6,0)),position(w.tiles?w.at:api.tile()).add(new Vector3(0,.3,0)),'rock',null,{duration:w.attack.flight,arc:1.2});
   enemyShots.push({enemy:a,attack:w.attack,tiles:w.tiles,left:w.attack.flight});}
  else impact(a,w.attack,w.tiles);
 }
 function win(a,weapon){
  if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;a.aggro=false;a.opened=true;release(a);cancelWindup(a);
  const at=api.tile(),escape=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>api.world.get(key(a.x+dx,a.z+dz))).filter(t=>t&&!t.water&&!t.blocked&&!taken(t,a)&&Math.abs(t.h-a.tile.h)<=.5).sort((x,y)=>Math.hypot(y.x-at.x,y.z-at.z)-Math.hypot(x.x-at.x,x.z-at.z))[0];
  fleeing.set(a,{age:0,destination:!a.rules.inert&&escape&&position(escape)});api.won?.(a,weapon);if(a.respawn!=null)returningAfterWin.set(a,a.respawn+1.2);api.complete?.();
 }
 function strike(a,weapon){
  if(!current(a)||a.opened||a.returning)return;
  engage(a); // A resolved attempt provokes even on a miss or zero damage.
  const rules=a.rules,resistancePct=rules.resistancePct?.[weapon.combatStyle]||0;
  const r=resolveAttack({dodgePercent:rules.canDodge?rules.dodgePercent||0:0,canCritical:true,criticalPercent:weapon.critPercent,min:weapon.min,max:weapon.max,random,
   mitigate:raw=>resolvePortions([{amount:raw*(weapon.damageScale??1),resistancePct}])});
  const before=a.hp;a.hp=Math.max(0,a.hp-r.damage);const removed=before-a.hp,xp=actionXp(removed);
  if(r.outcome==='hit'){a.hitAge=.25;api.hit(a.group.position,removed,r.critical?'critical':'hit');api.sound(weapon.ability==='strongStrike'?'strongHit':r.critical?'crit':weapon.combatStyle==='magic'?'spellHit':'hit');api.struck?.(a,weapon);}
  else{api.hit(a.group.position,null,r.outcome);api.sound('whiff');}
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
  api.hit(api.player.position,displayedLoss(before,api.health.value),'backfire');api.sound('hurt');api.toast?.(`${weapon.name} backfired!`);
  const awards=[{track:weapon.xpTrack,amount:actionXp(0)}];for(const [element,share] of Object.entries(weapon.elements||{}))awards.push({track:`prof.${element}`,amount:actionXp(0)*share});
  reward(character.award(awards,xpModifiers(a.rules)),a);
  if(api.health.value<=0)lose();
 }
 // A large body's wander: one step to a neighbouring spot inside its patrol bounds that it fits.
 function wanderStep(a){
  const size=sizeOf(a),options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>api.world.get(key(a.tile.x+dx,a.tile.z+dz))).filter(t=>t&&t.x>=a.patrol.minX&&t.x<=a.patrol.maxX&&t.z>=a.patrol.minZ&&t.z<=a.patrol.maxZ&&Math.abs(t.h-a.tile.h)<=.5&&canStand(api.world,t,size,a.cells)&&!bodyTaken(a,t)&&bodyInTerritory(a,t));
  return options.length?[options[Math.floor(random()*options.length)]]:[];
 }
 function walkHome(a){
  if(!settled(a))return;
  if(a.tile===a.home){if(bodyTaken(a,a.home))return;a.returning=false;a.hp=a.rules.health;a.patrolClock=wanderDelay(random);return;}
  // Waits one step short while someone stands at home, so it never settles on them.
  const next=bodyRoute(a,t=>t===a.home)?.[0];if(next&&(next!==a.home||!bodyTaken(a,a.home)))move(a,next);
 }
 function pursue(a){
  const p=api.tile();
  if((a.territory?!inTerritory(a,p):Math.abs(p.x-a.home.x)+Math.abs(p.z-a.home.z)>(a.leash??6))||api.safe?.(p)||api.blocked()){returnHome(a);return;}
  if(!settled(a)||adjacent(a))return;
  // Step toward the nearest spot beside the player that the body fits, inside its territory, preferring
  // a free one; it may pass other characters but never the player it is after or a safe tile.
  const size=sizeOf(a),route=bodyRoute(a,t=>footprintGap(t,size,p)===1&&Math.abs(t.h-p.h)<=.5,(t,cells)=>!cells.some(c=>c===p||api.safe?.(c))&&bodyInTerritory(a,t));
  if(!route){returnHome(a);return;}if(route[0])move(a,route[0]);
 }
 function update(dt,time,camera){
   sinceRelease+=dt;
  if(gather&&gather.fight!==fight)stopGather(); // the cast ended: cancelled, defeated, won or interrupted
  sinceActivity=fight||chase||[...enemies].some(a=>current(a)&&a.aggro&&!a.opened)?0:sinceActivity+dt;
  inCombatState.value=sinceActivity<5;
  if(defense){defense.age+=dt;if(defense.age>=BLOCK_DURATION)defense=null;}
  for(let i=shots.length-1;i>=0;i--){const shot=shots[i];shot.left-=dt;if(shot.left<=0){shots.splice(i,1);strike(shot.enemy,shot.profile);}}
  for(let i=enemyShots.length-1;i>=0;i--){const shot=enemyShots[i];shot.left-=dt;if(shot.left<=0){enemyShots.splice(i,1);impact(shot.enemy,shot.attack,shot.tiles);}}
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
    const p=api.tile(),target={x:p.x,z:p.z,tile:p},range=a.aggroRange??a.rules.aggroRange??3;
    if(inTerritory(a,p)&&(sizeOf(a)>1?cellsOf(a).some(c=>withinAttackRange(api.world,c,target,range)):withinAttackRange(api.world,a.tile,target,range)&&findPath(api.world,a.tile,p)))engage(a);
   }
   // Stun and immobilize hold the enemy in place; slows scale its walking below.
   // A thrower stops chasing once its ranged punish is ready, finishes its step and winds up in place.
   const throwing=a.windup?.kind==='ranged'||!a.windup&&a.aggro&&a.rules.rangedAttack&&(a.awayFor||0)>=a.rules.rangedAttack.after&&!inReachOf(a)&&canThrow(a);
   if(canMove&&!throwing){if(a.returning)walkHome(a);else if(a.aggro)pursue(a);}
   const targeted=fight?.enemy===a||chase?.enemy===a;
   if(a.rules.inert||targeted||a.aggro||a.returning||api.blocked()||defeated||api.approaching?.()===a||!canMove)a.patrolRoute=[];
   else if(settled(a)&&cellsOf(a).includes(api.tile())&&!api.playerMoving?.())pushAside(a);
   else if(settled(a)&&!inPatrol(a,a.tile))homeward(a);
   else if(settled(a)){if(!a.patrolRoute.length){a.patrolClock-=dt;if(a.patrolClock<=0){a.patrolClock=wanderDelay(random);if(shouldWander(random))a.patrolRoute=sizeOf(a)>1?wanderStep(a):wanderRoute(api.world,a.tile,a.patrol,t=>taken(t,a),random,t=>cellCost(t,a));}}
    const next=a.patrolRoute[0];if(next){if(sizeOf(a)>1?!canStand(api.world,next,sizeOf(a),a.cells)||bodyTaken(a,next)||!bodyInTerritory(a,next):next.blocked||next.water||!inTerritory(a,next)||a.patrolRoute.length===1&&taken(next,a))a.patrolRoute=[];else{a.patrolRoute.shift();move(a,next);}}
   }
   const destination=bodyPosition(a),distance=a.group.position.distanceTo(destination),moving=distance>.001;
   if(moving)a.group.rotation.y=Math.atan2(destination.x-a.group.position.x,destination.z-a.group.position.z);
   else if(a.aggro)a.group.rotation.y=Math.atan2(api.player.position.x-a.group.position.x,api.player.position.z-a.group.position.z);
   // Every path mode reserves one destination and physically finishes it before taking another.
   if(distance)a.group.position.lerp(destination,Math.min(1,dt*(a.aggro||a.returning?2:1.6)*(a.rules.moveSpeed??1)*(1-a.control.slowFraction)/distance));
   a.sinceStrike=(a.sinceStrike??Infinity)+dt;
   // A ready enemy's first attack waits only for its windup (the cooldown counts from its last strike).
   if(a.aggro&&!defeated&&!api.blocked()&&a.control.can('attack'))enemyAttackUpdate(a,dt,!moving);
   else{cancelWindup(a);a.awayFor=0;}
   // The animation clock: the windup ends the interval; between attacks it rests before the windup.
   const melee=a.windup?.kind!=='ranged',interval=a.rules.interval,windupStart=interval-windupOf(a.rules);
   a.enemyClock=a.windup&&melee?windupStart+a.windup.age:a.aggro?Math.min(a.sinceStrike,windupStart):0;
   if(a.thrownAge!=null){a.thrownAge+=dt;if(a.thrownAge>.5)a.thrownAge=null;}
   const thrown=a.windup?.kind==='ranged'?a.windup.age/a.windup.windup:a.thrownAge!=null?1+a.thrownAge/.5:0;
   animate(a,time+a.patrolPhase,{walk:moving?1:0,attack:a.aggro&&melee&&(a.enemyClock>=.28||a.attackAge>0)?attackPose(a.enemyClock,interval):0,hit:Math.sin(Math.PI*a.hitAge/.25),charge:a.aggro&&melee?a.enemyClock/interval:0,slam:melee&&a.thrownAge==null?a.attackAge/.28:0,thrown});
   if(labelled){projected.copy(a.group.position);projected.y+=a.plateLift??1.7;projected.project(camera);const view=gameViewport();a.plate.place(view.left+(projected.x+1)*view.width/2,view.top+(1-projected.y)*view.height/2);a.plate.effects.value=a.control.kinds.join(',');a.plate.danger.value=api.danger?.(a)||null;}
  }
  for(const [a,f] of fleeing)if(current(a)){f.age+=dt;animate(a,time,{walk:1});if(f.destination){a.group.rotation.y=Math.atan2(f.destination.x-a.group.position.x,f.destination.z-a.group.position.z);a.group.position.lerp(f.destination,1-Math.exp(-dt*3));}a.group.scale.setScalar(a.scale*Math.max(.01,1-Math.max(0,(f.age-.8)/.4)));if(f.age>=1.2){a.group.visible=false;fleeing.delete(a);}}
  if(defeated){defeated+=dt;api.fade?.(Math.max(0,Math.min(1,(defeated-FAINT_FADE_START)/(FAINT_RESPAWN_TIME-FAINT_FADE_START))));if(defeated>=FAINT_RESPAWN_TIME&&api.respawn()){defeated=0;api.health.restore();api.fade?.(0);api.respawned?.();return null;}return {kind:'Defeated',time:Math.min(defeated,FAINT_RESPAWN_TIME)};}
  // Eating no longer pauses attacks: an accepted consumable restarts the windup via consumableUsed().
  // Face the body's centre, so large creatures are faced and aimed at squarely.
  if(fight){const c=fight,a=c.enemy,centre=bodyCenter(a);api.face(centre.x,centre.z);const weapon=c.profile;
   // Unaffordable attacks pause with their target retained; any windup progress is lost.
   // Stun (or any effect preventing this action) cancels the unreleased windup and clears the pending action;
   // the target is kept and a fresh full windup starts when it ends.
   const prevented=api.control&&!api.control.can(weapon.spell?'cast':'attack');
   if(prevented){pending=null;c.playerClock=0;c.struck=false;if(c.ability)commit(c);}
   const short=!prevented&&weapon.manaCost&&!(api.mana?.value>=weapon.manaCost);
   if(short){c.playerClock=0;if(!c.waiting){c.waiting=true;api.toast?.(`Not enough Mana for ${weapon.name} (${weapon.manaCost} needed).`);}}
   else if(!prevented){c.waiting=false;
    c.playerClock+=dt;}
   // A spell's gathering sound follows the visible gather: it starts once the previous cast's
   // follow-through ends (by then a lethal spell has landed and ended the fight) and lasts until the toss.
   if(prevented||short)stopGather();
   else if(weapon.combatStyle==='magic'&&!gather&&c.playerClock>=(c.released?CAST_TIMING.recover:0)&&c.playerClock<weapon.interval-CAST_TIMING.toss)
    gather={fight:c,sound:api.soundStart?.('spellCharge',weapon.interval-CAST_TIMING.toss-c.playerClock)||null};
   if(!prevented&&!short&&c.playerClock>=weapon.interval){
    if(weapon.ammo&&!(api.inventory?.[weapon.ammo]>0)){disengage();api.toast?.('Out of arrows. Visit a supply offer to refill.');}
    else if(weapon.energyCost&&!(api.energy?.value>=weapon.energyCost)){
     // Recheck at release: an unaffordable ability cancels this windup and the ability use (no cost, no XP).
     api.toast?.(`Not enough Energy for ${weapon.abilityName}. It was cancelled.`);c.playerClock=0;c.struck=false;commit(c);
    }
    else{c.playerClock-=weapon.interval;sinceRelease=0;lastInterval=weapon.interval;stopGather();if(weapon.ammo){api.inventory[weapon.ammo]--;api.items?.({[weapon.ammo]:-1});}
     if(weapon.manaCost)api.mana.value-=weapon.manaCost;
     if(weapon.energyCost)api.energy.value-=weapon.energyCost;
     if(weapon.backfirePercent>0&&random()*100<weapon.backfirePercent)backfire(a,weapon);
     else if(['ranged','magic'].includes(weapon.style)){if(weapon.style==='magic')api.sound('spellRelease');api.projectile?.(api.player.position.clone().add(new Vector3(0,.55,0)),a.group.position.clone().add(new Vector3(0,a.aimHeight??.55,0)),weapon.style,weapon);shots.push({enemy:a,profile:weapon,left:PROJECTILE_FLIGHT});}else strike(a,weapon);
     if(weapon.followUp)followUps.push({enemy:a,profile:weapon.followUp,left:FOLLOW_UP_DELAY});
     // The follow-through belongs to the attack that just released, even though the next one is committed.
     c.released=weapon;c.struck=true;if(fight===c)commit(c);
    }
   }
   // Animation time follows the committed attack clock, including recovery after each release.
   // Recovery follows time since the release; a clock still waiting out a longer timer shows rest.
   const recovering=c.struck&&c.released&&sinceRelease<RECOVERY+(c.released.followUp?FOLLOW_UP_DELAY:0),shown=recovering?c.released:c.profile;
   c.age=(c.struck?shown.interval:0)+Math.max(0,recovering?sinceRelease:c.playerClock);
   // A block shows between melee/ranged attacks, never over a spell's cast.
   if(fight){api.interacting?.();if(!defense||shown.style==='magic'||attackWindow(shown,c.age))return {kind:shown.style==='ranged'?'Archery':shown.style==='magic'?'Casting':'Combat',time:c.age,profile:shown};}
  }
  return defense?{kind:'Block',time:defense.age,profile:defense.profile}:null;
 }
 return {start,update,cancel,clear,disengage,lose,preview:profile,queue,queueSpell,consumableUsed,handsChanged,
  get queuedSpell(){return pending?.spell||null;},
  get pending(){return pending?.ability||null;},get pendingManual(){return pending&&!pending.auto?pending.ability:null;},get fighting(){return !!fight;},get committedAbility(){return fight?.ability?.name||null;},
  // Regeneration uses the slower rate during combat activity and for 5 seconds afterwards.
  get inCombat(){return sinceActivity<5;},
   // Reactive: in combat or within 5 seconds of it (written each frame; notifies only on edges).
   inCombatState,revision,
  get autoRetaliate(){return autoRetaliate;},setAutoRetaliate(value){autoRetaliate=!!value;},
  add(a){enemies.add(a);a.patrolPhase=random()*10;resetEnemy(a);return a;},
  // Whether an enemy body stands on this tile (stopping preferences; creatures never block movement).
  occupies:t=>enemyAt(t,null),
  remove(a){if(fight?.enemy===a)fight=null;if(chase?.enemy===a)chase=null;fleeing.delete(a);returningAfterWin.delete(a);for(let i=shots.length-1;i>=0;i--)if(shots[i].enemy===a)shots.splice(i,1);for(let i=enemyShots.length-1;i>=0;i--)if(enemyShots[i].enemy===a)enemyShots.splice(i,1);cancelWindup(a);enemies.delete(a);release(a);a.dispose?.();},
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
