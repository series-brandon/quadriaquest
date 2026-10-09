// Playground-only test content for the chunk streamer: a deterministic 512 × 512 landscape of block
// hills, lakes and plateaus with trees, boulders and ground items. Same seed, same world. The real
// world will be authored content; this only exercises streaming at scale.
export const STREAM_WORLD_SIZE=512;
const hash=(x,z,seed)=>{let h=(x*374761393+z*668265263+seed*2246822519)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;};
const smooth=t=>t*t*(3-2*t);
function valueNoise(x,z,scale,seed){
 const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),tx=smooth(fx-x0),tz=smooth(fz-z0);
 const a=hash(x0,z0,seed),b=hash(x0+1,z0,seed),c=hash(x0,z0+1,seed),d=hash(x0+1,z0+1,seed);
 return a+(b-a)*tx+(c-a)*tz+(a-b-c+d)*tx*tz;
}
// 0–1 elevation: broad continents, rolling hills and a little roughness.
function elevation(x,z,seed){return valueNoise(x,z,96,seed)*.6+valueNoise(x,z,28,seed+1)*.3+valueNoise(x,z,9,seed+2)*.1;}

export function createStreamWorld({seed=7}={}){
 const size=STREAM_WORLD_SIZE,center=size/2;
 // A tile, or null outside the world. Heights step in half blocks like the hand-built areas.
 function tile(x,z){
  if(x<0||z<0||x>=size||z>=size)return null;
  const e=elevation(x,z,seed);
  if(e<.36)return {x,z,h:.5,water:true,blocked:true};
  return {x,z,h:1+Math.min(6,Math.floor((e-.36)*14))*.5,water:false,blocked:false};
 }
 // Resource placements for the tiles of one chunk; ids are stable across loads.
 function entities(tiles){
  const out=[];
  for(const t of tiles){
   if(t.water)continue;const r=hash(t.x,t.z,seed+9);
   const kind=r<.045?'tree':r<.055?'boulder':r<.063?'sticks':r<.07?'stones':null;
   if(kind)out.push({id:`${kind}:${t.x},${t.z}`,kind,x:t.x,z:t.z});
  }
  return out;
 }
 // The land tile nearest the middle of the world, for arrival.
 function spawn(){for(let r=0;r<64;r++)for(let dx=-r;dx<=r;dx++)for(const dz of [-r,r]){const t=tile(center+dx,center+dz);if(t&&!t.water&&hash(t.x,t.z,seed+9)>=.07)return t;}return tile(center,center);}
 return {size,tile,entities,spawn};
}
