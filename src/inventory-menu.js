import {signal} from './reactive.js';
import {h,mount} from './ui/dom.js';
import {inventoryPage,inventoryView} from './ui/pages/inventory-page.js';

// Hosts the Inventory page (ui/pages/inventory-page.js) as a journal page. It follows the
// reactive inventory and the item systems' revisions, so it needs no refresh calls.
// Tutorials may `guide` (highlight an item and optionally its action: guide({item:'cookedFish',
// action:'Eat'}); the page shows the way back from another item) and `lock` (closing disabled).
// `true` is the Sticks lesson, which starts from a fresh view. A search is cleared so the item shows.
export function createInventoryMenu({host,inventory,actions,settings,isEquipped,track,onSelect}){
 const guided=signal(null),locked=signal(false),view=inventoryView();
 const panel=mount(()=>h('section',{id:'inventory-panel','aria-label':'Inventory',hidden:true},
  inventoryPage({inventory,actions,settings,isEquipped,track,onSelect,guide:guided,view}))).node;
 host.append(panel);
 return {panel,locked,
  guide(value){if(value===true)view.reset();else if(value)view.query.value='';guided.value=value===true?{item:'sticks'}:value||null;},
  lock(value){locked.value=!!value;}};
}
