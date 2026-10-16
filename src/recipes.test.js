import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPES,canMake,missingFor,resolveCost,spendCost,finishRecipe} from './recipes.js';

test('missingFor lists the ingredients and tools a recipe still needs',()=>{
 assert.deepEqual(missingFor({},RECIPES.hammers),['sticks','stones']);
 assert.deepEqual(missingFor({sticks:1},RECIPES.hammers),['stones']);
 assert.deepEqual(missingFor({sticks:1,stones:1},RECIPES.hammers),[]);
 assert.equal(canMake({sticks:1,stones:1},RECIPES.hammers),true);
 assert.deepEqual(missingFor({poplarWood:2},RECIPES.campfires),['firestarters'],'tools count too');
 assert.deepEqual(missingFor({firestarters:1,poplarWood:1},RECIPES.campfires),['anyWood'],'a group reports itself');
 assert.equal(canMake({firestarters:1,poplarWood:1,cherryWood:1},RECIPES.campfires),true,'any tiers mix');
});

test('any-wood costs spend the lowest tier first and never overspend',()=>{
 const inventory={pineWood:5,poplarWood:1,firestarters:1};
 assert.deepEqual(resolveCost(inventory,{anyWood:2}),{poplarWood:1,pineWood:1});
 assert.deepEqual(finishRecipe(inventory,'campfires'),{campfires:1,poplarWood:-1,pineWood:-1});
 assert.equal(inventory.pineWood,4);assert.equal(inventory.firestarters,1);
 assert.equal(spendCost({poplarWood:1},{anyWood:2}),null);
});
