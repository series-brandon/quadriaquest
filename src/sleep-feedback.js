import * as THREE from 'three';
let texture;
function sleepTexture(){
  if(texture||typeof document==='undefined')return texture||null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.font='bold 86px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=9;ctx.strokeStyle='#243c46';ctx.strokeText('Z',64,67);ctx.fillStyle='#edf9ff';ctx.fillText('Z',64,67);
  texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createSleepParticles(parent,prefix='sleep-z'){
  return Array.from({length:3},(_,i)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:sleepTexture(),transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));s.name=prefix+i;s.userData.nonInteractive=true;s.visible=false;s.renderOrder=15;parent.add(s);return s;});
}
const right=new THREE.Vector3(),inverse=new THREE.Quaternion();
export function updateSleepParticles(particles,age,active,position,camera,{height=.55,offset=.12}={}){
  right.set(1,0,0);
  if(camera){right.applyQuaternion(camera.quaternion);const parent=particles[0].parent;if(parent)right.applyQuaternion(parent.getWorldQuaternion(inverse).invert());}
  particles.forEach((p,i)=>{const local=age-i*1.4;p.visible=active&&local>=0;if(!p.visible)return;const t=(local%4.2)/4.2;p.position.copy(position).addScaledVector(right,offset+t*.4+Math.sin(t*Math.PI*2)*Math.sin(t*Math.PI)*.09);p.position.y+=height+t*.8;p.scale.setScalar(.15+t*.15);p.material.opacity=Math.sin(Math.PI*t)*.85;});
}
export function createSleepFeedback(scene){
  const particles=createSleepParticles(scene);let age=0;
  return {update(dt,active,position,camera){age=active?age+dt:0;updateSleepParticles(particles,age,active,position,camera);}};
}
