import {idlePose,workPose,chopMotion} from './slime-motion.js';
import {miningMotion,MINING_GRIP_SPACING} from './mining.js';
import {punchMotion} from './combat-motion.js';
import {hammerInjuryPose} from './bridge-injury.js';

export function gatheringHand(time,index){
 const side=index===0?-1:1,phase=time*Math.PI*5+index*Math.PI,reach=(Math.sin(phase)+1)/2;
 return [side*(.22+.09*(1-reach)),.26+.1*Math.cos(phase),.43+.2*reach,Math.sin(phase)*.35,0,0];
}
// The game and model viewer consume the same action poses, including expressions.
export function playerActionMotion(kind,time,idleTime=time){
 let pose=workPose('gather',time),handWork=time,hands=null,expression='focused';
 if(kind==='Defeated'){pose={...idlePose(time),squash:.2,lean:0,twist:0};handWork=null;expression='struggle';}
 if(kind==='Combat'){const punch=punchMotion(time);pose=idlePose(idleTime);pose.lean=punch.lean;handWork=null;hands=[punch.right,punch.left];}
 if(kind==='Hammer injury'){pose=hammerInjuryPose(time);hands=pose.hands;handWork=null;expression='struggle';}
 if(kind==='Repairing'){const swing=(Math.sin(time*8)+1)/2;hands=[[-.32,.4+swing*.5,.4,-swing*.9,0],[.3,.3,.4,0,0]];}
 if(kind==='Chopping'||kind==='Mining'){const motion=kind==='Mining'?miningMotion(time):chopMotion(time);pose=motion.body;hands=[motion.right,motion.left];}
 if(kind==='Fishing'){const bob=Math.sin(time*2)*.015;handWork=null;hands=[[0,.35+bob,.48,.9,0],[0,.5+bob,.67,.9,0]];pose=idlePose(time);}
 return {pose,handWork,hands,expression};
}
export function alignSupportingHand(hands,kind){
 if(kind!=='Mining'&&kind!=='Fishing')return;
 hands[0].updateMatrix();hands[1].position.set(0,kind==='Mining'?MINING_GRIP_SPACING:.24,0).applyMatrix4(hands[0].matrix);hands[1].quaternion.copy(hands[0].quaternion);
}
