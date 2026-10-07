import {GEAR,createEquipment} from '../equipment.js';
import {SPELLS} from '../combat-styles.js';
import {resolveAttackMotion} from '../combat-animation.js';
export const MAIN_HANDS=[['','Empty'],['copperDagger','Copper Dagger'],['swords','Stone Sword'],['bows','Training Bow']];
export const OFF_HANDS=[['','Empty'],['copperShield','Copper Shield'],['shields','Wooden Shield'],['copperDagger','Copper Dagger (off hand)']];
export const ATTACK_MOTIONS=[['','Automatic'],['punch','Punch'],['stab','Stab'],['slash','Slash'],['bow','Bow draw / release'],['cast','Cast']];
export const ATTACK_HANDS=[['','Automatic'],['main','Main hand only'],['off','Off hand only'],['alternate','Alternate hands']];
export const BLOCK_MOTIONS=[['','Automatic'],['fists','Fists'],['blade','Blade'],['shield','Shield'],['bow','Bow guard']];
export function previewLoadout(options={}){
 const mainHand=MAIN_HANDS.some(([id])=>id===options.mainHand)?options.mainHand:null;
 const offHand=GEAR[mainHand]?.twoHanded?null:OFF_HANDS.some(([id])=>id===options.offHand)?options.offHand:null;
 // Only off-hand-eligible weapons may occupy the off hand.
 return {mainHand:mainHand||null,offHand:offHand||null};
}
// The preview equips its loadout on a real equipment instance, so hand eligibility, defaults and
// fallbacks (shield hands, two-handed weapons) are exactly the gameplay rules.
export function previewEquipment(options={}){
 const loadout=previewLoadout(options),inventory={};
 for(const id of [loadout.mainHand,loadout.offHand])if(id)inventory[id]=(inventory[id]||0)+1;
 const equipment=createEquipment({inventory});
 if(loadout.mainHand)equipment.toggle(loadout.mainHand,'main');if(loadout.offHand)equipment.toggle(loadout.offHand,'off');
 equipment.setAttackHands(options.attackHands||null);
 return equipment;
}
const HAND_NOTE={main:'Main hand only',off:'Off hand only',alternate:'Alternating hands'};
export function previewAttackHands(options={}){const equipment=previewEquipment(options);return {resolved:equipment.attackHands,eligible:equipment.eligibleHands(),label:HAND_NOTE[equipment.attackHands]};}
// time selects the striking hand when alternating: each swing keeps its hand through the follow-through,
// then the next cycle switches (one shared sequential timer, as in gameplay).
export function previewCombat(motion,options={},time=0){
 const loadout=previewLoadout(options),magic=options.style==='magic',equipment=previewEquipment(options),resolved=equipment.attackHands;
 const base=magic?SPELLS.energyStrike:equipment.handAttack(resolved==='off'?'off':'main')||{style:'unarmed'};
 const interval=resolveAttackMotion({...base,attackMotion:options.attackMotion})==='bow'?1.7:base.style==='magic'?1.8:1.5;
 const hand=magic?'main':resolved==='alternate'?(Math.floor(Math.max(0,time-.28)/interval)%2?'off':'main'):resolved;
 const attack=magic?{...SPELLS.energyStrike,item:null}:equipment.handAttack(hand)||equipment.handAttack('main');
 const profile={...attack,...loadout,item:magic?null:attack.item,hand,attackHands:resolved,attackMotion:options.attackMotion||null,blockMotion:options.blockMotion||null};
 const kind=resolveAttackMotion(profile);profile.interval=kind==='bow'?1.7:kind==='cast'?1.8:1.5;
 return {profile,kind:motion==='Block'?'Block':kind==='bow'?'Archery':kind==='cast'?'Casting':'Combat'};
}
