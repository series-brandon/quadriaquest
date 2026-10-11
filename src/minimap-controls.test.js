import test from 'node:test';import assert from 'node:assert/strict';import {minimapTileAt} from './minimap-controls.js';
test('minimap clicking matches tile centers at each zoom and map origin',()=>{const rect={left:14,top:30,width:204,height:204};for(const radius of [4,8,24]){const center={x:-8,z:30};assert.deepEqual(minimapTileAt(116,132,rect,center,radius),center);assert.deepEqual(minimapTileAt(14,30,rect,center,radius),{x:-8-radius,z:30-radius});assert.equal(minimapTileAt(218,132,rect,center,radius),null);}});
test('a tap on the turned minimap maps back to the tile under it',()=>{
 const rect={left:0,top:0,width:90,height:90},center={x:10,z:10},radius=4;// 9 cells of 10 px
 assert.deepEqual(minimapTileAt(45,5,rect,center,radius,0),{x:10,z:6},'unturned: the top is north');
 // Camera turned a quarter (looking west): the top of the map is west, its right is north.
 assert.deepEqual(minimapTileAt(45,5,rect,center,radius,Math.PI/2),{x:6,z:10});
 assert.deepEqual(minimapTileAt(85,45,rect,center,radius,Math.PI/2),{x:10,z:6});
 assert.deepEqual(minimapTileAt(45,45,rect,center,radius,1.234),center,'the middle is always the player');
});
