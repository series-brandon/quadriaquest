import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createCombatSystem,OPENING_WINDUP,RANGED_WINDUP,attackWindup} from './combat.js';
import {PROJECTILE_FLIGHT} from './combat-animation.js';
import {CAST_TIMING} from './combat-motion.js';
import {createCombatStyles} from './combat-styles.js';
import {createEquipment,GEAR} from './equipment.js';
import {createPlayerHealth,createFoodSystem} from './player-health.js';
import {cancelPlayerActions} from './action-interruption.js';
import {createRecipeCrafting} from './recipe-crafting.js';
import {ENEMIES} from './combat-rules.js';
import {footprintGap} from './footprint.js';
import {markCharacter} from './world-occupancy.js';
import {findPath} from './world.js';
import {createCharacter} from './character.js';
import {createResource} from './player-resources.js';
import {totalXpForLevel,XP_BASE} from './combat-formulas.js';
// roll .5: ordinary hit both ways (no crit, dodge, block or 1% enemy miss). roll .005: enemy misses; player crits.
const BRUISER_HIT=12,PLAYER_INTERVAL=2.55/1.02,CAST_INTERVAL=3/1.02;
// openingWindup: null pins full-windup timing for tests of other mechanics (the opening is tested separately).
function fixture(kind='bruiser',{openingWindup}={}){
 const world=new Map();for(let z=0;z<7;z++)for(let x=0;x<7;x++)world.set(`${x},${z}`,{x,z,h:1,blocked:false,water:false});
 const sounds=[],started=[],faced=[],home=world.get('3,3'),inventory={swords:1,shields:1},health=createPlayerHealth(30),skills={};let tile=world.get('3,4'),reach=true,blocked=false,safe=false,reserved=new Set(),rewards=0,respawnAllowed=true,respawns=0,roll=.5,interrupts=0,attacks=0,wins=0,toasts=[],food,craft;const character=createCharacter(),mana=createResource(),energy=createResource();let auraResistance=0;
 // As in the game: equipment may change mid-fight (only defeat blocks it).
 const equipment=createEquipment({inventory,busy:()=>system.busy});let telegraph=null;
 // One strike per attack keeps these mechanic tests' arithmetic simple; dual wielding (both hands,
 // the default with two free hands) is covered in combat-systems.test.js.
 equipment.setAttackHands('main');
 const styles=createCombatStyles({equipment,busy:()=>system.working});
 const interrupt=()=>{interrupts++;cancelPlayerActions({food,craft},{keepCombat:true,keepFood:true});};
 const system=createCombatSystem({telegraph:(owner,tiles)=>{telegraph=tiles;},openingWindup,world,health,equipment,inventory,character,mana,energy,knowsAbility:id=>styles.knowsAbility(id),knowsSpell:id=>styles.knowsSpell(id),resistanceBonus:()=>auraResistance,strategy:()=>styles.strategy,won(){wins++;},toast:m=>toasts.push(m),attack:()=>styles.attack,player:new Group(),random:()=>roll,stop:interrupt,interrupt,attacked(){attacks++;},eating:()=>food?.working,defeatStop(){system.cancel();food?.cancel();},blocked:()=>blocked,safe:()=>safe,inReach:()=>reach,tile:()=>tile,reserved:t=>reserved.has(t),face(x,z){faced.push([x,z]);},sound(name){sounds.push(name);},soundStart(name,arg){const h={name,arg,stopped:false,stop(){h.stopped=true;}};started.push(h);return h;},hit(){},reward(){rewards++;},respawn(){if(!respawnAllowed)return false;respawns++;tile=world.get('0,0');return true;}});
 food=createFoodSystem({inventory,health,stop:interrupt,busy:()=>system.busy,consumed:()=>system.consumableUsed()});
 craft=createRecipeCrafting({inventory,skill:{level:1,xp:0},stop(){},busy:()=>system.working,completed(){}});
 const a=system.add({kind,aggressive:false,rules:ENEMIES[kind],group:kind==='target'?new Group():markCharacter(new Group()),tile:home,home,x:3,z:3,scale:1,patrol:{minX:2,maxX:4,minZ:2,maxZ:4}});
 return {sounds,started,faced,system,a,food,craft,character,mana,energy,toasts,set auraResistance(v){auraResistance=v;},get wins(){return wins;},get interrupts(){return interrupts;},get attacks(){return attacks;},health,equipment,styles,inventory,world,home,reserved,get telegraph(){return telegraph;},get rewards(){return rewards;},get respawns(){return respawns;},set tile(t){tile=t;},set reach(v){reach=v;},set blocked(v){blocked=v;},set safe(v){safe=v;},set respawnAllowed(v){respawnAllowed=v;},set roll(v){roll=v;}};
}
test('equipment is available without an area, guards stale actions, and clears missing items',()=>{
 const inventory={swords:1,shields:1};let busy=false;const e=createEquipment({inventory,busy:()=>busy});
 assert.ok(e.toggle('swords'));assert.ok(e.isEquipped('swords'));const action=e.inventoryActions('shields')[0];busy=true;assert.equal(action.run(),false);assert.equal(e.isEquipped('shields'),false);busy=false;assert.ok(action.run());inventory.swords=0;assert.equal(e.isEquipped('swords'),false);e.reset();assert.ok(Object.values(e.state).every(value=>value===false));
});
test('unarmed and equipped fights win once, award per-attack XP, retain equipment, and reset for repeated combat',()=>{
 const f=fixture('scrapper');assert.ok(f.system.start(f.a));assert.equal(f.system.start(f.a),false);for(let i=0;i<30;i++)f.system.update(1.5,i);assert.equal(f.wins,1);assert.equal(f.a.opened,true);assert.equal(f.home.blocked,false);
 // Unarmed Technical: strategy XP to Melee Technique and the same amount to Unarmed proficiency, 50 + 1 × HP removed per attack.
 const technique=f.character.tracks['melee.technique'].xp;assert.equal(technique,f.character.tracks['prof.unarmed'].xp);assert.equal(technique,8*XP_BASE+ENEMIES.scrapper.health);assert.ok(f.character.core.xp>0);
 f.system.reset();f.equipment.toggle('swords');f.equipment.toggle('shields');assert.ok(f.system.start(f.a));for(let i=0;i<15;i++)f.system.update(1.5,i);assert.equal(f.wins,2);assert.ok(f.character.tracks['prof.sword'].xp>0);assert.equal(f.inventory.swords,1);assert.equal(f.equipment.isEquipped('swords'),true);
});
test('enemy misses, shield mitigation, shield XP and protected training health use shared rules',()=>{
 const f=fixture();f.roll=.005;f.system.start(f.a);f.system.update(PLAYER_INTERVAL,2.5);assert.ok(f.a.hp<ENEMIES.bruiser.health);f.system.update(2.5,5);assert.equal(f.health.value,30,'1% enemy miss');f.system.cancel();
 f.roll=.5;f.equipment.toggle('shields');f.system.start(f.a);f.system.update(2.5,7.5);f.system.update(2.5,10);
 // Wooden Shield +30 and starting Defense/Toughness/Shield proficiency: 3.11% of a 12 roll still rounds to 12.
 assert.equal(f.health.value,30-BRUISER_HIT);assert.equal(f.character.tracks['prof.shield'].xp,XP_BASE+BRUISER_HIT);
 const training=fixture('scrapper');training.health.value=1;training.system.start(training.a);training.system.update(2.5,3);training.system.update(2.5,5.5);assert.equal(training.health.value,1);assert.equal(training.system.busy,false);
});
test('movement starts pursuit, reengagement preserves damage, leash returns safely',()=>{
 const f=fixture();f.system.start(f.a);f.system.update(2.5,1);const hp=f.a.hp;assert.ok(hp<ENEMIES.bruiser.health);f.system.disengage();assert.equal(f.system.state.chase,'bruiser');assert.equal(f.system.matches(f.a),false);assert.ok(f.system.start(f.a));assert.equal(f.a.hp,hp);
 f.system.disengage();f.system.setAutoRetaliate(false);f.a.leash=5;f.tile=f.world.get('0,0');f.reserved.add(f.home);f.system.update(.1,8);assert.equal(f.system.state.chase,null);assert.equal(f.a.returning,true);assert.equal(f.a.occupying,true);assert.equal(f.a.group.visible,true);f.reserved.clear();f.system.update(.1,6);assert.equal(f.a.returning,false);assert.equal(f.a.hp,ENEMIES.bruiser.health);
});
test('defeat waits for a safe respawn, preserves items and equipment, and can repeat',()=>{
 const f=fixture();f.equipment.toggle('shields');f.health.value=1;f.system.start(f.a);f.system.update(2.5,2.5);f.system.update(2.5,5);assert.equal(f.system.busy,true);f.respawnAllowed=false;f.system.update(5,7);assert.equal(f.respawns,0);assert.equal(f.health.value,0);f.respawnAllowed=true;f.system.update(.1,8);assert.equal(f.respawns,1);assert.equal(f.health.value,30);assert.equal(f.equipment.isEquipped('shields'),true);assert.equal(f.inventory.swords,1);f.system.lose();f.system.update(5,13);assert.equal(f.respawns,2);
});
test('map identity, cancellation, removal and reset cannot duplicate rewards or leave occupancy',()=>{
 const f=fixture('bruiser',{openingWindup:null});f.system.start(f.a);f.system.update(.5,1);f.world.set('3,3',{...f.home,blocked:false});f.system.update(10,11);assert.equal(f.system.working,false);assert.equal(f.rewards,0);assert.equal(f.a.group.visible,false);f.world.set('3,3',f.home);f.system.update(.1,12);assert.ok(f.system.start(f.a));f.system.remove(f.a);f.system.update(10,22);assert.equal(f.rewards,0);assert.equal(f.home.blocked,false);assert.equal(f.system.start(f.a),false);
});
test('wandering uses configured bounds and occupies its destination instead of the vacated tile',()=>{
 const f=fixture();f.roll=0;f.system.update(4,4);assert.notEqual(f.a.tile,f.home);assert.equal(f.system.occupies(f.home),false);assert.equal(f.system.occupies(f.a.tile),true);assert.equal(f.a.tile.blocked,false,'creatures are walk-through');assert.ok(f.a.x>=2&&f.a.x<=4&&f.a.z>=2&&f.a.z<=4);assert.notEqual(f.a.tile,f.world.get('3,4'));
});
test('hat equipment uses the same inventory-backed state as weapons',()=>{
 const inventory={hats:1};const e=createEquipment({inventory});assert.equal(e.inventoryActions('hats')[0].label,'Equip');assert.ok(e.toggle('hats'));assert.ok(e.isEquipped('hats'));assert.equal(e.inventoryActions('hats')[0].label,'Unequip');inventory.hats=0;assert.equal(e.isEquipped('hats'),false);
});

