import test from 'node:test';
import assert from 'node:assert/strict';
import {createAreaRuntime} from './area-runtime.js';
import {createTravelSystem} from './travel.js';
import {createCrystalPlaces} from './crystal-places.js';
import {crystalFootprint} from './crystal-model.js';
import {portalSpawn} from './portal-spawn.js';
import {mapCrystals,packMap,unpackMap} from './map-file.js';
import {createMapData} from './world-map.js';
import {key} from './world.js';

const grid=(w,d,h=1)=>{const m=new Map();for(let z=0;z<d;z++)for(let x=0;x<w;x++)m.set(key(x,z),{x,z,h,blocked:false});return m;};
test('an Iter Crystal stands on 2 × 2 open, level, dry tiles, and you step off beside them',()=>{
 const m=grid(6,6),at=(x,z)=>m.get(key(x,z));
 assert.deepEqual(crystalFootprint(at(2,2),at).map(t=>[t.x,t.z]),[[2,2],[3,2],[2,3],[3,3]],'from its tile, south-east');
 at(3,2).water=true;assert.deepEqual(crystalFootprint(at(2,2),at).map(t=>[t.x,t.z]),[[1,2],[2,2],[1,3],[2,3]],'another square holding it when that one is wet');
 const corner=grid(1,1),only=corner.get('0,0');assert.equal(crystalFootprint(only,(x,z)=>corner.get(key(x,z))).length,1,'its one tile when nothing fits');
 delete at(3,2).water;const foot=crystalFootprint(at(2,2),at);for(const t of foot)t.blocked=true;at(2,2).crystalFootprint=foot;
 assert.deepEqual([portalSpawn(m,at(2,2))].map(t=>[t.x,t.z]),[[2,4]],'south of the footprint');
});
test('a map’s old single crystal becomes the first of its crystals, known, and survives packing',()=>{
 const legacy={id:'isle',name:'The Isle',crystal:[4,5]};assert.deepEqual(mapCrystals(legacy),[{id:'isle',name:'The Isle',x:4,z:5,known:true}]);assert.equal(legacy.crystal,undefined);
 const data=createMapData({size:[128,128]});data.crystals.push({id:'a',name:'A',x:1,z:1},{id:'b',name:'B',x:9,z:9,known:true});
 assert.deepEqual(unpackMap(JSON.parse(JSON.stringify(packMap(data)))).crystals,data.crystals);
});
function fixture(){
 const world=new Map(),areas=createAreaRuntime({world}),places=createCrystalPlaces();
 const map=grid(20,20),tutorial=grid(4,4),tc=tutorial.get('1,1');tc.blocked=true;
 for(const [x,z] of [[2,2],[12,12]]){const t=map.get(key(x,z)),foot=crystalFootprint(t,(a,b)=>map.get(key(a,b)));for(const f of foot)f.blocked=true;t.crystalFootprint=foot;}
 areas.register({id:'world',group:{visible:true},tiles:map,arrival:()=>map.get('2,2')});areas.register({id:'tutorial',group:{visible:true},tiles:tutorial,arrival:()=>tc});
 places.provide('world',()=>[{id:'home',name:'Home',known:true,tile:()=>map.get('2,2')},{id:'far',name:'Far Point',tile:()=>map.get('12,12')}]);
 areas.activate('tutorial',{landing:tutorial.get('1,2')});
 return {areas,places,travel:createTravelSystem({areas,places,stop:()=>{}}),map};
}
test('each crystal is a destination of its own once discovered; known ones from the start',()=>{
 const f=fixture();
 assert.equal(f.places.listed('home'),true);assert.equal(f.places.listed('far'),false,'not until discovered');
 assert.equal(f.places.discover('far'),true);assert.equal(f.places.discover('far'),false,'once');assert.equal(f.places.listed('far'),true);
 f.places.reset();assert.equal(f.places.listed('far'),false);f.places.discoverAll();assert.equal(f.places.listed('far'),true);
});
test('travel goes to a crystal, and from one crystal to another in the same area',()=>{
 const f=fixture();
 assert.ok(f.travel.request('home'));f.travel.update(.8);f.travel.update(1);assert.equal(f.areas.id,'world');
 const here={place:'home',available:()=>true};
 assert.equal(f.travel.request('home',{source:here}),false,'not to the crystal you stand at');
 assert.ok(f.travel.request('far',{source:here}),'to another in the same area');f.travel.update(.8);f.travel.update(1);
 assert.equal(f.areas.id,'world');const landing=f.travel.landingFor('far');assert.ok(landing&&Math.abs(landing.x-12.5)<=1.5&&Math.abs(landing.z-12.5)<=1.5,'beside it');
 assert.ok(f.travel.request('tutorial',{source:{place:'far',available:()=>true}}),'area destinations still work');
});
