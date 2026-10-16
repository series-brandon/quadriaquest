import {RECIPES,canMake,finishRecipe,recipeDuration,recipeXp} from './recipes.js';
import {createSkill,addSkillXp} from './skills.js';
export function createStationCrafting(api){
 const skill=createSkill();let action=null;
 function cancel(){if(!action)return;action=null;api.cancelled?.();}
 function start(id,station){const recipe=RECIPES[id];if(action||!recipe||!['furnace','anvil'].includes(recipe.station)||recipe.station!==station?.kind||!station.available()||!api.inReach(station)||!canMake(api.inventory,recipe)||api.busy?.())return false;
  api.stop();action={id,station,age:0,duration:recipeDuration(recipe,skill.level)};api.started?.(station);return true;
 }
 return {skill,start,cancel,get working(){return !!action;},get state(){return action&&{id:action.id,age:action.age,duration:action.duration};},update(dt){
  if(!action)return null;const a=action;
  if(!a.station.available()||!api.inReach(a.station)||!canMake(api.inventory,RECIPES[a.id])){cancel();return null;}
  a.age+=dt;const motion={kind:a.station.kind==='anvil'?'Smithing':'Smelting',time:a.age};
  if(a.age>=a.duration){action=null;const changes=finishRecipe(api.inventory,a.id);if(changes)api.completed?.(a.id,changes,addSkillXp(skill,recipeXp(RECIPES[a.id]),'Smithing'));}
  return motion;
 }};
}
