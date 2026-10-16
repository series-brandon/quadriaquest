import test from 'node:test';
import assert from 'node:assert/strict';
import {itemChangeMessage} from './item-feedback.js';
test('item feedback describes signed changes with stable item names and separate quantities',()=>{
  assert.equal(itemChangeMessage({sticks:1,poplarWood:3}),'+ Sticks ×1 · + Poplar Wood Pieces ×3');
  assert.equal(itemChangeMessage({sticks:-1,stones:-1,crudeAxe:1}),'− Sticks ×1 · − Rocks ×1 · + Crude Axe ×1');
  assert.equal(itemChangeMessage({crudeAxe:-2}),'− Crude Axe ×2');
  assert.equal(itemChangeMessage({sticks:0}),'');
});

test('grouped item names remain unchanged at quantity one',()=>{assert.equal(itemChangeMessage({poplarWood:1,stones:5,hats:2}),'+ Poplar Wood Pieces ×1 · + Rocks ×5 · + Top Hat ×2');});
