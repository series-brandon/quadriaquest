import * as THREE from 'three';
import {buildChunkTerrain} from './chunk-terrain.js';
import {createResourceEntity,RESOURCE_RESPAWN} from './resource-entities.js';
import {key} from './world.js';
import {CHUNK,BAND,chunkOf,chunkGap} from './world-grid.js';

// Chunk streaming (docs/DESIGN.md, World scale and streaming; chunks are world-grid.js CHUNK tiles
// square): keeps the chunks around the player resident, loads nearer ones first within a per-frame time
// budget, building each in steps (its tiles a few rows at a time, then terrain, resources, dressing and extras in batches) so a chunk
// never has to finish in one frame, and releases far ones behind a hysteresis band (`band` tiles past the radius; world-grid.js BAND). Loaded tiles go into the live `tiles` map(s), so pathfinding, picking, minimap and
// occupancy work unchanged; missing tiles stay unwalkable. Entity state (depletion, respawn time)
// lives outside the chunks by stable id, so leaving and returning never resets or duplicates it.
//   source    {tile(x, z) → tile|null, entities(tiles) → [{id, kind, x, z}]}
//   maps      the live tile maps to fill (the world map and the area's own)
//   topColor(tile) → THREE.Color: the tile's top (grass, water); terrain is built by chunk-terrain.js,
//             looking up loaded tiles, then the source (edge seams and sides at unloaded borders)
//   resources the shared resource actions (add/remove/snapshot/restore)
//   place     (entry, {tile, parent, tileAt}, saved) → handle|null, for the source's extras(tiles)
//             (fishing spots, enemies, props): a handle has dispose(), and optionally busy() (keeps its
//             chunk loaded) and save() (state remembered by id until it is placed again)
//   dress     (tiles, {root, tileAt}) → {dispose()}: more of a chunk's look (streamed water), built and
//             released with it
const BATCH=16,ROWS=4;
export function createChunkStreamer({source,maps,parent,pickables,resources,topColor,place=null,dress=null,radius=1,band=BAND,budgetMs=4,now=()=>performance.now(),respawn=RESOURCE_RESPAWN}){
 const chunks=new Map(),state=new Map(),group=new THREE.Group();parent.add(group);
 let time=0,lastBuildMs=0,builtTotal=0,center=null,delay=0,bounds=false,pending=null;
 const boundsMaterial=new THREE.LineBasicMaterial({color:'#ff4fa3',transparent:true,opacity:.85,depthTest:false});
 const tileAt=(x,z)=>maps[0].get(key(x,z))??source.tile(x,z);
 // Builds a chunk step by step (a generator: each yield is a point where the frame may end). Its tiles
 // are made a few rows at a time (generating land is the costly part); then the chunk is registered with
 // them, so walking and unloading see it, and the rest fills in.
 function* build(cx,cz){
  const tiles=[];
  for(let z=cz*CHUNK;z<(cz+1)*CHUNK;z++){for(let x=cx*CHUNK;x<(cx+1)*CHUNK;x++){const t=source.tile(x,z);if(t)tiles.push(t);}if((z+1)%ROWS===0&&z+1<(cz+1)*CHUNK)yield;}
  for(const t of tiles)for(const map of maps)map.set(key(t.x,t.z),t);
  // A chunk with no land here (inside a city that builds its own) is only remembered as loaded.
  if(!tiles.length){chunks.set(`${cx},${cz}`,{cx,cz,tiles,root:null,meshes:[],nodes:[],extras:[],outline:null});return;}
  const root=new THREE.Group();root.name=`chunk ${cx},${cz}`;group.add(root);
  const chunk={cx,cz,tiles,root,meshes:[],nodes:[],extras:[],dressed:null,outline:null};chunks.set(`${cx},${cz}`,chunk);
  const {mesh,lines}=buildChunkTerrain({tiles,tileAt,topColor});root.add(mesh,lines);pickables.push(mesh);chunk.meshes.push(mesh);
  // Chunk outline (playground overlay), hidden unless bounds are shown.
  const x0=cx*CHUNK-6-.5,z0=cz*CHUNK-6-.5,y=2.2,outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[0,0],[CHUNK,0],[CHUNK,CHUNK],[0,CHUNK]].map(([a,b])=>new THREE.Vector3(x0+a,y,z0+b))),boundsMaterial);
  outline.renderOrder=20;outline.visible=bounds;outline.name='chunk-outline';root.add(outline);chunk.outline=outline;
  yield;
  const entities=source.entities(tiles);
  for(let i=0;i<entities.length;i++){const e=entities[i];
   const tile=maps[0].get(key(e.x,e.z));
   const node=resources.add(createResourceEntity({kind:e.kind,species:e.species,tile,parent:root,pickables,id:e.id,respawn}));
   const saved=state.get(e.id);
   if(saved){const respawnIn=saved.respawnAt===null?null:Math.max(0,saved.respawnAt-time);if(saved.depleted&&respawnIn!==0)resources.restore(node,{depleted:true,respawnIn});state.delete(e.id);}
   chunk.nodes.push(node);
   if((i+1)%BATCH===0)yield;
  }
  if(dress){yield;chunk.dressed=dress(tiles,{root,tileAt});}
  if(place&&source.extras){yield;
   const extras=source.extras(tiles);
   for(let i=0;i<extras.length;i++){const e=extras[i];const tile=tileAt(e.x,e.z);if(!tile)continue;const saved=state.get(e.id);state.delete(e.id);const handle=place(e,{tile,parent:root,tileAt},saved);if(handle)chunk.extras.push({id:e.id,handle});if((i+1)%BATCH===0)yield;}
  }
 }
 // Runs the chunk being built until it is done or the frame's budget (from `start`) is spent; returns
 // whether it finished. `start` null runs it to the end.
 function advance(start){
  while(pending){const t0=now();const step=pending.steps.next();pending.ms+=now()-t0;
   if(step.done){lastBuildMs=pending.ms;builtTotal++;pending=null;return true;}
   if(start!==null&&now()-start>=budgetMs)return false;}
  return true;
 }
 function load(cx,cz){pending={id:`${cx},${cz}`,steps:build(cx,cz),ms:0};advance(null);}
 function unload(id){
  const chunk=chunks.get(id);
  // Resource timers keep running while a chunk is away: a felled tree regrows on schedule.
  for(const node of chunk.nodes){const s=resources.snapshot(node);if(s.depleted)state.set(node.id,{depleted:true,respawnAt:s.respawnIn===null?null:time+s.respawnIn});resources.remove(node);}
  chunk.dressed?.dispose();
  for(const {id,handle} of chunk.extras){const saved=handle.save?.();if(saved!==undefined&&saved!==null)state.set(id,saved);handle.dispose();}
  for(const mesh of chunk.meshes){const i=pickables.indexOf(mesh);if(i>=0)pickables.splice(i,1);}
  chunk.root?.traverse(o=>{o.geometry?.dispose();});chunk.root?.removeFromParent();
  for(const t of chunk.tiles)for(const map of maps)if(map.get(key(t.x,t.z))===t)map.delete(key(t.x,t.z));
  chunks.delete(id);
 }
 const busy=chunk=>chunk.nodes.some(node=>resources.snapshot(node).busy)||chunk.extras.some(e=>e.handle.busy?.());
 return {
  group,
  // Load synchronously around a tile (arrivals: the neighborhood must exist before landing).
  prime(x,z,r=radius){advance(null);const [cx,cz]=chunkOf(x,z);for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(!chunks.has(`${cx+dx},${cz+dz}`))load(cx+dx,cz+dz);center=[cx,cz];},
  update(dt,tile){
   time+=dt;if(!tile)return;
   const [cx,cz]=chunkOf(tile.x,tile.z);center=[cx,cz];
   // Far chunks go first (past radius × CHUNK + band tiles); nothing busy (being chopped, falling) is unloaded.
   // The chunk being built stays until it is done (it was wanted a moment ago; the next update may drop it).
   for(const [id,chunk] of [...chunks])if(id!==pending?.id&&chunkGap(chunk.cx,chunk.cz,tile.x,tile.z)>radius*CHUNK+band&&!busy(chunk))unload(id);
   if(delay>0){delay-=dt;return;}
   const start=now();
   if(!advance(start))return;
   const wanted=[];for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)if(!chunks.has(`${cx+dx},${cz+dz}`))wanted.push([cx+dx,cz+dz,Math.max(Math.abs(dx),Math.abs(dz))]);
   wanted.sort((a,b)=>a[2]-b[2]);
   for(const [x,z] of wanted){if(now()-start>=budgetMs)break;pending={id:`${x},${z}`,steps:build(x,z),ms:0};if(!advance(start))break;}
  },
  // Playground: simulate slow loading (seconds before the next load), change the radius.
  stall(seconds){delay=seconds;},
  set showBounds(value){bounds=!!value;for(const c of chunks.values())if(c.outline)c.outline.visible=bounds;},get showBounds(){return bounds;},
  set radius(value){radius=Math.max(1,Math.min(6,value|0));},get radius(){return radius;},
  get loaded(){return chunks.size;},
  get stats(){let tiles=0,entities=0;for(const c of chunks.values()){tiles+=c.tiles.length;entities+=c.nodes.length+c.extras.length;}return {chunks:chunks.size,tiles,entities,remembered:state.size,lastBuildMs:+lastBuildMs.toFixed(1),built:builtTotal,building:pending?.id??null,center};},
  isLoaded:(x,z)=>chunks.has(chunkOf(x,z).join(',')),
  // Rebuilds the given chunks (ids) that are loaded around a change to their source's tiles: they unload
  // (keeping entity state by id), change() runs, and they load again. A town's editor uses it, so trees
  // and cover follow a road painted through them (town-ground.js townSource).
  reload(ids,change){advance(null);const gone=[...ids].filter(id=>chunks.has(id));for(const id of gone)unload(id);const out=change();
   for(const id of gone)load(...id.split(',').map(Number));return out;},
  reset(){pending=null;for(const id of [...chunks.keys()])unload(id);state.clear();time=0;builtTotal=0;},
 };
}
