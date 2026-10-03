import {updateFishingCast,updateFishingRodMotion,resetFishingRodMotion} from '../fishing-rod.js';
import {makePondfish} from '../fish-model.js';
import {catchMotion,holdUpMotion,CELEBRATION_DURATION,HOOK_DURATION,CAST_DURATION} from '../catch-motion.js';
import {placeFaintedHands,groundFaintedBody} from '../faint-motion.js';
import {FAINT_PREVIEW_DURATION} from '../faint-motion.js';
import {playerActionMotion,gatheringHand,alignSupportingHand} from '../player-action-motion.js';
import * as THREE from 'three';
import {makeTree,makeFlowers,makeTerrainTile,addWaterTile} from '../world-models.js';
import {createGrassColors} from '../grass-palette.js';
import {createGroundItemModel} from '../ground-item-models.js';
import {makeSlime} from '../slime-model.js';
import {SLIME_EXPRESSIONS} from '../slime-face.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION} from '../slime-motion.js';
import {socialMotion,SOCIAL_DURATIONS} from '../slime-social.js';
import {createSlimeBend} from '../slime-bend.js';
import {fisher,goblin,companion,campfire,animateCampfire,fishingSpot,animateFishingSpot,tool,heldTool,animateGoblin,animateCompanion,makeBridge} from '../willowbank-models.js';
import {attackPose} from '../combat-motion.js';
import {makeBoulder,makePickaxe} from '../mining.js';
import {makeAxe} from '../axe-model.js';
import {makeCrystal,makeChest,makeTopHat} from '../finale-models.js';
import {createWaterEffects} from '../water-effects.js';
import {animateResourceHit,animateResourceDepletion} from '../resource-depletion.js';
import {key} from '../world.js';

