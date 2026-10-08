import {bristleIntroduction} from './cinderhold-dialogue.js';
import {createTerrainBatch} from './terrain-batch.js';
import * as THREE from 'three';
import {CINDERHOLD as POS,makeCinderholdTiles,createTrainingProgress,TRAINING_STEPS} from './cinderhold-rules.js';
import {stoneTile,stoneArch,furnace,animateFurnace,anvil,supplyShelf,MENTORS} from './training-models.js';
import {createWorldActor,createMentor} from './world-actors.js';
import {createResourceEntity} from './resource-entities.js';
import {createEnemyEntity} from './enemy-entity.js';
import {updateObjective,finishObjective,resetObjectives,registerQuestChapter,setObjectiveHelp} from './quests.js';
import {key} from './world.js';
// Area configuration: Cinderhold's creatures give 1.5× XP until each receiving skill reaches level 3, then
// normal XP, so the lessons deliver early level-ups. Practice targets keep their own shared 0.5×-then-0 rule.
const CREATURE_XP={multiplier:1.5,levelCap:3,afterCapMultiplier:1};
export function createCinderhold(api){
 const group=new THREE.Group();group.visible=false;api.scene.add(group);
 const tiles=makeCinderholdTiles(),map=new Map(tiles.map(t=>[key(t.x,t.z),t])),t=(x,z)=>map.get(key(x,z));
 const progress=createTrainingProgress(),state=progress.state,dialogue=api.dialogue,actors=[],nodes=[],enemies=[],mentors={};let active=false,speaker=null,lastOptional='',arrivalSeen=false;
 createTerrainBatch({tiles,map,factory:stoneTile,parent:group,pickables:api.pickables});
 for(const [x,z,rotation] of [[22,8,0],[22,17,0],[22,26,0],[8,19,Math.PI/2],[16,19,Math.PI/2]]){const g=stoneArch();g.position.set(x-6,1,z-6);g.rotation.y=rotation+Math.PI/2;group.add(g);}
 const crystal=api.crystals.add({tile:t(...POS.crystal),parent:group,destination:'willowbank'});
 const addActor=(kind,pos,model,label,onInteract)=>{const a=createWorldActor({world:api.world,tile:t(...pos),parent:group,pickables:api.pickables,group:model,kind,label,onInteract});actors.push(a);return a;};
 const forge=addActor('furnace',POS.furnace,furnace(),'Smelt at furnace',a=>api.openStation(a));
 addActor('anvil',POS.anvil,anvil(),'Smith at anvil',a=>api.openStation(a));
 addActor('supplies',POS.shelf,supplyShelf(),'Take a recovery meal',()=>{if(!api.supplies.claim('meal'))api.toast('You already have a cooked meal. Eat it from Inventory.');});
 for(const [kind,pos] of [['sarge',POS.sarge],['smith',POS.smith],['ranger',POS.ranger],['mage',POS.mage],['ki',POS.ki]]){
  const a=createMentor({kind,world:api.world,tile:t(...pos),parent:group,pickables:api.pickables,label:'Talk to '+MENTORS[kind].name,onInteract:()=>talk(kind)});mentors[kind]=a;actors.push(a);
 }
 for(const [kind,x,z] of [['copper',6,12],['copper',8,10],['copper',10,12],['copper',7,7],['copper',13,6],['copper',6,23],['sticks',9,15],['sticks',10,17],['stones',14,17],['stones',10,13]])nodes.push(api.resources.add(createResourceEntity({kind,tile:t(x,z),parent:group,pickables:api.pickables,respawn:8})));
 for(const [id,kind,pos] of [['recruit','scrapper',POS.scrapper],['proving','bruiser',POS.bruiser],['ranged-target','target',POS.rangedTarget],['ranged-enemy','scrapper',POS.rangedEnemy],['magic-target','target',POS.magicTarget],['magic-enemy','scrapper',POS.magicEnemy]]){
  const [x,z]=pos;enemies.push(api.combat.add(createEnemyEntity({id,kind,tile:t(x,z),parent:group,pickables:api.pickables,respawn:8,patrol:{minX:x-1,maxX:x+1,minZ:z-1,maxZ:z+1},xp:kind==='target'?null:CREATURE_XP})));
 }
 registerQuestChapter('cinder-','Basic Training');registerQuestChapter('ranged-','A Little Distance · Optional');registerQuestChapter('magic-','First Spark · Optional');registerQuestChapter('ki-','Steady Breath · Optional');
 const TASKS={meet:['Report to Sarge','Talk to Sergeant Bristle in the arrival court.'],unarmed:['Throw your first punch','Unequip combat gear, use Class: Melee in Combat (or Weapon / bare hands in Manual), and defeat the recruit-yard Scrapper. Click ground to retreat.'],report:['Report your victory','Return to Sarge.'],smith:['Meet Borin Copperbelly','Talk to the smith in the forge chamber north of the court.'],mine:['Mine Copper Ore','Use a Crude Pickaxe on the orange copper seams. Need a tool? Gather nearby Sticks and Rocks and craft one.',()=>state.ore,4],smelt:['Smelt four ingots','Use Copper Ore at the furnace. Complete four Copper Ingots.',()=>state.ingots,4],dagger:['Smith a Copper Dagger','Use one Copper Ingot and a reusable Crude Hammer at the anvil.',()=>state.dagger,1],shield:['Smith a Copper Shield','Use three Copper Ingots and a reusable Crude Hammer at the anvil.',()=>state.shield,1],equip:['Equip your handiwork','Equip Copper Dagger and Copper Shield through Inventory (or press Optimize Equipment in Combat).'],return:['Return to Sarge','Show Sarge that you are ready.'],bruiser:['Defeat a Goblin Bruiser','Find the proving ring through the eastern arch. Strong Strike (lightning button under Energy, or Combat) adds a heavy blow to your next melee attack. Retreat and eat if hurt; the shelf in the forge supplies recovery meals.'],graduate:['Receive your dismissal','Report to Sarge after your victory.'],finished:['Basic Training complete','You are free to explore or travel. Ranged and magic mentors are optional.']};
 function sync(){const index=TRAINING_STEPS.indexOf(state.phase);for(let i=0;i<=index;i++){const id=TRAINING_STEPS[i],[title,description,count,total=1]=TASKS[id];updateObjective('cinder-'+id,state.refused&&id==='meet'?'Choose your own path':title,state.refused&&id==='meet'?'Combat training is optional. Talk to Bristle if you change your mind.':description,i<index||state.phase==='finished'?total:count?.()||0,total);}
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
 function prompt(){sync();const [title,description]=TASKS[state.phase];api.tip(state.refused?'Choose your own path':title,state.refused?'Explore freely. Talk to Bristle if you change your mind about training.':description);if(['dagger','shield','smelt'].includes(state.phase))setObjectiveHelp('cinder-'+state.phase,()=>api.approach(actors.find(a=>a.kind===(state.phase==='smelt'?'furnace':'anvil'))));if(state.phase==='equip')setObjectiveHelp('cinder-equip',api.openInventory);}
 function lines(kind,texts,after){api.stop();api.hideTip();speaker=kind;mentors[kind].face(api.player);let i=0;const next=()=>{if(i===texts.length){dialogue.finish(()=>{speaker=null;after?.();});return;}dialogue.show({side:'right',name:MENTORS[kind].name,model:mentors[kind].group,expression:MENTORS[kind].expression,text:texts[i++],next});};next();}
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
   turnedAway(){state.spurned=true;dialogue.hide();speaker=null;sync();api.tip('Want to fight?','Change your combat mode if you wish to partake in some battle.',null,()=>{api.hideTip();api.showCombatModes?.();});},
   say(lines,after){let i=0;const next=()=>{if(i===lines.length)return dialogue.finish(after);show(lines[i++],{next});};next();},
   choose(line,choices){show(line,{choices});},
   refuse(){state.refused=true;},leave:finish,
   train(){state.refused=false;lines('sarge',['That scrapper. Bare hands. Click him once and keep swinging. Need out? Click clear ground and MOVE!'],()=>{state.phase='unarmed';prompt();});}
  });
 }
 function talk(kind){
  if(kind==='sarge'){
   if(state.phase==='meet')return introduction();
   if(state.phase==='report')return lines(kind,['HA! A pulse AND a punch. Now put something useful in those hands.','Find Borin in the forge. Copper. Furnace. Anvil. Come back with a dagger and a shield!'],()=>{state.phase='smith';prompt();});
   if(state.phase==='return')return lines(kind,['Made it yourself? Good. Equipment in a bag is luggage!','One more trick. Strong Strike: plant your feet and put everything into one blow. Twice the wallop, costs a lot of Energy. Press it, and your next melee swing carries it.','Use it when it counts, not every swing. Energy comes back slowly.','Through the eastern arch. Bigger goblin. Bigger wallop. This is why we bothered with the metal.'],()=>{api.styles.learnAbility('strongStrike');state.phase='bruiser';prompt();});
   if(state.phase==='graduate')return lines(kind,["Acceptable! ...That's a compliment. Don't get used to it.","Arrows in the southern gallery. Spells in the northern wing. Ember breathes in the forge corner. Less shouting. Suspicious. Visit if you like. You're cleared to leave!"],()=>{state.phase='finished';prompt();});
   return lines(kind,[state.phase==='finished'?'Dismissed! Practice, explore, or use the crystal. The other mentors are optional.':TASKS[state.phase][1]],prompt);
  }
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
 function clearUI(){dialogue.hide();speaker=null;api.hideTip();}
 function reset(){clearUI();progress.reset();state.entered=active;arrivalSeen=false;lastOptional='';resetObjectives('cinder-');resetObjectives('ranged-');resetObjectives('magic-');for(const n of nodes)api.resources.reset(n);api.combat.resetWhere(a=>enemies.includes(a));for(const m of Object.values(mentors))m.reset();}
 return {id:'cinderhold',name:'Cinderhold',description:'Combat & equipment · Optional archery and magic',group,tiles:map,crystal,actors,nodes,enemies,mentors,progress,
  arrival:()=>crystal.tile,camera:{zoom:22,angle:Math.PI/4,elevation:.65,background:'#35313f'},
  enter(){active=true;state.entered=true;if(!arrivalSeen){arrivalSeen=true;lines('sarge',['Front and center, maggot!'],prompt);}else prompt();},
  leave(){active=false;clearUI();},clearUI,reset,
  get busy(){return dialogue.active;},get state(){return {...state};},
  resourceCompleted(changes){progress.event('resource',changes);if(state.entered&&changes.copperOre)sync();},stationCrafted(id){progress.event('crafted',id);if(state.entered)sync();},
  combatWon(a,profile){if(enemies.includes(a)){progress.event('victory',{id:a.id,style:profile.style==='unarmed'&&profile.offHand?'guarded':profile.style});sync();}},
  update(dt,time){animateFurnace(forge.group,time);for(const n of nodes)n.highlight.update(state.phase==='mine'&&n.kind==='copper'&&!n.depleted,time,api.hover()===n&&!n.depleted);for(const e of enemies)e.guided=!e.opened&&(state.phase==='unarmed'&&e.id==='recruit'||state.phase==='bruiser'&&e.id==='proving'||state.ranged==='target'&&e.id==='ranged-target'||state.ranged==='fight'&&e.id==='ranged-enemy'||state.magic==='target'&&e.id==='magic-target'||state.magic==='fight'&&e.id==='magic-enemy');for(const a of actors){const guided=a.kind==='sarge'&&['meet','report','return','graduate'].includes(state.phase)||a.kind==='smith'&&state.phase==='smith'||a.kind==='furnace'&&state.phase==='smelt'||a.kind==='anvil'&&['dagger','shield'].includes(state.phase);a.highlight.update(guided,time,api.hover()===a);if(a.update)a.update(dt,time,speaker===a.kind?(dialogue.expressionFor('right')||(state.refused&&a.kind==='sarge'?'distraught':null)):(state.refused&&a.kind==='sarge'?'distraught':null));}if(!active||dialogue.active||api.working())return;if(progress.advance(api.equipment.isEquipped('copperDagger')&&api.equipment.isEquipped('copperShield')&&!api.styles.state.selected))prompt();const sig=state.ranged+state.magic+state.ki;if(sig!==lastOptional){lastOptional=sig;sync();}
   // Observe the shared aura state; the lesson never toggles auras itself.
   const rush=api.auras.isActive('rush'),harden=api.auras.isActive('harden');
   if(state.ki==='rush'&&rush&&!harden)state.ki='stack';else if(state.ki==='stack'&&rush&&harden)state.ki='recover';else if(state.ki==='recover'&&!api.auras.anyActive)state.ki='done';},
  ...(__PLAYGROUND__?{checkpoint(step){reset();state.entered=true;arrivalSeen=true;state.phase=step==='refused'?'meet':TRAINING_STEPS.includes(step)?step:'finished';state.refused=step==='refused';const i=TRAINING_STEPS.indexOf(state.phase);if(i>1)state.unarmed=true;if(i>4)state.ore=4;if(i>5)state.ingots=4;if(i>6)state.dagger=1;if(i>7)state.shield=1;if(i>9)api.styles.learnAbility('strongStrike');if(i>10)state.bruiser=true;if(step==='ki'){state.ki='rush';api.auras.learn('rush');api.auras.learn('harden');}if(step==='ranged'||step==='magic'){state[step]='target';if(step==='ranged')api.supplies.claim('archerKit');else api.styles.learn('energyStrike');}prompt();if(step==='meet'||step==='refused')talk('sarge');}}:{}),talk
 };
}
