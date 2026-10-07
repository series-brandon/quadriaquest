// Shared combat and progression math from docs/COMBAT.md. Pure functions only: no game state,
// no rendering. Players and enemies use the same formulas; capability differences are data.

export const STYLES=['melee','ranged','magic'];
export const COMBAT_SKILLS=['technique','power','accuracy','speed','defense','agility'];
export const STYLE_DAMAGE_ATTRIBUTE={melee:'strength',ranged:'precision',magic:'intelligence'};
export const RESOURCE_ATTRIBUTES={health:'constitution',mana:'mentis',stamina:'endurance',energy:'tenacity',ki:'aura'};
export const REGEN_ATTRIBUTES={health:'regeneration',mana:'fortitude',stamina:'recovery',energy:'recuperation',ki:'meditation'};
export const THREAT_SUPPORT_ATTRIBUTES=['celerity','dexterity','luck','toughness','constitution','aura','mentis','tenacity','regeneration','fortitude','recuperation','meditation'];
export const MAX_LEVEL=500;
export const MIN_ACTION_TIME=.5;

const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
export const roundFinal=v=>Math.max(0,Math.floor(v+.5));

// ── Damage bounds ────────────────────────────────────────────────────────────
export function maxHit(powerBonus,{player=true,base=10}={}){return Math.max(player?10:0,Math.floor(base+powerBonus));}
export function minHit(max,accuracyBonus){return Math.max(0,Math.floor(Math.min(.8*max,1+.5*accuracyBonus)));}
export function damageBounds(powerBonus,accuracyBonus,options){const max=maxHit(powerBonus,options);return {min:Math.min(max,minHit(max,accuracyBonus)),max};}
export function rollDamage(min,max,random=Math.random){return min+Math.floor(Math.min(.999999,random())*(max-min+1));}
export function strongStrikeBounds({min,max}){const enhanced=2*max;return {min:Math.max(2*min,.5*enhanced),max:enhanced};}

// ── Chances (percentage points) ─────────────────────────────────────────────
export const playerDodgePercent=bonus=>clamp(1+bonus/50,0,100);
export const playerCriticalPercent=bonus=>clamp(1+bonus/50,0,100);
export function playerBlockPercent({shieldProficiency=0,armorSlotLevels=[]}={}){
 return clamp(1+.001*shieldProficiency+.0001*armorSlotLevels.reduce((s,l)=>s+l,0),0,100);
}
// Fractions in, fraction out: independent miss, dodge and block opportunities.
export const combinedAvoidance=(miss,dodge,block)=>1-(1-miss)*(1-dodge)*(1-block);

// ── Strategies ──────────────────────────────────────────────────────────────
export const STRATEGIES={technical:{skill:'technique',favors:null},accurate:{skill:'accuracy',favors:'accuracy'},strong:{skill:'power',favors:'power'},fast:{skill:'speed',favors:'speed'},defensive:{skill:'defense',favors:'resistance'},agile:{skill:'agility',favors:'dodge'}};
export function strategyModifiers(strategy='technical'){
 const favored=STRATEGIES[strategy]?.favors,out={accuracy:0,power:0,speed:0,resistance:0,dodge:0};
 if(favored)for(const k in out)out[k]=k===favored?10:-2;
 return out;
}

// ── Timing ──────────────────────────────────────────────────────────────────
export function actionTime(baseTime,speedBonus){
 const t=speedBonus>=0?baseTime/(1+speedBonus/100):baseTime*(1+Math.abs(speedBonus)/100);
 return Math.max(MIN_ACTION_TIME,t);
}

// ── Mitigation ──────────────────────────────────────────────────────────────
// portions: [{amount, resistancePct, immune}] → whole final damage, rounded once.
export function resolvePortions(portions){
 const total=portions.reduce((s,p)=>s+(p.immune?0:p.amount*Math.max(0,1-(p.resistancePct||0)/100)),0);
 return roundFinal(total);
}
export const statResistancePct=bonus=>bonus/10;
// Infusions: {fire:30, water:20} → {shares:{fire:.3,water:.2}, uninfused:.5}; normalized above 100%.
export function infusionShares(infusions={}){
 const entries=Object.entries(infusions).filter(([,p])=>p>0),sum=entries.reduce((s,[,p])=>s+p,0);
 const scale=sum>0?Math.min(1,100/sum):0,shares={};
 for(const [k,p] of entries)shares[k]=p*scale/100;
 return {shares,uninfused:Math.max(0,100-sum)/100};
}

