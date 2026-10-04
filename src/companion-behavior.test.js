import test from 'node:test';
import {playerActionMotion} from './player-action-motion.js';
import {Vector3} from 'three';
import assert from 'node:assert/strict';
import {createCompanionBehavior} from './companion-behavior.js';
import {companion,animateCompanion} from './willowbank-models.js';
import {eatingMotion,EATING_DURATION} from './eating-motion.js';
test('follower settles, scratches only after a delay, and movement interrupts rest/petting',()=>{
 const b=createCompanionBehavior(()=>0);
 assert.equal(b.update(3,false).motion,'Idle');
 assert.equal(b.update(2,false).motion,'Sit');
 let scratch=false;for(let i=0;i<150;i++)if(b.update(.1,false).motion==='Scratch')scratch=true;
 assert.ok(scratch);b.pet();assert.equal(b.update(.1,false).motion,'Petting');
 assert.equal(b.update(.1,true).motion,'Walk');assert.equal(b.petting,false);
 assert.equal(b.update(.1,false).motion,'Idle');
 b.reset();assert.equal(b.update(0,false).sit,0);
});
test('pet hearts and scratch paw reset cleanly when switching back to walking',()=>{
 const model=companion();animateCompanion(model,1,{motion:'Petting',age:.8});
 assert.ok(model.getObjectByName('pet-heart-0').visible);
 animateCompanion(model,1,{motion:'Scratch',age:1,sit:1});
 const seated=companion();animateCompanion(seated,1,{motion:'Sit'});
 assert.ok(model.getObjectByName('companion-leg1-0.18').position.y>seated.getObjectByName('companion-leg1-0.18').position.y+.03);
 animateCompanion(model,2,{moving:true,motion:'Walk'});
 assert.equal(model.getObjectByName('pet-heart-0').visible,false);
 assert.ok(model.getObjectByName('companion-leg1-0.18').position.y<.11);
 assert.ok(Math.abs(model.getObjectByName('companion-body').rotation.x)<.0001);
});
test('eating brings hands to mouth and lowers them without an item prop',()=>{
 const start=eatingMotion(0),bite=eatingMotion(.7),end=eatingMotion(EATING_DURATION);
 assert.ok(bite.hands[0][1]>start.hands[0][1]);
 for(const pose of [start,bite,end])assert.equal(pose.prop,undefined);assert.equal(end.expression,'pleased');
 assert.ok(Math.abs(bite.hands[0][0])<Math.abs(start.hands[0][0]));
 for(let t=0;t<=EATING_DURATION;t+=.02){const pose=eatingMotion(t);assert.equal(pose.expression,'pleased');assert.ok(pose.hands[0][1]+.105<.49,'hands stay below the happy eyes');}
 assert.ok(end.hands[0][1]<bite.hands[0][1]);
});

test('sit scrunches the torso, grounds the paws, levels the head, and resets for walking',()=>{
 const model=companion(),body=model.getObjectByName('companion-body'),head=model.getObjectByName('companion-head'),torso=model.getObjectByName('companion-torso');
 animateCompanion(model,1,{motion:'Sit'});model.updateMatrixWorld(true);
 assert.ok(torso.scale.z<.8);assert.equal(head.scale.z,1);
 const direction=new Vector3(0,0,1).transformDirection(head.matrixWorld);
 assert.ok(Math.abs(direction.y)<.001,'seated face looks parallel to the ground');
 for(const side of [-1,1])for(const z of [-.18,.10]){
  const paw=model.getObjectByName('companion-leg'+side+z),center=paw.getWorldPosition(new Vector3());
  assert.ok(Math.abs(center.y-.065*.78)<.001,'paws share the ground plane');
  if(z<0)assert.ok(Math.abs(paw.position.x)>.12);
 }
 animateCompanion(model,2,{motion:'Walk',moving:true});
 assert.equal(torso.scale.z,1);assert.equal(torso.position.z,-.045);assert.ok(Math.abs(body.rotation.x)<.0001);
 assert.equal(model.getObjectByName('companion-tail').position.z,-.285);
});

test('scratch keeps the seated body while tilting toward the paw and returns to the exact sit pose',()=>{
 for(const age of [0,.2,.7,1.5,2.2,2.4]){
  const seated=companion(),scratching=companion();
  animateCompanion(seated,age,{motion:'Sit'});animateCompanion(scratching,age,{motion:'Scratch',age});
  const pawName='companion-leg1-0.18';
  seated.traverse(part=>{
   if(!part.name||part.name===pawName)return;
   const other=scratching.getObjectByName(part.name);
   assert.deepEqual(other.position.toArray(),part.position.toArray(),part.name+' position');
   if(part.name!=='companion-head'||age===0||age===2.4)assert.deepEqual(other.rotation.toArray(),part.rotation.toArray(),part.name+' rotation');
   assert.deepEqual(other.scale.toArray(),part.scale.toArray(),part.name+' scale');
  });
  const paw=scratching.getObjectByName(pawName);
  if(age===0||age===2.4)assert.deepEqual(paw.position.toArray(),seated.getObjectByName(pawName).position.toArray());
  if(age===.7||age===1.5){
   const head=scratching.getObjectByName('companion-head');
   assert.ok(head.rotation.z<-.3&&head.rotation.y>.1,'head tilts and turns toward the paw');
   const corner=new Vector3(.25,-.14,-.10).applyEuler(head.rotation).add(head.position);
   assert.ok(paw.position.distanceTo(corner)<.015,'small strokes at the bottom corner');
   animateCompanion(scratching,age,{motion:'Sit'});
   assert.equal(head.rotation.y,0,'turn resets when scratching is interrupted');
  }
 }
});

