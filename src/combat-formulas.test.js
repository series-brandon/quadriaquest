import test from 'node:test';
import assert from 'node:assert/strict';
import * as f from './combat-formulas.js';
import {ENEMIES,ENEMY_SHEETS} from './combat-rules.js';

const close=(actual,expected,eps=1e-6)=>assert.ok(Math.abs(actual-expected)<eps,`${actual} ≈ ${expected}`);
// Fresh player: capacity attributes 10, everything else 1; no creation points spent.
function freshPlayer(overrides={}){
 const attributes={constitution:10,mentis:10,endurance:10,tenacity:10,aura:10,strength:1,precision:1,intelligence:1,toughness:1,dexterity:1,celerity:1,luck:1,charisma:1,regeneration:1,fortitude:1,recovery:1,recuperation:1,meditation:1,...overrides.attributes};
 const style=()=>({technique:1,power:1,accuracy:1,speed:1,defense:1,agility:1});
 return {attributes,skills:{melee:style(),ranged:style(),magic:style()},proficiencies:{unarmed:1,dagger:1,bow:1,shield:1,energy:1,...overrides.proficiencies}};
}

test('damage bounds follow the shared formula and floors',()=>{
 assert.deepEqual(f.damageBounds(2.2,1.2),{min:1,max:12});
 assert.deepEqual(f.damageBounds(100,100),{min:51,max:110});
 assert.deepEqual(f.damageBounds(100,200),{min:88,max:110});
 assert.equal(f.minHit(12,-2),0);
 assert.equal(f.maxHit(-50),10,'player maximum-hit floor');
 assert.equal(f.maxHit(-9,{player:false}),1);
 assert.deepEqual(f.damageBounds(-10,0,{player:false}),{min:0,max:0},'enemy zero maximum');
});

test('starter attacks match the documented ranges',()=>{
 const p=freshPlayer();
 const unarmed=f.attackProfile(p,{proficiency:'unarmed'});
 assert.deepEqual([unarmed.min,unarmed.max],[1,12]);close(unarmed.interval,2.5);
 const strong=f.attackProfile(p,{proficiency:'unarmed',strategy:'strong'});
 assert.deepEqual([strong.min,strong.max],[0,22]);
 assert.deepEqual(f.strongStrikeBounds(strong),{min:22,max:44});
 assert.deepEqual(f.strongStrikeBounds({min:0,max:10}),{min:10,max:20});
 assert.deepEqual(f.strongStrikeBounds({min:7,max:10}),{min:14,max:20});
 const dagger=f.attackProfile(p,{proficiency:'dagger',item:{power:10,accuracy:10}});
 assert.deepEqual([dagger.min,dagger.max],[6,22]);
 const bow=f.attackProfile(p,{style:'ranged',proficiency:'bow',item:{power:10,accuracy:10}});
 assert.deepEqual([bow.min,bow.max],[6,22]);
 const spell=f.attackProfile(p,{style:'magic',base:20,baseInterval:3,elementalPower:f.elementalPowerBonus(1)});
 assert.deepEqual([spell.min,spell.max],[1,22]);close(spell.interval,3/1.02);
});

test('enemy stat sheets derive their documented values',()=>{
 const s=ENEMIES.scrapper,b=ENEMIES.bruiser;
 assert.deepEqual([s.health,s.min,s.max],[50,1,10]);
 assert.deepEqual([b.health,b.min,b.max],[100,3,20]);
 close(s.interval,2.5);close(b.interval,2.5);
 close(s.attack.bonuses.power,.2);close(b.attack.bonuses.power,10.2);
 close(s.attack.bonuses.accuracy,1.2);close(b.attack.bonuses.accuracy,4.2);
 assert.deepEqual(s.resistancePct,{melee:0,ranged:0,magic:0});
 close(s.threat.offensive,.6);close(s.threat.support,.3);close(s.threat.raw,.9);assert.equal(s.threat.level,1);
 close(b.threat.offensive,3.2);close(b.threat.support,.55);close(b.threat.raw,3.75);assert.equal(b.threat.level,3);
 assert.equal(f.resourceMaxima(ENEMY_SHEETS.bruiser.attributes).mana,0);
 assert.equal(s.canCritical||s.canDodge||s.canBlock,false);
});

