import {RECIPES,canMake,finishRecipe,durationFor} from './recipes.js';
import {awardSkillXp} from './skills.js';

// Inventory crafting never depends on which map owns the player.
export function createRecipeCrafting(api){
 let action=null;
 return {
  get working(){return !!action;},get state(){return action&&{...action};},cancel(){if(!action)return;const id=action.id;action=null;api.cancelled?.(id);},
  start(id){const recipe=RECIPES[id];if(action||!recipe||recipe.station||!canMake(api.inventory,recipe)||api.busy())return false;
   if(api.defer?.(()=>this.start(id),'Crafting'))return true;
   api.stop();action={id,age:0,duration:durationFor(recipe.duration,api.skill.level)};api.started?.(id);return true;
  },
  update(dt){if(!action)return null;const current=action;current.age+=dt;api.progressed?.(current.age,dt);
   if(current.age>=current.duration){action=null;const changes=finishRecipe(api.inventory,current.id);if(changes)api.completed(current.id,changes,awardSkillXp(api.skill,'Crafting'));else api.cancelled?.(current.id);}
   return {kind:'Crafting',time:current.age};
  }
 };
}
