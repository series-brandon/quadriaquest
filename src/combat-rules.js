import ENEMY_DATA from './data/enemies.json' with {type:'json'};
import {STYLES,attackProfile,resourceMaxima,resistanceBonus,threat} from './combat-formulas.js';

// Enemy types (docs/COMBAT.md; docs/DESIGN.md, Resource and enemy configuration) are data in
// src/data/enemies.json, edited in the world editor's NPCs tool: each type's `name`; its `sheet` (attributes,
// skill levels per style, proficiencies), from which health, each style's damage and attack interval, resistances
// and Threat are derived with the shared formulas (every Threat input is configured deliberately); its attack setup
// (`strategy`, `damageTypes`, `baseInterval` seconds, `missPercent`, `attackRange` tiles for its ranged and magic
// attacks, and `canCritical`/`canDodge`/`canBlock`, which default off: enemies never inherit player-only
// baselines); its attack mix (`attacks`: a weight per regular style, 0 or absent for off; `specialAttacks`:
// [{id, chance %}] from SPECIAL_ATTACKS below); behaviour (`aggressiveUntil`: it attacks players whose Threat is
// below this on sight, 0 never; `aggroRange` tiles; `patrolRadius` tiles it wanders from home while calm; `moveSpeed` ×; `attacksPacifists`; `protected`: can't take
// the player below 1 HP; `boss`); XP (`xpMultiplier`, `xpLevelCap`); `overrides` for any derived value (`health`,
// `resistancePct`, and `attacks.<style>` {`min`, `max`, `interval`}; a type without a sheet sets flat `min`, `max`,
// `interval`); and `respawn` and `drops` (drops.js), which a map spawn may rarely override.
// ENEMIES is the live view combat reads; enemyRow/refreshEnemy rebuild it from the data.
export const ENEMY_DATA_FIELDS=['name','sheet','strategy','damageTypes','baseInterval','missPercent','attackRange','canCritical','canDodge','canBlock',
 'attacks','specialAttacks','aggressiveUntil','aggroRange','patrolRadius','moveSpeed','attacksPacifists','protected','boss','xpMultiplier','xpLevelCap','overrides','respawn','drops'];
// Reach of an enemy's regular ranged and magic attacks when its type sets none (a bow's range).
export const ENEMY_ATTACK_RANGE=6;
// How far (tiles, each way) a calm enemy wanders from home when neither its spawn nor its type sets `patrolRadius`.
export const ENEMY_PATROL_RADIUS=2;

