// Importing the RUN SDK initializes it and tells the RUN host the game is ready.
import '@series-inc/rundot-game-sdk/api';
import {createPlayerResources} from './player-resources.js';
import {createPlayerInterface} from './player-interface.js';
import {gameViewport,measureGameViewport} from './game-viewport.js';
import {cancelPlayerActions} from './action-interruption.js';
import {createAfterStep} from './after-step.js';
import {equipmentIdleHands,withGrip} from './combat-animation.js';
import {terrainHitData,createTerrainBatch} from './terrain-batch.js';
import {CINDERHOLD} from './cinderhold-rules.js';
import {createCinderhold} from './cinderhold.js';
import {createStationCrafting} from './station-crafting.js';
import {createDestinationMenu} from './destination-menu.js';
import {createModalHost,confirmModal} from './ui/modal.js';
import {createCombatStyles,SPELLS} from './combat-styles.js';
import {createCombatStyleMenu} from './combat-style-menu.js';
import {createCharacter,TRACKS} from './character.js';
import {createAuras} from './auras.js';
import {createControlState} from './control-effects.js';
import {createAssistance} from './assistance.js';
import {playerDefense} from './combat-profile.js';
import {createSupplyOffers} from './supply-offers.js';
import {createProjectileEffects} from './projectile-effects.js';
import {attackRoute,withinAttackRange} from './combat-range.js';
import {createCharacterDialogue} from './character-dialogue.js';
import {createNarrator} from './ui/hud/narrator.js';
import {createTip} from './ui/hud/tip.js';
import {messageToast,objectiveToast,levelUps} from './ui/hud/notices.js';
import {notice as objectiveNotice} from './quests.js';
import {levelNotice} from './skills.js';
import {createAreaRuntime} from './area-runtime.js';
import {createTravelSystem} from './travel.js';
import {createCrystals} from './crystals.js';
import {createWaking} from './waking.js';
import {createRenderQuality,QUALITY_TIERS,initialTier} from './render-quality.js';
import {createWallet,GOLD} from './economy.js';
import {createShops} from './shops.js';
import {createShopMenu} from './shop-menu.js';
import {tutorialChapter,TUTORIAL_CHAPTERS} from './tutorial-chapters.js';
import {portalSpawn} from './portal-spawn.js';
import {createCombatSystem} from './combat.js';
import {createEquipment,GEAR} from './equipment.js';
import {createCombatFeedback} from './combat-feedback.js';
import './combat.css';
import {blocksMovement,occupancy} from './world-occupancy.js';
import {pushWorldActor,updateWorldActors} from './world-actors.js';
import {configureDoors,updateDoors,doorApproach} from './doors.js';
import {updateCutaway,cutawayState,setCutHeight,CUT_HEIGHT} from './cutaway.js';
import {createMistWall,mistAt,updateMistWalls} from './mist-wall.js';
import {createCrystalPlaces} from './crystal-places.js';
import {mapCrystals} from './map-file.js';
import {createAtmosphere} from './atmosphere.js';
import {configureProps,createProp,seatPosition,takeLoot,updateProps} from './props.js';
import {createSpaces,entranceSpot} from './spaces.js';
import {createCrowd} from './townsfolk.js';
import {createResourceActions} from './resource-actions.js';
import {createAttackTelegraphs} from './attack-telegraph.js';
import {createResourceEntity} from './resource-entities.js';
import {createEnemyEntity} from './enemy-entity.js';
import {createCarpentrySystem} from './carpentry.js';
import {createFishingSystem} from './fishing.js';
import {createFishingSpots} from './fishing-spots.js';
import {createPlayerHealth,createFoodSystem,FOODS} from './player-health.js';
import {batch,effect,reactiveRecord,signal,untracked} from './reactive.js';
import {mount} from './ui/dom.js';
import {resourceMeter} from './ui/hud/meter.js';
import {healthPlate} from './ui/hud/health-plate.js';
import './player-health.css';
import './campfires.css';
import {createRecipeCrafting} from './recipe-crafting.js';
import {createCampfires} from './campfires.js';
import {createCookingSystem} from './cooking.js';
import {createCookingMenu} from './cooking-menu.js';
import {RECIPES as COOKING_RECIPES,canMake as canCookRecipe,durationFor as cookingDuration} from './recipes.js';
import {createCompanionSystem} from './companions.js';
import {createCompanionMenu} from './companion-menu.js';
import {makeAxe} from './axe-model.js';
import {createSlimePresentation} from './slime-presentation.js';
import {bodyCenter} from './footprint.js';
import {MENTORS} from './training-models.js';
import {interactionRoute} from './interaction-route.js';
import {makeSlime} from './slime-model.js';
import {makeFlowers,makeTerrainTile,addWaterTile} from './world-models.js';
import {createWillowbank} from './willowbank.js';
import {createGrassColors} from './grass-palette.js';
import {updateObjective,finishObjective,resetObjectives,registerQuestChapter,finishQuest,objectives} from './quests.js';
import {icon} from './icons.js';
import {createGameAudio} from './audio.js';
import {createSettingsMenu} from './settings-menu.js';
import {createPowersMenu} from './powers-menu.js';
import {mountJournal} from './journal.js';
import {BOULDER_TILES} from './mining.js';
import {ITEMS} from './items.js';
import {createWaterEffects,createStreamedWater,waterSettings} from './water-effects.js';
import {makeBridge} from './bridge-model.js';
import {createWallSentries} from './wall-sentries.js';
import {createGroundCoverPool,chunkedCover} from './ground-cover.js';
import {cityGreens} from './city-greens.js';
import './ui-theme.css';
import './player-interface.css';
import './ui/ui.css';
import {createSplash} from './splash.js';
import {socialMotion,createIdleClock,SLEEP_SETTLE} from './slime-social.js';
import {createSleepFeedback} from './sleep-feedback.js';
import {createTutorialFinale} from './tutorial-finale.js';
import {createItemFeed} from './item-feedback.js';
const gameAudio=createGameAudio(),itemFeed=createItemFeed(icon);
window.addEventListener('quadriaquest-level',()=>gameAudio.cue('level'));
// Quest cues by notice kind (quests.js): progress climbs the scale in the current song's key; a
// finished part, objective or quest has its own cue. A level-up at the same moment wins.
effect(()=>{const n=objectiveNotice.value;if(n)untracked(()=>gameAudio.cue(n.kind,n.part&&n.kind==='progress'?n.part.current/n.part.total:n.total?n.current/n.total:0));});
import * as THREE from 'three';
import {makeWorld,findPath,canReach,key,SPAWN,canMove as stepAllowed,DIAGONAL_MOVES} from './world.js';
import {chunkId,CHUNK} from './world-grid.js';
import {createFeedback} from './feedback.js';
import {createContactShadow} from './contact-shadow.js';
import {createOpening} from './opening.js';
import {createCraftingTutorial} from './crafting-tutorial.js';
import {createGameMenus} from './game-menus.js';
import {createGatheringSkill,showSkillReward,updateSkillRewards,clearSkillRewards,onSkillXp,grantSkillXp} from './skills.js';
import {rollDrops,dropOdds,seededRandom} from './drops.js';
import {ENEMIES} from './combat-rules.js';
import {createLootPiles} from './loot-piles.js';
import {createJobs} from './jobs.js';
import {jobBoard} from './ui/dialogs/job-board.js';
import {createTownsfolkTalk} from './townsfolk-talk.js';
import {SHOPS} from './shops.js';
import {idlePose,moveMotion,standHeight} from './slime-motion.js';
const $=id=>document.getElementById(id),world=makeWorld(),scene=new THREE.Scene();scene.background=new THREE.Color('#e5e9df');
// Antialiasing is fixed at creation, so it follows the saved quality tier (render-quality.js).
const renderer=new THREE.WebGLRenderer({antialias:QUALITY_TIERS[initialTier()].antialias});renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setSize(innerWidth,innerHeight);$('game').appendChild(renderer.domElement);
// The world editor's Walls preview clips its stand-in wall at the cut, as cut walls are (playground only).
if(__PLAYGROUND__)renderer.localClippingEnabled=true;
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
// Free camera (playground only; docs/PLAYGROUND.md): the camera leaves the slime and moves on its own,
// panned with WASD (Shift: faster) or a middle-button drag, zoomed much farther out. The land, towns and
// the sun's shadows follow the camera instead of the slime while it's on.
let freeCam=null;const panKeys=new Set(),freeCamOn=signal(false);
// The floor of an editor building you stand in (playground: the world editor's floors), or null.
const floorHere=signal(null);
if(__PLAYGROUND__){
 addEventListener('keydown',e=>{if(!freeCam||e.altKey||e.ctrlKey||e.metaKey)return;const k=e.key.toLowerCase();if(!['w','a','s','d','shift'].includes(k))return;
  if(e.target instanceof Element&&e.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))return;panKeys.add(k);});
 addEventListener('keyup',e=>panKeys.delete(e.key.toLowerCase()));addEventListener('blur',()=>panKeys.clear());
}
const hemisphere=new THREE.HemisphereLight('#fffce8','#879981',2.6);scene.add(hemisphere);const sun=new THREE.DirectionalLight('#fff3d3',3);sun.position.set(-8,19,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,far:80});sun.shadow.normalBias=.008;scene.add(sun);
// A light haze everywhere, thickened and tinted with the light by the biome under the view (atmosphere.js).
const atmosphere=createAtmosphere({scene,hemisphere,sun}),atmosphereOn=signal(true);
// Resolution, shadow map and shadow cadence by tier; Auto starts software rendering on Low and steps down when slow.
const quality=createRenderQuality({renderer,light:sun,rendererName:(()=>{const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'';})(),onChange:()=>resize?.()});
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.9,...extra});
const grass=createGrassColors().map(color=>mat(color)),rock=mat('#a5ada6'),wood=mat('#a98a64');
function mesh(geometry,material,parent=scene){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const pickables=[];
// Each tile is flush against equal-height neighbors. Only exposed top edges
// receive the three-segment bevel; tile seams are separately drawn on top.
let idx=0;const waterEffects=createWaterEffects(scene,renderer),grassFor=new Map();
for(const t of world.values()){
 if(t.water){for(const m of addWaterTile(scene,t,world,waterEffects)){m.userData.tile=t;pickables.push(m);}}else grassFor.set(t,grass[idx++%4]);
}
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);// The floor under the world (click misses land on it): large, and kept under the view in 100-unit steps
// (updateAtmosphere; moving it every step redrew the shadows each frame), so every map has it under all its tiles.
const ground=mesh(new THREE.PlaneGeometry(2400,2400),mat('#e5e9df'));ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.castShadow=false;
const trees=[];
for(const t of world.values())if(t.blocked&&!t.water)trees.push(createResourceEntity({kind:BOULDER_TILES.has(key(t.x,t.z))?'boulder':'tree',tile:t,parent:scene,pickables}));
createTerrainBatch({tiles:[...grassFor.keys()],map:world,factory:t=>makeTerrainTile(t,world,grassFor.get(t)),parent:scene,pickables,preserve:grass,roughness:.9,
 decorate(t,model){if(!t.blocked&&(t.x*17+t.z*13)%7===0){const flowers=makeFlowers();flowers.position.y=t.h;model.add(flowers);}}});
const resourceSpecs=[[4,6,'sticks'],[5,3,'stones'],[8,3,'sticks'],[7,7,'stones'],[9,9,'sticks'],[4,10,'stones']],resources=[];
resourceSpecs.forEach(([x,z,kind],id)=>resources.push(createResourceEntity({kind,tile:world.get(key(x,z)),parent:scene,pickables,id})));
const clearingObjects=scene.children.filter(object=>!object.isLight);
const clearingGroup=new THREE.Group();scene.add(clearingGroup);for(const object of clearingObjects)if(object!==ground)clearingGroup.add(object);
for(const object of clearingObjects)object.visible=false;
const introTile=new THREE.Group();scene.add(introTile);introTile.position.set(0,0,-2);
introTile.add(makeTerrainTile({x:0,z:0,h:1},new Map(),grass[0]));
const playerModel=makeSlime(),player=playerModel.group,body=playerModel.body,expressionFace=playerModel.face,hands=playerModel.hands;scene.add(player);
// The player renders through the shared slime presentation, like every NPC slime (AGENTS.md).
const presentation=createSlimePresentation(playerModel,{equipment:()=>equipment,tools:{axe:()=>makeAxe({wood,rock})}}),visual=presentation.visual;
let facing=0,happyUntil=0,playerFace='idle';
// Every successful finish (gathering, chopping, mining, crafting, smithing, smelting, cooking, carpentry,
// fishing) gives the player a moment of happy face.
const succeeded=()=>{happyUntil=Math.max(happyUntil,elapsed+1.2);};
const gatheringSkill=createGatheringSkill();
const craftingSkill=createGatheringSkill(),lumberjackSkill=createGatheringSkill(),miningSkill=createGatheringSkill();
let chopTarget=null,actorTarget=null,actorTime=0;
let tile=world.get(key(SPAWN.x,SPAWN.z)),path=[],segment=null,target=null,gatherTime=0,inventory=reactiveRecord({sticks:0,stones:0,axes:0,logs:0,hats:0,pickaxes:0,stone:0});for(const id of Object.keys(ITEMS))inventory[id]??=0;player.position.set(tile.x-6,tile.h,tile.z-6);
const feedback=createFeedback(scene);
const contactShadow=createContactShadow(scene,world);
const idleClock=createIdleClock(),sleepFeedback=createSleepFeedback(scene);
// Orbit drags, pinches and camera keys do not count as wake-up actions.
document.addEventListener('click',event=>{if(event.target===renderer.domElement){if(!opening.playable)idleClock.wake();return;}idleClock.wake();},{capture:true});
document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.closest?.('#dialogue'))idleClock.wake();},{capture:true});
const introSpawn=new THREE.Vector3(0,1,-2);
const clearingSpawn=new THREE.Vector3(tile.x-6,tile.h,tile.z-6);
let debug=null;
const playground=__PLAYGROUND__?await import('./dev/playground.js'):null;
const perfProbe=__PLAYGROUND__?playground.createPerfProbe({renderer,scene}):null;let playgroundApi=null;
// The narrator's dialogue box ("???"): the opening, tutorials and areas show lines through it.
const narrator=createNarrator();
// The tutorial tip card: lessons and area chapters show guidance through it.
const tip=createTip();
// Brief notices: blocked-action messages, quest progress and level-ups (item receipts: createItemFeed).
let messages;
for(const build of [()=>(messages=messageToast()).node,()=>objectiveToast({notice:objectiveNotice}),()=>levelUps({notice:levelNotice})])document.body.append(mount(build).node);
const opening=(playground?.createFreeOpening||createOpening)({narrator,tip,player,visual,face:expressionFace,introSpawn,spawn:clearingSpawn,onComplete:()=>craftingTutorial.start(),onHandChosen:side=>equipment.setHandedness(side),onModeChosen:mode=>assistance?.setMode(mode),onSkipTutorial:()=>waking.start({skip:true}),onFirstLevel:done=>craftingTutorial.startSkills(done),onFirstQuest:done=>craftingTutorial.startQuests(done),
 setColor(color){body.material.color.set(color);expressionFace.setBodyColor(color);},
 showClearing(){clearingGroup.visible=true;for(const object of clearingObjects)object.visible=true;introTile.visible=false;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=22;}
});
const playerOccupant={kind:'player'},companionOccupant={kind:'companion'};
// Seeing into and past buildings (cutaway.js); the playground can switch it off to compare.
let forceCutaway=false;
// Sitting on a bench (props.js): the seat you sit on, the one you're walking to.
let seat=null,pendingSeat=null,wasSeated=false;
// Playground: the world editor takes world clicks while it is in Edit mode.
// Set by the playground's world editor host (it knows the map being edited).
let updateFloorHere=()=>{};
let tileClick=null,tileDrag=null,painting=false,tileHover=null,hoverTileId=null;
// The tile under the pointer, for the world editor's previews (playground): told only when it changes.
// The world editor's tile under the pointer: a click on the side of a raised tile (a cliff's face) means the
// ground that face looks onto, not the top above it (docs/TOWN.md, Raising beside a step).
function editorTile(hit,data=terrainHitData(hit)){let t=data?.tile||data?.actor?.tile||null;const n=hit?.face?.normal;
 if(t&&data?.tileForFace&&n&&Math.abs(n.y)<.5){const beside=world.get(key(t.x+Math.round(n.x),t.z+Math.round(n.z)));if(beside&&beside.h<t.h)t=beside;}return t;}
