import test from 'node:test';
import assert from 'node:assert/strict';
import {menuReaction,minimapTiles,minimapGrid,minimapGroundItems} from './player-interface-policy.js';
test('desktop actions and attacks compact the journal; mobile reveals gameplay',()=>{
 for(const event of ['action','attacked','automatic','travel','reset','story','defeat']){assert.equal(menuReaction(false,event),'compact');assert.equal(menuReaction(true,event),'close');}
 for(const event of ['dismiss','switch'])for(const mobile of [true,false])assert.equal(menuReaction(mobile,event),'close');
});
test('minimap reads only nearby tiles from the active map, including negative coordinates',()=>{
 const world=new Map([['-2,4',{x:-2,z:4}],['6,12',{x:6,z:12}],['7,4',{x:7,z:4}]]);
 assert.deepEqual(minimapTiles(world,{x:-2,z:4}),[world.get('-2,4'),world.get('6,12')]);
 world.clear();world.set('0,0',{x:0,z:0});assert.deepEqual(minimapTiles(world,{x:30,z:30}),[]);
});

test('minimap fits identical integer cells at fractional sizes and pixel densities',()=>{
 for(const dpr of [1,1.25,1.5,2,3])for(const width of [129.5,164,238]){
  const g=minimapGrid(width,dpr);assert.equal(g.pixels/g.cells,g.size);assert.ok(Number.isInteger(g.size));assert.ok(g.width<=width);assert.equal(g.width*dpr,g.pixels);
 }
});
test('ground markers follow active tile identity, collection and reset',()=>{
 const tile={x:2,z:3},world=new Map([['2,3',tile]]),node={...tile,tile,group:{visible:true},depleted:false};
 const read=()=>minimapGroundItems(world,[node],{x:0,z:0});assert.deepEqual(read(),[node]);
 node.depleted=true;assert.deepEqual(read(),[]);node.depleted=false;node.group.visible=false;assert.deepEqual(read(),[]);
 node.group.visible=true;assert.deepEqual(read(),[node]);world.set('2,3',{...tile});assert.deepEqual(read(),[]);
});
test('the minimap colours open land by its biome, keeping water, indoors and blockers as they were',async()=>{
 const {minimapTileColor}=await import('./player-interface-policy.js');
 assert.equal(minimapTileColor({water:true,biome:'meadow'}),'#7a9caf');assert.equal(minimapTileColor({blocked:true,biome:'meadow'}),'#97869a');
 assert.equal(minimapTileColor({}),'#b2a39d');
 const meadow=minimapTileColor({biome:'meadow'}),coast=minimapTileColor({biome:'coast'}),forest=minimapTileColor({biome:'forest'});
 assert.ok(new Set([meadow,coast,forest]).size===3,'each biome its own');assert.notEqual(minimapTileColor({biome:'hills',rocky:true}),minimapTileColor({biome:'hills'}));
});
test('paths laid by hand show on the minimap; natural ground keeps its biome colour',async()=>{
 const {minimapTileColor}=await import('./player-interface-policy.js');
 const meadow=minimapTileColor({biome:'meadow'});
 assert.notEqual(minimapTileColor({biome:'meadow',surface:'dirt',made:true}),meadow,'a dirt path');
 assert.equal(minimapTileColor({biome:'meadow',surface:'dirt',shore:true}),minimapTileColor({biome:'meadow',shore:true}),'a natural shore is ground');
 assert.notEqual(minimapTileColor({surface:'cobble'}),minimapTileColor({}),'a city road');
});