export const SLIME_ACTIONS={'Punching':'Combat','Sword and shield':'Combat','Gathering':'Gathering','Crafting':'Crafting','Chopping':'Chopping','Mining':'Mining','Carpentry':'Repairing','Ouch / hammer injury':'Hammer injury','Fishing cast':'Fishing cast','Fishing catch':'Fishing catch','Celebration':'Celebration','Fishing':'Fishing','Cooking':'Cooking','Defeated':'Defeated'};
const staticModel=(name,factory)=>({name,motions:['Static'],create:()=>({group:factory()})});
const expressions=SLIME_EXPRESSIONS.filter(x=>x!=='concerned').map(x=>x[0].toUpperCase()+x.slice(1));
function slimePreview(factory,reed=false){
 const rig=factory(),group=new THREE.Group();group.add(rig.group);
 const bend=createSlimeBend(rig.group,[rig.body,rig.face.group]);
 const rest=rig.hands.map(h=>h.position.clone());
 const trophyFish=makePondfish(),trophyHat=makeTopHat();rig.group.add(trophyFish,trophyHat);trophyFish.visible=trophyHat.visible=false;
 const trophyGeneric=new THREE.Mesh(new THREE.BoxGeometry(.38,.25,.25),new THREE.MeshStandardMaterial({color:'#d9b777'}));rig.group.add(trophyGeneric);trophyGeneric.visible=false;
 const tools={};if(!reed){for(const id of ['swords','shields','hammers','rods']){tools[id]=heldTool(id);rig.hands[id==='shields'?1:0].add(tools[id]);}tools.axes=makeAxe();tools.pickaxes=makePickaxe();rig.hands[0].add(tools.axes,tools.pickaxes);for(const [id,model] of Object.entries(tools)){model.name=`preview-tool-${id}`;model.visible=false;}}

 return {group,update(time,motion,dt,expressionOverride,heldItem='Generic item'){
  trophyGeneric.visible=trophyFish.visible=trophyHat.visible=false;
  let pose=idlePose(time),hands=null,lift=0,expression='idle',handWork=null;
  const actionKind=!reed?SLIME_ACTIONS[motion]:null;
  for(const model of Object.values(tools))model.visible=false;
  if(actionKind){const actionTime=actionKind==='Hammer injury'?time%2:actionKind==='Defeated'?time%FAINT_PREVIEW_DURATION:actionKind==='Fishing cast'?Math.min(time%(CAST_DURATION+.5),CAST_DURATION):actionKind==='Fishing catch'?Math.min(time%(HOOK_DURATION+.5),HOOK_DURATION):actionKind==='Celebration'?time%(CELEBRATION_DURATION+.6):time;({pose,hands,handWork,expression}=playerActionMotion(actionKind,actionTime));const active=motion==='Sword and shield'?['swords','shields']:({Repairing:['hammers'],Fishing:['rods'],Chopping:['axes'],Mining:['pickaxes']}[actionKind]||[]);for(const id of active)tools[id].visible=true;
   if(actionKind==='Fishing catch'||actionKind==='Fishing cast')tools.rods.visible=true;
   if(actionKind==='Celebration'){const result=holdUpMotion(actionTime,heldItem==='Raw Pondfish'?'fish':heldItem==='Top Hat'?'hat':'generic'),prop=heldItem==='Raw Pondfish'?trophyFish:heldItem==='Top Hat'?trophyHat:trophyGeneric;prop.visible=result.prop.visible;prop.position.set(0,result.prop.y,result.prop.z);}

  }
  else if(SOCIAL_DURATIONS[motion]){const social=socialMotion(motion,motion==='Sleeping'?time:time%(SOCIAL_DURATIONS[motion]+.7));({pose,hands,lift,expression}=social);}
  else if(motion==='Jump up'||motion==='Jump down'){const t=time%(STEP_DURATION+.5);pose=stepMotion(Math.min(t,STEP_DURATION),motion==='Jump up'?.5:-.5);lift=pose.lift+(motion==='Jump down'?.5:0);expression=t<.32?'preparing':t<STEP_DURATION?'struggle':'idle';}
  else if(motion==='Sliding'){pose=slideMotion(time%1);expression='focused';}
  if(expressionOverride&&expressionOverride!=='default')expression=expressionOverride.toLowerCase();
  rig.face.set(expression);bend(pose.bend||0);
  const width=1/Math.sqrt(pose.squash),stretch=pose.stretch||1;
  rig.group.scale.set(...(pose.scale||[width/Math.sqrt(stretch),pose.squash,width*Math.sqrt(stretch)]));
  rig.group.rotation.set(pose.lean||0,pose.twist||0,pose.roll||0);rig.group.position.y=lift;
  rig.hands.forEach((hand,i)=>{hand.position.copy(rest[i]);hand.rotation.set(0,0,0);hand.scale.set(1,handWork!==null?.88:1,handWork!==null?1.15:1);const values=hands?.[i]||(handWork!==null?gatheringHand(handWork,i):null);if(values){const [x,y,z,curl,roll,yaw=0]=values;hand.position.set(x,y,z);hand.rotation.set(curl,yaw,roll);}else if(!reed)hand.position.z+=(pose.armDrive||0);});
  if(pose.handDrop!==undefined){groundFaintedBody(rig.group,rig.body);placeFaintedHands(rig.group,rig.hands,pose.handDrop);}
  alignSupportingHand(rig.hands,actionKind==='Fishing catch'?'Fish hook':actionKind);
  if(tools.rods?.visible&&actionKind==='Fishing cast')updateFishingCast(tools.rods,group.localToWorld(new THREE.Vector3(0,.02,1.7)),Math.min(time%(CAST_DURATION+.5),CAST_DURATION));else if(tools.rods?.visible)updateFishingRodMotion(tools.rods,group.localToWorld(new THREE.Vector3(0,.02,1.7)),actionKind==='Fishing catch'?Math.min(time%(HOOK_DURATION+.5),HOOK_DURATION):null);else if(tools.rods)resetFishingRodMotion(tools.rods);
 }};
}
function resource(name,factory,kind){return {name,motions:['Static','Hit','Deplete'],create(){const group=factory(),resource={group,kind},state={};return {group,update(time,motion){group.rotation.set(0,0,0);group.scale.setScalar(1);if(motion==='Hit')animateResourceHit(resource,time,state,()=>{});if(motion==='Deplete')animateResourceDepletion(resource,time%1.8,new THREE.Vector3(0,0,1));}};}};}
function terrain(heights){const group=new THREE.Group(),tiles=heights.map((h,x)=>({x,z:0,h})),map=new Map(tiles.map(t=>[key(t.x,t.z),t])),colors=createGrassColors();for(const tile of tiles){const mesh=makeTerrainTile(tile,map,new THREE.MeshStandardMaterial({color:colors[tile.x%colors.length]}));mesh.position.x=tile.x;group.add(mesh);}return group;}

