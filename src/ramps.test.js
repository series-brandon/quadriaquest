import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMapData,setMapRamp,mapRamp,mapTiles,setMapHeight,growMap} from './world-map.js';
import {packMap,unpackMap} from './map-file.js';
import {buildChunkTerrain,rampEdge} from './chunk-terrain.js';
import {moveMotion,isRamp,standHeight} from './slime-motion.js';
import {key} from './world.js';

test('a ramp is stored per tile, survives packing and growing, and reaches the map’s tiles',()=>{
 const data=createMapData({size:[128,128]});setMapHeight(data,5,5,1.5);setMapRamp(data,5,5,'e');
 assert.equal(mapRamp(data,5,5),'e');assert.equal(mapRamp(data,6,5),null);
 const back=unpackMap(JSON.parse(JSON.stringify(packMap(data))));assert.equal(mapRamp(back,5,5),'e');
 assert.deepEqual(mapTiles(back).get(key(5,5)).ramp,{dir:'e'});
 growMap(back,{west:128},{round:true});assert.equal(mapRamp(back,133,5),'e','it moves with the ground');
 setMapRamp(data,5,5,null);assert.equal(mapRamp(data,5,5),null);
});
test('a ramp slopes from its foot to its uphill edge, its sides meet lower neighbours, and nothing is left open',()=>{
 const tiles=[{x:0,z:0,h:1},{x:1,z:0,h:1.5,ramp:{dir:'e'}},{x:2,z:0,h:1.5},{x:1,z:1,h:1}],at=(x,z)=>tiles.find(t=>t.x===x&&t.z===z);
 assert.equal(rampEdge(at(1,0),1,0),1.5,'its uphill edge');assert.equal(rampEdge(at(1,0),-1,0),1,'its foot');assert.equal(rampEdge(at(1,0),0,1),1,'its side');
 const {mesh}=buildChunkTerrain({tiles,tileAt:at,topColor:()=>new THREE.Color('#888')}),pos=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
 // The sloped top leans (normal y between flat and wall), as do the neighbours' rounded edges.
 const top=[];for(let i=0;i<pos.count;i++)if(normal.getY(i)>.8&&normal.getY(i)<.95)top.push([+(pos.getX(i)+6).toFixed(3),+pos.getY(i).toFixed(3)]);
 const corners=new Set(top.map(([x,y])=>`${x}:${y}`));assert.ok(corners.has('0.5:1')&&corners.has('1.5:1.5'),'from 1 at its west edge to 1.5 at its east');
 // Its south side stands over the lower tile there: a side face up to the slope.
 let side=0;for(let i=0;i<pos.count;i++)if(normal.getZ(i)>.9&&pos.getX(i)+6>.4&&pos.getX(i)+6<1.6&&Math.abs(pos.getZ(i)+6-.5)<.01)side++;assert.ok(side>=4,'a side face towards the lower neighbour');
});
test('walking onto or off a ramp slides; standing on one is at its middle',()=>{
 const low={x:0,z:0,h:1},ramp={x:1,z:0,h:1.5,ramp:{dir:'e'}},high={x:2,z:0,h:1.5};
 assert.ok(isRamp(low,ramp)&&isRamp(ramp,high));assert.equal(standHeight(ramp),1.25);
 const on=moveMotion(1,low,ramp);assert.equal(on.stepped,false);assert.ok(Math.abs(on.rise-.25)<1e-9,'a quarter block up to its middle');
 assert.equal(moveMotion(1,low,{x:1,z:0,h:1.5}).stepped,true,'a ledge is still hopped');
});
test('every walker prefers a ramp to a hop when it’s about as near, and still hops rather than go far round',async()=>{
 const {findPath,stepCost,HOP_COST}=await import('./world.js');
 const ledge=(rampZ)=>{const m=new Map();for(let z=0;z<6;z++)for(let x=0;x<5;x++){const t={x,z,h:x>=2?1.5:1,blocked:false};if(x===2&&z===rampZ)t.ramp={dir:'e'};m.set(key(x,z),t);}return m;};
 const {DIAGONAL_COST}=await import('./world.js');assert.equal(HOP_COST,1);assert.equal(DIAGONAL_COST,.1);
 assert.equal(stepCost({x:0,z:0,h:1},{x:1,z:0,h:1.5}),2,'a hop');assert.equal(stepCost({x:0,z:0,h:1},{x:1,z:0,h:1.5,ramp:{dir:'e'}}),1,'a ramp');assert.equal(stepCost({x:0,z:0,h:1},{x:1,z:1,h:1}),1.1,'a diagonal');
 const near=ledge(2),route=findPath(near,near.get(key(0,1)),near.get(key(4,1)));assert.ok(route.includes(near.get(key(2,2))),'the ramp one row over');
 const far=ledge(5),hop=findPath(far,far.get(key(0,1)),far.get(key(4,1)));assert.ok(!hop.includes(far.get(key(2,5))),'not four rows round');assert.equal(hop.length,4);
});
test('a ramp is walked straight: no diagonal steps onto, off or beside it',async()=>{
 const {canMove}=await import('./world.js');const m=new Map();
 for(let z=0;z<3;z++)for(let x=0;x<3;x++)m.set(key(x,z),{x,z,h:1.5,blocked:false});m.get(key(1,1)).ramp={dir:'e'};
 const at=(x,z)=>m.get(key(x,z));
 assert.equal(canMove(m,at(0,0),at(1,1)),false,'not onto it');assert.equal(canMove(m,at(1,1),at(2,2)),false,'not off it');
 assert.equal(canMove(m,at(0,0),at(1,0)),true,'straight is fine');assert.equal(canMove(m,at(0,1),at(1,2)),false,'not past its corner');
});
