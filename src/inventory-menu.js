import {signal} from './reactive.js';
import {h,mount} from './ui/dom.js';
import {inventoryPage,inventoryView} from './ui/pages/inventory-page.js';

// Hosts the Inventory page (ui/pages/inventory-page.js) as a journal page. It follows the
// reactive inventory and the item systems' revisions, so it needs no refresh calls.
// Tutorials may `guide` (reset the view and highlight Sticks) and `lock` (closing disabled).
export function createInventoryMenu({host,inventory,actions,settings,isEquipped,track,onSelect}){
 const guided=signal(false),locked=signal(false),view=inventoryView();
 const panel=mount(()=>h('section',{id:'inventory-panel','aria-label':'Inventory',hidden:true},
  inventoryPage({inventory,actions,settings,isEquipped,track,onSelect,guided,view}))).node;
 host.append(panel);
 return {panel,locked,
  guide(value){if(value)view.reset();guided.value=!!value;},
  lock(value){locked.value=!!value;}};
}
