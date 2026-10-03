import {holdUpMotion} from './catch-motion.js';
import {placeFaintedHands} from './faint-motion.js';
import {playerActionMotion,gatheringHand,alignSupportingHand} from './player-action-motion.js';
import {makeAxe} from './axe-model.js';
import {animateResourceDepletion,animateResourceHit} from './resource-depletion.js';
import {interactionRoute} from './interaction-route.js';
import {makeSlime} from './slime-model.js';
import {makeTree,makeFlowers,makeTerrainTile,addWaterTile} from './world-models.js';
import {createGroundItemModel} from './ground-item-models.js';
import {createWillowbank} from './willowbank.js';
import {createGrassColors} from './grass-palette.js';
import {updateObjective,finishObjective,resetObjectives} from './quests.js';
import {icon} from './icons.js';
import {createGameAudio,mountAudioControls} from './audio.js';
import {mountJournal} from './journal.js';
import {BOULDER_TILES,makeBoulder,makePickaxe,miningMotion} from './mining.js';
import {ITEMS} from './items.js';
import {createWaterEffects,waterSettings} from './water-effects.js';
import {createResourceHitbox} from './resource-hitbox.js';
import './ui-theme.css';
import './dialogue-presentation.css';
import {createSlimeBend} from './slime-bend.js';
import {createSplash} from './splash.js';
import {socialMotion,createIdleClock,SLEEP_SETTLE} from './slime-social.js';
import {createSleepFeedback} from './sleep-feedback.js';
import {createTutorialFinale} from './tutorial-finale.js';
import {createItemFeed} from './item-feedback.js';
const gameAudio=createGameAudio(),itemFeed=createItemFeed(icon),settingsUI=mountAudioControls(gameAudio);
window.addEventListener('quadriaquest-level',()=>gameAudio.play('level'));
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeWorld,findPath,key,SPAWN} from './world.js';
import {createFeedback} from './feedback.js';
import {createContactShadow} from './contact-shadow.js';
import {createOpening} from './opening.js';
import {createCraftingTutorial} from './crafting-tutorial.js';
import {craftAxe,craftPickaxe,mineBoulder,cancelActivity,tickCraft,chopTree} from './activities.js';
import {highlightResource} from './resource-highlight.js';
import {createGatheringSkill,awardGatheringXp,gatheringDuration,awardSkillXp,showSkillReward,updateSkillRewards,clearSkillRewards} from './skills.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION,workPose,chopMotion} from './slime-motion.js';
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
scene.add(new THREE.HemisphereLight('#fffce8','#879981',2.6));const sun=new THREE.DirectionalLight('#fff3d3',3);sun.position.set(-8,19,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,far:80});sun.shadow.normalBias=.008;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.9,...extra});
const soil=mat('#a5a084'),grass=createGrassColors().map(color=>mat(color)),bark=mat('#a68c6b'),leaves=[mat('#799b62'),mat('#95b575'),mat('#a9c589')],rock=mat('#a5ada6'),wood=mat('#a98a64'),dark=mat('#314b41');
function mesh(geometry,material,parent=scene){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const pickables=[];
// Each tile is flush against equal-height neighbors. Only exposed top edges
// receive the three-segment bevel; tile seams are separately drawn on top.
function terrain(t,index){const group=makeTerrainTile(t,world,grass[index%4]);group.position.set(t.x-6,0,t.z-6);scene.add(group);group.traverse(m=>{if(m.isMesh){m.userData.tile=t;pickables.push(m);}});}
let idx=0;const waterEffects=createWaterEffects(scene,renderer);
for(const t of world.values()){
 if(t.water){for(const m of addWaterTile(scene,t,world,waterEffects)){m.userData.tile=t;pickables.push(m);}}else terrain(t,idx++);
}
const ground=mesh(new THREE.PlaneGeometry(200,200),mat('#e5e9df'));ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.castShadow=false;
const trees=[],fallingTrees=[];
for(const t of world.values())if(t.blocked&&!t.water){const isBoulder=BOULDER_TILES.has(key(t.x,t.z)),tree=isBoulder?makeBoulder():makeTree();tree.position.set(t.x-6,t.h,t.z-6);scene.add(tree);const treeData={x:t.x,z:t.z,tile:t,group:tree,kind:isBoulder?'boulder':'tree',felled:false};trees.push(treeData);tree.traverse(m=>{if(m.isMesh){m.userData.tile=t;m.userData.tree=treeData;pickables.push(m);}});treeData.highlight=highlightResource(tree,{height:isBoulder?1.6:2.9});}
for(const t of world.values())if(!t.blocked&&!t.water&&(t.x*17+t.z*13)%7===0){const flowers=makeFlowers();flowers.position.set(t.x-6,t.h,t.z-6);scene.add(flowers);}
const resourceSpecs=[[4,6,'sticks'],[5,3,'stones'],[8,3,'sticks'],[7,7,'stones'],[9,9,'sticks'],[4,10,'stones']],resources=[];
resourceSpecs.forEach(([x,z,type],id)=>{const t=world.get(key(x,z)),group=createGroundItemModel(type);group.position.set(x-6,t.h,z-6);scene.add(group);const resource={id,x,z,type,tile:t,group,collected:false};resources.push(resource);
 group.traverse(obj=>{if(obj.isMesh){obj.userData.resource=resource;obj.userData.tile=t;pickables.push(obj);}});
 resource.highlight=highlightResource(group);
 resource.hitbox=createResourceHitbox(resource,t);pickables.push(resource.hitbox);
});
const clearingObjects=scene.children.filter(object=>!object.isLight);
for(const object of clearingObjects)object.visible=false;
const introTile=new THREE.Group();scene.add(introTile);introTile.position.set(0,0,-2);
introTile.add(makeTerrainTile({x:0,z:0,h:1},new Map(),grass[0]));
const playerModel=makeSlime(),player=playerModel.group,body=playerModel.body,expressionFace=playerModel.face,hands=playerModel.hands;scene.add(player);
const axeTool=makeAxe({wood,rock});hands[0].add(axeTool);axeTool.visible=false;
const pickaxeTool=makePickaxe();hands[0].add(pickaxeTool);pickaxeTool.visible=false;
const visual=new THREE.Group();visual.add(...[...player.children]);player.add(visual);
const bendSlime=createSlimeBend(visual,[body,expressionFace.group]);
let facing=0,happyUntil=0;
let gatheringSkill=createGatheringSkill();
const craftingSkill=createGatheringSkill(),lumberjackSkill=createGatheringSkill(),miningSkill=createGatheringSkill();
let activeAction=null,chopTarget=null,actorTarget=null,actorTime=0;
const bodyVertex=new THREE.Vector3(),bodyTransform=new THREE.Matrix4();
const bodyPositions=body.geometry.getAttribute('position');
body.updateMatrix();
let tile=world.get(key(SPAWN.x,SPAWN.z)),path=[],segment=null,target=null,gatherTime=0,inventory={sticks:0,stones:0,axes:0,logs:0,hats:0,pickaxes:0,stone:0};for(const id of Object.keys(ITEMS))inventory[id]??=0;player.position.set(tile.x-6,tile.h,tile.z-6);
const feedback=createFeedback(scene);
const contactShadow=createContactShadow(scene,world);
const idleClock=createIdleClock(),sleepFeedback=createSleepFeedback(scene);
// Orbit drags, pinches and camera keys do not count as wake-up actions.
document.addEventListener('click',event=>{if(event.target===renderer.domElement){if(!opening.playable)idleClock.wake();return;}if(!event.target.closest('.camera-controls'))idleClock.wake();},{capture:true});
document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.closest?.('#dialogue'))idleClock.wake();},{capture:true});
const introSpawn=new THREE.Vector3(0,1,-2);
const clearingSpawn=new THREE.Vector3(tile.x-6,tile.h,tile.z-6);
let debug=null;
const playground=__PLAYGROUND__?await import('./dev/playground.js'):null;
const opening=(playground?.createFreeOpening||createOpening)({player,visual,face:expressionFace,introSpawn,spawn:clearingSpawn,onComplete:()=>craftingTutorial.start(),onFirstLevel:done=>craftingTutorial.startSkills(done),onFirstQuest:done=>craftingTutorial.startQuests(done),
 setColor(color){body.material.color.set(color);expressionFace.setBodyColor(color);},
 showClearing(){for(const object of clearingObjects)object.visible=true;introTile.visible=false;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=22;}
});
let finale,willow;
const craftingTutorial=createCraftingTutorial({equipment:{state:()=>({...finale?.state,...willow?.equipmentState()}),toggle:()=>finale.equip(),isEquipped:id=>willow?.isEquipped(id),actions:id=>willow?.inventoryActions(id)},chapter:{unlocked:()=>willow?.unlocked,recipeAvailable:id=>willow?.recipeAvailable(id),craft:id=>willow?.craft(id)},getSkills:()=>({Gathering:gatheringSkill,Crafting:craftingSkill,Lumberjack:lumberjackSkill,Mining:miningSkill,...willow?.visibleSkills}),getInventory:()=>inventory,startCraft,freePlay:__PLAYGROUND__,onComplete:()=>finale.begin()});
const clearingTiles=new Map(world);let clearingVisibility=null;
function stopAll(){cancelWork();path=[];segment=null;target=null;gatherTime=0;player.position.set(tile.x-6,tile.h,tile.z-6);feedback.clearDestination();craftingTutorial.closeMenus();}
willow=createWillowbank({scene,world,renderer,player,visual,hands,pickables,inventory,feedback,
 skills:{Gathering:gatheringSkill,Crafting:craftingSkill,Lumberjack:lumberjackSkill,Mining:miningSkill},
 approaching:()=>actorTarget,occupied:t=>t===tile||t===segment?.to,routeContains:t=>segment?.to===t||path.includes(t),tile:()=>tile,hover:()=>hover?.actor,moving:()=>!!segment||path.length>0,profile:()=>opening.profile,
 walkRoute(route){path=[...route];},
 stop:stopAll,toast,showItems:showItemChanges,approach:selectActor,sound:name=>gameAudio.play(name),
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},
 teleport(t){if(!t)return;path=[];segment=null;tile=t;player.position.set(t.x-6,t.h,t.z-6);},
 openCrafting(){document.getElementById('open-crafting').click();},selectRecipe:id=>{if(id)craftingTutorial.selectRecipe(id);},
 showTip:(...args)=>craftingTutorial.showChapterTip(...args),say:(...args)=>craftingTutorial.sayChapter(...args),
 openInventory:()=>craftingTutorial.openInventory(),closeMenus:()=>craftingTutorial.closeMenus(),return:()=>finale.travel('clearing')
});
finale=createTutorialFinale({destination:willow,arrived:()=>{willow.enter(true);},scene,world,player,visual,trees,resources,pickables,inventory,
 getTile:()=>tile,getAngle:()=>angle,stop:stopAll,showItemChanges,approach:selectActor,
 clearFalling(){fallingTrees.length=0;},
 ensureClearSpawn(){if(trees.some(t=>t.x===tile.x&&t.z===tile.z)){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}},
 travelBlocked(){toast("There’s no safe space beside the destination crystal.");},
 switchArea(away,group,tiles,landing){
  stopAll();willow.enter(false);
  if(away){clearingVisibility=new Map(clearingObjects.map(o=>[o,o.visible]));for(const o of clearingObjects)if(o!==ground)o.visible=false;world.clear();for(const t of tiles)world.set(key(t.x,t.z),t);group.visible=true;}
  else{group.visible=false;world.clear();for(const [k,t]of clearingTiles)world.set(k,t);for(const [o,visible]of clearingVisibility||[])o.visible=visible;}
  if(away){zoom=22;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);}
  tile=landing||world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);feedback.clearDestination();
 }
});
function canMove(){return opening.canMove&&!craftingTutorial.blocksMovement&&!finale.busy&&!willow?.busy;}
function cancelWork(){
 willow?.cancel();
 if(activeAction?.status==='active'){
  const crafting=activeAction.kind==='craft';
  if(activeAction.tree)activeAction.tree.group.rotation.set(0,0,0);
  cancelActivity(activeAction);activeAction=null;
  if(crafting)craftingTutorial.craftCancelled();
 }
 chopTarget=null;actorTarget=null;actorTime=0;
}
function startCraft(output='axes'){
 if(__PLAYGROUND__)debug?.stop();
 if(finale.busy||willow?.busy||willow?.working||segment||path.length||activeAction)return false;
 const action=output==='pickaxes'?craftPickaxe(inventory):craftAxe(inventory);if(!action)return false;
 target=null;gatherTime=0;chopTarget=null;activeAction=action;
 feedback.destination(tile);feedback.interacting('Crafting');return true;
}
function routeToTree(target){return target.felled?null:interactionRoute(world,segment?segment.to:tile,target);}
function selectTree(tree){
 if(!canMove())return;if(__PLAYGROUND__)debug?.stop();
 const mining=tree.kind==='boulder',tool=mining?'pickaxes':'axes';
 if(!(mining?craftingTutorial.canMine:craftingTutorial.canChop)||!inventory[tool]){toast('Missing the required tool!');feedback.pulse(tree.group.position,false);return;}
 if(chopTarget===tree||activeAction?.tree===tree)return;
 const result=routeToTree(tree);if(!result){toast('There is no safe route to this resource.');feedback.pulse(tree.group.position,false);return;}
 cancelWork();target=null;gatherTime=0;chopTarget=tree;path=result.route;
 feedback.destination(result.at);
}
function selectActor(actor){
 if(willow?.placing){willow.selectPlacement(actor.tile);return;}
 if(!canMove()||!actor.ready||actor.opened)return;if(__PLAYGROUND__)debug?.stop();
 if(actorTarget===actor||willow?.matches(actor))return;
 const result=routeToTree(actor);if(!result){toast('There is no safe route there.');return;}
 cancelWork();target=null;gatherTime=0;actorTarget=actor;actorTime=0;path=result.route;feedback.destination(result.at);
}
function isVisible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
let toastTimer;function toast(s){gameAudio.play('blocked');$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function showItemChanges(changes){craftingTutorial.refresh();itemFeed.show(changes);gameAudio.play(Object.values(changes).some(n=>n<0)?'complete':'pickup');}
function updateUI(reward){const count=inventory.sticks+inventory.stones;opening.collected(count,reward);$('sticks').textContent='×'+inventory.sticks;$('stones').textContent='×'+inventory.stones;$('bag-total').textContent=`${count} ITEMS`;$('quest-count').textContent=`${count} / 6 materials collected`;$('quest-progress').style.width=`${count/6*100}%`;$('quest-check').textContent=count===6?'✓':'◇';}
function moveTo(t,resource){if(!canMove())return;if(willow?.placing){willow.selectPlacement(t);return;}if(__PLAYGROUND__)debug?.stop();if(!opening.canGather)resource=null;const point=new THREE.Vector3(t.x-6,t.water?.86:t.h,t.z-6);if(resource&&resource===target){return;}const start=segment?segment.to:tile;const adjacent=resource?routeToTree(resource):null;const destination=resource?adjacent?.at:t;const route=resource?(adjacent?.route??null):findPath(world,start,t);if(route===null){feedback.pulse(point,false);toast(t.blocked?'Find a clear patch of ground.':'That ledge is too high. Find a route with smaller steps.');return;}$('toast').classList.remove('visible');clearTimeout(toastTimer);if(activeAction&&route.length===0&&!segment&&!resource)return;willow?.disengage();cancelWork();opening.moving(tile,destination);target=resource||null;gatherTime=0;path=route;feedback.destination(destination);$('activity').textContent=resource?'On the way to gather':'Exploring the clearing';}
function pick(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables.filter(m=>isVisible(m)&&!m.userData.resource?.collected&&!m.userData.tree?.felled),false)[0];}
let down=null,dragged=false,pinchDistance=null;
const activePointers=new Map();
let pointerOnCanvas=false,pointerClient={x:0,y:0};
const canvas=renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function spread(){const [a,b]=[...activePointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
canvas.addEventListener('pointerdown',e=>{
 if(!opening.playable||finale.cameraFocus||willow?.cameraFocus)return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
 if(activePointers.size===1){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button};dragged=false;}
 else{dragged=true;pinchDistance=spread();}
});
canvas.addEventListener('pointermove',e=>{
 if(!opening.playable||finale.cameraFocus||willow?.cameraFocus)return;
 pointerOnCanvas=true;pointerClient={x:e.clientX,y:e.clientY};
 if(!activePointers.has(e.pointerId)||!down)return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(activePointers.size>=2){
  const distance=spread();if(pinchDistance>0&&distance>0)changeZoom(22*Math.log(pinchDistance/distance));
  pinchDistance=distance;dragged=true;return;
 }
 if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
 if(dragged){
  const delta=-(e.clientX-down.lastX)*.008,oldElevation=elevation;
  angle+=delta;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-down.lastY)*.005,THREE.MathUtils.degToRad(20),THREE.MathUtils.degToRad(75));
  opening.rotated(Math.abs(delta)+Math.abs(elevation-oldElevation));
 }
 down.lastX=e.clientX;down.lastY=e.clientY;
});
canvas.addEventListener('pointerup',e=>{
 if(activePointers.size===1&&down?.button===0&&!dragged)idleClock.wake();
 if(canMove()&&activePointers.size===1&&down?.button===0&&!dragged){
  const hit=pick(e),data=hit?.object.userData;
  if(willow.placing)willow.selectPlacement(data?.tile);else if(data?.actor)selectActor(data.actor);else if(data?.tree)selectTree(data.tree);else if(data?.tile)moveTo(data.tile,data.resource);
  else{const groundHit=raycaster.intersectObject(ground)[0];if(groundHit)feedback.pulse(groundHit.point,false);toast('Choose a tile inside the clearing.');}
 }
 activePointers.delete(e.pointerId);pinchDistance=null;
 if(!activePointers.size)down=null;
 else{const p=[...activePointers.values()][0];down={x:p.x,y:p.y,lastX:p.x,lastY:p.y,button:0};dragged=true;}
});
function cancelGesture(){activePointers.clear();down=null;pinchDistance=null;dragged=true;}
canvas.addEventListener('pointercancel',cancelGesture);addEventListener('blur',cancelGesture);
canvas.addEventListener('pointerleave',()=>{pointerOnCanvas=false;willow.hoverPlacement(null);$('tooltip').style.display='none';feedback.hover(null);});
function updateHover(){
 if(!pointerOnCanvas||!canMove()){willow.hoverPlacement(null);feedback.hover(null);$('tooltip').style.display='none';return;}
 const hit=pick({clientX:pointerClient.x,clientY:pointerClient.y});hover=hit?.object.userData;
 const t=hover?.tile,tree=hover?.tree,actor=hover?.actor,placementStatus=willow.hoverPlacement(t),valid=placementStatus?placementStatus.valid:actor?actor.ready&&!actor.opened&&!!routeToTree(actor):tree?(tree.kind==='boulder'?craftingTutorial.canMine&&inventory.pickaxes>0:craftingTutorial.canChop&&inventory.axes>0)&&!!routeToTree(tree):hover?.resource&&opening.canGather?!!routeToTree(hover.resource):!!t&&findPath(world,segment?segment.to:tile,t)!==null;
 feedback.hover(t,valid);
 renderer.domElement.style.cursor=t?(valid?'pointer':'not-allowed'):'default';
 $('tooltip').style.display=t?'block':'none';
 if(t){$('tooltip').textContent=placementStatus?placementStatus.label:actor?(actor.opened?'Empty chest':!actor.ready?'Landing…':valid?actor.label:'No safe route'):tree?(valid?(tree.kind==='boulder'?'Mine Boulder':'Chop tree'):!inventory[tree.kind==='boulder'?'pickaxes':'axes']?'Missing the required tool!':'No safe route'):!valid?(t.blocked?'Blocked terrain':'No safe route'):hover?.resource&&opening.canGather?'Gather '+ITEMS[hover.resource.type].name:'Move here';$('tooltip').style.left=(pointerClient.x+16)+'px';$('tooltip').style.top=(pointerClient.y-32)+'px';}
}
function changeZoom(delta){if(!opening.playable||finale.cameraFocus||willow?.cameraFocus)return;const before=zoom;zoom=THREE.MathUtils.clamp(zoom*Math.exp(delta/22),3,34);opening.zoomed(Math.log(zoom/before));}renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY*.012);},{passive:false});$('rotate-left').onclick=()=>angle-=Math.PI/4;$('rotate-right').onclick=()=>angle+=Math.PI/4;$('zoom-in').onclick=()=>changeZoom(-1.5);$('zoom-out').onclick=()=>changeZoom(1.5);
$('reset').onclick=()=>{gatheringSkill=createGatheringSkill();happyUntil=0;path=[];segment=null;target=null;gatherTime=0;inventory={sticks:0,stones:0};tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);for(const r of resources){r.collected=false;r.group.visible=true;}feedback.clearDestination();updateUI();$('activity').textContent='Taking it all in';toast('A fresh little beginning.');};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();let elapsed=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);gameAudio.update(dt,splash.active?'splash':opening.finished?'clearing':'intro',!$('dialogue').hidden);if(splash.active){rotationKeys.clear();splash.render(dt);return;}elapsed+=dt;waterEffects.update(dt);opening.update(dt);document.body.classList.toggle('dialogue-cutscene',!!(finale.cameraFocus||willow.cameraFocus||finale.celebration));
 const asleep=idleClock.update(dt,opening.playable?(!segment&&!path.length&&!target&&!activeAction&&!actorTarget&&!finale.busy&&!debug?.previewing&&!willow.working&&!willow.busy):opening.quiet);
 let sleeping=asleep&&idleClock.sleepTime>=SLEEP_SETTLE;
 if(!opening.playable){rotationKeys.clear();
  if(opening.quiet||opening.reaction){
    const social=opening.reaction?socialMotion(opening.reaction.kind,opening.reaction.time):asleep?socialMotion('Sleeping',idleClock.sleepTime):null;
    player.position.copy(opening.inClearing?clearingSpawn:introSpawn);
    visual.rotation.set(social?.pose.lean||0,social?.pose.twist||0,social?.pose.roll||0);
    if(social){player.position.y+=social.lift;const width=1/Math.sqrt(social.pose.squash);visual.scale.set(width,social.pose.squash,width);visual.position.y=-.07*social.pose.squash;}
    bendSlime(social?.pose.bend||0);finale.bendHat(social?.pose.bend||0);
    expressionFace.set(social?.expression||'idle');
    for(let i=0;i<hands.length;i++){const h=social?.hands[i]||[(i===0?-1:1)*.46,.33,.08,0,0];hands[i].position.set(h[0],h[1],h[2]);hands[i].rotation.set(h[3],0,h[4]);}
  }
  const focus=(opening.inClearing?clearingSpawn:introSpawn).clone().add(new THREE.Vector3(0,.35,0)),distance=opening.inClearing?22:6.5;
  camera.position.set(focus.x+Math.sin(Math.PI/4)*distance*Math.cos(elevation),focus.y+Math.sin(elevation)*distance,focus.z+Math.cos(Math.PI/4)*distance*Math.cos(elevation));
  camera.lookAt(focus.clone().add(new THREE.Vector3(0,$('dialogue').dataset.presentation==='customize'?-.9:0,0)));camera.updateMatrixWorld();contactShadow.update(player.position,visual.scale);sleepFeedback.update(dt,sleeping,player.position,camera);renderer.render(scene,camera);return;
 }
 finale.update(dt,elapsed,hover?.actor);
 const chapterMotion=willow.update(dt,elapsed,camera);
 if(willow.busy)document.getElementById('game-menus').inert=true;
 if(finale.cameraFocus||willow.cameraFocus)rotationKeys.clear();
 const oldAngle=angle,oldElevation=elevation;
 angle += (Number(rotationKeys.has('ArrowRight')) - Number(rotationKeys.has('ArrowLeft'))) * keyboardRotationSpeed * dt;
 elevation = THREE.MathUtils.clamp(elevation + (Number(rotationKeys.has('ArrowUp')) - Number(rotationKeys.has('ArrowDown'))) * Math.PI / 3 * dt, THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(75));
 opening.rotated(Math.abs(angle-oldAngle)+Math.abs(elevation-oldElevation));
 let pose=idlePose(elapsed),handWork=null,expression=elapsed<happyUntil?'happy':'idle',socialHands=null;
 if(asleep){const social=socialMotion('Sleeping',idleClock.sleepTime);pose=social.pose;expression=social.expression;socialHands=social.hands;}
 if(!segment&&path.length&&willow.companionCannotYield(path[0])){path=[];target=null;feedback.clearDestination();toast("Your companion needs room to move aside.");}
 if(!segment&&path.length&&!willow.companionOccupies(path[0])){
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
    activeAction=chopTarget.kind==='boulder'?mineBoulder(inventory,chopTarget):chopTree(inventory,chopTarget);
    if(!activeAction)chopTarget=null;
  }
  if(actorTarget){
    const actor=actorTarget;facing=Math.atan2(actor.x-tile.x,actor.z-tile.z);
    actorTime+=dt;handWork=actor.duration?actorTime:null;expression=actor.duration?'focused':'idle';
    feedback.interacting(actor.duration?'Opening':'Traveling');
    if(actorTime>=actor.duration){actorTarget=null;actorTime=0;feedback.complete();if(actor.willow)willow.interact(actor);else{if(!actor.duration)gameAudio.play('portal');finale.interact(actor);}}
  }else if(activeAction?.status==='active'){
    const action=activeAction;handWork=action.elapsed;expression='focused';
    pose=workPose('gather',gatherTime);
    if(action.kind==='craft'){
      feedback.interacting('Crafting');if(Math.floor(action.elapsed/.45)!==Math.floor((action.elapsed+dt)/.45))gameAudio.play('craft');
      if(tickCraft(action,dt,inventory)){
        activeAction=null;happyUntil=elapsed+1.2;expression='happy';feedback.complete();
        showSkillReward(awardSkillXp(craftingSkill,'Crafting'),player.position);showItemChanges({sticks:-1,stones:-1,[action.output]:1});
        updateUI();craftingTutorial.craftComplete(action.output);
      }else if(action.status==='cancelled'){activeAction=null;feedback.clearDestination();craftingTutorial.craftCancelled();}
    }else{
      feedback.interacting(action.kind==='mine'?'Mining':'Chopping');action.elapsed+=dt;
      facing=Math.atan2(action.tree.x-tile.x,action.tree.z-tile.z);
      const chop=animateResourceHit(action.tree,action.elapsed,action,name=>gameAudio.play(name));pose=chop.body;
      if(action.elapsed>=action.duration){
        gameAudio.play('fall');action.status='complete';action.tree.felled=true;chopTarget=null;activeAction=null;
        const direction=new THREE.Vector3(action.tree.x-tile.x,0,action.tree.z-tile.z).normalize();
        fallingTrees.push({tree:action.tree,age:0,logs:action.logs,axis:new THREE.Vector3(direction.z,0,-direction.x)});
        action.tree.highlight.update(false,elapsed);feedback.complete();
      }
    }
  }else if(target&&!target.collected){
    facing=Math.atan2(target.x-tile.x,target.z-tile.z);feedback.interacting();gatherTime+=dt;
    $('activity').textContent=`Gathering ${ITEMS[target.type].name}…`;
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
  }else{if(!willow.working&&!(__PLAYGROUND__&&debug?.holdingFeedback))feedback.complete();$('activity').textContent=inventory.sticks+inventory.stones===6?'Clearing explored':'Taking it all in';}
 }
 if(__PLAYGROUND__&&debug){const preview=debug.frame(dt);if(preview){pose=preview.pose;handWork=preview.handWork;expression=preview.expression;socialHands=preview.hands||null;sleeping=!!preview.sleeping;player.position.y=tile.h+preview.lift;}}
 if(chapterMotion){
  const motion=playerActionMotion(chapterMotion.kind,chapterMotion.time,elapsed);
  pose=motion.pose;expression=motion.expression;handWork=motion.handWork;socialHands=motion.hands;sleeping=false;
 }
 const celebration=finale.celebration;
 if(celebration){const motion=holdUpMotion(celebration.age);expression=motion.expression;handWork=null;facing=celebration.angle;pose=motion.pose;socialHands=motion.hands;}
 bendSlime(pose.bend||0);finale.bendHat(pose.bend||0);
 expressionFace.set(willow?.expression||expression);
 const blend=1-Math.exp(-dt*24),width=1/Math.sqrt(pose.squash);
 visual.scale.lerp(new THREE.Vector3(...(pose.scale||[width/Math.sqrt(pose.stretch),pose.squash,width*Math.sqrt(pose.stretch)])),blend);
 visual.rotation.x=THREE.MathUtils.lerp(visual.rotation.x,pose.lean,blend);
 visual.rotation.y=THREE.MathUtils.lerp(visual.rotation.y,pose.twist,blend);
 visual.rotation.z=THREE.MathUtils.lerp(visual.rotation.z,pose.roll||0,blend);
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
 axeTool.visible=chapterMotion?.kind==='Chopping'||(activeAction?.kind==='chop'&&activeAction.status==='active')||(__PLAYGROUND__&&debug?.chopping);
 pickaxeTool.visible=chapterMotion?.kind==='Mining'||(activeAction?.kind==='mine'&&activeAction.status==='active')||(__PLAYGROUND__&&debug?.mining);
 const chopping=pickaxeTool.visible?miningMotion(activeAction?.elapsed??chapterMotion?.time??debug?.time??0):axeTool.visible?chopMotion(activeAction?.elapsed??chapterMotion?.time??debug?.time??0):null;
 // Both hands share the chop cycle; other interactions keep their scoop gesture.
 for(let i=0;i<hands.length;i++){
  const hand=hands[i],side=i===0?-1:1;
  let x=side*.46,y=.33,z=.08+(pose.armDrive||0),curl=0,roll=0,yaw=0;
  if(handWork!==null&&!chopping)[x,y,z,curl,roll,yaw]=gatheringHand(handWork,i);
  if(chopping)[x,y,z,curl,roll,yaw=0]=i===0?chopping.right:chopping.left;
  if(socialHands)[x,y,z,curl,roll,yaw=0]=socialHands[i];
  hand.position.lerp(new THREE.Vector3(x,y,z),1-Math.exp(-dt*(chapterMotion?.kind==='Combat'?48:22)));
  hand.rotation.x=THREE.MathUtils.lerp(hand.rotation.x,curl,blend);
  hand.rotation.z=THREE.MathUtils.lerp(hand.rotation.z,roll,blend);
  hand.rotation.y=THREE.MathUtils.lerp(hand.rotation.y,yaw,blend);
  hand.scale.lerp(new THREE.Vector3(1,handWork!==null?.88:1,handWork!==null?1.15:1),blend);
 }
 if(pose.handDrop!==undefined)placeFaintedHands(visual,hands,pose.handDrop);
 alignSupportingHand(hands,pickaxeTool.visible?'Mining':chapterMotion?.kind==='Fishing catch'?'Fish hook':chapterMotion?.kind);
 willow.updateFishingRig();
 for(let i=fallingTrees.length-1;i>=0;i--){
  const fall=fallingTrees[i];fall.age+=dt;
  if(animateResourceDepletion(fall.tree,fall.age,fall.axis)){
    fall.tree.group.visible=false;fall.tree.tile.blocked=false;const mining=fall.tree.kind==='boulder',item=mining?'stone':'logs';inventory[item]+=fall.logs;
    showSkillReward(awardSkillXp(mining?miningSkill:lumberjackSkill,mining?'Mining':'Lumberjack'),player.position);showItemChanges({[item]:fall.logs});
    happyUntil=elapsed+1.2;if(mining)craftingTutorial.mined();else craftingTutorial.chopped(fall.logs);fallingTrees.splice(i,1);
  }
 }
 for(const tree of trees)tree.highlight.update((tree.kind==='boulder'?craftingTutorial.highlightBoulders:craftingTutorial.highlightTrees)&&!tree.felled,elapsed,pointerOnCanvas&&canMove()&&hover?.tree===tree&&!tree.felled);
 const showResourceArrows=!opening.finished&&opening.canGather&&inventory.sticks+inventory.stones===0;
 $('action-progress').style.width=`${gatherTime/gatheringDuration(gatheringSkill)*100}%`;
 const closeup=celebration?Math.min(THREE.MathUtils.smoothstep(celebration.age,0,1),1-THREE.MathUtils.smoothstep(celebration.age,3.3,4.3)):0;
 const crystalFocus=finale.cameraFocus,crystalBlend=crystalFocus?(crystalFocus.phase==='out'?1-THREE.MathUtils.smoothstep(crystalFocus.age,0,1):THREE.MathUtils.smoothstep(crystalFocus.age,0,1)):0;
 let viewAngle=angle+(celebration?Math.atan2(Math.sin(celebration.angle-angle),Math.cos(celebration.angle-angle))*closeup:0),viewZoom=THREE.MathUtils.lerp(zoom,4.6,closeup),viewElevation=THREE.MathUtils.lerp(elevation,.27,closeup);
 const focus=player.position.clone().add(new THREE.Vector3(0,.35+closeup*.3,0));if(crystalFocus){focus.lerp(crystalFocus.position,crystalBlend);viewZoom=THREE.MathUtils.lerp(viewZoom,7,crystalBlend);viewElevation=THREE.MathUtils.lerp(viewElevation,.45,crystalBlend);}
 const rescueFocus=willow.cameraFocus;if(rescueFocus){focus.lerp(rescueFocus.position.clone().add(new THREE.Vector3(0,.4,0)),rescueFocus.blend);viewZoom=THREE.MathUtils.lerp(viewZoom,7,rescueFocus.blend);}
 const horizontalDistance=viewZoom*Math.cos(viewElevation);camera.position.set(focus.x+Math.sin(viewAngle)*horizontalDistance,focus.y+Math.sin(viewElevation)*viewZoom,focus.z+Math.cos(viewAngle)*horizontalDistance);camera.lookAt(focus);camera.updateMatrixWorld();updateHover();for(const resource of resources)resource.highlight.update(showResourceArrows&&!resource.collected,elapsed,pointerOnCanvas&&canMove()&&hover?.resource===resource&&!resource.collected);feedback.update(dt,elapsed,camera);updateSkillRewards(dt,camera,innerWidth,innerHeight);sleepFeedback.update(dt,sleeping,player.position,camera);renderer.render(scene,camera);
}
if(__PLAYGROUND__){
 debug=playground.mountPlayground({
  grassPalette:playground.createGrassPaletteControls(()=>[...grass,...splash.grassMaterials,...willow.grassMaterials]),
  objectives:{add:()=>updateObjective('debug','Chop some wood','Obtain Small Logs by chopping regular trees in the clearing.',0,6),update:()=>updateObjective('debug','Chop some wood','Obtain Small Logs by chopping regular trees in the clearing.',3,6),complete:()=>finishObjective('debug'),reset:resetObjectives,tip:()=>craftingTutorial.previewTip()},audio:gameAudio,itemFeed,openSettings:()=>document.getElementById('open-settings').click(),showCrafting(){document.getElementById('open-crafting').click();},waterSettings,restartWater(){waterEffects.restart();splash.restartWater();willow.restartWater();},
  miningLesson(){stopAll();finale.reset();Object.assign(inventory,{sticks:3,stones:3,pickaxes:0});for(const tree of trees)if(tree.kind==='boulder'){tree.felled=false;tree.group.visible=true;tree.group.scale.setScalar(1);tree.group.rotation.set(0,0,0);tree.tile.blocked=true;}if(tile.blocked){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}craftingTutorial.startMining();},
  stopMiningLesson(){stopAll();craftingTutorial.reset();},
  mineNearest(){const node=trees.filter(t=>t.kind==='boulder'&&!t.felled&&routeToTree(t)).sort((a,b)=>routeToTree(a).route.length-routeToTree(b).route.length)[0];if(node)selectTree(node);},
  showSplash(){stopAll();splash.show();},
  randomizeSplash(){stopAll();splash.randomizeAppearance();splash.show();},
  showResourceHitboxes(show){for(const r of resources)r.hitbox.material.colorWrite=show;},
  showInventory(){craftingTutorial.openInventory();},
  inventoryLesson(){stopAll();Object.assign(inventory,{sticks:3,stones:3});craftingTutorial.startInventory();},
  showSkills(){craftingTutorial.openSkills();},
  levelLesson(){this.reset('all');Object.assign(inventory,{sticks:3,stones:3});Object.assign(gatheringSkill,{xp:120,level:2});opening.startLevelExplanation();},
  gatheringLesson(){this.reset('all');Object.assign(inventory,{sticks:0,stones:0});Object.assign(gatheringSkill,{xp:0,level:1});opening.startGathering();},
  controlsLesson(){stopAll();craftingTutorial.reset();opening.startControls(()=>opening.enterFreePlay());},
  questsLesson(){stopAll();craftingTutorial.reset();craftingTutorial.startQuests();},
  skillsLesson(){stopAll();Object.assign(gatheringSkill,{xp:120,level:2});Object.assign(inventory,{sticks:3,stones:3});craftingTutorial.startSkills();},
  skills:{Gathering:gatheringSkill,Crafting:craftingSkill,Lumberjack:lumberjackSkill,Mining:miningSkill,...willow.skills},
  willow,enterWillow(){craftingTutorial.reset();opening.enterFreePlay();finale.travel('placeholder');},
  inventory,player,feedback,getTile:()=>tile,finale,
  doze(){idleClock.update(30,true);},
  wake(){idleClock.wake();},
  completePractice(){for(const r of resources){r.collected=true;r.group.visible=false;}for(const t of trees){t.felled=true;t.group.visible=false;t.tile.blocked=false;}fallingTrees.length=0;},
  stop(){cancelWork();path=[];segment=null;target=null;gatherTime=0;player.position.set(tile.x-6,tile.h,tile.z-6);feedback.clearDestination();},
  reset(kind){
   if(finale.inPlaceholder||kind==='all')finale.reset();if(kind==='all'){craftingTutorial.reset();opening.enterFreePlay();resetObjectives();}
   clearSkillRewards();itemFeed.clear();clearTimeout(toastTimer);$('toast').classList.remove('visible');
   if(['all','trees','boulders'].includes(kind)){for(let i=fallingTrees.length-1;i>=0;i--)if(kind==='all'||((kind==='boulders')===(fallingTrees[i].tree.kind==='boulder')))fallingTrees.splice(i,1);for(const tree of trees){if(kind!=='all'&&((kind==='boulders')!==(tree.kind==='boulder')))continue;tree.group.scale.setScalar(1);tree.felled=false;tree.group.visible=true;tree.group.rotation.set(0,0,0);tree.tile.blocked=true;}}
   if(kind==='all'||kind==='items')for(const r of resources){r.collected=false;r.group.visible=true;}
   if(kind==='all'){willow.debug.reset();for(const id of Object.keys(ITEMS))inventory[id]=0;for(const skill of [gatheringSkill,craftingSkill,lumberjackSkill,miningSkill,...Object.values(willow.skills)])Object.assign(skill,{xp:0,level:1});Object.assign(inventory,{sticks:10,stones:10,axes:1,logs:0,hats:0,pickaxes:1,stone:0});tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);happyUntil=0;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=12;}
   if(tile.blocked){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}
   craftingTutorial.refresh();
  },
  refresh:()=>{craftingTutorial.refresh();finale.refresh();},
  showItemChanges,
  color(value){body.material.color.set(value);expressionFace.setBodyColor(value);},
  faceTowardCamera(){facing=angle;player.rotation.y=angle;}
 });
}
mountJournal(craftingTutorial,settingsUI);
willow.mountCompanions();
const splash=createSplash(renderer,!__PLAYGROUND__,settingsUI);
animate();
// Small read-only inspection surface for checking the prototype in a browser.
if(__PLAYGROUND__)window.quadriaquest={getState:()=>({tile:{x:tile.x,z:tile.z,h:tile.h},moving:!!segment||path.length>0,target:target?.id??null,gatherTime,inventory:{...inventory},gathering:{...gatheringSkill},crafting:{...craftingSkill},lumberjack:{...lumberjackSkill},mining:{...miningSkill},tutorialStage:craftingTutorial.stage,finale:finale.state,willow:willow.state,action:activeAction?.kind??null,angle,elevation,zoom,profile:opening.profile,tutorialReady:opening.playable}),screenFor:(x,z)=>{const t=world.get(key(x,z));const p=new THREE.Vector3(x-6,t.h+.16,z-6).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};
