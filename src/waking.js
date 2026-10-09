import {signal} from './reactive.js';

// Leaving the tutorial. Everything before the world (the clearing, Willowbank, Cinderhold) is a dream:
// waking resets items and progress to one starting point, whether the tutorial was played or skipped,
// so both arrive in the world identically. Kept: name, color, dominant hand, combat mode and the
// companion (named on arrival if the player never met it).
export const STARTER_KIT={
 items:{copperDagger:1,copperShield:1,bows:1,arrows:20,hats:1,axes:1,pickaxes:1,hammers:1,rods:1,firestarters:1,cookedFish:3,sticks:5,stones:5},
 equip:['copperDagger','copperShield'],
 spells:['energyStrike'],abilities:['strongStrike'],auras:['rush','harden'],
};
// The "???" voice's farewell before the fade.
export const WAKING_LINES=[
 'Well done, little slime. You have come a long way.',
 'But here is a secret... the clearing, Willowbank, Cinderhold... all of it was a dream.',
 'The lessons stay with you, and so does your friend.',
 'Out there, a whole world is waiting. Bigger than anything you have seen.',
 "It's time to wake up and join the world!"
];
export const SKIP_LINES=[
 'Straight to the real thing? I like your spirit.',
 "It's time to wake up and join the world!"
];
const FADE=1.1;

// The world's arrival point comes from the area (`destination`), so moving the real start location
// later only changes that area. The host supplies the shared systems and its tutorial cleanup.
export function createWaking({narrator,inventory,items,skills,character,styles,auras,equipment,health,resources,companions,
 resetObjectives,endTutorial,arrive,fade,toast,destination='world'}){
 const woken=signal(false);
 let stage=null,age=0,skipped=false,needsName=false;

 // Items, levels and powers back to the shared starting point, then the starter kit.
 function resetProgress(){
  for(const id of Object.keys(items))inventory[id]=0;
  for(const skill of Object.values(skills()))Object.assign(skill,{xp:0,level:1});
  character.reset();
  const hand=equipment.handedness;equipment.reset();equipment.setHandedness(hand);
  styles.reset();auras.reset();
  Object.assign(inventory,STARTER_KIT.items);
  for(const id of STARTER_KIT.equip)equipment.toggle(id);
  for(const id of STARTER_KIT.spells)styles.learn(id);
  for(const id of STARTER_KIT.abilities)styles.learnAbility(id);
  for(const id of STARTER_KIT.auras)auras.learn(id);
  health.max=character.maxima.health;health.restore();resources.reset();
  resetObjectives();
 }
 function say(lines,then){let i=0;const next=()=>{if(i===lines.length){narrator.hide();then();return;}narrator.show({text:lines[i++],next});};next();}
 function transfer(){
  endTutorial();resetProgress();
  needsName=!companions.state.owned;
  const landing=arrive(destination);
  if(needsName)companions.acquire({at:landing});else companions.resetRoute(landing);
  woken.value=true;
 }
 function welcome(){
  toast('You wake up with a fresh start and a full pack.');
  if(needsName)companions.name({required:true});
 }
 return {
  woken,
  get isWoken(){return woken.peek();},
  get active(){return stage!==null;},
  // Begin the ceremony: the farewell (a shorter one when skipping), then fade, wake and fade back.
  start({skip=false}={}){
   if(stage||woken.peek())return false;
   skipped=skip;stage='talk';
   say(skip?SKIP_LINES:WAKING_LINES,()=>{stage='out';age=0;});
   return true;
  },
  update(dt){
   if(stage==='out'){age+=dt;fade(Math.min(1,age/FADE));if(age>=FADE){transfer();stage='in';age=0;}}
   else if(stage==='in'){age+=dt;fade(Math.max(0,1-age/FADE));if(age>=FADE){fade(0);stage=null;welcome();}}
  },
  get skipped(){return skipped;},
  reset(){stage=null;age=0;skipped=false;needsName=false;woken.value=false;fade(0);},
 };
}
