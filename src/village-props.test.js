import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PROPS,PROP_CATEGORIES,createProp,updateProps,propModel} from './props.js';
import {createMapData,buildMap} from './world-map.js';
import {key,findPath} from './world.js';

// Village and coast props (prop-sets/village.js; docs/TOWN.md, Prop palette) and the shared options they
// brought: water, deck and spin.
const strip=()=>{const map=new Map();for(let x=0;x<4;x++){const water=x>=2;map.set(key(x,0),{x,z:0,h:water?.5:1,water,blocked:water,still:true,surface:water?'water':'grass'});}return map;};
const place=(kind,map,x,parent=new THREE.Group())=>createProp(kind,{origin:[x,0],tileAt:(a,b)=>map.get(key(a,b)),parent});

test('every village and coast prop builds a model and is in the palette',()=>{
 for(const kind of PROP_CATEGORIES['Village and coast']){const group=propModel(kind);let meshes=0;group.traverse(o=>{if(o.isMesh)meshes++;});assert.ok(meshes>0,kind);}
 assert.ok(['waterwheel','cabbageRow','wheatRow','scarecrow','shrine','quay','jetty','rowboat','lighthouse','shipwreck','tidePools','sawhorse'].every(k=>PROPS[k]));
});
test('a jetty makes its water tiles walkable boards at ground level, and gives them back when removed',()=>{
 const map=strip(),jetty=place('jetty',map,2),t=map.get(key(2,0));
 assert.deepEqual([t.h,t.water,t.blocked,t.overWater,t.noTerrain],[1,false,false,true,true]);
 assert.ok(findPath(map,map.get(key(0,0)),t),'walk out onto it');
 jetty.dispose();assert.deepEqual([t.h,t.water,t.blocked,t.overWater],[.5,true,true,undefined]);
});
test('water props: a boat only on water, land props never on it',()=>{
 const ground=(water)=>(x,z)=>({x,z,h:water?.5:1,water,blocked:water}),put=(kind,water)=>createProp(kind,{origin:[0,0],tileAt:ground(water),parent:new THREE.Group()});
 assert.throws(()=>put('rowboat',false),/goes on water/);assert.throws(()=>put('bench',true),/can't go on water/);
 assert.ok(put('rowboat',true));assert.ok(put('waterwheel',true)&&put('waterwheel',false),'a waterwheel goes on either');
});
test('a waterwheel turns each frame',()=>{
 const map=strip(),wheel=createProp('waterwheel',{origin:[1,0],tileAt:(a,b)=>map.get(key(a,0))&&{...map.get(key(a,0)),z:b},parent:new THREE.Group()});
 const pivot=wheel.group.userData.spin,before=pivot.rotation.x;updateProps(.5);assert.notEqual(pivot.rotation.x,before);
 wheel.dispose();
});
test('a jetty in a town on the land keeps its pond, and you can walk onto it',()=>{
 const data=createMapData({id:'wet',size:[64,64],land:{seed:4,default:'wetland',cells:{}}}),probe=buildMap(structuredClone(data),{scene:new THREE.Group()});
 const tiles=[...probe.tiles.values()],wet=tiles.find(t=>t.water&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>{const n=probe.tiles.get(key(t.x+dx,t.z+dz));return n&&!n.water;})&&t.x>2&&t.z>2&&t.x<60&&t.z<60);
 data.props.push({kind:'jetty',x:wet.x,z:wet.z});
 const city=buildMap(data,{scene:new THREE.Group()}),deck=city.tiles.get(key(wet.x,wet.z));
 assert.equal(deck.overWater,true,'still water below');assert.equal(deck.water,false);
 const shore=tiles.find(t=>!t.water&&Math.abs(t.x-wet.x)+Math.abs(t.z-wet.z)===1);assert.ok(findPath(city.tiles,city.tiles.get(key(shore.x,shore.z)),deck));
});
