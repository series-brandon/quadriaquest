import {STRATEGIES,hitsToDefeat,dangerBand,roundFinal} from './combat-formulas.js';
import {signal} from './reactive.js';
import {playerAttackProfile,playerDefense} from './combat-profile.js';
import {GEAR,ARMOR_SLOTS} from './equipment.js';
import {SPELLS,ABILITIES} from './combat-styles.js';
import {AURAS} from './auras.js';
import {FOODS} from './player-health.js';

// Combat assistance driven by modes and policies (docs/COMBAT.md). Auto acts only through the same legal choices,
// owned equipment, learned abilities, costs and shared combat resolution as manual play; it may read
// actual enemy data (deliberate design decision) but never moves or flees for the player.
export const TRAINING_GOALS=['technique','power','accuracy','defense','agility','speed'];
const GOAL_STRATEGY=Object.fromEntries(Object.entries(STRATEGIES).map(([id,s])=>[s.skill,id]));
// Modes are presets of policies (docs/COMBAT.md, Modes, policies and overrides). Custom keeps its own copy.
export const MODES=['simple','pacifist','expert','custom'];
const BASE={attacks:'allowed',strategy:'auto',attack:'auto',abilities:'auto',auras:'auto',autoEat:true,emergencyPriority:false,allowRiskySpells:false,auraRecovery:.5,auraGrace:3,showEnergy:false,showKi:false};
export const POLICIES=Object.keys(BASE);
export const PRESETS={
 simple:BASE,
 pacifist:{...BASE,attacks:'prevented',abilities:'manual'},
 expert:{...BASE,strategy:'manual',attack:'manual',abilities:'manual',auras:'manual',autoEat:false,showEnergy:true,showKi:true},
};
// Retaliate is a quick setting: picking a preset applies its default; it never changes the mode.
const PRESET_RETALIATE={simple:'smart',pacifist:'never',expert:'always'};
export const RETALIATE=['smart','always','never'];
const OVERRIDE_KINDS=['strategy','attack','auras'];
// One-time overrides in this many consecutive fights earn a single tip to make it a Manual policy.
const TIP_AFTER=3;
const STYLE_OF=item=>GEAR[item]?.style==='ranged'?'ranged':'melee';

