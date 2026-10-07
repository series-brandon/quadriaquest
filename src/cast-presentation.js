import * as THREE from 'three';
import {SPELL_VISUALS,spellVisualKey} from './spell-visuals.js';

// The energy being gathered during a cast: the spell's own charge look (spell-visuals.js), held
// between the hands and growing with the motion's `charge`, gone the moment the spell is thrown.
export function createCastPresentation(hands){
 const orb=new THREE.Group();orb.name='cast-charge';orb.visible=false;hands[0].parent.add(orb);
 const models={};let key=null,current=null;
 function use(next){
  if(next===key)return;if(current)current.visible=false;key=next;
  current=models[next]||(models[next]=SPELL_VISUALS[next].charge());if(!current.parent)orb.add(current);current.visible=true;
 }
 return {orb,get look(){return key;},update(motion,time=0,spell=null){
  const charge=motion?.charge||0;orb.visible=charge>0;if(!charge)return;
  use(spellVisualKey(spell));
  orb.position.copy(hands[0].position).add(hands[1].position).multiplyScalar(.5);orb.position.z+=.03;
  // The motion may drive the size (the cast surges, then settles); its instability drives the look's own
  // motion (spin, shimmer, drips, flicker…).
  orb.scale.setScalar(motion.orbScale??(.35+.9*charge));current.scale.setScalar(1);current.rotation.set(0,0,0);
  SPELL_VISUALS[key].animate?.(current,time,motion.instability??charge);
 }};
}
