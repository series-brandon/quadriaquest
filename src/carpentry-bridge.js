import * as THREE from 'three';
import {makeBridge} from './bridge-model.js';
import {part} from './model-parts.js';
import {highlightResource} from './resource-highlight.js';

export function createCarpentryBridge({tiles,parent,world,pickables,recipe,stages=3,onStart,onComplete,onProgress,paused,available=()=>true}){
 const model=makeBridge(tiles.length),tile=tiles[0];let done=false;
 model.group.position.set(tile.x-6,tile.h-1,tile.z-6);parent.add(model.group);
 const actor={group:model.repairTarget,tile,x:tile.x,z:tile.z,kind:'bridge',label:'Repair broken bridge',ready:true,opened:false,duration:0,carpentry:true,recipe,stages,onStart,
  available:()=>!done&&world.get(`${tile.x},${tile.z}`)===tile&&available(),onComplete,onProgress,paused,setProgress:model.setProgress,
  complete(){done=true;actor.opened=true;model.setProgress(1);enable(false);},
  reset(){done=false;actor.opened=false;model.setProgress(0);enable(true);}};
 const proxies=[],hits=[];model.repairTarget.traverse(m=>{if(m.isMesh)hits.push(m);});
 tiles.forEach((t,i)=>{const hit=part(model.repairTarget,new THREE.BoxGeometry(1,.22,.85),new THREE.MeshBasicMaterial({visible:false}),i,1,0);hit.userData.portraitIgnore=true;hits.push(hit);proxies.push(hit);model.surfaces[i].userData.tile=t;pickables.push(model.surfaces[i]);});
 for(const m of hits){m.userData.tile=tiles[Math.min(tiles.length-1,Math.max(0,Math.round(m.position.x)))];pickables.push(m);}
 function enable(value){for(const m of proxies)m.visible=value;for(const m of hits){if(value)m.userData.actor=actor;else delete m.userData.actor;}}
 enable(true);actor.highlight=highlightResource(actor.group,{height:2});
 return actor;
}
