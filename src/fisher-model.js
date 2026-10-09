import {makeSlime} from './slime-model.js';
import * as THREE from 'three';
import {part} from './model-parts.js';
// Reed's look. He carries his rod over the shoulder through the shared slime presentation
// (createSlimeActor with carry:'rods'), like any slime could.
export function fisher(){
 const slime=makeSlime('#66a6ad'),{group}=slime;
 part(group,new THREE.SphereGeometry(.37,16,8,0,Math.PI*2,0,Math.PI/2),'#cbb58a',0,.78);
 part(group,new THREE.CylinderGeometry(.47,.47,.045,16),'#bba074',0,.78,.06);
 return slime;
}
