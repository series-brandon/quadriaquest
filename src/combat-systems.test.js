import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createControlState} from './control-effects.js';
import {createEquipment,GEAR} from './equipment.js';
import {createCombatStyles,SPELLS} from './combat-styles.js';
import {createCharacter} from './character.js';
import {createAuras} from './auras.js';
import {createPlayerResources,createResource} from './player-resources.js';
import {createFoodSystem} from './player-health.js';
import {createCombatSystem} from './combat.js';
import {createAssistance} from './assistance.js';
import {playerAttackProfile,playerDefense,armorAwards} from './combat-profile.js';
import {ENEMIES} from './combat-rules.js';
import {XP_BASE} from './combat-formulas.js';
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
 e.toggle('copperDagger','main');assert.equal(e.attackHands,'main');assert.equal(e.handAttack('off').style,'unarmed');
 e.toggle('copperDagger','off');assert.equal(e.slots.main,null,'only one owned copy moves');assert.equal(e.slots.off,'copperDagger');assert.equal(e.attackHands,'off');
 inventory.copperDagger=2;e.toggle('copperDagger','main');assert.deepEqual([e.slots.main,e.slots.off],['copperDagger','copperDagger']);assert.equal(e.attackHands,'alternate');
 assert.equal(e.inventoryActions('swords').length,1,'swords are not off-hand eligible');
 assert.equal(e.damageTypeFor('main'),'piercing');assert.ok(e.setDamageType('off','slashing'));assert.equal(e.damageTypeFor('off'),'slashing');assert.equal(e.setDamageType('off','bludgeoning'),false);
 e.toggle('copperShield');assert.equal(e.handAttack('off'),null,'a shield hand is not a free fist');assert.deepEqual(e.eligibleHands(),['main']);
 e.reset();assert.equal(e.attackHands,'alternate','two free fists alternate');
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

