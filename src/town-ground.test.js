import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMapData,buildMap,mapTiles,mapGround,setMapSurface,clearMapSurface,setMapOffset,mapOffset,mapSurface,putOnLand,takeOffLand,fillMap,mapHeight,growMap} from './world-map.js';
import {townLand,townSource,footprintCells,PAD_APRON} from './town-ground.js';
import {surfaceColor} from './map-terrain.js';
import {BUILDING_PRESETS} from './building-kit.js';
import {key} from './world.js';
import {chunkId} from './world-grid.js';

// A town on rolling hills (docs/TOWN.md, The town on the land).
const hillTown=()=>createMapData({id:'hill-town',size:[64,64],land:{seed:7,default:'hills',cells:{}}});
const steps=map=>{let n=0;for(const t of map.values()){if(t.water)continue;for(const [dx,dz] of [[1,0],[0,1]]){const o=map.get(key(t.x+dx,t.z+dz));if(o&&!o.water&&!t.stair&&!o.stair&&Math.abs(o.h-t.h)>.5)n++;}}return n;};
// The steepest spot in the town: where a building most needs its pad.
function steepest(data){const land=townLand(data);let best=null;
 for(let z=4;z<54;z+=2)for(let x=4;x<54;x+=2){const hs=[];for(let b=0;b<5;b++)for(let a=0;a<5;a++){const t=land.tile(x+a,z+b);if(!t||t.water){hs.length=0;break;}hs.push(t.h);}
  if(hs.length&&(!best||Math.max(...hs)-Math.min(...hs)>best.range))best={x,z,range:Math.max(...hs)-Math.min(...hs)};}
 return best;}

