import * as THREE from 'three';
export function createSleepFeedback(scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.font='bold 86px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=9;ctx.strokeStyle='#243c46';ctx.strokeText('Z',64,67);ctx.fillStyle='#edf9ff';ctx.fillText('Z',64,67);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const particles=Array.from({length:3},()=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));s.visible=false;s.renderOrder=15;scene.add(s);return s;});
  let age=0;
  const right=new THREE.Vector3();
  return {update(dt,active,position,camera){
    if(!active){age=0;for(const p of particles)p.visible=false;return;}
    age+=dt;right.set(1,0,0).applyQuaternion(camera.quaternion);
    particles.forEach((p,i)=>{const local=age-i*1.4;p.visible=local>=0;if(local<0)return;const t=(local%4.2)/4.2;p.position.copy(position).addScaledVector(right,.25+t*.4+Math.sin(t*Math.PI*2)*Math.sin(t*Math.PI)*.09);p.position.y+=.95+t*.8;p.scale.setScalar(.15+t*.15);p.material.opacity=Math.sin(Math.PI*t)*.85;});
  }};
}
