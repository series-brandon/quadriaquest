import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundItemModel} from './ground-item-models.js';
import {setWorldOccupancy,blocksMovement} from './world-occupancy.js';
import {findPath,key} from './world.js';

test('all shared ground pickups remain traversable through spawn, collection, respawn and reset',()=>{
 for(const kind of ['sticks','stones','flint']){
  const tiles=[0,1,2].map(x=>({x,z:0,h:1,water:false,blocked:false}));
  const world=new Map(tiles.map(t=>[key(t.x,t.z),t]));
  const item={group:createGroundItemModel(kind),tile:tiles[1]};
  assert.equal(blocksMovement(item),false);
  for(const present of [true,false,true,true]){
   setWorldOccupancy(item,present);
   assert.equal(item.tile.blocked,false);
   assert.equal(findPath(world,tiles[0],tiles[2]).length,2);
   assert.equal(findPath(world,tiles[0],tiles[1]).length,1);
  }
  item.tile.blocked=true;setWorldOccupancy(item,false);
  assert.equal(item.tile.blocked,true,'collecting a pickup must not unblock another occupant');
 }
});
test('solid world actors still block when present and release when removed',()=>{
 const actor={group:{userData:{}},tile:{blocked:false}};
 setWorldOccupancy(actor,true);assert.equal(actor.tile.blocked,true);
 setWorldOccupancy(actor,false);assert.equal(actor.tile.blocked,false);
});
import {createOccupancy,OCCUPIED_COST,PLAYER_COST,markCharacter,occupancy} from './world-occupancy.js';
import {Group} from 'three';
// world-actors.js draws highlight textures: a minimal canvas adapter, then a dynamic import.
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document??={createElement:()=>({getContext:()=>context,querySelector:()=>({})}),body:{append(){}}};
const {createWorldActor,pushWorldActor,updateWorldActors}=await import('./world-actors.js');
const grid=(w=5,h=5)=>new Map(Array.from({length:w*h},(_,i)=>{const t={x:i%w,z:Math.floor(i/w),h:1,blocked:false,water:false};return [key(t.x,t.z),t];}));
test('occupancy marks tiles, costs others extra (a player much more), and moves with its owner',()=>{
 const o=createOccupancy(),[a,b]=[{x:0,z:0},{x:1,z:0}],npc={kind:'npc'},player={kind:'player'};
 o.place(npc,[a]);assert.equal(o.occupied(a),true);assert.equal(o.occupied(a,npc),false,'not occupied for itself');
 assert.equal(o.cost(a),OCCUPIED_COST);assert.equal(o.cost(a,npc),0);
 o.place(player,[b]);assert.equal(o.cost(b,npc),PLAYER_COST);
 o.place(npc,[b]);assert.equal(o.occupied(a),false,'moving clears the old tile');assert.deepEqual(o.owners(b).length,2);
 o.remove(npc);assert.equal(o.cost(b,player),0);
});
test('routes go around an occupied tile for a short detour and through it when the detour is long',()=>{
 const world=grid(5,3),o=createOccupancy(),npc={kind:'npc'},cost=t=>o.cost(t);
 o.place(npc,[world.get('2,1')]);
 const around=findPath(world,world.get('0,1'),world.get('4,1'),cost);assert.ok(!around.includes(world.get('2,1')),'a two-step detour beats walking through');
 for(const z of [0,2])world.get(`2,${z}`).blocked=true;
 const through=findPath(world,world.get('0,1'),world.get('4,1'),cost);assert.ok(through.includes(world.get('2,1')),'the only way is through');
});
test('a walk NPC steps aside when pushed and walks back home once it is free; a never NPC stays',()=>{
 occupancy.clear();const world=grid(),scene=new Group(),pickables=[],home=world.get('2,2');
 const walker=createWorldActor({world,tile:home,parent:scene,pickables,group:markCharacter(new Group()),kind:'townsfolk',label:'x'});
 assert.equal(walker.push,'walk');assert.ok(occupancy.occupied(home));
 const playerOn=t=>t===home;assert.ok(pushWorldActor(walker,playerOn));assert.notEqual(walker.tile,home);
 for(let i=0;i<120;i++)updateWorldActors(1/60,playerOn);assert.notEqual(walker.tile,home,'stays aside while the player stands at home');
 for(let i=0;i<240;i++)updateWorldActors(1/60,()=>false);assert.equal(walker.tile,home,'walks back once home is free');
 const mentor=createWorldActor({world,tile:world.get('0,0'),parent:scene,pickables,group:markCharacter(new Group()),kind:'mentor',label:'y',push:'never'});
 assert.equal(pushWorldActor(mentor,()=>false),false);assert.equal(mentor.tile,world.get('0,0'));
 walker.dispose();mentor.dispose();assert.equal(occupancy.occupied(home),false);
});
