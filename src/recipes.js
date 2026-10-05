export const RECIPES={
 axes:{name:'Crude Axe',cost:{sticks:1,stones:1},duration:2},
 pickaxes:{name:'Crude Pickaxe',cost:{sticks:1,stones:1},duration:2},
 swords:{name:'Stone Sword',cost:{stone:2,sticks:1},duration:3},
 shields:{name:'Wooden Shield',cost:{logs:2,sticks:1},duration:3},
 hammers:{name:'Crude Hammer',cost:{sticks:1,stones:1},duration:2},
 rods:{name:'Crude Fishing Rod',cost:{sticks:2},duration:2},
 firestarters:{name:'Flint and Stone',cost:{flint:1,stone:1},duration:2},
 campfires:{name:'Campfire',cost:{logs:2},tools:{firestarters:1},duration:3},
 cookedFish:{name:'Cooked Pondfish',cost:{rawFish:1},duration:3,station:'fire'}
};
export function canMake(inventory,recipe){return Object.entries({...recipe.cost,...recipe.tools}).every(([id,n])=>(inventory[id]||0)>=n);}
export function finishRecipe(inventory,output){const r=RECIPES[output];if(!r||!canMake(inventory,r))return null;const changes={[output]:1};for(const [id,n] of Object.entries(r.cost)){inventory[id]-=n;changes[id]=-n;}inventory[output]=(inventory[output]||0)+1;return changes;}
export function durationFor(seconds,level){return seconds/(1+.04*Math.max(0,level-1));}
