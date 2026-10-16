import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createResourceActions,resourceRules} from './resource-actions.js';
import {actionXp} from './skill-pacing.js';
import {TOOL_TIERS} from './tool-tiers.js';
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context})};
const {createResourceEntity}=await import('./resource-entities.js');
function fixture(kind='tree',respawn=null,options={}){
 const tile={x:1,z:1,h:1,blocked:false},world=new Map([['1,1',tile]]),inventory={crudeAxe:1,pickaxes:1},toasts=[],skills=Object.fromEntries(['Gathering','Lumberjack','Mining'].map(k=>[k,{xp:0,level:1}]));
 let reachable=true,reserved=false,rewards=0;const system=createResourceActions({world,inventory,skills,random:()=>.5,toast:m=>toasts.push(m),stop:()=>system.cancel(),face(){},inReach:()=>reachable,reserved:()=>reserved,tile:()=>({x:0,z:1}),sound(){},rewarded(){rewards++;}});
 const node=system.add(createResourceEntity({kind,tile,parent:new Group(),pickables:[],respawn,...options}));
 return {world,tile,system,node,inventory,skills,toasts,get rewards(){return rewards;},set reachable(v){reachable=v;},set reserved(v){reserved=v;}};
}
test('all resource kinds share rewards, tool checks, depletion, and finite reset',()=>{
 for(const [kind,item,skill] of [['tree','poplarWood','Lumberjack'],['boulder','stone','Mining'],['sticks','sticks','Gathering'],['stones','stones','Gathering'],['flint','flint','Gathering']]){
  const f=fixture(kind),solid=['tree','boulder'].includes(kind);
  if(solid){const tool=kind==='tree'?'crudeAxe':'pickaxes';f.inventory[tool]=0;assert.equal(f.system.start(f.node),false);f.inventory[tool]=1;}
  assert.ok(f.system.start(f.node));assert.equal(f.system.start(f.node),false);f.system.update(10);
  if(solid){assert.equal(f.inventory[item],undefined);assert.equal(f.tile.blocked,true);f.system.update(.85);}
  assert.equal(f.inventory[item],solid?2:1);assert.equal(f.skills[skill].xp,actionXp(resourceRules(f.node).effort));assert.equal(f.rewards,1);assert.equal(f.node.group.visible,false);
  assert.equal(f.tile.blocked,solid,'a remnant keeps a solid tile blocked; a ground item frees it');assert.equal(!!f.node.remnant?.visible,solid);
  f.system.update(30);assert.equal(f.rewards,1);assert.equal(f.system.start(f.node),false);f.system.reset(f.node);assert.equal(f.node.group.scale.x,1);assert.equal(!!f.node.remnant?.visible,false);assert.ok(f.system.start(f.node));
 }
});
test('cancel, loss of reach/tool and travel prevent unfinished rewards; returning allows another action',()=>{
 for(const interrupt of [f=>f.system.cancel(),f=>{f.reachable=false;},f=>{f.inventory.crudeAxe=0;},f=>f.world.set('1,1',{...f.tile})]){
  const f=fixture();f.system.start(f.node);f.system.update(.5);interrupt(f);f.system.update(20);assert.equal(f.rewards,0);assert.equal(f.node.group.rotation.z,0);f.reachable=true;f.inventory.crudeAxe=1;f.world.set('1,1',f.tile);assert.ok(f.system.start(f.node));
 }
});
test('a depleted solid resource keeps its tile blocked under its remnant and regrows on time',()=>{
 for(const [kind,remnant] of [['tree','stump-poplar'],['boulder','rubble-boulder'],['copper','rubble-copper']]){
  const f=fixture(kind,8);f.system.start(f.node);f.system.update(10);
  assert.equal(f.node.remnant?.name,remnant,'the remnant appears as the resource falls or crumbles');assert.equal(f.node.group.visible,true);
  f.system.update(.85);f.reserved=true;f.system.update(7.9);assert.equal(f.node.depleted,true);assert.equal(f.tile.blocked,true);
  f.system.update(.2);assert.equal(f.node.depleted,false,'nothing can stand on a blocked tile, so regrowth never waits');assert.equal(f.node.group.visible,true);assert.equal(f.node.remnant.visible,false);assert.equal(f.tile.blocked,true);
  f.reserved=false;assert.ok(f.system.start(f.node));
 }
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
 for(const value of [0,.5,.999999]){const roll=rollToolWork(4,()=>value);assert.ok(roll.duration>=3.4&&roll.duration<=4.6);assert.ok(roll.quantity>=1&&roll.quantity<=3);}
 for(const [kind,skill,effort] of [['tree','Lumberjack',4],['boulder','Mining',4.5]]){const f=fixture(kind);f.skills[skill].level=11;f.system.start(f.node);assert.equal(f.system.state.duration,effort/1.2);f.system.update(.5);f.system.cancel();f.system.start(f.node);assert.equal(f.system.state.age,0);}
});

