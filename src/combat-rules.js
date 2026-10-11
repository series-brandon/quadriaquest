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
 // A first boss, far beyond the tutorial: its Threat Level reads as hopeless on purpose.
 golem:{attributes:{...ZERO_ATTRIBUTES,constitution:80,strength:70,toughness:60,celerity:1},skills:{melee:{technique:60,power:70,accuracy:60,speed:20,defense:50,agility:0},ranged:{...NO_STYLE,defense:50},magic:{...NO_STYLE,defense:50}},proficiencies:{unarmed:60}},
};
// Capabilities default off: enemies never inherit player-only crit/dodge/block baselines.
const GOBLIN={style:'melee',strategy:'technical',damageTypes:['bludgeoning'],missPercent:1,canCritical:false,canDodge:false,canBlock:false,baseInterval:2.55,xpMultiplier:1,xpLevelCap:null};

export function deriveEnemy(sheet,config){
 const attack=attackProfile(sheet,{player:false,style:config.style,strategy:config.strategy,proficiency:'unarmed',baseInterval:config.baseInterval});
 return {...config,sheet,health:resourceMaxima(sheet.attributes).health,min:attack.min,max:attack.max,interval:attack.interval,attack,
  resistancePct:Object.fromEntries(['melee','ranged','magic'].map(s=>[s,resistanceBonus(sheet,s)/10])),threat:threat(sheet)};
}

// Boss behavior flags (all optional, shared by any enemy):
//  telegraphed: no quick opening swing; every attack winds up for its full interval, so stepping out of
//   reach in time (it resets when the target leaves) avoids it.
//  moveSpeed: walking-speed multiplier (1 = normal).
//  attacksPacifists: engages players whose attacks are prevented.
export const ENEMIES={
 // Inert: no attack or retaliation, zero resistance, no dodge/block; half XP until the receiving track reaches level 3.
 target:{name:'Practice Target',health:50,interval:99,min:0,max:0,protected:true,inert:true,resistancePct:{melee:0,ranged:0,magic:0},canDodge:false,canBlock:false,canCritical:false,xpMultiplier:.5,xpLevelCap:3},
 scrapper:{...deriveEnemy(ENEMY_SHEETS.scrapper,GOBLIN),name:'Goblin Scrapper',aggressive:false,aggroRange:3,protected:true},
 bruiser:{...deriveEnemy(ENEMY_SHEETS.bruiser,GOBLIN),name:'Goblin Bruiser',aggressive:true,aggroRange:4},
 // Unwinnable by design: a single slam (up to 450) ends any tutorial player, but it is slow and
 // telegraphed, so running at once escapes. Its health refills whenever it walks home, and it awards
 // no XP, so it can't be chipped down or farmed.
 golem:{...deriveEnemy(ENEMY_SHEETS.golem,{...GOBLIN,baseInterval:3.4}),name:'Cinder Golem',boss:true,health:3000,min:250,max:450,interval:3.4,
  resistancePct:{melee:50,ranged:50,magic:50},aggressive:true,aggroRange:7,attacksPacifists:true,telegraphed:true,moveSpeed:.55,xpMultiplier:0,
  // The slam locks the 3×3 tiles around the player at its commit point (docs/COMBAT.md, Enemy attack commitment).
  target:'tile',area:1,
  // Ranged punish: after 1.5 s out of its reach (within 8 tiles and sight) it stands and throws a rock.
  rangedAttack:{name:'Rock Throw',style:'ranged',telegraphed:false,min:40,max:90,interval:3.4,windup:2.4,flight:.6,target:'tile',area:1,range:8,after:1.5}},
};
