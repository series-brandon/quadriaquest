import {attackProfile,resourceMaxima,resistanceBonus,threat} from './combat-formulas.js';

// Enemy stat sheets (docs/COMBAT.md). Every Threat input is configured deliberately.
const NO_STYLE={technique:0,power:0,accuracy:0,speed:0,defense:0,agility:0};
const ZERO_ATTRIBUTES={constitution:0,mentis:0,endurance:0,tenacity:0,aura:0,strength:0,precision:0,intelligence:0,toughness:0,dexterity:0,celerity:0,luck:0,charisma:1,regeneration:0,fortitude:0,recovery:0,recuperation:0,meditation:0};
function goblinSheet({constitution,strength,melee}){
 return {attributes:{...ZERO_ATTRIBUTES,constitution,strength,celerity:1},skills:{melee:{...NO_STYLE,...melee},ranged:{...NO_STYLE},magic:{...NO_STYLE}},proficiencies:{unarmed:1}};
}
export const ENEMY_SHEETS={
 scrapper:goblinSheet({constitution:5,strength:-1,melee:{technique:1,power:1,accuracy:1,speed:1}}),
 bruiser:goblinSheet({constitution:10,strength:5,melee:{technique:1,power:5,accuracy:4,speed:1}}),
};
// Capabilities default off: enemies never inherit player-only crit/dodge/block baselines.
const GOBLIN={style:'melee',strategy:'technical',damageTypes:['bludgeoning'],missPercent:1,canCritical:false,canDodge:false,canBlock:false,baseInterval:2.55,xpMultiplier:1,xpLevelCap:null};

export function deriveEnemy(sheet,config){
 const attack=attackProfile(sheet,{player:false,style:config.style,strategy:config.strategy,proficiency:'unarmed',baseInterval:config.baseInterval});
 return {...config,sheet,health:resourceMaxima(sheet.attributes).health,min:attack.min,max:attack.max,interval:attack.interval,attack,
  resistancePct:Object.fromEntries(['melee','ranged','magic'].map(s=>[s,resistanceBonus(sheet,s)/10])),threat:threat(sheet)};
}

export const ENEMIES={
 // Inert: no attack or retaliation, zero resistance, no dodge/block; half XP until the receiving track reaches level 3.
 target:{name:'Practice Target',health:50,interval:99,min:0,max:0,protected:true,inert:true,resistancePct:{melee:0,ranged:0,magic:0},canDodge:false,canBlock:false,canCritical:false,xpMultiplier:.5,xpLevelCap:3},
 scrapper:{...deriveEnemy(ENEMY_SHEETS.scrapper,GOBLIN),name:'Goblin Scrapper',aggressive:false,aggroRange:3,protected:true},
 bruiser:{...deriveEnemy(ENEMY_SHEETS.bruiser,GOBLIN),name:'Goblin Bruiser',aggressive:true,aggroRange:4},
};
