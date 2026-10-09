import test from 'node:test';
import assert from 'node:assert/strict';
import {tutorialChapter} from './tutorial-chapters.js';

const clearing=(over={})=>({area:'clearing',inClearing:true,lesson:0,openingFinished:false,craftingStage:'inactive',finaleStage:'inactive',portalUsed:false,...over});

test('the clearing chapters follow the opening, the crafting lessons and the finale',()=>{
 assert.equal(tutorialChapter(clearing({inClearing:false})),null,'character creation has no skip');
 assert.equal(tutorialChapter(clearing({craftingStage:'quests-menu'})),'start','the first quest');
 assert.equal(tutorialChapter(clearing({lesson:1})),'start','camera lessons');
 assert.equal(tutorialChapter(clearing({lesson:3})),'journal','gathering');
 assert.equal(tutorialChapter(clearing({lesson:3,craftingStage:'skills-detail'})),'journal','the skills lesson mid-gathering');
 assert.equal(tutorialChapter(clearing({lesson:3,openingFinished:true,craftingStage:'inventory-select'})),'journal');
 for(const stage of ['intro','recipe','chop','pickaxe','mine','mining-success'])assert.equal(tutorialChapter(clearing({lesson:3,openingFinished:true,craftingStage:stage})),'tools',stage);
 assert.equal(tutorialChapter(clearing({lesson:3,openingFinished:true,craftingStage:'done',finaleStage:'practice'})),'finale');
 assert.equal(tutorialChapter(clearing({lesson:3,openingFinished:true,craftingStage:'done',finaleStage:'reward-complete',portalUsed:true})),null,'after the crystal: done');
 assert.equal(tutorialChapter(clearing({lesson:3,openingFinished:true,craftingStage:'done'})),null,'free play');
});

test('Willowbank and Cinderhold are one chapter each until done; waking ends all skips',()=>{
 assert.equal(tutorialChapter({area:'willowbank',willowPhase:'bridge'}),'willowbank');
 assert.equal(tutorialChapter({area:'willowbank',willowPhase:'finished'}),null);
 assert.equal(tutorialChapter({area:'cinderhold',cinderComplete:false}),'cinderhold');
 assert.equal(tutorialChapter({area:'cinderhold',cinderComplete:true}),null,'"???" is available instead');
 assert.equal(tutorialChapter({area:'cinderhold',cinderComplete:false,waking:true}),null);
 assert.equal(tutorialChapter({area:'world',woken:true}),null);
});
