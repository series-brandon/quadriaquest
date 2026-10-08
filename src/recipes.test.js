import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPES,canMake,missingFor} from './recipes.js';

test('missingFor lists the ingredients and tools a recipe still needs',()=>{
 assert.deepEqual(missingFor({},RECIPES.hammers),['sticks','stones']);
 assert.deepEqual(missingFor({sticks:1},RECIPES.hammers),['stones']);
 assert.deepEqual(missingFor({sticks:1,stones:1},RECIPES.hammers),[]);
 assert.equal(canMake({sticks:1,stones:1},RECIPES.hammers),true);
 assert.deepEqual(missingFor({logs:2},RECIPES.campfires),['firestarters'],'tools count too');
});
