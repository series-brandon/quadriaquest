import {punchMotion} from './combat-motion.js';
import {idlePose} from './slime-motion.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const arc=(a,control,b,t)=>a.map((v,i)=>(1-t)*(1-t)*v+2*(1-t)*t*control[i]+t*t*b[i]);
export const BLOCK_DURATION=.42;
export const PROJECTILE_FLIGHT=.22;
export function attackWindow(profile,time){const interval=profile.interval||1.5,clock=time%interval,windup=profile.style==='ranged'?.8:.48;return clock>=interval-windup||time>=interval&&clock<.28;}
export function resolveAttackMotion(profile={}){return profile.attackMotion|| (profile.style==='magic'?'cast':profile.style==='ranged'?'bow':profile.item==='copperDagger'?'stab':profile.item==='swords'?'slash':'punch');}
export function resolveBlockMotion(profile={}){const item=profile.mainHand??profile.item;return profile.blockMotion||(profile.offHand?'shield':item==='bows'?'bow':item==='swords'||item==='copperDagger'?'blade':'fists');}
export function combatEquipmentVisible(kind){return !['Gathering','Crafting','Chopping','Mining','Repairing','Smithing','Smelting','Fishing','Fishing cast','Fishing catch','Celebration','Eating','Cooking','Petting','Hammer injury','Defeated'].includes(kind);}
// Shared relaxed carry pose, independent of the selected attack style.
export function equipmentIdleHands(profile={}){
 const hands=[[-.46,.33,.08,0,0,0],[.46,.33,.08,0,0,0]],item=profile.mainHand??profile.item;
 if(['swords','copperDagger'].includes(item))hands[0][3]=1.85;
 if(item==='bows')hands[1][3]=Math.PI/2;
 return hands;
}
export function attackAnimation(profile={},time=0){
 const motion=resolveAttackMotion(profile),interval=profile.interval||1.5,clock=time%interval,after=time>=interval&&clock<.28;
 const ready=equipmentIdleHands(profile);
 let hands=ready.map(h=>[...h]),pose=idlePose(time),bowDraw=0,nocked=false,arrowRaise=0;
 const wind=smooth((clock-(interval-.48))/.30),thrust=smooth((clock-(interval-.18))/.18),recover=after?1-smooth(clock/.28):0;
 if(motion==='bow'){
  const draw=after?0:smooth((clock-(interval-.8))/.62);bowDraw=draw;nocked=!after&&clock>=interval-1.15;
  arrowRaise=smooth((clock-(interval-1.15))/.35);
  // Off hand grips the wood; main hand follows the string. Turn the torso
  // right under a forward-aimed arrow. The bow stays left of the torso
  // centerline while the drawing hand comes back against the face.
  const turn=-.65*(after?recover:draw),c=Math.cos(turn),s=Math.sin(turn);
  const local=(x,y,z)=>[c*x-s*z,y,s*x+c*z,0,0,-turn];
  const raise=after?1-smooth(clock/.28):smooth((clock-(interval-1.15))/.35);
  const stance=after?recover:draw,x=.18-.545*stance,y=.55,gripZ=.795+.113*stance+.4*stance*(1-stance);
  const stringZ=after?.308+.267*smooth(clock/.28):gripZ-.22-.38*draw;
  const aimed=[local(x,y,stringZ),local(x,y,gripZ)];
  hands=ready.map((h,i)=>{const result=mix(h,aimed[i],raise);result.splice(0,3,...arc(h.slice(0,3),i===0?[-.60,.55,.65]:[.65,.55,1.0],aimed[i].slice(0,3),raise));return result;});
  pose={squash:1,stretch:1,twist:turn,lean:0};
 }else if(motion==='cast'){
  const push=after?recover:thrust;
  hands=[[-.15,.36+push*.10,.45+push*.34,.12+push*.25,0,0],[.15,.36+push*.10,.45+push*.34,.12+push*.25,0,-Math.PI/2]];
  pose.lean=push*.07;
 }else if(motion==='stab'){
  const aim=after?recover:wind,push=after?recover:thrust;
  hands[0]=[-.46+.14*smooth((push-.4)/.6),.33,.08+push*.55,ready[0][3]+(Math.PI/2-ready[0][3])*aim,aim?-.22*aim:0,0];pose.lean=push*.075;
 }else if(motion==='slash'){
  const rear=[-.48,.60,-.16,-.65,-.12,-.12],slash=[.08,.30,.64,.95,Math.PI/4,Math.PI/3];
  hands[0]=after?mix(ready[0],slash,recover):mix(mix(ready[0],rear,wind),slash,thrust);
  // Preserve the blade rotations; only reroute the hand translation.
  const start=mix(ready[0],rear,wind).slice(0,3);
  const position=after?arc(ready[0].slice(0,3),[-.78,.34,.75],slash.slice(0,3),recover):arc(start,[-.83,.50,.70],slash.slice(0,3),thrust);
  hands[0].splice(0,3,...position);pose.lean=after?recover*.12:thrust*.12-wind*.035;
 }else{const punch=punchMotion(time/interval*1.5);hands=[punch.right,punch.left];pose.lean=punch.lean;}
 // One-handed attacks use the free/shield arm as a counterweight. Momentum
 // peaks at impact and settles with the existing recovery.
 if(['stab','slash','punch'].includes(motion)){
  const effort=motion==='punch'?Math.max(0,pose.lean/.07):(after?recover:thrust);
  hands[1][0]+=.02*effort;hands[1][1]+=.025*effort;hands[1][2]-=.14*effort;
  hands[1][3]-=.12*effort;
  pose.twist=.12*effort;
 }
 return {pose,hands,handWork:null,expression:'focused',bowDraw,nocked,arrowRaise};
}
// Equipment affects the pose only; receiving a block animation never changes damage rules.
export function blockAnimation(profile={},age=0){
 const weight=age<.07?smooth(age/.07):1-smooth((age-.25)/.17);
 const rest=equipmentIdleHands(profile);
 let guard=[[-.22,.57,.43,.12,0,0],[.22,.57,.43,.12,0,0]];
 const motion=resolveBlockMotion(profile);
 if(motion==='shield')guard=[[-.47,.34,.05,...rest[0].slice(3)],[.08,.49,.54,.08,-.12,-Math.PI/2]];
 else if(motion==='blade')guard=[[-.22,.40,.48,.30,-.8,0],[.40,.43,.18,0,0,0]];
 else if(motion==='bow')guard=[[-.22,.54,.40,0,0,0],[.10,.50,.60,0,0,.7]];
 return {pose:{squash:1-weight*.025,stretch:1,twist:0,lean:-weight*.04},hands:rest.map((h,i)=>mix(h,guard[i],weight)),handWork:null,expression:'focused',bowDraw:0,nocked:false};
}
