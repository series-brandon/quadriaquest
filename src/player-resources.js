export function createResource(max=100){
 let value=max;
 return {max,get value(){return value;},set value(next){value=Math.max(0,Math.min(max,next));},heal(amount){this.value=value+amount;},restore(){value=max;}};
}
export function resourceTone(value,max){const ratio=value/max;return ratio>.5?'high':ratio>=.25?'medium':'low';}
export function createPlayerResources(){
 const mana=createResource(),stamina=createResource();let sprint=false,spent=0;
 return {mana,stamina,get sprint(){return sprint&&stamina.value>0;},toggle(){sprint=!sprint&&stamina.value>0;return sprint;},
  // Returns movement time: the boosted portion advances twice as fast, including an exhaustion boundary.
  advance(dt,moving){if(!moving||!sprint||stamina.value<=0){if(stamina.value<=0)sprint=false;return dt;}
   const boosted=Math.min(dt,Math.max(0,stamina.value*.5-spent));spent+=boosted;
   const drain=Math.floor((spent+1e-9)/.5);if(drain){stamina.value-=drain;spent=Math.max(0,spent-drain*.5);}if(stamina.value===0){sprint=false;spent=0;}return dt+boosted;
  },reset(){mana.restore();stamina.restore();sprint=false;spent=0;},
  get state(){return {mana:mana.value,stamina:stamina.value,sprint:this.sprint};}
 };
}
