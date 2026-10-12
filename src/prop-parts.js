import * as THREE from 'three';

// Shared building blocks for prop models (props.js and src/prop-sets/): parts are
// {geometry, color, position, rotation, scale} merged into one mesh per kind (merged-model.js).
// Front is south (+z); a wall-mounted prop's back is against the north wall (z −0.5).
export const W=(color,geometry,position=[0,0,0],rotation=[0,0,0],scale)=>({geometry,color,position,rotation,scale});
export const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
export const C=(r0,r1,h,n=10)=>new THREE.CylinderGeometry(r0,r1,h,n);
export const S=(r,w=10,h=8)=>new THREE.SphereGeometry(r,w,h);
export const I=(r,detail=0)=>new THREE.IcosahedronGeometry(r,detail);
export const K=(r,h,n=8)=>new THREE.ConeGeometry(r,h,n);
export const COL={wood:'#8a5b3c',dark:'#5a3d28',light:'#b08a62',plank:'#9b754f',stone:'#b6afa3',pale:'#cfc8bb',iron:'#4b4651',gold:'#c9a24a',cloth:'#c8463d',canvas:'#efe6d2',leaf:'#6f9a55',leafDark:'#5f8a48',water:'#7fb4cf',straw:'#d9c27a',linen:'#eee6d3',blue:'#3d63a8',green:'#3f7d5b',flame:'#ffcf6b',glow:'#fff1c4',dungeon:'#5e5a52',dungeonDark:'#3d3a35',bone:'#e8e0cc',moss:'#6e7d4f'};
// A flame: a glowing cone, merged with the prop (glow points add a soft light-coloured sphere on top).
export const flame=(x,y,z,s=1)=>W(COL.flame,K(.05*s,.14*s,6),[x,y,z]);
// Work surfaces come to a slime's chest (bodies are .72 tall): counters, tables, desks and benches have
// their tops at SURFACE. lowerTo moves a piece modelled with its top board at `top` down to `to`: the
// board and everything on it shift down, and the legs and supports below shrink to fit.
export const SURFACE=.55;
// Seats sit a hand's width below that, so a seated slime rests at the table: SEAT is the seat top.
export const SEAT=.3;
export function lowerTo(parts,top,to=SURFACE){const k=to/top;
 return parts.map(p=>{const [x,y,z]=p.position;if(y>=top-.05)return {...p,position:[x,y+to-top,z]};
  const [sx,sy,sz]=p.scale||[1,1,1];return {...p,position:[x,y*k,z],scale:[sx,sy*k,sz]};});}
