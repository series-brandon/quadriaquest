import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWaterEffects,waterSettings} from './water-effects.js';
test('free shoreline moves, pinned shoreline stays still, and adjoining tiles remain continuous',()=>{
 const saved={...waterSettings};
 try{
  Object.assign(waterSettings,{enabled:true,waves:true,waveStrength:4,speed:1,fixedShoreline:false});
  const effects=createWaterEffects(new THREE.Group());
  const left=effects.add(0,.85,0),right=effects.add(1,.85,0);
  const heights=(mesh,x)=>{const p=mesh.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>i).filter(i=>Math.abs(p.getX(i)-x)<1e-6).map(i=>p.getY(i));};
  effects.update(1);
  assert.ok(heights(left,-.5).some(y=>Math.abs(y)>.001));
  assert.deepEqual(heights(left,.5),heights(right,-.5));
  for(const mesh of [left,right])for(const y of heights(mesh,.5))assert.ok(Math.abs(y)<=.072);
  waterSettings.fixedShoreline=true;effects.update(0);
  assert.ok(heights(left,-.5).every(y=>y===0));
  assert.deepEqual(heights(left,.5),heights(right,-.5));
  waterSettings.fixedShoreline=false;effects.update(0);
  assert.ok(heights(left,-.5).some(y=>Math.abs(y)>.001));
 }finally{Object.assign(waterSettings,saved);}
});
