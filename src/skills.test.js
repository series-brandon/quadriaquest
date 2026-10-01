import test from 'node:test';
import assert from 'node:assert/strict';
import {createGatheringSkill,awardGatheringXp,gatheringDuration} from './skills.js';
test('six successful pickups grant 120 XP and exactly one Gathering level',()=>{
 const skill=createGatheringSkill();const initialTime=gatheringDuration(skill);
 for(let i=1;i<=6;i++){
  const reward=awardGatheringXp(skill);
  assert.equal(reward.xp,20);assert.equal(skill.xp,i*20);
  assert.equal(reward.leveledUp,i===6);assert.equal(skill.level,i===6?2:1);
 }
 assert.ok(gatheringDuration(skill)<initialTime);
});
