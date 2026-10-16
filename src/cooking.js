import {RECIPES,canMake,finishRecipe,recipeDuration,recipeXp} from './recipes.js';
import {createSkill,addSkillXp} from './skills.js';

// App-owned cooking. A world supplies a station adapter, never its own action loop.
export function createCookingSystem(api){
 const skill=createSkill();let action=null;
 function cancel(){action=null;}
 function start(id,station){
  const recipe=RECIPES[id];
  if(api.busy?.()||recipe?.station!=='fire'||!station?.available()||!canMake(api.inventory,recipe))return false;
  api.stop();action={id,station,age:0,duration:recipeDuration(recipe,skill.level)};
  api.started?.();return true;
 }
 function update(dt){
  if(!action)return null;
  const current=action;
  if(!current.station.available()){cancel();api.cancelled?.();return null;}
  current.age+=dt;
  const motion={kind:'Cooking',time:current.age};
  if(current.age>=current.duration){
   action=null;const changes=finishRecipe(api.inventory,current.id);
   if(changes){const reward=addSkillXp(skill,recipeXp(RECIPES[current.id]),'Culinary');api.completed?.(changes,reward);current.station.onCooked?.(current.id);}
   else api.cancelled?.();
  }
  return motion;
 }
 return {skill,start,update,cancel,get working(){return !!action;}};
}
