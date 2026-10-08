import {signal} from './reactive.js';
import {h,mount} from './ui/dom.js';
import {inventoryPage,inventoryView} from './ui/pages/inventory-page.js';

// Hosts the Inventory page (ui/pages/inventory-page.js) as a journal page. It follows the
// reactive inventory and the item systems' revisions, so it needs no refresh calls.
// Tutorials may `guide` (reset the view, then highlight an item and optionally its action:
// guide({item:'cookedFish', action:'Eat'}); `true` means the Sticks lesson) and `lock` (closing disabled).
export function createInventoryMenu({host,inventory,actions,settings,isEquipped,track,onSelect}){
 const guided=signal(null),locked=signal(false),view=inventoryView();
 const panel=mount(()=>h('section',{id:'inventory-panel','aria-label':'Inventory',hidden:true},
  inventoryPage({inventory,actions,settings,isEquipped,track,onSelect,guide:guided,view}))).node;
 host.append(panel);
 return {panel,locked,
  guide(value){if(value)view.reset();guided.value=value===true?{item:'sticks'}:value||null;},
  lock(value){locked.value=!!value;}};
}
