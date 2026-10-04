import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mat,part,namedPart} from './model-parts.js';
import {createSleepParticles,updateSleepParticles} from './sleep-feedback.js';
// Small, head-led companion rig: +Z is forward.
const COMPANION_PAW_Z=[-.18,.10];
export function companion(){
 const g=new THREE.Group(),body=new THREE.Group();g.scale.setScalar(.78);body.name='companion-body';g.add(body);
 const tan=mat('#c78a49'),cream=mat('#fff0d1'),dark=mat('#343338');
 namedPart(body,'companion-torso',new RoundedBoxGeometry(.30,.22,.42,3,.065),tan,0,.175,-.045);
 namedPart(body,'companion-chest',new RoundedBoxGeometry(.20,.17,.055,2,.025),cream,0,.175,.15);
 const head=new THREE.Group();head.name='companion-head';head.position.set(0,.35,.16);body.add(head);
 part(head,new RoundedBoxGeometry(.45,.36,.36,2,.09),tan);
 // A cream blaze and muzzle make the face readable even from the game camera.
 part(head,new RoundedBoxGeometry(.075,.22,.012,2,.006),cream,0,.018,.181);
 part(head,new RoundedBoxGeometry(.29,.14,.20,2,.055),cream,0,-.09,.22);
 part(head,new RoundedBoxGeometry(.085,.055,.05,2,.018),dark,0,-.045,.327);
 for(const side of [-1,1]){
  const ear=new THREE.Group();ear.name='companion-ear'+side;ear.position.set(side*.115,.09,.015);head.add(ear);
  const shape=new THREE.Shape(),tip=side*.035;shape.moveTo(-.082,-.02);shape.lineTo(.082,-.02);shape.lineTo(tip+.018,.21);shape.quadraticCurveTo(tip,.25,tip-.018,.21);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:3,curveSegments:8,steps:1});
  part(ear,geo,tan,0,0,-.04);
  const inner=part(ear,geo,mat('#d99c85'),0,.035,.044);inner.scale.set(.62,.66,.18);
  const eye=namedPart(head,'companion-eye'+side,new THREE.SphereGeometry(.044,12,8),dark,side*.13,.025,.176);eye.scale.set(.9,1.08,.5);
  namedPart(head,'companion-eye-shine'+side,new THREE.SphereGeometry(.012,8,6),'#ffffff',side*.13-.01,.04,.199);
  const brow=namedPart(head,'companion-brow'+side,new RoundedBoxGeometry(.07,.015,.018,1,.005),'#92603b',side*.13,.09,.18);brow.rotation.z=side*.08;
  for(const z of COMPANION_PAW_Z){const paw=namedPart(body,'companion-leg'+side+z,new THREE.SphereGeometry(.065,12,8),cream,side*.12,.065,z);paw.userData.restZ=z;}
 }
 for(const sad of [false,true]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.065,-.10,.327),new THREE.Vector3(0,sad?-.065:-.16,.339),new THREE.Vector3(.065,-.10,.327));const mouth=part(head,new THREE.TubeGeometry(curve,12,.009,5,false),dark);mouth.name=sad?'sad-mouth':'happy-mouth';mouth.visible=!sad;}
 for(const side of [-1,1])namedPart(body,'companion-rump'+side,new RoundedBoxGeometry(.105,.13,.045,3,.022),cream,side*.067,.19,-.25);
 namedPart(body,'companion-tail',new THREE.SphereGeometry(.065,12,8),tan,0,.235,-.285);
 const heart=new THREE.Shape();heart.moveTo(0,-.08);heart.bezierCurveTo(-.18,.04,-.07,.16,0,.08);heart.bezierCurveTo(.07,.16,.18,.04,0,-.08);
 for(let i=0;i<3;i++){const h=new THREE.Mesh(new THREE.ExtrudeGeometry(heart,{depth:.045,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:3,steps:1,curveSegments:12}),new THREE.MeshStandardMaterial({color:'#ee7799',roughness:.35,transparent:true,depthWrite:false}));h.name='pet-heart-'+i;h.visible=false;g.add(h);}

 createSleepParticles(g,'companion-sleep-z');
 return g;
}
export function animateCompanion(group,time,{sad=false,expression='Default',moving=false,gait=time*4,motion='Idle',age=time,sit=['Sit','Scratch','Sleeping'].includes(motion)?1:0,jump=null,camera=null}={}){
 const mood=(!expression||expression.toLowerCase()==='default')?(sad?'Sad':motion==='Petting'?'Happy':motion==='Sleeping'?'Sleeping':'Idle'):expression;
 sad=mood==='Sad';const happy=mood==='Happy';
 const body=group.getObjectByName('companion-body'),head=group.getObjectByName('companion-head');
 const weight=body.userData.walkWeight=(body.userData.walkWeight||0)+(Number(moving)-(body.userData.walkWeight||0))*.22;
 body.rotation.x=-.22*sit;body.rotation.z=0;
 body.position.y=-.025*sit+Math.abs(Math.sin(gait*2))*.018*weight;body.scale.y=1+Math.sin(time*2.2)*.012*(1-sit);body.rotation.y=Math.sin(gait*2)*.035*weight;
 // Compress only the torso; the oversized head and spherical paws keep their shape.
 const torso=group.getObjectByName('companion-torso');torso.scale.y=1;torso.position.y=.175;group.getObjectByName('companion-chest').position.y=.175;torso.scale.z=1-.32*sit;torso.position.z=-.045+.06*sit;
 for(const side of [-1,1])group.getObjectByName('companion-rump'+side).position.z=-.25+.127*sit;
 head.rotation.y=0;head.rotation.z=Math.sin(time*1.4)*(sad?.025:.045)*(1-sit);head.rotation.x=.22*sit+(sad?.16:Math.sin(time*2)*.025)*(1-sit);
 const eyesClosed=happy||mood==='Sleeping'||time%4.7>4.55;
 const tail=group.getObjectByName('companion-tail');tail.position.z=-.285+.127*sit;tail.position.x=Math.sin(time*(sad?2:11))*(sad?.008:.035);tail.position.y=sad?.20:.235+Math.sin(time*11)*.008;
 for(const side of [-1,1]){group.getObjectByName('companion-ear'+side).rotation.z=side*(sad?-.95:.04)+Math.sin(time*2+side)*.025;group.getObjectByName('companion-eye'+side).scale.y=happy?.35:eyesClosed?.12:sad?.85:1.08;group.getObjectByName('companion-eye-shine'+side).visible=!eyesClosed;group.getObjectByName('companion-brow'+side).rotation.z=side*(sad?-.3:.08);}
 for(const side of [-1,1])for(const z of COMPANION_PAW_Z){const paw=group.getObjectByName('companion-leg'+side+z),stride=weight*Math.sin(gait*2+(side*(z>0?1:-1)>0?0:Math.PI));paw.position.x=side*(.12+(z<0?.035:0)*sit);paw.position.z=z+(z<0?.075:0)*sit+stride*.035;
  // Lower the front paws against the tilted chest while keeping all four soles grounded.
  const groundedY=(.065-body.position.y+Math.sin(body.rotation.x)*paw.position.z)/(Math.cos(body.rotation.x)*body.scale.y);
  paw.position.y=THREE.MathUtils.lerp(.065,groundedY,sit)+Math.max(0,stride)*.035;}
 head.position.x=0;head.position.z=.16;head.position.y=.35+Math.sin(gait*2)*.01*weight;
 if(motion==='Sleeping'){
  const settle=THREE.MathUtils.smoothstep(age,0,1.8),breath=Math.sin(time*1.7)*.004*settle;
  body.rotation.x*=1-settle;body.position.y*=1-settle;body.scale.y=1;
  torso.scale.set(1,1-.14*settle+breath,.68+.37*settle);torso.position.y=THREE.MathUtils.lerp(.175,.145,settle);torso.position.z=THREE.MathUtils.lerp(.015,-.06,settle);
  group.getObjectByName('companion-chest').position.y=.175-.04*settle;
  head.rotation.set(.22*(1-settle),.55*settle,.32*settle);head.position.x=.075*settle;head.position.y=THREE.MathUtils.lerp(.35,.27,settle);head.position.z=.16+.055*settle;
  for(const side of [-1,1]){
   const rear=group.getObjectByName('companion-leg'+side+COMPANION_PAW_Z[0]),front=group.getObjectByName('companion-leg'+side+COMPANION_PAW_Z[1]);
   rear.position.lerp(new THREE.Vector3(side*.135,.065,-.27),settle);front.position.lerp(new THREE.Vector3(side*.16,.065,.27),settle);
   const rump=group.getObjectByName('companion-rump'+side);rump.scale.y=torso.scale.y;rump.position.y=torso.position.y+.015*torso.scale.y;rump.position.z=THREE.MathUtils.lerp(-.123,-.275,settle);
  }
  tail.position.set(0,THREE.MathUtils.lerp(.235,.16,settle),THREE.MathUtils.lerp(-.158,-.30,settle));
 }else for(const side of [-1,1]){const rump=group.getObjectByName('companion-rump'+side);rump.position.y=.19;rump.scale.y=1;}
 updateSleepParticles([0,1,2].map(i=>group.getObjectByName('companion-sleep-z'+i)),age-1.8,motion==='Sleeping',new THREE.Vector3(head.position.x,0,head.position.z),camera,{height:.48,offset:.08});
 if(motion==='Scratch'){
  const t=Math.max(0,age%2.6),reach=THREE.MathUtils.smoothstep(t,0,.35)*(1-THREE.MathUtils.smoothstep(t,2,2.4));
  const paw=group.getObjectByName('companion-leg1'+COMPANION_PAW_Z[0]);
  // Lean toward the paw while preserving the seated body and grounding.
  head.rotation.z-=.35*reach;head.rotation.y=.12*reach;
  head.rotation.x=THREE.MathUtils.lerp(head.rotation.x,.10,reach);
  // Follow the moving lower head corner, then return to the seated paw position.
  const stroke=Math.sin(t*32)*.014*THREE.MathUtils.smoothstep(t,.35,.5);
  const target=new THREE.Vector3(.25,-.14+stroke,-.10).applyEuler(head.rotation).add(head.position);
  paw.position.lerp(target,reach);
 }
 if(motion==='Petting'){head.rotation.x=-.1;head.rotation.z=Math.sin(age*5)*.09;}
 if(motion==='Jump up'||motion==='Jump down'){
  const progress=Math.min(1,(age%1.4)/.65);body.position.y+=Math.sin(progress*Math.PI)*.24;jump={progress,height:motion==='Jump up'?.5:-.5};
 }
 if(jump){body.rotation.x=(jump.height>0?-.16:.16)*Math.sin(jump.progress*Math.PI);body.scale.y=1+Math.sin(jump.progress*Math.PI*2)*.08;}
 for(let i=0;i<3;i++){
  const heart=group.getObjectByName('pet-heart-'+i),t=(age-i*.35)/1.9;
  heart.visible=motion==='Petting'&&t>=0&&t<1;
  if(heart.visible){heart.position.set((i-1)*.13+Math.sin(t*Math.PI*3+i)*.075,.7+t*.42,.18);heart.material.opacity=Math.sin(t*Math.PI);heart.scale.setScalar(.7+t*.3);if(camera){group.getWorldQuaternion(heart.quaternion).invert();heart.quaternion.multiply(camera.quaternion);}else heart.rotation.set(0,0,0);heart.rotateY(Math.sin(t*4+i)*.3);}
 }
 group.getObjectByName('sad-mouth').visible=sad;group.getObjectByName('happy-mouth').visible=!sad;
}
