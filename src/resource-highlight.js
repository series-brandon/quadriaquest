import * as THREE from 'three';

const gold = new THREE.MeshBasicMaterial({color:'#efbc43',side:THREE.BackSide,toneMapped:false});
const white = new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.BackSide,toneMapped:false});
const glow = new THREE.MeshBasicMaterial({color:'#ffce62',side:THREE.BackSide,transparent:true,opacity:.18,depthWrite:false,toneMapped:false});
const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;
const ctx=canvas.getContext('2d');
ctx.beginPath();ctx.moveTo(46,22);ctx.lineTo(82,22);ctx.lineTo(82,102);ctx.lineTo(110,102);ctx.lineTo(64,161);ctx.lineTo(18,102);ctx.lineTo(46,102);ctx.closePath();
ctx.lineJoin='round';ctx.strokeStyle='#fff3be';ctx.lineWidth=12;ctx.stroke();ctx.strokeStyle='#76521b';ctx.lineWidth=6;ctx.stroke();
const gradient=ctx.createLinearGradient(0,20,0,165);gradient.addColorStop(0,'#ffe798');gradient.addColorStop(1,'#e9a92d');ctx.fillStyle=gradient;ctx.fill();
const arrowTexture=new THREE.CanvasTexture(canvas);arrowTexture.colorSpace=THREE.SRGBColorSpace;

export function highlightResource(group){
  const borders=[],glows=[];
  // Inverted hulls outline the item itself, with a softer outer gold edge.
  for(const item of [...group.children]){
    if(!item.isMesh)continue;
    for(const [material,amount]of [[glow,.032],[gold,.014]]){
      const geometry=item.geometry.clone(),positions=geometry.attributes.position,normals=geometry.attributes.normal;
      for(let i=0;i<positions.count;i++)positions.setXYZ(i,positions.getX(i)+normals.getX(i)*amount,positions.getY(i)+normals.getY(i)*amount,positions.getZ(i)+normals.getZ(i)*amount);
      const outline=new THREE.Mesh(geometry,material);outline.position.copy(item.position);outline.rotation.copy(item.rotation);outline.scale.copy(item.scale);group.add(outline);outline.visible=false;(material===gold?borders:glows).push(outline);
    }
  }
  const arrow=new THREE.Sprite(new THREE.SpriteMaterial({map:arrowTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  arrow.scale.set(.45,.68,1);arrow.position.y=.95;arrow.renderOrder=9;arrow.visible=false;group.add(arrow);
  return {update(show,time,hovered=false){
    arrow.visible=show;arrow.position.y=.95+Math.sin(time*3.5)*.07;
    for(const outline of borders){outline.visible=show||hovered;outline.material=hovered?white:gold;}
    for(const outline of glows)outline.visible=show&&!hovered;
  }};
}
