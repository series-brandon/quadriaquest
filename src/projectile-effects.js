import {PROJECTILE_FLIGHT} from './combat-animation.js';
import * as THREE from 'three';
import {trainingTool} from './training-models.js';
import {spellVisual,spellVisualKey,SPELL_VISUALS} from './spell-visuals.js';
// Magic projectiles use the spell's look from spell-visuals.js (energy by default). A thrown rock
// (enemy ranged punish) is a tumbling chunk of cinder rock.
export function projectileModel(style,spell=null){if(style==='rock'){const root=new THREE.Group(),rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.22,0),new THREE.MeshStandardMaterial({color:'#5b4f4a',roughness:.95,emissive:'#7a2a10',emissiveIntensity:.35}));rock.castShadow=true;root.add(rock);return root;}if(style==='ranged'){const root=new THREE.Group(),arrow=trainingTool('arrows');arrow.rotation.x=Math.PI/2;root.add(arrow);return root;}return spellVisual(spell).projectile();}
export function createProjectileEffects(scene){const active=[];function remove(p){p.group.removeFromParent();p.group.traverse(m=>{m.geometry?.dispose();m.material?.dispose();});}
 // duration: flight seconds (default PROJECTILE_FLIGHT); arc: peak height of a lobbed flight.
 return {launch(from,to,style,spell=null,{duration=PROJECTILE_FLIGHT,arc=0}={}){const group=projectileModel(style,spell);scene.add(group);group.position.copy(from);active.push({group,from:from.clone(),to:to.clone(),age:0,duration,arc,tumble:style==='rock',look:style==='magic'?spellVisualKey(spell):null});},update(dt){for(let i=active.length-1;i>=0;i--){const p=active[i];p.age+=dt;const t=Math.min(1,p.age/p.duration);p.group.position.lerpVectors(p.from,p.to,t);p.group.position.y+=p.arc*4*t*(1-t);if(p.tumble)p.group.rotation.set(p.age*9,p.age*6,0);else p.group.lookAt(p.to);if(p.look){const look=p.group.children[0];look.scale.setScalar(1);SPELL_VISUALS[p.look].animate?.(look,p.age,1);}if(p.age>=p.duration){remove(p);active.splice(i,1);}}},clear(){for(const p of active)remove(p);active.length=0;}};
}
