import * as THREE from 'three';
import {CHUNK,REGION} from '../world-grid.js';

// Playground overlay of the world grid (docs/WORLD.md, Glossary): chunk lines in pink and region lines
// in gold, drawn along tile edges just above the ground, over everything. Dev only (the city editor).
//   createGridOverlay({tiles, parent}) → {dispose()}   tiles: Map of the built city's tiles
const chunkMaterial=new THREE.LineBasicMaterial({color:'#ff4fa3',transparent:true,opacity:.7,depthTest:false});
const regionMaterial=new THREE.LineBasicMaterial({color:'#ffd23f',transparent:true,opacity:.95,depthTest:false});
export function createGridOverlay({tiles,parent}){
 const lines={chunk:[],region:[]},lift=.06;
 for(const t of tiles.values()){
  // A tile on a line draws its west (x) or north (z) edge, at the higher of the two sides.
  for(const [axis,v] of [['x',t.x],['z',t.z]]){if(v%CHUNK!==0)continue;
   const other=tiles.get(axis==='x'?`${t.x-1},${t.z}`:`${t.x},${t.z-1}`),y=Math.max(t.h,other?.h??t.h)+lift;
   const [a,b]=axis==='x'?[[t.x-6.5,y,t.z-6.5],[t.x-6.5,y,t.z-5.5]]:[[t.x-6.5,y,t.z-6.5],[t.x-5.5,y,t.z-6.5]];
   lines[v%REGION===0?'region':'chunk'].push(...a,...b);}
 }
 const group=new THREE.Group();group.name='grid-overlay';group.renderOrder=20;
 for(const [kind,points] of Object.entries(lines)){if(!points.length)continue;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const segments=new THREE.LineSegments(geometry,kind==='region'?regionMaterial:chunkMaterial);segments.renderOrder=20;segments.name=`${kind}-lines`;group.add(segments);}
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

// The painted biome map (docs/BIOMES.md, Placing biomes): a soft tint over each painted cell, in its
// biome's colour, just above the ground and over everything. Unpainted cells (the default) aren't drawn.
//   createBiomeOverlay({cells:{'cx,cz': biome}, cell, colors:{biome: '#hex'}, heightAt(x, z), parent})
export function createBiomeOverlay({cells,cell=8,colors,heightAt,parent}){
 const entries=Object.entries(cells),group=new THREE.Group();group.name='biome-overlay';parent.add(group);
 if(!entries.length)return {group,dispose(){group.removeFromParent();}};
 const geometry=new THREE.PlaneGeometry(cell-.3,cell-.3).rotateX(-Math.PI/2),material=new THREE.MeshBasicMaterial({transparent:true,opacity:.28,depthTest:false,depthWrite:false,vertexColors:false});
 const mesh=new THREE.InstancedMesh(geometry,material,entries.length),m=new THREE.Matrix4(),c=new THREE.Color();
 entries.forEach(([id,biome],i)=>{const [cx,cz]=id.split(',').map(Number),x=cx*cell+cell/2-.5,z=cz*cell+cell/2-.5;
  m.makeTranslation(x-6,(heightAt(Math.round(x),Math.round(z))??1)+.25,z-6);mesh.setMatrixAt(i,m);mesh.setColorAt(i,c.set(colors[biome]||'#ffffff'));});
 mesh.renderOrder=19;mesh.name='biome-cells';group.add(mesh);
 return {group,dispose(){group.removeFromParent();geometry.dispose();material.dispose();mesh.dispose();}};
}
