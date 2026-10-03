import * as THREE from 'three';
export function makePondfish(){
 const group=new THREE.Group(),silver=new THREE.MeshStandardMaterial({color:'#72b7bd',roughness:.42}),fin=new THREE.MeshStandardMaterial({color:'#43858e'});
 const body=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),silver);body.scale.set(.23,.10,.075);group.add(body);
 const tail=new THREE.Mesh(new THREE.ConeGeometry(.115,.17,3),fin);tail.rotation.z=-Math.PI/2;tail.position.x=-.26;group.add(tail);
 for(const z of [-.07,.07]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.016,8,6),new THREE.MeshBasicMaterial({color:'#20332d'}));eye.position.set(.13,.025,z);group.add(eye);}
 group.traverse(m=>{if(m.isMesh)m.castShadow=true;});return group;
}
