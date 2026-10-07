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
