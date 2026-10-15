import * as THREE from 'three';
import {biomeRule} from './biome-rules.js';

// Atmosphere (docs/BIOMES.md, Atmosphere): a light haze everywhere, and the fog and light's tint of the biome
// under the view, crossfading over a couple of seconds when it changes. An area with biome land supplies
// `biomeAt(x, z)` (areas.register); anywhere else only the haze shows.
// The haze (user, 2026-10-15: "it makes the transition to the edge of the viewable area much nicer") is the
// coast's light fog, in every area: clear round what the view looks at, fading into the area's own background
// at the draw distance. A biome with fog of its own thickens it and tints it towards its colour.
// A biome's `atmosphere`: {fog: {color, density 0..1}, light: {sky, ground, sun (tints), brightness}}.
// (Drifting particles were tried and dropped: user, 2026-10-15.)
export const HAZE=.05;
const CLEAR={fog:HAZE,fogColor:null,sky:new THREE.Color('#ffffff'),ground:new THREE.Color('#ffffff'),sun:new THREE.Color('#ffffff'),brightness:1};
// The target look of a biome (null: only the haze). fogColor null: the area's background.
export function atmosphereOf(biome){
 if(!biome)return {...CLEAR};const a=biomeRule(biome).atmosphere||{};
 return {fog:Math.max(HAZE,a.fog?.density??0),fogColor:a.fog?.color?new THREE.Color(a.fog.color):null,sky:new THREE.Color(a.light?.sky??'#ffffff'),ground:new THREE.Color(a.light?.ground??'#ffffff'),sun:new THREE.Color(a.light?.sun??'#ffffff'),brightness:a.light?.brightness??1};
}
// Where fog of a density starts and ends (world units from the camera): clear up to just past what the view
// looks at (focusDistance from the camera, so zooming out doesn't bury the view), thickening out to the draw
// distance (`range`, from that point), where it's whole and hides the edge of the drawn land.
export function fogRange(density,range,focusDistance=0){if(density<=.001)return [1e4,2e4];const s=Math.sqrt(Math.min(1,density)),end=focusDistance+THREE.MathUtils.lerp(range*1.2,24,s);return [focusDistance+(end-focusDistance)*.15,end];}

// scene, the hemisphere light and the sun; their colours now are the clear look.
export function createAtmosphere({scene,hemisphere,sun,background='#e5e9df'}){
 const base={sky:hemisphere.color.clone(),ground:hemisphere.groundColor.clone(),hemi:hemisphere.intensity,sun:sun.color.clone(),sunI:sun.intensity};
 // The fog is in the scene except on the Low tiers: there every material paid for it on every pixel, which
 // cost a software-rendered clearing 47 → 7 fps (perf A/B, 2026-10-15). Turning it on or off switches between
 // two cached programs per material; the first time costs a compile.
 const fog=new THREE.Fog(new THREE.Color(background),1e4,2e4);scene.fog=null;
 // tint: how far the fog's colour leans from the background to the biome's fog colour.
 const now={...atmosphereOf(null),tint:0,fogColor:new THREE.Color(background)},sky=new THREE.Color(background);
 let target=atmosphereOf(null),biome=null;
 const fade=(a,b,k)=>a+(b-a)*k;
 return {get biome(){return biome;},get state(){return {biome,fog:+now.fog.toFixed(3),on:scene.fog===fog};},
  // Per frame: the biome under the view (or null), the draw distance from what the view looks at (range) and
  // the camera's distance to it (focusDistance), the area's background colour (the haze fades into it), on
  // (the playground can turn the biome's part off; the haze stays) and detail (0 on the Low tiers: no fog).
  update(dt,{biome:next,range=48,focusDistance=0,background:back=null,on=true,detail=1}){
   if(!on)next=null;if(next!==biome){biome=next;target=atmosphereOf(biome);if(target.fogColor)now.fogColor.copy(target.fogColor);}
   const k=1-Math.exp(-dt*1.2);if(back)sky.copy(back);
   now.fog=fade(now.fog,target.fog,k);now.tint=fade(now.tint,target.fogColor?1:0,k);now.brightness=fade(now.brightness,target.brightness,k);
   for(const c of ['sky','ground','sun'])now[c].lerp(target[c],k);
   const [near,end]=fogRange(now.fog,range,focusDistance);fog.near=near;fog.far=end;fog.color.copy(sky).lerp(now.fogColor,Math.min(1,now.tint*now.fog*3));scene.fog=detail?fog:null;
   hemisphere.color.copy(base.sky).multiply(now.sky);hemisphere.groundColor.copy(base.ground).multiply(now.ground);hemisphere.intensity=base.hemi*now.brightness;
   sun.color.copy(base.sun).multiply(now.sun);sun.intensity=base.sunI*now.brightness;
  },
  // Back to the haze at once (leaving an area, the playground's reset).
  reset(){biome=null;target=atmosphereOf(null);Object.assign(now,{...atmosphereOf(null),tint:0});
   hemisphere.color.copy(base.sky);hemisphere.groundColor.copy(base.ground);hemisphere.intensity=base.hemi;sun.color.copy(base.sun);sun.intensity=base.sunI;},
 };
}
