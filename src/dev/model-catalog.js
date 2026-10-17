import {makeTreeModel,makeStumpModel,TREE_SPECIES_NAMES} from '../tree-models.js';
import {TREES} from '../lumberjack.js';
import {coverModel,COVER_KINDS} from '../ground-cover.js';
import {wallPiecePreview,cityGateModel} from '../city-walls.js';
import {makeLootPile} from '../loot-pile-model.js';
import {makeJobMarker} from '../job-marker.js';
import {previewCombat,syncPreviewEquipment} from './preview-loadout.js';
import {createSlimePresentation} from '../slime-presentation.js';
import {createEquipment} from '../equipment.js';
import {equipmentIdleHands,withGrip} from '../combat-animation.js';
import {mentorModel,MENTORS,copperOutcrop,furnace,animateFurnace,anvil,supplyShelf,stoneArch,stoneTile,ingot,trainingTarget,animateTarget} from '../training-models.js';
import {projectileModel} from '../projectile-effects.js';
import {makeCrystal,animateCrystal} from '../crystal-model.js';
import {goblin,animateGoblin} from '../enemy-model.js';
import {makeCinderGolem,animateGolem} from '../golem-model.js';
import {ENEMIES,enemyMove} from '../combat-rules.js';
import {tool} from '../tool-models.js';
import {SPELL_VISUALS} from '../spell-visuals.js';
import {makeBridge} from '../bridge-model.js';
import {fishingSpot,animateFishingSpot} from '../fishing-spot-model.js';
import {campfire,animateCampfire} from '../campfire-model.js';
import {edgePiece,doorModel,animateDoor,STYLE_NAMES} from '../edge-models.js';
import {createBuilding,normalizeBuilding,BUILDING_PRESETS,ROOF_TYPES} from '../building-kit.js';
import {createEdgeFeatures} from '../doors.js';
import {PROPS,PROP_KINDS,propModel,setPropOpen,spinProp} from '../props.js';
import {makeMapTile,layStairs,railingEdges,stairRailParts} from '../map-terrain.js';
import {mergedMesh} from '../merged-model.js';
import {stairwellModel,ladderModel} from '../spaces.js';
import {uniforms as cutUniforms} from '../cutaway.js';
import {companion,animateCompanion,setCompanionOutfit} from '../companion-model.js';
import {makeCompanionTopHat} from '../hat-models.js';
import {EATING_DURATION} from '../eating-motion.js';
import {makePondfish} from '../fish-model.js';
import {holdUpMotion,CELEBRATION_DURATION,HOOK_DURATION,CAST_DURATION} from '../catch-motion.js';
import {FAINT_PREVIEW_DURATION} from '../faint-motion.js';
import * as THREE from 'three';
import {makeFlowers,makeTerrainTile,addWaterTile} from '../world-models.js';
import {createGrassColors} from '../grass-palette.js';
import {createGroundItemModel} from '../ground-item-models.js';
import {makeSlime} from '../slime-model.js';
import {SLIME_EXPRESSIONS} from '../slime-face.js';
import {idlePose,slideMotion,stepMotion,STEP_DURATION,spawnMotion} from '../slime-motion.js';
import {socialMotion,SOCIAL_DURATIONS,HELD_MOTIONS} from '../slime-social.js';
import {fisher} from '../fisher-model.js';
import {SLIME_WEAR_SLOTS,COMPANION_WEAR_SLOTS,WORN_MODELS} from '../worn-gear.js';
import {GEAR} from '../equipment.js';
import {COMPANION_GEAR} from '../companions.js';
import {ITEMS} from '../items.js';
import {attackPose} from '../combat-motion.js';
import {makeBoulder,makePickaxe,makeRubble} from '../mining.js';
import {makeAxe} from '../axe-model.js';
import {makeChest,makeTopHat} from '../finale-models.js';
import {createWaterEffects} from '../water-effects.js';
import {animateResourceHit,animateResourceDepletion} from '../resource-depletion.js';
import {key} from '../world.js';

