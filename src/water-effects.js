import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {waterReflection} from './water-reflection.js';
import {shoreWeight,waterWave,pondEdges} from './water-motion.js';

// The glints drawn over water surfaces (two short glints per tile, independent, unhurried rhythms).
const GLINT_FRAGMENT=`uniform float time; uniform float intensity;
      varying vec2 surface; varying vec2 tileUV;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 tile=floor(surface+.5);
        float shimmer=0.;
        // Two short glints per tile, with independent, unhurried rhythms.
        for(int i=0;i<2;i++){
          float n=float(i);
          float seed=hash(tile+vec2(n*13.,n*7.));
          float phase=time*(.85+seed*.25)+seed*6.283+n*2.;
          vec2 center=vec2(.32+n*.34,.32+n*.34);
          center+=vec2(sin(phase*.6)*.045,cos(phase*.45)*.025);
          vec2 p=tileUV-center;
          p.y+=sin(p.x*12.+phase)*.006;
          float halfLength=.085+.025*sin(phase);
          float distanceToLine=length(vec2(max(abs(p.x)-halfLength,0.),p.y));
          float line=1.-smoothstep(.006,.016,distanceToLine);
          float gleam=pow(.5+.5*sin(phase),2.);
          shimmer+=line*(.10+.48*gleam);
        }
        gl_FragColor=vec4(.90,.98,.96,shimmer*intensity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`;
