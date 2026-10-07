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
 const mana=createResource(),stamina=createResource();let sprint=false,spent=0,sprinting=false;
 return {mana,stamina,get sprint(){return sprint&&stamina.value>0;},toggle(){sprint=!sprint&&stamina.value>0;return sprint;},
  // Returns movement time: the boosted portion advances twice as fast, including an exhaustion boundary.
  advance(dt,moving){sprinting=false;if(!moving||!sprint||stamina.value<=0){if(stamina.value<=0)sprint=false;return dt;}
   sprinting=true;const boosted=Math.min(dt,Math.max(0,stamina.value*.5-spent));spent+=boosted;
   const drain=Math.floor((spent+1e-9)/.5);if(drain){stamina.value-=drain;spent=Math.max(0,spent-drain*.5);}if(stamina.value===0){sprint=false;spent=0;}return dt+boosted;
  },
  // Passive recovery scaled by regeneration attributes; Stamina pauses only while actively sprinting.
  // Call once per frame after movement; the sprint flag covers only that frame's movement.
  regenerate(dt,{health,attribute,inCombat}){
   if(health&&health.value>0)health.heal(regenRate('health',attribute('regeneration'),inCombat)*dt);
   mana.heal(regenRate('mana',attribute('fortitude'),inCombat)*dt);
   if(!sprinting)stamina.heal(regenRate('stamina',attribute('recovery'),inCombat)*dt);
   sprinting=false;
  },
  reset(){mana.restore();stamina.restore();sprint=false;spent=0;sprinting=false;},
  get state(){return {mana:mana.value,stamina:stamina.value,sprint:this.sprint};}
 };
}
