import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';

// Tree species: one per Lumberjack tier (lumberjack.js owns level, wood and effort; docs/WORLD.md, Green
// spaces). A species only sets the look, the outline height and its stump (bark colour, trunk radius). One cached merged mesh per species,
// listed lowest tier first.
const I=(r,detail=1)=>new THREE.IcosahedronGeometry(r,detail),C=(r0,r1,h,n=7)=>new THREE.CylinderGeometry(r0,r1,h,n),K=(r,h,n=8)=>new THREE.ConeGeometry(r,h,n),B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const part=(geometry,color,position,rotation,scale)=>({geometry,color,position,rotation,scale});
// Each tree (docs/TOWN.md, Reworked props): a tapered trunk with a flared foot and a branch or two, and a
// crown of clusters shaded darker underneath and lighter on top, so it reads round from any side.
const foot=(r,color)=>part(C(r*1.05,r*1.6,.16),color,[0,.08,0]);
const branch=(len,r,color,y,turn,tilt=.8)=>part(C(r*.6,r,len,5),color,[Math.sin(turn)*len*.35,y,Math.cos(turn)*len*.35],[Math.cos(turn)*tilt,0,-Math.sin(turn)*tilt]);
// Crown clusters: [x, y, z, radius, shade 0 (under) .. 2 (top)] in three tones.
const crown=(clusters,tones,squash=.92)=>clusters.map(([x,y,z,r,t])=>part(I(r),tones[t],[x,y,z],[0,x*2+z,0],[1,squash,1]));
// A weeping peak for the willow: a leaning stem topped by a small dome with fronds hanging round it.
const weepingPeak=(turn,lean,len,tones)=>{
 const tx=Math.sin(turn)*Math.sin(lean)*len,tz=Math.cos(turn)*Math.sin(lean)*len,top=[tx,.75+Math.cos(lean)*len,tz];
 return [part(C(.035,.06,len,5),'#7d6a52',[tx/2,.75+Math.cos(lean)*len/2,tz/2],[Math.cos(turn)*lean,0,-Math.sin(turn)*lean]),
  part(I(.36),tones[1],top,[0,turn,0],[1.15,.55,1.15]),part(I(.2),tones[2],[top[0],top[1]+.12,top[2]],[0,turn,0],[1,.6,1]),
  ...Array.from({length:11},(_,i)=>{const a=i/11*Math.PI*2+turn,r=.36,l=.7+(i%3)*.16;return part(B(.08,l,.035),tones[i%2],[top[0]+Math.cos(a)*r,top[1]-l/2+.02,top[2]+Math.sin(a)*r],[0,-a,.1]);})];
};
export const TREE_SPECIES={
 // Poplar: a pale, narrow column of fresh leaves on a white-barked trunk.
 poplar:{bark:'#e3ddcf',trunk:0.11,height:3.5,parts:()=>[part(C(.07,.11,1.1),'#e3ddcf',[0,.55,0]),foot(.11,'#e3ddcf'),
  ...[.3,.62,.9].map((y,i)=>part(B(.14,.035,.14),'#59544b',[0,y,0],[0,i*.9,0])),
  ...[[0,1.35,0,.42,0],[.08,1.75,.06,.4,0],[-.07,2.1,-.05,.38,1],[.05,2.45,.04,.34,1],[-.03,2.78,0,.28,2],[0,3.05,.02,.2,2]].map(([x,y,z,r,t])=>part(I(r),['#86ab55','#9cbf66','#b7d47e'][t],[x,y,z],[0,y*2,0],[.95,1.45,.95]))]},
 // Asla (balsa): a tall, slim, smooth grey trunk under a light, flat umbrella of big leaves.
 asla:{bark:'#cfc9bb',trunk:0.15,height:3.2,parts:()=>[part(C(.09,.15,1.9),'#cfc9bb',[0,.95,0]),foot(.15,'#cfc9bb'),branch(.62,.06,'#cfc9bb',1.78,.6,1.05),branch(.6,.055,'#cfc9bb',1.84,2.7,1.05),branch(.56,.05,'#cfc9bb',1.9,4.7,1.05),
  ...crown([[0,2.2,0,.6,0],[.66,2.06,.2,.48,0],[-.62,2.1,-.24,.5,0],[.2,2.08,-.66,.46,0],[-.26,2.12,.62,.46,1],[.4,2.36,.36,.4,1],[-.38,2.38,-.3,.4,1],[.04,2.5,.02,.42,2]],['#8fbf5e','#a6d273','#c0e391'],.55)]},
 pine:{bark:'#7a5a3c',trunk:0.13,height:3.4,parts:()=>[part(C(.08,.13,.9),'#7a5a3c',[0,.45,0]),foot(.13,'#7a5a3c'),
  // Tiers that droop a little, each turned against the one below, dark at the foot and lighter up top.
  ...[0,1,2,3].map(j=>part(K(.82-j*.17,.9-j*.1,8),['#365f42','#3f6b4a','#4b7a54','#5a8a60'][j],[0,1.05+j*.52,0],[0,j*.45,0])),part(K(.12,.3,6),'#5f9065',[0,3.12,0])]},
 oak:{bark:'#a68c6b',trunk:0.15,height:2.9,parts:()=>[part(C(.09,.15,1.3),'#a68c6b',[0,.65,0]),foot(.15,'#a68c6b'),branch(.5,.06,'#a68c6b',1.05,.8),branch(.45,.055,'#a68c6b',1.15,3.6),
  ...crown([[0,1.22,0,.66,0],[.34,1.42,.18,.46,0],[-.36,1.4,-.12,.48,0],[.12,1.62,-.28,.44,1],[-.14,1.7,.24,.46,1],[.06,2.02,.02,.46,2],[.3,1.86,-.06,.3,2]],['#6f9159','#88aa6b','#a3c283'])]},
// Willow: a few small weeping peaks on stems that split from one short trunk.
 willow:{bark:'#7d6a52',trunk:0.17,height:2.9,parts:()=>{const tones=['#8fb062','#a4c474','#bcd78e'];return [part(C(.1,.17,.8),'#7d6a52',[0,.4,0]),foot(.17,'#7d6a52'),
  ...weepingPeak(.4,.62,1.2,tones),...weepingPeak(2.5,.7,.95,tones),...weepingPeak(4.4,.5,1.45,tones)];}},
 maple:{bark:'#8a6a4c',trunk:0.15,height:2.9,parts:()=>[part(C(.09,.15,1.3),'#8a6a4c',[0,.65,0]),foot(.15,'#8a6a4c'),branch(.5,.06,'#8a6a4c',1.08,2.2),
  ...crown([[0,1.24,0,.62,0],[.36,1.4,.14,.42,0],[-.32,1.44,-.16,.44,1],[.1,1.66,-.26,.42,1],[-.08,1.98,.08,.42,2],[.26,1.82,.2,.3,2]],['#c95f34','#d9783d','#e8984a'])]},
 // Walnut: a stout dark trunk under a broad, low, spreading crown.
 walnut:{bark:'#5e4634',trunk:0.2,height:2.7,parts:()=>[part(C(.12,.2,1.05),'#5e4634',[0,.52,0]),foot(.2,'#5e4634'),branch(.62,.07,'#5e4634',.98,.9,1),branch(.6,.07,'#5e4634',1,3.9,1),
  ...crown([[0,1.5,0,.6,0],[.62,1.38,.2,.46,0],[-.6,1.42,-.18,.48,0],[.18,1.44,-.58,.44,0],[-.2,1.46,.58,.44,1],[.34,1.74,.28,.4,1],[-.32,1.76,-.26,.4,1],[.02,1.96,0,.42,2]],['#55753f','#668a4b','#7d9f5d'],.72),
  ...[[.55,1.2,.5],[-.6,1.18,.36],[.3,1.15,-.66],[-.45,1.2,-.5]].map(p=>part(I(.05,0),'#a3b85e',p))]},
 // Ironwood: a gnarled, near-black trunk holding a compact, angular crown of dark olive leaves.
 ironwood:{bark:'#3f3632',trunk:0.19,height:2.7,parts:()=>[part(C(.11,.19,.75),'#3f3632',[0,.38,0]),foot(.19,'#3f3632'),part(C(.07,.11,.7),'#3f3632',[.12,1.02,.02],[0,0,-.35]),part(C(.06,.1,.7),'#3f3632',[-.14,1.05,0],[0,0,.42]),branch(.42,.05,'#3f3632',1.2,4.6,1.1),
  ...[[0,1.72,0,.5,0],[.36,1.6,.14,.36,0],[-.38,1.62,-.1,.38,0],[.1,1.94,-.24,.36,1],[-.14,1.98,.22,.36,1],[.04,2.24,0,.32,2]].map(([x,y,z,r,t])=>part(I(r,0),['#4b5a39','#5a6a44','#6c7c51'][t],[x,y,z],[.3,x*3+z,.2],[1,.85,1]))]},
 mungil:{bark:'#5d4a3b',trunk:0.2,height:2.7,parts:()=>[part(C(.12,.2,1.4),'#5d4a3b',[0,.7,0]),foot(.2,'#5d4a3b'),branch(.5,.07,'#5d4a3b',1.3,.5,.7),branch(.5,.07,'#5d4a3b',1.35,3.4,.7),
  part(I(.78),'#5f8a4a',[0,1.75,0],[0,0,0],[1.15,.7,1.15]),part(I(.5),'#76a05c',[0,2.05,0],[0,0,0],[1.1,.6,1.1]),
  // Drooping fronds in two rings, the outer ones longer.
  ...Array.from({length:18},(_,i)=>{const outer=i%2,a=i/18*Math.PI*2+(outer?.17:0),r=outer?.86:.62,len=outer?1.05:.75;return part(B(.15,len,.05),outer?'#76a05c':'#567f43',[Math.cos(a)*r,1.62-len/2+.1,Math.sin(a)*r],[0,-a,outer?.08:0]);}),
  // Lignum's small blue blossoms dotted over the crown's surface.
  ...Array.from({length:14},(_,i)=>{const a=i*2.4,e=.25+(i%4)*.3;return part(B(.11,.07,.11),'#8ea6e6',[Math.cos(a)*Math.cos(e)*.92,1.75+Math.sin(e)*.56,Math.sin(a)*Math.cos(e)*.92],[0,a,0]);})]},
 cherry:{bark:'#6e4f42',trunk:0.14,height:2.8,parts:()=>[part(C(.08,.14,1.2),'#6e4f42',[0,.6,0]),foot(.14,'#6e4f42'),part(C(.04,.06,.7),'#6e4f42',[.22,1.25,0],[0,0,-.7]),branch(.55,.05,'#6e4f42',1.2,3.6,.9),
  ...crown([[0,1.58,0,.56,0],[.4,1.45,.16,.4,0],[-.36,1.5,-.2,.42,0],[-.08,1.86,.26,.4,1],[.24,1.86,-.22,.38,1],[.06,2.12,-.04,.38,2]],['#e9a3b8','#f2b8c9','#fbd9e2'],.9),
  ...[[.5,.05,.4],[-.4,.05,.3],[.1,.05,-.55],[-.55,.05,-.2],[.62,.05,-.1]].map(p=>part(B(.07,.01,.07),'#f7cad6',p,[0,1,0]))]},
};
export const TREE_SPECIES_NAMES=Object.keys(TREE_SPECIES);
export function makeTreeModel(species='poplar'){
 const id=TREE_SPECIES[species]?species:'poplar',group=new THREE.Group();group.name='tree-'+id;
 group.add(cachedMergedMesh(id==='oak'?'tree':'tree:'+id,TREE_SPECIES[id].parts));return group;
}
// The stump a felled tree leaves until it regrows (resource-entities.js): its own bark and trunk size,
// with a pale cut face and growth ring. One cached merged mesh per species.
export function makeStumpModel(species='poplar'){
 const id=TREE_SPECIES[species]?species:'poplar',{bark,trunk}=TREE_SPECIES[id],r=Math.max(.12,trunk*1.1),group=new THREE.Group();group.name='stump-'+id;
 group.add(cachedMergedMesh('stump:'+id,()=>[part(C(r,r*1.18,.3),bark,[0,.15,0]),foot(r*.95,bark),part(C(r*.9,r*.92,.03),'#e4cc9c',[0,.31,0]),
  part(C(r*.45,r*.45,.034),'#c9a670',[0,.312,0]),part(B(.07,.05,.045),bark,[r*.78,.31,0],[0,0,.5])]));
 return group;
}