export const MODEL_CATALOG=[
 {name:'Slime',motions:['Idle','Sliding','Jump up','Jump down','Wave','Happy hop','Sleeping',...Object.keys(SLIME_ACTIONS)],expressions,create:()=>slimePreview(makeSlime)},
 {name:'Reed',motions:['Idle'],expressions,create:()=>slimePreview(fisher,true)},
 ...[false,true].map(big=>({name:big?'Goblin Bruiser':'Goblin',motions:['Idle','Walk','Attack','Hit'],create(){const group=goblin(big);return {group,update(time,motion){animateGoblin(group,time,{walk:motion==='Walk'?1:0,attack:motion==='Attack'?attackPose(time):0,hit:motion==='Hit'?Math.max(0,Math.sin(time*4)):0});}};}})),
 {name:'Corgi',motions:['Idle','Walk'],expressions:['Happy','Sad'],create(){const group=companion();return {group,update(time,motion,dt,expressionOverride,heldItem='Generic item'){animateCompanion(group,time,{moving:motion==='Walk',sad:expressionOverride==='Sad'});}};}},
 resource('Tree',makeTree,'tree'),resource('Boulder',makeBoulder,'boulder'),staticModel('Flowers',makeFlowers),
 ...['sticks','stones','flint'].map((id,i)=>staticModel(['Sticks','Rocks','Flint'][i],()=>createGroundItemModel(id))),
 staticModel('Crude Axe',makeAxe),staticModel('Crude Pickaxe',makePickaxe),
 staticModel('Raw Pondfish',makePondfish),
 ...[['swords','Stone Sword'],['shields','Wooden Shield'],['hammers','Crude Hammer'],['rods','Crude Fishing Rod']].map(([id,name])=>staticModel(name,()=>tool(id))),
 staticModel('Top Hat',makeTopHat),
 {name:'Campfire',motions:['Burning','Static'],create(){const group=campfire();return {group,update(time,motion){animateCampfire(group,motion==='Static'?0:time);}};}},
 staticModel('Campfire placement ghost',()=>campfire(true)),
 {name:'Fishing spot',motions:['Ripples'],create(){const group=fishingSpot();return {group,update:time=>animateFishingSpot(group,time)};}},
 {name:'Iter Crystal',motions:['Floating','Static'],create(){const group=makeCrystal();return {group,update(time,motion){group.position.y=motion==='Floating'?.12+Math.sin(time*1.8)*.1:0;}};}},
 {name:'Wooden chest',motions:['Closed','Open'],create(){const {group,lid}=makeChest();return {group,update(time,motion){lid.rotation.x=motion==='Open'?-1:0;lid.position.set(0,motion==='Open'?.64:.49,motion==='Open'?-.18:0);}};}},
 {name:'Bridge',motions:['Broken','Repair stages','Repaired'],create(){const bridge=makeBridge();return {group:bridge.group,update(time,motion){bridge.setProgress(motion==='Broken'?0:motion==='Repaired'?1:Math.floor((time%6)/1.5)/3);}};}},
 staticModel('Grass tile',()=>terrain([1])),staticModel('Half-height ledge',()=>terrain([1,1.5])),staticModel('Joined grass tiles',()=>terrain([1,1,1.5])),
 {name:'Water tiles',motions:['Waves'],create(renderer){const group=new THREE.Group(),effects=createWaterEffects(group,renderer),tiles=[{x:0,z:0,water:true},{x:1,z:0,water:true}],map=new Map(tiles.map(t=>[key(t.x,t.z),t]));for(const tile of tiles)addWaterTile(group,tile,map,effects,0);return {group,update(time,motion,dt){if(time===0)effects.restart();effects.update(dt);}};}}
];
