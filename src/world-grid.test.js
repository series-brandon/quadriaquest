import test from 'node:test';
import assert from 'node:assert/strict';
import {CHUNK,REGION,WORLD,BAND,chunkOf,regionOf,chunkId,regionId,withinChunk,chunkGap} from './world-grid.js';

test('the grid nests: tiles in chunks in regions in the world, each dividing the next',()=>{
 assert.equal(REGION%CHUNK,0);assert.equal(WORLD%REGION,0);
 assert.equal(REGION/CHUNK,4,'a region is 4 × 4 chunks');assert.equal(WORLD/REGION,16,'the world is 16 × 16 regions');
});
test('chunk and region ids, including negative coordinates',()=>{
 assert.deepEqual(chunkOf(0,CHUNK-1),[0,0]);assert.deepEqual(chunkOf(CHUNK,-1),[1,-1]);
 assert.equal(chunkId(-1,-CHUNK),'-1,-1');assert.equal(regionId(REGION,REGION-1),'1,0');assert.deepEqual(regionOf(-1,0),[-1,0]);
});
test('a tile’s gap to a chunk: 0 inside, tiles to its nearest edge outside',()=>{
 assert.equal(chunkGap(0,0,5,5),0);assert.equal(chunkGap(1,0,CHUNK-1,3),1,'next door');assert.equal(chunkGap(2,0,0,0),2*CHUNK);assert.equal(chunkGap(0,1,-3,CHUNK+2),3,'diagonal: the larger axis');
 assert.ok(BAND>0&&BAND<CHUNK);
});
test('a rectangle is within one chunk only if no chunk line runs through it',()=>{
 assert.ok(withinChunk(0,0,CHUNK-1,CHUNK-1));assert.ok(!withinChunk(CHUNK-1,0,CHUNK,0));assert.ok(!withinChunk(0,CHUNK-1,0,CHUNK));
 assert.ok(!withinChunk(REGION-2,4,REGION+1,6),'a region line is a chunk line');
});
