import * as THREE from 'three';
function part(group,geometry,material){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
export function makeCrystal(){
  const group=new THREE.Group(),vertices=[.12,2.05,-.04];
  const radii=[.48,.59,.46,.56,.43,.51];
  for(let ring=0;ring<2;ring++)for(let i=0;i<6;i++){const a=i*Math.PI/3,r=radii[i]*(ring?.68:1);vertices.push(Math.cos(a)*r,(ring?.52:1.4)+(i%3)*.06,Math.sin(a)*r);}
  vertices.push(-.08,.18,.05);
  const indices=[];
  for(let i=0;i<6;i++){const j=(i+1)%6;indices.push(0,1+j,1+i,1+i,1+j,7+j,1+i,7+j,7+i,13,7+i,7+j);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
  const flat=geometry.toNonIndexed();flat.computeVertexNormals();geometry.dispose();
  part(group,flat,new THREE.MeshStandardMaterial({color:'#82cbd2',metalness:.22,roughness:.24,emissive:'#25778c',emissiveIntensity:.3}));
  return group;
}
export function animateCrystal(group,time,baseY=0){group.position.y=baseY+.12+Math.sin(time*1.8)*.1;}
