import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {part,namedPart} from './model-parts.js';
import {findPart} from './named-parts.js';

// Wild creatures (docs/COMBAT.md, Creatures): two shared rigs, each kind only a look on one of them.
//   critter    small mammals on four legs (Burrow Vole, Acorn Squirrel, Crag Rat): ears, buck teeth and a tail
//   arthropod  jointed legs, optional claws and tail (Shore Crab, Loom Spider, Stone Scorpion)
// Like the goblins, every creature of a kind shares its geometry and materials (marked shared so disposers
// leave them), so a chunk that spawns one builds nothing new. Models face +z and stand on y = 0; animate*()
// takes the shared enemy animation inputs from combat.js (walk 0..1, attack: the attackPose clock, hit 0..1).
const geometries=new Map(),materials=new Map();
const G=(key,make)=>{if(!geometries.has(key)){const g=make();g.userData.shared=true;geometries.set(key,g);}return geometries.get(key);};
const M=color=>{if(!materials.has(color)){const m=new THREE.MeshStandardMaterial({color,roughness:.8});m.userData.shared=true;materials.set(color,m);}return materials.get(color);};
const sphere=(r,w=14,h=10)=>G(`s:${r},${w},${h}`,()=>new THREE.SphereGeometry(r,w,h));
const capsule=(r,l)=>G(`c:${r},${l}`,()=>new THREE.CapsuleGeometry(r,l,4,8));
const cone=(r,h,s=8)=>G(`k:${r},${h},${s}`,()=>new THREE.ConeGeometry(r,h,s));
const disc=(r,t)=>G(`d:${r},${t}`,()=>new THREE.CylinderGeometry(r,r,t,12));
const box=(x,y,z,r)=>G(`b:${x},${y},${z},${r}`,()=>new RoundedBoxGeometry(x,y,z,2,r));
const group=(parent,name,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;};
// Cute eyes: a dark eye with a highlight, so even the scarier creatures read friendly-ish at a glance.
function eye(parent,name,r,x,y,z){const e=namedPart(parent,name,sphere(r,12,8),M('#22201f'),x,y,z);part(parent,sphere(r*.32,8,6),M('#fff8e6'),x-r*.25,y+r*.35,z+r*.75);return e;}

// ── Critters ────────────────────────────────────────────────────────────────
// Blocky like the corgi: a rounded-box body and head, nub feet tucked under the body, and every part sunk into
// the one it hangs from, so nothing floats. A look sets the colours and sizes (body and head [w, h, l]), the
// ears (round, big or tufted), snout (blunt or pointed), tail (nub, long or bushy) and pose (`sit`: a squirrel
// sits up on its haunches, front paws holding an acorn).
export const CRITTERS={
 vole:{fur:'#8b6b4c',belly:'#c9ab86',ear:'#b58a6c',body:[.36,.27,.44],head:[.32,.27,.27],headAt:[.3,.22],ears:'round',snout:'blunt',tail:'nub'},
 squirrel:{fur:'#b8643a',belly:'#efd9b4',ear:'#d98a5c',tuft:'#7a3e22',tailTip:'#cf7a4c',body:[.3,.34,.3],head:[.3,.27,.27],headAt:[.5,.1],ears:'tufted',snout:'blunt',tail:'bushy',sit:true},
 cragRat:{fur:'#7c746e',belly:'#b9b0a6',ear:'#d6a09b',body:[.3,.24,.52],head:[.26,.22,.28],headAt:[.27,.3],ears:'big',snout:'pointed',tail:'long'},
};
const FEET_Y=.04,BODY_FLOOR=.065;
// A pointed ear (squirrel), extruded once and shared.
const pointedEar=()=>G('ear:pointed',()=>{const s=new THREE.Shape();s.moveTo(-.055,-.04);s.lineTo(.055,-.04);s.lineTo(.01,.12);s.quadraticCurveTo(0,.145,-.01,.12);s.closePath();
 const geo=new THREE.ExtrudeGeometry(s,{depth:.035,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:6,steps:1});geo.translate(0,0,-.0175);return geo;});
