import {gameViewport} from './game-viewport.js';
import {Vector3} from 'three';
// Outcome is the shared resolution result: miss, dodge, block, hit or critical.
const LABELS={miss:'Miss!',dodge:'Dodged!',block:'Blocked!'};
export const hitLabel=(damage,outcome)=>LABELS[outcome]||(damage===null?'Miss!':`${damage}!`);
const kindOf=(damage,outcome)=>outcome==='backfire'?'backfire':outcome==='block'?'blocked':outcome==='dodge'?'dodge':outcome==='critical'?'critical':damage===null?'miss':damage===0?'blocked':'damage';
export function createCombatFeedback(){
 const entries=[],point=new Vector3();
 function clear(){for(const e of entries)e.node.remove();entries.length=0;}
 return {clear,show(position,damage,outcome){
  const node=document.createElement('span');node.className='combat-hit';node.dataset.kind=kindOf(damage,outcome);node.textContent=hitLabel(damage,outcome);node.setAttribute('aria-hidden','true');document.body.append(node);
  entries.push({node,position:position.clone(),age:0,offset:(entries.length%3-1)*23});
 },update(dt,camera){const view=gameViewport();for(let i=entries.length-1;i>=0;i--){const e=entries[i];e.age+=dt;if(e.age>=1.15){e.node.remove();entries.splice(i,1);continue;}point.copy(e.position);point.y+=.9+e.age*.35;point.project(camera);
  // One composited write per frame (transform, no layout); off-screen splats are hidden by display.
  const x=view.left+(point.x+1)*view.width/2+e.offset,y=view.top+(1-point.y)*view.height/2,pop=1+Math.sin(Math.min(1,e.age/.18)*Math.PI)*.3;
  e.node.style.cssText=point.z>1||point.z<-1?'display:none':`transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${pop.toFixed(3)});opacity:${Math.min(1,(1.15-e.age)/.3).toFixed(3)}`;}}
 };
}
