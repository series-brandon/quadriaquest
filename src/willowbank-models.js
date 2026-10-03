import {makeFishingRod} from './fishing-rod.js';
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
 if(kind==='hammers'){part(g,new THREE.CylinderGeometry(.03,.035,.38,6),'#98704e',0,.11);part(g,new THREE.BoxGeometry(.26,.15,.15),'#a1aaa5',0,.30);}
 if(kind==='rods')return makeFishingRod();
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
// Original corgi built for the shared companion rig: +Z is forward.
export function companion(){
 const g=new THREE.Group(),body=new THREE.Group();body.name='companion-body';g.add(body);
 const tan=mat('#c78a49'),cream=mat('#fff0d1'),dark=mat('#343338');
 const coat=tan.clone();coat.flatShading=true;
 part(body,new THREE.IcosahedronGeometry(1,2),coat,0,.29,-.08).scale.set(.25,.205,.40);
 part(body,new RoundedBoxGeometry(.29,.31,.14,2,.06),cream,0,.29,.20);
 const head=new THREE.Group();head.name='companion-head';head.position.set(0,.53,.24);body.add(head);
 part(head,new RoundedBoxGeometry(.45,.36,.36,2,.09),tan);
 // A cream blaze and muzzle make the face readable even from the game camera.
 part(head,new RoundedBoxGeometry(.075,.22,.012,2,.006),cream,0,.018,.181);
 part(head,new RoundedBoxGeometry(.29,.14,.20,2,.055),cream,0,-.09,.22);
 part(head,new RoundedBoxGeometry(.085,.055,.05,2,.018),dark,0,-.045,.327);
 for(const side of [-1,1]){
  const ear=new THREE.Group();ear.name='companion-ear'+side;ear.position.set(side*.15,.14,.015);head.add(ear);
  const shape=new THREE.Shape();shape.moveTo(-.095,0);shape.lineTo(.095,0);shape.lineTo(side*.045,.28);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,steps:1});
  part(ear,geo,tan,0,0,-.04);
  const inner=part(ear,geo,mat('#d99c85'),0,.035,.044);inner.scale.set(.62,.66,.18);
  const eye=namedPart(head,'companion-eye'+side,new THREE.SphereGeometry(.044,12,8),dark,side*.13,.025,.176);eye.scale.set(.9,1.08,.5);
  part(head,new THREE.SphereGeometry(.012,8,6),'#ffffff',side*.13-.01,.04,.199);
  const brow=namedPart(head,'companion-brow'+side,new RoundedBoxGeometry(.07,.015,.018,1,.005),'#92603b',side*.13,.09,.18);brow.rotation.z=side*.08;
  for(const z of [-.31,.19]){const leg=new THREE.Group();leg.name='companion-leg'+side+z;leg.position.set(side*.165,.19,z);body.add(leg);part(leg,new THREE.CapsuleGeometry(.061,.075,3,8),tan,0,-.055);namedPart(leg,'paw'+side+z,new RoundedBoxGeometry(.14,.105,.18,2,.032),cream,0,-.1375,.015);}
 }
 for(const sad of [false,true]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.065,-.10,.327),new THREE.Vector3(0,sad?-.065:-.16,.339),new THREE.Vector3(.065,-.10,.327));const mouth=part(head,new THREE.TubeGeometry(curve,12,.009,5,false),dark);mouth.name=sad?'sad-mouth':'happy-mouth';mouth.visible=!sad;}
 namedPart(head,'companion-tongue',new RoundedBoxGeometry(.046,.055,.024,2,.012),'#df9290',0,-.145,.331);
 const tail=new THREE.Group();tail.name='companion-tail';tail.position.set(0,.34,-.43);body.add(tail);
 part(tail,new THREE.CapsuleGeometry(.065,.105,3,8),tan,0,.055,-.05).rotation.x=-.65;
 part(tail,new THREE.SphereGeometry(.059,8,6),cream,0,.115,-.092);
 return g;
}
export function animateCompanion(group,time,{sad=false,moving=false,gait=time*4}={}){
 const body=group.getObjectByName('companion-body'),head=group.getObjectByName('companion-head');
 const weight=body.userData.walkWeight=(body.userData.walkWeight||0)+(Number(moving)-(body.userData.walkWeight||0))*.22;
 body.position.y=Math.abs(Math.sin(gait*2))*.018*weight;body.scale.y=1+Math.sin(time*2.2)*.012;body.rotation.y=Math.sin(gait*2)*.035*weight;
 head.rotation.z=Math.sin(time*1.4)*(sad?.025:.045);head.rotation.x=sad?.16:Math.sin(time*2)*.025;
 const tail=group.getObjectByName('companion-tail');tail.rotation.y=Math.sin(time*(sad?2:11))*(sad?.07:.5);tail.rotation.x=sad?.7:0;
 for(const side of [-1,1]){group.getObjectByName('companion-ear'+side).rotation.z=side*(sad?.48:.04)+Math.sin(time*2+side)*.025;group.getObjectByName('companion-eye'+side).scale.y=time%4.7>4.55?.12:sad?.85:1.08;group.getObjectByName('companion-brow'+side).rotation.z=side*(sad?-.3:.08);}
 for(const side of [-1,1])for(const z of [-.31,.19]){const leg=group.getObjectByName('companion-leg'+side+z),stride=weight*Math.sin(gait*2+(side*(z>0?1:-1)>0?0:Math.PI));leg.rotation.x=stride*.5;leg.position.y=.19+Math.max(0,stride)*.035;}
 head.position.y=.53+Math.sin(gait*2)*.01*weight;
 group.getObjectByName('sad-mouth').visible=sad;group.getObjectByName('happy-mouth').visible=!sad;group.getObjectByName('companion-tongue').visible=!sad;
}
export function campfire(ghost=false){const g=new THREE.Group();for(let i=0;i<3;i++){const log=part(g,new THREE.CylinderGeometry(.085,.085,.85,7),'#94704d',0,.09+i*.015,0);log.name='campfire-log';log.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(i*Math.PI/3),0,Math.sin(i*Math.PI/3)));}for(let i=0;i<3;i++)part(g,new THREE.ConeGeometry(.17-i*.035,.46-i*.07,5),i%2?'#ffe09a':'#ef9851',(i-1)*.1,.28+i*.04);if(ghost)g.traverse(m=>{if(m.isMesh){m.material.transparent=true;m.material.opacity=.45;}});return g;}

