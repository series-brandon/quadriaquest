import ITEMS from './data/items.json' with {type:'json'};

// Items (docs/DESIGN.md, Resource and enemy configuration; docs/ECONOMY.md). Each item's shared configuration is
// data in src/data/items.json, edited in the world editor's Items tool (World group): `name`, `description`, `value` (the
// price at a shop that stocks it; selling pays a share of it, economy.js), `category` (which shops buy it) and
// `sellable: false` for gold (the currency) and quest items. Two optional blocks give an item its kind:
// `equipment` (slot, hands, stats and requirements; equipment.js reads it as GEAR) and `consume` (what using it
// does; player-health.js reads it as FOODS). Behaviour stays in code: icons (icons.js), combat formulas, motions,
// models and the ingredient groups below. Values follow the rules in ECONOMY.md:
// crafting is worth more than its materials, cooked food more than raw, tools and starter gear little, and
// nothing profits from buying and reselling (economy.test.js checks every item and recipe).
export {ITEMS};
export const ITEM_DATA_FIELDS=['name','description','value','category','sellable','equipment','consume'];
// The live table as the file holds it (the type tools save this); playground-only items are left out.
export const dataItems=()=>Object.entries(ITEMS).filter(([,item])=>!item.playground);
export function itemsData(){
 return Object.fromEntries(dataItems().map(([id,item])=>[id,Object.fromEntries(ITEM_DATA_FIELDS.filter(f=>item[f]!==undefined).map(f=>[f,item[f]]))]));
}

// Ingredient groups: a recipe may ask for any member (recipes.js spends the lowest tier first).
// Every wood, lowest tier first (any-wood recipes spend in this order).
export const WOODS=['poplarWood','aslaWood','pineWood','oakWood','willowWood','mapleWood','walnutWood','ironwood','mungilWood','cherryWood'];
export const ITEM_GROUPS={anyWood:{name:'Wood Pieces',hint:'Any kind; the lowest tier is used first',items:WOODS}};
export function itemName(id){return ITEMS[id]?.name??ITEM_GROUPS[id]?.name??id;}
// How many of an item, or of all of a group's members, the inventory holds.
export function countOf(inventory,id){const group=ITEM_GROUPS[id];return group?group.items.reduce((n,item)=>n+(inventory[item]||0),0):inventory[id]||0;}

export function itemStack(id,quantity){return `${itemName(id)} ×${quantity}`;}

