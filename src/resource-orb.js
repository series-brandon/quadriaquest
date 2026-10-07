import {resourceTone} from './player-resources.js';
import {displayResource} from './combat-formulas.js';
export function createResourceOrb(label,resource,id){
 const hud=document.createElement('aside');hud.id=id;hud.className='resource-orb';hud.hidden=true;
 hud.setAttribute('role','meter');hud.setAttribute('aria-label',label);hud.setAttribute('aria-valuemin','0');
 hud.innerHTML='<span class="health-orb-fill" aria-hidden="true"></span><strong class="health-orb-value" aria-hidden="true"></strong>';
 const number=hud.querySelector('.health-orb-value');let previous='';
 return {element:hud,update(visible=true){
  // Write only when the displayed whole number changes; fractional regeneration ticks every frame.
  const value=displayResource(resource.value),max=resource.max,signature=`${visible}:${value}:${max}`;if(signature===previous)return;previous=signature;hud.hidden=!visible;hud.style.setProperty('--health-fill',`${max>0?100*value/max:0}%`);hud.dataset.tone=resourceTone(value,max);hud.setAttribute('aria-valuemax',String(max));hud.setAttribute('aria-valuenow',String(value));hud.setAttribute('aria-valuetext',`${value} of ${max} ${label.toLowerCase()}`);hud.title=`${label}: ${value} / ${max}`;number.textContent=value;}};
}
