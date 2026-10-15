import * as THREE from 'three';
import {CHUNK,REGION} from '../world-grid.js';

// Playground overlay of the world grid (docs/WORLD.md, Glossary): chunk lines in pink and region lines in
// gold (wider), drawn along tile edges just above the ground, over everything. Each line is a flat ribbon,
// a bright core on a dark edge, so it reads on light ground (sand, snow, paths) as well as dark. Dev only
// (the world editor).
//   createGridOverlay({tiles, parent}) → {dispose()}   tiles: Map of the built map's tiles
const ribbon=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthTest:false,depthWrite:false,side:THREE.DoubleSide});
const LOOKS={region:[{width:.2,material:ribbon('#2b1f00',.85)},{width:.09,material:ribbon('#ffd23f',1)}],chunk:[{width:.12,material:ribbon('#33081f',.7)},{width:.05,material:ribbon('#ff6fb5',1)}]};
export function createGridOverlay({tiles,parent}){
 const lines={chunk:[],region:[]},lift=.06;
 for(const t of tiles.values()){
  // A tile on a line draws its west (x) or north (z) edge, at the higher of the two sides.
  for(const [axis,v] of [['x',t.x],['z',t.z]]){if(v%CHUNK!==0)continue;
   const other=tiles.get(axis==='x'?`${t.x-1},${t.z}`:`${t.x},${t.z-1}`),y=Math.max(t.h,other?.h??t.h)+lift;
   lines[v%REGION===0?'region':'chunk'].push({axis,x:t.x-6.5,z:t.z-6.5,y});}
 }
 const group=new THREE.Group();group.name='grid-overlay';group.renderOrder=20;
 for(const [kind,segments] of Object.entries(lines)){if(!segments.length)continue;
  LOOKS[kind].forEach(({width,material},layer)=>{const h=width/2,positions=new Float32Array(segments.length*12),index=[];
   // A quad along the tile edge, `width` across it (a little past each end, so the joins close).
   segments.forEach(({axis,x,z,y},i)=>{const q=axis==='x'?[[x-h,z-h],[x+h,z-h],[x+h,z+1+h],[x-h,z+1+h]]:[[x-h,z-h],[x+1+h,z-h],[x+1+h,z+h],[x-h,z+h]];
    q.forEach(([a,b],k)=>positions.set([a,y+layer*.002,b],i*12+k*3));const v=i*4;index.push(v,v+1,v+2,v,v+2,v+3);});
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(index);
   const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=20+layer+(kind==='region'?2:0);mesh.name=`${kind}-lines`;group.add(mesh);});}
 parent.add(group);
 return {group,dispose(){group.removeFromParent();for(const s of group.children)s.geometry.dispose();}};
}

// The outline of a set of tiles ([[x, z]]), drawn over everything just above the ground: the city
// editor's selection (yellow) and its pending placement (cyan, `color`).
export function createCellOutline({cells,tiles,parent,color='#ffe14d'}){
 const inside=new Set(cells.map(([x,z])=>`${x},${z}`)),points=[],lift=.09;
 for(const [x,z] of cells){const t=tiles.get(`${x},${z}`),y=(t?.h??1)+lift;
  for(const [dx,dz,a,b] of [[0,-1,[-.5,-.5],[.5,-.5]],[0,1,[-.5,.5],[.5,.5]],[-1,0,[-.5,-.5],[-.5,.5]],[1,0,[.5,-.5],[.5,.5]]])
   if(!inside.has(`${x+dx},${z+dz}`))points.push(x-6+a[0],y,z-6+a[1],x-6+b[0],y,z-6+b[1]);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:1,depthTest:false}));
 lines.renderOrder=21;lines.name='cell-outline';parent.add(lines);
 return {lines,dispose(){lines.removeFromParent();geometry.dispose();lines.material.dispose();}};
}

