import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validCampTile} from './placement-rules.js';

// Minimal drawing/controls adapter; exercise the real station system and routing.
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context,querySelector:()=>({})}),body:{append(){}}};
const {createCampfires}=await import('./campfires.js');
function fixture(){
 const map=()=>new Map(Array.from({length:9},(_,i)=>{const t={x:i%3,z:Math.floor(i/3),h:1,blocked:false,water:false};return [`${t.x},${t.z}`,t];}));
 const world=map(),first=new Map(world),second=map(),inventory={campfires:2};let tile=world.get('0,0'),station,approaching,placed=0;
 let system;system=createCampfires({world,scene:new THREE.Scene(),pickables:[],inventory,tile:()=>tile,busy:()=>false,occupied:t=>t===tile,
 stop:()=>system.cancel(),closeMenus(){},toast(){},showItems(){},feedback:{pulse(){}},hover:()=>null,
 approach:a=>{system.cancel();approaching=a;},cookingMenu:{open:a=>station=a},onPlaced:()=>placed++});
 return {system,inventory,world,first,second,get station(){return station;},get approaching(){return approaching;},get placed(){return placed;},switchTo(map){system.cancel();world.clear();for(const [k,t]of map)world.set(k,t);tile=world.get('0,0');system.update(1);}};
}
test('ordinary land supports placement without area-specific metadata',()=>{
 assert.ok(validCampTile({h:1}));
 for(const tile of [undefined,{water:true},{blocked:true},{buildable:false}])assert.equal(validCampTile(tile),false);
});
test('place, use, pack and preserve stations in independent maps with identical coordinates',()=>{
 const f=fixture(),a=f.system.place(f.world.get('1,1'));assert.ok(a);assert.equal(f.inventory.campfires,1);
 f.system.open();assert.ok(f.station.available());const firstContext=f.station;
 f.switchTo(f.second);assert.equal(firstContext.available(),false);assert.equal(a.group.visible,false);assert.equal(f.system.current,undefined);
 const b=f.system.place(f.world.get('1,1'));assert.ok(b);assert.equal(f.inventory.campfires,0);
 f.system.open();f.station.pack();assert.equal(f.inventory.campfires,1);assert.equal(b.tile.blocked,false);
 f.switchTo(f.first);assert.equal(f.system.current,a);assert.ok(a.group.visible);f.system.open();f.station.pack();assert.equal(f.inventory.campfires,2);assert.equal(a.tile.blocked,false);
});
test('placement cancellation costs nothing and arriving revalidates changed terrain',()=>{
 const f=fixture();f.system.begin();f.system.selectPlacement(f.world.get('1,1'));assert.ok(f.approaching);assert.ok(f.system.placementTile);assert.equal(f.inventory.campfires,2);
 f.system.cancel();assert.equal(f.system.placementTile,null);assert.equal(f.inventory.campfires,2);
 f.system.begin();f.system.selectPlacement(f.world.get('1,1'));f.approaching.tile.blocked=true;f.system.interact(f.approaching);assert.equal(f.placed,0);assert.equal(f.inventory.campfires,2);
});
