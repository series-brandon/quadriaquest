import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.65});
function part(group,geometry,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
export function makeChest(){
  const group=new THREE.Group(),wood=material('#986137'),trim=material('#d6af5e');
  part(group,new RoundedBoxGeometry(.72,.4,.48,2,.035),wood,0,.23,0);
  const lid=part(group,new RoundedBoxGeometry(.76,.17,.52,2,.055),material('#b37c46'),0,.49,0);
  for(const x of [-.26,.26])part(group,new THREE.BoxGeometry(.045,.43,.50),trim,x,.23,0);
  part(group,new THREE.BoxGeometry(.12,.14,.035),trim,0,.35,.265);
  return {group,lid};
}
export function makeTopHat(){
  const group=new THREE.Group(),felt=material('#263039');
  part(group,new THREE.CylinderGeometry(.39,.39,.055,24),felt,0,.028,0);
  part(group,new THREE.CylinderGeometry(.26,.235,.43,20),felt,0,.26,0);
  part(group,new THREE.CylinderGeometry(.244,.24,.095,20),material('#8766a2'),0,.115,0);
  part(group,new THREE.BoxGeometry(.085,.07,.02),material('#edcd70'),0,.115,.247);
  return group;
}
