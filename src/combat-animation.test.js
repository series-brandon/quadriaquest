import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Euler} from 'three';
import {attackAnimation,blockAnimation,attackWindow} from './combat-animation.js';
import {trainingTool,animateBow} from './training-models.js';
test('weapon attacks use distinct blade orientation, windup and impact at the damage boundary',()=>{
 const dagger={item:'copperDagger',style:'melee',interval:1.5},sword={...dagger,item:'swords'};
 const aim=attackAnimation(dagger,1.32).hands[0],stab=attackAnimation(dagger,1.5).hands[0];assert.ok(aim[3]>1.4);assert.ok(stab[2]>aim[2]+.4);
 const direction=new Vector3(0,1,0).applyEuler(new Euler(stab[3],stab[5],stab[4]));assert.ok(direction.z>.99);
 const rear=attackAnimation(sword,1.32).hands[0],slash=attackAnimation(sword,1.5).hands[0];assert.ok(rear[2]<0);assert.ok(rear[1]>slash[1]);assert.ok(slash[2]>.6);
 assert.equal(attackWindow(dagger,.7),false);assert.equal(attackWindow(dagger,1.3),true);assert.equal(attackWindow(dagger,1.5),true);
});
test('bow hand follows deforming string and release coincides with the projectile clock',()=>{
 const profile={style:'ranged',interval:1.7},draw=attackAnimation(profile,1.69),release=attackAnimation(profile,1.7),bow=trainingTool('bows');
 assert.ok(draw.bowDraw>.99);assert.ok(draw.hands[1][2]<draw.hands[0][2]-.37);assert.equal(release.bowDraw,0);assert.equal(release.nocked,false);
 animateBow(bow,draw.bowDraw,draw.nocked);assert.ok(bow.getObjectByName('bow-string').geometry.attributes.position.getZ(1)<-.37);assert.ok(bow.getObjectByName('nocked-arrow').visible);animateBow(bow);assert.equal(bow.getObjectByName('nocked-arrow').visible,false);
});
test('magic holds close together near the body then pushes forward rapidly',()=>{
 const profile={style:'magic',interval:1.8},ready=attackAnimation(profile,1.6),push=attackAnimation(profile,1.8);assert.equal(ready.hands[1][0]-ready.hands[0][0],.3);assert.ok(ready.hands[0][2]>=.45&&ready.hands[0][2]<.46);assert.ok(push.hands[0][2]>.65);
});
test('block poses cover bare hands, blades, bows, magic and every legal shield combination',()=>{
 for(const item of [null,'swords','copperDagger','bows'])for(const offHand of [null,'shields','copperShield']){if(item==='bows'&&offHand)continue;const pose=blockAnimation({item,offHand},.1);for(const h of pose.hands)assert.ok(h.every(Number.isFinite));if(offHand){assert.ok(pose.hands[1][2]>.5);assert.equal(pose.hands[0][0],-.47);}else if(!item)assert.ok(pose.hands.every(h=>h[1]>.55));else if(item!=='bows')assert.ok(pose.hands[0][4]<-.7);}
 const end=blockAnimation({},.42);assert.equal(end.hands[0][1],.33);
});
