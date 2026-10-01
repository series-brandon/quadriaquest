const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };

// Poses are applied to the whole visual rig, so eyes and hands stay attached.
export function idlePose(time) {
  return { squash: 1 + Math.sin(time * 2.8) * .085, stretch: 1,
    twist: Math.sin(time * 1.4) * .09, lean: Math.sin(time * 2.1) * .025 };
}

// One grounded propulsion cycle per tile: compress, push, extend, recover.
// Distance and deformation share a phase, so the push actually accelerates him.
export function slideMotion(progress) {
  const t=clamp(progress), cycle=t*Math.PI*2;
  const push=Math.sin(Math.PI*t)**2;
  const preload=Math.sin(Math.PI*clamp(t/.35))**2*(1-smooth((t-.2)/.15));
  return {
    distance:t-.65*Math.sin(cycle)/(Math.PI*2), lift:0,
    squash:1-.16*preload-.075*push,
    stretch:1-.12*preload+.24*push,
    twist:0, lean:.02+.11*push,
    armDrive:-.11*Math.sin(cycle)
  };
}

export const STEP_DURATION = .92;
export function stepMotion(seconds, height) {
  let distance, lift, squash=1, stretch=1, lean=0;
  if (seconds < .15) {
    // Slide toward the edge and brake before the body's leading edge reaches it.
    distance = .08 * smooth(seconds / .15); lift=0;
    squash=1-.07*smooth(seconds/.15);
  } else if (seconds < .32) {
    distance=.08; lift=0;
    squash=.93-.21*smooth((seconds-.15)/.17);
    stretch=1.04;
  } else if (seconds < .76) {
    const t=clamp((seconds-.32)/.44);
    // Lift before advancing over the ledge; never slide through its vertical face.
    distance=.08+.92*smooth((t-.28)/.72);
    lift=height>0
      ? height*smooth(t/.35)+.28*Math.sin(Math.PI*t)
      : height*smooth((t-.3)/.7)+.2*Math.sin(Math.PI*t);
    squash=1+.22*Math.sin(Math.PI*t);
    stretch=.98;lean=.1*Math.sin(Math.PI*t);
  } else {
    const t=clamp((seconds-.76)/.16);
    distance=1;lift=height;
    squash=1-.23*Math.sin(Math.PI*t);stretch=1;
  }
  return {distance,lift,squash,stretch,lean,twist:0};
}

// Shared by gameplay and the development animation viewer.
export function workPose(kind,time){
  return {squash:.97,stretch:1,twist:0,lean:kind==='chop'?.03+Math.max(0,Math.sin(time*9))*.07:.035};
}
export function spawnMotion(time){
  let squash=1,lift=0;
  if(time<.68){const p=Math.min(1,time/.68);lift=14*(1-p*p);squash=1+.18*Math.sin(Math.PI*p);}
  else{const p=Math.min(1,(time-.68)/.52);squash=1-.3*Math.sin(Math.PI*p)*Math.exp(-p);}
  return {squash,lift,stretch:1,twist:0,lean:0};
}
