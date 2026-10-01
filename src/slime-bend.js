import * as THREE from 'three';

// A height-weighted sideways bend: the bottom stays fixed and horizontal.
export function bendOffset(height,amount){const t=Math.max(0,Math.min(1,(height-.07)/.72));return amount*t*t;}
export function createSlimeBend(visual,parts){
  const point=new THREE.Vector3(),normal=new THREE.Vector3();
  const meshes=[];
  for(const part of parts)part.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const matrix=new THREE.Matrix4();
    for(let node=mesh;node&&node!==visual;node=node.parent){node.updateMatrix();matrix.premultiply(node.matrix);}
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
    meshes.push({mesh,matrix,normalMatrix,inverseNormal:normalMatrix.clone().invert(),inverse:matrix.clone().invert(),positions:mesh.geometry.attributes.position.array.slice(),normals:mesh.geometry.attributes.normal.array.slice()});
  });
  let previous=0;
  return amount=>{
    if(Math.abs(amount-previous)<.00001)return;
    previous=amount;
    for(const {mesh,matrix,inverse,normalMatrix,inverseNormal,positions,normals}of meshes){
      const geometry=mesh.geometry,attribute=geometry.attributes.position;
      for(let i=0;i<attribute.count;i++){
        point.fromArray(positions,i*3).applyMatrix4(matrix);
        // Transform the original smooth normal by the bend's inverse transpose.
        // Rebuilding normals from non-indexed triangles introduces visible facets.
        const height=point.y,slope=height>.07&&height<.79?2*amount*(height-.07)/(.72*.72):0;
        normal.fromArray(normals,i*3).applyMatrix3(normalMatrix);
        normal.y-=slope*normal.x;
        normal.applyMatrix3(inverseNormal).normalize();
        geometry.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);
        point.x+=bendOffset(point.y,amount);point.applyMatrix4(inverse);
        attribute.setXYZ(i,point.x,point.y,point.z);
      }
      attribute.needsUpdate=true;
      if(amount===0){geometry.attributes.normal.array.set(normals);geometry.attributes.normal.needsUpdate=true;}
      else geometry.attributes.normal.needsUpdate=true;
      geometry.computeBoundingSphere();
    }
  };
}
