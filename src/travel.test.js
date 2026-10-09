import test from 'node:test';
import assert from 'node:assert/strict';
import {createAreaRuntime} from './area-runtime.js';
import {createTravelSystem} from './travel.js';
function fixture(){
 const world=new Map(),events=[],fades=[];let stops=0,failures=0,occupied=null;
 const areas=createAreaRuntime({world,beforeSwitch:()=>events.push('switch'),placePlayer:t=>events.push(t),applyCamera:c=>events.push(c)});
 for(const id of ['first','second','third']){const crystal={x:0,z:0,h:0,blocked:true},landing={x:0,z:1,h:0};areas.register({id,group:{visible:true},tiles:new Map([['0,0',crystal],['0,1',landing]]),arrival:()=>crystal,enter:o=>events.push([id,o.arrival]),leave:()=>events.push('leave '+id),update:()=>id,camera:{zoom:12}});}
 areas.activate('first');
 const travel=createTravelSystem({areas,stop:()=>stops++,occupied:t=>t===occupied,fade:v=>fades.push(v),failed:()=>failures++});
 return {areas,travel,world,events,fades,get stops(){return stops;},get failures(){return failures;},occupy:t=>occupied=t};
}
test('area runtime routes arbitrary maps with original tile identities and one entry',()=>{
 const f=fixture();for(const id of ['second','third','first']){const area=f.areas.get(id);assert.equal(f.areas.activate(id,{landing:area.tiles.get('0,1')}),true);assert.equal(f.world.get('0,1'),area.tiles.get('0,1'));assert.equal(f.areas.update(),id);assert.equal(area.group.visible,true);for(const other of ['first','second','third'].filter(x=>x!==id))assert.equal(f.areas.get(other).group.visible,false);const count=f.events.length;f.areas.enter();assert.equal(f.events.length,count);}
 assert.equal(f.areas.activate('second',{landing:{x:0,z:1,h:0}}),false);assert.equal(f.areas.id,'first');
});
test('travel commits once, preserves state, supports repeated trips and a third map',()=>{
 const f=fixture();let rewards=0;for(const id of ['second','first','third','first']){assert.ok(f.travel.request(id,{onArrive:()=>rewards++}));assert.equal(f.travel.request(id),false);f.travel.update(.8);assert.equal(f.areas.id,id);assert.ok(f.travel.busy);f.travel.update(1);assert.equal(f.travel.busy,false);f.travel.update(9);}assert.equal(rewards,4);assert.equal(f.stops,4);assert.equal(f.fades.at(-1),0);
});
test('cancellation before switch retains source; cancellation after switch enters quietly once',()=>{
 const f=fixture();let rewards=0;f.travel.request('second',{onArrive:()=>rewards++});f.travel.update(.4);f.travel.cancel();assert.equal(f.areas.id,'first');f.travel.update(2);assert.equal(rewards,0);
 f.travel.request('second',{onArrive:()=>rewards++});f.travel.update(.9);f.travel.cancel();assert.equal(f.areas.id,'second');assert.deepEqual(f.events.at(-1),['second',false]);const n=f.events.length;f.travel.cancel();f.travel.update(5);assert.equal(f.events.length,n);assert.equal(rewards,0);assert.equal(f.fades.at(-1),0);
});
test('landing and crystal availability are revalidated during fade',()=>{
 const f=fixture(),landing=f.areas.get('second').tiles.get('0,1');f.occupy(landing);assert.equal(f.travel.request('second'),false);f.occupy(null);assert.ok(f.travel.request('second'));landing.blocked=true;f.travel.update(.8);assert.equal(f.areas.id,'first');assert.equal(f.travel.busy,false);landing.blocked=false;
 let available=true;const source={available:()=>available};assert.ok(f.travel.request('second',{source}));available=false;f.travel.update(.8);assert.equal(f.areas.id,'first');available=true;f.travel.request('second',{source});f.travel.cancelFrom(source);assert.equal(f.travel.busy,false);assert.equal(f.failures,3);
});
