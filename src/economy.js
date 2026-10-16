import {ITEMS} from './items.js';
import {signal} from './reactive.js';

// Gold Pieces and selling (docs/ECONOMY.md). Gold is an inventory stack (`gold`); every change goes
// through a wallet's earn/spend so notices, quests and jobs can watch one event. Selling pays
// SELL_RATE of an item's value, at least 1: the gap stops buying and reselling from making money.
// A later Merchanting skill would raise the rate per player.
export const GOLD='gold';
export const SELL_RATE=.4;
export const itemValue=id=>ITEMS[id]?.value||0;
export const sellPrice=(id,rate=SELL_RATE)=>itemValue(id)?Math.max(1,Math.floor(itemValue(id)*rate)):0;
// "1,250 GP": the short form for tight spaces.
export const formatGold=n=>`${Math.floor(n).toLocaleString('en-US')} GP`;
// Tools you need for a skill: selling your last one asks first.
export const NEEDED_TOOLS={crudeAxe:'chop trees',pickaxes:'mine',hammers:'build and smith',rods:'fish',firestarters:'make campfires'};

// The wallet: gold in the inventory, changed only here. `last` is the latest change ({amount, source}),
// a signal anything can watch; listeners also get each change as it happens.
export function createWallet({inventory}){
 const last=signal(null),listeners=new Set();
 const report=(amount,source)=>{const change={amount,source};last.value=change;for(const fn of listeners)fn(change);};
 return {
  get gold(){return inventory[GOLD]||0;},
  last,
  onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  earn(n,source='earned'){n=Math.floor(n);if(!(n>0))return false;inventory[GOLD]=(inventory[GOLD]||0)+n;report(n,source);return true;},
  // Refuses to go below zero.
  spend(n,reason='spent'){n=Math.floor(n);if(!(n>0)||(inventory[GOLD]||0)<n)return false;inventory[GOLD]-=n;report(-n,reason);return true;},
  set(n,source='set'){const before=inventory[GOLD]||0,after=Math.max(0,Math.floor(n));inventory[GOLD]=after;if(after!==before)report(after-before,source);},
 };
}