// A portable fishing-tile marker, independent of a map's water shader.
export function fishingSpot(){
 const group=new THREE.Group();
 for(let i=0;i<3;i++){const ring=part(group,new THREE.RingGeometry(.27,.30,48),new THREE.MeshBasicMaterial({color:'#d6f6ef',transparent:true,opacity:.6,toneMapped:false,depthWrite:false,side:THREE.DoubleSide}),0,.07+i*.001,0);ring.rotation.x=-Math.PI/2;ring.renderOrder=3;ring.castShadow=false;ring.name='fishing-ripple';ring.userData.phase=i/3;}
 return group;
}
export function animateFishingSpot(group,time){
 for(const ring of group.children){if(ring.name!=='fishing-ripple')continue;const phase=(time*.38+ring.userData.phase)%1;ring.scale.setScalar(.35+phase*1.15);ring.material.opacity=Math.sin(phase*Math.PI)*.8;}
}

export function animateCampfire(group,time){
 for(const [i,flame] of group.children.filter(m=>m.geometry?.type==='ConeGeometry').entries())flame.scale.y=1+Math.sin(time*9+i)*.12;
}
export function makeBridge(length=3){
 const group=new THREE.Group(),planks=[],surfaces=[],posts=[],railings=[];
 const pitch=1/3,gap=.015;
 for(let x=0;x<length;x++){
  for(let j=0;j<3;j++){const plank=part(group,new THREE.BoxGeometry(pitch-gap,.12,.85),'#a98155',x+(j-1)*pitch,1,0);plank.name='bridge-plank';planks.push(plank);}
  for(const side of [-1,1]){
   const post=part(group,new THREE.CylinderGeometry(.07,.07,1.12,6),'#886747',x,.92,side*.43);post.name='bridge-post';posts.push(post);
   if(x<length-1){const rail=part(group,new THREE.BoxGeometry(1.08,.10,.09),'#967049',x+.5,1.43,side*.43);rail.name='bridge-railing';railings.push(rail);}
  }
  // Invisible completed-deck picking surface; visible geometry is only the boards.
  const hit=part(group,new THREE.BoxGeometry(1,.02,.85),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),x,1.05,0);
  hit.name='bridge-walk-surface';hit.castShadow=hit.receiveShadow=false;surfaces.push(hit);
 }
 function setProgress(progress){
  surfaces.forEach(m=>m.visible=progress===1);railings.forEach(m=>m.visible=progress===1);
  const repaired=Math.ceil(Math.min(1,progress*1.5)*planks.length);
  planks.forEach((p,i)=>{p.visible=progress===0?i%3!==1:i<repaired;p.rotation.z=progress===0?(i%2?1:-1)*.2:0;});
 }
 setProgress(0);return {group,surfaces,planks,posts,railings,setProgress};
}
export function makeBridgeMarker(){const group=new THREE.Group();part(group,new THREE.BoxGeometry(.35,.2,.6),'#8d6848',0,.1);return group;}

export function heldTool(kind){const group=tool(kind);if(['swords','shields','hammers'].includes(kind))group.rotation.y=Math.PI/2;return group;}
