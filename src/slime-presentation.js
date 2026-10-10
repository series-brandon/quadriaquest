import * as THREE from 'three';
import {createSlimeBend} from './slime-bend.js';
import {createEquipment} from './equipment.js';
import {createEquipmentPresentation} from './equipment-presentation.js';
import {createCastPresentation} from './cast-presentation.js';
import {createFishingPresentation} from './fishing-presentation.js';
import {createPoseBlender,motionKey} from './pose-blend.js';
import {playerActionMotion,gatheringHand,alignSupportingHand} from './player-action-motion.js';
import {equipmentIdleHands,withGrip} from './combat-animation.js';
import {socialMotion,SOCIAL_DURATIONS} from './slime-social.js';
import {SPELLS} from './combat-styles.js';
import {idlePose} from './slime-motion.js';
import {holdUpMotion} from './catch-motion.js';
import {placeFaintedHands} from './faint-motion.js';
import {miningMotion,makePickaxe} from './mining.js';
import {chopMotion} from './slime-motion.js';
import {makeAxe} from './axe-model.js';
import {heldTool,carriedTool} from './tool-models.js';

// One presentation for every slime, player or NPC (AGENTS.md: shared slime presentation). A caller
// decides what the slime is doing (a base pose, an action motion, social hands, a celebration); this
// applies it the same way for everyone: action blending, bend, face, squash and lean, grounding, hand
// targets and smoothing, held gear (equipment-presentation.js, including the bow), tools, casting and
// fishing. Characters differ only in their rig's look, loadout and which motions they are given.

// Idle motion in a conversation is this fraction of its overworld size (the overworld idle is bold so a
// slime reads at a distance; close up in the portrait that is distracting).
export const CALM_IDLE=.3;
const calmPose=p=>({...p,squash:1+(p.squash-1)*CALM_IDLE,stretch:1+((p.stretch??1)-1)*CALM_IDLE,twist:(p.twist||0)*CALM_IDLE,lean:(p.lean||0)*CALM_IDLE,roll:(p.roll||0)*CALM_IDLE,bend:(p.bend||0)*CALM_IDLE});
// A real equipment instance holding a fixed loadout ({rightHand, leftHand}) under the gameplay rules.
export function loadoutEquipment(loadout={}){
 const inventory={};for(const id of [loadout.rightHand,loadout.leftHand])if(id)inventory[id]=(inventory[id]||0)+1;
 const equipment=createEquipment({inventory});
 if(loadout.rightHand)equipment.toggle(loadout.rightHand,'right');if(loadout.leftHand)equipment.toggle(loadout.leftHand,'left');
 return equipment;
}

