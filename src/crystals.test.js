import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {makeCrystal,animateCrystal} from './crystal-model.js';
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context})};
const {createCrystals}=await import('./crystals.js');
test('crystals share picking, availability, motion and idempotent removal across map identities',()=>{
 const tile={x:1,z:1,h:2},world=new Map([['1,1',tile]]),parent=new Group(),pickables=[];let requests=0,cancelled=null;
 const crystals=createCrystals({world,pickables,travel:{request:id=>{assert.equal(id,'any-area');requests++;return true;},cancelFrom:a=>cancelled=a}});
 const actor=crystals.add({tile,parent,destination:'any-area',ready:false});assert.ok(tile.blocked);assert.ok(pickables.every(m=>m.userData.actor===actor));assert.equal(actor.interact(),false);
 actor.ready=true;assert.ok(actor.interact());assert.equal(requests,1);const preview=makeCrystal();animateCrystal(preview,2,tile.h);crystals.update(2);assert.equal(actor.group.position.y,preview.position.y);
 world.set('1,1',{...tile});assert.equal(actor.interact(),false);assert.deepEqual(crystals.current(),[]);world.set('1,1',tile);assert.equal(crystals.current()[0],actor);
 crystals.remove(actor);crystals.remove(actor);assert.equal(cancelled,actor);assert.equal(tile.blocked,false);assert.equal(pickables.length,0);assert.equal(parent.children.length,0);assert.equal(actor.interact(),false);
});
