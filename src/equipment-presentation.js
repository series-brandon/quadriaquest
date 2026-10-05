import {attackAnimation,combatEquipmentVisible} from './combat-animation.js';
import {createBowPresentation} from './bow-presentation.js';
import {heldTool,heldToolHand} from './tool-models.js';
import {makeTopHat} from './finale-models.js';
import {GEAR} from './equipment.js';
export function createEquipmentPresentation({hands,visual,equipment}){
 const models={};for(const [id,gear] of Object.entries(GEAR)){const m=id==='hats'?makeTopHat():heldTool(id);models[id]=m;m.name='equipment-'+id;(gear.slot==='head'?visual:hands[heldToolHand(id)]).add(m);if(id==='hats')m.position.y=.79;m.visible=false;}
 const bowPresentation=createBowPresentation(models.bows,hands);
 return {bend(amount){models.hats.position.x=amount;},update({motion,working=false,celebrating=false}={}){
  const carry=combatEquipmentVisible(motion?.kind)&&!working;
  const bow=motion?.kind==='Archery'?attackAnimation(motion.profile,motion.time):null;bowPresentation.update(bow,carry&&equipment.isEquipped('bows'));
  for(const [id,m] of Object.entries(models))m.visible=equipment.isEquipped(id)&&(id==='hats'?!celebrating:carry);
 }};
}