// A rat's tail: one tube from inside the rump, dipping, then curling to the side.
const ratTail=()=>G('tail:rat',()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0,0,.06],[0,-.04,-.12],[.04,-.1,-.32],[.14,-.13,-.48],[.26,-.12,-.56]].map(p=>new THREE.Vector3(...p))),24,.022,6,false));
export function critter(kind){
 const look=CRITTERS[kind],g=new THREE.Group(),rig=group(g,'critter-rig');
 const fur=M(look.fur),belly=M(look.belly),[bw,bh,bl]=look.body,[hw,hh,hl]=look.head;
 // Body: a sitting squirrel leans back on its haunches; the others stand level.
 const torso=group(rig,'torso',0,BODY_FLOOR+bh/2,look.sit?-.06:-.02);if(look.sit)torso.rotation.x=-.35;
 namedPart(torso,'body',box(bw,bh,bl,.09),fur);
 part(torso,box(bw*.62,bh*.66,.04,.018),belly,0,-bh*.1,bl/2-.012);
 const head=group(rig,'head',0,...look.headAt);
 part(head,box(hw,hh,hl,.09),fur);
 if(look.snout==='pointed'){const s=part(head,cone(.085,.17,8),fur,0,-.04,hl/2+.05);s.rotation.x=Math.PI/2;part(head,sphere(.03,8,6),M(look.ear),0,-.04,hl/2+.14);}
 else{part(head,box(hw*.56,hh*.38,.1,.04),belly,0,-hh*.2,hl/2-.02);part(head,sphere(.032,8,6),M('#3b2a26'),0,-hh*.1,hl/2+.035);}
 for(const side of [-1,1]){
  eye(head,'eye'+side,.04,side*hw*.27,hh*.1,hl/2-.012);
  // Buck teeth, side by side, tucked into the underside of the snout.
  part(head,box(.026,.045,.014,.005),M('#fff6e2'),side*.015,look.snout==='pointed'?-.093:-hh*.39-.012,hl/2+(look.snout==='pointed'?.005:.012));
  // Ears sit sunk into the top of the head.
  const ear=group(head,'ear'+side,side*hw*.3,hh/2-.015,-.02);
  if(look.ears==='tufted'){part(ear,pointedEar(),M(look.fur)).rotation.z=-side*.12;part(ear,pointedEar(),M(look.ear),0,.01,.012).scale.set(.6,.62,.6);
   part(ear,cone(.026,.1,5),M(look.tuft),side*-.012,.15).rotation.z=-side*.2;}
  else{const r=look.ears==='big'?.085:.065,o=part(ear,disc(r,.03),fur,0,r*.5);o.rotation.x=Math.PI/2;
   const inner=part(ear,disc(r*.62,.032),M(look.ear),0,r*.5,.004);inner.rotation.x=Math.PI/2;}
 }
 // Legs: nub feet under the body's corners. A sitting squirrel has long back feet under its haunches and
 // little front paws held up, with an acorn between them.
 const feet=[[.14,bl/2-.09],[-.14,-bl/2+.09]];
 for(const side of [-1,1])for(const [i,[,z]] of feet.entries()){
  const front=i===0,leg=group(rig,'leg'+(i*2+(side>0?1:0)),side*(bw/2-.06),FEET_Y+.05,z+torso.position.z);
  if(look.sit&&front){leg.position.set(side*.075,.3,.13);part(leg,capsule(.032,.07),fur,0,-.03,.03).rotation.x=1.1;part(leg,sphere(.035,8,6),belly,0,-.06,.08);}
  else if(look.sit){leg.position.set(side*.12,FEET_Y+.05,-.04);leg.userData.swing=.15;part(leg,box(.13,.17,.24,.06),fur,0,.07,-.02);part(leg,box(.1,.05,.2,.022),belly,0,-.04,.05);}
  else part(leg,sphere(.058,10,8),belly,0,-.05,0).scale.set(1,.6,1.25);
 }
 if(look.sit){const nut=group(rig,'acorn',0,.25,.19);part(nut,sphere(.045,10,8),M('#a8743a')).scale.set(1,1.15,1);part(nut,sphere(.05,10,6),M('#6b4a2b'),0,.035).scale.set(1,.5,1);}
 // Tails start inside the body so they stay attached while they sway.
 const tail=group(rig,'tail',0,look.sit?.2:BODY_FLOOR+bh*.55,look.sit?-.18:torso.position.z-bl/2+.03);
 if(look.tail==='nub')part(tail,sphere(.065,10,8),fur,0,0,-.03);
 else if(look.tail==='long')part(tail,ratTail(),M(look.ear));
 else{// A bushy S curling up behind the back.
  for(const [w,h,l,y,z,rx,color] of [[.2,.22,.22,.02,-.1,-.3,fur],[.24,.28,.22,.24,-.2,.15,fur],[.23,.26,.2,.47,-.15,.4,fur],[.19,.16,.16,.6,-.03,.6,M(look.tailTip)]])
   part(tail,box(w,h,l,.055),color,0,y,z).rotation.x=rx;
 }
 return g;
}
export function animateCritter(group,time,{walk=0,attack=0,hit=0}={}){
 const rig=findPart(group,'critter-rig');if(!rig)return;
 const stride=Math.sin(time*13)*walk,lunge=Math.max(0,attack),load=Math.max(0,-attack);
 rig.position.set(0,Math.abs(stride)*.03,lunge*.16-load*.08);
 rig.rotation.set(lunge*.22-load*.12,0,hit*.16);
 const body=findPart(group,'body');body.scale.y=1+Math.sin(time*3.1)*.02*(1-walk);
 const head=findPart(group,'head');head.rotation.x=Math.sin(time*7)*.02+lunge*.2;head.rotation.y=Math.sin(time*.9)*.15*(1-walk);
 for(let i=0;i<4;i++){const leg=findPart(group,'leg'+i),front=i<2,phase=(i===0||i===3)?1:-1;leg.rotation.x=stride*phase*(leg.userData.swing??.5)-(front?lunge*.6:0);}
 const tail=findPart(group,'tail');tail.rotation.y=Math.sin(time*2.4)*.18+stride*.2;tail.rotation.x=Math.sin(time*1.7)*.06;
 const blink=time%3.7>3.58?.15:1;for(const side of [-1,1]){findPart(group,'eye'+side).scale.y=blink;findPart(group,'ear'+side).rotation.z=Math.sin(time*2+side)*.06*(time%5>4.4?3:1);}
}

