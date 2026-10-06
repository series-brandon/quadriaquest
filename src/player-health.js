import {createResource} from './player-resources.js';
import {createResourceOrb} from './resource-orb.js';
import {EATING_DURATION} from './eating-motion.js';

export const FOODS={cookedFish:{healing:10,duration:EATING_DURATION}};
export const createPlayerHealth=createResource;

// Food consumption is app-owned; areas observe completion for their narrative.
export function createFoodSystem(api){
 let action=null,confirmation=null;
 function cancel(){action=null;confirmation?.();confirmation=null;}
 function start(id,confirmed=false){
  const food=FOODS[id];
  if(!food||!api.inventory[id]||api.busy?.()||action)return false;
  if(api.defer?.(()=>start(id,confirmed),'Eating'))return true;
  if(api.health.value===api.health.max&&!confirmed){
   confirmation?.();confirmation=api.confirm?.(()=>{confirmation=null;start(id,true);});return false;
  }
  api.stop();action={id,food,age:0};api.started?.();return true;
 }
 function update(dt){
  if(!action)return null;
  const current=action;current.age+=dt;
  const motion={kind:'Eating',time:current.age};
  if(current.age>=current.food.duration){
   action=null;
   if(api.inventory[current.id]>0){api.inventory[current.id]--;api.health.heal(current.food.healing);api.completed?.({[current.id]:-1});}
  }
  return motion;
 }
 return {start,update,cancel,get working(){return !!action;},inventoryActions(id){return FOODS[id]?[{label:'Eat',disabled:!api.inventory[id]||!!action||!!api.busy?.(),run:()=>start(id)}]:[];}};
}

export function createHealthUI(health){const ui=createResourceOrb('Health',health,'player-health');document.body.append(ui.element);return ui;}
