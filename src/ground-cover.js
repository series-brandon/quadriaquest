import * as THREE from 'three';
import {cachedMergedMesh,sharedVertexColorMaterial} from './merged-model.js';

// Ground cover (docs/WORLD.md, Green spaces): small decoration nobody clicks or bumps into: flower
// clumps in several colours, grass tufts, ferns, mushrooms, reeds, lily pads, shrubs and pebbles. Each
// kind is one cached template, drawn instanced (createGroundCoverPool below). Items are
// {kind, x, y, z, rotation, scale} in tiles.
const I=(r,d=0)=>new THREE.IcosahedronGeometry(r,d),C=(r0,r1,h,n=4)=>new THREE.CylinderGeometry(r0,r1,h,n),K=(r,h,n=4)=>new THREE.ConeGeometry(r,h,n),B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const part=(geometry,color,position,rotation,scale)=>({geometry,color,position,rotation,scale});
// A clump of three or four flowers with this petal colour (and a lighter centre).
// Kept low-poly (cone stems, octahedron heads): a meadow chunk holds hundreds of these.
const O=r=>new THREE.OctahedronGeometry(r,0);
const clump=(petal,centre)=>()=>[[-.2,.18,.3],[.08,.24,.08],[.22,.16,-.2],[-.1,.2,-.24]].flatMap(([x,h,z],i)=>[part(K(.016,h,3),'#6f9a55',[x,h/2,z]),part(O(.12),i%2?centre:petal,[x,h+.02,z],[0,i,0],[1,.5,1])]);
export const COVER={
 flowerWhite:clump('#f8f5e6','#f2d35b'),flowerYellow:clump('#f2d35b','#e09a3c'),flowerPink:clump('#ec9bb4','#f8f0d8'),
 flowerPurple:clump('#b58ad6','#f2d35b'),flowerBlue:clump('#7fa6e0','#f8f0d8'),flowerRed:clump('#d9574a','#3d2e22'),
 grass:()=>[-.14,-.05,.04,.13,.08,-.09].map((x,i)=>part(K(.05,.32+i%3*.1,3),i%2?'#86a85f':'#6f9a55',[x,.16+i%3*.05,(i%3-1)*.09],[(i-2.5)*.12,i,(i-2.5)*.1])),
 fern:()=>Array.from({length:5},(_,i)=>{const a=i/5*Math.PI*2;return part(B(.07,.02,.32),i%2?'#5f8a48':'#6f9a55',[Math.cos(a)*.14,.09,Math.sin(a)*.14],[.5,-a,0]);}),
 mushrooms:()=>[[0,0,.13],[.12,.06,.09],[-.1,-.05,.07]].flatMap(([x,z,s])=>[part(K(s*.3,s,3),'#efe6d2',[x,s/2,z]),part(K(s*.65,s*.5,5),'#c8463d',[x,s*1.1,z])]),
 reeds:()=>[-.15,-.05,.06,.16].map((x,i)=>part(K(.02,.6+i%2*.2,3),i%2?'#7f9a55':'#9aa966',[x,.3+i%2*.1,(i%2?.06:-.05)])).concat([part(O(.045),'#7a5a3c',[-.05,.62,-.05],[0,0,0],[.8,1.6,.8]),part(O(.045),'#7a5a3c',[.16,.72,.06],[0,0,0],[.8,1.6,.8])]),
 lilyPad:()=>[part(C(.2,.2,.015,6),'#5f8a48',[0,0,0]),part(C(.13,.13,.016,5),'#6f9a55',[.22,0,.15]),part(O(.05),'#f6c9d8',[.02,.04,.02],[0,0,0],[1,.6,1])],
 shrub:()=>[part(I(.22),'#6a9150',[0,.18,0],[0,0,0],[1.2,.8,1]),part(I(.16),'#7fa461',[.16,.14,.08]),part(I(.14),'#5f8a48',[-.14,.13,-.06])],
 pebbles:()=>[[0,0,.07],[.12,.08,.05],[-.1,.06,.045]].map(([x,z,r])=>part(O(r),'#a7a196',[x,r*.5,z],[0,0,0],[1.2,.6,1])),
};
export const COVER_KINDS=Object.keys(COVER);
export const FLOWER_KINDS=COVER_KINDS.filter(k=>k.startsWith('flower'));
// One template's shared geometry (position, normal, color; non-indexed).
const template=kind=>cachedMergedMesh('cover:'+kind,COVER[kind],{roughness:.9}).geometry;
// A template on its own, for the model catalogue.
export function coverModel(kind){const group=new THREE.Group();group.name='cover-'+kind;group.add(cachedMergedMesh('cover:'+kind,COVER[kind],{roughness:.9}));return group;}

const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),s=new THREE.Vector3();

// Ground cover for streamed land, instanced: one InstancedMesh per kind for everything loaded (about a
// dozen draws in all, however many chunks), and a chunk only writes its instances' matrices into free
// slots (64 bytes each) when it loads, instead of uploading a mesh. Releasing a chunk frees its slots.
//   createGroundCoverPool({parent, capacity, offset}) → {add(items) → {dispose()}, stats}
export function createGroundCoverPool({parent,capacity=5000,offset=6}){
 const pools=new Map(),hidden=new THREE.Matrix4().makeScale(0,0,0);
 function pool(kind){
  if(!pools.has(kind)){
   // Its own material: instanced and plain meshes compile different programs, and a separate material
   // lets the renderer draw all cover together instead of switching back and forth.
   coverMaterial??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9});
   const mesh=new THREE.InstancedMesh(template(kind),coverMaterial,capacity);mesh.name='ground-cover-'+kind;
   mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;parent.add(mesh);
   pools.set(kind,{mesh,free:[],used:0});
  }
  return pools.get(kind);
 }
 const write=(p,i,matrix)=>{p.mesh.setMatrixAt(i,matrix);p.mesh.instanceMatrix.addUpdateRange(i*16,16);p.mesh.instanceMatrix.needsUpdate=true;};
 return {
  add(items){
   const slots=[];
   for(const it of items){const p=pool(it.kind);let i=p.free.pop();if(i===undefined){if(p.used>=capacity)continue;i=p.used++;p.mesh.count=p.used;}
    m.compose(v.set(it.x-offset,it.y,it.z-offset),q.setFromEuler(e.set(0,it.rotation||0,0)),s.setScalar(it.scale||1));write(p,i,m);slots.push([p,i]);}
   return {dispose(){for(const [p,i] of slots){write(p,i,hidden);p.free.push(i);}slots.length=0;}};
  },
  get stats(){return Object.fromEntries([...pools].map(([k,p])=>[k,p.used-p.free.length]));},
  dispose(){for(const p of pools.values()){p.mesh.removeFromParent();p.mesh.dispose();}pools.clear();},
 };
}
const v=new THREE.Vector3();
let coverMaterial=null;

// Fixed ground cover (a city's greens) that follows a map's chunk streaming: each chunk's share is in the
// pool only while that chunk is shown. sync(shown(id)) after the shown chunks change; ids are "cx,cz".
export function chunkedCover(pool,items,size=16){
 const shares=new Map();
 for(const it of items){const id=`${Math.floor(it.x/size)},${Math.floor(it.z/size)}`;if(!shares.has(id))shares.set(id,{items:[],handle:null});shares.get(id).items.push(it);}
 return {
  sync(shown){for(const [id,share] of shares){const on=!!shown(id);if(on&&!share.handle)share.handle=pool.add(share.items);else if(!on&&share.handle){share.handle.dispose();share.handle=null;}}},
  get shownChunks(){return [...shares].filter(([,s])=>s.handle).map(([id])=>id);},
 };
}
