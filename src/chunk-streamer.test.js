import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document??={createElement:()=>({getContext:()=>context})};
const {createChunkStreamer,CHUNK_SIZE}=await import('./chunk-streamer.js');

// A flat 64 × 64 world with one tree per chunk at its corner; resources record what the streamer does.
const source={tile:(x,z)=>x<0||z<0||x>=64||z>=64?null:{x,z,h:1,water:false,blocked:false},
 entities:tiles=>tiles.filter(t=>t.x%CHUNK_SIZE===0&&t.z%CHUNK_SIZE===0).map(t=>({id:`tree:${t.x},${t.z}`,kind:'tree',x:t.x,z:t.z}))};
function fixture(){
 const world=new Map(),scene=new THREE.Group(),pickables=[],nodes=new Map();
 const resources={add(node){nodes.set(node.id,{node,depleted:false,respawnIn:null});return node;},remove(node){nodes.delete(node.id);node.dispose();},
  snapshot(node){const n=nodes.get(node.id);return {depleted:n.depleted,respawnIn:n.respawnIn,busy:!!n.busy};},
  restore(node,{depleted,respawnIn}){Object.assign(nodes.get(node.id),{depleted,respawnIn});}};
 let clock=0;
 const streamer=createChunkStreamer({source,maps:[world],parent:scene,pickables,resources,topColor:()=>new THREE.Color(),radius:1,keep:1,budgetMs:1000,now:()=>clock++});
 return {world,scene,pickables,nodes,streamer};
}
test('chunks around the player load, far ones unload past a hysteresis band',()=>{
 const f=fixture();f.streamer.prime(8,8);
 assert.equal(f.streamer.stats.tiles,4*CHUNK_SIZE*CHUNK_SIZE,'radius 1 at the world corner: the 2 × 2 chunks that exist (empty ones outside the edge stay as placeholders)');
 assert.ok(f.world.get('8,8')&&f.world.get('20,20'));assert.equal(f.world.get('40,40'),undefined,'not loaded: unwalkable');
 f.streamer.update(.1,{x:40,z:8});assert.ok(f.world.get('56,8'),'walking east loads ahead');
 assert.ok(f.world.get('8,8'),'two chunks back (radius + one ring of hysteresis) the start stays');
 f.streamer.update(.1,{x:56,z:56});assert.equal(f.world.get('8,8'),undefined,'far behind: released');
 assert.ok(f.pickables.every(m=>m.parent),'released chunks leave no pickables behind');
});
test('a depleted resource stays depleted after leaving and returning, with its timer running',()=>{
 const f=fixture();f.streamer.prime(8,8);
 Object.assign(f.nodes.get('tree:0,0'),{depleted:true,respawnIn:30});
 f.streamer.update(10,{x:56,z:56});assert.equal(f.nodes.has('tree:0,0'),false,'unloaded');
 assert.equal(f.streamer.stats.remembered,1);
 f.streamer.update(5,{x:8,z:8});
 const back=f.nodes.get('tree:0,0');assert.ok(back.depleted,'still felled');assert.ok(back.respawnIn<30&&back.respawnIn>0,'its regrowth kept counting while away');
 Object.assign(f.nodes.get('tree:16,0'),{busy:true});f.streamer.update(1,{x:56,z:56});assert.ok(f.nodes.has('tree:16,0'),'a busy node keeps its chunk loaded');
});
test('extras (fishing spots, enemies, props) are placed with their chunk, keep busy chunks, and remember state by id',()=>{
 const placed=new Map(),log=[];
 const withExtras={...source,extras:tiles=>tiles.filter(t=>t.x%CHUNK_SIZE===4&&t.z%CHUNK_SIZE===4).map(t=>({id:`goblin:${t.x},${t.z}`,kind:'enemy',x:t.x,z:t.z}))};
 const world=new Map(),resources={add:n=>n,remove(n){n.dispose();},snapshot:()=>({depleted:false,respawnIn:null,busy:false}),restore(){}};
 let busy=null;
 const streamer=createChunkStreamer({source:withExtras,maps:[world],parent:new THREE.Group(),pickables:[],resources,topColor:()=>new THREE.Color(),radius:0,keep:0,budgetMs:1000,
  place(e,{tile},saved){log.push(['place',e.id,saved??null]);const h={dispose(){placed.delete(e.id);log.push(['dispose',e.id]);},busy:()=>busy===e.id,save:()=>({defeated:true})};placed.set(e.id,h);return tile?h:null;}});
 streamer.prime(4,4);assert.deepEqual([...placed.keys()],['goblin:4,4']);
 busy='goblin:4,4';streamer.update(.1,{x:40,z:4});assert.ok(placed.has('goblin:4,4'),'a fight keeps its chunk');
 busy=null;streamer.update(.1,{x:40,z:4});assert.ok(!placed.has('goblin:4,4'),'released when idle');
 streamer.update(.1,{x:4,z:4});assert.deepEqual(log.filter(l=>l[0]==='place'&&l[1]==='goblin:4,4').at(-1),['place','goblin:4,4',{defeated:true}],'its state comes back');
});
