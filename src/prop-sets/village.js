import * as THREE from 'three';
import {W,B,C,S,I,K,COL} from '../prop-parts.js';

// Village and coast (docs/TOWN.md, Prop palette): what a village by a river mouth needs. Props here may
// use the shared options (props.js):
//   water: 'any' (land or water tiles) or 'only' (water tiles: a moored boat);
//   deck: water tiles under it become walkable boards at ground level (1), the water still shown below;
//   spin: {pivot, axis, speed, parts}: a part that turns (the waterwheel).
// A deck's top is at y 0 (ground level); water lies half a block below.
const T=(r,tube,n=8,m=20)=>new THREE.TorusGeometry(r,tube,n,m);
const SAIL='#e9dfc8',RED='#c8463d',WHITE='#f3efe6',ROCK='#9c9890',WET='#6f8f9f';
// A plank deck on posts, a little lower than the bank, with gaps between boards.
const planks=(w,d,color=COL.plank)=>[...[-.36,-.12,.12,.36].map(z=>W(color,B(w,.08,.22*d),[0,-.04,z*d])),W(COL.dark,B(w,.06,.08),[0,-.11,-.47*d]),W(COL.dark,B(w,.06,.08),[0,-.11,.47*d])];
const posts=xz=>xz.map(([x,z])=>W(COL.dark,C(.07,.08,.9,8),[x,-.45,z]));
// Rows of crops across a tile.
const rows=(n,fn)=>Array.from({length:n},(_,i)=>fn(-.33+i*.33));
export const VILLAGE={
 waterwheel:{name:'Waterwheel',footprint:[1,2],policy:'solid',sight:false,water:'any',
  // The axle housing on the bank side; the wheel turns about x (its plane runs along the footprint).
  parts:()=>[W(COL.dark,B(.3,.9,.3),[-.38,.45,-.85]),W(COL.dark,B(.3,.9,.3),[-.38,.45,.85]),W(COL.wood,B(.12,.12,1.9),[-.38,.85,0])],
  spin:{pivot:[0,.75,0],axis:'x',speed:-.6,parts:()=>[W(COL.wood,C(.12,.12,.5,10),[0,0,0],[0,0,Math.PI/2]),
   ...[-.2,.2].map(x=>W(COL.dark,T(1.12,.05,6,24),[x,0,0],[0,Math.PI/2,0])),
   ...Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return W(COL.wood,B(.06,2.2,.08),[0,0,0],[a,0,0]);}),
   ...Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return W(COL.plank,B(.5,.06,.32),[0,Math.cos(a)*1.12,Math.sin(a)*1.12],[a,0,0]);})]}},
 cabbageRow:{name:'Cabbage row',footprint:[1,1],policy:'walk',parts:()=>[W('#8a6a4a',B(.95,.06,.95),[0,.03,0]),
  ...rows(3,z=>[-.3,0,.3].map(x=>W(x?'#7fae5a':'#93c06a',S(.13,8,6),[x,.13,z],[0,0,0],[1,.8,1]))).flat()]},
 wheatRow:{name:'Wheat row',footprint:[1,1],policy:'walk',parts:()=>[W('#8a6a4a',B(.95,.06,.95),[0,.03,0]),
  ...rows(3,z=>[-.3,-.1,.1,.3].flatMap((x,i)=>[W('#b9a35a',C(.012,.012,.62,4),[x,.34,z+(i%2?.04:-.04)]),W(COL.straw,C(.035,.02,.16,5),[x,.7,z+(i%2?.04:-.04)])])).flat()]},
 scarecrow:{name:'Scarecrow',footprint:[1,1],policy:'solid',parts:()=>[W(COL.wood,B(.08,1.6,.08),[0,.8,0]),W(COL.wood,B(1.1,.07,.07),[0,1.2,0]),
  W('#7d5a8c',B(.5,.55,.24),[0,1.1,0]),W(COL.straw,S(.2,8,6),[0,1.58,0]),W('#6b5236',C(.32,.32,.04,10),[0,1.72,0]),W('#6b5236',C(.14,.18,.2,10),[0,1.82,0]),
  ...[-1,1].map(s=>W(COL.straw,K(.07,.18,5),[s*.6,1.2,0],[0,0,s*Math.PI/2]))]},
 shrine:{name:'Shrine',footprint:[1,1],policy:'solid',interaction:{verb:'gaze',label:'Look at shrine'},spots:[{kind:'gaze',at:[0,1],facing:'n'}],glow:[[0,.86,.16,.06]],
  parts:()=>[W(COL.stone,B(.8,.2,.7),[0,.1,0]),W(COL.pale,B(.56,.7,.46),[0,.55,-.04]),W('#3d3a35',B(.34,.42,.04),[0,.62,.2]),W(COL.gold,S(.08,8,6),[0,.66,.18]),
   W('#5d6b7d',K(.52,.36,4),[0,1.08,-.04],[0,Math.PI/4,0]),W(COL.cloth,B(.3,.04,.1),[0,.22,.38])]},
 quay:{name:'Quay',footprint:[1,1],policy:'walk',water:'any',deck:1,parts:()=>[W(COL.stone,B(1,.62,1),[0,-.31,0]),W(COL.pale,B(1.02,.06,1.02),[0,-.03,0]),W('#8f887d',B(1.02,.08,1.02),[0,-.5,0])]},
 jetty:{name:'Jetty',footprint:[1,1],policy:'walk',water:'any',deck:1,parts:()=>[...planks(1,1),...posts([[-.42,-.42],[.42,-.42],[-.42,.42],[.42,.42]])]},
 mooringPost:{name:'Mooring post',footprint:[1,1],policy:'solid',water:'any',parts:()=>[W(COL.dark,C(.12,.14,1.1,8),[0,.2,0]),W(COL.dark,C(.16,.16,.08,8),[0,.78,0]),W('#c9b27a',T(.15,.03,5,12),[0,.55,0],[Math.PI/2,0,0])]},
 rowboat:{name:'Rowboat',footprint:[1,2],policy:'solid',water:'only',
  parts:()=>[W('#7a5236',B(.62,.24,1.5),[0,.08,0]),W('#8a5b3c',B(.7,.08,1.58),[0,.22,0]),W('#5a3d28',K(.31,.4,4),[0,.08,.94],[Math.PI/2,Math.PI/4,0],[1,1,.6]),
   W('#5a3d28',K(.31,.3,4),[0,.08,-.9],[-Math.PI/2,Math.PI/4,0],[1,1,.6]),W(COL.plank,B(.6,.05,.18),[0,.2,-.2]),W(COL.plank,B(.6,.05,.18),[0,.2,.35]),
   W(COL.light,B(.04,.04,1.2),[.22,.28,.1],[.1,.3,0]),W(COL.light,B(.14,.02,.3),[.32,.24,.62],[0,.3,0])]},
 lighthouse:{name:'Lighthouse',footprint:[2,2],policy:'solid',sight:false,glow:[[0,5.15,0,.32]],
  parts:()=>[W(COL.stone,C(1,1.05,.4,14),[0,.2,0]),...[0,1,2,3].map(i=>W(i%2?RED:WHITE,C(.78-i*.08,.82-i*.08,1.1,14),[0,.95+i*1.1,0])),
   W(COL.iron,C(.62,.62,.08,14),[0,4.85,0]),W('#fff3c4',C(.4,.4,.55,10),[0,5.15,0]),W(COL.iron,K(.55,.5,10),[0,5.68,0]),W('#3d3a35',B(.4,.7,.06),[0,.55,.98])]},
 shipwreck:{name:'Shipwreck',footprint:[3,2],policy:'solid',sight:false,water:'any',
  parts:()=>[W('#6a4a32',B(2.6,.7,1.3),[0,.2,0],[0,.15,.22]),W('#5a3d28',K(.68,1,4),[1.6,.25,0],[0,0,-Math.PI/2],[1,1,1.3]),
   ...[-.8,-.3,.2].map(x=>W('#4a3424',B(.08,.9,1.4),[x,.55,0],[0,0,.25])),W(COL.dark,C(.07,.09,1.8,8),[.3,1.1,0],[.5,0,.35]),
   W('#d8cdb2',B(.02,.7,.6),[.5,1.5,.1],[.5,0,.35]),W(COL.moss,B(.9,.05,.5),[-.6,.58,.2],[0,.15,.22])]},
 tidePools:{name:'Tide pools',footprint:[1,1],policy:'walk',parts:()=>[...[[-.28,-.2,.18],[.25,-.25,.14],[.2,.25,.16],[-.25,.28,.12],[0,0,.1]].map(([x,z,r])=>W(ROCK,I(r,0),[x,r*.4,z],[0,0,0],[1.2,.6,1])),
  W(WET,C(.22,.22,.02,10),[-.02,.02,.02]),W('#e07a4f',C(.05,.05,.02,5),[.05,.04,.08]),W('#b58ad6',S(.035,6,4),[-.1,.04,-.05])]},
 sawhorse:{name:'Sawhorse',footprint:[2,1],policy:'low',
  parts:()=>[...[-.6,.6].flatMap(x=>[W(COL.wood,B(.06,.6,.06),[x,.3,-.18],[.3,0,0]),W(COL.wood,B(.06,.6,.06),[x,.3,.18],[-.3,0,0])]),W(COL.wood,B(1.5,.08,.1),[0,.58,0]),
   W('#8a6a4a',C(.13,.14,1.3,8),[.1,.74,0],[0,0,Math.PI/2]),W(COL.iron,B(.5,.04,.1),[-.35,.8,.12],[0,.4,0])]},
};
