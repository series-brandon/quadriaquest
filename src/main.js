import {equipmentIdleHands} from './combat-animation.js';
import {terrainHitData} from './terrain-batch.js';
import {CINDERHOLD} from './cinderhold-rules.js';
import {createCinderhold} from './cinderhold.js';
import {createStationCrafting} from './station-crafting.js';
import {createDestinationMenu} from './destination-menu.js';
import {createCombatStyles} from './combat-styles.js';
import {createCombatStyleMenu} from './combat-style-menu.js';
import {createSupplyOffers} from './supply-offers.js';
import {createProjectileEffects} from './projectile-effects.js';
import {attackRoute,withinAttackRange} from './combat-range.js';
import {createCharacterDialogue} from './character-dialogue.js';
import {createAreaRuntime} from './area-runtime.js';
import {createTravelSystem} from './travel.js';
import {createCrystals} from './crystals.js';
import {createEquipmentPresentation} from './equipment-presentation.js';
import {portalSpawn} from './portal-spawn.js';
import {createCombatSystem} from './combat.js';
import {createEquipment} from './equipment.js';
import {createCombatFeedback} from './combat-feedback.js';
import './combat.css';
import {createResourceActions} from './resource-actions.js';
import {createResourceEntity} from './resource-entities.js';
import {createCarpentrySystem} from './carpentry.js';
import {heldTool} from './tool-models.js';
import {createFishingSystem} from './fishing.js';
import {createFishingSpots} from './fishing-spots.js';
import {createFishingPresentation} from './fishing-presentation.js';
import {createPlayerHealth,createFoodSystem,createHealthUI} from './player-health.js';
import './player-health.css';
import './campfires.css';
import {createRecipeCrafting} from './recipe-crafting.js';
import {createCampfires} from './campfires.js';
import {createCookingSystem} from './cooking.js';
import {createCookingMenu} from './cooking-menu.js';
import {RECIPES as COOKING_RECIPES,canMake as canCookRecipe,durationFor as cookingDuration} from './recipes.js';
import {createCompanionSystem} from './companions.js';
import {createCompanionMenu} from './companion-menu.js';
import {holdUpMotion} from './catch-motion.js';
import {placeFaintedHands} from './faint-motion.js';
import {playerActionMotion,gatheringHand,alignSupportingHand} from './player-action-motion.js';
import {makeAxe} from './axe-model.js';
import {interactionRoute} from './interaction-route.js';
import {makeSlime} from './slime-model.js';
import {makeFlowers,makeTerrainTile,addWaterTile} from './world-models.js';
import {createWillowbank} from './willowbank.js';
import {createGrassColors} from './grass-palette.js';
import {updateObjective,finishObjective,resetObjectives} from './quests.js';
import {icon} from './icons.js';
import {createGameAudio,mountAudioControls} from './audio.js';
import {mountJournal} from './journal.js';
import {BOULDER_TILES,makePickaxe,miningMotion} from './mining.js';
import {ITEMS} from './items.js';
import {createWaterEffects,waterSettings} from './water-effects.js';
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
import {createGameMenus} from './game-menus.js';
import {createGatheringSkill,gatheringDuration,showSkillReward,updateSkillRewards,clearSkillRewards} from './skills.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION,chopMotion} from './slime-motion.js';
const $=id=>document.getElementById(id),world=makeWorld(),scene=new THREE.Scene();scene.background=new THREE.Color('#e5e9df');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setSize(innerWidth,innerHeight);$('game').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,120),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let angle=Math.PI/4,elevation=THREE.MathUtils.degToRad(35.264),zoom=22,introZoom=6.5,hover=null;
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
const trees=[];
for(const t of world.values())if(t.blocked&&!t.water)trees.push(createResourceEntity({kind:BOULDER_TILES.has(key(t.x,t.z))?'boulder':'tree',tile:t,parent:scene,pickables}));
for(const t of world.values())if(!t.blocked&&!t.water&&(t.x*17+t.z*13)%7===0){const flowers=makeFlowers();flowers.position.set(t.x-6,t.h,t.z-6);scene.add(flowers);}
const resourceSpecs=[[4,6,'sticks'],[5,3,'stones'],[8,3,'sticks'],[7,7,'stones'],[9,9,'sticks'],[4,10,'stones']],resources=[];
resourceSpecs.forEach(([x,z,kind],id)=>resources.push(createResourceEntity({kind,tile:world.get(key(x,z)),parent:scene,pickables,id})));
const clearingObjects=scene.children.filter(object=>!object.isLight);
const clearingGroup=new THREE.Group();scene.add(clearingGroup);for(const object of clearingObjects)if(object!==ground)clearingGroup.add(object);
for(const object of clearingObjects)object.visible=false;
const introTile=new THREE.Group();scene.add(introTile);introTile.position.set(0,0,-2);
introTile.add(makeTerrainTile({x:0,z:0,h:1},new Map(),grass[0]));
const playerModel=makeSlime(),player=playerModel.group,body=playerModel.body,expressionFace=playerModel.face,hands=playerModel.hands;scene.add(player);
const axeTool=makeAxe({wood,rock});hands[0].add(axeTool);axeTool.visible=false;
const pickaxeTool=makePickaxe();hands[0].add(pickaxeTool);pickaxeTool.visible=false;
const visual=new THREE.Group();visual.add(...[...player.children]);player.add(visual);
const bendSlime=createSlimeBend(visual,[body,expressionFace.group]);
let facing=0,happyUntil=0;
const gatheringSkill=createGatheringSkill();
const craftingSkill=createGatheringSkill(),lumberjackSkill=createGatheringSkill(),miningSkill=createGatheringSkill();
let chopTarget=null,actorTarget=null,actorTime=0;
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
 showClearing(){clearingGroup.visible=true;for(const object of clearingObjects)object.visible=true;introTile.visible=false;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=22;}
});
let finale,willow,companions,cooking,cookingMenu,campfires,recipeCrafting,food,fishing,carpentry,carpentryFixture,resourceActions,combat,equipment,combatFixtures,cinder,smithing,styles,styleMenu,destinations,trainingFixtures,furnaceMenu,anvilMenu;
const hammerTool=heldTool('hammers');hands[0].add(hammerTool);hammerTool.visible=false;
const fishingPresentation=createFishingPresentation({player,hands});
const fishingSpots=createFishingSpots({scene,world,pickables,hover:()=>hover?.actor});
const health=createPlayerHealth(),healthUI=createHealthUI(health);
const menus=createGameMenus({getInventory:()=>inventory,getSkills:()=>playerSkills(),startCraft:id=>recipeCrafting.start(id),equipment:{isEquipped:id=>equipment?.isEquipped(id),actions:id=>[...(food?.inventoryActions(id)||[]),...(campfires?.inventoryActions(id)||[]),...(equipment?.inventoryActions(id)||[])]}});
const craftingTutorial=createCraftingTutorial({menus,freePlay:__PLAYGROUND__,onComplete:()=>finale.begin()});
function playerSkills(){return {Gathering:gatheringSkill,Crafting:craftingSkill,Lumberjack:lumberjackSkill,Mining:miningSkill,...(fishing?{Fishing:fishing.skill}:{}),...(carpentry?{Carpentry:carpentry.skill}:{}),...(combat?{Combat:combat.skill}:{}),...(cooking?{Culinary:cooking.skill}:{}),...(smithing?{Smithing:smithing.skill}:{})};}

