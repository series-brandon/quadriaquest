import * as THREE from 'three';
import {key} from './world.js';

// Adjacent grass tiles meet flush; only exposed ledges receive a rounded edge.
export function tileTopGeometry(tile,map,radius=.065){
 const exposed=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>{const n=map.get(key(tile.x+dx,tile.z+dz));return !n||n.h<tile.h||n.water;});
 const verts=[],indices=[];
 for(let ring=0;ring<=3;ring++){
  const a=ring/3*Math.PI/2,inset=radius*(1-Math.cos(a)),y=tile.h-radius+radius*Math.sin(a);
  const x0=-.5+(exposed[0]?inset:0),x1=.5-(exposed[1]?inset:0),z0=-.5+(exposed[2]?inset:0),z1=.5-(exposed[3]?inset:0);
  verts.push(x0,y,z0,x0,y,z1,x1,y,z1,x1,y,z0);
  if(ring<3)for(let j=0;j<4;j++){const a=ring*4+j,b=ring*4+(j+1)%4;indices.push(a,b,b+4,a,b+4,a+4);}
 }
 indices.push(12,13,14,12,14,15);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
