import {SPRINT_REGEN_DELAY,regenRate} from './combat-formulas.js';
import {batch,signal} from './reactive.js';

// Fractional internal amounts; displays round up. A maximum change keeps the current
// absolute amount, clamping only above the new maximum (no refill, not damage).
// Signal-backed so UI bindings that read `value`/`max` update without polling.
// Asleep in a bed: health comes back this many times faster (user decision, 2026-10-11).
export const RESTING_HEALTH=4;
export function createResource(initial=100){
 const max=signal(Math.max(0,initial)),value=signal(max.peek());
 return {get max(){return max.value;},set max(next){batch(()=>{max.value=Math.max(0,next);value.value=Math.min(value.peek(),max.peek());});},
  get value(){return value.value;},set value(next){value.value=Math.max(0,Math.min(max.peek(),next));},heal(amount){this.value=value.peek()+amount;},restore(){value.value=max.peek();}};
}
export function resourceTone(value,max){const ratio=max>0?value/max:0;return ratio>.5?'high':ratio>=.25?'medium':'low';}
export function createPlayerResources(){
 // The sprint toggle is signal-backed so HUD bindings follow it.
 const mana=createResource(),stamina=createResource(),energy=createResource(),ki=createResource(),sprint=signal(false);let spent=0,sprinting=false,staminaDelay=0;
 return {mana,stamina,energy,ki,get sprint(){return sprint.value&&stamina.value>0;},toggle(){sprint.value=!sprint.value&&stamina.value>0;return sprint.value;},
  // Returns movement progress: additive bonuses (sprint +100%, Rush, Celerity) apply to the moving time,
  // with sprint applying only until exhaustion within the frame.
  advance(dt,moving,bonus=0){sprinting=false;const walk=1+bonus;if(!moving||!sprint.value||stamina.value<=0){if(stamina.value<=0)sprint.value=false;return dt*walk;}
   // Regeneration leaves fractional Stamina; exhausting the remaining budget drains that last fraction too.
   sprinting=true;const budget=Math.max(0,stamina.value*.5-spent),boosted=Math.min(dt,budget);spent+=boosted;
   if(boosted>=budget-1e-9)stamina.value=0;else{const drain=Math.floor((spent+1e-9)/.5);if(drain){stamina.value-=drain;spent=Math.max(0,spent-drain*.5);}}
   if(stamina.value===0){sprint.value=false;spent=0;}return boosted*(walk+1)+(dt-boosted)*walk;
  },
  // Call once per frame after movement; the sprint flag covers only that frame's movement.
  // Ki recovers only while every aura is off.
  // resting: asleep in a bed (props.js), health regenerates RESTING_HEALTH times faster.
  regenerate(dt,{health,attribute,inCombat,aurasActive=false,resting=false}){
   if(health&&health.value>0)health.heal(regenRate('health',attribute('regeneration'),inCombat)*dt*(resting?RESTING_HEALTH:1));
   mana.heal(regenRate('mana',attribute('fortitude'),inCombat)*dt);
   energy.heal(regenRate('energy',attribute('recuperation'),inCombat)*dt);
   if(!aurasActive)ki.heal(regenRate('ki',attribute('meditation'),inCombat)*dt);
   // Stamina pauses while sprinting and for a short delay afterwards; only the time past the delay regenerates.
   if(sprinting)staminaDelay=SPRINT_REGEN_DELAY;else{const rest=Math.max(0,dt-staminaDelay);staminaDelay=Math.max(0,staminaDelay-dt);stamina.heal(regenRate('stamina',attribute('recovery'),inCombat)*rest);}
   sprinting=false;
  },
  restoreAll(){for(const r of [mana,stamina,energy,ki])r.restore();},
  reset(){for(const r of [mana,stamina,energy,ki])r.restore();sprint.value=false;spent=0;sprinting=false;staminaDelay=0;},
  get state(){return {mana:mana.value,stamina:stamina.value,energy:energy.value,ki:ki.value,sprint:this.sprint};}
 };
}
