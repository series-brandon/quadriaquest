import * as THREE from 'three';
import {part} from './model-parts.js';
export function campfire(ghost=false){const g=new THREE.Group();for(let i=0;i<3;i++){const log=part(g,new THREE.CylinderGeometry(.085,.085,.85,7),'#94704d',0,.09+i*.015,0);log.name='campfire-log';log.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(i*Math.PI/3),0,Math.sin(i*Math.PI/3)));}for(let i=0;i<3;i++)part(g,new THREE.ConeGeometry(.17-i*.035,.46-i*.07,5),i%2?'#ffe09a':'#ef9851',(i-1)*.1,.28+i*.04);if(ghost)g.traverse(m=>{if(m.isMesh){m.material.transparent=true;m.material.opacity=.45;}});return g;}
export function animateCampfire(group,time){
 for(const [i,flame] of group.children.filter(m=>m.geometry?.type==='ConeGeometry').entries())flame.scale.y=1+Math.sin(time*9+i)*.12;
}
