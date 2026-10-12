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
test('sentries pace the wall-top walkways, look out at the ends, and hide when far or the wall is cut',async()=>{
 const {createWallSentries}=await import('./wall-sentries.js');
 const walkways=city.walls.walkways;assert.ok(walkways.length>=7,'stretches between towers and gatehouses');
 for(const w of walkways)assert.ok(w.to>w.from&&w.y>HEIGHT,'on top of the wall');
 let cut=false;const sentries=createWallSentries({walkways,parent:new THREE.Group(),random:()=>.3,hiddenAt:()=>cut});
 assert.ok(sentries.sentries.length>=10,'long walkways share several guards');
 const s=sentries.sentries[0],w=s.walkway,start=s.at;
 const player={x:w.horizontal?(w.from+w.to)/2:w.fixed,z:w.horizontal?w.fixed:(w.from+w.to)/2};
 for(let i=0;i<600;i++)sentries.update(1/30,i/30,player);
 assert.notEqual(s.at,start,'they walk');assert.ok(s.at>=w.from&&s.at<=w.to,'and stay on their stretch');
 assert.ok(Math.abs(s.body.position.y-w.y)<1e-6);
 cut=true;sentries.update(1/30,21,player);assert.equal(s.body.visible,false,'hidden on a cut wall');
 cut=false;sentries.update(1/30,21,{x:player.x+200,z:player.z});assert.equal(s.body.parent,null,'far away: out of the scene');
 sentries.update(1/30,22,player);assert.ok(s.body.parent&&s.body.visible,'back when near');
});
test('two guards stand outside every gateway, against the wall, facing out',async()=>{
 const {createCountryside}=await import('./countryside.js'),{createCrowd}=await import('./townsfolk.js');
 const d=structuredClone(data),land=createCountryside({city:d}),world=buildCity(d,{scene:new THREE.Group(),outside:land.tile});
 const guards=d.townsfolk.filter(f=>f.id?.startsWith('gate-')),size=d.size[0];
 assert.equal(guards.length,d.gates.length*2);
 for(const g of guards){
  const [x,z]=g.home,tile=world.tiles.get(key(x,z));assert.deepEqual(g.routine,[{do:'post'}]);
  assert.ok(x<0||z<0||x>=size||z>=size,`${g.id} is outside the city`);
  assert.ok(tile&&!tile.blocked&&tile===land.tile(x,z),`${g.id} stands on the land outside`);
  assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>world.tiles.get(key(x+dx,z+dz))?.cityWall),`${g.id} stands against the wall`);
 }
 const crowd=createCrowd({city:world,parent:new THREE.Group()});
 for(let i=0;i<60;i++)crowd.update(.1,i*.1);
 const posted=crowd.folk.filter(p=>p.id?.startsWith('gate-'));assert.equal(posted.length,guards.length);
 assert.ok(posted.every(p=>p.activity==='post'&&p.tile===p.home),'on post');
 crowd.dispose();
});
