import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Static spatial batches reduce draw calls without changing tile identity or click behavior.
// This is rendering only, not chunk streaming; all supplied logical tiles remain resident.
// Materials in `preserve` (e.g. live-editable grass) keep their own merged meshes; all other
// solid colors are baked into one vertex-colored mesh per batch. `decorate(tile,model)` may add
// static per-tile dressing such as flowers before merging.
export function createTerrainBatch({tiles,map,factory,parent,pickables,batchSize=8,offset=6,preserve=[],decorate,roughness=.95}){
 const batches=new Map(),kept=new Set(preserve);let baked=null;const lineMaterials=new Map();
 for(const tile of tiles){const id=`${Math.floor(tile.x/batchSize)},${Math.floor(tile.z/batchSize)}`;if(!batches.has(id))batches.set(id,[]);batches.get(id).push(tile);}
 const group=new THREE.Group();parent.add(group);
 for(const members of batches.values()){
  const solids=new Map(),lines=new Map(),discard=new Set();
  for(const tile of members){const model=factory(tile,map);decorate?.(tile,model);model.position.set(tile.x-offset,0,tile.z-offset);model.updateMatrixWorld(true);
   model.traverse(m=>{if(!m.geometry)return;
    if(m.geometry.attributes.position.count===0){m.geometry.dispose();if(!kept.has(m.material))discard.add(m.material);return;}
    const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geometry.applyMatrix4(m.matrixWorld);geometry.deleteAttribute('uv');
    if(m.isLineSegments){const material=m.material,signature=`${material.color.getHex()}:${material.opacity}`;if(!lineMaterials.has(signature))lineMaterials.set(signature,material);else if(lineMaterials.get(signature)!==material)discard.add(material);if(!lines.has(signature))lines.set(signature,[]);lines.get(signature).push(geometry);}
    else if(m.isMesh){const own=kept.has(m.material),bucketKey=own?m.material:'baked';
     if(!own){const color=m.material.color,values=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<values.length;i+=3){values[i]=color.r;values[i+1]=color.g;values[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(values,3));discard.add(m.material);}
     if(!solids.has(bucketKey))solids.set(bucketKey,{geometries:[],ranges:[],faces:0});const bucket=solids.get(bucketKey);
     bucket.geometries.push(geometry);bucket.faces+=geometry.attributes.position.count/3;bucket.ranges.push({end:bucket.faces,tile});}
    m.geometry.dispose();
   });
  }
  for(const [bucketKey,{geometries,ranges}] of solids){
   const material=bucketKey==='baked'?(baked??=new THREE.MeshStandardMaterial({vertexColors:true,roughness})):bucketKey;
   const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.receiveShadow=mesh.castShadow=true;mesh.matrixAutoUpdate=false;
   mesh.userData.tileForFace=face=>{let lo=0,hi=ranges.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(face<ranges[mid].end)hi=mid;else lo=mid+1;}return ranges[lo]?.tile;};group.add(mesh);pickables.push(mesh);
   for(const g of geometries)g.dispose();
  }
  for(const [signature,geometries] of lines){const line=new THREE.LineSegments(mergeGeometries(geometries),lineMaterials.get(signature));line.matrixAutoUpdate=false;group.add(line);for(const g of geometries)g.dispose();}
  for(const material of discard)if(!kept.has(material)&&![...lineMaterials.values()].includes(material))material.dispose();
 }
 return group;
}
export function terrainHitData(hit){if(!hit)return null;const data=hit.object.userData;return data.tileForFace?{...data,tile:data.tileForFace(hit.faceIndex)}:data;}
