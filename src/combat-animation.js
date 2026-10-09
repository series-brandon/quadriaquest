import {punchMotion,castMotion,PUNCH_GUARD} from './combat-motion.js';
import {idlePose} from './slime-motion.js';
import {FOLLOW_UP_DELAY} from './combat-profile.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const arc=(a,control,b,t)=>a.map((v,i)=>(1-t)*(1-t)*v+2*(1-t)*t*control[i]+t*t*b[i]);
export const BLOCK_DURATION=.42;
export const PROJECTILE_FLIGHT=.22;
export function attackWindow(profile,time){const interval=profile.interval||1.5,clock=time%interval,windup=profile.style==='ranged'?.8:.48;return clock>=interval-windup||time>=interval&&clock<.28;}
// Damage type chooses the blade motion: Piercing stabs, Slashing slashes.
export function resolveAttackMotion(profile={}){return profile.attackMotion|| (profile.style==='magic'?'cast':profile.style==='ranged'?'bow':profile.item==='copperDagger'?(profile.damageType==='slashing'?'slash':'stab'):profile.item==='swords'?'slash':'punch');}
const SHIELDS=['shields','copperShield'];
// Hands are [right, left]: index 0 is the slime's right hand. Profiles name what each hand holds
// (rightHand, leftHand) and, for an attack, the striking side. Motions are authored for one side
// (strikes and blade guards right-handed; bow and shield held in the left) and mirrored for the other.
const SIDE_INDEX={right:0,left:1};
export const mirrorHand=h=>[-h[0],h[1],h[2],h[3]||0,-(h[4]||0),-(h[5]||0)];
export const mirrorHands=hands=>[mirrorHand(hands[1]),mirrorHand(hands[0])];
// What each hand holds. Profiles without hand fields name only the striking item (a bow in the left hand).
export function heldItems(profile={}){
 const legacy=profile.side??(profile.item==='bows'?'left':'right');
 return {right:profile.rightHand!==undefined?profile.rightHand:legacy==='right'?profile.item??null:null,
  left:profile.leftHand!==undefined?profile.leftHand:legacy==='left'?profile.item??null:null};
}
const sideHolding=(profile,test)=>{const h=heldItems(profile);return test(h.right)?'right':test(h.left)?'left':null;};
export function resolveBlockMotion(profile={}){
 if(profile.blockMotion)return profile.blockMotion;
 return sideHolding(profile,id=>SHIELDS.includes(id))?'shield':sideHolding(profile,id=>id==='bows')?'bow':sideHolding(profile,id=>BLADES.includes(id))?'blade':'fists';
}
export function combatEquipmentVisible(kind){return !['Gathering','Crafting','Chopping','Mining','Repairing','Smithing','Smelting','Fishing','Fishing cast','Fishing catch','Celebration','Eating','Cooking','Petting','Hammer injury','Defeated'].includes(kind);}
// Shared relaxed carry pose, independent of the selected attack style.
// Blades rest tilted forward in either hand.
const BLADES=['swords','copperDagger'];
export function equipmentIdleHands(profile={}){
 const hands=[[-.46,.33,.08,0,0,0],[.46,.33,.08,0,0,0]],held=heldItems(profile);
 for(const side of ['right','left']){const id=held[side],i=SIDE_INDEX[side];if(BLADES.includes(id))hands[i][3]=1.85;if(id==='bows')hands[i][3]=Math.PI/2;}
 return hands;
}
// Poses that only place the hands (waving, hopping, sleeping) keep each held weapon's grip from
// the carry pose (curl and yaw), so blades don't swing upright. `grip` (per hand, 0–1) eases a hand
// toward upright, as a waving hand brandishes its weapon.
export function withGrip(hands,carry,grip=[1,1]){
 return hands.map((h,i)=>{const g=grip[i]??1;return [h[0],h[1],h[2],(carry[i][3]||0)*g||h[3]||0,h[4]||0,(carry[i][5]||0)*g||h[5]||0];});
}
// Dual wielding: the dominant hand's motion, then the off hand's own motion a beat later (each on
// its own side), so a pair of weapons or fists strikes one-two.
// The striking side: the profile's `side`, else from its role (off = left) or, for a bow, the bow hand.
function strikingSide(profile){return profile.side??(resolveAttackMotion(profile)==='bow'?(sideHolding(profile,id=>id==='bows')||'left'):profile.hand==='off'?'left':'right');}
export function attackAnimation(profile={},time=0){
 if(profile.followUp){
  const {followUp,...main}=profile;
  const first=attackAnimation(main,time),second=attackAnimation({rightHand:main.rightHand,leftHand:main.leftHand,...followUp},Math.max(0,time-FOLLOW_UP_DELAY));
  const hands=[...first.hands],i=SIDE_INDEX[strikingSide(followUp)];hands[i]=second.hands[i];
  return {...first,hands,pose:{...first.pose,twist:(first.pose.twist||0)+(second.pose.twist||0),lean:Math.max(first.pose.lean||0,second.pose.lean||0)}};
 }
 const motion=resolveAttackMotion(profile),interval=profile.interval||1.5,clock=time%interval,after=time>=interval&&clock<.28;
 // Animate in the motion's authored layout, then mirror when the striking side is the other one.
 const mirrored=strikingSide(profile)!==(motion==='bow'?'left':'right');
 const ready=mirrored?mirrorHands(equipmentIdleHands(profile)):equipmentIdleHands(profile);
 let hands=ready.map(h=>[...h]),pose=idlePose(time),bowDraw=0,nocked=false,arrowRaise=0,charge=0,orbScale=0,instability=0;
 const wind=smooth((clock-(interval-.48))/.30),thrust=smooth((clock-(interval-.18))/.18),recover=after?1-smooth(clock/.28):0;
 if(motion==='bow'){
  const draw=after?0:smooth((clock-(interval-.8))/.62);bowDraw=draw;nocked=!after&&clock>=interval-1.15;
  // Reach the exact full-draw bow transform before nocking/drawing. The brief
  // set phase makes setup and draw distinct; neither bow nor torso drifts.
  arrowRaise=smooth((clock-(interval-1.15))/.25);
  const raise=after?recover:arrowRaise,finalTurn=-.65,turn=finalTurn*raise;
  const c=Math.cos(finalTurn),s=Math.sin(finalTurn);
  const finalHand=(z)=>[c*-.365-s*z,.55,s*-.365+c*z,0,0,-finalTurn];
  const stringZ=after?.308+.38*smooth(clock/.28):.688-.38*draw;
  const aimed=[finalHand(stringZ),finalHand(.908)];
  hands=ready.map((h,i)=>{const result=mix(h,aimed[i],raise);result.splice(0,3,...arc(h.slice(0,3),i===0?[-.60,.55,1.0]:[.65,.55,1.0],aimed[i].slice(0,3),raise));return result;});
  pose={squash:1,stretch:1,twist:turn,lean:0};
 }else if(motion==='cast'){
  const cast=castMotion(clock,interval,after);hands=cast.hands;pose.lean=cast.lean;pose.stretch=cast.stretch;charge=cast.charge;orbScale=cast.orbScale;instability=cast.instability;
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
 }else{const punch=punchMotion(time/interval*1.5);hands=[punch.right,punch.left];pose.lean=punch.lean;pose.twist=punch.twist;}
 // One-handed attacks use the free/shield arm as a counterweight. Momentum
 // peaks at impact and settles with the existing recovery.
 // The punch builds its own guard-hand pull-back and twist, so it skips this generic counterweight.
 if(['stab','slash'].includes(motion)){
  const effort=after?recover:thrust;
  hands[1][0]+=.02*effort;hands[1][1]+=.025*effort;hands[1][2]-=.14*effort;
  hands[1][3]-=.12*effort;
  pose.twist=.12*effort;
 }
 // Mirror back onto the striking side (position x and the y/z rotations; missing rotations read as 0).
 if(mirrored){hands=mirrorHands(hands);pose={...pose,twist:-(pose.twist||0)};}
 return {pose,hands,handWork:null,expression:'focused',bowDraw,nocked,arrowRaise,charge,orbScale,instability};
}
// Equipment affects the pose only; receiving a block animation never changes damage rules.
export function blockAnimation(profile={},age=0){
 const weight=age<.07?smooth(age/.07):1-smooth((age-.25)/.17);
 const motion=resolveBlockMotion(profile);
 // Settle back into the stance the attack resumes from: bare hands keep their boxing guard between
 // punches (dropping to the sides here made the fists dip, then slide back up for the next punch).
 // Guards are authored with the shield or bow in the left hand and a blade in the right; mirror otherwise.
 const mirrored=motion==='shield'?sideHolding(profile,id=>SHIELDS.includes(id))==='right':motion==='bow'?sideHolding(profile,id=>id==='bows')==='right':motion==='blade'?!BLADES.includes(heldItems(profile).right):false;
 const physical=motion==='fists'?PUNCH_GUARD:equipmentIdleHands(profile),rest=mirrored?mirrorHands(physical):physical;
 // Bare hands: a boxing high guard, fists nearly touching in front of the face (radius .105 each),
 // clear of the 0.72 body, wrists tilted and angled slightly inward.
 let guard=[[-.11,.57,.50,-.35,0,.2],[.11,.57,.50,-.35,0,-.2]];
 if(motion==='shield')guard=[[-.47,.34,.05,...rest[0].slice(3)],[.08,.49,.54,.08,-.12,-Math.PI/2]];
 else if(motion==='blade')guard=[[-.22,.40,.48,.30,-.8,0],[.40,.43,.18,0,0,0]];
 else if(motion==='bow')guard=[[-.22,.54,.40,0,0,0],[.10,.50,.60,0,0,.7]];
 const hands=rest.map((h,i)=>mix(h,guard[i],weight));
 return {pose:{squash:1-weight*.025,stretch:1,twist:0,lean:-weight*.04},hands:mirrored?mirrorHands(hands):hands,handWork:null,expression:'focused',bowDraw:0,nocked:false};
}
