import test from 'node:test';
import assert from 'node:assert/strict';
import {createBridgeInjury,hammerInjuryPose} from './bridge-injury.js';
test('bridge injury fires once at three-quarter progress and cannot defeat the player',()=>{
 const injury=createBridgeInjury();
 assert.equal(injury.atProgress(.74,30),null);
 assert.deepEqual(injury.atProgress(.75,30),{health:25,damage:5});
 assert.equal(injury.applied,true);
 assert.equal(injury.atProgress(1,25),null);
 // Restarting an interrupted repair does not reset the chapter event.
 assert.equal(injury.atProgress(0,25),null);assert.equal(injury.atProgress(.8,25),null);
 injury.reset();assert.equal(injury.applied,false);
 assert.deepEqual(injury.atProgress(.9,3),{health:1,damage:2});
});
test('injury motion recoils, shakes a hand, and settles',()=>{
 assert.ok(hammerInjuryPose(0).squash<1);
 assert.notDeepEqual(hammerInjuryPose(.1).hands,hammerInjuryPose(.2).hands);
 assert.equal(hammerInjuryPose(1.2).squash,1);
 assert.equal(hammerInjuryPose(1.2).hands[1][0],.34);
});
