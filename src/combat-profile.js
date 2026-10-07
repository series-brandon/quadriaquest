import {STRATEGIES,strongStrikeBounds,attackProfile,criticalBonus,playerCriticalPercent,requirementRatio,requirementEffectiveness,scaleItemBonus,manaCost,elementalPowerBonus,weightedLevel,dodgeBonus,playerDodgePercent,playerBlockPercent,resistanceBonus} from './combat-formulas.js';

export const UNARMED={style:'unarmed',range:1,baseInterval:2.55,proficiency:'unarmed',damageTypes:['bludgeoning']};
export const combatStyleOf=attack=>attack.spell?'magic':attack.style==='ranged'?'ranged':attack.style==='magic'?'magic':'melee';

// Lowest current/required ratio across an item's or spell's configured requirements.
export function effectiveness(character,requirements={}){
 return requirementEffectiveness(requirementRatio(Object.entries(requirements).map(([track,req])=>[character.level(track),req])));
}

// One committed player attack: bounds, timing, XP destinations and costs from current progression.
export function playerAttackProfile(character,attack=UNARMED,strategy='technical'){
 const sheet=character.sheet(),combatStyle=combatStyleOf(attack),eff=effectiveness(character,attack.requirements);
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
  xpTrack:`${combatStyle}.${STRATEGIES[strategy]?.skill||'technique'}`,proficiencyTrack:attack.spell?null:`prof.${attack.proficiency||'unarmed'}`};
}

// Player defenses evaluated when an incoming hit resolves.
// bonusResistancePct: flat percentage points added once per incoming portion (Harden).
export function playerDefense(character,{activeStyle='melee',strategy='technical',incomingStyle='melee',shield=null,bonusResistancePct=0}={}){
 const sheet=character.sheet(),shieldEff=shield?effectiveness(character,shield.requirements):0;
 return {
  dodgePercent:playerDodgePercent(dodgeBonus(sheet,activeStyle,{strategy})),
  blockPercent:playerBlockPercent({shieldProficiency:shield?character.level('prof.shield'):0}),
  resistancePct:resistanceBonus(sheet,incomingStyle,{strategy,shield:!!shield,item:shield?scaleItemBonus(shield.resistance||0,shieldEff):0})/10+bonusResistancePct,
 };
}

// Strong Strike: the next eligible melee attack with Strong strategy, doubled maximum and half-maximum floor.
export function strongStrikeProfile(character,attack,ability){
 const base=playerAttackProfile(character,attack,ability.strategy),bounds=strongStrikeBounds(base);
 return {...base,min:bounds.min,max:bounds.max,ability:'strongStrike',abilityName:ability.name,energyCost:ability.energy};
}
