import {miningMotion} from './mining.js';
import {chopMotion} from './slime-motion.js';

export function animateResourceHit(resource,time,state,sound){
 const mining=['boulder','copper'].includes(resource.kind);
 const motion=mining?miningMotion(time):chopMotion(time);
 resource.group.rotation.z=motion.impact;
 if(motion.impact>0&&!state.sounding)sound(mining?'mine':'chop');
 state.sounding=motion.impact>0;
 return motion;
}

// Shared by the clearing and Willowbank; age starts after the final tool strike.
export function animateResourceDepletion(resource,age,axis){
 const progress=Math.min(1,age/.85);
 if(['boulder','copper'].includes(resource.kind)){
  resource.group.scale.setScalar(Math.max(.001,1-progress));
  resource.group.rotation.y=progress*.2;
 }else resource.group.quaternion.setFromAxisAngle(axis,progress*progress*Math.PI/2);
 return progress===1;
}
