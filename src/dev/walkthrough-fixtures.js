import {Group,InstancedMesh,PlaneGeometry,MeshBasicMaterial,Matrix4,Color} from 'three';
import {createWorldActor} from '../world-actors.js';
import {createEnemyEntity} from '../enemy-entity.js';
import {makeSlime} from '../slime-model.js';
import {createSlimeActor} from '../slime-presentation.js';
import {canStand} from '../footprint.js';
import {key} from '../world.js';

// Walk-through characters (docs/CITY.md). Placement and commands only: the crowd are real slime world
// actors, the golem is the real boss entity placed passive, and every walk uses the player's real
// movement (the companion follows with its real follower). Works in any map.
const COLORS=['#e3a1c4','#9fc2e8','#f0c27a','#b7d99a','#c9a8e8','#8fd1c5'];
const DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1]];
const LANE_HELP='Needs a clear, level 4-tile lane (with free tiles beside it) leading away from where you stand. Step into open ground and try again.';
const RADIUS=8,SOLID=new Color('#d9534f'),OCCUPIED=new Color('#3f86e0');
export function createWalkThroughFixtures(api){
 let actors=[],slimes=[],golem=null,root=null,anchor=null,crowdBeyond=null,golemBeyond=null,overlay=null,overlayClock=0;
 const at=(x,z)=>api.world.get(key(x,z));
 const open=(t,from)=>!!t&&!t.blocked&&!t.water&&!api.occupied(t)&&Math.abs(t.h-from.h)<=.5;
 // A straight run of clear, level tiles leading away from the player, plus the tiles beside each step.
 function lane(length,wide=false){
  const p=api.tile();
  for(const [dx,dz] of DIRECTIONS){
   const run=[];let prev=p;
   for(let i=1;i<=length;i++){const t=at(p.x+dx*i,p.z+dz*i);if(!open(t,prev))break;run.push(t);prev=t;}
   if(run.length<length)continue;
   if(!wide)return {run,side:()=>null};
   // Either side of the lane will do.
   for(const s of [1,-1]){const side=t=>at(t.x+dz*s,t.z+dx*s);if(run.every(t=>open(side(t),t)))return {run,side};}
  }
  return null;
 }
 function ensureRoot(){if(!root){root=new Group();api.scene.add(root);anchor=api.tile();}}
 function clearCrowd(){for(const a of actors)a.dispose();actors=[];slimes=[];crowdBeyond=null;}
 function clearGolem(){if(golem)api.combat.remove(golem);golem=null;golemBeyond=null;}
 function clear(){api.stop();clearCrowd();clearGolem();root?.removeFromParent();root=null;anchor=null;}
 function spawnCrowd(){
  api.stop();api.clearUI();clearCrowd();
  const found=lane(4,true);if(!found)return LANE_HELP;
  ensureRoot();const {run,side}=found;
  // A 2×2 knot of townsfolk on the lane: walking straight on crosses them.
  [run[1],run[2],side(run[1]),side(run[2])].forEach((tile,i)=>{
   // Placed first, then given its presentation (which keeps the placed height), as mentors are.
   const rig=makeSlime(COLORS[i%COLORS.length]);let slime=null;
   const actor=createWorldActor({world:api.world,tile,parent:root,pickables:api.pickables,group:rig.group,kind:'townsfolk',label:'Wave to townsfolk (walk-through test)',onInteract:()=>slime.play('Wave',{loop:false})});
   slime=createSlimeActor(rig,{idleRate:.8+i*.1});
   actors.push(actor);slimes.push(slime);
  });
  crowdBeyond=run[3];
  return 'Placed four walk-through townsfolk ahead. Walk through the crowd heads straight on, through them, and stops on the free tile beyond.';
 }
 function spawnGolem(){
  api.stop();api.clearUI();clearGolem();
  const found=lane(4,true);if(!found)return LANE_HELP;
  const {run,side}=found,cells=[run[1],run[2],side(run[1]),side(run[2])];
  const tile=at(Math.min(...cells.map(c=>c.x)),Math.min(...cells.map(c=>c.z)));
  if(!canStand(api.world,tile,2)||cells.some(c=>api.occupied(c)))return 'No level 2×2 space for the golem on the lane.';
  ensureRoot();golem=api.combat.add(createEnemyEntity({kind:'golem',tile,parent:root,pickables:api.pickables,aggressive:false,attacksPacifists:false,patrol:{minX:tile.x,maxX:tile.x,minZ:tile.z,maxZ:tile.z}}));
  golemBeyond=run[3];
  return 'Placed a passive Cinder Golem across the lane (it does not wander or engage). Walk through the golem crosses its 2×2 body.';
 }
 function walk(target,what){
  if(!target||api.world.get(key(target.x,target.z))!==target)return `Spawn the ${what} first (in this map).`;
  api.moveTo(target);return `Walking through the ${what}. Its tiles stay unblocked; the route goes straight on.`;
 }
 function setOverlay(on){
  if(!on){overlay?.removeFromParent();overlay?.geometry.dispose();overlay?.material.dispose();overlay=null;return;}
  if(overlay)return;
  const geometry=new PlaneGeometry(.86,.86).rotateX(-Math.PI/2),material=new MeshBasicMaterial({transparent:true,opacity:.45,depthWrite:false,depthTest:false});
  overlay=new InstancedMesh(geometry,material,(2*RADIUS+1)**2);// Drawn over models (no depth test): markers under trees, rocks and slimes stay visible.
  overlay.frustumCulled=false;overlay.renderOrder=999;overlay.count=0;api.scene.add(overlay);overlayClock=0;
 }
 const matrix=new Matrix4();
 function drawOverlay(){
  const p=api.tile();let n=0;
  for(let z=p.z-RADIUS;z<=p.z+RADIUS;z++)for(let x=p.x-RADIUS;x<=p.x+RADIUS;x++){
   const t=at(x,z);if(!t)continue;
   const color=t.blocked&&!t.water?SOLID:api.characterAt(t)?OCCUPIED:null;if(!color)continue;
   matrix.makeTranslation(t.x-6,t.h+.04,t.z-6);overlay.setMatrixAt(n,matrix);overlay.setColorAt(n,color);n++;
  }
  overlay.count=n;overlay.instanceMatrix.needsUpdate=true;if(overlay.instanceColor)overlay.instanceColor.needsUpdate=true;
 }
 return {clear,setOverlay,get overlay(){return !!overlay;},
  update(dt,time){
   if(root)root.visible=api.world.get(key(anchor.x,anchor.z))===anchor;
   for(const s of slimes)s.update(dt,time);
   if(overlay&&(overlayClock-=dt)<=0){overlayClock=.1;drawOverlay();}
  },
  run(action){
   if(action==='crowd')return spawnCrowd();
   if(action==='walk-crowd')return walk(crowdBeyond,'crowd');
   if(action==='golem')return spawnGolem();
   if(action==='walk-golem')return walk(golemBeyond,'golem');
   if(action==='remove'){clear();return 'Removed the walk-through fixtures.';}
   return 'Unknown action.';
  }};
}
