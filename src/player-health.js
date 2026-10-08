import {createResource} from './player-resources.js';
import {computed,signal} from './reactive.js';
import {EATING_DURATION} from './eating-motion.js';

export const FOODS={cookedFish:{healing:20,duration:EATING_DURATION}};
export const createPlayerHealth=createResource;

export const CONSUMABLE_COOLDOWN=2;

// Food consumption is app-owned; areas observe it for their narrative.
// Accepted use consumes the item and heals at initiation (one atomic step); the remaining
// animation is interruptible presentation. One shared 2-second cooldown covers every manual consumable.
export function createFoodSystem(api){
 // Signal-backed so the HUD's Eat control follows eating and the cooldown without polling.
 const eating=signal(null),cooldown=signal(0);let confirmation=null;
 // Menus follow readiness, which flips once per cooldown, not the per-frame countdown.
 const ready=computed(()=>cooldown.value<=0);
 function cancel(){eating.value=null;confirmation?.();confirmation=null;}
 function start(id,confirmed=false){
  const food=FOODS[id];
  // Rejected attempts change nothing: no item, effect, interruption or queue clearing.
  if(!food||!api.inventory[id]||api.busy?.()||cooldown.peek()>0)return false;
  if(api.defer?.(()=>start(id,confirmed),'Eating'))return true;
  if(api.health.value===api.health.max&&!confirmed){
   confirmation?.();confirmation=api.confirm?.(()=>{confirmation=null;start(id,true);});return false;
  }
  if(!(api.inventory[id]>0)||cooldown.peek()>0)return false;
  api.stop();api.inventory[id]--;api.health.heal(food.healing);cooldown.value=CONSUMABLE_COOLDOWN;
  eating.value={id,food,age:0};api.started?.();api.consumed?.({[id]:-1});return true;
 }
 function update(dt){
  if(cooldown.peek()>0)cooldown.value=Math.max(0,cooldown.peek()-dt);
  const current=eating.peek();if(!current)return null;
  current.age+=dt;
  if(current.age>=current.food.duration){eating.value=null;api.completed?.();return null;}
  return {kind:'Eating',time:current.age};
 }
 return {start,update,cancel,get working(){return !!eating.value;},get cooldown(){return cooldown.value;},
  // Busy refusals come back from run() (false) rather than a disabled state the menu can't follow.
  inventoryActions(id){return FOODS[id]?[{label:'Eat',disabled:!api.inventory[id]||!ready.value,run:()=>{if(api.busy?.())return false;start(id);}}]:[];}};
}

