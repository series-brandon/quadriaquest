import {makeLootPile} from './loot-pile-model.js';
import {highlightResource} from './resource-highlight.js';
import {GOLD} from './economy.js';

// Loot piles (docs/ECONOMY.md, Enemy drops): what a defeated enemy drops lands on the ground as one pile
// you click to pick up (the player always clicks; nothing picks it up for you). It belongs to whoever won
// the fight and disappears after LOOT_LIFETIME seconds if left alone. The same in every map.
export const LOOT_LIFETIME=180;
// pickUp(items, pile): the host adds the items (inventory, receipt); it returns false to refuse.
export function createLootPiles({pickables,pickUp,lifetime=LOOT_LIFETIME}){
 const piles=new Set();
 function remove(pile){if(!piles.delete(pile))return;pile.ready=false;pile.group.removeFromParent();
  for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.actor===pile)pickables.splice(i,1);}
 return {
  // A pile on a tile (under a parent: the area's group), holding these items.
  spawn({tile,parent,items,owner='player'}){
   if(!tile||!Object.values(items).some(n=>n>0))return null;
   const group=makeLootPile({gold:(items[GOLD]||0)>0});group.position.set(tile.x-6,tile.h,tile.z-6);group.rotation.y=(tile.x*7+tile.z*3)%6;parent.add(group);
   const pile={kind:'loot',loot:true,group,tile,x:tile.x,z:tile.z,items:{...items},owner,age:0,label:'Pick up loot',ready:true,opened:false,duration:0,
    available:()=>piles.has(pile),
    interact(){if(!piles.has(pile))return;if(pickUp(pile.items,pile)!==false)remove(pile);}};
   pile.highlight=highlightResource(group,{height:.6});
   group.traverse(m=>{if(m.isMesh){m.userData.actor=pile;m.userData.tile=tile;pickables.push(m);}});
   piles.add(pile);return pile;
  },
  update(dt,time,hover=null){for(const pile of [...piles]){pile.age+=dt;if(pile.age>=lifetime)remove(pile);else pile.highlight.update(false,time,hover===pile);}},
  remove,
  clear(){for(const pile of [...piles])remove(pile);},
  get piles(){return [...piles];},
 };
}
