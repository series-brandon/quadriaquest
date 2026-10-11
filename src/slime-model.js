import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSlimeFace} from './slime-face.js';
import {markCharacter} from './world-occupancy.js';
// Hands never bend (slime-bend.js reshapes the body and face only), so every slime shares one hand
// geometry: uploaded once, marked shared so disposers leave it alone.
let hand=null;
function handGeometry(){if(!hand){hand=new THREE.SphereGeometry(.105,12,10);hand.userData.shared=true;}return hand;}
// Every slime is a living character, so it never blocks movement (world-occupancy.js).
export function makeSlime(color='#a4ce77'){
 const group=markCharacter(new THREE.Group()),material=new THREE.MeshStandardMaterial({color,roughness:.4});
 const body=new THREE.Mesh(new RoundedBoxGeometry(.72,.72,.72,4,.16),material);body.position.y=.43;body.castShadow=body.receiveShadow=true;group.add(body);
 const face=createSlimeFace();face.setBodyColor(color);face.set('idle');group.add(face.group);
 const hands=[-.46,.46].map(x=>{const hand=new THREE.Mesh(handGeometry(),material);hand.position.set(x,.33,.08);hand.castShadow=hand.receiveShadow=true;group.add(hand);return hand;});
 return {group,body,face,hands};
}
