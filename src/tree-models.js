import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';

// Tree species (docs/WORLD.md, Green spaces): every tree is the same choppable resource (resource-entities.js,
// logs and the falling animation); a species only changes its look and the outline height. One cached
// merged mesh per species. 'oak' is the original tree.
const I=(r,detail=1)=>new THREE.IcosahedronGeometry(r,detail),C=(r0,r1,h,n=7)=>new THREE.CylinderGeometry(r0,r1,h,n),K=(r,h,n=8)=>new THREE.ConeGeometry(r,h,n),B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const part=(geometry,color,position,rotation,scale)=>({geometry,color,position,rotation,scale});
// Each tree (docs/TOWN.md, Reworked props): a tapered trunk with a flared foot and a branch or two, and a
// crown of clusters shaded darker underneath and lighter on top, so it reads round from any side.
const foot=(r,color)=>part(C(r*1.05,r*1.6,.16),color,[0,.08,0]);
const branch=(len,r,color,y,turn,tilt=.8)=>part(C(r*.6,r,len,5),color,[Math.sin(turn)*len*.35,y,Math.cos(turn)*len*.35],[Math.cos(turn)*tilt,0,-Math.sin(turn)*tilt]);
// Crown clusters: [x, y, z, radius, shade 0 (under) .. 2 (top)] in three tones.
const crown=(clusters,tones,squash=.92)=>clusters.map(([x,y,z,r,t])=>part(I(r),tones[t],[x,y,z],[0,x*2+z,0],[1,squash,1]));
export const TREE_SPECIES={
 oak:{name:'tree',height:2.9,parts:()=>[part(C(.09,.15,1.3),'#a68c6b',[0,.65,0]),foot(.15,'#a68c6b'),branch(.5,.06,'#a68c6b',1.05,.8),branch(.45,.055,'#a68c6b',1.15,3.6),
  ...crown([[0,1.22,0,.66,0],[.34,1.42,.18,.46,0],[-.36,1.4,-.12,.48,0],[.12,1.62,-.28,.44,1],[-.14,1.7,.24,.46,1],[.06,2.02,.02,.46,2],[.3,1.86,-.06,.3,2]],['#6f9159','#88aa6b','#a3c283'])]},
 birch:{name:'birch',height:3.1,parts:()=>[part(C(.07,.1,2),'#ece8de',[0,1,0]),foot(.1,'#ece8de'),
  ...[.35,.8,1.25,1.6].map((y,i)=>part(B(.16,.04,.16),'#4a4640',[0,y,0],[0,i*.7,0])),branch(.4,.035,'#ece8de',1.75,1.2,.9),branch(.36,.03,'#ece8de',1.9,4.2,.9),
  ...crown([[0,1.95,0,.44,0],[.26,1.72,.12,.32,0],[-.24,1.82,-.14,.34,1],[.16,2.2,-.12,.3,1],[-.1,2.32,.14,.3,2],[.04,2.55,-.02,.24,2]],['#a5bd5c','#b9cc6c','#d0de86'],1.15)]},
 pine:{name:'pine',height:3.4,parts:()=>[part(C(.08,.13,.9),'#7a5a3c',[0,.45,0]),foot(.13,'#7a5a3c'),
  // Tiers that droop a little, each turned against the one below, dark at the foot and lighter up top.
  ...[0,1,2,3].map(j=>part(K(.82-j*.17,.9-j*.1,8),['#365f42','#3f6b4a','#4b7a54','#5a8a60'][j],[0,1.05+j*.52,0],[0,j*.45,0])),part(K(.12,.3,6),'#5f9065',[0,3.12,0])]},
 willow:{name:'willow',height:2.7,parts:()=>[part(C(.12,.2,1.4),'#8a6f52',[0,.7,0]),foot(.2,'#8a6f52'),branch(.5,.07,'#8a6f52',1.3,.5,.7),branch(.5,.07,'#8a6f52',1.35,3.4,.7),
  part(I(.78),'#93b565',[0,1.75,0],[0,0,0],[1.15,.7,1.15]),part(I(.5),'#a9c879',[0,2.05,0],[0,0,0],[1.1,.6,1.1]),
  // Drooping fronds in two rings, the outer ones longer.
  ...Array.from({length:18},(_,i)=>{const outer=i%2,a=i/18*Math.PI*2+(outer?.17:0),r=outer?.86:.62,len=outer?1.05:.75;return part(B(.15,len,.05),outer?'#a9c879':'#8fb062',[Math.cos(a)*r,1.62-len/2+.1,Math.sin(a)*r],[0,-a,outer?.08:0]);})]},
 cherry:{name:'cherry tree',height:2.8,parts:()=>[part(C(.08,.14,1.2),'#6e4f42',[0,.6,0]),foot(.14,'#6e4f42'),part(C(.04,.06,.7),'#6e4f42',[.22,1.25,0],[0,0,-.7]),branch(.55,.05,'#6e4f42',1.2,3.6,.9),
  ...crown([[0,1.58,0,.56,0],[.4,1.45,.16,.4,0],[-.36,1.5,-.2,.42,0],[-.08,1.86,.26,.4,1],[.24,1.86,-.22,.38,1],[.06,2.12,-.04,.38,2]],['#e9a3b8','#f2b8c9','#fbd9e2'],.9),
  ...[[.5,.05,.4],[-.4,.05,.3],[.1,.05,-.55],[-.55,.05,-.2],[.62,.05,-.1]].map(p=>part(B(.07,.01,.07),'#f7cad6',p,[0,1,0]))]},
 maple:{name:'maple',height:2.9,parts:()=>[part(C(.09,.15,1.3),'#8a6a4c',[0,.65,0]),foot(.15,'#8a6a4c'),branch(.5,.06,'#8a6a4c',1.08,2.2),
  ...crown([[0,1.24,0,.62,0],[.36,1.4,.14,.42,0],[-.32,1.44,-.16,.44,1],[.1,1.66,-.26,.42,1],[-.08,1.98,.08,.42,2],[.26,1.82,.2,.3,2]],['#c95f34','#d9783d','#e8984a'])]},
};
export const TREE_SPECIES_NAMES=Object.keys(TREE_SPECIES);
export function makeTreeModel(species='oak'){
 const def=TREE_SPECIES[species]||TREE_SPECIES.oak,group=new THREE.Group();group.name='tree-'+(TREE_SPECIES[species]?species:'oak');
 group.add(cachedMergedMesh(species==='oak'||!TREE_SPECIES[species]?'tree':'tree:'+species,def.parts));return group;
}
