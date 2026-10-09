import test from 'node:test';
import assert from 'node:assert/strict';
import {attackPose,punchMotion,PUNCH_GUARD} from './combat-motion.js';
import {hitLabel} from './combat-feedback.js';
test('attack winds back, snaps into impact, recovers and loops continuously',()=>{
 assert.equal(attackPose(.7),0);assert.ok(attackPose(1.3)<0);assert.ok(attackPose(1.47)>.5);assert.equal(attackPose(1.5),1);assert.equal(attackPose(1.8),0);
 for(let t=.001;t<5;t+=.001)assert.ok(Math.abs(attackPose(t)-attackPose(t-.001))<.02);

});
test('combat numbers distinguish misses from zero damage',()=>{assert.equal(hitLabel(null),'Miss!');assert.equal(hitLabel(0),'0!');assert.equal(hitLabel(3),'3!');});

test('punch: symmetrical guard, forward strike with the guard hand pulling back, then a full return',()=>{
 const mirror=h=>[-h[0],h[1],h[2],h[3],-h[4],-h[5]];
 // At rest both fists are mirror images, so the off-hand strike is an exact mirror of the main-hand one.
 const rest=punchMotion(.5);assert.deepEqual(rest.right,PUNCH_GUARD[0]);assert.deepEqual(rest.left,PUNCH_GUARD[1]);
 for(let i=0;i<6;i++)assert.ok(Math.abs(mirror(rest.right)[i]-rest.left[i])<1e-12);
 const load=punchMotion(1.3),hit=punchMotion(1.5);
 assert.ok(load.right[2]<rest.right[2],'loads slightly back');
 assert.ok(hit.right[2]>rest.right[2]+.4,'strikes forward');assert.ok(hit.right[0]>rest.right[0],'and inward');
 assert.ok(hit.left[2]<rest.left[2],'the guard hand pulls back');assert.ok(hit.twist>0&&hit.lean>0);
 for(const t of [1.8,2.5])for(const side of ['right','left'])assert.deepEqual(punchMotion(t)[side],rest[side],'returns to guard');
 for(let t=0;t<3;t+=.01)for(const side of ['right','left'])assert.ok(punchMotion(t)[side].every(Number.isFinite)&&punchMotion(t)[side].length===6);
});