test('threat calibration examples',()=>{
 const fresh=f.threat(freshPlayer({attributes:{strength:4}}));
 close(fresh.offensive,1.65);close(fresh.defensive,.5);close(fresh.support,2.4);assert.equal(fresh.level,4);
 const melee=freshPlayer({attributes:{strength:101,celerity:51,toughness:51,constitution:110}});
 Object.assign(melee.skills.melee,{technique:100,power:100,accuracy:100,speed:100,defense:100,agility:100});
 const t=f.threat(melee);close(t.offensive,100.25);close(t.defensive,17);close(t.support,12.4);assert.equal(t.level,129);
});

test('chances, avoidance and resolution order',()=>{
 const p=freshPlayer();
 close(f.playerDodgePercent(f.dodgeBonus(p,'melee')),1.004);
 close(f.playerCriticalPercent(f.criticalBonus(p)),1.002);
 close(f.playerCriticalPercent(f.criticalBonus(freshPlayer({attributes:{luck:500}}))),2);
 assert.equal(f.playerBlockPercent(),1);close(f.playerBlockPercent({shieldProficiency:500}),1.5);
 close(f.playerBlockPercent({shieldProficiency:500,armorSlotLevels:Array(7).fill(500)}),1.85);
 close(f.combinedAvoidance(.01,.01,0),.0199);
 const seq=values=>{let i=0;return ()=>values[i++];};
 assert.equal(f.resolveAttack({missPercent:1,min:1,max:10,random:seq([.001])}).outcome,'miss');
 assert.equal(f.resolveAttack({missPercent:1,dodgePercent:1,min:1,max:10,random:seq([.5,.001])}).outcome,'dodge');
 assert.equal(f.resolveAttack({blockPercent:1,min:1,max:10,random:seq([.001])}).outcome,'block');
 const crit=f.resolveAttack({canCritical:true,criticalPercent:100,min:10,max:20,random:seq([0,0])});
 assert.deepEqual([crit.outcome,crit.critical,crit.raw],['hit',true,30]);
});

test('resistance stacks additively per portion and rounds once',()=>{
 assert.equal(f.resolvePortions([{amount:100,resistancePct:60}]),40);
 assert.equal(f.resolvePortions([{amount:100,resistancePct:-40}]),140);
 assert.equal(f.resolvePortions([{amount:3.6},{amount:3.6}]),7);
 assert.equal(f.resolvePortions([{amount:50,resistancePct:150},{amount:50}]),50);
 assert.equal(f.resolvePortions([{amount:50,immune:true,resistancePct:-100},{amount:20}]),20);
 assert.equal(f.resolvePortions([{amount:9.5}]),10);
 assert.equal(f.resolvePortions([{amount:20,resistancePct:.1}]),20);
 close(f.resistanceBonus(freshPlayer(),'melee')/10,.1);
 close(f.resistanceBonus(freshPlayer(),'melee',{shield:true,item:50})/10,5.11);
 assert.deepEqual(f.infusionShares({fire:30,water:20}),{shares:{fire:.3,water:.2},uninfused:.5});
 assert.deepEqual(f.infusionShares({fire:75,water:75}),{shares:{fire:.5,water:.5},uninfused:0});
 const s=f.infusionShares({fire:100,water:50});close(s.shares.fire,2/3);close(s.shares.water,1/3);
});

test('action timing, requirements and backfire',()=>{
 for(const [bonus,t] of [[0,2],[25,1.6],[100,1],[-50,3],[-100,4],[1000,.5]])close(f.actionTime(2,bonus),t);
 assert.equal(f.requirementRatio([[10,20]]),.5);assert.equal(f.requirementRatio([[20,20],[5,10]]),.5);
 assert.equal(f.requirementEffectiveness(.01),.1);assert.equal(f.requirementEffectiveness(3),1);
 assert.equal(f.scaleItemBonus(20,.5),10);assert.equal(f.scaleItemBonus(-4,.5),-4);
 for(const [lvl,pct] of [[1,98.01],[10,81],[50,25],[75,6.25],[90,1],[100,0],[150,0]])close(f.backfirePercent(lvl/100),pct);
 assert.equal(f.backfireBaseDamage(40),20);
 for(const [lvl,cost] of [[1,4],[51,3],[101,2],[301,1]])assert.equal(f.manaCost(4,lvl,lvl),cost);
 close(f.weightedLevel({fire:.75,water:.25},{fire:100,water:20})/20,4);
});