test('ranged shots consume ammo once at release, hit on impact and exhaust without negative ammo',()=>{
 // Training Bow at starting stats: 6–22; roll .5 → 14.
 const f=fixture('scrapper');f.inventory.bows=1;f.inventory.arrows=1;f.equipment.toggle('bows');f.system.start(f.a);f.system.update(2.5,2.5);assert.equal(f.inventory.arrows,0);assert.equal(f.a.hp,ENEMIES.scrapper.health);f.system.update(.23,2.73);assert.equal(f.a.hp,ENEMIES.scrapper.health-14);assert.ok(f.character.tracks['prof.bow'].xp>0);assert.ok(f.character.tracks['ranged.technique'].xp>0);f.system.update(2.5,5.3);assert.equal(f.system.state.fight,null);assert.equal(f.system.state.chase,'scrapper');assert.equal(f.inventory.arrows,0);assert.equal(f.system.start(f.a),false);
});
test('committed projectile survives retreat once, while travel/reset discards pending impacts without refund',()=>{
 const f=fixture('scrapper');f.inventory.bows=1;f.inventory.arrows=5;f.equipment.toggle('bows');f.system.start(f.a);f.system.update(2.5,2);f.system.disengage();f.system.update(.23,3);assert.equal(f.a.hp,ENEMIES.scrapper.health-14);assert.equal(f.inventory.arrows,4);f.system.clear();f.system.start(f.a);f.system.update(2.5,4);f.system.clear();f.system.update(5,9);assert.equal(f.a.hp,ENEMIES.scrapper.health);assert.equal(f.wins,0);assert.equal(f.inventory.arrows,3);
});
test('inert targets never attack, award half XP below level 3, spend Mana per cast and respawn via the shared lifecycle',()=>{
 // Energy Strike at starting stats: 1–22; roll .5 → 12. Four casts leave 2 HP; the fifth removes 2.
 const f=fixture('target');f.a.respawn=1;f.styles.learn('energyStrike');f.styles.select('energyStrike');f.system.start(f.a);for(let i=0;i<20&&!f.a.opened;i++)f.system.update(1,i);
 assert.equal(f.a.opened,true);assert.equal(f.health.value,30);assert.equal(f.mana.value,100-5*4);
 const expected=.5*(4*(XP_BASE+12)+(XP_BASE+2));assert.equal(f.character.tracks['magic.technique'].xp,expected);assert.equal(f.character.tracks['prof.energy'].xp,expected);
 f.system.update(3,21);assert.equal(f.a.opened,false);assert.equal(f.a.hp,ENEMIES.target.health);assert.ok(f.system.start(f.a));f.system.disengage();assert.equal(f.system.state.chase,null);
});
test('practice target XP stops at each receiving track level 3 without overflow',()=>{
 const f=fixture('target');f.character.setLevel('melee.technique',3);f.character.tracks['prof.unarmed'].xp=850;f.system.start(f.a);f.system.update(2.5,2.5);
 const threshold=totalXpForLevel(3);
 assert.equal(f.character.tracks['melee.technique'].xp,Math.ceil(threshold),'already at the cap: no XP');
 assert.equal(f.character.tracks['prof.unarmed'].xp,threshold,'truncated to the level-3 threshold');assert.equal(f.character.tracks['prof.unarmed'].level,3);
});
test('unaffordable spells pause with the target retained, explain once, and resume when Mana returns',()=>{
 const f=fixture('target');f.styles.learn('energyStrike');f.styles.select('energyStrike');f.mana.value=3;f.system.start(f.a);for(let i=0;i<10;i++)f.system.update(1,i);
 assert.equal(f.a.hp,ENEMIES.target.health);assert.equal(f.toasts.length,1);assert.equal(f.system.state.fight,'target');
 f.mana.value=100;f.system.update(CAST_INTERVAL,11);f.system.update(.23,12);assert.ok(f.a.hp<ENEMIES.target.health);assert.equal(f.mana.value,96);
});

