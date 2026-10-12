import {hash,valueNoise} from './noise.js';
import {TOWER_RADIUS} from './city-walls.js';
const FLOWERS=['flowerWhite','flowerYellow','flowerPink','flowerPurple','flowerBlue','flowerRed'];

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
 // Small ponds dotted about the meadows and woods (one chance per 36-tile cell), away from the wall,
 // the roads, the river and the lake; lily pads and fishing spots come with them.
 const ponds=[];
 for(let cz=Math.floor(x0/36);cz*36<x1;cz++)for(let cx=Math.floor(x0/36);cx*36<x1;cx++){
  if(hash(cx,cz,seed+70)>.55)continue;const x=cx*36+8+Math.floor(hash(cx,cz,seed+71)*20),z=cz*36+8+Math.floor(hash(cx,cz,seed+72)*20),r=2.2+hash(cx,cz,seed+73)*1.8;
  if(outside(x,z)<12||x<x0+SEA+6||z<x0+SEA+6||x>=x1-SEA-6||z>=x1-SEA-6)continue;ponds.push({x,z,r});}
 const isSea=(x,z)=>x<x0+SEA||z<x0+SEA||x>=x1-SEA||z>=x1-SEA;
 const isRiver=(x,z)=>Math.abs(x-riverX(z))<=1.5;
 const inSmallPond=(x,z)=>ponds.some(p=>Math.abs(x-p.x)<p.r+3&&Math.abs(z-p.z)<p.r+3&&Math.hypot(x-p.x,z-p.z)<p.r+(valueNoise(x,z,4,seed+74)-.5)*1.6);
 // Bridges: where a road crosses the river, a deck over the water plus a tile of bank each side
 // ({axis, from, to, at}: along the road from…to, centred across at `at`). Their tiles have no terrain
 // (the bridge model is the deck) and water shows beneath.
 const bridges=[];
 for(const r of roads){const horizontal=r.side==='west'||r.side==='east',span=[];
  for(let a=1;a<=r.length;a++){const along=horizontal?(r.side==='west'?-a:size-1+a):(r.side==='north'?-a:size-1+a),c=Math.round(r.center(along));
   if([-1,0,1].some(o=>horizontal?isRiver(along,c+o):isRiver(c+o,along)))span.push({along,c});}
  if(span.length){const ends=span.map(p=>p.along);bridges.push({id:`bridge:${r.side}`,axis:horizontal?'x':'z',from:Math.min(...ends)-1,to:Math.max(...ends)+1,at:span[0].c});}}
 const bridgeAt=(x,z)=>bridges.find(b=>b.axis==='x'?x>=b.from&&x<=b.to&&Math.abs(z-b.at)<=ROAD_HALF:z>=b.from&&z<=b.to&&Math.abs(x-b.at)<=ROAD_HALF)||null;
 // Landmarks: hand-placed props (world tiles), kept clear of resources and enemies.
 const LANDMARKS=[
  {id:'woodcutter',props:[{kind:'woodpile',x:-RING+SEA+5,z:roads[0]?Math.round(roads[0].mid)-4:60},{kind:'fallenLog',x:-RING+SEA+8,z:Math.round(roads[0]?.mid??64)+3},{kind:'treeStump',x:-RING+SEA+6,z:Math.round(roads[0]?.mid??64)+5},{kind:'hayBales',x:-RING+SEA+9,z:Math.round(roads[0]?.mid??64)-4}]},
  {id:'ruins',props:[{kind:'brokenPillar',x:size-28,z:-34},{kind:'brokenPillar',x:size-24,z:-34},{kind:'brokenPillar',x:size-28,z:-30},{kind:'rubble',x:size-26,z:-32},{kind:'rubble',x:size-23,z:-31},{kind:'rubble',x:size-27,z:-28}]},
  {id:'lakeside',props:[{kind:'stoneBench',x:Math.round(lake.x)+2,z:Math.round(lake.z)+lake.r+5},{kind:'rainBarrel',x:Math.round(lake.x)+6,z:Math.round(lake.z)+lake.r+5}]},
  {id:'wagon',props:[{kind:'wagon',x:Math.round(riverX(70))+8,z:66}]},
  {id:'south-sign',props:[{kind:'signpost',x:Math.round(size/2)+3,z:size+RING-SEA-8}]},
 ];
 // A signpost outside each gateway.
 for(const g of gates){LANDMARKS.push({id:`gate-sign:${g.side}`,props:[{kind:"signpost",...(g.side==="west"?{x:-3,z:g.from-2}:g.side==="east"?{x:size+2,z:g.to+2}:g.side==="south"?{x:g.from-2,z:size+2}:{x:g.to+2,z:-3})}]});}
 // The city wall's corner towers stand half outside the city: their tiles out here are solid.
 const wallMid=city.walls?(city.walls.thickness-1)/2:null;
 const underTower=(x,z)=>wallMid!==null&&[[wallMid,wallMid],[size-1-wallMid,wallMid],[wallMid,size-1-wallMid],[size-1-wallMid,size-1-wallMid]].some(([cx,cz])=>Math.hypot(x-cx,z-cz)<TOWER_RADIUS+.45);
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
  else if(underTower(x,z))t={x,z,h:1,water:false,blocked:true,blocksSight:true,surface:'grass',underWall:true};
  else if(bridgeAt(x,z)){t={x,z,h:1,water:false,blocked:false,surface:'planks',bridge:true,noTerrain:true,overWater:isRiver(x,z)};}
  else if(road<=ROAD_HALF)t={x,z,h:1,water:false,blocked:false,surface:'dirt'};
  else if(isRiver(x,z)||inPool(x,z,lake,3)||inPool(x,z,pond,4)||road>4&&inSmallPond(x,z))t={x,z,h:.5,water:true,blocked:true,surface:'water',still:!isRiver(x,z)};
  else{
   // Hills grow with distance from the wall and from the roads; heights step in half blocks.
   const hills=Math.min(1,Math.max(0,(d-8)/18))*Math.min(1,Math.max(0,(road-3)/8));
   const e=valueNoise(x,z,34,seed)*.65+valueNoise(x,z,11,seed+1)*.35;
   // Shores stay low (a beach at water level plus half a block), then rise a step per tile, so water
   // is always reachable for fishing.
   const water=(a,b)=>isRiver(a,b)||inPool(a,b,lake,3)||inPool(a,b,pond,4)||roadDistance(a,b)>4&&inSmallPond(a,b);
   let near=4;for(let r=1;r<4&&near===4;r++)for(let dz=-r;dz<=r&&near===4;dz++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dz))===r&&water(x+dx,z+dz)){near=r;break;}
   const h=Math.min(1+Math.min(6,Math.floor(Math.max(0,e-.38)*hills*14))*.5,near<4?1+(near-1)*.5:Infinity);
   const shore=near===1;
   t={x,z,h,water:false,blocked:false,surface:h>=3?'stone':shore?'dirt':'grass'};
  }
  tiles.set(k,t);return t;
 }
 const forest=(x,z)=>valueNoise(x,z,40,seed+3)>.58;
 // Cherry groves in the meadows; which wood is which (birch, oak, maple) drifts across the land.
 const grove=(x,z)=>valueNoise(x,z,26,seed+60)>.7;
 const nearWater=(x,z)=>{for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const n=tile(x+dx,z+dz);if(n?.water&&!isSea(x+dx,z+dz))return true;}return false;};
 // A tree's species: willows by water, pines on the hills, cherries in groves, else the local wood.
 function species(t){
  if(t.h>=2)return 'pine';if(nearWater(t.x,t.z))return 'willow';if(grove(t.x,t.z))return 'cherry';
  const wood=valueNoise(t.x,t.z,60,seed+50),r=hash(t.x,t.z,seed+51);
  return wood<.38?(r<.7?'birch':'oak'):wood<.62?(r<.85?'oak':'birch'):(r<.7?'maple':'oak');
 }
 // Resources for one chunk's tiles; ids are stable across loads.
 function entities(list){
  const out=[];
  for(const t of list){
   if(t.water||t.bridge||t.underWall||t.surface==='dirt'&&roadDistance(t.x,t.z)<=ROAD_HALF||reserved.has(`${t.x},${t.z}`)||outside(t.x,t.z)<4||roadDistance(t.x,t.z)<=ROAD_HALF+1)continue;
   const r=hash(t.x,t.z,seed+9),rocky=t.h>=2.5;
   const kind=rocky?(r<.035?'boulder':r<.06?'copper':r<.075?'stones':null)
    :forest(t.x,t.z)?(r<.16?'tree':r<.18?'sticks':null)
    :grove(t.x,t.z)?(r<.05?'tree':null)
    :(r<.012?'tree':r<.016?'sticks':r<.02?'stones':null);
   if(kind)out.push({id:`${kind}:${t.x},${t.z}`,kind,x:t.x,z:t.z,...kind==='tree'?{species:species(t)}:{}});
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
  for(const b of bridges){const [x,z]=b.axis==='x'?[b.from,b.at]:[b.at,b.from];if(keys.has(`${x},${z}`))out.push({id:b.id,kind:'bridge',x,z,axis:b.axis,length:b.to-b.from+1,width:ROAD_HALF*2+1});}
  for(const l of LANDMARKS)for(const [i,p] of l.props.entries())if(keys.has(`${p.x},${p.z}`))out.push({id:`${l.id}:${i}`,kind:'prop',prop:p.kind,x:p.x,z:p.z,rotation:p.rotation||0});
  return out;
 }
 // Ground cover for one chunk's tiles (ground-cover.js kinds): flower meadows in patches of one or two
 // colours, wildflowers and grass tufts in the grass, ferns and mushrooms in woods, pebbles on stone,
 // reeds on shores and lily pads on still water. Nothing on roads, bridges, the wall or landmarks.
 function cover(list){
  const out=[];
  for(const t of list){
   const k=`${t.x},${t.z}`;if(t.bridge||t.underWall||reserved.has(k)||outside(t.x,t.z)<1)continue;
   const r=hash(t.x,t.z,seed+80),r2=hash(t.x,t.z,seed+81),add=(kind,dx=0,dz=0,y=t.h,scale=1)=>out.push({kind,x:t.x+dx,y,z:t.z+dz,rotation:r2*6.28,scale});
   if(t.water){if(t.still&&!isSea(t.x,t.z)&&r<.12)add('lilyPad',(r2-.5)*.4,(r-.5)*.4,.87);continue;}
   if(roadDistance(t.x,t.z)<=ROAD_HALF)continue;
   if(t.surface==='dirt'){if(r<.28)add('reeds',(r2-.5)*.5,(r-.5)*.5);continue;}
   if(t.surface==='stone'){if(r<.1)add('pebbles',(r2-.5)*.5,(r-.5)*.5);continue;}
   const meadow=valueNoise(t.x,t.z,18,seed+40);
   if(forest(t.x,t.z)){if(r<.09)add('fern',(r2-.5)*.6,(r-.5)*.6);else if(r<.115)add('mushrooms',(r2-.5)*.6,(r-.5)*.6);else if(r<.15)add('grass');continue;}
   if(meadow>.6){const palette=FLOWERS[Math.floor(valueNoise(t.x,t.z,30,seed+41)*FLOWERS.length*.999)],other=FLOWERS[(FLOWERS.indexOf(palette)+2)%FLOWERS.length];
    // About two clumps in three meadow tiles, mostly the patch's colour, with a little grass between.
    if(r<.62)add(r<.5?palette:other,(r2-.5)*.4,(r-.5)*.4,t.h,1.1);if(r2<.15)add(palette,(r-.5)*.5,(r2-.5)*.5,t.h,.9);else if(r2>.88)add('grass',(.5-r2)*.5,(.5-r)*.4);continue;}
   if(r<.07)add(FLOWERS[Math.floor(r2*FLOWERS.length)],(r2-.5)*.5,(r-.5)*.5);else if(r<.15)add('grass',(r2-.5)*.6,(r-.5)*.6);else if(r<.165)add('shrub',(r2-.5)*.4,(r-.5)*.4);
  }
  return out;
 }
 return {tile,entities,extras,cover,ponds,bridges,roadDistance,outside,bounds:{x0,z0:x0,x1,z1:x1},landmarks:LANDMARKS,riverX,lake,pond,roads};
}
