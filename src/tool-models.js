import {trainingTool} from './training-models.js';
import * as THREE from 'three';
import {makeFishingRod} from './fishing-rod.js';
import {part} from './model-parts.js';
import {makeAxe} from './axe-model.js';
import {makePickaxe} from './mining.js';
export function tool(kind){
 if(['copperDagger','copperShield','bows','arrows'].includes(kind))return trainingTool(kind);
 const g=new THREE.Group();
 if(kind==='swords'){part(g,new THREE.BoxGeometry(.13,.65,.07),'#b1c4cd',0,.35,0);part(g,new THREE.BoxGeometry(.34,.07,.09),'#957145',0,.05);part(g,new THREE.CylinderGeometry(.035,.035,.23,6),'#674933',0,-.08);}
 // Crude Shield: sticks lashed into a round face, a cross-brace and a rock for a boss.
 if(kind==='crudeShield'){part(g,new THREE.CylinderGeometry(.27,.27,.09,8),'#ae8056').rotation.x=Math.PI/2;for(const x of [-.14,0,.14])part(g,new THREE.BoxGeometry(.05,.5,.035),'#8f6a45',x,0,.05);part(g,new THREE.BoxGeometry(.07,.45,.11),'#cdb281');part(g,new THREE.DodecahedronGeometry(.075,0),'#9aa19b',0,0,.09);}
 if(kind==='hammers'){part(g,new THREE.CylinderGeometry(.03,.035,.38,6),'#98704e',0,.11);part(g,new THREE.BoxGeometry(.26,.15,.15),'#a1aaa5',0,.30);}
 if(kind==='rods')return makeFishingRod();
 if(kind==='crudeAxe')return makeAxe();
 if(kind==='pickaxes')return makePickaxe();
 // A simple wooden staff topped with a glowing crystal; the grip is the origin (about a third up).
 if(kind==='staffs'){part(g,new THREE.CylinderGeometry(.028,.038,1.2,7),'#6b4a2f',0,.22,0);part(g,new THREE.TorusGeometry(.075,.018,6,14),'#8a6a44',0,.86,0);const gem=part(g,new THREE.OctahedronGeometry(.085,0),'#d7b8ff',0,.9,0);gem.material.emissive=new THREE.Color('#9b6bff');gem.material.emissiveIntensity=.8;}
 return g;
}
// A tool carried while idle, in the right hand. A fishing rod rests over the shoulder (the grip is the
// pivot and the shaft rises backward across that shoulder); anything else is held as when working.
export function carriedTool(kind){if(kind!=='rods')return heldTool(kind);const group=tool(kind);group.rotation.set(-.95,0,-.12);group.position.set(0,-.1,0);return group;}
// Inventory slots and physical gripping hands differ for a two-handed bow.
export function heldToolHand(kind){return ['crudeShield','copperShield','bows'].includes(kind)?1:0;}
// A held rod rests on the shoulder (the carry transform); other items are held as authored.
export function heldTool(kind){if(kind==='rods')return carriedTool('rods');const group=tool(kind);if(kind==='bows')group.position.z=-.22;if(['swords','crudeShield','hammers','copperDagger','copperShield'].includes(kind))group.rotation.y=Math.PI/2;return group;}
