import * as THREE from 'three';
import {buildChunkTerrain} from './chunk-terrain.js';
import {createResourceEntity} from './resource-entities.js';
import {key} from './world.js';

// Chunk streaming (docs/DESIGN.md, World scale and streaming): keeps the chunks around the player
// resident, loads nearer ones first within a per-frame time budget, and releases far ones behind a
// hysteresis band. Loaded tiles go into the live `tiles` map(s), so pathfinding, picking, minimap and
// occupancy work unchanged; missing tiles stay unwalkable. Entity state (depletion, respawn time)
// lives outside the chunks by stable id, so leaving and returning never resets or duplicates it.
//   source    {tile(x, z) → tile|null, entities(tiles) → [{id, kind, x, z}]}
//   maps      the live tile maps to fill (the world map and the area's own)
//   topColor(tile) → THREE.Color: the tile's top (grass, water); terrain is built by chunk-terrain.js,
//             looking up loaded tiles, then the source (edge seams and sides at unloaded borders)
//   resources the shared resource actions (add/remove/snapshot/restore)
export const CHUNK_SIZE=16;
export const chunkOf=(x,z)=>[Math.floor(x/CHUNK_SIZE),Math.floor(z/CHUNK_SIZE)];
export function createChunkStreamer({source,maps,parent,pickables,resources,topColor,radius=2,keep=1,budgetMs=4,now=()=>performance.now(),respawn=8}){
 const chunks=new Map(),state=new Map(),group=new THREE.Group();parent.add(group);
 let time=0,lastBuildMs=0,builtTotal=0,center=null,delay=0,bounds=false;
 const boundsMaterial=new THREE.LineBasicMaterial({color:'#ff4fa3',transparent:true,opacity:.85,depthTest:false});
 const tileAt=(x,z)=>maps[0].get(key(x,z))??source.tile(x,z);
 function load(cx,cz){
  const tiles=[];
  for(let z=cz*CHUNK_SIZE;z<(cz+1)*CHUNK_SIZE;z++)for(let x=cx*CHUNK_SIZE;x<(cx+1)*CHUNK_SIZE;x++){const t=source.tile(x,z);if(t)tiles.push(t);}
  for(const t of tiles)for(const map of maps)map.set(key(t.x,t.z),t);
  const root=new THREE.Group();root.name=`chunk ${cx},${cz}`;group.add(root);
  const meshes=[];
  if(tiles.length){const {mesh,lines}=buildChunkTerrain({tiles,tileAt,topColor});root.add(mesh,lines);pickables.push(mesh);meshes.push(mesh);}
  const nodes=source.entities(tiles).map(e=>{
   const tile=maps[0].get(key(e.x,e.z));
   const node=resources.add(createResourceEntity({kind:e.kind,tile,parent:root,pickables,id:e.id,respawn}));
   const saved=state.get(e.id);
   if(saved){const respawnIn=saved.respawnAt===null?null:Math.max(0,saved.respawnAt-time);if(saved.depleted&&respawnIn!==0)resources.restore(node,{depleted:true,respawnIn});state.delete(e.id);}
   return node;
  });
  // Chunk outline (playground overlay), hidden unless bounds are shown.
  const x0=cx*CHUNK_SIZE-6-.5,z0=cz*CHUNK_SIZE-6-.5,y=2.2,outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[0,0],[CHUNK_SIZE,0],[CHUNK_SIZE,CHUNK_SIZE],[0,CHUNK_SIZE]].map(([a,b])=>new THREE.Vector3(x0+a,y,z0+b))),boundsMaterial);
  outline.renderOrder=20;outline.visible=bounds;outline.name='chunk-outline';root.add(outline);
  chunks.set(`${cx},${cz}`,{cx,cz,tiles,root,meshes,nodes,outline});
 }
 function unload(id){
  const chunk=chunks.get(id);
  // Resource timers keep running while a chunk is away: a felled tree regrows on schedule.
  for(const node of chunk.nodes){const s=resources.snapshot(node);if(s.depleted)state.set(node.id,{depleted:true,respawnAt:s.respawnIn===null?null:time+s.respawnIn});resources.remove(node);}
  for(const mesh of chunk.meshes){const i=pickables.indexOf(mesh);if(i>=0)pickables.splice(i,1);}
  chunk.root.traverse(o=>{o.geometry?.dispose();});chunk.root.removeFromParent();
  for(const t of chunk.tiles)for(const map of maps)if(map.get(key(t.x,t.z))===t)map.delete(key(t.x,t.z));
  chunks.delete(id);
 }
 const busy=chunk=>chunk.nodes.some(node=>resources.snapshot(node).busy);
 return {
  group,
  // Load synchronously around a tile (arrivals: the neighborhood must exist before landing).
  prime(x,z,r=radius){const [cx,cz]=chunkOf(x,z);for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(!chunks.has(`${cx+dx},${cz+dz}`))load(cx+dx,cz+dz);center=[cx,cz];},
  update(dt,tile){
   time+=dt;if(!tile)return;
   const [cx,cz]=chunkOf(tile.x,tile.z);center=[cx,cz];
   // Far chunks go first (outside radius + keep); nothing busy (being chopped, falling) is unloaded.
   for(const [id,chunk] of [...chunks])if(Math.max(Math.abs(chunk.cx-cx),Math.abs(chunk.cz-cz))>radius+keep&&!busy(chunk))unload(id);
   if(delay>0){delay-=dt;return;}
   const wanted=[];for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)if(!chunks.has(`${cx+dx},${cz+dz}`))wanted.push([cx+dx,cz+dz,Math.max(Math.abs(dx),Math.abs(dz))]);
   wanted.sort((a,b)=>a[2]-b[2]);
   const start=now();
   for(const [x,z] of wanted){const t0=now();load(x,z);lastBuildMs=now()-t0;builtTotal++;if(now()-start>=budgetMs)break;}
  },
  // Playground: simulate slow loading (seconds before the next load), change the radius.
  stall(seconds){delay=seconds;},
  set showBounds(value){bounds=!!value;for(const c of chunks.values())c.outline.visible=bounds;},get showBounds(){return bounds;},
  set radius(value){radius=Math.max(1,Math.min(6,value|0));},get radius(){return radius;},
  get loaded(){return chunks.size;},
  get stats(){let tiles=0,entities=0;for(const c of chunks.values()){tiles+=c.tiles.length;entities+=c.nodes.length;}return {chunks:chunks.size,tiles,entities,remembered:state.size,lastBuildMs:+lastBuildMs.toFixed(1),built:builtTotal,center};},
  isLoaded:(x,z)=>chunks.has(chunkOf(x,z).join(',')),
  reset(){for(const id of [...chunks.keys()])unload(id);state.clear();time=0;builtTotal=0;},
 };
}
