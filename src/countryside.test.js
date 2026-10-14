import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createCountryside,RING,SEA} from './countryside.js';
import {buildCity} from './city-map.js';
import {reachableFrom} from './city-checks.js';
import {key} from './world.js';

const data=JSON.parse(readFileSync(new URL('./maps/capital.json',import.meta.url)));
// The whole world: the city's tiles and every countryside tile, as one map.
function world(){
 const city=buildCity(structuredClone(data),{scene:new THREE.Group()}),map=new Map(city.tiles),land=createCountryside({city:data});
 for(let z=land.bounds.z0;z<land.bounds.z1;z++)for(let x=land.bounds.x0;x<land.bounds.x1;x++){const t=land.tile(x,z);if(t)map.set(key(x,z),t);}
 return {city,map,land};
}
const {city,map,land}=world();

test('the countryside is the same every time, and absent inside the city',()=>{
 const again=createCountryside({city:data});
 for(const [x,z] of [[-30,10],[150,70],[64,170],[-60,-60],[180,-20]])assert.deepEqual(again.tile(x,z),land.tile(x,z));
 assert.equal(land.tile(10,10),null);assert.equal(land.tile(-RING-1,0),null,'beyond the edge');
 assert.ok(land.tile(-RING,0).water,'a strip of sea at the edge');
 assert.deepEqual(createCountryside({city:data,seed:5}).tile(-40,40)?.h===land.tile(-40,40)?.h&&createCountryside({city:data,seed:5}).tile(30,-40)?.h===land.tile(30,-40)?.h&&createCountryside({city:data,seed:5}).tile(150,-50)?.h===land.tile(150,-50)?.h,false,'another seed, other land');
});
test('you walk from the square out of each gateway and down its road to the end, over the bridge',()=>{
 const reach=reachableFrom(map,city.spawn);
 for(const r of land.roads){
  const end=r.side==='west'?map.get(key(-r.length,Math.round(r.center(r.length)))):r.side==='east'?map.get(key(data.size[0]-1+r.length,Math.round(r.center(data.size[0]-1+r.length)))):map.get(key(Math.round(r.center(data.size[0]-1+r.length)),data.size[0]-1+r.length));
  assert.ok(end&&reach.has(end),`${r.side} road end reachable`);
 }
 const bridge=[...map.values()].filter(t=>t.bridge);assert.ok(bridge.length>=3,'the east road bridges the river');assert.ok(bridge.every(t=>reach.has(t)));
 // The wall keeps you in elsewhere: a tile just outside the north wall is reachable only the long way round.
 assert.ok(reach.has(map.get(key(64,-2))),'the north side is reachable by walking around');
});
test('resources, fishing spots, goblins and landmarks follow the rules',()=>{
 const tiles=[...map.values()].filter(t=>land.tile(t.x,t.z)===t);
 const res=land.entities(tiles),extras=land.extras(tiles);
 const count=k=>res.filter(e=>e.kind===k).length;
 for(const k of ['tree','boulder','copper','sticks','stones'])assert.ok(count(k)>5,`${k}: ${count(k)}`);
 assert.ok(res.every(e=>land.roadDistance(e.x,e.z)>2&&!map.get(key(e.x,e.z)).water),'nothing on roads or water');
 assert.equal(new Set(res.map(e=>e.id)).size,res.length,'stable unique ids');
 const fish=extras.filter(e=>e.kind==='fishing');assert.ok(fish.length>=10,`fishing spots: ${fish.length}`);
 const reach=reachableFrom(map,city.spawn);
 for(const f of fish)assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const n=map.get(key(f.x+dx,f.z+dz));return n&&!n.water&&n.h-.5<=.5&&reach.has(n);}),`fished from a reachable shore: ${f.id}`);
 const goblins=extras.filter(e=>e.kind==='enemy');assert.ok(goblins.length>=8&&goblins.length<=80,`goblins: ${goblins.length}`);
 assert.ok(goblins.every(g=>land.roadDistance(g.x,g.z)>10&&land.outside(g.x,g.z)>22),'away from roads and the wall');
 assert.ok(goblins.every(g=>!g.aggressive||land.roadDistance(g.x,g.z)>18),'only deep ones are aggressive');
 const props=extras.filter(e=>e.kind==='prop');assert.equal(props.length,land.landmarks.reduce((n,l)=>n+l.props.length,0),'every landmark prop placed');
 for(const p of props){const t=map.get(key(p.x,p.z));assert.ok(t&&!t.water,`${p.id} on land`);}
 assert.ok(SEA>0);
});

test('green spaces vary: tree species by place, ponds, and ground cover',async()=>{
 const {COVER_KINDS}=await import('./ground-cover.js'),{TREE_SPECIES}=await import('./tree-models.js');
 const tiles=[...map.values()].filter(t=>land.tile(t.x,t.z)===t),trees=land.entities(tiles).filter(e=>e.kind==='tree');
 const bySpecies={};for(const tr of trees)bySpecies[tr.species]=(bySpecies[tr.species]||0)+1;
 for(const s of ['oak','birch','pine','willow','cherry','maple'])assert.ok(bySpecies[s]>=5,`${s}: ${bySpecies[s]}`);
 for(const s of Object.keys(bySpecies))assert.ok(TREE_SPECIES[s],s);
 for(const tr of trees.filter(t=>t.species==='pine').slice(0,20))assert.ok(map.get(key(tr.x,tr.z)).h>=2,'pines on the hills');
 assert.ok(land.ponds.length>=4,`ponds: ${land.ponds.length}`);
 assert.ok(land.ponds.some(p=>map.get(key(Math.round(p.x),Math.round(p.z)))?.water),'a pond holds water');
 const cover=land.cover(tiles),kinds=new Set(cover.map(c=>c.kind));
 for(const k of kinds)assert.ok(COVER_KINDS.includes(k),k);
 for(const k of ['grass','fern','mushrooms','reeds','lilyPad','pebbles','flowerPink','flowerBlue'])assert.ok(kinds.has(k),`cover has ${k}`);
 assert.ok(cover.every(c=>land.roadDistance(Math.round(c.x),Math.round(c.z))>1||map.get(key(Math.round(c.x),Math.round(c.z)))?.water),'nothing on roads');
 assert.deepEqual(createCountryside({city:data}).cover(tiles.slice(0,500)),land.cover(tiles.slice(0,500)),'the same every time');
});
test('ground cover is instanced: chunks take and free slots, one mesh per kind',async()=>{
 const {createGroundCoverPool}=await import('./ground-cover.js');
 const parent=new THREE.Group(),pool=createGroundCoverPool({parent,capacity:10});
 const a=pool.add([{kind:'grass',x:1,y:1,z:1},{kind:'grass',x:2,y:1,z:1},{kind:'flowerPink',x:3,y:1,z:1}]);
 assert.deepEqual(pool.stats,{grass:2,flowerPink:1});assert.equal(parent.children.length,2,'one mesh per kind');
 a.dispose();assert.deepEqual(pool.stats,{grass:0,flowerPink:0});
 pool.add([{kind:'grass',x:5,y:1,z:5}]);assert.equal(parent.children.find(m=>m.name==='ground-cover-grass').count,2,'freed slots are reused, not grown');
 pool.add(Array.from({length:20},(_,i)=>({kind:'fern',x:i,y:1,z:0})));assert.equal(pool.stats.fern,20,'a full pool grows (no chunk left bare)');
});
