import * as THREE from 'three';
import {hash,valueNoise} from './noise.js';
import {biomeRule,BIOME_RULES} from './biome-rules.js';

// Land made from biomes (docs/BIOMES.md, Placing biomes): a hand-painted biome map plus the biome rules
// (biome-rules.js) give every tile, resource, fishing spot, enemy and bit of ground cover. It is a
// chunk-streamer source (chunk-streamer.js), like countryside.js.
//   createBiomeLand({seed, bounds:[x0, z0, x1, z1], map:{cell, default, cells:{'cx,cz': biome}}, rules})
// A town stands on this land rather than cutting a hole in it (town-ground.js; docs/TOWN.md).
//   → {tile, entities, extras, cover, topColor, biomeAt, heightAt, rules}
// - The biome map is coarse (one biome per `cell` tiles, 8 by default); unpainted cells use `default`.
// - Borders wander: what a tile looks like and grows comes from a lookup warped by noise.
// - Heights blend: each tile's height is a weighted mix of the nearby cells' biome heights, the weights
//   falling off smoothly with distance, so land rises gradually from one biome into the next.
// - Land beside water stays low (a beach at water level plus half a block a tile), so water is always
//   reachable, as in the countryside.
// - The same seed and map always give the same land; ids are stable across loads.
export const CELL=8;
// How far a repainted cell can change the land around it (tiles): blending, wandering borders, ponds
// whose biome decides them, and shores easing up from water.
export const FORGET_MARGIN=48;
const BLEND=20,WARP=5,POND_CELL=24,WATER_H=.5;
export function createBiomeLand({seed=1,bounds,map={},rules=BIOME_RULES}){
 const [x0,z0,x1,z1]=bounds,cell=map.cell||CELL,fallback=map.default||'meadow';let cells=map.cells||{};
 const rule=id=>biomeRule(rules[id]?id:fallback,rules);
 const painted=(cx,cz)=>cells[`${cx},${cz}`]||fallback;
 // The biome a tile shows: its cell, looked up through a gentle warp so borders aren't square.
 const biomeAt=(x,z)=>painted(Math.floor((x+(valueNoise(x,z,13,seed+401)-.5)*2*WARP)/cell),Math.floor((z+(valueNoise(x,z,13,seed+402)-.5)*2*WARP)/cell));
 // One biome's own height at a tile, before blending (continuous, in blocks).
 function ownHeight(b,x,z){const t=b.terrain;
  const e=valueNoise(x,z,t.scale,seed)*.65+valueNoise(x,z,t.scale/2.7,seed+1)*.35,u=Math.min(1,Math.max(0,(e-.3)/.45)),shape=u*u*(3-2*u);
  return t.base+t.relief*shape+t.roughness*(valueNoise(x,z,t.roughScale,seed+2)-.5);}
 // Blended height: nearby cells weighted by (1 − d/BLEND)², d from the tile to the cell's centre.
 function heightAt(x,z){
  let sum=0,total=0;const own=new Map();
  for(let cz=Math.floor((z-BLEND)/cell);cz<=Math.floor((z+BLEND)/cell);cz++)for(let cx=Math.floor((x-BLEND)/cell);cx<=Math.floor((x+BLEND)/cell);cx++){
   const d=Math.hypot((cx+.5)*cell-.5-x,(cz+.5)*cell-.5-z);if(d>=BLEND)continue;const w=(1-d/BLEND)**2,id=painted(cx,cz);
   if(!own.has(id))own.set(id,ownHeight(rule(id),x,z));sum+=w*own.get(id);total+=w;}
  return total?sum/total:ownHeight(rule(fallback),x,z);
 }
 // Water: the sea, ponds (one chance per 24-tile cell, by the biome at the pond) and marsh pools.
 function pondsNear(x,z){const out=[];
  for(let cz=Math.floor(z/POND_CELL)-1;cz<=Math.floor(z/POND_CELL)+1;cz++)for(let cx=Math.floor(x/POND_CELL)-1;cx<=Math.floor(x/POND_CELL)+1;cx++){
   const px=cx*POND_CELL+6+Math.floor(hash(cx,cz,seed+71)*12),pz=cz*POND_CELL+6+Math.floor(hash(cx,cz,seed+72)*12),chance=rule(biomeAt(px,pz)).water.ponds;
   if(hash(cx,cz,seed+70)<chance)out.push({x:px,z:pz,r:2+hash(cx,cz,seed+73)*2.2});}
  return out;}
 const waterSeen=new Map();
 function waterAt(x,z){const k=`${x},${z}`;if(waterSeen.has(k))return waterSeen.get(k);const w=findWater(x,z);waterSeen.set(k,w);return w;}
 function findWater(x,z){
  const b=rule(biomeAt(x,z));if(b.water.sea)return 'sea';if(b.water.river)return 'river';
  if(b.water.pools>0&&valueNoise(x,z,7,seed+90)>1-b.water.pools)return 'marsh';
  if(pondsNear(x,z).some(p=>Math.hypot(x-p.x,z-p.z)<p.r+(valueNoise(x,z,4,seed+74)-.5)*1.6))return 'pond';
  return null;
 }
 const tiles=new Map();
 const inside=(x,z)=>x>=x0&&z>=z0&&x<x1&&z<z1;
 // Tiles to the nearest water, looking up to `reach` tiles (Infinity when there is none that close).
 function waterDistance(x,z,reach=3){for(let r=1;r<=reach;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dz))===r&&inside(x+dx,z+dz)&&waterAt(x+dx,z+dz))return r;return Infinity;}
 function tile(x,z){
  if(!inside(x,z))return null;
  const k=`${x},${z}`;if(tiles.has(k))return tiles.get(k);
  const id=biomeAt(x,z),b=rule(id),water=waterAt(x,z);let t;
  if(water)t={x,z,h:WATER_H,water:true,blocked:true,surface:'water',still:water!=='sea',waterKind:water,biome:id};
  else{
   // Land rises from water half a block a tile: look as far out as this tile's height needs, so the
   // ramp always meets the natural ground without a full-block step.
   const raw=Math.round(heightAt(x,z)*2)/2,near=waterDistance(x,z,Math.max(1,Math.ceil((raw-1)*2)+1));
   const h=Math.max(1,Math.min(raw,1+(near-1)*.5));
   const rocky=h>=b.terrain.rockAt,shore=near===1,ground=rocky?b.ground.rock:shore?b.ground.shore:b.ground;
   t={x,z,h,water:false,blocked:false,surface:ground.surface,palette:ground.palette,biome:id,shore,rocky};
  }
  tiles.set(k,t);return t;
 }
 const colors=new Map(),waterTop=new THREE.Color('#6fa8d6');
 // The tile's top colour: its biome's palette, checkered (as the city surfaces are).
 const topColor=t=>{if(t.water)return waterTop;const hex=t.palette[(t.x+t.z)&1];if(!colors.has(hex))colors.set(hex,new THREE.Color(hex));return colors.get(hex);};
 const woodland=(b,x,z)=>b.trees.clusters>0&&valueNoise(x,z,b.trees.clusterScale,seed+3)>1-b.trees.clusters;
 const nearWater=t=>waterDistance(t.x,t.z,2)<=2;
 const pick=(weights,r)=>{const list=Object.entries(weights),total=list.reduce((n,[,w])=>n+w,0);let acc=0;for(const [k,w] of list){acc+=w/total;if(r<acc)return k;}return list.at(-1)[0];};
 const placeOf=(b,t)=>({forest:woodland(b,t.x,t.z),high:!!t.rocky,shore:!!t.shore});
 const fits=(where,p)=>!where||where==='any'||(where==='open'?!p.forest&&!p.high:p[where]);
 // A tile's tree species, if it grows one.
 function treeAt(t,b,p){
  const r=hash(t.x,t.z,seed+9);if(t.shore&&!b.trees.byWater)return null;
  if(r>=(p.forest?b.trees.clusterDensity:b.trees.density))return null;
  if(b.trees.byWater&&nearWater(t))return b.trees.byWater.species;
  if(b.trees.onHigh&&t.h>=b.trees.onHigh.at)return b.trees.onHigh.species;
  return pick(b.trees.species,hash(t.x,t.z,seed+10));
 }
 // Resources for one chunk's tiles: trees (foliage), then the biome's resource table.
 function entities(list){
  const out=[];
  for(const t of list){if(t.water)continue;const b=rule(t.biome),p=placeOf(b,t),species=treeAt(t,b,p);
   if(species){out.push({id:`tree:${t.x},${t.z}`,kind:'tree',x:t.x,z:t.z,species});continue;}
   let r=hash(t.x,t.z,seed+11);
   for(const res of b.resources){if(!fits(res.where,p)){continue;}if(r<res.chance){out.push({id:`${res.kind}:${t.x},${t.z}`,kind:res.kind,x:t.x,z:t.z});break;}r-=res.chance;}}
  return out;
 }
 const taken=t=>entities([t]).length>0;
 // Fishing spots on water beside land, and enemies, by the biome's tables.
 function extras(list){
  const out=[];
  for(const t of list){const b=rule(t.biome);
   if(t.water){const land=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>tile(t.x+dx,t.z+dz)).find(n=>n&&!n.water&&!taken(n));
    if(land&&hash(t.x,t.z,seed+21)<b.fishing.spots)out.push({id:`fish:${t.x},${t.z}`,kind:'fishing',x:t.x,z:t.z,fish:b.fishing.fish[t.waterKind]||'rawFish'});continue;}
   if(b.enemies.density>0&&!t.shore&&hash(t.x,t.z,seed+31)<b.enemies.density&&!taken(t)){const e=pickEnemy(b.enemies.table,hash(t.x,t.z,seed+32));
    if(e)out.push({id:`${e.enemy}:${t.x},${t.z}`,kind:'enemy',enemy:e.enemy,aggressive:!!e.aggressive,x:t.x,z:t.z});}
  }
  return out;
 }
 const pickEnemy=(table,r)=>{if(!table.length)return null;const total=table.reduce((n,e)=>n+e.weight,0);let acc=0;for(const e of table){acc+=e.weight/total;if(r<acc)return e;}return table.at(-1);};
 // Ground cover (ground-cover.js kinds) for one chunk: at most one piece per tile, by the biome's list;
 // lily pads on still water.
 function cover(list){
  const out=[];
  for(const t of list){const r=hash(t.x,t.z,seed+80),r2=hash(t.x,t.z,seed+81),add=kind=>out.push({kind,x:t.x+(r2-.5)*.5,y:t.h,z:t.z+(r-.5)*.5,rotation:r2*6.28,scale:.9+r*.2});
   if(t.water){if(t.still&&r<.12)add('lilyPad');continue;}
   const b=rule(t.biome),p=placeOf(b,t);let left=r;
   for(const c of b.cover){if(!fits(c.where,p))continue;if(left<c.density){add(c.kind);break;}left-=c.density;}}
  return out;
 }
 // After repainting cells (the map's `cells` object is read live): forget what was worked out in a
 // rectangle of tiles, so it is generated again from the new paint. Painting reaches FORGET_MARGIN tiles
 // past its cells (borders blend and wander, ponds and shores follow the biome).
 function forget(x0,z0,x1,z1){for(const cache of [tiles,waterSeen])for(const k of [...cache.keys()]){const [x,z]=k.split(',').map(Number);if(x>=x0&&x<=x1&&z>=z0&&z<=z1)cache.delete(k);}}
 // The same paint in a new object (a map's data replaced by undo): read it from now on.
 const useCells=next=>{cells=next||{};};
 return {tile,entities,extras,cover,topColor,biomeAt,heightAt,rules,forget,useCells,
  // For the playground: what a tile is, in words.
  describe(x,z){const t=tile(x,z);return t?`${x},${z} · ${rule(t.biome).name} · height ${t.h}${t.water?` · ${t.waterKind}`:''}`:`${x},${z}: beyond the land`;}};
}
