import {attackAnimation,combatEquipmentVisible} from './combat-animation.js';
import {createBowPresentation} from './bow-presentation.js';
import {heldTool,heldToolHand} from './tool-models.js';
import {SLIME_ANCHORS,WORN_MODELS} from './worn-gear.js';
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
 // Worn gear: a model per worn item (worn-gear.js), made the first time it is worn, at its slot's anchor.
 const worn={},wornModel=id=>{if(!worn[id]&&WORN_MODELS[id]){const m=WORN_MODELS[id]();m.name=`equipment-${id}`;m.visible=false;visual.add(m);worn[id]=m;}return worn[id];};
 let bendAmount=0;
 // A model per hand item per hand (index 0 is the right hand), made the first time that hand holds it,
 // so scenes only carry the gear actually used. A bow's arrow rides in the drawing hand: the right
 // hand for a left-hand bow, and the reverse.
 const models={right:{},left:{}},bows={};
 const model=(side,id)=>{
  if(!models[side][id]){const i=SIDES.indexOf(side),m=handModel(id,side);m.name=`equipment-${side}-${id}`;m.visible=false;hands[i].add(m);models[side][id]=m;
   if(id==='bows')bows[side]=createBowPresentation(m,hands,1-i);}
  return models[side][id];
 };
 const presentation={bend(amount){bendAmount=amount;},update({motion,working=false,celebrating=false}={}){
  const carry=combatEquipmentVisible(motion?.kind)&&!working,slots=equipment.slots;
  const bow=motion?.kind==='Archery'?attackAnimation(motion.profile,motion.time):null;
  for(const side of SIDES){
   const held=GEAR[slots[side]]?.slot==='hand'?slots[side]:null;if(held)model(side,held);
   for(const [id,m] of Object.entries(models[side]))m.visible=carry&&held===id;
   bows[side]?.update(held==='bows'?bow:null,carry&&held==='bows');
  }
  for(const [slot,anchor] of Object.entries(SLIME_ANCHORS)){
   const id=slots[slot];if(id)wornModel(id);
   for(const [itemId,m] of Object.entries(worn))if(GEAR[itemId]?.slot===slot){
    m.visible=itemId===id&&!(celebrating&&anchor.hideWhileCelebrating);
    if(m.visible){m.position.set(...anchor.position);if(anchor.bends)m.position.x+=bendAmount;}
   }
  }
 }};
 // Dressed from the start: the current gear is built and shown before the first frame, so anything that
 // copies the model straight away (a dialogue portrait opened on arrival) sees it geared.
 presentation.update();
 return presentation;
}
