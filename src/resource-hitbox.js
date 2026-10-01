import * as THREE from 'three';

// Keep this mesh visible to raycasting, but invisible to the renderer.
export function createResourceHitbox(resource,tile){
  const hitbox=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5),new THREE.MeshBasicMaterial({color:'#e9b85a',transparent:true,opacity:.22,colorWrite:false,depthWrite:false}));
  hitbox.position.y=.25;
  hitbox.userData.resource=resource;hitbox.userData.tile=tile;
  resource.group.add(hitbox);
  return hitbox;
}
