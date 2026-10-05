import {trainingTool} from './training-models.js';
import * as THREE from 'three';
import {makeFishingRod} from './fishing-rod.js';
import {part} from './model-parts.js';
export function tool(kind){
 if(['copperDagger','copperShield','bows','arrows'].includes(kind))return trainingTool(kind);
 const g=new THREE.Group();
 if(kind==='swords'){part(g,new THREE.BoxGeometry(.13,.65,.07),'#b1c4cd',0,.35,0);part(g,new THREE.BoxGeometry(.34,.07,.09),'#957145',0,.05);part(g,new THREE.CylinderGeometry(.035,.035,.23,6),'#674933',0,-.08);}
 if(kind==='shields'){part(g,new THREE.CylinderGeometry(.27,.27,.09,8),'#ae8056').rotation.x=Math.PI/2;part(g,new THREE.BoxGeometry(.07,.45,.11),'#cdb281');}
 if(kind==='hammers'){part(g,new THREE.CylinderGeometry(.03,.035,.38,6),'#98704e',0,.11);part(g,new THREE.BoxGeometry(.26,.15,.15),'#a1aaa5',0,.30);}
 if(kind==='rods')return makeFishingRod();
 return g;
}
// Inventory slots and physical gripping hands differ for a two-handed bow.
export function heldToolHand(kind){return ['shields','copperShield','bows'].includes(kind)?1:0;}
export function heldTool(kind){const group=tool(kind);if(kind==='bows')group.position.z=-.22;if(['swords','shields','hammers','copperDagger','copperShield'].includes(kind))group.rotation.y=Math.PI/2;return group;}
