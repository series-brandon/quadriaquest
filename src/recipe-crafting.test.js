import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecipeCrafting} from './recipe-crafting.js';
test('inventory crafting is portable, grants XP once, and retains reusable tools',()=>{
 const inventory={logs:4,firestarters:1},skill={level:1,xp:0};let completions=0,craft;
 craft=createRecipeCrafting({inventory,skill,busy:()=>false,stop:()=>craft.cancel(),completed:()=>completions++});
 for(let i=0;i<2;i++){assert.ok(craft.start('campfires'));craft.update(10);craft.update(10);}
 assert.equal(inventory.campfires,2);assert.equal(inventory.logs,0);assert.equal(inventory.firestarters,1);assert.equal(skill.xp,40);assert.equal(completions,2);
});
test('cancelled crafting and missing inputs never spend items or award output',()=>{
 const inventory={logs:2,firestarters:1},skill={level:1,xp:0};const craft=createRecipeCrafting({inventory,skill,busy:()=>false,stop(){},completed(){assert.fail('unexpected reward');}});
 craft.start('campfires');craft.update(.1);craft.cancel();craft.update(10);assert.equal(inventory.logs,2);
 craft.start('campfires');inventory.logs=0;craft.update(10);assert.equal(inventory.campfires,undefined);assert.equal(skill.xp,0);
 assert.equal(craft.start('cookedFish'),false);
});