export function createAssistance(api){
 const {combat,character,equipment,styles,auras,food,inventory,health,resources}=api;
 let mode='simple',custom={...BASE},retaliate='smart',style='melee',goal=null;
 let permissions={food:[],spell:[],aura:[]};
 // One-time overrides of Auto policies; they end with the fight they belong to.
 let overrides={strategy:false,attack:false,auras:{}},overrideFight=false,wasInCombat=false;
 const streak={strategy:0,attack:0,auras:0},tipped=new Set();
 const policies=()=>mode==='custom'?custom:PRESETS[mode];
 const prevented=()=>policies().attacks==='prevented';
 const allowed=(kind,id)=>!permissions[kind].includes(id);
 const anyOverride=()=>overrides.strategy||overrides.attack||Object.keys(overrides.auras).length>0;
 // Signal-backed so the HUD warning chip follows advice without polling.
 const warning=signal('');
 let override=null,danger=null,exhausted=false,optimizeReport='',clock=0;const grace={};
 // `revision` changes with every settings change for UI bindings.
 const revision=signal(0),changed=()=>{revision.value++;api.changed?.();};
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
 function canAttack(){if(!prevented())return true;api.toast?.('Attacks are prevented in this mode.');return false;}
 // Retaliation: Manual uses the Auto-Retaliate preference; Auto Balanced withholds it at 1–3 hits unless
 // the player deliberately attacked this target since the last 5-second combat exit.
 function shouldRetaliate(enemy){
  if(prevented()||retaliate==='never')return false;
  if(retaliate==='always'||override===enemy)return true;
  return assess(enemy)?.retaliate??true;
 }
 function noteManualAttack(enemy){if(retaliate==='smart')override=enemy;}

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
  for(const id of styles.state.learned){if(!allowed('spell',id))continue;const p=playerAttackProfile(character,{...SPELLS[id],spell:id},styles.strategy);
   if(p.backfirePercent>0&&!policies().allowRiskySpells)continue;const s=meanDps(p);if(s>score){score=s;best=id;}}
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
  if(!danger||health.value>=health.max)return '';
  if(health.value>1.5*danger.maxHit)return '';
  if(combat.pendingManual&&!policies().emergencyPriority)return 'Warning! Recommend fleeing!';
  const foods=Object.keys(FOODS).filter(id=>inventory[id]>0&&allowed('food',id));
  if(!foods.length)return 'Warning! Recommend fleeing!';
  if(food.cooldown>0||food.working)return '';
  const id=foods.sort((a,b)=>FOODS[b].healing-FOODS[a].healing)[0];
  food.start(id,true);
  return Math.min(health.max,health.value)<=danger.maxHit?'Warning! Recommend fleeing!':'';
 }

 // Auto abilities: during a fight, queue a learned ability whenever the current attack can carry it and its
 // cost is covered, through the same single queue, costs and commit rules as a manual press. Never with a
 // request already pending, and never one that would redirect XP away from the chosen training goal.
 function autoAbilities(){
  if(!combat.fighting||combat.pending||combat.committedAbility)return;
  const attack=combat.preview();
  for(const [id,ability] of Object.entries(ABILITIES)){
   if(!styles.knowsAbility(id)||goal&&STRATEGIES[ability.strategy].skill!==goal)continue;
   if(attack.spell||attack.combatStyle!==ability.style||!(resources.energy.value>=ability.energy))continue;
   combat.queue(id,{auto:true});return;
  }
 }

 // Auto auras: Rush while moving in combat or pursuit; Harden in combat at 6 or fewer hits. No automatic
 // activation below 25% Ki; after exhaustion, wait for the recovery threshold. Off after the grace period.
 function autoAuras(dt){
  const ki=resources.ki,inCombat=!!engaged();
  if(exhausted&&ki.value>=policies().auraRecovery*ki.max)exhausted=false;
  for(const id of Object.keys(AURAS)){
   if(overrides.auras[id]||!allowed('aura',id)||!auras.state.learned.includes(id))continue;
   const useful=id==='rush'?inCombat&&api.moving():inCombat&&!!danger&&danger.hits<=6;
   if(useful){grace[id]=0;if(!auras.isActive(id)&&!exhausted&&ki.value>=.25*ki.max)auras.toggle(id);}
   else if(auras.isActive(id)){grace[id]=(grace[id]||0)+dt;if(grace[id]>=policies().auraGrace){auras.toggle(id);grace[id]=0;}}
  }
 }

 // Overrides end with their fight. Track consecutive fights per kind for the one-time tip.
 function trackFights(){
  const inCombat=combat.inCombat;
  if(inCombat&&anyOverride())overrideFight=true;
  if(wasInCombat&&!inCombat){
   for(const kind of OVERRIDE_KINDS){
    const used=kind==='auras'?Object.keys(overrides.auras).length>0:overrides[kind];
    streak[kind]=used?streak[kind]+1:0;
    if(streak[kind]>=TIP_AFTER&&!tipped.has(kind)){tipped.add(kind);api.tip?.(`Tip: set ${({strategy:'Strategy',attack:'Attack choice',auras:'Auras'})[kind]} to Manual in Mode settings to always choose it yourself.`);}
   }
   if(overrideFight){overrides={strategy:false,attack:false,auras:{}};overrideFight=false;changed();}
  }
  wasInCombat=inCombat;
 }
 function markOverride(kind,id){
  if(kind==='auras')overrides.auras[id]=true;else overrides[kind]=true;
  // Made outside combat, it lasts through the next fight.
  overrideFight=combat.inCombat;
 }
 function applyRetaliate(){combat.setAutoRetaliate?.(retaliate!=='never');}
 const api2={
  revision,
  canAttack,shouldRetaliate,noteManualAttack,optimize,assess,
  update(dt){
   if(!combat.inCombat)override=null;
   trackFights();
   // Decisions run at 10 Hz; that is ample for 2.5-second attacks and avoids per-frame profile work.
   clock+=dt;if(clock<.1)return;dt=clock;clock=0;
   danger=assess();let advice='';
   const p=policies();
   // Policies left to Auto are reevaluated; overridden or Manual ones are left alone.
   if(p.attacks==='allowed'){
    if(p.attack==='auto'&&!overrides.attack){const spell=chooseSpell();if(styles.state.selected!==spell&&!combat.working)styles.select(spell);}
    if(p.strategy==='auto'&&!overrides.strategy){const s=chooseStrategy();if(styles.strategy!==s)styles.setStrategy(s);}
   }else if(p.strategy==='auto'&&!overrides.strategy&&styles.strategy!=='defensive')styles.setStrategy('defensive');
   if(p.autoEat)advice=autoEat();
   if(p.auras==='auto')autoAuras(dt);
   if(p.attacks==='allowed'&&p.abilities==='auto')autoAbilities();
   // Advisory only: warnings never stop a fight the player chose or move the player.
   warning.value=advice||danger?.message||'';
  },
  auraExhausted(){exhausted=true;},
  // The player's own choice on an Auto policy is a one-time override (until the fight ends).
  setStrategyManually(id){if(policies().strategy==='auto')markOverride('strategy');styles.setStrategy(id);changed();},
  selectSpellManually(id){if(policies().attack==='auto')markOverride('attack');const ok=styles.select(id);changed();return ok;},
  toggleAuraManually(id){if(policies().auras==='auto')markOverride('auras',id);const r=auras.toggle(id);changed();return r;},
  // Ends every one-time override at once.
  returnToAuto(){overrides={strategy:false,attack:false,auras:{}};overrideFight=false;changed();},
  // Attacks: Prevented also means enemies don't become aggressive (combat reads this; docs/COMBAT.md).
  get attacksPrevented(){return prevented();},
  setMode(next){
   if(!MODES.includes(next))return false;
   mode=next;if(PRESET_RETALIATE[next])retaliate=PRESET_RETALIATE[next];
   overrides={strategy:false,attack:false,auras:{}};overrideFight=false;
   if(prevented())combat.stopAttacking();applyRetaliate();changed();return true;
  },
  // Editing a policy from a preset copies it, with the change, into Custom.
  setPolicy(key,value){
   if(!POLICIES.includes(key))return false;
   const next={...policies(),[key]:value};
   if(mode!=='custom')api.tip?.('Switched to Custom mode. Your other modes are unchanged.');
   custom=next;mode='custom';
   if(prevented())combat.stopAttacking();changed();return true;
  },
  setRetaliate(next){if(!RETALIATE.includes(next))return false;retaliate=next;applyRetaliate();changed();return true;},
  // Per-item permissions: kind is 'food', 'spell' or 'aura'.
  setPermission(kind,id,on){if(!permissions[kind])return false;const list=permissions[kind].filter(x=>x!==id);permissions={...permissions,[kind]:on?list:[...list,id]};changed();return true;},
  allowed,
  // A player-selected style change runs Optimize for that style (no extra confirmation).
  setStyle(next){if(next===style)return optimizeReport;style=next;overrides.attack=false;const report=optimize(next);changed();return report;},
  setGoal(next){goal=TRAINING_GOALS.includes(next)?next:null;changed();},
  get warning(){return warning.value;},get danger(){return danger;},get optimizeReport(){return optimizeReport;},
  get settings(){return {mode,policies:{...policies()},custom:{...custom},retaliate,style,goal,
   permissions:{food:[...permissions.food],spell:[...permissions.spell],aura:[...permissions.aura]},
   overrides:{strategy:overrides.strategy,attack:overrides.attack,auras:{...overrides.auras}},override:override?.kind||null};},
  reset(){mode='simple';custom={...BASE};retaliate='smart';style='melee';goal=null;permissions={food:[],spell:[],aura:[]};
   overrides={strategy:false,attack:false,auras:{}};overrideFight=false;wasInCombat=false;tipped.clear();for(const k of OVERRIDE_KINDS)streak[k]=0;
   override=null;warning.value='';exhausted=false;optimizeReport='';applyRetaliate();changed();},
 };
 return api2;
}
