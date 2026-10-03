import {SLIME_EXPRESSIONS} from './slime-face.js';
import {idlePose} from './slime-motion.js';
import * as THREE from 'three';
// Portraits clone the live model hierarchy and mirror its transforms each frame.
// Mesh geometry/materials stay shared with the world actor, including cosmetics.
export function createCharacterDialogue(){
 const box=document.createElement('section');box.id='character-dialogue';box.hidden=true;box.setAttribute('aria-label','Conversation');
 box.innerHTML='<div class="speaker-portrait"><canvas aria-hidden="true"></canvas></div><strong class="speaker-name"></strong><div class="speaker-content"><p></p><div class="speaker-choices"></div><button class="speaker-next">Click / tap to continue ▸</button></div>';
 document.body.append(box);
 const render=new THREE.WebGLRenderer({canvas:box.querySelector('canvas'),alpha:true,antialias:true});render.setPixelRatio(Math.min(devicePixelRatio,2));render.setSize(420,420,false);render.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff8e7','#899f9a',3));const light=new THREE.DirectionalLight('#fff4dd',3);light.position.set(-2,4,4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(36,1,.1,20);camera.position.set(0,.60,1.65);camera.lookAt(0,.47,0);
 let revision=0;const expressions={};
 let pairs=[],model,source,speaker=null,queue=null,age=0,life=0,next=null,pendingChoices=null,choiceAge=null;
 function install(line){
  expressions[line.side]=line.expression;
  const entrance=speaker!==line.side||source!==line.model||box.dataset.mode==='choices';
  box.dataset.mode='line';box.classList.remove('choosing');pendingChoices=line.choices||null;choiceAge=null;
  if(model)scene.remove(model);source=line.model;pairs=[];
  function clone(a){const b=a.isMesh?new THREE.Mesh(a.geometry,a.material):a.isLine?new THREE.Line(a.geometry,a.material):new THREE.Group();pairs.push([a,b]);for(const child of a.children)if(!child.userData.portraitIgnore)b.add(clone(child));return b;}
  model=clone(source);model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);model.visible=true;scene.add(model);
  speaker=line.side;box.dataset.side=speaker;box.classList.remove('exiting');box.classList.toggle('entering',entrance);age=0;
  box.querySelector('strong').textContent=line.name;box.querySelector('p').textContent=line.text;const choices=box.querySelector('.speaker-choices');choices.replaceChildren();box.querySelector('.speaker-content').scrollTop=0;
  next=line.next;box.querySelector('.speaker-next').hidden=false;
  for(const [text,action] of line.choices||[]){const b=document.createElement('button');b.textContent=text;b.onclick=e=>{e.stopPropagation();if(!queue&&box.dataset.mode==='choices')action();};choices.append(b);}
 }
 box.tabIndex=0;
 function advance(){if(queue||choiceAge!==null||box.dataset.mode==='choices')return;if(pendingChoices){choiceAge=0;box.classList.add('choosing');}else next?.();}
 box.addEventListener('click',e=>{if(!e.target.closest('.speaker-choices'))advance();});
 box.addEventListener('keydown',e=>{if(e.target===box&&(e.key==='Enter'||e.key===' ')){e.preventDefault();advance();}});
 return {expressionFor(side){return box.hidden?null:expressions[side]||null;},get active(){return !box.hidden;},show(line){if(!SLIME_EXPRESSIONS.includes(line.expression))throw new Error('Every character dialogue line requires a valid expression.');revision++;box.hidden=false;if(box.dataset.mode!=='choices'&&speaker!==null&&(speaker!==line.side||source!==line.model)){queue=line;age=0;box.classList.add('exiting');box.querySelector('.speaker-next').disabled=true;}else install(line);},finish(after){const current=revision;after?.();if(revision===current)this.hide();},hide(){delete expressions.left;delete expressions.right;revision++;box.hidden=true;queue=null;next=null;speaker=null;choiceAge=null;pendingChoices=null;box.classList.remove('choosing');box.querySelector('.speaker-next').disabled=false;},update(dt){if(box.hidden)return;age+=dt;life+=dt;if(choiceAge!==null){choiceAge+=dt;if(choiceAge>=.2){choiceAge=null;pendingChoices=null;box.dataset.mode='choices';box.classList.remove('choosing','entering');box.querySelector('.speaker-next').hidden=true;box.querySelector('.speaker-choices button')?.focus();}}if(queue&&age>=.22){const line=queue;queue=null;install(line);box.querySelector('.speaker-next').disabled=false;}if(!model)return;
  for(const [a,b] of pairs)if(b!==model){b.position.copy(a.position);b.quaternion.copy(a.quaternion);b.scale.copy(a.scale);b.visible=a.visible;}const pose=idlePose(life),squash=1+(pose.squash-1)*.28;model.rotation.y=(speaker==='left'?.52:-.52)+pose.twist*.18;model.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));model.position.y=-.035;render.render(scene,camera);
 }};
}
