export const ITEMS={
 gold:{name:'Gold Pieces',description:'The coin of Quadria. Earn it by selling what you gather and make; spend it at shops.'},
 copperOre:{name:'Copper Ore',description:'Orange-veined ore. Smelt it into a Copper Ingot at a furnace.'},
 copperIngots:{name:'Copper Ingot',description:'Refined copper. Work it at an anvil with a Crude Hammer.'},
 copperDagger:{name:'Copper Dagger',description:'A copper blade you can smith yourself. One hand · +10 melee Power and Accuracy · stab or slash · trains Dagger proficiency.'},
 copperShield:{name:'Copper Shield',description:'One hand · +50 resistance (5% less damage) · trains Shield proficiency when hit or blocking. Cannot be held with a bow.'},
 bows:{name:'Training Bow',description:'Two hands · +10 ranged Power and Accuracy · range 6 tiles. Uses one Training Arrow per shot, including misses.'},
 arrows:{name:'Training Arrows',description:'Ammunition for the Training Bow. Fletch offers more when you run out.'},
 swords:{name:'Stone Sword',description:'A sturdy stone blade. One hand · +6 melee Power and Accuracy · trains Sword proficiency.'},
 crudeShield:{name:'Crude Shield',description:'Sticks lashed around a rock boss. One hand · +30 resistance (3% less damage) · trains Shield proficiency when hit or blocking.'},
 hammers:{name:'Crude Hammer',description:'A reusable tool for carpentry and bridge repairs.'},
 rods:{name:'Crude Fishing Rod',description:'Keep this reusable rod in your inventory to fish.'},
 flint:{name:'Flint',description:'A sharp fragment found near water. Useful for starting fires.'},
 firestarters:{name:'Flint and Stone',description:'A reusable fire-starting tool. Required to craft a Campfire.'},
 campfires:{name:'Campfire',description:'Place on clear ground to cook fish. Can be packed up again.'},
 rawFish:{name:'Raw Pondfish',description:'A fresh catch. Cook it at a Campfire before eating.'},
 cookedFish:{name:'Cooked Pondfish',description:'A warm meal. Restores 20 health, up to your maximum.'},
 sticks:{name:'Sticks',icon:'╱',description:'A small handful of fallen sticks. Useful for crafting simple tools.'},
 stones:{name:'Rocks',icon:'◆',description:'A handful of moderately sized rocks. Useful for crafting simple tools.'},
 pickaxes:{name:'Crude Pickaxe',icon:'⛏',description:'A simple pickaxe for mining boulders. Keep it in your inventory to use it.'},
 stone:{name:'Stone',icon:'⬟',description:'A larger piece of mined stone, useful for making stone equipment.'},
 crudeAxe:{name:'Crude Axe',icon:'⚒',description:'A simple axe for chopping trees. Keep it in your inventory to use it.'},
 // Wood pieces, one per tree tier (src/data/trees.json drops them), lowest tier first.
 poplarWood:{name:'Poplar Wood Pieces',icon:'▰',description:'Light, pale wood from a Poplar Tree. The everyday crafting wood.'},
 aslaWood:{name:'Asla Wood Pieces',icon:'▰',description:'Feather-light wood from an Asla Tree. Soft and easy to shape.'},
 pineWood:{name:'Pine Wood Pieces',icon:'▰',description:'Resinous wood from a Pine Tree. Cheap and plentiful.'},
 oakWood:{name:'Oak Wood Pieces',icon:'▰',description:'Strong, dependable wood from an Oak Tree.'},
 willowWood:{name:'Willow Wood Pieces',icon:'▰',description:'Supple wood from a Willow Tree. It bends before it breaks.'},
 mapleWood:{name:'Maple Wood Pieces',icon:'▰',description:'Hard, fine-grained wood from a Maple Tree.'},
 walnutWood:{name:'Walnut Wood Pieces',icon:'▰',description:'Dark, handsome wood from a Walnut Tree.'},
 ironwood:{name:'Ironwood Pieces',icon:'▰',description:'Wood from an Ironwood Tree, heavy as stone.'},
 mungilWood:{name:'Mungil Wood Pieces',icon:'▰',description:'Oily, very dense wood from a Mungil Tree. It sinks in water.'},
 cherryWood:{name:'Cherry Wood Pieces',icon:'▰',description:'Rosy wood from a Cherry Blossom Tree. Prized by fine crafters.'},
 hats:{name:'Top Hat',icon:'🎩',description:'A rather fancy reward for a hard-working adventurer. Equip it here to wear it.'},
 staffs:{name:'Simple Staff',description:'A wooden staff topped with a glowing crystal. Spell focus: +6 magic Power and Accuracy to your spells while held. One hand · +5 melee Power and Accuracy · bludgeoning swing · trains Staff proficiency.'},
 ironSkullcap:{name:'Iron Skullcap',description:"Sergeant Bristle's brimless iron cap, with a raised ridge and cheek guards. Equip it to wear it."},
 minersCap:{name:"Miner's Cap",description:"Borin's sturdy cap, with a little lamp at the front. Equip it to wear it."},
 archerCap:{name:"Archer's Cap",description:"Fletch's feathered felt cap: peak in front, brim turned up behind. Equip it to wear it."},
 wizardHat:{name:'Wizard Hat',description:"Wisp's tall hat with a curled tip, gold band and stars. Equip it to wear it."},
 breathHeadband:{name:'Breath Headband',description:"Ember's cloth headband, with a ring of calm breath floating above. Equip it to wear it."},
 fishersHat:{name:"Fisher's Hat",description:"Reed's wide-brimmed straw hat, for long days by the water. Equip it to wear it."},
 package:{name:'Package',description:'A parcel for someone in town. Deliver it by talking to them.'},
 companionHats:{name:'Companion Top Hat',description:'A tiny, very dapper top hat with a flower on the band. Put it on your companion here.'}
};

