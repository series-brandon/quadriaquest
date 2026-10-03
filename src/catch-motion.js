import {idlePose} from './slime-motion.js';
export const HOOK_DURATION=.65;
export const CELEBRATION_DURATION=3.5;
export const CATCH_DURATION=HOOK_DURATION+CELEBRATION_DURATION;
const smooth=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
// Shared trophy lift for the first hat and a freshly caught fish.
export function holdUpMotion(time,item='generic'){
 const lift=smooth(.55,1.15,time),lower=1-smooth(2.8,3.5,time);
 const y=.55+lift*.34;
 return {pose:{...idlePose(time),squash:1+Math.sin(time*9)*.07*lower},expression:'happy',handWork:null,
 hands:[[-.25,y,.55,0,0],[.25,y,.55,0,0]],
 prop:{visible:true,y:y+({generic:.21,fish:.19,hat:.105}[item]??.21),z:.56}};
}
export function catchMotion(time){
 const pull=smooth(.05,.30,time),settle=smooth(.38,HOOK_DURATION,time);
 const pitch=.9*(1-pull),roll=.18*pull;
 // The shaft extends .2 below the grip. Rotate about that lower end,
 // Keep the lower shaft parallel to the face at full pull; the tip bends toward the water.
 // A small forward/outward shift keeps the hands clear of the face.
 const bottom=[-.09*pull,.35-.2*Math.cos(.9),.48-.2*Math.sin(.9)+.14*pull];
 const grip=[bottom[0]-.2*Math.sin(roll),bottom[1]+.2*Math.cos(roll)*Math.cos(pitch),bottom[2]+.2*Math.cos(roll)*Math.sin(pitch)];
 return {pose:{squash:1+.07*pull-.08*settle,stretch:1,lean:-.24*pull,twist:.08*pull},expression:'struggle',handWork:null,
  hands:[[...grip,pitch,roll],[0,.5,.67,0,0]],rod:true,tension:.25+.75*pull};
}
export function catchSequence(time){
 if(time<HOOK_DURATION)return {kind:'Fishing catch',time};
 if(time<CATCH_DURATION)return {kind:'Celebration',time:time-HOOK_DURATION};
 return null;
}
