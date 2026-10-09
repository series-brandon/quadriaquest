import {playerActionMotion} from './player-action-motion.js';
import * as THREE from 'three';
import {part} from './model-parts.js';
import {makeSlime} from './slime-model.js';
import {boulderParts} from './mining.js';
import {mergedMesh} from './merged-model.js';
import {makeTerrainTile} from './world-models.js';
const box=(g,w,h,d,color,x=0,y=0,z=0)=>part(g,new THREE.BoxGeometry(w,h,d),color,x,y,z);
// A dark boulder with copper nuggets, merged into one mesh (one draw and shadow draw).
export function copperOutcrop(){const g=new THREE.Group();g.add(mergedMesh([...boulderParts('#62616d','#62616d'),...[0,1,2,3,4].map(i=>({geometry:new THREE.OctahedronGeometry(.13,0),color:'#d18c53',position:[Math.sin(i*2.4)*.30,.93+Math.cos(i)*.08,Math.cos(i*2.4)*.25],rotation:[0,0,i*.6]}))],{roughness:.95,flatShading:true}));return g;}
export function ingot(){const g=new THREE.Group();box(g,.48,.19,.24,'#cb8955',0,.12);return g;}
export function trainingTool(kind){const g=new THREE.Group();
 if(kind==='copperDagger'){box(g,.11,.38,.06,'#e0a06b',0,.22);part(g,new THREE.ConeGeometry(.07,.17,4),'#ffd1a0',0,.49);box(g,.27,.05,.10,'#816149',0,.035);box(g,.075,.19,.075,'#694437',0,-.075);}
 if(kind==='copperShield'){const plate=part(g,new THREE.CylinderGeometry(.28,.28,.08,6),'#c88a58');plate.rotation.x=Math.PI/2;part(g,new THREE.SphereGeometry(.09,10,8),'#f3bd83',0,0,.07);}
 if(kind==='bows'){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.48,0),new THREE.Vector3(0,0,.22),new THREE.Vector3(0,.48,0)]);part(g,new THREE.TubeGeometry(curve,16,.035,6,false),'#a97c53');const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.48,0),new THREE.Vector3(),new THREE.Vector3(0,.48,0)]),new THREE.LineBasicMaterial({color:'#e8dbc1'}));string.name='bow-string';g.add(string);const arrow=trainingTool('arrows');arrow.name='nocked-arrow';arrow.rotation.x=Math.PI/2;arrow.visible=false;g.add(arrow);}
 if(kind==='arrows'){box(g,.025,.65,.025,'#d5b786',0,.05);part(g,new THREE.ConeGeometry(.045,.12,4),'#a2bbc0',0,.435);box(g,.10,.13,.018,'#efe2c2',0,-.24);}
 return g;
}
export function furnace(){const g=new THREE.Group();box(g,.95,.17,.83,'#454553',0,.085);box(g,.90,.80,.65,'#686575',0,.52);box(g,.43,.37,.02,'#322b36',0,.40,.337);const fire=part(g,new THREE.SphereGeometry(.18,10,8),'#ffb14c',0,.38,.36);fire.scale.set(1,.8,.3);fire.material.emissive=new THREE.Color('#ff7028');fire.material.emissiveIntensity=1.4;g.userData.fire=fire;const glow=new THREE.PointLight('#ffac58',3,4,2);glow.position.set(0,.65,.7);g.add(glow);box(g,.34,.45,.34,'#55525e',0,1.1);return g;}
export function animateFurnace(g,time){const f=g.userData.fire;if(f){f.scale.y=.8+Math.sin(time*7)*.09;f.material.emissiveIntensity=1.2+Math.sin(time*9)*.25;}}
// Sits on the ground: foot, waist, face and horn.
export function anvil(){const g=new THREE.Group();box(g,.58,.12,.42,'#42444f',0,.06);box(g,.25,.23,.26,'#696d7e',0,.19);box(g,.68,.16,.35,'#8d91a0',0,.36);const horn=part(g,new THREE.ConeGeometry(.12,.36,6),'#8d91a0',.48,.37);horn.rotation.z=-Math.PI/2;return g;}
export function supplyShelf(){const g=new THREE.Group();box(g,.8,.1,.4,'#9a7354',0,.38);for(const x of [-.32,.32])box(g,.07,.55,.07,'#755640',x,.28);for(let i=0;i<3;i++)part(g,new THREE.SphereGeometry(.11,10,8),'#d3a36a',-.23+i*.23,.5,0);return g;}
export function trainingTarget(){const g=new THREE.Group();box(g,.08,1,.08,'#997652',0,.5);for(const [r,c,z] of [[.4,'#d2b786',0],[.27,'#8d5549',.045],[.13,'#e0bf80',.09]]){const m=part(g,new THREE.CylinderGeometry(r,r,.055,24),c,0,.92,z);m.rotation.x=Math.PI/2;}return g;}
export function animateTarget(g,time,hit=0){g.rotation.x=Math.sin(time*30)*hit*.12;}
export function stoneArch(){const g=new THREE.Group();for(const x of [-1.5,1.5]){box(g,.6,2.1,.7,'#595767',x,1.05);box(g,.8,.17,.85,'#777384',x,2.05);}box(g,3.5,.48,.72,'#686473',0,2.35);return g;}
export function stoneTile(t,world){const material=new THREE.MeshStandardMaterial({color:new THREE.Color(['#64606f','#676271','#615e6b','#686471'][(t.x*17+t.z*13+t.x*t.z)%4]),roughness:.95});return makeTerrainTile(t,world,material,{sideColor:'#464151',seamColor:'#a199ad'});}
export const MENTORS={sarge:{name:'Sergeant Bristle',color:'#c85745',expression:'angry'},smith:{name:'Borin Copperbelly',color:'#c9904f',expression:'idle'},ranger:{name:'Fletch',color:'#74996a',expression:'idle'},mage:{name:'Wisp',color:'#ad8acb',expression:'idle'},ki:{name:'Ember',color:'#5fa9a8',expression:'idle'}};
export function mentorModel(kind){const def=MENTORS[kind],rig=makeSlime(def.color),g=rig.group;
 if(kind==='smith'){part(g,new THREE.SphereGeometry(.36,16,8,0,Math.PI*2,0,Math.PI/2),'#807458',0,.77);box(g,.75,.07,.7,'#998462',0,.77,.03);}
 if(kind==='sarge'){
  // Brimless iron skullcap, raised central ridge and cheek guards: a fantasy guard captain.
  part(g,new THREE.SphereGeometry(.37,12,6,0,Math.PI*2,0,Math.PI/2),'#657180',0,.77);
  box(g,.065,.20,.55,'#adb4ba',0,1.025,-.01);
  box(g,.065,.20,.045,'#adb4ba',0,.75,.365);
  for(const x of [-.33,.33]){const cheek=box(g,.075,.28,.22,'#657180',x,.68,.08);cheek.rotation.z=x<0?-.14:.14;box(g,.17,.06,.22,'#a3abb2',x,.50,.02);}
 }
 if(kind==='smith'){box(g,.66,.24,.04,'#6a4b39',0,.21,.37);for(let i=0;i<5;i++){const b=part(g,new THREE.SphereGeometry(.075,10,8),'#e2c7a1',(i-2)*.065,.39-Math.abs(2-i)*.02,.40);b.scale.y=1.6;}for(let i=0;i<3;i++)part(g,new THREE.SphereGeometry(.067,10,8),'#d9b88d',0,.25-i*.065,.43);part(g,new THREE.SphereGeometry(.075,12,8),'#f9d885',0,.9,.32);}
 if(kind==='ranger'){part(g,new THREE.ConeGeometry(.4,.4,8),'#405f46',0,.87);const feather=box(g,.08,.4,.025,'#e0cf9e',.23,1.12,0);feather.rotation.z=-.4;}
 if(kind==='mage'){part(g,new THREE.ConeGeometry(.32,.65,10),'#5b477e',0,1.02);part(g,new THREE.CylinderGeometry(.44,.44,.04,16),'#6e558d',0,.75);part(g,new THREE.OctahedronGeometry(.06),'#ffe0a0',0,1.02,.22);}
 // Ember (draft Ki mentor): cloth headband with trailing ties and a floating ring of breath.
 if(kind==='ki'){part(g,new THREE.CylinderGeometry(.43,.43,.08,18),'#e8dcc0',0,.62);for(const x of [-.08,.08]){const tie=box(g,.05,.2,.02,'#e8dcc0',x,.52,-.42);tie.rotation.x=.4;}const ring=part(g,new THREE.TorusGeometry(.3,.025,8,28),'#bfe8e4',0,1.08);ring.rotation.x=Math.PI/2;}
 rig.kind=kind;rig.face.set(def.expression);return rig;
}
export function animateMentor(rig,time,motion='Idle',expression){const angry=rig.kind==='sarge';rig.group.scale.set(1,1+Math.sin(time*(angry?5:2.8))*.025,1);rig.hands.forEach((h,i)=>{h.position.set(i===0?-.46:.46,.33+Math.sin(time*2.8+i)*.015,.08);h.rotation.set(0,0,0);});if(motion==='Point'||motion==='Stomp'){const {pose,hands}=playerActionMotion(motion,time);rig.group.scale.set(1/Math.sqrt(pose.squash),pose.squash,1/Math.sqrt(pose.squash));rig.hands.forEach((hand,i)=>{const [x,y,z,pitch,roll,yaw=0]=hands[i];hand.position.set(x,y,z);hand.rotation.set(pitch,yaw,roll);});}rig.face.set(expression||MENTORS[rig.kind].expression);}

export function animateBow(group,draw=0,nocked=false){
 const string=group.getObjectByName('bow-string'),arrow=group.getObjectByName('nocked-arrow');
 if(string){string.geometry.attributes.position.setXYZ(1,0,0,-.38*draw);string.geometry.attributes.position.needsUpdate=true;string.geometry.computeBoundingSphere();}
 if(arrow){arrow.visible=nocked;arrow.position.z=.26-.38*draw;}
}
