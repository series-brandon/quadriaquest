import {key} from './world.js';

// Prefer the near (south) side, then try the other cardinal neighbors.
export function portalSpawn(map,crystal){
 if(!crystal)return null;
 for(const [dx,dz]of [[0,1],[1,0],[0,-1],[-1,0]]){
  const tile=map.get(key(crystal.x+dx,crystal.z+dz));
  if(tile&&!tile.blocked&&!tile.water&&Math.abs(tile.h-crystal.h)<=.5)return tile;
 }
 return null;
}
