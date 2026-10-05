import * as THREE from 'three';

// Portable water marker, shared by world entities and the model catalogue.
export function fishingSpot(){
 const group=new THREE.Group();group.userData.blocksMovement=false;
 for(let i=0;i<3;i++){
  const ring=new THREE.Mesh(new THREE.RingGeometry(.27,.30,48),new THREE.MeshBasicMaterial({color:'#d6f6ef',transparent:true,opacity:.6,toneMapped:false,depthWrite:false,side:THREE.DoubleSide}));
  ring.position.y=.07+i*.001;ring.rotation.x=-Math.PI/2;ring.renderOrder=3;ring.name='fishing-ripple';ring.userData.phase=i/3;group.add(ring);
 }
 return group;
}
export function animateFishingSpot(group,time){
 for(const ring of group.children){if(ring.name!=='fishing-ripple')continue;const phase=(time*.38+ring.userData.phase)%1;ring.scale.setScalar(.35+phase*1.15);ring.material.opacity=Math.sin(phase*Math.PI)*.8;}
}
