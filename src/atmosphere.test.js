import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAtmosphere,atmosphereOf,fogRange,HAZE} from './atmosphere.js';

test('fog: a haze everywhere, nearer the denser it is, clear round what the view looks at',()=>{
 const range=48;assert.ok(fogRange(0,range)[0]>1000,'none');
 const [,light]=fogRange(HAZE,range),[,thick]=fogRange(.25,range);assert.ok(thick<light&&light<=range*1.2);
 const [near]=fogRange(.25,range,60);assert.ok(near>60,'clear up to what the view looks at, however far the camera is');
 assert.equal(atmosphereOf(null).fog,HAZE,'the haze with no biome');assert.equal(atmosphereOf('meadow').fog,HAZE,'a biome without fog keeps the haze');assert.ok(atmosphereOf('wetland').fog>HAZE);
});
test('the atmosphere crossfades to the biome under the view, keeps the haze, and has none on the Low tiers',()=>{
 const scene=new THREE.Scene(),hemisphere=new THREE.HemisphereLight('#fffce8','#879981',2.6),sun=new THREE.DirectionalLight('#fff3d3',3);
 const a=createAtmosphere({scene,hemisphere,sun}),dark=new THREE.Color('#35313f');
 for(let i=0;i<300;i++)a.update(1/30,{biome:null,range:48,focusDistance:30,background:dark});
 assert.ok(scene.fog&&scene.fog.far<30+48*1.2,'the haze in an area without biomes');assert.ok(scene.fog.color.equals(dark),'fading into the area’s own background');
 for(let i=0;i<300;i++)a.update(1/30,{biome:'wetland',range:48,focusDistance:30});
 assert.ok(a.state.fog>HAZE);assert.ok(scene.fog.near>30,'clear round the view');assert.ok(hemisphere.intensity<2.6);
 for(let i=0;i<300;i++)a.update(1/30,{biome:'wetland',range:48,focusDistance:30,on:false});
 assert.ok(Math.abs(a.state.fog-HAZE)<.01,'off: back to the haze');assert.ok(Math.abs(hemisphere.intensity-2.6)<.01);
 a.update(1/30,{biome:null,range:48,detail:0});assert.equal(scene.fog,null,'no fog on the Low tiers');
 a.reset();assert.equal(sun.intensity,3);
});
