import test from 'node:test';
import assert from 'node:assert/strict';
import {footprint,footprintGap,nearestCell,canStand,findFootprintPath} from './footprint.js';
import {withinAttackRange} from './combat-range.js';
const grid=(w=8,h=8)=>new Map(Array.from({length:w*h},(_,i)=>{const t={x:i%w,z:Math.floor(i/w),h:1,blocked:false,water:false};return [`${t.x},${t.z}`,t];}));

test('a 2×2 body: cells, gap, nearest cell and standing room',()=>{
 const world=grid(),at=world.get('2,2');
 assert.deepEqual(footprint(world,at,2).map(t=>`${t.x},${t.z}`),['2,2','2,3','3,2','3,3']);
 assert.equal(footprint(world,world.get('7,7'),2),null,'off the edge');
 assert.equal(footprintGap(at,2,{x:4,z:3}),1);assert.equal(footprintGap(at,2,{x:3,z:3}),0);assert.equal(footprintGap(at,2,{x:4,z:4}),2,'diagonal is not beside');
 assert.deepEqual(nearestCell(at,2,{x:6,z:0}),{x:3,z:2});
 world.get('3,3').blocked=true;assert.equal(canStand(world,at,2),false);assert.equal(canStand(world,at,2,[world.get('3,3')]),true,'its own tiles are free to it');
 world.get('3,3').blocked=false;world.get('2,3').h=1.5;assert.equal(canStand(world,at,2),false,'must be level');
});
test('large bodies path around gaps they cannot fit, and melee reaches from beside any cell',()=>{
 const world=grid();for(let z=0;z<8;z++)if(z!==4)world.get(`4,${z}`).blocked=true; // a one-tile gap in a wall
 assert.equal(findFootprintPath(world,world.get('1,1'),2,t=>t.x>=5),null,'a 2×2 body cannot squeeze through a 1-tile gap');
 world.get('4,5').blocked=false;const route=findFootprintPath(world,world.get('1,1'),2,t=>t.x>=5);assert.ok(route?.length>0);
 const target={x:2,z:2,tile:world.get('2,2'),size:2};
 for(const from of ['1,2','4,3','3,4','2,1'])assert.ok(withinAttackRange(world,world.get(from),target,1),from);
 assert.equal(withinAttackRange(world,world.get('4,4'),target,1),false,'diagonal corner');
 assert.equal(withinAttackRange(world,world.get('3,3'),target,1),false,'inside the body');
});
