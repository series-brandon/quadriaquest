const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const SLEEP_SETTLE=2;
export const SOCIAL_DURATIONS={'Happy hop':1.1,Wave:2.2,Sleeping:6};
export function socialMotion(kind,time){
  const pose={squash:1,stretch:1,twist:0,lean:0,roll:0};
  const hands=[[-.46,.33,.08,0,0],[.46,.33,.08,0,0]];
  let lift=0,expression='happy';
  if(kind==='Happy hop'){
    if(time<.18)pose.squash=1-.2*smooth(time/.18);
    else if(time<.78){const p=(time-.18)/.6;lift=.52*Math.sin(Math.PI*p);pose.squash=1+.14*Math.sin(Math.PI*p);hands[0][1]=hands[1][1]=.33+.22*Math.sin(Math.PI*p);}
    else pose.squash=1-.18*Math.sin(Math.PI*Math.min(1,(time-.78)/.32));
  }else if(kind==='Wave'){
    const raised=smooth(time/.35)*(1-smooth((time-1.8)/.4));
    pose.bend=.15*raised; // Bend toward +X, away from the right hand at -X.
    // Follow the head's bend, then reach slightly inward as the hand rises.
    hands[0]=[-.46+pose.bend+.08*raised+.06*Math.sin(time*13)*raised,.33+.52*raised,.08+.06*raised,0,raised*(.25+Math.sin(time*13)*.32)];
    hands[1]=[.46,.33-.04*raised,.08,0,-.08*raised];
  }else if(kind==='Sleeping'){
    const settle=smooth(time/SLEEP_SETTLE),breath=Math.sin(Math.max(0,time-SLEEP_SETTLE)*Math.PI/2);
    expression=settle<.35?'idle':'sleeping';
    pose.squash=1+settle*(-.17+breath*.022);pose.lean=.035*settle;pose.roll=.14*settle;pose.twist=-.035*settle;
    hands[0][1]=.33-.13*settle;hands[1][1]=.33-.065*settle;
  }
  return {pose,expression,lift,hands,handWork:null,sleeping:kind==='Sleeping'&&time>=SLEEP_SETTLE};
}
export function createIdleClock(threshold=30){
  let age=0;
  return {wake(){age=0;},update(dt,eligible){age=eligible?age+dt:0;return age>=threshold;},get sleepTime(){return Math.max(0,age-threshold);}};
}
