import * as THREE from 'three';
import {tileTopGeometry} from './tile-top.js';

// Fast terrain for a streamed chunk: one vertex-colored indexed mesh (tops and visible sides) and one
// set of seam lines, written straight into typed arrays. Indexed, a tile's rounded top is 16 shared
// vertices instead of 78 (a chunk's mesh is about a quarter of the size to build, upload and keep). It matches makeTerrainTile's look: the rounded top
// comes from tileTopGeometry, which only depends on which of the four edges are exposed, so its 16
// shapes are built once and copied; sides are only drawn where a neighbor is lower or missing (the
// per-tile box's hidden faces are skipped). Faces map back to tiles for picking (`tileForFace`).
//   buildChunkTerrain({tiles, tileAt(x, z), topColor(tile) → THREE.Color, sideColor, seamColor, offset})
//   tileAt sees loaded tiles first, then the source, so sides and seams at unloaded borders are right.
const R=.065,DIRS=[[-1,0],[1,0],[0,-1],[0,1]];
// Ramps (docs/TOWN.md, Ramps): a tile with `ramp: {dir}` slopes from tile.h on its uphill edge (dir, the way up)
// to tile.h − RISE on the others. Its height where it meets a neighbour is rampEdge's.
export const RISE=.5,RAMP_UP={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]};
// A tile's height along its edge towards (dx, dz): its own, or a ramp's there (the top of its uphill edge, the
// foot of the others).
export function rampEdge(t,dx,dz){if(!t?.ramp)return t?.h;const [ux,uz]=RAMP_UP[t.ramp.dir];return dx===ux&&dz===uz?t.h:t.h-RISE;}
const templates=new Map();
function topTemplate(mask){
 if(!templates.has(mask)){
  const map={get:k=>{const [x,z]=k.split(',').map(Number),i=DIRS.findIndex(([dx,dz])=>dx===x&&dz===z);return mask&(1<<i)?{h:-1}:{h:0};}};
  const geometry=tileTopGeometry({x:0,z:0,h:0},map),index=geometry.index?Array.from(geometry.index.array):[...Array(geometry.attributes.position.count).keys()];
  templates.set(mask,{position:geometry.attributes.position.array,normal:geometry.attributes.normal.array,index});
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
 const side=new THREE.Color(sideColor),top15=topTemplate(15),vertexLimit=tiles.length*(top15.position.length/3+16),indexLimit=tiles.length*(top15.index.length+24);
 const position=new Float32Array(vertexLimit*3),normal=new Float32Array(vertexLimit*3),color=new Float32Array(vertexLimit*3),ranges=[],seams=[];let n=0;
 const indices=vertexLimit>65535?new Uint32Array(indexLimit):new Uint16Array(indexLimit);let ni=0;
 const push=(x,y,z,nx,ny,nz,c)=>{position[n]=x;normal[n]=nx;color[n++]=c.r;position[n]=y;normal[n]=ny;color[n++]=c.g;position[n]=z;normal[n]=nz;color[n++]=c.b;};
 // A numeric grid of the chunk plus a one-tile border: neighbor lookups without string keys.
 let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;for(const t of tiles){if(t.x<x0)x0=t.x;if(t.z<z0)z0=t.z;if(t.x>x1)x1=t.x;if(t.z>z1)z1=t.z;}
 x0--;z0--;x1++;z1++;const w=x1-x0+1,grid=new Array(w*(z1-z0+1));
 for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)if(x===x0||x===x1||z===z0||z===z1)grid[(z-z0)*w+x-x0]=tileAt(x,z);
 for(const t of tiles)grid[(t.z-z0)*w+t.x-x0]=t;
 const at=(x,z)=>grid[(z-z0)*w+x-x0];
 for(const tile of tiles){
  // A tile with its own model (a bridge deck, a stair's treads) is only a neighbour here.
  if(tile.noTerrain||tile.stair)continue;
  const neighbors=DIRS.map(([dx,dz])=>at(tile.x+dx,tile.z+dz));
  // A neighbour's height where it meets this tile (a ramp's slopes away).
  const meets=DIRS.map(([dx,dz],i)=>neighbors[i]?rampEdge(neighbors[i],-dx,-dz):0);
  if(tile.ramp){rampTile(tile,neighbors,meets);continue;}
  const mask=neighbors.reduce((m,n,i)=>(!n||meets[i]<tile.h||n.water?m|(1<<i):m),0);
  const top=topTemplate(mask),c=topColor(tile),ox=tile.x-offset,oz=tile.z-offset;
  const first=n/3;for(let i=0;i<top.position.length;i+=3)push(top.position[i]+ox,top.position[i+1]+tile.h,top.position[i+2]+oz,top.normal[i],top.normal[i+1],top.normal[i+2],c);
  for(const i of top.index)indices[ni++]=first+i;
  // Visible sides only: from the neighbor's height (or the ground) up to the rounded top edge.
  const y1=tile.h-R;
  DIRS.forEach(([dx,dz],i)=>{
   const near=neighbors[i],y0=near?Math.max(0,meets[i]-R):0;if(y1<=y0)return;
   const ex=ox+dx*.5,ez=oz+dz*.5,ax=dz!==0?.5:0,az=dx!==0?.5:0;
   const a=[ex-ax,ez-az],b=[ex+ax,ez+az];
   // Wound to face outward (along the direction).
   const [p,q]=dx>0||dz<0?[b,a]:[a,b];
   const v=n/3;push(p[0],y0,p[1],dx,0,dz,side);push(q[0],y0,q[1],dx,0,dz,side);push(q[0],y1,q[1],dx,0,dz,side);push(p[0],y1,p[1],dx,0,dz,side);
   indices[ni++]=v;indices[ni++]=v+1;indices[ni++]=v+2;indices[ni++]=v;indices[ni++]=v+2;indices[ni++]=v+3;
  });
  ranges.push({end:ni/3,tile});
  // Seams where this tile meets an equal or higher grass neighbor (north and west edges).
  for(const [dx,dz,a,b] of [[0,-1,[-.5,-.5],[.5,-.5]],[-1,0,[-.5,-.5],[-.5,.5]]]){const n=at(tile.x+dx,tile.z+dz);if(n&&!n.water&&n.h>=tile.h)seams.push(ox+a[0],tile.h+.002,oz+a[1],ox+b[0],tile.h+.002,oz+b[1]);}
 }
 // A ramp: its sloped top (no rounding), and trapezoid sides wherever a neighbour stands lower than its edge.
 function rampTile(tile,neighbors,meets){
  const c=topColor(tile),ox=tile.x-offset,oz=tile.z-offset,[ux,uz]=RAMP_UP[tile.ramp.dir],y=(cx,cz)=>tile.h-RISE/2+(cx*ux+cz*uz)*RISE;
  const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],ys=corners.map(([cx,cz])=>y(cx,cz));
  // The top's normal: across the slope (rise RISE over one tile, uphill along (ux, uz)).
  const len=Math.hypot(RISE,1),nx=-ux*RISE/len,ny=1/len,nz=-uz*RISE/len,v=n/3;
  corners.forEach(([cx,cz],i)=>push(ox+cx,ys[i],oz+cz,nx,ny,nz,c));
  indices[ni++]=v;indices[ni++]=v+2;indices[ni++]=v+1;indices[ni++]=v;indices[ni++]=v+3;indices[ni++]=v+2;
  DIRS.forEach(([dx,dz],i)=>{
   const near=neighbors[i],y0=near?Math.max(0,meets[i]):0,ex=ox+dx*.5,ez=oz+dz*.5,ax=dz!==0?.5:0,az=dx!==0?.5:0;
   const a=[ex-ax,ez-az],b=[ex+ax,ez+az],ya=y(a[0]-ox,a[1]-oz),yb=y(b[0]-ox,b[1]-oz);if(Math.max(ya,yb)<=y0+1e-4)return;
   const [p,q,yp,yq]=dx>0||dz<0?[b,a,yb,ya]:[a,b,ya,yb],w=n/3;
   push(p[0],y0,p[1],dx,0,dz,side);push(q[0],y0,q[1],dx,0,dz,side);push(q[0],Math.max(y0,yq),q[1],dx,0,dz,side);push(p[0],Math.max(y0,yp),p[1],dx,0,dz,side);
   indices[ni++]=w;indices[ni++]=w+1;indices[ni++]=w+2;indices[ni++]=w;indices[ni++]=w+2;indices[ni++]=w+3;
  });
  ranges.push({end:ni/3,tile});
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setIndex(new THREE.BufferAttribute(indices.slice(0,ni),1));geometry.setAttribute('position',new THREE.BufferAttribute(position.slice(0,n),3));geometry.setAttribute('normal',new THREE.BufferAttribute(normal.slice(0,n),3));geometry.setAttribute('color',new THREE.BufferAttribute(color.slice(0,n),3));
 const mesh=new THREE.Mesh(geometry,sharedMaterial(roughness));mesh.castShadow=mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;
 mesh.userData.tileForFace=face=>{let lo=0,hi=ranges.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(face<ranges[mid].end)hi=mid;else lo=mid+1;}return ranges[lo]?.tile;};
 const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));
 const lines=new THREE.LineSegments(seamGeometry,seamMaterial(seamColor));lines.matrixAutoUpdate=false;
 return {mesh,lines};
}
