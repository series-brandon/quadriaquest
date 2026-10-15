// Things lifted in the world editor's hand (docs/TOWN.md, Sims-style editor): a lifted building, prop, stair,
// piece of furniture, resource, cover, spawn, townsfolk or the crystal stays in the map's data (so indices and
// undo hold) but the builders leave it out until it's put down, as in the Sims. Only the playground marks
// anything; in the game nothing is ever held.
const held=new WeakSet();
export const isHeld=entry=>!!entry&&typeof entry==='object'&&held.has(entry);
export function setHeld(entry,on){if(!entry||typeof entry!=='object')return;if(on)held.add(entry);else held.delete(entry);}
export const notHeld=list=>(list||[]).filter(e=>!held.has(e));
