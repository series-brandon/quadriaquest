import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function makeAxe({wood=new THREE.MeshStandardMaterial({color:'#a98a64',roughness:.8}),rock=new THREE.MeshStandardMaterial({color:'#a5ada6',roughness:.8})}={}){
 const group=new THREE.Group();group.rotation.y=-Math.PI/2;
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.023,.028,.43,6),wood);handle.position.y=.17;
 const head=new THREE.Mesh(new RoundedBoxGeometry(.2,.14,.075,2,.025),rock);head.position.set(.065,.35,0);
 for(const m of [handle,head]){m.castShadow=m.receiveShadow=true;group.add(m);}return group;
}
