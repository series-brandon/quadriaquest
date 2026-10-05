import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Euler} from 'three';
import {attackAnimation,blockAnimation,attackWindow,equipmentIdleHands} from './combat-animation.js';
import {trainingTool,animateBow} from './training-models.js';
test('weapon attacks use distinct blade orientation, windup and impact at the damage boundary',()=>{
 const dagger={item:'copperDagger',style:'melee',interval:1.5},sword={...dagger,item:'swords'};
 const aim=attackAnimation(dagger,1.32).hands[0],stab=attackAnimation(dagger,1.5).hands[0];assert.ok(aim[3]>1.4);assert.ok(stab[2]>aim[2]+.4);
 const direction=new Vector3(0,1,0).applyEuler(new Euler(stab[3],stab[5],stab[4]));assert.ok(direction.z>.97);assert.ok(direction.x>.2);
 const rear=attackAnimation(sword,1.32).hands[0],slash=attackAnimation(sword,1.5).hands[0];assert.ok(rear[2]<0);assert.ok(rear[1]>slash[1]);assert.ok(slash[2]>.6);
 assert.equal(attackWindow(dagger,.7),false);assert.equal(attackWindow(dagger,1.3),true);assert.equal(attackWindow(dagger,1.5),true);
});
test('bow hand follows deforming string and release coincides with the projectile clock',()=>{
 const profile={style:'ranged',interval:1.7},draw=attackAnimation(profile,1.69),release=attackAnimation(profile,1.7),bow=trainingTool('bows');
 assert.ok(draw.bowDraw>.99);assert.ok(draw.hands[0][2]<draw.hands[1][2]-.37);assert.equal(release.bowDraw,0);assert.equal(release.nocked,false);
 animateBow(bow,draw.bowDraw,draw.nocked);assert.ok(bow.getObjectByName('bow-string').geometry.attributes.position.getZ(1)<-.37);assert.ok(bow.getObjectByName('nocked-arrow').visible);animateBow(bow);assert.equal(bow.getObjectByName('nocked-arrow').visible,false);
});
test('magic holds close together near the body then pushes forward rapidly',()=>{
 const profile={style:'magic',interval:1.8},ready=attackAnimation(profile,1.6),push=attackAnimation(profile,1.8);assert.equal(ready.hands[1][0]-ready.hands[0][0],.3);assert.ok(ready.hands[0][2]>=.45&&ready.hands[0][2]<.46);assert.ok(push.hands[0][2]>.65);
});
test('block poses cover bare hands, blades, bows, magic and every legal shield combination',()=>{
 for(const item of [null,'swords','copperDagger','bows'])for(const offHand of [null,'shields','copperShield']){if(item==='bows'&&offHand)continue;const pose=blockAnimation({item,offHand},.1);for(const h of pose.hands)assert.ok(h.every(Number.isFinite));if(offHand){assert.ok(pose.hands[1][2]>.5);assert.equal(pose.hands[0][0],-.47);}else if(!item)assert.ok(pose.hands.every(h=>h[1]>.55));else if(item!=='bows')assert.ok(pose.hands[0][4]<-.7);}
 const end=blockAnimation({},.42);assert.equal(end.hands[0][1],.33);
});


