import {gameViewport} from './game-viewport.js';
import {Vector3} from 'three';
export const hitLabel=damage=>damage===null?'Miss!':`${damage}!`;
export function createCombatFeedback(){
 const entries=[],point=new Vector3();
 function clear(){for(const e of entries)e.node.remove();entries.length=0;}
 return {clear,show(position,damage){
  const node=document.createElement('span');node.className='combat-hit';node.dataset.kind=damage===null?'miss':damage===0?'blocked':'damage';node.textContent=hitLabel(damage);node.setAttribute('aria-hidden','true');document.body.append(node);
  entries.push({node,position:position.clone(),age:0,offset:(entries.length%3-1)*23});
 },update(dt,camera){const view=gameViewport();for(let i=entries.length-1;i>=0;i--){const e=entries[i];e.age+=dt;if(e.age>=1.15){e.node.remove();entries.splice(i,1);continue;}point.copy(e.position);point.y+=.9+e.age*.35;point.project(camera);e.node.hidden=point.z>1||point.z<-1;e.node.style.left=(view.left+(point.x+1)*view.width/2+e.offset)+'px';e.node.style.top=(view.top+(1-point.y)*view.height/2)+'px';e.node.style.opacity=String(Math.min(1,(1.15-e.age)/.3));const pop=1+Math.sin(Math.min(1,e.age/.18)*Math.PI)*.3;e.node.style.transform=`translate(-50%,-50%) scale(${pop})`;}}
 };
}
