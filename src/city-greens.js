import {hash} from './noise.js';
import {BIOMES,BIOME_NAMES} from './biomes.js';
import {key} from './world.js';

// A city's green spaces as mini biomes (docs/WORLD.md, Green spaces): every separate patch of grass (a
// block's yard, the park, the strip inside the wall) is themed by one biome (biomes.js), so a blossom
// yard has cherries and pink flowers, a willow green willows and darker flowers. Deterministic for the
// city (its seed). Returns placements; the host makes the trees (shared choppable resources) and the
// ground cover (ground-cover.js).
//   cityGreens(city, {seed}) → {patches: [{biome, tiles}], trees: [{x, z, species}], cover: [items]}
// Trees stand only where every neighbour is the same patch and no other tree is within two tiles, so a
// tree never closes a path, an alley or a doorstep; ground cover is walk-through.
export const MIN_PATCH=10,BIG_PATCH=320,CELL=14;
const biomeAt=(x,z,seed)=>BIOME_NAMES[Math.floor(hash(x,z,seed)*BIOME_NAMES.length)];
// The cell a tile belongs to: the nearest of one jittered point per CELL-square (organic edges).
function cellOf(x,z,seed){
 const gx=Math.floor(x/CELL),gz=Math.floor(z/CELL);let best=null;
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const cx=gx+dx,cz=gz+dz,px=(cx+.2+hash(cx,cz,seed+11)*.6)*CELL,pz=(cz+.2+hash(cx,cz,seed+12)*.6)*CELL,d=(px-x)**2+(pz-z)**2;
  if(!best||d<best.d)best={id:`${cx},${cz}`,x:Math.round(px),z:Math.round(pz),d};}
 return best;
}
export function cityGreens(city,{seed=1}={}){
 const map=city.tiles,isGreen=t=>t&&(t.surface||'grass')==='grass'&&!t.blocked&&!t.indoor&&!t.stair&&!t.cityWall&&t.building===undefined;
 const doorsteps=new Set();for(const b of city.buildings||[])for(const d of b.anchors?.doors||[])for(const t of [d.doorstep,d.inside])if(t)doorsteps.add(t);
 // Townsfolk homes stay clear too (they stand there).
 for(const f of city.data?.townsfolk||[])if(f.home){const t=map.get(key(...f.home));if(t)doorsteps.add(t);}
 const seen=new Set(),patches=[];
 for(const start of map.values()){
  if(seen.has(start)||!isGreen(start))continue;
  const tiles=[start];seen.add(start);
  for(let i=0;i<tiles.length;i++){const t=tiles[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=map.get(key(t.x+dx,t.z+dz));if(n&&!seen.has(n)&&isGreen(n)){seen.add(n);tiles.push(n);}}}
  if(tiles.length<MIN_PATCH)continue;
  // A small patch is one biome; a big one (the city's grass mostly joins up) is split into cells about
  // CELL tiles across, each its own mini biome.
  if(tiles.length<=BIG_PATCH){const first=tiles.reduce((a,b)=>a.z<b.z||a.z===b.z&&a.x<b.x?a:b);patches.push({biome:biomeAt(first.x,first.z,seed),tiles});continue;}
  const cells=new Map();for(const t of tiles){const c=cellOf(t.x,t.z,seed);if(!cells.has(c.id))cells.set(c.id,{biome:biomeAt(c.x,c.z,seed),tiles:[]});cells.get(c.id).tiles.push(t);}
  for(const cell of cells.values())patches.push(cell);
 }
 const trees=[],cover=[],taken=new Set();
 const near=(x,z,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(taken.has(key(x+dx,z+dz)))return true;return false;};
 for(const patch of patches){
  const biome=BIOMES[patch.biome];
  for(const t of patch.tiles){
   const r=hash(t.x,t.z,seed+1),r2=hash(t.x,t.z,seed+2),pick=list=>list[Math.floor(r2*list.length)];
   const interior=[-1,0,1].every(dz=>[-1,0,1].every(dx=>isGreen(map.get(key(t.x+dx,t.z+dz)))))&&![-1,0,1].some(dz=>[-1,0,1].some(dx=>doorsteps.has(map.get(key(t.x+dx,t.z+dz)))));
   if(interior&&r<.12&&!near(t.x,t.z,2)){trees.push({x:t.x,z:t.z,species:pick(biome.trees)});taken.add(key(t.x,t.z));continue;}
   const at=(kind,scale=1)=>cover.push({kind,x:t.x+(r2-.5)*.5,y:t.h,z:t.z+(r-.5)*.5,rotation:r*6.28,scale});
   // Light cover: a flower clump on about one tile in five, something else on one in ten.
   if(r>=.12&&r<.32)at(pick(biome.flowers),1.05);else if(r>=.32&&r<.42)at(pick(biome.extras),.95);
  }
 }
 return {patches,trees,cover};
}