function frames(f,seconds,dt=.02){let result;for(let t=0;t<seconds;t+=dt)result=f.system.update(dt,t);return result;}
test('ranged targeting and release stay passive; the impact starts continuous pursuit',()=>{
 const f=fixture();f.inventory.bows=1;f.inventory.arrows=10;f.equipment.toggle('bows');f.tile=f.world.get('3,6');
 const initial=f.a.group.position.clone();f.system.start(f.a);frames(f,RANGED_WINDUP+PROJECTILE_FLIGHT-.06);assert.equal(f.a.aggro,false);assert.equal(f.a.hp,ENEMIES.bruiser.health);assert.deepEqual(f.a.group.position.toArray(),initial.toArray());frames(f,.3);assert.equal(f.a.aggro,true);assert.ok(f.a.hp<ENEMIES.bruiser.health);
 frames(f,1);assert.ok(f.a.group.position.distanceTo(initial)>0);
 let previous=f.a.group.position.clone();for(let i=0;i<50;i++){f.system.update(.02,i);assert.ok(f.a.group.position.distanceTo(previous)<=.04001);previous.copy(f.a.group.position);}
});
test('leash return walks visibly, retains destination occupancy, waits for home and heals only on arrival',()=>{
 const f=fixture();f.system.start(f.a);frames(f,2.52);const hurt=f.a.hp;f.tile=f.world.get('3,6');f.system.disengage();frames(f,.8);assert.notEqual(f.a.tile,f.home);
 f.a.leash=5;f.tile=f.world.get('0,0');f.reserved.add(f.home);let previous=f.a.group.position.clone();f.system.update(.02,2);assert.ok(f.a.returning);assert.equal(f.a.hp,hurt);assert.ok(f.a.group.visible);assert.ok(f.a.occupying);assert.ok(f.a.group.position.distanceTo(previous)<=.04001);
 frames(f,1);assert.ok(f.a.returning);f.reserved.clear();
 for(let i=0;i<150;i++){previous.copy(f.a.group.position);f.system.update(.02,i);assert.ok(f.a.group.position.distanceTo(previous)<=.04001);if(!f.a.returning)break;}
 assert.equal(f.a.returning,false);assert.equal(f.a.tile,f.home);assert.equal(f.a.hp,ENEMIES.bruiser.health);
});
test('enemy cannot hit from a logically adjacent tile before its body arrives',()=>{
 const f=fixture();f.tile=f.world.get('3,5');f.a.rules={...f.a.rules,interval:.1};f.a.aggro=true;f.system.start(f.a);f.system.update(.02,0);assert.equal(f.a.z,4);assert.equal(f.health.value,30);assert.ok(f.a.group.position.z<4-6);frames(f,.2);assert.equal(f.health.value,30);
});
test('a hit taken while casting keeps the cast animation, never a block',()=>{
 const f=fixture('bruiser',{openingWindup:null});f.styles.learn('energyStrike');f.styles.select('energyStrike');f.equipment.toggle('shields');
 f.a.rules={...f.a.rules,interval:.6};f.a.aggressive=true;f.system.start(f.a);
 const hit=f.system.update(.6,.6);assert.equal(hit.kind,'Casting','the enemy hit lands mid-cast');
});
test('incoming hits select equipment-aware blocking, but simultaneous player attacks win',()=>{
 const f=fixture('bruiser',{openingWindup:null});f.equipment.toggle('swords');f.equipment.toggle('shields');f.a.rules={...f.a.rules,interval:.6};f.a.aggressive=true;f.system.start(f.a);const block=f.system.update(.6,.6);assert.equal(block.kind,'Block');assert.equal(block.profile.rightHand,'swords');assert.equal(block.profile.leftHand,'shields');
 f.system.reset();f.a.rules={...f.a.rules,interval:2.5};f.system.start(f.a);const simultaneous=f.system.update(2.5,2.5);assert.equal(simultaneous.kind,'Combat');assert.equal(simultaneous.profile.item,'swords');assert.ok(f.health.value<30);
 f.system.clear();assert.equal(f.system.update(.02,2),null);
});

