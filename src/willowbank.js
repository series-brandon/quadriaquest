import {createResourceEntity} from './resource-entities.js';
import {createCarpentryBridge} from './carpentry-bridge.js';
import {setWorldOccupancy} from './world-occupancy.js';
import {createBridgeInjury,INJURY_DAMAGE} from './bridge-injury.js';
import {createConversationFacing} from './conversation-facing.js';
import {createCombatFeedback} from './combat-feedback.js';
import {rescueStandAsideRoute} from './companion-follow.js';
import {makeFlowers,makeTerrainTile,addWaterTile} from './world-models.js';
import {createTerrainBatch} from './terrain-batch.js';
import * as THREE from 'three';
import {createGrassColors} from './grass-palette.js';
import {createWaterEffects} from './water-effects.js';
import {highlightResource} from './resource-highlight.js';
import {part} from './model-parts.js';
import {fisher,animateFisher} from './fisher-model.js';
import {WILLOWBANK,makeWillowbankTiles} from './willowbank-rules.js';
import {updateObjective,finishObjective,setObjectiveHelp,resetObjectives} from './quests.js';
import {key} from './world.js';
import {nextStep,stepKey,describeStep} from './acquisition.js';
import {BRIDGE_REPAIR} from './carpentry.js';
import {portalSpawn} from './portal-spawn.js';
import './willowbank.css';

