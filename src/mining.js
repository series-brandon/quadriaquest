import * as THREE from 'three';
export const BOULDER_TILES=new Set(['7,1','1,7','10,9']);
export function makeBoulder(){
 const group=new THREE.Group();
 for(const [x,y,z,r,s] of [[0,.52,0,.63,1],[-.29,.22,.22,.3,.85],[.32,.2,-.18,.28,.8]]){
  const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),new THREE.MeshStandardMaterial({color:s===1?'#84939e':'#9aa8ae',roughness:.95,flatShading:true}));
  mesh.position.set(x,y,z);mesh.scale.set(1,s, .87);mesh.rotation.set(.12,x+.4,.15);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}
export function makePickaxe(){
 const group=new THREE.Group();
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.032,.5,6),new THREE.MeshStandardMaterial({color:'#a98a64',roughness:.9}));handle.position.y=.19;group.add(handle);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.25,.33,0),new THREE.Vector3(0,.43,0),new THREE.Vector3(.25,.33,0)]);
 const head=new THREE.Mesh(new THREE.TubeGeometry(curve,6,.045,4,false),new THREE.MeshStandardMaterial({color:'#899ba6',roughness:.65,flatShading:true}));group.add(head);return group;
}
export const MINING_DURATION=1.15;
export function miningMotion(time){
 const p=(time%MINING_DURATION)/MINING_DURATION;
 const swing=p<.48?(.5-.5*Math.cos(Math.PI*p/.48)):p<.66?1-(p-.48)/.18:0;
 const strike=p>=.66&&p<.8?Math.sin((p-.66)/.14*Math.PI):0;
 return {right:[-.3,.36+swing*.48,.48-swing*.38,.7-swing*1.7,0,0],left:[.22,.32+swing*.15,.35-swing*.1,.15,0,0],body:{squash:1-.07*strike,stretch:1,lean:.09-.14*swing,twist:0},impact:strike*.018};
}
