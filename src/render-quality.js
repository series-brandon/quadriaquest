import * as THREE from 'three';
import {signal} from './reactive.js';
import {simplifyMaterials} from './simple-materials.js';

// Render quality for weak GPUs (docs/PERFORMANCE.md, Adaptive render quality). Tiers trade fill rate:
//   pixelCap    highest device pixel ratio drawn; scale multiplies it (below 1, the browser upscales)
//   shadowSize  the sun's shadow map (redrawn each shadow update; 2048² is 4× a 1366×768 screen)
//   shadowType  PCF soft or PCF (filtered: a per-pixel cost) or Basic (hard, single sample: nearly free)
//   shadowEvery redraw the shadow map at most every Nth frame
// On every tier the shadow map is only redrawn when a shadow caster visibly moved, appeared or
// disappeared (`afterRender`): standing still, menus and idle breathing cost no shadow pass.
//   antialias   MSAA; fixed when the renderer is created, so it follows the saved choice at load
//   normalBias, bias  shadow offsets (hard shadows need more to avoid self-shadowing stripes)
//   shadows     false: the sun casts no shadows at all
//   simple      Lambert lighting instead of physically based (simple-materials.js)
export const QUALITY_TIERS={
 high:{label:'High',pixelCap:2,scale:1,shadowSize:2048,shadowType:THREE.PCFSoftShadowMap,shadowEvery:1,antialias:true},
 medium:{label:'Medium',pixelCap:1.5,scale:1,shadowSize:1024,shadowType:THREE.PCFShadowMap,shadowEvery:1,antialias:true},
 // Hard (single-sample) shadows: on weak GPUs the soft-shadow filtering, not the shadows, is the cost.
 low:{label:'Low',pixelCap:1,scale:.75,shadowSize:1024,shadowType:THREE.BasicShadowMap,shadowEvery:2,antialias:false,normalBias:.04,bias:-.0015},
 // Half resolution is the big lever; hard shadows cost only ~5% there, so the floor keeps them.
 lowest:{label:'Lowest',pixelCap:1,scale:.5,shadowSize:1024,shadowType:THREE.BasicShadowMap,shadowEvery:2,antialias:false,normalBias:.04,bias:-.0015,simple:true},
};
export const QUALITY_MODES=['auto','high','medium','low','lowest'];
const ORDER=['high','medium','low','lowest'];
const STORAGE_KEY='quadriaquest-graphics';
// Auto steps down one tier when frames average slower than this for two windows in a row. Startup
// and arrivals (shader compiles, loading) get a warm-up first (`settle`), so a slow moment never
// sticks. It never steps back up during play (no flicker between tiers); the next load starts from
// the saved tier.
const SLOW_FRAME_MS=28,WINDOW_MS=5000,HITCH_MS=250,WARMUP_MS=6000,SLOW_WINDOWS=2;
// Shadow caster movement below these (world units for translation, matrix units for rotation and
// scale) leaves the map as it is: about 3 cm, or a 6% change in size or angle.
const MOVE=.03,TURN=.06;
// True when a visible shadow caster differs from `seen` (mesh → its matrix at the last redraw) beyond
// the tolerances, or casters appeared or disappeared. `seen` is then refreshed.
export function castersChanged(scene,seen){
 let changed=false,count=0;
 scene.traverseVisible(o=>{
  if(!o.isMesh||!o.castShadow)return;count++;
  const e=o.matrixWorld.elements,last=seen.get(o);
  if(!last){changed=true;return;}
  if(changed)return;
  for(let i=0;i<16;i++){const limit=i>=12&&i<15?MOVE:TURN;if(Math.abs(e[i]-last[i])>limit){changed=true;return;}}
 });
 if(count!==seen.size)changed=true;
 if(changed){seen.clear();scene.traverseVisible(o=>{if(o.isMesh&&o.castShadow)seen.set(o,Float32Array.from(o.matrixWorld.elements));});}
 return changed;
}

// Saved choice: {mode, autoTier}. Storage can be missing or throw (private windows); defaults then.
export function loadQualitySetting(storage=globalThis.localStorage){
 try{const value=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(value&&QUALITY_MODES.includes(value.mode))return {mode:value.mode,autoTier:QUALITY_TIERS[value.autoTier]?value.autoTier:'high'};}catch{}
 return {mode:'auto',autoTier:'high'};
}
// The tier the renderer should be created for (its antialias), from a URL override or the saved choice.
export function initialTier(setting=loadQualitySetting(),search=globalThis.location?.search||''){
 const forced=new URLSearchParams(search).get('quality');
 if(QUALITY_TIERS[forced])return forced;
 return setting.mode==='auto'?setting.autoTier:setting.mode;
}
const SOFTWARE=/swiftshader|llvmpipe|software|softpipe|microsoft basic render/i;

