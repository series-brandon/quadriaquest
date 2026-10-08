import {SLIME_EXPRESSIONS} from './slime-face.js';
import {idlePose} from './slime-motion.js';
import * as THREE from 'three';
import {signal} from './reactive.js';
import {h,mount} from './ui/dom.js';
import {keyedList} from './ui/list.js';

// Character conversations (Reed, Bristle, mentors…): a speaker portrait, name badge, the line, and
// the player's responses. Portraits clone the live model hierarchy and mirror its transforms each
// frame; mesh geometry and materials stay shared with the world actor, including cosmetics.
// The box keeps the id `character-dialogue` (shared HUD layout rules, perf scenarios).
export function createCharacterDialogue({player}){
 const open=signal(false),line=signal({name:'',text:'',side:'left',hasModel:false}),mode=signal('line');
 const entering=signal(false),exiting=signal(false),choosing=signal(false),choices=signal([]);
 let content,choiceList;
 const canvas=h('canvas',{'aria-hidden':'true'});
 const view=mount(()=>h('section',{
  id:'character-dialogue',class:'q-conversation','aria-label':'Conversation',tabindex:'0',hidden:()=>!open.value,
  'data-mode':mode,'data-side':()=>line.value.side,
  classes:{'q-conversation--entering':entering,'q-conversation--exiting':exiting,'q-conversation--choosing':choosing},
  on:{click:event=>{if(!event.target.closest?.('.q-conversation__choices'))advance();},
   keydown:event=>{if(event.target===view.node&&(event.key==='Enter'||event.key===' ')){event.preventDefault();advance();}}},
 },
 h('div',{class:'q-conversation__portrait',hidden:()=>!line.value.hasModel},canvas),
 h('strong',{class:'q-conversation__name'},()=>line.value.name),
 h('div',{class:'q-conversation__content',ref:element=>{content=element;}},
  h('p',{class:'q-conversation__line'},()=>line.value.text),
  keyedList(h('div',{class:'q-conversation__choices',ref:element=>{choiceList=element;}}),choices,choice=>choice.key,item=>h('button',{type:'button',class:'q-conversation__choice',on:{click:event=>{event.stopPropagation();respond(item.peek());}}},item.peek().text)),
  h('button',{type:'button',class:'q-conversation__next',hidden:()=>mode.value==='choices',disabled:exiting},'Click / tap to continue ▸'))));
 document.body.append(view.node);

 const render=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});render.setPixelRatio(Math.min(devicePixelRatio,2));render.setSize(420,420,false);render.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff8e7','#899f9a',3));const light=new THREE.DirectionalLight('#fff4dd',3);light.position.set(-2,4,4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(36,1,.1,20);camera.position.set(0,.60,1.65);camera.lookAt(0,.47,0);
 let revision=0,installs=0;const expressions={};
 let pairs=[],model,source,speaker=null,queue=null,age=0,life=0,next=null,pendingChoices=null,choiceAge=null;
 function install(current){
  expressions[current.side]=current.expression;
  const entrance=speaker!==current.side||source!==current.model||mode.peek()==='choices';
  mode.value='line';choosing.value=false;pendingChoices=current.choices||null;choiceAge=null;
  if(model)scene.remove(model);source=current.model;pairs=[];
  function clone(a){const b=a.isMesh?new THREE.Mesh(a.geometry,a.material):a.isLine?new THREE.Line(a.geometry,a.material):new THREE.Group();pairs.push([a,b]);for(const child of a.children)if(!child.userData.portraitIgnore)b.add(clone(child));return b;}
  model=source?clone(source):new THREE.Group();model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);model.visible=true;scene.add(model);
  speaker=current.side;exiting.value=false;entering.value=entrance;age=0;
  line.value={name:current.name,text:current.text,side:current.side,hasModel:!!source};
  // A response is always a spoken player line. Areas supply only its text,
  // expression and the narrative continuation, which runs after that line.
  installs++;choices.value=(current.choices||[]).map(([text,action,expression='idle'],index)=>({key:`${installs}:${index}`,text,action,expression}));
  if(content)content.scrollTop=0;
  next=current.next;
 }
 function respond(choice){
  if(queue||mode.peek()!=='choices')return;
  let continued=false;
  dialogue.show({...player(),side:'left',text:choice.text,expression:choice.expression,next:()=>{
   if(continued)return;continued=true;dialogue.finish(choice.action);
  }});
 }
 function advance(){if(queue||choiceAge!==null||mode.peek()==='choices')return;if(pendingChoices){choiceAge=0;choosing.value=true;}else next?.();}
 const dialogue={
  showPlayer(current){this.show({...player(),...current,side:'left'});},
  expressionFor(side){return open.peek()?expressions[side]||null:null;},
  get active(){return open.peek();},
  show(current){
   if(!SLIME_EXPRESSIONS.includes(current.expression))throw new Error('Every character dialogue line requires a valid expression.');
   revision++;open.value=true;
   if(mode.peek()!=='choices'&&speaker!==null&&(speaker!==current.side||source!==current.model)){queue=current;age=0;exiting.value=true;}else install(current);
  },
  finish(after){const current=revision;after?.();if(revision===current)this.hide();},
  hide(){delete expressions.left;delete expressions.right;revision++;open.value=false;queue=null;next=null;speaker=null;choiceAge=null;pendingChoices=null;choosing.value=false;exiting.value=false;},
  update(dt){
   if(!open.peek())return;age+=dt;life+=dt;
   if(choiceAge!==null){choiceAge+=dt;if(choiceAge>=.2){choiceAge=null;pendingChoices=null;mode.value='choices';choosing.value=false;entering.value=false;
    // After the frame's flush shows the choices.
    queueMicrotask(()=>choiceList?.firstElementChild?.focus?.());}}
   if(queue&&age>=.22){const current=queue;queue=null;install(current);}
   if(!model)return;
   for(const [a,b] of pairs)if(b!==model){b.position.copy(a.position);b.quaternion.copy(a.quaternion);b.scale.copy(a.scale);b.visible=a.visible;}
   const pose=idlePose(life),squash=1+(pose.squash-1)*.28;model.rotation.y=(speaker==='left'?.52:-.52)+pose.twist*.18;model.scale.set(1/Math.sqrt(squash),squash,1/Math.sqrt(squash));model.position.y=-.035;render.render(scene,camera);
  }
 };
 return dialogue;
}
