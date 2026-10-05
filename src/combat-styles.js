export const SPELLS={spark:{name:'Spark',min:2,max:4,interval:1.8,range:4,style:'magic'}};
export function createCombatStyles({equipment,busy=()=>false,changed=()=>{}}){
 const learned=new Set();let selected=null;
 return {learn(id){if(!SPELLS[id])return false;const fresh=!learned.has(id);learned.add(id);changed();return fresh;},
  select(id){if(busy()||id!==null&&!learned.has(id))return false;selected=id;changed();return true;},
  get attack(){return selected?{...SPELLS[selected],spell:selected,item:null}:equipment.attack;},
  get state(){return {selected,learned:[...learned]};},reset(){selected=null;learned.clear();changed();}
 };
}
