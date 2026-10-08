import {STRATEGIES} from './combat-formulas.js';
import {signal} from './reactive.js';

export const SPELLS={energyStrike:{name:'Energy Strike',style:'magic',base:20,castTime:3,range:6,mana:4,elements:{energy:1},requirements:{'magic.technique':1}}};
// Abilities enhance one eligible attack; Energy is spent at strike/release under the shared cost rule.
export const ABILITIES={strongStrike:{name:'Strong Strike',energy:50,style:'melee',strategy:'strong',description:'One melee attack with Strong strategy, double maximum damage and at least half that maximum.'}};
export function createCombatStyles({equipment,busy=()=>false,changed:notify=()=>{}}){
 // `revision` changes with every selection/learning change for UI bindings.
 const revision=signal(0),changed=()=>{revision.value++;notify();};
 const learned=new Set(),abilities=new Set();let selected=null,strategy='technical',quickSpell=null;
 return {revision,learn(id){if(!SPELLS[id])return false;const fresh=!learned.has(id);learned.add(id);changed();return fresh;},
  select(id){if(busy()||id!==null&&!learned.has(id))return false;selected=id;changed();return true;},
  knowsSpell:id=>learned.has(id),
  // The HUD quick spell (docs/COMBAT.md, Quick slots); null clears it.
  setQuickSpell(id){if(id!==null&&!learned.has(id))return false;quickSpell=id;changed();return true;},
  get quickSpell(){return quickSpell;},
  learnAbility(id){if(!ABILITIES[id]||abilities.has(id))return false;abilities.add(id);changed();return true;},
  knowsAbility:id=>abilities.has(id),
  // Strategy may change during combat; it applies from the next committed attack.
  setStrategy(id){if(!STRATEGIES[id])return false;strategy=id;changed();return true;},
  get strategy(){return strategy;},
  get attack(){return selected?{...SPELLS[selected],spell:selected,item:null}:equipment.attack;},
  get state(){return {selected,learned:[...learned],strategy,abilities:[...abilities],quickSpell};},reset(){selected=null;strategy='technical';quickSpell=null;learned.clear();abilities.clear();changed();}
 };
}
