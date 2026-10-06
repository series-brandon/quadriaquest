import {resourceTone} from './player-resources.js';
export function createResourceOrb(label,resource,id){
 const hud=document.createElement('aside');hud.id=id;hud.className='resource-orb';hud.hidden=true;
 hud.setAttribute('role','meter');hud.setAttribute('aria-label',label);hud.setAttribute('aria-valuemin','0');
 hud.innerHTML='<span class="health-orb-fill" aria-hidden="true"></span><strong class="health-orb-value" aria-hidden="true"></strong>';
 const number=hud.querySelector('.health-orb-value');let previous='';
 return {element:hud,update(visible=true){const signature=`${visible}:${resource.value}:${resource.max}`;if(signature===previous)return;previous=signature;hud.hidden=!visible;hud.style.setProperty('--health-fill',`${100*resource.value/resource.max}%`);hud.dataset.tone=resourceTone(resource.value,resource.max);hud.setAttribute('aria-valuemax',String(resource.max));hud.setAttribute('aria-valuenow',String(resource.value));hud.setAttribute('aria-valuetext',`${resource.value} of ${resource.max} ${label.toLowerCase()}`);hud.title=`${label}: ${resource.value} / ${resource.max}`;number.textContent=Math.ceil(resource.value);}};
}