test('the ground under a town is the land: same heights, the biome’s colours where nothing is painted',()=>{
 const data=hillTown(),land=townLand(data),tiles=mapTiles(data);
 for(const [x,z] of [[3,3],[30,40],[60,10]]){const t=tiles.get(key(x,z)),l=land.tile(x,z);assert.equal(t.h,l.h);assert.equal(t.water,l.water);
  if(!t.water)assert.equal(surfaceColor(t),l.palette[(x+z)&1],'the biome’s own colours');}
 assert.ok(new Set([...tiles.values()].map(t=>t.h)).size>2,'not a flat pad: the land rolls');
 setMapSurface(data,5,5,'cobble');const painted=mapTiles(data).get(key(5,5));assert.equal(painted.surface,'cobble');assert.equal(surfaceColor(painted),'#a9a39a','the town’s paint');
 clearMapSurface(data,5,5);assert.equal(mapSurface(data,5,5),null,'unpainted again');
});
test('a building levels a pad: its footprint and a one-tile apron at one height, easing back without a cliff',()=>{
 const data=hillTown(),spot=steepest(data);assert.ok(spot.range>=1,`a slope to build on (${spot.range})`);
 data.buildings.push({x:spot.x,z:spot.z,desc:{...structuredClone(BUILDING_PRESETS.cottage),name:'On the slope'}});
 const ground=mapGround(data),tiles=mapTiles(data,ground),[pad]=ground.pads,cells=footprintCells(data.buildings[0]);
 for(const [x,z] of cells)for(let dz=-PAD_APRON;dz<=PAD_APRON;dz++)for(let dx=-PAD_APRON;dx<=PAD_APRON;dx++)assert.equal(tiles.get(key(x+dx,z+dz)).h,pad.level);
 assert.equal(steps(tiles),0,'no full-block steps anywhere');
 const built=buildMap(structuredClone(data),{scene:new THREE.Group()});assert.ok(built.buildings[0].plan.tiles.every(([x,z])=>built.tiles.get(key(x,z)).h===pad.level));
});
test('offsets are deltas on the land; water stays only where nothing is made',()=>{
 const data=createMapData({id:'wet',size:[64,64],land:{seed:4,default:'wetland',cells:{}}}),land=townLand(data);
 const wet=[...mapTiles(data).values()].find(t=>t.water&&t.x>2&&t.z>2&&t.x<60&&t.z<60),dry=[...mapTiles(data).values()].find(t=>!t.water);
 assert.ok(wet&&dry);
 setMapOffset(data,dry.x,dry.z,1.5);assert.equal(mapOffset(data,dry.x,dry.z),1.5);assert.equal(mapTiles(data).get(key(dry.x,dry.z)).h,land.tile(dry.x,dry.z).h+1.5);
 setMapSurface(data,wet.x,wet.z,'dirt');const road=mapTiles(data).get(key(wet.x,wet.z));assert.equal(road.water,false,'a road across a pond is dry ground');assert.ok(road.h>=1);
 assert.equal(mapTiles(data).get(key(wet.x,wet.z)).surface,'dirt');
});
test('the land under a town grows nothing on what people made: roads, pads, props',()=>{
 const data=createMapData({id:'woods',size:[64,64],land:{seed:2,default:'forest',cells:{}}});
 fillMap(data,{x0:0,z0:30,x1:63,z1:32},{surface:'dirt'});
 data.buildings.push({x:10,z:10,desc:{...structuredClone(BUILDING_PRESETS.cottage),name:'Cottage'}});data.props.push({kind:'bench',x:40,z:40});
 const built=buildMap(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles);
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
 const builtMap=buildMap(data,{scene:new THREE.Group()}),before=footprintCells(data.buildings[0]);
 data.buildings[0].x=spot.x<32?40:8;data.buildings[0].z=spot.z<32?40:8;
 const after=footprintCells(data.buildings[0]),only=builtMap.rebuild([...new Set([...before,...after].map(c=>chunkId(...c)))]);assert.ok(only);
 const fresh=buildMap(structuredClone(data),{scene:new THREE.Group()});
 for(const [k,t] of fresh.tiles)assert.equal(builtMap.tiles.get(k).h,t.h,k);
});
test('a flat city goes onto the land and off again, keeping its terraces and paint',()=>{
 const data=createMapData({id:'flat',size:[32,32]});fillMap(data,{x0:4,z0:4,x1:8,z1:8},{h:2,surface:'cobble'});
 putOnLand(data,{seed:1,default:'meadow',cells:{}});
 assert.equal(mapOffset(data,5,5),1,'a block above the land');assert.equal(mapOffset(data,20,20),0);assert.equal(mapSurface(data,20,20),null,'grass is the land’s own ground');assert.equal(mapSurface(data,5,5),'cobble');
 takeOffLand(data);assert.equal(mapHeight(data,5,5),2);assert.equal(mapHeight(data,20,20),1);assert.equal(mapSurface(data,20,20),'grass');assert.equal(data.land,undefined);
});
test('nature by hand: placed trees and cover stream like grown ones; removed ones stay gone',()=>{
 const data=createMapData({id:'woods',size:[64,64],land:{seed:2,default:'forest',cells:{}}});
 const built=buildMap(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles,()=>data);
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
 // A placement's own settings ride on its entity (resource-rules.js instance overrides); nothing else does.
 data.enemies=[{enemy:'scrapper',x:grownTile.x,z:grownTile.z,drops:{always:[{item:'flint',count:1}]}}];
 const spawn=source.extras([grownTile]).find(e=>e.kind==='enemy');assert.equal(spawn.respawn,null,'no spawn respawn: the type\'s applies');assert.deepEqual(spawn.drops,{always:[{item:'flint',count:1}]});
 data.resources.at(-1).respawn=120;data.resources.at(-1).drops={always:[{item:'stone',count:4}]};data.resources.at(-1).note='x';
 const [own]=source.entities([grownTile]);assert.equal(own.respawn,120);assert.deepEqual(own.drops,{always:[{item:'stone',count:4}]});assert.equal('note' in own,false);
});
test('growing a map keeps the land and what was built where they were',()=>{
 const data=createMapData({id:'grow',size:[64,64],land:{seed:7,default:'hills',cells:{'2,2':'forest'}}});
 data.buildings.push({x:10,z:10,desc:{...structuredClone(BUILDING_PRESETS.cottage),name:'Cottage'}});data.props.push({kind:'bench',x:30,z:40});
 setMapSurface(data,5,5,'cobble');setMapOffset(data,6,6,1);data.crystals=[{id:'c',name:'C',x:20,z:20}];data.resources=[{kind:'tree',species:'oak',x:40,z:12}];data.land.removed=['tree:12,30'];
 const before=mapTiles(data);
 growMap(data,{west:32,north:64,east:32});
 assert.deepEqual(data.size,[128,128]);assert.deepEqual(data.land.origin,[-32,-64]);
 const after=mapTiles(data);
 for(const [x,z] of [[3,3],[6,6],[13,12],[50,50],[63,1]])assert.equal(after.get(key(x+32,z+64)).h,before.get(key(x,z)).h,`${x},${z}`);
 assert.equal(mapSurface(data,37,69),'cobble');assert.equal(mapOffset(data,38,70),1);
 assert.deepEqual([data.buildings[0].x,data.buildings[0].z,data.props[0].x,data.crystals[0].x,data.resources[0].z],[42,74,62,52,76]);
 assert.deepEqual(data.land.removed,['tree:44,94']);
 assert.equal(townLand(data).biomeAt(16+32+3,16+64+3),'forest','painted cells stay with the land');
 assert.throws(()=>growMap(data,{west:10}),/whole/);assert.throws(()=>growMap(data,{west:32}),/regions/,'a map stays whole regions');
 buildMap(data,{scene:new THREE.Group()});
});
test('repainting a biome rebuilds only around it, and matches a fresh build',()=>{
 const data=createMapData({id:'paint',size:[128,128],land:{seed:5,default:'meadow',cells:{}}}),builtMap=buildMap(data,{scene:new THREE.Group()});
 data.land.cells['8,8']='hills';data.land.cells['8,9']='hills';
 const m=48,x0=64-m,z0=64-m,x1=72+m,z1=80+m;builtMap.ground.land.forget(x0,z0,x1,z1);
 const dirty=[];for(let cz=Math.floor(z0/32);cz<=Math.floor(z1/32);cz++)for(let cx=Math.floor(x0/32);cx<=Math.floor(x1/32);cx++)dirty.push(`${cx},${cz}`);
 assert.ok(builtMap.rebuild(dirty));
 const fresh=buildMap(structuredClone(data),{scene:new THREE.Group()});
 for(const [k,t] of fresh.tiles)assert.equal(builtMap.tiles.get(k).h,t.h,k);
});
test('a blank slate: with generated nature off only placed nature grows; enemies and fishing still come from the biomes',()=>{
 const data=createMapData({id:'blank',size:[64,64],land:{seed:2,default:'forest',cells:{},nature:false}});
 const built=buildMap(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles,()=>data);
 const all=[];for(let z=0;z<64;z++)for(let x=0;x<64;x++)all.push(built.tiles.get(key(x,z)));
 assert.equal(source.entities(all).length,0,'no trees or resources of its own');assert.equal(source.cover(all).length,0,'no ground cover of its own');
 // What the Grow brush places: the land's own pick for a tile (the generator, seeded), placed as the map's own.
 const t=all.find(t=>!t.water&&built.ground.land.entities([t]).length);const [pick]=built.ground.land.entities([t]);
 data.resources=[{kind:pick.kind,...pick.species?{species:pick.species}:{},x:t.x,z:t.z}];
 assert.deepEqual(source.entities(all).map(e=>[e.kind,e.x,e.z]),[[pick.kind,t.x,t.z]],'placed nature still grows');
 data.land.nature=true;assert.ok(source.entities(all).length>1,'on again: the forest grows');
});
test('generated enemies off: no goblins from the biomes, fishing spots stay',()=>{
 const data=createMapData({id:'calm',size:[160,160],land:{seed:2,default:'forest',cells:{},terrain:{'5,5':'lakeland','6,5':'lakeland','5,6':'lakeland','6,6':'lakeland'}}});
 const built=buildMap(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles,()=>data);
 const all=[...built.tiles.values()],kinds=()=>new Set(source.extras(all).map(e=>e.kind));
 assert.ok(kinds().has('enemy'),'the forest spawns goblins');
 data.land.enemies=false;assert.ok(!kinds().has('enemy'),'none when off');
 assert.ok(source.extras(all).every(e=>e.kind==='fishing'));
});
test('fishing spots: generated ones off, placed ones on water',()=>{
 const terrain={};for(let cz=0;cz<20;cz++)for(let cx=0;cx<20;cx++)terrain[`${cx},${cz}`]=cx>=10?'sea':'plains';
 const data=createMapData({id:'shore',size:[160,160],land:{seed:4,default:'coast',cells:{},terrain}});
 const built=buildMap(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles,()=>data);
 const all=[...built.tiles.values()],spots=()=>source.extras(all).filter(e=>e.kind==='fishing');
 assert.ok(spots().length>0,'the sea gets spots of its own');
 data.land.fishing=false;assert.equal(spots().length,0,'none when off');
 const water=all.find(t=>t.water);data.fishing=[{x:water.x,z:water.z}];
 assert.deepEqual(spots().map(e=>[e.id,e.x,e.z]),[[`placed:fishing:${water.x},${water.z}`,water.x,water.z]],'a placed spot');
 assert.equal(source.natureAt(water).fishing.placed,true);
});
test('placed enemy spawns stream with their kind, behaviour and respawn, even with generated enemies off',()=>{
 const data=createMapData({id:'camp',size:[64,64],land:{seed:2,default:'meadow',cells:{},enemies:false}});
 const built=buildMap(data,{scene:new THREE.Group()}),source=townSource(built.ground.land,()=>built.ground,()=>built.tiles,()=>data);
 const all=[...built.tiles.values()],dry=all.find(t=>!t.water&&t.x>10&&t.z>10);
 data.enemies=[{x:dry.x,z:dry.z,enemy:'bruiser',aggressive:true,respawn:120}];
 const spawns=source.extras(all).filter(e=>e.kind==='enemy');
 assert.deepEqual(spawns.map(e=>[e.enemy,e.aggressive,e.respawn,e.x,e.z]),[['bruiser',true,120,dry.x,dry.z]]);
 assert.equal(spawns[0].id,`placed:enemy:${dry.x},${dry.z}`);
 growMap(data,{west:64,north:64});assert.deepEqual([data.enemies[0].x,data.enemies[0].z],[dry.x+64,dry.z+64],'spawns move when the map grows');
});
test('water painted by hand is a still pond tile; clearing it gives the land back',()=>{
 const data=hillTown(),dry=[...mapTiles(data).values()].find(t=>!t.water);
 setMapSurface(data,dry.x,dry.z,'water');assert.equal(mapSurface(data,dry.x,dry.z),'water');
 const wet=mapTiles(data).get(key(dry.x,dry.z));assert.equal(wet.water,true);assert.equal(wet.blocked,true);assert.equal(wet.still,true);assert.equal(wet.h,.5);
 clearMapSurface(data,dry.x,dry.z);const back=mapTiles(data).get(key(dry.x,dry.z));assert.equal(back.water,false);assert.equal(back.h,dry.h);
});
test('water raised by hand: one half block makes beach-height dry ground (the shore’s look), lowering it is water again',()=>{
 const data=createMapData({id:'coast',size:[64,64],land:{seed:7,default:'coast',cells:{},terrain:{'4,4':'sea','4,5':'sea','5,4':'sea','5,5':'sea'}}}),wet=mapTiles(data).get(key(40,40));assert.ok(wet.water,'sea to raise');
 setMapOffset(data,wet.x,wet.z,.5);const beach=mapTiles(data).get(key(wet.x,wet.z));assert.equal(beach.water,false);assert.equal(beach.h,1,'the banks’ height');assert.equal(beach.shore,true);
 setMapOffset(data,wet.x,wet.z,1);assert.equal(mapTiles(data).get(key(wet.x,wet.z)).h,1.5);
 setMapOffset(data,wet.x,wet.z,0);assert.equal(mapTiles(data).get(key(wet.x,wet.z)).water,true,'lowered back: water');
 setMapSurface(data,wet.x,wet.z,'cobble');assert.equal(mapTiles(data).get(key(wet.x,wet.z)).h,1,'a path across water is still at ground level');
});
