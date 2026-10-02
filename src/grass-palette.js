import {Color} from 'three';

export const GRASS_BASE_COLOR='#358d3d'; // RGB 53, 141, 61
// Preserve the original tile variation, centered on the selected base.
const shades=['#b9ca89','#b4c484','#bdcc91','#b6c88b'].map(value=>new Color(value).getHSL({}));
const middle=shades.reduce((mean,shade)=>({h:mean.h+shade.h/shades.length,s:mean.s+shade.s/shades.length,l:mean.l+shade.l/shades.length}),{h:0,s:0,l:0});
export function createGrassColors(value=GRASS_BASE_COLOR){
  const base=new Color(value).getHSL({});
  return shades.map(shade=>new Color().setHSL(base.h+shade.h-middle.h,base.s+shade.s-middle.s,base.l+shade.l-middle.l));
}
