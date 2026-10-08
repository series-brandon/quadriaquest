import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlime} from './slime-model.js';
import {createEquipment} from './equipment.js';
import {createEquipmentPresentation,handModel} from './equipment-presentation.js';
import * as THREE from 'three';
test('production gear stays visible for casting and returns after fishing/mining',()=>{
 const rig=makeSlime(),inventory={copperDagger:1,copperShield:1},equipment=createEquipment({inventory});equipment.toggle('copperDagger');equipment.toggle('copperShield');
 const presentation=createEquipmentPresentation({hands:rig.hands,visual:rig.group,equipment});
 for(const [kind,visible] of [['Casting',true],['Fishing',false],['Mining',false],['Casting',true],['Block',true],[null,true]]){
  presentation.update({motion:kind?{kind,time:.1,profile:{style:'magic',interval:1.8}}:null});for(const name of ['equipment-right-copperDagger','equipment-left-copperShield'])assert.equal(rig.group.getObjectByName(name).visible,visible,kind);
 }
 assert.equal(inventory.copperDagger,1);assert.equal(equipment.isEquipped('copperDagger'),true);
});

test('hand items show in whichever hand holds them, and only there', () => {
 const rig=makeSlime(),inventory={copperDagger:2,copperShield:1,bows:1},equipment=createEquipment({inventory});
 const presentation=createEquipmentPresentation({hands:rig.hands,visual:rig.group,equipment});
 const shown=()=>{presentation.update({});return ['right','left'].map(side=>['copperDagger','copperShield','bows'].filter(id=>rig.group.getObjectByName(`equipment-${side}-${id}`)?.visible));};
 equipment.toggle('copperShield','right');equipment.toggle('copperDagger','left');
 assert.deepEqual(shown(),[['copperShield'],['copperDagger']],'shield right, dagger left');
 equipment.toggle('bows','right');
 assert.deepEqual(shown(),[['bows'],[]],'a right-hand bow; the left hand is free');
 assert.equal(rig.group.getObjectByName('equipment-left-bows'),undefined,'models exist only for hands that have held them');
});

test('a bow or shield in the other hand is the mirror image, gripped in the palm', () => {
 // In hand space the other hand mirrors x. The bow's grip is the middle of its curved body (model
 // z .22), its tips are at y ±.48; a shield's grip is its centre and its face points out along x.
 const handPoint=(id,side,point)=>{const m=handModel(id,side);m.updateMatrix();return point.clone().applyMatrix4(m.matrix);};
 const mirrored=(id,point)=>{const [right,left]=['right','left'].map(side=>handPoint(id,side,point));return right.distanceTo(new THREE.Vector3(-left.x,left.y,left.z))<1e-9;};
 for(const point of [new THREE.Vector3(0,0,.22),new THREE.Vector3(0,.48,0),new THREE.Vector3(0,-.48,0)])assert.ok(mirrored('bows',point),`bow point ${point.toArray()}`);
 assert.ok(handPoint('bows','right',new THREE.Vector3(0,0,.22)).length()<1e-9,'the right-hand bow is gripped at its middle');
 assert.ok(handPoint('copperShield','right',new THREE.Vector3()).length()<1e-9,'the right-hand shield is gripped at its centre');
});
