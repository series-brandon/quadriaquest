import {attackAnimation,combatEquipmentVisible} from './combat-animation.js';
import {createBowPresentation} from './bow-presentation.js';
import {heldTool,heldToolHand} from './tool-models.js';
import {makeTopHat} from './finale-models.js';
import {GEAR} from './equipment.js';
export function createEquipmentPresentation({hands,visual,equipment}){
 const models={};for(const [id,gear] of Object.entries(GEAR)){if(gear.armor)continue;const m=id==='hats'?makeTopHat():heldTool(id);models[id]=m;m.name='equipment-'+id;(gear.slot==='head'?visual:hands[heldToolHand(id)]).add(m);if(id==='hats')m.position.y=.79;m.visible=false;}
 // Off-hand-eligible weapons get a second model in the left hand for dual wielding.
 const offModels={};for(const [id,gear] of Object.entries(GEAR))if(gear.offHand){const m=heldTool(id);m.name='equipment-off-'+id;hands[1].add(m);m.visible=false;offModels[id]=m;}
 const bowPresentation=createBowPresentation(models.bows,hands);
 return {bend(amount){models.hats.position.x=amount;},update({motion,working=false,celebrating=false}={}){
  const carry=combatEquipmentVisible(motion?.kind)&&!working;
  const bow=motion?.kind==='Archery'?attackAnimation(motion.profile,motion.time):null;bowPresentation.update(bow,carry&&equipment.isEquipped('bows'));
  const slots=equipment.slots;
  for(const [id,m] of Object.entries(models))m.visible=(GEAR[id]?.offHand?slots.main===id:equipment.isEquipped(id))&&(id==='hats'?!celebrating:carry);
  for(const [id,m] of Object.entries(offModels))m.visible=slots.off===id&&carry;
 }};
}
