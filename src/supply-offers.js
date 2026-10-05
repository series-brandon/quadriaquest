// Shared inventory transactions. Narrative chooses an offer; it never owns refill logic.
export const SUPPLY_OFFERS={meal:{items:{cookedFish:1},missing:'cookedFish'},archerKit:{items:{bows:1,arrows:20},once:true},arrows:{items:{arrows:20},missing:'arrows'},bow:{items:{bows:1},missing:'bows'}};
export function createSupplyOffers({inventory,changed=()=>{}}){
 const claimed=new Set();
 return {claim(id,identity=id){const offer=SUPPLY_OFFERS[id];if(!offer||offer.once&&claimed.has(identity)||offer.missing&&inventory[offer.missing]>0)return false;
  for(const [item,n] of Object.entries(offer.items))inventory[item]=(inventory[item]||0)+n;
  if(offer.once)claimed.add(identity);changed({...offer.items});return true;
 },reset(){claimed.clear();},get state(){return [...claimed];}};
}
