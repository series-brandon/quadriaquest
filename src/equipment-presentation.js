import {heldTool} from './tool-models.js';
import {makeTopHat} from './finale-models.js';

export function createEquipmentPresentation({hands,visual,equipment}){
 const sword=heldTool('swords'),shield=heldTool('shields'),hat=makeTopHat();
 hands[0].add(sword);hands[1].add(shield);visual.add(hat);hat.position.y=.79;
 for(const model of [sword,shield,hat])model.visible=false;
 return {bend(amount){hat.position.x=amount;},update({motion,working=false,celebrating=false}={}){
  const carry=(!motion||motion.kind==='Combat')&&!working;
  sword.visible=equipment.isEquipped('swords')&&carry;shield.visible=equipment.isEquipped('shields')&&carry;hat.visible=equipment.isEquipped('hats')&&!celebrating;
 }};
}
