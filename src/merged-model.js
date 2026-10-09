import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A static model's parts merged into one mesh with per-vertex colors: one draw call (and one shadow
// draw) instead of one per part, and one shared material per look instead of one per part. The model
// stays its own object, so per-entity animation, picking and highlights work on it unchanged.
//   mergedMesh([{geometry, color, position, rotation, scale}], {roughness, flatShading})
const materials=new Map();
export function sharedVertexColorMaterial({roughness=.9,flatShading=false}={}){
 const key=`${roughness}|${flatShading}`;
 if(!materials.has(key)){const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness,flatShading});material.userData.shared=true;materials.set(key,material);}
 return materials.get(key);
}
const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),euler=new THREE.Euler(),position=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color();
export function mergedMesh(parts,options={}){
 const geometries=parts.map(part=>{
  // Mixed indexed (cylinders) and non-indexed (polyhedra) parts merge as non-indexed triangles.
  const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();part.geometry.dispose();
  geometry.deleteAttribute('uv');
  matrix.compose(position.set(...(part.position??[0,0,0])),quaternion.setFromEuler(euler.set(...(part.rotation??[0,0,0]))),scale.set(...(part.scale??[1,1,1])));
  geometry.applyMatrix4(matrix);
  color.set(part.color);
  const count=geometry.attributes.position.count,colors=new Float32Array(count*3);
  for(let i=0;i<count;i++)colors.set([color.r,color.g,color.b],i*3);
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return geometry;
 });
 const mesh=new THREE.Mesh(mergeGeometries(geometries),sharedVertexColorMaterial(options));
 for(const geometry of geometries)geometry.dispose();
 mesh.castShadow=mesh.receiveShadow=true;
 return mesh;
}
