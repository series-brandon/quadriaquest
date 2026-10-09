import {UNARMED} from './combat-profile.js';
import {signal} from './reactive.js';

// Items contribute bonuses; damage comes from the shared formulas (docs/COMBAT.md).
// Hand items (slot 'hand') fit either hand, shields included; a two-handed item is held in the hand
// it is equipped to and occupies the other.
export const GEAR={
 swords:{slot:'hand',name:'Stone Sword',style:'melee',power:6,accuracy:6,baseInterval:2.55,range:1,proficiency:'sword',damageTypes:['slashing'],requirements:{'melee.technique':1}},
 copperDagger:{slot:'hand',name:'Copper Dagger',style:'melee',power:10,accuracy:10,baseInterval:2.55,range:1,proficiency:'dagger',damageTypes:['piercing','slashing'],requirements:{'melee.technique':1}},
 shields:{slot:'hand',name:'Wooden Shield',shield:true,resistance:30,requirements:{'prof.shield':1}},
 copperShield:{slot:'hand',name:'Copper Shield',shield:true,resistance:50,requirements:{'prof.shield':1}},
 bows:{slot:'hand',name:'Training Bow',twoHanded:true,style:'ranged',power:10,accuracy:10,baseInterval:2.55,range:6,proficiency:'bow',ammo:'arrows',damageTypes:['piercing'],requirements:{'ranged.technique':1}},
 hats:{slot:'head'}
};
export const ARMOR_SLOTS=['chest','hands','legs','feet','back','ward'];
export const SIDES=['right','left'];
// Attack hands: Both (dual wielding, the dominant hand first), Right only or Left only. null is Auto.
export const ATTACK_HANDS=['both','right','left'];
const isWeapon=id=>!!GEAR[id]?.style;
const other=side=>side==='right'?'left':'right';

