import {punchMotion} from './combat-motion.js';
import {idlePose} from './slime-motion.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export const BLOCK_DURATION=.42;
export const PROJECTILE_FLIGHT=.22;
export function attackWindow(profile,time){const interval=profile.interval||1.5,clock=time%interval,windup=profile.style==='ranged'?.8:.48;return clock>=interval-windup||time>=interval&&clock<.28;}
export function resolveAttackMotion(profile={}){return profile.attackMotion|| (profile.style==='magic'?'cast':profile.style==='ranged'?'bow':profile.item==='copperDagger'?'stab':profile.item==='swords'?'slash':'punch');}
export function resolveBlockMotion(profile={}){const item=profile.mainHand??profile.item;return profile.blockMotion||(profile.offHand?'shield':item==='bows'?'bow':item==='swords'||item==='copperDagger'?'blade':'fists');}
export function combatEquipmentVisible(kind){return !['Gathering','Crafting','Chopping','Mining','Repairing','Smithing','Smelting','Fishing','Fishing cast','Fishing catch','Celebration','Eating','Cooking','Petting','Hammer injury','Defeated'].includes(kind);}
export function attackAnimation(profile={},time=0){
 const motion=resolveAttackMotion(profile),interval=profile.interval||1.5,clock=time%interval,after=time>=interval&&clock<.28;
 const ready=[[-.46,.33,.08,0,0,0],[.46,.33,.08,0,0,0]];
 let hands=ready.map(h=>[...h]),pose=idlePose(time),bowDraw=0,nocked=false;
 const wind=smooth((clock-(interval-.48))/.30),thrust=smooth((clock-(interval-.18))/.18),recover=after?1-smooth(clock/.28):0;
 if(motion==='bow'){
  const draw=after?0:smooth((clock-(interval-.8))/.62);bowDraw=draw;nocked=!after;
  hands=[[-.20,.49,.64,0,0,0],[-.20,.49,.64-.38*draw,0,0,0]];
  if(after)hands[1]=mix([-.10,.49,.20,0,0,0],[.30,.37,.20,0,0,0],smooth(clock/.28));
  pose.lean=draw*-.035;
 }else if(motion==='cast'){
  const push=after?recover:thrust;
  hands=[[-.15,.36+push*.10,.45+push*.34,.12+push*.25,0,0],[.15,.36+push*.10,.45+push*.34,.12+push*.25,0,-Math.PI/2]];
  pose.lean=push*.07;
 }else if(motion==='stab'){
  const aim=after?recover:wind,push=after?recover:thrust;
  hands[0]=[-.28,.35,.12+push*.48,Math.PI/2*aim,0,0];pose.lean=push*.075;
 }else if(motion==='slash'){
  const rear=[-.48,.60,-.16,-.65,-.12,-.12],slash=[.08,.30,.64,.95,Math.PI/4,Math.PI/3];
  hands[0]=after?mix(ready[0],slash,recover):mix(mix(ready[0],rear,wind),slash,thrust);pose.lean=after?recover*.12:thrust*.12-wind*.035;
 }else{const punch=punchMotion(time/interval*1.5);hands=[punch.right,punch.left];pose.lean=punch.lean;}
 return {pose,hands,handWork:null,expression:'focused',bowDraw,nocked};
}
// Equipment affects the pose only; receiving a block animation never changes damage rules.
export function blockAnimation(profile={},age=0){
 const weight=age<.07?smooth(age/.07):1-smooth((age-.25)/.17);
 const rest=[[-.46,.33,.08,0,0,0],[.46,.33,.08,0,0,0]];
 let guard=[[-.22,.57,.43,.12,0,0],[.22,.57,.43,.12,0,0]];
 const motion=resolveBlockMotion(profile);
 if(motion==='shield')guard=[[-.47,.34,.05,0,0,0],[.08,.49,.54,.08,-.12,-Math.PI/2]];
 else if(motion==='blade')guard=[[-.22,.40,.48,.30,-.8,0],[.40,.43,.18,0,0,0]];
 else if(motion==='bow')guard=[[-.10,.50,.52,0,0,-.7],[.22,.54,.28,0,0,0]];
 return {pose:{squash:1-weight*.025,stretch:1,twist:0,lean:-weight*.04},hands:rest.map((h,i)=>mix(h,guard[i],weight)),handWork:null,expression:'focused',bowDraw:0,nocked:false};
}