// Told again as the pointer moves within a tile (a quarter tile at a time), with its ray, so the editor can aim at walls.
function hoverTile(e){const hit=pick(e),data=terrainHitData(hit),at=editorTile(hit,data),p=hit?.point,id=at?`${at.x},${at.z},${p?[p.x,p.z].map(v=>Math.round(v*4)).join(','):''}`:'';if(id===hoverTileId)return;hoverTileId=id;tileHover?.(at,p||null,raycaster.ray.clone());}
let edgeFixtures,movementFixtures,walkThroughFixtures,waking,assistance,finale,willow,companions,cooking,cookingMenu,campfires,recipeCrafting,food,fishing,carpentry,carpentryFixture,resourceActions,combat,equipment,combatFixtures,cinder,smithing,styles,styleMenu,destinations,trainingFixtures,furnaceMenu,anvilMenu;
const fishingSpots=createFishingSpots({scene,world,pickables,hover:()=>hover?.actor});
let playerInterface;
const playerResources=createPlayerResources();
const health=createPlayerHealth(),healthVisible=signal(false);
// The player UI (vitals, sidebar or tab bar) shows once play starts, or earlier when the first-quest
// line reveals the menus ahead of the camera lessons.
// The world editor's full-screen mode (playground) hides the player interface: the world fills the window.
let editorScreen=false;
const playerUiShown=()=>(opening.playable||!menus.host.hidden)&&!(__PLAYGROUND__&&editorScreen);
document.body.append(mount(()=>resourceMeter({id:'player-health',kind:'health',label:'Health',resource:health,hidden:()=>!healthVisible.value})).node);
// Player health plate just above the slime (floating XP starts above it): shown in combat, whenever
// health is below full, and while a control effect is active.
let playerPlate;document.body.append(mount(()=>{playerPlate=healthPlate({kind:'player',value:()=>health.value,max:()=>health.max});return playerPlate.node;}).node);
const plateAnchor=new THREE.Vector3(),PLAYER_PLATE_LIFT=1;
function updatePlayerPlate(){
 // Control effects (stunned, slowed…) ride on the player's plate, which also shows while one is active.
 const effects=playerControl.kinds;playerPlate.effects.value=effects.join(',');
 const show=opening.playable&&!splash.active&&!travel.busy&&health.value>0&&(combat.inCombat||health.value<health.max||effects.length>0);
 playerPlate.visible.value=show;if(!show)return;
 plateAnchor.copy(player.position);plateAnchor.y+=PLAYER_PLATE_LIFT;plateAnchor.project(camera);
 const view=gameViewport();playerPlate.place(view.left+(plateAnchor.x+1)*view.width/2,view.top+(1-plateAnchor.y)*view.height/2);
}
// Resource maxima follow capacity attributes; current amounts are kept and only clamped.
const character=createCharacter({changed(){const m=character.maxima;health.max=m.health;for(const k of ['mana','stamina','energy','ki'])playerResources[k].max=m[k];}});
// Player control effects (stun/immobilize/slow and protection) use the same shared state as enemies.
const playerControl=createControlState();
// Non-combat skill XP joins combat XP in the one core conversion (5:1); core level-ups grant attribute points.
onSkillXp(amount=>{const core=character.convertProgression(amount);if(core?.leveledUp)showSkillReward({skillName:'Core',level:core.level,leveledUp:true,detail:`+${core.points} attribute points`},player.position,{float:false});return core;});
const auras=createAuras({ki:playerResources.ki,exhausted:()=>{assistance?.auraExhausted();toast('Out of Ki — all auras faded. Ki recovers while they are off.');}});
// Per-item settings in the inventory detail. Food: whether Auto may eat it (a per-item permission;
// docs/COMBAT.md, Modes, policies and overrides).
function itemSettings(id){
 if(!FOODS[id]||!assistance)return [];
 return [{label:'Allow auto eating',checked:()=>(assistance.revision.value,assistance.allowed('food',id)),onChange:on=>assistance.setPermission('food',id,on)}];
}
// Several systems (food, campfires, equipment, assistance, fishing, cooking…) are created after the
// menus; the Inventory and Skills pages track this signal so they follow them once they exist.
const systemsReady=signal(false);
const menus=createGameMenus({getInventory:()=>inventory,getSkills:()=>playerSkills(),getCharacter:()=>character,trackSkills:()=>{systemsReady.value;character.revision.value;},startCraft:id=>recipeCrafting.start(id),craftActive:()=>(systemsReady.value,recipeCrafting?.activeId??null),items:{settings:itemSettings,isEquipped:id=>equipment?.isEquipped(id),track:()=>{systemsReady.value;equipment?.revision.value;assistance?.revision.value;companions?.revision.value;},actions:id=>[...(food?.inventoryActions(id)||[]),...(id==='cookedFish'?[{label:'Use as quick food',run:()=>playerInterface?.assignFood(id)}]:[]),...(campfires?.inventoryActions(id)||[]),...(equipment?.inventoryActions(id)||[]),...(companions?.inventoryActions(id)||[])]}});
const craftingTutorial=createCraftingTutorial({menus,narrator,tip,freePlay:__PLAYGROUND__,onComplete:()=>finale.begin()});
// Combat skills always list; proficiencies and armor skills appear once trained (Unarmed from the start).
// Combat skills always list; proficiencies (Unarmed included) appear once they have XP.
function combatSkills(){const out={};for(const d of TRACKS){const t=character.tracks[d.id];if(d.group==='combat'||t.xp>0)out[d.name]=t;}return out;}
function playerSkills(){return {Gathering:gatheringSkill,Crafting:craftingSkill,Lumberjack:lumberjackSkill,Mining:miningSkill,...(fishing?{Fishing:fishing.skill}:{}),...(carpentry?{Carpentry:carpentry.skill}:{}),...combatSkills(),...(cooking?{Culinary:cooking.skill}:{}),...(smithing?{Smithing:smithing.skill}:{})};}

const clearingTiles=new Map(world);
const areas=createAreaRuntime({world,beforeSwitch(){combat?.clear();stopAll();},placePlayer(landing){tile=landing;player.position.set(tile.x-6,tile.h,tile.z-6);},applyCamera(view){quality.settle();if(view.zoom!==undefined)zoom=view.zoom;if(view.angle!==undefined)angle=view.angle;if(view.elevation!==undefined)elevation=view.elevation;scene.background.set(view.background||'#e5e9df');ground.material.color.copy(scene.background);}});
// Iter Crystal destinations: each map crystal is one of its own, listed once discovered (crystal-places.js).
const crystalPlaces=createCrystalPlaces();
const travel=createTravelSystem({areas,places:crystalPlaces,stop:stopAll,blocked:()=>!areas.canMove||combat?.busy||combat?.working,
 occupied:t=>companions?.occupies(t),fade(value){$('scene-fade').hidden=value===0;$('scene-fade').style.opacity=String(value);},failed:()=>toast('There’s no safe space beside the destination crystal.')});

// Separate interiors, stairwells and dungeons (spaces.js): a quick fade between spaces of any map.
const spaces=createSpaces({areas,scene,pickables,stop:stopAll,fade(value){$('scene-fade').hidden=value===0;$('scene-fade').style.opacity=String(value);},
 // Through stairs you arrive facing the way you'd have walked off them (spaces.js stepOff): face [dx, dz].
 arrived(landing,face){companions.resetRoute(landing);if(face&&(face[0]||face[1])){facing=Math.atan2(face[0],face[1]);player.rotation.y=facing;}if(__PLAYGROUND__)updateFloorHere();},view:{get:()=>({zoom,angle,elevation}),set(v){zoom=v.zoom;angle=v.angle;elevation=v.elevation;}}});// Iter Crystal services share one restoration: full refill of all five pools after recalculating maxima.
// Restore keeps active auras (and their upkeep) and just announces itself; respec turns them off and refunds invested attribute points.
function crystalRestore(){health.max=character.maxima.health;health.restore();playerResources.restoreAll();}
// Utility dialogs (stations, destinations, naming, confirmations) share one modal host.
const modals=createModalHost();
const settingsUI=createSettingsMenu({audio:gameAudio,quality,modals});
// Draw distance (Settings; render-quality.js): the chunks streamed around you, for every streamed land
// and town, and the camera's far plane to match.
const drawRadius=()=>quality.drawDistance.peek(),streamedWorlds=new Set();
let baseFar=120;
effect(()=>{const r=quality.drawDistance.value;baseFar=camera.far=120+(r-1)*72;camera.updateProjectionMatrix();for(const w of streamedWorlds){if(w.streamer)w.streamer.radius=r;if(w.builtMap?.streamRadius!=null)w.builtMap.streamRadius=r;}});
// Once Cinderhold is complete, the crystals offer "???": ending the tutorial (waking.js).
destinations=createDestinationMenu({modals,areas,travel,places:crystalPlaces,stop:stopAll,blocked:()=>!canMove()||combat?.working,
 extras:()=>cinder?.tutorialComplete&&!waking?.isWoken?[{id:'awaken',name:'???',description:'Somewhere beyond the dream',
  choose(){confirmModal(modals,{id:'end-tutorial',title:'???',message:'Do you wish to end the tutorial now?',confirm:'Yes',cancel:'Not yet',onConfirm:()=>waking.start()});}}]:[],
 services:{
 restore(){if(combat.inCombat)return 'Not available during combat.';crystalRestore();toast('You have been fully restored!');return null;},
 respec(){if(combat.inCombat)return 'Not available during combat.';auras.deactivateAll();const refund=character.redistribute();crystalRestore();return `${refund} attribute point${refund===1?'':'s'} returned to spend in Skills. Auras turned off; resources restored.`;}}});
const crystals=createCrystals({world,pickables,travel,choose:(a,after)=>{discoverCrystal(a);return destinations.open(a,after);},hover:()=>hover?.actor});
// Walking up to a map's Iter Crystal (or using it) discovers it: from then on you can teleport to it.
function discoverCrystal(actor){if(actor?.place&&crystalPlaces.discover(actor.place))messages.show(`Iter Crystal discovered: ${crystalPlaces.get(actor.place)?.name||actor.place}`);}
function discoverNearbyCrystals(){for(const c of crystals.current())if(c.place&&Math.abs(tile.x-c.x-.5)<=4.5&&Math.abs(tile.z-c.z-.5)<=4.5)discoverCrystal(c);}
const afterStep=createAfterStep({moving:()=>!!segment,prepare(label){cancelWork({keepCombat:label==='Eating',keepFood:label==='Eating'});path=[];target=null;gatherTime=0;menus.action();feedback.destination(segment.to);}});
function stopAll(options){cancelWork(options);path=[];segment=null;target=null;gatherTime=0;player.position.set(tile.x-6,standHeight(tile),tile.z-6);feedback.clearDestination();if(options?.keepMenu)menus.action();else menus.closeMenus();cookingMenu?.close();furnaceMenu?.close();anvilMenu?.close();}
companions=createCompanionSystem({scene,world,player,pickables,feedback,inventory,
 toPosition:t=>new THREE.Vector3(t.x-6,t.h,t.z-6),tileAtPosition:p=>world.get(key(Math.round(p.x+6),Math.round(p.z+6))),
 tile:()=>tile,approaching:()=>actorTarget,occupied:t=>t===tile||t===segment?.to||!!combat?.occupies(t)||npcAt(t),reserved:t=>!!t&&(segment?.to===t||path.includes(t)||campfires?.placementTile===t),
 busy:()=>combat?.working,moving:()=>!!segment||path.length>0,playerSleepTime:()=>idleClock.sleepTime,blocked:()=>areas.busy||travel.busy,
 stop:()=>stopAll({keepMenu:true}),face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},
 // Following (companion-follow.js): the player's next tile and facing, walking bonuses, and sprinting.
 nextTile:()=>segment?.to||path[0]||null,facing:()=>facing,pace:()=>1+walkBonus(),sprinting:()=>playerResources.sprint&&(!!segment||path.length>0)
});
const combatFeedback=createCombatFeedback();
// Equipment changes are allowed mid-fight (docs/COMBAT.md, Equipment changes): changing what a hand holds
// interrupts the attack that has not landed, OSRS-style; armor and hats don't touch it.
let handsKey='';
equipment=createEquipment({inventory,busy:()=>!canMove()||companions?.working||resourceActions?.working||carpentry?.working||fishing?.working||food?.working||cooking?.working||recipeCrafting?.working||smithing?.working,changed:()=>{styles?.select(null);const key=`${equipment.slots.right}|${equipment.slots.left}`;if(key!==handsKey)combat?.handsChanged();handsKey=key;}});
handsKey=`${equipment.slots.right}|${equipment.slots.left}`;
// Spell selection may change mid-fight (docs/COMBAT.md); it applies from the next attack.
styles=createCombatStyles({equipment,busy:()=>combat?.busy||smithing?.working||recipeCrafting?.working||!canMove()});
const supplies=createSupplyOffers({inventory,changed:showItemChanges});
const projectiles=createProjectileEffects(scene),telegraphs=createAttackTelegraphs(scene);
combat=createCombatSystem({playerMoving:()=>!!segment||path.length>0,telegraph:(owner,tiles,progress)=>telegraphs.show(owner,tiles,progress),world,player,health,equipment,inventory,character,control:playerControl,canAttack:a=>assistance?assistance.canAttack(a):true,shouldRetaliate:a=>assistance?assistance.shouldRetaliate(a):combat.autoRetaliate,passive:()=>!!assistance?.attacksPrevented,mana:playerResources.mana,energy:playerResources.energy,knowsAbility:id=>styles.knowsAbility(id),knowsSpell:id=>styles.knowsSpell(id),danger:a=>assistance?.danger?.enemy===a?assistance.danger.band:null,resistanceBonus:()=>auras.resistancePct,strategy:()=>styles.strategy,attack:()=>styles.attack,toast,items:changes=>showItemChanges(changes,{sound:null}),projectile:(...args)=>projectiles.launch(...args),clearProjectiles:()=>projectiles.clear(),stop:()=>stopAll({keepCombat:true,keepFood:true,keepMenu:true}),defeatStop:stopAll,
 attacked:()=>playerInterface?.attacked(),interrupt:()=>cancelWork({keepCombat:true,keepFood:true}),retaliate:a=>selectActor(a),eating:()=>food?.working,
 blocked:()=>!areas.canMove||travel.busy,
 inReach:a=>!segment&&!path.length&&withinAttackRange(world,tile,a,attackRange()),
 tile:()=>tile,reserved:t=>t===segment?.to||path.includes(t)||campfires?.placementTile===t||companions.occupies(t)||npcAt(t),
 approaching:()=>actorTarget,hover:()=>hover?.actor,face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},
 safe:p=>p.safe||pickables.some(m=>{const a=m.userData.actor;return a&&a.crystal&&world.get(key(a.tile.x,a.tile.z))===a.tile&&Math.abs(p.x-a.x-.5)+Math.abs(p.z-a.z-.5)<4;}),
 hit:(p,damage,outcome)=>combatFeedback.show(p,damage,outcome),sound:name=>gameAudio.play(name),soundStart:(name,arg)=>gameAudio.start(name,arg),clearFeedback:()=>combatFeedback.clear(),
 reward:r=>{const [first,...rest]=r.tracks.filter(t=>t.xp>0);if(first)showSkillReward(first,player.position);for(const t of rest)if(t.leveledUp)showSkillReward(t,player.position,{float:false});if(r.core.leveledUp)showSkillReward({skillName:'Core',level:r.core.level,leveledUp:true,detail:`+${r.core.points} attribute points`},player.position,{float:false});},// Victory: a happy face, the victory sound, the enemy's drops, and areas hear about it (one handler:
 // an object literal keeps only the last `won`).
 won:(a,profile)=>{happyUntil=elapsed+1.6;gameAudio.play('victory');dropLoot(a);areas.broadcast('combatWon',a,profile);},complete:()=>feedback.complete(),interacting:()=>feedback.interacting('Fighting'),
 fade(value){$('scene-fade').hidden=value===0;$('scene-fade').style.opacity=String(value);},
 respawn(){const crystals=[...new Set(pickables.map(m=>m.userData.actor).filter(a=>a&&a.crystal&&world.get(key(a.tile.x,a.tile.z))===a.tile))];
  const free=t=>t&&!t.blocked&&!t.water&&!companions.occupies(t);
  const landing=crystals.map(a=>portalSpawn(world,a.tile)).find(free)||[...world.values()].filter(free).sort((a,b)=>Math.hypot(a.x-tile.x,a.z-tile.z)-Math.hypot(b.x-tile.x,b.z-tile.z))[0];
  if(!landing)return false;tile=landing;player.position.set(tile.x-6,tile.h,tile.z-6);return true;},
 respawned(){playerControl.reset();toast('Recovered safely. Your items and progress are intact.');}
});
resourceActions=createResourceActions({world,inventory,skills:{Gathering:gatheringSkill,Lumberjack:lumberjackSkill,Mining:miningSkill},
 stop:()=>stopAll({keepMenu:true}),busy:()=>!canMove()||combat?.working,inReach:node=>!segment&&!path.length&&interactionRoute(world,tile,node)?.route.length===0,
 tile:()=>tile,reserved:t=>t===tile||t===segment?.to||path.includes(t)||campfires?.placementTile===t||characterAt(t),
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},toast,sound:name=>gameAudio.play(name),
 started(node,rules){feedback.destination(tile);feedback.interacting(rules.motion);},interacting:kind=>feedback.interacting(kind),completed(){feedback.complete();},cancelled(){feedback.clearDestination();},
 rewarded(node,changes,reward){areas.broadcast('resourceCompleted',changes);jobs.gathered(changes);showSkillReward(reward,player.position);showItemChanges(changes);succeeded();
  if(clearingTiles.get(key(node.x,node.z))===node.tile){if(node.kind==='tree')craftingTutorial.chopped(changes.logs);else if(node.kind==='boulder')craftingTutorial.mined();else {gatherTime=0;$('tooltip').style.display='none';updateUI(reward);}}
 }
});
for(const node of [...trees,...resources])resourceActions.add(node);
carpentry=createCarpentrySystem({inventory,stop:()=>stopAll({keepMenu:true}),busy:()=>!canMove()||combat?.working,
 inReach:target=>!segment&&!path.length&&interactionRoute(world,tile,target)?.route.length===0,
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},toast,
 started(){feedback.destination(tile);feedback.interacting('Repairing');gameAudio.play('hammer');},
 completed(changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();succeeded();},cancelled(){feedback.clearDestination();}
});
fishing=createFishingSystem({inventory,stop:()=>stopAll({keepMenu:true}),busy:()=>!canMove()||combat?.working,
 inReach:spot=>!segment&&!path.length&&interactionRoute(world,tile,spot)?.route.length===0,
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},toast,
 started(){feedback.destination(tile);feedback.interacting('Fishing');gameAudio.play('cast');},
 caught(changes,reward){jobs.gathered(changes);showItemChanges(changes,{sound:'catch'});showSkillReward(reward,player.position);succeeded();},
 completed(){feedback.complete();},cancelled(){presentation.clearFishing();feedback.clearDestination();}
});
food=createFoodSystem({inventory,health,defer:afterStep.defer,busy:()=>!canMove()||areas.working,stop:()=>stopAll({keepCombat:true,keepFood:true,keepMenu:true}),
 started(){feedback.destination(tile);feedback.interacting('Eating');},
 // Effects apply at initiation: the meal also cancels an unreleased attack windup and clears the pending action.
 consumed(changes){showItemChanges(changes,{sound:'eat'});areas.notify('foodEaten');combat?.consumableUsed();},
 completed(){feedback.complete();},
 confirm:confirmFood});