const clearingTiles=new Map(world);
const areas=createAreaRuntime({world,beforeSwitch(){combat?.clear();stopAll();},placePlayer(landing){tile=landing;player.position.set(tile.x-6,tile.h,tile.z-6);},applyCamera(view){zoom=view.zoom;angle=view.angle;elevation=view.elevation;scene.background.set(view.background||'#e5e9df');ground.material.color.copy(scene.background);}});
const travel=createTravelSystem({areas,stop:stopAll,blocked:()=>!areas.canMove||combat?.busy||combat?.working,
 occupied:t=>companions?.occupies(t),fade(value){$('scene-fade').hidden=value===0;$('scene-fade').style.opacity=String(value);},failed:()=>toast('There’s no safe space beside the destination crystal.')});
destinations=createDestinationMenu({areas,travel,stop:stopAll,blocked:()=>!canMove()||combat?.working});
const crystals=createCrystals({world,pickables,travel,choose:(a,after)=>destinations.open(a,after),hover:()=>hover?.actor});
function stopAll(){cancelWork();path=[];segment=null;target=null;gatherTime=0;player.position.set(tile.x-6,tile.h,tile.z-6);feedback.clearDestination();menus.closeMenus();cookingMenu?.close();furnaceMenu?.close();anvilMenu?.close();styleMenu?.close();}
companions=createCompanionSystem({scene,world,player,pickables,feedback,
 toPosition:t=>new THREE.Vector3(t.x-6,t.h,t.z-6),tileAtPosition:p=>world.get(key(Math.round(p.x+6),Math.round(p.z+6))),
 tile:()=>tile,approaching:()=>actorTarget,occupied:t=>t===tile||t===segment?.to,reserved:t=>!!t&&(segment?.to===t||path.includes(t)||campfires?.placementTile===t),
 moving:()=>!!segment||path.length>0,playerSleepTime:()=>idleClock.sleepTime,blocked:()=>areas.busy||travel.busy,
 stop:stopAll,face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);}
});
const combatFeedback=createCombatFeedback();
equipment=createEquipment({inventory,busy:()=>!canMove()||companions?.working||combat?.working||resourceActions?.working||carpentry?.working||fishing?.working||food?.working||cooking?.working||recipeCrafting?.working||smithing?.working,changed:()=>{styles?.select(null);menus.refresh();}});
styles=createCombatStyles({equipment,busy:()=>combat?.working||combat?.busy||smithing?.working||recipeCrafting?.working||!canMove()});
const supplies=createSupplyOffers({inventory,changed:showItemChanges});
const projectiles=createProjectileEffects(scene);
const equipmentPresentation=createEquipmentPresentation({hands,visual,equipment});
combat=createCombatSystem({world,player,health,equipment,inventory,attack:()=>styles.attack,toast,items:showItemChanges,projectile:(...args)=>projectiles.launch(...args),clearProjectiles:()=>projectiles.clear(),stop:stopAll,
 blocked:()=>!areas.canMove||travel.busy,
 inReach:a=>!segment&&!path.length&&withinAttackRange(world,tile,a,styles.attack.range),
 tile:()=>tile,reserved:t=>t===segment?.to||path.includes(t)||campfires?.placementTile===t||companions.occupies(t),
 approaching:()=>actorTarget,hover:()=>hover?.actor,face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},
 safe:p=>p.safe||pickables.some(m=>{const a=m.userData.actor;return a&&a.crystal&&world.get(key(a.x,a.z))===a.tile&&Math.abs(p.x-a.x)+Math.abs(p.z-a.z)<3;}),
 hit:(p,damage)=>combatFeedback.show(p,damage),sound:name=>gameAudio.play(name),clearFeedback:()=>combatFeedback.clear(),
 reward:r=>showSkillReward(r,player.position),won:(a,profile)=>areas.broadcast('combatWon',a,profile),complete:()=>feedback.complete(),interacting:()=>feedback.interacting('Fighting'),
 fade(value){$('scene-fade').hidden=value===0;$('scene-fade').style.opacity=String(value);},
 respawn(){const crystals=[...new Set(pickables.map(m=>m.userData.actor).filter(a=>a&&a.crystal&&world.get(key(a.x,a.z))===a.tile))];
  const free=t=>t&&!t.blocked&&!t.water&&!companions.occupies(t);
  const landing=crystals.map(a=>portalSpawn(world,a.tile)).find(free)||[...world.values()].filter(free).sort((a,b)=>Math.hypot(a.x-tile.x,a.z-tile.z)-Math.hypot(b.x-tile.x,b.z-tile.z))[0];
  if(!landing)return false;tile=landing;player.position.set(tile.x-6,tile.h,tile.z-6);return true;},
 respawned(){toast('Recovered safely. Your items and progress are intact.');}
});
resourceActions=createResourceActions({world,inventory,skills:{Gathering:gatheringSkill,Lumberjack:lumberjackSkill,Mining:miningSkill},
 stop:stopAll,busy:()=>!canMove(),inReach:node=>!segment&&!path.length&&interactionRoute(world,tile,node)?.route.length===0,
 tile:()=>tile,reserved:t=>t===tile||t===segment?.to||path.includes(t)||campfires?.placementTile===t||companions?.occupies(t),
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},toast,sound:name=>gameAudio.play(name),
 started(node,rules){feedback.destination(tile);feedback.interacting(rules.motion);},interacting:kind=>feedback.interacting(kind),completed(){feedback.complete();},cancelled(){feedback.clearDestination();},
 rewarded(node,changes,reward){areas.broadcast('resourceCompleted',changes);showSkillReward(reward,player.position);showItemChanges(changes);happyUntil=elapsed+1.2;
  if(clearingTiles.get(key(node.x,node.z))===node.tile){if(node.kind==='tree')craftingTutorial.chopped(changes.logs);else if(node.kind==='boulder')craftingTutorial.mined();else {gatherTime=0;$('tooltip').style.display='none';updateUI(reward);}}
 }
});
for(const node of [...trees,...resources])resourceActions.add(node);
carpentry=createCarpentrySystem({inventory,stop:stopAll,busy:()=>!canMove(),
 inReach:target=>!segment&&!path.length&&interactionRoute(world,tile,target)?.route.length===0,
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},toast,
 started(){feedback.destination(tile);feedback.interacting('Repairing');},
 completed(changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();},cancelled(){feedback.clearDestination();}
});
fishing=createFishingSystem({inventory,stop:stopAll,busy:()=>!canMove(),
 inReach:spot=>!segment&&!path.length&&interactionRoute(world,tile,spot)?.route.length===0,
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},toast,
 started(){feedback.destination(tile);feedback.interacting('Fishing');},
 caught(changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);},
 completed(){feedback.complete();},cancelled(){fishingPresentation.clear();feedback.clearDestination();}
});
food=createFoodSystem({inventory,health,busy:()=>!canMove()||combat?.working||areas.working,stop:stopAll,
 started(){feedback.destination(tile);feedback.interacting('Eating');},
 completed(changes){showItemChanges(changes);feedback.complete();areas.notify('foodEaten');},
 confirm:confirmFood});
