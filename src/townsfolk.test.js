import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildCity} from './city-map.js';
import {createCrowd,createNavigator,generateTownsfolk,townsfolkProblems} from './townsfolk.js';
import {kitStreetData} from './dev/kit-street.js';
import {occupancy} from './world-occupancy.js';
import {key} from './world.js';

const city=()=>{const data=kitStreetData();return buildCity(data,{scene:new THREE.Group()});};
test('the navigator follows cached distance fields around walls and up stairs',()=>{
 const built=city(),nav=createNavigator(built.tiles),t=(x,z)=>built.tiles.get(key(x,z));
 let at=t(71,34);const goal=t(80,19);const route=[];
 for(let i=0;i<200&&at!==goal;i++){at=nav.next(at,goal);if(!at)break;route.push(at);}
 assert.equal(at,goal,'reaches terrace B by the stairs');assert.ok(route.some(r=>r.stair));
 nav.field(goal);assert.equal(nav.cached,1,'one field per destination, reused');
 assert.ok(nav.around(t(30,36),4).length>10);
});
test('a crowd lives its routines: sitting, vending, patrolling, chatting, going indoors',()=>{
 const built=city(),crowd=createCrowd({city:built,parent:new THREE.Group()});
 assert.equal(crowd.folk.length,built.data.townsfolk.length);
 const seen=new Set(),moved=new Set(),start=new Map(crowd.folk.map(p=>[p,p.tile]));
 for(let i=0;i<60*90;i++){crowd.update(1/60,i/60);for(const p of crowd.folk){if(p.state==='staying')seen.add(p.activity);if(p.tile!==start.get(p))moved.add(p);}}
 for(const a of ['sit','vend','patrol','stroll'])assert.ok(seen.has(a),a);
 assert.ok(moved.size>=crowd.folk.length-2,'nearly everyone moved');
 // Walk-through characters: they mark their tiles occupied, never blocked.
 for(const p of crowd.folk){assert.ok(!p.tile.blocked);if(!p.hidden)assert.ok(occupancy.owners(p.tile).includes(p));}
 assert.ok(crowd.folk.every(p=>p.state!=='staying'||p.activity!=='sit'||p.spot.kind==='sit'));
 crowd.dispose();assert.ok(crowd.folk.length===0);
});
test('crowd budget: off-screen townsfolk move but skip presentation; far ones update at a lower rate',()=>{
 const built=city(),crowd=createCrowd({city:built,parent:new THREE.Group()});
 const camera=new THREE.PerspectiveCamera(40,1,.1,200);camera.position.set(24,20,30);camera.lookAt(24,1,24);camera.updateMatrixWorld();
 for(let i=0;i<30;i++)crowd.update(1/60,i/60,{camera});
 const s=crowd.stats;assert.equal(s.near+s.far+s.off,crowd.folk.length);assert.ok(s.off>0,'the annex is off screen');assert.ok(s.near>0);
});
test('generated crowds and townsfolk checks',()=>{
 const built=city();const folk=generateTownsfolk(built,40);assert.equal(folk.length,40);
 assert.deepEqual(townsfolkProblems(built.data,built).filter(p=>p.severity==='error'),[]);
 built.data.townsfolk.push({id:'x',home:[29,30],routine:[{do:'sit'}]});assert.ok(townsfolkProblems(built.data,built).some(p=>/blocked/.test(p.text)));
});