// rig: {group, body, face, hands} from makeSlime (or a model built on it). The rig's children move into
// `visual`, so the root keeps its placement and facing.
// equipment: an equipment instance or a getter (held gear and carry pose); null holds nothing.
// tools: optional factories {axe, pickaxe, hammer} (models are made the first time they are needed).
// carry: a tool carried while idle ('rods' rests over the shoulder), hidden whenever the hands work.
export function createSlimePresentation(rig,{equipment=null,tools={},carry=null}={}){
 const {group,body,face,hands}=rig;
 const visual=new THREE.Group();visual.add(...[...group.children]);group.add(visual);
 const bendSlime=createSlimeBend(visual,[body,face.group]);
 const equipmentNow=typeof equipment==='function'?equipment:()=>equipment;
 const blender=createPoseBlender(),made={};let gear=null,cast=null,fishing=null;
 // Tool models are named slime-tool-<name> (held gear: equipment-<side>-<id>; carried: slime-carry-<id>).
 const toolModel=(name,make)=>{if(!made[name]){made[name]=(tools[name]||make)();made[name].name='slime-tool-'+name;made[name].visible=false;hands[0].add(made[name]);}return made[name];};
 const carried=carry?carriedTool(carry):null;if(carried){carried.name='slime-carry-'+carry;carried.visible=false;hands[0].add(carried);}
 const scaleTarget=new THREE.Vector3(),handTarget=new THREE.Vector3(),handScale=new THREE.Vector3(),bodyVertex=new THREE.Vector3(),bodyTransform=new THREE.Matrix4();
 const bodyPositions=body.geometry.getAttribute('position');body.updateMatrix();
 function gearFor(){const e=equipmentNow();if(e&&!gear)gear=createEquipmentPresentation({hands,visual,equipment:e});return gear;}
 function bend(amount){bendSlime(amount);gearFor()?.bend(amount);}
 const fishingNow=()=>{if(!fishing){fishing=createFishingPresentation({player:group,hands});fishing.rod.name='slime-tool-rod';}return fishing;};
 // state: pose (the base pose: idle, locomotion or social), expression, handWork, socialHands, motion (an
 // action motion {kind,time,profile}), moving (a block keeps the locomotion pose), celebration ({age}),
 // happy (keep a happy face through an action), face (a final expression override, e.g. dialogue),
 // gearMotion (the motion held gear follows; defaults to motion), working (skilling hides weapons),
 // debugTools ({chopping, mining, time}: playground previews of tool motions), snap (jump straight to
 // the pose, e.g. a preview switching animations), calm (in a conversation: idle motion eases back to
 // CALM_IDLE of its size, since it is seen close up in the portrait).
 function update(dt,time,{pose,expression='idle',handWork=null,socialHands=null,motion=null,moving=false,celebration=null,happy=false,face:faceOverride=null,gearMotion,working=false,debugTools=null,snap=false,calm=false}={}){
  let actionPose=null;
  if(calm&&!motion&&!socialHands&&!celebration)pose=calmPose(pose);
  if(motion){
   // Crossfade between motions (punch ↔ stab, hand swaps, attack ↔ block…). Archery stays exact for the bow string.
   const blended=actionPose=blender.update(motionKey(motion.kind,motion.profile),playerActionMotion(motion.kind,motion.time,time,motion.profile),dt,{instant:motion.kind==='Archery'||snap});
   if(motion.kind!=='Block'||!moving)pose=blended.pose;expression=blended.expression;handWork=blended.handWork;socialHands=blended.hands;
   if(happy)expression='happy';
  }else blender.reset();
  if(celebration){const held=holdUpMotion(celebration.age);expression=held.expression;handWork=null;pose=held.pose;socialHands=held.hands;}
  bend(pose.bend||0);
  face.set(faceOverride||expression);
  // Archery already has authored easing. Extra smoothing delays the bow settling past the start of the
  // draw and separates the grip from its string.
  const shownMotion=gearMotion===undefined?motion:gearMotion,exactArchery=shownMotion?.kind==='Archery'&&!celebration;
  const blend=exactArchery||snap?1:1-Math.exp(-dt*24),width=1/Math.sqrt(pose.squash),stretch=pose.stretch||1;
  if(pose.scale)scaleTarget.fromArray(pose.scale);else scaleTarget.set(width/Math.sqrt(stretch),pose.squash,width*Math.sqrt(stretch));visual.scale.lerp(scaleTarget,blend);
  visual.rotation.x=THREE.MathUtils.lerp(visual.rotation.x,pose.lean||0,blend);
  visual.rotation.y=THREE.MathUtils.lerp(visual.rotation.y,pose.twist||0,blend);
  visual.rotation.z=THREE.MathUtils.lerp(visual.rotation.z,pose.roll||0,blend);
  // Keep the lowest transformed body vertex on the surface, even during lean and squash. The root's
  // jump height remains independent of this correction.
  visual.position.y=0;visual.updateMatrix();bodyTransform.multiplyMatrices(visual.matrix,body.matrix);
  let bottom=Infinity;
  for(let i=0;i<bodyPositions.count;i++){bodyVertex.fromBufferAttribute(bodyPositions,i).applyMatrix4(bodyTransform);bottom=Math.min(bottom,bodyVertex.y);}
  visual.position.y=.002-bottom;
  const chopTool=motion?.kind==='Chopping'||debugTools?.chopping,mineTool=motion?.kind==='Mining'||debugTools?.mining;
  if(chopTool||made.axe)toolModel('axe',makeAxe).visible=!!chopTool;
  if(mineTool||made.pickaxe)toolModel('pickaxe',makePickaxe).visible=!!mineTool;
  const toolTime=motion?.time??debugTools?.time??0,chopping=mineTool?miningMotion(toolTime):chopTool?chopMotion(toolTime):null;
  const slots=equipmentNow()?.slots,carryHands=equipmentIdleHands({rightHand:slots?.right,leftHand:slots?.left});
  // Both hands share the chop cycle; other interactions keep their scoop gesture.
  for(let i=0;i<hands.length;i++){
   const hand=hands[i];
   let [x,y,z,curl,roll,yaw]=carryHands[i];z+=pose.armDrive||0;
   if(handWork!==null&&!chopping)[x,y,z,curl,roll,yaw]=gatheringHand(handWork,i);
   if(chopping)[x,y,z,curl,roll,yaw=0]=i===0?chopping.right:chopping.left;
   if(socialHands)[x,y,z,curl,roll,yaw=0]=socialHands[i];
   // Smoothing carries values between frames, so a single invalid pose would otherwise persist forever:
   // treat missing/invalid targets as 0 and snap back if the current transform is not finite.
   const f=v=>Number.isFinite(v)?v:0;[x,y,z,curl,roll,yaw]=[x,y,z,curl,roll,yaw].map(f);
   if(![hand.position.x,hand.position.y,hand.position.z,hand.rotation.x,hand.rotation.y,hand.rotation.z].every(Number.isFinite)){hand.position.set(x,y,z);hand.rotation.set(curl,yaw,roll);}
   hand.position.lerp(handTarget.set(x,y,z),exactArchery||snap?1:1-Math.exp(-dt*(motion?.kind==='Combat'?48:22)));
   hand.rotation.x=THREE.MathUtils.lerp(hand.rotation.x,curl,blend);
   hand.rotation.z=THREE.MathUtils.lerp(hand.rotation.z,roll,blend);
   hand.rotation.y=THREE.MathUtils.lerp(hand.rotation.y,yaw,blend);
   hand.scale.lerp(handScale.set(1,handWork!==null?.88:1,handWork!==null?1.15:1),blend);
  }
  if(pose.handDrop!==undefined)placeFaintedHands(visual,hands,pose.handDrop);
  alignSupportingHand(hands,mineTool?'Mining':motion?.kind==='Fishing catch'?'Fish hook':motion?.kind);
  gearFor()?.update({motion:shownMotion,working,celebrating:!!celebration});
  if(motion?.kind==='Casting'||cast)(cast||=createCastPresentation(hands)).update(motion?.kind==='Casting'?actionPose:null,time,motion?.profile);
  const hammering=['Repairing','Smithing'].includes(motion?.kind);if(hammering||made.hammer)toolModel('hammer',()=>heldTool('hammers')).visible=hammering;
  if(['Fishing','Fishing cast','Fishing catch'].includes(motion?.kind)||motion?.fishing||fishing)fishingNow().update(motion);
  if(carried)carried.visible=!motion&&!celebration&&handWork===null&&!socialHands&&!slots?.right;
  return {expression:faceOverride||expression,acting:!!motion,actionPose,exactArchery};
 }
 return {visual,update,bend,get fishing(){return fishingNow();},clearFishing(){fishing?.clear();}};
}

