import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlime} from './slime-model.js';
import {createSlimePresentation,createSlimeActor,loadoutEquipment} from './slime-presentation.js';
import {mentorModel,MENTORS} from './training-models.js';
import {fisher} from './fisher-model.js';
import {SOCIAL_DURATIONS} from './slime-social.js';
import {GEAR} from './equipment.js';

const ACTIONS=['Combat','Archery','Casting','Block','Point','Stomp','Gathering','Crafting','Chopping','Mining','Repairing','Smithing','Smelting','Fishing','Fishing cast','Fishing catch','Eating','Cooking','Petting','Celebration','Hammer injury'];
const handState=rig=>rig.hands.map(h=>[...h.position.toArray(),h.rotation.x,h.rotation.y,h.rotation.z].map(v=>+v.toFixed(5)||0));
const shown=(rig,prefix)=>{const names=[];rig.group.traverse(o=>{if(!o.name.startsWith(prefix))return;let p=o;while(p){if(!p.visible)return;p=p.parent;}names.push(o.name);});return names.sort();};

test('every slime character can play every shared motion, with or without gear',()=>{
 const rigs=[makeSlime(),fisher(),...Object.keys(MENTORS).map(mentorModel)];
 for(const rig of rigs)for(const loadout of [null,{leftHand:'bows'},{rightHand:'copperDagger',leftHand:'copperShield'}]){
  const actor=createSlimeActor(rig,{loadout,carry:'rods'});
  for(const kind of [...ACTIONS,...Object.keys(SOCIAL_DURATIONS)]){actor.play(kind);for(let i=0;i<12;i++)actor.update(.05,i*.05);
   for(const h of rig.hands)assert.ok([...h.position.toArray(),h.rotation.x,h.rotation.y,h.rotation.z].every(Number.isFinite),kind);}
 }
});

test('an NPC and the player pose identically for the same motion and loadout',()=>{
 const loadout={rightHand:'copperDagger',leftHand:'copperShield'};
 const playerRig=makeSlime(),npcRig=makeSlime();
 const player=createSlimePresentation(playerRig,{equipment:loadoutEquipment(loadout)}),npc=createSlimeActor(npcRig,{loadout});
 for(const kind of ['Combat','Block','Chopping','Point','Eating']){
  npc.play(kind);let time=0;
  for(let i=0;i<15;i++){time+=.05;npc.update(.05,time);player.update(.05,time,{pose:{squash:1,stretch:1,twist:0,lean:0},motion:{kind,time}});}
  // Combat motions take the NPC's gear profile; compare the hand-placement motions exactly.
  if(!['Combat','Block'].includes(kind))assert.deepEqual(handState(npcRig),handState(playerRig),kind);
 }
});

test('held gear, tools and the carried rod show only when they should',()=>{
 const rig=mentorModel('ranger'),fletch=createSlimeActor(rig,{loadout:MENTORS.ranger.loadout});
 fletch.update(.1,0);assert.deepEqual(shown(rig,'equipment-left'),['equipment-left-bows'],'his bow is carried at rest');
 fletch.play('Archery');fletch.update(.5,.5);assert.deepEqual(shown(rig,'equipment-left'),['equipment-left-bows']);
 fletch.play('Chopping');fletch.update(.5,1);assert.deepEqual([...shown(rig,'equipment-left'),...shown(rig,'equipment-right')],[],'skilling swaps hand gear for the tool');assert.deepEqual(shown(rig,'equipment-archerCap'),['equipment-archerCap'],'his cap stays on');assert.deepEqual(shown(rig,'slime-tool-'),['slime-tool-axe']);
 fletch.stop();fletch.update(.5,1.5);assert.deepEqual(shown(rig,'slime-tool-'),[]);assert.deepEqual(shown(rig,'equipment-left'),['equipment-left-bows']);
 const reedRig=fisher(),reed=createSlimeActor(reedRig,{carry:'rods'});
 reed.update(.1,0);assert.deepEqual(shown(reedRig,'slime-carry'),['slime-carry-rods']);
 reed.play('Fishing cast');reed.update(.3,.3);assert.deepEqual(shown(reedRig,'slime-carry'),[]);assert.deepEqual(shown(reedRig,'slime-tool-'),['slime-tool-rod']);
 reed.play('Wave',{loop:false});reed.update(.1,.4);assert.deepEqual(shown(reedRig,'slime-carry'),[],'a wave uses the hands');
 reed.update(5,5);assert.equal(reed.playing,null,'one-shot motions end');assert.deepEqual(shown(reedRig,'slime-carry'),['slime-carry-rods']);
});

test('in conversation the idle eases back to a calm breath, and returns when it ends',async()=>{
 const {CALM_IDLE}=await import('./slime-presentation.js');
 const swing=calm=>{const rig=makeSlime(),actor=createSlimeActor(rig);let min=Infinity,max=-Infinity,twist=0;
  for(let i=0;i<200;i++){actor.update(.02,i*.02,{calm});const v=actor.visual;min=Math.min(min,v.scale.y);max=Math.max(max,v.scale.y);twist=Math.max(twist,Math.abs(v.rotation.y));}
  return {squash:max-min,twist};};
 const bold=swing(false),calm=swing(true);
 assert.ok(calm.squash<bold.squash*(CALM_IDLE+.1),'squash eases back');assert.ok(calm.twist<bold.twist*(CALM_IDLE+.1),'twist eases back');
 assert.ok(calm.squash>0,'still breathing');
});

