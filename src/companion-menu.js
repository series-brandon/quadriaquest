import * as THREE from 'three';
import {companion,animateCompanion} from './companion-model.js';
import {addNameDice,CORGI_NAMES} from './random-names.js';
import {icon} from './icons.js';
import './companion-menu.css';
export function createCompanionMenu(system,{closeMenus,canClose=()=>true}){
 const panel=document.createElement('section');panel.id='companions-panel';panel.hidden=true;panel.setAttribute('aria-label','Companions');panel.innerHTML='<div class="crafting-heading"><h2>Companions</h2><button aria-label="Close companions">×</button></div><div class="companion-content"></div>';
 document.getElementById('journal').append(panel);
 const tab=document.createElement('button');tab.id='open-companions';tab.innerHTML=icon('companions')+'<span>Companions</span>';tab.hidden=true;document.getElementById('game-menu-bar').insertBefore(tab,document.querySelector('[data-journal-last]'));
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Your companion');const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(200,150,false);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff9df','#809786',3));const camera=new THREE.PerspectiveCamera(35,4/3,.1,10);camera.position.set(.8,.8,1.8);camera.lookAt(0,.3,0);const portrait=companion();scene.add(portrait);let detailOpen=false,modal=null,confirming=false;
 // The opening also listens on this shared narrator box; confirmation only advances through its buttons.
 const narrator=document.getElementById('dialogue');
 const guardConfirmation=e=>{if(confirming&&!e.target.closest('button')){e.stopImmediatePropagation();if(e.type==='keydown')e.preventDefault();}};
 narrator.addEventListener('click',guardConfirmation,true);narrator.addEventListener('keydown',guardConfirmation,true);
 function closeName(){if(confirming){document.getElementById('dialogue').hidden=true;document.getElementById('dialogue-controls').replaceChildren();confirming=false;}if(modal){modal.close();modal.remove();modal=null;}}
 function editName({required=false,onComplete}={}){
  closeName();modal=document.createElement('dialog');modal.className='companion-modal';modal.innerHTML='<h2>Name your companion</h2><label>Name <input maxlength="20"></label><p role="status"></p><button data-confirm-name>Confirm name</button>';document.body.append(modal);const input=modal.querySelector('input');input.value=system.state.name;addNameDice(input,CORGI_NAMES);modal.showModal();modal.addEventListener('cancel',e=>{if(required)e.preventDefault();});
  modal.querySelector('[data-confirm-name]').onclick=()=>{const name=input.value.trim();if(!name){modal.querySelector('[role="status"]').textContent='Please enter a name.';return;}closeName();const accept=()=>{system.rename(name);onComplete?.(name);},retry=()=>editName({required,onComplete});
   const dialogue=document.getElementById('dialogue'),controls=document.getElementById('dialogue-controls');
   dialogue.dataset.presentation='conversation';dialogue.dataset.input='true';dialogue.tabIndex=-1;
   dialogue.querySelector('.dialogue-speaker').textContent='???';
   const text=`Is ${name} the name you’re going with?`;
   document.getElementById('dialogue-line').textContent=text;dialogue.setAttribute('aria-label',text);
   document.getElementById('dialogue-prompt').hidden=true;controls.replaceChildren();
   const yes=document.createElement('button'),no=document.createElement('button');yes.type=no.type='button';
   yes.textContent='Yes';no.textContent='No, change their name';no.className='secondary';
   yes.onclick=e=>{e.stopPropagation();closeName();accept();};no.onclick=e=>{e.stopPropagation();closeName();retry();};
   controls.append(yes,no);confirming=true;dialogue.hidden=false;
  };
 }
 function render(){const content=panel.querySelector('.companion-content');content.replaceChildren();if(!system.state.owned){content.textContent='No companions yet.';return;}const {name,following}=system.state;const heading=document.createElement('h3');heading.textContent=name;const desc=document.createElement('p');desc.textContent='Your little companion. Safe from harm and always happy to see you.';content.classList.add('journal-browser');panel.classList.toggle('viewing-detail',detailOpen);const choices=document.createElement('div'),detail=document.createElement('section'),entry=document.createElement('button'),back=document.createElement('button');choices.className='journal-list';detail.className='journal-detail';entry.className='journal-entry';entry.textContent=name+' · Corgi';entry.setAttribute('aria-pressed','true');entry.onclick=()=>{detailOpen=true;render();};back.className='journal-back';back.textContent='Back to companions';back.onclick=()=>{detailOpen=false;render();};choices.append(entry);detail.append(back,canvas,heading,desc);content.append(choices,detail);for(const [label,fn]of [['Rename',()=>editName()], [following?'Rest':'Follow',()=>system.setFollowing(!system.state.following)]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;detail.append(b);}}
 tab.onclick=()=>{closeMenus();detailOpen=false;render();panel.hidden=false;};panel.querySelector('button').onclick=()=>panel.hidden=true;
 const unsubscribe=system.onChange(()=>{if(system.state.owned)tab.hidden=false;render();});
 const menu={editName,render,unlock(){tab.hidden=false;},close(){if(canClose())panel.hidden=true;closeName();},update(time){if(panel.hidden||!system.state.owned)return;animateCompanion(portrait,time);portrait.rotation.y=Math.sin(time)*.12;const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}renderer.render(scene,camera);},dispose(){unsubscribe();closeName();narrator.removeEventListener('click',guardConfirmation,true);narrator.removeEventListener('keydown',guardConfirmation,true);renderer.dispose();panel.remove();tab.remove();}};
 system.attachMenu(menu);return menu;
}
