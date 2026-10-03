import {createBridgeInjury} from './bridge-injury.js';
import {createConversationFacing} from './conversation-facing.js';
import {animateResourceDepletion,animateResourceHit} from './resource-depletion.js';
import {attackPose} from './combat-motion.js';
import {createCombatFeedback} from './combat-feedback.js';
import {createCompanionFollower} from './companion-follow.js';
import {PATROL_AREAS,wanderDelay,shouldWander,wanderRoute} from './wander.js';
import {makeTree,makeFlowers,makeTerrainTile,addWaterTile} from './world-models.js';
import {createGroundItemModel} from './ground-item-models.js';
import * as THREE from 'three';
import {createGrassColors} from './grass-palette.js';
import {createWaterEffects} from './water-effects.js';
import {makeCrystal} from './finale-models.js';
import {makeBoulder} from './mining.js';
import {highlightResource} from './resource-highlight.js';
import {createCharacterDialogue} from './character-dialogue.js';
import {part,fisher,goblin,companion,campfire,animateCampfire,makeBridge,makeBridgeMarker,fishingSpot,animateFishingSpot,tool,animateGoblin,animateCompanion} from './willowbank-models.js';
import {WILLOWBANK,RECIPES,NEW_SKILLS,ENEMIES,canMake,finishRecipe,durationFor,damageRoll,incomingHealth,validCampTile,makeWillowbankTiles} from './willowbank-rules.js';
import {createGatheringSkill,showSkillReward,gatheringDuration} from './skills.js';
import {updateObjective,finishObjective,setObjectiveHelp,resetObjectives} from './quests.js';
import {findPath,key} from './world.js';
import {portalSpawn} from './portal-spawn.js';
import {ITEMS} from './items.js';
import {icon} from './icons.js';
import './willowbank.css';