test('any slime shows Strong Strike glowing on its striking hand',()=>{
 const rig=makeSlime(),actor=createSlimeActor(rig);
 actor.play('Combat',{profile:{style:'unarmed',interval:1.5,hand:'main',side:'right',ability:'strongStrike'}});
 let seen=false;for(let i=0;i<70;i++){actor.update(.02,i*.02);const glow=rig.hands[0].getObjectByName('strong-strike-glow');if(glow?.visible)seen=true;}
 assert.ok(seen,'glow appears through the windup');
 actor.play('Combat',{profile:{style:'unarmed',interval:1.5,hand:'main',side:'right'}});for(let i=0;i<80;i++)actor.update(.02,i*.02);
 assert.equal(rig.hands[0].getObjectByName('strong-strike-glow').visible,false,'a plain attack has no glow');
});

test('mentor hats are Head items: worn from their loadout, swappable like any gear',async()=>{
 const expected={sarge:'ironSkullcap',smith:'minersCap',ranger:'archerCap',mage:'wizardHat',ki:'breathHeadband'};
 for(const [kind,hat] of Object.entries(expected)){const rig=mentorModel(kind),a=createSlimeActor(rig,{loadout:MENTORS[kind].loadout});a.update(.1,0);
  assert.deepEqual(shown(rig,'equipment-').filter(n=>!/^equipment-(right|left)-/.test(n)),['equipment-'+hat],kind);}
 // Swap Bristle's skullcap for Wisp's hat through the equipment system.
 const rig=mentorModel('sarge'),bristle=createSlimeActor(rig,{loadout:MENTORS.sarge.loadout});bristle.update(.1,0);
 const {equipment}=bristle;equipment.setSlots({head:null});bristle.update(.1,.1);assert.deepEqual(shown(rig,'equipment-ironSkullcap'),[],'taken off');
 const inv=loadoutEquipment({head:'wizardHat'});assert.equal(inv.slots.head,'wizardHat');
 const wisp=createSlimeActor(mentorModel('mage'),{loadout:{...MENTORS.mage.loadout,head:'ironSkullcap'}});wisp.update(.1,0);
 assert.deepEqual(shown({group:wisp.visual.parent},'equipment-ironSkullcap'),['equipment-ironSkullcap'],'any slime can wear any hat');
 const reed=fisher(),r=createSlimeActor(reed,{loadout:{head:'fishersHat'}});r.update(.1,0);assert.deepEqual(shown(reed,'equipment-fishersHat'),['equipment-fishersHat']);
});
test('the staff is an equippable swing; the axe, pickaxe, hammer and rod are equippable for looks and fight as a bare fist',async()=>{
 const {createEquipment,GEAR}=await import('./equipment.js'),{resolveAttackMotion}=await import('./combat-animation.js');
 const staff=createEquipment({inventory:{staffs:1}});assert.ok(staff.toggle('staffs'));assert.equal(staff.handAttack('main').item,'staffs');assert.equal(resolveAttackMotion(staff.handAttack('main')),'slash');
 assert.equal(GEAR.firestarters,undefined,'Flint and Stone is not equippable');
 for(const id of ['axes','pickaxes','hammers','rods']){
  assert.equal(GEAR[id].cosmetic,true,id);assert.ok(!GEAR[id].style&&!GEAR[id].power,'no combat stats: '+id);
  const e=createEquipment({inventory:{[id]:1}});assert.ok(e.toggle(id),'equippable: '+id);assert.equal(e.slots.right,id);
  const attack=e.handAttack('right');assert.equal(attack.style,'unarmed',id+' hand punches');assert.equal(attack.item,null);
  assert.deepEqual(e.inventoryActions(id).map(a=>a.label),['Unequip right hand','Equip left hand'],'inventory offers equip actions');
 }
 const rig=mentorModel('mage'),wisp=createSlimeActor(rig,{loadout:MENTORS.mage.loadout});wisp.update(.1,0);assert.deepEqual(shown(rig,'equipment-right'),['equipment-right-staffs'],'Wisp holds her staff as gear');
 const borinRig=mentorModel('smith'),borin=createSlimeActor(borinRig,{loadout:MENTORS.smith.loadout});borin.update(.1,0);assert.deepEqual(shown(borinRig,'equipment-right'),['equipment-right-hammers'],'Borin holds his hammer');
});

test('held tools rest like a blade; a held rod rests on the shoulder; the staff stands upright',async()=>{
 const {equipmentIdleHands}=await import('./combat-animation.js'),{heldTool,carriedTool}=await import('./tool-models.js');
 const sword=equipmentIdleHands({rightHand:'swords'})[0][3];
 for(const id of ['axes','pickaxes','hammers'])assert.equal(equipmentIdleHands({rightHand:id})[0][3],sword,id);
 assert.equal(equipmentIdleHands({rightHand:'staffs'})[0][3],0,'staff upright');
 assert.deepEqual(heldTool('rods').rotation.toArray().slice(0,3),carriedTool('rods').rotation.toArray().slice(0,3),'rod on the shoulder');
});

test('a slime actor is dressed in its loadout before its first update',()=>{
 // Arrival opens a mentor's first line (and its portrait copies the model) before the area's first update.
 for(const [kind,def] of Object.entries(MENTORS)){
  const rig=mentorModel(kind);createSlimeActor(rig,{loadout:def.loadout});
  const expected=Object.entries(def.loadout).map(([slot,id])=>GEAR[id].slot==='hand'?`equipment-${slot==='rightHand'?'right':'left'}-${id}`:'equipment-'+id).sort();
  assert.deepEqual(shown(rig,'equipment-'),expected,kind);
 }
 const reedRig=fisher();createSlimeActor(reedRig,{carry:'rods'});
 assert.deepEqual(shown(reedRig,'slime-carry-'),['slime-carry-rods']);
});
