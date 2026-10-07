import {createResource} from './player-resources.js';
import {createResourceOrb} from './resource-orb.js';
import {EATING_DURATION} from './eating-motion.js';

export const FOODS={cookedFish:{healing:20,duration:EATING_DURATION}};
export const createPlayerHealth=createResource;

export const CONSUMABLE_COOLDOWN=2;

// Food consumption is app-owned; areas observe it for their narrative.
// Accepted use consumes the item and heals at initiation (one atomic step); the remaining
// animation is interruptible presentation. One shared 2-second cooldown covers every manual consumable.
export function createFoodSystem(api){
 let action=null,confirmation=null,cooldown=0;
 function cancel(){action=null;confirmation?.();confirmation=null;}
 function start(id,confirmed=false){
  const food=FOODS[id];
  // Rejected attempts change nothing: no item, effect, interruption or queue clearing.
  if(!food||!api.inventory[id]||api.busy?.()||cooldown>0)return false;
  if(api.defer?.(()=>start(id,confirmed),'Eating'))return true;
  if(api.health.value===api.health.max&&!confirmed){
   confirmation?.();confirmation=api.confirm?.(()=>{confirmation=null;start(id,true);});return false;
  }
  if(!(api.inventory[id]>0)||cooldown>0)return false;
  api.stop();api.inventory[id]--;api.health.heal(food.healing);cooldown=CONSUMABLE_COOLDOWN;
  action={id,food,age:0};api.started?.();api.consumed?.({[id]:-1});return true;
 }
 function update(dt){
  cooldown=Math.max(0,cooldown-dt);
  if(!action)return null;
  const current=action;current.age+=dt;
  if(current.age>=current.food.duration){action=null;api.completed?.();return null;}
  return {kind:'Eating',time:current.age};
 }
 return {start,update,cancel,get working(){return !!action;},get cooldown(){return cooldown;},
  inventoryActions(id){return FOODS[id]?[{label:'Eat',disabled:!api.inventory[id]||cooldown>0||!!api.busy?.(),run:()=>start(id)}]:[];}};
}

export function createHealthUI(health){const ui=createResourceOrb('Health',health,'player-health');document.body.append(ui.element);return ui;}
