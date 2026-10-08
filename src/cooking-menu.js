import {stationDialog,STATIONS} from './ui/dialogs/station-dialog.js';

// Station recipes (campfire, furnace, anvil) on the modal host, discovered from the same
// catalogue used to consume materials.
export function createCookingMenu({modals,recipes,items,inventory,canMake,duration,onCook,kind='fire'}){
 const id=kind==='fire'?'cooking':kind;
 return {
  open(station=null){
   modals.open({id,title:STATIONS[kind].title,size:'wide',flush:true,
    build:({close})=>stationDialog({kind,recipes,items,inventory,canMake,duration,station,onMake:onCook,close})});
  },
  close(){modals.close(id);},
  get isOpen(){return modals.isOpen(id);}
 };
}