export const SLIME_ACTIONS={'Attack':'Combat','Strong Strike':'Combat','Block':'Block','Point':'Point','Stomp':'Stomp','Smithing':'Smithing','Smelting':'Smelting','Petting':'Petting','Gathering':'Gathering','Crafting':'Crafting','Chopping':'Chopping','Mining':'Mining','Carpentry':'Repairing','Ouch / hammer injury':'Hammer injury','Fishing cast':'Fishing cast','Fishing catch':'Fishing catch','Celebration':'Celebration','Fishing':'Fishing','Eating':'Eating','Cooking':'Cooking','Defeated':'Defeated'};
export const SLIME_MOTIONS=['Idle','Sliding','Jump up','Jump down','Spawn landing',...Object.keys(SOCIAL_DURATIONS),...Object.keys(SLIME_ACTIONS)];
// Wear slots a preview offers, each with the items that fit it (from the gameplay tables), so the viewer
// shows one dropdown per slot instead of a catalogue entry per cosmetic.
const wearSlots=(slots,table)=>slots.map(({slot,label})=>({slot,label,items:[['','None'],...Object.entries(table).filter(([,item])=>item.slot===slot).map(([id])=>[id,ITEMS[id]?.name||id])]}));
export const SLIME_WEAR=wearSlots(SLIME_WEAR_SLOTS,GEAR),COMPANION_WEAR=wearSlots(COMPANION_WEAR_SLOTS,COMPANION_GEAR);
const staticModel=(name,factory)=>({name,motions:['Static'],create:()=>({group:factory()})});
const expressions=SLIME_EXPRESSIONS.filter(x=>x!=='concerned').map(x=>x[0].toUpperCase()+x.slice(1));
// Every slime previews through the shared slime presentation (slime-presentation.js), exactly as in
// gameplay: the viewer only decides what the slime is doing (its timing, combat profile, social, jump or
// slide pose, and the celebration's trophy) and which gear it holds.
// loadout: the character's own gear ({rightHand, leftHand, head…}). Its hands apply while the viewer's hand
// choices are both empty, and each worn slot while that slot's choice is empty.
function withDefaults(options,loadout){
 if(!loadout)return options;const {rightHand,leftHand,...worn}=loadout,chosen=options.worn||{};
 return {...options,...(!options.rightHand&&!options.leftHand?{rightHand,leftHand}:{}),worn:{...Object.fromEntries(Object.entries(worn).filter(([slot])=>!chosen[slot])),...Object.fromEntries(Object.entries(chosen).filter(([,id])=>id))}};
}
function slimePreview(factory,{defaultExpression='idle',idleRate=1,carry=null,loadout=null}={}){
 const rig=factory(),group=new THREE.Group();group.add(rig.group);
 const inventory={},equipment=createEquipment({inventory});let loadoutKey=null;
 const presentation=createSlimePresentation(rig,{equipment,carry});
 const trophyFish=makePondfish(),trophyHat=makeTopHat(),trophyGeneric=new THREE.Mesh(new THREE.BoxGeometry(.38,.25,.25),new THREE.MeshStandardMaterial({color:'#d9b777'}));
 presentation.visual.add(trophyFish,trophyHat,trophyGeneric);trophyFish.visible=trophyHat.visible=trophyGeneric.visible=false;
 let shownMotion=null;
 return {group,update(time,motion,dt,expressionOverride,heldItem='Generic item',options={}){
  // Picking a different animation snaps; changes within the running animation (hand swaps, stab ↔ punch) blend.
  const snap=motion!==shownMotion;shownMotion=motion;
  const key=JSON.stringify([options.rightHand,options.leftHand,options.handedness,options.attackHands,options.rightDamageType,options.leftDamageType,options.worn]);
  if(key!==loadoutKey){loadoutKey=key;syncPreviewEquipment(equipment,inventory,withDefaults(options,loadout));}
  trophyGeneric.visible=trophyFish.visible=trophyHat.visible=false;
  let pose=idlePose(time*idleRate),lift=0,expression='idle',action=null,socialHands=null;
  // Strong Strike previews the equipped melee attack with the ability's windup, glow and impact.
  const strong=motion==='Strong Strike',combat=['Attack','Block','Strong Strike'].includes(motion)?previewCombat(strong?'Attack':motion,strong?{...options,style:'melee'}:options,time):null,actionKind=combat?.kind||SLIME_ACTIONS[motion];
  if(strong&&combat)combat.profile={...combat.profile,ability:'strongStrike'};
  if(actionKind){
   const actionTime=actionKind==='Block'?time%1.2:actionKind==='Eating'?time%(EATING_DURATION+.5):actionKind==='Hammer injury'?time%2:actionKind==='Defeated'?time%FAINT_PREVIEW_DURATION:actionKind==='Fishing cast'?Math.min(time%(CAST_DURATION+.5),CAST_DURATION):actionKind==='Fishing catch'?Math.min(time%(HOOK_DURATION+.5),HOOK_DURATION):actionKind==='Celebration'?time%(CELEBRATION_DURATION+.6):time;
   action={kind:actionKind,time:actionTime,profile:combat?.profile};
   if(actionKind==='Celebration'){const result=holdUpMotion(actionTime,heldItem==='Raw Pondfish'?'fish':heldItem==='Top Hat'?'hat':'generic'),prop=heldItem==='Raw Pondfish'?trophyFish:heldItem==='Top Hat'?trophyHat:trophyGeneric;prop.visible=result.prop.visible;prop.position.set(0,result.prop.y,result.prop.z);}
  }
  else if(SOCIAL_DURATIONS[motion]){
   const social=socialMotion(motion,HELD_MOTIONS.includes(motion)?time:time%(SOCIAL_DURATIONS[motion]+.7)),slots=equipment.slots;({pose,lift,expression}=social);
   socialHands=withGrip(social.hands,equipmentIdleHands({rightHand:slots.right,leftHand:slots.left}),social.grip);
  }
  else if(motion==='Jump up'||motion==='Jump down'){const t=time%(STEP_DURATION+.5);pose=stepMotion(Math.min(t,STEP_DURATION),motion==='Jump up'?.5:-.5);lift=pose.lift+(motion==='Jump down'?.5:0);expression=t<.32?'preparing':t<STEP_DURATION?'struggle':'idle';}
  else if(motion==='Spawn landing'){pose=spawnMotion(time%1.8);lift=pose.lift;expression=time%1.8<.68?'struggle':'idle';}
  else if(motion==='Sliding'){pose=slideMotion(time%1);expression='focused';}
  if(motion==='Idle')expression=defaultExpression;
  const face=expressionOverride&&expressionOverride.toLowerCase()!=='default'?expressionOverride.toLowerCase():null;
  rig.group.position.y=lift;
  presentation.update(snap?1:dt,time,{pose,expression,motion:action,socialHands,face,snap});
 }};
}
function resource(name,factory,kind){return {name,motions:['Static','Hit','Deplete'],create(){const group=factory(),resource={group,kind},state={};return {group,update(time,motion){group.rotation.set(0,0,0);group.scale.setScalar(1);if(motion==='Hit')animateResourceHit(resource,time,state,()=>{});if(motion==='Deplete')animateResourceDepletion(resource,time%1.8,new THREE.Vector3(0,0,1));}};}};}
function terrain(heights){const group=new THREE.Group(),tiles=heights.map((h,x)=>({x,z:0,h})),map=new Map(tiles.map(t=>[key(t.x,t.z),t])),colors=createGrassColors();for(const tile of tiles){const mesh=makeTerrainTile(tile,map,new THREE.MeshStandardMaterial({color:colors[tile.x%colors.length]}));mesh.position.x=tile.x;group.add(mesh);}return group;}

