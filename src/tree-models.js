import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';

// Tree species (docs/WORLD.md, Green spaces): every tree is the same choppable resource (resource-entities.js,
// logs and the falling animation); a species only changes its look and the outline height. One cached
// merged mesh per species. 'oak' is the original tree.
const I=(r,detail=1)=>new THREE.IcosahedronGeometry(r,detail),C=(r0,r1,h,n=7)=>new THREE.CylinderGeometry(r0,r1,h,n),K=(r,h,n=8)=>new THREE.ConeGeometry(r,h,n),B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const part=(geometry,color,position,rotation,scale)=>({geometry,color,position,rotation,scale});
export const TREE_SPECIES={
 oak:{name:'tree',height:2.9,parts:()=>[part(C(.09,.15,1.3),'#a68c6b',[0,.65,0]),
  ...[0,1,2].map(j=>part(I(.72-j*.13),['#799b62','#95b575','#a9c589'][j],[Math.sin(j*3)*.19,1.25+j*.38,Math.cos(j*3)*.12],[0,0,0],[1,.95,1]))]},
 birch:{name:'birch',height:3.1,parts:()=>[part(C(.07,.1,2),'#ece8de',[0,1,0]),
  ...[.35,.8,1.25,1.6].map((y,i)=>part(B(.16,.04,.16),'#4a4640',[0,y,0],[0,i*.7,0])),
  ...[[0,2,0,.48],[.22,1.7,.1,.36],[-.2,1.8,-.12,.38],[.05,2.35,-.05,.32]].map(([x,y,z,r],i)=>part(I(r),['#b7c96a','#c7d77a','#a8bf5e','#d2df8a'][i],[x,y,z],[0,0,0],[1,1.15,1]))]},
 pine:{name:'pine',height:3.4,parts:()=>[part(C(.08,.13,.9),'#7a5a3c',[0,.45,0]),
  ...[0,1,2].map(j=>part(K(.78-j*.2,1.1-j*.15,8),['#3f6b4a','#4b7a54','#58885f'][j],[0,1.15+j*.62,0],[0,j*.4,0]))]},
 willow:{name:'willow',height:2.7,parts:()=>[part(C(.12,.2,1.4),'#8a6f52',[0,.7,0]),part(I(.78),'#9fbf6e',[0,1.75,0],[0,0,0],[1.15,.7,1.15]),
  // Drooping fronds all around the crown.
  ...Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2,r=.72+(i%3)*.08;return part(B(.16,.95-(i%2)*.2,.06),i%2?'#a9c879':'#8fb062',[Math.cos(a)*r,1.25-(i%2)*.1,Math.sin(a)*r],[0,-a,0]);})]},
 cherry:{name:'cherry tree',height:2.8,parts:()=>[part(C(.08,.14,1.2),'#6e4f42',[0,.6,0]),part(C(.04,.06,.7),'#6e4f42',[.22,1.25,0],[0,0,-.7]),
  ...[[0,1.6,0,.62],[.38,1.45,.15,.42],[-.32,1.5,-.18,.44],[.08,2.02,-.08,.4]].map(([x,y,z,r],i)=>part(I(r),['#f2b8c9','#f7cad6','#e9a3b8','#fbd9e2'][i],[x,y,z],[0,0,0],[1,.9,1])),
  ...[[.5,.05,.4],[-.4,.05,.3],[.1,.05,-.55]].map(p=>part(B(.07,.01,.07),'#f7cad6',p,[0,1,0]))]},
 maple:{name:'maple',height:2.9,parts:()=>[part(C(.09,.15,1.3),'#8a6a4c',[0,.65,0]),
  ...[0,1,2].map(j=>part(I(.7-j*.12),['#d9783d','#e8984a','#c95f34'][j],[Math.sin(j*2.4)*.2,1.25+j*.36,Math.cos(j*2.4)*.14],[0,0,0],[1,.92,1]))]},
};
export const TREE_SPECIES_NAMES=Object.keys(TREE_SPECIES);
export function makeTreeModel(species='oak'){
 const def=TREE_SPECIES[species]||TREE_SPECIES.oak,group=new THREE.Group();group.name='tree-'+(TREE_SPECIES[species]?species:'oak');
 group.add(cachedMergedMesh(species==='oak'||!TREE_SPECIES[species]?'tree':'tree:'+species,def.parts));return group;
}
