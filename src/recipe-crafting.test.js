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

for(const id of ['axes','pickaxes'])test(`${id} use shared timing, cancellation, material checks and one reward`,()=>{
 const inventory={sticks:3,stones:3},skill={level:1,xp:0},events=[];let craft,busy=false;
 craft=createRecipeCrafting({inventory,skill,busy:()=>busy,stop:()=>craft.cancel(),started:id=>events.push(['start',id]),cancelled:id=>events.push(['cancel',id]),completed:(id,changes)=>events.push(['complete',id,changes])});
 assert.ok(craft.start(id));craft.update(1);assert.equal(craft.start(id),false);assert.equal(craft.state.age,1);
 craft.cancel();craft.update(10);assert.equal(inventory.sticks,3);assert.equal(skill.xp,0);
 assert.ok(craft.start(id));assert.equal(craft.state.age,0);craft.update(1.99);assert.equal(inventory[id],undefined);
 craft.update(.01);craft.update(10);assert.equal(inventory[id],1);assert.equal(inventory.sticks,2);assert.equal(inventory.stones,2);assert.equal(skill.xp,20);
 assert.equal(events.filter(([event])=>event==='complete').length,1);
 skill.level=6;assert.ok(craft.start(id));assert.equal(craft.state.duration,2/1.2);craft.update(2/1.2);assert.equal(inventory[id],2);
 busy=true;assert.equal(craft.start(id),false);busy=false;
 assert.ok(craft.start(id));inventory.stones=0;craft.update(3);assert.equal(inventory[id],2);assert.equal(inventory.sticks,1);assert.equal(events.at(-1)[0],'cancel');
 assert.equal(craft.start(id),false);
});
