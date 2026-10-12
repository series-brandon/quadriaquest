import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Merges the static, always-visible meshes of some objects into one vertex-coloured mesh per material
// kind under `root` (a city chunk): building decorations (awnings, sign boards, flower boxes) and props
// nobody clicks (lamps, crates, barrels, hedges, trees in grates…). One draw per chunk instead of one per
// object (docs/PERFORMANCE.md). Textured meshes (sign icons) and anything pickable stay as they are.
// The source meshes leave the scene; their objects (props) keep their gameplay data.
const materials=new Map();
function materialFor(source){
 const basic=source.isMeshBasicMaterial,id=basic?'basic':`standard:${source.roughness??1}:${source.metalness??0}`;
 if(!materials.has(id)){const m=basic?new THREE.MeshBasicMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:source.roughness??1,metalness:source.metalness??0});m.userData.shared=true;materials.set(id,m);}
 return materials.get(id);
}
export function mergeStatic(root,objects,{name='static-merged'}={}){
 root.updateMatrixWorld(true);
 const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),buckets=new Map(),taken=[],color=new THREE.Color();
 for(const object of objects){object.updateMatrixWorld(true);
  object.traverse(mesh=>{
   if(!mesh.isMesh||Array.isArray(mesh.material)||mesh.material.map||mesh.userData.actor||!mesh.visible)return;
   const geometry=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone());
   if(geometry.attributes.uv)geometry.deleteAttribute('uv');
   geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
   if(!(mesh.material.vertexColors&&geometry.attributes.color)){
    const n=geometry.attributes.position.count,colors=new Float32Array(n*3);color.copy(mesh.material.color);
    for(let i=0;i<n;i++){colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));}
   if(!geometry.attributes.normal)geometry.computeVertexNormals();
   const material=materialFor(mesh.material);if(!buckets.has(material))buckets.set(material,{list:[],shadow:false});
   const bucket=buckets.get(material);bucket.list.push(geometry);bucket.shadow||=mesh.castShadow;taken.push(mesh);
  });
 }
 for(const mesh of taken)mesh.removeFromParent();
 const out=[];
 for(const [material,{list,shadow}] of buckets){const merged=new THREE.Mesh(mergeGeometries(list),material);for(const g of list)g.dispose();
  merged.name=name;merged.castShadow=shadow&&!material.isMeshBasicMaterial;merged.receiveShadow=!material.isMeshBasicMaterial;merged.matrixAutoUpdate=false;root.add(merged);out.push(merged);}
 return out;
}