// Special attacks: programmed here, given to a type by id with a chance (the NPCs tool lists them by name). Each
// says how it plays; its damage and interval come from the enemy's own derived attack for `style`, so stronger
// enemies hit harder with the same special.
//   style       damage type: melee, ranged or magic (also the player's resistance that applies)
//   range       'melee' (beside its body) or tiles (needs line of sight)
//   windup      seconds of windup before impact; 'interval' winds up for its whole interval (slow and readable)
//   target      'character' locks onto the player at the commit point and follows them; 'tile' locks the
//               (2·area+1)² tiles around the player there and hits whoever stands on them at impact (an area attack)
//   telegraph   marks the locked tiles (or the locked-on player's tile) on the ground from the commit point
//   after       only once the player has stayed out of its melee reach this many seconds (a punish for kiting);
//               it chases again for the full delay after each use
//   projectile  thrown or shot: 'rock', 'ranged' or 'magic', flying `flight` seconds (arc: lob height)
//   pose        'strike' (its attack motion) or 'throw'
//   damageScale × its style's damage (default 1)
// Only the player can be targeted today; companions and other slimes will join as targets later.
export const SPECIAL_ATTACKS={
 groundSlam:{name:'Ground Slam',style:'melee',range:'melee',windup:'interval',target:'tile',area:1,telegraph:true,pose:'strike'},
 rockThrow:{name:'Rock Throw',style:'ranged',range:8,windup:2.4,target:'tile',area:1,telegraph:true,after:1.5,projectile:'rock',flight:.6,arc:1.2,pose:'throw'},
};
// Regular attacks: one per style, aimed at the player.
const REGULAR={
 melee:{name:'Melee',range:'melee'},
 ranged:{name:'Ranged',projectile:'ranged'},
 magic:{name:'Magic',projectile:'magic'},
};
// Behaviour that stays in code, by type.
const ENEMY_CODE={
 // Inert: no attack or retaliation (no sheet; its numbers are overrides). Half XP until the receiving track reaches level 3.
 target:{inert:true},
};
// Each style's attack from the sheet (unarmed, with the type's strategy and base interval).
export function deriveEnemy(sheet,config){
 const profiles=Object.fromEntries(STYLES.map(style=>[style,{style,...attackProfile(sheet,{player:false,style,strategy:config.strategy,proficiency:'unarmed',baseInterval:config.baseInterval})}]));
 return {...config,sheet,health:resourceMaxima(sheet.attributes).health,profiles,
  resistancePct:Object.fromEntries(STYLES.map(s=>[s,resistanceBonus(sheet,s)/10])),threat:threat(sheet)};
}
// One of a type's attacks as combat uses it: what it does (code), with its style's damage and interval (data).
// id: a style (a regular attack) or a SPECIAL_ATTACKS id.
export function enemyMove(row,id,{weight=1,chance=100}={}){
 const special=SPECIAL_ATTACKS[id],def=special||REGULAR[id];if(!def||!row.profiles)return null;
 const style=special?.style||id,profile=row.profiles[style],scale=def.damageScale??1;
 const move={id,name:def.name,special:!!special,style,min:Math.round(profile.min*scale),max:Math.round(profile.max*scale),interval:profile.interval,
  range:def.range??row.attackRange??ENEMY_ATTACK_RANGE,target:def.target||'character',area:def.area??0,telegraph:!!def.telegraph,after:def.after??null,
  projectile:def.projectile||null,flight:def.flight??null,arc:def.arc??0,pose:def.pose||'strike',
  missPercent:row.missPercent||0,canCritical:!!row.canCritical,criticalPercent:row.criticalPercent||0,protected:!!row.protected};
 // Regular windups follow the style (combat.js attackWindup); a special's is its own.
 if(special)move.windup=Math.min(move.interval,def.windup==='interval'?move.interval:def.windup);
 if(special)move.chance=chance;else move.weight=weight;
 return move;
}
// A type's attacks: its specials in list order, then its regular attacks.
function enemyMoves(row){
 const specials=(row.specialAttacks||[]).filter(s=>SPECIAL_ATTACKS[s.id]).map(s=>enemyMove(row,s.id,{chance:s.chance??0})).filter(Boolean);
 const regular=STYLES.filter(style=>row.attacks?.[style]>0).map(style=>enemyMove(row,style,{weight:row.attacks[style]}));
 return [...specials,...regular];
}
// Picks the next attack from the ones it can use (docs/COMBAT.md, Enemy attack choice), from one roll (0..1):
// each special, in list order, takes its chance (%) of the roll; the rest is shared by the regular attacks by weight.
// With no regular attacks the specials share the whole roll by their chances.
export function chooseEnemyMove(moves,roll){
 const specials=moves.filter(m=>m.special&&m.chance>0),regular=moves.filter(m=>!m.special&&m.weight>0);
 const chances=specials.reduce((s,m)=>s+m.chance,0),span=regular.length?100:Math.min(100,chances);
 if(!span)return null;
 let r=roll*span;
 for(const m of specials){if(r<m.chance)return m;r-=m.chance;}
 if(!regular.length)return specials.at(-1);
 const weights=regular.reduce((s,m)=>s+m.weight,0);let w=r/Math.max(1e-9,100-chances)*weights;
 for(const m of regular){if(w<m.weight)return m;w-=m.weight;}
 return regular.at(-1);
}
// The share of attack choices each attack gets (the NPCs tool's mix): [move, %] for the usual roll, then any
// conditional special (`after`: a kiting punish) with its own chance while its condition holds, marked by a third entry.
export function attackMix(moves){
 const usual=moves.filter(m=>m.after==null),specials=usual.filter(m=>m.special&&m.chance>0),regular=usual.filter(m=>!m.special&&m.weight>0);
 const chances=specials.reduce((s,m)=>s+m.chance,0),span=regular.length?100:Math.min(100,chances),weights=regular.reduce((s,m)=>s+m.weight,0);
 let left=span;const shares=specials.map(m=>{const share=Math.max(0,Math.min(m.chance,left));left-=share;return [m,span?share/span*100:0];});
 const conditional=moves.filter(m=>m.after!=null&&m.special&&m.chance>0).map(m=>[m,Math.min(100,m.chance),true]);
 return [...shares,...regular.map(m=>[m,Math.max(0,100-chances)*m.weight/weights])].filter(([,p])=>p>0).concat(conditional);
}
// One type's live row: its data, the values derived from its sheet, its overrides, its attacks, then its code behaviour.
// Top-level min/max/interval/style are its basic attack (its most used regular style, else melee), for summaries.
export function enemyRow(kind){
 const {sheet,overrides={},...config}=structuredClone(ENEMY_DATA[kind]);
 const {attacks:attackOverrides={},...flat}=overrides,derived=sheet?deriveEnemy(sheet,config):config,row={...derived,...flat};
 // A resistance override sets only the styles it names; the others keep their derived values.
 if(derived.resistancePct&&flat.resistancePct)row.resistancePct={...derived.resistancePct,...flat.resistancePct};
 if(row.profiles)for(const [style,o] of Object.entries(attackOverrides))Object.assign(row.profiles[style],o);
 row.moves=enemyMoves(row);
 const basic=row.profiles&&(STYLES.filter(s=>row.attacks?.[s]>0).sort((a,b)=>row.attacks[b]-row.attacks[a])[0]||'melee');
 if(basic){const p=row.profiles[basic];Object.assign(row,{style:basic,min:p.min,max:p.max,interval:p.interval});}
 return {...row,...structuredClone(ENEMY_CODE[kind]||{})};
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
// Whether an enemy attacks this player on sight: their Threat is below its `aggressiveUntil` (a spawn's own, else its
// type's). 0 never; a high number always.
export const aggressiveUntil=a=>a.aggressiveUntil??a.rules.aggressiveUntil??0;
export const hostileTo=(a,playerThreat)=>!a.rules.inert&&playerThreat<aggressiveUntil(a);
// The square a calm enemy wanders in: `patrolRadius` tiles each way from home (a spawn's own, else its type's).
export const patrolRadius=a=>a.patrolRadius??a.rules.patrolRadius??ENEMY_PATROL_RADIUS;
export function patrolArea(a){const r=patrolRadius(a),{x,z}=a.home;return {minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r};}