test('weapon hands stay outside the body through windup and recovery',()=>{
 const distance=([x,y,z])=>{const q=[Math.abs(x)-.20,Math.abs(y-.43)-.20,Math.abs(z)-.20];return Math.hypot(...q.map(v=>Math.max(v,0)))+Math.min(Math.max(...q),0)-.16;};
 for(const item of ['copperDagger','swords','bows']){
  const profile={item,style:item==='bows'?'ranged':'melee',interval:1.5};assert.deepEqual(attackAnimation(profile,0).hands[0].slice(0,3),[-.46,.33,.08]);
  for(let time=0;time<=3;time+=.002)for(const hand of attackAnimation(profile,time).hands)assert.ok(distance(hand)>=.095,`${item} hand clips at ${time}`);
 }
});
test('slash preserves original rotation keys despite the curved translation',()=>{
 const profile={item:'swords',style:'melee',interval:1.5};
 attackAnimation(profile,1.32).hands[0].slice(3).forEach((v,i)=>assert.ok(Math.abs(v-[-.65,-.12,-.12][i])<1e-12));
 assert.deepEqual(attackAnimation(profile,1.5).hands[0].slice(3),[.95,Math.PI/4,Math.PI/3]);
});
test('off hand grips the wooden bow center and main hand follows the string while the torso turns',async()=>{
 const {makeSlime}=await import('./slime-model.js'),{heldTool,heldToolHand}=await import('./tool-models.js');
 const rig=makeSlime(),bow=heldTool('bows');assert.equal(heldToolHand('bows'),1);rig.hands[1].add(bow);
 let setMatrix;
 for(const time of [.8,.85,.9,1,1.3,1.5,1.69]){
  const motion=attackAnimation({style:'ranged',interval:1.7},time);rig.group.rotation.y=motion.pose.twist;
  motion.hands.forEach(([x,y,z,pitch,roll,yaw],i)=>{rig.hands[i].position.set(x,y,z);rig.hands[i].rotation.set(pitch,yaw,roll);});animateBow(bow,motion.bowDraw,motion.nocked);rig.group.updateMatrixWorld(true);
  if(!setMatrix)setMatrix=bow.matrixWorld.toArray();else assert.deepEqual(bow.matrixWorld.toArray(),setMatrix);
  const grip=bow.localToWorld(new Vector3(0,0,.22)),holding=rig.hands[1].getWorldPosition(new Vector3());assert.ok(grip.distanceTo(holding)<1e-9);
  const string=bow.localToWorld(new Vector3(0,0,-.38*motion.bowDraw)),pulling=rig.hands[0].getWorldPosition(new Vector3());assert.ok(string.distanceTo(pulling)<1e-9);
  const aim=new Vector3(0,0,1).transformDirection(bow.matrixWorld);assert.ok(aim.z>.999);
 }
 assert.ok(attackAnimation({style:'ranged',interval:1.7},1.69).pose.twist<-.6);
});

test('equipped attacks and blocks start in the shared relaxed carry pose',()=>{
 for(const item of ['swords','copperDagger','bows']){
  const profile={item,style:item==='bows'?'ranged':'melee',interval:1.7};
  assert.deepEqual(attackAnimation(profile,0).hands,equipmentIdleHands(profile));
  assert.deepEqual(blockAnimation(profile,0).hands,equipmentIdleHands(profile));
 }
 const bow=attackAnimation({item:'bows',style:'ranged',interval:1.7},.9);
 new Vector3(...bow.hands[1].slice(0,3)).applyAxisAngle(new Vector3(0,1,0),bow.pose.twist).toArray().forEach((v,i)=>assert.ok(Math.abs(v-[-.365,.55,.908][i])<1e-12));
 assert.ok(bow.bowDraw<1e-12);
});

