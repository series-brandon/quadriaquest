import * as THREE from 'three';
import {biomeRule} from './biome-rules.js';

// Atmosphere by biome (docs/BIOMES.md, Atmosphere): fog, the light's tint and drifting particles follow the
// biome under the view, crossfading over a couple of seconds when it changes. An area with biome land
// supplies `biomeAt(x, z)` (areas.register); anywhere else the atmosphere settles back to clear.
// A biome's `atmosphere`: {fog: {color, density 0..1}, light: {sky, ground, sun (tints), brightness},
// particles: kind (PARTICLES)}. Everything is set through a few uniforms and colours per frame; the
// particles move in their shader.
export const PARTICLES={
 // count: share of the pool shown; size: world units; fall: units/s down (negative rises); sway: side to side;
 // drift: [x, z] units/s (a breeze); flutter: size pulsing; low: kept near the ground (0 anywhere, 1 low).
 pollen:{colors:['#fff6c9','#f7e7a1'],count:.45,size:.11,fall:-.05,sway:.5,drift:[.15,.08],flutter:0,low:.4},
 'falling leaves':{colors:['#d98c3a','#c96a2e','#b8b04a','#8faa4c'],count:.4,size:.3,fall:.55,sway:1.1,drift:[.25,.1],flutter:1,low:0},
 'falling needles':{colors:['#6f6b3e','#857a48','#5d6e3e'],count:.45,size:.2,fall:.9,sway:.35,drift:[.1,.05],flutter:.6,low:0},
 midges:{colors:['#3d3a33','#4a473e'],count:.7,size:.07,fall:0,sway:.25,drift:[0,0],flutter:0,low:1,jitter:1},
 spray:{colors:['#ffffff','#eef6f7'],count:.4,size:.12,fall:-.15,sway:.3,drift:[-.4,-.6],flutter:0,low:.8},
 thistledown:{colors:['#fbfaf2','#efece0'],count:.3,size:.2,fall:-.02,sway:.6,drift:[.7,.25],flutter:0,low:.3},
};
const POOL=900,BOX=[40,9,40];
const CLEAR={fog:0,fogColor:new THREE.Color('#e5e9df'),sky:new THREE.Color('#ffffff'),ground:new THREE.Color('#ffffff'),sun:new THREE.Color('#ffffff'),brightness:1};
// The target look of a biome (null: clear).
export function atmosphereOf(biome){
 if(!biome)return {...CLEAR,particles:null};const a=biomeRule(biome).atmosphere||{};
 return {fog:a.fog?.density??0,fogColor:new THREE.Color(a.fog?.color??CLEAR.fogColor),sky:new THREE.Color(a.light?.sky??'#ffffff'),ground:new THREE.Color(a.light?.ground??'#ffffff'),sun:new THREE.Color(a.light?.sun??'#ffffff'),brightness:a.light?.brightness??1,particles:a.particles||null};
}
// How far fog of a density starts and ends, in world units, for a camera that sees to `far`.
export function fogRange(density,far){if(density<=.001)return [far*20,far*40];const end=THREE.MathUtils.lerp(far*1.3,18,Math.sqrt(Math.min(1,density))),start=end*.3;return [start,end];}

