import {ITEMS,itemName} from './items.js';
import {GEAR} from './equipment.js';
import {TRACKS} from './character.js';
import {TOOL_TIERS} from './tool-tiers.js';
import {statResistancePct,requirementRatio,requirementEffectiveness} from './combat-formulas.js';
import {itemValue,sellPrice} from './economy.js';

// What an item is and does, as labelled rows for detail views (Inventory, shops, Crafting). Everything is
// read from the item's shared data (items.json `equipment` and `consume`, through GEAR) and the systems
// that use it (tool tiers, economy), so descriptions need not repeat numbers in prose.
const TRACK_NAME=Object.fromEntries(TRACKS.map(t=>[t.id,t.name]));
const title=s=>s[0].toUpperCase()+s.slice(1);
const CATEGORY={weapon:'Weapon',armour:'Armour',tool:'Tool',food:'Food',fish:'Fish',wood:'Wood',stone:'Stone',metal:'Metal',ammo:'Ammunition',hat:'Hat',quest:'Quest item',currency:'Currency'};
const TOOL_WORK={axe:'Chops trees',pickaxe:'Mines rocks'};
export const trackName=track=>TRACK_NAME[track]??track;

// One line: what kind of thing it is and where it goes ("Melee weapon · One hand", "Light armor · Head").
export function itemKind(id){
 const item=ITEMS[id],gear=GEAR[id];if(!item&&!gear)return '';
 const slot=gear?.slot==='hand'?(gear.twoHanded?'Two hands':'One hand'):gear?.slot?title(gear.slot):null;
 const kind=gear?.style?`${title(gear.style)} weapon`:gear?.shield?'Shield':gear?.armor?`${title(gear.armor.class)} armor`
  :gear?.cosmetic?'Tool':gear?.slot==='head'?'Hat':item?.consume?'Food':CATEGORY[item?.category]??'Item';
 return [kind,gear&&!gear.cosmetic?slot:null].filter(Boolean).join(' · ');
}

// Combat numbers as [{label, value}], in the order players compare them.
export function itemStats(id){
 const gear=GEAR[id];if(!gear||gear.cosmetic)return [];
 const rows=[],add=(label,value)=>rows.push({label,value});
 if(gear.power)add('Power',`+${gear.power}`);
 if(gear.accuracy)add('Accuracy',`+${gear.accuracy}`);
 if(gear.resistance)add('Resistance',`+${gear.resistance} (${statResistancePct(gear.resistance)}% less damage)`);
 if(gear.baseInterval)add('Attack speed',`Every ${gear.baseInterval} s`);
 if(gear.style)add('Range',`${gear.range??1} tile${(gear.range??1)===1?'':'s'}`);
 if(gear.damageTypes?.length)add('Damage',gear.damageTypes.map(title).join(', '));
 if(gear.ammo)add('Ammo',`${itemName(gear.ammo)}, one per shot`);
 if(gear.magic)add('Spell focus',`+${gear.magic.power} Power, +${gear.magic.accuracy} Accuracy`);
 const trains=gear.proficiency?[trackName(`prof.${gear.proficiency}`)]:gear.shield?[trackName('prof.shield')]
  :gear.armor?[trackName(`armor.${gear.armor.class}`),trackName(`prof.${gear.armor.slot}`)]:[];
 if(trains.length)add('Trains',`${trains.join(', ')}${gear.shield?' (when hit or blocking)':gear.armor?' (when hit)':''}`);
 return rows;
}

// Requirements as [{track, label, level, have, met}] plus how effective the item's bonuses are now
// (requirementEffectiveness: below a requirement, bonuses shrink). `levelOf(track)` gives the player's level;
// without it, `have` and `met` are null and effectiveness is 1.
export function itemRequirements(id,levelOf=null){
 const entries=Object.entries(GEAR[id]?.requirements??{});
 const rows=entries.map(([track,level])=>{const have=levelOf?levelOf(track):null;return {track,label:trackName(track),level,have,met:have==null?null:have>=level};});
 const effectiveness=levelOf&&entries.length?requirementEffectiveness(requirementRatio(entries.map(([track,level])=>[levelOf(track),level]))):1;
 return {rows,effectiveness};
}

// What using or keeping it does, as [{label, value}]: food effects and tool work.
export function itemUses(id){
 const uses=[];
 for(const e of ITEMS[id]?.consume?.effects??[])if(e.type==='restore')uses.push({label:'Eat',value:`Restores ${e.amount} ${title(e.resource)}, up to your maximum`});
 for(const [family,{skill,tiers}] of Object.entries(TOOL_TIERS)){
  const tier=tiers.find(t=>t.item===id);if(!tier)continue;
  uses.push({label:'Tool',value:`${TOOL_WORK[family]??title(family)} while in your inventory`},{label:'Needs',value:`${skill} ${tier.level}`});
  if(tier.speed!==1)uses.push({label:'Work speed',value:`×${tier.speed}`});
 }
 return uses;
}

// Price facts: the shop price, what one sells for, and whether it can be sold at all.
export function itemPrice(id){
 const item=ITEMS[id];
 if(item?.sellable===false)return {value:itemValue(id),each:0,sellable:false};
 return {value:itemValue(id),each:sellPrice(id),sellable:sellPrice(id)>0};
}
