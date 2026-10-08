import {destinationDialog} from './ui/dialogs/destination-dialog.js';

// Iter Crystal destinations on the modal host. Opening never travels or restores by itself.
export function createDestinationMenu({modals,areas,travel,stop=()=>{},blocked=()=>false,services=null}){
 const visited=new Set();let source=null,callback=null;
 const close=()=>modals.close('destinations');
 function travelTo(id){
  if(!source?.available()||blocked())return 'The crystal is unavailable. Close and approach it again.';
  const arrive=callback;
  return travel.request(id,{source,onArrive:()=>{visited.add(areas.id);arrive?.();}})?null:'There is no safe arrival space. Try again in a moment.';
 }
 return {
  open(actor,onArrive){
   if(blocked()||actor&&!actor.available())return false;
   stop();visited.add(areas.id);
   let initial=areas.active?.recommendedDestination||(actor?.destination!==areas.id?actor?.destination:null);
   initial=areas.get(initial)?initial:areas.list().find(a=>a.id!==areas.id)?.id;
   modals.open({id:'destinations',title:'Where to?',onClose:()=>{source=null;callback=null;},
    build:({close})=>destinationDialog({areas,visited,source:actor,initial,travelTo,services,close})});
   // After open: replacing an open dialog runs its onClose first.
   source=actor;callback=onArrive;
   return true;
  },
  close,
  // The crystal can become unusable while the dialog is open (combat, travel); then it closes.
  update(){if(source&&!source.available()&&modals.isOpen('destinations'))close();},
  get isOpen(){return modals.isOpen('destinations');},
  reset(){close();visited.clear();}
 };
}
