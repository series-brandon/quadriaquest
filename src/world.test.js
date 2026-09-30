import test from 'node:test';import assert from 'node:assert/strict';import {makeWorld,findPath,key} from './world.js';
test('routes climb and descend half-height steps',()=>{const m=makeWorld();for(const [a,b] of [[{x:6,z:4},{x:7,z:7}],[{x:7,z:7},{x:6,z:4}]]){const p=findPath(m,a,b);assert.ok(p?.length);let prev=m.get(key(a.x,a.z));for(const t of p){assert.ok(Math.abs(t.h-prev.h)<=.5);assert.equal(t.blocked,false);prev=t;}}});
test('full-height lookout cannot be climbed or dropped from',()=>{const m=makeWorld();assert.equal(findPath(m,{x:9,z:6},{x:10,z:6}),null);assert.equal(findPath(m,{x:10,z:6},{x:9,z:6}),null);});
test('water, trees and outside tiles cannot be destinations',()=>{const m=makeWorld();for(const end of [{x:2,z:3},{x:3,z:1},{x:0,z:0}])assert.equal(findPath(m,{x:6,z:4},end),null);});
test('all six resources can be reached',()=>{const m=makeWorld();for(const [x,z]of [[4,6],[5,3],[8,3],[7,7],[9,9],[4,10]])assert.ok(findPath(m,{x:6,z:4},{x,z}));});
