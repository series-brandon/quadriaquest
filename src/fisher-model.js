import {tool} from './tool-models.js';
import {makeSlime} from './slime-model.js';
import * as THREE from 'three';
import {part} from './model-parts.js';
export function fisher(){
 const slime=makeSlime('#66a6ad'),{group,hands}=slime;
 part(group,new THREE.SphereGeometry(.37,16,8,0,Math.PI*2,0,Math.PI/2),'#cbb58a',0,.78);
 part(group,new THREE.CylinderGeometry(.47,.47,.045,16),'#bba074',0,.78,.06);
 // Grip is the pivot: the shaft rises backward across the same shoulder.
 const rod=tool('rods');rod.rotation.set(-.95,0,-.12);rod.position.set(0,-.1,0);hands[0].add(rod);
 slime.idleProps=[rod];
 for(const child of group.children)child.position.y-=.07;
 return slime;
}

// Preserve facing and root placement; the area supplies only expression/narrative context.
export function animateFisher(rig,time,expression='idle'){
 rig.group.scale.set(1,1+Math.sin(time*2.8)*.025,1);
 rig.hands[1].position.y=.26+Math.sin(time*2.8)*.02;
 rig.face.set(expression);
}