// Shared by the clearing and title garden; only inland surfaces move.
export const WATER_DEFAULTS=Object.freeze({enabled:true,speed:1.25,intensity:1,waves:true,opacity:.75,color:'#004070',faceted:true,waveStrength:4,fixedShoreline:true,roughness:0,reflectionStrength:3.5,shimmers:false});
export const waterSettings={...WATER_DEFAULTS};
export function createWaterEffects(parent,renderer){
  const group=new THREE.Group();parent.add(group);
  let appliedColor=null;
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{time:{value:0},intensity:{value:1}},
    vertexShader:`varying vec2 surface; varying vec2 tileUV;
      void main(){tileUV=uv;vec4 world=modelMatrix*vec4(position,1.);surface=world.xz;
      gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:GLINT_FRAGMENT
  });
  const tiles=[];
  const surfaceMaterial=new THREE.MeshStandardMaterial({color:waterSettings.color,flatShading:waterSettings.faceted,roughness:waterSettings.roughness,envMap:renderer?waterReflection(renderer):null,envMapIntensity:waterSettings.reflectionStrength,metalness:.08,transparent:true,opacity:waterSettings.opacity,depthWrite:false});
  const sideMaterial=new THREE.MeshStandardMaterial({color:waterSettings.color,roughness:.3,metalness:.08});
  const bedMaterial=new THREE.MeshStandardMaterial({color:'#a6b3a0',roughness:1});
  const pebbleMaterial=new THREE.MeshStandardMaterial({color:'#81988e',roughness:1});
  const bedGeometry=new THREE.PlaneGeometry(1,1);bedGeometry.rotateX(-Math.PI/2);
  const pebbleGeometry=new THREE.IcosahedronGeometry(.09,1);
  // Tiles keep their own animated geometry as invisible pick proxies; rendering uses one merged
  // surface (plus glints) and one merged static bed/pebble layer per water body to avoid per-tile draws and uploads.
  const proxyMaterial=new THREE.MeshBasicMaterial({visible:false}),statics=[];let merged=null,rendered=[];
  let dirty=false;
  function rebuild(){
    for(const mesh of rendered){mesh.removeFromParent();if(mesh.userData.ownsGeometry)mesh.geometry.dispose();}rendered=[];
    if(!tiles.length){merged=null;return;}
    let offset=0;const pieces=tiles.map(t=>{t.offset=offset;offset+=t.geometry.attributes.position.count;const g=t.geometry.clone();g.translate(t.x,t.y,t.z);return g;});
    merged=mergeGeometries(pieces);for(const g of pieces)g.dispose();
    const surface=new THREE.Mesh(merged,surfaceMaterial);surface.receiveShadow=true;surface.renderOrder=1;surface.userData.ownsGeometry=true;
    const glints=new THREE.Mesh(merged,material);glints.position.y=.003;glints.renderOrder=2;rendered.push(surface,glints);
    for(const kind of [bedMaterial,pebbleMaterial,sideMaterial]){const parts=statics.filter(m=>m.material===kind).map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
      if(parts.length){const mesh=new THREE.Mesh(mergeGeometries(parts),kind);mesh.receiveShadow=true;mesh.userData.ownsGeometry=true;rendered.push(mesh);for(const g of parts)g.dispose();}}
    for(const mesh of rendered){mesh.updateMatrix();mesh.matrixAutoUpdate=false;group.add(mesh);}
  }
  function prepare(){
    rebuild();
    const edges=pondEdges(tiles),epsilon=.001;
    for(const t of tiles){
      const p=t.geometry.attributes.position;t.samples=[];
      for(let i=0;i<p.count;i++){
        const x=t.x+p.getX(i),z=t.z+p.getZ(i);
        t.samples.push({x,z,weight:shoreWeight(x,z,edges),
          wx:(shoreWeight(x+epsilon,z,edges)-shoreWeight(x-epsilon,z,edges))/(2*epsilon),
          wz:(shoreWeight(x,z+epsilon,edges)-shoreWeight(x,z-epsilon,edges))/(2*epsilon)});
      }
    }
    dirty=false;
  }
  return {
    sideMaterial,
    addStatic(mesh){statics.push(mesh);dirty=true;},
    add(x,y,z,tileSide){
      // A shallow opaque pond bed gives the translucent surface visible depth.
      const bed=new THREE.Mesh(bedGeometry,bedMaterial);bed.position.set(x,y-.14,z);statics.push(bed);
      const seed=Math.abs(Math.sin(x*127.1+z*311.7));
      if(seed>.45){
        const pebble=new THREE.Mesh(pebbleGeometry,pebbleMaterial);
        pebble.position.set(x+(seed-.5)*.5,y-.12,z+(seed-.6)*.4);
        pebble.scale.set(1.2,.35,.8);pebble.rotation.y=seed*6;statics.push(pebble);
      }
      const geometry=new THREE.PlaneGeometry(1,1,4,4);geometry.rotateX(-Math.PI/2);
      // Offset interior vertices to avoid a perfectly regular triangle pattern.
      // Border vertices remain aligned with neighboring tiles.
      const positions=geometry.attributes.position,uv=geometry.attributes.uv;
      for(let i=0;i<positions.count;i++){
        const px=positions.getX(i),pz=positions.getZ(i);
        if(Math.abs(px)<.49&&Math.abs(pz)<.49){
          const jitter=Math.sin((x+px)*127.1+(z+pz)*311.7);
          const nx=px+jitter*.045,nz=pz+Math.cos(jitter*19.)*.045;
          positions.setX(i,nx);positions.setZ(i,nz);uv.setXY(i,nx+.5,.5-nz);
        }
      }
      const surface=new THREE.Mesh(geometry,proxyMaterial);surface.position.set(x,y,z);group.add(surface);
      tiles.push({x,y,z,geometry,sideMaterial:tileSide!==sideMaterial?tileSide:null,recolor:true});dirty=true;return surface;
    },
    update(dt){
      if(dirty)prepare();
      surfaceMaterial.opacity=waterSettings.opacity;
      surfaceMaterial.roughness=waterSettings.roughness;
      surfaceMaterial.envMapIntensity=waterSettings.reflectionStrength;
      const recolor=waterSettings.color!==appliedColor;if(recolor){appliedColor=waterSettings.color;surfaceMaterial.color.set(appliedColor);sideMaterial.color.set(appliedColor);}
      if(surfaceMaterial.flatShading!==waterSettings.faceted){surfaceMaterial.flatShading=waterSettings.faceted;surfaceMaterial.needsUpdate=true;}
      material.uniforms.time.value+=dt*waterSettings.speed;
      material.uniforms.intensity.value=waterSettings.enabled&&waterSettings.shimmers?waterSettings.intensity:0;
      const time=material.uniforms.time.value,enabled=waterSettings.enabled&&waterSettings.waves;
      for(const tile of tiles){
        if(recolor||tile.recolor){tile.recolor=false;tile.sideMaterial?.color.set(appliedColor);}
        const p=tile.geometry.attributes.position,n=tile.geometry.attributes.normal;
        const samples=tile.samples;
        for(let i=0;i<samples.length;i++){let {x,z,weight,wx,wz}=samples[i];
          if(!waterSettings.fixedShoreline){weight=1;wx=0;wz=0;}
          const strength=waterSettings.waveStrength,wave=waterWave(x,z,time)*strength;
          const a=x*2.1+z*1.4-time*.8,b=z*2.7-x*.9+time*.55;
          const dx=enabled?wx*wave+weight*strength*(.0252*Math.cos(a)-.0054*Math.cos(b)):0;
          const dz=enabled?wz*wave+weight*strength*(.0168*Math.cos(a)+.0162*Math.cos(b)):0;
          const length=Math.hypot(dx,1,dz);
          p.setY(i,enabled?wave*weight:0);n.setXYZ(i,-dx/length,1/length,-dz/length);
        }
        const mp=merged.attributes.position.array,src=p.array,base=tile.offset*3;
        for(let k=1;k<src.length;k+=3)mp[base+k]=src[k]+tile.y;
        merged.attributes.normal.array.set(n.array,base);
      }
      if(merged){merged.attributes.position.needsUpdate=true;merged.attributes.normal.needsUpdate=true;}
    },
    restart(){material.uniforms.time.value=0;}
  };
}

// Water for streamed land (countryside.js; docs/WORLD.md): the same look as the ponds above (colour,
// opacity, reflections, facets, waves and glints, following waterSettings), but the waves move in the
// vertex shader, so a whole lake or a river costs nothing per frame on the CPU. One surface mesh per
// chunk; vertices on a shore edge stay still (the fixed shoreline). Shared materials; update(dt) once
// a frame.
//   build(tiles, isWater(x, z), parent, offset) → {dispose()}: tiles are the chunk's water tiles.
export const STREAM_WATER_LEVEL=.85;
const WAVE_GLSL=`uniform float uTime;uniform float uWave;attribute float shore;
float waterWave(vec2 p){return .012*sin(p.x*2.1+p.y*1.4-uTime*.8)+.006*sin(p.y*2.7-p.x*.9+uTime*.55);}`;
export function createStreamedWater(renderer){
 const uniforms={uTime:{value:0},uWave:{value:1}};
 const displace=material=>{material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=WAVE_GLSL+'\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vec2 worldXZ=(modelMatrix*vec4(position,1.)).xz;transformed.y+=waterWave(worldXZ)*uWave*shore;');};
  material.customProgramCacheKey=()=>'streamed-water';return material;};
 const surface=displace(new THREE.MeshStandardMaterial({color:waterSettings.color,flatShading:waterSettings.faceted,roughness:waterSettings.roughness,envMap:renderer?waterReflection(renderer):null,envMapIntensity:waterSettings.reflectionStrength,metalness:.08,transparent:true,opacity:waterSettings.opacity,depthWrite:false}));
 const glintUniforms={time:{value:0},intensity:{value:1}};
 const glints=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...glintUniforms,...uniforms},
  vertexShader:WAVE_GLSL+`\nvarying vec2 surface; varying vec2 tileUV;
   void main(){tileUV=uv;vec4 world=modelMatrix*vec4(position,1.);world.y+=waterWave(world.xz)*uWave*shore+.003;surface=world.xz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:GLINT_FRAGMENT});
 let applied=null;
 return {
  build(tiles,isWater,parent,offset=6){
   const n=tiles.length;if(!n)return {dispose(){}};
   // A 2 × 2 grid per tile: the middle row and column move; edges move only where water continues.
   const positions=[],uvs=[],shores=[],index=[];
   for(const t of tiles){
    const open=(dx,dz)=>isWater(t.x+dx,t.z+dz)?1:0,base=positions.length/3;
    for(let j=0;j<3;j++)for(let i=0;i<3;i++){
     const px=i/2-.5,pz=j/2-.5;positions.push(t.x-offset+px,STREAM_WATER_LEVEL,t.z-offset+pz);uvs.push(i/2,1-j/2);
     const edgeX=i===0?open(-1,0):i===2?open(1,0):1,edgeZ=j===0?open(0,-1):j===2?open(0,1):1;
     shores.push(edgeX&&edgeZ&&(i===1||j===1||open(i===0?-1:1,j===0?-1:1))?1:0);}
    for(let j=0;j<2;j++)for(let i=0;i<2;i++){const a=base+j*3+i,b=a+1,c=a+3,d=c+1;index.push(a,c,b,b,c,d);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
   geometry.setAttribute('shore',new THREE.Float32BufferAttribute(shores,1));geometry.setIndex(index);geometry.computeVertexNormals();
   const water=new THREE.Mesh(geometry,surface),shine=new THREE.Mesh(geometry,glints);water.name='streamed-water';water.receiveShadow=true;water.renderOrder=1;shine.renderOrder=2;
   for(const m of [water,shine]){m.matrixAutoUpdate=false;m.updateMatrix();parent.add(m);}
   return {dispose(){water.removeFromParent();shine.removeFromParent();geometry.dispose();}};
  },
  update(dt){
   uniforms.uTime.value+=dt*waterSettings.speed;glintUniforms.time.value=uniforms.uTime.value;
   uniforms.uWave.value=waterSettings.enabled&&waterSettings.waves?waterSettings.waveStrength:0;
   glintUniforms.intensity.value=waterSettings.enabled&&waterSettings.shimmers?waterSettings.intensity:0;
   surface.opacity=waterSettings.opacity;surface.roughness=waterSettings.roughness;surface.envMapIntensity=waterSettings.reflectionStrength;
   if(waterSettings.color!==applied){applied=waterSettings.color;surface.color.set(applied);}
   if(surface.flatShading!==waterSettings.faceted){surface.flatShading=waterSettings.faceted;surface.needsUpdate=true;}
  },
 };
}
