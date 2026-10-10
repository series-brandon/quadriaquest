import {bristleIntroduction,CREVICE_WARNING,CREVICE_REMINDER,CREVICE_CLEARED,WALL_TOPIC,BORIN_WALL,BRISTLE_WALL,BOSS_LESSON} from './cinderhold-dialogue.js';
import {createTerrainBatch} from './terrain-batch.js';
import * as THREE from 'three';
import {CINDERHOLD as POS,makeCinderholdTiles,createTrainingProgress,TRAINING_STEPS,GOLEM_TERRITORY} from './cinderhold-rules.js';
import {stoneTile,stoneArch,furnace,animateFurnace,anvil,supplyShelf,MENTORS} from './training-models.js';
import {createWorldActor,createMentor} from './world-actors.js';
import {createResourceEntity} from './resource-entities.js';
import {createEnemyEntity} from './enemy-entity.js';
import {updateObjective,resetObjectives,registerQuestChapter,setObjectiveHelp} from './quests.js';
import {key} from './world.js';
// Area configuration: Cinderhold's creatures give 1.5× XP until each receiving skill reaches level 3, then
// normal XP, so the lessons deliver early level-ups. Practice targets keep their own shared 0.5×-then-0 rule.
const CREATURE_XP={multiplier:1.5,levelCap:3,afterCapMultiplier:1};
// Rubble where the golem smashed through the south wall, and ember fissures across its arena floor.
// Decoration only (never blocking); one shared material each.
function decorateCrevice(group){
 const [gx,gz]=POS.crevice,rubble=new THREE.MeshStandardMaterial({color:'#5d5967',roughness:.95,flatShading:true}),ember=new THREE.MeshStandardMaterial({color:'#ffb35c',emissive:'#ff6a1f',emissiveIntensity:1.2});
 for(const [dx,dz,r,y] of [[-.55,-.7,.26,1.05],[.6,-.55,.32,1.1],[-.35,-1.25,.18,1],[.4,-1.35,.2,1],[0,.15,.22,1.05]]){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),rubble);m.position.set(gx+dx-6,y,gz+dz-6);m.rotation.set(dx*3,dz*2,r*5);m.castShadow=m.receiveShadow=true;group.add(m);}
 for(const [x,z,len,rot] of [[31,41,1.6,.4],[38,44,1.9,-.7],[34,46,1.2,1.2],[39,39.5,1.1,.2],[30,44.5,1,-.3]]){const m=new THREE.Mesh(new THREE.BoxGeometry(len,.02,.07),ember);m.position.set(x-6,1.011,z-6);m.rotation.y=rot;group.add(m);}
}
export function createCinderhold(api){
 const group=new THREE.Group();group.visible=false;api.scene.add(group);
 const tiles=makeCinderholdTiles(),map=new Map(tiles.map(t=>[key(t.x,t.z),t])),t=(x,z)=>map.get(key(x,z));
 const progress=createTrainingProgress(),state=progress.state,dialogue=api.dialogue,actors=[],nodes=[],enemies=[],mentors={};let active=false,speaker=null,lastOptional='',arrivalSeen=false;
 createTerrainBatch({tiles,map,factory:stoneTile,parent:group,pickables:api.pickables});
 for(const [x,z,rotation] of [[22,8,0],[22,17,0],[22,26,0],[8,19,Math.PI/2],[16,19,Math.PI/2]]){const g=stoneArch();g.position.set(x-6,1,z-6);g.rotation.y=rotation+Math.PI/2;group.add(g);}
 // Guided once the tutorial can end ("???" is on the crystal list).
 const crystal=api.crystals.add({tile:t(...POS.crystal),parent:group,destination:'willowbank',guide:()=>state.phase==='finished'||state.refused});
 const addActor=(kind,pos,model,label,onInteract)=>{const a=createWorldActor({world:api.world,tile:t(...pos),parent:group,pickables:api.pickables,group:model,kind,label,onInteract});actors.push(a);return a;};
 const forge=addActor('furnace',POS.furnace,furnace(),'Smelt at furnace',a=>api.openStation(a));
 addActor('anvil',POS.anvil,anvil(),'Smith at anvil',a=>api.openStation(a));
 addActor('supplies',POS.shelf,supplyShelf(),'Take a recovery meal',()=>{if(!api.supplies.claim('meal'))api.toast('You already have a cooked meal. Eat it from Inventory.');});
 for(const [kind,pos] of [['sarge',POS.sarge],['smith',POS.smith],['ranger',POS.ranger],['mage',POS.mage],['ki',POS.ki]]){
  const a=createMentor({kind,world:api.world,tile:t(...pos),parent:group,pickables:api.pickables,label:'Talk to '+MENTORS[kind].name,onInteract:()=>talk(kind)});mentors[kind]=a;actors.push(a);
 }
 for(const [kind,x,z] of [['copper',6,12],['copper',8,10],['copper',10,12],['copper',7,7],['copper',13,6],['copper',6,23],['sticks',9,15],['sticks',10,17],['stones',14,17],['stones',10,13]])nodes.push(api.resources.add(createResourceEntity({kind,tile:t(x,z),parent:group,pickables:api.pickables})));
 for(const [id,kind,pos] of [['recruit','scrapper',POS.scrapper],['proving','bruiser',POS.bruiser],['ranged-target','target',POS.rangedTarget],['ranged-enemy','scrapper',POS.rangedEnemy],['magic-target','target',POS.magicTarget],['magic-enemy','scrapper',POS.magicEnemy]]){
  const [x,z]=pos;enemies.push(api.combat.add(createEnemyEntity({id,kind,tile:t(x,z),parent:group,pickables:api.pickables,respawn:8,patrol:{minX:x-1,maxX:x+1,minZ:z-1,maxZ:z+1},xp:kind==='target'?null:CREATURE_XP})));
 }
 // The Cinder Golem below the smashed wall: unwinnable, it hunts pacifists, and its territory is the arena.
 const golem=api.combat.add(createEnemyEntity({id:'golem',kind:'golem',tile:t(...POS.golem),parent:group,pickables:api.pickables,respawn:8,territory:GOLEM_TERRITORY,patrol:{minX:POS.golem[0]-2,maxX:POS.golem[0]+2,minZ:POS.golem[1]-2,maxZ:POS.golem[1]+2}}));enemies.push(golem);
 // Fletch keeps the crevice shut (its first tile is blocked) until Bristle or Borin has been asked.
 const gate=t(...POS.crevice);let gateArmed=true;
 const setGate=open=>{gate.blocked=!open;};setGate(false);
 decorateCrevice(group);
 registerQuestChapter('boss-','Something Bigger · Optional');
 registerQuestChapter('cinder-','Basic Training');registerQuestChapter('ranged-','A Little Distance · Optional');registerQuestChapter('magic-','First Spark · Optional');registerQuestChapter('ki-','Steady Breath · Optional');
 // Strong Strike is the player's to press unless their combat mode uses abilities for them (Simple).
 const abilitiesAuto=()=>!!api.abilitiesAuto?.();
 const TASKS={meet:['Report to Sarge','Talk to Sergeant Bristle in the arrival court.'],unarmed:['Throw your first punch','Unequip combat gear, use Class: Melee in Combat (or Weapon / bare hands in Manual), and defeat the recruit-yard Scrapper. Click ground to retreat.'],report:['Report your victory','Return to Sarge.'],smith:['Meet Borin Copperbelly','Talk to the smith in the forge chamber north of the court.'],mine:['Mine Copper Ore','Use a Crude Pickaxe on the orange copper seams. Need a tool? Gather nearby Sticks and Rocks and craft one.',()=>state.ore,4],smelt:['Smelt four ingots','Use Copper Ore at the furnace. Complete four Copper Ingots.',()=>state.ingots,4],dagger:['Smith a Copper Dagger','Use one Copper Ingot and a reusable Crude Hammer at the anvil.',()=>state.dagger,1],shield:['Smith a Copper Shield','Use three Copper Ingots and a reusable Crude Hammer at the anvil.',()=>state.shield,1],equip:['Equip your handiwork','Equip your Copper Dagger and Copper Shield from your Inventory.'],return:['Return to Sarge','Show Sarge that you are ready.'],get bruiser(){return ['Defeat a Goblin Bruiser',abilitiesAuto()?'Find the proving ring through the eastern arch. Your combat mode uses Strong Strike for you when a heavy blow counts. Retreat and eat if hurt; the shelf in the forge supplies recovery meals.':'Find the proving ring through the eastern arch. Strong Strike (lightning button under Energy, or Combat) adds a heavy blow to your next melee attack. Retreat and eat if hurt; the shelf in the forge supplies recovery meals.'];},graduate:['Receive your dismissal','Report to Sarge after your victory.'],finished:['Basic Training complete','You are free to explore or travel. Ranged and magic mentors are optional.']};
 function sync(){const index=TRAINING_STEPS.indexOf(state.phase);for(let i=0;i<=index;i++){const id=TRAINING_STEPS[i],[title,description,count,total=1]=TASKS[id];updateObjective('cinder-'+id,state.refused&&id==='meet'?'Choose your own path':title,state.refused&&id==='meet'?'Combat training is optional. Talk to Bristle if you change your mind.':description,i<index||state.phase==='finished'?total:count?.()||0,total);}
  if(state.crevice!=='closed'){
   updateObjective('boss-ask','Ask about the smashed wall','Fletch says a monster smashed through the wall by the archery gallery. Ask Bristle or Borin about it.',state.crevice==='cleared'?1:0,1);
   if(state.crevice==='cleared')updateObjective('boss-face','What lies below','Something is still down that crevice. If it moves, run.',state.golem==='done'?1:0,1);
  }
  for(const [branch,label] of [['ranged','A Little Distance'],['magic','First Spark']])if(state[branch]!=='offer'){
   updateObjective(branch+'-target',label+' · Practice target','Choose '+(branch==='ranged'?'your bow and arrows':'Energy Strike')+' and defeat the inert practice target beside the mentor.',state[branch]==='target'?0:1,1);
   if(state[branch]!=='target')updateObjective(branch+'-fight',label+' · Live practice','Defeat the nearby Scrapper using '+(branch==='ranged'?'the bow.':'Energy Strike.'),state[branch]==='done'?1:0,1);
  }
  // Ember's optional lesson: one aura alone, then stacked, then both resting while Ki recovers.
  if(state.ki!=='offer'){const order=['rush','stack','recover','done'],at=order.indexOf(state.ki);
   updateObjective('ki-rush','Steady Breath · One aura','Open Combat and turn on Rush by itself. It costs 0.5 Ki to light, then 0.5 Ki every second.',at>0?1:0,1);
   if(at>0)updateObjective('ki-stack','Steady Breath · Stack auras','Add Harden while Rush is on. Together they cost 1 Ki every second.',at>1?1:0,1);
   if(at>1)updateObjective('ki-recover','Steady Breath · Rest','Turn both auras off. Ki only recovers while every aura rests (and all fade at once if Ki runs out).',at>2?1:0,1);
  }
 }
 function prompt(){sync();api.guideMenu?.(null);const [title,description]=TASKS[state.phase];api.tip(state.refused?'Choose your own path':title,state.refused?'Explore freely. Talk to Bristle if you change your mind about training.':description);if(['dagger','shield','smelt'].includes(state.phase))setObjectiveHelp('cinder-'+state.phase,()=>api.approach(actors.find(a=>a.kind===(state.phase==='smelt'?'furnace':'anvil'))));if(state.phase==='equip')setObjectiveHelp('cinder-equip',()=>api.guideMenu({page:'inventory',item:['copperDagger','copperShield'].find(id=>!api.equipment.isEquipped(id))??'copperDagger'}));}
 // Lines are strings or [text, expression].
 function lines(kind,texts,after){api.stop();api.hideTip();speaker=kind;mentors[kind].face(api.player);let i=0;const next=()=>{if(i===texts.length){dialogue.finish(()=>{speaker=null;after?.();});return;}const line=texts[i++],[text,expression]=Array.isArray(line)?line:[line,MENTORS[kind].expression];dialogue.show({side:'right',name:MENTORS[kind].name,model:mentors[kind].group,expression,text,next});};next();}
 function choice(kind,text,accept,action){api.stop();api.hideTip();speaker=kind;mentors[kind].face(api.player);dialogue.show({side:'right',name:MENTORS[kind].name,model:mentors[kind].group,expression:MENTORS[kind].expression,text,choices:[[accept,()=>{dialogue.hide();speaker=null;action();}],['I’ll be back.',()=>{dialogue.hide();speaker=null;}]]});}
 function introduction(){
  api.stop();api.hideTip();speaker='sarge';mentors.sarge.face(api.player);
  const finish=()=>{dialogue.hide();speaker=null;prompt();};
  const show=(line,extra={})=>{
   speaker=line.speaker==='unknown'?null:'sarge';
   if(line.speaker==='player')return dialogue.showPlayer({...line,...extra});
   dialogue.show({side:'right',name:line.speaker==='unknown'?'???':'Bristle',model:line.speaker==='unknown'?null:mentors.sarge.group,...line,...extra});
  };
  bristleIntroduction({refused:state.refused,returning:state.spurned,
   // Attacks prevented (Pacifist): Bristle won't train; a tip points to the Combat page's modes.
   pacifist:()=>!!api.attacksPrevented?.(),
   makePacifist:()=>api.setCombatMode?.('pacifist'),
   turnedAway(){state.spurned=true;dialogue.hide();speaker=null;sync();api.tip('Want to fight?','Change your combat mode if you wish to partake in some battle.',null,()=>{api.hideTip();api.showCombatModes?.();});},
   say(lines,after){let i=0;const next=()=>{if(i===lines.length)return dialogue.finish(after);show(lines[i++],{next});};next();},
   choose(line,choices){show(line,{choices});},
   refuse(){state.refused=true;},leave:finish,
   train(){state.refused=false;lines('sarge',['That scrapper. Bare hands. Click him once and keep swinging. Need out? Click clear ground and MOVE!'],()=>{state.phase='unarmed';prompt();});}
  });
 }
 // Fletch stops the player at the crevice. The first time sets up the questions for Bristle and Borin.
 function warn(){
  api.stop();const first=state.crevice==='closed';if(first)state.crevice='warned';
  lines('ranger',first?CREVICE_WARNING:CREVICE_REMINDER,()=>{sync();if(first)api.tip('Ask about the smashed wall','Fletch won’t let you into the crevice until you’ve asked Bristle or Borin about the monster.');});
 }
 // After Fletch's warning, Bristle and Borin can be asked about the wall (outside Bristle's introduction).
 function wallTopic(kind){return (kind==='sarge'||kind==='smith')&&state.crevice!=='closed'&&!(kind==='sarge'&&state.phase==='meet');}
 function askWall(kind){
  lines(kind,kind==='smith'?BORIN_WALL:BRISTLE_WALL,()=>{if(state.crevice==='warned'){state.crevice='cleared';setGate(true);}sync();if(state.crevice==='cleared')api.tip('What lies below','Fletch will let you through the crevice by the archery gallery now. If the monster moves, run.');});
 }
 function talk(kind){
  if(!wallTopic(kind))return mentorTalk(kind);
  api.stop();api.hideTip();speaker=kind;mentors[kind].face(api.player);
  dialogue.show({side:'right',name:MENTORS[kind].name,model:mentors[kind].group,expression:MENTORS[kind].expression,text:kind==='sarge'?'WHAT is it, SLIME?':'Aye? What can I do for you?',
   choices:[[WALL_TOPIC[kind],()=>{dialogue.hide();speaker=null;askWall(kind);}],[kind==='sarge'?'About my training.':'About smithing.',()=>{dialogue.hide();speaker=null;mentorTalk(kind);}]]});
 }
 function mentorTalk(kind){
  if(kind==='ranger'&&state.crevice==='cleared'&&!creviceThanks){creviceThanks=true;return lines(kind,CREVICE_CLEARED,()=>mentorTalk(kind));}
  if(kind==='sarge'){
   if(state.phase==='meet')return introduction();
   if(state.phase==='report')return lines(kind,['HA! A pulse AND a punch. Now put something useful in those hands.','Find Borin in the forge. Copper. Furnace. Anvil. Come back with a dagger and a shield!'],()=>{state.phase='smith';prompt();});
   if(state.phase==='return')return lines(kind,['Made it yourself? Good. Equipment in a bag is luggage!',...(abilitiesAuto()?['One more trick. Strong Strike: plant your feet and put everything into one blow. Twice the wallop!','Your fighting style throws it for you when a big hit counts. Watch for it!']:['One more trick. Strong Strike: plant your feet and put everything into one blow. Twice the wallop, costs a lot of Energy. Press it, and your next melee swing carries it.','Use it when it counts, not every swing. Energy comes back slowly.']),'Through the eastern arch. Bigger goblin. Bigger wallop. This is why we bothered with the metal.'],()=>{api.styles.learnAbility('strongStrike');state.phase='bruiser';prompt();});
   if(state.phase==='graduate')return lines(kind,["Acceptable! ...That's a compliment. Don't get used to it.","Arrows in the southern gallery. Spells in the northern wing. Ember breathes in the forge corner. Less shouting. Suspicious. Visit if you like. You're cleared to leave!"],()=>{state.phase='finished';prompt();});
   return lines(kind,[state.phase==='finished'?'Dismissed! Practice, explore, or use the crystal. The other mentors are optional.':TASKS[state.phase][1]],prompt);
  }
  // Borin teaches once; afterwards he sends you off rather than repeating the lesson.
  if(kind==='smith'&&TRAINING_STEPS.indexOf(state.phase)>TRAINING_STEPS.indexOf('smith'))return lines(kind,["Don't forget what I taught you! Good luck out there!"],prompt);
  if(kind==='smith')return lines(kind,["Let me guess. Loud, red, called you a maggot? Aye. That's his welcome speech.",'Copper is the orange seam. Your pickaxe will do. Four pieces of ore become four ingots at the furnace.','Ingot on the anvil. Hammer in hand. One for the dagger, three for the shield. The hammer stays yours.','Missing tools? Gather Sticks and Rocks here. The provision shelf offers a meal when you need one.'],()=>{if(state.phase==='smith')state.phase='mine';prompt();});
  if(kind==='ki'){
   if(state.ki==='offer')return choice(kind,'Breathe. You carry more than Health and Mana. Want to learn to hold an aura?','Teach me.',()=>{
    api.auras.learn('rush');api.auras.learn('harden');state.ki='rush';sync();
    lines(kind,['Ki is breath you can spend. An aura holds it for you: Rush quickens your step; Harden firms you against blows.','Lighting an aura costs a moment of Ki up front. Then it sips Ki every second, in battle or out.','Hold two and they sip together. Run dry and every aura goes out at once. Ki only returns while all of them rest.','Try it: open Combat and light Rush by itself. Then add Harden. Then let both rest.'],prompt);});
   return lines(kind,[state.ki==='done'?'Breathe in, breathe out. That is all there is to it. Come back whenever you like.':state.ki==='rush'?'Light Rush by itself first. You will find it under Auras in Combat.':state.ki==='stack'?'Now add Harden. Feel how the cost adds up?':'Let both rest. Watch your Ki return.'],prompt);
  }
  const branch=kind==='ranger'?'ranged':'magic';
  if(state[branch]==='offer')return choice(kind,kind==='ranger'?'You can hit a thing without standing beside it. Revolutionary, I know. Want to try a bow?':'He shouts. I prefer a small, carefully directed burst of energy. Want to learn Energy Strike?','Teach me.',()=>{
   if(kind==='ranger')api.supplies.claim('archerKit');else api.styles.learn('energyStrike');state[branch]='target';sync();
   lines(kind,kind==='ranger'?['Pick Class: Ranged in Combat to equip your Training Bow automatically, or equip it in Inventory. A bow uses both hands.','Shoot the round target, then the Scrapper nearby. Range is six tiles; walls block shots. Each shot spends an arrow, even a miss. Come back if you run out.']:['Open Combat and pick Class: Magic (or select Energy Strike in Manual). It stays learned wherever you travel.','Cast at the round target, then the nearby Scrapper. Six tiles of range; walls block spells. Each cast costs 4 Mana, which recovers over time or at an Iter Crystal. No staff needed.']);
  });
  if(kind==='ranger'){api.supplies.claim('arrows');api.supplies.claim('bow');}
  lines(kind,[state[branch]==='done'?'Nicely done. You can keep practicing here, or take that skill on your travels.':state[branch]==='target'?'Try the round practice target first. Choose the right combat style in the menu.':'Now try your new style against the nearby Scrapper. Retreat whenever you need.']);
 }
 let creviceThanks=false;
 // Fletch calls out once each time the player walks up to the shut crevice.
 function watchCrevice(){
  const p=api.tile?.();if(!p)return;
  const near=Math.abs(p.x-POS.crevice[0])<=1&&p.z>=POS.crevice[1]-2&&p.z<POS.crevice[1];
  if(!near){gateArmed=true;}else if(gateArmed&&state.crevice!=='cleared'&&!dialogue.active){gateArmed=false;warn();}
  // The golem lesson: it came for you, then it was over (flattened, or you got away).
  if(state.golem==='unmet'&&golem.aggro){state.golem='met';sync();}
  else if(state.golem==='met'&&!golem.aggro&&!api.combat.busy){state.golem='done';sync();api.tip(BOSS_LESSON.title,BOSS_LESSON.text);}
 }
 function clearUI(){dialogue.hide();speaker=null;api.hideTip();}
 function reset(){clearUI();progress.reset();state.entered=active;arrivalSeen=false;lastOptional='';resetObjectives('cinder-');resetObjectives('ranged-');resetObjectives('magic-');resetObjectives('boss-');setGate(false);gateArmed=true;creviceThanks=false;for(const n of nodes)api.resources.reset(n);api.combat.resetWhere(a=>enemies.includes(a));for(const m of Object.values(mentors))m.reset();}
 return {id:'cinderhold',name:'Cinderhold',music:'cinderhold',ambience:'forge',description:'Combat & equipment · Optional archery and magic',group,tiles:map,crystal,actors,nodes,enemies,mentors,progress,
  arrival:()=>crystal.tile,camera:{zoom:22,angle:Math.PI/4,elevation:.65,background:'#35313f'},
  enter(){active=true;state.entered=true;if(!arrivalSeen){arrivalSeen=true;lines('sarge',['Front and center, maggot!'],prompt);}else prompt();},
  leave(){active=false;clearUI();},clearUI,reset,
  get busy(){return dialogue.active;},get state(){return {...state};},
  // Cinderhold is done (Basic Training graduated, or training declined): the tutorial can end.
  get tutorialComplete(){return state.phase==='finished'||state.refused;},
  resourceCompleted(changes){progress.event('resource',changes);if(state.entered&&changes.copperOre)sync();},stationCrafted(id){progress.event('crafted',id);if(state.entered)sync();},
  combatWon(a,profile){if(enemies.includes(a)){progress.event('victory',{id:a.id,style:profile.style==='unarmed'&&(profile.rightHand||profile.leftHand)?'guarded':profile.style});sync();}},
  update(dt,time){animateFurnace(forge.group,time);for(const n of nodes)n.highlight.update(state.phase==='mine'&&n.kind==='copper'&&!n.depleted,time,api.hover()===n&&!n.depleted);for(const e of enemies)e.guided=!e.opened&&(state.phase==='unarmed'&&e.id==='recruit'||state.phase==='bruiser'&&e.id==='proving'||state.ranged==='target'&&e.id==='ranged-target'||state.ranged==='fight'&&e.id==='ranged-enemy'||state.magic==='target'&&e.id==='magic-target'||state.magic==='fight'&&e.id==='magic-enemy');for(const a of actors){const guided=a.kind==='sarge'&&['meet','report','return','graduate'].includes(state.phase)||a.kind==='smith'&&state.phase==='smith'||a.kind==='furnace'&&state.phase==='smelt'||a.kind==='anvil'&&['dagger','shield'].includes(state.phase);a.highlight.update(guided,time,api.hover()===a);if(a.update)a.update(dt,time,speaker===a.kind?(dialogue.expressionFor('right')||(state.refused&&a.kind==='sarge'?'distraught':null)):(state.refused&&a.kind==='sarge'?'distraught':null));}
   if(active)watchCrevice();
   if(!active||dialogue.active||api.working())return;if(progress.advance(api.equipment.isEquipped('copperDagger')&&api.equipment.isEquipped('copperShield')&&!api.styles.state.selected))prompt();const sig=state.ranged+state.magic+state.ki;if(sig!==lastOptional){lastOptional=sig;sync();}
   // Observe the shared aura state; the lesson never toggles auras itself.
   const rush=api.auras.isActive('rush'),harden=api.auras.isActive('harden');
   if(state.ki==='rush'&&rush&&!harden)state.ki='stack';else if(state.ki==='stack'&&rush&&harden)state.ki='recover';else if(state.ki==='recover'&&!api.auras.anyActive)state.ki='done';},
  ...(__PLAYGROUND__?{checkpoint(step){reset();state.entered=true;arrivalSeen=true;state.phase=step==='refused'?'meet':TRAINING_STEPS.includes(step)?step:'finished';
   // Boss path steps load after Basic Training (prompt() below shows the finished tip first).state.refused=step==='refused';const i=TRAINING_STEPS.indexOf(state.phase);if(i>1)state.unarmed=true;if(i>4)state.ore=4;if(i>5)state.ingots=4;if(i>6)state.dagger=1;if(i>7)state.shield=1;if(i>9)api.styles.learnAbility('strongStrike');if(i>10)state.bruiser=true;if(step==='ki'){state.ki='rush';api.auras.learn('rush');api.auras.learn('harden');}if(step==='ranged'||step==='magic'){state[step]='target';if(step==='ranged')api.supplies.claim('archerKit');else api.styles.learn('energyStrike');}prompt();if(step==='meet'||step==='refused')talk('sarge');
   if(step==='crevice'){api.teleport?.(t(POS.crevice[0],POS.crevice[1]-3));}
   if(step==='wall'){state.crevice='warned';sync();talk('smith');}
   if(step==='golem'){state.crevice='cleared';setGate(true);sync();api.hideTip();api.teleport?.(t(35,37));}}}:{}),talk
 };
}
