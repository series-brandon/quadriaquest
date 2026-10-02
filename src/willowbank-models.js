import {makeSlime} from './slime-model.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSlimeFace} from './slime-face.js';
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.75});
export function part(parent,geometry,color,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function tool(kind){
 const g=new THREE.Group();
 if(kind==='swords'){part(g,new THREE.BoxGeometry(.13,.65,.07),'#b1c4cd',0,.35,0);part(g,new THREE.BoxGeometry(.34,.07,.09),'#957145',0,.05);part(g,new THREE.CylinderGeometry(.035,.035,.23,6),'#674933',0,-.08);}
 if(kind==='shields'){part(g,new THREE.CylinderGeometry(.27,.27,.09,8),'#ae8056').rotation.x=Math.PI/2;part(g,new THREE.BoxGeometry(.07,.45,.11),'#cdb281');}
 if(kind==='hammers'){part(g,new THREE.CylinderGeometry(.035,.04,.6,6),'#98704e',0,.2);part(g,new THREE.BoxGeometry(.32,.18,.18),'#a1aaa5',0,.5);}
 if(kind==='rods'){const rod=part(g,new THREE.CylinderGeometry(.014,.035,1.7,6),'#a48556',0,.65);rod.rotation.z=-.18;const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.15,1.48,0),new THREE.Vector3(.28,.35,.1)]),new THREE.LineBasicMaterial({color:'#ece6c8'}));g.add(line);}
 return g;
}
export function fisher(){
 const slime=makeSlime('#66a6ad'),{group,hands}=slime;
 part(group,new THREE.SphereGeometry(.37,16,8,0,Math.PI*2,0,Math.PI/2),'#cbb58a',0,.78);
 part(group,new THREE.CylinderGeometry(.47,.47,.045,16),'#bba074',0,.78,.06);
 // Grip is the pivot: the shaft rises backward across the same shoulder.
 const rod=tool('rods');rod.rotation.set(-.95,0,-.12);rod.position.set(0,-.1,0);hands[0].add(rod);
 for(const child of group.children)child.position.y-=.07;
 return slime;
}
function namedPart(parent,name,geometry,color,x=0,y=0,z=0){const m=part(parent,geometry,color,x,y,z);m.name=name;return m;}
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
export function companion(){
 const g=new THREE.Group(),body=new THREE.Group();body.name='cat-body';g.add(body);
 part(body,new RoundedBoxGeometry(.38,.30,.50,4,.12),'#d9af80',0,.22,-.04);
 const head=new THREE.Group();head.name='cat-head';head.position.set(0,.52,.15);body.add(head);
 part(head,new THREE.SphereGeometry(.27,20,16),'#edcba1').scale.set(1.05,.94,.9);
 for(const side of [-1,1]){
  const ear=new THREE.Group();ear.name='cat-ear'+side;ear.position.set(side*.18,.18,-.025);head.add(ear);
  part(ear,new THREE.ConeGeometry(.105,.22,3),'#d9af80',0,.065).rotation.y=Math.PI;
  part(ear,new THREE.ConeGeometry(.064,.13,3),'#e8a99b',0,.063,.044).rotation.y=Math.PI;
  const eye=namedPart(head,'cat-eye'+side,new THREE.SphereGeometry(.052,16,12),'#39443e',side*.105,.012,.22);eye.scale.set(1,1.15,.48);
  part(head,new THREE.SphereGeometry(.015,10,8),'#fff9ed',side*.105-.013,.03,.246);
  const muzzle=part(head,new THREE.SphereGeometry(.065,12,8),'#fff0d9',side*.048,-.079,.212);muzzle.scale.set(1,.65,.5);
  for(const z of [-.18,.16]){part(body,new THREE.CapsuleGeometry(.047,.09,4,8),'#d9af80',side*.14,.13,z);namedPart(body,'paw'+side+z,new RoundedBoxGeometry(.12,.12,.17,3,.045),'#f7dfbd',side*.14,.06,z);}
 }
 part(head,new THREE.SphereGeometry(.024,10,8),'#ba7d79',0,-.06,.254).scale.set(1,.65,.6);
 const mouth=part(head,new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.035,-.119,.242),new THREE.Vector3(0,-.092,.25),new THREE.Vector3(.035,-.119,.242)),10,.007,5,false),'#765950');mouth.name='sad-mouth';
 const tail=new THREE.Group();tail.name='cat-tail';tail.position.set(0,.29,-.27);body.add(tail);
 part(tail,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.03,.14,-.15),new THREE.Vector3(.12,.32,-.18),new THREE.Vector3(.18,.36,-.10)]),16,.045,8,false),'#d9af80');
 return g;
}
export function animateCompanion(group,time,{sad=false,moving=false}={}){
 const body=group.getObjectByName('cat-body'),head=group.getObjectByName('cat-head');
 const bounce=moving?Math.abs(Math.sin(time*8))*.055:0;body.position.y=bounce;body.scale.y=1+Math.sin(time*2.2)*.018;
 head.rotation.z=Math.sin(time*.9)*.045;head.rotation.x=sad?.12:Math.sin(time*1.4)*.025;
 group.getObjectByName('cat-tail').rotation.z=Math.sin(time*(sad?1.2:3))*(sad?.08:.22);
 for(const side of [-1,1]){group.getObjectByName('cat-ear'+side).rotation.z=side*(sad?.38:.02)+Math.sin(time*1.7+side)*.025;group.getObjectByName('cat-eye'+side).scale.y=time%4.7>4.55?.12:1.15;}
 group.getObjectByName('sad-mouth').visible=sad;
}
export function campfire(ghost=false){const g=new THREE.Group();for(let i=0;i<4;i++){const log=part(g,new THREE.CylinderGeometry(.07,.07,.7,6),'#94704d',0,.1,0);log.rotation.set(Math.PI/2,i*Math.PI/2,0);}for(let i=0;i<3;i++)part(g,new THREE.ConeGeometry(.17-i*.035,.46-i*.07,5),i%2?'#ffe09a':'#ef9851',(i-1)*.1,.28+i*.04);if(ghost)g.traverse(m=>{if(m.isMesh){m.material.transparent=true;m.material.opacity=.45;}});return g;}
