import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createCombatSystem} from './combat.js';
import {createCombatStyles} from './combat-styles.js';
import {createEquipment} from './equipment.js';
import {createPlayerHealth,createFoodSystem} from './player-health.js';
import {cancelPlayerActions} from './action-interruption.js';
import {createRecipeCrafting} from './recipe-crafting.js';
import {ENEMIES} from './combat-rules.js';
function fixture(kind='bruiser'){
 const world=new Map();for(let z=0;z<7;z++)for(let x=0;x<7;x++)world.set(`${x},${z}`,{x,z,h:1,blocked:false,water:false});
 const home=world.get('3,3'),inventory={swords:1,shields:1},health=createPlayerHealth(),skills={};let tile=world.get('3,4'),reach=true,blocked=false,safe=false,reserved=new Set(),rewards=0,respawnAllowed=true,respawns=0,roll=.5,interrupts=0,attacks=0,food,craft;
 const equipment=createEquipment({inventory,busy:()=>system.working||system.busy});
 const styles=createCombatStyles({equipment,busy:()=>system.working});
 const interrupt=()=>{interrupts++;cancelPlayerActions({food,craft},{keepCombat:true,keepFood:true});};
 const system=createCombatSystem({world,health,equipment,inventory,attack:()=>styles.attack,player:new Group(),random:()=>roll,stop:interrupt,interrupt,attacked(){attacks++;},eating:()=>food?.working,defeatStop(){system.cancel();food?.cancel();},blocked:()=>blocked,safe:()=>safe,inReach:()=>reach,tile:()=>tile,reserved:t=>reserved.has(t),face(){},sound(){},hit(){},reward(){rewards++;},respawn(){if(!respawnAllowed)return false;respawns++;tile=world.get('0,0');return true;}});
 food=createFoodSystem({inventory,health,stop:interrupt,busy:()=>system.busy});
 craft=createRecipeCrafting({inventory,skill:{level:1,xp:0},stop(){},busy:()=>system.working,completed(){}});
 const a=system.add({kind,aggressive:false,rules:ENEMIES[kind],group:new Group(),tile:home,home,x:3,z:3,scale:1,patrol:{minX:2,maxX:4,minZ:2,maxZ:4}});
 return {system,a,food,craft,get interrupts(){return interrupts;},get attacks(){return attacks;},health,equipment,styles,inventory,world,home,reserved,get rewards(){return rewards;},get respawns(){return respawns;},set tile(t){tile=t;},set reach(v){reach=v;},set blocked(v){blocked=v;},set safe(v){safe=v;},set respawnAllowed(v){respawnAllowed=v;},set roll(v){roll=v;}};
}
test('equipment is available without an area, guards stale actions, and clears missing items',()=>{
 const inventory={swords:1,shields:1};let busy=false;const e=createEquipment({inventory,busy:()=>busy});
 assert.ok(e.toggle('swords'));assert.ok(e.isEquipped('swords'));const action=e.inventoryActions('shields')[0];busy=true;assert.equal(action.run(),false);assert.equal(e.isEquipped('shields'),false);busy=false;assert.ok(action.run());inventory.swords=0;assert.equal(e.isEquipped('swords'),false);e.reset();assert.ok(Object.values(e.state).every(value=>value===false));
});
test('unarmed and equipped fights reward once, retain equipment, and reset for repeated combat',()=>{
 const f=fixture('scrapper');assert.ok(f.system.start(f.a));assert.equal(f.system.start(f.a),false);for(let i=0;i<10;i++)f.system.update(1.5,i);assert.equal(f.rewards,1);assert.equal(f.system.skill.xp,20);assert.equal(f.a.opened,true);assert.equal(f.home.blocked,false);
 f.system.reset();f.equipment.toggle('swords');f.equipment.toggle('shields');assert.ok(f.system.start(f.a));assert.equal(f.equipment.toggle('swords'),false);for(let i=0;i<5;i++)f.system.update(1.5,i);assert.equal(f.rewards,2);assert.equal(f.inventory.swords,1);assert.equal(f.equipment.isEquipped('swords'),true);
});
test('misses, shield mitigation and protected training health use shared rules',()=>{
 const f=fixture();f.roll=.99;f.system.start(f.a);f.system.update(2,2);assert.equal(f.a.hp,24);assert.equal(f.health.value,30);f.system.cancel();f.roll=.5;f.equipment.toggle('shields');f.system.start(f.a);f.system.update(1.5,4);f.system.update(2,6);assert.equal(f.health.value,27);
 const training=fixture('scrapper');training.health.value=1;training.system.start(training.a);training.system.update(2.5,3);assert.equal(training.health.value,1);assert.equal(training.system.busy,false);
});
test('movement starts pursuit, reengagement preserves damage, leash returns safely',()=>{
 const f=fixture();f.system.start(f.a);f.system.update(1.5,1);const hp=f.a.hp;f.system.disengage();assert.equal(f.system.state.chase,'bruiser');assert.equal(f.system.matches(f.a),false);assert.ok(f.system.start(f.a));assert.equal(f.a.hp,hp);
 f.system.disengage();f.system.setAutoRetaliate(false);f.a.leash=5;f.tile=f.world.get('0,0');f.reserved.add(f.home);f.system.update(.1,8);assert.equal(f.system.state.chase,null);assert.equal(f.a.returning,true);assert.equal(f.a.occupying,true);assert.equal(f.a.group.visible,true);f.reserved.clear();f.system.update(.1,6);assert.equal(f.a.returning,false);assert.equal(f.a.hp,24);
});
test('defeat waits for a safe respawn, preserves items and equipment, and can repeat',()=>{
 const f=fixture();f.equipment.toggle('shields');f.health.value=1;f.system.start(f.a);f.system.update(1.5,1.5);f.system.update(2,3.5);assert.equal(f.system.busy,true);f.respawnAllowed=false;f.system.update(5,7);assert.equal(f.respawns,0);assert.equal(f.health.value,0);f.respawnAllowed=true;f.system.update(.1,8);assert.equal(f.respawns,1);assert.equal(f.health.value,30);assert.equal(f.equipment.isEquipped('shields'),true);assert.equal(f.inventory.swords,1);f.system.lose();f.system.update(5,13);assert.equal(f.respawns,2);
});
test('map identity, cancellation, removal and reset cannot duplicate rewards or leave occupancy',()=>{
 const f=fixture();f.system.start(f.a);f.system.update(.5,1);f.world.set('3,3',{...f.home,blocked:false});f.system.update(10,11);assert.equal(f.system.working,false);assert.equal(f.rewards,0);assert.equal(f.a.group.visible,false);f.world.set('3,3',f.home);f.system.update(.1,12);assert.ok(f.system.start(f.a));f.system.remove(f.a);f.system.update(10,22);assert.equal(f.rewards,0);assert.equal(f.home.blocked,false);assert.equal(f.system.start(f.a),false);
});
test('wandering uses configured bounds and reserves its destination instead of the vacated tile',()=>{
 const f=fixture();f.roll=0;f.system.update(4,4);assert.notEqual(f.a.tile,f.home);assert.equal(f.home.blocked,false);assert.equal(f.a.tile.blocked,true);assert.ok(f.a.x>=2&&f.a.x<=4&&f.a.z>=2&&f.a.z<=4);assert.notEqual(f.a.tile,f.world.get('3,4'));
});
test('hat equipment uses the same inventory-backed state as weapons',()=>{
 const inventory={hats:1};const e=createEquipment({inventory});assert.equal(e.inventoryActions('hats')[0].label,'Equip');assert.ok(e.toggle('hats'));assert.ok(e.isEquipped('hats'));assert.equal(e.inventoryActions('hats')[0].label,'Unequip');inventory.hats=0;assert.equal(e.isEquipped('hats'),false);
});

