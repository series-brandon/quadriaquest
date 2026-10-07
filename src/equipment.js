import {UNARMED} from './combat-profile.js';

// Items contribute bonuses; damage comes from the shared formulas (docs/COMBAT.md).
// offHand marks one-handed weapons explicitly configured as off-hand eligible.
export const GEAR={
 swords:{slot:'main',name:'Stone Sword',style:'melee',power:6,accuracy:6,baseInterval:2.55,range:1,proficiency:'sword',damageTypes:['slashing'],requirements:{'melee.technique':1}},
 copperDagger:{slot:'main',offHand:true,name:'Copper Dagger',style:'melee',power:10,accuracy:10,baseInterval:2.55,range:1,proficiency:'dagger',damageTypes:['piercing','slashing'],requirements:{'melee.technique':1}},
 shields:{slot:'off',name:'Wooden Shield',shield:true,resistance:30,requirements:{'prof.shield':1}},
 copperShield:{slot:'off',name:'Copper Shield',shield:true,resistance:50,requirements:{'prof.shield':1}},
 bows:{slot:'main',name:'Training Bow',twoHanded:true,style:'ranged',power:10,accuracy:10,baseInterval:2.55,range:6,proficiency:'bow',ammo:'arrows',damageTypes:['piercing'],requirements:{'ranged.technique':1}},
 hats:{slot:'head'}
};
export const ARMOR_SLOTS=['chest','hands','legs','feet','back','ward'];
export const ATTACK_HANDS=['main','off','alternate'];
const isWeapon=id=>!!GEAR[id]?.style;

export function createEquipment({inventory,busy=()=>false,changed=()=>{}}){
 const slots={main:null,off:null,head:null,...Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null]))};
 const damageTypes={main:null,off:null};let attackHands=null;
 const copies=id=>Object.values(slots).filter(v=>v===id).length;
 // Missing copies leave the off hand first; then any other slot holding the item.
 function refresh(){for(const slot of ['off',...Object.keys(slots).filter(s=>s!=='off')])if(slots[slot]&&copies(slots[slot])>(inventory[slots[slot]]||0))slots[slot]=null;}
 const slotFor=(id,hand)=>hand==='off'&&GEAR[id]?.offHand?'off':GEAR[id].slot;
 function toggle(id,hand){refresh();const item=GEAR[id];if(!item||!(inventory[id]>0)||busy())return false;
  const slot=slotFor(id,hand);
  if(slots[slot]===id)slots[slot]=null;
  else{
   // When every owned copy is already worn, equipping moves it (e.g. main hand → off hand).
   if(copies(id)>=inventory[id])for(const s of Object.keys(slots))if(slots[s]===id)slots[s]=null;
   if(item.twoHanded)slots.off=null;if(slot==='off'&&GEAR[slots.main]?.twoHanded)slots.main=null;slots[slot]=id;
  }
  // An equipment change that invalidates a hand's damage type falls back to that weapon's first type.
  for(const h of ['main','off'])if(damageTypes[h]&&!handAttack(h)?.damageTypes?.includes(damageTypes[h]))damageTypes[h]=null;
  changed();return true;
 }
 // A hand's attack: its weapon, or a fist when free. Shields and hands held by a two-handed weapon cannot attack.
 function handAttack(hand){
  refresh();const id=slots[hand];
  if(hand==='off'){if(GEAR[slots.main]?.twoHanded||GEAR[id]?.shield)return null;}
  const base=isWeapon(id)?{...GEAR[id],item:id}:id&&hand==='main'&&!isWeapon(id)?null:{...UNARMED,item:null};
  if(!base)return null;
  const types=base.damageTypes||['bludgeoning'];
  return {...base,hand,damageType:types.includes(damageTypes[hand])?damageTypes[hand]:types[0]};
 }
 const eligibleHands=()=>['main','off'].filter(h=>handAttack(h));
 // Defaults: one weapon → its hand; two weapons or two fists → alternate.
 function defaultHands(){const weapons=['main','off'].filter(h=>isWeapon(slots[h]));return weapons.length===1?weapons[0]:'alternate';}
 const api={refresh,toggle,handAttack,eligibleHands,isEquipped(id){refresh();return Object.values(slots).includes(id);},
  get slots(){refresh();return {...slots};},
  get attack(){return handAttack('main')||handAttack('off')||{...UNARMED,item:null,hand:'main'};},
  // Worn armor pieces (any slot whose item declares armor), for resistance, block and armor XP.
  get armorPieces(){refresh();return Object.values(slots).filter(id=>GEAR[id]?.armor).map(id=>({...GEAR[id],item:id}));},
  get shield(){refresh();return GEAR[slots.off]?.shield?{...GEAR[slots.off],item:slots.off}:null;},
  // Attack hands: Main only, Off only or Alternate eligible hands; only eligible choices apply.
  get attackHands(){const choice=attackHands||defaultHands(),hands=eligibleHands();if(choice==='alternate')return hands.length>1?'alternate':hands[0]||'main';return hands.includes(choice)?choice:hands[0]||'main';},
  get attackHandsChoice(){return attackHands;},
  setAttackHands(choice){if(choice!==null&&!ATTACK_HANDS.includes(choice))return false;attackHands=choice;changed();return true;},
  // Apply a whole setup at once (Optimize). Only owned copies; returns what changed for feedback.
  setSlots(next){
   if(busy())return [];refresh();const changes=[];
   for(const [slot,id] of Object.entries(next)){if(!(slot in slots)||slots[slot]===id)continue;
    if(id&&!(GEAR[id]&&inventory[id]>0))continue;
    if(id&&copies(id)>=inventory[id])for(const s of Object.keys(slots))if(slots[s]===id&&!(s in next&&next[s]===id))slots[s]=null;
    slots[slot]=id;if(id)changes.push({slot,id,name:GEAR[id].name||id});}
   if(GEAR[slots.main]?.twoHanded)slots.off=null;
   for(const h of ['main','off'])if(damageTypes[h]&&!handAttack(h)?.damageTypes?.includes(damageTypes[h]))damageTypes[h]=null;
   if(changes.length||Object.keys(next).length)changed();return changes;
  },
  damageTypeFor:hand=>handAttack(hand)?.damageType||null,
  setDamageType(hand,type){const attack=handAttack(hand);if(!attack?.damageTypes?.includes(type))return false;damageTypes[hand]=type;changed();return true;},
  get state(){refresh();return Object.fromEntries(Object.keys(GEAR).map(id=>[id,Object.values(slots).includes(id)]));},
  reset(){for(const slot of Object.keys(slots))slots[slot]=null;attackHands=null;damageTypes.main=damageTypes.off=null;changed();},
  inventoryActions(id){if(!(id in GEAR))return [];const disabled=busy()||!(inventory[id]>0);
   if(!GEAR[id].offHand)return [{label:api.isEquipped(id)?'Unequip':'Equip',disabled,run:()=>toggle(id)}];
   return [{label:slots.main===id?'Unequip main hand':'Equip main hand',disabled,run:()=>toggle(id,'main')},{label:slots.off===id?'Unequip off hand':'Equip off hand',disabled,run:()=>toggle(id,'off')}];}
 };
 return api;
}
