import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {packMap,unpackMap} from './map-file.js';
import {createMapData,setMapOffset,mapOffset,setMapHeight,mapHeight} from './world-map.js';

const canon=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort()):v);
test('a packed map keeps only what differs, and unpacks to the same map',()=>{
 const data=createMapData({size:[256,128],land:{seed:1,default:'meadow',origin:[-64,0],cells:{'-3,2':'forest','-2,2':'forest','5,2':'coast','4,9':'wetland'},terrain:{'1,1':'river'}}});
 setMapOffset(data,10,20,1.5);setMapOffset(data,200,5,-1);
 const packed=packMap(data),text=JSON.stringify(packed);
 assert.ok(text.length<2000,`small: ${text.length} bytes`);
 assert.deepEqual(Object.keys(packed.regions['0,0'].offsets.rows),['20'],'one changed row');assert.equal(packed.regions['0,0'].surfaces.fill,'.');
 assert.equal(canon(unpackMap(JSON.parse(text))),canon(data));
 assert.ok(Array.isArray(data.regions['0,0'].offsets),'packing leaves the map itself as it was');
});
test('a packed map is read as it is, a region unpacked the first time it’s read',()=>{
 const data=createMapData({size:[128,128]});setMapHeight(data,3,4,2.5);
 const loaded=JSON.parse(JSON.stringify(packMap(data)));assert.equal(mapHeight(loaded,3,4),2.5);assert.equal(mapHeight(loaded,9,9),1);
 const land=JSON.parse(JSON.stringify(packMap(createMapData({size:[128,128],land:{seed:1,default:'meadow'}}))));assert.equal(mapOffset(land,5,5),0);
});
test('the repo’s maps are saved packed',()=>{
 for(const f of ['overworld','capital']){const data=JSON.parse(readFileSync(new URL(`./maps/${f}.json`,import.meta.url),'utf8'));
  for(const r of Object.values(data.regions))for(const layer of Object.values(r))assert.ok(!Array.isArray(layer),`${f}: packed regions`);}
});
