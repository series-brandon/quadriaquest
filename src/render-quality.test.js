import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRenderQuality,initialTier,loadQualitySetting,QUALITY_TIERS} from './render-quality.js';

function fakes({antialias=true}={}){
 const renderer={pixelRatio:null,shadowMap:{type:THREE.PCFSoftShadowMap,autoUpdate:true,needsUpdate:false},setPixelRatio(v){this.pixelRatio=v;},getContextAttributes:()=>({antialias})};
 const light={shadow:{mapSize:new THREE.Vector2(2048,2048),map:{disposed:false,dispose(){this.disposed=true;}}}};
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 return {renderer,light,storage,store};
}

test('a tier sets resolution, shadow map and shadow cadence',()=>{
 const f=fakes(),changes=[];
 const q=createRenderQuality({...f,devicePixelRatio:()=>3,search:'',onChange:t=>changes.push(t)});
 assert.equal(q.tier.peek(),'high');assert.equal(f.renderer.pixelRatio,2,'capped at 2');assert.deepEqual(changes,[],'the first tier waits for the host to size the canvas');
 q.setMode('low');
 assert.equal(q.tier.peek(),'low');assert.equal(f.renderer.pixelRatio,.75,'1 × 0.75');
 assert.equal(f.light.shadow.mapSize.x,1024);assert.equal(f.light.shadow.map,null,'the old map is released');
 assert.equal(f.renderer.shadowMap.type,THREE.BasicShadowMap);assert.equal(f.renderer.shadowMap.autoUpdate,false);
 // A new tier redraws shadows once (at most every other frame on Low), then only when casters move.
 const due=()=>{const v=f.renderer.shadowMap.needsUpdate;f.renderer.shadowMap.needsUpdate=false;return v;};
 q.frame(16);q.frame(16);assert.equal(due(),true,'the new tier draws its shadows');
 for(let i=0;i<5;i++)q.frame(16);assert.equal(due(),false,'nothing moved: no shadow pass');
 const scene=new THREE.Scene(),box=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());box.castShadow=true;scene.add(box);scene.updateMatrixWorld();
 q.afterRender(scene);q.frame(16);q.frame(16);assert.equal(due(),true,'a caster appeared');
 q.afterRender(scene);for(let i=0;i<4;i++)q.frame(16);assert.equal(due(),false);
 assert.deepEqual(changes,['low']);
 assert.deepEqual(JSON.parse(f.store.get('quadriaquest-graphics')),{mode:'low',autoTier:'high'},'the choice is saved');
 assert.equal(q.antialiasMismatch,true,'Low has no MSAA, so the change applies at the next load');
 assert.equal(initialTier(loadQualitySetting(f.storage),''),'low');
});

test('Auto starts software rendering on Lowest and steps down when frames stay slow',()=>{
 const soft=fakes();createRenderQuality({...soft,rendererName:'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))',search:''});
 assert.equal(soft.renderer.pixelRatio,QUALITY_TIERS.lowest.scale,'software rendering starts on Lowest');
 const f=fakes(),q=createRenderQuality({...f,rendererName:'Apple M2',search:''});
 // Frame times in whole 5 s windows (125 frames at 40 ms, 313 at 16 ms), after the 6 s warm-up.
 const run=(windows,ms)=>{for(let i=0;i<Math.ceil(windows*5000/ms);i++)q.frame(ms);};
 const fresh=()=>{q.settle();for(let i=0;i<150;i++)q.frame(40);};
 assert.equal(q.tier.peek(),'high');
 for(let i=0;i<150;i++)q.frame(40);assert.equal(q.tier.peek(),'high','a slow start (shader compiles) is a warm-up');
 run(1,16);assert.equal(q.tier.peek(),'high','smooth frames keep the tier');
 fresh();run(1,40);run(1,16);run(1,40);assert.equal(q.tier.peek(),'high','one slow window at a time is not enough');
 fresh();run(2,40);assert.equal(q.tier.peek(),'medium','slow for two windows in a row: one step down');
 for(let i=0;i<20;i++)q.frame(1000);assert.equal(q.tier.peek(),'medium','hitches (a background tab) are ignored');
 q.settle();for(let i=0;i<150;i++)q.frame(40);assert.equal(q.tier.peek(),'medium','an arrival warms up again');
 run(2,40);assert.equal(q.tier.peek(),'low');
 fresh();run(4,16);assert.equal(q.tier.peek(),'low','never steps back up during play');
 assert.equal(loadQualitySetting(f.storage).autoTier,'low','the next load starts on Low');
 q.setMode('high');for(let i=0;i<800;i++)q.frame(40);assert.equal(q.tier.peek(),'high','a manual choice is kept');
});

test('a URL override wins and is not saved; storage failures fall back to Auto',()=>{
 const f=fakes(),q=createRenderQuality({...f,search:'?quality=medium'});
 assert.equal(q.tier.peek(),'medium');assert.equal(initialTier(loadQualitySetting(f.storage),'?quality=medium'),'medium');
 q.setMode('low');assert.equal(f.store.size,0,'perf runs never change the saved choice');
 const broken={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 assert.deepEqual(loadQualitySetting(broken),{mode:'auto',autoTier:'high'});
 const g=fakes();const r=createRenderQuality({...g,storage:broken,search:''});assert.equal(r.setMode('low'),true);
});

test('casters count as moved past small tolerances, or when they appear or disappear',async()=>{
 const {castersChanged}=await import('./render-quality.js');
 const scene=new THREE.Scene(),seen=new Map(),mesh=()=>{const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());m.castShadow=true;scene.add(m);return m;};
 const slime=mesh(),tree=mesh();const check=()=>{scene.updateMatrixWorld();return castersChanged(scene,seen);};
 assert.equal(check(),true,'first look');assert.equal(check(),false,'still');
 slime.scale.setScalar(1.04);assert.equal(check(),false,'idle breathing is not movement');
 slime.position.x=.02;assert.equal(check(),false,'a hand-width wobble is not movement');
 slime.position.x=.1;assert.equal(check(),true,'walking is');
 tree.visible=false;assert.equal(check(),true,'a felled tree disappears');assert.equal(check(),false);
 tree.visible=true;tree.rotation.z=.3;assert.equal(check(),true,'and falls or regrows');
 const glow=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());scene.add(glow);glow.position.y=3;assert.equal(check(),false,'non-casters never count');
});
