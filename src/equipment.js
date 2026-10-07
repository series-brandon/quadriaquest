import {UNARMED} from './combat-profile.js';

// Items contribute bonuses; damage comes from the shared formulas (docs/COMBAT.md).
export const GEAR={
 swords:{slot:'main',name:'Stone Sword',style:'melee',power:6,accuracy:6,baseInterval:2.55,range:1,proficiency:'sword',damageTypes:['slashing'],requirements:{'melee.technique':1}},
 copperDagger:{slot:'main',name:'Copper Dagger',style:'melee',power:10,accuracy:10,baseInterval:2.55,range:1,proficiency:'dagger',damageTypes:['piercing','slashing'],requirements:{'melee.technique':1}},
 shields:{slot:'off',name:'Wooden Shield',shield:true,resistance:30,requirements:{'prof.shield':1}},
 copperShield:{slot:'off',name:'Copper Shield',shield:true,resistance:50,requirements:{'prof.shield':1}},
 bows:{slot:'main',name:'Training Bow',twoHanded:true,style:'ranged',power:10,accuracy:10,baseInterval:2.55,range:6,proficiency:'bow',ammo:'arrows',damageTypes:['piercing'],requirements:{'ranged.technique':1}},
 hats:{slot:'head'}
};
export function createEquipment({inventory,busy=()=>false,changed=()=>{}}){
 const slots={main:null,off:null,head:null};
 function refresh(){for(const slot of Object.keys(slots))if(!(inventory[slots[slot]]>0))slots[slot]=null;}
 function toggle(id){refresh();const item=GEAR[id];if(!item||!(inventory[id]>0)||busy())return false;
  if(slots[item.slot]===id)slots[item.slot]=null;
  else {if(item.twoHanded)slots.off=null;if(item.slot==='off'&&GEAR[slots.main]?.twoHanded)slots.main=null;slots[item.slot]=id;}
  changed();return true;
 }
 return {refresh,toggle,isEquipped(id){refresh();return Object.values(slots).includes(id);},
  get slots(){refresh();return {...slots};},
  get attack(){refresh();return {...(GEAR[slots.main]||UNARMED),item:slots.main};},
  get shield(){refresh();return GEAR[slots.off]?.shield?{...GEAR[slots.off],item:slots.off}:null;},
  get state(){refresh();return Object.fromEntries(Object.keys(GEAR).map(id=>[id,Object.values(slots).includes(id)]));},
  reset(){for(const slot of Object.keys(slots))slots[slot]=null;changed();},
  inventoryActions(id){return id in GEAR?[{label:this.isEquipped(id)?'Unequip':'Equip',disabled:busy()||!(inventory[id]>0),run:()=>toggle(id)}]:[];}
 };
}
