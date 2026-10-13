import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document??={createElement:()=>({getContext:()=>context})};
const {createChunkStreamer}=await import('./chunk-streamer.js');
const {CHUNK:CHUNK_SIZE,BAND}=await import('./world-grid.js');

// A flat world of 4 × 4 chunks with one tree per chunk at its corner; resources record what the streamer does.
const C=CHUNK_SIZE,W=4*C;
const source={tile:(x,z)=>x<0||z<0||x>=W||z>=W?null:{x,z,h:1,water:false,blocked:false},
 entities:tiles=>tiles.filter(t=>t.x%CHUNK_SIZE===0&&t.z%CHUNK_SIZE===0).map(t=>({id:`tree:${t.x},${t.z}`,kind:'tree',x:t.x,z:t.z}))};
function fixture(options={}){
 const world=new Map(),scene=new THREE.Group(),pickables=[],nodes=new Map();
 const resources={add(node){nodes.set(node.id,{node,depleted:false,respawnIn:null});return node;},remove(node){nodes.delete(node.id);node.dispose();},
  snapshot(node){const n=nodes.get(node.id);return {depleted:n.depleted,respawnIn:n.respawnIn,busy:!!n.busy};},
  restore(node,{depleted,respawnIn}){Object.assign(nodes.get(node.id),{depleted,respawnIn});}};
 let clock=0;
 const streamer=createChunkStreamer({source,maps:[world],parent:scene,pickables,resources,topColor:()=>new THREE.Color(),radius:1,budgetMs:1000,now:()=>clock++,...options});
 return {world,scene,pickables,nodes,streamer};
}
test('chunks around the player load, far ones unload past a hysteresis band (in tiles)',()=>{
 const f=fixture();f.streamer.prime(8,8);
 assert.equal(f.streamer.stats.tiles,4*CHUNK_SIZE*CHUNK_SIZE,'radius 1 at the world corner: the 2 × 2 chunks that exist (empty ones outside the edge stay as placeholders)');
 assert.ok(f.world.get('8,8')&&f.world.get(`${C+4},${C+4}`));assert.equal(f.world.get(`${2*C+8},${2*C+8}`),undefined,'not loaded: unwalkable');
 f.streamer.update(.1,{x:2*C+2,z:8});assert.ok(f.world.get(`${3*C+8},8`),'walking east loads ahead');
 assert.ok(f.world.get('8,8'),'just over a line, within the band, the start stays');
 f.streamer.update(.1,{x:2*C+BAND+1,z:8});assert.equal(f.world.get('8,8'),undefined,'past the band: released');
 f.streamer.update(.1,{x:3*C+8,z:3*C+8});assert.equal(f.world.get('8,8'),undefined,'far behind: released');
 assert.ok(f.pickables.every(m=>m.parent),'released chunks leave no pickables behind');
});
test('a depleted resource stays depleted after leaving and returning, with its timer running',()=>{
 const f=fixture();f.streamer.prime(8,8);
 Object.assign(f.nodes.get('tree:0,0'),{depleted:true,respawnIn:30});
 const far={x:3*C+8,z:3*C+8};
 f.streamer.update(10,far);assert.equal(f.nodes.has('tree:0,0'),false,'unloaded');
 assert.equal(f.streamer.stats.remembered,1);
 f.streamer.update(5,{x:8,z:8});
 const back=f.nodes.get('tree:0,0');assert.ok(back.depleted,'still felled');assert.ok(back.respawnIn<30&&back.respawnIn>0,'its regrowth kept counting while away');
 Object.assign(f.nodes.get(`tree:${C},0`),{busy:true});f.streamer.update(1,far);assert.ok(f.nodes.has(`tree:${C},0`),'a busy node keeps its chunk loaded');
});
test('extras (fishing spots, enemies, props) are placed with their chunk, keep busy chunks, and remember state by id',()=>{
 const placed=new Map(),log=[];
 const withExtras={...source,extras:tiles=>tiles.filter(t=>t.x%CHUNK_SIZE===4&&t.z%CHUNK_SIZE===4).map(t=>({id:`goblin:${t.x},${t.z}`,kind:'enemy',x:t.x,z:t.z}))};
 const world=new Map(),resources={add:n=>n,remove(n){n.dispose();},snapshot:()=>({depleted:false,respawnIn:null,busy:false}),restore(){}};
 let busy=null;
 const streamer=createChunkStreamer({source:withExtras,maps:[world],parent:new THREE.Group(),pickables:[],resources,topColor:()=>new THREE.Color(),radius:0,band:0,budgetMs:1000,
  place(e,{tile},saved){log.push(['place',e.id,saved??null]);const h={dispose(){placed.delete(e.id);log.push(['dispose',e.id]);},busy:()=>busy===e.id,save:()=>({defeated:true})};placed.set(e.id,h);return tile?h:null;}});
 streamer.prime(4,4);assert.deepEqual([...placed.keys()],['goblin:4,4']);
 busy='goblin:4,4';streamer.update(.1,{x:C+8,z:4});assert.ok(placed.has('goblin:4,4'),'a fight keeps its chunk');
 busy=null;streamer.update(.1,{x:C+8,z:4});assert.ok(!placed.has('goblin:4,4'),'released when idle');
 streamer.update(.1,{x:4,z:4});assert.deepEqual(log.filter(l=>l[0]==='place'&&l[1]==='goblin:4,4').at(-1),['place','goblin:4,4',{defeated:true}],'its state comes back');
});
test('a chunk builds in steps across frames: walkable at once, its resources filling in within the budget',()=>{
 // Many resources per chunk; each clock tick is 1 ms and the budget is 3 ms, so a chunk takes several frames.
 const dense={tile:source.tile,entities:tiles=>tiles.filter(t=>t.x%4===0&&t.z%4===0).map(t=>({id:`tree:${t.x},${t.z}`,kind:'tree',x:t.x,z:t.z}))};
 const world=new Map(),nodes=new Map(),resources={add(n){nodes.set(n.id,n);return n;},remove(n){nodes.delete(n.id);n.dispose();},snapshot:()=>({depleted:false,respawnIn:null,busy:false}),restore(){}};
 let clock=0;const streamer=createChunkStreamer({source:dense,maps:[world],parent:new THREE.Group(),pickables:[],resources,topColor:()=>new THREE.Color(),radius:0,band:0,budgetMs:3,now:()=>clock++});
 const perChunk=(C/4)**2;
 streamer.update(.1,{x:4,z:4});assert.equal(streamer.stats.building,'0,0');
 let frames=1;while(!world.get('4,4')&&frames<100){streamer.update(.1,{x:4,z:4});frames++;}
 assert.ok(world.get('4,4'),'its tiles become walkable');assert.ok(nodes.size<perChunk,'before every resource is in');
 while(streamer.stats.building&&frames<200){streamer.update(.1,{x:4,z:4});frames++;}
 assert.equal(nodes.size,perChunk,'all of them in the end');assert.ok(frames>2,`spread over ${frames} frames`);
 // Moving on mid-build: the half-built chunk finishes, then goes.
 streamer.update(.1,{x:C+4,z:4});
 for(let i=0;i<100&&streamer.stats.building;i++)streamer.update(.1,{x:C+4,z:4});
 streamer.update(.1,{x:C+4,z:4});assert.equal(world.get('4,4'),undefined,'the old chunk is released');
 assert.ok([...nodes.keys()].every(id=>Number(id.split(':')[1].split(',')[0])>=C),'nothing of it left behind');
 // prime() finishes everything at once (arrivals need the ground).
 streamer.update(.1,{x:2*C+4,z:4});streamer.prime(2*C+4,4);assert.equal(streamer.stats.building,null);
});