test('ranged shots consume ammo once at release, hit on impact and exhaust without negative ammo',()=>{
 const f=fixture('scrapper');f.inventory.bows=1;f.inventory.arrows=1;f.equipment.toggle('bows');f.system.start(f.a);f.system.update(1.7,1.7);assert.equal(f.inventory.arrows,0);assert.equal(f.a.hp,8);f.system.update(.23,1.93);assert.equal(f.a.hp,5);f.system.update(2,4);assert.equal(f.system.state.fight,null);assert.equal(f.system.state.chase,'scrapper');assert.equal(f.inventory.arrows,0);assert.equal(f.system.start(f.a),false);
});
test('committed projectile survives retreat once, while travel/reset discards pending impacts without refund',()=>{
 const f=fixture('scrapper');f.inventory.bows=1;f.inventory.arrows=5;f.equipment.toggle('bows');f.system.start(f.a);f.system.update(1.7,2);f.system.disengage();f.system.update(.23,3);assert.equal(f.a.hp,5);assert.equal(f.inventory.arrows,4);f.system.clear();f.system.start(f.a);f.system.update(1.7,4);f.system.clear();f.system.update(5,9);assert.equal(f.a.hp,8);assert.equal(f.rewards,0);assert.equal(f.inventory.arrows,3);
});
test('inert targets do not attack or award Combat XP and can respawn using the shared lifecycle',()=>{
 const f=fixture('target');f.a.respawn=1;f.styles.learn('spark');f.styles.select('spark');f.system.start(f.a);for(let i=0;i<4;i++)f.system.update(1,i);assert.equal(f.a.hp,1);f.system.update(.23,5);assert.equal(f.a.opened,true);assert.equal(f.rewards,0);assert.equal(f.health.value,30);f.system.update(3,8);assert.equal(f.a.opened,false);assert.equal(f.a.hp,4);assert.ok(f.system.start(f.a));f.system.disengage();assert.equal(f.system.state.chase,null);
});

