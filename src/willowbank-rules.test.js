import {finishRecipe} from './recipes.js';
import {validCampTile} from './placement-rules.js';
import {incomingHealth} from './combat-rules.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {WILLOWBANK,makeWillowbankTiles} from './willowbank-rules.js';
import {findPath,key} from './world.js';
import {portalSpawn} from './portal-spawn.js';
test('recipes consume materials only on completion and retain reusable tools',()=>{const inventory={logs:2,firestarters:1};assert.deepEqual(finishRecipe(inventory,'campfires'),{logs:-2,campfires:1});assert.equal(inventory.firestarters,1);assert.equal(finishRecipe(inventory,'campfires'),null);assert.equal(inventory.campfires,1);});
test('first enemy cannot defeat player, stronger enemies can; shields reduce damage',()=>{assert.equal(incomingHealth(1,1,false,true),1);assert.equal(incomingHealth(3,4,false),0);assert.equal(incomingHealth(5,4,true),2);});
test('Willowbank has a safe crystal landing and island is inaccessible before repair',()=>{const map=new Map(makeWillowbankTiles().map(t=>[key(t.x,t.z),t]));const crystal=map.get(key(3,3));crystal.blocked=true;const start=portalSpawn(map,crystal,()=>0);assert.ok(start&&!start.blocked);assert.equal(findPath(map,start,map.get(key(...WILLOWBANK.pet))),null);for(let x=WILLOWBANK.bridgeStart;x<=WILLOWBANK.bridgeEnd;x++){const t=map.get(key(x,WILLOWBANK.bridgeZ));t.blocked=false;t.water=false;}assert.ok(findPath(map,start,map.get(key(...WILLOWBANK.pet))));});
test('campfire placement rejects water, blocked, occupied, reserved, and unreachable tiles',()=>{const tile={buildable:true,water:false,blocked:false};assert.equal(validCampTile(tile),true);for(const options of [{occupied:true},{reachable:false}])assert.equal(validCampTile(tile,options),false);for(const change of [{water:true},{blocked:true},{buildable:false}])assert.equal(validCampTile({...tile,...change}),false);});

test('peaceful Willowbank terraces and resources remain accessible',()=>{
 const tiles=makeWillowbankTiles(),map=new Map(tiles.map(t=>[key(t.x,t.z),t])),start=map.get(key(...WILLOWBANK.crystal));
 assert.deepEqual([...new Set(tiles.filter(t=>!t.water).map(t=>t.h))].sort(),[1,1.5,2]);
 for(const point of [WILLOWBANK.reed,[10,3],[15,13]])assert.ok(findPath(map,start,map.get(key(...point))));
 assert.equal(WILLOWBANK.scrapper,undefined);assert.equal(WILLOWBANK.bruiser,undefined);
});
