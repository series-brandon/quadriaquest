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
