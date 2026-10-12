import * as THREE from 'three';

// A height-weighted sideways bend: the bottom stays fixed and horizontal.
// Done in the vertex shader (since 2026-10-11): geometry is never rewritten, so every slime can share
// its body and face geometry and a bend uploads nothing. Each bent mesh has its own material carrying
// its uniforms: the bend amount and its transform to and from the slime's `visual` space (the heights the
// bend is measured in). The shadow depth material and the lowest render tier's simpler material get
// the same patch (simple-materials.js), so shadows and every tier bend alike.
export function bendOffset(height,amount){const t=Math.max(0,Math.min(1,(height-.07)/.72));return amount*t*t;}
// The JS reference of the shader (tests): a point in the mesh's own space, bent.
export function bendPoint(point,amount,toVisual){
 const p=point.clone().applyMatrix4(toVisual);p.x+=bendOffset(p.y,amount);return p.applyMatrix4(toVisual.clone().invert());
}
const BEND_HEAD='uniform float uBend;\nuniform mat4 uToVisual;\nuniform mat4 uFromVisual;\n';
const BEND_NORMAL=`
 { vec4 bp=uToVisual*vec4(position,1.0);float bh=bp.y;
   float slope=(bh>.07&&bh<.79)?2.0*uBend*(bh-.07)/(.72*.72):0.0;
   mat3 toV=mat3(uToVisual);vec3 bn=normalize(transpose(inverse(toV))*objectNormal);bn.y-=slope*bn.x;
   objectNormal=normalize(transpose(toV)*bn); }`;
const BEND_POSITION=`
 { vec4 bp=uToVisual*vec4(transformed,1.0);float bt=clamp((bp.y-.07)/.72,0.0,1.0);bp.x+=uBend*bt*bt;transformed=(uFromVisual*bp).xyz; }`;
export function applySlimeBend(material,uniforms){
 if(material.userData.bendUniforms)return material;
 material.userData.bendUniforms=uniforms;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=BEND_HEAD+shader.vertexShader
   .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>'+BEND_NORMAL)
   .replace('#include <begin_vertex>','#include <begin_vertex>'+BEND_POSITION);
 };
 material.customProgramCacheKey=()=>'slime-bend';material.needsUpdate=true;
 return material;
}
// parts: objects whose meshes bend (the body and the face). Each such mesh needs a material of its own
// (shared materials are cloned). Returns bend(amount).
export function createSlimeBend(visual,parts){
 const sets=[];
 for(const part of parts)part.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const matrix=new THREE.Matrix4();
  for(let node=mesh;node&&node!==visual;node=node.parent){node.updateMatrix();matrix.premultiply(node.matrix);}
  const uniforms={uBend:{value:0},uToVisual:{value:matrix},uFromVisual:{value:matrix.clone().invert()}};
  if(mesh.material.userData.bendUniforms){const own=mesh.material.clone();delete own.userData.bendUniforms;mesh.material=own;}
  applySlimeBend(mesh.material,uniforms);
  if(mesh.castShadow)mesh.customDepthMaterial=applySlimeBend(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),uniforms);
  sets.push(uniforms);
 });
 let previous=0;
 return amount=>{if(Math.abs(amount-previous)<.00001)return;previous=amount;for(const u of sets)u.uBend.value=amount;};
}
