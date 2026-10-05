import {createGatheringSkill} from './skills.js';
import {canMake,durationFor} from './recipes.js';
export const BRIDGE_REPAIR={cost:{logs:3},tools:{hammers:1},duration:6,xp:40};

// Targets own placement and narrative; this controller owns the portable work action.
export function createCarpentrySystem(api){
 const skill=createGatheringSkill();let action=null;
 function cancel(){if(!action)return;const target=action.target;action=null;target.setProgress(0);api.cancelled?.();}
 function valid(target){return target.available()&&api.inReach(target);}
 function start(target){
  if(action?.target===target||api.busy?.()||!valid(target))return false;
  const recipe=target.recipe||BRIDGE_REPAIR;
  if(!canMake(api.inventory,recipe)){api.toast?.(recipe.requirements||'Requires a Crude Hammer and Small Logs ×3.');return false;}
  api.stop();api.face(target.x,target.z);action={target,recipe,age:0,duration:durationFor(recipe.duration,skill.level)};api.started?.();target.onStart?.();return true;
 }
 function update(dt){
  if(!action)return null;const a=action,t=a.target;
  if(!valid(t)||!canMake(api.inventory,a.recipe)){cancel();return null;}
  if(t.paused?.())return null;
  a.age+=dt;const progress=Math.min(1,a.age/a.duration);
  const stages=t.stages||3;t.setProgress(Math.floor(progress*stages)/stages);t.onProgress?.(progress);
  if(action!==a||t.paused?.())return null;
  if(progress===1){
   action=null;const changes={};for(const [id,n] of Object.entries(a.recipe.cost)){api.inventory[id]-=n;changes[id]=-n;}
   const old=skill.level;skill.xp+=a.recipe.xp;skill.level=1+Math.floor(skill.xp/120);
   t.complete();api.completed?.(changes,{skillName:'Carpentry',xp:a.recipe.xp,level:skill.level,leveledUp:skill.level>old});t.onComplete?.();return null;
  }
  return {kind:'Repairing',time:a.age};
 }
 return {skill,start,update,cancel,matches:t=>action?.target===t,get working(){return !!action;},get state(){return action?{age:action.age,duration:action.duration}:null;}};
}