function particleMaterial(){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{uTime:{value:0},uCenter:{value:new THREE.Vector3()},uBox:{value:new THREE.Vector3(...BOX)},uOpacity:{value:0},uCount:{value:0},uSize:{value:.1},uFall:{value:0},uSway:{value:0},uDrift:{value:new THREE.Vector2()},uFlutter:{value:0},uLow:{value:0},uJitter:{value:0},uScale:{value:400},
   uColors:{value:[new THREE.Color(),new THREE.Color(),new THREE.Color(),new THREE.Color()]}},
  vertexShader:`attribute vec4 seed;uniform float uTime,uCount,uSize,uFall,uSway,uFlutter,uLow,uJitter,uScale;uniform vec3 uCenter,uBox;uniform vec2 uDrift;uniform vec3 uColors[4];
varying vec3 vColor;varying float vShow;varying float vAngle;
void main(){
 vShow=step(seed.w,uCount);
 vec3 p=seed.xyz*uBox;
 p.x+=uDrift.x*uTime+sin(uTime*(.6+seed.w)+seed.x*40.0)*uSway;
 p.z+=uDrift.y*uTime+cos(uTime*(.5+seed.y)+seed.z*40.0)*uSway*.6;
 p.y-=uFall*uTime;
 p+=uJitter*vec3(sin(uTime*7.0+seed.x*90.0),sin(uTime*5.0+seed.y*70.0)*.6,cos(uTime*6.0+seed.z*80.0))*.25;
 // Wrapped round the view's centre, so the field stays put in the world as the view moves through it.
 vec3 lo=uCenter-uBox*.5;p=lo+mod(p-lo,uBox);
 p.y=uCenter.y-1.0+mod(p.y-uCenter.y+1.0,uBox.y*mix(1.0,.25,uLow));
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 float size=uSize*(1.0+uFlutter*.6*sin(uTime*3.0+seed.x*50.0));
 gl_PointSize=max(1.0,size*uScale/-mv.z);
 int c=int(floor(seed.y*4.0));vColor=c==0?uColors[0]:c==1?uColors[1]:c==2?uColors[2]:uColors[3];
 vAngle=seed.z*6.283+uTime*uFlutter*1.5;
 gl_Position=projectionMatrix*mv;
}`,
  fragmentShader:`uniform float uOpacity,uFlutter;varying vec3 vColor;varying float vShow;varying float vAngle;
void main(){
 if(vShow<.5)discard;
 vec2 q=gl_PointCoord-.5;float c=cos(vAngle),s=sin(vAngle);q=vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 // Leaves and needles are flat flakes (a squashed disc); the rest soft round specks.
 q.y*=mix(1.0,2.4,min(uFlutter,1.0));
 float d=length(q)*2.0;if(d>1.0)discard;
 gl_FragColor=vec4(vColor,uOpacity*(1.0-smoothstep(.55,1.0,d)));
 #include <colorspace_fragment>
}`});
}
// scene, the hemisphere light and the sun; their colours now are the clear look.
export function createAtmosphere({scene,hemisphere,sun,background='#e5e9df'}){
 const base={sky:hemisphere.color.clone(),ground:hemisphere.groundColor.clone(),hemi:hemisphere.intensity,sun:sun.color.clone(),sunI:sun.intensity,background:new THREE.Color(background)};
 // Fog is in the scene only while a biome's fog shows: kept there always, every material pays for it on every
 // pixel, which cost a software-rendered clearing 47 → 7 fps (perf A/B, 2026-10-15). Turning it on or off
 // switches between two cached programs per material; the first time costs a compile. The Low tiers have none.
 const fog=new THREE.Fog(base.background.clone(),1e4,2e4);scene.fog=null;
 const seeds=new Float32Array(POOL*4);for(let i=0;i<POOL*4;i++)seeds[i]=Math.random();
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(POOL*3),3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,4));
 const material=particleMaterial(),points=new THREE.Points(geometry,material);points.frustumCulled=false;points.name='atmosphere-particles';points.renderOrder=3;points.visible=false;scene.add(points);
 const now={...atmosphereOf(null),fogColor:base.background.clone()},u=material.uniforms;
 let target=atmosphereOf(null),biome=null,shownKind=null,time=0;
 const fade=(a,b,k)=>a+(b-a)*k;
 function useKind(kind){shownKind=kind;const p=PARTICLES[kind];if(!p)return;u.uCount.value=p.count;u.uSize.value=p.size;u.uFall.value=p.fall;u.uSway.value=p.sway;u.uDrift.value.set(...p.drift);u.uFlutter.value=p.flutter;u.uLow.value=p.low;u.uJitter.value=p.jitter||0;
  p.colors.forEach((c,i)=>u.uColors.value[i].set(c));for(let i=p.colors.length;i<4;i++)u.uColors.value[i].set(p.colors[i%p.colors.length]);}
 return {points,get biome(){return biome;},get state(){return {biome,particles:shownKind,opacity:+u.uOpacity.value.toFixed(2),fog:+now.fog.toFixed(3)};},
  // Per frame: the biome under the view (or null), the view's centre (world units), the camera, the
  // background (the area's own colour), on (the playground can turn it off) and detail (0 on the Low tiers).
  update(dt,{biome:next,center,camera,far,on=true,viewportHeight=800,detail=1}){
   time+=dt;if(!on)next=null;if(next!==biome){biome=next;target=atmosphereOf(biome);}
   const k=1-Math.exp(-dt*1.2);
   now.fog=fade(now.fog,target.fog,k);now.fogColor.lerp(target.fogColor,k);now.brightness=fade(now.brightness,target.brightness,k);
   for(const c of ['sky','ground','sun'])now[c].lerp(target[c],k);
   const [near,end]=fogRange(now.fog,far);fog.near=near;fog.far=end;fog.color.copy(base.background).lerp(now.fogColor,Math.min(1,now.fog*3));scene.fog=detail&&now.fog>.002?fog:null;
   hemisphere.color.copy(base.sky).multiply(now.sky);hemisphere.groundColor.copy(base.ground).multiply(now.ground);hemisphere.intensity=base.hemi*now.brightness;
   sun.color.copy(base.sun).multiply(now.sun);sun.intensity=base.sunI*now.brightness;
   // Particles: fade out, switch kind, fade back in.
   const want=target.particles;
   if(want!==shownKind){u.uOpacity.value=Math.max(0,u.uOpacity.value-dt*1.5);if(u.uOpacity.value<=0){useKind(want);}}
   else if(want)u.uOpacity.value=Math.min(.9,u.uOpacity.value+dt*.8);
   points.visible=!!shownKind&&u.uOpacity.value>0;
   // Low detail (the Low quality tiers): half the particles.
   if(shownKind)u.uCount.value=PARTICLES[shownKind].count*(detail?1:.5);
   if(points.visible){u.uTime.value=time;u.uCenter.value.copy(center);u.uScale.value=viewportHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2));}
  },
  // Clear at once (leaving an area, the playground's reset).
  reset(){biome=null;target=atmosphereOf(null);Object.assign(now,{...atmosphereOf(null),fogColor:base.background.clone()});u.uOpacity.value=0;shownKind=null;points.visible=false;
   scene.fog=null;hemisphere.color.copy(base.sky);hemisphere.groundColor.copy(base.ground);hemisphere.intensity=base.hemi;sun.color.copy(base.sun);sun.intensity=base.sunI;},
 };
}
