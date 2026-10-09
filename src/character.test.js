import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacter,CREATION_POINTS} from './character.js';
import {playerAttackProfile,playerDefense,UNARMED} from './combat-profile.js';
import {createResource,createPlayerResources} from './player-resources.js';
import {GEAR} from './equipment.js';
import {SPELLS} from './combat-styles.js';
import {totalXpForLevel} from './combat-formulas.js';
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} ≈ ${b}`);

test('fresh character: documented bases, 100-point pools, 3 creation points, level-1 tracks',()=>{
 const c=createCharacter();
 assert.equal(c.attribute('constitution'),10);assert.equal(c.attribute('strength'),1);assert.equal(c.unspent,CREATION_POINTS);
 assert.deepEqual(c.maxima,{health:100,mana:100,stamina:100,energy:100,ki:100});
 assert.equal(c.level('melee.technique'),1);assert.equal(c.level('prof.unarmed'),1);assert.equal(c.core.level,1);
});

test('allocation spends points, respects the 500 cap and changes derived maxima',()=>{
 let changes=0;const c=createCharacter({changed:()=>changes++});
 assert.ok(c.allocate('constitution'));assert.equal(c.attribute('constitution'),11);assert.equal(c.maxima.health,110);assert.equal(c.unspent,2);
 c.allocate('strength');c.allocate('strength');assert.equal(c.allocate('luck'),false,'no points left');assert.ok(changes>=3);
 c.grantPoints(1000);c.setAttribute('luck',500);assert.equal(c.canAllocate('luck'),false);
 c.reset();assert.equal(c.attribute('constitution'),10);assert.equal(c.unspent,CREATION_POINTS);
});

test('one action converts summed awards to core XP once and core levels grant 3 points',()=>{
 const c=createCharacter();
 const r=c.award([{track:'melee.technique',amount:6},{track:'prof.unarmed',amount:4}]);
 assert.equal(r.core.xp,2);assert.equal(c.core.remainder,0);
 c.award([{track:'melee.technique',amount:6}]);assert.equal(c.core.remainder,1);
 const big=c.award([{track:'melee.power',amount:5*Math.ceil(totalXpForLevel(2))}]);
 assert.equal(c.core.level,2);assert.ok(big.core.leveledUp);assert.equal(c.unspent,CREATION_POINTS+3);
 const capped=c.award([{track:'melee.power',amount:100}],{multiplier:.5,levelCap:2});assert.equal(capped.tracks[0].xp,0);
});

test('starter weapons, shields and Energy Strike derive the documented attacks',()=>{
 const c=createCharacter();
 const fists=playerAttackProfile(c,UNARMED);assert.deepEqual([fists.min,fists.max],[1,12]);close(fists.interval,2.5);assert.equal(fists.xpTrack,'melee.technique');assert.equal(fists.proficiencyTrack,'prof.unarmed');
 const dagger=playerAttackProfile(c,GEAR.copperDagger);assert.deepEqual([dagger.min,dagger.max],[6,22]);
 const bow=playerAttackProfile(c,GEAR.bows,'accurate');assert.equal(bow.xpTrack,'ranged.accuracy');assert.deepEqual([bow.min,bow.max],[11,20],'Accurate: +10 Accuracy, -2 Power');
 const sword=playerAttackProfile(c,GEAR.swords);assert.deepEqual([sword.min,sword.max],[4,18]);
 const spell=playerAttackProfile(c,{...SPELLS.energyStrike,spell:'energyStrike'});assert.deepEqual([spell.min,spell.max],[1,22]);close(spell.interval,3/1.02);assert.equal(spell.manaCost,4);assert.equal(spell.proficiencyTrack,null);
 const strong=playerAttackProfile(c,UNARMED,'strong');assert.deepEqual([strong.min,strong.max],[0,22]);assert.equal(strong.xpTrack,'melee.power');
 const shield=playerDefense(c,{shield:GEAR.copperShield});close(shield.resistancePct,5.11);close(shield.blockPercent,1.001);close(shield.dodgePercent,1.004);
 close(playerDefense(c).resistancePct,.1);
});

test('unmet requirements reduce only positive item bonuses',()=>{
 const c=createCharacter(),heavy={...GEAR.copperDagger,requirements:{'melee.technique':2}};
 const p=playerAttackProfile(c,heavy);assert.equal(p.effectiveness,.5);close(p.bonuses.power,1+1+.2+5);
 c.setLevel('melee.technique',2);assert.equal(playerAttackProfile(c,heavy).effectiveness,1);
});

test('resource maxima keep current amounts; regeneration scales and pauses Stamina only while sprinting',()=>{
 const r=createResource();r.value=80;r.max=150;assert.equal(r.value,80);r.value=140;r.max=100;assert.equal(r.value,100);
 const c=createCharacter(),p=createPlayerResources(),health=createResource();health.value=50;p.mana.value=0;p.stamina.value=0;
 p.regenerate(6,{health,attribute:c.attribute,inCombat:false});close(health.value,51);close(p.mana.value,6);close(p.stamina.value,6);
 p.regenerate(12,{health,attribute:c.attribute,inCombat:true});close(health.value,52);close(p.mana.value,12);
 p.toggle();p.stamina.value=50;p.advance(.5,true);const before=p.stamina.value;p.regenerate(1,{health,attribute:c.attribute,inCombat:false});assert.equal(p.stamina.value,before,'no regen while sprinting');
 p.regenerate(1,{health,attribute:c.attribute,inCombat:false});assert.equal(p.stamina.value,before+1,'regenerates once stopped');
 health.value=0;p.regenerate(60,{health,attribute:c.attribute,inCombat:false});assert.equal(health.value,0,'no recovery while defeated');
});

test('non-combat skill XP (gathering, mining, fishing, carpentry…) feeds the same core conversion and remainder',async()=>{
 const {onSkillXp,awardSkillXp,addSkillXp,createGatheringSkill}=await import('./skills.js');
 const c=createCharacter();onSkillXp(amount=>c.convertProgression(amount));
 try{
  const gathering=createGatheringSkill(),reward=awardSkillXp(gathering,'Gathering');
  assert.equal(reward.xp,20);assert.equal(reward.core.xp,4);assert.equal(c.core.xp,4,'20 skill XP → 4 core XP');
  addSkillXp(createGatheringSkill(),7,'Carpentry');assert.equal(c.core.xp,5);assert.equal(c.core.remainder,2);
  // The remainder is shared with combat awards: 2 carried + 3 combat XP converts to one more core XP.
  c.award([{track:'melee.technique',amount:3}]);assert.equal(c.core.xp,6);assert.equal(c.core.remainder,0);
 }finally{onSkillXp(null);}
});
