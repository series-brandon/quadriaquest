import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdleClock,socialMotion,SOCIAL_DURATIONS} from './slime-social.js';
test('sleep starts at thirty idle seconds and resets on input or work',()=>{
 const timer=createIdleClock();assert.equal(timer.update(29.9,true),false);assert.equal(timer.update(.1,true),true);
 timer.wake();assert.equal(timer.update(1,true),false);
 timer.update(29,true);assert.equal(timer.update(1,false),false);assert.equal(timer.update(29,true),false);
});
test('hop lands and wave lowers its hand when reactions finish',()=>{
 assert.ok(socialMotion('Happy hop',.48).lift>.4);
 assert.equal(socialMotion('Happy hop',SOCIAL_DURATIONS['Happy hop']).lift,0);
 assert.ok(socialMotion('Wave',1).hands[0][1]>.9);
 assert.equal(socialMotion('Wave',SOCIAL_DURATIONS.Wave).hands[0][1],.33);
 assert.equal(socialMotion('Sleeping',0).expression,'sleeping');
});
