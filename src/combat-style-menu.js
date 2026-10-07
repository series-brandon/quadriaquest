import {SPELLS} from './combat-styles.js';
import {STRATEGIES} from './combat-formulas.js';
import './utility-menu.css';
const STRATEGY_HELP={technical:'No modifiers',accurate:'+10 Accuracy',strong:'+10 Power',fast:'+10 Speed',defensive:'+10 Resistance',agile:'+10 Dodge'};
const title=s=>s[0].toUpperCase()+s.slice(1);
export function createCombatStyleMenu({styles,combat,busy=()=>false,beforeOpen=()=>{}}){
 const dialog=document.createElement('section');dialog.id='combat-panel';dialog.hidden=true;dialog.className='utility-menu';dialog.setAttribute('aria-label','Combat style');dialog.innerHTML='<div class="utility-heading"><h2>Combat style</h2><button data-close aria-label="Close combat styles">×</button></div><p>Choose your equipped weapon, bare hands, or a learned spell. Change style outside combat.</p><button type="button" data-auto-retaliate aria-pressed="true">Auto-Retaliate: On</button><p>Automatically fight back when attacked. Eating pauses your attacks while you heal; enemies can still hit you.</p><div class="utility-options" data-styles></div><h3>Strategy</h3><p>Your strategy decides which combat skill your attacks train. Changes apply from your next attack, even mid-fight.</p><div class="utility-options" data-strategies></div><p class="utility-status" role="status"></p>';document.getElementById('game-menus').append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.hidden=true;
 const retaliation=dialog.querySelector('[data-auto-retaliate]');retaliation.onclick=()=>{combat.setAutoRetaliate(!combat.autoRetaliate);render();};
 let previous='';
 function summary(){
  const p=combat.preview(),name=p.spell?p.name:p.item?p.name:'Bare hands';
  return `${name} · ${p.min}–${p.max} damage every ${+p.interval.toFixed(2)}s · trains ${title(p.combatStyle)} ${title(STRATEGIES[p.strategy].skill)}${p.proficiencyTrack?' and '+title(p.proficiency)+' proficiency':''}${p.elements?' and '+Object.keys(p.elements).map(title).join('/')+' proficiency':''}${p.manaCost?` · ${p.manaCost} Mana per cast`:''}${p.range>1?` · ${p.range} tiles`:''}${p.effectiveness<1?` · ${Math.round(p.effectiveness*100)}% effective (requirements not met)`:''}`;
 }
 function render(){const disabled=busy(),text=summary(),signature=JSON.stringify([styles.state,combat.autoRetaliate,disabled,text]);if(signature===previous)return;previous=signature;retaliation.textContent='Auto-Retaliate: '+(combat.autoRetaliate?'On':'Off');retaliation.setAttribute('aria-pressed',String(combat.autoRetaliate));
  const root=dialog.querySelector('[data-styles]');root.replaceChildren();for(const [id,name] of [[null,'Weapon / bare hands'],...Object.entries(SPELLS).map(([id,s])=>[id,s.name])]){const b=document.createElement('button');b.textContent=name+(id&&!styles.state.learned.includes(id)?' · Not learned':'');b.disabled=disabled||id&&!styles.state.learned.includes(id);b.setAttribute('aria-pressed',String(styles.state.selected===id));b.onclick=()=>{styles.select(id);render();};root.append(b);}
  const strategies=dialog.querySelector('[data-strategies]');strategies.replaceChildren();for(const [id,def] of Object.entries(STRATEGIES)){const b=document.createElement('button');b.textContent=`${title(id)} · ${STRATEGY_HELP[id]} → ${title(def.skill)}`;b.setAttribute('aria-pressed',String(styles.strategy===id));b.onclick=()=>{styles.setStrategy(id);render();};strategies.append(b);}
  dialog.querySelector('[role=status]').textContent=text;}
 const button=document.createElement('button');button.id='open-combat-styles';button.textContent='Combat';document.getElementById('game-menu-bar').append(button);button.onclick=()=>{beforeOpen();render();dialog.hidden=false;};return {refresh:render,open(){beforeOpen();render();dialog.hidden=false;},close(){dialog.hidden=true;}};
}