export function createWillowbank(api){
 const group=new THREE.Group();group.visible=false;api.scene.add(group);
 const tiles=makeWillowbankTiles(),map=new Map(tiles.map(t=>[key(t.x,t.z),t]));
 const actors=[],skills=Object.fromEntries(NEW_SKILLS.map(name=>[name,createGatheringSkill()]));
 const grassMaterials=createGrassColors().map(color=>new THREE.MeshStandardMaterial({color,roughness:.9}));
 const water=createWaterEffects(group,api.renderer);
 for(const t of tiles){
  if(t.water){for(const m of addWaterTile(group,t,map,water)){m.userData.tile=t;api.pickables.push(m);}}
  else {const land=makeTerrainTile(t,map,grassMaterials[(t.x*7+t.z)%4]);land.position.set(t.x-6,0,t.z-6);group.add(land);land.traverse(m=>{if(m.isMesh){m.userData.tile=t;api.pickables.push(m);}});}
 }
 let introSeen=false,introActive=false,introFocus=null,modelPreview=null;
 let entered=false,active=false,phase='meet',action=null,combat=null,chase=null,defeated=0,preview=null,health=30,bridgeDone=false,rescueAge=null,petOwned=false,petFollowing=true,petName='Pebble',caught=0,flintCollected=0,cooked=0,eaten=0,guided=false,placement=null,selectedCampTile=null,fire=null,respawns=[],depleting=[],fleeing=[];
 const equipment={swords:false,shields:false};
 const dialogue=createCharacterDialogue(),hitFeedback=createCombatFeedback(),bridgeInjury=createBridgeInjury();
 let injuryReaction=null,combatSandbox=false;
 const hud=document.createElement('aside');hud.id='willow-health';hud.hidden=true;hud.innerHTML='<strong>Your health</strong><progress max="30" value="30"></progress><span>30 / 30</span>';document.body.append(hud);
 const tip=document.getElementById('gather-tutorial');
 const placementUI=document.createElement('section');placementUI.id='placement-controls';placementUI.hidden=true;placementUI.innerHTML='<strong>Choose a clear tile</strong><button data-place>Place</button><button data-cancel>Cancel</button>';document.body.append(placementUI);
 const cookUI=document.createElement('dialog');cookUI.id='cooking-menu';cookUI.innerHTML='<h2>Campfire</h2><p>Raw Pondfish ×1 → Cooked Pondfish ×1<br>3 seconds · Restores 10 health</p><label>Quantity <input type="number" min="1" max="99" value="1"></label><div class="willow-actions"><button data-cook>Cook fish</button><button data-pack>Pack up</button><button data-close>Close</button></div><p role="status"></p>';document.body.append(cookUI);
 let petDetailOpen=false;
 const petUI=document.createElement('section');petUI.id='companions-panel';petUI.hidden=true;petUI.setAttribute('aria-label','Companions');petUI.innerHTML='<div class="crafting-heading"><h2>Companions</h2><button aria-label="Close companions">×</button></div><div class="companion-content"></div>';
 const petCanvas=document.createElement('canvas');petCanvas.setAttribute('aria-label','Your companion');const petRenderer=new THREE.WebGLRenderer({canvas:petCanvas,alpha:true,antialias:true});petRenderer.setSize(200,150,false);petRenderer.setPixelRatio(Math.min(devicePixelRatio,2));const petScene=new THREE.Scene();petScene.add(new THREE.HemisphereLight('#fff9df','#809786',3));const petCamera=new THREE.PerspectiveCamera(35,4/3,.1,10);petCamera.position.set(.8,.8,1.8);petCamera.lookAt(0,.3,0);
 const ghost=campfire(true);group.add(ghost);ghost.visible=false;
 function t(x,z){return map.get(key(x,z));}
 function actor(model,x,z,kind,label){const tile=t(x,z),a={group:model,x,z,tile,kind,label,ready:true,opened:false,duration:0,willow:true};model.position.set(x-6,tile.h,z-6);group.add(model);tile.blocked=true;tile.buildable=false;
  const small=['sticks','stones','flint'].includes(kind);const hit=part(model,new THREE.BoxGeometry(small?.5:.65,small?.5:1,small?.5:.65),new THREE.MeshBasicMaterial({visible:false}),0,small?.25:.5);hit.userData.actor=a;hit.userData.tile=tile;api.pickables.push(hit);model.traverse(o=>{if(o.isMesh&&o!==hit){o.userData.actor=a;o.userData.tile=tile;api.pickables.push(o);}});const originals=new Set(model.children);model.remove(hit);a.highlight=highlightResource(model,{height:kind==='tree'?2.8:small?.85:1.5});model.add(hit);for(const child of model.children)if(!originals.has(child)||child===hit)child.userData.portraitIgnore=true;actors.push(a);return a;}
 const crystal=actor(makeCrystal(),...WILLOWBANK.crystal,'crystal','Return to the clearing');
 const reed=fisher(),reedActor=actor(reed.group,...WILLOWBANK.reed,'reed','Talk to Reed'),reedFacing=createConversationFacing(reed.group);
 let scrapper=null,bruiser=null;const enemies=[];
 function enableCombatSandbox(){
  if(!__PLAYGROUND__)return;
  combatSandbox=true;
  if(enemies.length)return;
  scrapper=actor(goblin(),...WILLOWBANK.scrapper,'scrapper','Fight Goblin Scrapper');bruiser=actor(goblin(true),...WILLOWBANK.bruiser,'bruiser','Fight Goblin Bruiser');
  for(const a of [scrapper,bruiser]){a.patrolClock=wanderDelay();a.patrolPhase=Math.random()*10;a.patrolRoute=[];a.hitAge=0;a.attackAge=0;a.home=a.tile;a.hp=ENEMIES[a.kind].health;const label=document.createElement('div');label.className='enemy-health';label.hidden=true;document.body.append(label);a.healthLabel=label;enemies.push(a);}
 }
 const pet=companion();pet.position.set(WILLOWBANK.pet[0]-6,1,WILLOWBANK.pet[1]-6);group.add(pet);const follower=createCompanionFollower(pet);let rescueGait=0;
 const bridgeModel=makeBridge(WILLOWBANK.bridgeEnd-WILLOWBANK.bridgeStart+1);bridgeModel.group.position.set(WILLOWBANK.bridgeStart-6,0,WILLOWBANK.bridgeZ-6);group.add(bridgeModel.group);
 bridgeModel.surfaces.forEach((hit,i)=>{hit.userData.tile=t(WILLOWBANK.bridgeStart+i,WILLOWBANK.bridgeZ);api.pickables.push(hit);});
 const bridge=actor(makeBridgeMarker(),WILLOWBANK.bridgeStart-1,WILLOWBANK.bridgeZ+1,'bridge','Repair broken bridge');
 for(const [x,z]of [[2,8],[4,12],[7,10],[9,3],[12,3],[13,12],[16,6],[2,14],[9,15]])actor(makeTree(),x,z,'tree','Chop tree');
 for(const [x,z]of [[2,5],[6,11],[10,4],[14,12]])actor(makeBoulder(),x,z,'boulder','Mine boulder');
 for(const [x,z,kind]of [[3,6,'sticks'],[4,8,'stones'],[15,13,'flint']])actor(createGroundItemModel(kind),x,z,kind,'Gather '+ITEMS[kind].name);
 const spot=actor(fishingSpot(),16,14,'fish','Fish for Pondfish');spot.group.position.y=.85;
 for(const tile of tiles)if(!tile.water&&!tile.blocked&&(tile.x*17+tile.z*13)%7===0){const flowers=makeFlowers();flowers.position.set(tile.x-6,tile.h,tile.z-6);group.add(flowers);}

 const held={};for(const id of ['swords','shields','hammers','rods']){held[id]=tool(id);if(id==='swords'||id==='shields'||id==='hammers')held[id].rotation.y=Math.PI/2;api.hands[id==='shields'?1:0].add(held[id]);held[id].visible=false;}
 const petPortrait=pet.clone(true);petPortrait.position.set(0,0,0);petScene.add(petPortrait);
 const enemyProjection=new THREE.Vector3();
 function reward(name,n=20){const s=skills[name]||api.skills[name],old=s.level;s.xp+=n;s.level=1+Math.floor(s.xp/120);showSkillReward({skillName:name,xp:n,level:s.level,leveledUp:s.level>old},api.player.position);}
 function change(values){for(const [id,n]of Object.entries(values))api.inventory[id]=(api.inventory[id]||0)+n;api.showItems(values);}
 function goal(id,title,description,current=0,total=1){updateObjective('willow-'+id,title,description,current,total);}
 function done(id){finishObjective('willow-'+id);setObjectiveHelp('willow-'+id,null);}
 function showTip(...args){api.showTip(...args);}
 function hideGuide(){guided=false;for(const node of document.querySelectorAll('[data-willow-guide]')){node.classList.remove('gold-guide');node.removeAttribute('data-willow-guide');}}
 function guideElement(id){hideGuide();const el=document.getElementById(id);if(el){el.classList.add('gold-guide');el.dataset.willowGuide='true';requestAnimationFrame(()=>el.scrollIntoView({block:'center'}));}}
 function helpCraft(id){if(!id)return;api.openCrafting();api.selectRecipe(id);guideElement('craft-'+id);}
 function lines(texts,after){api.stop();tip.hidden=true;let i=0;const next=()=>{if(i===texts.length){dialogue.finish(after);return;}dialogue.show({side:'right',name:'Reed',model:reed.group,text:texts[i][0],expression:texts[i++][1],next});};next();}
 function playerLine(text,next,expression){dialogue.show({side:'left',name:api.profile().name||'Pip',model:api.visual,text,expression,next});}
 function talk(){if(combat||chase)return;reedFacing.face(api.player);tip.hidden=true;
  if(phase!=='meet'){lines([[phase==='finished'?`Enjoy your adventures with ${petName}!`:'You can do this! Your quest journal will remind you what comes next.','happy']],()=>prompt());return;}
  api.stop();const exposition=calm=>lines([[calm?'Right. Deep breaths. The bridge collapsed all of a sudden!':'The bridge collapsed all of a sudden!',calm?'idle':'distraught'],["A little animal likes to come here and play. They were on the island when it happened.",calm?'idle':'distraught'],["Now they’re stranded over there, and I can’t reach them!",calm?'idle':'distraught']],()=>dialogue.show({side:'right',name:'Reed',model:reed.group,expression:calm?'idle':'distraught',text:'Could you help me repair the bridge and get them back safely?',choices:[["I’ll help.",()=>playerLine('I’ll help.',acceptHelp,'happy')],['I need a moment.',()=>playerLine('I need a moment.',()=>lines([['Of course. I’ll be right here.','idle']]),'idle')]]}));
  dialogue.show({side:'right',name:'Reed',model:reed.group,expression:'distraught',text:'Oh! You there! Please—can you help?',choices:[['What’s wrong??',()=>playerLine('What’s wrong??',()=>exposition(false),'shocked')],['Calm down, tell me what’s going on.',()=>playerLine('Calm down, tell me what’s going on.',()=>exposition(true),'idle')],["I don’t have time for this",()=>playerLine('I don’t have time for this',()=>lines([['Oh… okay…','sad']]),'frown')]]});
 }
 function acceptHelp(){
  phase='bridge';done('meet');
  lines([['Oh thank you so much!','happy']],()=>{
   introActive=true;
   introFocus={position:pet.position.clone(),blend:0,returning:false,after:prompt};
   dialogue.show({side:'right',name:'Reed',model:reed.group,expression:'idle',text:'There they are, across the broken bridge. Craft a Crude Hammer and bring three Small Logs. We can get them home safely!',next:()=>{dialogue.hide();introFocus.returning=true;}});
  });
 }
 function prompt(){
  hideGuide();
  if(phase==='bridge'){goal('bridge','Repair the bridge','Craft a Crude Hammer. With it and Small Logs ×3 in your inventory, interact with the broken bridge.');setObjectiveHelp('willow-bridge',()=>{if(!api.inventory.hammers)helpCraft('hammers');else guided=true;});showTip('A little carpentry','Use a Crude Hammer and Small Logs ×3 to repair the bridge. Click or tap the broken bridge to begin.',null,()=>{if(!api.inventory.hammers)helpCraft('hammers');else guided=true;});}
  if(phase==='fish'){goal('fish','Catch Raw Pondfish','Craft a Crude Fishing Rod from Sticks ×2, then fish at the rippling water in the pond.',caught,2);setObjectiveHelp('willow-fish',()=>{if(!api.inventory.rods)helpCraft('rods');else guided=true;});showTip('Dinner starts here','Craft a Crude Fishing Rod, then click or tap a fishing spot. You’ll keep fishing until you move away.',null,()=>{if(!api.inventory.rods)helpCraft('rods');else guided=true;});}
  if(phase==='flint'){goal('flint','Collect Flint','Gather Flint on the ground near the water.',flintCollected,1);guided=true;showTip('A spark of an idea','Look near the water for Flint. Gather one piece to get started.');}
  if(phase==='fire'){goal('fire','Prepare a Campfire','Craft Flint and Stone from Flint ×1 and Stone ×1, then a Campfire from Small Logs ×2. The fire-starting tool is reusable.',api.inventory.campfires||fire?1:0);setObjectiveHelp('willow-fire',()=>helpCraft(api.inventory.firestarters?'campfires':'firestarters'));showTip('Build a Campfire','Make Flint and Stone, then craft a Campfire. Select the Campfire in your inventory and choose Place.',null,()=>helpCraft(api.inventory.firestarters?'campfires':'firestarters'));}
  if(phase==='place'){goal('place','Place your Campfire','Use Place in your Campfire inventory details. Choose a clear meadow tile, then confirm.');showTip('Make yourself at home','Select your Campfire in your inventory, then choose Place.');}
  if(phase==='cook'){goal('cook','Cook a Pondfish','Interact with your Campfire and cook a Raw Pondfish.',cooked,1);guided=true;showTip('Something warm','Click or tap your Campfire to open its cooking menu. Cook a Pondfish to make your first meal.');}
  if(phase==='eat'){goal('eat','Eat a Cooked Pondfish','Select Cooked Pondfish in your inventory and choose Eat. It restores 10 health.',eaten,1);showTip('Time to recover','Select the Cooked Pondfish in your inventory and choose Eat. Food restores health. Eat your cooked fish to soothe that sore hand!',null,()=>api.openInventory());}
 }
 function nextAfterFight(){api.toast('Combat practice complete.');}
 function startAction(kind,seconds,complete,target=null,quantity=1){api.stop();action={kind,age:0,duration:seconds,complete,target,quantity};tip.hidden=true;api.feedback.destination(api.tile());api.feedback.interacting(kind);}
 function recipeAvailable(id){return entered&&(!['swords','shields'].includes(id)||combatSandbox);}
 function craft(id){if(!recipeAvailable(id))return false;if(!active||busy()||api.moving()||action||combat||chase)return false;const r=RECIPES[id];if(!r||r.station||!canMake(api.inventory,r)){api.toast('Missing crafting materials or a required tool.');return false;}hideGuide();startAction('Crafting',r.duration,()=>{const changes=finishRecipe(api.inventory,id);if(changes){api.showItems(changes);reward('Crafting');checkProgress();}});return true;}
 function checkProgress(){
  if(phase==='fire'&&(api.inventory.campfires||fire)){done('fire');phase=fire?'cook':'place';prompt();}
 }
 function planWander(a){return wanderRoute(map,a.tile,PATROL_AREAS[a.kind],tile=>tile===api.tile()||api.routeContains(tile));}
 function resetEnemy(a){a.patrolRoute=[];a.patrolClock=wanderDelay();a.attackAge=0;a.hitAge=0;a.tile.blocked=false;a.x=a.home.x;a.z=a.home.z;a.tile=a.home;a.home.blocked=!a.opened;a.hp=ENEMIES[a.kind].health;a.group.position.set(a.x-6,a.tile.h,a.z-6);a.group.traverse(m=>{if(m.userData.actor===a)m.userData.tile=a.tile;});}
 function cancel(){injuryReaction=null;if(action?.target&&(action.kind==='Chopping'||action.kind==='Mining'))action.target.group.rotation.z=0;preview=null;modelPreview=null;if(action?.kind==='Repairing')showBridge(0);action=null;if(combat){resetEnemy(combat.enemy);combat=null;}api.feedback.clearDestination();}
 function disengage(){if(combat){chase={enemy:combat.enemy,origin:combat.enemy.tile,age:0,attackClock:0,stepClock:0};combat=null;}}
 function clearChase(){if(chase){resetEnemy(chase.enemy);chase=null;}}

 function startFight(enemy){if(enemy.opened)return;if(chase){if(chase.enemy!==enemy)clearChase();else chase=null;}if(!combatSandbox)return;if(combat?.enemy===enemy)return;cancel();tip.hidden=true;api.stop();combat={enemy,playerClock:0,enemyClock:0,age:0};api.face(enemy.x,enemy.z);}
 function lose(){health=0;clearChase();cancel();api.stop();defeated=.001;tip.hidden=true;}
 function showBridge(progress){bridgeModel.setProgress(progress);}
 showBridge(0);
 function repair(){if(bridgeDone)return;if(phase!=='bridge'){api.toast('Finish preparing with Reed before repairing the bridge.');return;}if(!api.inventory.hammers||api.inventory.logs<3){api.toast('Requires a Crude Hammer and Small Logs ×3.');return;}startAction('Repairing',durationFor(6,skills.Carpentry.level),()=>{if(!api.inventory.hammers||api.inventory.logs<3){showBridge(0);api.toast('Repair interrupted: missing materials.');return;}change({logs:-3});reward('Carpentry',40);bridgeDone=true;showBridge(1);for(let x=WILLOWBANK.bridgeStart;x<=WILLOWBANK.bridgeEnd;x++){const tile=t(x,WILLOWBANK.bridgeZ);tile.water=false;tile.blocked=false;tile.h=1;}done('bridge');goal('rescue','Name your rescued companion','Give your new friend a name.');rescueAge=0;phase='rescue';api.stop();},bridge);}
 function namePet(){lines([['There you are, little one!','happy'],['Well, look at that. I think they’ve taken a liking to you.','happy'],['They’ve only been visiting my fishing spot. Perhaps they’ve been waiting for an adventurer.','idle'],['What would you like to call them?','idle']],()=>editPetName(true));}
 function editPetName(first=false){dialogue.hide();const modal=document.createElement('dialog');modal.className='willow-modal';modal.innerHTML='<h2>Name your companion</h2><label>Name <input maxlength="20" value="Pebble"></label><p role="status"></p><button>Confirm name</button>';document.body.append(modal);const input=modal.querySelector('input');input.value=petName;modal.showModal();modal.addEventListener('cancel',e=>{if(first)e.preventDefault();});modal.querySelector('button').onclick=()=>{const value=input.value.trim();if(!value){modal.querySelector('p').textContent='Please enter a name.';return;}modal.close();modal.remove();dialogue.show({side:'right',name:'Reed',model:reed.group,expression:'happy',text:`${value}? That suits them!`,choices:[['Yes',()=>{petName=value;petOwned=true;petFollowing=true;dialogue.hide();renderPet();if(first){done('rescue');phase='fish';lines([['Thanks for helping that little one! How’s your hand?','idle'],['Here—let me teach you how to catch yourself a meal. A little food should help you feel better.','idle'],['First, you’ll need a fishing rod. A simple one will do.','idle']],prompt);}}],['Change name',()=>editPetName(first)]]});};}
 function fish(){if(!api.inventory.rods){api.toast('Missing the required tool!');return;}api.face(spot.x,spot.z);startAction('Fishing',durationFor(4,skills.Fishing.level),()=>{change({rawFish:1});reward('Fishing');caught++;if(phase==='fish'){goal('fish','Catch Raw Pondfish','Catch two fish at the pond.',caught,2);if(caught>=2){done('fish');phase='flint';lines([['A fine catch! Now let’s make those fit for dinner.','happy'],['Look near the water for Flint. We can use it with Stone to start a fire.','idle']],prompt);return;}}fish();},spot);}
 function gather(a){
  const mining=a.kind==='boulder',wood=a.kind==='tree',required=mining?'pickaxes':wood?'axes':null;
  if(required&&!api.inventory[required]){api.toast('Missing the required tool!');return;}
  const skill=mining?'Mining':wood?'Lumberjack':'Gathering',kind=mining?'Mining':wood?'Chopping':'Gathering',item=mining?'stone':wood?'logs':a.kind;
  api.face(a.x,a.z);
  startAction(kind,required?durationFor(4,(skills[skill]||api.skills[skill]).level):gatheringDuration(api.skills.Gathering),()=>{
   const finish=()=>{change({[item]:required?2:1});reward(skill);a.group.visible=false;a.tile.blocked=false;respawns.push({a,time:8});if(item==='flint'){flintCollected++;if(phase==='flint'){done('flint');phase='fire';lines([['Make yourself a Flint and Stone, then put together a Campfire.','idle']],prompt);}}};
   a.opened=true;
   if(required){const direction=a.group.position.clone().sub(api.player.position);direction.y=0;direction.normalize();api.sound('fall');depleting.push({a,age:0,axis:new THREE.Vector3(direction.z,0,-direction.x),finish});}
   else finish();
  },a);
 }
 function beginPlacement(){if(!active||busy()||combat||chase||!api.inventory.campfires)return;api.stop();cancel();api.closeMenus();placement=true;selectedCampTile=null;ghost.visible=false;placementUI.hidden=false;placementUI.querySelector('[data-place]').disabled=true;showTip('Place your Campfire','Choose a clear meadow tile. Green means it fits; red means it can’t go there. Select Place to confirm, or Cancel to keep it.');}
 function selectPlacement(tile){selectedCampTile=tile;const occupied=actors.some(a=>!a.opened&&a.tile===tile)||api.tile()===tile;const valid=validCampTile(tile,{occupied,reachable:tile&&findPath(map,api.tile(),tile)!==null});ghost.visible=!!tile;if(tile){ghost.position.set(tile.x-6,tile.h,tile.z-6);ghost.traverse(m=>{if(m.isMesh)m.material.color.set(valid?'#88dc94':'#ed7777');});}placementUI.querySelector('strong').textContent=valid?'Place Campfire here?':'Choose a clear meadow tile';placementUI.querySelector('[data-place]').disabled=!valid;return true;}
 function cancelPlacement(){placement=false;selectedCampTile=null;ghost.visible=false;placementUI.hidden=true;}
 placementUI.querySelector('[data-cancel]').onclick=cancelPlacement;
 placementUI.querySelector('[data-place]').onclick=()=>{if(!selectedCampTile||!api.inventory.campfires)return;const tile=selectedCampTile;cancelPlacement();const marker={x:tile.x,z:tile.z,tile,group:ghost,kind:'place',willow:true,ready:true,opened:false,duration:0};api.approach(marker);};
 function placeFire(tile){if(!api.inventory.campfires||!validCampTile(tile,{occupied:!!fire&&fire.tile===tile})){api.toast('That spot is no longer available.');return;}if(fire){api.toast('Pack up your existing Campfire first.');return;}change({campfires:-1});fire=actor(campfire(),tile.x,tile.z,'fire','Use Campfire');if(phase==='place'||phase==='fire'){done('fire');done('place');phase='cook';lines([['There we go. Much better than chewing on a cold fish.','idle']],prompt);}}
 function openCooking(){api.stop();cookUI.querySelector('[role=status]').textContent='';cookUI.querySelector('input').max=String(Math.max(1,api.inventory.rawFish||0));cookUI.showModal();}
 cookUI.querySelector('[data-close]').onclick=()=>cookUI.close();
 cookUI.querySelector('[data-pack]').onclick=()=>{cookUI.close();if(!fire)return;fire.group.visible=false;fire.opened=true;fire.tile.blocked=false;fire.tile.buildable=true;fire=null;change({campfires:1});};
 function cook(quantity){if(!fire||!canMake(api.inventory,RECIPES.cookedFish))return;startAction('Cooking',durationFor(3,skills.Culinary.level),()=>{const changes=finishRecipe(api.inventory,'cookedFish');if(!changes)return;api.showItems(changes);reward('Culinary');cooked++;if(phase==='cook'){done('cook');phase='eat';lines([['Now for the best part!','happy']],prompt);}else if(quantity>1)cook(quantity-1);},fire,quantity);}
 cookUI.querySelector('[data-cook]').onclick=()=>{const n=Number(cookUI.querySelector('input').value);if(!Number.isInteger(n)||n<1||n>99||n>(api.inventory.rawFish||0)){cookUI.querySelector('[role=status]').textContent='Choose a quantity you have, from 1 to 99.';return;}cookUI.close();cook(n);};
 function eat(confirm=false){if(!api.inventory.cookedFish||busy()||combat||chase)return;if(health===30&&!confirm){const d=document.createElement('dialog');d.className='willow-modal';d.innerHTML='<p>Your health is already full. Eat this anyway?</p><button>Eat anyway</button><button>Cancel</button>';document.body.append(d);d.showModal();d.querySelectorAll('button')[0].onclick=()=>{d.close();d.remove();eat(true);};d.querySelectorAll('button')[1].onclick=()=>{d.close();d.remove();};return;}change({cookedFish:-1});health=Math.min(30,health+10);eaten++;if(phase==='eat'){done('eat');phase='finished';api.closeMenus();lines([['You repaired a bridge, helped a stranded animal, and made yourself dinner.','happy'],['And found a friend along the way.','happy'],[`I’d call that a pretty good start, ${api.profile().name||'Pip'}.`,'happy']],()=>showTip('Broken Bridge Rescue — Complete!','You rescued a companion and learned how to recover.',()=>showTip('Willowbank complete!', 'You can keep exploring and practicing here, or use the Iter Crystal to return to the clearing. Your next adventure is still to come!')));}}
 function busy(){return !!injuryReaction||introActive||dialogue.active||defeated>0||rescueAge!==null;}
 function renderPet(){const content=petUI.querySelector('.companion-content');content.replaceChildren();if(!petOwned){content.textContent='No companions yet.';return;}const name=document.createElement('h3');name.textContent=petName;const desc=document.createElement('p');desc.textContent='Your little Willowbank friend. Safe from harm and always happy to see you.';content.classList.add('journal-browser');petUI.classList.toggle('viewing-detail',petDetailOpen);const choices=document.createElement('div'),detail=document.createElement('section'),entry=document.createElement('button'),back=document.createElement('button');choices.className='journal-list';detail.className='journal-detail';entry.className='journal-entry';entry.textContent=petName+' · Corgi';entry.setAttribute('aria-pressed','true');entry.onclick=()=>{petDetailOpen=true;renderPet();};back.className='journal-back';back.textContent='Back to companions';back.onclick=()=>{petDetailOpen=false;renderPet();};choices.append(entry);detail.append(back,petCanvas,name,desc);content.append(choices,detail);for(const [label,fn]of [['Rename',()=>editPetName()], [petFollowing?'Rest':'Follow',()=>{petFollowing=!petFollowing;renderPet();}]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;detail.append(b);}}
 function mountCompanions(){const host=document.getElementById('journal');host.append(petUI);const b=document.createElement('button');b.id='open-companions';b.innerHTML=icon('companions')+'<span>Companions</span>';b.hidden=true;document.getElementById('game-menu-bar').insertBefore(b,document.querySelector('[data-journal-last]'));b.onclick=()=>{api.closeMenus();petDetailOpen=false;renderPet();petUI.hidden=false;};petUI.querySelector('button').onclick=()=>{petUI.hidden=true;};}
 function refreshEquipment(){for(const id of ['swords','shields'])if(!api.inventory[id])equipment[id]=false;}
 function interact(a){if(!active||busy())return;if(chase&&!ENEMIES[a.kind]){api.toast('Get clear of the goblin before interacting.');return;}tip.hidden=true;if(a.kind==='crystal'){api.return();return;}if(a.kind==='reed')talk();else if(ENEMIES[a.kind])startFight(a);else if(a.kind==='bridge')repair();else if(a.kind==='fish')fish();else if(a.kind==='fire')openCooking();else if(a.kind==='place')placeFire(a.tile);else gather(a);}
 function arrival(){
  api.stop();dialogue.hide();introSeen=true;introActive=true;introFocus=null;
  api.say('Good work! You just made your first Iter Crystal teleportation!',()=>
   api.say('These crystals are going to be invaluable during your time here in Quadria.',()=>{
    introFocus={position:reed.group.position.clone(),blend:0,returning:false};
    api.say('What’s this? It appears someone is having a bad day.',()=>
     api.say('Perhaps you should go talk to them!',()=>{document.getElementById('dialogue').hidden=true;introFocus.returning=true;}));
   }));
 }
 function meetGoal(){goal('meet','Talk to Reed','Speak to the worried fisher near the arrival crystal.',phase==='meet'?0:1);}
 function enter(value){hitFeedback.clear();follower.reset();active=value;hud.hidden=!value;group.visible=value;clearChase();cancel();cancelPlacement();dialogue.hide();tip.hidden=true;cookUI.close();introActive=false;introFocus=null;if(value){entered=true;document.getElementById('open-companions').hidden=false;document.getElementById('open-inventory').hidden=false;document.getElementById('open-crafting').hidden=false;if(!introSeen)arrival();else if(phase==='meet')meetGoal();}else for(const a of enemies)a.healthLabel.hidden=true;}
 function update(dt,time,camera){hitFeedback.update(dt,camera);if(introFocus){introFocus.blend=THREE.MathUtils.clamp(introFocus.blend+(introFocus.returning?-1:1)*dt/.9,0,1);if(introFocus.returning&&introFocus.blend===0){const after=introFocus.after||meetGoal;introFocus=null;introActive=false;after();}}dialogue.update(dt);if(!petUI.hidden&&petOwned){animateCompanion(petPortrait,time);petPortrait.rotation.y=Math.sin(time)*.12;petRenderer.render(petScene,petCamera);}refreshEquipment();for(const id of Object.keys(held))held[id].visible=active&&((id==='swords'||id==='shields')?equipment[id]&&!action&&!defeated:id==='hammers'?!injuryReaction&&(action?.kind||preview?.kind)==='Repairing':(action?.kind||preview?.kind)==='Fishing');
  let petMoving=false;
  if(petOwned&&petFollowing){pet.visible=true;if(!active&&pet.parent!==api.scene)api.scene.attach(pet);else if(active&&pet.parent!==group)group.attach(pet);petMoving=follower.update(dt,api.world,api.tile(),api.routeContains,api.occupied);}else pet.visible=!petOwned&&active;
  if(rescueAge!==null){const target=new THREE.Vector3(WILLOWBANK.bridgeStart-7,1,WILLOWBANK.bridgeZ-6),distance=pet.position.distanceTo(target),travel=Math.min(distance,dt*1.4);if(distance>.01){pet.rotation.y+=Math.atan2(Math.sin(-Math.PI/2-pet.rotation.y),Math.cos(-Math.PI/2-pet.rotation.y))*(1-Math.exp(-dt*12));pet.position.lerp(target,travel/distance);rescueGait+=travel*4;petMoving=true;}}
  animateCompanion(pet,time,{sad:!petOwned&&rescueAge===null,moving:petMoving,gait:rescueAge!==null?rescueGait:follower.gait});if(!active)return null;water.update(dt);animateFishingSpot(spot.group,time);
  if(fire)animateCampfire(fire.group,time);
  if(chase){const c=chase,a=c.enemy;c.age+=dt;c.stepClock+=dt;c.attackClock+=dt;const playerTile=api.tile();const homeDistance=Math.abs(playerTile.x-c.origin.x)+Math.abs(playerTile.z-c.origin.z);const crystalDistance=Math.abs(playerTile.x-crystal.x)+Math.abs(playerTile.z-crystal.z);
   if(c.age>3||homeDistance>3||crystalDistance<3||busy()){clearChase();}
   else {const route=findPath(map,a.tile,playerTile);if(!route){clearChase();}else if(route.length>1&&c.stepClock>=.55){c.stepClock=0;const next=route[0];a.tile.blocked=false;a.tile=next;a.x=next.x;a.z=next.z;next.blocked=true;a.group.traverse(m=>{if(m.userData.actor===a)m.userData.tile=next;});}else if(route.length===1&&c.attackClock>=ENEMIES[a.kind].interval){c.attackClock=0;a.attackAge=.35;enemyHit(a,ENEMIES[a.kind]);if(health===0)lose();}if(chase){a.group.position.lerp(new THREE.Vector3(a.x-6,a.tile.h,a.z-6),1-Math.exp(-dt*10));a.group.rotation.y=Math.atan2(api.player.position.x-a.group.position.x,api.player.position.z-a.group.position.z);}}
  }
reedFacing.update(dt);reed.group.scale.set(1,1+Math.sin(time*2.8)*.025,1);reed.hands[1].position.y=.26+Math.sin(time*2.8)*.02;reed.face.set(dialogue.expressionFor('right')||(phase==='meet'?'distraught':'idle'));
  for(const a of enemies){
   if(a.opened)continue;
   a.hitAge=Math.max(0,a.hitAge-dt);a.attackAge=Math.max(0,a.attackAge-dt);
   const fighting=combat?.enemy===a||chase?.enemy===a;
   const settled=a.group.position.distanceTo(new THREE.Vector3(a.x-6,a.tile.h,a.z-6))<.025;
   if(fighting||busy()||modelPreview||api.approaching()===a){a.patrolRoute=[];}
   else if(settled){
    if(!a.patrolRoute.length){
     a.patrolClock-=dt;
     if(a.patrolClock<=0){a.patrolClock=wanderDelay();if(shouldWander())a.patrolRoute=planWander(a);}
    }
    const next=a.patrolRoute[0];
    if(next){
     if(next.blocked||next.water||next===api.tile()||api.routeContains(next)){a.patrolRoute=[];a.patrolClock=wanderDelay();}
     else {a.patrolRoute.shift();a.tile.blocked=false;a.tile=next;a.x=next.x;a.z=next.z;next.blocked=true;a.group.traverse(m=>{if(m.userData.actor===a)m.userData.tile=next;});}
    }
   }
   const destination=new THREE.Vector3(a.x-6,a.tile.h,a.z-6),moving=a.group.position.distanceTo(destination)>.025;
   if(!fighting){if(moving)a.group.rotation.y=Math.atan2(destination.x-a.group.position.x,destination.z-a.group.position.z);const distance=a.group.position.distanceTo(destination);if(distance>0)a.group.position.lerp(destination,Math.min(1,dt*1.6/distance));}
   const clock=combat?.enemy===a?combat.enemyClock:chase?.enemy===a?chase.attackClock:0,interval=ENEMIES[a.kind].interval;
   const attack=fighting&&(clock>=.28||a.attackAge>0)?attackPose(clock,interval):0;
   animateGoblin(a.group,time+a.patrolPhase,{walk:moving?1:0,attack,hit:Math.sin(Math.PI*(a.hitAge/.25))});
  }
  if(modelPreview){modelPreview.age+=dt;const p=modelPreview;
   if(p.kind.startsWith('Goblin'))animateGoblin(scrapper.group,p.age,{walk:p.kind==='Goblin walk'?1:0,attack:p.kind==='Goblin attack'&&p.age>.9?attackPose(p.age,1.5):0,hit:p.kind==='Goblin hit'?Math.max(0,Math.sin(p.age*4)):0});
   else if(p.kind.startsWith('Corgi')){pet.visible=true;animateCompanion(pet,p.age,{sad:p.kind==='Corgi sad',moving:p.kind==='Corgi walk'});}
  }

  hud.querySelector('progress').value=health;hud.querySelector('span').textContent=`${health} / 30`;
  const targets={scrapper:'scrapper',bruiser:'bruiser',bridge:'bridge',fish:'fish',flint:'flint',cook:'fire'};
  for(const a of actors)a.highlight.update((phase==='meet'&&a===reedActor||guided&&a.kind===targets[phase])&&!a.opened,time,api.hover()===a&&!a.opened);
  for(const fall of [...depleting]){fall.age+=dt;if(animateResourceDepletion(fall.a,fall.age,fall.axis)){fall.finish();depleting.splice(depleting.indexOf(fall),1);}}
  for(const r of [...respawns]){r.time-=dt;if(r.time<=0&&api.tile()!==r.a.tile){r.a.opened=false;r.a.group.scale.setScalar(1);r.a.group.rotation.set(0,0,0);r.a.group.visible=true;r.a.tile.blocked=true;respawns.splice(respawns.indexOf(r),1);}}
  for(const f of [...fleeing]){f.age+=dt;animateGoblin(f.a.group,time,{walk:1});if(f.destination){f.a.group.rotation.y=Math.atan2(f.destination.x-f.a.group.position.x,f.destination.z-f.a.group.position.z);f.a.group.position.lerp(f.destination,1-Math.exp(-dt*3));}f.a.group.scale.setScalar((f.a.kind==='bruiser'?1.18:1)*Math.max(.01,1-THREE.MathUtils.smoothstep(f.age,.8,1.2)));if(f.age>=1.2){f.a.group.visible=false;fleeing.splice(fleeing.indexOf(f),1);}}
  for(const a of enemies){a.healthLabel.hidden=a.opened||!combat||combat.enemy!==a;if(!a.healthLabel.hidden){enemyProjection.copy(a.group.position).add(new THREE.Vector3(0,1.7,0)).project(camera);a.healthLabel.style.left=(enemyProjection.x+1)*innerWidth/2+'px';a.healthLabel.style.top=(1-enemyProjection.y)*innerHeight/2+'px';a.healthLabel.textContent=`${ENEMIES[a.kind].name} · ${a.hp}/${ENEMIES[a.kind].health}`;}}
  if(injuryReaction){injuryReaction.age+=dt;if(injuryReaction.age>=1.2&&!injuryReaction.spoken){injuryReaction.spoken=true;playerLine('Youch! I smashed my finger!',()=>{dialogue.hide();injuryReaction=null;},'struggle');}return {kind:'Hammer injury',time:Math.min(injuryReaction.age,1.2)};}
  if(rescueAge!==null){rescueAge+=dt;if(rescueAge>4&&!petMoving){rescueAge=null;petOwned=true;follower.reset(t(Math.round(pet.position.x+6),Math.round(pet.position.z+6)));namePet();}return null;}
  if(defeated){defeated+=dt;if(defeated>2){defeated=0;health=30;const landing=portalSpawn(map,crystal.tile);api.teleport(landing);document.getElementById('scene-fade').style.opacity='0';showTip('A fresh chance','You were defeated! You’ve returned to an Iter Crystal with your belongings. Check your equipment before trying again.');}else {document.getElementById('scene-fade').hidden=false;document.getElementById('scene-fade').style.opacity=String(Math.max(0,(defeated-1.2)/.8));return {kind:'Defeated',time:defeated};}}
  if(combat){const c=combat,e=ENEMIES[c.enemy.kind];c.age+=dt;c.playerClock+=dt;c.enemyClock+=dt;api.face(c.enemy.x,c.enemy.z);if(c.playerClock>=1.5){c.playerClock-=1.5;if(Math.random()<Math.min(.98,.9+(skills.Combat.level-1)*.005)){const before=c.enemy.hp;c.enemy.hitAge=.25;c.enemy.hp=Math.max(0,c.enemy.hp-damageRoll(equipment.swords?3:1,equipment.swords?5:3));hitFeedback.show(c.enemy.group.position,before-c.enemy.hp);api.sound('chop');}else hitFeedback.show(c.enemy.group.position,null);if(c.enemy.hp===0){const enemy=c.enemy;enemy.opened=true;enemy.tile.blocked=false;const escape=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>t(enemy.x+dx,enemy.z+dz)).filter(tile=>tile&&!tile.water&&!tile.blocked&&Math.abs(tile.h-enemy.tile.h)<=.5&&tile!==api.tile()).sort((a,b)=>Math.hypot(b.x-api.tile().x,b.z-api.tile().z)-Math.hypot(a.x-api.tile().x,a.z-api.tile().z))[0];fleeing.push({a:enemy,age:0,destination:escape?new THREE.Vector3(escape.x-6,escape.h,escape.z-6):null});combat=null;reward('Combat');api.feedback.complete();nextAfterFight();return null;}}
   if(c.enemyClock>=e.interval){c.enemyClock-=e.interval;c.enemy.attackAge=.35;enemyHit(c.enemy,e);if(health===0){lose();return {kind:'Defeated',time:0};}}
   c.enemy.group.rotation.y=Math.atan2(api.player.position.x-c.enemy.group.position.x,api.player.position.z-c.enemy.group.position.z);c.enemy.group.position.y=c.enemy.tile.h;api.feedback.interacting('Fighting');return {kind:'Combat',time:c.age};
  }
  if(action){const a=action;a.age+=dt;if(a.target&&(a.kind==='Chopping'||a.kind==='Mining')){animateResourceHit(a.target,a.age,a,api.sound);}if(a.kind==='Repairing'){showBridge(Math.floor(a.age/a.duration*3)/3);const injury=bridgeInjury.atProgress(a.age/a.duration,health);if(injury){health=injury.health;hitFeedback.show(api.player.position,injury.damage);api.sound('blocked');injuryReaction={age:0,spoken:false};return {kind:'Hammer injury',time:0};}}api.feedback.interacting(a.kind);if(a.age>=a.duration){if(a.target&&(a.kind==='Chopping'||a.kind==='Mining'))a.target.group.rotation.z=0;action=null;api.feedback.complete();a.complete();}return {kind:a.kind,time:a.age};}
  if(preview){preview.time=(preview.time+dt)%(preview.kind==='Defeated'?2:6);return preview;}
  return null;
 }
 function enemyHit(enemy,rules){const before=health,hit=Math.random()<.85;if(hit)health=incomingHealth(health,damageRoll(rules.min,rules.max),equipment.shields,rules.protected);hitFeedback.show(api.player.position,hit?before-health:null);}
 function reset(){bridgeInjury.reset();injuryReaction=null;combatSandbox=false;reedFacing.reset();hitFeedback.clear();follower.reset();rescueGait=0;modelPreview=null;introActive=false;introFocus=null;document.getElementById('dialogue').hidden=true;resetObjectives('willow-');clearChase();cancel();dialogue.hide();tip.hidden=true;phase='meet';health=30;defeated=0;rescueAge=null;bridgeDone=false;petOwned=false;petFollowing=true;petName='Pebble';caught=flintCollected=cooked=eaten=0;equipment.swords=equipment.shields=false;fleeing=[];respawns=[];depleting=[];preview=null;cancelPlacement();if(fire){fire.group.visible=false;fire.opened=true;fire.tile.blocked=false;fire.tile.buildable=true;fire=null;}for(const a of actors){if(a.kind==='fire')continue;a.opened=false;a.group.visible=true;a.group.scale.setScalar(a.kind==='bruiser'?1.18:1);a.group.rotation.set(0,0,0);a.tile.blocked=true;if(ENEMIES[a.kind]){a.opened=true;a.group.visible=false;resetEnemy(a);}}for(let x=WILLOWBANK.bridgeStart;x<=WILLOWBANK.bridgeEnd;x++){t(x,WILLOWBANK.bridgeZ).water=true;t(x,WILLOWBANK.bridgeZ).blocked=true;}showBridge(0);group.attach(pet);pet.position.set(WILLOWBANK.pet[0]-6,1,WILLOWBANK.pet[1]-6);if(active)api.teleport(portalSpawn(map,crystal.tile));renderPet();}
 return {restartWater:()=>water.restart(),group,tiles,crystal,grassMaterials,skills,enter,interact,update,cancel,disengage,craft,mountCompanions,get active(){return active;},recipeAvailable,get visibleSkills(){return Object.fromEntries(Object.entries(skills).filter(([name])=>name!=='Combat'||combatSandbox));},get unlocked(){return entered;},get cameraFocus(){return modelPreview?{position:(modelPreview.kind.startsWith('Corgi')?pet: modelPreview.kind==='Reed idle'?reed.group:scrapper.group).position.clone(),blend:1}:introFocus?{position:introFocus.position,blend:THREE.MathUtils.smoothstep(introFocus.blend,0,1)}:rescueAge===null?null:{position:pet.position.clone(),blend:Math.min(THREE.MathUtils.smoothstep(rescueAge,0,.6),1-THREE.MathUtils.smoothstep(rescueAge,3,4))};},get busy(){return busy();},matches:a=>combat?.enemy===a||action?.target===a,
 companionCannotYield(tile){return petOwned&&petFollowing&&pet.visible&&follower.occupies(tile)&&follower.yieldBlocked;},
 companionOccupies(tile){return petOwned&&petFollowing&&pet.visible&&follower.occupies(tile);},
 get working(){return !!action||!!combat||!!chase||!!preview;},get placing(){return placement;},selectPlacement,
  isEquipped:id=>!!equipment[id],equipmentState:()=>({...equipment,health,petOwned,petFollowing}),
  inventoryActions(id){if(!entered)return [];if(id==='swords'||id==='shields')return [{label:equipment[id]?'Unequip':'Equip',disabled:busy()||!!combat||!!chase||!!action,run(){equipment[id]=!equipment[id];checkProgress();}}];if(id==='campfires')return [{label:'Place',disabled:!active||busy()||!!fire,run:beginPlacement}];if(id==='cookedFish')return [{label:'Eat',disabled:busy()||!!combat||!!chase,run:()=>eat()}];return [];},
  get expression(){return dialogue.expressionFor('left');},
  get state(){return {active,phase,health,injuryApplied:bridgeInjury.applied,injuryPaused:!!injuryReaction,combatSandbox,equipment:{...equipment},bridgeDone,petOwned,petName,petFollowing,caught,cooked,eaten,action:action?.kind,combat:combat?.enemy.kind};},
  debug:__PLAYGROUND__?{bridgeIntro(){reset();acceptHelp();},combatPractice(){reset();enableCombatSandbox();for(const a of enemies){a.opened=false;a.group.visible=true;resetEnemy(a);}},chop(){const a=actors.find(a=>a.kind==='tree'&&!a.opened);if(a){api.inventory.axes=Math.max(1,api.inventory.axes||0);api.approach(a);}},mine(){const a=actors.find(a=>a.kind==='boulder'&&!a.opened);if(a){api.inventory.pickaxes=Math.max(1,api.inventory.pickaxes||0);api.approach(a);}},reset,talk,lose,arrival,hit(){hitFeedback.show(api.player.position,3);},miss(){hitFeedback.show(api.player.position,null);},zero(){hitFeedback.show(api.player.position,0);},follow(){petOwned=true;petFollowing=true;follower.reset();renderPet();},wander(){enableCombatSandbox();for(const a of enemies){if(a.opened){a.opened=false;a.group.visible=true;resetEnemy(a);}if(combat?.enemy!==a&&chase?.enemy!==a)a.patrolRoute=planWander(a);}},heal(){health=30;},hurt(){health=Math.max(1,health-10);},cancel(){cancel();preview=null;},preview(kind){cancel();if(kind==='Unarmed'||kind==='Sword and shield'){equipment.swords=equipment.shields=kind==='Sword and shield';if(equipment.swords){api.inventory.swords=Math.max(1,api.inventory.swords||0);api.inventory.shields=Math.max(1,api.inventory.shields||0);}preview={kind:'Combat',time:0};return;}if(kind.startsWith('Goblin')){enableCombatSandbox();scrapper.group.visible=true;}if(kind.startsWith('Goblin')||kind.startsWith('Corgi')||kind==='Reed idle'){modelPreview={kind,age:0};}else preview={kind,time:0};},stage(value){reset();phase=value;
 if(['fish','flint','fire','place','cook','eat'].includes(value)){bridgeInjury.atProgress(1,health);health=25;bridgeDone=true;showBridge(1);for(let x=WILLOWBANK.bridgeStart;x<=WILLOWBANK.bridgeEnd;x++){t(x,WILLOWBANK.bridgeZ).blocked=false;t(x,WILLOWBANK.bridgeZ).water=false;}petOwned=true;}
 for(const [id,n] of Object.entries({sticks:20,stones:20,stone:20,logs:20,axes:1,pickaxes:1,hammers:1,rods:1,flint:3,firestarters:1,campfires:1,rawFish:5,cookedFish:2}))api.inventory[id]=Math.max(api.inventory[id]||0,n);if(value==='cook'){placeFire(t(5,8));phase='cook';}prompt();},fight(kind){enableCombatSandbox();const enemy=kind==='scrapper'?scrapper:bruiser;enemy.opened=false;enemy.group.visible=true;resetEnemy(enemy);api.approach(kind==='scrapper'?scrapper:bruiser);},repair(){api.approach(bridge);},fish(){api.approach(spot);},name(){petOwned=true;editPetName();},placement:beginPlacement,tip:prompt}:undefined
 };
}
