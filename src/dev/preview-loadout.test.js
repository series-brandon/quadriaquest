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

test('Attack hands preview uses the production equipment rules: both hands strike one-two by default',async()=>{
 const {previewAttackHands}=await import('./preview-loadout.js');
 const dual={mainHand:'copperDagger',offHand:'copperDagger'};
 assert.equal(previewAttackHands(dual).resolved,'both','two weapons default to both hands');
 const pair=previewCombat('Attack',dual,0).profile;
 assert.deepEqual([pair.hand,pair.item,pair.followUp.hand,pair.followUp.item],['main','copperDagger','off','copperDagger']);
 assert.equal(pair.followUp.interval,pair.interval,'one cycle for the pair');
 const offOnly=previewCombat('Attack',{...dual,attackHands:'off'},0).profile;assert.deepEqual([offOnly.hand,offOnly.item,offOnly.followUp],['off','copperDagger',undefined]);
 // Shield and two-handed hands are never free fists: unavailable choices fall back.
 assert.equal(previewAttackHands({mainHand:'copperDagger',offHand:'copperShield',attackHands:'both'}).resolved,'main');
 assert.equal(previewAttackHands({mainHand:'bows',attackHands:'off'}).resolved,'main');
 // Every hand that can strike does: bare hands, or a weapon with a free fist, strike one-two by default.
 assert.equal(previewAttackHands({}).resolved,'both');assert.equal(previewCombat('Attack',{},0).profile.followUp.hand,'off');
 const withFist=previewCombat('Attack',{mainHand:'copperDagger'},0).profile;assert.deepEqual([withFist.item,withFist.followUp.item],['copperDagger',null]);
 const lone=previewCombat('Attack',{offHand:'copperDagger'},0).profile;assert.deepEqual([lone.hand,lone.item,lone.followUp.item],['main',null,'copperDagger'],'a free main fist, then the off-hand dagger');
 const magic=previewCombat('Attack',{...dual,style:'magic'},2).profile;assert.equal(magic.hand,'main','spells use no hand');assert.equal(magic.followUp,undefined);
});

test('per-hand damage types follow the game: offered only for multi-type weapons, chosen per hand, and drive the motion',async()=>{
 const {previewDamageTypes}=await import('./preview-loadout.js');
 const dual={mainHand:'copperDagger',offHand:'copperDagger'};
 assert.deepEqual(previewDamageTypes(dual),{main:{types:['piercing','slashing'],selected:'piercing'},off:{types:['piercing','slashing'],selected:'piercing'}});
 assert.deepEqual(previewDamageTypes({mainHand:'swords',offHand:'copperShield'}),{main:null,off:null},'single-type weapons and shields offer no choice');
 assert.deepEqual(previewDamageTypes({}),{main:null,off:null},'fists are always Bludgeoning');
 const mixed={...dual,mainDamageType:'slashing',offDamageType:'piercing'};
 assert.equal(previewDamageTypes(mixed).main.selected,'slashing');
 // Automatic motion follows each striking hand's type: Slashing slashes, Piercing stabs.
 const pair=previewCombat('Attack',mixed,.5).profile;
 assert.equal(resolveAttackMotion(pair),'slash');assert.equal(resolveAttackMotion(pair.followUp),'stab');
 assert.equal(previewDamageTypes({mainHand:'swords',mainDamageType:'piercing'}).main,null,'unsupported choices fall back to the weapon default');
 assert.equal(previewCombat('Attack',{mainHand:'swords',mainDamageType:'piercing'},0).profile.damageType,'slashing');
});
