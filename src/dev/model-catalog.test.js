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

test('slime action previews attach only their tools and clear them on switching',()=>{
 const entry=MODEL_CATALOG.find(m=>m.name==='Slime'),instance=entry.create();
 const visibleTools=()=>{const result=[];instance.group.traverse(o=>{if(o.name.startsWith('preview-tool-')&&o.visible)result.push(o.name.replace('preview-tool-',''));});return result.sort();};
 for(const [motion,tools] of [['Sword and shield',['shields','swords']],['Fishing',['rods']],['Carpentry',['hammers']],['Mining',['pickaxes']],['Chopping',['axes']],['Punching',[]],['Gathering',[]],['Crafting',[]],['Ouch / hammer injury',[]],['Idle',[]]]){
  assert.ok(entry.motions.includes(motion),motion);instance.update(.6,motion,.016);assert.deepEqual(visibleTools(),tools,motion);
 }
});

test('default expressions follow the animation while explicit overrides leave hand motion intact',()=>{
 const entry=MODEL_CATALOG.find(m=>m.name==='Slime'),instance=entry.create();
 const rig=instance.group.children[0],face=rig.children.find(o=>o.isGroup&&o.children.filter(c=>c.isGroup).length>5);
 const visible=()=>face.children.filter(o=>o.isGroup).map(o=>o.visible);
 instance.update(.4,'Idle',0,'default');const idle=visible();
 instance.update(.4,'Sliding',0,'default');const focused=visible();assert.notDeepEqual(focused,idle);
 instance.update(.4,'Gathering',0,'default');assert.deepEqual(visible(),focused);
 const hands=rig.children.filter(o=>o.isMesh&&o.geometry.type==='SphereGeometry');const positions=hands.map(h=>h.position.toArray());
 instance.update(.4,'Gathering',0,'Happy');const happy=visible();assert.notDeepEqual(happy,focused);assert.deepEqual(hands.map(h=>h.position.toArray()),positions);
 instance.update(.4,'Sliding',0,'Happy');assert.deepEqual(visible(),happy);
 instance.update(.4,'Sliding',0,'default');assert.deepEqual(visible(),focused);
});
