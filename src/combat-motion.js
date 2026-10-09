// Impact is at the cycle boundary, matching the combat damage clocks.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function attackPose(clock,interval=1.5){
 const t=((clock%interval)+interval)%interval;
 if(t<.28)return 1-smooth(t/.28); // follow-through, then recover
 if(t<interval-.43)return 0;
 if(t<interval-.13)return -.42*smooth((t-(interval-.43))/.30);
 return -.42+1.42*smooth((t-(interval-.13))/.13);
}
// Boxing punch on the shared attack clock. Both fists rest in a symmetrical guard ("put up your dukes"),
// so mirroring onto the off hand is exact. The striking (right) fist loads slightly back, drives forward
// and inward to impact while the other fist tucks back toward the chin, then both return to guard.
// Hand arrays: [x, y, z, curl, roll, yaw]; +z is forward, -x is the right (main) hand.
// Guard sits clear of the 0.72 body (front face z .36, fist radius .105), in front of the chin.
export const PUNCH_GUARD=[[-.24,.40,.50,-.35,0,.12],[.24,.40,.50,-.35,0,-.12]];
export function punchMotion(time){
 const swing=time<1.07?0:attackPose(time),strike=Math.max(0,swing),load=Math.max(0,-swing)/.42;
 const [g0,g1]=PUNCH_GUARD;
 const right=[g0[0]-.03*load+.12*strike,g0[1]+.02*load+.02*strike,g0[2]-.06*load+.46*strike,g0[3]+.05*load+.33*strike,0,g0[5]*(1-strike)];
 const left=[g1[0]+.02*load+.06*strike,g1[1]+.02*strike,g1[2]+.02*load-.14*strike,g1[3]-.08*strike,0,g1[5]];
 return {lean:swing*.07,twist:.14*strike-.04*load,right,left};
}

// Spell cast on the shared attack clock; the spell releases at the interval boundary.
// Gather: hands start wide, then converge on a point in front of the chest while circling it, as if
// rolling and concentrating an orb (more intense as they close in). Pull back: both hands draw in toward
// the body. Toss: they drive forward and open as the energy is thrown. Recovery: back out wide.
// Returns hands [x, y, z, curl, roll, yaw], body lean/stretch and `charge` (0–1) for the energy orb.
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mixHand=(a,b,k)=>a.map((v,i)=>v+(b[i]-v)*k);
export const CAST_TIMING={pull:.45,toss:.15,recover:.28};
function gatherHands(clock,gatherEnd){
 // Well clear of the body (front face z .36, hand radius .105) throughout the gather.
 // Circling peaks mid-gather and fades to nothing at its end, so the hands arrive level for the pull back.
 const g=ease(clock/gatherEnd),r=.42+(.14-.42)*g,theta=.5*Math.sin(clock*6.5)*Math.sin(Math.PI*g),cy=.42+.06*g,cz=.46+.20*g;
 return {g,hands:[[-r*Math.cos(theta),cy-r*Math.sin(theta),cz,.1,0,0],[r*Math.cos(theta),cy+r*Math.sin(theta),cz,.1,0,0]]};
}
export function castMotion(clock,interval,after=false){
 const gatherEnd=Math.max(.3,interval-CAST_TIMING.pull),pullEnd=interval-CAST_TIMING.toss;
 const tossPose=[[-.17,.50,.98,.35,0,0],[.17,.50,.98,.35,0,0]];
 if(after){
  // Follow-through: from the thrown pose back out to the wide start of the next gather.
  const k=1-ease(clock/CAST_TIMING.recover),start=gatherHands(clock,gatherEnd).hands;
  return {hands:start.map((h,i)=>mixHand(h,tossPose[i],k)),lean:.09*k,stretch:1+.03*k,charge:0,orbScale:0,instability:0};
 }
 const {g,hands}=gatherHands(Math.min(clock,gatherEnd),gatherEnd);
 const pull=ease((clock-gatherEnd)/(pullEnd-gatherEnd)),toss=ease((clock-pullEnd)/(interval-pullEnd));
 // Pull back: tighten the orb, settle the circling, draw toward the body and lean back slightly.
 const pulled=hands.map((h,i)=>[(i?.12:-.12),h[1]+.03,h[2]-.10,.05,0,0]);
 let out=hands.map((h,i)=>mixHand(h,pulled[i],pull));
 out=out.map((h,i)=>mixHand(h,tossPose[i],toss));
 // Orb: swells and surges wildly while the hands converge, then settles small and steady as the energy
 // concentrates (stable from the end of the gather through the pull back and toss).
 const settle=ease((g-.45)/.55),instability=(1-settle)*Math.min(1,g*3);
 const base=.45+.75*Math.sin(Math.PI*Math.min(1,g/.9))*(1-.35*settle)+(.6-.45)*settle;
 const surge=.55*instability*(.6*Math.sin(clock*13)+.4*Math.sin(clock*21.7));
 return {hands:out,lean:-.04*pull*(1-toss)+.09*toss,stretch:1-.03*pull*(1-toss)+.03*toss,
  charge:clock>=interval?0:.25+.75*Math.max(g,pull),orbScale:clock>=interval?0:Math.max(.2,base*(1+surge)),instability};
}