// Buildings from the building kit (city Phase 4): every preset, with style, roof, rotation and seed
// controls (shown as the viewer's option rows), built by the real builder on a small private map.
// Motions: doors shut, doors open (the production door animation), and cut (as the cutaway draws it).
const PREVIEW_BUILDING=900,title=s=>s[0].toUpperCase()+s.slice(1);
const BUILDING_OPTIONS=[
 {slot:'preset',label:'Building',items:Object.entries(BUILDING_PRESETS).map(([id,p])=>[id==='cottage'?'':id,p.name])},
 {slot:'style',label:'Style',items:[['','Preset style'],...STYLE_NAMES.map(s=>[s,title(s)])]},
 {slot:'roof',label:'Roof',items:[['','Preset roof'],...ROOF_TYPES.map(r=>[r,title(r)])]},
 {slot:'rotation',label:'Rotation',items:[['','0°'],['90','90°'],['180','180°'],['270','270°']]},
 {slot:'seed',label:'Seed',items:[['','Preset seed'],...[1,2,3,4,5].map(n=>[String(n),`Seed ${n}`])]},
];
export function buildingPreview(){
 const group=new THREE.Group();let current=null,built=null,key0=null,edges=null;
 function build(options={}){
  const id=JSON.stringify(options);if(id===key0)return;key0=id;
  if(built){built.dispose();edges.dispose();}
  const preset=BUILDING_PRESETS[options.preset||'cottage'],desc={...preset,...options.style?{style:options.style}:{},...options.roof?{roof:options.roof}:{},rotation:+(options.rotation||0),...options.seed?{seed:+options.seed}:{}};
  const [w,d]=normalizeBuilding(desc).footprint,tiles=new Map();
  for(let x=0;x<w+2;x++)for(let z=0;z<d+2;z++)tiles.set(key(x,z),{x,z,h:0});
  const tileAt=(x,z)=>tiles.get(key(x,z));
  edges=createEdgeFeatures({parent:group,tileAt,cutaway:false});
  built=createBuilding(desc,{origin:[1,1],id:PREVIEW_BUILDING,edges,tileAt,parent:group});edges.bake();
  // Centre the building on the origin (tile x sits at x − 6 in the world).
  group.position.set(6-(w+1)/2,0,6-(d+1)/2);current=desc;
 }
 build();
 return {group,update(time,motion,dt,expression,prop,settings){
  build(settings?.worn||{});
  const open=motion==='Doors open'?Math.min(1,time*1.6):0;
  for(const door of built.doors){door.setOpen(motion==='Doors open',{quiet:true});door.amount=open;animateDoor(door.model,open);}
  const cut=motion==='Cut (cutaway)';
  cutUniforms.uCutIds.value.fill(-1);cutUniforms.uCutIds.value[0]=PREVIEW_BUILDING;cutUniforms.uCutCount.value=cut?1:0;
  for(const {object,low} of edges.cutParts())if(!low)object.visible=object.userData.showWhenCut?cut:!cut;
 }};
}
// City terrain (Phase 5): a terrace a block up with a retaining wall, a 2-wide stair and railings,
// paved, cobbled and grass surfaces with kerbs, all from the production terrain factory.
function terracePreview(){
 const group=new THREE.Group(),map=new Map();
 for(let x=0;x<5;x++)for(let z=0;z<5;z++)map.set(key(x,z),{x,z,h:z<2?2:1,surface:z<2?'flagstone':x<2?'cobble':'grass'});
 layStairs(map,{x:1,z:3,dir:'n',length:2,width:2,base:1});
 for(const tile of map.values()){const m=makeMapTile(tile,map);m.position.set(tile.x-2,0,tile.z-2);group.add(m);}
 const edges=createEdgeFeatures({parent:group,tileAt:(x,z)=>map.get(key(x,z)),cutaway:false});edges.root.position.set(4,0,4);
 const stairSides=[];for(const [a,b,stair] of railingEdges([...map.values()],map)){edges.add(a,b,'railing',{hidden:!!stair});if(stair)stairSides.push([a,b]);}
 const rails=mergedMesh(stairRailParts(stairSides));rails.position.set(4,0,4);group.add(rails);
 return group;
}
export const MODEL_CATALOG=[
 ...Object.entries(MENTORS).map(([kind,def])=>({name:def.name,loadout:true,wear:SLIME_WEAR,motions:SLIME_MOTIONS,expressions,create:()=>slimePreview(()=>mentorModel(kind),{defaultExpression:def.expression,idleRate:def.idleRate,loadout:def.loadout,carry:def.carry})})),
 resource('Copper outcrop',copperOutcrop,'copper'),staticModel('Copper Ingot',ingot),
 ...[['copperDagger','Copper Dagger'],['copperShield','Copper Shield'],['bows','Training Bow'],['arrows','Training Arrow']].map(([id,name])=>staticModel(name,()=>tool(id))),
 {name:'Furnace',motions:['Burning','Static'],create(){const group=furnace();return {group,update:(time,motion)=>animateFurnace(group,motion==='Static'?0:time)};}},
 staticModel('Anvil (Cinderhold station)',anvil),...COVER_KINDS.map(k=>staticModel(`Ground cover (${k})`,()=>coverModel(k))),staticModel('Loot pile',()=>makeLootPile()),staticModel('City wall (run)',()=>wallPiecePreview('run')),staticModel('City wall tower',()=>wallPiecePreview('tower')),staticModel('City gatehouse',()=>wallPiecePreview('gatehouse')),{name:'City gate (double doors)',motions:['Open','Closed'],create(){const gate=cityGateModel(3);return {group:gate.group,update(time,motion){gate.set(motion==='Open'?Math.min(1,(time%3)*.8):0);}};}},staticModel('Road bridge',()=>{const b=makeBridge(4,{width:3});b.setProgress(1);return b.group;}),staticModel('Loot pile (no gold)',()=>makeLootPile({gold:false})),staticModel('Job marker (offer)',()=>makeJobMarker('offer')),staticModel('Job marker (hand in)',()=>makeJobMarker('due')),staticModel('Provision shelf',supplyShelf),staticModel('Stone arch',stoneArch),
 staticModel('Stone tile',()=>stoneTile({x:0,z:0,h:1},new Map())),
 {name:'Practice target',motions:['Static','Hit'],create(){const group=trainingTarget();return {group,update:(time,motion)=>animateTarget(group,time,motion==='Hit'?1:0)};}},
 // Every spell look (charge orb and projectile) from the shared registry.
 ...Object.entries(SPELL_VISUALS).map(([key,look])=>staticModel(`${look.name} spell projectile`,()=>projectileModel('magic',{visual:key}))),

 {name:'Slime',loadout:true,wear:SLIME_WEAR,motions:SLIME_MOTIONS,expressions,create:()=>slimePreview(makeSlime)},
 {name:'Reed',loadout:true,wear:SLIME_WEAR,motions:SLIME_MOTIONS,expressions,create:()=>slimePreview(fisher,{carry:'rods',loadout:{head:'fishersHat'}})},
 // Slam loops the real Ground Slam timing (its whole interval of windup), then the landing.
 // Throw loops the real Rock Throw windup, then the follow-through.
 {name:'Cinder Golem',motions:['Idle','Walk','Slam','Throw','Hit'],create(){const move=id=>enemyMove(ENEMIES.golem,id),group=makeCinderGolem(),interval=move('groundSlam').windup,throwWindup=move('rockThrow').windup;return {group,update(time,motion){const t=time%(interval+.6),u=time%(throwWindup+.7);animateGolem(group,time,{walk:motion==='Walk'?1:0,charge:motion==='Slam'&&t<interval?t/interval:0,slam:motion==='Slam'&&t>=interval?1-(t-interval)/.6:0,thrown:motion==='Throw'?(u<throwWindup?u/throwWindup:Math.min(2,1+(u-throwWindup)/.5)):0,hit:motion==='Hit'?Math.max(0,Math.sin(time*4)):0});}};}},
 ...[false,true].map(big=>({name:big?'Goblin Bruiser':'Goblin',motions:['Idle','Walk','Attack','Hit'],create(){const group=goblin(big);return {group,update(time,motion){animateGoblin(group,time,{walk:motion==='Walk'?1:0,attack:motion==='Attack'?attackPose(time):0,hit:motion==='Hit'?Math.max(0,Math.sin(time*4)):0});}};}})),
 // Cosmetics come from the viewer's Head cosmetic dropdown (options.worn), through the shared outfit code.
 {name:'Corgi',wear:COMPANION_WEAR,motions:['Idle','Walk','Jump up','Jump down','Sit','Scratch','Petting','Sleeping'],expressions:['Idle','Happy','Sad','Sleeping'],create(){const group=companion();return {group,update(time,motion,dt,expressionOverride,heldItem='Generic item',options={}){setCompanionOutfit(group,{head:options.worn?.head||null});animateCompanion(group,time,{moving:motion==='Walk',expression:expressionOverride||'Default',motion,age:motion==='Sleeping'?time:time%2.6});}};}},
 ...TREE_SPECIES_NAMES.map(n=>resource(`Tree (${TREES[n].name} · Lumberjack ${TREES[n].level})`,()=>makeTreeModel(n),'tree')),
 ...TREE_SPECIES_NAMES.map(n=>staticModel(`Stump (${TREES[n].name})`,()=>makeStumpModel(n))),staticModel('Rubble (boulder)',()=>makeRubble('boulder')),staticModel('Rubble (copper)',()=>makeRubble('copper')),resource('Boulder',makeBoulder,'boulder'),staticModel('Flowers',makeFlowers),
 ...['sticks','stones','flint'].map((id,i)=>staticModel(['Sticks','Rocks','Flint'][i],()=>createGroundItemModel(id))),
 staticModel('Crude Axe',makeAxe),staticModel('Crude Pickaxe',makePickaxe),
 staticModel('Raw Pondfish',makePondfish),
 ...[['swords','Stone Sword'],['crudeShield','Crude Shield'],['hammers','Crude Hammer'],['rods','Crude Fishing Rod'],['staffs','Simple Staff']].map(([id,name])=>staticModel(name,()=>tool(id))),
 staticModel('Top Hat',makeTopHat),staticModel('Companion Top Hat',makeCompanionTopHat),
 ...Object.entries(WORN_MODELS).filter(([id])=>!['hats','companionHats'].includes(id)).map(([id,make])=>staticModel(ITEMS[id].name,make)),
 // Edge features (docs/CITY.md, Walls and doors): the production pieces side by side, and the shared door
 // with the real swing (animateDoor): Open and Close loop the swing; Locked rattles it shut.
 {name:'Wall pieces',motions:['Idle'],create(){const group=new THREE.Group();['wall','window','fence','railing','low'].forEach((kind,i)=>{const p=edgePiece(kind);p.position.x=(i-2)*1.15;group.add(p);});return {group,update(){}};}},
 {name:'Door',motions:['Open','Close','Locked'],create(){const door=doorModel();return {group:door.group,update(time,motion){const t=time%2.4,open=motion==='Open'?Math.min(1,t*1.6):motion==='Close'?Math.max(0,1-t*1.6):0;animateDoor(door,open,motion==='Locked'?Math.max(0,1-(time%1.2)*2):0,time);}};}},
 staticModel('Stairs and terrace',terracePreview),staticModel('Stairwell (up)',()=>{const g=new THREE.Group();g.add(stairwellModel('up'));return g;}),staticModel('Stairwell (down)',()=>{const g=new THREE.Group();g.add(stairwellModel('down'));return g;}),
 staticModel('Ladder (up)',()=>{const g=new THREE.Group();g.add(ladderModel('up'));return g;}),staticModel('Ladder (hatch)',()=>{const g=new THREE.Group();g.add(ladderModel('down'));return g;}),
 // Props: lids, doors and drawers open and close on their real moving parts; a waterwheel turns.
 ...PROP_KINDS.map(kind=>PROPS[kind].spin?{name:PROPS[kind].name,motions:['Turning','Still'],create(){const group=propModel(kind);return {group,update(time,motion){spinProp(group,motion==='Turning'?time*PROPS[kind].spin.speed:0);}};}}:PROPS[kind].moving?{name:PROPS[kind].name,motions:['Closed','Open'],create(){const group=propModel(kind);return {group,update(time,motion){setPropOpen(group,motion==='Open'?Math.min(1,(time%2.4)*1.5):0);}};}}:staticModel(PROPS[kind].name,()=>propModel(kind))),
 {name:'Building',motions:['Doors closed','Doors open','Cut (cutaway)'],wear:BUILDING_OPTIONS,create:buildingPreview},
 {name:'Campfire',motions:['Burning','Static'],create(){const group=campfire();return {group,update(time,motion){animateCampfire(group,motion==='Static'?0:time);}};}},
 staticModel('Campfire placement ghost',()=>campfire(true)),
 {name:'Fishing spot',motions:['Ripples'],create(){const group=fishingSpot();return {group,update:time=>animateFishingSpot(group,time)};}},
 {name:'Iter Crystal',motions:['Floating','Static'],create(){const group=makeCrystal();return {group,update(time,motion){animateCrystal(group,motion==='Floating'?time:0);}};}},
 {name:'Wooden chest',motions:['Closed','Open'],create(){const {group,lid}=makeChest();return {group,update(time,motion){lid.rotation.x=motion==='Open'?-1:0;lid.position.set(0,motion==='Open'?.64:.49,motion==='Open'?-.18:0);}};}},
 {name:'Bridge',motions:['Broken','Repair stages','Repaired'],create(){const bridge=makeBridge();return {group:bridge.group,update(time,motion){bridge.setProgress(motion==='Broken'?0:motion==='Repaired'?1:Math.floor((time%6)/1.5)/3);}};}},
 staticModel('Grass tile',()=>terrain([1])),staticModel('Half-height ledge',()=>terrain([1,1.5])),staticModel('Joined grass tiles',()=>terrain([1,1,1.5])),
 {name:'Water tiles',motions:['Waves'],create(renderer){const group=new THREE.Group(),effects=createWaterEffects(group,renderer),tiles=[{x:0,z:0,water:true},{x:1,z:0,water:true}],map=new Map(tiles.map(t=>[key(t.x,t.z),t]));for(const tile of tiles)addWaterTile(group,tile,map,effects,0);return {group,update(time,motion,dt){if(time===0)effects.restart();effects.update(dt);}};}}
];
