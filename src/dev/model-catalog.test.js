import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_CATALOG} from './model-catalog.js';
import {makeSlime} from '../slime-model.js';

test('every preview model and advertised motion produces finite transforms',()=>{
 for(const entry of MODEL_CATALOG){
  assert.ok(entry.motions.length,entry.name);
  const instance=entry.create();
  for(const motion of entry.motions)for(const time of [0,.3,1,2.5,6]){
   instance.update?.(time,motion,.016);
   instance.group.updateMatrixWorld(true);
   instance.group.traverse(node=>assert.ok(node.matrixWorld.elements.every(Number.isFinite),`${entry.name}: ${motion}`));
  }
 }
});
test('slime starts with exactly one expression, and preview emotions select one face',()=>{
 const slime=makeSlime();const expressionGroups=slime.face.group.children.filter(c=>c.isGroup);
 assert.equal(expressionGroups.filter(c=>c.visible).length,1);
 for(const expression of ['idle','happy','shocked','sad','distraught','frown','sleeping']){
  slime.face.set(expression);assert.equal(expressionGroups.filter(c=>c.visible).length,1,expression);
 }
 assert.deepEqual(MODEL_CATALOG.find(m=>m.name==='Campfire').motions,['Burning','Static']);
 assert.deepEqual(MODEL_CATALOG.find(m=>m.name==='Crude Axe').motions,['Static']);
});
