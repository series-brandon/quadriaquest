// Shared control effects and repeat-control protection for players and enemies (docs/COMBAT.md).
// Stun prevents movement, attacks and casting; immobilize prevents movement only. Both share the
// movement-control category: neither applies while one is active or during that category's
// protection window, and protection starts when the disable ends (or is cleansed).
// Slows are separate: only the strongest active slow applies (capped at 90%); each keeps its own timer.
export const CONTROL={stun:{category:'movement',prevents:['move','attack','cast']},immobilize:{category:'movement',prevents:['move']}};
export const MAX_SLOW=.9;

export function createControlState(){
 const disables=new Map(),protection=new Map();let slows=[];
 const keepLonger=(category,seconds)=>protection.set(category,Math.max(protection.get(category)||0,seconds));
 const api={
  // effect: {kind:'stun'|'immobilize', duration, protection} or {kind:'slow', id, fraction, duration, refresh:true|false}
  apply(effect){
   if(effect.kind==='slow'){
    const existing=slows.find(s=>s.id===effect.id);
    if(existing){if(!effect.refresh)return {applied:false,reason:'Already slowed'};existing.remaining=effect.duration;return {applied:true,refreshed:true};}
    slows.push({id:effect.id,fraction:Math.max(0,effect.fraction),remaining:effect.duration});return {applied:true};
   }
   const def=CONTROL[effect.kind];if(!def)return {applied:false,reason:'Unknown effect'};
   if([...disables.values()].some(d=>CONTROL[d.kind].category===def.category))return {applied:false,reason:'Already controlled'};
   if((protection.get(def.category)||0)>0)return {applied:false,reason:'Protected'};
   disables.set(effect.kind,{kind:effect.kind,remaining:effect.duration,protection:effect.protection||0});return {applied:true};
  },
  // Removes covered disables (starting their normal windows now) and optionally grants protection;
  // the longer remaining window wins. Succeeds when anything was removed or protection extended.
  cleanse({categories=['movement'],grant=0}={}){
   let changed=false;
   for(const [kind,d] of disables)if(categories.includes(CONTROL[kind].category)){disables.delete(kind);keepLonger(CONTROL[kind].category,d.protection);changed=true;}
   for(const c of categories){const before=protection.get(c)||0;if(grant>before){protection.set(c,grant);changed=true;}}
   return changed;
  },
  update(dt){
   for(const [kind,d] of disables){d.remaining-=dt;if(d.remaining<=0){disables.delete(kind);keepLonger(CONTROL[kind].category,d.protection);}}
   for(const [c,t] of protection){const left=t-dt;if(left<=0)protection.delete(c);else protection.set(c,left);}
   for(const s of slows)s.remaining-=dt;slows=slows.filter(s=>s.remaining>0);
  },
  can(action){for(const d of disables.values())if(CONTROL[d.kind].prevents.includes(action))return false;return true;},
  get slowFraction(){return Math.min(MAX_SLOW,Math.max(0,...slows.map(s=>s.fraction)));},
  get stunned(){return disables.has('stun');},
  get active(){return disables.size>0||slows.length>0||protection.size>0;},
  reset(){disables.clear();protection.clear();slows=[];},
  // Active effect kinds for compact icons: 'stun', 'immobilize', 'slow', 'immune'.
  get kinds(){const kinds=[...disables.keys()];if(slows.length)kinds.push('slow');if(protection.size)kinds.push('immune');return kinds;},
  // Player-facing summary: active disables, strongest slow and visible protection windows.
  get summary(){
   const parts=[];for(const d of disables.values())parts.push(`${d.kind==='stun'?'Stunned':'Immobilized'} ${d.remaining.toFixed(1)}s`);
   if(slows.length)parts.push(`Slowed ${Math.round(api.slowFraction*100)}%`);
   for(const [c,t] of protection)parts.push(`${c==='movement'?'Control':c} immunity ${t.toFixed(0)}s`);
   return parts.join(' · ');
  },
  get state(){return {disables:[...disables.values()].map(d=>({...d})),slows:slows.map(s=>({...s})),protection:Object.fromEntries(protection)};},
 };
 return api;
}
