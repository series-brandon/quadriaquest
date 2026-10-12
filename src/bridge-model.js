import * as THREE from 'three';
import {part} from './model-parts.js';
// A plank bridge `length` tiles long (along x) and `width` tiles wide. Wider bridges (a road over a
// river) also get stringers under the deck and stone piers at each end; the tutorial's footbridge is 1.
export function makeBridge(length=3,{width=1}={}){
 const group=new THREE.Group(),repairTarget=new THREE.Group(),planks=[],surfaces=[],posts=[],railings=[];group.add(repairTarget);
 const pitch=1/3,gap=.015;
 for(let x=0;x<length;x++){
  for(let j=0;j<3;j++){const plank=part(group,new THREE.BoxGeometry(pitch-gap,.12,width-.15),'#a98155',x+(j-1)*pitch,1,0);plank.name='bridge-plank';planks.push(plank);repairTarget.add(plank);}
  for(const side of [-1,1]){
   const post=part(group,new THREE.CylinderGeometry(width>1?.09:.07,width>1?.09:.07,1.12,6),'#886747',x,.92,side*(width/2-.07));post.name='bridge-post';posts.push(post);repairTarget.add(post);
   if(x<length-1){const rail=part(group,new THREE.BoxGeometry(1.08,.10,.09),'#967049',x+.5,1.43,side*(width/2-.07));rail.name='bridge-railing';railings.push(rail);}
  }
  // Invisible completed-deck picking surface; visible geometry is only the boards.
  const hit=part(group,new THREE.BoxGeometry(1,.02,width-.15),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),x,1.05,0);
  hit.name='bridge-walk-surface';hit.castShadow=hit.receiveShadow=false;surfaces.push(hit);
 }
 if(width>1){
  // Two stringers under the deck, and a stone pier at each end on the banks.
  for(const side of [-1,1]){const beam=part(group,new THREE.BoxGeometry(length,.16,.16),'#7a5a3c',(length-1)/2,.86,side*(width/2-.35));beam.name='bridge-stringer';}
  for(const end of [0,length-1]){const pier=part(group,new THREE.BoxGeometry(.7,.62,width+.1),'#9c968c',end,.55,0);pier.name='bridge-pier';const cap=part(group,new THREE.BoxGeometry(.8,.08,width+.2),'#b7b0a5',end,.88,0);cap.name='bridge-pier';}
 }
 function setProgress(progress){
  surfaces.forEach(m=>m.visible=progress===1);railings.forEach(m=>m.visible=progress===1);
  const repaired=Math.ceil(Math.min(1,progress*1.5)*planks.length);
  planks.forEach((p,i)=>{p.visible=progress===0?i%3!==1:i<repaired;p.rotation.z=progress===0?(i%2?1:-1)*.2:0;});
 }
 setProgress(0);return {group,repairTarget,surfaces,planks,posts,railings,setProgress};
}


