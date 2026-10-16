// Shared base roll for timed tool work: the effort varies ±15% and each felled/mined node yields 1–3.
// Callers apply skill and tool speed (skill-pacing.js) without changing the loot roll.
export const WORK_JITTER=.15;
export function rollToolWork(effort,random=Math.random){return {duration:effort*(1-WORK_JITTER+2*WORK_JITTER*random()),quantity:1+Math.floor(Math.min(.999999,random())*3)};}
