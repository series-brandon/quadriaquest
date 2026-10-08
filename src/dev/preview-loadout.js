import {GEAR,createEquipment} from '../equipment.js';
import {SPELLS} from '../combat-styles.js';
import {resolveAttackMotion} from '../combat-animation.js';
// Hand items fit either hand (shields included); a two-handed item frees the other hand.
export const HAND_ITEMS=[['','Empty'],['copperDagger','Copper Dagger'],['swords','Stone Sword'],['copperShield','Copper Shield'],['shields','Wooden Shield'],['bows','Training Bow']];
export const ATTACK_MOTIONS=[['','Automatic'],['punch','Punch'],['stab','Stab'],['slash','Slash'],['bow','Bow draw / release'],['cast','Cast']];
export const ATTACK_HANDS=[['','Auto'],['both','Both hands (one-two)'],['right','Right hand only'],['left','Left hand only']];
export const HANDEDNESS=[['right','Right-handed'],['left','Left-handed']];
export const BLOCK_MOTIONS=[['','Automatic'],['fists','Fists'],['blade','Blade'],['shield','Shield'],['bow','Bow guard']];
const known=id=>HAND_ITEMS.some(([item])=>item===id)&&id?id:null;
export function previewLoadout(options={}){
 const rightHand=known(options.rightHand),leftHand=GEAR[rightHand]?.twoHanded?null:known(options.leftHand);
 return {rightHand:GEAR[leftHand]?.twoHanded?null:rightHand,leftHand};
}
// The preview equips its loadout on a real equipment instance, so hand eligibility, defaults and
// fallbacks (shield hands, two-handed weapons, handedness) are exactly the gameplay rules.
export function previewEquipment(options={}){
 const loadout=previewLoadout(options),inventory={};
 for(const id of [loadout.rightHand,loadout.leftHand])if(id)inventory[id]=(inventory[id]||0)+1;
 const equipment=createEquipment({inventory});
 equipment.setHandedness(options.handedness||'right');
 if(loadout.rightHand)equipment.toggle(loadout.rightHand,'right');if(loadout.leftHand)equipment.toggle(loadout.leftHand,'left');
 equipment.setAttackHands(options.attackHands||null);
 // Per-hand damage types use the production setter; unsupported choices keep the weapon's default.
 for(const side of ['right','left'])if(options[side+'DamageType'])equipment.setDamageType(side,options[side+'DamageType']);
 return equipment;
}
// Choices per hand, only where the striking weapon supports more than one damage type.
export function previewDamageTypes(options={}){
 const equipment=previewEquipment(options),out={};
 for(const side of ['right','left']){const attack=equipment.handAttack(side),types=attack?.damageTypes||[];out[side]=types.length>1?{types,selected:attack.damageType}:null;}
 return out;
}
const HAND_NOTE={right:'Right hand only',left:'Left hand only',both:'Both hands, one-two'};
export function previewAttackHands(options={}){const equipment=previewEquipment(options);return {resolved:equipment.attackHands,eligible:equipment.eligibleHands(),label:HAND_NOTE[equipment.attackHands]};}
// Both hands (dual wielding, as in gameplay): the main hand's attack carries the off hand's follow-up,
// which the animation plays a beat later on the left hand.
export function previewCombat(motion,options={},time=0){
 const loadout=previewLoadout(options),magic=options.style==='magic',equipment=previewEquipment(options),resolved=equipment.attackHands;
 const hand=magic?'main':resolved==='both'?'main':resolved;  // 'main': the dominant hand strikes first
 const attack=magic?{...SPELLS.energyStrike,item:null}:equipment.handAttack(hand)||equipment.attack;
 const shared={...loadout,attackHands:resolved,attackMotion:options.attackMotion||null,blockMotion:options.blockMotion||null};
 const profile={...attack,...shared,item:magic?null:attack.item,hand:magic?'main':attack.hand};
 const kind=resolveAttackMotion(profile);profile.interval=kind==='bow'?1.7:kind==='cast'?1.8:1.5;
 if(!magic&&resolved==='both'){const off=equipment.handAttack('off');if(off)profile.followUp={...off,...shared,hand:'off',interval:profile.interval};}
 return {profile,kind:motion==='Block'?'Block':kind==='bow'?'Archery':kind==='cast'?'Casting':'Combat'};
}
