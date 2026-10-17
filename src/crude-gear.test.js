import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from 'three';
import {ITEMS} from './items.js';
import {RECIPES,finishRecipe} from './recipes.js';
import {GEAR,createEquipment} from './equipment.js';
import {createCharacter} from './character.js';
import {playerAttackProfile,playerDefense} from './combat-profile.js';
import {resolveAttackMotion,resolveBlockMotion,equipmentIdleHands} from './combat-animation.js';
import {heldTool} from './tool-models.js';
import {WORN_MODELS} from './worn-gear.js';
import {HAND_ITEMS} from './dev/preview-loadout.js';
import {hasIcon} from './icons.js';

const CRUDE_WEAPONS=['crudeDagger','crudeSword'],CRUDE_GEAR=[...CRUDE_WEAPONS,'crudeShield','crudeHelm'];
const meshes=group=>{let n=0;group.traverse(o=>{if(o instanceof Mesh)n++;});return n;};

test('crude gear is always craftable from sticks and rocks alone (DESIGN.md, the Crude exception)',()=>{
 for(const id of CRUDE_GEAR){
  assert.ok(RECIPES[id],id);assert.ok(!RECIPES[id].station&&!RECIPES[id].tools,`${id} is made by hand with no tools`);
  assert.deepEqual(Object.keys(RECIPES[id].cost).filter(i=>!['sticks','stones'].includes(i)),[],`${id} needs only Sticks and Rocks`);
  const inventory={sticks:5,stones:5};assert.equal(finishRecipe(inventory,id)[id],1);assert.equal(inventory[id],1);
 }
});

test('crude weapons are the weakest real tier: below the Stone Sword and Copper Dagger, with their kind\'s proficiency',()=>{
 const c=createCharacter(),max=id=>playerAttackProfile(c,{...GEAR[id],item:id}).max;
 assert.equal(GEAR.crudeDagger.proficiency,'dagger');assert.deepEqual(GEAR.crudeDagger.damageTypes,['piercing','slashing']);
 assert.equal(GEAR.crudeSword.proficiency,'sword');assert.deepEqual(GEAR.crudeSword.damageTypes,['slashing']);
 for(const id of CRUDE_WEAPONS){
  assert.equal(GEAR[id].style,'melee');
  for(const better of ['swords','copperDagger']){assert.ok(GEAR[id].power<GEAR[better].power&&GEAR[id].accuracy<GEAR[better].accuracy,`${id} < ${better}`);assert.ok(max(id)<max(better),`${id} hits softer than ${better}`);}
  assert.ok(max(id)>playerAttackProfile(c).max,`${id} beats bare hands`);
 }
 assert.ok(GEAR.crudeDagger.power<GEAR.crudeSword.power);
});

test('the Crude Helm is light Head armor: it adds resistance and trains Helm proficiency through the shared armor rules',()=>{
 assert.equal(GEAR.crudeHelm.slot,'head');assert.deepEqual(GEAR.crudeHelm.armor,{class:'light',slot:'helm'});
 assert.ok(GEAR.crudeHelm.resistance<GEAR.crudeShield.resistance);
 const inventory={crudeHelm:1,hats:1},equipment=createEquipment({inventory}),c=createCharacter();
 assert.equal(equipment.inventoryActions('crudeHelm')[0].label,'Equip');
 assert.ok(equipment.toggle('crudeHelm'));assert.equal(equipment.slots.head,'crudeHelm');
 assert.deepEqual(equipment.armorPieces.map(p=>p.item),['crudeHelm']);
 const bare=playerDefense(c).resistancePct,worn=playerDefense(c,{armor:equipment.armorPieces}).resistancePct;
 assert.ok(worn>bare,'the helm reduces damage');
 equipment.toggle('hats');assert.equal(equipment.slots.head,'hats','a hat takes the head slot back');assert.deepEqual(equipment.armorPieces,[]);
});

test('crude weapons equip in either hand and fight with their item, not a fist',()=>{
 const inventory={crudeDagger:1,crudeSword:1,crudeShield:1},equipment=createEquipment({inventory});
 assert.ok(equipment.toggle('crudeSword','right'));assert.ok(equipment.toggle('crudeDagger','left'));
 assert.equal(equipment.handAttack('right').item,'crudeSword');assert.equal(equipment.handAttack('left').item,'crudeDagger');
 assert.equal(equipment.handAttack('left').damageType,'piercing');assert.ok(equipment.setDamageType('left','slashing'));
 assert.ok(equipment.toggle('crudeShield','left'));assert.equal(equipment.handAttack('left'),null,'a shield hand cannot strike');
});

test('crude weapons move and guard like their kind, since motions follow the item data',()=>{
 assert.equal(resolveAttackMotion({item:'crudeDagger',style:'melee',damageType:'piercing'}),'stab');
 assert.equal(resolveAttackMotion({item:'crudeDagger',style:'melee',damageType:'slashing'}),'slash');
 assert.equal(resolveAttackMotion({item:'crudeSword',style:'melee',damageType:'slashing'}),'slash');
 assert.equal(resolveBlockMotion({rightHand:'crudeSword',leftHand:null}),'blade');
 assert.equal(resolveBlockMotion({rightHand:'crudeDagger',leftHand:'crudeShield'}),'shield');
 const [right,left]=equipmentIdleHands({rightHand:'crudeDagger',leftHand:'crudeSword'});
 assert.equal(right[3],1.85);assert.equal(left[3],1.85);
});

test('every crude item has a shared model, a viewer entry and an icon',()=>{
 for(const id of CRUDE_WEAPONS){assert.ok(meshes(heldTool(id))>=3,id);assert.ok(HAND_ITEMS.some(([item])=>item===id),`${id} in the model viewer's hand choices`);}
 assert.ok(meshes(WORN_MODELS.crudeHelm())>=3);
 for(const id of CRUDE_GEAR){assert.ok(ITEMS[id].description&&ITEMS[id].value>0,id);assert.ok(hasIcon(id),`${id} has an icon`);}
});
