import {Color} from 'three';

// Wall and floor paint (docs/TOWN.md, Wall and floor paint). A floor carries
//   paint: {floor: {'dx,dz': colour (and pattern: floorPaint)}, walls: {'dx,dz,side': colour}}
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
// Floor patterns (docs/TOWN.md, Floor patterns): a painted floor tile is its colour, or
//   'colour pattern intensity' (e.g. '#e8c8a0 stripes-ns 40')
// for a pattern of small tweaks on that colour, laid out by the tile's place in its building (so it moves with it):
//  - plain: the colour itself;
//  - checker: it and a tweak, alternating;
//  - stripes-ns / stripes-ew: the two in stripes running north–south (alternating across x) / east–west (across z);
//  - random: five tweaks of it, scattered (the same every time).
// intensity: 0 (no difference: plain) … 100 (high contrast). A bare colour is the checker at its old intensity.
export const FLOOR_PATTERNS=['plain','checker','stripes-ns','stripes-ew','random'],FLOOR_INTENSITY=15;
export function floorPaint(color,pattern='checker',intensity=FLOOR_INTENSITY){intensity=Math.round(Math.max(0,Math.min(100,+intensity)));
 return pattern==='checker'&&intensity===FLOOR_INTENSITY?color:`${color} ${FLOOR_PATTERNS.includes(pattern)?pattern:'checker'} ${intensity}`;}
export function parseFloorPaint(value){const [color,pattern='checker',i]=String(value).split(' ');return {color,pattern,intensity:i===undefined?FLOOR_INTENSITY:+i};}
const shade=new Color(),hsl={h:0,s:0,l:0};
// A tweak of a colour: lighter or darker by `by` (towards whichever side has room), and turned a little.
function tweak(color,by,hue=0,sat=0){shade.set(color).getHSL(hsl);const l=hsl.l+(hsl.l<.35?Math.abs(by):-Math.abs(by))*Math.sign(by||1);
 shade.setHSL((hsl.h+hue+1)%1,Math.max(0,Math.min(1,hsl.s+sat)),Math.max(0,Math.min(1,l)));return '#'+shade.getHexString();}
const VARIANTS=[[0,0,0],[.55,.012,-.04],[-.45,-.01,.03],[1,0,-.02],[-.85,.02,.05]];
// A tile's colour in a floor's pattern, by its place (dx, dz) in the building.
export function floorTileColor(value,dx,dz){const {color,pattern,intensity}=parseFloorPaint(value),by=intensity/100*.3;
 if(!by||pattern==='plain')return '#'+shade.set(color).getHexString();
 if(pattern==='random'){const n=(Math.imul(dx|0,73856093)^Math.imul(dz|0,19349663)^Math.imul((dx+dz)|0,83492791))>>>0,[l,h,s]=VARIANTS[n%VARIANTS.length];return l?tweak(color,l*by,h*by*3,s*by*3):'#'+shade.set(color).getHexString();}
 const odd=(pattern==='stripes-ns'?dx:pattern==='stripes-ew'?dz:dx+dz)&1;
 return odd?tweak(color,by):'#'+shade.set(color).getHexString();}
// A painted floor tile's colours (the pair every surface has, both its own), or null.
export function floorPalette(paint,plan,t){const v=paint?.floor?.[paintKey(plan,t)];if(!v)return null;const c=floorTileColor(v,t.x-plan.x0,t.z-plan.z0);return [c,c];}
