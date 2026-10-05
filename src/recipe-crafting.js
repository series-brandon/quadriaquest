import {RECIPES,canMake,finishRecipe,durationFor} from './recipes.js';
import {awardSkillXp} from './skills.js';

// Inventory crafting never depends on which map owns the player.
export function createRecipeCrafting(api){
 let action=null;
 return {
  get working(){return !!action;},cancel(){action=null;},
  start(id){const recipe=RECIPES[id];if(!recipe||recipe.station||!canMake(api.inventory,recipe)||api.busy())return false;
   api.stop();action={id,age:0,duration:durationFor(recipe.duration,api.skill.level)};api.started?.();return true;
  },
  update(dt){if(!action)return null;const current=action;current.age+=dt;
   if(current.age>=current.duration){action=null;const changes=finishRecipe(api.inventory,current.id);if(changes)api.completed(current.id,changes,awardSkillXp(api.skill,'Crafting'));else api.cancelled?.();}
   return {kind:'Crafting',time:current.age};
  }
 };
}
