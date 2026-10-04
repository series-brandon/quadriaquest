import test from 'node:test';
import assert from 'node:assert/strict';
import {attackPose,punchMotion} from './combat-motion.js';
import {hitLabel} from './combat-feedback.js';
test('attack winds back, snaps into impact, recovers and loops continuously',()=>{
 assert.equal(attackPose(.7),0);assert.ok(attackPose(1.3)<0);assert.ok(attackPose(1.47)>.5);assert.equal(attackPose(1.5),1);assert.equal(attackPose(1.8),0);
 for(let t=.001;t<5;t+=.001)assert.ok(Math.abs(attackPose(t)-attackPose(t-.001))<.02);
 assert.equal(punchMotion(0).right[2],.16);
});
test('combat numbers distinguish misses from zero damage',()=>{assert.equal(hitLabel(null),'Miss!');assert.equal(hitLabel(0),'0!');assert.equal(hitLabel(3),'3!');});
