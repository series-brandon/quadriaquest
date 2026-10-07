import {GEAR} from '../equipment.js';
import {SPELLS} from '../combat-styles.js';
import {resolveAttackMotion} from '../combat-animation.js';
export const MAIN_HANDS=[['','Empty'],['copperDagger','Copper Dagger'],['swords','Stone Sword'],['bows','Training Bow']];
export const OFF_HANDS=[['','Empty'],['copperShield','Copper Shield'],['shields','Wooden Shield'],['copperDagger','Copper Dagger (off hand)']];
export const ATTACK_MOTIONS=[['','Automatic'],['punch','Punch'],['stab','Stab'],['slash','Slash'],['bow','Bow draw / release'],['cast','Cast']];
export const BLOCK_MOTIONS=[['','Automatic'],['fists','Fists'],['blade','Blade'],['shield','Shield'],['bow','Bow guard']];
export function previewLoadout(options={}){
 const mainHand=MAIN_HANDS.some(([id])=>id===options.mainHand)?options.mainHand:null;
 const offHand=GEAR[mainHand]?.twoHanded?null:OFF_HANDS.some(([id])=>id===options.offHand)?options.offHand:null;
 // Only off-hand-eligible weapons may occupy the off hand.
 return {mainHand:mainHand||null,offHand:offHand||null};
}
export function previewCombat(motion,options={}){
 const loadout=previewLoadout(options),magic=options.style==='magic';
 // With only an off-hand weapon, the preview attacks with that hand (mirrored motion), as gameplay does.
 const offStrike=!magic&&!loadout.mainHand&&GEAR[loadout.offHand]?.offHand;
 const profile={...(magic?SPELLS.energyStrike:GEAR[offStrike?loadout.offHand:loadout.mainHand]||{style:'unarmed',interval:1.5}),...loadout,item:magic?null:offStrike?loadout.offHand:loadout.mainHand,hand:offStrike?'off':'main',attackMotion:options.attackMotion||null,blockMotion:options.blockMotion||null};
 const attack=resolveAttackMotion(profile);profile.interval=attack==='bow'?1.7:attack==='cast'?1.8:1.5;
 return {profile,kind:motion==='Block'?'Block':attack==='bow'?'Archery':attack==='cast'?'Casting':'Combat'};
}
