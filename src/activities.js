export const CRUDE_AXE = {duration:2,sticks:1,stones:1};
export function canCraftAxe(inventory){return inventory.sticks>=1&&inventory.stones>=1;}
export function craftAxe(inventory){
  if(!canCraftAxe(inventory))return null;
  return {kind:'craft',elapsed:0,duration:CRUDE_AXE.duration,status:'active'};
}
export function cancelActivity(action){if(action?.status==='active')action.status='cancelled';}
export function tickCraft(action,dt,inventory){
  if(!action||action.kind!=='craft'||action.status!=='active')return false;
  action.elapsed+=dt;
  if(action.elapsed<action.duration)return false;
  if(!canCraftAxe(inventory)){action.status='cancelled';return false;}
  inventory.sticks--;inventory.stones--;inventory.axes=(inventory.axes||0)+1;action.status='complete';return true;
}
export function chopTree(inventory,tree,random=Math.random){
  if(!(inventory.axes>0)||tree.felled)return null;
  return {kind:'chop',tree,elapsed:0,duration:3+random()*3,logs:1+Math.floor(Math.min(.999999,random())*3),status:'active'};
}
