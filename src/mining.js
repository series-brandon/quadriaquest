import * as THREE from 'three';
import {cachedMergedMesh} from './merged-model.js';
export const BOULDER_TILES=new Set(['7,1','1,7','10,9']);
// The boulder's three rocks, for merged models (main rock and side rocks colors).
export function boulderParts(main='#84939e',side='#9aa8ae'){
 return [[0,.52,0,.63,1],[-.29,.22,.22,.3,.85],[.32,.2,-.18,.28,.8]].map(([x,y,z,r,s])=>({geometry:new THREE.IcosahedronGeometry(r,0),color:s===1?main:side,position:[x,y,z],rotation:[.12,x+.4,.15],scale:[1,s,.87]}));
}
// One merged mesh: a single draw and shadow draw per boulder.
export function makeBoulder(){
 const group=new THREE.Group();group.add(cachedMergedMesh('boulder',boulderParts,{roughness:.95,flatShading:true}));
 return group;
}
export function makePickaxe(){
 const group=new THREE.Group();group.rotation.y=-Math.PI/2;
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.032,.5,6),new THREE.MeshStandardMaterial({color:'#a98a64',roughness:.9}));handle.position.y=.19;group.add(handle);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.25,.33,0),new THREE.Vector3(0,.43,0),new THREE.Vector3(.25,.33,0)]);
 const head=new THREE.Mesh(new THREE.TubeGeometry(curve,6,.045,4,false),new THREE.MeshStandardMaterial({color:'#899ba6',roughness:.65,flatShading:true}));group.add(head);return group;
}
export const MINING_DURATION=1.15;
export const MINING_GRIP_SPACING=.21;
export function miningMotion(time){
 const p=(time%MINING_DURATION)/MINING_DURATION;
 const swing=p<.48?(.5-.5*Math.cos(Math.PI*p/.48)):p<.66?1-(p-.48)/.18:0;
 const strike=p>=.66&&p<.8?Math.sin((p-.66)/.14*Math.PI):0;
 const y=.52+swing*.48,z=.48-swing*.38,curl=.7-swing*1.7;
 // Stack both grips on the centered shaft throughout the vertical swing.
 return {right:[0,y,z,curl,0,0],left:[0,y+Math.cos(curl)*MINING_GRIP_SPACING,z+Math.sin(curl)*MINING_GRIP_SPACING,curl,0,0],body:{squash:1-.07*strike,stretch:1,lean:.09-.14*swing,twist:0},impact:strike*.018};
}
