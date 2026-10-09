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
 for(const expression of ['idle','happy','pleased','shocked','sad','distraught','frown','sleeping']){
  slime.face.set(expression);assert.equal(expressionGroups.filter(c=>c.visible).length,1,expression);
 }
 assert.deepEqual(MODEL_CATALOG.find(m=>m.name==='Campfire').motions,['Burning','Static']);
 assert.deepEqual(MODEL_CATALOG.find(m=>m.name==='Crude Axe').motions,['Static']);
});

test('slime action previews attach only their tools and clear them on switching',()=>{
 const entry=MODEL_CATALOG.find(m=>m.name==='Slime'),instance=entry.create();
 const visibleTools=()=>{const result=[];instance.group.traverse(o=>{if(o.name.startsWith('preview-tool-')&&o.visible)result.push(o.name.replace('preview-tool-',''));});return result.sort();};
 for(const [motion,tools] of [['Attack',[]],['Fishing',['rods']],['Carpentry',['hammers']],['Mining',['pickaxes']],['Chopping',['axes']],['Block',[]],['Gathering',[]],['Crafting',[]],['Ouch / hammer injury',[]],['Idle',[]]]){
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
 const hands=rig.children.filter(o=>o.isMesh&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters.radius===.105);const positions=hands.map(h=>h.position.toArray());
 instance.update(.4,'Gathering',0,'Happy');const happy=visible();assert.notDeepEqual(happy,focused);assert.deepEqual(hands.map(h=>h.position.toArray()),positions);
 instance.update(.4,'Sliding',0,'Happy');assert.deepEqual(visible(),happy);
 instance.update(.4,'Sliding',0,'default');assert.deepEqual(visible(),focused);
});

test('Reed preview uses the production idle motion and preserves facing',async()=>{
 const {fisher,animateFisher}=await import('../fisher-model.js');
 const rig=fisher(),preview=MODEL_CATALOG.find(m=>m.name==='Reed').create();rig.group.rotation.y=1.3;
 const model=preview.group.children[0],hands=model.children.filter(o=>o.isMesh&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters.radius===.105);
 for(const time of [0,1,3,0]){animateFisher(rig,time);preview.update(time,'Idle',.016,'default');assert.deepEqual(model.scale.toArray(),rig.group.scale.toArray());assert.equal(rig.group.rotation.y,1.3);assert.deepEqual(hands.map(h=>h.position.toArray()),rig.hands.map(h=>h.position.toArray()));}
});

test('every slime exposes the same motions and clears action tools when returning to its own idle',()=>{
 const names=['Slime','Reed','Sergeant Bristle','Borin Copperbelly','Fletch','Wisp'];
 const motions=MODEL_CATALOG.find(m=>m.name==='Slime').motions;
 for(const name of names){const entry=MODEL_CATALOG.find(m=>m.name===name);assert.deepEqual(entry.motions,motions,name);assert.ok(entry.motions.includes('Point'));assert.ok(entry.motions.includes('Stomp'));
  const instance=entry.create();instance.update(.4,'Mining',.016);instance.update(.4,'Point',.016);
  instance.group.traverse(o=>{if(o.name.startsWith('preview-tool-'))assert.equal(o.visible,false,name);});
  const rig=instance.group.children[0],hands=rig.children.filter(o=>o.isMesh&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters.radius===.105);assert.deepEqual(hands[0].position.toArray(),[-.38,.53,.55],name);
  instance.update(.4,'Idle',.016);assert.equal(hands[0].position.x,-.46,name);
 }
});


test('slime loadout stays visible for casting and motion overrides, hides for tools, then returns',()=>{
 for(const entry of MODEL_CATALOG.filter(m=>m.loadout)){
  const instance=entry.create(),options={rightHand:'copperDagger',leftHand:'copperShield',style:'magic'};
  const visible=()=>{const names=[];instance.group.traverse(o=>{if(o.visible&&o.name.startsWith('preview-tool-'))names.push(o.name.slice(13));});return names.sort();};
  instance.update(1.8,'Attack',0,'default','Generic item',options);assert.deepEqual(visible(),['left:copperShield','right:copperDagger'],entry.name);
  instance.update(1.5,'Attack',0,'default','Generic item',{...options,attackMotion:'slash'});assert.deepEqual(visible(),['left:copperShield','right:copperDagger']);
  instance.update(.1,'Block',0,'default','Generic item',{...options,blockMotion:'fists'});assert.deepEqual(visible(),['left:copperShield','right:copperDagger']);
  instance.update(.3,'Fishing',0,'default','Generic item',options);assert.deepEqual(visible(),['rods']);
  instance.update(.3,'Mining',0,'default','Generic item',options);assert.deepEqual(visible(),['pickaxes']);
  instance.update(.3,'Idle',0,'default','Generic item',options);assert.deepEqual(visible(),['left:copperShield','right:copperDagger']);
 }
});
