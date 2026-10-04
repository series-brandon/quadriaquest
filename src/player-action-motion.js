import {eatingMotion} from './eating-motion.js';
import {castMotion,catchMotion,holdUpMotion} from './catch-motion.js';
import {faintPose} from './faint-motion.js';
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
 if(kind==='Eating')return eatingMotion(time);
 if(kind==='Fishing cast')return castMotion(time);
 if(kind==='Fishing catch')return catchMotion(time);
 if(kind==='Celebration')return holdUpMotion(time);
 let pose=workPose('gather',time),handWork=time,hands=null,expression=kind==='Petting'?'happy':'focused';
 if(kind==='Defeated'){pose=faintPose(time);hands=pose.hands;handWork=null;expression='fainted';}
 if(kind==='Combat'){const punch=punchMotion(time);pose=idlePose(idleTime);pose.lean=punch.lean;handWork=null;hands=[punch.right,punch.left];}
 if(kind==='Hammer injury'){pose=hammerInjuryPose(time);hands=pose.hands;handWork=null;expression='struggle';}
 if(kind==='Repairing'){
  // Work in front of the face: brace the board and tap forward with a short wrist arc.
  const phase=(time%.86)/.86,smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const raised=phase<.4?smooth(phase/.4):1-smooth((phase-.52)/.16);
  const impact=phase>=.68?Math.sin(Math.PI*Math.min(1,(phase-.68)/.18)):0;
  handWork=null;
  pose={squash:1-impact*.012,stretch:1,lean:.045,twist:0};
  hands=[[-.20,.49+raised*.025,.55-raised*.025,.85-raised*.60,0],[.13,.57-impact*.004,.76,.12,0]];
 }

 if(kind==='Chopping'||kind==='Mining'){const motion=kind==='Mining'?miningMotion(time):chopMotion(time);pose=motion.body;hands=[motion.right,motion.left];}
 if(kind==='Fishing'){const bob=Math.sin(time*2)*.015;handWork=null;hands=[[0,.35+bob,.48,.9,0],[0,.5+bob,.67,.9,0]];pose=idlePose(time);}
 return {pose,handWork,hands,expression};
}
export function alignSupportingHand(hands,kind){
 if(kind!=='Mining'&&kind!=='Fishing'&&kind!=='Fish hook'&&kind!=='Fishing cast')return;
 hands[0].updateMatrix();hands[1].position.set(0,kind==='Mining'?MINING_GRIP_SPACING:.24,0).applyMatrix4(hands[0].matrix);hands[1].quaternion.copy(hands[0].quaternion);
}