test('alternating dual-wield strikes share one sequential timer and train the striking weapon',()=>{
 const f=combatFixture();f.equipment.toggle('copperDagger','main');f.equipment.toggle('copperDagger','off');f.system.start(f.a);
 assert.equal(f.system.nextHand,'main');f.system.update(2.5,2.5);assert.equal(f.system.nextHand,'off');f.system.update(2.5,5);assert.equal(f.system.nextHand,'main');
 // Two dagger hits at roll .5 (6–22 → 14 each); both train Dagger proficiency once per strike.
 assert.equal(f.a.hp,ENEMIES.target.health-28);assert.equal(f.character.tracks['prof.dagger'].xp,2*.5*(XP_BASE+14));
 f.system.update(2.5,7.5);f.system.cancel();f.system.update(6,13.5);assert.equal(f.system.nextHand,'main','sequence resets after the 5s exit');
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

test('danger bands use the actual max hit after defenses; Balanced withholds retaliation at 1–3 hits unless the player chose the target',()=>{
 const f=assistFixture({hp:100});f.assistance.update(.2);assert.equal(f.assistance.danger.maxHit,20);assert.equal(f.assistance.danger.hits,5);assert.equal(f.assistance.warning,'Use caution.');assert.ok(f.assistance.shouldRetaliate(f.enemy));
 f.health.value=40;f.assistance.update(.2);assert.equal(f.assistance.danger.band,'flee');assert.equal(f.assistance.shouldRetaliate(f.enemy),false);
 f.assistance.noteManualAttack(f.enemy);assert.ok(f.assistance.shouldRetaliate(f.enemy),'deliberate attack overrides the recommendation');
 f.combat.inCombat=false;f.assistance.update(.2);assert.equal(f.assistance.shouldRetaliate(f.enemy),false,'override clears after the combat exit');
 f.assistance.setControl('manual');assert.ok(f.assistance.shouldRetaliate(f.enemy),'Manual follows Auto-Retaliate');
});

test('Pacifist blocks every attack and stops the current windup; Auto never overrides it',()=>{
 const f=assistFixture();f.assistance.setPacifist(true);assert.equal(f.stopped,1);assert.equal(f.assistance.canAttack(),false);assert.equal(f.toasts.at(-1),'Cannot attack while in pacifist mode.');assert.equal(f.assistance.shouldRetaliate(f.enemy),false);
 f.assistance.setPacifist(false);assert.ok(f.assistance.canAttack());
});

test('auto-eat acts at 150% of the max hit, respects exclusions and manual priority, and otherwise recommends fleeing',()=>{
 const f=assistFixture({hp:31});f.assistance.update(.2);assert.equal(f.inventory.cookedFish,2,'31 > 30');
 f.health.value=30;f.combat.pending='strongStrike';f.assistance.update(.2);assert.equal(f.inventory.cookedFish,2,'manual queue keeps priority');assert.equal(f.assistance.warning,'Warning! Recommend fleeing!');
 f.assistance.setAdvanced({emergencyPriority:true});f.assistance.update(.2);assert.equal(f.inventory.cookedFish,1);assert.equal(f.health.value,50);
 const g=assistFixture({hp:20});g.assistance.setAdvanced({foodExclusions:['cookedFish']});g.assistance.update(.2);assert.equal(g.inventory.cookedFish,2);assert.equal(g.assistance.warning,'Warning! Recommend fleeing!');
});

test('Auto strategy honours the training goal, defends in danger otherwise, and manual choices stick until returned to Auto',()=>{
 const f=assistFixture({hp:100});f.combat.engagedEnemy=null;f.assistance.update(.2);assert.equal(f.styles.strategy,'strong','highest expected DPS when safe');
 f.combat.engagedEnemy=f.enemy;f.health.value=60;f.assistance.update(.2);assert.equal(f.styles.strategy,'defensive');
 f.assistance.setGoal('accuracy');f.assistance.update(.2);assert.equal(f.styles.strategy,'accurate','danger never redirects a training goal');
 f.assistance.setStrategyManually('fast');f.assistance.update(.2);assert.equal(f.styles.strategy,'fast');f.assistance.returnToAuto('strategy');f.assistance.update(.2);assert.equal(f.styles.strategy,'accurate');
});

test('Auto spells skip any backfire risk unless explicitly allowed',()=>{
 const f=assistFixture();f.styles.learn('energyStrike');f.assistance.setStyle('magic');f.assistance.update(.2);assert.equal(f.styles.state.selected,'energyStrike');
 const original=SPELLS.energyStrike.requirements['magic.technique'];
 try{SPELLS.energyStrike.requirements['magic.technique']=5;f.assistance.update(.2);assert.equal(f.styles.state.selected,null);
  f.assistance.setAdvanced({allowRiskySpells:true});f.assistance.update(.2);assert.equal(f.styles.state.selected,'energyStrike');}
 finally{SPELLS.energyStrike.requirements['magic.technique']=original;}
});

test('Optimize ranks owned gear by DPS, then reduction, then current gear, and runs on Class change',()=>{
 const f=assistFixture();assert.match(f.assistance.optimize('melee'),/Copper Dagger \(main\).*Copper Shield \(off\)/);assert.equal(f.assistance.optimize('melee'),'No better setup found.');
 assert.equal(f.assistance.setStyle('ranged'),'No ranged weapon owned.');
 f.inventory.bows=1;f.assistance.setStyle('melee');assert.match(f.assistance.setStyle('ranged'),/Training Bow \(main\).*no arrows/);assert.equal(f.equipment.slots.off,null);
});

test('Auto auras: Harden in danger, Rush while moving in combat, 25% Ki floor, exhaustion recovery threshold and grace',()=>{
 const f=assistFixture({hp:60});f.auras.learn('rush');f.auras.learn('harden');f.assistance.update(.2);assert.ok(f.auras.isActive('harden'));assert.equal(f.auras.isActive('rush'),false);
 f.moving=true;f.assistance.update(.2);assert.ok(f.auras.isActive('rush'));
 f.moving=false;f.assistance.update(1);f.assistance.update(1);assert.ok(f.auras.isActive('rush'),'within grace');f.assistance.update(1.2);assert.equal(f.auras.isActive('rush'),false);
 f.auras.deactivateAll();f.assistance.auraExhausted();f.resources.ki.value=40;f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),false,'waits for 50% after exhaustion');
 f.resources.ki.value=60;f.assistance.update(.2);assert.ok(f.auras.isActive('harden'));
 f.assistance.toggleAuraManually('harden');f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),false,'manual choice sticks');
 f.assistance.returnToAuto('aura','harden');f.resources.ki.value=10;f.assistance.update(.2);assert.equal(f.auras.isActive('harden'),false,'below the 25% floor');
});

