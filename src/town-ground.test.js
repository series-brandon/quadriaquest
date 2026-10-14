import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCityData,buildCity,cityTiles,cityGround,setCitySurface,clearCitySurface,setCityOffset,cityOffset,citySurface,putOnLand,takeOffLand,fillCity,cityHeight} from './city-map.js';
import {townLand,townSource,footprintCells,PAD_APRON} from './town-ground.js';
import {surfaceColor} from './city-terrain.js';
import {BUILDING_PRESETS} from './building-kit.js';
import {key} from './world.js';
import {chunkId} from './world-grid.js';

// A town on rolling hills (docs/TOWN.md, The town on the land).
const hillTown=()=>createCityData({id:'hill-town',size:[64,64],land:{seed:7,ring:32,default:'hills',cells:{}}});
const steps=map=>{let n=0;for(const t of map.values()){if(t.water)continue;for(const [dx,dz] of [[1,0],[0,1]]){const o=map.get(key(t.x+dx,t.z+dz));if(o&&!o.water&&!t.stair&&!o.stair&&Math.abs(o.h-t.h)>.5)n++;}}return n;};
// The steepest spot in the town: where a building most needs its pad.
function steepest(data){const land=townLand(data);let best=null;
 for(let z=4;z<54;z+=2)for(let x=4;x<54;x+=2){const hs=[];for(let b=0;b<5;b++)for(let a=0;a<5;a++){const t=land.tile(x+a,z+b);if(!t||t.water){hs.length=0;break;}hs.push(t.h);}
  if(hs.length&&(!best||Math.max(...hs)-Math.min(...hs)>best.range))best={x,z,range:Math.max(...hs)-Math.min(...hs)};}
 return best;}