function confirmFood(proceed){const dialog=confirmModal(modals,{id:'food-confirm',title:'Eat at full health?',message:'Your health is already full. Eat this anyway?',confirm:'Eat anyway',onConfirm:proceed});return ()=>dialog.close('cancelled');}
cooking=createCookingSystem({inventory,stop:()=>stopAll({keepMenu:true}),busy:()=>!canMove()||combat?.working,
 started(){feedback.destination(tile);feedback.interacting('Cooking');gameAudio.play('sizzle');},
 completed(changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();succeeded();},
 cancelled(){feedback.clearDestination();}
});
cookingMenu=createCookingMenu({modals,recipes:COOKING_RECIPES,items:ITEMS,inventory,canMake:canCookRecipe,duration:seconds=>cookingDuration(seconds,cooking.skill.level),onCook:(id,station)=>cooking.start(id,station)});
recipeCrafting=createRecipeCrafting({inventory,skill:craftingSkill,defer:afterStep.defer,
 busy:()=>combat?.busy||combat?.working||areas.busy||travel.busy||companions?.working||resourceActions?.working||carpentry?.working||fishing?.working||food?.working||cooking?.working||smithing?.working,
 progressed(age,dt){if(Math.floor((age-dt)/.45)!==Math.floor(age/.45))gameAudio.play('craft');},
 stop:()=>stopAll({keepMenu:true}),started(id){areas.notify('craftStarted',id);feedback.destination(tile);feedback.interacting('Crafting');},
 completed(id,changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();succeeded();updateUI();areas.notify('crafted',id);},cancelled(){feedback.clearDestination();areas.notify('craftCancelled');}
});
campfires=createCampfires({scene,world,pickables,inventory,cookingMenu,feedback,tile:()=>tile,defer:afterStep.defer,
 busy:()=>!canMove()||combat?.working,stop:()=>stopAll({keepMenu:true}),closeMenus:()=>menus.action(),approach:selectActor,toast,showItems:showItemChanges,
 occupied:t=>!!t&&(t===tile||t===segment?.to||companions.occupies(t)||pickables.some(m=>{const a=m.userData.actor||m.userData.resource||m.userData.tree;return a&&m.userData.tile===t&&isVisible(m)&&!a.opened&&!a.depleted;})),
 hover:()=>hover?.actor,guide:()=>areas.active?.campfireGuide,
 onPlaced:a=>{gameAudio.play('ignite');areas.notify('campfirePlaced',a);},onCooked:(id,a)=>areas.notify('campfireCooked',id,a)
});
smithing=createStationCrafting({inventory,stop:()=>stopAll({keepMenu:true}),busy:()=>!canMove()||combat.working,
 inReach:a=>!segment&&!path.length&&interactionRoute(world,tile,a)?.route.length===0,
 started(a){facing=Math.atan2(a.x-tile.x,a.z-tile.z);feedback.destination(tile);feedback.interacting(a.kind==='anvil'?'Smithing':'Smelting');gameAudio.play(a.kind==='anvil'?'anvil':'furnace');},
 completed(id,changes,reward){showItemChanges(changes);showSkillReward(reward,player.position);feedback.complete();succeeded();areas.broadcast('stationCrafted',id);},cancelled(){feedback.clearDestination();}
});
const stationOptions={modals,recipes:COOKING_RECIPES,items:ITEMS,inventory,canMake:canCookRecipe,duration:seconds=>cookingDuration(seconds,smithing.skill.level),onCook:(id,station)=>smithing.start(id,station)};
furnaceMenu=createCookingMenu({...stationOptions,kind:'furnace'});anvilMenu=createCookingMenu({...stationOptions,kind:'anvil'});
const openStation=a=>(a.kind==='furnace'?furnaceMenu:anvilMenu).open(a);
// Portraits mirror a model's descendants (the slime presentation's motion lives below the root), so pass
// the player's root like every NPC's.
const characterDialogue=createCharacterDialogue({player:()=>({name:opening.profile.name||'Pip',model:player})});
willow=createWillowbank({narrator,tipBox:tip,dialogue:characterDialogue,scene,world,crystals,renderer,player,visual,hands,pickables,inventory,feedback,companions,cookingMenu,campfires,health,food,fishing,fishingSpots,carpentry,resourceActions,
 playerWorking:()=>!!actorTarget||companions.working||resourceActions.working||carpentry.working||fishing.working||food.working||cooking.working||recipeCrafting.working,
 playerSleepTime:()=>idleClock.sleepTime,approaching:()=>actorTarget,occupied:t=>t===tile||t===segment?.to,routeContains:t=>segment?.to===t||path.includes(t),tile:()=>tile,hover:()=>hover?.actor||hover?.tree||hover?.resource,moving:()=>!!segment||path.length>0,profile:()=>opening.profile,
 walkRoute(route){path=[...route];},
 stop:stopAll,toast,showItems:showItemChanges,approach:selectActor,sound:name=>gameAudio.play(name),
 face(x,z){facing=Math.atan2(x-tile.x,z-tile.z);},
 teleport(t){if(!t)return;path=[];segment=null;tile=t;player.position.set(t.x-6,t.h,t.z-6);},
 showTabs:(...ids)=>{for(const id of ids)menus.panels.setAvailable(id,true);},menuCovering:()=>journal.covering,
 showTip:(...args)=>craftingTutorial.showChapterTip(...args),say:(...args)=>craftingTutorial.sayChapter(...args),
 openInventory:()=>menus.openInventory(),guideMenu:value=>menus.guide(value),closeMenus:()=>menus.closeMenus()
});
finale=createTutorialFinale({narrator,tip,destination:'willowbank',parent:clearingGroup,tiles:clearingTiles,spawn:clearingTiles.get(key(SPAWN.x,SPAWN.z)),active:()=>areas.id==='clearing',crystals,player,visual,trees,resources,pickables,inventory,
 getTile:()=>tile,getAngle:()=>angle,stop:stopAll,showItemChanges,approach:selectActor,
 clearFalling(){resourceActions.resetWhere(n=>clearingTiles.get(key(n.x,n.z))===n.tile);},
 ensureClearSpawn(){if(trees.some(t=>t.x===tile.x&&t.z===tile.z)){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}},
 });
areas.register({id:'clearing',name:'The Clearing',music:'clearing',ambience:'meadow',listed:()=>!waking?.isWoken,description:'Resources & crafting',camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},group:clearingGroup,tiles:clearingTiles,arrival:()=>finale.ensurePortal()?.tile,
 get busy(){return finale.busy;},get canMove(){return opening.canMove&&!craftingTutorial.blocksMovement;},get canOrbit(){return opening.canOrbit;},
 get cameraFocus(){return finale.cameraFocus;},get celebration(){return finale.celebration;},
 enter(){ground.visible=true;introTile.visible=false;},
 update(dt,time,camera,hover){waterEffects.update(dt);opening.update(dt);if(opening.playable)finale.update(dt,time,hover);},
 craftStarted:id=>craftingTutorial.craftStarted(id),crafted:id=>craftingTutorial.craftComplete(id),craftCancelled:()=>craftingTutorial.craftCancelled(),
 interact:a=>finale.interact(a),clearUI:()=>finale.debugCancel?.(),
});
areas.register({id:'willowbank',name:'Willowbank',music:'willowbank',ambience:'river',listed:()=>!waking?.isWoken,recommendedDestination:'cinderhold',description:'Fishing, cooking & healing',group:willow.group,tiles:new Map(willow.tiles.map(t=>[key(t.x,t.z),t])),arrival:()=>willow.crystal.tile,
 camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},
 enter:({arrival})=>willow.enter(true,!arrival),leave:()=>willow.enter(false),cancel:()=>willow.cancel(),update:(dt,time,camera)=>willow.update(dt,time,camera),
 get busy(){return willow.busy;},get cameraFocus(){const focus=willow.cameraFocus;return focus&&{...focus,position:focus.position.clone().add(new THREE.Vector3(0,.4,0)),zoom:7};},get expression(){return willow.expression;},
 craftStarted:()=>willow.craftStarted(),crafted:id=>willow.crafted(id),foodEaten:()=>willow.foodEaten(),campfirePlaced:a=>willow.campfirePlaced(a),campfireCooked:(id,a)=>willow.campfireCooked(id,a),get campfireGuide(){return willow.campfireGuide;},
 interact:a=>willow.interact(a),clearUI:()=>willow.debug?.clearUI(),reset:()=>willow.debug?.stage('meet')
});
cinder=createCinderhold({tile:()=>tile,teleport(t){if(!t)return;path=[];segment=null;tile=t;player.position.set(t.x-6,t.h,t.z-6);},auras,scene,world,pickables,crystals,dialogue:characterDialogue,resources:resourceActions,combat,equipment,styles,supplies,openStation,player,stop:stopAll,toast,
 hover:()=>hover?.actor||hover?.tree||hover?.resource,approach:selectActor,guideMenu:value=>menus.guide(value),tip:(...args)=>craftingTutorial.showChapterTip(...args),hideTip(){tip.hide();},attacksPrevented:()=>!!assistance?.attacksPrevented,setCombatMode:mode=>assistance?.setMode(mode),abilitiesAuto:()=>assistance?.settings.policies.abilities==='auto',showCombatModes:()=>styleMenu.showModes(),
 working:()=>!!actorTarget||!!segment||path.length>0||combat.working||smithing.working||resourceActions.working||food.working||recipeCrafting.working
});
cinder.listed=()=>!waking?.isWoken;areas.register(cinder);
// Gold and shops (economy.js, shops.js; docs/ECONOMY.md): one wallet and one shop system for every
// map. Worn copies (hands, head, armour, the companion's hat) can't be sold.
const wallet=createWallet({inventory});
const wornCopies=id=>Object.entries(equipment.slots).filter(([slot,v])=>slot!=='main'&&slot!=='off'&&v===id).length+Object.values(companions.state.outfit||{}).filter(v=>v===id).length;
const shops=createShops({inventory,wallet,equipped:wornCopies});
const shopMenu=createShopMenu({modals,shops,items:ITEMS,inventory,wallet,onTrade:(changes,trade)=>{itemFeed.show(changes,{trade});gameAudio.play('pickup');}});
// Enemy drops (drops.js, loot-piles.js): rolled on victory, left where the enemy fell as a pile you
// click to pick up. The playground can fix the random seed.
let dropRandom=Math.random;
const lootPiles=createLootPiles({pickables,pickUp(items){for(const [id,n] of Object.entries(items))inventory[id]=(inventory[id]||0)+n;showItemChanges(items);return true;}});
function dropLoot(enemy){const items=rollDrops(enemy.rules?.drops,dropRandom);if(Object.keys(items).length)lootPiles.spawn({tile:enemy.tile,parent:areas.active?.group||scene,items});}
// Jobs (jobs.js; docs/ECONOMY.md): the quest board's offers and townsfolk givers, shared by every map.
// Deliveries go to people who live or work in the giver's city.
const jobs=createJobs({inventory,wallet,
 grantXp(skill,amount){const s=playerSkills()[skill];if(!s)return null;const r=grantSkillXp(s,amount);showSkillReward(r,player.position);return r;},
 value:id=>ITEMS[id]?.value||1,
 addresses:giver=>(giver.builtMap?.crowd?.folk||[]).filter(p=>p.house&&p.id&&!p.giver).map(p=>({id:p.id,name:p.name,where:p.house.building.shop?`the ${SHOPS[p.house.building.shop]?.name}`:p.house.building.plan.desc.name}))});
const jobReceipt=result=>{itemFeed.show(result.changes,{trade:'handedIn'});gameAudio.play('complete');toast(`Job done: ${result.job.title}.`);};
function openJobBoard(){modals.open({id:'job-board',title:'Job board',size:'sheet',flush:true,build:()=>jobBoard({jobs,onHandIn:jobReceipt})});}
// Talking to townsfolk (townsfolk-talk.js): a conversation in the dialogue box, with whatever they have
// for you: a package to hand over, a job to ask for or hand in, their wares to browse.
const townsfolkTalk=createTownsfolkTalk({dialogue:characterDialogue,jobs,
 shopFor:p=>p.house?.building.shop||p.shop||null,
 openShop:p=>shopMenu.open(p.shop,{greeting:`${p.name}: “${shops.shops[p.shop].greeting}”`}),
 received(job,result,stage){if(stage==='accepted'&&job.kind==='deliver')showItemChanges({package:1});else if(stage==='delivered')itemFeed.show(result.changes,{trade:'handedIn'});else if(stage==='paid')jobReceipt(result);}});
const talkTo=(person,line)=>townsfolkTalk.talk(person,line);
// A parcel marker over anyone you owe something (job-marker.js): the recipient of a package you carry,
// and a giver whose job you can hand in. Refreshed once a second.
let markerClock=0;
function updateJobMarkers(dt,force=false){markerClock-=dt;if(markerClock>0&&!force)return;markerClock=1;
 const crowd=crowdsByArea.get(areas.id);if(!crowd)return;
 const owed=new Set(jobs.active.filter(j=>j.kind==='deliver'&&!j.delivered?inventory.package>0:j.ready).map(j=>j.handIn));
 for(const p of crowd.folk){if(!p.id)continue;p.setMarker(owed.has(p.id)?'due':null);}}
// Townsfolk for a map (townsfolk.js): their crowd runs in the area's update. Keepers and stall
// vendors open their shop.
const crowdServices={say(person,line){toast(`${person.name}: “${line}”`);},talk:talkTo,trade(person,shop){shopMenu.open(shop,{greeting:`${person.name}: “${shops.shops[shop].greeting}”`});},
 player:()=>({tile,hidden:false}),playerTile:()=>segment?null:tile,near:t=>Math.abs(t.x-tile.x)+Math.abs(t.z-tile.z)<=8};
// Each city area's crowd, by area id (job markers, deliveries); every townsfolk knows its city.
const crowdsByArea=new Map();
function attachCrowd(built){built.crowd?.dispose();built.crowd=createCrowd({builtMap:built,parent:built.group,pickables,services:crowdServices});for(const p of built.crowd.folk)p.builtMap=built;if(built.areaId)crowdsByArea.set(built.areaId,built.crowd);return built.crowd;}
// Gelton, the capital (docs/CITY.md), inside its countryside (docs/WORLD.md): where players wake after
// the tutorial. One continuous area: the city (src/maps/capital.json, built per chunk (world-grid.js) and shown
// around the player) and the generated countryside around it (countryside.js), streamed in chunks with
// its resources, fishing spots, goblins and landmarks; you walk out through the city's gateways. Built
// on first need (the waking farewell starts it).
let gelton=null,geltonLoading=null,countryside=null;
const GELTON_CAMERA={zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)};
// Water beds under the streamed water surface (the ponds' bed colour).
const WATER_TOP=new THREE.Color('#a6b3a0'),surfaceTop=new Map();
let streamWater=null;
const ENEMY_RESPAWN=45;
// Streamed land (Gelton's countryside, biome land; docs/BIOMES.md): one way to put a generated source's
// extras in the world: fishing spots, the shared bridge, props and enemies, each by its real system.
function placeLandExtra(e,{tile:t,parent,tileAt},saved){
  if(e.kind==='fishing'){const spot=fishingSpots.add({tile:t,parent,height:t.h+.35});return {dispose:()=>fishingSpots.remove(spot),busy:()=>fishing.matches(spot)};}
  if(e.kind==='bridge'){
   // The shared bridge model, road-wide, over the river; its deck is what you click to walk on.
   const model=makeBridge(e.length,{width:e.width});model.setProgress(1);model.group.position.set(e.x-6,0,e.z-6);if(e.axis==='z')model.group.rotation.y=-Math.PI/2;parent.add(model.group);
   const hits=model.surfaces.map((m,i)=>{const deck=e.axis==='x'?tileAt(e.x+i,e.z):tileAt(e.x,e.z+i);m.userData.tile=deck;pickables.push(m);return m;});
   return {dispose(){model.group.removeFromParent();for(const m of hits){const k=pickables.indexOf(m);if(k>=0)pickables.splice(k,1);}model.group.traverse(o=>o.geometry?.dispose());}};}
  if(e.kind==='prop'){try{const prop=createProp(e.prop,{origin:[e.x,e.z],rotation:e.rotation,tileAt,parent,pickables});return {dispose:()=>prop.dispose()};}catch{return null;}}
  if(e.kind==='enemy'){
   // A defeated enemy stays away for its respawn time (a placed spawn's own, else ENEMY_RESPAWN seconds),
   // even if its chunk unloads meanwhile.
   const respawn=e.respawn??ENEMY_RESPAWN;
   if(saved?.away>elapsed)return {dispose(){},save:()=>saved};
   if(t.blocked||characterAt(t))return null;
   const a=combat.add(createEnemyEntity({kind:e.enemy,tile:t,parent,pickables,id:e.id,aggressive:e.aggressive,aggroRange:3,respawn}));
   return {dispose:()=>combat.remove(a),busy:()=>combat.matches(a)||combat.engagedEnemy===a,save:()=>a.opened?{away:elapsed+respawn}:null};}
  return null;}
