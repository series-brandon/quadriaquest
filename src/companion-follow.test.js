import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {key} from './world.js';
import {companionRoute,createCompanionFollower} from './companion-follow.js';
const world=()=>new Map(Array.from({length:25},(_,i)=>{const t={x:i%5,z:Math.floor(i/5),h:1};return [key(t.x,t.z),t];}));
test('follower routes to a free neighbor, avoids player and reserved landing',()=>{const map=world(),player=map.get('2,2'),start=map.get('0,2');map.get('1,2').blocked=true;const path=companionRoute(map,start,player,t=>t.x===2&&t.z===1);assert.ok(path.length>1);assert.ok(path.every(t=>t!==player&&!t.blocked));assert.notEqual(path.at(-1),map.get('2,1'));assert.equal(Math.abs(path.at(-1).x-2)+Math.abs(path.at(-1).z-2),1);});
test('follower settles without drifting and yields its tile when the player routes there',()=>{const map=world(),player=map.get('2,2'),model=new Group(),follow=createCompanionFollower(model);follow.update(.016,map,player);const resting=model.position.clone(),restTile=map.get(key(Math.round(resting.x+6),Math.round(resting.z+6)));for(let i=0;i<120;i++)assert.equal(follow.update(1/60,map,player),false);assert.ok(model.position.equals(resting));for(let i=0;i<120;i++)follow.update(1/60,map,player,t=>t===restTile);assert.equal(follow.occupies(restTile),false);assert.ok(!model.position.equals(resting));assert.ok(!model.position.equals(new Group().position.set(-4,1,-4)));});
test('unreachable companion holds position instead of snapping onto player',()=>{const map=world(),player=map.get('4,4'),start=map.get('0,0');map.get('1,0').blocked=true;map.get('0,1').water=true;assert.deepEqual(companionRoute(map,start,player),[]);});
test('follower never routes through the player next landing tile',()=>{const map=world(),p=map.get('2,2'),next=map.get('1,2');const route=companionRoute(map,map.get('0,2'),p,()=>false,t=>t===next);assert.ok(route.every(t=>t!==next));});

// The actual map must leave a safe greeting position beside the bridge landing.
test('rescue steps aside without occupying the dog landing or crossing lane',async()=>{
 const {rescueStandAsideRoute}=await import('./companion-follow.js');
 const {makeWillowbankTiles,WILLOWBANK}=await import('./willowbank-rules.js');
 const map=new Map(makeWillowbankTiles().map(t=>[key(t.x,t.z),t]));
 const landing=map.get(key(WILLOWBANK.bridgeStart-1,WILLOWBANK.bridgeZ));
 const aside=rescueStandAsideRoute(map,landing,landing);
 assert.ok(aside);assert.notEqual(aside.tile,landing);assert.ok(aside.route.length);
 assert.ok(aside.route.every(t=>!t.water&&!t.blocked&&t!==landing));
 assert.equal(Math.abs(aside.tile.x-landing.x)+Math.abs(aside.tile.z-landing.z),1);
 aside.tile.blocked=true;assert.ok(rescueStandAsideRoute(map,landing,landing));
});
