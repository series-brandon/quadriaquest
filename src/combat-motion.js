// Impact is at the cycle boundary, matching the combat damage clocks.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function attackPose(clock,interval=1.5){
 const t=((clock%interval)+interval)%interval;
 if(t<.28)return 1-smooth(t/.28); // follow-through, then recover
 if(t<interval-.43)return 0;
 if(t<interval-.13)return -.42*smooth((t-(interval-.43))/.30);
 return -.42+1.42*smooth((t-(interval-.13))/.13);
}
export function punchMotion(time){
 const swing=time<1.07?0:attackPose(time);
 return {lean:swing*.07,right:[-.35,.38+Math.max(0,-swing)*.08,.16+swing*.58,-swing*.4,0],left:[.36,.4,.27,0,0]};
}
