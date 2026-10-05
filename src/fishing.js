import {commitFishingCatch} from './fishing-action.js';
import {CAST_DURATION,CATCH_DURATION,catchSequence} from './catch-motion.js';
import {createGatheringSkill,awardSkillXp} from './skills.js';
import {durationFor} from './recipes.js';

export const PONDFISH={tool:'rods',item:'rawFish',quantity:1,wait:4};

// One app-owned action and skill. Spots supply availability, loot, and narrative observers.
export function createFishingSystem(api){
 const skill=createGatheringSkill();let action=null;
 function cancel(){if(!action)return;action=null;api.cancelled?.();}
 function start(spot){
  if(action?.target===spot)return false;
  if(!spot?.available()||api.busy?.()||!api.inReach(spot))return false;
  const loot=spot.loot||PONDFISH;
  if(!(api.inventory[loot.tool]>0)){api.toast?.('Missing the required tool!');return false;}
  api.stop();api.face(spot.x,spot.z);
  const catchAt=CAST_DURATION+durationFor(loot.wait,skill.level);
  action={kind:'Fishing',target:spot,age:0,catchAt,duration:catchAt+CATCH_DURATION,onCatch(){
   const changes={[loot.item]:loot.quantity};
   api.inventory[loot.item]=(api.inventory[loot.item]||0)+loot.quantity;
   const reward=awardSkillXp(skill,'Fishing');api.caught?.(changes,reward,spot);spot.onCatch?.();
  }};
  api.started?.(spot);spot.onStart?.();return true;
 }
 function update(dt){
  if(!action)return null;
  const current=action,spot=current.target;
  if(!spot.available()||!api.inReach(spot)||(!current.rewarded&&!(api.inventory[(spot.loot||PONDFISH).tool]>0))){cancel();return null;}
  current.age+=dt;commitFishingCatch(current);
  // An observer may cancel or replace the action when a catch advances a story.
  if(action!==current)return null;
  if(current.age>=current.duration){action=null;api.completed?.(spot);return null;}
  const motion=current.age<CAST_DURATION?{kind:'Fishing cast',time:current.age}:current.age>=current.catchAt?catchSequence(current.age-current.catchAt):{kind:'Fishing',time:current.age-CAST_DURATION};
  return {...motion,fishing:true,spot};
 }
 return {skill,start,update,cancel,matches:spot=>action?.target===spot,get working(){return !!action;},get state(){return action?{kind:'Fishing',age:action.age,catchAt:action.catchAt,rewarded:!!action.rewarded}:null;}};
}
