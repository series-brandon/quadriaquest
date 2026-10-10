import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlime} from './slime-model.js';
import {createSlimePresentation,createSlimeActor,loadoutEquipment} from './slime-presentation.js';
import {mentorModel,MENTORS} from './training-models.js';
import {fisher} from './fisher-model.js';
import {SOCIAL_DURATIONS} from './slime-social.js';

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
 fletch.play('Chopping');fletch.update(.5,1);assert.deepEqual(shown(rig,'equipment-'),[],'skilling swaps gear for the tool');assert.deepEqual(shown(rig,'slime-tool-'),['slime-tool-axe']);
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
