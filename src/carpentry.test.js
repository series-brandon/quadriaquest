import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createCarpentrySystem} from './carpentry.js';
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context})};
const {createCarpentryBridge}=await import('./carpentry-bridge.js');
function fixture(){
 const tile={x:0,z:0,h:1},world=new Map([['0,0',tile]]),inventory={logs:9,hammers:1};let inReach=true,paused=false,completions=0;
 const target=createCarpentryBridge({tiles:[tile],parent:new Group(),world,pickables:[],paused:()=>paused,onComplete:()=>completions++});
 const system=createCarpentrySystem({inventory,stop:()=>system.cancel(),face(){},inReach:()=>inReach});
 return {system,target,inventory,world,tile,get completions(){return completions;},set inReach(v){inReach=v;},set paused(v){paused=v;}};
}
test('portable repair consumes once, preserves hammer, rewards XP, and supports reset/repeat',()=>{
 const f=fixture();assert.ok(f.system.start(f.target));assert.equal(f.system.update(2).kind,'Repairing');assert.equal(f.system.start(f.target),false);f.system.update(4);f.system.update(30);
 assert.equal(f.inventory.logs,6);assert.equal(f.inventory.hammers,1);assert.equal(f.system.skill.xp,40);assert.equal(f.completions,1);assert.equal(f.system.start(f.target),false);
 f.target.reset();assert.ok(f.system.start(f.target));f.system.update(6);assert.equal(f.inventory.logs,3);assert.equal(f.completions,2);
});
test('missing requirements, movement, cancellation and map identity prevent rewards',()=>{
 for(const interrupt of [f=>f.system.cancel(),f=>{f.inReach=false;},f=>{f.inventory.hammers=0;},f=>f.world.set('0,0',{...f.tile})]){
  const f=fixture();f.inventory.logs=2;assert.equal(f.system.start(f.target),false);f.inventory.logs=9;f.system.start(f.target);f.system.update(2);interrupt(f);f.system.update(20);assert.equal(f.system.skill.xp,0);assert.equal(f.inventory.logs,9);assert.equal(f.completions,0);
  f.world.set('0,0',f.tile);f.inReach=true;f.inventory.hammers=1;assert.ok(f.system.start(f.target));
 }
});
test('narrative interruption pauses at progress even on completion frame and resumes once',()=>{
 const f=fixture();let injured=false;f.target.onProgress=()=>{if(!injured){injured=true;f.paused=true;}};
 f.system.skill.level=6;f.system.start(f.target);assert.equal(f.system.state.duration,5);f.system.update(5);assert.equal(f.inventory.logs,9);f.system.update(20);assert.equal(f.completions,0);f.paused=false;f.system.update(.1);assert.equal(f.completions,1);assert.equal(f.inventory.logs,6);
});
