import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSlimeFace} from './slime-face.js';
export function makeSlime(color='#a4ce77'){
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial({color,roughness:.4});
 const body=new THREE.Mesh(new RoundedBoxGeometry(.72,.72,.72,4,.16),material);body.position.y=.43;body.castShadow=body.receiveShadow=true;group.add(body);
 const face=createSlimeFace();face.setBodyColor(color);face.set('idle');group.add(face.group);
 const hands=[-.46,.46].map(x=>{const hand=new THREE.Mesh(new THREE.SphereGeometry(.105,12,10),material);hand.position.set(x,.33,.08);hand.castShadow=hand.receiveShadow=true;group.add(hand);return hand;});
 return {group,body,face,hands};
}
