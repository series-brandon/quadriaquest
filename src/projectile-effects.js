import {PROJECTILE_FLIGHT} from './combat-animation.js';
import * as THREE from 'three';
import {trainingTool} from './training-models.js';
import {spellVisual,spellVisualKey,SPELL_VISUALS} from './spell-visuals.js';
// Magic projectiles use the spell's look from spell-visuals.js (energy by default).
export function projectileModel(style,spell=null){if(style==='ranged'){const root=new THREE.Group(),arrow=trainingTool('arrows');arrow.rotation.x=Math.PI/2;root.add(arrow);return root;}return spellVisual(spell).projectile();}
export function createProjectileEffects(scene){const active=[];function remove(p){p.group.removeFromParent();p.group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 return {launch(from,to,style,spell=null){const group=projectileModel(style,spell);scene.add(group);group.position.copy(from);active.push({group,from:from.clone(),to:to.clone(),age:0,look:style==='magic'?spellVisualKey(spell):null});},update(dt){for(let i=active.length-1;i>=0;i--){const p=active[i];p.age+=dt;p.group.position.lerpVectors(p.from,p.to,Math.min(1,p.age/PROJECTILE_FLIGHT));p.group.lookAt(p.to);if(p.look){const look=p.group.children[0];look.scale.setScalar(1);SPELL_VISUALS[p.look].animate?.(look,p.age,1);}if(p.age>=PROJECTILE_FLIGHT){remove(p);active.splice(i,1);}}},clear(){for(const p of active)remove(p);active.length=0;}};
}