// A chunk's dressing: its animated water and its ground cover (flowers, grass, reeds, lily pads…),
// the cover instanced across all loaded chunks (ground-cover.js).
function landDress(source,coverPool){
 streamWater??=createStreamedWater(renderer);
 return (list,{root,tileAt})=>{
  const water=streamWater.build(list.filter(t=>t.water||t.overWater),(x,z)=>{const n=tileAt(x,z);return !!n&&(n.water||!!n.overWater);},root);
  const cover=coverPool.add(source.cover(list));
  return {dispose(){water.dispose();cover.dispose();}};};
}
function geltonReady(){
 return geltonLoading??=(async()=>{
  const [{buildMap},{default:data},{createCountryside},{createChunkStreamer},{surfaceColor}]=await Promise.all([import('./world-map.js'),import('./maps/capital.json'),import('./countryside.js'),import('./chunk-streamer.js'),import('./map-terrain.js')]);
  const mapData=structuredClone(data),source=createCountryside({mapData:mapData});
  // The city streams by the countryside's rule (radius 1, a band of hysteresis), so they always match.
  const built=buildMap(mapData,{scene,pickables,streamRadius:drawRadius(),outside:source.tile,crystal:(t,parent,entry,tileAt)=>crystals.add({tile:t,parent,place:entry.id,label:'Use Iter Crystal',tileAt})});
  built.areaId='gelton';attachCrowd(built);
  // Guards pacing the wall-top walkways (wall-sentries.js), hidden where the wall is cut down.
  built.sentries=built.walls?createWallSentries({walkways:built.walls.walkways,parent:built.group,hiddenAt:built.walls.cutAt,shownAt:built.isShown}):null;
  // Anything placed in the city goes in its chunk, so it shows and hides with it (city streaming).
  const chunkRootOf=(x,z)=>built.chunks.get(chunkId(x,z))?.root||built.group;
  // Ground cover for the city's greens and the countryside, instanced (ground-cover.js).
  const coverPool=createGroundCoverPool({parent:built.group});
  // The city's green spaces as mini biomes (city-greens.js): themed trees (shared choppable resources, in
  // their chunk) and ground cover.
  if(built.data.greens){const greens=cityGreens(built,{seed:built.data.greens.seed||1});built.greens=greens;
   for(const g of greens.trees){const t=built.tiles.get(key(g.x,g.z));if(!t||t.blocked)continue;resourceActions.add(createResourceEntity({kind:'tree',species:g.species,tile:t,parent:chunkRootOf(g.x,g.z),pickables,id:`gelton:green:${g.x},${g.z}`}));}
   // The cover streams with the city's chunks: each chunk's share joins the instanced pool while the
   // chunk is shown and leaves when it is hidden (the pool lives outside the chunk groups).
   const cover=chunkedCover(coverPool,greens.cover);
   built.onStream=chunks=>cover.sync(id=>chunks.get(id)?.root.visible);built.onStream(built.chunks);}
  // Gather spots placed by the map (shared resource entities).
  for(const r of built.data.resources||[]){const t=built.tiles.get(key(r.x,r.z));if(t&&!t.blocked&&!t.prop)resourceActions.add(createResourceEntity({kind:r.kind,species:r.species,tile:t,parent:chunkRootOf(r.x,r.z),pickables,id:`gelton:${r.kind}:${r.x},${r.z}`}));}
  // The countryside streams into the area's tiles, and into the live world map while Gelton is active.
  const maps=[built.tiles];
  const topColor=t=>{if(t.water)return WATER_TOP;const hex=surfaceColor(t);if(!surfaceTop.has(hex))surfaceTop.set(hex,new THREE.Color(hex));return surfaceTop.get(hex);};
  const streamer=createChunkStreamer({source,maps,parent:built.group,pickables,resources:resourceActions,topColor,place:placeLandExtra,dress:landDress(source,coverPool),radius:drawRadius()});
  // The world's edge round the countryside (mist-wall.js).
  createMistWall({...source.bounds,x1:source.bounds.x1-1,z1:source.bounds.z1-1,parent:built.group});
  // Its Iter Crystals, each a destination of its own (crystal-places.js); the ground round one loads before you arrive.
  crystalPlaces.provide('gelton',()=>mapCrystals(built.data).map(c=>({id:c.id,name:c.name,known:!!c.known,tile:()=>built.tiles.get(key(c.x,c.z)),prime:()=>streamer.prime(c.x,c.z,1)})));
  countryside={source,streamer,maps};built.countryside=countryside;streamedWorlds.add({streamer,builtMap:built});
  areas.register({id:'gelton',name:data.name,music:'world',ambience:'meadow',description:'The capital of Quadria and the land around it',listed:()=>!!waking?.isWoken,group:built.group,tiles:built.tiles,camera:GELTON_CAMERA,
   arrival:()=>built.crystal?.tile||built.spawn,
   enter(){if(!maps.includes(world))maps.push(world);streamer.prime(tile.x,tile.z,1);},prime:(x,z)=>streamer.prime(x,z,1),
   leave(){const i=maps.indexOf(world);if(i>=0)maps.splice(i,1);},
   update:(dt,time,view)=>{const at=viewTile();built.stream(at);streamer.update(dt,at);streamWater.update(dt);built.walls?.update(dt);built.sentries?.update(dt,time,tile);built.crowd?.update(dt,time,{camera:view});},
   reset(){for(const d of built.doors)if(!d.locked)d.setOpen(false,{quiet:true});}});
  return gelton=built;
 })();
}
// Leaving the tutorial (waking.js): one shared reset and starter kit, after the "???" farewell.
waking=createWaking({narrator,inventory,items:ITEMS,skills:playerSkills,character,styles,auras,equipment,health,resources:playerResources,companions,
 resetObjectives,toast,destination:'gelton',prepare:geltonReady,
 fade(value){$('scene-fade').hidden=value===0;$('scene-fade').style.opacity=String(value);},
 endTutorial(){
  travel.cancel();stopAll();combat.clear();modals.closeAll('replaced');areas.notify('clearUI');
  craftingTutorial.reset();opening.enterFreePlay();finale.reset();destinations.reset();
  clearSkillRewards();itemFeed.clear();tip.hide();lootPiles.clear();jobs.reset();
  menus.host.hidden=false;introTile.visible=false;player.visible=true;visual.scale.setScalar(1);
 },
 arrive(id){const landing=travel.landingFor(id);areas.activate(id,{landing,arrival:false});if(id==='gelton')gelton.stream(landing);return landing;},
});
// "Skip this part" on the tutorial tip (tutorial-chapters.js): each chapter's own skip marks it done
// and starts the next with what it needs. The link follows the chapter the player is in.
const topUp=items=>{for(const [id,n] of Object.entries(items))inventory[id]=Math.max(n,inventory[id]||0);};
const SKIPS={
 start(){craftingTutorial.reset();menus.host.hidden=false;opening.skipControls();},
 journal(){craftingTutorial.skipJournal();topUp({sticks:3,stones:3});opening.skipGathering();},
 tools(){topUp({axes:1,pickaxes:1});craftingTutorial.skipTools();},
 finale(){const crystal=finale.skip();if(!travel.request('willowbank',{source:crystal}))toast('There’s no safe space beside the destination crystal.');},
 willowbank(){willow.skip(()=>{if(!travel.request('cinderhold'))toast('There’s no safe space beside the destination crystal.');});},
 cinderhold(){waking.start();},
};
let skipChapter=null;
function syncTutorialSkip(){
 const finaleState=finale.state,chapter=tutorialChapter({area:areas.id,woken:waking.isWoken,waking:waking.active||travel.busy,inClearing:opening.inClearing,lesson:opening.lesson,openingFinished:opening.finished,
  craftingStage:craftingTutorial.stage,finaleStage:finaleState.stage,portalUsed:finaleState.portalUsed,willowPhase:willow.state.phase,cinderComplete:cinder.tutorialComplete});
 if(chapter===skipChapter)return;
 skipChapter=chapter;
 tip.setSkip(chapter&&{label:'Skip this part',onPress:()=>confirmModal(modals,{id:'skip-chapter',title:'Skip this part?',
  message:`Skip “${TUTORIAL_CHAPTERS[chapter]}”? It counts as done and the tutorial moves on.`,confirm:'Skip',cancel:'Keep playing',
  onConfirm:()=>{if(skipChapter!==chapter)return;stopAll();SKIPS[chapter]();}})});
}
assistance=createAssistance({combat,character,equipment,styles,auras,food,inventory,health,resources:playerResources,toast,moving:()=>!!segment||path.length>0,tip:text=>playerInterface?.tip(text)});
styleMenu=createCombatStyleMenu({styles,combat,panels:menus.panels,auras,assistance,equipment,character,health,openPowers:()=>powersMenu.open(),busy:()=>combat.working||combat.busy||smithing.working||recipeCrafting.working});
// Powers (Spells, Auras, Abilities) after the Combat page, which links to it.
const powersMenu=createPowersMenu({styles,auras,assistance,combat,character,panels:menus.panels});
areas.activate('clearing',{announce:false});
function canMove(){return areas.canMove&&!travel.busy&&!combat?.busy&&!spaces.busy;}

function cancelWork({keepCombat=false,keepFood=false}={}){
 if(!(keepFood&&afterStep.pending==='Eating'))afterStep.cancel();
 cancelPlayerActions({smithing,combat,resourceActions,carpentry,fishing,food,cooking,recipeCrafting,campfires,companions},{keepCombat,keepFood});areas.cancel();
 chopTarget=null;if(!(keepCombat&&actorTarget?.enemy)){actorTarget=null;actorTime=0;}
 seat=null;pendingSeat=null;
}
// A queued quick spell opens the next fight from its own range.
function attackRange(){return combat?.queuedSpell?SPELLS[combat.queuedSpell].range:styles.attack.range;}
// limit: the hover's hint searches at most this many tiles per route (the click searches in full).
function routeToTree(target,limit=Infinity){return target.depleted?null:target.kind==='door'?doorApproach(target,segment?segment.to:tile,at=>findPath(world,segment?segment.to:tile,at,playerRouteCost,{limit})):target.enemy?attackRoute(world,segment?segment.to:tile,target,attackRange(),characterAt,playerRouteCost):interactionRoute(world,segment?segment.to:tile,target,characterAt,playerRouteCost,limit);}
// Occupied tiles (world-occupancy.js): the player and companion register each frame; creatures and
// NPCs register as they move. Another character stands here (companion, creature or NPC):
function characterAt(t){return !!t&&occupancy.occupied(t,playerOccupant);}
// A walk-through NPC (mentor, Reed, townsfolk) stands here.
function npcAt(t){return !!t&&occupancy.owners(t).some(o=>o!==playerOccupant&&o!==companionOccupant&&!o.enemy);}
// The player's routes go around people unless the detour is long (occupied tiles cost extra).
// Walking speed bonuses (Celerity +0.2% per point, Rush) on top of base walking speed.
function walkBonus(){return character.attribute('celerity')*.002+auras.movementBonus;}
// Your own companion doesn't bend your routes (it trails right behind you); NPCs and creatures still
// treat it as someone standing there.
const playerRouteCost=t=>occupancy.cost(t,playerOccupant,companionOccupant);
// Props in every map (props.js): a bench seats you on a free seat; the others answer with a line until
// the systems behind them exist (jobs board: economy; drinking: no effect yet).
configureProps({act(verb,prop){
 // Sit or sleep: walk to a free seat spot and settle (chairs at a table seat from a free side only).
 if(verb==='sit'||verb==='sleep'){const free=prop.spots.filter(s=>s.seat&&!s.tile.blocked&&!characterAt(s.tile)).sort((a,b)=>Math.abs(a.tile.x-tile.x)+Math.abs(a.tile.z-tile.z)-(Math.abs(b.tile.x-tile.x)+Math.abs(b.tile.z-tile.z)))[0];
  if(!free){toast(verb==='sleep'?'There’s no room to lie down here.':'Every seat is taken.');return;}moveTo(free.tile);pendingSeat=free;return;}
 if(verb==='enter'){if(!prop.link||!spaces.enter(prop.link))toast('The way down is barred.');return;}
 // Stations: a stove, oven or fireplace cooks like a campfire; a forge smelts and an anvil smiths.
 const near=()=>!segment&&!path.length&&interactionRoute(world,tile,prop)?.route.length===0;
 if(verb==='cook'){cookingMenu.open({available:near});return;}
 // Trade: a shop counter (its building's shop) or a market stall opens the shared shop screen.
 // The noticeboard is the job board (jobs.js).
 if(verb==='read'&&prop.kind==='noticeboard'){openJobBoard();return;}
 if(verb==='trade'){if(!shopMenu.open(prop.shop||'general'))toast('Nothing for sale here.');return;}
 if(verb==='smith'){openStation({kind:prop.station,x:prop.x,z:prop.z,tile:prop.tile,group:prop.group,available:near});return;}
 // Open and close: city furniture holds nothing; some chests (dungeons, the wild) give their loot once.
 if(verb==='open'){const opened=prop.toggle();gameAudio.play(opened?'doorOpen':'doorClose');if(!opened)return;
  const loot=takeLoot(prop);if(loot){for(const [id,n] of Object.entries(loot))inventory[id]=(inventory[id]||0)+n;showItemChanges(loot);}else messages?.show('There is nothing interesting in here.');return;}
 const lines={read:prop.kind==='bookshelf'?'Old ledgers and a well-thumbed almanac.':'Nothing worth reading.',drink:'Cool, clear water.',gaze:'You take a moment to look.',
  examine:{painting:'A sunny meadow, painted with care.',gravestone:'The name has worn away.',weaponRack:'Well-kept blades, not for the taking.'}[prop.kind]||'Nothing out of the ordinary.'};
 toast(lines[verb]||prop.label);
}});
// Doors in every map share the game's feedback and movement (doors.js).
configureDoors({toast:s=>toast(s),tile:()=>tile,sound:name=>gameAudio.play(name),enter:link=>spaces.enter(link)});
// A player who has stopped on another character's tile pushes it off ('walk' NPCs step aside; calm
// creatures in combat.js; the companion in companions.js). Characters that can't move (push 'never',
// such as tutorial NPCs, or nowhere free) stay, hidden under the player until the player moves on.
const underPlayer=new Map();
function resolveStanding(){
 const settled=!segment&&!path.length,here=settled?occupancy.owners(tile).filter(o=>o!==playerOccupant&&o!==companionOccupant&&!o.enemy&&o.group):[];
 for(const o of here)if(!underPlayer.has(o)&&!pushWorldActor(o,t=>t===tile)){underPlayer.set(o,o.group.visible);o.group.visible=false;}
 for(const [o,visible] of underPlayer)if(!here.includes(o)||o.tile!==tile){o.group.visible=visible;underPlayer.delete(o);}
}
function selectTree(tree){
 if(!canMove()||chopTarget===tree||resourceActions.matches(tree))return;if(__PLAYGROUND__)debug?.stop(false);
 const mining=['boulder','copper'].includes(tree.kind),tool=mining?'pickaxes':'axes';
 if(!inventory[tool]){toast('Missing the required tool!');feedback.pulse(tree.group.position,false);return;}
 if(chopTarget===tree||resourceActions.matches(tree))return;
 const result=routeToTree(tree);if(!result){toast('There is no safe route to this resource.');feedback.pulse(tree.group.position,false);return;}
 combat.disengage();cancelWork({keepCombat:true});target=null;gatherTime=0;chopTarget=tree;path=result.route;
 feedback.destination(result.at);
}
// manual: a deliberate player selection (pointer). Pacifist refuses attacks; Auto records a target override.
function selectActor(actor,manual=false){
 if(actor.enemy&&manual){if(!assistance.canAttack(actor))return;assistance.noteManualAttack(actor);}
 if(campfires?.placing){campfires.selectPlacement(actor.tile);return;}
 if(!canMove()||!actor.ready||actor.opened||actor.depleted)return;
 if(actorTarget===actor||combat.matches(actor)||companions.matches(actor)||resourceActions.matches(actor)||carpentry.matches(actor)||fishing.matches(actor))return;
 if(__PLAYGROUND__)debug?.stop(false);
 const result=routeToTree(actor);if(!result){toast('There is no safe route there.');return;}
 combat.disengage();cancelWork({keepCombat:true,keepFood:!!actor.enemy});target=null;gatherTime=0;actorTarget=actor;actorTime=0;path=result.route;feedback.destination(result.at);
}
function isVisible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
function toast(s){gameAudio.play('blocked');messages?.show(s);}
// `sound` replaces the default (crafted when something was spent, else pick up); null for none.
function showItemChanges(changes,{sound}={}){itemFeed.show(changes);const kind=sound===undefined?(Object.values(changes).some(n=>n<0)?'complete':'pickup'):sound;if(kind)gameAudio.play(kind);}
function updateUI(reward){opening.collected({sticks:inventory.sticks,stones:inventory.stones},reward);}
function moveTo(t,resource){if(!canMove())return;if(campfires?.placing){campfires.selectPlacement(t);return;}if(resource&&(resource===target||resourceActions.matches(resource)))return;if(__PLAYGROUND__)debug?.stop(false);const point=new THREE.Vector3(t.x-6,t.water?.86:t.h,t.z-6);if(resource&&(resource===target||resourceActions.matches(resource))){return;}const start=segment?segment.to:tile;const adjacent=resource?routeToTree(resource):null;const destination=resource?adjacent?.at:t;const route=resource?(adjacent?.route??null):findPath(world,start,t,playerRouteCost);if(route===null){feedback.pulse(point,false);toast(t.blocked?'Find a clear patch of ground.':'No way there: a wall, locked door or high ledge is in the way.');return;}messages?.clear();if(recipeCrafting.working&&route.length===0&&!segment&&!resource)return;combat.disengage();cancelWork();opening.moving(tile,destination);target=resource||null;gatherTime=0;path=route;feedback.destination(destination);}
function pick(event){const rect=gameViewport();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables.filter(m=>isVisible(m)&&!m.userData.resource?.depleted&&!m.userData.tree?.depleted),false)[0];}
let down=null,dragged=false,pinchDistance=null;
const activePointers=new Map();
let pointerOnCanvas=false,pointerClient={x:0,y:0},hoverDirty=true,hoverCleared=false,hoverAt=0;
// The hover's answer to "can I get there?", kept for a second while the pointer stays on the same thing and you
// haven't moved (the 10 Hz refresh used to search again every time).
let hoverReach={subject:null,from:null,at:0,valid:false};const HOVER_SEARCH=3000;
const canvas=renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function spread(){const [a,b]=[...activePointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
canvas.addEventListener('pointerdown',e=>{
 if(!areas.canOrbit||travel.busy)return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
 // World editor brushes (playground): a left-button drag paints tiles instead of turning the camera.
 if(__PLAYGROUND__&&tileDrag&&e.button===0&&activePointers.size===1){const raw=pick(e),hit=terrainHitData(raw),at=editorTile(raw,hit);if(at){painting=true;down=null;tileDrag('start',at,hit?.actor||null,raw?.point||null);return;}}
 if(activePointers.size===1){down={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button};dragged=false;}
 else{dragged=true;pinchDistance=spread();}
});
canvas.addEventListener('pointermove',e=>{
 if(!areas.canOrbit||travel.busy)return;
 pointerOnCanvas=true;pointerClient={x:e.clientX,y:e.clientY};hoverDirty=true;
 if(__PLAYGROUND__&&tileHover&&!(down&&dragged&&!painting))hoverTile(e);
 if(__PLAYGROUND__&&painting){const at=editorTile(pick(e));if(at)tileDrag?.('move',at);return;}
 if(!activePointers.has(e.pointerId)||!down)return;
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(activePointers.size>=2){
  const distance=spread();if(pinchDistance>0&&distance>0)changeZoom(22*Math.log(pinchDistance/distance));
  pinchDistance=distance;dragged=true;return;
 }
 if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;
 // A middle-button drag grabs the ground: what was under the pointer stays under it (the view's height in
 // world units at the focus, per pixel; forward is foreshortened by the camera's tilt).
 if(__PLAYGROUND__&&freeCam&&down.button===1){dragged=true;const k=2*zoom*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,canvas.clientHeight);
  moveFreeCamera(-(e.clientX-down.lastX)*k,(e.clientY-down.lastY)*k/Math.max(.3,Math.sin(elevation)));down.lastX=e.clientX;down.lastY=e.clientY;return;}
 if(dragged){
  const delta=-(e.clientX-down.lastX)*.008,oldElevation=elevation;
  angle+=delta;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-down.lastY)*.005,THREE.MathUtils.degToRad(20),THREE.MathUtils.degToRad(75));
  opening.rotated(Math.abs(delta)+Math.abs(elevation-oldElevation));
 }
 down.lastX=e.clientX;down.lastY=e.clientY;
});
canvas.addEventListener('pointerup',e=>{
 if(__PLAYGROUND__&&painting){painting=false;tileDrag?.('end');activePointers.delete(e.pointerId);if(!activePointers.size)down=null;return;}
 if(activePointers.size===1&&down?.button===0&&!dragged)idleClock.wake();
 if(canMove()&&activePointers.size===1&&down?.button===0&&!dragged){
  const hit=pick(e),data=terrainHitData(hit);
  const clicked=data?.tile||data?.actor?.tile;
  if(__PLAYGROUND__&&tileClick&&clicked){tileClick(editorTile(hit,data)||clicked,hit?.point||null,data?.actor||null,raycaster.ray.clone());}else if(campfires.placing)campfires.selectPlacement(data?.tile);else if(data?.actor)selectActor(data.actor,true);else if(data?.tree)selectTree(data.tree);else if(data?.tile)moveTo(data.tile,data.resource);
  else{const groundHit=raycaster.intersectObject(ground)[0];if(groundHit)feedback.pulse(groundHit.point,false);
   // Past the world's edge: the mist wall (mist-wall.js).
   const flat=raycaster.ray.intersectPlane(groundPlane,new THREE.Vector3());toast(flat&&mistAt(Math.round(flat.x+6),Math.round(flat.z+6))?'The mist is too thick to go on.':'Choose a tile inside the area.');}
 }
 activePointers.delete(e.pointerId);pinchDistance=null;
 if(!activePointers.size)down=null;
 else{const p=[...activePointers.values()][0];down={x:p.x,y:p.y,lastX:p.x,lastY:p.y,button:0};dragged=true;}
});
function cancelGesture(){activePointers.clear();down=null;pinchDistance=null;dragged=true;}
canvas.addEventListener('pointercancel',cancelGesture);addEventListener('blur',cancelGesture);
canvas.addEventListener('pointerleave',()=>{pointerOnCanvas=false;hoverCleared=true;if(__PLAYGROUND__&&tileHover){hoverTileId=null;tileHover(null);}campfires.hoverPlacement(null);$('tooltip').style.display='none';feedback.hover(null);});
// Re-pick immediately after pointer movement; otherwise refresh at 10 Hz for moving actors and camera follow.
function updateHover(){
 if(!pointerOnCanvas||!canMove()){if(!hoverCleared){hoverCleared=true;hoverDirty=true;hover=null;campfires.hoverPlacement(null);feedback.hover(null);$('tooltip').style.display='none';}return;}
 // Editing (playground world editor): the editor shows its own previews, so the game's hover (a route to the tile
 // under the pointer, found every frame the pointer moves) stays off: on a big map it starved the frames.
 if(__PLAYGROUND__&&editorScreen){if(!hoverCleared){hoverCleared=true;hoverDirty=true;hover=null;feedback.hover(null);$('tooltip').style.display='none';renderer.domElement.style.cursor='default';}return;}
 // The free camera panning (keys or a drag): no hover picking until it stops (playground).
 if(__PLAYGROUND__&&freeCam&&(panKeys.has('w')||panKeys.has('a')||panKeys.has('s')||panKeys.has('d')||down))return;
 const now=performance.now();if(!hoverDirty&&!hoverCleared&&now-hoverAt<100)return;hoverDirty=false;hoverCleared=false;hoverAt=now;
 const hit=pick({clientX:pointerClient.x,clientY:pointerClient.y});hover=terrainHitData(hit);
 const t=hover?.tile,tree=hover?.tree,actor=hover?.actor,placementStatus=campfires.hoverPlacement(t),from=segment?segment.to:tile,subject=actor||tree||hover?.resource||t;
 const reach=()=>{if(hoverReach.subject===subject&&hoverReach.from===from&&now-hoverReach.at<1000)return hoverReach.valid;
  // A plain tile: a bounded search (unknown counts as reachable; the click finds the real route).
  const valid=actor||tree||hover?.resource?!!routeToTree(actor||tree||hover.resource,HOVER_SEARCH):!!t&&canReach(world,from,t,{limit:HOVER_SEARCH})!==false;hoverReach={subject,from,at:now,valid};return valid;};
 const valid=placementStatus?placementStatus.valid:actor?actor.ready&&!actor.opened&&reach():tree?(['boulder','copper'].includes(tree.kind)?inventory.pickaxes>0:inventory.axes>0)&&reach():hover?.resource?reach():!!t&&reach();
 feedback.hover(t,valid);
 renderer.domElement.style.cursor=t?(valid?'pointer':'not-allowed'):'default';
 // Editing (playground world editor): the editor previews what a click does, so the game's hint stays away.
 const hint=t&&!(__PLAYGROUND__&&editorScreen);$('tooltip').style.display=hint?'block':'none';
 if(hint){$('tooltip').textContent=placementStatus?placementStatus.label:actor?(actor.opened?(actor.enemy?'Recovering…':'Empty chest'):!actor.ready?'Landing…':valid?actor.label:'No safe route'):tree?(valid?(tree.kind==='copper'?'Mine copper':['boulder','copper'].includes(tree.kind)?'Mine Boulder':'Chop tree'):!inventory[['boulder','copper'].includes(tree.kind)?'pickaxes':'axes']?'Missing the required tool!':'No safe route'):!valid?(t.blocked?'Blocked terrain':'No safe route'):hover?.resource?'Gather '+ITEMS[hover.resource.kind].name:'Move here';$('tooltip').style.left=(pointerClient.x+16)+'px';$('tooltip').style.top=(pointerClient.y-32)+'px';}
}
function changeZoom(delta){if(!areas.canOrbit||travel.busy)return;if(!opening.playable){introZoom=THREE.MathUtils.clamp(introZoom*Math.exp(delta/22),3,10);return;}const before=zoom;zoom=THREE.MathUtils.clamp(zoom*Math.exp(delta/22),3,__PLAYGROUND__&&freeCam?FREE_MAX_ZOOM:areas.active?.maxZoom??34);opening.zoomed(Math.log(zoom/before));}renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY*.012);},{passive:false});
function resize(){const {left,width,height}=measureGameViewport();document.documentElement.style.setProperty('--game-viewport-width',`${width}px`);document.documentElement.style.setProperty('--game-viewport-center',`${left+width/2}px`);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);}addEventListener('resize',resize);new ResizeObserver(resize).observe($('game'));resize();
const clock=new THREE.Clock();let elapsed=0;
const focusLift=new THREE.Vector3(),cameraFocus=new THREE.Vector3();
// One batch per frame: UI bindings flush once, after the frame's state changes.
function animate(){requestAnimationFrame(animate);if(__PLAYGROUND__&&perfProbe.active){perfProbe.begin();batch(frame);perfProbe.end();}else batch(frame);}
// Playground builds attribute frame time to these laps; normal builds compile them away.
// The sun's shadow area (±24 tiles) follows the player in 4-tile steps, so large areas and streamed
// worlds keep shadows everywhere; each step redraws the shadow map once.
let sunAnchor='';
 // Where the world streams around: the slime (its next step), or the free camera's focus.
