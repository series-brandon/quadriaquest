import {STRATEGIES} from './combat-formulas.js';

export const SPELLS={energyStrike:{name:'Energy Strike',style:'magic',base:20,castTime:3,range:6,mana:4,elements:{energy:1},requirements:{'magic.technique':1}}};
// Abilities enhance one eligible attack; Energy is spent at strike/release under the shared cost rule.
export const ABILITIES={strongStrike:{name:'Strong Strike',energy:50,style:'melee',strategy:'strong',description:'One melee attack with Strong strategy, double maximum damage and at least half that maximum.'}};
export function createCombatStyles({equipment,busy=()=>false,changed=()=>{}}){
 const learned=new Set(),abilities=new Set();let selected=null,strategy='technical';
 return {learn(id){if(!SPELLS[id])return false;const fresh=!learned.has(id);learned.add(id);changed();return fresh;},
  select(id){if(busy()||id!==null&&!learned.has(id))return false;selected=id;changed();return true;},
  learnAbility(id){if(!ABILITIES[id]||abilities.has(id))return false;abilities.add(id);changed();return true;},
  knowsAbility:id=>abilities.has(id),
  // Strategy may change during combat; it applies from the next committed attack.
  setStrategy(id){if(!STRATEGIES[id])return false;strategy=id;changed();return true;},
  get strategy(){return strategy;},
  get attack(){return selected?{...SPELLS[selected],spell:selected,item:null}:equipment.attack;},
  get state(){return {selected,learned:[...learned],strategy,abilities:[...abilities]};},reset(){selected=null;strategy='technical';learned.clear();abilities.clear();changed();}
 };
}