function frames(f,seconds,dt=.02){let result;for(let t=0;t<seconds;t+=dt)result=f.system.update(dt,t);return result;}
test('ranged targeting and release stay passive; even a missed impact starts continuous pursuit',()=>{
 const f=fixture();f.inventory.bows=1;f.inventory.arrows=10;f.equipment.toggle('bows');f.tile=f.world.get('3,6');f.roll=.99;
 const initial=f.a.group.position.clone();f.system.start(f.a);frames(f,1.7);assert.equal(f.a.aggro,false);assert.equal(f.a.hp,24);assert.deepEqual(f.a.group.position.toArray(),initial.toArray());frames(f,.25);assert.equal(f.a.aggro,true);assert.equal(f.a.hp,24);
 f.roll=.5;frames(f,1.7);assert.equal(f.a.aggro,true);assert.ok(f.a.hp<24);assert.ok(f.a.group.position.distanceTo(initial)>0);
 let previous=f.a.group.position.clone();for(let i=0;i<50;i++){f.system.update(.02,i);assert.ok(f.a.group.position.distanceTo(previous)<=.04001);previous.copy(f.a.group.position);}
});
test('leash return walks visibly, retains destination occupancy, waits for home and heals only on arrival',()=>{
 const f=fixture();f.system.start(f.a);frames(f,1.52);const hurt=f.a.hp;f.tile=f.world.get('3,6');f.system.disengage();frames(f,.8);assert.notEqual(f.a.tile,f.home);
 f.a.leash=5;f.tile=f.world.get('0,0');f.reserved.add(f.home);let previous=f.a.group.position.clone();f.system.update(.02,2);assert.ok(f.a.returning);assert.equal(f.a.hp,hurt);assert.ok(f.a.group.visible);assert.ok(f.a.occupying);assert.ok(f.a.group.position.distanceTo(previous)<=.04001);
 frames(f,1);assert.ok(f.a.returning);f.reserved.clear();
 for(let i=0;i<150;i++){previous.copy(f.a.group.position);f.system.update(.02,i);assert.ok(f.a.group.position.distanceTo(previous)<=.04001);if(!f.a.returning)break;}
 assert.equal(f.a.returning,false);assert.equal(f.a.tile,f.home);assert.equal(f.a.hp,24);
});
test('enemy cannot hit from a logically adjacent tile before its body arrives',()=>{
 const f=fixture();f.tile=f.world.get('3,5');f.a.rules={...f.a.rules,interval:.1};f.a.aggro=true;f.system.start(f.a);f.system.update(.02,0);assert.equal(f.a.z,4);assert.equal(f.health.value,30);assert.ok(f.a.group.position.z<4-6);frames(f,.2);assert.equal(f.health.value,30);
});
test('incoming hits select equipment-aware blocking, but simultaneous player attacks win',()=>{
 const f=fixture();f.equipment.toggle('swords');f.equipment.toggle('shields');f.a.rules={...f.a.rules,interval:.6};f.a.aggressive=true;f.system.start(f.a);const block=f.system.update(.6,.6);assert.equal(block.kind,'Block');assert.equal(block.profile.mainHand,'swords');assert.equal(block.profile.offHand,'shields');
 f.system.reset();f.a.rules={...f.a.rules,interval:1.5};f.system.start(f.a);const simultaneous=f.system.update(1.5,1.5);assert.equal(simultaneous.kind,'Combat');assert.equal(simultaneous.profile.item,'swords');assert.ok(f.health.value<30);
 f.system.clear();assert.equal(f.system.update(.02,2),null);
});

