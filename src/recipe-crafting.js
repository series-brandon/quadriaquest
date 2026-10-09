import {RECIPES,canMake,finishRecipe,durationFor} from './recipes.js';
import {awardSkillXp} from './skills.js';
import {signal} from './reactive.js';

// Inventory crafting never depends on which map owns the player.
export function createRecipeCrafting(api){
 // `active` (the recipe being crafted) is a signal so menus can show it without polling.
 let action=null;const active=signal(null);
 const set=next=>{action=next;active.value=next?.id??null;};
 return {
  get working(){return !!action;},get state(){return action&&{...action};},get activeId(){return active.value;},cancel(){if(!action)return;const id=action.id;set(null);api.cancelled?.(id);},
  start(id){const recipe=RECIPES[id];if(action||!recipe||recipe.station||!canMake(api.inventory,recipe)||api.busy())return false;
   if(api.defer?.(()=>this.start(id),'Crafting'))return true;
   api.stop();set({id,age:0,duration:durationFor(recipe.duration,api.skill.level)});api.started?.(id);return true;
  },
  update(dt){if(!action)return null;const current=action;current.age+=dt;api.progressed?.(current.age,dt);
   if(current.age>=current.duration){set(null);const changes=finishRecipe(api.inventory,current.id);if(changes)api.completed(current.id,changes,awardSkillXp(api.skill,'Crafting'));else api.cancelled?.(current.id);}
   return {kind:'Crafting',time:current.age};
  }
 };
}
