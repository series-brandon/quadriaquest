import {mount} from './ui/dom.js';
import {itemFeed} from './ui/hud/notices.js';
import {ITEMS} from './items.js';

export function itemChangeMessage(changes){
  return Object.entries(changes).filter(([,delta])=>delta!==0).map(([item,delta])=>{
    const name=ITEMS[item]?.name||item;
    return `${delta>0?'+':'−'} ${name} ×${Math.abs(delta)}`;
  }).join(' · ');
}

// Item receipts (ui/hud/notices.js `itemFeed`), independent of movement errors and other messages.
export function createItemFeed(){
 let feed;const view=mount(()=>(feed=itemFeed()).node);document.body.append(view.node);
 return {show:changes=>feed.show(changes),clear:()=>feed.clear()};
}
