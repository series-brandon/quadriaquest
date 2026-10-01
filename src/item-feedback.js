import {ITEMS} from './items.js';

export function itemChangeMessage(changes){
  return Object.entries(changes).filter(([,delta])=>delta!==0).map(([item,delta])=>{
    const name=ITEMS[item]?.name||item;
    return `${delta>0?'+':'−'} ${name} ×${Math.abs(delta)}`;
  }).join(' · ');
}