test('relaxed bow has its string above the wood and drawing hand carries the arrow into alignment',async()=>{
 const {makeSlime}=await import('./slime-model.js'),{heldTool}=await import('./tool-models.js'),{createBowPresentation}=await import('./bow-presentation.js');
 const rig=makeSlime(),bow=heldTool('bows');rig.hands[1].add(bow);
 const presentation=createBowPresentation(bow,rig.hands),profile={item:'bows',style:'ranged',interval:1.7};
 const apply=time=>{const motion=attackAnimation(profile,time);rig.group.rotation.y=motion.pose.twist;motion.hands.forEach(([x,y,z,pitch,roll,yaw],i)=>{rig.hands[i].position.set(x,y,z);rig.hands[i].rotation.set(pitch,yaw,roll);});presentation.update(motion);rig.group.updateMatrixWorld(true);return motion;};
 apply(0);assert.equal(presentation.arrow.visible,false);
 const grip=bow.localToWorld(new Vector3(0,0,.22)),string=bow.localToWorld(new Vector3());assert.ok(string.y>grip.y+.21);
 const limb=bow.localToWorld(new Vector3(0,.48,0));assert.ok(Math.abs(limb.y-string.y)<1e-9);
 apply(.56);assert.equal(presentation.arrow.parent,rig.hands[0]);assert.equal(presentation.arrow.visible,true);assert.ok(presentation.arrow.rotation.x<.1);
 for(const time of [.9,1.3,1.69]){const motion=apply(time),nock=presentation.arrow.localToWorld(new Vector3(0,-.26,0)),string=bow.localToWorld(new Vector3(0,0,-.38*motion.bowDraw));assert.ok(nock.distanceTo(string)<1e-9);assert.ok(new Vector3(0,1,0).transformDirection(presentation.arrow.matrixWorld).z>.999);assert.equal(bow.getObjectByName('nocked-arrow').visible,false);}
 apply(1.7);assert.equal(presentation.arrow.visible,false);presentation.update(null);assert.equal(presentation.arrow.visible,false);
});

test('one-handed attacks counterbalance with the off hand and settle their torso momentum',()=>{
 for(const item of [null,'copperDagger','swords'])for(const offHand of [null,'copperShield']){
  const profile={item,offHand,interval:1.5},ready=attackAnimation(profile,0),impact=attackAnimation(profile,1.5),rest=attackAnimation(profile,1.9);
  assert.ok(impact.hands[1][2]<ready.hands[1][2]-.13);assert.ok(impact.pose.twist>.1&&impact.pose.twist<.15);
  assert.ok(Math.abs(rest.pose.twist)<1e-9);assert.ok(Math.abs(rest.hands[1][2]-ready.hands[1][2])<1e-9);
 }
});
test('bow sweep and body turn finish during setup before the stationary bow is drawn',()=>{
 const profile={item:'bows',style:'ranged',interval:1.7},ready=attackAnimation(profile,.9),drawn=attackAnimation(profile,1.69);
 const worldHand=(pose,index)=>new Vector3(...pose.hands[index].slice(0,3)).applyAxisAngle(new Vector3(0,1,0),pose.pose.twist);
 assert.ok(attackAnimation(profile,.7).pose.twist<0);
 for(const time of [.8,.85,.9,1.1,1.3,1.5,1.69]){const pose=attackAnimation(profile,time);assert.equal(pose.pose.twist,-.65);assert.deepEqual(pose.hands[1],ready.hands[1]);assert.ok(Math.abs(worldHand(pose,0).x-worldHand(ready,0).x)<1e-12);}
 assert.ok(worldHand(attackAnimation(profile,.55),1).x>worldHand(ready,1).x+.5);
 assert.ok(drawn.pose.twist<-.6);
 assert.ok(worldHand(drawn,0).z<worldHand(ready,0).z-.37);
 assert.ok(worldHand(drawn,0).z<worldHand(ready,0).z-.25);
 assert.ok(drawn.hands[1][0]>.18&&drawn.hands[1][0]<.3); // Bow remains on the torso's left.
 const hand=drawn.hands[0];assert.ok(Math.abs(hand[0])<.2);assert.equal(hand[1],.55);assert.ok(hand[2]>.455&&hand[2]<.47);
});
test('shield blocks preserve the main-hand carry orientation through the whole block',()=>{
 for(const item of [null,'swords','copperDagger'])for(const offHand of ['shields','copperShield']){
  const profile={item,offHand},rest=equipmentIdleHands(profile);
  for(const age of [0,.035,.1,.25,.35,.42])assert.deepEqual(blockAnimation(profile,age).hands[0].slice(3),rest[0].slice(3));
  assert.equal(blockAnimation(profile,.1).hands[1][5],-Math.PI/2);
 }
});