test('a stun cancels the unreleased windup and pending action, keeps the target and restarts fully; stunned enemies hold',()=>{
 const control=createControlState(),f=combatFixture('bruiser',control,{openingWindup:null});f.styles.learnAbility('strongStrike');f.system.start(f.a);f.system.update(2,2);f.system.queue('strongStrike');
 control.apply({kind:'stun',duration:1,protection:5});f.system.update(.6,2.6);assert.equal(f.a.hp,ENEMIES.bruiser.health,'no strike while stunned');assert.equal(f.system.pending,null);assert.equal(f.system.state.fight,'bruiser');
 control.update(1);f.system.update(2.4,5);assert.equal(f.a.hp,ENEMIES.bruiser.health,'fresh full windup');f.system.update(.2,5.2);assert.ok(f.a.hp<ENEMIES.bruiser.health);
 const before=f.health.value;f.a.control.apply({kind:'stun',duration:10,protection:0});f.system.update(5,10);assert.equal(f.health.value,before,'a stunned enemy cannot attack');
});

test('Auto uses learned abilities whenever eligible and affordable, respecting goals, the queue and Pacifist',()=>{
 const f=assistFixture({hp:100});f.styles.learnAbility('strongStrike');f.combat.fighting=true;
 f.assistance.update(.2);assert.equal(f.combat.pending,'strongStrike');assert.equal(f.combat.pendingManual,null,'queued as an Auto request');
 // Already queued or committed: no second request.
 f.combat.pending=null;f.combat.committedAbility='Strong Strike';f.assistance.update(.2);assert.equal(f.combat.pending,null);f.combat.committedAbility=null;
 f.resources.energy.value=49;f.assistance.update(.2);assert.equal(f.combat.pending,null,'needs 50 Energy');f.resources.energy.value=100;
 f.assistance.setGoal('technique');f.assistance.update(.2);assert.equal(f.combat.pending,null,'Strong Strike would redirect XP to Power');
 f.assistance.setGoal('power');f.assistance.update(.2);assert.equal(f.combat.pending,'strongStrike');f.combat.pending=null;
 f.assistance.setControl('manual');f.assistance.update(.2);assert.equal(f.combat.pending,null,'Manual never acts');f.assistance.setControl('auto');
 f.assistance.setPacifist(true);f.assistance.update(.2);assert.equal(f.combat.pending,null);f.assistance.setPacifist(false);
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

test('the follow-through after a release keeps the attack that struck; the next attack shows after recovery',()=>{
 const f=combatFixture('target',null,{openingWindup:null});f.inventory.copperDagger=1;f.equipment.toggle('copperDagger','main');f.equipment.setAttackHands('alternate');f.system.start(f.a);
 assert.equal(f.equipment.attackHands,'alternate');
 const struck=f.system.update(2.5,2.5);assert.equal(struck.profile.hand,'main');assert.equal(struck.profile.item,'copperDagger','recovery shows the dagger stab');
 const windup=f.system.update(2.0,4.5);assert.equal(windup.kind,'Combat');assert.equal(windup.profile.hand,'off','the next windup is the off-hand punch');assert.equal(windup.profile.item,null);
 assert.equal(f.system.nextHand,'off');
});
