import test from 'node:test';
import assert from 'node:assert/strict';
import {wanderDelay,shouldWander,wanderRoute} from './wander.js';
function map(){return new Map(Array.from({length:25},(_,i)=>{const t={x:i%5,z:Math.floor(i/5),h:1,blocked:false,water:false};return [`${t.x},${t.z}`,t];}));}
const area={minX:1,maxX:3,minZ:1,maxZ:3};
test('wander rolls have a 25 percent threshold and varied two-to-four-second delays',()=>{assert.equal(shouldWander(()=>.249),true);assert.equal(shouldWander(()=>.25),false);assert.equal(wanderDelay(()=>0),2);assert.equal(wanderDelay(()=>.5),3);});
test('wandering can select a distant tile and keeps the whole route inside its area',()=>{const tiles=map(),start=tiles.get('1,1');start.blocked=true;const route=wanderRoute(tiles,start,area,()=>false,()=>.999);assert.ok(route.length>1);for(const tile of route){assert.ok(tile.x>=1&&tile.x<=3&&tile.z>=1&&tile.z<=3);}assert.notEqual(route.at(-1),start);});
test('wandering avoids blocked, water, reserved and unreachable tiles',()=>{const tiles=map(),start=tiles.get('1,1');tiles.get('2,1').blocked=true;tiles.get('1,2').water=true;assert.deepEqual(wanderRoute(tiles,start,area),[]);tiles.get('1,2').water=false;assert.deepEqual(wanderRoute(tiles,start,area,t=>t===tiles.get('1,2')),[]);tiles.get('1,2').h=2;assert.deepEqual(wanderRoute(tiles,start,area),[]);});
