export const ITEMS={
 sticks:{name:'Sticks',icon:'╱',description:'A small handful of fallen sticks. Useful for crafting simple tools.'},
 stones:{name:'Rocks',icon:'◆',description:'A handful of moderately sized rocks. Useful for crafting simple tools.'},
 pickaxes:{name:'Crude Pickaxe',icon:'⛏',description:'A simple pickaxe for mining boulders. Keep it in your inventory to use it.'},
 stone:{name:'Stone',icon:'⬟',description:'A larger piece of mined stone, useful for making stone equipment.'},
 axes:{name:'Crude Axe',icon:'⚒',description:'A simple axe for chopping trees. Keep it in your inventory to use it.'},
 logs:{name:'Small Logs',icon:'▰',description:'Freshly chopped wood. A useful crafting material.'},
 hats:{name:'Top Hat',icon:'🎩',description:'A rather fancy reward for a well-practiced adventurer. Use the hat button to wear it.'}
};

export function itemStack(id,quantity){return `${ITEMS[id]?.name||id} ×${quantity}`;}