// An attack profile from a character's own gear, for combat motions played without one: its held weapon
// (or fists, a bow draw for a bow), or Energy Strike for Casting. Intervals match the model viewer.
const COMBAT_KINDS=['Combat','Archery','Casting','Block'];
function gearProfile(kind,equipment){
 const slots=equipment?.slots||{},hands={rightHand:slots.right||null,leftHand:slots.left||null};
 const attack=kind==='Casting'?{...SPELLS.energyStrike,item:null,hand:'main'}:equipment?.attack||{style:'unarmed',hand:'main',side:'right'};
 return {...attack,...hands,style:kind==='Casting'?'magic':kind==='Archery'?'ranged':attack.style,interval:kind==='Archery'?1.7:kind==='Casting'?1.8:1.5};
}
// Every motion a slime actor can play: action motions, then social motions.
export const SLIME_ACTOR_MOTIONS=['Combat','Archery','Casting','Block','Point','Stomp','Gathering','Crafting','Chopping','Mining','Repairing','Smithing','Smelting','Fishing','Fishing cast','Fishing catch','Eating','Cooking','Petting','Celebration','Hammer injury',...Object.keys(SOCIAL_DURATIONS)];
// An NPC (or any scripted) slime: idles with the shared idle pose and plays any shared motion on
// request, through the same presentation as the player. play(kind) takes any action motion kind
// (Combat, Archery, Casting, Block, Point, Stomp, Chopping, Fishing cast, Eating…; see
// player-action-motion.js) or a social motion (Wave, Happy hop, Sleeping…; slime-social.js).
// profile: an attack profile for combat motions; loop: false plays once (social motions use their own
// length, action motions `duration`). idleRate paces the idle breathing (a character's temperament).
export function createSlimeActor(rig,{loadout=null,carry=null,idleRate=1}={}){
 const equipment=loadout?loadoutEquipment(loadout):null,presentation=createSlimePresentation(rig,{equipment,carry});
 const baseY=rig.group.position.y;let playing=null;
 return {presentation,equipment,visual:presentation.visual,
  play(kind,{profile=null,loop=true,duration=null}={}){playing={kind,profile:profile||(COMBAT_KINDS.includes(kind)?gearProfile(kind,equipment):null),loop,duration:duration??SOCIAL_DURATIONS[kind]??null,time:0};},
  stop(){playing=null;},
  get playing(){return playing?.kind||null;},
  // expression: the face when nothing overrides it; face: a final override (e.g. dialogue); calm: in a
  // conversation (idle eases back).
  update(dt,time,{expression='idle',face=null,calm=false}={}){
   let pose=idlePose(time*idleRate),motion=null,socialHands=null,lift=0;
   if(playing){
    playing.time+=dt;
    if(!playing.loop&&playing.duration!==null&&playing.time>=playing.duration)playing=null;
    else if(SOCIAL_DURATIONS[playing.kind]!==undefined){
     const t=playing.kind==='Sleeping'||!playing.duration?playing.time:playing.time%(playing.duration+.7),social=socialMotion(playing.kind,t),slots=equipment?.slots;
     ({pose,lift,expression}=social);socialHands=equipment?withGrip(social.hands,equipmentIdleHands({rightHand:slots.right,leftHand:slots.left}),social.grip):social.hands;
    }else motion={kind:playing.kind,time:playing.time,profile:playing.profile};
   }
   rig.group.position.y=baseY+(lift||0);
   return presentation.update(dt,time,{pose,expression,motion,socialHands,face,calm});
  }};
}
