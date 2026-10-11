import {hash,valueNoise} from './noise.js';

// The countryside around Gelton (docs/WORLD.md): generated land, the same every time for a seed, around
// a city's square footprint, with placed landmarks on top. It is a chunk-streamer source
// (chunk-streamer.js): tile(x, z), entities(tiles) for resources (trees, rocks, copper, ground items)
// and extras(tiles) for fishing spots, enemies and landmark props, all with stable ids.
//
// The layout, in world tiles (the city keeps its own coordinates, 0…size-1):
//  - a ring RING tiles deep on every side, ending in a strip of sea at the edge of the world;
//  - flat meadow just outside the wall, rising into rolling and then rocky hills farther out;
//  - three roads leaving the city's gateways (city data `gates`), gently winding, kept flat;
//  - a river running north to south through the east, crossed by the east road on a bridge;
//  - a lake to the north-west and a pond to the south-west, for fishing;
//  - woods in patches, copper outcrops and boulders on the hilltops, sticks and rocks to pick up;
//  - goblins in camps away from the roads: passive scrappers near them, bruisers deeper in;
//  - landmarks: a woodcutter's camp at the end of the west road, ruins in the hills north of the city, a
//    lakeside rest, a wagon past the bridge and a signpost at the end of the south road.
export const RING=64,SEA=5;
const ROAD_HALF=1;
export function createCountryside({city,seed=11}){
 const size=city.size[0],gates=city.gates||[],x0=-RING,x1=size+RING;
 // Chebyshev distance outside the city square (0 inside).
 const outside=(x,z)=>Math.max(0,-x,x-(size-1),-z,z-(size-1));
 // Roads: a winding centre line from each gateway out to near the sea.
 const roads=gates.map(g=>{
  const mid=(g.from+g.to)/2,wiggle=t=>Math.round(Math.sin(t/17+g.from)*3*Math.min(1,t/12));
  if(g.side==='west')return {side:g.side,mid,along:x=>-x,center:x=>mid+wiggle(-x),length:RING-SEA-6};
  if(g.side==='east')return {side:g.side,mid,along:x=>x-(size-1),center:x=>mid+wiggle(x-(size-1)),length:RING-SEA-6};
  if(g.side==='south')return {side:g.side,mid,along:z=>z-(size-1),center:z=>mid+wiggle(z-(size-1)),length:RING-SEA-6};
  return {side:g.side,mid,along:z=>-z,center:z=>mid+wiggle(-z),length:RING-SEA-6};});
 function roadDistance(x,z){let best=Infinity;
  for(const r of roads){const horizontal=r.side==='west'||r.side==='east',a=r.along(horizontal?x:z);if(a<1||a>r.length)continue;
   best=Math.min(best,Math.abs((horizontal?z:x)-r.center(horizontal?x:z)));}
  return best;}
 // Water: the river (east), the lake (north-west), the pond (south-west) and the sea strip.
 const riverX=z=>size+RING*.45+Math.sin(z/19)*6+Math.sin(z/7)*2;
 const lake={x:-RING*.45,z:size*.18,r:13},pond={x:size*.12,z:size+RING*.55,r:7};
 const inPool=(x,z,p,s)=>Math.hypot(x-p.x,z-p.z)<p.r+(valueNoise(x,z,6,seed+s)-.5)*5;
 const isSea=(x,z)=>x<x0+SEA||z<x0+SEA||x>=x1-SEA||z>=x1-SEA;
 const isRiver=(x,z)=>Math.abs(x-riverX(z))<=1.5;
 // Landmarks: hand-placed props (world tiles), kept clear of resources and enemies.
 const LANDMARKS=[
  {id:'woodcutter',props:[{kind:'woodpile',x:-RING+SEA+5,z:roads[0]?Math.round(roads[0].mid)-4:60},{kind:'fallenLog',x:-RING+SEA+8,z:Math.round(roads[0]?.mid??64)+3},{kind:'treeStump',x:-RING+SEA+6,z:Math.round(roads[0]?.mid??64)+5},{kind:'hayBales',x:-RING+SEA+9,z:Math.round(roads[0]?.mid??64)-4}]},
  {id:'ruins',props:[{kind:'brokenPillar',x:size-28,z:-34},{kind:'brokenPillar',x:size-24,z:-34},{kind:'brokenPillar',x:size-28,z:-30},{kind:'rubble',x:size-26,z:-32},{kind:'rubble',x:size-23,z:-31},{kind:'rubble',x:size-27,z:-28}]},
  {id:'lakeside',props:[{kind:'stoneBench',x:Math.round(lake.x)+2,z:Math.round(lake.z)+lake.r+5},{kind:'rainBarrel',x:Math.round(lake.x)+6,z:Math.round(lake.z)+lake.r+5}]},
  {id:'wagon',props:[{kind:'wagon',x:Math.round(riverX(70))+8,z:66}]},
  {id:'south-sign',props:[{kind:'signpost',x:Math.round(size/2)+3,z:size+RING-SEA-8}]},
 ];
 const reserved=new Set();
 for(const l of LANDMARKS)for(const p of l.props)for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=3;dx++)reserved.add(`${p.x+dx},${p.z+dz}`);
 const tiles=new Map();
 // A tile, or null inside the city (the city supplies its own) and beyond the world's edge.
 function tile(x,z){
  if(x<x0||z<x0||x>=x1||z>=x1)return null;
  const d=outside(x,z);if(d===0)return null;
  const k=`${x},${z}`;if(tiles.has(k))return tiles.get(k);
  const road=roadDistance(x,z);let t;
  if(isSea(x,z))t={x,z,h:.5,water:true,blocked:true,surface:'water'};
  else if(road<=ROAD_HALF){const bridge=isRiver(x,z);t={x,z,h:1,water:false,blocked:false,surface:bridge?'planks':'dirt',bridge};}
  else if(isRiver(x,z)||inPool(x,z,lake,3)||inPool(x,z,pond,4))t={x,z,h:.5,water:true,blocked:true,surface:'water'};
  else{
   // Hills grow with distance from the wall and from the roads; heights step in half blocks.
   const hills=Math.min(1,Math.max(0,(d-8)/18))*Math.min(1,Math.max(0,(road-3)/8));
   const e=valueNoise(x,z,34,seed)*.65+valueNoise(x,z,11,seed+1)*.35;
   // Shores stay low (a beach at water level plus half a block), then rise a step per tile, so water
   // is always reachable for fishing.
   const water=(a,b)=>isRiver(a,b)||inPool(a,b,lake,3)||inPool(a,b,pond,4);
   let near=4;for(let r=1;r<4&&near===4;r++)for(let dz=-r;dz<=r&&near===4;dz++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dz))===r&&water(x+dx,z+dz)){near=r;break;}
   const h=Math.min(1+Math.min(6,Math.floor(Math.max(0,e-.38)*hills*14))*.5,near<4?1+(near-1)*.5:Infinity);
   const shore=near===1;
   t={x,z,h,water:false,blocked:false,surface:h>=3?'stone':shore?'dirt':'grass'};
  }
  tiles.set(k,t);return t;
 }
 const forest=(x,z)=>valueNoise(x,z,40,seed+3)>.58;
 // Resources for one chunk's tiles; ids are stable across loads.
 function entities(list){
  const out=[];
  for(const t of list){
   if(t.water||t.bridge||t.surface==='dirt'&&roadDistance(t.x,t.z)<=ROAD_HALF||reserved.has(`${t.x},${t.z}`)||outside(t.x,t.z)<4||roadDistance(t.x,t.z)<=ROAD_HALF+1)continue;
   const r=hash(t.x,t.z,seed+9),rocky=t.h>=2.5;
   const kind=rocky?(r<.035?'boulder':r<.06?'copper':r<.075?'stones':null)
    :forest(t.x,t.z)?(r<.16?'tree':r<.18?'sticks':null)
    :(r<.012?'tree':r<.016?'sticks':r<.02?'stones':null);
   if(kind)out.push({id:`${kind}:${t.x},${t.z}`,kind,x:t.x,z:t.z});
  }
  return out;
 }
 const taken=t=>entities([t]).length>0;
 // Fishing spots on water beside land, goblins away from roads, and landmark props.
 function extras(list){
  const out=[],keys=new Set(list.map(t=>`${t.x},${t.z}`));
  for(const t of list){
   if(t.water){
    if(isSea(t.x,t.z))continue;
    const land=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>tile(t.x+dx,t.z+dz)).find(n=>n&&!n.water&&!taken(n)&&n.h-t.h<=.5);
    if(land&&hash(t.x,t.z,seed+21)<.07)out.push({id:`fish:${t.x},${t.z}`,kind:'fishing',x:t.x,z:t.z});
    continue;}
   const road=roadDistance(t.x,t.z);
   if(road>10&&outside(t.x,t.z)>22&&!reserved.has(`${t.x},${t.z}`)&&!taken(t)&&hash(t.x,t.z,seed+31)<.0012){
    const deep=road>18&&hash(t.x,t.z,seed+32)<.45;
    out.push({id:`goblin:${t.x},${t.z}`,kind:'enemy',enemy:deep?'bruiser':'scrapper',aggressive:deep,x:t.x,z:t.z});}
  }
  for(const l of LANDMARKS)for(const [i,p] of l.props.entries())if(keys.has(`${p.x},${p.z}`))out.push({id:`${l.id}:${i}`,kind:'prop',prop:p.kind,x:p.x,z:p.z,rotation:p.rotation||0});
  return out;
 }
 return {tile,entities,extras,roadDistance,outside,bounds:{x0,z0:x0,x1,z1:x1},landmarks:LANDMARKS,riverX,lake,pond,roads};
}
