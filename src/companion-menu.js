import * as THREE from 'three';
import {companion,animateCompanion} from './companion-model.js';
import {CORGI_NAMES} from './random-names.js';
import {nameDialog} from './ui/dialogs/name-dialog.js';
import {h,mount} from './ui/dom.js';
import {companionsPage} from './ui/pages/companions-page.js';
export function createCompanionMenu(system,{panels,modals,narrator,canClose=()=>true}){
 // The live portrait renders here (Three.js); the page (ui/pages/companions-page.js) shows it.
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Your companion');const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(200,150,false);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff9df','#809786',3));const camera=new THREE.PerspectiveCamera(35,4/3,.1,10);camera.position.set(.8,.8,1.8);camera.lookAt(0,.3,0);const portrait=companion();scene.add(portrait);let confirming=false;
 const panel=mount(()=>h('section',{id:'companions-panel','aria-label':'Companions',hidden:true},companionsPage({system,portrait:canvas,onRename:()=>editName()}))).node;
 document.getElementById('journal').append(panel);
 // Always available: before a companion joins, the page's empty state hints at finding one.
 panels.register({id:'companions',label:'Companions',icon:'companions',order:70,element:panel,select(){panels.open('companions');}});
 function closeName(){if(confirming){narrator.hide();confirming=false;}modals.close('companion-name');}
 function editName({required=false,onComplete}={}){
  closeName();
  nameDialog(modals,{id:'companion-name',title:'Name your companion',value:system.state.name,names:CORGI_NAMES,required,onSubmit(name){
   const accept=()=>{system.rename(name);onComplete?.(name);},retry=()=>editName({required,onComplete});
   const choice=(text,action,quiet=false)=>h('button',{type:'button',class:quiet?'q-narrator__button q-narrator__button--quiet':'q-narrator__button',on:{click:event=>{event.stopPropagation();closeName();action();}}},text);
   narrator.show({text:`Is ${name} the name you’re going with?`,input:true,controls:()=>[choice('Yes',accept),choice('No, change their name',retry,true)]});
   confirming=true;
  }});
 }
 const portraitSize={width:0,height:0};
 const menu={editName,close(){if(canClose()&&panels.isOpen('companions'))panels.close();closeName();},update(time){if(panel.hidden||!system.state.owned)return;animateCompanion(portrait,time);portrait.rotation.y=Math.sin(time)*.12;const {clientWidth:width,clientHeight:height}=canvas;if(width&&height&&(width!==portraitSize.width||height!==portraitSize.height)){portraitSize.width=width;portraitSize.height=height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}renderer.render(scene,camera);},dispose(){closeName();renderer.dispose();panel.remove();}};
 system.attachMenu(menu);return menu;
}