function viewTile(){return __PLAYGROUND__&&freeCam?{x:Math.round(freeCam.focus.x+6),z:Math.round(freeCam.focus.z+6)}:segment?.to||tile;}
const FREE_MAX_ZOOM=140;
// The free camera's focus moves along the ground: right and forward (away from the camera), in tiles.
function moveFreeCamera(right,forward){const s=Math.sin(angle),c=Math.cos(angle);freeCam.focus.x+=right*c-forward*s;freeCam.focus.z+=-right*s-forward*c;}
function panFreeCamera(dt){
 const speed=(panKeys.has('shift')?3:1)*Math.max(12,zoom*1.8)*dt,f=(panKeys.has('w')?1:0)-(panKeys.has('s')?1:0),r=(panKeys.has('d')?1:0)-(panKeys.has('a')?1:0);
 if(f||r)moveFreeCamera(r*speed,f*speed);
 // It rides the ground below it (smoothly), so zooming in on a hill still looks at the hill.
 const under=world.get(key(Math.round(freeCam.focus.x+6),Math.round(freeCam.focus.z+6)));if(under)freeCam.focus.y+=(under.h+.35-freeCam.focus.y)*Math.min(1,dt*6);
 const far=Math.max(baseFar,zoom*3+60);if(camera.far!==far){camera.far=far;camera.updateProjectionMatrix();}
}
// The mist wall's drift and thinning, and the atmosphere of the biome under the view (an area with biome land
// has biomeAt(x, z)).
const splashFog=new THREE.Fog('#dce5dc',1e4,2e4);
function updateAtmosphere(dt){const focus=__PLAYGROUND__&&freeCam?freeCam.focus:player.position,at=viewTile();ground.position.x=Math.round(focus.x/100)*100;ground.position.z=Math.round(focus.z/100)*100;const detail=['low','lowest'].includes(quality.tier.peek())?0:1,focusDistance=camera.position.distanceTo(focus),range=(drawRadius()+.5)*CHUNK;updateMistWalls(clock.elapsedTime,focusDistance,detail,focus,range);
 atmosphere.update(dt,{biome:splash.active?null:areas.active?.biomeAt?.(at.x,at.z)??null,range,focusDistance,background:scene.background,on:atmosphereOn.peek(),detail});
 // The splash has fog whenever the world does (far off, so it shows nothing): materials it shares with the world then
 // compile one program, not one with fog and one without (perf: splash 15 → 22 programs).
 if(splash.scene)splash.scene.fog=scene.fog?splashFog:null;}
