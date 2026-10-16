// Tool tiers (docs/DESIGN.md, Skill tiers and pacing). A family of tools does one kind of work; each tier
// needs a level in the family's skill and multiplies work speed on top of the level bonus
// (skill-pacing.js). The best tier the player owns and may use does the work. Lowest tier first; the
// Crude tier is always craftable from sticks and rocks.
import {itemName} from './items.js';
export const TOOL_TIERS={
 axe:{skill:'Lumberjack',tiers:[{item:'crudeAxe',level:1,speed:1}]},
 pickaxe:{skill:'Mining',tiers:[{item:'pickaxes',level:1,speed:1}]},
};
export function baseTool(family){return TOOL_TIERS[family].tiers[0].item;}
export function ownsTool(family,inventory){return TOOL_TIERS[family].tiers.some(t=>inventory[t.item]>0);}
export function bestTool(family,inventory,level){
 let best=null;for(const t of TOOL_TIERS[family].tiers)if(inventory[t.item]>0&&level>=t.level&&(!best||t.speed>best.speed))best=t;
 return best;
}
// Why the player can't work with this family right now, or null when a usable tool is in the inventory.
export function toolBlocker(family,inventory,level){
 if(bestTool(family,inventory,level))return null;
 const owned=TOOL_TIERS[family].tiers.filter(t=>inventory[t.item]>0).sort((a,b)=>a.level-b.level)[0];
 return owned?`You need ${TOOL_TIERS[family].skill} level ${owned.level} to use the ${itemName(owned.item)}.`:'Missing the required tool!';
}