// ── Attack resolution sequence ──────────────────────────────────────────────
// Order: miss → dodge → block → damage + critical → per-portion mitigation → round once.
export function resolveAttack({missPercent=0,dodgePercent=0,blockPercent=0,canCritical=false,criticalPercent=0,min,max,mitigate=raw=>roundFinal(raw),random=Math.random}){
 if(missPercent>0&&random()*100<missPercent)return {outcome:'miss',damage:0};
 if(dodgePercent>0&&random()*100<dodgePercent)return {outcome:'dodge',damage:0};
 if(blockPercent>0&&random()*100<blockPercent)return {outcome:'block',damage:0};
 const rolled=rollDamage(min,max,random),critical=canCritical&&random()*100<criticalPercent,raw=critical?rolled*3:rolled;
 return {outcome:'hit',critical,rolled,raw,damage:mitigate(raw)};
}

// ── Equipment / spell requirements ──────────────────────────────────────────
export function requirementRatio(pairs){
 const ratios=pairs.filter(([,req])=>req>0).map(([cur,req])=>cur/req);
 return ratios.length?Math.min(...ratios):1;
}
export const requirementEffectiveness=ratio=>clamp(ratio,.1,1);
export const scaleItemBonus=(bonus,effectiveness)=>bonus>0?bonus*effectiveness:bonus;
export const backfirePercent=ratio=>ratio>=1?0:clamp(100*(1-ratio)**2,0,100);
export const backfireBaseDamage=normalMax=>.5*normalMax;

// ── Magic costs ─────────────────────────────────────────────────────────────
export function manaCost(baseCost,techniqueLevel,elementalLevel){
 return Math.max(1,Math.ceil(baseCost/(1+((techniqueLevel-1)+(elementalLevel-1))/200)));
}
export const elementalPowerBonus=weightedLevel=>weightedLevel/20;
export const weightedLevel=(shares,levels)=>Object.entries(shares).reduce((s,[k,share])=>s+share*(levels[k]??1),0);

// ── XP curve ────────────────────────────────────────────────────────────────
export const totalXpForLevel=level=>level<=1?0:12500*(9**(level/100)-1);
export const rawLevel=xp=>100*Math.log(1+Math.max(0,xp)/12500)/Math.log(9);
export const levelForXp=xp=>Math.min(MAX_LEVEL,Math.max(1,Math.floor(rawLevel(xp)+1e-9)));
export function levelProgress(xp){
 const level=levelForXp(xp),floor=totalXpForLevel(level),next=level>=MAX_LEVEL?null:totalXpForLevel(level+1);
 return {level,xp,floor,next,remaining:next==null?0:Math.max(0,next-xp),fraction:next==null?1:(xp-floor)/(next-floor)};
}
export const actionXp=amount=>50+10*Math.max(0,amount);

// Entity multiplier then exclusive level cap with threshold truncation; never overflows.
export function cappedAward(amount,trackXp,{multiplier=1,levelCap=null}={}){
 const modified=Math.max(0,amount*multiplier);
 if(levelCap==null)return modified;
 if(levelForXp(trackXp)>=levelCap)return 0;
 return Math.min(modified,Math.max(0,totalXpForLevel(levelCap)-trackXp));
}
// Split one pool by configured shares; each receiving track capped independently, no redistribution.
export function splitPool(pool,shares,tracks,modifiers){
 const out={};for(const [k,share] of Object.entries(shares))out[k]=cappedAward(pool*share,tracks[k]??0,modifiers);
 return out;
}
// One conversion per action: sum actual awards, carry the remainder in [0,5).
export function convertCoreXp(remainder,actualAwards){
 const total=remainder+actualAwards.reduce((s,x)=>s+x,0),core=Math.floor(total/5);
 return {core,remainder:total-5*core};
}

// ── Resources ───────────────────────────────────────────────────────────────
export const resourceMaximum=attribute=>Math.max(0,attribute*10);
export function resourceMaxima(attributes){
 const out={};for(const [r,a] of Object.entries(RESOURCE_ATTRIBUTES))out[r]=resourceMaximum(attributes[a]??0);
 return out;
}
export function regenMultiplier(a){
 if(a<=0)return 0;if(a<1)return a;if(a<=100)return 1+(a-1)/99;return 2+(a-100)/50;
}
export const REGEN_BASELINE={health:{out:1/6,in:1/12},mana:{out:1,in:.5},stamina:{out:1,in:1},energy:{out:1,in:.5},ki:{out:1,in:.5}};
export const regenRate=(resource,attribute,inCombat)=>REGEN_BASELINE[resource][inCombat?'in':'out']*regenMultiplier(attribute);
export const clampResource=(current,maximum)=>Math.min(current,maximum);
export const displayResource=v=>Math.ceil(v);
// Player hit splats show the drop the player sees on the orb: whole numbers, equal to the hit's damage
// unless it was lethal (then exactly the displayed health that remained, never more).
export const displayedLoss=(before,after)=>Math.max(0,displayResource(before)-displayResource(after));
export const sprintDrainPerSecond=athletics=>2*(1-Math.min(.001*athletics,.5));
export function movementMultiplier(bonusFractions=[],slowFractions=[]){
 const slow=clamp(Math.max(0,...slowFractions),0,.9);
 return (1+bonusFractions.reduce((s,b)=>s+b,0))*(1-slow);
}

