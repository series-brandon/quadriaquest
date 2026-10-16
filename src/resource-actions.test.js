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
 for(const value of [0,.5,.999999]){const roll=rollToolWork(4,()=>value);assert.ok(roll.duration>=3.4&&roll.duration<=4.6);}
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
 const f=fixture('sticks',null,{xpBoost:{scale:7,belowLevel:2}});f.system.start(f.node);f.system.update(5);assert.equal(f.skills.Gathering.xp,7*actionXp(4));
 const g=fixture('sticks',null,{xpBoost:{scale:7,belowLevel:2}});g.skills.Gathering.level=2;g.system.start(g.node);g.system.update(5);assert.equal(g.skills.Gathering.xp,actionXp(4));
});
test('trees regrow on their tier\'s timer unless a placement sets its own; levels above the requirement raise the yield',async()=>{
 const {TREES}=await import('./lumberjack.js'),{RESOURCE_RESPAWN}=await import('./resource-entities.js');
 assert.equal(fixture('tree',null,{species:'oak',respawn:undefined}).node.respawn,TREES.oak.respawn,'no respawn given: the tier\'s');assert.ok(TREES.cherry.respawn>TREES.poplar.respawn);
 assert.equal(fixture('tree',5,{species:'oak'}).node.respawn,5,'a placement may set its own');assert.equal(fixture('boulder',null,{respawn:undefined}).node.respawn,RESOURCE_RESPAWN);
 const f=fixture('tree',null,{species:'oak'});f.skills.Lumberjack.level=60;f.system.start(f.node);f.system.update(10);f.system.update(.85);
 assert.equal(f.inventory.oakWood,3,'a roll of 2 at +60% (random .5) gives 2 + floor(1.2 + .5)');
});
test('configuration layers: the type\'s table, then the placement\'s overrides, the formula only for what neither sets',async()=>{
 const {TREES}=await import('./lumberjack.js');
 // Type: an Oak's tier table sets its respawn and drop table (its wood); XP falls back to the effort pace.
 const plain=fixture('tree',null,{species:'oak',respawn:undefined});plain.skills.Lumberjack.level=30;
 assert.equal(plain.node.respawn,TREES.oak.respawn);assert.deepEqual(resourceRules(plain.node).drops,TREES.oak.drops);
 plain.system.start(plain.node);plain.system.update(10);plain.system.update(.85);assert.equal(plain.skills.Lumberjack.xp,actionXp(6,30));assert.equal(plain.inventory.oakWood,2,'its table: oak wood ×1–3 (random .5)');
 // A tier may set its XP, and its table may add more drops.
 const table=TREES.oak.drops;TREES.oak.xp=50;TREES.oak.drops={...table,rolls:[{item:'sticks',chance:1,count:2}]};
 try{
  const typed=fixture('tree',null,{species:'oak'});typed.skills.Lumberjack.level=30;typed.system.start(typed.node);typed.system.update(10);typed.system.update(.85);
  assert.equal(typed.skills.Lumberjack.xp,50);assert.equal(typed.inventory.sticks,2);assert.equal(typed.inventory.oakWood,2);
 }finally{delete TREES.oak.xp;TREES.oak.drops=table;}
 // Instance: this one tree regrows slower, gives 5 oak wood and a flint, and pays 99 XP.
 const own=fixture('tree',null,{species:'oak',respawn:undefined,config:{respawn:300,xp:99,drops:{always:[{item:'oakWood',count:5},{item:'flint',count:1}]},colour:'ignored'}});
 assert.equal(own.node.respawn,300);assert.deepEqual(Object.keys(own.node.config).sort(),['drops','xp']);
 own.skills.Lumberjack.level=30;own.system.start(own.node);own.system.update(10);own.system.update(.85);
 assert.equal(own.inventory.oakWood,5);assert.equal(own.skills.Lumberjack.xp,99);assert.equal(own.inventory.flint,1);
});