export function createWillowbank(api){
 const group=new THREE.Group();group.visible=false;api.scene.add(group);
 const tiles=makeWillowbankTiles(),map=new Map(tiles.map(t=>[key(t.x,t.z),t]));
 const actors=[];
 const grassMaterials=createGrassColors().map(color=>new THREE.MeshStandardMaterial({color,roughness:.9}));
 const water=createWaterEffects(group,api.renderer);
 for(const t of tiles){
  if(t.water){for(const m of addWaterTile(group,t,map,water)){m.userData.tile=t;api.pickables.push(m);}}
 }
 let introSeen=false,introActive=false,introFocus=null;
 let fishingFollowup=false;
 let active=false,phase='meet',bridgeDone=false,rescueAge=null,caught=0,flintCollected=0,cooked=0,eaten=0,guided=false,guideKinds=new Set();
 const dialogue=api.dialogue,hitFeedback=createCombatFeedback(),bridgeInjury=createBridgeInjury();
 let injuryReaction=null;

 const tip=api.tipBox;
 const cookUI=api.cookingMenu;
 function t(x,z){return map.get(key(x,z));}
 function actor(model,x,z,kind,label){const tile=t(x,z),a={group:model,x,z,tile,kind,label,ready:true,opened:false,duration:0,willow:true};model.position.set(x-6,tile.h,z-6);group.add(model);setWorldOccupancy(a,true);
  const small=['sticks','stones','flint'].includes(kind);const hit=part(model,new THREE.BoxGeometry(small?.5:.65,small?.5:1,small?.5:.65),new THREE.MeshBasicMaterial({visible:false}),0,small?.25:.5);a.hitTarget=hit;hit.userData.actor=a;hit.userData.tile=tile;api.pickables.push(hit);model.traverse(o=>{if(o.isMesh&&o!==hit){o.userData.actor=a;o.userData.tile=tile;api.pickables.push(o);}});const originals=new Set(model.children);model.remove(hit);a.highlight=highlightResource(model,{height:kind==='tree'?2.8:small?.85:1.5});model.add(hit);for(const child of model.children)if(!originals.has(child)||child===hit)child.userData.portraitIgnore=true;actors.push(a);return a;}
 const crystal=api.crystals.add({tile:t(...WILLOWBANK.crystal),parent:group,destination:'clearing',label:'Return to the clearing'});
 const reed=fisher(),reedActor=actor(reed.group,...WILLOWBANK.reed,'reed','Talk to Reed'),reedFacing=createConversationFacing(reed.group);
 const companions=api.companions,pet=companions.model;pet.position.set(WILLOWBANK.pet[0]-6,1,WILLOWBANK.pet[1]-6);group.add(pet);let rescueGait=0,rescueWaiting=false;

 const bridge=createCarpentryBridge({tiles:Array.from({length:WILLOWBANK.bridgeEnd-WILLOWBANK.bridgeStart+1},(_,i)=>t(WILLOWBANK.bridgeStart+i,WILLOWBANK.bridgeZ)),parent:group,world:api.world,pickables:api.pickables,
 available:()=>active&&phase==='bridge',onStart:()=>{tip.hide();},paused:()=>!!injuryReaction,
 onProgress(progress){const injury=bridgeInjury.atProgress(progress,api.health.value);if(injury){api.health.value=injury.health;hitFeedback.show(api.player.position,injury.damage);api.sound('blocked');injuryReaction={age:0,spoken:false};}},onComplete:bridgeCompleted});
 bridge.willow=true;actors.push(bridge);
 function setBridgeRepairTarget(enabled){if(enabled)bridge.reset();else bridge.complete();}
 for(const [x,z]of [[2,8],[4,12],[7,10],[9,3],[12,3],[13,12],[16,6],[2,14],[9,15]])resource('tree',x,z);
 for(const [x,z]of [[2,5],[6,11],[10,4],[14,12]])resource('boulder',x,z);
 for(const [x,z,kind]of [[3,6,'sticks'],[5,10,'sticks'],[11,6,'sticks'],[14,10,'sticks'],[4,8,'stones'],[15,13,'flint']])resource(kind,x,z);
 const spot=api.fishingSpots.add({tile:t(16,14),parent:group,guide:()=>active&&guided&&phase==='fish',onStart:()=>{tip.hide();},onCatch:fishCaught});
 createTerrainBatch({tiles:tiles.filter(t=>!t.water),map,factory:t=>makeTerrainTile(t,map,grassMaterials[(t.x*7+t.z)%4]),parent:group,pickables:api.pickables,preserve:grassMaterials,roughness:.9,
  decorate(tile,model){if(!tile.blocked&&!actors.some(a=>a.tile===tile)&&(tile.x*17+tile.z*13)%7===0){const flowers=makeFlowers();flowers.position.y=tile.h;model.add(flowers);}}});

 function resource(kind,x,z){const node=api.resourceActions.add(createResourceEntity({kind,tile:t(x,z),parent:group,pickables:api.pickables,respawn:8,onStart:()=>{tip.hide();},onReward(){if(kind==='flint'&&active){flintCollected++;if(phase==='flint'){done('flint');phase='fire';lines([['Make yourself a Flint and Stone, then put together a Campfire.','idle']],prompt);}}}}));actors.push(node);return node;}
 function goal(id,title,description,current=0,total=1){updateObjective('willow-'+id,title,description,current,total);}
 function done(id){finishObjective('willow-'+id);setObjectiveHelp('willow-'+id,null);}
 function showTip(...args){api.showTip(...args);}
 function hideGuide(){guided=false;guideKinds=new Set();api.guideMenu?.(null);}
 // Show me how for a world target: highlight it and briefly bring it into view, then return.
 function showTarget(x,z){guided=true;const tile=t(x,z);introFocus={position:new THREE.Vector3(tile.x-6,tile.h,tile.z-6),blend:0,returning:false,hold:1.4,after:()=>{}};}
 // Each building phase walks its goal with the shared acquisition steps: the tip always shows the
 // next step (gather, chop/mine, craft, then the phase's own final step) and moves on as the
 // inventory changes. Show me how highlights only that step: ground items, trees or boulders, the
 // menus, or the final target with a short camera pan. The next step starts unhighlighted.
 const bridgeMiddle=()=>Math.round((WILLOWBANK.bridgeStart+WILLOWBANK.bridgeEnd)/2);
 const GOALS={
  bridge:{needs:()=>[['hammers',1],['logs',BRIDGE_REPAIR.cost.logs]],purpose:{hammers:'to repair the bridge',logs:'for the bridge'},
   final:{title:'A little carpentry',text:'You have a Crude Hammer and enough Small Logs. Click or tap any broken bridge tile to begin.',show(){api.closeMenus();showTarget(bridgeMiddle(),WILLOWBANK.bridgeZ);}}},
  fish:{needs:()=>[['rods',1]],purpose:{rods:'to fish'},
   final:{title:'Dinner starts here',text:'Click or tap the rippling fishing spot in the pond. Each catch ends with a little celebration. Catch one Raw Pondfish for your first meal.',show(){api.closeMenus();showTarget(16,14);}}},
  fire:{needs:()=>[['campfires',1]],purpose:{campfires:'to cook your fish'},final:null},
 };
 let goalPhase=null,goalKey=null,goalHave=null,goalShown=false;
 function goalStep(){const g=GOALS[phase];return nextStep(api.inventory,g.needs())??(g.final?{step:'final'}:null);}
 function showGoalStep(s,show){
  guideKinds=new Set();api.guideMenu?.(null);guided=false;
  const g=GOALS[phase];if(!s)return;
  if(s.step==='final'){showTip(g.final.title,g.final.text,null,goalHelp);if(show)g.final.show();return;}
  const {title,text}=describeStep(s,{purpose:g.purpose[s.item]??'',shown:show&&s.step!=='craft'});
  if(show){if(s.step==='gather')guideKinds=new Set(s.kinds);if(s.step==='harvest')guideKinds=new Set([s.kind]);if(s.step==='craft')api.guideMenu?.({page:'crafting',recipe:s.item});}
  showTip(title,text,null,goalHelp);
 }
 function setGoalStep(s,show){goalKey=stepKey(s);goalHave=s?.have;goalShown=show;showGoalStep(s,show);}
 function startGoal(){goalPhase=phase;setGoalStep(goalStep(),false);}
 function goalHelp(){if(GOALS[phase])setGoalStep(goalStep(),true);}
 // Waits for the phase's prompt (never under dialogue or a camera moment) and while the player is
 // busy, so a craft or chop in progress keeps its step; progress inside a step only updates its tip.
 function followGoal(){
  if(goalPhase!==phase||!GOALS[phase]||busy()||api.playerWorking?.())return;
  const s=goalStep();
  if(stepKey(s)!==goalKey)setGoalStep(s,false);
  else if(s&&s.have!==goalHave){goalHave=s.have;showGoalStep(s,goalShown);}
 }
 // Show me how in the menus walks the player there step by step (the shared menu guide): the
 // Inventory tab, the Cooked Pondfish, then Eat; or the Crafting tab, the recipe, then Craft.
 function eatHelp(){hideGuide();api.guideMenu?.({page:'inventory',item:'cookedFish',action:'Eat'});}
 function lines(texts,after){api.stop();tip.hide();let i=0;const next=()=>{if(i===texts.length){dialogue.finish(after);return;}dialogue.show({side:'right',name:'Reed',model:reed.group,text:texts[i][0],expression:texts[i++][1],next});};next();}
 function playerLine(text,next,expression){dialogue.show({side:'left',name:api.profile().name||'Pip',model:api.visual,text,expression,next});}
 function talk(){reedFacing.face(api.player);tip.hide();
  if(phase!=='meet'){lines([[phase==='finished'?`Enjoy your adventures with ${companions.state.name}!`:'You can do this! Your quest journal will remind you what comes next.','happy']],()=>prompt());return;}
  api.stop();const exposition=calm=>lines([[calm?'Right. Deep breaths. The bridge collapsed all of a sudden!':'The bridge collapsed all of a sudden!',calm?'idle':'distraught'],["A little animal likes to come here and play. They were on the island when it happened.",calm?'idle':'distraught'],["Now they’re stranded over there, and I can’t reach them!",calm?'idle':'distraught']],()=>dialogue.show({side:'right',name:'Reed',model:reed.group,expression:calm?'idle':'distraught',text:'Could you help me repair the bridge and get them back safely?',choices:[["I’ll help.",acceptHelp,'happy'],['I need a moment.',()=>lines([['Of course. I’ll be right here.','idle']]),'idle']]}));
  dialogue.show({side:'right',name:'Reed',model:reed.group,expression:'distraught',text:'Oh! You there! Please—can you help?',choices:[['What’s wrong??',()=>exposition(false),'shocked'],['Calm down, tell me what’s going on.',()=>exposition(true),'idle'],["I don’t have time for this",()=>lines([['Oh… okay…','sad']]),'frown']]});
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
  if(phase==='bridge'){goal('bridge','Repair the bridge','Craft a Crude Hammer. With it and Small Logs ×3 in your inventory, click any broken bridge tile.');setObjectiveHelp('willow-bridge',goalHelp);startGoal();}
  if(phase==='fish'){goal('fish','Catch Raw Pondfish','Craft a Crude Fishing Rod from Sticks ×2, then catch one Raw Pondfish at the rippling water in the pond.',caught,1);setObjectiveHelp('willow-fish',goalHelp);startGoal();}
  if(phase==='flint'){goal('flint','Collect Flint','Gather Flint on the ground near the water.',flintCollected,1);guided=true;showTip('A spark of an idea','Look near the water for Flint. Gather one piece to get started.');}
  if(phase==='fire'){goal('fire','Prepare a Campfire','Craft Flint and Stone from Flint ×1 and Stone ×1, then a Campfire from Small Logs ×2. The fire-starting tool is reusable.',api.inventory.campfires||api.campfires.current?1:0);setObjectiveHelp('willow-fire',goalHelp);startGoal();}
  if(phase==='place'){goal('place','Place your Campfire','Use Place in your Campfire inventory details. Click or tap a clear meadow tile to walk over and place it.');showTip('Make yourself at home','Select your Campfire in your inventory, then choose Place.');}
  if(phase==='cook'){goal('cook','Cook a Pondfish','Interact with your Campfire and cook a Raw Pondfish.',cooked,1);guided=true;showTip('Something warm','Click or tap your Campfire to open its cooking menu. Cook a Pondfish to make your first meal.');}
  if(phase==='eat'){goal('eat','Eat a Cooked Pondfish','Select Cooked Pondfish in your inventory and choose Eat. It restores 20 health.',eaten,1);showTip('Time to recover','Select the Cooked Pondfish in your inventory and choose Eat. Food restores health. Eat your cooked fish to soothe that sore hand!',null,eatHelp);setObjectiveHelp('willow-eat',eatHelp);}
 }

 function checkProgress(){
  if(phase==='fire'&&(api.inventory.campfires||api.campfires.current)){done('fire');phase=api.campfires.current?'cook':'place';prompt();}
 }
 function cancel(){cancelPlacement();injuryReaction=null;if(api.carpentry.matches(bridge))api.carpentry.cancel();api.feedback.clearDestination();}
 function showBridge(progress){bridge.setProgress(progress);}
 showBridge(0);
 function repair(){if(phase!=='bridge'){api.toast('Finish preparing with Reed before repairing the bridge.');return;}api.carpentry.start(bridge);}
 function bridgeCompleted(){bridgeDone=true;showBridge(1);setBridgeRepairTarget(false);for(let x=WILLOWBANK.bridgeStart;x<=WILLOWBANK.bridgeEnd;x++){const tile=t(x,WILLOWBANK.bridgeZ);tile.water=false;tile.blocked=false;tile.h=1;}done('bridge');goal('rescue','Name your rescued companion','Give your new friend a name.');phase='rescue';api.stop();const landing=t(WILLOWBANK.bridgeStart-1,WILLOWBANK.bridgeZ),aside=rescueStandAsideRoute(map,api.tile(),landing);rescueAge=0;rescueWaiting=true;if(aside)api.walkRoute(aside.route);}
 function namePet(){lines([['There you are, little one!','happy'],['Well, look at that. I think they’ve taken a liking to you.','happy'],['They’ve only been visiting my fishing spot. Perhaps they’ve been waiting for an adventurer.','idle'],['What would you like to call them?','idle']],()=>editPetName(true));}
 function editPetName(first=false){
  dialogue.hide();companions.name({required:first,
   onComplete(){if(first){done('rescue');phase='fish';lines([['Thanks for helping that little one! How’s your hand?','idle'],['Here—let me teach you how to catch yourself a meal. A little food should help you feel better.','idle'],['First, you’ll need a fishing rod. A simple one will do.','idle']],prompt);}}
  });
 }
 function fishCaught(){
  if(!active)return;
  caught++;
  if(phase==='fish'){goal('fish','Catch Raw Pondfish','Catch one Raw Pondfish at the pond.',caught,1);done('fish');phase='flint';fishingFollowup=true;}
 }

 function campfirePlaced(){if(!active)return;if(phase==='place'||phase==='fire'){done('fire');done('place');phase='cook';lines([['There we go. Much better than chewing on a cold fish.','idle']],prompt);}}
 function campfireCooked(id){if(!active)return;cooked++;if(phase==='cook'&&id==='cookedFish'){done('cook');phase='eat';lines([['Now for the best part!','happy']],prompt);}}
 const cancelPlacement=()=>api.campfires.cancel(),placeFire=tile=>api.campfires.place(tile);

 function foodEaten(){if(!active)return;eaten++;if(phase==='eat'){hideGuide();done('eat');phase='finished';api.closeMenus();lines([['You repaired a bridge, helped a stranded animal, and made yourself dinner.','happy'],['And found a friend along the way.','happy'],[`I’d call that a pretty good start, ${api.profile().name||'Pip'}.`,'happy']],()=>showTip('Broken Bridge Rescue — Complete!','You rescued a companion and learned how to recover.',()=>showTip('Willowbank complete!', 'You can keep exploring and practicing here, or use the Iter Crystal to visit Cinderhold for combat training!')));}}

 function busy(){return !!injuryReaction||introActive||dialogue.active||rescueAge!==null;}
 function interact(a){if(!active||busy())return;tip.hide();if(a.kind==='reed')talk();else if(a.kind==='bridge')repair();else if(a.resourceNode)api.resourceActions.start(a);}
 function arrival(){
  api.stop();dialogue.hide();introSeen=true;introActive=true;introFocus=null;
  api.say('Good work! You just made your first Iter Crystal teleportation!',()=>
   api.say('These crystals are going to be invaluable during your time here in Quadria.',()=>{
    introFocus={position:reed.group.position.clone(),blend:0,returning:false};
    api.say('What’s this? It appears someone is having a bad day.',()=>
     api.say('Perhaps you should go talk to them!',()=>{api.narrator.hide();introFocus.returning=true;}));
   }));
 }
 function meetGoal(){goal('meet','Talk to Reed','Speak to the worried fisher near the arrival crystal.',phase==='meet'?0:1);}
 function enter(value,skipIntro=false){hitFeedback.clear();companions.resetRoute();active=value;group.visible=value;cancel();cancelPlacement();dialogue.hide();tip.hide();cookUI.close();introActive=false;introFocus=null;if(value){api.showTabs?.('inventory','crafting');if(skipIntro)introSeen=true;if(!introSeen)arrival();else if(phase==='meet')meetGoal();}}
 function update(dt,time,camera){hitFeedback.update(dt,camera);if(introFocus){introFocus.blend=THREE.MathUtils.clamp(introFocus.blend+(introFocus.returning?-1:1)*dt/.9,0,1);if(introFocus.hold!=null&&!introFocus.returning&&introFocus.blend===1&&(introFocus.hold-=dt)<=0)introFocus.returning=true;if(introFocus.returning&&introFocus.blend===0){const after=introFocus.after||meetGoal;introFocus=null;introActive=false;after();}}

  let petMoving=false;if(!companions.state.owned)pet.visible=active;
  if(rescueAge!==null&&rescueWaiting&&!api.moving()&&!api.occupied(t(WILLOWBANK.bridgeStart-1,WILLOWBANK.bridgeZ))){rescueWaiting=false;api.face(WILLOWBANK.bridgeStart,WILLOWBANK.bridgeZ);}
  if(rescueAge!==null&&!rescueWaiting){const target=new THREE.Vector3(WILLOWBANK.bridgeStart-7,1,WILLOWBANK.bridgeZ-6),distance=pet.position.distanceTo(target),travel=Math.min(distance,dt*1.4);if(distance>.01){pet.rotation.y+=Math.atan2(Math.sin(-Math.PI/2-pet.rotation.y),Math.cos(-Math.PI/2-pet.rotation.y))*(1-Math.exp(-dt*12));pet.position.lerp(target,travel/distance);rescueGait+=travel*4;petMoving=true;}}
  companions.scripted(time,{sad:rescueAge===null,moving:petMoving,gait:rescueGait,camera});if(!active)return null;
  if(fishingFollowup&&phase!=='flint')fishingFollowup=false;
  if(fishingFollowup&&!api.resourceActions.working&&!api.playerWorking()&&!api.moving()&&!busy()&&!api.menuCovering?.()&&!cookUI.isOpen){
   fishingFollowup=false;
   lines([['A fine catch! Now let’s make those fit for dinner.','happy'],['Look near the water for Flint. We can use it with Stone to start a fire.','idle']],prompt);
  }
  water.update(dt);

reedFacing.update(dt);animateFisher(reed,time,dialogue.expressionFor('right')||(phase==='meet'?'distraught':'idle'));
  const targets={bridge:'bridge',flint:'flint',cook:'fire'};
  followGoal();
  for(const a of actors){const repairing=a===bridge&&api.carpentry.matches(bridge);a.highlight.update((phase==='meet'&&a===reedActor||guided&&a.kind===targets[phase]||guideKinds.has(a.kind))&&!a.depleted&&!a.opened&&!repairing,time,api.hover()===a&&!a.depleted&&!a.opened&&!repairing);}
  if(injuryReaction){injuryReaction.age+=dt;if(injuryReaction.age>=1.2&&!injuryReaction.spoken){injuryReaction.spoken=true;playerLine('Youch! I smashed my finger!',()=>{dialogue.hide();injuryReaction=null;},'struggle');}return {kind:'Hammer injury',time:Math.min(injuryReaction.age,1.2)};}
  if(rescueAge!==null){if(rescueWaiting)return null;rescueAge+=dt;if(rescueAge>4&&!petMoving){rescueAge=null;companions.acquire({at:t(Math.round(pet.position.x+6),Math.round(pet.position.z+6))});namePet();}return null;}
  return null;
 }
 function reset(){goalPhase=goalKey=null;api.fishing.cancel();companions.reset();fishingFollowup=false;setBridgeRepairTarget(true);bridgeInjury.reset();injuryReaction=null;reedFacing.reset();hitFeedback.clear();companions.resetRoute();rescueGait=0;rescueWaiting=false;introActive=false;introFocus=null;api.narrator.hide();resetObjectives('willow-');cancel();dialogue.hide();tip.hide();phase='meet';api.health.restore();rescueAge=null;bridgeDone=false;caught=flintCollected=cooked=eaten=0;api.resourceActions.resetWhere(n=>map.get(key(n.x,n.z))===n.tile);cancelPlacement();api.campfires.reset(map);for(let x=WILLOWBANK.bridgeStart;x<=WILLOWBANK.bridgeEnd;x++){t(x,WILLOWBANK.bridgeZ).water=true;t(x,WILLOWBANK.bridgeZ).blocked=true;}showBridge(0);group.attach(pet);pet.position.set(WILLOWBANK.pet[0]-6,1,WILLOWBANK.pet[1]-6);if(active)api.teleport(portalSpawn(map,crystal.tile));}
 return {restartWater:()=>water.restart(),group,tiles,crystal,grassMaterials,enter,interact,update,cancel,craftStarted(){if(!GOALS[phase])hideGuide();},crafted(){if(active)checkProgress();},get active(){return active;},get cameraFocus(){return introFocus?{position:introFocus.position,blend:THREE.MathUtils.smoothstep(introFocus.blend,0,1)}:rescueAge===null?null:{position:pet.position.clone(),blend:Math.min(THREE.MathUtils.smoothstep(rescueAge,0,.6),1-THREE.MathUtils.smoothstep(rescueAge,3,4))};},get busy(){return busy();},

 foodEaten,campfirePlaced,campfireCooked,get campfireGuide(){return active&&guided&&phase==='cook';},
  get expression(){return dialogue.expressionFor('left');},
  get state(){return {active,phase,health:api.health.value,injuryApplied:bridgeInjury.applied,injuryPaused:!!injuryReaction,bridgeDone,petOwned:companions.state.owned,petName:companions.state.name,petFollowing:companions.state.following,caught,cooked,eaten,action:api.carpentry.matches(bridge)?'Repairing':api.resourceActions.state?.kind};},
  debug:__PLAYGROUND__?{reset,clearUI(){dialogue.hide();introActive=false;introFocus=null;tip.hide();cookUI.close();},hit(){hitFeedback.show(api.player.position,3);},miss(){hitFeedback.show(api.player.position,null);},zero(){hitFeedback.show(api.player.position,0);},stage(value){reset();introSeen=true;phase=({hammer:'bridge',rod:'fish',firestarter:'fire',rescue:'fish',arrival:'meet',dialogue:'meet'})[value]||value;
 if(['rescue','rod','fish','flint','firestarter','fire','place','cook','eat','finished'].includes(value)){bridgeInjury.atProgress(1,api.health.value);api.health.value=api.health.max-INJURY_DAMAGE;bridgeDone=true;showBridge(1);setBridgeRepairTarget(false);for(let x=WILLOWBANK.bridgeStart;x<=WILLOWBANK.bridgeEnd;x++){t(x,WILLOWBANK.bridgeZ).blocked=false;t(x,WILLOWBANK.bridgeZ).water=false;}companions.acquire();}
 for(const [id,n] of Object.entries({sticks:20,stones:20,stone:20,logs:20,axes:1,pickaxes:1,hammers:1,rods:1,flint:3,firestarters:1,campfires:1,rawFish:5,cookedFish:2}))api.inventory[id]=Math.max(api.inventory[id]||0,n);if(['cook','eat','finished'].includes(value)){placeFire(t(5,8));phase=value;}
 if(value==='hammer')api.inventory.hammers=0;
 if(value==='rod')api.inventory.rods=0;
 if(value==='firestarter'){api.inventory.firestarters=0;api.inventory.campfires=0;}
 if(value==='fire')api.inventory.campfires=0;
 if(['rod','fish'].includes(value))api.inventory.rawFish=0;
 if(value==='rescue'){phase='rescue';editPetName(true);return;}
 if(value==='arrival'){arrival();return;}
 if(value==='dialogue'){talk();return;}
 if(value==='meet'){meetGoal();return;}
 if(value==='finished'){showTip('Willowbank complete!','You can keep exploring and practicing here, or use the Iter Crystal to visit Cinderhold for combat training!');return;}
 prompt();}}:undefined
 };
}