test('the ground under a town is the land: same heights, the biome’s colours where nothing is painted',()=>{
 const data=hillTown(),land=townLand(data),tiles=cityTiles(data);
 for(const [x,z] of [[3,3],[30,40],[60,10]]){const t=tiles.get(key(x,z)),l=land.tile(x,z);assert.equal(t.h,l.h);assert.equal(t.water,l.water);
  if(!t.water)assert.equal(surfaceColor(t),l.palette[(x+z)&1],'the biome’s own colours');}
 assert.ok(new Set([...tiles.values()].map(t=>t.h)).size>2,'not a flat pad: the land rolls');
 setCitySurface(data,5,5,'cobble');const painted=cityTiles(data).get(key(5,5));assert.equal(painted.surface,'cobble');assert.equal(surfaceColor(painted),'#a9a39a','the town’s paint');
 clearCitySurface(data,5,5);assert.equal(citySurface(data,5,5),null,'unpainted again');
});
test('a building levels a pad: its footprint and a one-tile apron at one height, easing back without a cliff',()=>{
 const data=hillTown(),spot=steepest(data);assert.ok(spot.range>=1,`a slope to build on (${spot.range})`);
 data.buildings.push({x:spot.x,z:spot.z,desc:{...structuredClone(BUILDING_PRESETS.cottage),name:'On the slope'}});
 const ground=cityGround(data),tiles=cityTiles(data,ground),[pad]=ground.pads,cells=footprintCells(data.buildings[0]);
 for(const [x,z] of cells)for(let dz=-PAD_APRON;dz<=PAD_APRON;dz++)for(let dx=-PAD_APRON;dx<=PAD_APRON;dx++)assert.equal(tiles.get(key(x+dx,z+dz)).h,pad.level);
 assert.equal(steps(tiles),0,'no full-block steps anywhere');
 const built=buildCity(structuredClone(data),{scene:new THREE.Group()});assert.ok(built.buildings[0].plan.tiles.every(([x,z])=>built.tiles.get(key(x,z)).h===pad.level));
});
test('offsets are deltas on the land; water stays only where nothing is made',()=>{
 const data=createCityData({id:'wet',size:[64,64],land:{seed:4,ring:32,default:'wetland',cells:{}}}),land=townLand(data);
 const wet=[...cityTiles(data).values()].find(t=>t.water&&t.x>2&&t.z>2&&t.x<60&&t.z<60),dry=[...cityTiles(data).values()].find(t=>!t.water);
 assert.ok(wet&&dry);
 setCityOffset(data,dry.x,dry.z,1.5);assert.equal(cityOffset(data,dry.x,dry.z),1.5);assert.equal(cityTiles(data).get(key(dry.x,dry.z)).h,land.tile(dry.x,dry.z).h+1.5);
 setCitySurface(data,wet.x,wet.z,'dirt');const road=cityTiles(data).get(key(wet.x,wet.z));assert.equal(road.water,false,'a road across a pond is dry ground');assert.ok(road.h>=1);
 assert.equal(cityTiles(data).get(key(wet.x,wet.z)).surface,'dirt');
});
test('the land under a town grows nothing on what people made: roads, pads, props',()=>{
 const data=createCityData({id:'woods',size:[64,64],land:{seed:2,ring:32,default:'forest',cells:{}}});
 fillCity(data,{x0:0,z0:30,x1:63,z1:32},{surface:'dirt'});
 data.buildings.push({x:10,z:10,desc:{...structuredClone(BUILDING_PRESETS.cottage),name:'Cottage'}});data.props.push({kind:'bench',x:40,z:40});
 const built=buildCity(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles);
 const all=[];for(let z=0;z<64;z++)for(let x=0;x<64;x++)all.push(source.tile(x,z));
 const grown=[...source.entities(all),...source.extras(all),...source.cover(all)];
 for(const e of grown){const t=built.tiles.get(key(Math.round(e.x),Math.round(e.z)));if(!t)continue;
  assert.ok(!t.made&&t.building===undefined&&!t.prop,`${e.kind} at ${e.x},${e.z} on made ground`);}
 assert.ok(grown.some(e=>e.kind==='tree'),'trees still grow in the town’s open woods');
 assert.ok(all.every((t,i)=>t===built.tiles.get(key(i%64,Math.floor(i/64)))),'the streamer draws the town’s own tiles, as regular chunks');
 assert.equal(source.topColor(built.tiles.get(key(5,31))).getHexString(),'b39b78','painted roads in the town’s colours');
});
test('moving a building re-levels its pad; the rebuild covers every chunk whose ground moved and matches a fresh build',()=>{
 const data=hillTown(),spot=steepest(data);data.buildings.push({x:spot.x,z:spot.z,desc:{...structuredClone(BUILDING_PRESETS.cottage),name:'Mover'}});
 const city=buildCity(data,{scene:new THREE.Group()}),before=footprintCells(data.buildings[0]);
 data.buildings[0].x=spot.x<32?40:8;data.buildings[0].z=spot.z<32?40:8;
 const after=footprintCells(data.buildings[0]),only=city.rebuild([...new Set([...before,...after].map(c=>chunkId(...c)))]);assert.ok(only);
 const fresh=buildCity(structuredClone(data),{scene:new THREE.Group()});
 for(const [k,t] of fresh.tiles)assert.equal(city.tiles.get(k).h,t.h,k);
});
test('a flat city goes onto the land and off again, keeping its terraces and paint',()=>{
 const data=createCityData({id:'flat',size:[32,32]});fillCity(data,{x0:4,z0:4,x1:8,z1:8},{h:2,surface:'cobble'});
 putOnLand(data,{seed:1,ring:32,default:'meadow',cells:{}});
 assert.equal(cityOffset(data,5,5),1,'a block above the land');assert.equal(cityOffset(data,20,20),0);assert.equal(citySurface(data,20,20),null,'grass is the land’s own ground');assert.equal(citySurface(data,5,5),'cobble');
 takeOffLand(data);assert.equal(cityHeight(data,5,5),2);assert.equal(cityHeight(data,20,20),1);assert.equal(citySurface(data,20,20),'grass');assert.equal(data.land,undefined);
});
test('nature by hand: placed trees and cover stream like grown ones; removed ones stay gone',()=>{
 const data=createCityData({id:'woods',size:[64,64],land:{seed:2,ring:32,default:'forest',cells:{}}});
 const built=buildCity(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles,()=>data);
 const all=[];for(let z=0;z<64;z++)for(let x=0;x<64;x++)all.push(built.tiles.get(key(x,z)));
 const tree=source.entities(all).find(e=>e.kind==='tree'),flower=source.cover(all)[0],fx=Math.round(flower.x),fz=Math.round(flower.z);
 data.land.removed=[tree.id,`cover:${fx},${fz}`];
 assert.ok(!source.entities(all).some(e=>e.id===tree.id),'a removed tree stays gone');
 assert.ok(!source.cover(all).some(c=>Math.round(c.x)===fx&&Math.round(c.z)===fz),'removed cover stays gone');
 const open=all.find(t=>!t.water&&!source.natureAt(t).resource&&!source.natureAt(t).cover);
 data.resources=[{kind:'tree',species:'cherry',x:open.x,z:open.z}];data.cover=[{kind:'fern',x:open.x,z:open.z}];
 const here=source.natureAt(open);
 assert.deepEqual([here.resource.kind,here.resource.species,here.resource.placed],['tree','cherry',true]);assert.deepEqual([here.cover.kind,here.cover.placed],['fern',true]);
 assert.ok(source.entities([open]).some(e=>e.id==='placed:tree:'+open.x+','+open.z),'a placed tree is a streamed entity');
 // A placed resource replaces whatever grew on its tile: one per tile.
 const grownTile=all.find(t=>source.natureAt(t).resource&&!source.natureAt(t).resource.placed);
 data.resources.push({kind:'boulder',x:grownTile.x,z:grownTile.z});assert.deepEqual(source.entities([grownTile]).map(e=>e.kind),['boulder']);
});
