import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {buildCity} from './city-map.js';
import {reachableFrom} from './city-checks.js';
import {cutBuildings} from './cutaway.js';
import {wallPlan,THICKNESS,HEIGHT,WALL_IDS,cityGateModel} from './city-walls.js';
import {key,canStep} from './world.js';

const data=JSON.parse(readFileSync(new URL('./maps/capital.json',import.meta.url)));
const city=buildCity(structuredClone(data),{scene:new THREE.Group()}),t=(x,z)=>city.tiles.get(key(x,z));

test('the wall is three tiles of solid stone around the city, open only at the gateways',()=>{
 assert.equal(data.walls.thickness,THICKNESS);
 for(const [x,z] of [[0,40],[2,40],[60,0],[60,2],[127,30],[30,127]])assert.ok(t(x,z).blocked&&t(x,z).blocksSight,`${x},${z} is wall`);
 assert.ok(!t(3,40).blocked,'inside the wall is clear');
 for(const g of data.gates)for(let i=g.from;i<=g.to;i++)for(let d=0;d<THICKNESS;d++){const [x,z]=g.side==='west'?[d,i]:g.side==='east'?[127-d,i]:[i,127-d];assert.ok(!t(x,z).blocked,`${g.side} passage ${x},${z} open`);}
 const plan=wallPlan({size:128,gates:data.gates});assert.equal(plan.towers.length,4);
});
test('the double doors close a gateway like a door and open again',()=>{
 const west=city.walls.gates.find(g=>g.tile.x<=2),[a,b]=[t(1,71),t(0,71)];
 assert.ok(west.open,'open by default');assert.ok(canStep(a,b));
 west.interact();assert.equal(west.open,false);assert.ok(!canStep(a,b),'closed: blocked');
 west.interact();assert.ok(canStep(a,b));
 const model=cityGateModel(3);model.set(1);assert.ok(model.group.children.every(h=>Math.abs(h.rotation.y)>1.5),'both leaves swing');
});
test('wall pieces are tall cut owners: the one beside you cuts down, the far ones stand',()=>{
 const pieces=city.walls.pieces;assert.ok(pieces.length>=4+3+8,'runs, towers and gatehouses');
 assert.ok(pieces.every(p=>p.id>=WALL_IDS&&p.box.top-p.box.base>=HEIGHT));
 const boxes=pieces.map(p=>[p.id,p.box]),player={x:3-6,y:1,z:40-6},camera={x:player.x+15,y:player.y+12,z:player.z+15};
 const cut=cutBuildings({player,camera,boxes});
 const near=pieces.find(p=>p.box.x0<=player.x&&p.box.z0<=player.z&&p.box.z1>=player.z&&p.box.x1<0);
 assert.ok(near&&cut.includes(near.id),'the west wall beside you is cut');
 assert.ok(cut.length<pieces.length,'not every piece');
});