for(const style of ['unarmed','ranged','magic'])for(const outcome of ['damage','dodge','zero'])test(`${style} provokes only at resolution, including ${outcome}`,()=>{
 const f=fixture('bruiser',{openingWindup:null});f.styles.learn('energyStrike');
 // Production attack definitions; enemy configuration forces dodge or full resistance deterministically.
 // Real equipment/spell selection: bow equipped with arrows, or Energy Strike selected.
 if(style==='ranged'){f.inventory.bows=1;f.inventory.arrows=10;f.equipment.toggle('bows');}
 if(style==='magic')f.styles.select('energyStrike');
 if(outcome==='dodge')f.a.rules={...f.a.rules,canDodge:true,dodgePercent:100};
 if(outcome==='zero')f.a.rules={...f.a.rules,resistancePct:{melee:100,ranged:100,magic:100}};
 const interval=style==='magic'?CAST_INTERVAL:PLAYER_INTERVAL;
 f.system.start(f.a);frames(f,interval-.04);assert.equal(f.a.aggro,false);assert.equal(f.a.hp,ENEMIES.bruiser.health);
 frames(f,.06);assert.equal(f.a.aggro,style==='unarmed');
 if(style!=='unarmed')frames(f,.24);
 assert.equal(f.a.aggro,true);assert.equal(f.a.hp<ENEMIES.bruiser.health,outcome==='damage');
 // Base XP is still earned for resolved attempts that remove no HP.
 assert.ok(f.character.tracks[`${style==='unarmed'?'melee':style}.technique`].xp>=XP_BASE);
});
test('passive creatures ignore proximity; aggressive awareness respects configured radius and obstacles',()=>{
 const f=fixture();frames(f,.5);assert.equal(f.a.aggro,false);
 f.a.aggressive=true;f.a.aggroRange=1;f.tile=f.world.get('3,6');frames(f,.1);assert.equal(f.a.aggro,false);
 f.tile=f.world.get('3,4');f.blocked=true;frames(f,.1);assert.equal(f.a.aggro,false);f.blocked=false;
 f.world.get('3,4').h=3;frames(f,.1);assert.equal(f.a.aggro,false);f.world.get('3,4').h=1;
 frames(f,.1);assert.equal(f.a.aggro,true);assert.equal(f.system.state.fight,null);
});
test('auto-retaliate responds to incoming misses, Off permits manual combat, and clear preserves preference',()=>{
 const f=fixture();f.a.aggressive=true;f.roll=.005;frames(f,2.6);assert.equal(f.system.state.fight,'bruiser');assert.equal(f.health.value,30);
 f.system.clear();f.system.setAutoRetaliate(false);frames(f,2.6);assert.equal(f.system.state.fight,null);assert.equal(f.a.aggro,true);
 assert.ok(f.system.start(f.a));f.system.setAutoRetaliate(true);f.system.setAutoRetaliate(false);assert.equal(f.system.state.fight,'bruiser');
 f.system.clear();assert.equal(f.a.aggro,false);assert.equal(f.system.autoRetaliate,false);
});
test('eating mid-fight heals at once, restarts the windup, clears the pending action and keeps the fight',()=>{
 const f=fixture('bruiser',{openingWindup:null});f.health.value=5;f.inventory.cookedFish=2;f.styles.learnAbility('strongStrike');f.system.start(f.a);frames(f,1.5);const hp=f.a.hp;
 f.system.queue('strongStrike');assert.equal(f.system.pending,'strongStrike');
 assert.ok(f.food.start('cookedFish'));assert.equal(f.health.value,25);assert.equal(f.inventory.cookedFish,1);assert.equal(f.system.pending,null,'queued ability cleared');assert.equal(f.system.state.fight,'bruiser');
 assert.equal(f.food.start('cookedFish'),false,'shared cooldown');assert.equal(f.inventory.cookedFish,1);
 frames(f,2.4);assert.equal(f.a.hp,hp,'fresh full windup after eating');frames(f,.2);assert.ok(f.a.hp<hp);assert.equal(f.energy.value,100,'no Strong Strike was spent');
});
test('combat can begin during the eating animation; defeat ends the animation and the meal stays eaten',()=>{
 const f=fixture();f.inventory.cookedFish=1;f.health.value=10;f.food.start('cookedFish');assert.equal(f.inventory.cookedFish,0);f.system.start(f.a);assert.ok(f.food.working);
 f.a.aggressive=true;f.health.value=1;frames(f,2.6);assert.equal(f.system.busy,true);assert.equal(f.food.working,false);f.food.update(10);assert.equal(f.inventory.cookedFish,0);
});
test('Strong Strike attaches to the next melee windup, spends 50 Energy on impact, trains Melee Power and does not repeat',()=>{
 const f=fixture('target',{openingWindup:null});assert.equal(f.system.queue('strongStrike'),'Not learned');f.styles.learnAbility('strongStrike');
 assert.equal(f.system.queue('strongStrike'),true);f.system.start(f.a);assert.equal(f.system.committedAbility,'Strong Strike');assert.equal(f.system.pending,null);
 // Unarmed Strong Strike at starting stats: 22–44; roll .5 → 33.
 // Strong strategy's −2 Speed cancels the starting +2: this attack takes the full 2.55s base.
 f.system.update(2.5,2.5);assert.equal(f.a.hp,ENEMIES.target.health);f.system.update(.06,2.56);assert.equal(f.a.hp,ENEMIES.target.health-33);assert.equal(f.energy.value,50);assert.ok(f.character.tracks['melee.power'].xp>0);assert.equal(f.character.tracks['melee.technique'].xp,0);
 assert.equal(f.system.committedAbility,null);f.system.update(2.5,5.06);assert.equal(f.a.hp,ENEMIES.target.health-33-7);assert.equal(f.energy.value,50);
});
test('Strong Strike rejects ranged attacks and missing Energy, and cancels if Energy drops before impact',()=>{
 const f=fixture('target',{openingWindup:null});f.styles.learnAbility('strongStrike');f.energy.value=40;f.system.queue('strongStrike');f.system.start(f.a);
 assert.equal(f.system.committedAbility,null);assert.match(f.toasts.at(-1),/Not enough Energy/);assert.equal(f.system.pending,null);f.system.cancel();
 f.energy.value=100;f.system.queue('strongStrike');f.system.start(f.a);assert.equal(f.system.committedAbility,'Strong Strike');f.system.update(1,1);f.energy.value=10;f.system.update(1.6,2.6);// past the 2.55s Strong windup
 assert.equal(f.a.hp,ENEMIES.target.health,'cancelled windup deals nothing');assert.equal(f.energy.value,10,'nothing spent');assert.equal(f.system.committedAbility,null);assert.match(f.toasts.at(-1),/cancelled/);
 f.system.update(2.5,5.1);assert.equal(f.a.hp,ENEMIES.target.health-7,'next ordinary attack after a full interval');f.system.cancel();
 f.inventory.bows=1;f.inventory.arrows=5;f.equipment.toggle('bows');f.system.queue('strongStrike');f.system.start(f.a);assert.equal(f.system.committedAbility,null);assert.match(f.toasts.at(-1),/needs a melee attack/);
 f.equipment.toggle('bows');f.system.cancel();f.system.queue('strongStrike');assert.equal(f.system.queue('strongStrike'),true);assert.equal(f.system.pending,null,'second press withdraws');f.system.queue('strongStrike');f.system.clear();assert.equal(f.system.pending,null,'travel/reset clears it');
});
test('Harden adds its resistance once to incoming hits',()=>{
 const f=fixture();f.auraResistance=10;f.system.start(f.a);f.system.update(2.5,2.5);f.system.update(2.5,5);
 // 12 × (1 − 10.1%) = 10.79 → 11.
 assert.equal(f.health.value,30-11);
});
test('combat interrupts real crafting before consumption and prevents restarting it',()=>{
 const f=fixture();Object.assign(f.inventory,{sticks:10,stone:10});assert.ok(f.craft.start('swords'));f.craft.update(.1);
 f.a.aggressive=true;frames(f,.1);assert.equal(f.craft.working,false);f.craft.update(100);assert.equal(f.inventory.swords,1);assert.equal(f.inventory.sticks,10);assert.equal(f.craft.start('swords'),false);
});
test('combat cancellation policy preserves food and combat while cancelling every other registered action',()=>{
 const called=[];const actions=Object.fromEntries(['combat','food','crafting','carpentry','fishing','cooking','smithing','gathering'].map(name=>[name,{cancel:()=>called.push(name)}]));
 cancelPlayerActions(actions,{keepCombat:true,keepFood:true});assert.deepEqual(called,['crafting','carpentry','fishing','cooking','smithing','gathering']);
 called.length=0;cancelPlayerActions(actions);assert.equal(called.length,8);
});

