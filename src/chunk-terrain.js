import * as THREE from 'three';
import {tileTopGeometry} from './tile-top.js';

// Fast terrain for a streamed chunk: one vertex-colored mesh (tops and visible sides) and one set of
// seam lines, written straight into typed arrays. It matches makeTerrainTile's look: the rounded top
// comes from tileTopGeometry, which only depends on which of the four edges are exposed, so its 16
// shapes are built once and copied; sides are only drawn where a neighbor is lower or missing (the
// per-tile box's hidden faces are skipped). Faces map back to tiles for picking (`tileForFace`).
//   buildChunkTerrain({tiles, tileAt(x, z), topColor(tile) → THREE.Color, sideColor, seamColor, offset})
//   tileAt sees loaded tiles first, then the source, so sides and seams at unloaded borders are right.
const R=.065,DIRS=[[-1,0],[1,0],[0,-1],[0,1]];
const templates=new Map();
function topTemplate(mask){
 if(!templates.has(mask)){
  const map={get:k=>{const [x,z]=k.split(',').map(Number),i=DIRS.findIndex(([dx,dz])=>dx===x&&dz===z);return mask&(1<<i)?{h:-1}:{h:0};}};
  const geometry=tileTopGeometry({x:0,z:0,h:0},map).toNonIndexed();
  templates.set(mask,{position:geometry.attributes.position.array,normal:geometry.attributes.normal.array});
  geometry.dispose();
 }
 return templates.get(mask);
}
const materials=new Map();
function sharedMaterial(roughness){if(!materials.has(roughness)){const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness});m.userData.shared=true;materials.set(roughness,m);}return materials.get(roughness);}
const lineMaterials=new Map();
function seamMaterial(color){const k=new THREE.Color(color).getHex();if(!lineMaterials.has(k)){const m=new THREE.LineBasicMaterial({color:k,transparent:true,opacity:.16});m.userData.shared=true;lineMaterials.set(k,m);}return lineMaterials.get(k);}

export function buildChunkTerrain({tiles,tileAt,topColor,sideColor='#a5a084',seamColor='#72865c',offset=6,roughness=.9}){
 // Typed arrays sized for the worst case (every tile with every edge exposed and all four sides).
 const side=new THREE.Color(sideColor),limit=tiles.length*(topTemplate(15).position.length/3+24)*3;
 const position=new Float32Array(limit),normal=new Float32Array(limit),color=new Float32Array(limit),ranges=[],seams=[];let n=0;
 const push=(x,y,z,nx,ny,nz,c)=>{position[n]=x;normal[n]=nx;color[n++]=c.r;position[n]=y;normal[n]=ny;color[n++]=c.g;position[n]=z;normal[n]=nz;color[n++]=c.b;};
 // A numeric grid of the chunk plus a one-tile border: neighbor lookups without string keys.
 let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;for(const t of tiles){if(t.x<x0)x0=t.x;if(t.z<z0)z0=t.z;if(t.x>x1)x1=t.x;if(t.z>z1)z1=t.z;}
 x0--;z0--;x1++;z1++;const w=x1-x0+1,grid=new Array(w*(z1-z0+1));
 for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)if(x===x0||x===x1||z===z0||z===z1)grid[(z-z0)*w+x-x0]=tileAt(x,z);
 for(const t of tiles)grid[(t.z-z0)*w+t.x-x0]=t;
 const at=(x,z)=>grid[(z-z0)*w+x-x0];
 for(const tile of tiles){
  const neighbors=DIRS.map(([dx,dz])=>at(tile.x+dx,tile.z+dz));
  const mask=neighbors.reduce((m,n,i)=>(!n||n.h<tile.h||n.water?m|(1<<i):m),0);
  const top=topTemplate(mask),c=topColor(tile),ox=tile.x-offset,oz=tile.z-offset;
  for(let i=0;i<top.position.length;i+=3)push(top.position[i]+ox,top.position[i+1]+tile.h,top.position[i+2]+oz,top.normal[i],top.normal[i+1],top.normal[i+2],c);
  // Visible sides only: from the neighbor's height (or the ground) up to the rounded top edge.
  const y1=tile.h-R;
  DIRS.forEach(([dx,dz],i)=>{
   const n=neighbors[i],y0=n?Math.max(0,n.h-R):0;if(y1<=y0)return;
   const ex=ox+dx*.5,ez=oz+dz*.5,ax=dz!==0?.5:0,az=dx!==0?.5:0;
   const a=[ex-ax,ez-az],b=[ex+ax,ez+az];
   // Wound to face outward (along the direction).
   const [p,q]=dx>0||dz<0?[b,a]:[a,b];
   push(p[0],y0,p[1],dx,0,dz,side);push(q[0],y0,q[1],dx,0,dz,side);push(q[0],y1,q[1],dx,0,dz,side);
   push(p[0],y0,p[1],dx,0,dz,side);push(q[0],y1,q[1],dx,0,dz,side);push(p[0],y1,p[1],dx,0,dz,side);
  });
  ranges.push({end:n/9,tile});
  // Seams where this tile meets an equal or higher grass neighbor (north and west edges).
  for(const [dx,dz,a,b] of [[0,-1,[-.5,-.5],[.5,-.5]],[-1,0,[-.5,-.5],[-.5,.5]]]){const n=at(tile.x+dx,tile.z+dz);if(n&&!n.water&&n.h>=tile.h)seams.push(ox+a[0],tile.h+.002,oz+a[1],ox+b[0],tile.h+.002,oz+b[1]);}
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(position.slice(0,n),3));geometry.setAttribute('normal',new THREE.BufferAttribute(normal.slice(0,n),3));geometry.setAttribute('color',new THREE.BufferAttribute(color.slice(0,n),3));
 const mesh=new THREE.Mesh(geometry,sharedMaterial(roughness));mesh.castShadow=mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;
 mesh.userData.tileForFace=face=>{let lo=0,hi=ranges.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(face<ranges[mid].end)hi=mid;else lo=mid+1;}return ranges[lo]?.tile;};
 const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));
 const lines=new THREE.LineSegments(seamGeometry,seamMaterial(seamColor));lines.matrixAutoUpdate=false;
 return {mesh,lines};
}
