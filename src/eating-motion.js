import {idlePose} from './slime-motion.js';
export const EATING_DURATION=1.8;
export function eatingMotion(time){
 const t=Math.max(0,Math.min(EATING_DURATION,time)),lift=Math.min(1,t/.35),chew=t>.35&&t<1.35?Math.sin((t-.35)*22):0,lower=Math.max(0,(t-1.4)/.4);
 const y=.27+lift*.09-lower*.07,x=.18-lift*.06+lower*.04,z=.57-lift*.13+lower*.1;
 return {pose:{...idlePose(t),squash:1+chew*.025,lean:.035,twist:0},hands:[[-x,y,z,0,0],[x,y,z,0,0]],handWork:null,expression:'pleased'};
}
