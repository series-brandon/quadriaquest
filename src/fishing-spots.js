import {fishingSpot,animateFishingSpot} from './fishing-spot-model.js';
import {fishingHitTarget,fishingTargetHeight} from './fishing-action.js';
import {highlightResource} from './resource-highlight.js';
import {waterSettings} from './water-effects.js';
import {key} from './world.js';
import {PONDFISH} from './fishing.js';

// A map places a spot; the shared entity owns its hit target, animation and lifetime.
export function createFishingSpots(api){
 const spots=[];
 function add({tile,parent=api.scene,height=.85,loot=PONDFISH,label='Fish for Pondfish',guide=()=>false,onStart,onCatch}){
  const group=fishingSpot();group.position.set(tile.x-6,height,tile.z-6);parent.add(group);
  const spot={x:tile.x,z:tile.z,tile,group,kind:'fish',fishing:true,ready:true,opened:false,duration:0,label,loot,onStart,onCatch,guide};
  spot.available=()=>spots.includes(spot)&&api.world.get(key(spot.x,spot.z))===tile&&tile.water&&spot.ready&&!spot.opened;
  spot.highlight=highlightResource(group,{height:1.5});
  const hit=fishingHitTarget();hit.userData={actor:spot,tile,portraitIgnore:true};group.add(hit);spot.hitTarget=hit;api.pickables.push(hit);spots.push(spot);return spot;
 }
 function remove(spot){
  const index=spots.indexOf(spot);if(index<0)return;
  spot.opened=true;spot.group.removeFromParent();spots.splice(index,1);
  const hitIndex=api.pickables.indexOf(spot.hitTarget);if(hitIndex>=0)api.pickables.splice(hitIndex,1);
  spot.group.traverse(object=>{object.geometry?.dispose();if(object.material&&(!object.userData.portraitIgnore||object.isSprite))object.material.dispose();});spot.hitTarget.material.dispose();
 }
 function update(time){for(const spot of spots){spot.group.visible=spot.available();if(!spot.group.visible)continue;spot.hitTarget.position.y=fishingTargetHeight(waterSettings);animateFishingSpot(spot.group,time);spot.highlight.update(spot.guide(),time,api.hover()===spot);}}
 return {add,remove,update};
}
