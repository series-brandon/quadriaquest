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

test('Attack hands preview uses the production equipment rules and alternates per swing',async()=>{
 const {previewAttackHands}=await import('./preview-loadout.js');
 const dual={mainHand:'copperDagger',offHand:'copperDagger'};
 assert.equal(previewAttackHands(dual).resolved,'alternate','two weapons default to alternating');
 // 1.5s preview cycle: a swing lands at 1.5, keeps its hand through the .28s follow-through, then switches.
 const hands=[0.5,1.7,1.8,3.2,3.3].map(t=>previewCombat('Attack',dual,t).profile.hand);
 assert.deepEqual(hands,['main','main','off','off','main']);
 assert.equal(previewCombat('Attack',{...dual,attackHands:'off'},0).profile.hand,'off');
 assert.equal(previewCombat('Attack',{...dual,attackHands:'off'},0).profile.item,'copperDagger');
 // Shield and two-handed hands are never free fists: unavailable choices fall back.
 assert.equal(previewAttackHands({mainHand:'copperDagger',offHand:'copperShield',attackHands:'alternate'}).resolved,'main');
 assert.equal(previewAttackHands({mainHand:'bows',attackHands:'off'}).resolved,'main');
 // Bare hands alternate fists by default; a lone off-hand dagger strikes with the off hand.
 assert.equal(previewAttackHands({}).resolved,'alternate');
 const lone=previewCombat('Attack',{offHand:'copperDagger'},0).profile;assert.deepEqual([lone.hand,lone.item],['off','copperDagger']);
 assert.equal(previewCombat('Attack',{...dual,style:'magic'},2).profile.hand,'main','spells use no hand');
});

test('per-hand damage types follow the game: offered only for multi-type weapons, chosen per hand, and drive the motion',async()=>{
 const {previewDamageTypes}=await import('./preview-loadout.js');
 const dual={mainHand:'copperDagger',offHand:'copperDagger'};
 assert.deepEqual(previewDamageTypes(dual),{main:{types:['piercing','slashing'],selected:'piercing'},off:{types:['piercing','slashing'],selected:'piercing'}});
 assert.deepEqual(previewDamageTypes({mainHand:'swords',offHand:'copperShield'}),{main:null,off:null},'single-type weapons and shields offer no choice');
 assert.deepEqual(previewDamageTypes({}),{main:null,off:null},'fists are always Bludgeoning');
 const mixed={...dual,mainDamageType:'slashing',offDamageType:'piercing',attackHands:'alternate'};
 assert.equal(previewDamageTypes(mixed).main.selected,'slashing');
 // Automatic motion follows the striking hand's type: Slashing slashes, Piercing stabs.
 assert.equal(resolveAttackMotion(previewCombat('Attack',mixed,.5).profile),'slash');
 assert.equal(resolveAttackMotion(previewCombat('Attack',mixed,1.8).profile),'stab');
 assert.equal(previewDamageTypes({mainHand:'swords',mainDamageType:'piercing'}).main,null,'unsupported choices fall back to the weapon default');
 assert.equal(previewCombat('Attack',{mainHand:'swords',mainDamageType:'piercing'},0).profile.damageType,'slashing');
});
