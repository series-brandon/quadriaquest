import * as THREE from 'three';
// Allow the full melt and a short resting beat before the respawn fade.
export const FAINT_FALL_DURATION=.52;
export const FAINT_SQUISH_START=.72;
export const FAINT_MELT_DURATION=2.4;
export const FAINT_FADE_START=2.8;
export const FAINT_RESPAWN_TIME=3.6;
export const FAINT_PREVIEW_DURATION=4.2;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function faintPose(time){
 const melt=smooth((time-FAINT_SQUISH_START)/(FAINT_MELT_DURATION-FAINT_SQUISH_START));
 // A small hesitant tip, then accelerate into the fall.
 const teeter=.16;
 const fall=time<teeter?.06*smooth(time/teeter):.06+.94*smooth((time-teeter)/(FAINT_FALL_DURATION-teeter));
 const landing=Math.max(0,Math.min(1,(time-FAINT_FALL_DURATION)/.20));
 const bob=Math.sin(Math.PI*landing)*(1-landing);
 const lean=-Math.PI/2*fall+.10*bob;
 // Finish the backward flop before compressing the now-vertical local Z axis.
 const compression=.35*melt;
 // Three small side-to-side sighs, fading away before the resting pose.
 const progress=Math.max(0,Math.min(1,(time-FAINT_SQUISH_START)/(FAINT_MELT_DURATION-FAINT_SQUISH_START)));
 const sway=Math.sin(progress*Math.PI*6)*Math.sin(progress*Math.PI)*(1-progress);

 return {handDrop:smooth((time-FAINT_SQUISH_START)/.18),squash:1-compression,stretch:1,lean,twist:-.055*melt+.09*sway||0,bend:.12*melt+.04*sway,
 scale:[1+.08*melt,1-compression*Math.cos(lean)**2,1-compression*Math.sin(lean)**2-.07*bob],
 hands:[[-.46,.33,.08,0,0],[.46,.33,.08,0,0]]};
}

// Counter the body squash so the hands stay round, and lower them to the floor.
export function placeFaintedHands(rig,hands,drop,groundY=0){
 rig.updateMatrix();
 const inverse=rig.matrix.clone().invert();
 const center=new THREE.Vector3(0,.43,0).applyMatrix4(rig.matrix);
 for(const [index,hand] of hands.entries()){
  hand.rotation.set(0,0,0);
  hand.scale.set(1/rig.scale.x,1/rig.scale.y,1/rig.scale.z);
  const position=hand.position.clone().applyMatrix4(rig.matrix);
  position.x=THREE.MathUtils.lerp(position.x,(index===0?-1:1)*(.36*rig.scale.x+.08),drop);
  position.z=THREE.MathUtils.lerp(position.z,center.z,drop);
  position.y=THREE.MathUtils.lerp(position.y,groundY+.105,drop);
  hand.position.copy(position.applyMatrix4(inverse));
 }
}

export function groundFaintedBody(rig,body){
 rig.position.y=0;rig.updateMatrix();body.updateMatrix();
 const matrix=new THREE.Matrix4().multiplyMatrices(rig.matrix,body.matrix),point=new THREE.Vector3();
 let bottom=Infinity;
 const positions=body.geometry.attributes.position;
 for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(matrix);bottom=Math.min(bottom,point.y);}
 rig.position.y=.002-bottom;
}
