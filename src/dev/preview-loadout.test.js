import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCombat,previewLoadout} from './preview-loadout.js';
import {resolveAttackMotion,resolveBlockMotion} from '../combat-animation.js';
test('automatic preview chooses gameplay motions; explicit overrides never swap gear',()=>{
 for(const [mainHand,attack] of [['','punch'],['swords','slash'],['copperDagger','stab'],['bows','bow']]){const {profile}=previewCombat('Attack',{mainHand});assert.equal(resolveAttackMotion(profile),attack);}
 const settings={mainHand:'copperDagger',offHand:'copperShield',attackMotion:'slash',blockMotion:'fists'};
 const {profile}=previewCombat('Attack',settings);assert.equal(resolveAttackMotion(profile),'slash');assert.equal(resolveBlockMotion(profile),'fists');assert.equal(profile.mainHand,'copperDagger');assert.equal(profile.offHand,'copperShield');
 const magic=previewCombat('Attack',{mainHand:'swords',offHand:'shields',style:'magic'});assert.equal(magic.kind,'Casting');assert.equal(magic.profile.mainHand,'swords');assert.equal(magic.profile.item,null);assert.equal(resolveBlockMotion(magic.profile),'shield');
 assert.deepEqual(previewLoadout({mainHand:'bows',offHand:'shields'}),{mainHand:'bows',offHand:null});
});