// Ingredient groups: a recipe may ask for any member (recipes.js spends the lowest tier first).
// Every wood, lowest tier first (any-wood recipes spend in this order).
export const WOODS=['poplarWood','aslaWood','pineWood','oakWood','willowWood','mapleWood','walnutWood','ironwood','mungilWood','cherryWood'];
export const ITEM_GROUPS={anyWood:{name:'Wood Pieces',hint:'Any kind; the lowest tier is used first',items:WOODS}};
export function itemName(id){return ITEMS[id]?.name??ITEM_GROUPS[id]?.name??id;}
// How many of an item, or of all of a group's members, the inventory holds.
export function countOf(inventory,id){const group=ITEM_GROUPS[id];return group?group.items.reduce((n,item)=>n+(inventory[item]||0),0):inventory[id]||0;}

export function itemStack(id,quantity){return `${itemName(id)} ×${quantity}`;}

// What items are worth (docs/ECONOMY.md): `value` is the price at a shop that stocks it; selling pays a
// share of it (economy.js). `category` decides which shops buy it. Gold is the currency, not an item
// you can sell. Values follow the rules in ECONOMY.md: crafting is worth more than its materials, cooked
// food more than raw, tools and starter gear little, and nothing profits from buying and reselling
// (economy.test.js checks every item and recipe).
const WORTH={
 gold:[0,'currency'],copperOre:[10,'metal'],copperIngots:[24,'metal'],copperDagger:[40,'weapon'],copperShield:[80,'armour'],
 bows:[30,'weapon'],arrows:[2,'ammo'],swords:[20,'weapon'],crudeShield:[12,'armour'],hammers:[9,'tool'],rods:[9,'tool'],
 flint:[4,'stone'],firestarters:[15,'tool'],campfires:[15,'tool'],rawFish:[8,'fish'],cookedFish:[15,'food'],
 sticks:[2,'wood'],stones:[2,'stone'],pickaxes:[9,'tool'],stone:[6,'stone'],crudeAxe:[9,'tool'],
 poplarWood:[4,'wood'],aslaWood:[6,'wood'],pineWood:[8,'wood'],oakWood:[11,'wood'],willowWood:[15,'wood'],mapleWood:[20,'wood'],walnutWood:[26,'wood'],ironwood:[33,'wood'],mungilWood:[42,'wood'],cherryWood:[52,'wood'],
 hats:[60,'hat'],staffs:[45,'weapon'],ironSkullcap:[50,'hat'],minersCap:[40,'hat'],archerCap:[40,'hat'],wizardHat:[50,'hat'],
 breathHeadband:[40,'hat'],fishersHat:[40,'hat'],companionHats:[40,'hat'],package:[0,'quest'],
};
for(const [id,[value,category]] of Object.entries(WORTH))Object.assign(ITEMS[id],{value,category});
ITEMS.gold.sellable=false;ITEMS.package.sellable=false;