test('awareness cannot cross walls or safe zones and reset clears multiple aggressors',()=>{
 const f=fixture();f.a.aggressive=true;f.a.aggroRange=3;f.tile=f.world.get('3,6');
 f.world.get('3,5').blocksSight=true;frames(f,.1);assert.equal(f.a.aggro,false);f.world.get('3,5').blocksSight=false;
 f.safe=true;frames(f,.1);assert.equal(f.a.aggro,false);f.safe=false;frames(f,.1);assert.equal(f.a.aggro,true);
 const home=f.world.get('4,5');const other=f.system.add({kind:'scrapper',aggressive:true,aggroRange:3,rules:ENEMIES.scrapper,group:new Group(),tile:home,home,x:4,z:5,scale:1});
 frames(f,.1);assert.equal(other.aggro,true);f.system.clear();assert.equal(other.aggro,false);assert.equal(f.a.aggro,false);assert.equal(f.system.working,false);
});

test('incoming misses notify responsive UI just like damaging attacks',()=>{
 for(const roll of [.5,.005]){const f=fixture();f.roll=roll;f.a.aggressive=true;f.system.setAutoRetaliate(false);frames(f,2.6);assert.equal(f.attacks,1);assert.equal(f.health.value===30,roll===.005);}
});

test('quick spell queues one cast for the next attack, opens a fight with it, then the normal attack resumes',()=>{
 const f=fixture('target');
 assert.equal(f.system.queueSpell('energyStrike'),'Not learned');
 f.styles.learn('energyStrike');
 assert.equal(f.system.queueSpell('energyStrike'),true);assert.equal(f.system.queuedSpell,'energyStrike');
 assert.equal(f.system.queueSpell('energyStrike'),true);assert.equal(f.system.queuedSpell,null,'pressing again withdraws');
 f.system.queueSpell('energyStrike');
 // Queued outside combat: the opening attack is the cast; the slot is then empty.
 assert.ok(f.system.start(f.a));assert.equal(f.system.queuedSpell,null);
 assert.equal(f.system.update(.1,0).kind,'Casting');
 f.system.update(CAST_INTERVAL,1);f.system.update(.23,2);
 assert.ok(f.a.hp<ENEMIES.target.health,'the cast landed');assert.equal(f.mana.value,96);
 assert.equal(f.system.update(.1,3).kind,'Combat','the selected (unarmed) attack resumes');
});

test('quick spell replaces a pending ability, is refused when unaffordable, and is cleared by eating',()=>{
 const f=fixture('target');f.styles.learn('energyStrike');f.styles.learnAbility('strongStrike');
 f.system.queue('strongStrike');f.system.queueSpell('energyStrike');
 assert.equal(f.system.pending,null);assert.equal(f.system.queuedSpell,'energyStrike');
 f.system.queue('strongStrike');assert.equal(f.system.queuedSpell,null,'the newest manual request wins');assert.equal(f.system.pending,'strongStrike');
 f.system.queueSpell('energyStrike');f.mana.value=2;f.system.start(f.a);
 assert.match(f.toasts.at(-1),/Not enough Mana for Energy Strike/);assert.equal(f.system.update(.1,0).kind,'Combat');
 f.mana.value=100;f.system.queueSpell('energyStrike');f.inventory.cookedFish=1;f.health.value=10;
 assert.ok(f.food.start('cookedFish'));assert.equal(f.system.queuedSpell,null);
});

test('a ready melee attacker opens with a short windup; then attacks keep the full interval',()=>{
 const f=fixture('target');f.system.start(f.a);
 frames(f,OPENING_WINDUP-.1);assert.equal(f.a.hp,ENEMIES.target.health,'still winding up');
 frames(f,.15);const afterOpening=f.a.hp;assert.ok(afterOpening<ENEMIES.target.health,'the opening strike lands after the short windup');
 frames(f,2.3);assert.equal(f.a.hp,afterOpening,'the next attack takes a full interval');
 frames(f,.3);assert.ok(f.a.hp<afterOpening);
});

test('re-engaging right after a strike is not ready; idling for an interval is',()=>{
 // Practice targets reset when left, so compare against the health at each re-engagement.
 const f=fixture('target');f.system.start(f.a);frames(f,OPENING_WINDUP+.05);assert.ok(f.a.hp<ENEMIES.target.health);
 f.system.cancel();assert.ok(f.system.start(f.a));const again=f.a.hp;
 frames(f,OPENING_WINDUP+.1);assert.equal(f.a.hp,again,'no extra opening by stepping away');
 f.system.cancel();frames(f,2.6);assert.ok(f.system.start(f.a));const rested=f.a.hp;
 frames(f,OPENING_WINDUP+.05);assert.ok(f.a.hp<rested,'ready again after a full interval without striking');
});

