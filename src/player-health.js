import {createResource} from './player-resources.js';
import {computed,signal} from './reactive.js';
import {EATING_DURATION} from './eating-motion.js';
import {ITEMS} from './items.js';

// FOODS is the live view of each item's `consume` block in src/data/items.json (edited on the type tools):
// `effects`, each `{type:'restore', resource, amount}` with resource health, mana, stamina, energy or ki. Each
// food also gets `healing` (its health restored, which auto-eat ranks by) and `duration`, the eating motion's
// length (code, not data). Temporary and permanent buffs are planned effect types.
export const RESTORE_RESOURCES=['health','mana','stamina','energy','ki'];
export const FOODS={};
export function refreshFood(id){
 const effects=ITEMS[id]?.consume?.effects;if(!effects){delete FOODS[id];return;}
 const healing=effects.reduce((sum,e)=>sum+(e.type==='restore'&&e.resource==='health'?e.amount||0:0),0);
 const row=FOODS[id]??={};Object.assign(row,{effects:structuredClone(effects),healing,duration:EATING_DURATION});
}
for(const id of Object.keys(ITEMS))refreshFood(id);
export const createPlayerHealth=createResource;

export const CONSUMABLE_COOLDOWN=2;

// Food consumption is app-owned; areas observe it for their narrative.
// Accepted use consumes the item and heals at initiation (one atomic step); the remaining
// animation is interruptible presentation. One shared 2-second cooldown covers every manual consumable.
// api.resources: the player's other resources (mana, stamina, energy, ki), for foods that restore them.
export function createFoodSystem(api){
 const pool=resource=>resource==='health'?api.health:api.resources?.[resource];
 const restores=food=>food.effects.filter(e=>e.type==='restore'&&pool(e.resource));
 // Asks first only when every resource the food restores is already full.
 const wasted=food=>restores(food).every(e=>pool(e.resource).value>=pool(e.resource).max);
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
  if(wasted(food)&&!confirmed){
   confirmation?.();confirmation=api.confirm?.(()=>{confirmation=null;start(id,true);});return false;
  }
  if(!(api.inventory[id]>0)||cooldown.peek()>0)return false;
  api.stop();api.inventory[id]--;for(const e of restores(food))pool(e.resource).heal(e.amount||0);cooldown.value=CONSUMABLE_COOLDOWN;
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

