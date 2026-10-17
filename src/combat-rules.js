import ENEMY_DATA from './data/enemies.json' with {type:'json'};
import {attackProfile,resourceMaxima,resistanceBonus,threat} from './combat-formulas.js';

// Enemy types (docs/COMBAT.md; docs/DESIGN.md, Resource and enemy configuration) are data in
// src/data/enemies.json, edited in the world editor's NPCs tool: each type's `name`; its `sheet` (attributes,
// skill levels per style, proficiencies), from which health, damage, attack interval, resistances and Threat are
// derived with the shared formulas (every Threat input is configured deliberately); its attack setup (`style`,
// `strategy`, `damageTypes`, `baseInterval` seconds, `missPercent`, and `canCritical`/`canDodge`/`canBlock`, which
// default off: enemies never inherit player-only baselines); behaviour (`aggressive`, the default for new spawns;
// `aggroRange` tiles; `moveSpeed` ×; `telegraphed`: no quick opening swing, every attack winds up for its full
// interval, so stepping out of reach in time avoids it; `attacksPacifists`; `protected`: can't take the player below
// 1 HP; `boss`); XP (`xpMultiplier`, `xpLevelCap`); `overrides` for any derived value (`health`, `min`, `max`,
// `interval`, `resistancePct`); and `respawn` and `drops` (drops.js), which a map spawn may rarely override.
// ENEMIES is the live view combat reads; enemyRow/refreshEnemy rebuild it from the data.
export const ENEMY_DATA_FIELDS=['name','sheet','style','strategy','damageTypes','baseInterval','missPercent','canCritical','canDodge','canBlock',
 'aggressive','aggroRange','moveSpeed','telegraphed','attacksPacifists','protected','boss','xpMultiplier','xpLevelCap','overrides','respawn','drops'];
export const ENEMY_OVERRIDES=['health','min','max','interval','resistancePct'];
// Behaviour that stays in code, by type.
const ENEMY_CODE={
 // Inert: no attack or retaliation (no sheet; its numbers are overrides). Half XP until the receiving track reaches level 3.
 target:{inert:true},
 // Unwinnable by design: a single slam ends any tutorial player, but it is slow and telegraphed, so running at
 // once escapes. Its health refills whenever it walks home, and it awards no XP, so it can't be chipped down or farmed.
 golem:{
  // The slam locks the 3×3 tiles around the player at its commit point (docs/COMBAT.md, Enemy attack commitment).
  target:'tile',area:1,
  // Ranged punish: after 1.5 s out of its reach (within 8 tiles and sight) it stands and throws a rock.
  rangedAttack:{name:'Rock Throw',style:'ranged',telegraphed:false,min:40,max:90,interval:3.4,windup:2.4,flight:.6,target:'tile',area:1,range:8,after:1.5}},
};
export function deriveEnemy(sheet,config){
 const attack=attackProfile(sheet,{player:false,style:config.style,strategy:config.strategy,proficiency:'unarmed',baseInterval:config.baseInterval});
 return {...config,sheet,health:resourceMaxima(sheet.attributes).health,min:attack.min,max:attack.max,interval:attack.interval,attack,
  resistancePct:Object.fromEntries(['melee','ranged','magic'].map(s=>[s,resistanceBonus(sheet,s)/10])),threat:threat(sheet)};
}
// One type's live row: its data, the values derived from its sheet, its overrides, then its code behaviour.
export function enemyRow(kind){
 const {sheet,overrides={},...config}=structuredClone(ENEMY_DATA[kind]);
 return {...(sheet?deriveEnemy(sheet,config):config),...overrides,...structuredClone(ENEMY_CODE[kind]||{})};
}
export const ENEMIES={};
// Rebuilds one type's row in place after its data changes (the NPCs tool), so spawned enemies follow.
export function refreshEnemy(kind){const row=ENEMIES[kind]??={};for(const key of Object.keys(row))delete row[key];Object.assign(row,enemyRow(kind));}
for(const kind of Object.keys(ENEMY_DATA))refreshEnemy(kind);
// The authored sheets (combat tests and fixtures read them).
export const ENEMY_SHEETS=Object.fromEntries(Object.entries(ENEMY_DATA).filter(([,d])=>d.sheet).map(([kind,d])=>[kind,d.sheet]));
// The data rows (the NPCs tool edits these, then refreshEnemy), and the file as they write it.
export const enemyData=kind=>ENEMY_DATA[kind];
export function enemiesData(){return Object.fromEntries(Object.entries(ENEMY_DATA).map(([kind,d])=>[kind,Object.fromEntries(ENEMY_DATA_FIELDS.filter(f=>d[f]!==undefined).map(f=>[f,d[f]]))]));}
