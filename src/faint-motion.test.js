import test from 'node:test';
import assert from 'node:assert/strict';
import {faintPose,FAINT_FALL_DURATION,FAINT_SQUISH_START,FAINT_MELT_DURATION,FAINT_FADE_START,FAINT_RESPAWN_TIME} from './faint-motion.js';
import {playerActionMotion} from './player-action-motion.js';
test('fainting melts gradually, settles before fading, and uses fainted eyes',()=>{
 assert.equal(faintPose(0).squash,1);
 let previous=1;
 for(let t=0;t<=FAINT_MELT_DURATION;t+=.05){const pose=faintPose(t);assert.ok(pose.squash<=previous);assert.ok(pose.squash>0);previous=pose.squash;}
 assert.ok(faintPose(.7).lean<0);
 assert.equal(faintPose(FAINT_MELT_DURATION).lean,-Math.PI/2);
 assert.deepEqual(faintPose(FAINT_FADE_START),faintPose(FAINT_RESPAWN_TIME));
 assert.ok(FAINT_FADE_START>FAINT_MELT_DURATION);
 assert.equal(playerActionMotion('Defeated',1).expression,'fainted');
});

test('faint settles face-up with 65 percent vertical thickness',()=>{const pose=faintPose(FAINT_MELT_DURATION);assert.equal(pose.scale[2],.65);assert.equal(pose.scale[1],1);let previous=0;for(let t=0;t<FAINT_FALL_DURATION;t+=.05){assert.ok(faintPose(t).lean<=previous);previous=faintPose(t).lean;}});

test('backward fall finishes before the squish begins',()=>{
 for(let t=0;t<=FAINT_FALL_DURATION;t+=.025)assert.deepEqual(faintPose(t).scale,[1,1,1]);
 assert.equal(faintPose(FAINT_FALL_DURATION).lean,-Math.PI/2);
 assert.equal(faintPose(FAINT_FALL_DURATION).handDrop,0);
 assert.ok(faintPose(FAINT_SQUISH_START+.2).scale[2]<1);
});

test('landing bobs before hands drop and the resting squish is lopsided',()=>{
 assert.ok(faintPose(FAINT_FALL_DURATION+.06).lean>-Math.PI/2);
 assert.equal(faintPose(FAINT_SQUISH_START).handDrop,0);
 assert.equal(faintPose(FAINT_SQUISH_START+.2).handDrop,1);
 assert.ok(faintPose(FAINT_MELT_DURATION).bend>0);
});
