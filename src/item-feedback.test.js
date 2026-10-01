import test from 'node:test';
import assert from 'node:assert/strict';
import {itemChangeMessage} from './item-feedback.js';
test('item feedback describes signed changes with stable item names and separate quantities',()=>{
  assert.equal(itemChangeMessage({sticks:1,logs:3}),'+ Sticks ×1 · + Small Logs ×3');
  assert.equal(itemChangeMessage({sticks:-1,stones:-1,axes:1}),'− Sticks ×1 · − Rocks ×1 · + Crude Axe ×1');
  assert.equal(itemChangeMessage({axes:-2}),'− Crude Axe ×2');
  assert.equal(itemChangeMessage({sticks:0}),'');
});

test('grouped item names remain unchanged at quantity one',()=>{assert.equal(itemChangeMessage({logs:1,stones:5,hats:2}),'+ Small Logs ×1 · + Rocks ×5 · + Top Hat ×2');});
