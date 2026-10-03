import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {animateResourceHit,animateResourceDepletion} from './resource-depletion.js';
for(const kind of ['tree','boulder']){
 test(`${kind} reacts at tool contact with one sound per strike`,()=>{
  const resource={kind,group:new Group()},state={},sounds=[];
  let contacts=0,previous=false;
  for(let i=0;i<240;i++){
   const motion=animateResourceHit(resource,i/60,state,name=>sounds.push(name));
   assert.equal(resource.group.rotation.z,motion.impact);
   if(motion.impact>0&&!previous)contacts++;
   previous=motion.impact>0;
  }
  assert.ok(contacts>0);assert.equal(sounds.length,contacts);
  assert.ok(sounds.every(s=>s===(kind==='boulder'?'mine':'chop')));
 });
 test(`${kind} completes its depletion in 0.85 seconds`,()=>{
  const resource={kind,group:new Group()},axis=new Vector3(0,0,-1);
  assert.equal(animateResourceDepletion(resource,.425,axis),false);
  if(kind==='boulder')assert.equal(resource.group.scale.x,.5);
  else assert.ok(resource.group.rotation.z<0);
  assert.equal(animateResourceDepletion(resource,.85,axis),true);
  if(kind==='boulder')assert.equal(resource.group.scale.x,.001);
  else assert.ok(Math.abs(resource.group.rotation.z+Math.PI/2)<1e-8);
 });
}
