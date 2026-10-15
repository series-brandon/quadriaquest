import {Color} from 'three';

// Wall and floor paint (docs/TOWN.md, Wall and floor paint). A floor carries
//   paint: {floor: {'dx,dz': colour}, walls: {'dx,dz,side': colour}}
// local to its building's north-west tile (the plan's x0, z0): a floor tile's colour, and the colour of a
// wall's face as seen from the tile beside it (side: n, e, s, w, the way from that tile to the wall). An
// in-place building's ground floor keeps its paint on the building entry (`paint`); every other floor, a
// separate ground floor and a dungeon's levels, on their floor entry. Any colour.
export const sideToward=(p,q)=>q.x>p.x?'e':q.x<p.x?'w':q.z>p.z?'s':'n';
export const paintKey=(plan,t)=>`${t.x-plan.x0},${t.z-plan.z0}`;
// The colours of an edge's two faces, {a, b} (from tiles a and b), or null when neither is painted.
export function wallPaint(paint,plan,a,b){
 if(!paint?.walls||!plan||!a||!b)return null;const face=(p,q)=>paint.walls[`${paintKey(plan,p)},${sideToward(p,q)}`]||null,out={a:face(a,b),b:face(b,a)};
 return out.a||out.b?out:null;}
// A painted floor tile's two colours (a checker, as every surface has), or null.
const shade=new Color();
export function floorPalette(paint,plan,t){const c=paint?.floor?.[paintKey(plan,t)];if(!c)return null;return [c,'#'+shade.set(c).offsetHSL(0,0,-.035).getHexString()];}
