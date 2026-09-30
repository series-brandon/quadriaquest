const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };

// Poses are applied to the whole visual rig, so eyes and hands stay attached.
export function idlePose(time) {
  return { squash: 1 + Math.sin(time * 2.8) * .085, stretch: 1,
    twist: Math.sin(time * 1.4) * .09, lean: Math.sin(time * 2.1) * .025 };
}

export function slidePose(time) {
  return { squash: .91 + Math.sin(time * 10) * .025, stretch: 1.1,
    twist: Math.sin(time * 5) * .018, lean: .075 };
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
