// Shared auras (docs/COMBAT.md): permanently learned, independently toggled, stackable, sustained by Ki.
// Activation charges one second of upkeep; upkeep drains continuously regardless of combat state.
// Reaching zero Ki turns every aura off (exhaustion). Ki regenerates only while all auras are off.
import {signal} from './reactive.js';
export const AURAS={
 rush:{name:'Rush',upkeep:.5,description:'+10% movement speed',movementBonus:.1},
 harden:{name:'Harden',upkeep:.5,description:'+10% resistance to each incoming damage portion',resistancePct:10},
};
export function createAuras({ki,changed:notify=()=>{},exhausted=()=>{}}){
 // `revision` changes with every aura change so UI bindings can follow learned/active/quick state.
 const revision=signal(0),changed=()=>{revision.value++;notify();};
 const learned=new Set(),active=new Set(),quick=new Set();
 const upkeep=()=>[...active].reduce((s,id)=>s+AURAS[id].upkeep,0);
 function deactivateAll(){if(!active.size)return;active.clear();changed();}
 const api={
  revision,
  learn(id){if(!AURAS[id]||learned.has(id))return false;learned.add(id);changed();return true;},
  forget(id){learned.delete(id);quick.delete(id);if(active.delete(id))changed();},
  // Quick-toggle set (docs/COMBAT.md, Quick slots): learned auras the HUD control switches together.
  setQuick(id,on){if(!learned.has(id))return false;if(on)quick.add(id);else quick.delete(id);changed();return true;},
  isQuick:id=>quick.has(id),
  get quick(){return [...quick];},
  // 'none' (empty set), 'off', 'partial' or 'on'.
  get quickState(){if(!quick.size)return 'none';const on=[...quick].filter(id=>active.has(id)).length;return on===0?'off':on===quick.size?'on':'partial';},
  // Any quick aura on → all quick auras off; otherwise each turns on in order, paying its fee.
  // `toggle` lets assistance record each change as manual. Returns true or the refusal reasons.
  toggleQuick(toggle=id=>api.toggle(id)){
   if(!quick.size)return 'No quick auras set';
   const anyOn=[...quick].some(id=>active.has(id)),failures=[];
   for(const id of quick){if(active.has(id)!==anyOn)continue;const result=toggle(id);if(result!==true)failures.push(`${AURAS[id].name}: ${result}`);}
   return failures.length?failures.join(' · '):true;
  },
  isActive:id=>active.has(id),
  get anyActive(){return active.size>0;},
  // Returns a reason string when activation is refused; true when toggled.
  toggle(id){
   if(!learned.has(id))return 'Not learned';
   if(active.has(id)){active.delete(id);changed();return true;}
   const fee=AURAS[id].upkeep;if(ki.value<fee)return `Not enough Ki (${fee} needed)`;
   ki.value-=fee;active.add(id);changed();return true;
  },
  update(dt){
   if(!active.size)return;
   ki.value-=upkeep()*dt;
   if(ki.value<=0){deactivateAll();exhausted();}
  },
  deactivateAll,
  get movementBonus(){let b=0;for(const id of active)b+=AURAS[id].movementBonus||0;return b;},
  get resistancePct(){let r=0;for(const id of active)r+=AURAS[id].resistancePct||0;return r;},
  get upkeep(){return upkeep();},
  reset(){learned.clear();active.clear();quick.clear();changed();},
  get state(){return {learned:[...learned],active:[...active],quick:[...quick]};},
 };
 return api;
}
