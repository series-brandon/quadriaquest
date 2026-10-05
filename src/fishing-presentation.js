import * as THREE from 'three';
import {makeFishingRod,updateFishingCast,updateFishingRodMotion,resetFishingRodMotion} from './fishing-rod.js';
import {makePondfish} from './fish-model.js';
import {holdUpMotion} from './catch-motion.js';

export function createFishingPresentation({player,hands}){
 const rod=makeFishingRod(),fish=makePondfish();hands[0].add(rod);hands[0].parent.add(fish);rod.visible=fish.visible=false;
 function clear(){rod.visible=fish.visible=false;resetFishingRodMotion(rod);}
 // Run after the shared player pose and supporting hand have been applied.
 function update(motion){
  rod.visible=['Fishing','Fishing cast','Fishing catch'].includes(motion?.kind);
  fish.visible=!!motion?.fishing&&motion.kind==='Celebration';
  if(fish.visible){const {prop}=holdUpMotion(motion.time,'fish');fish.position.set(0,prop.y,prop.z);}
  if(!rod.visible){resetFishingRodMotion(rod);return;}
  const anchor=motion.spot?motion.spot.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.025,0)):player.localToWorld(new THREE.Vector3(0,.02,1.7));
  if(motion.kind==='Fishing cast')updateFishingCast(rod,anchor,motion.time);
  else updateFishingRodMotion(rod,anchor,motion.kind==='Fishing catch'?motion.time:null);
 }
 return {update,clear,rod,fish};
}
