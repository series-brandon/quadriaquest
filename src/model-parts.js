import * as THREE from 'three';
export const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.75});
export function part(parent,geometry,color,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function namedPart(parent,name,geometry,color,x=0,y=0,z=0){const m=part(parent,geometry,color,x,y,z);m.name=name;return m;}
