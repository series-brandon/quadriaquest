import {STRATEGIES,strongStrikeBounds,backfirePercent,attackProfile,criticalBonus,playerCriticalPercent,requirementRatio,requirementEffectiveness,scaleItemBonus,manaCost,elementalPowerBonus,weightedLevel,dodgeBonus,playerDodgePercent,playerBlockPercent,resistanceBonus} from './combat-formulas.js';

export const UNARMED={style:'unarmed',range:1,baseInterval:2.55,proficiency:'unarmed',damageTypes:['bludgeoning']};
export const combatStyleOf=attack=>attack.spell?'magic':attack.style==='ranged'?'ranged':attack.style==='magic'?'magic':'melee';

// Lowest current/required ratio across an item's or spell's configured requirements.
export function effectiveness(character,requirements={}){
 return requirementEffectiveness(requirementRatio(Object.entries(requirements).map(([track,req])=>[character.level(track),req])));
}

// One committed player attack: bounds, timing, XP destinations and costs from current progression.
export function playerAttackProfile(character,attack=UNARMED,strategy='technical'){
 const sheet=character.sheet(),combatStyle=combatStyleOf(attack),ratio=requirementRatio(Object.entries(attack.requirements||{}).map(([track,req])=>[character.level(track),req])),eff=requirementEffectiveness(ratio);
 const item={power:scaleItemBonus(attack.power||0,eff),accuracy:scaleItemBonus(attack.accuracy||0,eff),speed:scaleItemBonus(attack.speed||0,eff)};
 let elementalPower=0,cost=0;
 if(attack.elements){
  const levels=Object.fromEntries(Object.keys(attack.elements).map(e=>[e,character.level(`prof.${e}`)])),weighted=weightedLevel(attack.elements,levels);
  elementalPower=elementalPowerBonus(weighted);
  if(attack.mana)cost=manaCost(attack.mana,character.level('magic.technique'),weighted);
 }
 const p=attackProfile(sheet,{style:combatStyle,strategy,proficiency:attack.spell?null:attack.proficiency,item,elementalPower,base:attack.base||10,baseInterval:attack.castTime||attack.baseInterval||2.55});
 // Under-level spells scale rolled damage (full precision) before mitigation; backfire is a separate risk.
 return {...attack,combatStyle,strategy,effectiveness:eff,damageScale:attack.spell?eff:1,min:p.min,max:p.max,interval:p.interval,bonuses:p.bonuses,
  critPercent:playerCriticalPercent(criticalBonus(sheet)),manaCost:cost,
  // Spells only: risk from the unclamped lowest requirement ratio; qualified casting never backfires.
  backfirePercent:attack.spell?backfirePercent(ratio):0,
  xpTrack:`${combatStyle}.${STRATEGIES[strategy]?.skill||'technique'}`,proficiencyTrack:attack.spell?null:`prof.${attack.proficiency||'unarmed'}`};
}

// Dual wielding (docs/COMBAT.md): both hands strike each attack, the off hand a beat after the main
// hand, on one cycle at the slower weapon's interval. The non-dominant off hand deals reduced damage.
export const OFF_HAND_DAMAGE=.75,FOLLOW_UP_DELAY=.25;
// Off-hand damage with two weapons: 75% at Dual Wield proficiency 1, rising evenly to 100% at 100.
// Fists (two free hands) keep the base 75%.
export const offHandFactor=(dualWieldLevel=null)=>dualWieldLevel==null?OFF_HAND_DAMAGE:Math.min(1,OFF_HAND_DAMAGE+(1-OFF_HAND_DAMAGE)*(Math.max(1,dualWieldLevel)-1)/99);
// The off-hand follow-up for a committed main-hand attack (its own weapon, XP and damage roll). With
// two weapons (`dualWieldLevel` given) it also trains Dual Wield, once per attack.
export function offHandFollowUp(offProfile,dualWieldLevel=null){const factor=offHandFactor(dualWieldLevel);return {...offProfile,damageScale:(offProfile.damageScale??1)*factor,offHandPenalty:factor,dualWieldTrack:dualWieldLevel==null?null:'prof.dualWield'};}
// Pairs a main-hand attack with its follow-up: one cycle at the slower interval.
export function pairStrikes(main,followUp){const interval=Math.max(main.interval,followUp.interval);return {...main,interval,followUp:{...followUp,interval}};}
// Average damage per second of a committed attack (both strikes when paired), for Optimize and Auto.
export function attackDps(p){const avg=x=>(x.min+x.max)/2*(x.damageScale??1);return (avg(p)+(p.followUp?avg(p.followUp):0))/p.interval;}

// Player defenses evaluated when an incoming hit resolves.
// bonusResistancePct: flat percentage points added once per incoming portion (Harden).
// Armor: each piece's positive bonuses scale by its own armor-skill effectiveness; equipped slots add their
// slot-proficiency resistance (+0.02/level) and block (+0.0001 pp/level) at full strength.
export function playerDefense(character,{activeStyle='melee',strategy='technical',incomingStyle='melee',shield=null,armor=[],bonusResistancePct=0}={}){
 const sheet=character.sheet(),shieldEff=shield?effectiveness(character,shield.requirements):0;
 const armorSlotLevels=armor.map(p=>character.level(`prof.${p.armor.slot}`));
 const armorResistance=armor.reduce((s,p)=>s+scaleItemBonus(p.resistance||0,effectiveness(character,p.requirements)),0);
 return {
  dodgePercent:playerDodgePercent(dodgeBonus(sheet,activeStyle,{strategy})),
  blockPercent:playerBlockPercent({shieldProficiency:shield?character.level('prof.shield'):0,armorSlotLevels}),
  resistancePct:resistanceBonus(sheet,incomingStyle,{strategy,shield:!!shield,armorSlotLevels,item:(shield?scaleItemBonus(shield.resistance||0,shieldEff):0)+armorResistance})/10+bonusResistancePct,
 };
}
// Armor XP for one connected hit: one skill pool split by class counts, one slot pool split equally by piece.
export function armorAwards(armor,amount){
 if(!armor.length)return [];
 const awards=[],classes={};for(const p of armor)classes[p.armor.class]=(classes[p.armor.class]||0)+1;
 for(const [cls,n] of Object.entries(classes))awards.push({track:`armor.${cls}`,amount:amount*n/armor.length});
 for(const p of armor)awards.push({track:`prof.${p.armor.slot}`,amount:amount/armor.length});
 return awards;
}

// Strong Strike: the next eligible melee attack with Strong strategy, doubled maximum and half-maximum floor.
export function strongStrikeProfile(character,attack,ability){
 const base=playerAttackProfile(character,attack,ability.strategy),bounds=strongStrikeBounds(base);
 return {...base,min:bounds.min,max:bounds.max,ability:'strongStrike',abilityName:ability.name,energyCost:ability.energy};
}
