import {rollToolWork} from './resource-rules.js';
import {Vector3} from 'three';
import {addSkillXp,gatheringDuration,GATHER_EFFORT} from './skills.js';
import {actionXp,workDuration} from './skill-pacing.js';
import {treeOf,treeEffort} from './lumberjack.js';
import {bestTool,toolBlocker} from './tool-tiers.js';
import {animateResourceHit,animateResourceDepletion} from './resource-depletion.js';
import {blocksMovement,setWorldOccupancy} from './world-occupancy.js';

// `tool` is a tool family (tool-tiers.js); `effort` the nominal seconds of work, which also sets the XP
// (skill-pacing.js); `level` the skill level needed. A tree takes its item, level and effort from its
// species' tier (lumberjack.js).
export const RESOURCE_RULES={
 copper:{tool:'pickaxe',skill:'Mining',motion:'Mining',item:'copperOre',quantity:1,effort:4.5,level:1},
 tree:{tool:'axe',skill:'Lumberjack',motion:'Chopping'},
 boulder:{tool:'pickaxe',skill:'Mining',motion:'Mining',item:'stone',effort:4.5,level:1},
 sticks:{skill:'Gathering',motion:'Gathering',item:'sticks',effort:GATHER_EFFORT,level:1},
 stones:{skill:'Gathering',motion:'Gathering',item:'stones',effort:GATHER_EFFORT,level:1},
 flint:{skill:'Gathering',motion:'Gathering',item:'flint',effort:GATHER_EFFORT,level:1}
};
export function resourceRules(node){
 const base=RESOURCE_RULES[node.kind];if(!base||node.kind!=='tree')return base;
 const tree=treeOf(node.species);return {...base,item:tree.wood,level:tree.level,effort:treeEffort(node.species),name:tree.name};
}
// Why the player can't work this node right now (level, then tool), or null.
export function resourceBlocker(node,inventory,skills){
 const rules=resourceRules(node);if(!rules)return null;const level=skills[rules.skill]?.level??1;
 if(level<rules.level)return `You need ${rules.skill} level ${rules.level} to ${rules.motion==='Chopping'?'chop':'work'} ${rules.name?`the ${rules.name}`:'this'}.`;
 return rules.tool?toolBlocker(rules.tool,inventory,level):null;
}
// A node's XP for one reward, after its entity modifier (`xp: {scale, belowLevel}`; tutorial areas boost
// early levels this way, as Cinderhold's creatures do for combat).
export function resourceXp(node,rules,skill){
 const base=actionXp(rules.effort,rules.level),boost=node.xp;
 return boost&&skill.level<(boost.belowLevel??Infinity)?Math.round(base*(boost.scale??1)):base;
}
export function resourceDuration(rules,skills,inventory,roll){
 const level=skills[rules.skill].level;if(!rules.tool)return gatheringDuration(skills.Gathering);
 return workDuration(roll.duration,{level,requirement:rules.level,toolSpeed:bestTool(rules.tool,inventory,level)?.speed??1});
}
export function createResourceActions(api){
 const nodes=new Set(),depleting=new Map(),respawning=new Map();let action=null;
 const current=node=>api.world.get(`${node.x},${node.z}`)===node.tile;
 function cancel(){if(!action)return;action.node.group.rotation.z=0;action=null;api.cancelled?.();}
 function start(node){
  if(!nodes.has(node)||action?.node===node||node.depleted||!current(node)||!api.inReach(node)||api.busy?.())return false;
  const rules=resourceRules(node);if(!rules)return false;
  const blocked=resourceBlocker(node,api.inventory,api.skills);if(blocked){api.toast?.(blocked);return false;}
  api.stop();api.face(node.x,node.z);const roll=rules.tool?rollToolWork(rules.effort,api.random):null;
  const tool=rules.tool?bestTool(rules.tool,api.inventory,api.skills[rules.skill].level).item:null;
  action={node,rules,tool,age:0,duration:resourceDuration(rules,api.skills,api.inventory,roll),quantity:rules.quantity??roll?.quantity??1};
  api.started?.(node,rules);node.onStart?.();return true;
 }
 function reward(node,rules,quantity){
  // A solid resource leaves its remnant on a still-blocked tile; a ground item frees its tile.
  node.group.visible=false;node.showRemnant?.(true);if(!node.solid)setWorldOccupancy(node,false);
  api.inventory[rules.item]=(api.inventory[rules.item]||0)+quantity;
  const skill=api.skills[rules.skill],xp=addSkillXp(skill,resourceXp(node,rules,skill),rules.skill);
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
   if(remaining<=0&&(node.solid||!blocksMovement(node)||(!node.tile.blocked&&!api.reserved(node.tile))))reset(node);
  }
  if(!action)return null;const a=action,{node,rules}=a;
  if(node.depleted||!current(node)||!api.inReach(node)||(a.tool&&!(api.inventory[a.tool]>0))){cancel();return null;}
  a.age+=dt;api.interacting?.(rules.motion);if(rules.tool)animateResourceHit(node,a.age,a,api.sound);
  if(a.age>=a.duration){
   action=null;node.depleted=true;node.highlight?.update(false,0);api.completed?.();
   if(rules.tool){api.sound('fall');const at=api.tile(),direction=new Vector3(node.x-at.x,0,node.z-at.z).normalize();depleting.set(node,{...a,age:0,axis:new Vector3(direction.z,0,-direction.x)});node.showRemnant?.(true);}
   else reward(node,rules,a.quantity);
   return null;
  }
  return {kind:rules.motion,time:a.age,tool:a.tool};
 }
 function reset(node,{depleted=false}={}){if(action?.node===node)cancel();depleting.delete(node);respawning.delete(node);node.depleted=depleted;node.group.visible=!depleted;node.showRemnant?.(depleted);node.group.scale.setScalar(1);node.group.rotation.set(0,0,0);setWorldOccupancy(node,!depleted||!!node.solid);}
 function resetWhere(predicate=()=>true){for(const node of nodes)if(predicate(node))reset(node);}
 // Streaming (chunk-streamer.js): a node's state to keep while its chunk is unloaded, and putting it
 // back on reload. `busy` nodes (being worked or falling) must not be unloaded.
 function snapshot(node){return {depleted:!!node.depleted,respawnIn:respawning.get(node)??null,busy:action?.node===node||depleting.has(node)};}
 function restore(node,{depleted=false,respawnIn=null}={}){reset(node,{depleted});if(depleted&&respawnIn!==null)respawning.set(node,respawnIn);}
 return {snapshot,restore,remove(node){if(action?.node===node)cancel();depleting.delete(node);respawning.delete(node);nodes.delete(node);node.dispose?.();},add(node){nodes.add(node);return node;},start,cancel,update,reset,resetWhere,matches:node=>action?.node===node,blocker:node=>resourceBlocker(node,api.inventory,api.skills),get groundItems(){return [...nodes].filter(n=>RESOURCE_RULES[n.kind]&&!RESOURCE_RULES[n.kind].tool);},get working(){return !!action;},get state(){return action?{kind:action.rules.motion,age:action.age,duration:action.duration,tool:action.tool}:null;}};
}