function confirmFood(proceed){const d=document.createElement('dialog');d.className='food-confirm';d.innerHTML='<p>Your health is already full. Eat this anyway?</p><button>Eat anyway</button><button>Cancel</button>';document.body.append(d);d.showModal();const close=()=>{d.close();d.remove();};d.querySelectorAll('button')[0].onclick=()=>{close();proceed();};d.querySelectorAll('button')[1].onclick=close;d.addEventListener('cancel',()=>d.remove());return close;}
cooking=createCookingSystem({inventory,stop:stopAll,
 started(){feedback.destination(tile);feedback.interacting('Cooking');},
 completed(changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();},
 cancelled(){feedback.clearDestination();}
});
cookingMenu=createCookingMenu({recipes:COOKING_RECIPES,items:ITEMS,inventory,canMake:canCookRecipe,duration:seconds=>cookingDuration(seconds,cooking.skill.level),onCook:(id,station)=>cooking.start(id,station)});
recipeCrafting=createRecipeCrafting({inventory,skill:craftingSkill,
 busy:()=>combat?.busy||combat?.working||areas.busy||travel.busy||companions?.working||resourceActions?.working||carpentry?.working||fishing?.working||food?.working||cooking?.working||smithing?.working||!!segment||path.length>0,
 progressed(age,dt){if(Math.floor((age-dt)/.45)!==Math.floor(age/.45))gameAudio.play('craft');},
 stop:stopAll,started(id){areas.notify('craftStarted',id);feedback.destination(tile);feedback.interacting('Crafting');},
 completed(id,changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();happyUntil=elapsed+1.2;updateUI();areas.notify('crafted',id);},cancelled(){feedback.clearDestination();areas.notify('craftCancelled');}
});
campfires=createCampfires({scene,world,pickables,inventory,cookingMenu,feedback,tile:()=>tile,
 busy:()=>!canMove(),stop:stopAll,closeMenus:()=>menus.closeMenus(),approach:selectActor,toast,showItems:showItemChanges,
 occupied:t=>!!t&&(t===tile||t===segment?.to||companions.occupies(t)||pickables.some(m=>{const a=m.userData.actor||m.userData.resource||m.userData.tree;return a&&m.userData.tile===t&&isVisible(m)&&!a.opened&&!a.depleted;})),
 hover:()=>hover?.actor,guide:()=>areas.active?.campfireGuide,
 onPlaced:a=>areas.notify('campfirePlaced',a),onCooked:(id,a)=>areas.notify('campfireCooked',id,a)
});
smithing=createStationCrafting({inventory,stop:stopAll,busy:()=>!canMove()||combat.working,
 inReach:a=>!segment&&!path.length&&interactionRoute(world,tile,a)?.route.length===0,
 started(a){facing=Math.atan2(a.x-tile.x,a.z-tile.z);feedback.destination(tile);feedback.interacting(a.kind==='anvil'?'Smithing':'Smelting');},
 completed(id,changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();areas.broadcast('stationCrafted',id);},cancelled(){feedback.clearDestination();}
});
const stationOptions={recipes:COOKING_RECIPES,items:ITEMS,inventory,canMake:canCookRecipe,duration:seconds=>cookingDuration(seconds,smithing.skill.level),onCook:(id,station)=>smithing.start(id,station)};
furnaceMenu=createCookingMenu({...stationOptions,kind:'furnace'});anvilMenu=createCookingMenu({...stationOptions,kind:'anvil'});
const openStation=a=>(a.kind==='furnace'?furnaceMenu:anvilMenu).open(a);
const characterDialogue=createCharacterDialogue({player:()=>({name:opening.profile.name||'Pip',model:visual})});
willow=createWillowbank({dialogue:characterDialogue,scene,world,crystals,renderer,player,visual,hands,pickables,inventory,feedback,companions,cookingMenu,campfires,health,food,fishing,fishingSpots,carpentry,resourceActions,
 playerWorking:()=>!!actorTarget||companions.working||resourceActions.working||carpentry.working||fishing.working||food.working||cooking.working||recipeCrafting.working,
 playerSleepTime:()=>idleClock.sleepTime,approaching:()=>actorTarget,occupied:t=>t===tile||t===segment?.to,routeContains:t=>segment?.to===t||path.includes(t),tile:()=>tile,hover:()=>hover?.actor||hover?.tree||hover?.resource,moving:()=>!!segment||path.length>0,profile:()=>opening.profile,
 walkRoute(route){path=[...route];},
 stop:stopAll,toast,showItems:showItemChanges,approach:selectActor,sound:name=>gameAudio.play(name),
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},
 teleport(t){if(!t)return;path=[];segment=null;tile=t;player.position.set(t.x-6,t.h,t.z-6);},
 openCrafting(){document.getElementById('open-crafting').click();},selectRecipe:id=>{if(id)menus.selectRecipe(id);},
 showTip:(...args)=>craftingTutorial.showChapterTip(...args),say:(...args)=>craftingTutorial.sayChapter(...args),
 openInventory:()=>menus.openInventory(),closeMenus:()=>menus.closeMenus()
});
finale=createTutorialFinale({destination:'willowbank',parent:clearingGroup,tiles:clearingTiles,spawn:clearingTiles.get(key(SPAWN.x,SPAWN.z)),active:()=>areas.id==='clearing',crystals,player,visual,trees,resources,pickables,inventory,
 getTile:()=>tile,getAngle:()=>angle,stop:stopAll,showItemChanges,approach:selectActor,
 clearFalling(){resourceActions.resetWhere(n=>clearingTiles.get(key(n.x,n.z))===n.tile);},
 ensureClearSpawn(){if(trees.some(t=>t.x===tile.x&&t.z===tile.z)){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}},
 });
