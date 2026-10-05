export const GEAR={
 swords:{slot:'main',min:3,max:5,interval:1.5,range:1,style:'melee'},
 copperDagger:{slot:'main',min:3,max:5,interval:1.5,range:1,style:'melee'},
 shields:{slot:'off',mitigation:1},copperShield:{slot:'off',mitigation:1},
 bows:{slot:'main',twoHanded:true,min:2,max:4,interval:1.7,range:4,style:'ranged',ammo:'arrows'},
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
  get attack(){refresh();return {...(GEAR[slots.main]||{min:1,max:3,interval:1.5,range:1,style:'unarmed'}),item:slots.main};},
  get mitigation(){refresh();return GEAR[slots.off]?.mitigation||0;},
  get state(){refresh();return Object.fromEntries(Object.keys(GEAR).map(id=>[id,Object.values(slots).includes(id)]));},
  reset(){for(const slot of Object.keys(slots))slots[slot]=null;changed();},
  inventoryActions(id){return id in GEAR?[{label:this.isEquipped(id)?'Unequip':'Equip',disabled:busy()||!(inventory[id]>0),run:()=>toggle(id)}]:[];}
 };
}
