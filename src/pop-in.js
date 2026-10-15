// A quick pop into view: scale up from nothing with a slight overshoot. For anything that appears at
// once (the companion catching up by teleport); any model can use it.
export const POP_DURATION=.22;
// Scale factor at `age` seconds: 0 → about 1.1 → 1 (ease-out-back).
export function popScale(age){
 if(age>=POP_DURATION)return 1;
 const t=Math.max(0,age)/POP_DURATION-1,c=1.70158;
 return Math.max(0,1+(c+1)*t*t*t+c*t*t);
}
// Pops `group` in from its current scale (its resting scale is read once, on the first pop).
export function createPopIn(group){
 let base=null,age=null;
 const apply=k=>group.scale.setScalar(base*Math.max(.001,k));
 return {
  start(){base??=group.scale.x;age=0;apply(0);},
  // Advances the pop; true while it plays.
  update(dt){if(age===null)return false;age+=dt;apply(popScale(age));if(age>=POP_DURATION){group.scale.setScalar(base);age=null;}return true;},
  cancel(){if(age!==null){group.scale.setScalar(base);age=null;}},
  get active(){return age!==null;},
 };
}