areas.register({id:'clearing',name:'The Clearing',description:'Resources & crafting',camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},group:clearingGroup,tiles:clearingTiles,arrival:()=>finale.ensurePortal()?.tile,
 get busy(){return finale.busy;},get canMove(){return opening.canMove&&!craftingTutorial.blocksMovement;},get canOrbit(){return opening.canOrbit;},
 get cameraFocus(){return finale.cameraFocus;},get celebration(){return finale.celebration;},
 enter(){ground.visible=true;introTile.visible=false;},
 update(dt,time,camera,hover){waterEffects.update(dt);opening.update(dt);if(opening.playable)finale.update(dt,time,hover);},
 craftStarted:id=>craftingTutorial.craftStarted(id),crafted:id=>craftingTutorial.craftComplete(id),craftCancelled:()=>craftingTutorial.craftCancelled(),
 interact:a=>finale.interact(a),clearUI:()=>finale.debugCancel?.(),
});
areas.register({id:'willowbank',name:'Willowbank',recommendedDestination:'cinderhold',description:'Fishing, cooking & healing',group:willow.group,tiles:new Map(willow.tiles.map(t=>[key(t.x,t.z),t])),arrival:()=>willow.crystal.tile,
 camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},
 enter:({arrival})=>willow.enter(true,!arrival),leave:()=>willow.enter(false),cancel:()=>willow.cancel(),update:(dt,time,camera)=>willow.update(dt,time,camera),
 get busy(){return willow.busy;},get working(){return willow.working;},get cameraFocus(){const focus=willow.cameraFocus;return focus&&{...focus,position:focus.position.clone().add(new THREE.Vector3(0,.4,0)),zoom:7};},get expression(){return willow.expression;},
 craftStarted:()=>willow.craftStarted(),crafted:id=>willow.crafted(id),foodEaten:()=>willow.foodEaten(),campfirePlaced:a=>willow.campfirePlaced(a),campfireCooked:(id,a)=>willow.campfireCooked(id,a),get campfireGuide(){return willow.campfireGuide;},
 interact:a=>willow.interact(a),clearUI:()=>willow.debug?.clearUI(),reset:()=>willow.debug?.stage('meet')
});
cinder=createCinderhold({scene,world,pickables,crystals,dialogue:characterDialogue,resources:resourceActions,combat,equipment,styles,supplies,openStation,player,stop:stopAll,toast,
 hover:()=>hover?.actor||hover?.tree||hover?.resource,approach:selectActor,openInventory:()=>menus.openInventory(),tip:(...args)=>craftingTutorial.showChapterTip(...args),hideTip(){document.getElementById('gather-tutorial').hidden=true;},
 working:()=>!!actorTarget||!!segment||path.length>0||combat.working||smithing.working||resourceActions.working||food.working||recipeCrafting.working
});
areas.register(cinder);
styleMenu=createCombatStyleMenu({styles,beforeOpen:()=>menus.closeMenus(),busy:()=>combat.working||combat.busy||smithing.working||recipeCrafting.working});
areas.activate('clearing',{announce:false});
function canMove(){return areas.canMove&&!travel.busy&&!combat?.busy;}

