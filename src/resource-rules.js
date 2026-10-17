import RESOURCE_DATA from './data/resources.json' with {type:'json'};

// Resource configuration (docs/DESIGN.md, Resource and enemy configuration), in three layers:
//   1. the type: src/data/resources.json, and each tree tier in src/data/trees.json (lumberjack.js), edited
//      in the world editor's type tools (Map group);
//   2. the instance: a map placement may rarely override `respawn`, `xp` and `drops` (map data and the
//      editor's folded override section);
//   3. the formula: only for what neither sets. XP falls back to the effort pace (skill-pacing.js).
// Data fields: `level` the skill level needed; `effort` nominal seconds of work; `respawn` seconds until it
// grows back; `drops` what one node gives, in the shared drop-table format (drops.js; tool work's sure drops
// gain the level's yield bonus); optional `xp` per node. Behaviour stays in code: `tool` a tool family
// (tool-tiers.js), the `skill` it trains and the `motion` it plays.
const KINDS={
 copper:{tool:'pickaxe',skill:'Mining',motion:'Mining'},
 tree:{tool:'axe',skill:'Lumberjack',motion:'Chopping'},
 boulder:{tool:'pickaxe',skill:'Mining',motion:'Mining'},
 sticks:{skill:'Gathering',motion:'Gathering'},
 stones:{skill:'Gathering',motion:'Gathering'},
 flint:{skill:'Gathering',motion:'Gathering'}
};
export const RESOURCE_DATA_FIELDS=['level','effort','respawn','xp','drops'];
export const RESOURCE_RULES=Object.fromEntries(Object.entries(KINDS).map(([kind,behaviour])=>[kind,Object.assign(RESOURCE_DATA[kind]||{},behaviour)]));
// The live tables as the file holds them (the type tools save this).
export function resourcesData(){
 return Object.fromEntries(Object.entries(RESOURCE_RULES).filter(([kind])=>kind!=='tree').map(([kind,r])=>[kind,Object.fromEntries(RESOURCE_DATA_FIELDS.filter(f=>r[f]!==undefined).map(f=>[f,r[f]]))]));
}
// The item a resource mainly gives (the first of its sure drops), for guidance and readouts.
export const mainDrop=rules=>rules?.drops?.always?.[0]?.item??null;
// What a map placement may override on its own instance.
export const INSTANCE_FIELDS=['respawn','xp','drops'];
export function instanceConfig(entry){const out={};for(const k of INSTANCE_FIELDS)if(entry?.[k]!==undefined)out[k]=entry[k];return out;}

// Shared base roll for timed tool work: the effort varies ±15%. Callers apply skill and tool speed.
export const WORK_JITTER=.15;
export function rollToolWork(effort,random=Math.random){return {duration:effort*(1-WORK_JITTER+2*WORK_JITTER*random())};}