test('windups by style: a bow opens after its draw, a spell after its whole cast, and weapons may override',()=>{
 const f=fixture('target');f.inventory.bows=1;f.inventory.arrows=5;f.equipment.toggle('bows');f.system.start(f.a);
 frames(f,RANGED_WINDUP-.05);assert.equal(f.a.hp,ENEMIES.target.health,'still drawing');
 frames(f,PROJECTILE_FLIGHT+.15);const first=f.a.hp;assert.ok(first<ENEMIES.target.health,'the first arrow lands right after the draw, not a full interval');
 frames(f,1.5);assert.equal(f.a.hp,first,'later shots take their full interval');
 const g=fixture('target');g.styles.learn('energyStrike');g.styles.select('energyStrike');g.system.start(g.a);
 frames(g,1);assert.equal(g.a.hp,ENEMIES.target.health,'a spell casts in full');
 assert.equal(attackWindup({combatStyle:'magic',interval:2.9}),2.9);assert.equal(attackWindup({combatStyle:'melee',interval:2.5}),OPENING_WINDUP);
 assert.equal(attackWindup({combatStyle:'ranged',interval:2.5,windup:.4}),.4,'a weapon or spell can set its own windup');
 assert.equal(attackWindup({combatStyle:'ranged',interval:.9}),.9,'never longer than the interval');
});

test('an aggressive enemy opens with a short windup once in reach, then keeps its interval',()=>{
 const f=fixture('bruiser');f.a.aggressive=true;const start=f.health.value;const hits=[];let time=0;
 for(let i=0;i<300&&hits.length<2;i++){f.system.update(.02,time+=.02);if(f.health.value<(hits.at(-1)?.health??start))hits.push({time,health:f.health.value});}
 assert.equal(hits.length,2);
 assert.ok(hits[0].time<=OPENING_WINDUP+.1,`first enemy hit at ${hits[0].time.toFixed(2)}s`);
 assert.ok(hits[1].time-hits[0].time>=ENEMIES.bruiser.interval-.03,'then a full interval between hits');
});