// ── Arthropods ──────────────────────────────────────────────────────────────
// A leg is a hip (yaw), a thigh (raised) and a shin (down to the ground). legs: [z, spread] per side.
export const ARTHROPODS={
 crab:{shell:'#d4583c',under:'#f0b48c',leg:'#c44a32',hipY:.26,legs:[[.06,.25],[-.08,0],[-.22,-.3]],thigh:.2,shin:.3,claws:{at:[.34,.3,.2],size:1.15},eyes:'stalks'},
 spider:{shell:'#6d5f8f',under:'#a596c4',leg:'#4f4469',hipY:.36,legs:[[.2,.55],[.08,.18],[-.04,-.18],[-.16,-.55]],thigh:.28,shin:.5,eyes:'spider'},
 scorpion:{shell:'#a98b62',under:'#d3bc92',leg:'#86694a',hipY:.24,legs:[[.08,.35],[-.04,.05],[-.16,-.25],[-.28,-.5]],thigh:.22,shin:.3,claws:{at:[.14,.27,.22],size:.9,reach:.24},tail:'#7f6346',eyes:'small'},
};
function leg(rig,name,side,z,spread,{hipY,thigh,shin,leg:color}){
 const hip=group(rig,name,side*.16,hipY,z);hip.rotation.y=side>0?-spread:Math.PI+spread;
 const upper=group(hip,'thigh-'+name);upper.rotation.z=.75;
 part(upper,capsule(.035,thigh),M(color),thigh/2).rotation.z=Math.PI/2;
 const knee=group(upper,'shin-'+name,thigh);knee.rotation.z=-1.95;
 part(knee,capsule(.03,shin),M(color),shin/2).rotation.z=Math.PI/2;
 hip.userData.yaw=hip.rotation.y;return hip;
}
function claw(rig,side,{at:[x,y,z],size,reach=0},look){
 const arm=group(rig,'claw'+side,side*x,y,z);arm.scale.setScalar(size);
 part(arm,capsule(.045,.12+reach),M(look.leg),0,0,.08+reach/2).rotation.x=Math.PI/2;
 const palm=part(arm,sphere(.1,12,10),M(look.shell),0,.01,.22+reach);palm.scale.set(.8,.75,1.1);
 const finger=group(arm,'pinch'+side,0,.04,.26+reach);
 part(finger,cone(.045,.17,6),M(look.shell),0,0,.06).rotation.x=Math.PI/2;
 part(arm,cone(.04,.14,6),M(look.under),0,-.03,.34+reach).rotation.x=Math.PI/2;
 return arm;
}
export function arthropod(kind){
 const look=ARTHROPODS[kind],g=new THREE.Group(),rig=group(g,'arthropod-rig');g.userData.creature=kind;
 const shell=M(look.shell),under=M(look.under);
 if(kind==='spider'){
  const abdomen=namedPart(rig,'body',sphere(.3,16,12),shell,0,.44,-.32);abdomen.scale.set(1,.88,1.15);
  for(const [y,z] of [[.68,-.3],[.6,-.5]])part(rig,sphere(.07,10,8),under,0,y,z).scale.set(1.6,.5,1);
  part(rig,sphere(.2,14,10),shell,0,.36,.08).scale.set(1,.85,1.05);
 }else if(kind==='crab'){
  const body=namedPart(rig,'body',sphere(.34,18,12),shell,0,.3,0);body.scale.set(1.25,.5,.9);
  part(rig,sphere(.3,14,10),under,0,.25,.02).scale.set(1.2,.35,.85);
 }else{
  namedPart(rig,'body',box(.38,.18,.56,.07),shell,0,.26,0);
  for(const z of [.12,-.06])part(rig,box(.4,.04,.1,.02),under,0,.36,z);
 }
 const head=group(rig,'head',0,kind==='spider'?.4:.32,kind==='crab'?.2:kind==='spider'?.22:.28);
 for(const side of [-1,1]){
  if(look.eyes==='stalks'){const stalk=group(head,'stalk'+side,side*.09,.08,0);part(stalk,capsule(.022,.1),under,0,.06);
   part(stalk,sphere(.055,10,8),M('#fff8ec'),0,.15);eye(stalk,'eye'+side,.032,0,.15,.035);}
  else if(look.eyes==='spider'){part(head,sphere(.075,12,8),M('#fff8ec'),side*.075,.03,.02);eye(head,'eye'+side,.048,side*.075,.03,.065);
   part(head,sphere(.025,8,6),M('#22201f'),side*.04,.1,.04);part(head,cone(.02,.07,5),under,side*.035,-.07,.06).rotation.x=Math.PI;}
  else eye(head,'eye'+side,.035,side*.08,.02,.02);
  look.legs.forEach(([z,spread],i)=>leg(rig,`leg${i*2+(side>0?1:0)}`,side,z,spread,look));
  if(look.claws)claw(rig,side,look.claws,look);
 }
 if(look.tail){
  // Five segments curling up and over the back, then the stinger.
  let joint=group(rig,'tail',0,.3,-.28);joint.rotation.x=.5;
  for(let i=0;i<5;i++){part(joint,sphere(.085-i*.008,10,8),M(i%2?look.tail:look.shell),0,0,-.07).scale.set(1,.85,1.2);
   joint=group(joint,'tail'+i,0,0,-.13);joint.rotation.x=.42;}
  // The stinger: a bulb sunk into the last segment, its barb curling forward out of the bulb.
  part(joint,sphere(.06,10,8),M(look.tail),0,0,.02).scale.set(1,.9,1.15);
  part(joint,cone(.032,.13,6),M('#3c2f26'),0,.06,-.013).rotation.x=-.49;
 }
 return g;
}
export function animateArthropod(group,time,{walk=0,attack=0,hit=0}={}){
 const rig=findPart(group,'arthropod-rig');if(!rig)return;
 const lunge=Math.max(0,attack),load=Math.max(0,-attack),scuttle=time*14;
 rig.position.set(0,Math.abs(Math.sin(scuttle))*.02*walk,lunge*.12-load*.06);
 rig.rotation.set(-load*.08+lunge*.06,0,hit*.14);
 for(let i=0;i<8;i++){const hip=findPart(group,'leg'+i);if(!hip)break;
  const phase=((i>>1)+(i&1))%2?1:-1,swing=Math.sin(scuttle+phase*Math.PI/2)*walk;
  hip.rotation.y=hip.userData.yaw+swing*.3;findPart(group,'thigh-leg'+i).rotation.z=.75+Math.max(0,swing*phase)*.35+(i<2?lunge*.6:0);}
 for(const side of [-1,1]){
  const arm=findPart(group,'claw'+side);
  if(arm){arm.rotation.x=-lunge*.7+load*.3+Math.sin(time*1.6+side)*.05;arm.rotation.y=-side*lunge*.25;findPart(group,'pinch'+side).rotation.x=-.35*(1-lunge)+Math.max(0,Math.sin(time*3+side))*.15;}
  const stalk=findPart(group,'stalk'+side);if(stalk)stalk.rotation.z=Math.sin(time*1.3+side*2)*.12;
  const eye=findPart(group,'eye'+side);if(eye)eye.scale.y=time%4.1>3.98?.15:1;
 }
 // The tail draws back while loading and whips over to strike.
 const tail=findPart(group,'tail');if(tail){tail.rotation.x=.5-load*.2+lunge*.3+Math.sin(time*1.4)*.04;for(let i=0;i<5;i++)findPart(group,'tail'+i).rotation.x=.42+lunge*.12-load*.06;}
 // A spider's abdomen breathes.
 if(group.userData.creature==='spider')findPart(group,'body').scale.y=.88*(1+Math.sin(time*2.2)*.03);
}
