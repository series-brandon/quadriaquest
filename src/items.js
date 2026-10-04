export const ITEMS={
 swords:{name:'Stone Sword',description:'A sturdy stone blade. Equip it to deal 3–5 damage in melee combat.'},
 shields:{name:'Wooden Shield',description:'Equip it to reduce incoming damage by 1.'},
 hammers:{name:'Crude Hammer',description:'A reusable tool for carpentry and bridge repairs.'},
 rods:{name:'Crude Fishing Rod',description:'Keep this reusable rod in your inventory to fish.'},
 flint:{name:'Flint',description:'A sharp fragment found near water. Useful for starting fires.'},
 firestarters:{name:'Flint and Stone',description:'A reusable fire-starting tool. Required to craft a Campfire.'},
 campfires:{name:'Campfire',description:'Place on clear ground to cook fish. Can be packed up again.'},
 rawFish:{name:'Raw Pondfish',description:'A fresh catch. Cook it at a Campfire before eating.'},
 cookedFish:{name:'Cooked Pondfish',description:'A warm meal. Restores 10 health, up to your maximum.'},
 sticks:{name:'Sticks',icon:'╱',description:'A small handful of fallen sticks. Useful for crafting simple tools.'},
 stones:{name:'Rocks',icon:'◆',description:'A handful of moderately sized rocks. Useful for crafting simple tools.'},
 pickaxes:{name:'Crude Pickaxe',icon:'⛏',description:'A simple pickaxe for mining boulders. Keep it in your inventory to use it.'},
 stone:{name:'Stone',icon:'⬟',description:'A larger piece of mined stone, useful for making stone equipment.'},
 axes:{name:'Crude Axe',icon:'⚒',description:'A simple axe for chopping trees. Keep it in your inventory to use it.'},
 logs:{name:'Small Logs',icon:'▰',description:'Freshly chopped wood. A useful crafting material.'},
 hats:{name:'Top Hat',icon:'🎩',description:'A rather fancy reward for a well-practiced adventurer. Equip it here to wear it.'}
};

export function itemStack(id,quantity){return `${ITEMS[id]?.name||id} ×${quantity}`;}
