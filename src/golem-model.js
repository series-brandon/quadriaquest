import * as THREE from 'three';
import {findPart} from './named-parts.js';

// Cinder Golem: a hulking basalt boss with ember cracks, glowing eyes and huge fists. It stands on one
// logical tile but towers over it (about 2.4 slimes tall). +Z is forward.
const rock=color=>new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true});
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function piece(parent,geometry,material,x=0,y=0,z=0,name){
 const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;if(name)m.name=name;parent.add(m);return m;
}
export function makeCinderGolem(){
 const g=new THREE.Group(),rig=new THREE.Group();rig.name='golem-rig';g.add(rig);
 const basalt=rock('#6a6273'),dark=rock('#4d4756');
 // One ember material per golem so its glow can pulse.
 const ember=new THREE.MeshStandardMaterial({color:'#ffb35c',emissive:'#ff6a1f',emissiveIntensity:1.4,roughness:.6});ember.name='golem-ember';
 const torso=new THREE.Group();torso.name='golem-torso';torso.position.y=1.05;rig.add(torso);
 const chest=piece(torso,new THREE.DodecahedronGeometry(.62,0),basalt);chest.scale.set(1.15,1,.85);
 piece(torso,new THREE.DodecahedronGeometry(.42,0),dark,0,-.42,-.05).scale.set(1.2,.7,.9);
 // Ember cracks across the chest and a glowing core.
 for(const [x,y,r,l] of [[-.18,.12,.5,.42],[.2,-.05,-.7,.36],[.02,.3,1.4,.3],[-.05,-.22,.2,.28]]){const c=piece(torso,new THREE.BoxGeometry(.045,l,.04),ember,x,y,.53);c.rotation.z=r;}
 piece(torso,new THREE.OctahedronGeometry(.11,0),ember,0,.05,.5);
 for(const side of [-1,1])piece(torso,new THREE.DodecahedronGeometry(.3,0),dark,side*.62,.32,0).scale.set(1,.8,1);
 const head=new THREE.Group();head.name='golem-head';head.position.set(0,.68,.08);torso.add(head);
 piece(head,new THREE.DodecahedronGeometry(.3,0),basalt).scale.set(1.1,.85,.95);
 piece(head,new THREE.BoxGeometry(.5,.1,.16),dark,0,.1,.18);
 for(const side of [-1,1]){const eye=piece(head,new THREE.BoxGeometry(.12,.05,.04),ember,side*.11,.01,.27,'golem-eye'+side);eye.rotation.z=side*.18;}
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.name='golem-arm'+side;arm.position.set(side*.78,.32,0);torso.add(arm);
  piece(arm,new THREE.DodecahedronGeometry(.2,0),basalt,side*.04,-.28,0).scale.set(.9,1.4,.9);
  const fist=piece(arm,new THREE.DodecahedronGeometry(.3,0),dark,side*.06,-.7,.06);fist.scale.set(1,.9,1);
  piece(arm,new THREE.BoxGeometry(.04,.22,.04),ember,side*.1,-.32,.17).rotation.z=side*.4;
  // The Rock Throw's rock, held in the right fist while it winds up (hidden otherwise).
  if(side===1){const held=piece(arm,new THREE.DodecahedronGeometry(.22,0),rock('#5b4f4a'),side*.06,-.98,.1,'golem-rock');held.visible=false;}
  const leg=new THREE.Group();leg.name='golem-leg'+side;leg.position.set(side*.32,.48,0);rig.add(leg);
  piece(leg,new THREE.DodecahedronGeometry(.26,0),dark,0,-.18,0).scale.set(1,1.15,1.05);
  piece(leg,new THREE.BoxGeometry(.4,.16,.48),basalt,0,-.4,.05);
 }
 return g;
}
// charge (0..1): progress through the telegraphed slam windup, fists rising overhead. slam (1..0): the
// strike just landed, fists down and body forward, easing back. hit: flinch when struck. thrown: the
// Rock Throw, 0..1 winding up (rock raised back over the shoulder), 1..2 the throw's follow-through.
export function animateGolem(group,time,{walk=0,charge=0,slam=0,hit=0,thrown=0}={}){
 const rig=findPart(group,'golem-rig');if(!rig)return;
 const torso=findPart(group,'golem-torso'),head=findPart(group,'golem-head'),stride=Math.sin(time*4.5)*walk;
 const raise=smooth((charge-.25)/.65),down=smooth(slam);
 rig.position.y=Math.abs(stride)*.05-down*.06;
 torso.rotation.x=-raise*.32+down*.38;torso.rotation.z=stride*.06+hit*.08;torso.scale.y=1+Math.sin(time*1.3)*.012*(1-walk);
 head.rotation.y=Math.sin(time*.7)*.12*(1-raise);head.rotation.x=raise*-.15+down*.2;
 for(const side of [-1,1]){
  const arm=findPart(group,'golem-arm'+side),leg=findPart(group,'golem-leg'+side);
  // Fists swing with the stride, rise overhead through the windup, then come crashing down.
  arm.rotation.x=stride*side*.35-raise*2.7-down*1.1;arm.rotation.z=side*(.12+raise*.25);
  leg.rotation.x=-stride*side*.45;leg.position.y=.48+Math.max(0,stride*side)*.08;
  // Eyes flare as it winds up.
  findPart(group,'golem-eye'+side).scale.y=1+raise*.8;
 }
 // Rock Throw: the right arm draws back overhead with the rock, then whips forward.
 const held=findPart(group,'golem-rock');if(held)held.visible=thrown>0&&thrown<1;
 if(thrown>0){
  const arm=findPart(group,'golem-arm1'),draw=thrown<1?smooth(thrown/.8):0,whip=thrown>=1?1-smooth(thrown-1):0;
  arm.rotation.x=-draw*2.9+whip*1.2;arm.rotation.z=.12+draw*.3;
  torso.rotation.y=-draw*.35+whip*.3;torso.rotation.x=-draw*.1+whip*.25;
 }else torso.rotation.y=0;
 const ember=findPart(group,'golem-eye1')?.material;if(ember)ember.emissiveIntensity=1.2+Math.sin(time*2.4)*.25+raise*1.4+down*1.2;
}
