import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createControlState} from './control-effects.js';
import {createEquipment,GEAR} from './equipment.js';
const GEAR_SHIELD=id=>!!GEAR[id]?.shield;
import {createCombatStyles,SPELLS} from './combat-styles.js';
import {createCharacter} from './character.js';
import {createAuras} from './auras.js';
import {createPlayerResources,createResource} from './player-resources.js';
import {createFoodSystem} from './player-health.js';
import {createCombatSystem} from './combat.js';
import {createAssistance} from './assistance.js';
import {playerAttackProfile,playerDefense,armorAwards} from './combat-profile.js';
import {ENEMIES} from './combat-rules.js';
import {XP_BASE,roundFinal} from './combat-formulas.js';
import {OFF_HAND_DAMAGE,FOLLOW_UP_DELAY,offHandFactor} from './combat-profile.js';
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} ≈ ${b}`);

test('stun and immobilize share movement control with protection; slows take the strongest, capped at 90%',()=>{
 const c=createControlState();
 assert.ok(c.apply({kind:'stun',duration:3,protection:6}).applied);assert.equal(c.can('move'),false);assert.equal(c.can('attack'),false);
 assert.equal(c.apply({kind:'immobilize',duration:3,protection:6}).reason,'Already controlled');
 c.update(3);assert.ok(c.can('attack'));assert.equal(c.apply({kind:'stun',duration:3}).reason,'Protected');c.update(6);
 assert.ok(c.apply({kind:'immobilize',duration:2,protection:4}).applied);assert.equal(c.can('move'),false);assert.ok(c.can('attack'),'immobilize allows attacks');
 // Cleanse starts the effect's window now and keeps the longer of it and the granted protection.
 assert.ok(c.cleanse({grant:10}));assert.ok(c.can('move'));close(c.state.protection.movement,10);assert.equal(c.cleanse({grant:3}),false);
 const s=createControlState();s.apply({kind:'slow',id:'a',fraction:.3,duration:10});s.apply({kind:'slow',id:'b',fraction:.5,duration:2});close(s.slowFraction,.5);
 s.update(2);close(s.slowFraction,.3,1e-9);assert.equal(s.apply({kind:'slow',id:'a',fraction:.3,duration:10,refresh:false}).applied,false);
 s.apply({kind:'slow',id:'c',fraction:.99,duration:1});close(s.slowFraction,.9);
});

test('dual wielding: off-hand eligibility, owned copies, default hands and per-hand damage types',()=>{
 const inventory={copperDagger:1,swords:1,copperShield:1},e=createEquipment({inventory});
 e.toggle('copperDagger','main');assert.equal(e.attackHands,'both','a weapon and a free fist both strike');assert.equal(e.handAttack('off').style,'unarmed');
 e.toggle('copperDagger','off');assert.equal(e.slots.main,null,'only one owned copy moves');assert.equal(e.slots.off,'copperDagger');assert.equal(e.attackHands,'both');
 inventory.copperDagger=2;e.toggle('copperDagger','main');assert.deepEqual([e.slots.main,e.slots.off],['copperDagger','copperDagger']);assert.equal(e.attackHands,'both');
 assert.deepEqual(e.inventoryActions('swords').map(a=>a.label),['Equip right hand','Equip left hand'],'every one-handed item fits either hand');
 assert.equal(e.damageTypeFor('main'),'piercing');assert.ok(e.setDamageType('off','slashing'));assert.equal(e.damageTypeFor('off'),'slashing');assert.equal(e.setDamageType('off','bludgeoning'),false);
 e.toggle('copperShield');assert.equal(e.handAttack('off'),null,'a shield hand is not a free fist');assert.deepEqual(e.eligibleHands(),['main']);
 e.reset();assert.equal(e.attackHands,'both','two free hands strike both');
 e.setAttackHands('alternate');assert.equal(e.attackHandsChoice,'both','a saved Alternate choice reads as Both');
});

// openingWindup: null pins full-windup timing for tests of other mechanics.
function combatFixture(kind='target',control=null,{openingWindup}={}){
 const world=new Map();for(let z=0;z<7;z++)for(let x=0;x<7;x++)world.set(`${x},${z}`,{x,z,h:1,blocked:false,water:false});
 const home=world.get('3,3'),inventory={copperDagger:2},health=createResource(100),character=createCharacter(),mana=createResource(),energy=createResource(),toasts=[];let roll=.5;
 const equipment=createEquipment({inventory}),styles=createCombatStyles({equipment});
 const system=createCombatSystem({openingWindup,control,world,health,equipment,inventory,character,mana,energy,knowsAbility:id=>styles.knowsAbility(id),strategy:()=>styles.strategy,toast:m=>toasts.push(m),attack:()=>styles.attack,player:new Group(),random:()=>roll,stop(){},face(){},sound(){},hit(){},blocked:()=>false,inReach:()=>true,tile:()=>world.get('3,4'),reserved:()=>false,respawn:()=>true});
 const a=system.add({kind,rules:ENEMIES[kind],group:new Group(),tile:home,home,x:3,z:3,scale:1,patrol:{minX:2,maxX:4,minZ:2,maxZ:4}});
 return {system,a,equipment,styles,character,health,mana,toasts,inventory,set roll(v){roll=v;}};
}

test('hands are physical: either-hand items, shields and two-handed items on either side, handedness never moves items',()=>{
 const inventory={copperDagger:1,copperShield:1,bows:1},e=createEquipment({inventory});
 assert.equal(e.handedness,'right');
 e.toggle('copperShield','right');assert.equal(e.slots.right,'copperShield','a shield fits the right hand');assert.deepEqual(e.eligibleSides(),['left'],'the shield hand does not strike');
 e.toggle('copperDagger','left');assert.equal(e.handAttack('left').item,'copperDagger');assert.equal(e.handAttack('left').hand,'off','left is the off hand of a right-hander');
 assert.ok(e.setHandedness('left'));assert.deepEqual([e.slots.right,e.slots.left],['copperShield','copperDagger'],'handedness does not move items');
 assert.equal(e.handAttack('left').hand,'main','the left hand is now dominant');assert.equal(e.slots.main,'copperDagger');
 e.toggle('bows','right');assert.deepEqual([e.slots.right,e.slots.left],['bows',null],'a two-handed item takes its hand and frees the other');assert.deepEqual(e.eligibleSides(),['right']);
 e.setHandedness('right');e.reset();e.toggle('bows');assert.equal(e.slots.left,'bows','a bow defaults to the off hand (left for a right-hander)');
 // Attack hands are physical; older role choices map through handedness.
 e.reset();e.setAttackHands('off');assert.equal(e.attackHandsChoice,'left');e.setAttackHands('right');assert.equal(e.attackHands,'right');
});

test('dual wielding strikes both hands each attack: the off hand a beat later at reduced damage, training its own weapon',()=>{
 const f=combatFixture();f.equipment.toggle('copperDagger','main');f.equipment.toggle('copperDagger','off');f.system.start(f.a);
 const H=ENEMIES.target.health;
 // Main-hand dagger at roll .5 (6–22 → 14); the off hand follows FOLLOW_UP_DELAY later at 75%.
 f.system.update(2.5,2.5);assert.equal(f.a.hp,H-14);assert.equal(f.system.state.followUps,1);
 f.system.update(FOLLOW_UP_DELAY,2.5+FOLLOW_UP_DELAY);const off=roundFinal(14*OFF_HAND_DAMAGE);assert.equal(f.a.hp,H-14-off);assert.equal(f.system.state.followUps,0);
 // Each strike trains Dagger proficiency for its own damage.
 assert.equal(f.character.tracks['prof.dagger'].xp,.5*(XP_BASE+14)+.5*(XP_BASE+off));
 // One cycle per interval: the next pair lands after another full interval.
 f.system.update(2.5-FOLLOW_UP_DELAY,5);assert.equal(f.a.hp,H-28-off);
});

test('Dual Wield proficiency: trained once per two-weapon attack, it shrinks the off-hand penalty; fists never train it',()=>{
 const f=combatFixture();f.equipment.toggle('copperDagger','main');f.equipment.toggle('copperDagger','off');f.system.start(f.a);
 const H=ENEMIES.target.health,off=roundFinal(14*OFF_HAND_DAMAGE);
 f.system.update(2.5,2.5);assert.equal(f.character.tracks['prof.dualWield'].xp,0,'not from the main-hand strike');
 f.system.update(FOLLOW_UP_DELAY,2.75);assert.equal(f.character.tracks['prof.dualWield'].xp,.5*(XP_BASE+off),'once, with the off-hand strike');
 assert.equal(offHandFactor(1),OFF_HAND_DAMAGE);assert.equal(offHandFactor(100),1);close(offHandFactor(50),.75+.25*49/99);
 f.character.setLevel('prof.dualWield',100);f.system.cancel();f.system.start(f.a);const before=f.a.hp;
 f.system.update(2.5,5.25);f.system.update(FOLLOW_UP_DELAY,5.5);assert.equal(before-f.a.hp,28,'level 100: the off hand hits as hard as the main hand');
 const fists=combatFixture();fists.system.start(fists.a);fists.system.update(2.5,2.5);fists.system.update(FOLLOW_UP_DELAY,2.75);
 assert.equal(fists.character.tracks['prof.dualWield'].xp,0,'two free hands train Unarmed, not Dual Wield');
});

test('the off-hand follow-up survives moving away but a stun cancels it',()=>{
 const control=createControlState();
 const f=combatFixture('target',control);f.equipment.toggle('copperDagger','main');f.equipment.toggle('copperDagger','off');f.system.start(f.a);
 const H=ENEMIES.target.health;
 // Disengaging resets the inert practice target, and the committed follow-up still lands on it.
 f.system.update(2.5,2.5);f.system.disengage();assert.equal(f.system.state.followUps,1);f.system.update(FOLLOW_UP_DELAY,2.75);
 assert.equal(f.system.state.followUps,0);assert.equal(f.a.hp,H-roundFinal(14*OFF_HAND_DAMAGE),'committed follow-up lands after disengaging');
 f.system.start(f.a);f.system.update(2.5,5.25);const before=f.a.hp;control.apply({kind:'stun',duration:1});f.system.update(FOLLOW_UP_DELAY,5.5);
 assert.equal(f.a.hp,before,'stun cancels it');assert.equal(f.system.state.followUps,0);
});

test('backfire replaces an under-level cast, hurts only the caster through resistances and gives base XP',()=>{
 const f=combatFixture();f.styles.learn('energyStrike');f.styles.select('energyStrike');const original=SPELLS.energyStrike.requirements['magic.technique'];
 try{
  SPELLS.energyStrike.requirements['magic.technique']=10;const p=f.system.preview();close(p.backfirePercent,81);close(p.effectiveness,.1);
  f.roll=.005;f.system.start(f.a);f.system.update(3/1.02,3);
  // Base = 50% of the normal 22 maximum = 11; starting magic resistance 0.1% → 10.989 → 11.
  assert.equal(f.health.value,89);assert.equal(f.a.hp,ENEMIES.target.health,'no projectile or target damage');assert.equal(f.a.aggro,false);
  assert.equal(f.mana.value,96,'costs are still paid');assert.equal(f.character.tracks['magic.technique'].xp,.5*XP_BASE);assert.match(f.toasts.at(-1),/backfired/);
  SPELLS.energyStrike.requirements['magic.technique']=1;assert.equal(f.system.preview().backfirePercent,0,'qualified casting never backfires');
 }finally{SPELLS.energyStrike.requirements['magic.technique']=original;}
});

test('armor: per-piece effectiveness, slot proficiency defense and split armor XP pools',()=>{
 const c=createCharacter(),light={slot:'chest',armor:{class:'light',slot:'chest'},resistance:40,requirements:{'armor.light':1}},heavy={slot:'feet',armor:{class:'heavy',slot:'feet'},resistance:80,requirements:{'armor.heavy':20}};
 // Light at full strength; Heavy at 1/20 hits the 10% effectiveness floor → +8. Slot proficiency level 1: +0.02 each, +0.0001pp block.
 const d=playerDefense(c,{armor:[light,heavy]});close(d.resistancePct,(.5+.5+40+8+.04)/10);close(d.blockPercent,1.0002);
 const awards=armorAwards([light,light,light,heavy],150);
 assert.deepEqual(awards.slice(0,2),[{track:'armor.light',amount:112.5},{track:'armor.heavy',amount:37.5}]);assert.equal(awards.filter(a=>a.track.startsWith('prof.')).every(a=>a.amount===37.5),true);
});

function assistFixture({hp=100}={}){
 const inventory={cookedFish:2,copperDagger:1,copperShield:1,swords:1},character=createCharacter(),equipment=createEquipment({inventory}),styles=createCombatStyles({equipment});
 const resources=createPlayerResources(),auras=createAuras({ki:resources.ki}),health=createResource(100);health.value=hp;
 const food=createFoodSystem({inventory,health,stop(){}});
 const enemy={kind:'bruiser',rules:ENEMIES.bruiser};let pending=null,stopped=0,moving=false;
 // pending: {ability, auto}. Mirrors combat's single pending slot for the assistance rules under test.
 const combat={engagedEnemy:enemy,working:false,inCombat:true,fighting:false,committedAbility:null,autoRetaliate:true,get pending(){return pending?.ability||null;},get pendingManual(){return pending&&!pending.auto?pending.ability:null;},set pending(v){pending=typeof v==='string'?{ability:v,auto:false}:v;},queue(id,{auto=false}={}){if(pending)return 'Busy';pending={ability:id,auto};return true;},stopAttacking(){stopped++;},preview:()=>playerAttackProfile(character,styles.attack,styles.strategy)};
 const toasts=[],assistance=createAssistance({combat,character,equipment,styles,auras,food,inventory,health,resources,toast:m=>toasts.push(m),moving:()=>moving});
 return {assistance,combat,character,equipment,styles,auras,resources,health,inventory,toasts,enemy,get stopped(){return stopped;},set moving(v){moving=v;}};
}

test('danger bands use the actual max hit after defenses; Smart retaliation withholds at 1–3 hits unless the player chose the target',()=>{
 const f=assistFixture({hp:100});f.assistance.update(.2);assert.equal(f.assistance.danger.maxHit,20);assert.equal(f.assistance.danger.hits,5);assert.equal(f.assistance.warning,'Use caution.');assert.ok(f.assistance.shouldRetaliate(f.enemy));
 f.health.value=40;f.assistance.update(.2);assert.equal(f.assistance.danger.band,'flee');assert.equal(f.assistance.shouldRetaliate(f.enemy),false);
 f.assistance.noteManualAttack(f.enemy);assert.ok(f.assistance.shouldRetaliate(f.enemy),'deliberate attack overrides the recommendation');
 f.combat.inCombat=false;f.assistance.update(.2);assert.equal(f.assistance.shouldRetaliate(f.enemy),false,'override clears after the combat exit');
 f.assistance.setRetaliate('always');assert.ok(f.assistance.shouldRetaliate(f.enemy),'Always retaliates');
 f.assistance.setRetaliate('never');assert.equal(f.assistance.shouldRetaliate(f.enemy),false);
 f.assistance.setMode('expert');assert.equal(f.assistance.settings.retaliate,'always','Expert applies its retaliate default');
});

test('Pacifist mode blocks every attack and stops the current windup; Auto never overrides it',()=>{
 const f=assistFixture();f.assistance.setMode('pacifist');assert.equal(f.stopped,1);assert.equal(f.assistance.canAttack(),false);assert.equal(f.toasts.at(-1),'Attacks are prevented in this mode.');assert.equal(f.assistance.shouldRetaliate(f.enemy),false);
 f.assistance.setMode('simple');assert.ok(f.assistance.canAttack());
});

test('auto-eat acts at 150% of the max hit, respects exclusions and manual priority, and otherwise recommends fleeing',()=>{
 const f=assistFixture({hp:31});f.assistance.update(.2);assert.equal(f.inventory.cookedFish,2,'31 > 30');
 f.health.value=30;f.combat.pending='strongStrike';f.assistance.update(.2);assert.equal(f.inventory.cookedFish,2,'manual queue keeps priority');assert.equal(f.assistance.warning,'Warning! Recommend fleeing!');
 f.assistance.setPolicy('emergencyPriority',true);f.assistance.update(.2);assert.equal(f.inventory.cookedFish,1);assert.equal(f.health.value,50);
 const g=assistFixture({hp:20});g.assistance.setPermission('food','cookedFish',false);g.assistance.update(.2);assert.equal(g.inventory.cookedFish,2);assert.equal(g.assistance.warning,'Warning! Recommend fleeing!');
});

test('Auto strategy honours the training goal, defends in danger otherwise, and a manual choice is a one-time override',()=>{
 const f=assistFixture({hp:100});f.combat.engagedEnemy=null;f.assistance.update(.2);assert.equal(f.styles.strategy,'strong','highest expected DPS when safe');
 f.combat.engagedEnemy=f.enemy;f.health.value=60;f.assistance.update(.2);assert.equal(f.styles.strategy,'defensive');
 f.assistance.setGoal('accuracy');f.assistance.update(.2);assert.equal(f.styles.strategy,'accurate','danger never redirects a training goal');
 f.assistance.setStrategyManually('fast');f.assistance.update(.2);assert.equal(f.styles.strategy,'fast');f.assistance.returnToAuto();f.assistance.update(.2);assert.equal(f.styles.strategy,'accurate');
});

test('Auto spells skip any backfire risk unless explicitly allowed',()=>{
 const f=assistFixture();f.styles.learn('energyStrike');f.assistance.setStyle('magic');f.assistance.update(.2);assert.equal(f.styles.state.selected,'energyStrike');
 const original=SPELLS.energyStrike.requirements['magic.technique'];
 try{SPELLS.energyStrike.requirements['magic.technique']=5;f.assistance.update(.2);assert.equal(f.styles.state.selected,null);
  f.assistance.setPolicy('allowRiskySpells',true);f.assistance.update(.2);assert.equal(f.styles.state.selected,'energyStrike');}
 finally{SPELLS.energyStrike.requirements['magic.technique']=original;}
});

test('Optimize ranks owned gear by DPS, then reduction, then current gear, and runs on Class change',()=>{
 // Dual wielding outdamages a shield, so a sword plus an off-hand dagger beats dagger and shield.
 const f=assistFixture();assert.match(f.assistance.optimize('melee'),/Copper Dagger \(right\).*Stone Sword \(left\)/);assert.equal(f.assistance.optimize('melee'),'No better setup found.');
 f.inventory.copperDagger=0;f.inventory.swords=0;f.inventory.copperDagger=1;f.equipment.setSlots({main:null,off:null});
 assert.equal(f.assistance.optimize('melee'),'Equipped Copper Dagger (right).','with one weapon, the free fist outdamages a shield');
 f.assistance.setOptimizePriority('defense');assert.match(f.assistance.optimize('melee'),/Copper Shield \(left\)/,'Defense takes the shield');f.assistance.setOptimizePriority('damage');
 assert.equal(f.assistance.setStyle('ranged'),'No ranged weapon owned.');
 f.inventory.bows=1;f.assistance.setStyle('melee');assert.match(f.assistance.setStyle('ranged'),/Training Bow \(left\).*no arrows/);assert.deepEqual([f.equipment.slots.right,f.equipment.slots.left],[null,'bows'],'a bow in the left hand frees nothing else to hold');
});

test('Optimize priority: Damage takes the dual wield, Defense and Balanced take the shield when it outweighs the lost damage',()=>{
 const f=assistFixture();
 assert.equal(f.assistance.settings.optimizePriority,'damage');f.assistance.optimize('melee');assert.ok(GEAR[f.equipment.slots.off]?.style,'damage: two weapons');
 assert.equal(f.assistance.setOptimizePriority('fastest'),false);
 f.assistance.setOptimizePriority('defense');f.assistance.optimize('melee');assert.equal(f.equipment.slots.off,'copperShield','defense: the shield');
 // Balanced compares DPS / (1 − reduction): a 5% shield is worth ~5% more damage, far less than the off-hand strike adds.
 f.assistance.setOptimizePriority('balanced');f.assistance.optimize('melee');assert.ok(GEAR[f.equipment.slots.off]?.style,'balanced: the off-hand strike outweighs a 5% shield');
 f.assistance.reset();assert.equal(f.assistance.settings.optimizePriority,'damage');
});

test('Optimize respects a locked Attack hands choice; Auto chooses hands freely',()=>{
 const f=assistFixture();f.inventory.copperDagger=2;
 // Auto: dual wielding beats a shield on damage (two daggers outdamage Stone Sword + dagger).
 f.assistance.optimize('melee');assert.deepEqual([f.equipment.slots.main,f.equipment.slots.off],['copperDagger','copperDagger']);
 // Main hand only: the best striking weapon in the main hand; the off hand won't attack, so it defends.
 f.equipment.setAttackHands('main');f.assistance.optimize('melee');assert.deepEqual([f.equipment.slots.main,f.equipment.slots.off],['copperDagger','copperShield']);
 // Off hand only: the best off-hand weapon there; the main hand is left as it is.
 f.equipment.setAttackHands('off');f.assistance.optimize('melee');assert.deepEqual([f.equipment.slots.main,f.equipment.slots.off],['copperDagger','copperDagger']);
 // Both, locked: never a shield, even under Defense.
 f.equipment.setAttackHands('both');f.assistance.setOptimizePriority('defense');f.assistance.optimize('melee');assert.equal(GEAR_SHIELD(f.equipment.slots.off),false);
 f.equipment.setAttackHands('auto');assert.equal(f.equipment.attackHandsChoice,null,'Auto clears the lock');
});

test('Optimize says so when equipment is busy instead of reporting no better setup',()=>{
 const f=assistFixture();f.equipment.setSlots({main:null,off:null});const original=f.equipment.setSlots;f.equipment.setSlots=()=>[];
 try{assert.equal(f.assistance.optimize('melee'),'Finish what you’re doing before changing equipment.');}finally{f.equipment.setSlots=original;}
});

test('Optimize with two daggers and no shield fills both hands, main hand first, even from an off-hand-only setup',()=>{
 const f=assistFixture();f.inventory.copperShield=0;f.inventory.swords=0;f.inventory.copperDagger=2;
 f.assistance.optimize('melee');assert.deepEqual([f.equipment.slots.main,f.equipment.slots.off],['copperDagger','copperDagger']);
 f.equipment.setSlots({main:null,off:'copperDagger'});
 f.assistance.optimize('melee');assert.deepEqual([f.equipment.slots.main,f.equipment.slots.off],['copperDagger','copperDagger'],'empty slots are not "kept"');
 f.inventory.copperShield=1;f.assistance.optimize('melee');assert.equal(f.equipment.slots.off,'copperDagger','dual wielding outdamages a shield');
});

test('Auto auras: Harden in danger, Rush while moving in combat, 25% Ki floor, exhaustion recovery threshold and grace',()=>{
 const f=assistFixture({hp:60});f.auras.learn('rush');f.auras.learn('harden');f.assistance.update(.2);assert.ok(f.auras.isActive('harden'));assert.equal(f.auras.isActive('rush'),false);
 f.moving=true;f.assistance.update(.2);assert.ok(f.auras.isActive('rush'));
 f.moving=false;f.assistance.update(1);f.assistance.update(1);assert.ok(f.auras.isActive('rush'),'within grace');f.assistance.update(1.2);assert.equal(f.auras.isActive('rush'),false);
 f.auras.deactivateAll();f.assistance.auraExhausted();f.resources.ki.value=40;f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),false,'waits for 50% after exhaustion');
 f.resources.ki.value=60;f.assistance.update(.2);assert.ok(f.auras.isActive('harden'));
 f.assistance.toggleAuraManually('harden');f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),false,'manual choice sticks');
 f.assistance.returnToAuto();f.resources.ki.value=10;f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),false,'below the 25% floor');
});

test('a stun cancels the unreleased windup and pending action, keeps the target and restarts fully; stunned enemies hold',()=>{
 const control=createControlState(),f=combatFixture('bruiser',control,{openingWindup:null});f.styles.learnAbility('strongStrike');f.system.start(f.a);f.system.update(2,2);f.system.queue('strongStrike');
 control.apply({kind:'stun',duration:1,protection:5});f.system.update(.6,2.6);assert.equal(f.a.hp,ENEMIES.bruiser.health,'no strike while stunned');assert.equal(f.system.pending,null);assert.equal(f.system.state.fight,'bruiser');
 control.update(1);f.system.update(2.4,5);assert.equal(f.a.hp,ENEMIES.bruiser.health,'fresh full windup');f.system.update(.2,5.2);assert.ok(f.a.hp<ENEMIES.bruiser.health);
 const before=f.health.value;f.a.control.apply({kind:'stun',duration:10,protection:0});f.system.update(5,10);assert.equal(f.health.value,before,'a stunned enemy cannot attack');
});

test('Auto uses learned abilities whenever eligible and affordable, respecting goals, the queue and the mode',()=>{
 const f=assistFixture({hp:100});f.styles.learnAbility('strongStrike');f.combat.fighting=true;
 f.assistance.update(.2);assert.equal(f.combat.pending,'strongStrike');assert.equal(f.combat.pendingManual,null,'queued as an Auto request');
 // Already queued or committed: no second request.
 f.combat.pending=null;f.combat.committedAbility='Strong Strike';f.assistance.update(.2);assert.equal(f.combat.pending,null);f.combat.committedAbility=null;
 f.resources.energy.value=49;f.assistance.update(.2);assert.equal(f.combat.pending,null,'needs 50 Energy');f.resources.energy.value=100;
 f.assistance.setGoal('technique');f.assistance.update(.2);assert.equal(f.combat.pending,null,'Strong Strike would redirect XP to Power');
 f.assistance.setGoal('power');f.assistance.update(.2);assert.equal(f.combat.pending,'strongStrike');f.combat.pending=null;
 f.assistance.setMode('expert');f.assistance.update(.2);assert.equal(f.combat.pending,null,'Expert (Manual abilities) never acts');f.assistance.setMode('simple');
 f.assistance.setMode('pacifist');f.assistance.update(.2);assert.equal(f.combat.pending,null);f.assistance.setMode('simple');
 f.combat.fighting=false;f.assistance.update(.2);assert.equal(f.combat.pending,null,'only during a fight');
 f.inventory.bows=1;f.combat.fighting=true;f.equipment.toggle('bows');f.assistance.update(.2);assert.equal(f.combat.pending,null,'Strong Strike needs a melee attack');
});

test('the pending slot keeps manual priority: Auto never displaces a manual request; pressing an Auto request adopts it',()=>{
 const f=combatFixture();f.styles.learnAbility('strongStrike');
 assert.equal(f.system.queue('strongStrike',{auto:true}),true);assert.equal(f.system.pendingManual,null);
 assert.equal(f.system.queue('strongStrike'),true);assert.equal(f.system.pending,'strongStrike','the press adopts it rather than withdrawing');assert.equal(f.system.pendingManual,'strongStrike');
 assert.equal(f.system.queue('strongStrike',{auto:true}),true);assert.equal(f.system.pendingManual,'strongStrike','Auto leaves a manual request alone');
 f.system.queue('strongStrike');assert.equal(f.system.pending,null,'a second manual press withdraws');
});

test('a lethal hit at fractional health reports the visible health, as a whole number',()=>{
 // Production combat system with a recording hit callback.
 const shown=[];const g=(()=>{const world=new Map();for(let z=0;z<7;z++)for(let x=0;x<7;x++)world.set(`${x},${z}`,{x,z,h:1,blocked:false,water:false});
  const home=world.get('3,3'),inventory={},health=createResource(100),character=createCharacter(),equipment=createEquipment({inventory}),styles=createCombatStyles({equipment});
  const system=createCombatSystem({world,health,equipment,inventory,character,mana:createResource(),energy:createResource(),strategy:()=>styles.strategy,attack:()=>styles.attack,player:new Group(),random:()=>.5,stop(){},face(){},sound(){},hit:(p,d,o)=>shown.push([d,o]),blocked:()=>false,inReach:()=>true,tile:()=>world.get('3,4'),reserved:()=>false,respawn:()=>false,defeatStop(){system.cancel();}});
  const a=system.add({kind:'bruiser',rules:{...ENEMIES.bruiser,aggressive:true},group:new Group(),tile:home,home,x:3,z:3,scale:1,patrol:{minX:2,maxX:4,minZ:2,maxZ:4}});return {system,a,health};})();
 g.health.value=5.947837283474;g.a.aggressive=true;for(let t=0;t<3;t+=.02)g.system.update(.02,t);
 const lethal=shown.find(([,o])=>o==='hit');assert.deepEqual(lethal,[6,'hit']);assert.equal(g.health.value,0);
});

test('the follow-through after a release keeps the attack that struck (with its follow-up); the next attack shows after recovery',()=>{
 const f=combatFixture('target',null,{openingWindup:null});f.inventory.copperDagger=1;f.equipment.toggle('copperDagger','main');f.equipment.setAttackHands('both');f.system.start(f.a);
 assert.equal(f.equipment.attackHands,'both','dagger and a free hand');
 const struck=f.system.update(2.5,2.5);assert.equal(struck.profile.hand,'main');assert.equal(struck.profile.item,'copperDagger','recovery shows the dagger stab');
 assert.equal(struck.profile.followUp.hand,'off');assert.equal(struck.profile.followUp.item,null,'then the off-hand punch');
 const follow=f.system.update(FOLLOW_UP_DELAY+.1,2.85);assert.ok(follow.profile.followUp,'the pair keeps showing through the follow-up');
 const windup=f.system.update(1.5,4.35);assert.equal(windup.kind,'Combat');assert.equal(windup.profile.hand,'main','each attack starts with the main hand');
});

test('modes are presets; editing a policy moves to Custom, which remembers its settings',()=>{
 const tips=[],f=assistFixture();f.assistance.reset();
 const assistance=createAssistance({combat:f.combat,character:f.character,equipment:f.equipment,styles:f.styles,auras:f.auras,food:{cooldown:0,working:false,start(){}},inventory:f.inventory,health:f.health,resources:f.resources,toast(){},moving:()=>false,tip:t=>tips.push(t)});
 assert.equal(assistance.settings.mode,'simple');assert.equal(assistance.settings.policies.strategy,'auto');
 assistance.setMode('expert');assert.equal(assistance.settings.policies.auras,'manual');assert.equal(assistance.settings.policies.showEnergy,true);
 assistance.setPolicy('auras','auto');
 assert.equal(assistance.settings.mode,'custom');assert.equal(assistance.settings.policies.auras,'auto');assert.equal(assistance.settings.policies.strategy,'manual','copied from Expert');
 assert.match(tips.at(-1),/Switched to Custom/);
 assistance.setMode('simple');assert.equal(assistance.settings.policies.strategy,'auto','presets are unchanged');
 assistance.setMode('custom');assert.equal(assistance.settings.policies.auras,'auto');assert.equal(assistance.settings.policies.strategy,'manual','Custom remembers');
 assistance.setMode('pacifist');assistance.setPolicy('autoEat',false);
 assert.equal(assistance.settings.policies.attacks,'prevented','editing from a preset overwrites Custom with that preset');assert.equal(assistance.settings.policies.autoEat,false);
 // Quick settings never change the mode.
 assistance.setMode('simple');assistance.setRetaliate('never');assistance.setStyle('ranged');assistance.setGoal('power');
 assert.equal(assistance.settings.mode,'simple');
});

test('one-time overrides end with their fight, Return to Auto ends them all, and repeats earn one tip',()=>{
 const tips=[],f=assistFixture({hp:100});
 const assistance=createAssistance({combat:f.combat,character:f.character,equipment:f.equipment,styles:f.styles,auras:f.auras,food:{cooldown:0,working:false,start(){}},inventory:f.inventory,health:f.health,resources:f.resources,toast(){},moving:()=>false,tip:t=>tips.push(t)});
 f.auras.learn('harden');
 const fight=()=>{f.combat.inCombat=true;assistance.update(.2);f.combat.inCombat=false;assistance.update(.2);};
 f.combat.inCombat=true;assistance.setStrategyManually('fast');assistance.toggleAuraManually('harden');
 assert.equal(assistance.settings.overrides.strategy,true);assert.equal(assistance.settings.overrides.auras.harden,true);assert.equal(assistance.settings.mode,'simple','overrides keep the mode');
 assistance.returnToAuto();assert.equal(assistance.settings.overrides.strategy,false);assert.deepEqual(assistance.settings.overrides.auras,{});
 // Made outside combat, an override lasts through the next fight.
 f.combat.inCombat=false;assistance.update(.2);assistance.setStrategyManually('fast');
 f.combat.inCombat=true;assistance.update(.2);assert.equal(f.styles.strategy,'fast','the override holds during the fight');
 f.combat.inCombat=false;assistance.update(.2);assert.equal(assistance.settings.overrides.strategy,false,'and ends with it');
 for(let i=0;i<2;i++){assistance.setStrategyManually('fast');fight();}
 assert.equal(tips.filter(t=>/Strategy to Manual/.test(t)).length,1,'third consecutive fight: one tip');
 assistance.setStrategyManually('fast');fight();assert.equal(tips.filter(t=>/Strategy to Manual/.test(t)).length,1,'only once');
});

test('per-item aura permissions keep Auto from using that aura',()=>{
 const f=assistFixture({hp:60});f.auras.learn('harden');f.assistance.setPermission('aura','harden',false);
 f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),false);
 f.assistance.setPermission('aura','harden',true);f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),true);
});

test('Pacifist draws no aggression unless a creature attacks pacifists; aggression already started stays',()=>{
 const build=({passive,attacksPacifists=false})=>{
  const world=new Map();for(let z=0;z<9;z++)for(let x=0;x<9;x++)world.set(`${x},${z}`,{x,z,h:1,blocked:false,water:false});
  const home=world.get('3,3'),inventory={},health=createResource(100),character=createCharacter(),equipment=createEquipment({inventory}),styles=createCombatStyles({equipment});
  const state={passive,player:world.get('3,5')};
  const system=createCombatSystem({world,health,equipment,inventory,character,mana:createResource(),energy:createResource(),strategy:()=>styles.strategy,attack:()=>styles.attack,player:new Group(),random:()=>.5,stop(){},face(){},sound(){},hit(){},blocked:()=>false,inReach:()=>true,tile:()=>state.player,reserved:()=>false,respawn:()=>false,defeatStop(){system.cancel();},passive:()=>state.passive});
  const a=system.add({kind:'bruiser',rules:ENEMIES.bruiser,aggressive:true,aggroRange:4,attacksPacifists,group:new Group(),tile:home,home,x:3,z:3,scale:1,patrol:{minX:2,maxX:4,minZ:2,maxZ:4}});
  const run=seconds=>{for(let t=0;t<seconds;t+=.05)system.update(.05,t);};
  return {system,a,state,health,run};
 };
 const calm=build({passive:true});calm.run(3);
 assert.equal(calm.a.aggro,false,'aggressive enemies ignore a Pacifist player in range');assert.equal(calm.health.value,100);
 const hunter=build({passive:true,attacksPacifists:true});hunter.run(3);
 assert.equal(hunter.a.aggro,true,'creatures configured to attack pacifists still engage');
 const chased=build({passive:false});chased.run(.5);assert.equal(chased.a.aggro,true);
 chased.state.passive=true;chased.run(4);
 assert.equal(chased.a.aggro,true,'turning Pacifist on mid-fight does not calm the enemy already attacking');
 assert.ok(chased.health.value<100,'and it keeps attacking');
});

test('aggression follows the Attacks policy itself, so Pacifist and Custom-with-prevented agree',()=>{
 const f=assistFixture();
 assert.equal(f.assistance.attacksPrevented,false);
 f.assistance.setMode('pacifist');assert.equal(f.assistance.attacksPrevented,true);
 f.assistance.setPolicy('autoEat',false);assert.equal(f.assistance.settings.mode,'custom');assert.equal(f.assistance.attacksPrevented,true,'Custom copied from Pacifist');
 f.assistance.setPolicy('attacks','allowed');assert.equal(f.assistance.attacksPrevented,false);
 f.assistance.setMode('expert');f.assistance.setPolicy('attacks','prevented');assert.equal(f.assistance.attacksPrevented,true);
});
