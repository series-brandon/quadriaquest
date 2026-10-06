import test from 'node:test';
import assert from 'node:assert/strict';
import {menuReaction,minimapTiles,minimapGrid,minimapGroundItems,partitionMobileTabs} from './player-interface-policy.js';
test('desktop actions and attacks compact the journal; mobile reveals gameplay',()=>{
 for(const event of ['action','attacked','automatic','travel','reset','story','defeat']){assert.equal(menuReaction(false,event),'compact');assert.equal(menuReaction(true,event),'close');}
 for(const event of ['dismiss','switch'])for(const mobile of [true,false])assert.equal(menuReaction(mobile,event),'close');
});
test('minimap reads only nearby tiles from the active map, including negative coordinates',()=>{
 const world=new Map([['near',{x:-2,z:4}],['edge',{x:6,z:12}],['far',{x:7,z:4}]]);
 assert.deepEqual(minimapTiles(world,{x:-2,z:4}),[world.get('near'),world.get('edge')]);
 world.clear();world.set('other',{x:0,z:0});assert.deepEqual(minimapTiles(world,{x:30,z:30}),[]);
});

test('mobile navigation preserves every available tab, including optional tabs, without scrolling',()=>{
 const tabs=['open-inventory','open-skills','open-crafting','open-quests','open-combat-styles','open-equipment','open-settings','optional-tab'].map(id=>({id}));
 const {primary,secondary}=partitionMobileTabs(tabs);
 assert.equal(primary.length,4);assert.equal(secondary.length,4);
 assert.deepEqual(new Set([...primary,...secondary]),new Set(tabs));
 assert.ok(secondary.includes(tabs.at(-1)));
 assert.deepEqual(partitionMobileTabs([]),{primary:[],secondary:[]});
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
