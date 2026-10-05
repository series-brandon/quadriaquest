import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Static spatial batches reduce draw calls without changing tile identity or click behavior.
// This is rendering only, not chunk streaming; all supplied logical tiles remain resident.
export function createTerrainBatch({tiles,map,factory,parent,pickables,batchSize=8,offset=6}){
 const batches=new Map();
 for(const tile of tiles){const id=`${Math.floor(tile.x/batchSize)},${Math.floor(tile.z/batchSize)}`;if(!batches.has(id))batches.set(id,[]);batches.get(id).push(tile);}
 const group=new THREE.Group();parent.add(group);
 for(const members of batches.values()){
  const solids=[],lines=[],ranges=[];let faces=0;
  for(const tile of members){const model=factory(tile,map);model.position.set(tile.x-offset,0,tile.z-offset);model.updateMatrixWorld(true);
   const materials=new Set();model.traverse(m=>{if(!m.geometry)return;const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geometry.applyMatrix4(m.matrixWorld);geometry.deleteAttribute('uv');
    if(m.isLineSegments)lines.push(geometry);
    else if(m.isMesh){const color=m.material.color,values=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=color.r;values[i+1]=color.g;values[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(values,3));solids.push(geometry);faces+=geometry.attributes.position.count/3;ranges.push({end:faces,tile});}
    m.geometry.dispose();materials.add(m.material);
   });for(const material of materials)material.dispose();
  }
  const mesh=new THREE.Mesh(mergeGeometries(solids),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));mesh.receiveShadow=mesh.castShadow=true;
  mesh.userData.tileForFace=face=>{let lo=0,hi=ranges.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(face<ranges[mid].end)hi=mid;else lo=mid+1;}return ranges[lo]?.tile;};group.add(mesh);pickables.push(mesh);
  if(lines.length)group.add(new THREE.LineSegments(mergeGeometries(lines),new THREE.LineBasicMaterial({color:'#a199ad',transparent:true,opacity:.16})));
  for(const g of [...solids,...lines])g.dispose();
 }
 return group;
}
export function terrainHitData(hit){if(!hit)return null;const data=hit.object.userData;return data.tileForFace?{...data,tile:data.tileForFace(hit.faceIndex)}:data;}
