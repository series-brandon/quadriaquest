import {key} from './world.js';

// Where you step off an Iter Crystal: a tile beside its footprint (tile.crystalFootprint, 2 × 2; just the
// tile otherwise), preferring the near (south) side, then east, north and west.
export function portalSpawn(map,crystal,occupied=()=>false){
 if(!crystal)return null;
 const foot=crystal.crystalFootprint||[crystal],xs=foot.map(t=>t.x),zs=foot.map(t=>t.z),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs),near=[];
 for(let x=x0;x<=x1;x++)near.push([x,z1+1]);for(let z=z0;z<=z1;z++)near.push([x1+1,z]);
 for(let x=x0;x<=x1;x++)near.push([x,z0-1]);for(let z=z0;z<=z1;z++)near.push([x0-1,z]);
 for(const [x,z] of near){
  const tile=map.get(key(x,z));
  if(tile&&!occupied(tile)&&!tile.blocked&&!tile.water&&Math.abs(tile.h-crystal.h)<=.5)return tile;
 }
 return null;
}
