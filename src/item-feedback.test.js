import test from 'node:test';
import assert from 'node:assert/strict';
import {itemChangeMessage} from './item-feedback.js';
test('item feedback describes signed changes and plural quantities',()=>{
  assert.equal(itemChangeMessage({sticks:1,logs:3}),'+1 Stick · +3 Wooden Logs');
  assert.equal(itemChangeMessage({sticks:-1,stones:-1,axes:1}),'−1 Stick · −1 Stone · +1 Crude Axe');
  assert.equal(itemChangeMessage({axes:-2}),'−2 Crude Axes');
  assert.equal(itemChangeMessage({sticks:0}),'');
});
