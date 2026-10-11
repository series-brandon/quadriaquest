// Deterministic noise for generated land (countryside.js, the streaming test world): the same seed and
// coordinates always give the same values.
export const hash=(x,z,seed)=>{let h=(x*374761393+z*668265263+seed*2246822519)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;};
const smooth=t=>t*t*(3-2*t);
// Smooth 0–1 value noise with features about `scale` tiles across.
export function valueNoise(x,z,scale,seed){
 const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),tx=smooth(fx-x0),tz=smooth(fz-z0);
 const a=hash(x0,z0,seed),b=hash(x0+1,z0,seed),c=hash(x0,z0+1,seed),d=hash(x0+1,z0+1,seed);
 return a+(b-a)*tx+(c-a)*tz+(a-b-c+d)*tx*tz;
}
