import {attackAnimation,combatEquipmentVisible} from './combat-animation.js';
import {createBowPresentation} from './bow-presentation.js';
import {heldTool,heldToolHand} from './tool-models.js';
import {makeTopHat} from './finale-models.js';
import {GEAR,SIDES} from './equipment.js';

// A hand item in either hand. Models are authored for one hand (blades right; shields and bows left)
// and the other hand's pose is the mirror image. A shield faces out sideways, so in the other hand
// it turns about the hand to face out again. A bow lies flat in the hand's mirror plane, so it is
// its own mirror image and needs no turn (turning it would swing it away from the grip).
export function handModel(id,side){
 const model=heldTool(id),native=heldToolHand(id)===1?'left':'right';
 if(side!==native&&GEAR[id]?.shield){model.rotation.y+=Math.PI;model.position.x*=-1;model.position.z*=-1;}
 return model;
}
export function createEquipmentPresentation({hands,visual,equipment}){
 const hat=makeTopHat();hat.name='equipment-hats';hat.position.y=.79;hat.visible=false;visual.add(hat);
 // A model per hand item per hand (index 0 is the right hand), made the first time that hand holds it,
 // so scenes only carry the gear actually used. A bow's arrow rides in the drawing hand: the right
 // hand for a left-hand bow, and the reverse.
 const models={right:{},left:{}},bows={};
 const model=(side,id)=>{
  if(!models[side][id]){const i=SIDES.indexOf(side),m=handModel(id,side);m.name=`equipment-${side}-${id}`;m.visible=false;hands[i].add(m);models[side][id]=m;
   if(id==='bows')bows[side]=createBowPresentation(m,hands,1-i);}
  return models[side][id];
 };
 return {bend(amount){hat.position.x=amount;},update({motion,working=false,celebrating=false}={}){
  const carry=combatEquipmentVisible(motion?.kind)&&!working,slots=equipment.slots;
  const bow=motion?.kind==='Archery'?attackAnimation(motion.profile,motion.time):null;
  for(const side of SIDES){
   const held=GEAR[slots[side]]?.slot==='hand'?slots[side]:null;if(held)model(side,held);
   for(const [id,m] of Object.entries(models[side]))m.visible=carry&&held===id;
   bows[side]?.update(held==='bows'?bow:null,carry&&held==='bows');
  }
  hat.visible=!celebrating&&equipment.isEquipped('hats');
 }};
}
