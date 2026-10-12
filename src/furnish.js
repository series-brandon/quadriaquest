import {PROPS,propFootprint,blockedOffsets,rotateOffset,rotateSide} from './props.js';
import {seeded} from './building-kit.js';

// Furnishing by building type (docs/CITY.md, Props, furniture and furnishing; Phase 10). One shared
// furnisher lays out a room from its use's rule, seeded so the same building always gets the same room:
// the trade fixture first (a counter with the keeper spot behind it), then pieces against the walls
// facing in, then centre pieces (a table with chairs, a rug), wall-mounted pieces, then clutter.
// Nothing goes on a door's inside tile, the tile in from it, a stair or its front, or the keeper spot,
// and every free tile stays reachable from the door. Output is data ([{kind, x, z, rotation}]); the
// caller places it with createProp.
// A rule item: {kind (or kinds: one is picked), place: 'keeper'|'wall'|'center'|'floor'|'mount'|'any',
// count, chairs (around a centre table), chance}.
const chairs=n=>({chairs:n});
export const USES={
 home:[{place:'wall',kinds:['bed','bed','doubleBed']},{place:'wall',kinds:['wardrobe','dresser','cupboard']},{place:'wall',kind:'fireplace',chance:.7},{place:'floor',kinds:['rug','rugRound'],chance:.7},{place:'center',kinds:['tableSmall','tableRound'],...chairs(2)},{place:'mount',kinds:['painting','wallShelf'],count:2},{place:'wall',kinds:['chest','bookshelf','pottedPlant','stove'],count:2},{place:'any',kinds:['candleStand','pottedPlant','broomBucket','coatRack'],count:2}],
 inn:[{place:'keeper',kind:'barCounter'},{place:'wall',kind:'kegRack'},{place:'wall',kind:'fireplace'},{place:'center',kind:'tableRound',...chairs(3),count:2},{place:'mount',kinds:['wallTorch','painting'],count:3},{place:'any',kinds:['kegs','caskStand'],count:2}],
 tavern:[{place:'keeper',kind:'barCounter'},{place:'wall',kinds:['kegRack','caskStand']},{place:'center',kinds:['tableRound','tableLong'],...chairs(3),count:2},{place:'wall',kind:'fireplace',chance:.6},{place:'mount',kind:'wallTorch',count:2},{place:'any',kind:'kegs'}],
 bakery:[{place:'keeper',kind:'shopCounter'},{place:'wall',kind:'breadOven'},{place:'wall',kind:'breadShelf',count:2},{place:'any',kinds:['flourSacks','sackPile'],count:2},{place:'mount',kind:'wallShelf'}],
 smithy:[{place:'wall',kind:'forge'},{place:'any',kind:'anvil'},{place:'wall',kind:'workbench'},{place:'any',kind:'quenchBarrel'},{place:'mount',kinds:['toolRack','weaponRack'],count:2},{place:'any',kinds:['crateStack','woodpile']}],
 store:[{place:'keeper',kind:'shopCounter'},{place:'wall',kinds:['cupboard','breadShelf','clothShelf'],count:2},{place:'center',kind:'displayTable'},{place:'any',kinds:['crateStack','sackPile','barrel'],count:2},{place:'mount',kind:'wallShelf'}],
 grocer:[{place:'keeper',kind:'shopCounter'},{place:'wall',kind:'produceCrates',count:2},{place:'any',kinds:['sackPile','barrel','crates'],count:2}],
 fishmonger:[{place:'keeper',kind:'fishCounter'},{place:'wall',kind:'fishRack'},{place:'any',kinds:['quenchBarrel','kegs'],count:2}],
 armourer:[{place:'keeper',kind:'shopCounter'},{place:'wall',kind:'armourStand',count:2},{place:'mount',kinds:['shieldDisplay','weaponRack'],count:3},{place:'any',kind:'anvil',chance:.5}],
 weaponsmith:[{place:'keeper',kind:'shopCounter'},{place:'mount',kind:'weaponRack',count:3},{place:'center',kind:'displayTable'},{place:'any',kinds:['anvil','quenchBarrel']}],
 apothecary:[{place:'keeper',kind:'shopCounter'},{place:'wall',kind:'apothecaryShelf',count:2},{place:'wall',kind:'alchemyTable'},{place:'any',kinds:['cauldron','pottedPlant'],count:2},{place:'mount',kind:'wallShelf'}],
 tailor:[{place:'keeper',kind:'shopCounter'},{place:'wall',kind:'clothShelf',count:2},{place:'wall',kind:'loom'},{place:'any',kind:'tailorDummy',count:2}],
 carpenter:[{place:'wall',kind:'workbench',count:2},{place:'wall',kind:'woodpile'},{place:'mount',kind:'toolRack',count:2},{place:'any',kinds:['crateStack','sackPile']}],
 guildHall:[{place:'floor',kind:'rug'},{place:'center',kind:'tableDining',...chairs(4)},{place:'wall',kind:'bookshelf',count:2},{place:'wall',kind:'fireplace'},{place:'wall',kind:'desk'},{place:'mount',kinds:['painting','wallTorch'],count:3},{place:'any',kind:'candleStand',count:2}],
 keep:[{place:'floor',kind:'rug'},{place:'wall',kind:'armchair'},{place:'wall',kind:'knightStatue',count:2},{place:'wall',kind:'banner',count:2},{place:'mount',kinds:['wallTorch','painting','shieldDisplay'],count:4},{place:'any',kind:'candleStand',count:2},{place:'center',kind:'pew',count:2}],
 warehouse:[{place:'any',kinds:['crateStack','sackPile','barrel','kegs','crates','hayBales'],count:8}],
 barracks:[{place:'wall',kind:'bunkBed',count:3},{place:'wall',kind:'chest',count:2},{place:'center',kind:'tableLong',...chairs(2)},{place:'mount',kind:'weaponRack',count:2}],
 // Pim's post office: a counter, a sorting desk, shelves and parcels everywhere.
 postOffice:[{place:'keeper',kind:'shopCounter'},{place:'wall',kind:'desk'},{place:'wall',kind:'cupboard'},{place:'mount',kinds:['wallShelf','wallShelf','painting'],count:3},{place:'any',kinds:['sackPile','crateStack','crates'],count:3}],
 crypt:[{place:'wall',kind:'sarcophagus',count:2},{place:'any',kinds:['brokenPillar','rubble'],count:3},{place:'any',kind:'bones',count:3},{place:'mount',kinds:['dungeonTorch','cobweb','shackles'],count:5},{place:'any',kind:'brazier',count:2},{place:'wall',kind:'chest',loot:true}],
};
export const USE_NAMES=Object.keys(USES);
// Upstairs in a separate interior: bedrooms (homes, inns) or storage.
const UPSTAIRS={inn:'home',tavern:'home',home:'home',guildHall:'home',keep:'barracks'};
export const upstairsUse=use=>UPSTAIRS[use]||'warehouse';
// The use a building is furnished for: its own `use`, or a default (a shop with a sign: a store; any
// other building you can walk into: a home). 'none' leaves it empty; buildings you can't enter get none.
export function furnishingUse(desc){if(desc.use==='none'||desc.interior==='none')return null;if(desc.use)return desc.use;return desc.sign?'store':'home';}
// Shop signs follow the use (building-kit.js sign icons).
export const USE_ICONS={postOffice:'package',bakery:'Culinary',smithy:'hammers',store:'star',grocer:'quickEat',fishmonger:'rawFish',armourer:'copperShield',weaponsmith:'swords',apothecary:'quickRestore',tailor:'dice',inn:'campfires',tavern:'quickEat',carpenter:'hammers'};

