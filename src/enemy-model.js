import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {part,namedPart} from './model-parts.js';
export function goblin(big=false){
 const g=new THREE.Group(),rig=new THREE.Group();rig.name='goblin-rig';g.add(rig);
 const skin=big?'#6e9855':'#96b66a';
 namedPart(rig,'torso',new RoundedBoxGeometry(.48,.43,.35,3,.10),'#927257',0,.40);
 part(rig,new RoundedBoxGeometry(.50,.09,.37,2,.025),'#68513e',0,.28);
 const head=new THREE.Group();head.name='head';head.position.y=.85;rig.add(head);
 part(head,new RoundedBoxGeometry(.64,.59,.51,4,.14),skin);
 for(const side of [-1,1]){
  const ear=part(head,new THREE.ConeGeometry(.13,.32,4),skin,side*.37,.03);ear.rotation.z=-side*1.15;
  const eye=namedPart(head,'eye'+side,new THREE.SphereGeometry(.058,12,8),'#283830',side*.14,.04,.25);eye.scale.set(1,.82,.45);
  part(head,new THREE.SphereGeometry(.014,8,6),'#fff8e6',side*.14-.013,.058,.278);
  part(head,new RoundedBoxGeometry(.15,.035,.04,2,.01),'#40573a',side*.14,.12,.25).rotation.z=side*.25;
  part(head,new THREE.ConeGeometry(.029,.085,6),'#fff3d8',side*.10,-.16,.27).rotation.z=Math.PI;
  const arm=new THREE.Group();arm.name='arm'+side;arm.position.set(side*.26,.53,0);rig.add(arm);
  part(arm,new THREE.CapsuleGeometry(.073,.13,4,8),skin,side*.035,-.09);
  part(arm,new THREE.SphereGeometry(.09,12,8),skin,side*.04,-.20,.03);
  const leg=new THREE.Group();leg.name='leg'+side;leg.position.set(side*.14,.16,0);rig.add(leg);
  part(leg,new THREE.CapsuleGeometry(.067,.08,4,8),skin,0,.025);
  part(leg,new RoundedBoxGeometry(.18,.13,.26,3,.045),'#6e5743',0,-.095,.055);
 }
 part(head,new THREE.BoxGeometry(.17,.025,.03),'#493c33',0,-.13,.266);
 if(big){part(head,new THREE.SphereGeometry(.37,12,6,0,Math.PI*2,0,Math.PI/2),'#807c79',0,.24);g.scale.setScalar(1.18);}
 return g;
}
export function animateGoblin(group,time,{walk=0,attack=0,hit=0}={}){
 const rig=group.getObjectByName('goblin-rig');if(!rig)return;
 const head=group.getObjectByName('head'),stride=Math.sin(time*9)*walk;
 rig.position.y=Math.abs(stride)*.025;rig.rotation.x=attack*.16;rig.rotation.z=hit*.13;
 head.rotation.y=Math.sin(time*1.2)*.07;head.rotation.z=Math.sin(time*1.8)*.025;
 const blink=time%4.3>4.15?.12:1;
 for(const side of [-1,1]){const arm=group.getObjectByName('arm'+side),leg=group.getObjectByName('leg'+side);
  arm.rotation.x=stride*side*.5+Math.sin(time*2+side)*.045+(side===-1?-attack*1.8:attack*.4);
  arm.rotation.z=side*(.08+attack*.15);leg.rotation.x=-stride*side*.6;leg.position.y=.16+Math.max(0,stride*side)*.055;
  group.getObjectByName('eye'+side).scale.y=.82*blink;
 }
}
