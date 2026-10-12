import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSlimeFace} from './slime-face.js';
import {markCharacter} from './world-occupancy.js';
// Every slime shares one body and one hand geometry (the bend is done in the shader, slime-bend.js):
// uploaded once, marked shared so disposers leave them alone.
let hand=null,bodyShape=null;
function handGeometry(){if(!hand){hand=new THREE.SphereGeometry(.105,12,10);hand.userData.shared=true;}return hand;}
function bodyGeometry(){if(!bodyShape){bodyShape=new RoundedBoxGeometry(.72,.72,.72,4,.16);bodyShape.userData.shared=true;}return bodyShape;}
// Every slime is a living character, so it never blocks movement (world-occupancy.js).
export function makeSlime(color='#a4ce77'){
 const group=markCharacter(new THREE.Group()),material=new THREE.MeshStandardMaterial({color,roughness:.4});
 const body=new THREE.Mesh(bodyGeometry(),material);body.position.y=.43;body.castShadow=body.receiveShadow=true;group.add(body);
 const face=createSlimeFace();face.setBodyColor(color);face.set('idle');group.add(face.group);
 // Hands don't bend: their own material, sharing the body's colour (recolouring the body recolours them).
 const handMaterial=new THREE.MeshStandardMaterial({roughness:.4});handMaterial.color=material.color;
 // All slimes' hands draw together too (renderOrder), so bodies and hands don't alternate programs.
 const hands=[-.46,.46].map(x=>{const hand=new THREE.Mesh(handGeometry(),handMaterial);hand.renderOrder=2;hand.position.set(x,.33,.08);hand.castShadow=hand.receiveShadow=true;group.add(hand);return hand;});
 return {group,body,face,hands};
}