test('the golem slam: leaving early cancels it, after the commit point it locks 3×3 tiles, and standing on them at impact is deadly',()=>{
 const f=fixture('golem');f.a.aggressive=true;f.a.control.apply({kind:'immobilize',duration:99,protection:0});
 let time=0;const step=s=>{for(let t=0;t<s;t+=.02)f.system.update(.02,time+=.02);};
 const near=f.world.get('3,4'),away=f.world.get('3,6'),interval=ENEMIES.golem.interval;
 step(interval/2-.2);f.tile=away;step(1.2);assert.equal(f.health.value,30,'left in the first half: cancelled');
 // Back in reach the windup starts again at once (no fresh cooldown). Past halfway it locks the tiles.
 f.tile=near;step(interval/2+.1);assert.equal(f.telegraph?.length,9,'3×3 tiles marked at the commit point');
 assert.ok(f.telegraph.includes(near)&&!f.telegraph.includes(away));
 f.tile=away;step(interval/2);assert.equal(f.health.value,30,'off the marked tiles at impact: dodged');assert.ok(f.sounds.includes('whiff'));assert.equal(f.telegraph,null);
 f.tile=near;step(interval+.2);assert.equal(f.health.value,0,'standing on the marked tiles: one slam ends a tutorial player');
 assert.ok(ENEMIES.golem.max>=450&&ENEMIES.golem.attacksPacifists&&ENEMIES.golem.xpMultiplier===0);
});
test('the golem punishes staying out of reach with a tile-targeted Rock Throw',()=>{
 const r=ENEMIES.golem.rangedAttack;
 const f=fixture('golem');f.a.aggressive=true;f.a.control.apply({kind:'immobilize',duration:99,protection:0});f.tile=f.world.get('3,5');
 let time=0;const step=s=>{for(let t=0;t<s;t+=.02)f.system.update(.02,time+=.02);};
 step(r.after-.2);assert.equal(f.telegraph,null,'no throw before it has waited');
 step(.2+r.windup/2+.1);assert.equal(f.telegraph?.length,9,'the throw locked the tiles around the player');
 step(r.windup/2+r.flight);assert.ok(f.health.value<30,'stayed on the marked tiles: hit');
 // A chasing golem (not held in place) stops to throw once the punish is ready.
 const c=fixture('golem');c.a.aggressive=true;c.tile=c.world.get('0,0');time=0;
 for(let t=0;t<r.after+r.windup/2+.4;t+=.02)c.system.update(.02,time+=.02);
 assert.ok(c.telegraph,'it stopped chasing and wound up a throw');assert.ok(footprintGap(c.a.tile,1,c.world.get('0,0'))>1);
 const g=fixture('golem');g.a.aggressive=true;g.a.control.apply({kind:'immobilize',duration:99,protection:0});g.tile=g.world.get('3,5');
 time=0;const gstep=s=>{for(let t=0;t<s;t+=.02)g.system.update(.02,time+=.02);};
 gstep(r.after+r.windup/2+.1);assert.ok(g.telegraph);g.tile=g.world.get('0,0');gstep(r.windup/2+r.flight+.1);assert.equal(g.health.value,30,'dodged the rock');
});
test('an enemy attack left in its first half is cancelled; past its commit point it lands wherever the player went',()=>{
 const setup=()=>{const f=fixture('bruiser');f.a.aggressive=true;f.a.control.apply({kind:'immobilize',duration:99,protection:0});return f;};
 const run=(f,s)=>{for(let t=0;t<s;t+=.01)f.system.update(.01,f.time=(f.time||0)+.01);};
 const early=setup();run(early,.15);early.tile=early.world.get('3,6');run(early,1);assert.equal(early.attacks,0,'escaped in the first half');
 early.tile=early.world.get('3,4');run(early,.4);assert.equal(early.attacks,0);run(early,.15);assert.equal(early.attacks,1,'back in reach: a fresh windup only, no new cooldown');
 const late=setup();run(late,.35);late.tile=late.world.get('3,6');run(late,.3);assert.equal(late.attacks,1,'committed: it lands even out of reach');
 // The cooldown keeps running while the player is away: returning after it ends needs only the windup.
 run(late,ENEMIES.bruiser.interval);late.tile=late.world.get('3,4');run(late,.45);assert.equal(late.attacks,1);run(late,.1);assert.equal(late.attacks,2);
});
test('walking into an enemy keeps its windup going while it shuffles beside the player',()=>{
 const f=fixture('bruiser');f.a.aggressive=true;let time=0;const run=s=>{for(let t=0;t<s;t+=.01)f.system.update(.01,time+=.01);};
 run(.15);f.tile=f.home;run(.4);assert.equal(f.attacks,1,'still landed');run(1);assert.notEqual(f.a.tile,f.home,'it moved off the shared tile');
});
test('a hand swap interrupts the unlanded attack; the next lands on the previous timer or the new windup, whichever is later',()=>{
 Object.assign(GEAR,{testQuick:{...GEAR.copperDagger,name:'Test Quick',baseInterval:1.2},testMaul:{...GEAR.swords,name:'Test Maul',baseInterval:4}});
 try{
  const hits=(f,seconds,swaps={})=>{const times=[];let t=0,hp=f.a.hp;const at=Object.entries(swaps).map(([k,v])=>[+k,v]);
   while(t<seconds-1e-9){f.system.update(.01,t);t+=.01;for(const s of at)if(!s.done&&t>=s[0]-1e-9){s.done=true;assert.ok(f.equipment.toggle(s[1],'right'),'equipping mid-fight is allowed');f.system.handsChanged();}
    if(f.a.hp<hp){times.push(t);hp=f.a.hp;}}return times;};
  const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<.03,`${msg}: ${a} vs ${b}`);
  const make=()=>{const f=fixture('target');Object.assign(f.inventory,{testQuick:1,testMaul:1});f.equipment.toggle('testQuick','right');return f;};
  const probe=make(),quick=probe.system.preview().interval;probe.equipment.toggle('testMaul','right');const maul=probe.system.preview().interval;assert.ok(maul>quick+1);
  // Quick stab, then the maul at once: it strikes on the quick timer, not its own.
  const a=make();a.system.start(a.a);const ta=hits(a,OPENING_WINDUP+quick+maul+.1,{[OPENING_WINDUP+.05]:'testMaul'});
  near(ta[0],OPENING_WINDUP,'opening');near(ta[1],OPENING_WINDUP+quick,'maul on the quick timer');near(ta[2],OPENING_WINDUP+quick+maul,'then its own interval');
  // Swapping mid-windup restarts the windup from the swap.
  const b=make();b.system.start(b.a);const swapAt=OPENING_WINDUP+quick-.2,tb=hits(b,swapAt+OPENING_WINDUP+.1,{[swapAt]:'testMaul'});
  assert.equal(tb.length,2);near(tb[1],swapAt+OPENING_WINDUP,'fresh windup after a mid-windup swap');
  // No timer running: only the new windup, no added delay.
  const c=make();c.system.start(c.a);const tc=hits(c,1,{.3:'testMaul'});near(tc[0],.3+OPENING_WINDUP,'opening windup restarted, nothing added');
 }finally{delete GEAR.testQuick;delete GEAR.testMaul;}
});
test('a hand swap leaves a released arrow in flight to land',()=>{
 const f=fixture('target');Object.assign(f.inventory,{bows:1,arrows:5});f.equipment.toggle('bows','right');
 f.system.start(f.a);let t=0;const hp=f.a.hp;while(f.inventory.arrows===5&&t<3){f.system.update(.01,t);t+=.01;}
 assert.equal(f.inventory.arrows,4,'released');f.equipment.toggle('swords','right');f.system.handsChanged();
 for(let s=0;s<PROJECTILE_FLIGHT+.05;s+=.01)f.system.update(.01,t+=.01);assert.ok(f.a.hp<hp,'the arrow landed');
});
test('a territory bounds aggression and pursuit; moveSpeed slows walking',()=>{
 const f=fixture('golem');Object.assign(f.a,{aggressive:true,territory:{minX:2,maxX:4,minZ:2,maxZ:4}});let time=0;const step=s=>{for(let t=0;t<s;t+=.02)f.system.update(.02,time+=.02);};
 f.tile=f.world.get('3,6');step(.5);assert.equal(f.a.aggro,false,'within awareness range but outside the territory');
 f.tile=f.world.get('3,4');step(.1);assert.equal(f.a.aggro,true);
 f.tile=f.world.get('3,6');step(.1);assert.equal(f.a.aggro,false,'leaving the territory ends pursuit');
 assert.ok(f.a.returning||f.a.tile===f.home);
 // Walking speed: a slow boss covers less ground than a goblin in the same time.
 const travelled=kind=>{const g=fixture(kind);Object.assign(g.a,{aggressive:true});g.tile=g.world.get('3,6');let t=0;for(let i=0;i<10;i++)g.system.update(.02,t+=.02);return g.a.group.position.distanceTo({x:g.home.x-6,y:g.home.h,z:g.home.z-6});};
 assert.ok(travelled('golem')<travelled('bruiser')*.7);
});
test('a 2×2 enemy occupies its four tiles without blocking them, fights from any side, pursues as a body and frees its tiles when removed',()=>{
 const f=fixture('bruiser');f.system.remove(f.a);f.tile=f.world.get('3,6');
 const home=f.world.get('2,1'),a=f.system.add({kind:'golem',size:2,aggressive:true,rules:{...ENEMIES.golem,rangedAttack:null},group:markCharacter(new Group()),tile:home,home,x:2,z:1,scale:1,patrol:{minX:1,maxX:3,minZ:0,maxZ:2}});
 const cells=['2,1','3,1','2,2','3,2'].map(k=>f.world.get(k));assert.ok(cells.every(c=>f.system.occupies(c)&&!c.blocked));
 assert.deepEqual(findPath(f.world,f.world.get('1,1'),f.world.get('4,1')).map(t=>`${t.x},${t.z}`),['2,1','3,1','4,1'],'walkers pass straight through its body');
 assert.equal(a.group.position.x,2.5-6,'the model stands at the body centre');
 let time=0;const step=s=>{for(let t=0;t<s;t+=.02)f.system.update(.02,time+=.02);};
 step(4);assert.equal(a.aggro,true);
 assert.equal(footprintGap(a.tile,2,f.world.get('3,6')),1,'it came to stand beside the player');
 const body=new Set(['0','1'].flatMap(dx=>['0','1'].map(dz=>`${a.tile.x+ +dx},${a.tile.z+ +dz}`)));
 for(const t of f.world.values()){assert.equal(f.system.occupies(t),body.has(`${t.x},${t.z}`),`only the current body is occupied (${t.x},${t.z})`);assert.equal(t.blocked,false);}
 f.system.remove(a);assert.ok([...f.world.values()].every(t=>!f.system.occupies(t)),'removal frees every body tile');
});
test('solid practice targets still block their tile; creatures never do',()=>{
 const t=fixture('target');assert.equal(t.home.blocked,true);t.system.remove(t.a);assert.equal(t.home.blocked,false);
 const f=fixture('scrapper');assert.equal(f.home.blocked,false);assert.equal(f.system.occupies(f.home),true);
});
test('a pursuer stops on a free spot beside the player, and passes through someone only when it must',()=>{
 const f=fixture('scrapper');f.a.aggressive=true;f.a.aggroRange=4;f.tile=f.world.get('3,6');
 const companion=f.world.get('3,5');f.reserved.add(companion);
 let time=0;const step=s=>{for(let t=0;t<s;t+=.02)f.system.update(.02,time+=.02);};
 step(3);assert.equal(f.a.aggro,true);assert.equal(footprintGap(f.a.tile,1,f.world.get('3,6')),1);assert.notEqual(f.a.tile,companion,'it avoids stopping on the companion');
 // Wall the other spots off: the occupied one is the only way in, so it is used anyway.
 const g=fixture('scrapper');g.a.aggressive=true;g.a.aggroRange=4;g.tile=g.world.get('3,6');g.reserved.add(g.world.get('3,5'));
 for(const k of ['2,6','4,6'])g.world.get(k).blocked=true;
 time=0;for(let t=0;t<3;t+=.02)g.system.update(.02,time+=.02);assert.equal(g.a.tile,g.world.get('3,5'));
});
test('a spell gathers audibly with its hands: from cast start to the toss, never right after a release or a kill, stopped when cancelled',()=>{
 const f=fixture('target');f.styles.learn('energyStrike');f.styles.select('energyStrike');f.system.start(f.a);
 const log=[];let t=0,releasedAt=null;
 for(;t<6.5;t+=.02){const before=f.started.length,released=f.sounds.length;f.system.update(.02,t);
  if(f.sounds.slice(released).includes('spellRelease'))releasedAt=t;
  if(f.started.length>before)log.push({t,arg:f.started.at(-1).arg,sinceRelease:releasedAt===null?null:t-releasedAt});}
 const interval=f.system.preview().interval;
 assert.ok(log.length>=2,'one gathering per cast');
 assert.ok(log[0].t<.05&&Math.abs(log[0].arg-(interval-CAST_TIMING.toss))<.05,'the first cast gathers from the start, as long as the hands do');
 for(const g of log.slice(1))assert.ok(g.sinceRelease>=CAST_TIMING.recover-.001,'waits for the follow-through after a release');
 assert.ok(f.sounds.includes('spellHit')&&!f.sounds.includes('hit'));
 // A killing spell: the fight ends with the impact, so no new gathering starts.
 const k=fixture('bruiser',{openingWindup:null});k.styles.learn('energyStrike');k.styles.select('energyStrike');k.a.hp=1;k.system.start(k.a);
 frames(k,interval+.6);assert.equal(k.a.opened,true,'defeated');assert.equal(k.started.length,1,'no buildup after the killing blow');assert.ok(k.started[0].stopped);
 // Cancelling mid-gather stops the sound.
 const c=fixture('target');c.styles.learn('energyStrike');c.styles.select('energyStrike');c.system.start(c.a);frames(c,1);
 assert.equal(c.started[0].stopped,false);c.system.cancel();c.system.update(.02,1.1);assert.equal(c.started[0].stopped,true);
 const m=fixture('target');m.system.start(m.a);frames(m,1);assert.ok(m.sounds.includes('hit'));assert.equal(m.started.length,0);
});


