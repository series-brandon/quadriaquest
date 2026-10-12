import * as THREE from 'three';
import {applyCutaway} from './cutaway.js';
import {applySlimeBend} from './slime-bend.js';

// Cheaper lighting for the Lowest render tier (render-quality.js): physically based materials
// (MeshStandardMaterial) are swapped for Lambert ones with the same color, vertex colors, texture,
// flat shading and transparency. Per-pixel lighting is the biggest fill cost on weak GPUs. The swap is
// reversible and idempotent, so it can be re-run over the scene to catch objects added later.
const simpler=new WeakMap();
function lambertFor(material){
 let simple=simpler.get(material);
 if(!simple){
  simple=new THREE.MeshLambertMaterial({color:material.color,vertexColors:material.vertexColors,map:material.map,flatShading:material.flatShading,
   transparent:material.transparent,opacity:material.opacity,side:material.side,emissive:material.emissive,emissiveIntensity:material.emissiveIntensity,
   alphaTest:material.alphaTest,depthWrite:material.depthWrite,visible:material.visible});
  simple.userData.richMaterial=material;simpler.set(material,simple);
  // A material that cuts away (baked walls: cutaway.js) keeps doing so when simplified.
  if(material.userData.cutaway)applyCutaway(simple);
  // A slime's bent body and face (slime-bend.js) keep bending, with the same uniforms.
  if(material.userData.bendUniforms)applySlimeBend(simple,material.userData.bendUniforms);
 }
 // Runtime changes to the rich material (a recolored slime, a fading effect) carry over.
 simple.color.copy(material.color);simple.opacity=material.opacity;simple.visible=material.visible;
 return simple;
}
export function simplifyMaterials(root,simple){
 root.traverse(object=>{
  if(!object.isMesh||Array.isArray(object.material))return;
  const material=object.material;
  if(simple&&material?.isMeshStandardMaterial)object.material=lambertFor(material);
  else if(!simple&&material?.userData?.richMaterial){material.userData.richMaterial.color.copy(material.color);object.material=material.userData.richMaterial;}
 });
}
