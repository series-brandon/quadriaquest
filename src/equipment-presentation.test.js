import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlime} from './slime-model.js';
import {createEquipment} from './equipment.js';
import {createEquipmentPresentation} from './equipment-presentation.js';
test('production gear stays visible for casting and returns after fishing/mining',()=>{
 const rig=makeSlime(),inventory={copperDagger:1,copperShield:1},equipment=createEquipment({inventory});equipment.toggle('copperDagger');equipment.toggle('copperShield');
 const presentation=createEquipmentPresentation({hands:rig.hands,visual:rig.group,equipment});
 for(const [kind,visible] of [['Casting',true],['Fishing',false],['Mining',false],['Casting',true],['Block',true],[null,true]]){
  presentation.update({motion:kind?{kind,time:.1,profile:{style:'magic',interval:1.8}}:null});for(const id of ['copperDagger','copperShield'])assert.equal(rig.group.getObjectByName('equipment-'+id).visible,visible,kind);
 }
 assert.equal(inventory.copperDagger,1);assert.equal(equipment.isEquipped('copperDagger'),true);
});
