import {RESOURCE_RULES,rollToolWork} from './resource-rules.js';
import {rollDrops} from './drops.js';
import {Vector3} from 'three';
import {addSkillXp,gatheringDuration} from './skills.js';
import {actionXp,workDuration,boostedYield} from './skill-pacing.js';
import {treeOf,treeEffort} from './lumberjack.js';
import {bestTool,toolBlocker} from './tool-tiers.js';
import {animateResourceHit,animateResourceDepletion} from './resource-depletion.js';
import {blocksMovement,setWorldOccupancy} from './world-occupancy.js';

export {RESOURCE_RULES};
// A node's rules: its type (RESOURCE_RULES, and a tree's tier), then its own placement's overrides
// (node.config: xp, drops; respawn lives on the node). See resource-rules.js.
export function resourceRules(node){
 const base=RESOURCE_RULES[node.kind];if(!base)return base;
 const tree=node.kind==='tree'?treeOf(node.species):null;
 const type=tree?{...base,level:tree.level,effort:treeEffort(node.species),name:tree.name,respawn:tree.respawn,drops:tree.drops,
  ...tree.xp!==undefined?{xp:tree.xp}:{}}:base;
 return node.config?{...type,...node.config}:type;
}
// Why the player can't work this node right now (level, then tool), or null.
export function resourceBlocker(node,inventory,skills){
 const rules=resourceRules(node);if(!rules)return null;const level=skills[rules.skill]?.level??1;
 if(level<rules.level)return `You need ${rules.skill} level ${rules.level} to ${rules.motion==='Chopping'?'chop':'work'} ${rules.name?`the ${rules.name}`:'this'}.`;
 return rules.tool?toolBlocker(rules.tool,inventory,level):null;
}
// A node's XP for one reward: its configured `xp`, else the effort pace; then its entity modifier
// (`xpBoost: {scale, belowLevel}`, like Cinderhold's creature boost; no resource uses one now).
export function resourceXp(node,rules,skill){
 const base=rules.xp??actionXp(rules.effort,rules.level),boost=node.xpBoost;
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
  action={node,rules,tool,age:0,duration:resourceDuration(rules,api.skills,api.inventory,roll)};
  api.started?.(node,rules);node.onStart?.();return true;
 }
 function reward(node,rules){
  // A solid resource leaves its remnant on a still-blocked tile; a ground item frees its tile.
  node.group.visible=false;node.showRemnant?.(true);if(!node.solid)setWorldOccupancy(node,false);
  // Its drop table (the type's, or this placement's); levels above the requirement raise tool work's sure
  // drops, as they raise its speed (skill-pacing.js).
  const level=api.skills[rules.skill].level,boost=rules.tool?n=>boostedYield(n,level,rules.level,api.random):null;
  const changes=rollDrops(rules.drops,api.random,{boost});
  for(const [id,n] of Object.entries(changes))api.inventory[id]=(api.inventory[id]||0)+n;
  const skill=api.skills[rules.skill],xp=addSkillXp(skill,resourceXp(node,rules,skill),rules.skill);
  if(node.respawn!==null)respawning.set(node,node.respawn);
  api.rewarded?.(node,changes,xp);node.onReward?.(changes,xp);
 }
 function update(dt){
  const waiting=[...respawning];
  // Finish committed depletion before starting new work. Off-map entities retain state.
  for(const [node,fall] of [...depleting])if(current(node)){
   fall.age+=dt;if(animateResourceDepletion(node,fall.age,fall.axis)){depleting.delete(node);reward(node,fall.rules);}
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
   else reward(node,rules);
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
