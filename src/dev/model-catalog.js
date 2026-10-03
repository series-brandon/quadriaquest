import * as THREE from 'three';
import {makeTree,makeFlowers,makeTerrainTile,addWaterTile} from '../world-models.js';
import {createGrassColors} from '../grass-palette.js';
import {createGroundItemModel} from '../ground-item-models.js';
import {makeSlime} from '../slime-model.js';
import {SLIME_EXPRESSIONS} from '../slime-face.js';
import {idlePose,slideMotion} from '../slime-motion.js';
import {socialMotion,SOCIAL_DURATIONS} from '../slime-social.js';
import {createSlimeBend} from '../slime-bend.js';
import {fisher,goblin,companion,campfire,animateCampfire,fishingSpot,animateFishingSpot,tool,animateGoblin,animateCompanion,makeBridge,makeBridgeMarker} from '../willowbank-models.js';
import {attackPose} from '../combat-motion.js';
import {makeBoulder,makePickaxe} from '../mining.js';
import {makeAxe} from '../axe-model.js';
import {makeCrystal,makeChest,makeTopHat} from '../finale-models.js';
import {createWaterEffects} from '../water-effects.js';
import {animateResourceHit,animateResourceDepletion} from '../resource-depletion.js';
import {key} from '../world.js';

const staticModel=(name,factory)=>({name,motions:['Static'],create:()=>({group:factory()})});
const expressions=SLIME_EXPRESSIONS.filter(x=>!['idle','sleeping','concerned'].includes(x)).map(x=>x[0].toUpperCase()+x.slice(1));
function slimePreview(factory,reed=false){
 const rig=factory(),group=new THREE.Group();group.add(rig.group);
 const bend=createSlimeBend(rig.group,[rig.body,rig.face.group]);
 const rest=rig.hands.map(h=>h.position.clone());
 return {group,update(time,motion){
  let pose=idlePose(time),hands=null,lift=0,expression='idle';
  if(SOCIAL_DURATIONS[motion]){const social=socialMotion(motion,motion==='Sleeping'?time:time%(SOCIAL_DURATIONS[motion]+.7));({pose,hands,lift,expression}=social);}
  else if(motion==='Sliding')pose=slideMotion(time%1);
  else if(expressions.includes(motion))expression=motion.toLowerCase();
  rig.face.set(expression);bend(pose.bend||0);
  const width=1/Math.sqrt(pose.squash),stretch=pose.stretch||1;
  rig.group.scale.set(width/Math.sqrt(stretch),pose.squash,width*Math.sqrt(stretch));
  rig.group.rotation.set(pose.lean||0,pose.twist||0,pose.roll||0);rig.group.position.y=lift;
  rig.hands.forEach((hand,i)=>{hand.position.copy(rest[i]);hand.rotation.set(0,0,0);if(hands){const [x,y,z,curl,roll]=hands[i];hand.position.set(x,y,z);hand.rotation.set(curl,0,roll);}else if(!reed)hand.position.z+=(pose.armDrive||0);});
 }};
}
function resource(name,factory,kind){return {name,motions:['Static','Hit','Deplete'],create(){const group=factory(),resource={group,kind},state={};return {group,update(time,motion){group.rotation.set(0,0,0);group.scale.setScalar(1);if(motion==='Hit')animateResourceHit(resource,time,state,()=>{});if(motion==='Deplete')animateResourceDepletion(resource,time%1.8,new THREE.Vector3(0,0,1));}};}};}
function terrain(heights){const group=new THREE.Group(),tiles=heights.map((h,x)=>({x,z:0,h})),map=new Map(tiles.map(t=>[key(t.x,t.z),t])),colors=createGrassColors();for(const tile of tiles){const mesh=makeTerrainTile(tile,map,new THREE.MeshStandardMaterial({color:colors[tile.x%colors.length]}));mesh.position.x=tile.x;group.add(mesh);}return group;}

export const MODEL_CATALOG=[
 {name:'Slime',motions:['Idle','Sliding','Wave','Happy hop','Sleeping',...expressions],create:()=>slimePreview(makeSlime)},
 {name:'Reed',motions:['Idle',...expressions],create:()=>slimePreview(fisher,true)},
 ...[false,true].map(big=>({name:big?'Goblin Bruiser':'Goblin',motions:['Idle','Walk','Attack','Hit'],create(){const group=goblin(big);return {group,update(time,motion){animateGoblin(group,time,{walk:motion==='Walk'?1:0,attack:motion==='Attack'?attackPose(time):0,hit:motion==='Hit'?Math.max(0,Math.sin(time*4)):0});}};}})),
 {name:'Corgi',motions:['Idle','Walk','Sad'],create(){const group=companion();return {group,update(time,motion){animateCompanion(group,time,{moving:motion==='Walk',sad:motion==='Sad'});}};}},
 resource('Tree',makeTree,'tree'),resource('Boulder',makeBoulder,'boulder'),staticModel('Flowers',makeFlowers),
 ...['sticks','stones','flint'].map((id,i)=>staticModel(['Sticks','Rocks','Flint'][i],()=>createGroundItemModel(id))),
 staticModel('Crude Axe',makeAxe),staticModel('Crude Pickaxe',makePickaxe),
 ...[['swords','Stone Sword'],['shields','Wooden Shield'],['hammers','Crude Hammer'],['rods','Crude Fishing Rod']].map(([id,name])=>staticModel(name,()=>tool(id))),
 staticModel('Top Hat',makeTopHat),
 {name:'Campfire',motions:['Burning','Static'],create(){const group=campfire();return {group,update(time,motion){animateCampfire(group,motion==='Static'?0:time);}};}},
 staticModel('Campfire placement ghost',()=>campfire(true)),
 {name:'Fishing spot',motions:['Ripples'],create(){const group=fishingSpot();return {group,update:time=>animateFishingSpot(group,time)};}},
 {name:'Iter Crystal',motions:['Floating','Static'],create(){const group=makeCrystal();return {group,update(time,motion){group.position.y=motion==='Floating'?.12+Math.sin(time*1.8)*.1:0;}};}},
 {name:'Wooden chest',motions:['Closed','Open'],create(){const {group,lid}=makeChest();return {group,update(time,motion){lid.rotation.x=motion==='Open'?-1:0;lid.position.set(0,motion==='Open'?.64:.49,motion==='Open'?-.18:0);}};}},
 {name:'Bridge',motions:['Broken','Repair stages','Repaired'],create(){const bridge=makeBridge();return {group:bridge.group,update(time,motion){bridge.setProgress(motion==='Broken'?0:motion==='Repaired'?1:Math.floor((time%6)/1.5)/3);}};}},
 staticModel('Bridge repair marker',makeBridgeMarker),
 staticModel('Grass tile',()=>terrain([1])),staticModel('Half-height ledge',()=>terrain([1,1.5])),staticModel('Joined grass tiles',()=>terrain([1,1,1.5])),
 {name:'Water tiles',motions:['Waves'],create(renderer){const group=new THREE.Group(),effects=createWaterEffects(group,renderer),tiles=[{x:0,z:0,water:true},{x:1,z:0,water:true}],map=new Map(tiles.map(t=>[key(t.x,t.z),t]));for(const tile of tiles)addWaterTile(group,tile,map,effects,0);return {group,update(time,motion,dt){if(time===0)effects.restart();effects.update(dt);}};}}
];
