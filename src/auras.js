// Shared auras (docs/COMBAT.md): permanently learned, independently toggled, stackable, sustained by Ki.
// Activation charges one second of upkeep; upkeep drains continuously regardless of combat state.
// Reaching zero Ki turns every aura off (exhaustion). Ki regenerates only while all auras are off.
export const AURAS={
 rush:{name:'Rush',upkeep:.5,description:'+10% movement speed',movementBonus:.1},
 harden:{name:'Harden',upkeep:.5,description:'+10% resistance to each incoming damage portion',resistancePct:10},
};
export function createAuras({ki,changed=()=>{},exhausted=()=>{}}){
 const learned=new Set(),active=new Set();
 const upkeep=()=>[...active].reduce((s,id)=>s+AURAS[id].upkeep,0);
 function deactivateAll(){if(!active.size)return;active.clear();changed();}
 const api={
  learn(id){if(!AURAS[id]||learned.has(id))return false;learned.add(id);changed();return true;},
  forget(id){learned.delete(id);if(active.delete(id))changed();},
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
  reset(){learned.clear();active.clear();changed();},
  get state(){return {learned:[...learned],active:[...active]};},
 };
 return api;
}
