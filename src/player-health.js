import {EATING_DURATION} from './eating-motion.js';

export const FOODS={cookedFish:{healing:10,duration:EATING_DURATION}};
export function createPlayerHealth(max=30){
 let value=max;
 return {max,get value(){return value;},set value(next){value=Math.max(0,Math.min(max,next));},heal(amount){this.value=value+amount;},restore(){value=max;}};
}

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

export function createHealthUI(health){
 const hud=document.createElement('aside');hud.id='player-health';hud.className='resource-orb';hud.hidden=true;
 hud.setAttribute('role','meter');hud.setAttribute('aria-label','Health');hud.setAttribute('aria-valuemin','0');
 hud.innerHTML='<span class="health-orb-fill" aria-hidden="true"></span><strong class="health-orb-value" aria-hidden="true"></strong>';document.body.append(hud);
 const number=hud.querySelector('.health-orb-value');
 return {update(visible){hud.hidden=!visible;hud.style.setProperty('--health-fill',`${100*health.value/health.max}%`);hud.setAttribute('aria-valuemax',String(health.max));hud.setAttribute('aria-valuenow',String(health.value));hud.setAttribute('aria-valuetext',`${health.value} of ${health.max} health`);hud.title=`Health: ${health.value} / ${health.max}`;number.textContent=health.value;}};
}
