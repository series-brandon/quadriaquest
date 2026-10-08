import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCombat,previewLoadout} from './preview-loadout.js';
import {resolveAttackMotion,resolveBlockMotion} from '../combat-animation.js';
test('automatic preview chooses gameplay motions; explicit overrides never swap gear',()=>{
 for(const [loadout,attack] of [[{},'punch'],[{rightHand:'swords'},'slash'],[{rightHand:'copperDagger'},'stab'],[{leftHand:'bows'},'bow']]){const {profile}=previewCombat('Attack',loadout);assert.equal(resolveAttackMotion(profile),attack);}
 const settings={rightHand:'copperDagger',leftHand:'copperShield',attackMotion:'slash',blockMotion:'fists'};
 const {profile}=previewCombat('Attack',settings);assert.equal(resolveAttackMotion(profile),'slash');assert.equal(resolveBlockMotion(profile),'fists');assert.equal(profile.rightHand,'copperDagger');assert.equal(profile.leftHand,'copperShield');
 const magic=previewCombat('Attack',{rightHand:'swords',leftHand:'shields',style:'magic'});assert.equal(magic.kind,'Casting');assert.equal(magic.profile.rightHand,'swords');assert.equal(magic.profile.item,null);assert.equal(resolveBlockMotion(magic.profile),'shield');
 assert.deepEqual(previewLoadout({rightHand:'bows',leftHand:'shields'}),{rightHand:'bows',leftHand:null},'a two-handed item frees the other hand');
 assert.deepEqual(previewLoadout({rightHand:'copperShield',leftHand:'bows'}),{rightHand:null,leftHand:'bows'});
});

test('Attack hands preview uses the production equipment rules: both hands strike one-two by default',async()=>{
 const {previewAttackHands}=await import('./preview-loadout.js');
 const dual={rightHand:'copperDagger',leftHand:'copperDagger'};
 assert.equal(previewAttackHands(dual).resolved,'both','two weapons default to both hands');
 const pair=previewCombat('Attack',dual,0).profile;
 assert.deepEqual([pair.side,pair.item,pair.followUp.side,pair.followUp.item],['right','copperDagger','left','copperDagger'],'a right-hander strikes right, then left');
 assert.equal(pair.followUp.interval,pair.interval,'one cycle for the pair');
 const lefty=previewCombat('Attack',{...dual,handedness:'left'},0).profile;assert.deepEqual([lefty.side,lefty.followUp.side],['left','right'],'a left-hander strikes left first');
 const leftOnly=previewCombat('Attack',{...dual,attackHands:'left'},0).profile;assert.deepEqual([leftOnly.side,leftOnly.item,leftOnly.followUp],['left','copperDagger',undefined]);
 // Shield and two-handed hands are never free fists: unavailable choices fall back.
 assert.equal(previewAttackHands({rightHand:'copperDagger',leftHand:'copperShield',attackHands:'both'}).resolved,'right');
 assert.equal(previewAttackHands({leftHand:'bows',attackHands:'right'}).resolved,'left');
 // Every hand that can strike does: bare hands, or a weapon with a free fist, strike one-two by default.
 assert.equal(previewAttackHands({}).resolved,'both');assert.equal(previewCombat('Attack',{},0).profile.followUp.side,'left');
 const withFist=previewCombat('Attack',{rightHand:'copperDagger'},0).profile;assert.deepEqual([withFist.item,withFist.followUp.item],['copperDagger',null]);
 const magic=previewCombat('Attack',{...dual,style:'magic'},2).profile;assert.equal(magic.hand,'main','spells use no hand');assert.equal(magic.followUp,undefined);
});

test('per-hand damage types follow the game: offered only for multi-type weapons, chosen per hand, and drive the motion',async()=>{
 const {previewDamageTypes}=await import('./preview-loadout.js');
 const dual={rightHand:'copperDagger',leftHand:'copperDagger'};
 assert.deepEqual(previewDamageTypes(dual),{right:{types:['piercing','slashing'],selected:'piercing'},left:{types:['piercing','slashing'],selected:'piercing'}});
 assert.deepEqual(previewDamageTypes({rightHand:'swords',leftHand:'copperShield'}),{right:null,left:null},'single-type weapons and shields offer no choice');
 assert.deepEqual(previewDamageTypes({}),{right:null,left:null},'fists are always Bludgeoning');
 const mixed={...dual,rightDamageType:'slashing',leftDamageType:'piercing'};
 assert.equal(previewDamageTypes(mixed).right.selected,'slashing');
 // Automatic motion follows each striking hand's type: Slashing slashes, Piercing stabs.
 const pair=previewCombat('Attack',mixed,.5).profile;
 assert.equal(resolveAttackMotion(pair),'slash');assert.equal(resolveAttackMotion(pair.followUp),'stab');
 assert.equal(previewDamageTypes({rightHand:'swords',rightDamageType:'piercing'}).right,null,'unsupported choices fall back to the weapon default');
 assert.equal(previewCombat('Attack',{rightHand:'swords',rightDamageType:'piercing'},0).profile.damageType,'slashing');
});
