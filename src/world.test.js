import test from 'node:test';import assert from 'node:assert/strict';import {makeWorld,findPath,key} from './world.js';
test('routes climb and descend half-height steps',()=>{const m=makeWorld();for(const [a,b] of [[{x:6,z:4},{x:7,z:7}],[{x:7,z:7},{x:6,z:4}]]){const p=findPath(m,a,b);assert.ok(p?.length);let prev=m.get(key(a.x,a.z));for(const t of p){assert.ok(Math.abs(t.h-prev.h)<=.5);assert.equal(t.blocked,false);prev=t;}}});
test('full-height lookout cannot be climbed or dropped from',()=>{const m=makeWorld();assert.equal(findPath(m,{x:9,z:6},{x:10,z:6}),null);assert.equal(findPath(m,{x:10,z:6},{x:9,z:6}),null);});
test('water, trees and outside tiles cannot be destinations',()=>{const m=makeWorld();for(const end of [{x:2,z:3},{x:3,z:1},{x:0,z:0}])assert.equal(findPath(m,{x:6,z:4},end),null);});
test('all six resources can be reached',()=>{const m=makeWorld();for(const [x,z]of [[4,6],[5,3],[8,3],[7,7],[9,9],[4,10]])assert.ok(findPath(m,{x:6,z:4},{x,z}));});
// The hover's hint (user report, 2026-10-16): a spot that can't be reached mustn't make it search a whole big map.
test('canReach: yes, no, or unknown when the search gives up',async()=>{const {canReach}=await import('./world.js');
 const m=new Map(),n=120;for(let z=0;z<n;z++)for(let x=0;x<n;x++)m.set(key(x,z),{x,z,h:1,blocked:false,water:false});
 // A tile walled off by a ring of solid ones.
 for(let z=59;z<=61;z++)for(let x=59;x<=61;x++)if(x!==60||z!==60)m.get(key(x,z)).blocked=true;
 assert.equal(canReach(m,{x:0,z:0},{x:20,z:20}),true);
 assert.equal(canReach(m,{x:0,z:0},{x:60,z:60},{limit:Infinity}),false,'searched everything');
 assert.equal(canReach(m,{x:0,z:0},{x:60,z:60},{limit:500}),false,'gave up going there, but the walled-off tile is small');
 assert.equal(canReach(m,{x:0,z:0},{x:119,z:119},{limit:50}),null,'gave up both ways');
 assert.equal(canReach(m,{x:0,z:0},{x:60,z:59}),false,'a solid tile');});
