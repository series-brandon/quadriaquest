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

// Shared detailed pieces (docs/TOWN.md, Reworked props): the most-used props are built from these, so a
// barrel, crate or lantern looks the same wherever it stands.
// A barrel standing on the ground at (x, z): bulging staves (a lathe), iron hoops near each end and either
// side of the belly, and a dark lid inset at the top. r: its widest radius, h: its height.
export function barrelParts(x=0,z=0,{r=.3,h=.74,wood='#8f6a46',lid=COL.dark,hoops=COL.iron,y=0,water=null}={}){
 const profile=[[0,0],[r*.84,0],[r*.94,h*.18],[r,h*.5],[r*.94,h*.82],[r*.84,h],[r*.78,h],[r*.78,h-.03],[0,h-.03]].map(([a,b])=>new THREE.Vector2(a,b));
 const hoop=(t,s)=>W(hoops,C(s+.012,s+.012,.035,12),[x,y+h*t,z]);
 return [W(wood,new THREE.LatheGeometry(profile,12),[x,y,z]),hoop(.1,r*.88),hoop(.9,r*.88),hoop(.36,r*.985),hoop(.64,r*.985),
  W(water||lid,C(r*.78,r*.78,.02,12),[x,y+h-.035,z])];
}
// A wooden crate: its boards, a dark frame on every edge and a brace across the front. at: its centre's
// foot; turn: about the vertical.
export function crateParts(w,h,d,{at=[0,0,0],turn=0,boards='#a07850',frame='#7a5838'}={}){
 const [x,y,z]=at,c=Math.cos(turn),s=Math.sin(turn),p=(dx,dy,dz)=>[x+dx*c+dz*s,y+dy,z-dx*s+dz*c],t=.05;
 const out=[W(boards,B(w-.02,h-.02,d-.02),p(0,h/2,0),[0,turn,0])];
 for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])out.push(W(frame,B(t,h,t),p(sx*(w/2-t/2+.005),h/2,sz*(d/2-t/2+.005)),[0,turn,0]));
 for(const sy of [0,1]){const yy=sy?h-t/2:t/2;out.push(W(frame,B(w,t,t),p(0,yy,d/2-t/2+.005),[0,turn,0]),W(frame,B(w,t,t),p(0,yy,-d/2+t/2-.005),[0,turn,0]),W(frame,B(t,t,d),p(w/2-t/2+.005,yy,0),[0,turn,0]),W(frame,B(t,t,d),p(-w/2+t/2-.005,yy,0),[0,turn,0]));}
 out.push(W(frame,B(Math.hypot(w,h)*.82,t,.02),p(0,h/2,d/2+.006),[0,turn,Math.atan2(h,w)]));
 return out;
}
// A lantern hanging or standing at (x, y, z) (y: its glass's middle; put the prop's glow point there):
// a base plate, four corner bars round warm glass, a pyramid roof and a finial.
export const LANTERN_GLASS='#ffe3a1';
export function lanternParts(x,y,z,{size=.22,metal=COL.iron}={}){
 const g=size/2,hgt=size*1.15;
 return [W(metal,B(size+.08,.035,size+.08),[x,y-hgt/2-.02,z]),W(LANTERN_GLASS,B(size,hgt,size),[x,y,z]),
  ...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,b])=>W(metal,B(.025,hgt+.02,.025),[x+a*g,y,z+b*g])),
  W(metal,B(size+.06,.03,size+.06),[x,y+hgt/2+.015,z]),W(metal,K((size+.1)*.72,size*.7,4),[x,y+hgt/2+.03+size*.35,z],[0,Math.PI/4,0]),W(metal,S(.03,6,4),[x,y+hgt/2+.06+size*.7,z])];
}
