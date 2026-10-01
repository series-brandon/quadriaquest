import {itemChangeMessage} from './item-feedback.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeWorld,findPath,key,SPAWN} from './world.js';
import {createFeedback} from './feedback.js';
import {createSlimeFace} from './slime-face.js';
import {createContactShadow} from './contact-shadow.js';
import {createOpening} from './opening.js';
import {createCraftingTutorial} from './crafting-tutorial.js';
import {craftAxe,cancelActivity,tickCraft,chopTree} from './activities.js';
import {highlightResource} from './resource-highlight.js';
import {createGatheringSkill,awardGatheringXp,gatheringDuration,awardSkillXp,showSkillReward,updateSkillRewards,clearSkillRewards} from './skills.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION,workPose} from './slime-motion.js';
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
scene.add(new THREE.HemisphereLight('#fffce8','#879981',2.6));const sun=new THREE.DirectionalLight('#fff3d3',3);sun.position.set(-8,19,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,far:60});sun.shadow.normalBias=.008;scene.add(sun);
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
const trees=[],fallingTrees=[];
for(const t of world.values())if(t.blocked&&!t.water){const tree=new THREE.Group();tree.position.set(t.x-6,t.h,t.z-6);scene.add(tree);const treeData={x:t.x,z:t.z,tile:t,group:tree,felled:false};trees.push(treeData);const trunk=mesh(new THREE.CylinderGeometry(.09,.15,1.3,7),bark,tree);trunk.position.y=.65;
 for(let j=0;j<3;j++){const crown=mesh(new THREE.IcosahedronGeometry(.72-j*.13,1),leaves[j],tree);crown.position.set(Math.sin(j*3)*.19,1.25+j*.38,Math.cos(j*3)*.12);crown.scale.y=.95;crown.userData.tile=t;crown.userData.tree=treeData;pickables.push(crown);}trunk.userData.tile=t;trunk.userData.tree=treeData;pickables.push(trunk);treeData.highlight=highlightResource(tree,{height:2.9});
}
// Deterministic small flowers and grass tufts leave the navigable grid readable.
for(const t of world.values())if(!t.blocked&&(t.x*17+t.z*13)%7===0){for(let j=0;j<3;j++){const flower=mesh(new THREE.IcosahedronGeometry(.035,0),mat(j%2?'#f6e8ae':'#f8f5dd'));flower.position.set(t.x-6-.32+j*.11,t.h+.13,t.z-6+.3);const stem=mesh(new THREE.CylinderGeometry(.008,.008,.12,3),leaves[0]);stem.position.copy(flower.position);stem.position.y-=.06;}}
const resourceSpecs=[[4,6,'sticks'],[5,3,'stones'],[8,3,'sticks'],[7,7,'stones'],[9,9,'sticks'],[4,10,'stones']],resources=[];
resourceSpecs.forEach(([x,z,type],id)=>{const t=world.get(key(x,z)),group=new THREE.Group();group.position.set(x-6,t.h,z-6);scene.add(group);const resource={id,x,z,type,group,collected:false};resources.push(resource);
 for(let j=0;j<3;j++){let obj;if(type==='sticks'){obj=mesh(new THREE.CylinderGeometry(.045,.055,.6,6),wood,group);obj.rotation.set(Math.PI/2,.2+j*.6,.2);obj.position.set((j-1)*.13,.09+j*.045,(j-1)*.07);}else{obj=mesh(new THREE.IcosahedronGeometry(.17+j*.035,1),rock,group);obj.scale.set(1,.7,.8);obj.position.set((j-1)*.2,.14,j%2*.16);}obj.userData.resource=resource;obj.userData.tile=t;pickables.push(obj);}
 resource.highlight=highlightResource(group);
});
const clearingObjects=scene.children.filter(object=>!object.isLight);
for(const object of clearingObjects)object.visible=false;
const introTile=new THREE.Group();scene.add(introTile);introTile.position.set(0,0,-2);
const introBase=mesh(new RoundedBoxGeometry(1,.94,1,3,.045),soil,introTile);introBase.position.y=.47;
const introGrass=mesh(new RoundedBoxGeometry(1,.1,1,3,.045),grass[0],introTile);introGrass.position.y=.95;
const player=new THREE.Group();scene.add(player);const body=mesh(new RoundedBoxGeometry(.72,.72,.72,4,.16),mat('#a4ce77',{roughness:.4}),player);body.position.y=.43;
const expressionFace=createSlimeFace();player.add(expressionFace.group);
const hands=[];
for(const x of [-.46,.46]){const hand=mesh(new THREE.SphereGeometry(.105,12,10),body.material,player);hand.position.set(x,.33,.08);hands.push(hand);}
const axeTool=new THREE.Group();hands[1].add(axeTool);axeTool.visible=false;
const axeHandle=mesh(new THREE.CylinderGeometry(.023,.028,.43,6),wood,axeTool);axeHandle.position.y=.17;
const axeHead=mesh(new RoundedBoxGeometry(.2,.14,.075,2,.025),rock,axeTool);axeHead.position.set(.065,.35,0);
const visual=new THREE.Group();visual.add(...[...player.children]);player.add(visual);
let facing=0,happyUntil=0;
let gatheringSkill=createGatheringSkill();
const craftingSkill=createGatheringSkill(),lumberjackSkill=createGatheringSkill();
let activeAction=null,chopTarget=null;
const bodyVertex=new THREE.Vector3(),bodyTransform=new THREE.Matrix4();
const bodyPositions=body.geometry.getAttribute('position');
body.updateMatrix();
let tile=world.get(key(SPAWN.x,SPAWN.z)),path=[],segment=null,target=null,gatherTime=0,inventory={sticks:0,stones:0,axes:0,logs:0};player.position.set(tile.x-6,tile.h,tile.z-6);
const feedback=createFeedback(scene);
const contactShadow=createContactShadow(scene,world);
const introSpawn=new THREE.Vector3(0,1,-2);
const clearingSpawn=new THREE.Vector3(tile.x-6,tile.h,tile.z-6);
let debug=null;
const playground=__PLAYGROUND__?await import('./dev/playground.js'):null;
const opening=(playground?.createFreeOpening||createOpening)({player,visual,face:expressionFace,introSpawn,spawn:clearingSpawn,onComplete:()=>craftingTutorial.start(),
 setColor(color){body.material.color.set(color);expressionFace.setBodyColor(color);},
 showClearing(){for(const object of clearingObjects)object.visible=true;introTile.visible=false;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=22;}
});
const craftingTutorial=createCraftingTutorial({getInventory:()=>inventory,startCraft,freePlay:__PLAYGROUND__});
function canMove(){return opening.canMove&&!craftingTutorial.blocksMovement;}
function cancelWork(){
 if(activeAction?.status==='active'){
  const crafting=activeAction.kind==='craft';
  if(activeAction.tree)activeAction.tree.group.rotation.set(0,0,0);
  cancelActivity(activeAction);activeAction=null;
  if(crafting)craftingTutorial.craftCancelled();
 }
 chopTarget=null;
}
function startCraft(){
 if(__PLAYGROUND__)debug?.stop();
 if(segment||path.length||activeAction)return false;
 const action=craftAxe(inventory);if(!action)return false;
 target=null;gatherTime=0;chopTarget=null;activeAction=action;
 feedback.destination(tile);feedback.interacting('Crafting');return true;
}
function routeToTree(tree){
 if(tree.felled)return null;
 const start=segment?segment.to:tile;
 const routes=[];
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
  const at=world.get(key(tree.x+dx,tree.z+dz));
  if(!at||Math.abs(at.h-tree.tile.h)>.5)continue;
  const route=findPath(world,start,at);if(route)routes.push({at,route});
 }
 return routes.sort((a,b)=>a.route.length-b.route.length)[0]||null;
}
function selectTree(tree){
 if(!canMove())return;if(__PLAYGROUND__)debug?.stop();
 if(!craftingTutorial.canChop||!inventory.axes){toast('You need a Crude Axe in your inventory to chop this tree.');feedback.pulse(tree.group.position,false);return;}
 if(chopTarget===tree||activeAction?.tree===tree)return;
 const result=routeToTree(tree);if(!result){toast('There is no safe route to this tree.');feedback.pulse(tree.group.position,false);return;}
 cancelWork();target=null;gatherTime=0;chopTarget=tree;path=result.route;
 feedback.destination(result.at);
}
let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function showItemChanges(changes){const message=itemChangeMessage(changes);if(message)toast(message);}
function updateUI(reward){const count=inventory.sticks+inventory.stones;opening.collected(count,reward);$('sticks').textContent=inventory.sticks;$('stones').textContent=inventory.stones;$('bag-total').textContent=`${count} ITEMS`;$('quest-count').textContent=`${count} / 6 materials collected`;$('quest-progress').style.width=`${count/6*100}%`;$('quest-check').textContent=count===6?'✓':'◇';}
function moveTo(t,resource){if(!canMove())return;if(__PLAYGROUND__)debug?.stop();if(!opening.canGather)resource=null;const point=new THREE.Vector3(t.x-6,t.water?.86:t.h,t.z-6);if(resource&&resource===target){return;}const start=segment?segment.to:tile;const route=findPath(world,start,t);if(route===null){feedback.pulse(point,false);toast(t.blocked?'Find a clear patch of ground.':'That ledge is too high. Find a route with smaller steps.');return;}$('toast').classList.remove('visible');clearTimeout(toastTimer);if(activeAction&&route.length===0&&!segment&&!resource)return;cancelWork();opening.moving(tile,t);target=resource||null;gatherTime=0;path=route;feedback.destination(t);$('activity').textContent=resource?'On the way to gather':'Exploring the clearing';}
function pick(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables.filter(m=>!m.userData.resource?.collected&&!m.userData.tree?.felled),false)[0];}
let down=null,dragged=false,pinchDistance=null;
const activePointers=new Map();
let pointerOnCanvas=false,pointerClient={x:0,y:0};
const canvas=renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function spread(){const [a,b]=[...activePointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
canvas.addEventListener('pointerdown',e=>{
 if(!opening.playable)return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
 if(activePointers.size===1){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button};dragged=false;}
 else{dragged=true;pinchDistance=spread();}
});
canvas.addEventListener('pointermove',e=>{
 if(!opening.playable)return;
 pointerOnCanvas=true;pointerClient={x:e.clientX,y:e.clientY};
 if(!activePointers.has(e.pointerId)||!down)return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(activePointers.size>=2){
  const distance=spread();if(pinchDistance>0&&distance>0)changeZoom(22*Math.log(pinchDistance/distance));
  pinchDistance=distance;dragged=true;return;
 }
 if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
 if(dragged){
  const delta=(e.clientX-down.lastX)*.008,oldElevation=elevation;
  angle+=delta;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-down.lastY)*.005,THREE.MathUtils.degToRad(20),THREE.MathUtils.degToRad(75));
  opening.rotated(Math.abs(delta)+Math.abs(elevation-oldElevation));
 }
 down.lastX=e.clientX;down.lastY=e.clientY;
});
canvas.addEventListener('pointerup',e=>{
 if(canMove()&&activePointers.size===1&&down?.button===0&&!dragged){
  const hit=pick(e),data=hit?.object.userData;
  if(data?.tree)selectTree(data.tree);else if(data?.tile)moveTo(data.tile,data.resource);
  else{const groundHit=raycaster.intersectObject(ground)[0];if(groundHit)feedback.pulse(groundHit.point,false);toast('Choose a tile inside the clearing.');}
 }
 activePointers.delete(e.pointerId);pinchDistance=null;
 if(!activePointers.size)down=null;
 else{const p=[...activePointers.values()][0];down={x:p.x,y:p.y,lastX:p.x,lastY:p.y,button:0};dragged=true;}
});
function cancelGesture(){activePointers.clear();down=null;pinchDistance=null;dragged=true;}
canvas.addEventListener('pointercancel',cancelGesture);addEventListener('blur',cancelGesture);
canvas.addEventListener('pointerleave',()=>{pointerOnCanvas=false;$('tooltip').style.display='none';feedback.hover(null);});
function updateHover(){
 if(!pointerOnCanvas||!canMove()){feedback.hover(null);$('tooltip').style.display='none';return;}
 const hit=pick({clientX:pointerClient.x,clientY:pointerClient.y});hover=hit?.object.userData;
 const t=hover?.tile,tree=hover?.tree,valid=tree?craftingTutorial.canChop&&inventory.axes>0&&!!routeToTree(tree):!!t&&findPath(world,segment?segment.to:tile,t)!==null;
 feedback.hover(t,valid);
 renderer.domElement.style.cursor=t?(valid?'pointer':'not-allowed'):'default';
 $('tooltip').style.display=t?'block':'none';
 if(t){$('tooltip').textContent=tree?(valid?'Chop tree':!inventory.axes?'Missing the required tool!':'No safe route'):!valid?(t.blocked?'Blocked terrain':'No safe route'):hover?.resource&&opening.canGather?'Gather '+hover.resource.type:'Move here';$('tooltip').style.left=(pointerClient.x+16)+'px';$('tooltip').style.top=(pointerClient.y-32)+'px';}
}
function changeZoom(delta){if(!opening.playable)return;const before=zoom;zoom=THREE.MathUtils.clamp(zoom*Math.exp(delta/22),3,34);opening.zoomed(Math.log(zoom/before));}renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY*.012);},{passive:false});$('rotate-left').onclick=()=>angle-=Math.PI/4;$('rotate-right').onclick=()=>angle+=Math.PI/4;$('zoom-in').onclick=()=>changeZoom(-1.5);$('zoom-out').onclick=()=>changeZoom(1.5);
$('reset').onclick=()=>{gatheringSkill=createGatheringSkill();happyUntil=0;path=[];segment=null;target=null;gatherTime=0;inventory={sticks:0,stones:0};tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);for(const r of resources){r.collected=false;r.group.visible=true;}feedback.clearDestination();updateUI();$('activity').textContent='Taking it all in';toast('A fresh little beginning.');};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();let elapsed=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;opening.update(dt);
 if(!opening.playable){rotationKeys.clear();
  const focus=(opening.inClearing?clearingSpawn:introSpawn).clone().add(new THREE.Vector3(0,.35,0)),distance=opening.inClearing?22:6.5;
  camera.position.set(focus.x+Math.sin(Math.PI/4)*distance*Math.cos(elevation),focus.y+Math.sin(elevation)*distance,focus.z+Math.cos(Math.PI/4)*distance*Math.cos(elevation));
  camera.lookAt(focus);camera.updateMatrixWorld();contactShadow.update(player.position,visual.scale);renderer.render(scene,camera);return;
 }
 const oldAngle=angle,oldElevation=elevation;
 angle += (Number(rotationKeys.has('ArrowRight')) - Number(rotationKeys.has('ArrowLeft'))) * keyboardRotationSpeed * dt;
 elevation = THREE.MathUtils.clamp(elevation + (Number(rotationKeys.has('ArrowUp')) - Number(rotationKeys.has('ArrowDown'))) * Math.PI / 3 * dt, THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(75));
 opening.rotated(Math.abs(angle-oldAngle)+Math.abs(elevation-oldElevation));
 let pose=idlePose(elapsed),handWork=null,expression=elapsed<happyUntil?'happy':'idle';
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
  expression=stepped?(segment.age<.32?'preparing':'struggle'):'focused';
  const duration=stepped?STEP_DURATION:1/2.4;
  const motion=stepped?stepMotion(segment.age,segment.height):slideMotion(segment.age/duration);
  player.position.set(
    THREE.MathUtils.lerp(segment.from.x,segment.to.x-6,motion.distance),
    segment.from.y+motion.lift,
    THREE.MathUtils.lerp(segment.from.z,segment.to.z-6,motion.distance)
  );
  pose=motion;
  if(segment.age>=duration){tile=segment.to;player.position.set(tile.x-6,tile.h,tile.z-6);segment=null;if(!path.length)opening.arrived(tile);}
 }else if(!path.length){
  if(chopTarget&&!activeAction){
    activeAction=chopTree(inventory,chopTarget);
    if(!activeAction)chopTarget=null;
  }
  if(activeAction?.status==='active'){
    const action=activeAction;handWork=action.elapsed;expression='focused';
    pose=workPose('gather',gatherTime);
    if(action.kind==='craft'){
      feedback.interacting('Crafting');
      if(tickCraft(action,dt,inventory)){
        activeAction=null;happyUntil=elapsed+1.2;expression='happy';feedback.complete();
        showSkillReward(awardSkillXp(craftingSkill,'Crafting'),player.position);showItemChanges({sticks:-1,stones:-1,axes:1});
        updateUI();craftingTutorial.craftComplete();
      }
    }else{
      feedback.interacting('Chopping');action.elapsed+=dt;
      facing=Math.atan2(action.tree.x-tile.x,action.tree.z-tile.z);
      const swing=Math.sin(action.elapsed*9);pose=workPose('chop',action.elapsed);
      action.tree.group.rotation.z=swing*.018;
      if(action.elapsed>=action.duration){
        action.status='complete';action.tree.felled=true;chopTarget=null;activeAction=null;
        const direction=new THREE.Vector3(action.tree.x-tile.x,0,action.tree.z-tile.z).normalize();
        fallingTrees.push({tree:action.tree,age:0,logs:action.logs,axis:new THREE.Vector3(direction.z,0,-direction.x)});
        action.tree.highlight.update(false,elapsed);feedback.complete();
      }
    }
  }else if(target&&!target.collected){
    feedback.interacting();gatherTime+=dt;
    $('activity').textContent=`Gathering ${target.type}…`;
    handWork=gatherTime;expression='focused';
    pose=workPose('gather',gatherTime);
    if(gatherTime>=gatheringDuration(gatheringSkill)){
      happyUntil=elapsed+1.2;expression='happy';
      target.collected=true;target.group.visible=false;inventory[target.type]++;
      const reward=awardGatheringXp(gatheringSkill);showSkillReward(reward,player.position);
      showItemChanges({[target.type]:1});target=null;gatherTime=0;
      feedback.complete();$('tooltip').style.display='none';updateUI(reward);
      if(inventory.sticks+inventory.stones===6){$('activity').textContent='Clearing explored';}
    }
  }else{if(!(__PLAYGROUND__&&debug?.holdingFeedback))feedback.complete();$('activity').textContent=inventory.sticks+inventory.stones===6?'Clearing explored':'Taking it all in';}
 }
 if(__PLAYGROUND__&&debug){const preview=debug.frame(dt);if(preview){pose=preview.pose;handWork=preview.handWork;expression=preview.expression;player.position.y=tile.h+preview.lift;}}
 expressionFace.set(expression);
 const blend=1-Math.exp(-dt*24),width=1/Math.sqrt(pose.squash);
 visual.scale.lerp(new THREE.Vector3(width/Math.sqrt(pose.stretch),pose.squash,width*Math.sqrt(pose.stretch)),blend);
 visual.rotation.x=THREE.MathUtils.lerp(visual.rotation.x,pose.lean,blend);
 visual.rotation.y=THREE.MathUtils.lerp(visual.rotation.y,pose.twist,blend);
 // Keep the lowest transformed body vertex on the surface, even during lean
 // and squash. The root's jump height remains independent of this correction.
 visual.position.y=0;visual.updateMatrix();bodyTransform.multiplyMatrices(visual.matrix,body.matrix);
 let bottom=Infinity;
 for(let i=0;i<bodyPositions.count;i++){
  bodyVertex.fromBufferAttribute(bodyPositions,i).applyMatrix4(bodyTransform);
  bottom=Math.min(bottom,bodyVertex.y);
 }
 visual.position.y=.002-bottom;
 contactShadow.update(player.position,visual.scale);
 axeTool.visible=(activeAction?.kind==='chop'&&activeAction.status==='active')||(__PLAYGROUND__&&debug?.chopping);
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
  if(axeTool.visible&&i===1){const swing=Math.sin((activeAction?.elapsed??debug?.time??0)*9);x=.42;y=.38+.14*swing;z=.22+.23*Math.max(0,swing);curl=-.65+1.1*swing;}
  hand.position.lerp(new THREE.Vector3(x,y,z),1-Math.exp(-dt*22));
  hand.rotation.x=THREE.MathUtils.lerp(hand.rotation.x,curl,blend);
  hand.scale.lerp(new THREE.Vector3(1,handWork!==null?.88:1,handWork!==null?1.15:1),blend);
 }
 for(let i=fallingTrees.length-1;i>=0;i--){
  const fall=fallingTrees[i];fall.age+=dt;const p=Math.min(1,fall.age/.85);
  fall.tree.group.quaternion.setFromAxisAngle(fall.axis,p*p*Math.PI/2);
  if(p===1){
    fall.tree.group.visible=false;fall.tree.tile.blocked=false;inventory.logs+=fall.logs;
    showSkillReward(awardSkillXp(lumberjackSkill,'Lumberjack'),player.position);showItemChanges({logs:fall.logs});
    happyUntil=elapsed+1.2;craftingTutorial.chopped(fall.logs);fallingTrees.splice(i,1);
  }
 }
 for(const tree of trees)tree.highlight.update(craftingTutorial.highlightTrees&&!tree.felled,elapsed,pointerOnCanvas&&canMove()&&hover?.tree===tree&&!tree.felled);
 const showResourceArrows=!opening.finished&&opening.canGather&&inventory.sticks+inventory.stones===0;
 $('action-progress').style.width=`${gatherTime/gatheringDuration(gatheringSkill)*100}%`;
 const focus=player.position.clone().add(new THREE.Vector3(0,.35,0));const horizontalDistance=zoom*Math.cos(elevation);camera.position.set(focus.x+Math.sin(angle)*horizontalDistance,focus.y+Math.sin(elevation)*zoom,focus.z+Math.cos(angle)*horizontalDistance);camera.lookAt(focus);camera.updateMatrixWorld();updateHover();for(const resource of resources)resource.highlight.update(showResourceArrows&&!resource.collected,elapsed,pointerOnCanvas&&canMove()&&hover?.resource===resource&&!resource.collected);feedback.update(dt,elapsed,camera);updateSkillRewards(dt,camera,innerWidth,innerHeight);renderer.render(scene,camera);
}
if(__PLAYGROUND__){
 debug=playground.mountPlayground({
  skills:{Gathering:gatheringSkill,Crafting:craftingSkill,Lumberjack:lumberjackSkill},
  inventory,player,feedback,getTile:()=>tile,
  stop(){cancelWork();path=[];segment=null;target=null;gatherTime=0;player.position.set(tile.x-6,tile.h,tile.z-6);feedback.clearDestination();},
  reset(kind){
   clearSkillRewards();clearTimeout(toastTimer);$('toast').classList.remove('visible');
   if(kind==='all'||kind==='trees'){fallingTrees.length=0;for(const tree of trees){tree.felled=false;tree.group.visible=true;tree.group.rotation.set(0,0,0);tree.tile.blocked=true;}}
   if(kind==='all'||kind==='items')for(const r of resources){r.collected=false;r.group.visible=true;}
   if(kind==='all'){for(const skill of [gatheringSkill,craftingSkill,lumberjackSkill])Object.assign(skill,{xp:0,level:1});Object.assign(inventory,{sticks:10,stones:10,axes:1,logs:0});tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);happyUntil=0;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=12;}
   if(tile.blocked){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}
   craftingTutorial.refresh();
  },
  refresh:()=>craftingTutorial.refresh(),
  showItemChanges,
  color(value){body.material.color.set(value);expressionFace.setBodyColor(value);},
  faceTowardCamera(){facing=angle;player.rotation.y=angle;}
 });
}
animate();
// Small read-only inspection surface for checking the prototype in a browser.
if(__PLAYGROUND__)window.clime={getState:()=>({tile:{x:tile.x,z:tile.z,h:tile.h},moving:!!segment||path.length>0,target:target?.id??null,gatherTime,inventory:{...inventory},gathering:{...gatheringSkill},crafting:{...craftingSkill},lumberjack:{...lumberjackSkill},tutorialStage:craftingTutorial.stage,action:activeAction?.kind??null,angle,elevation,zoom,profile:opening.profile,tutorialReady:opening.playable}),screenFor:(x,z)=>{const t=world.get(key(x,z));const p=new THREE.Vector3(x-6,t.h+.16,z-6).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};
