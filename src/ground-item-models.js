import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';

// Every area uses these same bundles; each instance owns its transforms and metadata. The three
// pieces are one merged mesh (a single draw and shadow draw).
export function createGroundItemModel(kind){
 const group=new THREE.Group();
 group.userData.blocksMovement=false;
 const color=kind==='sticks'?'#a98a64':kind==='flint'?'#59687a':'#a5ada6';
 group.add(cachedMergedMesh('ground:'+kind,()=>[0,1,2].map(j=>kind==='sticks'
  ?{geometry:new THREE.CylinderGeometry(.045,.055,.6,6),color,rotation:[Math.PI/2,.2+j*.6,.2],position:[(j-1)*.13,.09+j*.045,(j-1)*.07]}
  :{geometry:new THREE.IcosahedronGeometry(.12+j*.025,0),color,position:[(j-1)*.15,.12,j%2*.1]}),{roughness:.75}));
 return group;
}
