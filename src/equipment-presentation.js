import {heldTool} from './tool-models.js';
import {makeTopHat} from './finale-models.js';
import {GEAR} from './equipment.js';
export function createEquipmentPresentation({hands,visual,equipment}){
 const models={};for(const [id,gear] of Object.entries(GEAR)){const m=id==='hats'?makeTopHat():heldTool(id);models[id]=m;(gear.slot==='head'?visual:hands[gear.slot==='off'?1:0]).add(m);if(id==='hats')m.position.y=.79;m.visible=false;}
 return {bend(amount){models.hats.position.x=amount;},update({motion,working=false,celebrating=false}={}){
  const carry=(!motion||['Combat','Archery'].includes(motion.kind))&&!working;
  for(const [id,m] of Object.entries(models))m.visible=equipment.isEquipped(id)&&(id==='hats'?!celebrating:carry);
 }};
}
