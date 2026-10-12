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
 assert.ok(seen.has('sleep')||seen.has('cook'),'residents sleep or cook in their furnished homes');
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
test('residents go home through their door, open it, shut it behind them, and keepers mind their shops',async()=>{
 const built=city(),resident=built.data.townsfolk.find(e=>e.house!==undefined&&!built.data.buildings[e.house].desc.sign);
 assert.ok(resident,'the kit street has residents');
 const house=built.buildings[resident.house];
 const solo={...built.data,townsfolk:[{...resident,home:[house.anchors.doors[0].doorstep.x,house.anchors.doors[0].doorstep.z],routine:[{do:'home'}]}]};
 const one=buildCity(solo,{scene:new THREE.Group()}),crowd=createCrowd({city:one,parent:new THREE.Group()}),p=crowd.folk[0],theDoor=one.buildings[resident.house].doors[0];
 let opened=false,inside=false,hiddenInside=false;
 for(let i=0;i<60*30;i++){crowd.update(1/60,i/60);if(theDoor.open)opened=true;if(p.tile.indoor&&!p.step){inside=true;if(!p.group.visible)hiddenInside=true;}if(inside&&!theDoor.open&&!p.openedDoor)break;}
 assert.ok(opened,'opened the door');assert.ok(inside,'went inside');assert.ok(hiddenInside,'not drawn behind the roof');assert.equal(theDoor.open,false,'shut it behind them');
 const keeperEntry=built.data.townsfolk.find(e=>built.data.buildings[e.house]?.desc.sign);assert.ok(keeperEntry,'shops have keepers');
 const kc=createCrowd({city:buildCity({...built.data,townsfolk:[keeperEntry]},{scene:new THREE.Group()}),parent:new THREE.Group()}),k=kc.folk[0];
 let kept=false;for(let i=0;i<60*40&&!kept;i++){kc.update(1/60,i/60);if(k.state==='staying'&&k.activity==='keep')kept=k.tile===k.house.keeper;}
 assert.ok(kept,'the keeper stands at the keeper spot');
});
