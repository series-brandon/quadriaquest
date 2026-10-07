import {STRATEGIES,hitsToDefeat,dangerBand,roundFinal} from './combat-formulas.js';
import {playerAttackProfile,playerDefense} from './combat-profile.js';
import {GEAR,ARMOR_SLOTS} from './equipment.js';
import {SPELLS} from './combat-styles.js';
import {AURAS} from './auras.js';
import {FOODS} from './player-health.js';

// Manual/Auto combat assistance (docs/COMBAT.md). Auto acts only through the same legal choices,
// owned equipment, learned abilities, costs and shared combat resolution as manual play; it may read
// actual enemy data (deliberate design decision) but never moves or flees for the player.
export const TRAINING_GOALS=['technique','power','accuracy','defense','agility','speed'];
const GOAL_STRATEGY=Object.fromEntries(Object.entries(STRATEGIES).map(([id,s])=>[s.skill,id]));
const DEFAULT_ADVANCED={autoEat:true,emergencyPriority:false,allowRiskySpells:false,foodExclusions:[],spellExclusions:[],auraRecovery:.5,auraGrace:3};
const STYLE_OF=item=>GEAR[item]?.style==='ranged'?'ranged':'melee';

export function createAssistance(api){
 const {combat,character,equipment,styles,auras,food,inventory,health,resources}=api;
 let control='auto',pacifist=false,style='melee',goal=null,advanced={...DEFAULT_ADVANCED},manual={strategy:false,spell:false,auras:{}};
 let override=null,warning='',danger=null,exhausted=false,optimizeReport='',clock=0;const grace={};
 const changed=()=>api.changed?.();
 const engaged=()=>combat.engagedEnemy;
 const meanDps=p=>((p.min+p.max)/2*(p.damageScale??1))/p.interval;

 // Final post-mitigation maximum hit from the enemy's actual capabilities and current player defenses.
 function assess(enemy=engaged()){
  if(!enemy||enemy.rules.inert||!(enemy.rules.max>0))return null;
  const current=combat.preview(),d=playerDefense(character,{activeStyle:current.combatStyle,strategy:current.strategy,incomingStyle:enemy.rules.style||'melee',shield:equipment.shield,armor:equipment.armorPieces,bonusResistancePct:auras.resistancePct});
  const maxHit=roundFinal(enemy.rules.max*(enemy.rules.canCritical?3:1)*Math.max(0,1-d.resistancePct/100)),hits=hitsToDefeat(health.value,maxHit);
  return {enemy,maxHit,hits,...dangerBand(hits)};
 }

 // Attacks: Pacifist forbids every manual and automatic attack.
 function canAttack(){if(!pacifist)return true;api.toast?.('Cannot attack while in pacifist mode.');return false;}
 // Retaliation: Manual uses the Auto-Retaliate preference; Auto Balanced withholds it at 1–3 hits unless
 // the player deliberately attacked this target since the last 5-second combat exit.
 function shouldRetaliate(enemy){
  if(pacifist)return false;
  if(control==='manual')return combat.autoRetaliate;
  if(override===enemy)return true;
  return assess(enemy)?.retaliate??true;
 }
 function noteManualAttack(enemy){if(control==='auto')override=enemy;}

 // Strategy: a training goal fixes the strategy (never redirected, even in danger); otherwise defend
 // when 6 or fewer hits remain, else take the highest expected damage per second.
 function chooseStrategy(){
  if(goal)return GOAL_STRATEGY[goal];
  if(danger&&danger.hits<=6)return 'defensive';
  const attack=styles.attack;let best='technical',score=-1;
  for(const id of Object.keys(STRATEGIES)){if(id==='defensive'||id==='agile')continue;const s=meanDps(playerAttackProfile(character,attack,id));if(s>score+1e-9){score=s;best=id;}}
  return best;
 }
 // Spells: learned, not excluded, affordable later; any backfire risk is ineligible unless explicitly allowed.
 function chooseSpell(){
  if(style!=='magic')return null;let best=null,score=-1;
  for(const id of styles.state.learned){if(advanced.spellExclusions.includes(id))continue;const p=playerAttackProfile(character,{...SPELLS[id],spell:id},styles.strategy);
   if(p.backfirePercent>0&&!advanced.allowRiskySpells)continue;const s=meanDps(p);if(s>score){score=s;best=id;}}
  return best;
 }

 // Optimize: within the chosen style, rank owned setups by expected damage per second, then incoming
 // damage reduction, then the current gear. Armor slots take the most effective owned piece.
 function optimize(forStyle=style){
  if(combat.working){optimizeReport='Optimize waits until you are out of a fight.';changed();return optimizeReport;}
  const owned=id=>(inventory[id]||0)>0,slots=equipment.slots,strategy=styles.strategy;
  const mains=forStyle==='magic'?[slots.main]:[null,...Object.keys(GEAR).filter(id=>owned(id)&&GEAR[id].style&&STYLE_OF(id)===forStyle&&GEAR[id].slot==='main')];
  if(forStyle==='ranged'&&mains.length===1){optimizeReport='No ranged weapon owned.';changed();return optimizeReport;}
  const offs=[null,...Object.keys(GEAR).filter(id=>owned(id)&&(GEAR[id].shield||GEAR[id].offHand))];
  let best=null;
  for(const main of mains)for(const off of offs){
   if(GEAR[main]?.twoHanded&&off)continue;if(main&&main===off&&inventory[main]<2)continue;if(forStyle!=='melee'&&GEAR[off]?.style)continue;
   // Same default hands as equipment: one weapon strikes alone; two weapons or two free fists alternate.
   const fist={style:'unarmed',baseInterval:2.55,proficiency:'unarmed'},weapons=[main,off].filter(id=>GEAR[id]?.style);
   const attacks=weapons.length?weapons.map(id=>GEAR[id]):GEAR[off]?.shield?[fist]:[fist,fist];
   // Spells ignore held weapons, so magic setups differ only in survivability.
   const profiles=forStyle==='magic'?[]:attacks.map(a=>playerAttackProfile(character,a,strategy));
   const dps=profiles.length?profiles.reduce((s,p)=>s+(p.min+p.max)/2,0)/profiles.reduce((s,p)=>s+p.interval,0):0;
   const reduction=playerDefense(character,{shield:GEAR[off]?.shield?GEAR[off]:null}).resistancePct;
   const keep=(main===slots.main?1:0)+(off===slots.off?1:0),score=[dps,reduction,keep];
   if(!best||score[0]>best.score[0]+1e-9||Math.abs(score[0]-best.score[0])<1e-9&&(score[1]>best.score[1]+1e-9||Math.abs(score[1]-best.score[1])<1e-9&&score[2]>best.score[2]))best={main,off,score};
  }
  const next={main:best.main,off:best.off};
  for(const slot of ARMOR_SLOTS.concat('head')){
   const pieces=Object.keys(GEAR).filter(id=>owned(id)&&GEAR[id].armor&&GEAR[id].slot===slot);
   if(!pieces.length)continue;
   const value=id=>playerDefense(character,{armor:[{...GEAR[id],item:id}]}).resistancePct;
   next[slot]=pieces.reduce((a,b)=>value(b)>value(a)+1e-9?b:a,pieces.includes(slots[slot])?slots[slot]:pieces[0]);
  }
  const changes=equipment.setSlots(next);
  optimizeReport=changes.length?'Equipped '+changes.map(c=>`${c.name} (${c.slot})`).join(', ')+'.':'No better setup found.';
  if(forStyle==='ranged'&&!(inventory.arrows>0))optimizeReport+=' You have no arrows.';
  changed();return optimizeReport;
 }

 // Auto-eat: before an enemy could defeat you in one hit (≤150% of its max hit). Manual queued actions
 // keep priority unless emergency priority is enabled. With nothing eligible, recommend fleeing.
 function autoEat(){
  if(!advanced.autoEat||!danger||health.value>=health.max)return '';
  if(health.value>1.5*danger.maxHit)return '';
  if(combat.pending&&!advanced.emergencyPriority)return 'Warning! Recommend fleeing!';
  const foods=Object.keys(FOODS).filter(id=>inventory[id]>0&&!advanced.foodExclusions.includes(id));
  if(!foods.length)return 'Warning! Recommend fleeing!';
  if(food.cooldown>0||food.working)return '';
  const id=foods.sort((a,b)=>FOODS[b].healing-FOODS[a].healing)[0];
  food.start(id,true);
  return Math.min(health.max,health.value)<=danger.maxHit?'Warning! Recommend fleeing!':'';
 }

 // Auto auras: Rush while moving in combat or pursuit; Harden in combat at 6 or fewer hits. No automatic
 // activation below 25% Ki; after exhaustion, wait for the recovery threshold. Off after the grace period.
 function autoAuras(dt){
  const ki=resources.ki,inCombat=!!engaged();
  if(exhausted&&ki.value>=advanced.auraRecovery*ki.max)exhausted=false;
  for(const id of Object.keys(AURAS)){
   if(manual.auras[id]||!auras.state.learned.includes(id))continue;
   const useful=id==='rush'?inCombat&&api.moving():inCombat&&!!danger&&danger.hits<=6;
   if(useful){grace[id]=0;if(!auras.isActive(id)&&!exhausted&&ki.value>=.25*ki.max)auras.toggle(id);}
   else if(auras.isActive(id)){grace[id]=(grace[id]||0)+dt;if(grace[id]>=advanced.auraGrace){auras.toggle(id);grace[id]=0;}}
  }
 }

 const api2={
  canAttack,shouldRetaliate,noteManualAttack,optimize,assess,
  update(dt){
   if(!combat.inCombat)override=null;
   // Decisions run at 10 Hz; that is ample for 2.5-second attacks and avoids per-frame profile work.
   clock+=dt;if(clock<.1)return;dt=clock;clock=0;
   danger=assess();let advice='';
   if(control==='auto'&&!pacifist){
    // Persistent selections still assigned to Auto are reevaluated; manual ones are left alone.
    const spell=chooseSpell();if(!manual.spell&&styles.state.selected!==spell&&!combat.working)styles.select(spell);
    if(!manual.strategy){const s=chooseStrategy();if(styles.strategy!==s)styles.setStrategy(s);}
   }
   if(control==='auto'){advice=autoEat();autoAuras(dt);}
   // Advisory only: warnings never stop a fight the player chose or move the player.
   warning=advice||danger?.message||'';
  },
  auraExhausted(){exhausted=true;},
  // Persistent manual selections keep manual control until returned to Auto.
  setStrategyManually(id){if(control==='auto')manual.strategy=true;styles.setStrategy(id);changed();},
  selectSpellManually(id){if(control==='auto')manual.spell=true;styles.select(id);changed();},
  toggleAuraManually(id){if(control==='auto')manual.auras[id]=true;const r=auras.toggle(id);changed();return r;},
  returnToAuto(kind,id){if(kind==='aura')delete manual.auras[id];else manual[kind]=false;changed();},
  setControl(next){if(next!==control){control=next;changed();}},
  setPacifist(on){pacifist=!!on;if(pacifist)combat.stopAttacking();changed();},
  // A player-selected style change runs Optimize for that style (no extra confirmation).
  setStyle(next){if(next===style)return optimizeReport;style=next;manual.spell=false;const report=optimize(next);changed();return report;},
  setGoal(next){goal=TRAINING_GOALS.includes(next)?next:null;changed();},
  setAdvanced(patch){advanced={...advanced,...patch};changed();},
  get warning(){return warning;},get danger(){return danger;},get optimizeReport(){return optimizeReport;},
  get modeLabel(){return pacifist?'Pacifist':control==='auto'?'Auto · Balanced':'Manual · Auto-Retaliate '+(combat.autoRetaliate?'On':'Off');},
  get settings(){return {control,pacifist,style,goal,advanced:{...advanced},manual:{strategy:manual.strategy,spell:manual.spell,auras:{...manual.auras}},override:override?.kind||null};},
  reset(){control='auto';pacifist=false;style='melee';goal=null;advanced={...DEFAULT_ADVANCED};manual={strategy:false,spell:false,auras:{}};override=null;warning='';exhausted=false;optimizeReport='';changed();},
 };
 return api2;
}
