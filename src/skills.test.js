import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkill,addSkillXp,addSkillLevels,gatheringDuration,skillProgress,GATHER_EFFORT} from './skills.js';
import {totalXpForLevel} from './combat-formulas.js';
import {actionXp} from './skill-pacing.js';
test('every skill levels on the adopted curve; gathering speeds up with level',()=>{
 const skill=createSkill(),initialTime=gatheringDuration(skill),each=actionXp(GATHER_EFFORT),threshold=Math.ceil(totalXpForLevel(2)/each);
 for(let i=1;i<=threshold;i++){const reward=addSkillXp(skill,each,'Gathering');assert.equal(reward.leveledUp,i===threshold);assert.equal(skill.level,i===threshold?2:1);}
 assert.ok(gatheringDuration(skill)<initialTime);
 addSkillLevels(skill,8);assert.equal(skill.level,10);assert.equal(skill.xp,Math.ceil(totalXpForLevel(10)));
 const p=skillProgress(skill);assert.equal(p.level,10);assert.equal(p.into+p.remaining,p.span);
});