// renderer, light: the main WebGL renderer and the shadow-casting sun. onChange(tier) runs after a
// tier applies (the host re-sizes the canvas). rendererName: the GPU string, to start software
// rendering on Low.
export function createRenderQuality({renderer,light,devicePixelRatio=()=>globalThis.devicePixelRatio||1,storage=globalThis.localStorage,
 search=globalThis.location?.search||'',rendererName='',onChange=()=>{}}){
 const saved=loadQualitySetting(storage),forced=new URLSearchParams(search).get('quality');
 const mode=signal(QUALITY_TIERS[forced]?forced:saved.mode),tier=signal('high');
 let simpleDue=true,simpleScene=null,autoTier=saved.autoTier,frame=0,windowMs=0,frames=0,warmupMs=WARMUP_MS,slowWindows=0,shadowsDue=true,sinceShadow=0;
 const casters=new Map(),baseNormalBias=light.shadow.normalBias??0,baseBias=light.shadow.bias??0;
 // Software rendering is the weakest case: start on the floor rather than stepping down to it.
 if(mode.peek()==='auto'&&SOFTWARE.test(rendererName))autoTier='lowest';
 const save=()=>{if(QUALITY_TIERS[forced])return;try{storage?.setItem(STORAGE_KEY,JSON.stringify({mode:mode.peek(),autoTier}));}catch{}};
 function apply(next,notify=true){
  const t=QUALITY_TIERS[next];
  renderer.setPixelRatio(Math.min(devicePixelRatio(),t.pixelCap)*t.scale);
  if(renderer.shadowMap.type!==t.shadowType)renderer.shadowMap.type=t.shadowType;
  if(light.shadow.mapSize.x!==t.shadowSize){light.shadow.mapSize.set(t.shadowSize,t.shadowSize);light.shadow.map?.dispose();light.shadow.map=null;}
  renderer.shadowMap.autoUpdate=false;shadowsDue=true;casters.clear();
  light.castShadow=t.shadows!==false;simpleDue=true;
  light.shadow.normalBias=t.normalBias??baseNormalBias;light.shadow.bias=t.bias??baseBias;
  tier.value=next;if(notify)onChange(next);
 }
 const target=()=>mode.peek()==='auto'?autoTier:mode.peek();
 apply(target(),false); // the host sizes the canvas once it is ready
 return {
  tier,mode,
  get antialiasMismatch(){return renderer.getContextAttributes?.()?.antialias!==QUALITY_TIERS[tier.peek()].antialias;},
  setMode(next){if(!QUALITY_MODES.includes(next))return false;mode.value=next;windowMs=frames=slowWindows=0;save();if(target()!==tier.peek())apply(target());return true;},
  // Per rendered frame, before rendering: the shadow redraw cadence and Auto's frame-time watch.
  // elapsedMs is the real time since the previous frame (not the clamped game step).
  frame(elapsedMs){
   const t=QUALITY_TIERS[tier.peek()];
   // Redraw shadows when due (a caster moved), at most every `shadowEvery` frames.
   sinceShadow++;if(shadowsDue&&sinceShadow>=t.shadowEvery){renderer.shadowMap.needsUpdate=true;shadowsDue=false;sinceShadow=0;}
   if(mode.peek()!=='auto'||!(elapsedMs>0)||elapsedMs>HITCH_MS)return;
   if(warmupMs>0){warmupMs-=elapsedMs;return;}
   windowMs+=elapsedMs;frames++;
   if(windowMs<WINDOW_MS)return;
   const average=windowMs/frames;windowMs=frames=0;
   slowWindows=average>SLOW_FRAME_MS?slowWindows+1:0;
   const i=ORDER.indexOf(tier.peek());
   if(slowWindows>=SLOW_WINDOWS&&i<ORDER.length-1){slowWindows=0;warmupMs=WARMUP_MS;autoTier=ORDER[i+1];save();apply(autoTier);}
  },
  // After loading a new area: a warm-up before frame times count again.
  settle(){warmupMs=WARMUP_MS;windowMs=frames=slowWindows=0;},
  // After each render: whether shadow casters moved since the map was last drawn (it is redrawn
  // the next frame; a one-frame lag when something starts moving).
  afterRender(scene){
   // Lowest swaps in simple materials; a periodic sweep catches objects added since (and restores on leaving).
   const simple=!!QUALITY_TIERS[tier.peek()].simple;
   if(simpleDue||simple&&++frame%60===0||scene!==simpleScene){simplifyMaterials(scene,simple);simpleDue=false;simpleScene=scene;}
   if(QUALITY_TIERS[tier.peek()].shadows!==false&&castersChanged(scene,casters))shadowsDue=true;
  },
  // Something changed that the movement check can't see (geometry swapped in place).
  shadowsChanged(){shadowsDue=true;},
 };
}
