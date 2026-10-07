import {STRATEGIES} from './combat-formulas.js';

export const SPELLS={energyStrike:{name:'Energy Strike',style:'magic',base:20,castTime:3,range:6,mana:4,elements:{energy:1},requirements:{'magic.technique':1}}};
export function createCombatStyles({equipment,busy=()=>false,changed=()=>{}}){
 const learned=new Set();let selected=null,strategy='technical';
 return {learn(id){if(!SPELLS[id])return false;const fresh=!learned.has(id);learned.add(id);changed();return fresh;},
  select(id){if(busy()||id!==null&&!learned.has(id))return false;selected=id;changed();return true;},
  // Strategy may change during combat; it applies from the next committed attack.
  setStrategy(id){if(!STRATEGIES[id])return false;strategy=id;changed();return true;},
  get strategy(){return strategy;},
  get attack(){return selected?{...SPELLS[selected],spell:selected,item:null}:equipment.attack;},
  get state(){return {selected,learned:[...learned],strategy};},reset(){selected=null;strategy='technical';learned.clear();changed();}
 };
}
