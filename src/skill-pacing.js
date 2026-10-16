// Shared skill pacing (docs/DESIGN.md, Skill tiers and pacing). Pure functions only.
// Every skill levels on the adopted curve (combat-formulas.js). XP comes from effort: each second of an
// action's nominal effort is worth XP_PER_EFFORT_SECOND, growing 20% for every 10 levels of the content's
// requirement, so newly unlocked content always out-earns the content before it. Level 100 takes a few
// hours of active work; past 100 is the long grind.
export const XP_PER_EFFORT_SECOND=3.5;
export const XP_GROWTH_PER_TEN_LEVELS=1.2;
export function actionXp(effortSeconds,requirement=1){return Math.round(effortSeconds*XP_PER_EFFORT_SECOND*XP_GROWTH_PER_TEN_LEVELS**Math.floor(Math.max(0,requirement)/10));}

// Levels above an action's requirement make it faster: +2% per level, capped at +60% (30 levels above).
// Better tools multiply on top (tool-tiers.js), and timed work never drops below MIN_WORK_SECONDS.
export const SPEED_PER_LEVEL=.02;
export const SPEED_CAP=.6;
export const MIN_WORK_SECONDS=1.5;
export function skillSpeed(level,requirement=1){return 1+Math.min(SPEED_CAP,SPEED_PER_LEVEL*Math.max(0,level-requirement));}
// The floor only stops tools pushing work further: actions already shorter than it keep the level bonus.
// Levels above the requirement also raise the expected yield of tool work by the same +2% per level, capped
// at +60%. The extra is rounded by chance, so a roll of 2 at +30% gives 2 or 3, averaging 2.6.
export function yieldBonus(level,requirement=1){return Math.min(SPEED_CAP,SPEED_PER_LEVEL*Math.max(0,level-requirement));}
export function boostedYield(quantity,level,requirement=1,random=Math.random){return quantity+Math.floor(quantity*yieldBonus(level,requirement)+Math.min(.999999,random()));}
export function workDuration(effortSeconds,{level=1,requirement=1,toolSpeed=1,floor=MIN_WORK_SECONDS}={}){return Math.max(Math.min(floor,effortSeconds/(1+SPEED_CAP)),effortSeconds/(skillSpeed(level,requirement)*toolSpeed));}