test('corgi expression overrides are independent of animation and petting defaults to happy',()=>{
 const model=companion(),eye=model.getObjectByName('companion-eye1');
 animateCompanion(model,1,{motion:'Idle'});const idleEye=eye.scale.y;
 animateCompanion(model,1,{motion:'Idle',expression:'Happy'});const happyEye=eye.scale.y;
 assert.notEqual(happyEye,idleEye);
 animateCompanion(model,1,{motion:'Petting',age:.8,expression:'default'});assert.equal(eye.scale.y,happyEye);
 animateCompanion(model,1,{motion:'Petting',age:.8,expression:'Idle'});assert.equal(eye.scale.y,idleEye);
 animateCompanion(model,1,{motion:'Petting',age:.8,expression:'Sad'});
 assert.ok(model.getObjectByName('sad-mouth').visible);assert.equal(eye.scale.y,.85);
 const heart=model.getObjectByName('pet-heart-0');heart.geometry.computeBoundingBox();
 assert.ok(heart.geometry.boundingBox.max.z-heart.geometry.boundingBox.min.z>.04);
 animateCompanion(model,1,{motion:'Petting',age:1.8});assert.ok(heart.visible);
 animateCompanion(model,1,{motion:'Idle'});assert.equal(heart.visible,false);
});

test('corgi eye shines hide for happy eyes and blinks and return with open eyes',()=>{
 const model=companion();
 for(const [time,options,visible] of [
  [1,{expression:'Happy'},false],
  [1,{motion:'Petting'},false],
  [1,{expression:'Idle'},true],
  [4.6,{expression:'Idle'},false],
  [4.8,{expression:'Idle'},true],
  [4.6,{expression:'Sad'},false],
  [4.8,{expression:'Sad'},true],
 ]){
  animateCompanion(model,time,options);
  for(const side of [-1,1])assert.equal(model.getObjectByName('companion-eye-shine'+side).visible,visible);
 }
});

test('slime petting uses the shared generic interaction animation',()=>{
 for(const time of [0,.3,1,2.6]){
  const petting=playerActionMotion('Petting',time),gathering=playerActionMotion('Gathering',time);
  assert.equal(petting.expression,'happy');
  assert.deepEqual({...petting,expression:gathering.expression},gathering);
 }
});

test('companion sleeps after the player, wakes with them, and movement/petting interrupt sleep',()=>{
 const b=createCompanionBehavior(()=>0);b.update(30,false);
 assert.notEqual(b.update(.1,false,2).motion,'Sleeping');
 const sleep=b.update(.1,false,3);assert.equal(sleep.motion,'Sleeping');assert.equal(sleep.age,.5);
 assert.equal(b.update(.1,false,7).age,4.5);
 assert.notEqual(b.update(.1,false,0).motion,'Sleeping');
 assert.equal(b.update(.1,true,7).motion,'Walk');
 b.pet();assert.equal(b.update(.1,false,7).motion,'Petting');
});
test('sleep settles from sit into a grounded sploot and fully resets when waking',()=>{
 const model=companion(),seated=companion();animateCompanion(seated,0,{motion:'Sit'});animateCompanion(model,0,{motion:'Sleeping',age:0});
 for(const name of ['companion-head','companion-body','companion-torso']){
  assert.deepEqual(model.getObjectByName(name).position.toArray(),seated.getObjectByName(name).position.toArray());
 }
 animateCompanion(model,4,{motion:'Sleeping',age:4});
 const head=model.getObjectByName('companion-head');assert.ok(head.position.y<.3&&head.rotation.y>.5&&head.rotation.z>.3&&head.position.x>0);
 assert.ok(model.getObjectByName('companion-leg1-0.18').position.z<-.25);
 assert.equal(model.getObjectByName('companion-eye-shine1').visible,false);
 assert.equal(model.getObjectByName('companion-tongue'),undefined);
 assert.ok(model.getObjectByName('companion-sleep-z0').visible);
 animateCompanion(model,5,{motion:'Sit'});animateCompanion(seated,5,{motion:'Sit'});
 seated.traverse(part=>{if(!part.name||part.name.startsWith('companion-sleep-z'))return;const actual=model.getObjectByName(part.name);assert.deepEqual(actual.position.toArray(),part.position.toArray(),part.name);assert.deepEqual(actual.scale.toArray(),part.scale.toArray(),part.name);assert.deepEqual(actual.rotation.toArray(),part.rotation.toArray(),part.name);});
 assert.equal(model.getObjectByName('companion-sleep-z0').visible,false);
});

test('rump patches sit higher and compress with the torso while sleeping',()=>{
 const model=companion(),torso=model.getObjectByName('companion-torso');
 for(const motion of ['Idle','Sit','Sleeping','Walk']){
  animateCompanion(model,4,{motion,age:4});
  for(const side of [-1,1]){
   const rump=model.getObjectByName('companion-rump'+side);
   assert.equal(rump.scale.y,torso.scale.y);
   assert.ok(Math.abs(rump.position.y-(torso.position.y+.015*torso.scale.y))<1e-9);
  }
 }
});