// ── Character sheet derivations ─────────────────────────────────────────────
// sheet: {attributes:{...}, skills:{melee:{technique..agility}, ranged, magic}, proficiencies:{unarmed,...}}
const attr=(sheet,k)=>sheet.attributes?.[k]??0;
const skill=(sheet,style,k)=>sheet.skills?.[style]?.[k]??0;
const prof=(sheet,k)=>sheet.proficiencies?.[k]??0;

// Offensive profile for one attack. Weapon proficiency adds +0.2 Power/Accuracy per level.
export function attackBonuses(sheet,{style='melee',strategy='technical',proficiency=null,item={},elementalPower=0}={}){
 const s=strategyModifiers(strategy),p=proficiency?prof(sheet,proficiency)*.2:0;
 return {
  power:skill(sheet,style,'power')+attr(sheet,STYLE_DAMAGE_ATTRIBUTE[style])+p+(item.power||0)+elementalPower+s.power,
  accuracy:skill(sheet,style,'accuracy')+p+(item.accuracy||0)+s.accuracy,
  speed:skill(sheet,style,'speed')+attr(sheet,'celerity')+(item.speed||0)+s.speed,
 };
}
export function attackProfile(sheet,{player=true,base=10,baseInterval=2.55,...options}={}){
 const b=attackBonuses(sheet,options);
 return {...damageBounds(b.power,b.accuracy,{player,base}),interval:actionTime(baseInterval,b.speed),bonuses:b};
}
// Stat-derived resistance bonus against one incoming style (before item/elemental sources).
export function resistanceBonus(sheet,incomingStyle,{strategy='technical',shield=false,armorSlotLevels=[],item=0}={}){
 return skill(sheet,incomingStyle,'defense')*.5+attr(sheet,'toughness')*.5+(shield?prof(sheet,'shield')*.1:0)
  +armorSlotLevels.reduce((s,l)=>s+.02*l,0)+item+strategyModifiers(strategy).resistance;
}
// Player dodge bonus uses only the active offensive style's Agility.
export const dodgeBonus=(sheet,activeStyle,{strategy='technical',item=0}={})=>skill(sheet,activeStyle,'agility')*.1+attr(sheet,'dexterity')*.1+item+strategyModifiers(strategy).dodge;
export const criticalBonus=(sheet,{item=0}={})=>attr(sheet,'luck')*.1+item;

// ── Threat Level ────────────────────────────────────────────────────────────
export function threat(sheet){
 const offense=style=>(['technique','power','accuracy','speed'].reduce((s,k)=>s+skill(sheet,style,k),0)+attr(sheet,STYLE_DAMAGE_ATTRIBUTE[style]))/5;
 const magicSupport=skill(sheet,'magic','technique')/20;
 const candidates={melee:offense('melee')+magicSupport,ranged:offense('ranged')+magicSupport,magic:offense('magic')};
 const avg=k=>STYLES.reduce((s,st)=>s+skill(sheet,st,k),0)/3;
 const defensive=avg('defense')/4+avg('agility')/4;
 const support=THREAT_SUPPORT_ATTRIBUTES.reduce((s,k)=>s+attr(sheet,k),0)/20;
 const offensive=Math.max(...Object.values(candidates)),raw=offensive+defensive+support;
 return {candidates,offensive,defensive,support,raw,level:Math.max(1,Math.floor(raw+1e-9))};
}

// ── Assistance danger ───────────────────────────────────────────────────────
export function hitsToDefeat(currentHp,finalMaxHit){return finalMaxHit>0?Math.ceil(currentHp/finalMaxHit):Infinity;}
export const DANGER_BANDS=[
 {max:1,band:'imminent',message:'RUN! You could be defeated in one hit!',retaliate:false},
 {max:3,band:'flee',message:'Fleeing is highly recommended!',retaliate:false},
 {max:6,band:'caution',message:'Use caution.',retaliate:true},
 {max:Infinity,band:'manageable',message:null,retaliate:true},
];
export const dangerBand=hits=>DANGER_BANDS.find(b=>hits<=b.max);
