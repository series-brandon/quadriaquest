import * as THREE from 'three';
import {tileTopGeometry} from './tile-top.js';
import {key} from './world.js';
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.9});
function add(parent,geometry,mat,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,typeof mat==='string'?material(mat):mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function makeTree(){
 const group=new THREE.Group();add(group,new THREE.CylinderGeometry(.09,.15,1.3,7),'#a68c6b',0,.65);
 for(let j=0;j<3;j++){const crown=add(group,new THREE.IcosahedronGeometry(.72-j*.13,1),['#799b62','#95b575','#a9c589'][j],Math.sin(j*3)*.19,1.25+j*.38,Math.cos(j*3)*.12);crown.scale.y=.95;}
 return group;
}
export function makeFlowers(){
 const group=new THREE.Group();for(let j=0;j<3;j++){add(group,new THREE.CylinderGeometry(.008,.008,.12,3),'#799b62',-.32+j*.11,.07,.3);add(group,new THREE.IcosahedronGeometry(.035,0),j%2?'#f6e8ae':'#f8f5dd',-.32+j*.11,.13,.3);}return group;
}
export function makeTerrainTile(tile,map,grass){
 const group=new THREE.Group(),r=.065;
 add(group,tileTopGeometry(tile,map),grass);
 add(group,new THREE.BoxGeometry(1,tile.h-r,1),'#a5a084',0,(tile.h-r)/2);
 const points=[];for(const [dx,dz,a,b]of [[0,-1,[-.5,-.5],[.5,-.5]],[-1,0,[-.5,-.5],[-.5,.5]]]){const n=map.get(key(tile.x+dx,tile.z+dz));if(n&&!n.water&&n.h>=tile.h)points.push(new THREE.Vector3(a[0],tile.h+.002,a[1]),new THREE.Vector3(b[0],tile.h+.002,b[1]));}
 group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#72865c',transparent:true,opacity:.16})));
 return group;
}
export function addWaterTile(parent,tile,map,effects,offset=6){
 const side=new THREE.MeshStandardMaterial({color:'#8dbdb3',roughness:.3,metalness:.08});
 const hidden=new THREE.MeshBasicMaterial({visible:false});
 const faces=[[1,0],[-1,0],null,null,[0,1],[0,-1]].map((d,i)=>i===2||(d&&map.get(key(tile.x+d[0],tile.z+d[1]))?.water)?hidden:side);
 const block=new THREE.Mesh(new THREE.BoxGeometry(1,.85,1),faces);block.position.set(tile.x-offset,.425,tile.z-offset);block.receiveShadow=true;parent.add(block);
 const surface=effects.add(tile.x-offset,.85,tile.z-offset,side);return [block,surface];
}