test('checkpoint depletion uses the shared reset lifecycle without pending rewards or respawn',()=>{
 const f=fixture('tree',8);assert.equal(f.node.depleted,false);
 for(const alias of ['felled','collected','opened'])assert.equal(alias in f.node,false);
 f.system.start(f.node);f.system.update(10);f.system.reset(f.node,{depleted:true});f.system.update(30);
 assert.equal(f.node.depleted,true);assert.equal(f.node.group.visible,false);assert.equal(f.node.remnant.visible,true);assert.equal(f.tile.blocked,true);assert.equal(f.rewards,0);
 assert.equal(f.system.start(f.node),false);f.system.reset(f.node);assert.equal(f.node.depleted,false);assert.equal(f.node.remnant.visible,false);assert.equal(f.tile.blocked,true);assert.ok(f.system.start(f.node));
 f.node.dispose();assert.equal(f.node.remnant.parent,null,'removal takes the remnant too');assert.equal(f.tile.blocked,false);
});

test('trees need their tier\'s Lumberjack level, yield its wood and pay its XP',()=>{
 const f=fixture('tree',null,{species:'oak'});
 assert.equal(f.system.start(f.node),false);assert.equal(f.toasts.at(-1),'You need Lumberjack level 30 to chop the Oak Tree.');assert.equal(f.system.blocker(f.node),f.toasts.at(-1));
 f.skills.Lumberjack.level=30;assert.equal(f.system.blocker(f.node),null);assert.ok(f.system.start(f.node));
 assert.equal(f.system.state.duration,6,'Small effort, no level bonus at the requirement');assert.equal(f.system.state.tool,'crudeAxe');
 f.system.update(10);f.system.update(.85);assert.equal(f.inventory.oakWood,2);assert.equal(f.skills.Lumberjack.xp,actionXp(6,30));
 assert.equal(fixture('tree',null,{species:'not-a-tree'}).node.species,'poplar','unknown species fall back to the Poplar');
});
test('the best usable tool tier works; a locked tier explains itself',()=>{
 const tiers=TOOL_TIERS.axe.tiers;tiers.push({item:'testAxe',level:20,speed:2});
 try{
  const f=fixture();f.inventory.crudeAxe=0;f.inventory.testAxe=1;
  assert.equal(f.system.start(f.node),false);assert.equal(f.toasts.at(-1),'You need Lumberjack level 20 to use the testAxe.');
  f.inventory.crudeAxe=1;assert.ok(f.system.start(f.node));assert.equal(f.system.state.tool,'crudeAxe');f.system.cancel();
  f.skills.Lumberjack.level=20;assert.ok(f.system.start(f.node));assert.equal(f.system.state.tool,'testAxe');assert.equal(f.system.state.duration,1.5,'4s/(1.38×2) would be 1.45s: the work floor holds');
  assert.equal(f.system.update(.1).tool,'testAxe','the motion carries the tool for presentation');
  f.inventory.testAxe=0;f.system.update(.1);assert.equal(f.system.working,false,'losing the tool in use cancels');
 }finally{tiers.pop();}
});
test('an entity XP modifier boosts awards only below its level',()=>{
 const f=fixture('sticks',null,{xp:{scale:7,belowLevel:2}});f.system.start(f.node);f.system.update(5);assert.equal(f.skills.Gathering.xp,7*actionXp(4));
 const g=fixture('sticks',null,{xp:{scale:7,belowLevel:2}});g.skills.Gathering.level=2;g.system.start(g.node);g.system.update(5);assert.equal(g.skills.Gathering.xp,actionXp(4));
});
