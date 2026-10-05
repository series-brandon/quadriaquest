import {rollToolWork} from './resource-rules.js';
import {Vector3} from 'three';
import {awardSkillXp,gatheringDuration} from './skills.js';
import {durationFor} from './recipes.js';
import {animateResourceHit,animateResourceDepletion} from './resource-depletion.js';
import {blocksMovement,setWorldOccupancy} from './world-occupancy.js';

export const RESOURCE_RULES={
 copper:{tool:'pickaxes',skill:'Mining',motion:'Mining',item:'copperOre',quantity:1},
 tree:{tool:'axes',skill:'Lumberjack',motion:'Chopping',item:'logs'},
 boulder:{tool:'pickaxes',skill:'Mining',motion:'Mining',item:'stone'},
 sticks:{skill:'Gathering',motion:'Gathering',item:'sticks'},
 stones:{skill:'Gathering',motion:'Gathering',item:'stones'},
 flint:{skill:'Gathering',motion:'Gathering',item:'flint'}
};
export function createResourceActions(api){
 const nodes=new Set(),depleting=new Map(),respawning=new Map();let action=null;
 const current=node=>api.world.get(`${node.x},${node.z}`)===node.tile;
 function cancel(){if(!action)return;action.node.group.rotation.z=0;action=null;api.cancelled?.();}
 function start(node){
  if(!nodes.has(node)||action?.node===node||node.depleted||!current(node)||!api.inReach(node)||api.busy?.())return false;
  const rules=RESOURCE_RULES[node.kind];if(!rules)return false;
  if(rules.tool&&!(api.inventory[rules.tool]>0)){api.toast?.('Missing the required tool!');return false;}
  api.stop();api.face(node.x,node.z);const roll=rules.tool?rollToolWork(api.random):null;
  action={node,rules,age:0,duration:rules.tool?durationFor(roll.duration,api.skills[rules.skill].level):gatheringDuration(api.skills.Gathering),quantity:rules.quantity??roll?.quantity??1};
  api.started?.(node,rules);node.onStart?.();return true;
 }
 function reward(node,rules,quantity){
  node.group.visible=false;setWorldOccupancy(node,false);
  api.inventory[rules.item]=(api.inventory[rules.item]||0)+quantity;
  const xp=awardSkillXp(api.skills[rules.skill],rules.skill);
  if(node.respawn!==null)respawning.set(node,node.respawn);
  api.rewarded?.(node,{[rules.item]:quantity},xp);node.onReward?.(quantity,xp);
 }
 function update(dt){
  const waiting=[...respawning];
  // Finish committed depletion before starting new work. Off-map entities retain state.
  for(const [node,fall] of [...depleting])if(current(node)){
   fall.age+=dt;if(animateResourceDepletion(node,fall.age,fall.axis)){depleting.delete(node);reward(node,fall.rules,fall.quantity);}
  }
  for(const [node,left] of waiting)if(current(node)){
   const remaining=left-dt;respawning.set(node,remaining);
   if(remaining<=0&&(!blocksMovement(node)||(!node.tile.blocked&&!api.reserved(node.tile))))reset(node);
  }
  if(!action)return null;const a=action,{node,rules}=a;
  if(node.depleted||!current(node)||!api.inReach(node)||(rules.tool&&!(api.inventory[rules.tool]>0))){cancel();return null;}
  a.age+=dt;api.interacting?.(rules.motion);if(rules.tool)animateResourceHit(node,a.age,a,api.sound);
  if(a.age>=a.duration){
   action=null;node.depleted=true;node.highlight?.update(false,0);api.completed?.();
   if(rules.tool){api.sound('fall');const at=api.tile(),direction=new Vector3(node.x-at.x,0,node.z-at.z).normalize();depleting.set(node,{...a,age:0,axis:new Vector3(direction.z,0,-direction.x)});}
   else reward(node,rules,a.quantity);
   return null;
  }
  return {kind:rules.motion,time:a.age};
 }
 function reset(node,{depleted=false}={}){if(action?.node===node)cancel();depleting.delete(node);respawning.delete(node);node.depleted=depleted;node.group.visible=!depleted;node.group.scale.setScalar(1);node.group.rotation.set(0,0,0);setWorldOccupancy(node,!depleted);}
 function resetWhere(predicate=()=>true){for(const node of nodes)if(predicate(node))reset(node);}
 return {remove(node){if(action?.node===node)cancel();depleting.delete(node);respawning.delete(node);nodes.delete(node);node.dispose?.();},add(node){nodes.add(node);return node;},start,cancel,update,reset,resetWhere,matches:node=>action?.node===node,get working(){return !!action;},get state(){return action?{kind:action.rules.motion,age:action.age,duration:action.duration}:null;}};
}
