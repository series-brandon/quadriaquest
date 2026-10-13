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
