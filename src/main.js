import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeWorld,findPath,key} from './world.js';
import {createFeedback} from './feedback.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION} from './slime-motion.js';
const $=id=>document.getElementById(id),world=makeWorld(),scene=new THREE.Scene();scene.background=new THREE.Color('#e5e9df');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setSize(innerWidth,innerHeight);$('game').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,120),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let angle=Math.PI/4,elevation=THREE.MathUtils.degToRad(35.264),zoom=22,hover=null;
const rotationKeys = new Set();
const keyboardRotationSpeed = Math.PI / 2; // 90 degrees per second, independent of key repeat.
addEventListener('keydown', event => {
 if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
 if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
 event.preventDefault();
 rotationKeys.add(event.key);
});
addEventListener('keyup', event => rotationKeys.delete(event.key));
addEventListener('blur', () => rotationKeys.clear());
document.addEventListener('visibilitychange', () => { if (document.hidden) rotationKeys.clear(); });
scene.add(new THREE.HemisphereLight('#fffce8','#879981',2.6));const sun=new THREE.DirectionalLight('#fff3d3',3);sun.position.set(-8,19,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,far:60});sun.shadow.normalBias=.035;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.9,...extra});
const soil=mat('#a5a084'),grass=[mat('#b9ca89'),mat('#b4c484'),mat('#bdcc91'),mat('#b6c88b')],bark=mat('#a68c6b'),leaves=[mat('#799b62'),mat('#95b575'),mat('#a9c589')],rock=mat('#a5ada6'),wood=mat('#a98a64'),dark=mat('#314b41');
function mesh(geometry,material,parent=scene){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const pickables=[];
// Each tile is flush against equal-height neighbors. Only exposed top edges
// receive the three-segment bevel; tile seams are separately drawn on top.
function terrain(t,index){
 const exposed=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>{const n=world.get(key(t.x+dx,t.z+dz));return !n||n.h<t.h||n.water;});
 const r=.065,verts=[],indices=[];
 for(let ring=0;ring<=3;ring++){
  const a=ring/3*Math.PI/2,inset=r*(1-Math.cos(a)),y=t.h-r+r*Math.sin(a);
  const x0=-.5+(exposed[0]?inset:0),x1=.5-(exposed[1]?inset:0),z0=-.5+(exposed[2]?inset:0),z1=.5-(exposed[3]?inset:0);
  verts.push(x0,y,z0,x0,y,z1,x1,y,z1,x1,y,z0);
  if(ring<3)for(let j=0;j<4;j++){const a=ring*4+j,b=ring*4+(j+1)%4;indices.push(a,b,b+4,a,b+4,a+4);}
 }
 indices.push(12,13,14,12,14,15);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();const top=mesh(geo,grass[index%4]);top.position.set(t.x-6,0,t.z-6);top.userData.tile=t;pickables.push(top);
 const base=mesh(new THREE.BoxGeometry(1,t.h-r,1),soil);base.position.set(t.x-6,(t.h-r)/2,t.z-6);base.userData.tile=t;pickables.push(base);
 const linePoints=[];for(const [a,b,visible]of [[[-.5,-.5],[.5,-.5],!exposed[2]],[[-.5,-.5],[-.5,.5],!exposed[0]]])if(visible)linePoints.push(new THREE.Vector3(a[0],t.h+.002,a[1]),new THREE.Vector3(b[0],t.h+.002,b[1]));
 const lines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePoints),new THREE.LineBasicMaterial({color:'#72865c',transparent:true,opacity:.16}));lines.position.set(t.x-6,0,t.z-6);scene.add(lines);
}
let idx=0;for(const t of world.values()){
 if(t.water){const water=mesh(new THREE.BoxGeometry(1,.85,1),mat('#8dbdb3',{roughness:.3,metalness:.08}));water.position.set(t.x-6,.425,t.z-6);water.userData.tile=t;pickables.push(water);for(let n=0;n<2;n++){const ripple=mesh(new THREE.BoxGeometry(.24,.004,.018),mat('#c9e3cc'));ripple.position.set(t.x-6+(n-.5)*.3,.86,t.z-6+(n-.5)*.34);}}else terrain(t,idx++);
}
const ground=mesh(new THREE.PlaneGeometry(200,200),mat('#e5e9df'));ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.castShadow=false;
for(const t of world.values())if(t.blocked&&!t.water){const tree=new THREE.Group();tree.position.set(t.x-6,t.h,t.z-6);scene.add(tree);const trunk=mesh(new THREE.CylinderGeometry(.09,.15,1.3,7),bark,tree);trunk.position.y=.65;
 for(let j=0;j<3;j++){const crown=mesh(new THREE.IcosahedronGeometry(.72-j*.13,1),leaves[j],tree);crown.position.set(Math.sin(j*3)*.19,1.25+j*.38,Math.cos(j*3)*.12);crown.scale.y=.95;crown.userData.tile=t;pickables.push(crown);}trunk.userData.tile=t;pickables.push(trunk);
}
// Deterministic small flowers and grass tufts leave the navigable grid readable.
for(const t of world.values())if(!t.blocked&&(t.x*17+t.z*13)%7===0){for(let j=0;j<3;j++){const flower=mesh(new THREE.IcosahedronGeometry(.035,0),mat(j%2?'#f6e8ae':'#f8f5dd'));flower.position.set(t.x-6-.32+j*.11,t.h+.13,t.z-6+.3);const stem=mesh(new THREE.CylinderGeometry(.008,.008,.12,3),leaves[0]);stem.position.copy(flower.position);stem.position.y-=.06;}}
const resourceSpecs=[[4,6,'sticks'],[5,3,'stones'],[8,3,'sticks'],[7,7,'stones'],[9,9,'sticks'],[4,10,'stones']],resources=[];
resourceSpecs.forEach(([x,z,type],id)=>{const t=world.get(key(x,z)),group=new THREE.Group();group.position.set(x-6,t.h,z-6);scene.add(group);const resource={id,x,z,type,group,collected:false};resources.push(resource);
 for(let j=0;j<3;j++){let obj;if(type==='sticks'){obj=mesh(new THREE.CylinderGeometry(.045,.055,.6,6),wood,group);obj.rotation.set(Math.PI/2,.2+j*.6,.2);obj.position.set((j-1)*.13,.09+j*.045,(j-1)*.07);}else{obj=mesh(new THREE.IcosahedronGeometry(.17+j*.035,1),rock,group);obj.scale.set(1,.7,.8);obj.position.set((j-1)*.2,.14,j%2*.16);}obj.userData.resource=resource;obj.userData.tile=t;pickables.push(obj);}
 const halo=mesh(new THREE.RingGeometry(.35,.37,32),new THREE.MeshBasicMaterial({color:'#f5f0c9',side:THREE.DoubleSide,transparent:true,opacity:.8}),group);halo.rotation.x=-Math.PI/2;halo.position.y=.015;
});
const player=new THREE.Group();scene.add(player);const body=mesh(new RoundedBoxGeometry(.72,.72,.72,4,.16),mat('#a4ce77',{roughness:.4}),player);body.position.y=.43;
const face=new THREE.Group();player.add(face);for(const x of [-.14,.14]){const eye=mesh(new THREE.SphereGeometry(.043,12,8),dark,face);eye.position.set(x,.5,.355);const glint=mesh(new THREE.SphereGeometry(.012,8,6),mat('#fffef1'),face);glint.position.set(x-.01,.515,.387);const cheek=mesh(new THREE.SphereGeometry(.035,10,6),mat('#dfb594'),face);cheek.scale.set(1,.55,.3);cheek.position.set(x*1.5,.4,.363);}const smile=mesh(new THREE.TorusGeometry(.04,.009,6,12,Math.PI),dark,face);smile.rotation.z=Math.PI;smile.position.set(0,.415,.375);
const hands=[];
for(const x of [-.46,.46]){const hand=mesh(new THREE.SphereGeometry(.105,12,10),mat('#b5d994'),player);hand.position.set(x,.33,.08);hands.push(hand);}
const visual=new THREE.Group();visual.add(...[...player.children]);player.add(visual);
let facing=0;
let tile=world.get(key(6,4)),path=[],segment=null,target=null,gatherTime=0,inventory={sticks:0,stones:0};player.position.set(tile.x-6,tile.h,tile.z-6);
const feedback=createFeedback(scene);
let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function updateUI(){const count=inventory.sticks+inventory.stones;$('sticks').textContent=inventory.sticks;$('stones').textContent=inventory.stones;$('bag-total').textContent=`${count} ITEMS`;$('quest-count').textContent=`${count} / 6 materials collected`;$('quest-progress').style.width=`${count/6*100}%`;$('quest-check').textContent=count===6?'✓':'◇';}
function moveTo(t,resource){const point=new THREE.Vector3(t.x-6,t.water?.86:t.h,t.z-6);if(resource&&resource===target){return;}const start=segment?segment.to:tile;const route=findPath(world,start,t);if(route===null){feedback.pulse(point,false);toast(t.blocked?'Find a clear patch of ground.':'That ledge is too high. Find a route with smaller steps.');return;}$('toast').classList.remove('visible');clearTimeout(toastTimer);target=resource||null;gatherTime=0;path=route;feedback.destination(t);$('activity').textContent=resource?'On the way to gather':'Exploring the clearing';}
function pick(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables.filter(m=>!m.userData.resource?.collected),false)[0];}
let down=null,dragged=false;renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,button:e.button};dragged=false;renderer.domElement.setPointerCapture(e.pointerId);});
let pointerOnCanvas=false, pointerClient={x:0,y:0};
renderer.domElement.addEventListener('pointermove',e=>{
 pointerOnCanvas=true;pointerClient={x:e.clientX,y:e.clientY};
 if(down&&down.button===2){angle+=(e.clientX-down.x)*.008;down.x=e.clientX;dragged=true;return;}
 if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)dragged=true;
});
renderer.domElement.addEventListener('pointerup',e=>{
 if(down?.button===0&&!dragged){
  const hit=pick(e),data=hit?.object.userData;
  if(data?.tile)moveTo(data.tile,data.resource);
  else {const groundHit=raycaster.intersectObject(ground)[0];if(groundHit)feedback.pulse(groundHit.point,false);toast('Choose a tile inside the clearing.');}
 }
 down=null;
});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;pointerOnCanvas=false;feedback.hover(null);});
renderer.domElement.addEventListener('pointerleave',()=>{pointerOnCanvas=false;$('tooltip').style.display='none';feedback.hover(null);});
function updateHover(){
 if(!pointerOnCanvas)return;
 const hit=pick({clientX:pointerClient.x,clientY:pointerClient.y});hover=hit?.object.userData;
 const t=hover?.tile,valid=!!t&&findPath(world,segment?segment.to:tile,t)!==null;
 feedback.hover(t,valid);
 renderer.domElement.style.cursor=t?(valid?'pointer':'not-allowed'):'default';
 $('tooltip').style.display=t?'block':'none';
 if(t){$('tooltip').textContent=!valid?(t.blocked?'Blocked terrain':'No safe route'):hover?.resource?'Gather '+hover.resource.type:'Move here';$('tooltip').style.left=(pointerClient.x+16)+'px';$('tooltip').style.top=(pointerClient.y-32)+'px';}
}
function changeZoom(delta){zoom=THREE.MathUtils.clamp(zoom*Math.exp(delta/22),3,34);}renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY*.012);},{passive:false});$('rotate-left').onclick=()=>angle-=Math.PI/4;$('rotate-right').onclick=()=>angle+=Math.PI/4;$('zoom-in').onclick=()=>changeZoom(-1.5);$('zoom-out').onclick=()=>changeZoom(1.5);
$('reset').onclick=()=>{path=[];segment=null;target=null;gatherTime=0;inventory={sticks:0,stones:0};tile=world.get(key(6,4));player.position.set(tile.x-6,tile.h,tile.z-6);for(const r of resources){r.collected=false;r.group.visible=true;}feedback.clearDestination();updateUI();$('activity').textContent='Taking it all in';toast('A fresh little beginning.');};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();let elapsed=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
 angle += (Number(rotationKeys.has('ArrowRight')) - Number(rotationKeys.has('ArrowLeft'))) * keyboardRotationSpeed * dt;
 elevation = THREE.MathUtils.clamp(elevation + (Number(rotationKeys.has('ArrowUp')) - Number(rotationKeys.has('ArrowDown'))) * Math.PI / 3 * dt, THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(75));
 let pose=idlePose(elapsed),handWork=null;
 if(!segment&&path.length){
  const to=path.shift();segment={from:player.position.clone(),to,age:0,height:to.h-player.position.y};
  facing=Math.atan2(to.x-tile.x,to.z-tile.z);
 }
 // Turn by the shortest arc instead of snapping at tile corners.
 const turn=Math.atan2(Math.sin(facing-player.rotation.y),Math.cos(facing-player.rotation.y));
 player.rotation.y+=turn*(1-Math.exp(-dt*16));
 if(segment){
  segment.age+=dt;
  const stepped=Math.abs(segment.height)>.01;
  const duration=stepped?STEP_DURATION:1/2.4;
  const motion=stepped?stepMotion(segment.age,segment.height):slideMotion(segment.age/duration);
  player.position.set(
    THREE.MathUtils.lerp(segment.from.x,segment.to.x-6,motion.distance),
    segment.from.y+motion.lift,
    THREE.MathUtils.lerp(segment.from.z,segment.to.z-6,motion.distance)
  );
  pose=motion;
  if(segment.age>=duration){tile=segment.to;player.position.set(tile.x-6,tile.h,tile.z-6);segment=null;}
 }else if(!path.length){
  if(target&&!target.collected){
    feedback.interacting();gatherTime+=dt;
    $('activity').textContent=`Gathering ${target.type}…`;
    handWork=gatherTime;
    pose={squash:.97,stretch:1,twist:0,lean:.035};
    if(gatherTime>=1.2){
      target.collected=true;target.group.visible=false;inventory[target.type]++;
      toast(`+1 ${target.type} added to your satchel`);target=null;gatherTime=0;
      feedback.complete();$('tooltip').style.display='none';updateUI();
      if(inventory.sticks+inventory.stones===6){toast('A promising start. You found every material!');$('activity').textContent='Clearing explored';}
    }
  }else{feedback.complete();$('activity').textContent=inventory.sticks+inventory.stones===6?'Clearing explored':'Taking it all in';}
 }
 const blend=1-Math.exp(-dt*24),width=1/Math.sqrt(pose.squash);
 visual.scale.lerp(new THREE.Vector3(width/Math.sqrt(pose.stretch),pose.squash,width*Math.sqrt(pose.stretch)),blend);
 visual.rotation.x=THREE.MathUtils.lerp(visual.rotation.x,pose.lean,blend);
 visual.rotation.y=THREE.MathUtils.lerp(visual.rotation.y,pose.twist,blend);
 // Alternate reach, dip, and scoop gestures while keeping the body steady.
 for(let i=0;i<hands.length;i++){
  const hand=hands[i],side=i===0?-1:1;
  let x=side*.46,y=.33,z=.08+(pose.armDrive||0),curl=0;
  if(handWork!==null){
    const phase=handWork*Math.PI*5+i*Math.PI;
    const reach=(Math.sin(phase)+1)/2;
    x=side*(.22+.09*(1-reach));
    y=.26+.1*Math.cos(phase);
    z=.43+.2*reach;
    curl=Math.sin(phase)*.35;
  }
  hand.position.lerp(new THREE.Vector3(x,y,z),1-Math.exp(-dt*22));
  hand.rotation.x=THREE.MathUtils.lerp(hand.rotation.x,curl,blend);
  hand.scale.lerp(new THREE.Vector3(1,handWork!==null?.88:1,handWork!==null?1.15:1),blend);
 }
 $('action-progress').style.width=`${gatherTime/1.2*100}%`;
 const focus=player.position.clone().add(new THREE.Vector3(0,.35,0));const horizontalDistance=zoom*Math.cos(elevation);camera.position.set(focus.x+Math.sin(angle)*horizontalDistance,focus.y+Math.sin(elevation)*zoom,focus.z+Math.cos(angle)*horizontalDistance);camera.lookAt(focus);camera.updateMatrixWorld();updateHover();feedback.update(dt,elapsed,camera);renderer.render(scene,camera);
}
animate();
// Small read-only inspection surface for checking the prototype in a browser.
window.clime={getState:()=>({tile:{x:tile.x,z:tile.z,h:tile.h},moving:!!segment||path.length>0,target:target?.id??null,gatherTime,inventory:{...inventory},angle,elevation,zoom}),screenFor:(x,z)=>{const t=world.get(key(x,z));const p=new THREE.Vector3(x-6,t.h+.16,z-6).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};
