import * as THREE from 'three';
import {signal} from '../reactive.js';
import {propModel,cleanColors} from '../props.js';

// Prop thumbnails for the world editor's palette (dev only; docs/TOWN.md, Prop palette). Each prop's real
// model (props.js propModel) is drawn once from the game's own isometric angle into a small image. A
// thumbnail is a signal: empty until drawn, then a data URL. Drawing happens a few at a time across
// frames, the first time the palette asks, with one offscreen renderer that is freed when the queue
// empties (it is made again if more are asked for later).
const SIZE=96,PER_FRAME=4,cache=new Map(),queue=[];
let renderer=null,scene=null,camera=null,scheduled=false;
function setup(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(SIZE,SIZE);renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#8a8f7a',1.6));const sun=new THREE.DirectionalLight('#fff4e0',1.8);sun.position.set(4,8,6);scene.add(sun);
 camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
}
function draw({kind,colors}){
 const model=propModel(kind,colors);scene.add(model);
 // Fit the model's bounding sphere, seen from the south-east and above, as in the game.
 const box=new THREE.Box3().setFromObject(model),sphere=box.getBoundingSphere(new THREE.Sphere()),r=Math.max(.4,sphere.radius)*1.05;
 camera.left=-r;camera.right=r;camera.top=r;camera.bottom=-r;camera.updateProjectionMatrix();
 camera.position.copy(sphere.center).add(new THREE.Vector3(1,1.1,1).normalize().multiplyScalar(20));camera.lookAt(sphere.center);
 renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');
 // The model's geometry is shared per kind (merged-model.js), so only the group leaves the scene.
 scene.remove(model);return url;
}
function pump(){
 scheduled=false;if(!renderer)setup();
 for(let i=0;i<PER_FRAME&&queue.length;i++){const job=queue.shift();try{cache.get(job.key).value=draw(job);}catch{cache.get(job.key).value='';}}
 if(queue.length){scheduled=true;requestAnimationFrame(pump);}else{renderer.dispose();renderer.forceContextLoss();renderer=null;scene=null;camera=null;}
}
// The thumbnail of a prop kind, in its own colours or recoloured (a colour preset; props.js colours): a signal of
// its image URL ('' until drawn).
export function propThumbnail(kind,colors=null){
 colors=cleanColors(kind,colors);const key=kind+(colors?'|'+Object.entries(colors).sort().map(e=>e.join('>')).join(','):'');
 if(!cache.has(key)){cache.set(key,signal(''));queue.push({key,kind,colors});if(!scheduled){scheduled=true;requestAnimationFrame(pump);}}
 return cache.get(key);
}