for(const style of ['unarmed','ranged','magic'])for(const outcome of ['damage','miss','zero'])test(`${style} provokes only at resolution, including ${outcome}`,()=>{
 const f=fixture();const attack={style,min:outcome==='zero'?0:1,max:outcome==='zero'?0:1,interval:1.5};
 // Use the production style provider, with deterministic damage bounds.
 Object.defineProperty(f.styles,'attack',{get:()=>attack});f.roll=outcome==='miss'?.99:.5;
 f.system.start(f.a);frames(f,1.46);assert.equal(f.a.aggro,false);assert.equal(f.a.hp,24);
 frames(f,.06);assert.equal(f.a.aggro,style==='unarmed');
 if(style!=='unarmed')frames(f,.24);
 assert.equal(f.a.aggro,true);assert.equal(f.a.hp,outcome==='damage'?23:24);
});
test('passive creatures ignore proximity; aggressive awareness respects configured radius and obstacles',()=>{
 const f=fixture();frames(f,.5);assert.equal(f.a.aggro,false);
 f.a.aggressive=true;f.a.aggroRange=1;f.tile=f.world.get('3,6');frames(f,.1);assert.equal(f.a.aggro,false);
 f.tile=f.world.get('3,4');f.blocked=true;frames(f,.1);assert.equal(f.a.aggro,false);f.blocked=false;
 f.world.get('3,4').h=3;frames(f,.1);assert.equal(f.a.aggro,false);f.world.get('3,4').h=1;
 frames(f,.1);assert.equal(f.a.aggro,true);assert.equal(f.system.state.fight,null);
});
test('auto-retaliate responds to incoming misses, Off permits manual combat, and clear preserves preference',()=>{
 const f=fixture();f.a.aggressive=true;f.roll=.99;frames(f,2.1);assert.equal(f.system.state.fight,'bruiser');assert.equal(f.health.value,30);
 f.system.clear();f.system.setAutoRetaliate(false);frames(f,2.1);assert.equal(f.system.state.fight,null);assert.equal(f.a.aggro,true);
 assert.ok(f.system.start(f.a));f.system.setAutoRetaliate(true);f.system.setAutoRetaliate(false);assert.equal(f.system.state.fight,'bruiser');
 f.system.clear();assert.equal(f.a.aggro,false);assert.equal(f.system.autoRetaliate,false);
});
test('food survives incoming combat, pauses outgoing attacks, heals once, and resumes the fight',()=>{
 const f=fixture();f.health.value=15;f.inventory.cookedFish=2;f.system.start(f.a);frames(f,1.52);const hp=f.a.hp;
 assert.ok(f.food.start('cookedFish'));frames(f,2.1);assert.ok(f.food.working);assert.equal(f.a.hp,hp);assert.ok(f.health.value<15);
 const before=f.health.value;f.food.update(10);assert.equal(f.inventory.cookedFish,1);assert.equal(f.health.value,before+10);assert.equal(f.system.state.fight,'bruiser');
 frames(f,1.52);assert.ok(f.a.hp<hp);assert.equal(f.inventory.cookedFish,1);
});
test('combat can begin during food, but defeat cancels it without consuming food',()=>{
 const f=fixture();f.inventory.cookedFish=1;f.health.value=10;f.food.start('cookedFish');f.system.start(f.a);assert.ok(f.food.working);
 f.a.aggressive=true;f.health.value=1;frames(f,2.1);assert.equal(f.system.busy,true);assert.equal(f.food.working,false);f.food.update(10);assert.equal(f.inventory.cookedFish,1);
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
 for(const roll of [.5,.99]){const f=fixture();f.roll=roll;f.a.aggressive=true;f.system.setAutoRetaliate(false);frames(f,2.1);assert.equal(f.attacks,1);assert.equal(f.health.value===30,roll===.99);}
});