// A painted cell map (biomes or terrain; docs/BIOMES.md, Placing biomes): a strong tint over each painted
// cell in its colour, and dark lines wherever the paint changes (painted or not), drawn just above the
// ground and over everything so it reads on any ground. Unpainted cells (the default) aren't tinted.
//   createBiomeOverlay({cells:{'cx,cz': id}, cell, colors:{id: '#hex'}, heightAt(x, z), parent, origin, bounds})
//   bounds [x0, z0, x1, z1] (map tiles): where borders are drawn (the map), else around the painted cells.
const borderMaterial=new THREE.LineBasicMaterial({color:'#1d1b22',transparent:true,opacity:.85,depthTest:false});
export function createBiomeOverlay({cells,cell=8,colors,heightAt,parent,origin=[0,0],bounds=null}){
 const entries=Object.entries(cells),group=new THREE.Group();group.name='biome-overlay';parent.add(group);
 const geometry=new THREE.PlaneGeometry(cell-.2,cell-.2).rotateX(-Math.PI/2),material=new THREE.MeshBasicMaterial({transparent:true,opacity:.5,depthTest:false,depthWrite:false});
 const [ox,oz]=origin,h=(x,z)=>heightAt(Math.round(x),Math.round(z))??1;
 if(entries.length){
  const mesh=new THREE.InstancedMesh(geometry,material,entries.length),m=new THREE.Matrix4(),c=new THREE.Color();
  entries.forEach(([id,value],i)=>{const [cx,cz]=id.split(',').map(Number),x=cx*cell+cell/2-.5-ox,z=cz*cell+cell/2-.5-oz;
   m.makeTranslation(x-6,h(x,z)+.25,z-6);mesh.setMatrixAt(i,m);mesh.setColorAt(i,c.set(colors[value]||'#ffffff'));});
  mesh.renderOrder=19;mesh.name='biome-cells';group.add(mesh);}
 // Borders: every cell edge whose two sides differ, a short segment per tile so it follows the ground.
 const at=(cx,cz)=>cells[`${cx},${cz}`]??null,points=[];
 const [x0,z0,x1,z1]=bounds||(()=>{const xs=entries.map(([k])=>+k.split(',')[0]),zs=entries.map(([k])=>+k.split(',')[1]);return entries.length?[Math.min(...xs)*cell-ox-cell,Math.min(...zs)*cell-oz-cell,(Math.max(...xs)+2)*cell-ox,(Math.max(...zs)+2)*cell-oz]:[0,0,0,0];})();
 for(let cz=Math.floor((z0+oz)/cell);cz<=Math.floor((z1+oz)/cell);cz++)for(let cx=Math.floor((x0+ox)/cell);cx<=Math.floor((x1+ox)/cell);cx++)for(const [dx,dz] of [[1,0],[0,1]]){
  if(at(cx,cz)===at(cx+dx,cz+dz))continue;
  for(let k=0;k<cell;k++){const ex=dx?(cx+1)*cell-ox-.5:cx*cell+k-ox,ez=dz?(cz+1)*cell-oz-.5:cz*cell+k-oz;
   if(ex<x0-1||ez<z0-1||ex>x1||ez>z1)continue;const [ax,az,bx,bz]=dx?[ex,ez-.5,ex,ez+.5]:[ex-.5,ez,ex+.5,ez],y=Math.max(h(ex-dx*.5,ez-dz*.5),h(ex+dx*.5,ez+dz*.5))+.3;
   points.push(ax-6,y,az-6,bx-6,y,bz-6);}}
 if(points.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const lines=new THREE.LineSegments(g,borderMaterial);lines.renderOrder=20;lines.name='biome-borders';group.add(lines);}
 return {group,dispose(){group.removeFromParent();geometry.dispose();material.dispose();group.traverse(o=>{if(o.isLineSegments)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});}};
}

// A see-through fill over tiles, each in its own colour ({x, z, color}), just above the ground and over
// everything: the world editor's placement and brush previews (green where it fits, red where it doesn't).
//   createCellFill({cells, heightAt(x, z), parent, opacity}) → {dispose()}
const fillGeometry=new THREE.PlaneGeometry(.94,.94).rotateX(-Math.PI/2);
export function createCellFill({cells,heightAt,parent,opacity=.42}){
 const material=new THREE.MeshBasicMaterial({transparent:true,opacity,depthTest:false,depthWrite:false});
 const mesh=new THREE.InstancedMesh(fillGeometry,material,Math.max(1,cells.length)),m=new THREE.Matrix4(),c=new THREE.Color();
 mesh.count=cells.length;cells.forEach(({x,z,color},i)=>{m.makeTranslation(x-6,(heightAt(x,z)??1)+.07,z-6);mesh.setMatrixAt(i,m);mesh.setColorAt(i,c.set(color));});
 mesh.renderOrder=22;mesh.name='cell-fill';mesh.frustumCulled=false;parent.add(mesh);
 return {mesh,dispose(){mesh.removeFromParent();material.dispose();mesh.dispose();}};
}
// Wall faces lit up (the world editor's wall tools: Walls, wall paint): a panel just off each face, in its colour,
// with a bright frame. faces: [{t, n, color}] (the face of the edge between tiles t and n that looks onto t);
// height: how tall the walls stand.
export function createFaceFill({faces,height=1.5,parent,opacity=.85}){
 const pos=[],col=[],lines=[],c=new THREE.Color(),off=.09;
 for(const {t,n,color} of faces){const nx=t.x-n.x,nz=t.z-n.z,mx=(t.x+n.x)/2-6+nx*off,mz=(t.z+n.z)/2-6+nz*off,ax=-nz*.5,az=nx*.5,y0=Math.min(t.h,n.h)+.02,y1=Math.max(t.h,n.h)+height-.02;
  const q=[[mx-ax,y0,mz-az],[mx+ax,y0,mz+az],[mx+ax,y1,mz+az],[mx-ax,y1,mz-az]];c.set(color);
  for(const i of [0,1,2,0,2,3]){pos.push(...q[i]);col.push(c.r,c.g,c.b);}for(const [a,b] of [[0,1],[1,2],[2,3],[3,0]])lines.push(...q[a],...q[b]);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=22;mesh.name='face-fill';mesh.frustumCulled=false;
 const frameGeometry=new THREE.BufferGeometry();frameGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
 const frameMaterial=new THREE.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:.95,depthTest:false});const frame=new THREE.LineSegments(frameGeometry,frameMaterial);frame.renderOrder=23;frame.frustumCulled=false;
 parent.add(mesh,frame);
 return {mesh,dispose(){mesh.removeFromParent();frame.removeFromParent();geometry.dispose();material.dispose();frameGeometry.dispose();frameMaterial.dispose();}};
}
