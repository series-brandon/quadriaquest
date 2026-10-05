import * as THREE from 'three';
import {campfire,animateCampfire} from './campfire-model.js';
import {interactionRoute} from './interaction-route.js';
import {highlightResource} from './resource-highlight.js';
import {key} from './world.js';

import {validCampTile} from './placement-rules.js';
// Stations belong to tile instances, not named areas. Switching maps preserves them.
export function createCampfires(api){
 const stations=[],ghost=campfire(true);api.scene.add(ghost);ghost.visible=false;
 let placing=false,pending=null;
 const controls=document.createElement('section');controls.id='placement-controls';controls.hidden=true;
 controls.innerHTML='<strong>Choose a clear tile</strong><button type="button">Cancel</button>';document.body.append(controls);
 const current=a=>api.world.get(key(a.x,a.z))===a.tile&&!a.opened;
 const fire=()=>stations.find(current);
 const position=t=>new THREE.Vector3(t.x-6,t.water?.86:t.h,t.z-6);
 function cancel(){placing=false;pending=null;ghost.visible=false;controls.hidden=true;}
 controls.querySelector('button').onclick=cancel;
 function status(tile){
  if(!validCampTile(tile,{occupied:api.occupied(tile)}))return {valid:false,label:'Can’t place Campfire here',reason:'Choose an empty, clear land tile for your Campfire.'};
  if(!interactionRoute(api.world,api.tile(),{x:tile.x,z:tile.z,tile}))return {valid:false,label:'No safe route to place Campfire',reason:'There is no safe route to place your Campfire there.'};
  return {valid:true,label:'Place Campfire here'};
 }
 function showGhost(tile,valid){ghost.visible=!!tile;if(tile){ghost.position.copy(position(tile));ghost.traverse(m=>{if(m.isMesh)m.material.color.set(valid?'#88dc94':'#ed7777');});}}
 function begin(){
  if(api.busy()||!api.inventory.campfires)return;
  if(fire()){api.toast('Pack up your existing Campfire first.');return;}
  if(api.defer?.(begin,'Place Campfire'))return;
  api.stop();api.closeMenus();placing=true;controls.hidden=false;
 }
 function hoverPlacement(tile){if(!placing)return null;const result=status(tile);showGhost(tile,result.valid);return result;}
 function selectPlacement(tile){
  const result=hoverPlacement(tile);if(!result)return;
  if(!result.valid){api.toast(result.reason);if(tile)api.feedback.pulse(position(tile),false);return;}
  placing=false;controls.hidden=true;
  const marker={x:tile.x,z:tile.z,tile,group:ghost,kind:'place',campfire:true,ready:true,opened:false,duration:0};
  api.approach(marker);pending=tile;showGhost(tile,true);
 }
 function place(tile){
  const valid=status(tile).valid;cancel();
  if(!api.inventory.campfires||!valid||fire()){api.toast('That spot is no longer available.');return null;}
  const group=campfire(),a={x:tile.x,z:tile.z,tile,group,kind:'fire',campfire:true,label:'Use Campfire',ready:true,opened:false,duration:0};
  group.position.copy(position(tile));api.scene.add(group);tile.blocked=true;
  group.traverse(m=>{if(m.isMesh){m.userData.actor=a;m.userData.tile=tile;api.pickables.push(m);}});
  a.highlight=highlightResource(group,{height:1.5});stations.push(a);
  api.inventory.campfires--;api.showItems({campfires:-1});api.onPlaced?.(a);return a;
 }
 function remove(a){
  a.opened=true;a.tile.blocked=false;a.group.removeFromParent();
  for(let i=api.pickables.length-1;i>=0;i--)if(api.pickables[i].userData.actor===a)api.pickables.splice(i,1);
  a.group.traverse(m=>{m.geometry?.dispose();if(m.material&&!m.userData.portraitIgnore)for(const material of [m.material].flat())material.dispose();});
  stations.splice(stations.indexOf(a),1);
 }
 function open(a=fire()){
  if(!a||!current(a))return;api.stop();
  api.cookingMenu.open({available:()=>current(a),pack(){if(!current(a))return;remove(a);api.inventory.campfires++;api.showItems({campfires:1});},onCooked:id=>api.onCooked?.(id,a)});
 }
 return {begin,place,open,cancel,hoverPlacement,selectPlacement,
  get placing(){return placing;},get placementTile(){return pending;},get current(){return fire();},
  interact(a){if(a.kind==='place')place(a.tile);else open(a);},
  inventoryActions:id=>id==='campfires'?[{label:'Place',disabled:api.busy()||!!fire(),run:begin}]:[],
  reset(tiles){cancel();for(const a of [...stations])if(!tiles||tiles.get(key(a.x,a.z))===a.tile)remove(a);},
  update(time){for(const a of stations){a.group.visible=current(a);if(a.group.visible){animateCampfire(a.group,time);a.highlight.update(!!api.guide?.(),time,api.hover()===a);}}}
 };
}
