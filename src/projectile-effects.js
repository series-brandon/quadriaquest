import {PROJECTILE_FLIGHT} from './combat-animation.js';
import * as THREE from 'three';
import {trainingTool} from './training-models.js';
export function projectileModel(style){if(style==='ranged'){const root=new THREE.Group(),arrow=trainingTool('arrows');arrow.rotation.x=Math.PI/2;root.add(arrow);return root;}const g=new THREE.Group(),m=new THREE.Mesh(new THREE.IcosahedronGeometry(.10,1),new THREE.MeshBasicMaterial({color:'#d9b2ff'}));g.add(m);return g;}
export function createProjectileEffects(scene){const active=[];function remove(p){p.group.removeFromParent();p.group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 return {launch(from,to,style){const group=projectileModel(style);scene.add(group);group.position.copy(from);active.push({group,from:from.clone(),to:to.clone(),age:0});},update(dt){for(let i=active.length-1;i>=0;i--){const p=active[i];p.age+=dt;p.group.position.lerpVectors(p.from,p.to,Math.min(1,p.age/PROJECTILE_FLIGHT));p.group.lookAt(p.to);if(p.age>=PROJECTILE_FLIGHT){remove(p);active.splice(i,1);}}},clear(){for(const p of active)remove(p);active.length=0;}};
}
