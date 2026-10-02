import * as THREE from 'three';

// Every area uses these same bundles; each instance owns its transforms and metadata.
export function createGroundItemModel(kind){
 const group=new THREE.Group();
 const material=new THREE.MeshStandardMaterial({color:kind==='sticks'?'#a98a64':kind==='flint'?'#59687a':'#a5ada6',roughness:.75});
 for(let j=0;j<3;j++){
  const item=new THREE.Mesh(kind==='sticks'?new THREE.CylinderGeometry(.045,.055,.6,6):new THREE.IcosahedronGeometry(.12+j*.025,0),material);
  if(kind==='sticks'){
   item.rotation.set(Math.PI/2,.2+j*.6,.2);
   item.position.set((j-1)*.13,.09+j*.045,(j-1)*.07);
  }else item.position.set((j-1)*.15,.12,j%2*.1);
  item.castShadow=true;item.receiveShadow=true;group.add(item);
 }
 return group;
}
