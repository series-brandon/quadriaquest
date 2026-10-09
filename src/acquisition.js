import {RECIPES,missingFor} from './recipes.js';
import {RESOURCE_RULES} from './resource-actions.js';
import {ITEMS} from './items.js';

// What a player should do next to obtain items, from the shared recipes and resource rules, so
// guidance in any area teaches the real path: gather ground items, chop or mine with the right
// tool (crafting that tool first), then craft. Areas supply the goal; the steps are shared.
//   nextStep(inventory, [[item, count], ...]) → the first unmet need's step, or null when all are met
//   steps: {step:'gather', kinds, items, have, count, for}   pick up ground items (one or more kinds)
//          {step:'harvest', kind, item, have, count, for}    chop/mine a node with its tool in hand
//          {step:'craft', item, for}                         everything is in hand; craft it
//   `for` is the item the step works toward (null for a goal's own need).
const SOURCES=Object.fromEntries(Object.entries(RESOURCE_RULES).map(([kind,rule])=>[rule.item,{kind,...rule}]));

function plan(inventory,item,count,parent,seen){
 const have=inventory[item]||0;
 if(have>=count||seen.has(item))return null;
 const recipe=RECIPES[item];
 if(recipe&&!recipe.station){
  // Tools first (Flint and Stone before the Campfire it lights), then ingredients.
  const needs={...recipe.cost,...recipe.tools},missing=missingFor(inventory,recipe).sort((a,b)=>(b in (recipe.tools??{}))-(a in (recipe.tools??{}))),steps=missing.map(id=>plan(inventory,id,needs[id],item,new Set([...seen,item]))).filter(Boolean);
  if(!steps.length)return {step:'craft',item,for:parent};
  // Ground items for the same recipe are picked up together (Sticks and Rocks).
  const gathers=steps.filter(s=>s.step==='gather'&&s.for===item);
  if(gathers.length===steps.length&&gathers.length>1)return {step:'gather',kinds:gathers.flatMap(s=>s.kinds),items:gathers.flatMap(s=>s.items),have:null,count:null,for:item};
  return steps[0];
 }
 const source=SOURCES[item];
 if(!source)return null;
 if(source.tool&&!(inventory[source.tool]>0))return plan(inventory,source.tool,1,item,new Set([...seen,item]));
 return source.tool?{step:'harvest',kind:source.kind,item,have,count,for:parent}:{step:'gather',kinds:[source.kind],items:[item],have,count,for:parent};
}
export function nextStep(inventory,needs){
 for(const [item,count] of needs){const step=plan(inventory,item,count,null,new Set());if(step)return step;}
 return null;
}
// A step's identity without progress inside it (how many so far), so guidance can keep its
// highlights while the player works through one step.
export function stepKey(step){if(!step)return 'null';const {have,...rest}=step;return JSON.stringify(rest);}

// Plain-language tips for a step. `purpose` finishes a sentence about the goal's own needs
// ("to repair the bridge"); `shown` says the targets are highlighted.
const name=id=>ITEMS[id]?.name??id;
const list=ids=>ids.map(name).join(' and ');
const article=text=>(/^[aeiou]/i.test(text)?'an ':'a ')+text;
const HARVEST={tree:['Chop some wood','Chop','trees'],boulder:['Mine some stone','Mine','boulders'],copper:['Mine some ore','Mine','copper rocks']};
export function describeStep(step,{purpose='',shown=false}={}){
 const why=!step.for?purpose:RECIPES[step.for]?`to make ${article(name(step.for))}`:`to get ${name(step.for)}`;
 const tail=text=>(why?`${text} ${why}`:text);
 if(step.step==='gather'){
  const count=step.count>1?` (${step.have} of ${step.count})`:'';
  return {title:'Gather materials',text:`${tail(`Pick up ${list(step.items)}`)}.${count}${shown?' They\'re highlighted on the ground.':''}`};
 }
 if(step.step==='harvest'){
  const [title,verb,nodes]=HARVEST[step.kind]??['Gather resources','Harvest',step.kind];
  return {title,text:`${tail(`You need ${name(step.item)} ×${step.count}`)}. ${verb} ${shown?'the highlighted ':''}${nodes} for ${step.count>1?'them':'it'}. You have ${step.have}.`};
 }
 return {title:`Craft ${article(name(step.item))}`,text:`${tail(`You need ${article(name(step.item))}`)}. Open the Crafting tab, choose the ${name(step.item)}, then craft it.`};
}
