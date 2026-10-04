import * as THREE from 'three';

const reflections=new WeakMap();
// A small procedural sky used only by water, not the scene background or terrain.
export function waterReflection(renderer){
 if(reflections.has(renderer))return reflections.get(renderer).texture;
 const width=256,height=128,data=new Float32Array(width*height*4);
 const sun=new THREE.Vector3(-.35,.8,.5).normalize();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const latitude=(y/(height-1)-.5)*Math.PI,longitude=(x/(width-1)-.5)*Math.PI*2;
  const direction=new THREE.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude));
  const up=Math.max(0,direction.y),sunlight=12*Math.exp((direction.dot(sun)-1)*180);
  const cloud=Math.pow(Math.max(0,Math.sin(longitude*2+up*3)),6)*Math.exp(-Math.pow((up-.55)/.3,2))*.8;
  const i=(y*width+x)*4;
  data[i]=.35+up*.3+cloud+sunlight;
  data[i+1]=.45+up*.35+cloud+sunlight*.95;
  data[i+2]=.5+up*.5+cloud+sunlight*.8;
  data[i+3]=1;
 }
 const sky=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
 sky.mapping=THREE.EquirectangularReflectionMapping;sky.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(sky);
 generator.dispose();sky.dispose();reflections.set(renderer,target);
 return target.texture;
}