// Hands are physical (right, left). Handedness picks the dominant hand: in a one-two it strikes first
// and the other hand takes the off-hand penalty. Combat logic asks for roles ('main' = dominant,
// 'off' = the other); UI and presentation use sides. Changing handedness never moves items.
export function createEquipment({inventory,busy=()=>false,changed:notify=()=>{}}){
 // `revision` changes with every equipment change for UI bindings.
 const revision=signal(0),changed=()=>{revision.value++;notify();};
 const slots={right:null,left:null,head:null,...Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null]))};
 const damageTypes={right:null,left:null};let attackHands=null,handedness='right';
 const sideOf=hand=>hand==='main'?handedness:hand==='off'?other(handedness):hand;
 const roleOf=side=>side===handedness?'main':'off';
 const copies=id=>Object.values(slots).filter(v=>v===id).length;
 // Missing copies leave the off hand first; then any other slot holding the item.
 function refresh(){const off=other(handedness);for(const slot of [off,...Object.keys(slots).filter(s=>s!==off)])if(slots[slot]&&copies(slots[slot])>(inventory[slots[slot]]||0))slots[slot]=null;}
  // A hand item goes in the hand asked for (default: the dominant hand; a shield or two-handed item
 // defaults to the off hand, so a right-hander holds a bow in the left hand and draws with the right).
 function toggle(id,hand){refresh();const item=GEAR[id];if(!item||!(inventory[id]>0)||busy())return false;
  const slot=item.slot==='hand'?sideOf(hand||(item.shield||item.twoHanded?'off':'main')):item.slot;
  if(slots[slot]===id)slots[slot]=null;
  else{
   // When every owned copy is already worn, equipping moves it (e.g. right hand → left hand).
   if(copies(id)>=inventory[id])for(const s of Object.keys(slots))if(slots[s]===id)slots[s]=null;
   if(item.slot==='hand'){const o=other(slot);if(item.twoHanded||GEAR[slots[o]]?.twoHanded)slots[o]=null;}
   slots[slot]=id;
  }
  settle();changed();return true;
 }
 // An equipment change that invalidates a hand's damage type falls back to that weapon's first type.
 function settle(){for(const side of SIDES)if(damageTypes[side]&&!handAttack(side)?.damageTypes?.includes(damageTypes[side]))damageTypes[side]=null;}
 // A hand's attack: its weapon, or a fist when free. Shields and the hand held by a two-handed weapon cannot attack.
 // `hand` is a side or a role; the attack names both (hand: role, side).
 function handAttack(hand){
  refresh();const side=sideOf(hand),id=slots[side];
  if(GEAR[slots[other(side)]]?.twoHanded||GEAR[id]?.shield)return null;
  const base=isWeapon(id)?{...GEAR[id],item:id}:id?null:{...UNARMED,item:null};
  if(!base)return null;
  const types=base.damageTypes||['bludgeoning'];
  return {...base,hand:roleOf(side),side,damageType:types.includes(damageTypes[side])?damageTypes[side]:types[0]};
 }
 const eligibleSides=()=>SIDES.filter(s=>handAttack(s));
 const roleSlots=()=>({main:slots[handedness],off:slots[other(handedness)]});
 const api={revision,refresh,toggle,handAttack,eligibleSides,
  // Roles of the hands that can strike ('main', 'off').
  eligibleHands:()=>eligibleSides().map(roleOf),
  sideOf,roleOf,
  isEquipped(id){refresh();return Object.values(slots).includes(id);},
  // Sides plus role views (main = dominant hand, off = the other) for combat logic.
  get slots(){refresh();return {...slots,...roleSlots()};},
  get handedness(){return handedness;},
  setHandedness(side){if(!SIDES.includes(side))return false;handedness=side;changed();return true;},
  get attack(){return handAttack('main')||handAttack('off')||{...UNARMED,item:null,hand:'main',side:handedness};},
  // Worn armor pieces (any slot whose item declares armor), for resistance, block and armor XP.
  get armorPieces(){refresh();return Object.values(slots).filter(id=>GEAR[id]?.armor).map(id=>({...GEAR[id],item:id}));},
  get shield(){refresh();const side=SIDES.find(s=>GEAR[slots[s]]?.shield);return side?{...GEAR[slots[side]],item:slots[side],side}:null;},
  // Attack hands: Auto (null: every hand that can strike), Both, Right only or Left only; an unavailable
  // choice falls back. Resolves to 'both' or a side.
  get attackHands(){const choice=attackHands||'both',sides=eligibleSides();if(choice==='both')return sides.length>1?'both':sides[0]||handedness;return sides.includes(choice)?choice:sides[0]||handedness;},
  get attackHandsChoice(){return attackHands;},
  // null or 'auto' is Auto. Older role choices map to the current sides.
  setAttackHands(choice){if(choice==='alternate')choice='both';if(choice==='auto')choice=null;if(choice==='main'||choice==='off')choice=sideOf(choice);
   if(choice!==null&&!ATTACK_HANDS.includes(choice))return false;attackHands=choice;changed();return true;},
  // Apply a whole setup at once (Optimize). Keys are slots, sides or roles; only owned copies; returns
  // what changed for feedback.
  setSlots(next){
   if(busy())return [];refresh();const changes=[];
   const entries=Object.entries(next).map(([key,id])=>[key==='main'||key==='off'?sideOf(key):key,id]),targets=new Map(entries);
   for(const [slot,id] of entries){if(!(slot in slots)||slots[slot]===id)continue;
    if(id&&!(GEAR[id]&&inventory[id]>0))continue;
    if(id&&copies(id)>=inventory[id])for(const s of Object.keys(slots))if(slots[s]===id&&targets.get(s)!==id)slots[s]=null;
    slots[slot]=id;if(id)changes.push({slot,id,name:GEAR[id].name||id});}
   for(const side of SIDES)if(GEAR[slots[side]]?.twoHanded)slots[other(side)]=null;
   settle();
   if(changes.length||entries.length)changed();return changes;
  },
  damageTypeFor:hand=>handAttack(hand)?.damageType||null,
  setDamageType(hand,type){const attack=handAttack(hand);if(!attack?.damageTypes?.includes(type))return false;damageTypes[attack.side]=type;changed();return true;},
  get state(){refresh();return Object.fromEntries(Object.keys(GEAR).map(id=>[id,Object.values(slots).includes(id)]));},
  reset(){for(const slot of Object.keys(slots))slots[slot]=null;attackHands=null;handedness='right';damageTypes.right=damageTypes.left=null;changed();},
  // Busy refusals come back from run() (false), not `disabled`, which menus show reactively.
  inventoryActions(id){if(!(id in GEAR))return [];const disabled=!(inventory[id]>0);
   if(GEAR[id].slot!=='hand')return [{label:api.isEquipped(id)?'Unequip':'Equip',disabled,run:()=>toggle(id)}];
   return SIDES.map(side=>({label:`${slots[side]===id?'Unequip':'Equip'} ${side} hand`,disabled,run:()=>toggle(id,side)}));}
 };
 return api;
}
