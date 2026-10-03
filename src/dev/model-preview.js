import {attackPose} from '../combat-motion.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {makeTree,makeFlowers,makeTerrainTile} from '../world-models.js';
import {createGroundItemModel} from '../ground-item-models.js';
import {makeSlime} from '../slime-model.js';
import {fisher,goblin,companion,animateGoblin,animateCompanion} from '../willowbank-models.js';
import {makeBoulder} from '../mining.js';
import {key} from '../world.js';
export function createModelPreview(){
 const modal=document.createElement('dialog');modal.id='dev-model-preview';modal.innerHTML='<h2>Shared model preview</h2><label>Model <select></select></label><label>Animation <select data-motion><option>Idle</option><option>Walk</option><option>Attack</option><option>Hit</option><option>Sad</option></select></label><p style="font-size:13px">Drag the model to rotate · mouse or touch</p><canvas aria-label="Model preview: drag to rotate"></canvas><button data-reset-view>Reset view</button> <button data-close>Close preview</button>';document.body.append(modal);
 Object.assign(modal.style,{width:'min(560px,90vw)',background:'#faf1e7',border:'1px solid #a18ab0',borderRadius:'16px',color:'#392d44'});
 const canvas=modal.querySelector('canvas');canvas.style.cssText='display:block;width:100%;height:320px;touch-action:none;cursor:grab';
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setSize(520,320,false);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fffce8','#879981',2.6));const sun=new THREE.DirectionalLight('#fff3d3',3);sun.position.set(-8,19,5);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(35,520/320,.01,30),select=modal.querySelector('select'),motion=modal.querySelector('[data-motion]');
 const controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableZoom=false;controls.rotateSpeed=.7;controls.minPolarAngle=.05;controls.maxPolarAngle=Math.PI-.05;
 controls.addEventListener('start',()=>canvas.style.cursor='grabbing');controls.addEventListener('end',()=>canvas.style.cursor='grab');
 const factories={Tree:makeTree,Flowers:makeFlowers,Sticks:()=>createGroundItemModel('sticks'),Rocks:()=>createGroundItemModel('stones'),Boulder:makeBoulder,Slime:()=>makeSlime().group,Reed:()=>fisher().group,Goblin:goblin,'Goblin Bruiser':()=>goblin(true),Corgi:companion,'Joined grass tiles':()=>{const g=new THREE.Group(),tiles=[{x:0,z:0,h:1},{x:1,z:0,h:1},{x:0,z:1,h:1.5}],map=new Map(tiles.map(t=>[key(t.x,t.z),t]));for(const t of tiles){const m=makeTerrainTile(t,map,new THREE.MeshStandardMaterial({color:'#358d3d'}));m.position.set(t.x,0,t.z);g.add(m);}return g;}};
 for(const name of Object.keys(factories)){const o=document.createElement('option');o.textContent=name;select.append(o);}
 let model,age=0,last=0,frame=0;
 function load(){if(model){scene.remove(model);model.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});}model=factories[select.value]();scene.add(model);age=0;const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length();camera.position.copy(center).add(new THREE.Vector3(.45,.25,1).multiplyScalar(size*1.5));controls.target.copy(center);controls.update();controls.saveState();}
 function draw(now){if(!modal.open)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;age+=dt;const kind=select.value;if(kind.startsWith('Goblin'))animateGoblin(model,age,{walk:motion.value==='Walk'?1:0,attack:motion.value==='Attack'&&age>1.07?attackPose(age):0,hit:motion.value==='Hit'?Math.max(0,Math.sin(age*4)):0});else if(kind==='Corgi')animateCompanion(model,age,{moving:motion.value==='Walk',sad:motion.value==='Sad'});else if(kind==='Slime'||kind==='Reed')model.scale.y=1+Math.sin(age*2.8)*.025;renderer.render(scene,camera);frame=requestAnimationFrame(draw);}
 select.onchange=load;modal.querySelector('[data-reset-view]').onclick=()=>controls.reset();modal.querySelector('[data-close]').onclick=()=>modal.close();modal.addEventListener('close',()=>cancelAnimationFrame(frame));
 return {show(){load();modal.showModal();last=0;frame=requestAnimationFrame(draw);}};
}
