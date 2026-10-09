import * as THREE from 'three';
import {part} from './model-parts.js';
export function makeBridge(length=3){
 const group=new THREE.Group(),repairTarget=new THREE.Group(),planks=[],surfaces=[],posts=[],railings=[];group.add(repairTarget);
 const pitch=1/3,gap=.015;
 for(let x=0;x<length;x++){
  for(let j=0;j<3;j++){const plank=part(group,new THREE.BoxGeometry(pitch-gap,.12,.85),'#a98155',x+(j-1)*pitch,1,0);plank.name='bridge-plank';planks.push(plank);repairTarget.add(plank);}
  for(const side of [-1,1]){
   const post=part(group,new THREE.CylinderGeometry(.07,.07,1.12,6),'#886747',x,.92,side*.43);post.name='bridge-post';posts.push(post);repairTarget.add(post);
   if(x<length-1){const rail=part(group,new THREE.BoxGeometry(1.08,.10,.09),'#967049',x+.5,1.43,side*.43);rail.name='bridge-railing';railings.push(rail);}
  }
  // Invisible completed-deck picking surface; visible geometry is only the boards.
  const hit=part(group,new THREE.BoxGeometry(1,.02,.85),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),x,1.05,0);
  hit.name='bridge-walk-surface';hit.castShadow=hit.receiveShadow=false;surfaces.push(hit);
 }
 function setProgress(progress){
  surfaces.forEach(m=>m.visible=progress===1);railings.forEach(m=>m.visible=progress===1);
  const repaired=Math.ceil(Math.min(1,progress*1.5)*planks.length);
  planks.forEach((p,i)=>{p.visible=progress===0?i%3!==1:i<repaired;p.rotation.z=progress===0?(i%2?1:-1)*.2:0;});
 }
 setProgress(0);return {group,repairTarget,surfaces,planks,posts,railings,setProgress};
}


