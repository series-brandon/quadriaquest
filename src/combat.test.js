import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createCombatSystem} from './combat.js';
import {createEquipment} from './equipment.js';
import {createPlayerHealth} from './player-health.js';
import {ENEMIES} from './combat-rules.js';
function fixture(kind='bruiser'){
 const world=new Map();for(let z=0;z<7;z++)for(let x=0;x<7;x++)world.set(`${x},${z}`,{x,z,h:1,blocked:false,water:false});
 const home=world.get('3,3'),inventory={swords:1,shields:1},health=createPlayerHealth(),skills={};let tile=world.get('3,4'),reach=true,blocked=false,reserved=new Set(),rewards=0,respawnAllowed=true,respawns=0,roll=.5;
 const equipment=createEquipment({inventory,busy:()=>system.working||system.busy});
 const system=createCombatSystem({world,health,equipment,player:new Group(),random:()=>roll,stop:()=>system.cancel(),blocked:()=>blocked,inReach:()=>reach,tile:()=>tile,reserved:t=>reserved.has(t),face(){},sound(){},hit(){},reward(){rewards++;},respawn(){if(!respawnAllowed)return false;respawns++;tile=world.get('0,0');return true;}});
 const a=system.add({kind,rules:ENEMIES[kind],group:new Group(),tile:home,home,x:3,z:3,scale:1,patrol:{minX:2,maxX:4,minZ:2,maxZ:4}});
 return {system,a,health,equipment,inventory,world,home,reserved,get rewards(){return rewards;},get respawns(){return respawns;},set tile(t){tile=t;},set reach(v){reach=v;},set blocked(v){blocked=v;},set respawnAllowed(v){respawnAllowed=v;},set roll(v){roll=v;}};
}
test('equipment is available without an area, guards stale actions, and clears missing items',()=>{
 const inventory={swords:1,shields:1};let busy=false;const e=createEquipment({inventory,busy:()=>busy});
 assert.ok(e.toggle('swords'));assert.ok(e.isEquipped('swords'));const action=e.inventoryActions('shields')[0];busy=true;assert.equal(action.run(),false);assert.equal(e.isEquipped('shields'),false);busy=false;assert.ok(action.run());inventory.swords=0;assert.equal(e.isEquipped('swords'),false);e.reset();assert.deepEqual(e.state,{swords:false,shields:false,hats:false});
});
test('unarmed and equipped fights reward once, retain equipment, and reset for repeated combat',()=>{
 const f=fixture('scrapper');assert.ok(f.system.start(f.a));assert.equal(f.system.start(f.a),false);for(let i=0;i<10;i++)f.system.update(1.5,i);assert.equal(f.rewards,1);assert.equal(f.system.skill.xp,20);assert.equal(f.a.opened,true);assert.equal(f.home.blocked,false);
 f.system.reset();f.equipment.toggle('swords');f.equipment.toggle('shields');assert.ok(f.system.start(f.a));assert.equal(f.equipment.toggle('swords'),false);for(let i=0;i<5;i++)f.system.update(1.5,i);assert.equal(f.rewards,2);assert.equal(f.inventory.swords,1);assert.equal(f.equipment.isEquipped('swords'),true);
});
test('misses, shield mitigation and protected training health use shared rules',()=>{
 const f=fixture();f.roll=.99;f.system.start(f.a);f.system.update(2,2);assert.equal(f.a.hp,24);assert.equal(f.health.value,30);f.system.cancel();f.roll=.5;f.equipment.toggle('shields');f.system.start(f.a);f.system.update(2,4);assert.equal(f.health.value,27);
 const training=fixture('scrapper');training.health.value=1;training.system.start(training.a);training.system.update(2.5,3);assert.equal(training.health.value,1);assert.equal(training.system.busy,false);
});
test('movement starts pursuit, reengagement preserves damage, leash returns safely',()=>{
 const f=fixture();f.system.start(f.a);f.system.update(1.5,1);const hp=f.a.hp;f.system.disengage();assert.equal(f.system.state.chase,'bruiser');assert.equal(f.system.matches(f.a),false);assert.ok(f.system.start(f.a));assert.equal(f.a.hp,hp);
 f.system.disengage();f.reserved.add(f.home);f.system.update(3.1,5);assert.equal(f.system.state.chase,null);assert.equal(f.a.returning,true);assert.equal(f.a.occupying,false);f.reserved.clear();f.system.update(.1,6);assert.equal(f.a.returning,false);assert.equal(f.a.hp,24);
});
test('defeat waits for a safe respawn, preserves items and equipment, and can repeat',()=>{
 const f=fixture();f.equipment.toggle('shields');f.health.value=1;f.system.start(f.a);f.system.update(2,2);assert.equal(f.system.busy,true);f.respawnAllowed=false;f.system.update(5,7);assert.equal(f.respawns,0);assert.equal(f.health.value,0);f.respawnAllowed=true;f.system.update(.1,8);assert.equal(f.respawns,1);assert.equal(f.health.value,30);assert.equal(f.equipment.isEquipped('shields'),true);assert.equal(f.inventory.swords,1);f.system.lose();f.system.update(5,13);assert.equal(f.respawns,2);
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
