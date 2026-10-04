import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Vector3} from 'three';
import {createCompanionSystem} from './companions.js';
import {key} from './world.js';
function fixture(){
 const world=new Map(),scene=new Scene(),player=new Group(),pickables=[];scene.add(player);let tile,moving=false,sleep=0,origin=40,system;
 const counts={completed:0,cleared:0};
 const toPosition=t=>new Vector3(t.x+origin,t.h,t.z+origin);
 function changeWorld(offset=40){origin=offset;world.clear();for(let x=0;x<5;x++)for(let z=0;z<5;z++)world.set(key(x,z),{x,z,h:1,water:false,blocked:false});tile=world.get(key(2,2));player.position.copy(toPosition(tile));}
 changeWorld();
 system=createCompanionSystem({world,scene,player,pickables,toPosition,tileAtPosition:p=>world.get(key(Math.round(p.x-origin),Math.round(p.z-origin))),tile:()=>tile,moving:()=>moving,playerSleepTime:()=>sleep,reserved:()=>false,occupied:t=>t===tile,approaching:()=>null,blocked:()=>false,stop(){system.cancel();moving=false;},face(){},feedback:{destination(){},interacting(){},complete(){counts.completed++;},clearDestination(){counts.cleared++;}}});
 return {system,world,scene,pickables,counts,changeWorld,setMoving:v=>moving=v,setSleep:v=>sleep=v};
}
test('companion ownership, name, menu settings and pick target survive replacement worlds',()=>{
 const f=fixture(),c=f.system;c.acquire();c.update(0,0,null);c.rename('Sir Nubsalot');c.setFollowing(false);
 const first=c.actor.tile;assert.ok(first);assert.equal(c.actor.label,'Pet Sir Nubsalot');assert.equal(c.model.parent,f.scene);
 f.changeWorld(100);c.update(0,1,null);
 assert.notEqual(c.actor.tile,first);assert.ok(c.model.position.x>=100);assert.equal(c.state.name,'Sir Nubsalot');assert.equal(c.state.following,false);assert.equal(c.actor.ready,true);
 assert.ok(f.pickables.every(m=>m.userData.actor===c.actor&&m.userData.tile===c.actor.tile));
 assert.ok(!f.pickables.some(m=>m.userData.nonInteractive||m.name.startsWith('pet-heart')));
 c.dispose();assert.equal(f.pickables.length,0);
});
test('petting runs and cancels through the same app-owned action in any world',()=>{
 const f=fixture(),c=f.system;c.acquire();c.update(0,0,null);
 for(const origin of [40,100]){
  f.changeWorld(origin);c.update(0,0,null);assert.ok(c.pet());assert.ok(c.matches(c.actor));
  assert.deepEqual(c.update(.5,1,null),{kind:'Petting',time:.5});assert.ok(c.working);
  c.update(2.2,3,null);assert.equal(c.working,false);
  c.pet();f.setMoving(true);c.update(.1,4,null);assert.equal(c.working,false);f.setMoving(false);
 }
 assert.equal(f.counts.completed,2);
});
test('sleep, rename validation and reset work without a chapter module',()=>{
 const f=fixture(),c=f.system;c.acquire();c.update(0,0,null);f.setSleep(7);c.update(.1,8,null);
 assert.ok(c.model.getObjectByName('companion-sleep-z0').visible);
 f.setSleep(0);c.update(.1,9,null);assert.equal(c.model.getObjectByName('companion-sleep-z0').visible,false);
 assert.equal(c.rename('   '),false);c.rename('  Potato  ');assert.equal(c.actor.label,'Pet Potato');
 c.reset();assert.deepEqual(c.state,{owned:false,following:true,name:'Pebble'});assert.equal(c.actor.ready,false);assert.equal(c.model.visible,false);
 c.acquire();c.update(0,10,null);assert.equal(c.actor.label,'Pet Pebble');
});
