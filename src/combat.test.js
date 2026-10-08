import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createCombatSystem,OPENING_WINDUP} from './combat.js';
import {createCombatStyles} from './combat-styles.js';
import {createEquipment} from './equipment.js';
import {createPlayerHealth,createFoodSystem} from './player-health.js';
import {cancelPlayerActions} from './action-interruption.js';
import {createRecipeCrafting} from './recipe-crafting.js';
import {ENEMIES} from './combat-rules.js';
import {createCharacter} from './character.js';
import {createResource} from './player-resources.js';
import {totalXpForLevel,XP_BASE} from './combat-formulas.js';
// roll .5: ordinary hit both ways (no crit, dodge, block or 1% enemy miss). roll .005: enemy misses; player crits.
const BRUISER_HIT=12,PLAYER_INTERVAL=2.55/1.02,CAST_INTERVAL=3/1.02;
// openingWindup: null pins full-windup timing for tests of other mechanics (the opening is tested separately).
function fixture(kind='bruiser',{openingWindup}={}){
 const world=new Map();for(let z=0;z<7;z++)for(let x=0;x<7;x++)world.set(`${x},${z}`,{x,z,h:1,blocked:false,water:false});
 const home=world.get('3,3'),inventory={swords:1,shields:1},health=createPlayerHealth(30),skills={};let tile=world.get('3,4'),reach=true,blocked=false,safe=false,reserved=new Set(),rewards=0,respawnAllowed=true,respawns=0,roll=.5,interrupts=0,attacks=0,wins=0,toasts=[],food,craft;const character=createCharacter(),mana=createResource(),energy=createResource();let auraResistance=0;
 const equipment=createEquipment({inventory,busy:()=>system.working||system.busy});
 // One strike per attack keeps these mechanic tests' arithmetic simple; dual wielding (both hands,
 // the default with two free hands) is covered in combat-systems.test.js.
 equipment.setAttackHands('main');
 const styles=createCombatStyles({equipment,busy:()=>system.working});
 const interrupt=()=>{interrupts++;cancelPlayerActions({food,craft},{keepCombat:true,keepFood:true});};
 const system=createCombatSystem({openingWindup,world,health,equipment,inventory,character,mana,energy,knowsAbility:id=>styles.knowsAbility(id),knowsSpell:id=>styles.knowsSpell(id),resistanceBonus:()=>auraResistance,strategy:()=>styles.strategy,won(){wins++;},toast:m=>toasts.push(m),attack:()=>styles.attack,player:new Group(),random:()=>roll,stop:interrupt,interrupt,attacked(){attacks++;},eating:()=>food?.working,defeatStop(){system.cancel();food?.cancel();},blocked:()=>blocked,safe:()=>safe,inReach:()=>reach,tile:()=>tile,reserved:t=>reserved.has(t),face(){},sound(){},hit(){},reward(){rewards++;},respawn(){if(!respawnAllowed)return false;respawns++;tile=world.get('0,0');return true;}});
 food=createFoodSystem({inventory,health,stop:interrupt,busy:()=>system.busy,consumed:()=>system.consumableUsed()});
 craft=createRecipeCrafting({inventory,skill:{level:1,xp:0},stop(){},busy:()=>system.working,completed(){}});
 const a=system.add({kind,aggressive:false,rules:ENEMIES[kind],group:new Group(),tile:home,home,x:3,z:3,scale:1,patrol:{minX:2,maxX:4,minZ:2,maxZ:4}});
 return {system,a,food,craft,character,mana,energy,toasts,set auraResistance(v){auraResistance=v;},get wins(){return wins;},get interrupts(){return interrupts;},get attacks(){return attacks;},health,equipment,styles,inventory,world,home,reserved,get rewards(){return rewards;},get respawns(){return respawns;},set tile(t){tile=t;},set reach(v){reach=v;},set blocked(v){blocked=v;},set safe(v){safe=v;},set respawnAllowed(v){respawnAllowed=v;},set roll(v){roll=v;}};
}
test('equipment is available without an area, guards stale actions, and clears missing items',()=>{
 const inventory={swords:1,shields:1};let busy=false;const e=createEquipment({inventory,busy:()=>busy});
 assert.ok(e.toggle('swords'));assert.ok(e.isEquipped('swords'));const action=e.inventoryActions('shields')[0];busy=true;assert.equal(action.run(),false);assert.equal(e.isEquipped('shields'),false);busy=false;assert.ok(action.run());inventory.swords=0;assert.equal(e.isEquipped('swords'),false);e.reset();assert.ok(Object.values(e.state).every(value=>value===false));
});
test('unarmed and equipped fights win once, award per-attack XP, retain equipment, and reset for repeated combat',()=>{
 const f=fixture('scrapper');assert.ok(f.system.start(f.a));assert.equal(f.system.start(f.a),false);for(let i=0;i<30;i++)f.system.update(1.5,i);assert.equal(f.wins,1);assert.equal(f.a.opened,true);assert.equal(f.home.blocked,false);
 // Unarmed Technical: strategy XP to Melee Technique and the same amount to Unarmed proficiency, 50 + 1 × HP removed per attack.
 const technique=f.character.tracks['melee.technique'].xp;assert.equal(technique,f.character.tracks['prof.unarmed'].xp);assert.equal(technique,8*XP_BASE+ENEMIES.scrapper.health);assert.ok(f.character.core.xp>0);
 f.system.reset();f.equipment.toggle('swords');f.equipment.toggle('shields');assert.ok(f.system.start(f.a));assert.equal(f.equipment.toggle('swords'),false);for(let i=0;i<15;i++)f.system.update(1.5,i);assert.equal(f.wins,2);assert.ok(f.character.tracks['prof.sword'].xp>0);assert.equal(f.inventory.swords,1);assert.equal(f.equipment.isEquipped('swords'),true);
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
test('wandering uses configured bounds and reserves its destination instead of the vacated tile',()=>{
 const f=fixture();f.roll=0;f.system.update(4,4);assert.notEqual(f.a.tile,f.home);assert.equal(f.home.blocked,false);assert.equal(f.a.tile.blocked,true);assert.ok(f.a.x>=2&&f.a.x<=4&&f.a.z>=2&&f.a.z<=4);assert.notEqual(f.a.tile,f.world.get('3,4'));
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
 const initial=f.a.group.position.clone();f.system.start(f.a);frames(f,2.48);assert.equal(f.a.aggro,false);assert.equal(f.a.hp,ENEMIES.bruiser.health);assert.deepEqual(f.a.group.position.toArray(),initial.toArray());frames(f,.3);assert.equal(f.a.aggro,true);assert.ok(f.a.hp<ENEMIES.bruiser.health);
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

test('bows and spells keep their full draw and cast time',()=>{
 const f=fixture('target');f.inventory.bows=1;f.inventory.arrows=5;f.equipment.toggle('bows');f.system.start(f.a);
 frames(f,1);assert.equal(f.a.hp,ENEMIES.target.health,'no opening for a bow');
 const g=fixture('target');g.styles.learn('energyStrike');g.styles.select('energyStrike');g.system.start(g.a);
 frames(g,1);assert.equal(g.a.hp,ENEMIES.target.health,'no opening for a spell');
});

test('an aggressive enemy opens with a short windup once in reach, then keeps its interval',()=>{
 const f=fixture('bruiser');f.a.aggressive=true;const start=f.health.value;const hits=[];let time=0;
 for(let i=0;i<300&&hits.length<2;i++){f.system.update(.02,time+=.02);if(f.health.value<(hits.at(-1)?.health??start))hits.push({time,health:f.health.value});}
 assert.equal(hits.length,2);
 assert.ok(hits[0].time<=OPENING_WINDUP+.1,`first enemy hit at ${hits[0].time.toFixed(2)}s`);
 assert.ok(hits[1].time-hits[0].time>=ENEMIES.bruiser.interval-.03,'then a full interval between hits');
});
