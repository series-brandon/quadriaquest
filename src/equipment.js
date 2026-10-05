export function createEquipment({inventory,busy=()=>false,changed=()=>{}}){
 const slots={swords:false,shields:false,hats:false};
 function refresh(){for(const id of Object.keys(slots))if(!(inventory[id]>0))slots[id]=false;}
 function toggle(id){refresh();if(!(id in slots)||!(inventory[id]>0)||busy())return false;slots[id]=!slots[id];changed();return true;}
 return {refresh,toggle,isEquipped(id){refresh();return !!slots[id];},get state(){refresh();return {...slots};},reset(){for(const id of Object.keys(slots))slots[id]=false;changed();},inventoryActions(id){return id in slots?[{label:this.isEquipped(id)?'Unequip':'Equip',disabled:busy()||!(inventory[id]>0),run:()=>toggle(id)}]:[];}};
}