test('the player faces a large creature at its centre, not its anchor tile',()=>{
 const f=fixture('bruiser');f.system.remove(f.a);f.tile=f.world.get('1,2');
 const home=f.world.get('2,1'),a=f.system.add({kind:'golem',size:2,aggressive:false,rules:ENEMIES.golem,group:new Group(),tile:home,home,x:2,z:1,scale:1,patrol:{minX:2,maxX:2,minZ:1,maxZ:1}});
 assert.ok(f.system.start(a));frames(f,.1);assert.deepEqual(f.faced.at(-1),[2.5,1.5]);
});
test('Strong Strike sounds its charge when it attaches and lands with its own heavy hit',()=>{
 const f=fixture('target',{openingWindup:null});f.styles.learnAbility('strongStrike');f.energy.value=f.energy.max;
 assert.equal(f.system.queue('strongStrike'),true);f.system.start(f.a);
 assert.ok(f.sounds.includes('strongCharge'),'charges as the empowered windup begins');
 frames(f,3);assert.ok(f.sounds.includes('strongHit'),'heavy impact');
});
test('a held staff is a spell focus: its magic bonus raises spell damage, for casts and quick spells alike',async()=>{
 const {spellAttack,spellFocus,GEAR}=await import('./equipment.js'),{playerAttackProfile}=await import('./combat-profile.js'),{SPELLS}=await import('./combat-styles.js');
 const f=fixture('target');f.inventory.staffs=1;
 const bare=playerAttackProfile(f.character,spellAttack('energyStrike',SPELLS.energyStrike,{}),'technical');
 assert.equal(spellFocus({right:'swords'}),null);assert.equal(spellFocus({left:'staffs'}).item,'staffs');
 const focused=playerAttackProfile(f.character,spellAttack('energyStrike',SPELLS.energyStrike,{right:'staffs'}),'technical');
 assert.ok(focused.max>bare.max&&focused.min>=bare.min,'more damage with a staff');assert.ok(GEAR.staffs.magic.power>0);
 f.equipment.toggle('staffs');f.styles.learn('energyStrike');f.styles.select('energyStrike');assert.equal(f.styles.attack.focus,'staffs','the selected spell carries the focus');
 assert.equal(f.system.preview().max,focused.max,'combat uses it');
});
test('after a Rock Throw the golem chases again for the full delay before the next one',()=>{
 const r=ENEMIES.golem.rangedAttack,f=fixture('golem');f.a.aggressive=true;f.a.control.apply({kind:'immobilize',duration:99,protection:0});let at=f.world.get('3,6');f.tile=at;
 // Step aside each time a throw locks on, so the rocks miss and the fight goes on.
 let time=0,throws=0,was=null;const step=s=>{for(let t=0;t<s;t+=.02){f.system.update(.02,time+=.02);if(f.telegraph&&!was){throws++;at=f.world.get(at.x===3?'0,6':'3,6');f.tile=at;}was=f.telegraph;}};
 // First throw: released at after + windup. The next locks on no sooner than release + after + windup/2.
 const released=r.after+r.windup,next=released+r.after+r.windup/2;
 step(released+.1);assert.equal(throws,1);
 step(next-released-.4);assert.equal(throws,1,'no second throw before the delay has passed again');
 step(.6);assert.equal(throws,2);assert.equal(f.health.value,30,'both dodged');
});
