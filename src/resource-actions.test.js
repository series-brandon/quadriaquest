import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createResourceActions} from './resource-actions.js';
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context})};
const {createResourceEntity}=await import('./resource-entities.js');
function fixture(kind='tree',respawn=null){
 const tile={x:1,z:1,h:1,blocked:false},world=new Map([['1,1',tile]]),inventory={axes:1,pickaxes:1},skills=Object.fromEntries(['Gathering','Lumberjack','Mining'].map(k=>[k,{xp:0,level:1}]));
 let reachable=true,reserved=false,rewards=0;const system=createResourceActions({world,inventory,skills,random:()=>.5,stop:()=>system.cancel(),face(){},inReach:()=>reachable,reserved:()=>reserved,tile:()=>({x:0,z:1}),sound(){},rewarded(){rewards++;}});
 const node=system.add(createResourceEntity({kind,tile,parent:new Group(),pickables:[],respawn}));
 return {world,tile,system,node,inventory,skills,get rewards(){return rewards;},set reachable(v){reachable=v;},set reserved(v){reserved=v;}};
}
test('all resource kinds share rewards, tool checks, depletion, and finite reset',()=>{
 for(const [kind,item,skill] of [['tree','logs','Lumberjack'],['boulder','stone','Mining'],['sticks','sticks','Gathering'],['stones','stones','Gathering'],['flint','flint','Gathering']]){
  const f=fixture(kind),solid=['tree','boulder'].includes(kind);
  if(solid){const tool=kind==='tree'?'axes':'pickaxes';f.inventory[tool]=0;assert.equal(f.system.start(f.node),false);f.inventory[tool]=1;}
  assert.ok(f.system.start(f.node));assert.equal(f.system.start(f.node),false);f.system.update(10);
  if(solid){assert.equal(f.inventory[item],undefined);assert.equal(f.tile.blocked,true);f.system.update(.85);}
  assert.equal(f.inventory[item],solid?2:1);assert.equal(f.skills[skill].xp,20);assert.equal(f.rewards,1);assert.equal(f.node.group.visible,false);assert.equal(f.tile.blocked,false);
  f.system.update(30);assert.equal(f.rewards,1);assert.equal(f.system.start(f.node),false);f.system.reset(f.node);assert.equal(f.node.group.scale.x,1);assert.ok(f.system.start(f.node));
 }
});
test('cancel, loss of reach/tool and travel prevent unfinished rewards; returning allows another action',()=>{
 for(const interrupt of [f=>f.system.cancel(),f=>{f.reachable=false;},f=>{f.inventory.axes=0;},f=>f.world.set('1,1',{...f.tile})]){
  const f=fixture();f.system.start(f.node);f.system.update(.5);interrupt(f);f.system.update(20);assert.equal(f.rewards,0);assert.equal(f.node.group.rotation.z,0);f.reachable=true;f.inventory.axes=1;f.world.set('1,1',f.tile);assert.ok(f.system.start(f.node));
 }
});
test('respawn waits for player, route, companion or placement reservation and terrain occupancy',()=>{
 const f=fixture('boulder',8);f.system.start(f.node);f.system.update(10);f.system.update(.85);f.reserved=true;f.system.update(9);assert.equal(f.node.depleted,true);f.reserved=false;f.tile.blocked=true;f.system.update(1);assert.equal(f.node.depleted,true);f.tile.blocked=false;f.system.update(.1);assert.equal(f.node.depleted,false);assert.equal(f.node.group.visible,true);assert.equal(f.tile.blocked,true);assert.ok(f.system.start(f.node));
});
test('committed depletion survives travel without off-map callbacks; reset discards pending rewards',()=>{
 const f=fixture();f.system.start(f.node);f.system.update(10);f.world.set('1,1',{...f.tile});f.system.update(30);assert.equal(f.rewards,0);f.world.set('1,1',f.tile);f.system.update(.85);assert.equal(f.rewards,1);
 f.system.reset(f.node);f.system.start(f.node);f.system.update(10);f.system.resetWhere();f.system.update(30);assert.equal(f.rewards,1);assert.equal(f.node.group.visible,true);
});
test('ground pickup respawns remain walkable and do not clear another occupant',()=>{
 const f=fixture('flint',8);f.tile.blocked=true;f.system.start(f.node);f.system.update(2);assert.equal(f.tile.blocked,true);f.reserved=true;f.system.update(8);assert.equal(f.node.depleted,false);assert.equal(f.tile.blocked,true);
});
test('tool work shares bounded rolls, skill speed, and fresh progress on restart',async()=>{
 const {rollToolWork}=await import('./resource-rules.js');
 for(const value of [0,.5,.999999]){const roll=rollToolWork(()=>value);assert.ok(roll.duration>=3&&roll.duration<=6);assert.ok(roll.quantity>=1&&roll.quantity<=3);}
 for(const [kind,skill] of [['tree','Lumberjack'],['boulder','Mining']]){const f=fixture(kind);f.skills[skill].level=6;f.system.start(f.node);assert.equal(f.system.state.duration,4.5/1.2);f.system.update(.5);f.system.cancel();f.system.start(f.node);assert.equal(f.system.state.age,0);}
});

test('checkpoint depletion uses the shared reset lifecycle without pending rewards or respawn',()=>{
 const f=fixture('tree',8);assert.equal(f.node.depleted,false);
 for(const alias of ['felled','collected','opened'])assert.equal(alias in f.node,false);
 f.system.start(f.node);f.system.update(10);f.system.reset(f.node,{depleted:true});f.system.update(30);
 assert.equal(f.node.depleted,true);assert.equal(f.node.group.visible,false);assert.equal(f.tile.blocked,false);assert.equal(f.rewards,0);
 assert.equal(f.system.start(f.node),false);f.system.reset(f.node);assert.equal(f.node.depleted,false);assert.equal(f.tile.blocked,true);assert.ok(f.system.start(f.node));
});