test('XP curve, caps and core conversion',()=>{
 assert.equal(Math.ceil(f.totalXpForLevel(2)),562);assert.equal(Math.ceil(f.totalXpForLevel(3)),852);
 close(f.totalXpForLevel(100),100000,1e-6);
 assert.equal(f.levelForXp(0),1);assert.equal(f.levelForXp(562),2);assert.equal(f.levelForXp(561),1);
 assert.equal(f.levelForXp(1e12),500);
 const progress=f.levelProgress(0);assert.equal(progress.floor,0);close(progress.next,f.totalXpForLevel(2));
 assert.equal(f.actionXp(3),80);
 assert.equal(f.cappedAward(200,0,{multiplier:.5,levelCap:3}),100);
 const near=f.totalXpForLevel(3)-10;close(f.cappedAward(80,near,{multiplier:.5,levelCap:3}),10);
 assert.equal(f.cappedAward(80,f.totalXpForLevel(3)+1,{multiplier:.5,levelCap:3}),0);
 const split=f.splitPool(100,{fire:.75,earth:.25},{fire:f.totalXpForLevel(3)},{levelCap:3});
 assert.deepEqual(split,{fire:0,earth:25});
 assert.deepEqual(f.convertCoreXp(0,[6,4]),{core:2,remainder:0});
 const first=f.convertCoreXp(0,[6]);assert.deepEqual(first,{core:1,remainder:1});
 assert.deepEqual(f.convertCoreXp(first.remainder,[4]),{core:1,remainder:0});
});

test('resources, regeneration and movement',()=>{
 assert.deepEqual(f.resourceMaxima(freshPlayer().attributes),{health:100,mana:100,stamina:100,energy:100,ki:100});
 for(const [a,m] of [[-5,0],[0,0],[.5,.5],[1,1],[100,2],[500,10],[550,11]])close(f.regenMultiplier(a),m);
 close(1/f.regenRate('health',1,false),6);close(1/f.regenRate('health',500,false),.6);
 assert.equal(f.displayResource(.5),1);assert.equal(f.displayResource(0),0);assert.equal(f.displayResource(3),3);
 close(f.sprintDrainPerSecond(100),1.8);close(f.sprintDrainPerSecond(900),1);
 close(f.movementMultiplier([1,.1]),2.1);close(f.movementMultiplier([1,.1],[.5,.2]),1.05);
 close(f.movementMultiplier([],[.99]),.1);
});

test('danger bands use hits to defeat',()=>{
 assert.equal(f.hitsToDefeat(100,20),5);assert.equal(f.hitsToDefeat(40,20),2);assert.equal(f.hitsToDefeat(10,0),Infinity);
 assert.deepEqual([1,2,3,4,6,7,Infinity].map(h=>f.dangerBand(h).band),['imminent','flee','flee','caution','caution','manageable','manageable']);
 assert.equal(f.dangerBand(3).retaliate,false);assert.equal(f.dangerBand(4).retaliate,true);
});

test('player hit splats use the displayed health drop: whole numbers that never exceed visible health',()=>{
 // Fractional health from regeneration: orb shows 6; a lethal hit shows 6, not 5.947… or the raw overkill.
 assert.equal(f.displayedLoss(5.947837283474,0),6);
 // Non-lethal hits show exactly the whole damage dealt, wherever the fraction sits.
 for(const before of [50,50.3,50.999])assert.equal(f.displayedLoss(before,before-9),9);
 assert.equal(f.displayedLoss(1.5,1),1,'protected floor');
 assert.equal(f.displayedLoss(30,30),0);
});
