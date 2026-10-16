import {ITEM_GROUPS,countOf} from './items.js';
import {actionXp,workDuration} from './skill-pacing.js';

// `cost` (used up) and `tools` (kept) map item ids, or ingredient groups (items.js ITEM_GROUPS such as
// anyWood), to counts. `level` is the skill level a recipe needs (default 1); it also sets its XP pace.
export const RECIPES={
 copperIngots:{name:'Copper Ingot',cost:{copperOre:1},duration:3,station:'furnace',skill:'Smithing'},
 copperDagger:{name:'Copper Dagger',cost:{copperIngots:1},tools:{hammers:1},duration:3,station:'anvil',skill:'Smithing'},
 copperShield:{name:'Copper Shield',cost:{copperIngots:3},tools:{hammers:1},duration:4,station:'anvil',skill:'Smithing'},
 crudeAxe:{name:'Crude Axe',cost:{sticks:1,stones:1},duration:2},
 pickaxes:{name:'Crude Pickaxe',cost:{sticks:1,stones:1},duration:2},
 swords:{name:'Stone Sword',cost:{stone:2,sticks:1},duration:3},
 crudeShield:{name:'Crude Shield',cost:{sticks:2,stones:1},duration:3},
 hammers:{name:'Crude Hammer',cost:{sticks:1,stones:1},duration:2},
 rods:{name:'Crude Fishing Rod',cost:{sticks:2},duration:2},
 firestarters:{name:'Flint and Stone',cost:{flint:1,stone:1},duration:2},
 campfires:{name:'Campfire',cost:{anyWood:2},tools:{firestarters:1},duration:3},
 cookedFish:{name:'Cooked Pondfish',cost:{rawFish:1},duration:3,station:'fire'}
};
// What a recipe still needs from the inventory (ingredients and tools), as item or group ids.
const needs=recipe=>Object.entries({...recipe.cost,...recipe.tools});
export function missingFor(inventory,recipe){return needs(recipe).filter(([id,n])=>countOf(inventory,id)<n).map(([id])=>id);}
export function canMake(inventory,recipe){return needs(recipe).every(([id,n])=>countOf(inventory,id)>=n);}
// The concrete items a cost would use: a group spends its lowest tier first, mixing tiers if one runs short.
export function resolveCost(inventory,cost){
 const out={};
 for(const [id,n] of Object.entries(cost)){
  const group=ITEM_GROUPS[id];if(!group){out[id]=(out[id]||0)+n;continue;}
  let left=n;for(const item of group.items){if(!left)break;const take=Math.min(left,(inventory[item]||0)-(out[item]||0));if(take>0){out[item]=(out[item]||0)+take;left-=take;}}
  if(left)return null;
 }
 return out;
}
// Removes a cost from the inventory; returns the changes ({item: -n}), or null if it can't be paid.
export function spendCost(inventory,cost){
 const items=resolveCost(inventory,cost);if(!items||Object.entries(items).some(([id,n])=>(inventory[id]||0)<n))return null;
 const changes={};for(const [id,n] of Object.entries(items)){inventory[id]-=n;changes[id]=-n;}return changes;
}
export function finishRecipe(inventory,output){const r=RECIPES[output];if(!r||!canMake(inventory,r))return null;const changes={[output]:1,...spendCost(inventory,r.cost)};inventory[output]=(inventory[output]||0)+1;return changes;}
// Shared pacing (skill-pacing.js): levels above the requirement speed work up, capped.
export function durationFor(seconds,level,requirement=1){return workDuration(seconds,{level,requirement});}
export function recipeDuration(recipe,level){return durationFor(recipe.duration,level,recipe.level);}
export function recipeXp(recipe){return actionXp(recipe.duration,recipe.level);}
