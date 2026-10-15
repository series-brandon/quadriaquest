import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAtmosphere,atmosphereOf,fogRange,PARTICLES} from './atmosphere.js';
import {BIOME_IDS,biomeRule} from './biome-rules.js';

test('every biome’s particles are a kind the atmosphere draws',()=>{
 for(const id of BIOME_IDS){const p=biomeRule(id).atmosphere.particles;assert.ok(!p||PARTICLES[p],`${id}: ${p}`);}
});
test('fog: none when clear, nearer the denser it is',()=>{
 const far=120;assert.ok(fogRange(0,far)[0]>far*10,'clear');
 const [,light]=fogRange(.08,far),[,thick]=fogRange(.25,far);assert.ok(thick<light&&light<far*1.6);
 assert.equal(atmosphereOf(null).particles,null);assert.equal(atmosphereOf('wetland').particles,'midges');
});
test('the atmosphere crossfades to the biome under the view and back to clear',()=>{
 const scene=new THREE.Scene(),hemisphere=new THREE.HemisphereLight('#fffce8','#879981',2.6),sun=new THREE.DirectionalLight('#fff3d3',3),camera=new THREE.PerspectiveCamera(45,1,.1,120);
 const a=createAtmosphere({scene,hemisphere,sun}),center=new THREE.Vector3();
 assert.equal(scene.fog,null,'no fog to start');
 for(let i=0;i<300;i++)a.update(1/30,{biome:'wetland',center,camera,far:120});
 assert.equal(a.state.particles,'midges');assert.ok(a.state.opacity>.5);assert.ok(scene.fog.far<120,'wetland fog');assert.ok(hemisphere.intensity<2.6);
 for(let i=0;i<300;i++)a.update(1/30,{biome:'wetland',center,camera,far:120,on:false});
 assert.equal(scene.fog,null,'off: clear again');assert.ok(Math.abs(hemisphere.intensity-2.6)<.01);
 a.update(1/30,{biome:'forest',center,camera,far:120});a.reset();assert.equal(a.state.particles,null);assert.equal(sun.intensity,3);
});