const DIRS={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]},ROTATION_FOR_BACK={n:0,e:90,s:180,w:270};
const k=(x,z)=>`${x},${z}`;
// room: {tiles:[[x, z]…], doors:[{inside:[x, z], out:[dx, dz]}], keeper:[x, z]|null, keep:[[x, z]…] (stairs
// and their fronts, hand-placed props)}. Returns [{kind, x, z, rotation, loot?}].
export function furnishRoom(room,use,seed=1){
 const rule=USES[use];if(!rule)return [];
 const random=seeded(seed),inside=new Set(room.tiles.map(([x,z])=>k(x,z))),occupied=new Set(),clear=new Set(),reserved=new Set(),out=[];
 for(const d of room.doors){const [x,z]=d.inside;clear.add(k(x,z));clear.add(k(x-d.out[0],z-d.out[1]));}
 for(const [x,z] of room.keep||[])occupied.add(k(x,z));
 const hasKeeper=rule.some(r=>r.place==='keeper');
 if(room.keeper&&!hasKeeper)clear.add(k(...room.keeper));
 const start=room.doors[0]?.inside||room.tiles[0];
 const free=(x,z)=>inside.has(k(x,z))&&!occupied.has(k(x,z));
 // Every free tile stays reachable from the door once these tiles are taken.
 function connected(extra){const blocked=new Set([...occupied,...extra]),seen=new Set([k(...start)]),queue=[start];if(blocked.has(k(...start)))return false;
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz] of Object.values(DIRS)){const n=k(x+dx,z+dz);if(inside.has(n)&&!blocked.has(n)&&!seen.has(n)){seen.add(n);queue.push([x+dx,z+dz]);}}}
  return [...inside].every(t=>blocked.has(t)||seen.has(t));}
 function cells(kind,x,z,rotation){const [w,d]=propFootprint(kind,rotation),all=[];for(let dz=0;dz<d;dz++)for(let dx=0;dx<w;dx++)all.push([x+dx,z+dz]);
  return {all,blocking:blockedOffsets(kind,rotation).map(([a,b])=>[x+a,z+b]),spots:(PROPS[kind].spots||[]).map(s=>{const [a,b]=rotateOffset(s.at,PROPS[kind].footprint,rotation);return [x+a,z+b];})};}
 function fits(kind,x,z,rotation,{wall=false,mount=false,spots=true}={}){
  const c=cells(kind,x,z,rotation);
  if(!c.all.every(([a,b])=>inside.has(k(a,b))))return false;
  if(mount){const back=DIRS[rotateSide('n',rotation)];return c.all.every(([a,b])=>!inside.has(k(a+back[0],b+back[1]))&&!clear.has(k(a,b))&&!out.some(o=>o.mount&&o.x===a&&o.z===b));}
  // Nothing blocks a tile someone stands on to use an earlier piece (a bedside, the front of a stove).
  if(c.blocking.some(([a,b])=>occupied.has(k(a,b))||clear.has(k(a,b))||reserved.has(k(a,b))))return false;
  if(c.all.some(([a,b])=>occupied.has(k(a,b))))return false;
  if(spots&&c.spots.some(([a,b])=>!free(a,b)||clear.has(k(a,b))&&!room.keeper))return false;
  if(wall){const back=DIRS[rotateSide('n',rotation)];if(!c.blocking.length||!c.blocking.some(([a,b])=>!inside.has(k(a+back[0],b+back[1]))))return false;}
  return connected(c.blocking.map(([a,b])=>k(a,b)));
 }
 function put(kind,x,z,rotation,extra={},{reserve=true}={}){const c=cells(kind,x,z,rotation);for(const [a,b] of c.blocking)occupied.add(k(a,b));if(reserve)for(const [a,b] of c.spots)reserved.add(k(a,b));out.push({kind,x,z,rotation,...extra});return c;}
 const shuffled=list=>list.map(v=>[random(),v]).sort((a,b)=>a[0]-b[0]).map(([,v])=>v);
 const xs=room.tiles.map(t=>t[0]),zs=room.tiles.map(t=>t[1]),x0=Math.min(...xs),z0=Math.min(...zs),x1=Math.max(...xs),z1=Math.max(...zs),cx=(x0+x1)/2,cz=(z0+z1)/2;
 const origins=()=>{const list=[];for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)list.push([x,z]);return list;};
 for(const item of rule){
  const count=item.count||1;if(item.chance!==undefined&&random()>item.chance)continue;
  for(let n=0;n<count;n++){
   const kind=item.kind||item.kinds[Math.floor(random()*item.kinds.length)];if(!PROPS[kind])continue;
   let placed=false;
   if(item.place==='keeper'&&room.doors[0]){
    // The keeper stands three (or two) tiles in from the door; the counter is in the row between, facing
    // the door and centred on the keeper, so the tile in from the door stays clear.
    const [ix,iz]=room.doors[0].inside,[ox,oz]=room.doors[0].out,front=Object.entries(DIRS).find(([,d])=>d[0]===ox&&d[1]===oz)?.[0]||'s';
    const rotation=ROTATION_FOR_BACK[{n:'s',s:'n',e:'w',w:'e'}[front]],[w,d]=propFootprint(kind,rotation);
    for(const depth of [3,2]){const kx=ix-ox*depth,kz=iz-oz*depth;if(!inside.has(k(kx,kz))||occupied.has(k(kx,kz)))continue;
     clear.add(k(kx,kz));
     for(const shift of [0,-1,1]){const x=ox?kx+ox-(ox>0?0:w-1):kx-Math.floor(w/2)+shift,z=oz?kz+oz-(oz>0?0:d-1):kz-Math.floor(d/2)+shift;
      // Its spots are the keeper tile and the clear row in front (the spot check would refuse both).
      if(fits(kind,x,z,rotation,{spots:false})){put(kind,x,z,rotation);placed=true;break;}}
     if(!placed&&fits('counterCorner',kx+ox,kz+oz,rotation,{spots:false})){put('counterCorner',kx+ox,kz+oz,rotation);placed=true;}
     if(placed){out.keeper=[kx,kz];break;}
     clear.delete(k(kx,kz));
    }
    continue;
   }
   const options=item.place==='center'||item.place==='floor'?origins().sort((a,b)=>Math.hypot(a[0]-cx,a[1]-cz)-Math.hypot(b[0]-cx,b[1]-cz)+(random()-.5)*.6):shuffled(origins());
   for(const [x,z] of options){
    for(const rotation of shuffled([0,90,180,270])){
     if(item.place==='mount'){if(!fits(kind,x,z,rotation,{mount:true}))continue;out.push({kind,x,z,rotation,mount:true});placed=true;break;}
     if(item.place==='floor'){const c=cells(kind,x,z,rotation);if(c.all.every(([a,b])=>free(a,b)&&!clear.has(k(a,b)))&&!out.some(o=>PROPS[o.kind].policy==='walk'&&!o.mount&&cells(o.kind,o.x,o.z,o.rotation).all.some(([a,b])=>c.all.some(([p,q])=>p===a&&q===b)))){out.push({kind,x,z,rotation});placed=true;break;}continue;}
     if(!fits(kind,x,z,rotation,{wall:item.place==='wall'}))continue;
     const c=put(kind,x,z,rotation,item.loot?{loot:true}:{});placed=true;
     // Chairs around a centre table: on free tiles beside it, facing it.
     if(item.chairs){let made=0;
      for(const [a,b] of shuffled(c.blocking))for(const [side,[dx,dz]] of Object.entries(DIRS)){if(made>=item.chairs)break;const tx=a+dx,tz=b+dz;
       // The chair's back away from the table, so its sitter faces it. Its sit spot is the table tile, so
       // these chairs seat only from a free side (the spot check is skipped).
       const rot=ROTATION_FOR_BACK[side];
       if(!c.blocking.some(([p,q])=>p===tx&&q===tz)&&fits('chair',tx,tz,rot,{spots:false})){put('chair',tx,tz,rot,{},{reserve:false});made++;}}}
     break;
    }
    if(placed)break;
   }
  }
 }
 return out;
}
// The room of an in-place building (building-kit.js plan) for furnishRoom. The result's `keeper` (when
// a counter was placed) is where the shopkeeper stands.
export function roomOfPlan(plan,{keep=[]}={}){
 return {tiles:plan.tiles,doors:plan.doors.map(d=>({inside:d.inside,out:d.out})),keeper:plan.anchors.keeper||null,keep};
}
