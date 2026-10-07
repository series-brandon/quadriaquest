import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoseBlender,motionKey} from './pose-blend.js';
const pose=(x,lean)=>({pose:{squash:1,stretch:1,twist:0,lean},hands:[[x,.4,.5,0,0,0],[-x,.4,.5,0,0,0]],expression:'focused'});

test('changing motion crossfades hands and body from the last shown pose; same motion passes through',()=>{
 const b=createPoseBlender({duration:.2});
 assert.deepEqual(b.update('a',pose(1,0),.016).hands[0][0],1,'first motion is shown as-is');
 assert.equal(b.update('a',pose(2,0),.016).hands[0][0],2,'no blend without a motion change');
 const start=b.update('b',pose(-1,.1),.0);assert.equal(start.hands[0][0],2,'starts exactly where the body was');assert.equal(start.pose.lean,0);
 const mid=b.update('b',pose(-1,.1),.1);assert.ok(mid.hands[0][0]<2&&mid.hands[0][0]>-1);assert.ok(mid.pose.lean>0&&mid.pose.lean<.1);assert.equal(mid.expression,'focused');
 const done=b.update('b',pose(-1,.1),.11);assert.equal(done.hands[0][0],-1);assert.equal(b.blending,false);
 // Interrupting a blend starts the next one from the partially blended pose (no jump back).
 b.update('c',pose(5,0),0);const shown=b.update('c',pose(5,0),.1).hands[0][0];const next=b.update('d',pose(0,0),0).hands[0][0];assert.equal(next,shown);
 assert.equal(b.update('e',pose(9,0),.01,{instant:true}).hands[0][0],9,'instant changes snap');
 b.reset();assert.equal(b.update('f',pose(3,0),.01).hands[0][0],3);
});

test('motion keys distinguish attack motion, striking hand and block style',()=>{
 assert.notEqual(motionKey('Combat',{item:'copperDagger'}),motionKey('Combat',{item:null}),'stab vs punch');
 assert.notEqual(motionKey('Combat',{item:null,hand:'main'}),motionKey('Combat',{item:null,hand:'off'}),'left vs right');
 assert.equal(motionKey('Combat',{item:'copperDagger',damageType:'slashing'}),motionKey('Combat',{item:'swords'}),'both slash');
 assert.notEqual(motionKey('Block',{offHand:'copperShield'}),motionKey('Block',{}));
 assert.equal(motionKey('Eating'),'Eating');assert.equal(motionKey(null),'none');
});
