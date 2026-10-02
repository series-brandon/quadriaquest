import {idlePose} from './slime-motion.js';
import * as THREE from 'three';
// Portraits clone the live model hierarchy and mirror its transforms each frame.
// Mesh geometry/materials stay shared with the world actor, including cosmetics.
export function createCharacterDialogue(){
 const box=document.createElement('section');box.id='character-dialogue';box.hidden=true;box.setAttribute('aria-label','Conversation');
 box.innerHTML='<div class="speaker-portrait"><canvas aria-hidden="true"></canvas><strong></strong></div><div class="speaker-content"><p></p><div class="speaker-choices"></div><button class="speaker-next">Continue</button></div>';
 document.body.append(box);
 const render=new THREE.WebGLRenderer({canvas:box.querySelector('canvas'),alpha:true,antialias:true});render.setPixelRatio(Math.min(devicePixelRatio,2));render.setSize(180,180,false);render.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff8e7','#899f9a',3));const light=new THREE.DirectionalLight('#fff4dd',3);light.position.set(-2,4,4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(36,1,.1,20);camera.position.set(0,.60,1.65);camera.lookAt(0,.47,0);
 let pairs=[],model,source,speaker=null,queue=null,age=0,life=0,next=null;
 function install(line){
  if(model)scene.remove(model);source=line.model;pairs=[];
  function clone(a){const b=a.isMesh?new THREE.Mesh(a.geometry,a.material):a.isLine?new THREE.Line(a.geometry,a.material):new THREE.Group();pairs.push([a,b]);for(const child of a.children)if(!child.userData.portraitIgnore)b.add(clone(child));return b;}
  model=clone(source);model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);model.visible=true;scene.add(model);
  speaker=line.side;box.dataset.side=speaker;box.classList.remove('exiting');box.classList.add('entering');age=0;
  box.querySelector('strong').textContent=line.name;box.querySelector('p').textContent=line.text;const choices=box.querySelector('.speaker-choices');choices.replaceChildren();
  next=line.next;box.querySelector('.speaker-next').hidden=!!line.choices;
  for(const [text,action] of line.choices||[]){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{if(!queue)action();};choices.append(b);}
 }
 box.querySelector('.speaker-next').onclick=()=>{if(!queue)next?.();};
 return {get active(){return !box.hidden;},show(line){box.hidden=false;if(speaker!==null&&speaker!==line.side){queue=line;age=0;box.classList.add('exiting');box.querySelector('.speaker-next').disabled=true;}else install(line);},hide(){box.hidden=true;queue=null;next=null;speaker=null;box.querySelector('.speaker-next').disabled=false;},update(dt){if(box.hidden)return;age+=dt;life+=dt;if(queue&&age>=.22){const line=queue;queue=null;install(line);box.querySelector('.speaker-next').disabled=false;}if(!model)return;
  for(const [a,b] of pairs)if(b!==model){b.position.copy(a.position);b.quaternion.copy(a.quaternion);b.scale.copy(a.scale);b.visible=a.visible;}const pose=idlePose(life);model.rotation.y=(speaker==='left'?.32:-.32)+pose.twist*.5;model.scale.set(1/Math.sqrt(pose.squash),pose.squash,1/Math.sqrt(pose.squash));model.position.y=-.035;render.render(scene,camera);
 }};
}