function followSun(){const at=__PLAYGROUND__&&freeCam?freeCam.focus:player.position,fx=Math.round(at.x/4)*4,fz=Math.round(at.z/4)*4,anchor=`${fx},${fz}`;if(anchor===sunAnchor)return;sunAnchor=anchor;sun.target.position.set(fx,0,fz);sun.position.set(fx-8,19,fz+5);sun.target.updateMatrixWorld();quality.shadowsChanged();}
function frame(){const elapsedReal=clock.getDelta(),dt=Math.min(elapsedReal,.05);followSun();updateAtmosphere(dt);quality.frame(elapsedReal*1000);healthVisible.value=playerUiShown();playerInterface?.update(dt,playerUiShown()&&!splash.active);// Ambience: a breeze on the splash, silence in the opening scene, then the area's own profile.
 gameAudio.update(dt,splash.active?'splash':opening.finished?areas.active?.music||'clearing':'intro',narrator.visible.peek(),!!combat?.inCombat,splash.active?'breeze':opening.inClearing?areas.active?.ambience||'meadow':'none');if(__PLAYGROUND__)perfProbe.lap('interface');if(splash.active){rotationKeys.clear();renderer.shadowMap.needsUpdate=true;splash.render(dt);return;}elapsed+=dt;travel.update(dt);spaces.update(dt);const worldMotion=areas.update(dt,elapsed,camera,hover?.actor);characterDialogue.update(dt);crystals.update(elapsed);discoverNearbyCrystals();lootPiles.update(dt,elapsed,hover?.actor);jobs.update();updateJobMarkers(dt);waking?.update(dt);syncTutorialSkip();destinations.update();projectiles.update(dt);document.body.classList.toggle('q-cutscene',!!(areas.cameraFocus||areas.celebration));$('game-menus').inert=areas.busy||travel.busy;
 if(__PLAYGROUND__)perfProbe.lap('world');
 const asleep=idleClock.update(dt,opening.playable?(!segment&&!path.length&&!target&&!actorTarget&&!areas.busy&&!travel.busy&&!debug?.previewing&&!combat.working&&!combat.busy&&!areas.working&&!companions.working&&!resourceActions.working&&!carpentry.working&&!fishing.working&&!food.working&&!cooking.working&&!recipeCrafting.working&&!smithing.working):opening.quiet);
 let sleeping=asleep&&idleClock.sleepTime>=SLEEP_SETTLE;
 if(!opening.playable){if(opening.canOrbit){angle+=(Number(rotationKeys.has('ArrowRight'))-Number(rotationKeys.has('ArrowLeft')))*keyboardRotationSpeed*dt;elevation=THREE.MathUtils.clamp(elevation+(Number(rotationKeys.has('ArrowUp'))-Number(rotationKeys.has('ArrowDown')))*Math.PI/3*dt,THREE.MathUtils.degToRad(20),THREE.MathUtils.degToRad(75));}else rotationKeys.clear();
  if(opening.quiet||opening.reaction){
    const social=opening.reaction?socialMotion(opening.reaction.kind,opening.reaction.time):asleep?socialMotion('Sleeping',idleClock.sleepTime):null;
    player.position.copy(opening.inClearing?clearingSpawn:introSpawn);
    visual.rotation.set(social?.pose.lean||0,social?.pose.twist||0,social?.pose.roll||0);
    if(social){player.position.y+=social.lift;const width=1/Math.sqrt(social.pose.squash);visual.scale.set(width,social.pose.squash,width);visual.position.y=-.07*social.pose.squash;}
    presentation.bend(social?.pose.bend||0);
    expressionFace.set(social?.expression||'idle');
    for(let i=0;i<hands.length;i++){const h=social?.hands[i]||[(i===0?-1:1)*.46,.33,.08,0,0];hands[i].position.set(h[0],h[1],h[2]);hands[i].rotation.set(h[3],0,h[4]);}
  }
  const focus=(opening.inClearing?clearingSpawn:introSpawn).clone().add(new THREE.Vector3(0,.35,0)),distance=opening.inClearing?22:introZoom;
  camera.position.set(focus.x+Math.sin(angle)*distance*Math.cos(elevation),focus.y+Math.sin(elevation)*distance,focus.z+Math.cos(angle)*distance*Math.cos(elevation));
  camera.lookAt(focus.clone().add(new THREE.Vector3(0,opening.inClearing?0:-distance*.09,0)));camera.updateMatrixWorld();contactShadow.update(player.position,visual.scale,player.visible);sleepFeedback.update(dt,sleeping,player.position,camera);renderer.render(scene,camera);quality.afterRender(scene);return;
 }
 campfires.update(elapsed);
 fishingSpots.update(elapsed);
 if(__PLAYGROUND__)trainingFixtures?.update(elapsed);
 playerOccupant.moving=!!segment||path.length>0;occupancy.place(playerOccupant,[tile,segment?.to]);occupancy.place(companionOccupant,companions.cells);
 updateWorldActors(dt,t=>t===tile||t===segment?.to);resolveStanding();updateDoors(dt,elapsed);updateProps(dt);
 if(__PLAYGROUND__)walkThroughFixtures?.update(dt,elapsed);
 if(__PLAYGROUND__)edgeFixtures?.update(dt);
 if(__PLAYGROUND__)movementFixtures?.update(dt);
 if(__PLAYGROUND__)carpentryFixture?.highlight.update(false,elapsed,hover?.actor===carpentryFixture&&!carpentryFixture.opened&&!carpentry.matches(carpentryFixture));
 afterStep.flush();
 equipment.refresh();
 combatFeedback.update(dt,camera);
 const combatMotion=combat.update(dt,elapsed,camera);
 auras.update(dt);playerControl.update(dt);
 assistance.update(dt);
 // Asleep in a bed (props.js): health comes back faster.
 playerResources.regenerate(dt,{health,attribute:character.attribute,inCombat:combat.inCombat,aurasActive:auras.anyActive,resting:!!seat&&seat.spot.seat?.motion==='Sleeping'&&!segment&&!path.length});
 const resourceMotion=resourceActions.update(dt);
 gatherTime=resourceActions.state?.kind==='Gathering'?resourceActions.state.age:0;
 const carpentryMotion=carpentry.update(dt);
 const fishingMotion=fishing.update(dt);
 const foodMotion=food.update(dt);
 const cookingMotion=cooking.update(dt);
 const recipeMotion=recipeCrafting.update(dt);
 const smithingMotion=smithing.update(dt);
 const companionMotion=companions.update(dt,elapsed,camera);
 if(__PLAYGROUND__)perfProbe.lap('systems');
 // A fresh attack windup may replace the remaining (cosmetic) eating animation.
 const actionMotion=combatMotion?.kind==='Defeated'?combatMotion:combatMotion||foodMotion||companionMotion||resourceMotion||carpentryMotion||fishingMotion||cookingMotion||recipeMotion||smithingMotion||worldMotion;
 if(!areas.canOrbit||travel.busy||modals.anyOpen.peek())rotationKeys.clear();
 const oldAngle=angle,oldElevation=elevation;
 angle += (Number(rotationKeys.has('ArrowRight')) - Number(rotationKeys.has('ArrowLeft'))) * keyboardRotationSpeed * dt;
 elevation = THREE.MathUtils.clamp(elevation + (Number(rotationKeys.has('ArrowUp')) - Number(rotationKeys.has('ArrowDown'))) * Math.PI / 3 * dt, THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(75));
 opening.rotated(Math.abs(angle-oldAngle)+Math.abs(elevation-oldElevation));
 let pose=idlePose(elapsed),handWork=null,expression=elapsed<happyUntil?'happy':'idle',socialHands=null;
 if(asleep){const social=socialMotion('Sleeping',idleClock.sleepTime);pose=social.pose;expression=social.expression;socialHands=withGrip(social.hands,equipmentIdleHands({rightHand:equipment.slots.right,leftHand:equipment.slots.left}),social.grip);}
 // Characters are walk-through: the player never waits for the companion (or anyone) to move aside.
 // A route can close behind a plan (a door locked, a wall placed): re-route before stepping across it.
 if(!segment&&path.length&&!stepAllowed(world,tile,path[0],{diagonal:DIAGONAL_MOVES.player})){const end=path.at(-1);path=findPath(world,tile,end,playerRouteCost)||[];if(!path.length){target=null;actorTarget=null;feedback.clearDestination();toast('The way is shut.');}}
 // Stun/immobilize let the current step finish but start no new one.
 if(!segment&&path.length&&playerControl.can('move')){
  const to=path.shift();segment={from:player.position.clone(),to,age:0,height:to.h-player.position.y};
  facing=Math.atan2(to.x-tile.x,to.z-tile.z);
 }
 // Turn by the shortest arc instead of snapping at tile corners.
 const turn=Math.atan2(Math.sin(facing-player.rotation.y),Math.cos(facing-player.rotation.y));
 player.rotation.y+=turn*(1-Math.exp(-dt*16));
 if(segment){
  // Celerity (+0.2% per point) and Rush add to sprint against base walking speed.
  // A diagonal step takes as long as any other (docs/MOVEMENT-PLAN.md).
  segment.age+=playerResources.advance(dt,true,walkBonus())*(1-playerControl.slowFraction);
  // The shared move (slime-motion.js): a slide, a smooth ramp on stairs, or a hop up or down a ledge.
  const move=moveMotion(segment.age,tile,segment.to),stepped=move.stepped,duration=move.duration;
  expression=stepped?(segment.age<.32?'preparing':'struggle'):'focused';
  player.position.set(
    THREE.MathUtils.lerp(segment.from.x,segment.to.x-6,move.distance),
    segment.from.y+move.rise,
    THREE.MathUtils.lerp(segment.from.z,segment.to.z-6,move.distance)
  );
  pose=move.pose;
  if(segment.age>=duration){tile=segment.to;player.position.set(tile.x-6,standHeight(tile),tile.z-6);segment=null;if(!path.length)opening.arrived(tile);}
 }else if(!path.length){
  if(chopTarget){const node=chopTarget;chopTarget=null;resourceActions.start(node);}
  if(actorTarget){
    const actor=actorTarget,centre=bodyCenter(actor);facing=Math.atan2(centre.x-tile.x,centre.z-tile.z);
    actorTime+=dt;handWork=actor.duration?actorTime:null;expression=actor.duration?'focused':'idle';
    feedback.interacting(actor.duration?'Opening':'Traveling');
    if(actorTime>=actor.duration){actorTarget=null;actorTime=0;feedback.complete();if(actor===companions.actor)companions.pet();else if(actor.enemy)combat.start(actor);else if(actor.resourceNode)resourceActions.start(actor);else if(actor.carpentry){if(actor.available())carpentry.start(actor);else if(actor.interact)actor.interact();else areas.notify('interact',actor);}else if(actor.fishing)fishing.start(actor);else if(actor.campfire)campfires.interact(actor);else if(actor.crystal){gameAudio.play('portal');actor.interact();}else if(actor.interact)actor.interact();else areas.notify('interact',actor);}
  }else if(target&&!target.depleted){const node=target;target=null;resourceActions.start(node);
  }else{if(!(__PLAYGROUND__&&debug?.holdingFeedback))feedback.arrived();}
 }
 // Sitting (props.js): settle onto the seat once you reach its spot; any other action stands you up.
 if(pendingSeat&&!segment&&!path.length){if(tile===pendingSeat.tile)seat={spot:pendingSeat,time:0};pendingSeat=null;}
 if(seat&&!segment&&!path.length){seat.time+=dt;const motion=seat.spot.seat?.motion||'Sit',social=socialMotion(motion,seat.time,{seatHeight:seat.spot.seat?.height}),p=seatPosition(seat.spot),k=Math.min(1,seat.time/.45),lift=motion==='Sit'?social.lift:(seat.spot.seat?.height||0)*k;pose=social.pose;expression=social.expression;socialHands=withGrip(social.hands,equipmentIdleHands({rightHand:equipment.slots.right,leftHand:equipment.slots.left}),social.grip);facing=seat.spot.angle;player.position.set(THREE.MathUtils.lerp(tile.x-6,p.x,k),tile.h+lift,THREE.MathUtils.lerp(tile.z-6,p.z,k));wasSeated=true;}
 else if(wasSeated&&!segment){wasSeated=false;player.position.set(tile.x-6,tile.h,tile.z-6);}
 if(__PLAYGROUND__&&debug){const preview=debug.frame(dt);if(preview){pose=preview.pose;handWork=preview.handWork;expression=preview.expression;socialHands=preview.hands&&preview.grip?withGrip(preview.hands,equipmentIdleHands({rightHand:equipment.slots.right,leftHand:equipment.slots.left}),preview.grip):preview.hands||null;sleeping=!!preview.sleeping;player.position.y=tile.h+preview.lift;}}
 const celebration=areas.celebration;
 if(celebration){facing=celebration.angle;}
 const shown=presentation.update(dt,elapsed,{pose,expression,handWork,socialHands,motion:actionMotion,moving:!!segment,celebration,happy:elapsed<happyUntil,calm:characterDialogue.active,
  face:characterDialogue.expressionFor('left')||areas.expression||null,gearMotion:(__PLAYGROUND__&&debug?.combatMotion)||actionMotion,working:recipeCrafting.working,
  debugTools:__PLAYGROUND__&&debug?{chopping:debug.chopping,mining:debug.mining,time:debug.time}:null});
 if(shown.acting)sleeping=false;
 playerFace=shown.expression;
 contactShadow.update(player.position,visual.scale,player.visible);
 for(const tree of trees)tree.highlight.update((['boulder','copper'].includes(tree.kind)?craftingTutorial.highlightBoulders:craftingTutorial.highlightTrees)&&!tree.depleted,elapsed,pointerOnCanvas&&canMove()&&hover?.tree===tree&&!tree.depleted);
 const showResourceArrows=!opening.finished&&opening.canGather&&inventory.sticks+inventory.stones===0;

 const closeup=celebration?Math.min(THREE.MathUtils.smoothstep(celebration.age,0,1),1-THREE.MathUtils.smoothstep(celebration.age,3.3,4.3)):0;
 const areaFocus=areas.cameraFocus;
 let viewAngle=angle+(celebration?Math.atan2(Math.sin(celebration.angle-angle),Math.cos(celebration.angle-angle))*closeup:0),viewZoom=THREE.MathUtils.lerp(zoom,4.6,closeup),viewElevation=THREE.MathUtils.lerp(elevation,.27,closeup);
 if(__PLAYGROUND__&&freeCam)panFreeCamera(dt);
 const focus=__PLAYGROUND__&&freeCam?cameraFocus.copy(freeCam.focus):cameraFocus.copy(player.position).add(focusLift.set(0,.35+closeup*.3,0));if(!(__PLAYGROUND__&&freeCam)&&areaFocus){focus.lerp(areaFocus.position,areaFocus.blend);viewZoom=THREE.MathUtils.lerp(viewZoom,areaFocus.zoom??viewZoom,areaFocus.blend);viewElevation=THREE.MathUtils.lerp(viewElevation,areaFocus.elevation??viewElevation,areaFocus.blend);}
 if(__PLAYGROUND__)perfProbe.lap('player');
 const horizontalDistance=viewZoom*Math.cos(viewElevation);camera.position.set(focus.x+Math.sin(viewAngle)*horizontalDistance,focus.y+Math.sin(viewElevation)*viewZoom,focus.z+Math.cos(viewAngle)*horizontalDistance);camera.lookAt(focus);camera.updateMatrixWorld();updateCutaway({player:player.position,camera:camera.position,building:tile?.building??-1,force:forceCutaway});updateHover();if(__PLAYGROUND__)perfProbe.lap('hover');for(const resource of resources)resource.highlight.update(showResourceArrows&&!resource.depleted,elapsed,pointerOnCanvas&&canMove()&&hover?.resource===resource&&!resource.depleted);feedback.update(dt,elapsed,camera);updateSkillRewards(dt,camera,gameViewport().width,gameViewport().height);sleepFeedback.update(dt,sleeping,player.position,camera);updatePlayerPlate();if(__PLAYGROUND__)perfProbe.lap('feedback');renderer.render(scene,camera);quality.afterRender(scene);
}
if(__PLAYGROUND__){
 trainingFixtures=playground.createTrainingFixtures({scene,world,pickables,resources:resourceActions,combat,styles,supplies,openStation,stop:stopAll,approach:selectActor,tile:()=>tile,occupied:t=>t===tile||companions.occupies(t)||pickables.some(m=>m.userData.tile===t&&isVisible(m)&&(m.userData.actor||m.userData.resource)),clearUI:()=>areas.notify('clearUI')});
 combatFixtures=playground.createCombatFixtures({combat,world,scene,pickables,tile:()=>tile,stop:stopAll,approach:selectActor,occupied:t=>t===tile||companions.occupies(t)||pickables.some(m=>m.userData.tile===t&&isVisible(m)&&(m.userData.resource||m.userData.actor)),clearUI(){areas.notify('clearUI');}});
 walkThroughFixtures=playground.createWalkThroughFixtures({scene,world,pickables,combat,tile:()=>tile,stop:stopAll,moveTo:t=>moveTo(t),characterAt,occupied:t=>t===tile||characterAt(t)||pickables.some(m=>m.userData.tile===t&&isVisible(m)&&(m.userData.resource||m.userData.actor)),clearUI(){areas.notify('clearUI');}});
 edgeFixtures=playground.createEdgeFixtures({scene,world,pickables,tile:()=>tile,stop:stopAll,moveTo:t=>moveTo(t),occupied:t=>t===tile||characterAt(t)||pickables.some(m=>m.userData.tile===t&&isVisible(m)&&(m.userData.resource||m.userData.actor)),clearUI(){areas.notify('clearUI');}});
 movementFixtures=playground.createMovementFixtures({scene,world,pickables,tile:()=>tile,stop:stopAll,occupied:t=>t===tile||characterAt(t)||pickables.some(m=>m.userData.tile===t&&isVisible(m)&&(m.userData.resource||m.userData.actor)),clearUI(){areas.notify('clearUI');},
  routes:()=>[{kind:'player',tiles:[tile,...(segment?[segment.to]:[]),...path]},{kind:'companion',tiles:companions.route},...combat.routes().map(tiles=>({kind:'enemy',tiles}))]});
 carpentryFixture=playground.addCarpentryFixture({world:clearingTiles,currentWorld:world,scene:clearingGroup,pickables,clearingObjects});
 playground.addFishingFixture({world:clearingTiles,scene:clearingGroup,fishingSpots,clearingObjects});
 // Streaming test (playground only): a generated 512 × 512 world streamed in chunks (world-grid.js) through the
 // shared chunk streamer. Created on first use; dynamic imports keep it out of the normal build.
 let streamSandbox=null;
 async function streamSandboxReady(){
  if(streamSandbox)return streamSandbox;
  const [{createStreamWorld},{createChunkStreamer}]=await Promise.all([import('./dev/stream-world-gen.js'),import('./chunk-streamer.js')]);
  const source=createStreamWorld(),group=new THREE.Group(),tiles=new Map(),water=new THREE.Color('#6fa8d6');scene.add(group);
  const streamer=createChunkStreamer({source,maps:[world,tiles],parent:group,pickables,resources:resourceActions,topColor:t=>t.water?water:grass[(t.x*7+t.z)%4].color});
  const spawn=source.spawn();
  areas.register({id:'stream-test',name:'Streaming test',description:'Playground: a generated world streamed in chunks',listed:()=>false,group,tiles,
   camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},arrival:()=>tiles.get(key(spawn.x,spawn.z)),update:dt=>streamer.update(dt,tile)});
  return streamSandbox={source,streamer,tiles,spawn};
 }
 // Lands on a loaded tile at (x, z) or the nearest land around it, loading its neighborhood first.
 function streamLand(x,z){
  const {streamer,tiles,source}=streamSandbox;
  for(let r=0;r<12;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const t=source.tile(x+dx,z+dz);if(!t||t.water)continue;streamer.prime(t.x,t.z);const landing=tiles.get(key(t.x,t.z));if(landing&&!landing.blocked)return landing;}
  return null;
 }
 // Biome test (playground only; docs/BIOMES.md): every starter biome as a band of land, north to south,
 // hills down to the sea, streamed through the shared chunk streamer with the real fishing spots,
 // enemies, resources, water and ground cover. Reseeding rebuilds it.
 const BIOME_BANDS=['hills','pines','forest','meadow','wetland','coast'],BIOME_BAND=3,BIOME_SIZE=192;
 let biomeSandbox=null;
 async function biomeSandboxReady(seed){
  const [{createBiomeLand},{createChunkStreamer},{createGroundCoverPool}]=await Promise.all([import('./biome-land.js'),import('./chunk-streamer.js'),import('./ground-cover.js')]);
  if(!biomeSandbox){const group=new THREE.Group(),tiles=new Map();scene.add(group);
   biomeSandbox={group,tiles,seed:1,source:null,streamer:null,cover:createGroundCoverPool({parent:group})};streamedWorlds.add(biomeSandbox);
   areas.register({id:'biome-test',name:'Biome test',description:'Playground: every biome side by side',listed:()=>false,group,tiles,music:'world',ambience:'meadow',
    camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},arrival:()=>biomeSandbox.landing,biomeAt:(x,z)=>biomeSandbox.source?.biomeAt(x,z)??null,
    // Streamed tiles join the live world map only while you're here (as Gelton's countryside does).
    enter(){if(!biomeSandbox.maps.includes(world))biomeSandbox.maps.push(world);},leave(){const i=biomeSandbox.maps.indexOf(world);if(i>=0)biomeSandbox.maps.splice(i,1);},
    update:dt=>{biomeSandbox.streamer.update(dt,viewTile());streamWater?.update(dt);}});}
  const sb=biomeSandbox;if(sb.source&&(seed===undefined||seed===sb.seed))return sb;
  if(seed!==undefined)sb.seed=seed;
  if(sb.streamer){sb.streamer.reset();sb.streamer.group.removeFromParent();}
  // Past the bands, the sea (terrain) off the coast.
  const cells={},terrain={};for(let cz=0;cz<BIOME_SIZE/8;cz++)for(let cx=0;cx<BIOME_SIZE/8;cx++){const band=BIOME_BANDS[Math.floor(cz/BIOME_BAND)];cells[`${cx},${cz}`]=band||'coast';if(!band)terrain[`${cx},${cz}`]='sea';}
  sb.source=createBiomeLand({seed:sb.seed,bounds:[0,0,BIOME_SIZE,BIOME_SIZE],map:{default:'meadow',cells,terrain}});
  const maps=[sb.tiles];if(areas.id==='biome-test')maps.push(world);
  sb.streamer=createChunkStreamer({source:sb.source,maps,parent:sb.group,pickables,resources:resourceActions,topColor:sb.source.topColor,place:placeLandExtra,dress:landDress(sb.source,sb.cover),radius:drawRadius()});
  sb.maps=maps;return sb;
 }
 // The middle of a biome's band (x across the land, z its band's centre), or of the meadow.
 const biomeSpot=id=>{const i=BIOME_BANDS.indexOf(id);return [BIOME_SIZE/2,(i<0?3:i)*BIOME_BAND*8+BIOME_BAND*4];};
 // Lands on the nearest dry tile to (x, z) in the biome test, loading around it first.
 function biomeLand(x,z){
  const {streamer,tiles,source}=biomeSandbox;
  for(let r=0;r<16;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const t=source.tile(x+dx,z+dz);if(!t||t.water)continue;streamer.prime(t.x,t.z);const landing=tiles.get(key(t.x,t.z));if(landing&&!landing.blocked)return landing;}
  return null;
 }
 // Building test map (playground only): three buildings of shared walls and doors. Created on first use.
 let buildingTest=null;
 async function buildingTestReady(){
  if(buildingTest)return buildingTest;
  const {createBuildingTestMap}=await import('./dev/building-test-map.js');
  const built=createBuildingTestMap({scene,pickables});
  areas.register({id:'building-test',name:'Building test map',description:'Playground: buildings, walls and doors',listed:()=>false,group:built.group,tiles:built.tiles,
   camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},arrival:()=>built.spawn,
   reset(){for(const d of built.doors){d.setLocked(false);d.setOpen(false);}}});
  return buildingTest=built;
 }
 // Playground maps (map data built by the shared builder): the prop gallery (city Phase 10) and the
 // kit street (the building kit's test street: terraces, stairs, interiors, a crypt, townsfolk).
 const loadedMaps={};
 async function mapReady(id){
  if(loadedMaps[id])return loadedMaps[id];
  const [{buildMap},data]=await Promise.all([import('./world-map.js'),id==='kit-street'?import('./dev/kit-street.js').then(m=>m.kitStreetData()):import('./dev/prop-gallery.js').then(m=>m.propGalleryData())]);
  const built=buildMap(data,{scene,pickables});built.areaId=id;
  if(id==='kit-street')attachCrowd(built);
  areas.register({id,name:{'kit-street':'Kit street','prop-gallery':'Prop gallery'}[id],description:'Playground: '+(id==='kit-street'?'the building kit':'every prop'),listed:()=>false,group:built.group,tiles:built.tiles,update:(dt,time,view)=>{built.crowd?.update(dt,time,{camera:view});},
   camera:{zoom:22,angle:Math.PI/4,elevation:THREE.MathUtils.degToRad(35.264)},arrival:()=>built.spawn,
   reset(){for(const d of built.doors)if(!d.locked)d.setOpen(false,{quiet:true});}});
  return loadedMaps[id]=built;
 }
 // World editor (playground only; city Phase 6): one area whose contents the editor rebuilds from data.
 let editorArea=null;
 updateFloorHere=()=>{const h=spaces.here;floorHere.value=h&&h.builtMap===editorArea?.built?(h.dungeon!==undefined?{dungeon:h.dungeon,level:h.level}:{building:h.building,level:h.level}):null;};
 // dirty: the chunk ids an edit touched. When the map being edited is this same data, only those
 // chunks are rebuilt (world-map.js rebuild); otherwise, or when rebuild declines, everything is.
 // at: {x, z} to land on instead (the editor opening on the map you stand in).
 async function editMap(data,{keepPlayer=true,dirty=null,at=null}={}){
  const {buildMap}=await import('./world-map.js');
  const current=editorArea?.built;
  if(dirty&&current&&current.data===data&&areas.id==='world-editor'){spaces.forget(current);
   // Only the map's own tiles are refreshed in the area's map; the streamed land's stay, except the
   // chunks under the edit, which reload around it (their trees and cover follow the town's ground).
   const streamer=editorArea.land?.streamer,wrap=streamer?(only,run)=>streamer.reload(only,run):null;
   // A rebuild refills the same tile objects, so the area's map needs nothing new.
   // The land is kept in step with the data by partial rebuilds (a repainted biome forgets its area first).
   // An editor rebuild is a loading stall, not the device's speed: Auto quality warms up again.
   if(current.rebuild(dirty,{wrap})){quality.settle();attachCrowd(current);if(editorArea.land)editorArea.land.landKey=JSON.stringify([data.land,data.size]);return current;}}
  if(!editorArea){const group=new THREE.Group();group.name='world-editor';scene.add(group);editorArea={group,tiles:new Map(),built:null,land:null};
   // The edited map's Iter Crystals: destinations of their own (crystal-places.js), the ground round one loaded before you arrive.
   crystalPlaces.provide('world-editor',()=>{const b=editorArea.built;return b?mapCrystals(b.data).map(c=>({id:c.id,name:c.name,known:!!c.known,tile:()=>b.tiles.get(key(c.x,c.z)),prime:()=>{editorArea.land?.streamer.prime(c.x,c.z);b.stream?.(b.tiles.get(key(c.x,c.z)));}})):[];});
   streamedWorlds.add({get streamer(){return editorArea.land?.streamer;},get builtMap(){return editorArea.land?editorArea.built:null;}});
   areas.register({id:'world-editor',name:'World editor',description:'Playground: world editor',listed:()=>false,group,tiles:editorArea.tiles,arrival:()=>editorArea.built?.spawn,
    prime:(x,z)=>{editorArea.land?.streamer.prime(x,z);const b=editorArea.built,t=b?.tiles.get(key(x,z));if(t)b.stream?.(t);},
    biomeAt:(x,z)=>editorArea.land?.land.biomeAt(x,z)??null,
    // The land around the map joins the live world map while you're here (as any streamed countryside).
    enter(){const m=editorArea.land?.maps;if(m&&!m.includes(world))m.push(world);},leave(){const m=editorArea.land?.maps,i=m?m.indexOf(world):-1;if(i>=0)m.splice(i,1);},
    update:(dt,time,view)=>{editorArea.built?.crowd?.update(dt,time,{camera:view});if(editorArea.land){const at=viewTile();editorArea.built?.stream(at);editorArea.land.streamer.update(dt,at);streamWater?.update(dt);}},
    reset(){for(const d of editorArea.built?.doors||[])if(!d.locked)d.setOpen(false,{quiet:true});}});}
  const here=at||(keepPlayer&&areas.id==='world-editor'?{x:tile.x,z:tile.z}:null);
  if(editorArea.built){spaces.forget(editorArea.built);editorArea.built.crowd?.dispose();editorArea.built.dispose();}
  await editorLand(data);
  // On the land, the town's chunks show by the land's rule (radius 1), so ground and buildings stream together.
  // A map on the land streams its content per chunk too (world-map.js lazy; docs/TOWN.md, Streaming a map's content).
  const built=buildMap(data,{scene:editorArea.group,pickables,visible:true,land:editorArea.land?.land,streamRadius:editorArea.land?drawRadius():null,lazy:!!editorArea.land,
   crystal:(t,parent,entry,tileAt)=>crystals.add({tile:t,parent,place:entry.id,label:'Use Iter Crystal',tileAt})});built.areaId='world-editor';editorArea.built=built;attachCrowd(built);loadedMaps['world-editor']=built;
  editorArea.tiles.clear();for(const [k,t] of built.tiles)editorArea.tiles.set(k,t);
  let landing=here&&(built.tiles.get(key(here.x,here.z))||built.ground?.tile(here.x,here.z));if(!landing||landing.blocked||landing.water)landing=built.spawn;
  const first=areas.id!=='world-editor';stopAll();splash.close();opening.enterFreePlay();if(first)craftingTutorial.reset();
  // The land around the landing loads first, so a landing out on it has ground.
  editorArea.land?.streamer.prime(landing.x,landing.z);built.stream(landing);areas.activate('world-editor',{landing,arrival:false});
  companions.resetRoute(landing);$('scene-fade').hidden=true;$('game-menus').hidden=false;quality.settle();
  return built;
 }
 // The biome land a map in the editor stands on (data.land: {seed, default, cells, origin}; docs/BIOMES.md,
 // docs/TOWN.md): generated by biome-land.js under and around the map, and streamed with the shared land
 // gameplay (town-ground.js townSource: the town's chunks are regular chunks; the map adds what is built on them).
 // Made again with each full build.
 async function editorLand(data){
  const old=editorArea.land;if(old){old.streamer.reset();old.streamer.group.removeFromParent();editorArea.land=null;}
  if(!data.land)return null;
  const [{townLand,townSource},{createChunkStreamer},{createGroundCoverPool}]=await Promise.all([import('./town-ground.js'),import('./chunk-streamer.js'),import('./ground-cover.js')]);
  // The land is kept between full builds while its settings are the same (generating it is the slow part).
  const landKey=JSON.stringify([data.land,data.size]),land=old?.landKey===landKey?old.land:townLand(data),source=townSource(land,()=>editorArea.built?.ground,()=>editorArea.built?.tiles,()=>editorArea.built?.data);
  if(land===old?.land)land.useCells(data.land.cells,data.land.terrain);
  editorArea.landCover??=createGroundCoverPool({parent:editorArea.group});
  const maps=[editorArea.tiles];if(areas.id==='world-editor')maps.push(world);
  const streamer=createChunkStreamer({source,maps,parent:editorArea.group,pickables,resources:resourceActions,topColor:source.topColor,place:placeLandExtra,dress:landDress(source,editorArea.landCover),radius:drawRadius()});
  return editorArea.land={land,landKey,source,streamer,maps};
 }
 let testCounter=null,testBoard=null;
 // Stand-ins for jobs in any map: a giver of each kind, and a recipient deliveries can go to.
 const TEST_RECIPIENT={id:'test-recipient',name:'Test recipient',house:{building:{shop:null,plan:{desc:{name:'the playground'}}}}};
 // A stand-in giver: the post office, or a keeper of a shop (by kind: smith → smithy and so on).
 const TEST_SHOPS={smith:'smithy',baker:'bakery',fishmonger:'fishmonger'};
 const testGiver=kind=>({id:`test-${kind}`,name:`Test ${kind} giver`,giver:kind==='post'?'post':null,house:TEST_SHOPS[kind]?{building:{shop:TEST_SHOPS[kind]}}:null,builtMap:{crowd:{folk:[TEST_RECIPIENT,...(crowdsByArea.get(areas.id)?.folk||[])]}}});
 const currentBuiltMap=()=>areas.id==='building-test'?buildingTest:areas.id==='gelton'?gelton:loadedMaps[areas.id]||null;
 playgroundApi={
  companions,
  // Playground maps: 'prop-gallery' or 'kit-street' (the perf scenarios' street).
  async enterMap(id){
   const {spawn}=await mapReady(id);stopAll();splash.close();opening.enterFreePlay();craftingTutorial.reset();
   areas.activate(id,{landing:spawn,arrival:false});companions.resetRoute(spawn);$('scene-fade').hidden=true;$('game-menus').hidden=false;return true;
  },
  // Walks to a tile (scripted checks), and uses the nearest prop of a kind (props.js) as a click would.
  walkTo(x,z){const t=world.get(key(x,z));if(!t)return false;moveTo(t);return path.length>0||t===tile;},
  useProp(kind){const props=[...new Set(pickables.map(m=>m.userData.actor).filter(a=>a?.def&&a.kind===kind&&isVisible(a.group)))].sort((a,b)=>Math.hypot(a.x-tile.x,a.z-tile.z)-Math.hypot(b.x-tile.x,b.z-tile.z));if(!props[0])return false;selectActor(props[0]);return true;},
  get seated(){return !!seat;},
  // Uses whatever actor (door, stairwell, prop…) is nearest a tile position, as a click on it would.
  useActorAt(x,z){const actor=[...new Set(pickables.map(m=>m.userData.actor).filter(a=>a&&a.x!==undefined))].filter(a=>{let o=null;for(const m of pickables)if(m.userData.actor===a){o=m;break;}return o&&isVisible(o);}).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];if(!actor||Math.hypot(actor.x-x,actor.z-z)>1.5)return false;selectActor(actor);return actor.label||actor.kind||true;},
  editMap,setTileClick(fn){tileClick=fn;},
  // Floors (spaces.js; docs/CITY.md, Floors): where you are, going to a floor or back out, following a door
  // or stairwell, and rebuilding a building's floors after an edit (you stay where you are).
  floorHere,
  enterLink(link){return !!link&&spaces.enter(link);},
  // owner: a building index, or {dungeon: id} (dungeons and caves by hand).
  enterFloor(building,level){const builtMap=editorArea?.built;if(!builtMap)return false;
   if(building?.dungeon!==undefined)return spaces.enter(level===-1?{kind:'dungeon',builtMap,id:building.dungeon}:{kind:'floor',builtMap,dungeon:building.dungeon,level,via:null});
   const entry=builtMap.data.buildings[building];
   if(level===0&&entry?.desc.interior!=='separate'){const t=builtMap.buildings[building]?.anchors.doors[0]?.doorstep;return spaces.enter({kind:'exit',area:'world-editor',tile:t?(Array.isArray(t)?[...t]:[t.x,t.z]):[...builtMap.data.spawn]});}
   return spaces.enter({kind:'floor',builtMap,building,level,via:null});},
  leaveFloor(){const here=spaces.here;if(!here)return false;const builtMap=here.builtMap;
   if(here.dungeon!==undefined){const t=entranceSpot(builtMap,here.dungeon)||builtMap.spawn;return spaces.enter({kind:'exit',area:builtMap.areaId,tile:[t.x,t.z]});}
   const t=builtMap.buildings[here.building]?.anchors.doors[0]?.doorstep;
   return spaces.enter({kind:'exit',area:builtMap.areaId,tile:t?(Array.isArray(t)?[...t]:[t.x,t.z]):[...builtMap.data.spawn]});},
  rebuildFloors(building){const builtMap=editorArea?.built;if(!builtMap)return false;spaces.rebuild(builtMap,building?.dungeon!==undefined?null:building,{at:[tile.x,tile.z],dungeon:building?.dungeon??null});updateFloorHere();return true;},
  get floorGroup(){return spaces.here?.group||null;},
  get floorTiles(){return spaces.here?.tiles||null;},setTileHover(fn){tileHover=fn;hoverTileId=null;},setEditorScreen(on){editorScreen=!!on;},
  // Free camera (docs/PLAYGROUND.md): on (from where the camera looks now) or off (back to the slime).
  freeCameraOn:freeCamOn,
  // The draw distance (render-quality.js), the same setting as the game's Settings: the world editor's top bar.
  drawDistance:quality.drawDistance,setDrawDistance:chunks=>quality.setDrawDistance(chunks),
  // Biome atmosphere (atmosphere.js) on or off: the world editor's View.
  atmosphereOn,
  // Iter Crystal discovery (crystal-places.js): every crystal at once, or forget them all; and what's known.
  discoverAllCrystals(){crystalPlaces.discoverAll();return crystalPlaces.discovered.length;},forgetCrystals(){crystalPlaces.reset();},
  get crystalPlaces(){return crystalPlaces.list().map(p=>({id:p.id,name:p.name,area:p.area,listed:crystalPlaces.listed(p.id)}));},
  // The tile the view is over (the free camera's focus, else the slime's).
  viewTile:()=>viewTile(),
  // Whether any of these tiles ([x, z]) is on screen above the editor's bottom panels (the world editor's paint
  // warns when what it changes isn't).
  inView(cells){const v=new THREE.Vector3(),step=Math.max(1,Math.floor(cells.length/40));for(let i=0;i<cells.length;i+=step){const [x,z]=cells[i];v.set(x-6,world.get(key(x,z))?.h??0,z-6).project(camera);if(v.z<1&&Math.abs(v.x)<=1&&v.y<=1&&v.y>=-.35)return true;}return false;},
  // Moves the view over a tile (the world editor's checks): the free camera's focus (turned on if it's off).
  lookAt(x,z){if(!freeCam)this.freeCamera(true);const t=world.get(key(x,z));freeCam.focus.set(x-6,t?.h??freeCam.focus.y,z-6);return true;},
  // Moves the slime to where the view is (the free camera's focus): the nearest open tile, searching outwards
  // (the world editor's Play and Player here, the debug tool). Returns the tile, or null when none is near.
  playerHere(){const at=viewTile();for(let r=0;r<=8;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;if(this.teleport(at.x+dx,at.z+dz))return tile;}return null;},
  freeCamera(on=!freeCam){
   if(on&&!freeCam)freeCam={focus:cameraFocus.clone()};
   else if(!on&&freeCam){freeCam=null;panKeys.clear();zoom=Math.min(zoom,areas.active?.maxZoom??34);camera.far=baseFar;camera.updateProjectionMatrix();sunAnchor='';}
   freeCamOn.value=!!freeCam;return !!freeCam;},
  // The map you stand in, for the editor to open on: its data, area and your tile (null elsewhere).
  currentMap(){const map=areas.id==='world-editor'?editorArea?.built:currentBuiltMap();return map?.data?{data:map.data,areaId:areas.id,at:{x:tile.x,z:tile.z}}:null;},setTileDrag(fn){tileDrag=fn;if(!fn)painting=false;},toast:text=>toast(text),
  // Townsfolk (city Phase 8): replace the current city's crowd with n generated townsfolk (0 = the city's own).
  async crowd(n){const map=currentBuiltMap();if(!map?.crowd)return null;const {generateTownsfolk}=await import('./townsfolk.js');map.data.ownTownsfolk??=map.data.townsfolk;map.data.townsfolk=n?generateTownsfolk(map,n):map.data.ownTownsfolk;attachCrowd(map);return map.crowd.folk.length;},
  get crowdStats(){const map=currentBuiltMap();return map?.crowd?{count:map.crowd.folk.length,...map.crowd.stats,fields:map.crowd.navigator.cached,activities:Object.fromEntries(map.crowd.folk.reduce((m,p)=>m.set(p.activity||'idle',(m.get(p.activity||'idle')||0)+1),new Map())),folk:map.crowd.folk.map(p=>({name:p.name,tile:[p.tile.x,p.tile.z],activity:p.activity||'idle',state:p.state,ring:p.ring,visible:p.group.visible,parentVisible:!!p.group.parent?.visible,y:+p.group.position.y.toFixed(2)}))}:null;},
  // The capital (city Phase 9; playground for now): src/maps/capital.json, built per chunk and streamed
  // around the player, with its townsfolk.
  async enterCapital(){
   const built=await geltonReady();stopAll();splash.close();opening.enterFreePlay();craftingTutorial.reset();
   const landing=travel.landingFor('gelton')||built.spawn;areas.activate('gelton',{landing,arrival:false});built.stream(landing);companions.resetRoute(landing);$('scene-fade').hidden=true;$('game-menus').hidden=false;return true;
  },
  // Economy (economy.js, shops.js): the wallet and shops, any shop by id, and a shop counter placed
  // beside you in any map (the real prop and trade path; one at a time).
  wallet,shops,shopIds:()=>Object.keys(shops.shops),openShop:id=>shopMenu.open(id),
  placeShopCounter(shopId){
   testCounter?.dispose();testCounter=null;
   const at=(x,z)=>world.get(key(x,z)),free=(x,z)=>{const t=at(x,z);return t&&!t.blocked&&!t.water&&!t.prop&&t!==tile&&Math.abs(t.h-tile.h)<.1;};
   for(let r=2;r<7&&!testCounter;r++)for(let dz=-r;dz<=r&&!testCounter;dz++)for(let dx=-r;dx<=r;dx++){const x=tile.x+dx,z=tile.z+dz;
    if([0,1,2].every(i=>free(x+i,z))&&[0,1,2].every(i=>free(x+i,z+1))){testCounter=createProp('shopCounter',{origin:[x,z],rotation:180,tileAt:at,parent:areas.get(areas.id)?.group||scene,pickables,shop:shopId});break;}}
   return testCounter?[testCounter.x,testCounter.z]:null;
  },
  removeShopCounter(){testCounter?.dispose();testCounter=null;},
  // Drops (drops.js): roll any enemy's table without a fight (with its odds), drop a pile beside you,
  // and fix the random seed (null: random again).
  enemyIds:()=>Object.keys(ENEMIES),
  rollDrops(id){return {items:rollDrops(ENEMIES[id]?.drops,dropRandom),odds:dropOdds(ENEMIES[id]?.drops)};},
  spawnLoot(id){const items=id?rollDrops(ENEMIES[id]?.drops,dropRandom):{gold:25,logs:2,copperOre:1};const at=[[1,0],[0,1],[-1,0],[0,-1]].map(([dx,dz])=>world.get(key(tile.x+dx,tile.z+dz))).find(t=>t&&!t.blocked&&!t.water);
   if(!at)return null;return lootPiles.spawn({tile:at,parent:areas.active?.group||scene,items})?items:{};},
  setDropSeed(seed){dropRandom=seed==null?Math.random:seededRandom(seed);},
  clearLoot(){lootPiles.clear();},
  get lootPiles(){return lootPiles.piles.map(p=>({at:[p.x,p.z],items:p.items,age:Math.round(p.age)}));},
  // Jobs (jobs.js): the board, a stand-in giver of any kind (any map), a stand-in delivery recipient,
  // finishing or abandoning instantly, and a reset.
  jobs,openJobBoard,
  placeNoticeboard(){testBoard?.dispose();testBoard=null;const at=(x,z)=>world.get(key(x,z));
   for(const [dx,dz] of [[0,-2],[2,0],[-2,0],[0,2],[2,2]]){const t=at(tile.x+dx,tile.z+dz);if(t&&!t.blocked&&!t.water&&!t.prop){testBoard=createProp('noticeboard',{origin:[t.x,t.z],tileAt:at,parent:areas.active?.group||scene,pickables});return [t.x,t.z];}}return null;},
  talkToTestGiver(kind){talkTo(testGiver(kind),'(A stand-in giver for the playground.)');},
  talkToTestRecipient(){talkTo(TEST_RECIPIENT,'(A stand-in delivery recipient.)');},
  finishJobs(){for(const j of jobs.active)jobs.forceReady(j.key);return jobs.active.length;},
  handInAll(){let n=0;for(const j of jobs.active){const r=jobs.handIn(j.key);if(r.ok){n++;jobReceipt(r);}}return n;},
  abandonJobs(){for(const j of jobs.active)jobs.abandon(j.key);},
  resetJobs(){jobs.reset();},clearJobCooldowns(){jobs.clearCooldowns();},
  // Countryside (countryside.js; docs/WORLD.md): jump to a place (its chunks load first), its landmark
  // spots, the chunk outlines, and streaming stats.
  async countrysideJump(place){
   const built=await geltonReady();if(areas.id!=='gelton')await playgroundApi.enterCapital();
   const {source,streamer}=built.countryside,size=built.data.size[0],gate=side=>built.data.gates.find(g=>g.side===side),eastMid=gate('east').from+1;
   const spots={'west-road':[-source.roads.find(r=>r.side==='west').length+3,Math.round(source.roads.find(r=>r.side==='west').mid)],lake:[Math.round(source.lake.x),Math.round(source.lake.z+source.lake.r+3)],
    bridge:[Math.round(source.riverX(eastMid))-4,eastMid],'west-gate':[5,gate('west').to+2],'south-gate':[gate('south').to+2,size-7],ruins:[size-26,-26],'south-road':[Math.round(size/2),size+40],hills:[size+20,-40],woods:[-30,110],pond:[Math.round(source.pond.x),Math.round(source.pond.z-source.pond.r-3)]};
   let [x,z]=Array.isArray(place)?place:spots[place]||[];if(x===undefined)return null;
   streamer.prime(x,z,2);
   for(let r=0;r<8;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const t=world.get(key(x+dx,z+dz));if(t&&!t.blocked&&!t.water&&!characterAt(t)){playgroundApi.teleport(t.x,t.z);return [t.x,t.z];}}
   return null;
  },
  // City greens (city-greens.js): stand in the biggest mini biome of a kind.
  async cityBiomeJump(biome){const built=await geltonReady();if(areas.id!=='gelton')await playgroundApi.enterCapital();
   const patch=(built.greens?.patches||[]).filter(r=>r.biome===biome).sort((a,b)=>b.tiles.length-a.tiles.length)[0];if(!patch)return null;
   const free=patch.tiles.filter(t=>!t.blocked),mid=free[Math.floor(free.length/2)];return mid&&playgroundApi.teleport(mid.x,mid.z)?[mid.x,mid.z]:null;},
  countrysideSpots:['west-gate','south-gate','west-road','lake','pond','bridge','ruins','hills','woods','south-road'],
  get countrysideStats(){const c=gelton?.countryside;return c?{...c.streamer.stats,radius:c.streamer.radius}:null;},
  countrysideBounds(on){const c=gelton?.countryside;if(!c)return false;c.streamer.showBounds=on;return true;},
  countrysideRadius(r){const c=gelton?.countryside;if(!c)return null;c.streamer.radius=r;return c.streamer.radius;},
  // The scene and renderer, for inspecting in scripted browser checks (playground only).
  get scene(){return scene;},get renderer(){return renderer;},
  get capitalStats(){const c=gelton;return c?{chunks:c.chunks.size,shown:c.shownChunks,buildings:c.buildings.length,props:c.props.length,townsfolk:c.crowd?.folk.length}:null;},
  // Puts the player on a tile of the current map (city playground jumps); false if there is no such free tile.
  teleport(x,z){const t=world.get(key(x,z));if(!t||t.blocked||t.water)return false;stopAll();segment=null;path=[];tile=t;player.position.set(t.x-6,t.h,t.z-6);companions.resetRoute(t);return true;},
  // Force cutaway: every building cut (no roofs, walls one storey), like the building test map.
  toggleForceCutaway(){forceCutaway=!forceCutaway;return forceCutaway;},
  // The world editor's walls (docs/TOWN.md, Decorating indoors): 'up' (as in the game), 'cut' (every building
  // cut to one storey) or 'down' (every wall just above the floor).
  setWalls(mode){forceCutaway=mode!=='up';setCutHeight(mode==='down'?.35:CUT_HEIGHT);},
  async enterBuildingTest(){
   const {spawn}=await buildingTestReady();stopAll();splash.close();opening.enterFreePlay();craftingTutorial.reset();
   areas.activate('building-test',{landing:spawn,arrival:false});companions.resetRoute(spawn);$('scene-fade').hidden=true;$('game-menus').hidden=false;return true;
  },
  // Biome test (docs/BIOMES.md): enter, stand in a biome, reseed, and what's under you.
  biomeIds:BIOME_BANDS,
  async enterBiomeTest(id='meadow'){const sb=await biomeSandboxReady();const [x,z]=biomeSpot(id);sb.landing=biomeLand(x,z);if(!sb.landing)return false;
   stopAll();splash.close();opening.enterFreePlay();craftingTutorial.reset();areas.activate('biome-test',{landing:sb.landing,arrival:false});
   sb.streamer.prime(sb.landing.x,sb.landing.z);companions.resetRoute(sb.landing);$('scene-fade').hidden=true;$('game-menus').hidden=false;return true;},
  async biomeJump(id){if(areas.id!=='biome-test')return playgroundApi.enterBiomeTest(id);const [x,z]=biomeSpot(id),t=biomeLand(x,z);return t?playgroundApi.teleport(t.x,t.z):false;},
  async biomeReseed(){const sb=biomeSandbox;if(!sb)return null;const at=[tile.x,tile.z];await biomeSandboxReady(sb.seed+1);if(areas.id==='biome-test'){const t=biomeLand(...at);if(t)playgroundApi.teleport(t.x,t.z);}return sb.seed;},
  get biomeHere(){return areas.id==='biome-test'&&biomeSandbox?`${biomeSandbox.source.describe(tile.x,tile.z)} · seed ${biomeSandbox.seed}`:null;},
  biomeBounds(on){if(!biomeSandbox?.streamer)return false;biomeSandbox.streamer.showBounds=on;return true;},
  get biomeStats(){return biomeSandbox?{seed:biomeSandbox.seed,...biomeSandbox.streamer.stats}:null;},
  async enterStreamTest(){
   const {spawn}=await streamSandboxReady();stopAll();splash.close();opening.enterFreePlay();craftingTutorial.reset();
   const landing=streamLand(spawn.x,spawn.z);if(!landing)return false;
   areas.activate('stream-test',{landing,arrival:false});companions.resetRoute(landing);$('scene-fade').hidden=true;$('game-menus').hidden=false;return true;
  },
  streamTeleport(dx,dz){
   if(areas.id!=='stream-test')return false;stopAll();
   const landing=streamLand(tile.x+dx,tile.z+dz);if(!landing)return false;
   tile=landing;player.position.set(landing.x-6,landing.h,landing.z-6);companions.resetRoute(landing);return true;
  },
  get streamStats(){return streamSandbox?{...streamSandbox.streamer.stats,radius:streamSandbox.streamer.radius,player:areas.id==='stream-test'?{x:tile.x,z:tile.z}:null}:null;},
  set streamRadius(value){if(streamSandbox)streamSandbox.streamer.radius=value;},
  set streamBounds(value){if(streamSandbox)streamSandbox.streamer.showBounds=value;},
  streamStall(seconds){streamSandbox?.streamer.stall(seconds);},
  trainingAction:action=>trainingFixtures.run(action),
  // NPC slimes play any shared motion through their real actor (playground NPC slimes section).
  npcMotion(id,kind){if(id==='reed'){if(areas.id!=='willowbank')return 'Load a Willowbank checkpoint (or travel there) to see Reed.';kind?willow.debug.reed.play(kind):willow.debug.reed.stop();return kind?`Reed: ${kind}.`:'Reed: idle.';}
   const mentor=cinder.mentors[id];if(!mentor)return 'Unknown NPC.';if(areas.id!=='cinderhold')this.landmark(id);kind?mentor.play(kind):mentor.stop();return kind?`${MENTORS[id].name}: ${kind}.`:`${MENTORS[id].name}: idle.`;},
  landmark(name){stopAll();areas.notify('clearUI');opening.enterFreePlay();finale.ensurePortal();if(areas.id!=='cinderhold')areas.activate('cinderhold',{landing:travel.landingFor('cinderhold'),arrival:false});cinder.clearUI();const [x,z]=CINDERHOLD[name],targetTile=cinder.tiles.get(key(x,z)),route=interactionRoute(world,tile,{tile:targetTile,x,z});if(route){tile=route.at;player.position.set(tile.x-6,tile.h,tile.z-6);}},
  combatAction:action=>combatFixtures.run(action),
  walkThroughAction:action=>walkThroughFixtures.run(action),
  edgeAction:action=>edgeFixtures.run(action),
  set edgeOverlay(value){edgeFixtures.setOverlay(value);},
  movementAction:action=>movementFixtures.run(action),
  set routeOverlay(value){movementFixtures.setOverlay(value);},
  set occupancyOverlay(value){walkThroughFixtures.setOverlay(value);},
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
    if(checkpoint.step!=='arrival')cinder.checkpoint(checkpoint.step);return;
   }
   if(checkpoint.area==='willowbank'){
    finale.ensurePortal();areas.activate('willowbank',{landing:travel.landingFor('willowbank'),arrival:false});willow.debug.stage(checkpoint.step);return;
   }
   const step=checkpoint.step;
   Object.assign(inventory,{sticks:3,stones:3,axes:1,pickaxes:1,logs:3,stone:1});
   if(['color','name','mode'].includes(step)){this.customization();opening.debugCheckpoint(step);return;}
   if(['rotate','zoom','move','gather','gather-resume','xp','xp-benefits','level','level-encouragement','gather-complete'].includes(step)){
    if(['gather','gather-resume','xp','xp-benefits'].includes(step)){
     inventory.sticks=inventory.stones=0;
     if(step!=='gather'){resourceActions.restore(resources[0],{depleted:true,respawnIn:resources[0].respawn});inventory[resources[0].kind]=1;Object.assign(gatheringSkill,{xp:20,level:1});}
    }else if(step.startsWith('level')||step==='gather-complete'){for(const r of resources)resourceActions.restore(r,{depleted:true,respawnIn:r.respawn});Object.assign(gatheringSkill,{xp:120,level:2});}
    opening.debugCheckpoint(step);return;
   }
   const finaleSteps={closing:()=>finale.begin(),portal:()=>finale.dropPortal(),practice:()=>finale.resetPractice(),reward:()=>finale.revealReward(),chest:()=>finale.dropChest()};
   if(finaleSteps[step]){finaleSteps[step]();return;}
   Object.assign(gatheringSkill,{xp:120,level:2});
   if(['intro','craft-menu','recipe','crafting'].includes(step))inventory.axes=0;
   if(['mining-intro','pickaxe','mining-craft'].includes(step))inventory.pickaxes=0;
   await craftingTutorial.debugCheckpoint(step);
  },
  resetCurrentArea(){stopAll();travel.cancel();trainingFixtures.clear();combatFixtures.clear();walkThroughFixtures.clear();edgeFixtures.clear();movementFixtures.clear();if(areas.active.reset)areas.active.reset();else this.reset('all');},
  openInterface(name){
   splash.close();travel.cancel();stopAll();modals.closeAll('replaced');areas.notify('clearUI');craftingTutorial.reset();opening.enterFreePlay();$('game-menus').hidden=false;$('game-menus').inert=false;
   if(name==='cooking'){cookingMenu.open();return;}
   if(name==='furnace'){furnaceMenu.open();return;}if(name==='anvil'){anvilMenu.open();return;}if(name==='destinations'){destinations.open(null);return;}if(name==='combat-styles'){styleMenu.open();return;}
   if(name==='food-confirm'){health.restore();inventory.cookedFish=Math.max(1,inventory.cookedFish||0);food.start('cookedFish');return;}
   if(name==='companion-name'){if(!companions.state.owned)companions.acquire();companions.name();return;}
   if(name==='settings-popup'){settingsUI.open();return;}
   const entry=menus.panels.entryForTab('open-'+name);if(entry){menus.panels.setAvailable(entry.id,true);menus.panels.select(entry.id);}
  },
  resources:playerResources,health,
  sharedAction(name){splash.close();if(name==='heal')health.restore();else if(name==='hurt')health.value=Math.max(1,health.value-10);else if(name==='eat'){inventory.cookedFish=Math.max(1,inventory.cookedFish||0);food.start('cookedFish',true);}else willow.debug[name]();return health.value;},
  closeSplash(){splash.close();},
  tip,modals,
  grassPalette:playground.createGrassPaletteControls(()=>[...grass,...splash.grassMaterials,...willow.grassMaterials]),
  combatProfile:()=>combat.preview(),
  objectives:{add:()=>updateObjective('debug','Chop some wood','Obtain Small Logs by chopping regular trees in the clearing.',0,6),update:()=>updateObjective('debug','Chop some wood','Obtain Small Logs by chopping regular trees in the clearing.',3,6),complete:()=>finishObjective('debug'),reset:resetObjectives,tip:()=>craftingTutorial.previewTip(),
   // A separate quest for the Quests page: a finished objective, then one with two equal parts.
   quest(){registerQuestChapter('playground-','Playground Quest');updateObjective('playground-talk','Talk to the tester','Say hello.',1,1);updateObjective('playground-gather','Gather supplies','Collect both kinds in any order.',0,1,[{label:'Collect 3 Rocks',current:0,total:3},{label:'Collect 2 Sticks',current:0,total:2}]);},
   questAdvance(){const goal=objectives.get('playground-gather');if(!goal)return;const parts=goal.parts.map(p=>({...p}));const next=parts.find(p=>p.current<p.total&&p.current<=Math.min(...parts.map(q=>q.current)))??parts.find(p=>p.current<p.total);if(next)next.current++;updateObjective(goal.id,goal.title,goal.description,0,1,parts);},
   questFinish(){for(const id of ['playground-talk','playground-gather'])finishObjective(id);finishQuest('playground-');},
   // The end of the gathering lesson in one step: an objective completes as a skill levels up; only the level-up cue plays.
   questLevel(){this.quest();finishObjective('playground-gather');showSkillReward({skillName:'Gathering',xp:0,level:gatheringSkill.level,leveledUp:true},player.position,{float:false});}},audio:gameAudio,itemFeed,openSettings:()=>menus.panels.select('settings'),showCrafting(){menus.panels.select('crafting');},registerTab:tab=>menus.panels.register(tab),waterSettings,restartWater(){waterEffects.restart();splash.restartWater();willow.restartWater();},
  miningLesson(){this.reset('all');stopAll();finale.reset();Object.assign(inventory,{sticks:3,stones:3,pickaxes:0});for(const tree of trees)if(['boulder','copper'].includes(tree.kind))resourceActions.reset(tree);if(tile.blocked){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}craftingTutorial.startMining();},
  stopMiningLesson(){stopAll();craftingTutorial.reset();},
  // The nearest resource of a kind in the current map (tree, boulder, copper, sticks, stones), used as a
  // click would (any map, including streamed chunks).
  useResourceNearest(kind){const nodes=[...new Set(pickables.map(m=>m.userData.tree||m.userData.resource).filter(n=>n&&n.kind===kind&&!n.depleted&&world.get(key(n.x,n.z))===n.tile))].sort((a,b)=>Math.hypot(a.x-tile.x,a.z-tile.z)-Math.hypot(b.x-tile.x,b.z-tile.z));
   const node=nodes.find(n=>routeToTree(n));if(!node)return null;if(node.resourceNode&&['tree','boulder','copper'].includes(node.kind))selectTree(node);else moveTo(node.tile,node);return [node.x,node.z];},
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
  // Every character track is reachable here, including proficiencies not yet shown in Skills.
  skills:{...playerSkills(),...Object.fromEntries(TRACKS.map(d=>[d.name,character.tracks[d.id]]))},character,auras,assistance,playerControl,combatPreview:()=>combat.preview(),
  // Test-only control sources: the shared control state is real; nothing in content applies these yet.
  controlTest(action){const enemy=combat.engagedEnemy||combat.nearestEnemy(),effects={stun:{kind:'stun',duration:3,protection:6},immobilize:{kind:'immobilize',duration:3,protection:6},slow50:{kind:'slow',id:'test-slow-50',fraction:.5,duration:5,refresh:true},slow30:{kind:'slow',id:'test-slow-30',fraction:.3,duration:10,refresh:false}};
   if(action==='cleanse'){const ok=playerControl.cleanse({categories:['movement'],grant:10});return ok?'Cleansed movement control; 10s protection (longest window kept).':'Nothing to cleanse and protection already at least 10s.';}
   const [who,kind]=action.split(':'),target=who==='enemy'?enemy?.control:playerControl;if(!target)return 'No enemy nearby.';
   const r=target.apply(effects[kind]);return `${who==='enemy'?enemy.rules.name:'You'}: ${kind} ${r.applied?(r.refreshed?'refreshed':'applied'):'rejected — '+r.reason}.`;},
  // Dev-only requirement override so the real backfire path can be exercised (Full test area restores 1).
  spellRequirement(level){SPELLS.energyStrike.requirements['magic.technique']=Math.max(1,level);},
  addTestArmor(){for(const id of Object.keys(GEAR))if(GEAR[id].armor)inventory[id]=Math.max(1,inventory[id]||0);},
  learnCombatKit(on){if(on){styles.learnAbility('strongStrike');auras.learn('rush');auras.learn('harden');}else{auras.reset();styles.reset();}},
   // Quick slots (docs/COMBAT.md): Energy Strike as the quick spell, Rush and Harden in the quick-aura set.
   quickSlotKit(){styles.learn('energyStrike');this.learnCombatKit(true);styles.setQuickSpell('energyStrike');auras.setQuick('rush',true);auras.setQuick('harden',true);},queueStrongStrike:()=>combat.queue('strongStrike'),combatPending:()=>({pending:combat.pending,committed:combat.committedAbility,cooldown:food.cooldown}),combatDefense(){const p=combat.preview();return playerDefense(character,{activeStyle:p.combatStyle,strategy:p.strategy,shield:equipment.shield,bonusResistancePct:auras.resistancePct});},
  willow,areaId:()=>areas.id,travelTo:id=>{finale.ensurePortal();return travel.request(id);},cancelTravel:()=>travel.cancel(),usePortal(){const crystal=crystals.current()[0];if(crystal)selectActor(crystal);},resetFinale(){travel.cancel();if(areas.id!=='clearing')areas.activate('clearing',{landing:clearingTiles.get(key(SPAWN.x,SPAWN.z)),arrival:false});finale.reset();},enterWillow(){craftingTutorial.reset();opening.enterFreePlay();finale.ensurePortal();travel.request('willowbank');},
  equipment,inventory,player,feedback,getTile:()=>tile,finale,
  doze(){idleClock.update(30,true);},
  wake(){idleClock.wake();},
  stop(){cancelWork();path=[];segment=null;target=null;gatherTime=0;player.position.set(tile.x-6,tile.h,tile.z-6);feedback.clearDestination();},
  reset(kind){
   campfires.reset(kind==='all'?undefined:world);if(kind==='all')crystalPlaces.reset();
   travel.cancel();if(areas.id!=='clearing'||kind==='all'){areas.activate('clearing',{landing:clearingTiles.get(key(SPAWN.x,SPAWN.z)),arrival:false});finale.reset();}if(kind==='all'){craftingTutorial.reset();opening.enterFreePlay();resetObjectives();for(const object of clearingObjects)object.visible=true;introTile.visible=false;player.visible=true;}
   clearSkillRewards();itemFeed.clear();messages?.clear();
   resourceActions.resetWhere(n=>clearingTiles.get(key(n.x,n.z))===n.tile&&(kind==='all'||kind==='items'&&!['tree','boulder'].includes(n.kind)||kind==='trees'&&n.kind==='tree'||kind==='boulders'&&n.kind==='boulder'));
   if(kind==='all'){character.reset();auras.reset();playerControl.reset();assistance.reset();if(__PLAYGROUND__)SPELLS.energyStrike.requirements['magic.technique']=1;playerResources.reset();health.restore();playerInterface?.reset();combat.setAutoRetaliate(true);trainingFixtures.clear();cinder.reset();waking.reset();shops.reset();lootPiles.clear();jobs.reset();dropRandom=Math.random;styles.reset();supplies.reset();destinations.reset();combatFixtures.clear();combat.clear();equipment.reset();carpentry.cancel();carpentryFixture.reset();willow.debug.reset();for(const id of Object.keys(ITEMS))inventory[id]=0;for(const skill of Object.values(playerSkills()))Object.assign(skill,{xp:0,level:1});Object.assign(inventory,{sticks:10,stones:10,axes:1,logs:0,hats:0,pickaxes:1,stone:0});tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);happyUntil=0;angle=Math.PI/4;elevation=THREE.MathUtils.degToRad(35.264);zoom=12;}
   if(tile.blocked){tile=world.get(key(SPAWN.x,SPAWN.z));player.position.set(tile.x-6,tile.h,tile.z-6);}
  },
  wakeUp(options){return waking.start(options);},
  refresh:()=>{equipment.refresh();},
  showItemChanges,
  color(value){body.material.color.set(value);expressionFace.setBodyColor(value);},
  faceTowardCamera(){facing=angle;player.rotation.y=angle;},
 perf:{hud:show=>perfProbe.hud(show),census:()=>perfProbe.census()}
 };
 debug=playground.mountPlayground(playgroundApi);
}
const journal=mountJournal(menus,craftingTutorial,settingsUI,{jobs});
createCompanionMenu(companions,{panels:menus.panels,modals,narrator,canClose:()=>menus.events.beforeClose?.('automatic')!==false});
playerInterface=createPlayerInterface({cameraAngle:()=>angle,modals,playerControl,assistance,auras,styles,toast,menus,journal,health,resources:playerResources,food,inventory,equipment,world,tile:()=>tile,destination:()=>path.at(-1)||segment?.to||null,move:point=>{const t=world.get(key(point.x,point.z));if(t&&canMove()){idleClock.wake();moveTo(t);}},enemies:()=>combat.state.enemies,groundItems:()=>resourceActions.groundItems,profile:()=>opening.profile,combat,styleMenu});
systemsReady.value=true;
const splash=createSplash(renderer,!__PLAYGROUND__,settingsUI);
animate();
// Small read-only inspection surface for checking the prototype in a browser.
if(__PLAYGROUND__)window.quadriaquest={getState:()=>({cutaway:cutawayState(),atmosphere:atmosphere.state,facing:+(Math.atan2(Math.sin(facing),Math.cos(facing))).toFixed(2),telegraphs:telegraphs.active,hands:hands.map(h=>({position:h.position.toArray(),rotation:[h.rotation.x,h.rotation.y,h.rotation.z],visible:h.visible})),resources:playerResources.state,playerUI:playerInterface?.state,viewport:{width:gameViewport().width,height:gameViewport().height},render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},area:areas.id,travel:travel.state,tile:{x:tile.x,z:tile.z,h:tile.h},moving:!!segment||path.length>0,movement:{position:player.position.toArray(),from:segment&&{x:segment.from.x,z:segment.from.z},to:segment&&{x:segment.to.x,z:segment.to.z},queuedAction:afterStep.pending},eating:food.working,target:target?.id??null,gatherTime,inventory:{...inventory},gathering:{...gatheringSkill},crafting:{...craftingSkill},lumberjack:{...lumberjackSkill},mining:{...miningSkill},combat:combat.state,character:character.state,equipment:equipment.state,resourceAction:resourceActions.state,carpentry:{...carpentry.skill,action:carpentry.state},fishing:{...fishing.skill,action:fishing.state},tutorialStage:craftingTutorial.stage,face:playerFace,body:{squash:visual.scale.y,twist:visual.rotation.y,lean:visual.rotation.x},finale:finale.state,willow:willow.state,cinder:cinder.state,smithing:{...smithing.skill,action:smithing.state},styles:styles.state,health:health.value,companion:{...companions.state},action:recipeCrafting.state,angle,elevation,zoom,profile:opening.profile,tutorialReady:opening.playable}),atmosphere,screenFor:(x,z)=>{const t=world.get(key(x,z));const p=new THREE.Vector3(x-6,t.h+.16,z-6).project(camera);const v=gameViewport();return{x:v.left+(p.x+1)*v.width/2,y:v.top+(1-p.y)*v.height/2};}};
// Playground inspection: the renderer (compiled programs, render stats).
if(__PLAYGROUND__)Object.defineProperty(window.quadriaquest,'renderer',{get:()=>renderer});
// The playground's own API, for scripted browser checks (playground only).
if(__PLAYGROUND__)window.quadriaquest.api=playgroundApi;
if(__PLAYGROUND__)window.quadriaquest.perf=playground.createPerfScenarios({api:playgroundApi,probe:perfProbe,setView(view){angle=view.angle;elevation=view.elevation;zoom=view.zoom;},walkTo(x,z){const t=world.get(key(x,z));if(t)moveTo(t);},state:()=>window.quadriaquest.getState()});
