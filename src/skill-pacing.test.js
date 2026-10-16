import test from 'node:test';
import assert from 'node:assert/strict';
import {actionXp,skillSpeed,workDuration,SPEED_CAP,MIN_WORK_SECONDS} from './skill-pacing.js';
import {TREES,TREE_IDS,treeEffort} from './lumberjack.js';
import {levelForXp,totalXpForLevel} from './combat-formulas.js';
test('levels above a requirement speed work up to a cap; tools multiply; work has a floor',()=>{
 assert.equal(skillSpeed(30,30),1);assert.equal(skillSpeed(40,30),1.2);assert.equal(skillSpeed(60,30),1+SPEED_CAP);assert.equal(skillSpeed(500,1),1+SPEED_CAP);
 assert.equal(skillSpeed(5,30),1,'below the requirement is never slower than base');
 assert.equal(workDuration(9,{level:40,requirement:40}),9);assert.equal(workDuration(9,{level:60,requirement:40,toolSpeed:1.5}),9/(1.4*1.5));
 assert.equal(workDuration(4,{level:400,toolSpeed:10}),MIN_WORK_SECONDS);assert.equal(workDuration(1.2,{level:400}),1.2/1.6,'short actions keep their own scale');
});
test('newly unlocked trees always out-earn older ones, even at their speed cap',()=>{
 for(let i=1;i<TREE_IDS.length;i++){
  const tree=TREES[TREE_IDS[i]],rate=id=>actionXp(treeEffort(id),TREES[id].level)/workDuration(treeEffort(id),{level:tree.level,requirement:TREES[id].level});
  for(let j=0;j<i;j++)assert.ok(rate(TREE_IDS[i])>=rate(TREE_IDS[j])*.97,`${TREE_IDS[i]} vs ${TREE_IDS[j]}`);
 }
});
// docs/DESIGN.md, Skill tiers and pacing: level 100 is a few hours of active work; past 100 is the grind.
test('chopping the best unlocked tree with a Crude Axe reaches level 100 in a few hours',()=>{
 let xp=0,seconds=0;const hours={};
 while(xp<totalXpForLevel(150)){
  const level=levelForXp(xp),id=TREE_IDS.filter(t=>level>=TREES[t].level).at(-1),tree=TREES[id];
  seconds+=workDuration(treeEffort(id),{level,requirement:tree.level});xp+=actionXp(treeEffort(id),tree.level);
  for(const m of [10,100,150])if(!hours[m]&&levelForXp(xp)>=m)hours[m]=seconds/3600;
 }
 assert.ok(hours[10]<.5,`level 10 in ${hours[10]}h`);
 assert.ok(hours[100]>2&&hours[100]<4,`level 100 in ${hours[100]}h`);
 assert.ok(hours[150]>hours[100]*1.6,'past 100 slows down');
});
