import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_CATALOG} from './model-catalog.js';
import {makeSlime} from '../slime-model.js';

// Slimes render through the shared presentation: tools are slime-tool-*, held gear equipment-<side>-<id>.
const handsOf=instance=>{const out=[];instance.group.traverse(o=>{if(o.isMesh&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters.radius===.105&&o.parent?.parent?.parent===instance.group)out.push(o);});return out;};
const shownGear=instance=>{const names=[];instance.group.traverse(o=>{if(!o.visible)return;let p=o.parent;while(p){if(!p.visible)return;p=p.parent;}if(o.name.startsWith('slime-tool-'))names.push(o.name.slice(11));if(o.name.startsWith('equipment-')&&o.name!=='equipment-hats')names.push(o.name.slice(10).replace('-',':'));});return names.sort();};
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
 for(const [motion,tools] of [['Attack',[]],['Fishing',['rod']],['Carpentry',['hammer']],['Mining',['pickaxe']],['Chopping',['axe']],['Block',[]],['Gathering',[]],['Crafting',[]],['Ouch / hammer injury',[]],['Idle',[]]]){
  assert.ok(entry.motions.includes(motion),motion);instance.update(.6,motion,.016);assert.deepEqual(shownGear(instance),tools,motion);
 }
});

test('default expressions follow the animation while explicit overrides leave hand motion intact',()=>{
 const entry=MODEL_CATALOG.find(m=>m.name==='Slime'),instance=entry.create();
 let face=null;instance.group.traverse(o=>{if(!face&&o.isGroup&&o.children.filter(c=>c.isGroup).length>5)face=o;});
 const visible=()=>face.children.filter(o=>o.isGroup).map(o=>o.visible);
 instance.update(.4,'Idle',0,'default');const idle=visible();
 instance.update(.4,'Sliding',0,'default');const focused=visible();assert.notDeepEqual(focused,idle);
 instance.update(.4,'Gathering',0,'default');assert.deepEqual(visible(),focused);
 const hands=handsOf(instance);const positions=hands.map(h=>h.position.toArray());
 instance.update(.4,'Gathering',0,'Happy');const happy=visible();assert.notDeepEqual(happy,focused);assert.deepEqual(hands.map(h=>h.position.toArray()),positions);
 instance.update(.4,'Sliding',0,'Happy');assert.deepEqual(visible(),happy);
 instance.update(.4,'Sliding',0,'default');assert.deepEqual(visible(),focused);
});

test('Reed renders through the shared presentation: rod carried while idle, put away for actions, facing kept',()=>{
 const preview=MODEL_CATALOG.find(m=>m.name==='Reed').create(),rig=preview.group.children[0];rig.rotation.y=1.3;
 const carried=()=>{let rod=null;preview.group.traverse(o=>{if(o.name==='slime-carry-rods')rod=o;});return rod;};
 for(const time of [0,1,3]){preview.update(time,'Idle',.016,'default');assert.equal(carried().visible,true);assert.equal(rig.rotation.y,1.3);}
 preview.update(.5,'Fishing',.016,'default');assert.equal(carried().visible,false);assert.deepEqual(shownGear(preview),['rod']);
 preview.update(.5,'Wave',.016,'default');assert.equal(carried().visible,false);
 preview.update(.5,'Idle',.016,'default');assert.equal(carried().visible,true);
});

test('every slime exposes the same motions and clears action tools when returning to its own idle',()=>{
 const names=['Slime','Reed','Sergeant Bristle','Borin Copperbelly','Fletch','Wisp'];
 const motions=MODEL_CATALOG.find(m=>m.name==='Slime').motions;
 for(const name of names){const entry=MODEL_CATALOG.find(m=>m.name===name);assert.deepEqual(entry.motions,motions,name);assert.ok(entry.motions.includes('Point'));assert.ok(entry.motions.includes('Stomp'));
  const instance=entry.create();instance.update(.4,'Mining',.016);instance.update(.4,'Point',.016);
  assert.deepEqual(shownGear(instance).filter(n=>!n.includes(':')),[],name);
  const hands=handsOf(instance);assert.deepEqual(hands[0].position.toArray().map(v=>+v.toFixed(6)),[-.38,.53,.55],name);
  instance.update(.4,'Idle',.016);assert.equal(hands[0].position.x,-.46,name);
 }
});


test('slime loadout stays visible for casting and motion overrides, hides for tools, then returns',()=>{
 for(const entry of MODEL_CATALOG.filter(m=>m.loadout)){
  const instance=entry.create(),options={rightHand:'copperDagger',leftHand:'copperShield',style:'magic'};
  const visible=()=>shownGear(instance);
  instance.update(1.8,'Attack',0,'default','Generic item',options);assert.deepEqual(visible(),['left:copperShield','right:copperDagger'],entry.name);
  instance.update(1.5,'Attack',0,'default','Generic item',{...options,attackMotion:'slash'});assert.deepEqual(visible(),['left:copperShield','right:copperDagger']);
  instance.update(.1,'Block',0,'default','Generic item',{...options,blockMotion:'fists'});assert.deepEqual(visible(),['left:copperShield','right:copperDagger']);
  instance.update(.3,'Fishing',0,'default','Generic item',options);assert.deepEqual(visible(),['rod']);
  instance.update(.3,'Mining',0,'default','Generic item',options);assert.deepEqual(visible(),['pickaxe']);
  instance.update(.3,'Idle',0,'default','Generic item',options);assert.deepEqual(visible(),['left:copperShield','right:copperDagger']);
 }
});

test('wear slots replace cosmetic permutations: one entry per creature, a dropdown per slot',async()=>{
 const {SLIME_WEAR,COMPANION_WEAR}=await import('./model-catalog.js');
 assert.equal(MODEL_CATALOG.filter(m=>m.name.startsWith('Corgi')).length,1,'one corgi entry');
 assert.deepEqual(COMPANION_WEAR.map(w=>w.slot),['head']);assert.ok(COMPANION_WEAR[0].items.some(([id])=>id==='companionHats'));
 assert.ok(SLIME_WEAR[0].items.some(([id])=>id==='hats'),'slime Head lists the Top Hat');
 const corgi=MODEL_CATALOG.find(m=>m.name==='Corgi').create(),hat=()=>{let found=null;corgi.group.traverse(o=>{if(o.name==='companion-outfit-companionHats')found=o;});return found;};
 corgi.update(.2,'Idle',.016,'default','Generic item',{});assert.ok(!hat()?.visible);
 corgi.update(.4,'Idle',.016,'default','Generic item',{worn:{head:'companionHats'}});assert.equal(hat().visible,true);
 corgi.update(.6,'Idle',.016,'default','Generic item',{worn:{head:''}});assert.equal(hat().visible,false);
 for(const name of ['Slime','Sergeant Bristle','Reed']){const entry=MODEL_CATALOG.find(m=>m.name===name);assert.deepEqual(entry.wear,SLIME_WEAR,name);
  const slime=entry.create();slime.update(.2,'Idle',.016,'default','Generic item',{worn:{head:'hats'}});
  let top=null;slime.group.traverse(o=>{if(o.name==='equipment-hats')top=o;});assert.equal(top?.visible,true,name+' wears the Top Hat');}
});