function cancelWork(){
 smithing?.cancel();combat?.cancel();resourceActions?.cancel();carpentry?.cancel();fishing?.cancel();food?.cancel();cooking?.cancel();recipeCrafting?.cancel();campfires?.cancel();
 companions?.cancel();areas.cancel();
 chopTarget=null;actorTarget=null;actorTime=0;
}
function routeToTree(target){return target.depleted?null:target.enemy?attackRoute(world,segment?segment.to:tile,target,styles.attack.range):interactionRoute(world,segment?segment.to:tile,target);}
function selectTree(tree){
 if(!canMove()||chopTarget===tree||resourceActions.matches(tree))return;if(__PLAYGROUND__)debug?.stop(false);
 const mining=['boulder','copper'].includes(tree.kind),tool=mining?'pickaxes':'axes';
 if(!inventory[tool]){toast('Missing the required tool!');feedback.pulse(tree.group.position,false);return;}
 if(chopTarget===tree||resourceActions.matches(tree))return;
 const result=routeToTree(tree);if(!result){toast('There is no safe route to this resource.');feedback.pulse(tree.group.position,false);return;}
 cancelWork();target=null;gatherTime=0;chopTarget=tree;path=result.route;
 feedback.destination(result.at);
}
function selectActor(actor){
 if(campfires?.placing){campfires.selectPlacement(actor.tile);return;}
 if(!canMove()||!actor.ready||actor.opened||actor.depleted)return;
 if(actorTarget===actor||combat.matches(actor)||companions.matches(actor)||resourceActions.matches(actor)||carpentry.matches(actor)||fishing.matches(actor))return;
 if(__PLAYGROUND__)debug?.stop(false);
 const result=routeToTree(actor);if(!result){toast('There is no safe route there.');return;}
 cancelWork();target=null;gatherTime=0;actorTarget=actor;actorTime=0;path=result.route;feedback.destination(result.at);
}
function isVisible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
let toastTimer;function toast(s){gameAudio.play('blocked');$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function showItemChanges(changes){menus.refresh();itemFeed.show(changes);gameAudio.play(Object.values(changes).some(n=>n<0)?'complete':'pickup');}
function updateUI(reward){const count=inventory.sticks+inventory.stones;opening.collected(count,reward);$('sticks').textContent='×'+inventory.sticks;$('stones').textContent='×'+inventory.stones;$('bag-total').textContent=`${count} ITEMS`;$('quest-count').textContent=`${count} / 6 materials collected`;$('quest-progress').style.width=`${count/6*100}%`;$('quest-check').textContent=count===6?'✓':'◇';}
function moveTo(t,resource){if(!canMove())return;if(campfires?.placing){campfires.selectPlacement(t);return;}if(resource&&(resource===target||resourceActions.matches(resource)))return;if(__PLAYGROUND__)debug?.stop(false);const point=new THREE.Vector3(t.x-6,t.water?.86:t.h,t.z-6);if(resource&&(resource===target||resourceActions.matches(resource))){return;}const start=segment?segment.to:tile;const adjacent=resource?routeToTree(resource):null;const destination=resource?adjacent?.at:t;const route=resource?(adjacent?.route??null):findPath(world,start,t);if(route===null){feedback.pulse(point,false);toast(t.blocked?'Find a clear patch of ground.':'That ledge is too high. Find a route with smaller steps.');return;}$('toast').classList.remove('visible');clearTimeout(toastTimer);if(recipeCrafting.working&&route.length===0&&!segment&&!resource)return;combat.disengage();cancelWork();opening.moving(tile,destination);target=resource||null;gatherTime=0;path=route;feedback.destination(destination);$('activity').textContent=resource?'On the way to gather':'Exploring';}
function pick(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables.filter(m=>isVisible(m)&&!m.userData.resource?.depleted&&!m.userData.tree?.depleted),false)[0];}
let down=null,dragged=false,pinchDistance=null;
const activePointers=new Map();
let pointerOnCanvas=false,pointerClient={x:0,y:0};
const canvas=renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function spread(){const [a,b]=[...activePointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
canvas.addEventListener('pointerdown',e=>{
 if(!areas.canOrbit||travel.busy)return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
 if(activePointers.size===1){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button};dragged=false;}
 else{dragged=true;pinchDistance=spread();}
});
canvas.addEventListener('pointermove',e=>{
 if(!areas.canOrbit||travel.busy)return;
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
  const hit=pick(e),data=terrainHitData(hit);
  if(campfires.placing)campfires.selectPlacement(data?.tile);else if(data?.actor)selectActor(data.actor);else if(data?.tree)selectTree(data.tree);else if(data?.tile)moveTo(data.tile,data.resource);
  else{const groundHit=raycaster.intersectObject(ground)[0];if(groundHit)feedback.pulse(groundHit.point,false);toast('Choose a tile inside the area.');}
 }
 activePointers.delete(e.pointerId);pinchDistance=null;
 if(!activePointers.size)down=null;
 else{const p=[...activePointers.values()][0];down={x:p.x,y:p.y,lastX:p.x,lastY:p.y,button:0};dragged=true;}
});
function cancelGesture(){activePointers.clear();down=null;pinchDistance=null;dragged=true;}
canvas.addEventListener('pointercancel',cancelGesture);addEventListener('blur',cancelGesture);
canvas.addEventListener('pointerleave',()=>{pointerOnCanvas=false;campfires.hoverPlacement(null);$('tooltip').style.display='none';feedback.hover(null);});
function updateHover(){
 if(!pointerOnCanvas||!canMove()){campfires.hoverPlacement(null);feedback.hover(null);$('tooltip').style.display='none';return;}
 const hit=pick({clientX:pointerClient.x,clientY:pointerClient.y});hover=terrainHitData(hit);
 const t=hover?.tile,tree=hover?.tree,actor=hover?.actor,placementStatus=campfires.hoverPlacement(t),valid=placementStatus?placementStatus.valid:actor?actor.ready&&!actor.opened&&!!routeToTree(actor):tree?(['boulder','copper'].includes(tree.kind)?inventory.pickaxes>0:inventory.axes>0)&&!!routeToTree(tree):hover?.resource?!!routeToTree(hover.resource):!!t&&findPath(world,segment?segment.to:tile,t)!==null;
 feedback.hover(t,valid);
 renderer.domElement.style.cursor=t?(valid?'pointer':'not-allowed'):'default';
 $('tooltip').style.display=t?'block':'none';
 if(t){$('tooltip').textContent=placementStatus?placementStatus.label:actor?(actor.opened?(actor.enemy?'Recovering…':'Empty chest'):!actor.ready?'Landing…':valid?actor.label:'No safe route'):tree?(valid?(tree.kind==='copper'?'Mine copper':['boulder','copper'].includes(tree.kind)?'Mine Boulder':'Chop tree'):!inventory[['boulder','copper'].includes(tree.kind)?'pickaxes':'axes']?'Missing the required tool!':'No safe route'):!valid?(t.blocked?'Blocked terrain':'No safe route'):hover?.resource?'Gather '+ITEMS[hover.resource.kind].name:'Move here';$('tooltip').style.left=(pointerClient.x+16)+'px';$('tooltip').style.top=(pointerClient.y-32)+'px';}
}
function changeZoom(delta){if(!areas.canOrbit||travel.busy)return;if(!opening.playable){introZoom=THREE.MathUtils.clamp(introZoom*Math.exp(delta/22),3,10);return;}const before=zoom;zoom=THREE.MathUtils.clamp(zoom*Math.exp(delta/22),3,34);opening.zoomed(Math.log(zoom/before));}renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY*.012);},{passive:false});$('rotate-left').onclick=()=>angle-=Math.PI/4;$('rotate-right').onclick=()=>angle+=Math.PI/4;$('zoom-in').onclick=()=>changeZoom(-1.5);$('zoom-out').onclick=()=>changeZoom(1.5);
$('reset').onclick=()=>{resourceActions.cancel();Object.assign(gatheringSkill,{xp:0,level:1});happyUntil=0;path=[];segment=null;target=null;gatherTime=0;Object.assign(inventory,{sticks:0,stones:0});tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);for(const r of resources)resourceActions.reset(r);feedback.clearDestination();updateUI();$('activity').textContent='Taking it all in';toast('A fresh little beginning.');};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();let elapsed=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);gameAudio.update(dt,splash.active?'splash':opening.finished?'clearing':'intro',!$('dialogue').hidden);if(splash.active){rotationKeys.clear();splash.render(dt);return;}elapsed+=dt;travel.update(dt);const worldMotion=areas.update(dt,elapsed,camera,hover?.actor);characterDialogue.update(dt);crystals.update(elapsed);destinations.update();projectiles.update(dt);document.body.classList.toggle('dialogue-cutscene',!!(areas.cameraFocus||areas.celebration));$('game-menus').inert=areas.busy||travel.busy;
 const asleep=idleClock.update(dt,opening.playable?(!segment&&!path.length&&!target&&!actorTarget&&!areas.busy&&!travel.busy&&!debug?.previewing&&!combat.working&&!combat.busy&&!areas.working&&!companions.working&&!resourceActions.working&&!carpentry.working&&!fishing.working&&!food.working&&!cooking.working&&!recipeCrafting.working&&!smithing.working):opening.quiet);
 let sleeping=asleep&&idleClock.sleepTime>=SLEEP_SETTLE;
 if(!opening.playable){if(opening.canOrbit){angle+=(Number(rotationKeys.has('ArrowRight'))-Number(rotationKeys.has('ArrowLeft')))*keyboardRotationSpeed*dt;elevation=THREE.MathUtils.clamp(elevation+(Number(rotationKeys.has('ArrowUp'))-Number(rotationKeys.has('ArrowDown')))*Math.PI/3*dt,THREE.MathUtils.degToRad(20),THREE.MathUtils.degToRad(75));}else rotationKeys.clear();
  if(opening.quiet||opening.reaction){
    const social=opening.reaction?socialMotion(opening.reaction.kind,opening.reaction.time):asleep?socialMotion('Sleeping',idleClock.sleepTime):null;
    player.position.copy(opening.inClearing?clearingSpawn:introSpawn);
    visual.rotation.set(social?.pose.lean||0,social?.pose.twist||0,social?.pose.roll||0);
    if(social){player.position.y+=social.lift;const width=1/Math.sqrt(social.pose.squash);visual.scale.set(width,social.pose.squash,width);visual.position.y=-.07*social.pose.squash;}
    bendSlime(social?.pose.bend||0);equipmentPresentation.bend(social?.pose.bend||0);
    expressionFace.set(social?.expression||'idle');
    for(let i=0;i<hands.length;i++){const h=social?.hands[i]||[(i===0?-1:1)*.46,.33,.08,0,0];hands[i].position.set(h[0],h[1],h[2]);hands[i].rotation.set(h[3],0,h[4]);}
  }
  const focus=(opening.inClearing?clearingSpawn:introSpawn).clone().add(new THREE.Vector3(0,.35,0)),distance=opening.inClearing?22:introZoom;
  camera.position.set(focus.x+Math.sin(angle)*distance*Math.cos(elevation),focus.y+Math.sin(elevation)*distance,focus.z+Math.cos(angle)*distance*Math.cos(elevation));
  camera.lookAt(focus.clone().add(new THREE.Vector3(0,opening.inClearing?0:-distance*.09,0)));camera.updateMatrixWorld();contactShadow.update(player.position,visual.scale);sleepFeedback.update(dt,sleeping,player.position,camera);renderer.render(scene,camera);return;
 }
 campfires.update(elapsed);
 fishingSpots.update(elapsed);
 if(__PLAYGROUND__)trainingFixtures?.update(elapsed);
 if(__PLAYGROUND__)carpentryFixture?.highlight.update(false,elapsed,hover?.actor===carpentryFixture&&!carpentryFixture.opened&&!carpentry.matches(carpentryFixture));
 equipment.refresh();
 combatFeedback.update(dt,camera);
 const combatMotion=combat.update(dt,elapsed,camera);
 healthUI.update(opening.playable);
 const resourceMotion=resourceActions.update(dt);
 gatherTime=resourceActions.state?.kind==='Gathering'?resourceActions.state.age:0;
 const carpentryMotion=carpentry.update(dt);
 const fishingMotion=fishing.update(dt);
 const foodMotion=food.update(dt);
 const cookingMotion=cooking.update(dt);
 const recipeMotion=recipeCrafting.update(dt);
 const smithingMotion=smithing.update(dt);
 const companionMotion=companions.update(dt,elapsed,camera);
 const actionMotion=combatMotion||companionMotion||resourceMotion||carpentryMotion||fishingMotion||foodMotion||cookingMotion||recipeMotion||smithingMotion||worldMotion;
 if(!areas.canOrbit||travel.busy||document.querySelector('dialog[open]'))rotationKeys.clear();
 const oldAngle=angle,oldElevation=elevation;
 angle += (Number(rotationKeys.has('ArrowRight')) - Number(rotationKeys.has('ArrowLeft'))) * keyboardRotationSpeed * dt;
 elevation = THREE.MathUtils.clamp(elevation + (Number(rotationKeys.has('ArrowUp')) - Number(rotationKeys.has('ArrowDown'))) * Math.PI / 3 * dt, THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(75));
 opening.rotated(Math.abs(angle-oldAngle)+Math.abs(elevation-oldElevation));
 let pose=idlePose(elapsed),handWork=null,expression=elapsed<happyUntil?'happy':'idle',socialHands=null;
 if(asleep){const social=socialMotion('Sleeping',idleClock.sleepTime);pose=social.pose;expression=social.expression;socialHands=social.hands;}
 if(!segment&&path.length&&companions.cannotYield(path[0])){path=[];target=null;feedback.clearDestination();toast("Your companion needs room to move aside.");}
 if(!segment&&path.length&&!companions.occupies(path[0])){
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
  if(chopTarget){const node=chopTarget;chopTarget=null;resourceActions.start(node);}
  if(actorTarget){
    const actor=actorTarget;facing=Math.atan2(actor.x-tile.x,actor.z-tile.z);
    actorTime+=dt;handWork=actor.duration?actorTime:null;expression=actor.duration?'focused':'idle';
    feedback.interacting(actor.duration?'Opening':'Traveling');
    if(actorTime>=actor.duration){actorTarget=null;actorTime=0;feedback.complete();if(actor===companions.actor)companions.pet();else if(actor.enemy)combat.start(actor);else if(actor.resourceNode)resourceActions.start(actor);else if(actor.carpentry){if(actor.available())carpentry.start(actor);else if(actor.interact)actor.interact();else areas.notify('interact',actor);}else if(actor.fishing)fishing.start(actor);else if(actor.campfire)campfires.interact(actor);else if(actor.crystal){gameAudio.play('portal');actor.interact();}else if(actor.interact)actor.interact();else areas.notify('interact',actor);}
  }else if(target&&!target.depleted){const node=target;target=null;resourceActions.start(node);
  }else{if(!(__PLAYGROUND__&&debug?.holdingFeedback))feedback.arrived();$('activity').textContent=inventory.sticks+inventory.stones===6?'Clearing explored':'Taking it all in';}
 }
 if(__PLAYGROUND__&&debug){const preview=debug.frame(dt);if(preview){pose=preview.pose;handWork=preview.handWork;expression=preview.expression;socialHands=preview.hands||null;sleeping=!!preview.sleeping;player.position.y=tile.h+preview.lift;}}
 if(actionMotion){
  const motion=playerActionMotion(actionMotion.kind,actionMotion.time,elapsed,actionMotion.profile);
  if(actionMotion.kind!=='Block'||!segment)pose=motion.pose;expression=motion.expression;handWork=motion.handWork;socialHands=motion.hands;sleeping=false;
 }
 const celebration=areas.celebration;
 if(celebration){const motion=holdUpMotion(celebration.age);expression=motion.expression;handWork=null;facing=celebration.angle;pose=motion.pose;socialHands=motion.hands;}
 bendSlime(pose.bend||0);equipmentPresentation.bend(pose.bend||0);
 expressionFace.set(characterDialogue.expressionFor('left')||areas.expression||expression);
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
 axeTool.visible=actionMotion?.kind==='Chopping'||(__PLAYGROUND__&&debug?.chopping);
 pickaxeTool.visible=actionMotion?.kind==='Mining'||(__PLAYGROUND__&&debug?.mining);
 const chopping=pickaxeTool.visible?miningMotion(actionMotion?.time??debug?.time??0):axeTool.visible?chopMotion(actionMotion?.time??debug?.time??0):null;
 const carryHands=equipmentIdleHands({item:equipment.slots.main});
 // Both hands share the chop cycle; other interactions keep their scoop gesture.
 for(let i=0;i<hands.length;i++){
  const hand=hands[i];
  let [x,y,z,curl,roll,yaw]=carryHands[i];z+=pose.armDrive||0;
  if(handWork!==null&&!chopping)[x,y,z,curl,roll,yaw]=gatheringHand(handWork,i);
  if(chopping)[x,y,z,curl,roll,yaw=0]=i===0?chopping.right:chopping.left;
  if(socialHands)[x,y,z,curl,roll,yaw=0]=socialHands[i];
  hand.position.lerp(new THREE.Vector3(x,y,z),1-Math.exp(-dt*(actionMotion?.kind==='Combat'?48:22)));
  hand.rotation.x=THREE.MathUtils.lerp(hand.rotation.x,curl,blend);
  hand.rotation.z=THREE.MathUtils.lerp(hand.rotation.z,roll,blend);
  hand.rotation.y=THREE.MathUtils.lerp(hand.rotation.y,yaw,blend);
  hand.scale.lerp(new THREE.Vector3(1,handWork!==null?.88:1,handWork!==null?1.15:1),blend);
 }
 if(pose.handDrop!==undefined)placeFaintedHands(visual,hands,pose.handDrop);
 alignSupportingHand(hands,pickaxeTool.visible?'Mining':actionMotion?.kind==='Fishing catch'?'Fish hook':actionMotion?.kind);
 equipmentPresentation.update({motion:(__PLAYGROUND__&&debug?.combatMotion)||actionMotion,working:recipeCrafting.working,celebrating:!!areas.celebration});
 hammerTool.visible=['Repairing','Smithing'].includes(actionMotion?.kind);
 fishingPresentation.update(actionMotion);
 for(const tree of trees)tree.highlight.update((['boulder','copper'].includes(tree.kind)?craftingTutorial.highlightBoulders:craftingTutorial.highlightTrees)&&!tree.depleted,elapsed,pointerOnCanvas&&canMove()&&hover?.tree===tree&&!tree.depleted);
 const showResourceArrows=!opening.finished&&opening.canGather&&inventory.sticks+inventory.stones===0;
 $('action-progress').style.width=`${gatherTime/gatheringDuration(gatheringSkill)*100}%`;
 const closeup=celebration?Math.min(THREE.MathUtils.smoothstep(celebration.age,0,1),1-THREE.MathUtils.smoothstep(celebration.age,3.3,4.3)):0;
 const areaFocus=areas.cameraFocus;
 let viewAngle=angle+(celebration?Math.atan2(Math.sin(celebration.angle-angle),Math.cos(celebration.angle-angle))*closeup:0),viewZoom=THREE.MathUtils.lerp(zoom,4.6,closeup),viewElevation=THREE.MathUtils.lerp(elevation,.27,closeup);
 const focus=player.position.clone().add(new THREE.Vector3(0,.35+closeup*.3,0));if(areaFocus){focus.lerp(areaFocus.position,areaFocus.blend);viewZoom=THREE.MathUtils.lerp(viewZoom,areaFocus.zoom??viewZoom,areaFocus.blend);viewElevation=THREE.MathUtils.lerp(viewElevation,areaFocus.elevation??viewElevation,areaFocus.blend);}
 const horizontalDistance=viewZoom*Math.cos(viewElevation);camera.position.set(focus.x+Math.sin(viewAngle)*horizontalDistance,focus.y+Math.sin(viewElevation)*viewZoom,focus.z+Math.cos(viewAngle)*horizontalDistance);camera.lookAt(focus);camera.updateMatrixWorld();updateHover();for(const resource of resources)resource.highlight.update(showResourceArrows&&!resource.depleted,elapsed,pointerOnCanvas&&canMove()&&hover?.resource===resource&&!resource.depleted);feedback.update(dt,elapsed,camera);updateSkillRewards(dt,camera,innerWidth,innerHeight);sleepFeedback.update(dt,sleeping,player.position,camera);renderer.render(scene,camera);
}
if(__PLAYGROUND__){
 trainingFixtures=playground.createTrainingFixtures({scene,world,pickables,resources:resourceActions,combat,styles,supplies,openStation,stop:stopAll,approach:selectActor,tile:()=>tile,occupied:t=>t===tile||companions.occupies(t)||pickables.some(m=>m.userData.tile===t&&isVisible(m)&&(m.userData.actor||m.userData.resource)),clearUI:()=>areas.notify('clearUI')});
 combatFixtures=playground.createCombatFixtures({combat,world,scene,pickables,tile:()=>tile,stop:stopAll,approach:selectActor,occupied:t=>t===tile||companions.occupies(t)||pickables.some(m=>m.userData.tile===t&&isVisible(m)&&(m.userData.resource||m.userData.actor)),clearUI(){areas.notify('clearUI');}});
 carpentryFixture=playground.addCarpentryFixture({world:clearingTiles,currentWorld:world,scene:clearingGroup,pickables,clearingObjects});
 playground.addFishingFixture({world:clearingTiles,scene:clearingGroup,fishingSpots,clearingObjects});
 debug=playground.mountPlayground({
  companions,
  trainingAction:action=>trainingFixtures.run(action),
  landmark(name){stopAll();areas.notify('clearUI');opening.enterFreePlay();finale.ensurePortal();if(areas.id!=='cinderhold')areas.activate('cinderhold',{landing:travel.landingFor('cinderhold'),arrival:false});cinder.clearUI();const [x,z]=CINDERHOLD[name],targetTile=cinder.tiles.get(key(x,z)),route=interactionRoute(world,tile,{tile:targetTile,x,z});if(route){tile=route.at;player.position.set(tile.x-6,tile.h,tile.z-6);}},
  combatAction:action=>combatFixtures.run(action),
  async loadCheckpoint(checkpoint){
   splash.close();stopAll();companions.cancel();craftingTutorial.reset();opening.enterFreePlay();this.reset('all');
   for(const object of clearingObjects)object.visible=true;introTile.visible=false;player.visible=true;
   $('scene-fade').hidden=true;$('game-menus').hidden=false;$('game-menus').inert=false;
   if(checkpoint.area==='cinderhold'){
    finale.ensurePortal();areas.activate('cinderhold',{landing:travel.landingFor('cinderhold'),arrival:false});if(checkpoint.step!=='arrival')cinder.clearUI();
    Object.assign(inventory,{pickaxes:1,hammers:1,sticks:4,stones:4,cookedFish:3});
    if(checkpoint.step==='smelt')inventory.copperOre=4;
    if(['dagger','shield'].includes(checkpoint.step))inventory.copperIngots=4;
    if(['equip','return','bruiser','graduate','finished'].includes(checkpoint.step)){inventory.copperDagger=inventory.copperShield=1;if(checkpoint.step!=='equip'){equipment.toggle('copperDagger');equipment.toggle('copperShield');}}
    if(checkpoint.step!=='arrival')cinder.checkpoint(checkpoint.step);menus.refresh();return;
   }
   if(checkpoint.area==='willowbank'){
    finale.ensurePortal();areas.activate('willowbank',{landing:travel.landingFor('willowbank'),arrival:false});willow.debug.stage(checkpoint.step);return;
   }
   const step=checkpoint.step;
   Object.assign(inventory,{sticks:3,stones:3,axes:1,pickaxes:1,logs:3,stone:1});
   if(['color','name'].includes(step)){this.customization();opening.debugCheckpoint(step);return;}
   if(['rotate','zoom','move','gather','gather-resume','xp','xp-benefits','level','level-encouragement','gather-complete'].includes(step)){
    if(['gather','gather-resume','xp','xp-benefits'].includes(step)){
     inventory.sticks=inventory.stones=0;
     if(step!=='gather'){resourceActions.reset(resources[0],{depleted:true});inventory[resources[0].kind]=1;Object.assign(gatheringSkill,{xp:20,level:1});}
    }else if(step.startsWith('level')||step==='gather-complete'){for(const r of resources)resourceActions.reset(r,{depleted:true});Object.assign(gatheringSkill,{xp:120,level:2});}
    opening.debugCheckpoint(step);return;
   }
   const finaleSteps={closing:()=>finale.begin(),portal:()=>finale.dropPortal(),practice:()=>finale.resetPractice(),reward:()=>finale.revealReward(),chest:()=>finale.dropChest()};
   if(finaleSteps[step]){finaleSteps[step]();return;}
   Object.assign(gatheringSkill,{xp:120,level:2});
   if(['intro','menu','craft-menu','recipe','crafting'].includes(step))inventory.axes=0;
   if(['mining-intro','pickaxe','mining-craft'].includes(step))inventory.pickaxes=0;
   await craftingTutorial.debugCheckpoint(step);
  },
  resetCurrentArea(){stopAll();travel.cancel();trainingFixtures.clear();combatFixtures.clear();if(areas.active.reset)areas.active.reset();else this.reset('all');},
  openInterface(name){
   splash.close();travel.cancel();stopAll();areas.notify('clearUI');craftingTutorial.reset();opening.enterFreePlay();$('game-menus').hidden=false;$('game-menus').inert=false;
   if(name==='cooking'){cookingMenu.open();return;}
   if(name==='furnace'){furnaceMenu.open();return;}if(name==='anvil'){anvilMenu.open();return;}if(name==='destinations'){destinations.open(null);return;}if(name==='combat-styles'){styleMenu.open();return;}
   if(name==='companion-name'){if(!companions.state.owned)companions.acquire();companions.name();return;}
   if(name==='settings-popup'){settingsUI.open();return;}
   const button=$('open-'+name);if(button){button.hidden=false;button.disabled=false;button.click();}
  },
  sharedAction(name){splash.close();if(name==='heal')health.restore();else if(name==='hurt')health.value=Math.max(1,health.value-10);else if(name==='eat'){inventory.cookedFish=Math.max(1,inventory.cookedFish||0);food.start('cookedFish',true);}else willow.debug[name]();return health.value;},
  closeSplash(){splash.close();},
  grassPalette:playground.createGrassPaletteControls(()=>[...grass,...splash.grassMaterials,...willow.grassMaterials]),
  combatProfile:()=>({...styles.attack,mainHand:equipment.slots.main,offHand:equipment.slots.off}),
  objectives:{add:()=>updateObjective('debug','Chop some wood','Obtain Small Logs by chopping regular trees in the clearing.',0,6),update:()=>updateObjective('debug','Chop some wood','Obtain Small Logs by chopping regular trees in the clearing.',3,6),complete:()=>finishObjective('debug'),reset:resetObjectives,tip:()=>craftingTutorial.previewTip()},audio:gameAudio,itemFeed,openSettings:()=>document.getElementById('open-settings').click(),showCrafting(){document.getElementById('open-crafting').click();},waterSettings,restartWater(){waterEffects.restart();splash.restartWater();willow.restartWater();},
  miningLesson(){this.reset('all');stopAll();finale.reset();Object.assign(inventory,{sticks:3,stones:3,pickaxes:0});for(const tree of trees)if(['boulder','copper'].includes(tree.kind))resourceActions.reset(tree);if(tile.blocked){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}craftingTutorial.startMining();},
  stopMiningLesson(){stopAll();craftingTutorial.reset();},
  mineNearest(){const node=trees.filter(t=>t.kind==='boulder'&&!t.depleted&&routeToTree(t)).sort((a,b)=>routeToTree(a).route.length-routeToTree(b).route.length)[0];if(node)selectTree(node);},
  showSplash(){stopAll();splash.show();},
  randomizeSplash(){stopAll();splash.randomizeAppearance();splash.show();},
  showResourceHitboxes(show){for(const r of resources)r.hitbox.material.colorWrite=show;},
  showInventory(){menus.openInventory();},
  inventoryLesson(){stopAll();Object.assign(inventory,{sticks:3,stones:3});craftingTutorial.startInventory();},
  showSkills(){menus.openSkills();},
  levelLesson(){this.reset('all');Object.assign(inventory,{sticks:3,stones:3});Object.assign(gatheringSkill,{xp:120,level:2});opening.startLevelExplanation();},
  gatheringLesson(){this.reset('all');Object.assign(inventory,{sticks:0,stones:0});Object.assign(gatheringSkill,{xp:0,level:1});opening.startGathering();},
  customization(){this.reset('all');stopAll();for(const object of clearingObjects)object.visible=false;introTile.visible=true;player.visible=true;player.rotation.set(0,0,0);visual.scale.setScalar(1);introZoom=6.5;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);$('scene-fade').hidden=false;$('scene-fade').style.opacity='0';opening.startCustomization();},
  controlsLesson(){stopAll();craftingTutorial.reset();opening.startControls(()=>opening.enterFreePlay());},
  questsLesson(){stopAll();craftingTutorial.reset();craftingTutorial.startQuests();},
  skillsLesson(){stopAll();Object.assign(gatheringSkill,{xp:120,level:2});Object.assign(inventory,{sticks:3,stones:3});craftingTutorial.startSkills();},
  skills:playerSkills(),
  willow,areaId:()=>areas.id,travelTo:id=>{finale.ensurePortal();return travel.request(id);},cancelTravel:()=>travel.cancel(),usePortal(){const crystal=crystals.current()[0];if(crystal)selectActor(crystal);},resetFinale(){travel.cancel();if(areas.id!=='clearing')areas.activate('clearing',{landing:clearingTiles.get(key(SPAWN.x,SPAWN.z)),arrival:false});finale.reset();},enterWillow(){craftingTutorial.reset();opening.enterFreePlay();finale.ensurePortal();travel.request('willowbank');},
  equipment,inventory,player,feedback,getTile:()=>tile,finale,
  doze(){idleClock.update(30,true);},
  wake(){idleClock.wake();},
  completePractice(){resourceActions.resetWhere(n=>clearingTiles.get(key(n.x,n.z))===n.tile);for(const r of resources)resourceActions.reset(r,{depleted:true});for(const t of trees)resourceActions.reset(t,{depleted:true});},
  stop(){cancelWork();path=[];segment=null;target=null;gatherTime=0;player.position.set(tile.x-6,tile.h,tile.z-6);feedback.clearDestination();},
  reset(kind){
   campfires.reset(kind==='all'?undefined:world);
   travel.cancel();if(areas.id!=='clearing'||kind==='all'){areas.activate('clearing',{landing:clearingTiles.get(key(SPAWN.x,SPAWN.z)),arrival:false});finale.reset();}if(kind==='all'){craftingTutorial.reset();opening.enterFreePlay();resetObjectives();for(const object of clearingObjects)object.visible=true;introTile.visible=false;player.visible=true;}
   clearSkillRewards();itemFeed.clear();clearTimeout(toastTimer);$('toast').classList.remove('visible');
   resourceActions.resetWhere(n=>clearingTiles.get(key(n.x,n.z))===n.tile&&(kind==='all'||kind==='items'&&!['tree','boulder'].includes(n.kind)||kind==='trees'&&n.kind==='tree'||kind==='boulders'&&n.kind==='boulder'));
   if(kind==='all'){trainingFixtures.clear();cinder.reset();styles.reset();supplies.reset();destinations.reset();combatFixtures.clear();combat.clear();equipment.reset();carpentry.cancel();carpentryFixture.reset();willow.debug.reset();for(const id of Object.keys(ITEMS))inventory[id]=0;for(const skill of Object.values(playerSkills()))Object.assign(skill,{xp:0,level:1});Object.assign(inventory,{sticks:10,stones:10,axes:1,logs:0,hats:0,pickaxes:1,stone:0});tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);happyUntil=0;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=12;}
   if(tile.blocked){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}
   menus.refresh();
  },
  refresh:()=>{menus.refresh();equipment.refresh();},
  showItemChanges,
  color(value){body.material.color.set(value);expressionFace.setBodyColor(value);},
  faceTowardCamera(){facing=angle;player.rotation.y=angle;}
 });
}
mountJournal(menus,craftingTutorial,settingsUI);
createCompanionMenu(companions,{closeMenus:()=>menus.closeMenus()});
const splash=createSplash(renderer,!__PLAYGROUND__,settingsUI);
animate();
// Small read-only inspection surface for checking the prototype in a browser.
if(__PLAYGROUND__)window.quadriaquest={getState:()=>({render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},area:areas.id,travel:travel.state,tile:{x:tile.x,z:tile.z,h:tile.h},moving:!!segment||path.length>0,target:target?.id??null,gatherTime,inventory:{...inventory},gathering:{...gatheringSkill},crafting:{...craftingSkill},lumberjack:{...lumberjackSkill},mining:{...miningSkill},combat:{...combat.state,skill:{...combat.skill}},equipment:equipment.state,resourceAction:resourceActions.state,carpentry:{...carpentry.skill,action:carpentry.state},fishing:{...fishing.skill,action:fishing.state},tutorialStage:craftingTutorial.stage,finale:finale.state,willow:willow.state,cinder:cinder.state,smithing:{...smithing.skill,action:smithing.state},styles:styles.state,health:health.value,companion:{...companions.state},action:recipeCrafting.state,angle,elevation,zoom,profile:opening.profile,tutorialReady:opening.playable}),screenFor:(x,z)=>{const t=world.get(key(x,z));const p=new THREE.Vector3(x-6,t.h+.16,z-6).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};
