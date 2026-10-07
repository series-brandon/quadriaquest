import {regenRate} from './combat-formulas.js';

// Fractional internal amounts; displays round up. A maximum change keeps the current
// absolute amount, clamping only above the new maximum (no refill, not damage).
export function createResource(max=100){
 let value=max;
 return {get max(){return max;},set max(next){max=Math.max(0,next);value=Math.min(value,max);},
  get value(){return value;},set value(next){value=Math.max(0,Math.min(max,next));},heal(amount){this.value=value+amount;},restore(){value=max;}};
}
export function resourceTone(value,max){const ratio=max>0?value/max:0;return ratio>.5?'high':ratio>=.25?'medium':'low';}
export function createPlayerResources(){
 const mana=createResource(),stamina=createResource(),energy=createResource(),ki=createResource();let sprint=false,spent=0,sprinting=false;
 return {mana,stamina,energy,ki,get sprint(){return sprint&&stamina.value>0;},toggle(){sprint=!sprint&&stamina.value>0;return sprint;},
  // Returns movement progress: additive bonuses (sprint +100%, Rush, Celerity) apply to the moving time,
  // with sprint applying only until exhaustion within the frame.
  advance(dt,moving,bonus=0){sprinting=false;const walk=1+bonus;if(!moving||!sprint||stamina.value<=0){if(stamina.value<=0)sprint=false;return dt*walk;}
   sprinting=true;const boosted=Math.min(dt,Math.max(0,stamina.value*.5-spent));spent+=boosted;
   const drain=Math.floor((spent+1e-9)/.5);if(drain){stamina.value-=drain;spent=Math.max(0,spent-drain*.5);}if(stamina.value===0){sprint=false;spent=0;}return boosted*(walk+1)+(dt-boosted)*walk;
  },
  // Call once per frame after movement; the sprint flag covers only that frame's movement.
  // Ki recovers only while every aura is off.
  regenerate(dt,{health,attribute,inCombat,aurasActive=false}){
   if(health&&health.value>0)health.heal(regenRate('health',attribute('regeneration'),inCombat)*dt);
   mana.heal(regenRate('mana',attribute('fortitude'),inCombat)*dt);
   energy.heal(regenRate('energy',attribute('recuperation'),inCombat)*dt);
   if(!aurasActive)ki.heal(regenRate('ki',attribute('meditation'),inCombat)*dt);
   if(!sprinting)stamina.heal(regenRate('stamina',attribute('recovery'),inCombat)*dt);
   sprinting=false;
  },
  restoreAll(){for(const r of [mana,stamina,energy,ki])r.restore();},
  reset(){for(const r of [mana,stamina,energy,ki])r.restore();sprint=false;spent=0;sprinting=false;},
  get state(){return {mana:mana.value,stamina:stamina.value,energy:energy.value,ki:ki.value,sprint:this.sprint};}
 };
}
