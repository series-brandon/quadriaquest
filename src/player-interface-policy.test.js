import test from 'node:test';
import assert from 'node:assert/strict';
import {menuReaction,minimapTiles,partitionMobileTabs} from './player-interface-policy.js';
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
