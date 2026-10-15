// Iter Crystal destinations (docs/TOWN.md, Iter Crystals). Every crystal set on a map is a destination of its
// own, by its unique id and the name the teleport list shows. It's listed once you've discovered it (walked up
// to it or used it), or from the start when its map marks it `known` (the first crystal you wake by). Areas
// with no map crystals (the tutorial's) stay destinations by their area id, as before.
// Discovery lasts the session: there are no saves yet.
// An area supplies its places through provide(area, () => [{id, name, known, tile(), prime()}]): read afresh each
// time, so an edited map's crystals are always current. tile(): the crystal's tile; prime(): loads the ground
// around it (a streamed map) before an arrival.
export function createCrystalPlaces(){
 const providers=new Map(),discovered=new Set();
 const all=()=>[...providers].flatMap(([area,list])=>(list()||[]).map(p=>({...p,area})));
 const api={
  provide(area,list){if(list)providers.set(area,list);else providers.delete(area);},
  get:id=>all().find(p=>p.id===id)||null,
  byArea:area=>all().filter(p=>p.area===area),
  list:()=>all(),
  // Can you teleport there?
  listed:id=>{const p=api.get(id);return !!p&&(!!p.known||discovered.has(id));},
  // Marks a crystal discovered; true the first time (the game says so).
  discover(id){const p=api.get(id);if(!p||p.known||discovered.has(id))return false;discovered.add(id);return true;},
  isDiscovered:id=>discovered.has(id),
  discoverAll(){for(const p of all())discovered.add(p.id);},
  reset(){discovered.clear();},
  get discovered(){return [...discovered];},
 };
 return api;
}
