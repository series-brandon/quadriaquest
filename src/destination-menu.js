import {destinationDialog} from './ui/dialogs/destination-dialog.js';

// Iter Crystal destinations on the modal host. Opening never travels or restores by itself.
// Areas list while `area.listed?.()` isn't false (the tutorial areas hide once the player wakes).
// `extras()` adds entries that aren't places ({id, name, description, choose()}), such as the
// tutorial's "???" ending; choosing one closes the dialog and runs `choose`.
// places (crystal-places.js): a map's Iter Crystals, each its own entry by name, once known or discovered; an
// area with crystals of its own lists them instead of itself. They list while their area does, or while
// you're in it (the playground's maps).
export function createDestinationMenu({modals,areas,travel,places=null,stop=()=>{},blocked=()=>false,services=null,extras=()=>[]}){
 const visited=new Set();let source=null,callback=null;
 const close=()=>modals.close('destinations');
 const crystalPlaces=()=>(places?.list()||[]).filter(p=>places.listed(p.id)&&(areas.get(p.area)?.listed?.()!==false||areas.id===p.area))
  .map(p=>({id:p.id,name:p.name||p.id,description:areas.get(p.area)?.name||''}));
 const entries=()=>[...areas.list().filter(area=>area.listed?.()!==false&&!places?.byArea(area.id).length),...crystalPlaces(),...extras()];
 function travelTo(id){
  if(!source?.available()||blocked())return 'The crystal is unavailable. Close and approach it again.';
  const extra=extras().find(entry=>entry.id===id);
  if(extra){queueMicrotask(()=>extra.choose());return null;}
  const arrive=callback;
  return travel.request(id,{source,onArrive:()=>{visited.add(id);arrive?.();}})?null:'There is no safe arrival space. Try again in a moment.';
 }
 return {
  open(actor,onArrive){
   if(blocked()||actor&&!actor.available())return false;
   // Where you are: this crystal's place, or the area.
   const here=actor?.place||areas.id;stop();visited.add(here);
   let initial=areas.active?.recommendedDestination||(actor?.destination&&actor.destination!==areas.id?actor.destination:null);
   const listed=entries();
   initial=listed.some(a=>a.id===initial)?initial:listed.find(a=>a.id!==here)?.id;
   modals.open({id:'destinations',title:'Where to?',onClose:()=>{source=null;callback=null;},
    build:({close})=>destinationDialog({areas:{id:here,list:()=>listed},visited,source:actor,initial,travelTo,services,close})});
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
