import {resolveAttackMotion,resolveBlockMotion} from './combat-animation.js';

// Shared crossfade between motions. When the active motion changes (punch ↔ stab, main ↔ off hand,
// attack ↔ block, eating → attacking…), the pose blends from where the body actually was to the new
// motion over `duration` seconds instead of snapping. Any caller can key motions however it likes.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const lerp=(a,b,k)=>a+(b-a)*k;
const BODY=['squash','stretch','twist','lean','lift'];

// Identity of what the body is doing; a change of key starts a blend.
export function motionKey(kind,profile){
 if(!kind)return 'none';
 if(kind==='Combat'||kind==='Casting')return `${kind}:${resolveAttackMotion(profile||{})}:${profile?.side||(profile?.hand==='off'?'left':'right')}`;
 if(kind==='Block')return `Block:${resolveBlockMotion(profile||{})}`;
 return kind;
}

export function createPoseBlender({duration=.22}={}){
 let key=null,last=null,from=null,age=0;
 const copy=m=>({...m,pose:{...m.pose},hands:m.hands?.map(h=>[...h])});
 return {
  // motion: {pose:{squash,stretch,twist,lean,lift}, hands:[[x,y,z,curl,roll,yaw],…], …}. Returns a blended copy.
  update(nextKey,motion,dt,{instant=false}={}){
   if(key!==null&&nextKey!==key&&last&&!instant){from=copy(last);age=0;}
   if(instant)from=null;key=nextKey;
   let out=motion;
   if(from&&motion.hands&&from.hands){
    age+=dt;const k=smooth(age/duration);
    if(k>=1)from=null;
    else{
     out={...motion,pose:{...motion.pose},hands:motion.hands.map((h,i)=>h.map((v,j)=>lerp(from.hands[i]?.[j]??v,v,k)))};
     for(const f of BODY)if(typeof motion.pose?.[f]==='number'&&typeof from.pose?.[f]==='number')out.pose[f]=lerp(from.pose[f],motion.pose[f],k);
    }
   }
   last=copy(out);return out;
  },
  get blending(){return !!from;},
  reset(){key=null;last=null;from=null;age=0;},
 };
}
