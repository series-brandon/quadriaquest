import {SPELLS,ABILITIES} from './combat-styles.js';
import {AURAS} from './auras.js';
import {STRATEGIES,backfireBaseDamage,resolvePortions} from './combat-formulas.js';
import {playerDefense} from './combat-profile.js';
import {TRAINING_GOALS} from './assistance.js';
import {FOODS} from './player-health.js';
import {ITEMS} from './items.js';
import './utility-menu.css';
const STRATEGY_HELP={technical:'No modifiers',accurate:'+10 Accuracy',strong:'+10 Power',fast:'+10 Speed',defensive:'+10 Resistance',agile:'+10 Dodge'};
const HAND_LABEL={main:'Main hand only',off:'Off hand only',alternate:'Alternate hands'};
const title=s=>s[0].toUpperCase()+s.slice(1);
const button=(text,{pressed,disabled,onclick}={})=>{const b=document.createElement('button');b.type='button';b.textContent=text;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));b.disabled=!!disabled;b.onclick=onclick;return b;};

// Combat controls: Manual exposes the full configuration; Auto exposes only Mode, Class, Training goal and
// Optimize, with detailed preferences under Advanced settings. Pacifist works in both.
export function createCombatStyleMenu({styles,combat,panels,auras=null,assistance=null,equipment=null,character=null,health=null,busy=()=>false}){
 const dialog=document.createElement('section');dialog.id='combat-panel';dialog.className='utility-menu';dialog.setAttribute('aria-label','Combat');
 dialog.innerHTML=`<div class="utility-heading"><h2>Combat</h2><button data-close aria-label="Close combat">×</button></div>
 <div class="utility-options" role="group" aria-label="Combat control" data-control></div><p data-mode-help></p>
 <section data-auto><h3>Class</h3><div class="utility-options" data-class></div>
  <label class="utility-field">Train specific skill? <select data-goal><option value="">No</option>${TRAINING_GOALS.map(g=>`<option value="${g}">${title(g)}</option>`).join('')}</select></label>
  <button type="button" data-optimize>Optimize Equipment</button><p class="utility-status" data-optimize-status role="status"></p>
  <p data-auto-summary></p><div class="utility-options" data-overrides></div>
  <details data-advanced><summary>Advanced settings</summary><div data-advanced-body></div></details></section>
 <section data-manual><button type="button" data-auto-retaliate aria-pressed="true">Auto-Retaliate: On</button><p>Automatically fight back when attacked.</p>
  <h3>Attack</h3><div class="utility-options" data-styles></div><h3>Attack hands</h3><div class="utility-options" data-hands></div><div class="utility-options" data-damage-types></div></section>
 <h3>Strategy</h3><p>Your strategy decides which combat skill your attacks train. Changes apply from your next attack, even mid-fight.</p><div class="utility-options" data-strategies></div>
 <h3>Abilities</h3><p>Abilities spend Energy when the attack lands or releases. Queue one for your next eligible attack; it never repeats on its own.</p><div class="utility-options" data-abilities></div>
 <h3>Auras</h3><p>Auras stack and drain Ki every second. Turning one on costs one second of upkeep. At zero Ki, all auras fade; Ki recovers only while every aura is off.</p><div class="utility-options" data-auras></div>
 <h3>Quick slots</h3><p>Your HUD's spell button casts your quick spell on your next attack (or opens your next fight with it). The aura button switches every quick aura on or off together.</p><div class="utility-options" role="group" aria-label="Quick spell" data-quick-spell></div><div class="utility-options" role="group" aria-label="Quick auras" data-quick-auras></div>
 <p class="utility-status" role="status" data-summary></p><p class="utility-status" data-aura-status role="status"></p>
 <p>Eating heals at once and restarts your current attack; a second item waits for the 2-second cooldown.</p>`;
 document.getElementById('game-menus').append(dialog);
 const $=sel=>dialog.querySelector(sel);let previous='';
 $('[data-close]').addEventListener('click',()=>panels.dismiss());
 $('[data-goal]').onchange=e=>{assistance.setGoal(e.target.value||null);render();};
 $('[data-optimize]').onclick=()=>{assistance.optimize();render();};
 $('[data-auto-retaliate]').onclick=()=>{combat.setAutoRetaliate(!combat.autoRetaliate);render();};

 function summary(){
  const p=combat.preview(),name=p.spell?p.name:p.item?p.name:'Bare hands';
  let text=`${name}${p.hand&&!p.spell?` (${p.hand} hand${p.damageType?', '+p.damageType:''})`:''} · ${p.min}–${p.max} damage every ${+p.interval.toFixed(2)}s · trains ${title(p.combatStyle)} ${title(STRATEGIES[p.strategy].skill)}${p.proficiencyTrack?' and '+title(p.proficiency)+' proficiency':''}${p.elements?' and '+Object.keys(p.elements).map(title).join('/')+' proficiency':''}${p.manaCost?` · ${p.manaCost} Mana per cast`:''}${p.range>1?` · ${p.range} tiles`:''}${p.effectiveness<1?` · ${Math.round(p.effectiveness*100)}% effective (requirements not met)`:''}`;
  // Adverse randomness is explicit: under-level casting shows its backfire chance and potential lethality.
  if(p.backfirePercent>0&&character){const d=playerDefense(character,{incomingStyle:'magic',shield:equipment?.shield,armor:equipment?.armorPieces||[],bonusResistancePct:auras?.resistancePct||0}),dmg=resolvePortions(Object.values(p.elements||{none:1}).map(share=>({amount:backfireBaseDamage(p.max)*share,resistancePct:d.resistancePct})));
   text+=` · ⚠ ${+p.backfirePercent.toFixed(2)}% backfire chance: ${dmg} damage to you${health&&dmg>=health.value?' — a backfire could defeat you':''}`;}
  return text;
 }
 function render(){
  const settings=assistance?.settings,auto=!!settings&&settings.control!=='manual',disabled=busy(),text=summary();
  const signature=JSON.stringify([styles.state,combat.autoRetaliate,disabled,text,combat.pending,combat.committedAbility,auras?.state,settings,assistance?.optimizeReport,equipment?.attackHands,equipment?.eligibleHands(),equipment?.damageTypeFor('main'),equipment?.damageTypeFor('off')]);
  if(signature===previous)return;previous=signature;
  $('[data-control]').hidden=!assistance;
  if(assistance)$('[data-control]').replaceChildren(
   button('Auto',{pressed:auto,onclick:()=>{assistance.setControl('auto');render();}}),
   button('Manual',{pressed:!auto,onclick:()=>{assistance.setControl('manual');render();}}),
   button('Pacifist: '+(settings.pacifist?'On':'Off'),{pressed:settings.pacifist,onclick:()=>{assistance.setPacifist(!settings.pacifist);render();}}));
  $('[data-mode-help]').textContent=settings?.pacifist?'Pacifist: you will not attack, manually or automatically. Defensive help (eating, auras, warnings) still works. Turn it off to attack.':auto?'Auto · Balanced: picks strategies, spells and auras for you, eats before a one-hit defeat, and only fights back automatically when the enemy is manageable. Warnings are advice; you always control movement.':'Manual: every choice is yours. Auto-Retaliate fights back whenever you are attacked.';
  $('[data-auto]').hidden=!auto;$('[data-manual]').hidden=auto;
  if(auto){
   $('[data-class]').replaceChildren(...['melee','ranged','magic'].map(s=>button(title(s),{pressed:settings.style===s,onclick:()=>{assistance.setStyle(s);render();}})));
   $('[data-goal]').value=settings.goal||'';$('[data-optimize-status]').textContent=assistance.optimizeReport;
   const auraOn=auras?.state.active.map(id=>AURAS[id].name).join(', ')||'none';
   $('[data-auto-summary]').textContent=`Auto chose: ${title(styles.strategy)} strategy · ${styles.state.selected?SPELLS[styles.state.selected].name:'weapon / bare hands'} · auras on: ${auraOn}.`;
   const overrides=$('[data-overrides]');overrides.replaceChildren();
   if(settings.manual.strategy)overrides.append(button('Strategy is manual · Return to Auto',{onclick:()=>{assistance.returnToAuto('strategy');render();}}));
   if(settings.manual.spell)overrides.append(button('Attack choice is manual · Return to Auto',{onclick:()=>{assistance.returnToAuto('spell');render();}}));
   for(const id of Object.keys(settings.manual.auras))overrides.append(button(`${AURAS[id].name} is manual · Return to Auto`,{onclick:()=>{assistance.returnToAuto('aura',id);render();}}));
   renderAdvanced(settings.advanced);
  }else{
   $('[data-auto-retaliate]').textContent='Auto-Retaliate: '+(combat.autoRetaliate?'On':'Off');$('[data-auto-retaliate]').setAttribute('aria-pressed',String(combat.autoRetaliate));
   $('[data-styles]').replaceChildren(...[[null,'Weapon / bare hands'],...Object.entries(SPELLS).map(([id,s])=>[id,s.name])].map(([id,name])=>button(name+(id&&!styles.state.learned.includes(id)?' · Not learned':''),{pressed:styles.state.selected===id,disabled:disabled||id&&!styles.state.learned.includes(id),onclick:()=>{assistance?assistance.selectSpellManually(id):styles.select(id);render();}})));
   if(equipment){
    const eligible=equipment.eligibleHands();
    $('[data-hands]').replaceChildren(...['main','off','alternate'].filter(h=>h==='alternate'?eligible.length>1:eligible.includes(h)).map(h=>button(HAND_LABEL[h],{pressed:equipment.attackHands===h,onclick:()=>{equipment.setAttackHands(h);render();}})));
    const types=$('[data-damage-types]');types.replaceChildren();
    for(const h of eligible){const a=equipment.handAttack(h);if((a.damageTypes||[]).length<2)continue;for(const t of a.damageTypes)types.append(button(`${title(h)} hand: ${title(t)}`,{pressed:a.damageType===t,onclick:()=>{equipment.setDamageType(h,t);render();}}));}
   }
  }
  $('[data-strategies]').replaceChildren(...Object.entries(STRATEGIES).map(([id,def])=>button(`${title(id)} · ${STRATEGY_HELP[id]} → ${title(def.skill)}`,{pressed:styles.strategy===id,onclick:()=>{assistance?assistance.setStrategyManually(id):styles.setStrategy(id);render();}})));
  $('[data-abilities]').replaceChildren(...Object.entries(ABILITIES).map(([id,a])=>{const known=styles.knowsAbility(id),queued=combat.pending===id;const b=button(`${a.name} · ${a.energy} Energy`+(!known?' · Not learned':queued?' · Queued (press to withdraw)':combat.committedAbility===a.name?' · Winding up':''),{pressed:queued,disabled:!known,onclick:()=>{combat.queue(id);render();}});b.title=a.description;return b;}));
  $('[data-auras]').replaceChildren(...Object.entries(AURAS).map(([id,a])=>{const known=!!auras?.state.learned.includes(id),on=!!auras?.isActive(id);return button(`${a.name} · ${a.description} · ${a.upkeep} Ki/s`+(!known?' · Not learned':on?' · On':''),{pressed:on,disabled:!known,onclick:()=>{const result=assistance?assistance.toggleAuraManually(id):auras.toggle(id);$('[data-aura-status]').textContent=result===true?'':result;render();}});}));
  // Quick slots configure the HUD action row in both Auto and Manual (docs/COMBAT.md, Quick slots).
  const learnedSpells=styles.state.learned;
  $('[data-quick-spell]').replaceChildren(...[[null,'No quick spell'],...learnedSpells.map(id=>[id,`Quick spell: ${SPELLS[id].name}`])].map(([id,name])=>button(name,{pressed:styles.quickSpell===id,onclick:()=>{styles.setQuickSpell(id);render();}})));
  $('[data-quick-auras]').replaceChildren(...(auras?.state.learned||[]).map(id=>button(`Quick toggle: ${AURAS[id].name}`,{pressed:auras.isQuick(id),onclick:()=>{auras.setQuick(id,!auras.isQuick(id));render();}})));
  $('[data-summary]').textContent=(settings?.pacifist?'Pacifist · ':'')+text;
 }
 // Advanced Auto preferences have sensible defaults and are never required before Auto works.
 function renderAdvanced(a){
  const body=$('[data-advanced-body]'),signature=JSON.stringify(a);if(body.dataset.signature===signature)return;body.dataset.signature=signature;
  const field=(...children)=>{const l=document.createElement('label');l.className='utility-field';l.append(...children);return l;};
  const check=(key,label)=>{const c=document.createElement('input');c.type='checkbox';c.checked=!!a[key];c.onchange=()=>assistance.setAdvanced({[key]:c.checked});return field(c,' '+label);};
  const exclusions=(key,ids,name)=>ids.map(id=>{const c=document.createElement('input');c.type='checkbox';c.checked=a[key].includes(id);c.onchange=()=>assistance.setAdvanced({[key]:c.checked?[...a[key],id]:a[key].filter(x=>x!==id)});return field(c,` Never auto-use ${name(id)}`);});
  const number=(key,label,scale,min,max)=>{const n=document.createElement('input');n.type='number';n.min=min;n.max=max;n.value=Math.round(a[key]*scale);n.onchange=()=>{const v=Number(n.value);if(Number.isFinite(v))assistance.setAdvanced({[key]:Math.min(max,Math.max(min,v))/scale});};return field(label+' ',n);};
  body.replaceChildren(check('autoEat','Auto-eat before a one-hit defeat'),check('emergencyPriority','Emergency healing may interrupt my queued actions'),check('allowRiskySpells','Allow Auto to cast spells with backfire risk'),
   ...exclusions('foodExclusions',Object.keys(FOODS),id=>ITEMS[id]?.name||id),...exclusions('spellExclusions',Object.keys(SPELLS),id=>SPELLS[id].name),
   number('auraRecovery','Restart auto auras after exhaustion at Ki %',100,1,100),number('auraGrace','Aura grace period (seconds)',1,0,30));
 }
 const open=()=>{panels.open('combat');render();};
 panels.register({id:'combat',tab:'open-combat-styles',label:'Combat',icon:'Combat',order:50,primary:true,element:dialog,select:open});
 return {refresh:render,open};
}
