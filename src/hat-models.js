import * as THREE from 'three';
import {mat,part} from './model-parts.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeTopHat} from './finale-models.js';

// Hats are authored with their base at y=0, centred over the wearer, +Z forward.
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

// A cone bent along a curve (one smooth mesh): the curled tip of a wizard hat.
const coneRadius=(radius,t)=>.018+(radius-.018)*(1-t)**1.1;
function sweptCone(group,curve,radius,color){
 let geometry=new THREE.CylinderGeometry(1,1,1,20,18,true);geometry.deleteAttribute('uv');geometry.deleteAttribute('normal');geometry=mergeVertices(geometry);
 const position=geometry.attributes.position,v=V(0,0,0);
 for(let i=0;i<position.count;i++){
  v.fromBufferAttribute(position,i);const t=v.y+.5,at=curve.getPoint(t),r=coneRadius(radius,t);
  position.setXYZ(i,at.x+v.x*r,at.y,at.z+v.z*r);
 }
 geometry.computeVertexNormals();part(group,geometry,color);
 return curve.getPoint(1);
}
// A point on a swept cone's surface at height fraction t, facing angle a (0 = +Z).
function onCone(curve,radius,t,a){return curve.getPoint(t).add(V(Math.sin(a),0,Math.cos(a)).multiplyScalar(coneRadius(radius,t)));}
function star(points=5,outer=.07,inner=.03,depth=.02){
 const shape=new THREE.Shape();
 for(let i=0;i<points*2;i++){const a=Math.PI/2+i*Math.PI/points,d=i%2?inner:outer;i?shape.lineTo(Math.cos(a)*d,Math.sin(a)*d):shape.moveTo(Math.cos(a)*d,Math.sin(a)*d);}
 shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:1});geometry.center();return geometry;
}
// A brim from a lathe profile (outer edge drooping by `droop`), closed top and bottom.
function brim(inner,outer,droop,thickness,color){
 const profile=[V(inner,-thickness,0),V(outer*.7,-thickness*.8-droop*.25,0),V(outer,-thickness-droop,0),V(outer,-droop,0),V(outer*.7,-droop*.2,0),V(inner,0,0)].map(p=>new THREE.Vector2(p.x,p.y));
 const mesh=new THREE.Mesh(new THREE.LatheGeometry(profile,28),mat(color));mesh.castShadow=mesh.receiveShadow=true;return mesh;
}

// Fletch: a felt archer's cap after the user's reference (2026-10-09). A tall crown pinched into a ridge
// with its peak swept back; a brim turned up all round, low at the sides, flipped high behind and rising
// into a pointed beak in front; one feather tucked in on the right.
const RANGER_CROWN={rx:.31,rz:.38,height:.68,sweep:.2};
// The crown at height fraction t: centre z and half-widths (the sides pinch faster, making the ridge).
function rangerCrownRing(t){const {rx,rz,height,sweep}=RANGER_CROWN;return {y:height*t,z:-sweep*t**1.3,rx:rx*(1-t)**.85*(1-.5*t),rz:rz*(1-t)**.75};}
function rangerCrown(material){
 const rings=12,around=32,position=[],index=[];
 for(let k=0;k<rings;k++){const r=rangerCrownRing(k/rings);for(let i=0;i<around;i++){const a=i/around*Math.PI*2;position.push(Math.sin(a)*r.rx,r.y,r.z+Math.cos(a)*r.rz);}}
 const apex=rangerCrownRing(1);position.push(0,apex.y,apex.z);const top=rings*around;
 for(let k=0;k<rings-1;k++)for(let i=0;i<around;i++){const a=k*around+i,b=k*around+(i+1)%around,c=a+around,d=b+around;index.push(a,b,c,b,d,c);}
 for(let i=0;i<around;i++)index.push((rings-1)*around+i,(rings-1)*around+(i+1)%around,top);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setIndex(index);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
// The brim as a curled strip around the crown's base (angle 0 = front): width and lift vary by angle.
function rangerBrim(material){
 const {rx,rz}=RANGER_CROWN,around=48,rows=4,position=[],index=[];
 const front=a=>Math.max(0,Math.cos(a))**5,back=a=>Math.max(0,-Math.cos(a));
 for(let i=0;i<around;i++){
  const a=i/around*Math.PI*2,sx=Math.sin(a),cz=Math.cos(a);
  // Outward direction: the base ellipse's normal.
  let nx=sx/rx,nz=cz/rz;const l=Math.hypot(nx,nz);nx/=l;nz/=l;
  const width=.07+.25*front(a)+.03*back(a),lift=.08+.18*back(a)**1.4+.1*front(a);
  for(let r=0;r<rows;r++){const f=r/(rows-1),out=width*Math.sin(f*Math.PI/2),up=lift*f*f;position.push(sx*rx*.98+nx*out,up,cz*rz*.98+nz*out);}
 }
 for(let i=0;i<around;i++)for(let r=0;r<rows-1;r++){const a=i*rows+r,b=((i+1)%around)*rows+r;index.push(a,b,a+1,b,b+1,a+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setIndex(index);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
export function rangerHat(){
 const g=new THREE.Group();g.name='ranger-hat';
 const felt=new THREE.MeshStandardMaterial({color:'#2f6b3a',roughness:1}),brimFelt=new THREE.MeshStandardMaterial({color:'#2a6234',roughness:1,side:THREE.DoubleSide});
 g.add(rangerCrown(felt),rangerBrim(brimFelt));
 // One feather, tucked in on the right side and sweeping up and back.
 const side=rangerCrownRing(.12),feather=new THREE.Group();feather.position.set(side.rx*.95,side.y,side.z-.06);feather.rotation.set(-.75,0,-.32);g.add(feather);
 part(feather,new THREE.CylinderGeometry(.007,.009,.5,6),'#efe2c2',0,.25,0);
 const vane=part(feather,new THREE.SphereGeometry(1,12,8),'#cf4e3c',0,.29,0);vane.scale.set(.062,.24,.012);
 const tip=part(feather,new THREE.SphereGeometry(1,10,6),'#f3e4c4',0,.5,0);tip.scale.set(.04,.06,.011);
 return g;
}

// Wisp: a wizard's hat with a drooping brim, a gold band and star, and a tip that curls back.
export function mageHat(){
 const g=new THREE.Group();g.name='mage-hat';
 const felt='#4d3b76';
 g.add(brim(.2,.5,.07,.035,'#5c4787'));
 const curve=new THREE.CubicBezierCurve3(V(0,0,0),V(0,.38,0),V(.02,.58,-.04),V(.05,.62,-.27)),tipAt=sweptCone(g,curve,.32,felt);
 part(g,new THREE.CylinderGeometry(.305,.318,.07,24),'#d6b25e',0,.06,0);
 const emblem=part(g,star(),'#ffe08a',0,.07,.315);emblem.material.emissive=new THREE.Color('#a87a1e');emblem.material.emissiveIntensity=.35;
 part(g,new THREE.SphereGeometry(.035,10,8),'#ffe08a',tipAt.x,tipAt.y,tipAt.z);
 for(const [t,a,s] of [[.34,.9,.55],[.55,-.75,.42]]){const at=onCone(curve,.32,t,a),deco=part(g,star(5,.06,.026,.01),'#e8d39a',at.x,at.y,at.z);deco.rotation.y=a;deco.scale.setScalar(s);}
 return g;
}

// The Willowbank reward: a little Top Hat made to sit between a companion's ears.
export function makeCompanionTopHat(){
 const g=new THREE.Group(),hat=makeTopHat();hat.scale.setScalar(.3);g.add(hat);g.name='companion-top-hat';
 // A tiny flower on the band tells it apart from the player's hat.
 const flower=new THREE.Group();flower.position.set(.042,.035,.062);flower.rotation.y=.6;g.add(flower);
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;part(flower,new THREE.SphereGeometry(.01,8,6),'#f4a9c0',Math.cos(a)*.01,Math.sin(a)*.01,0);}
 part(flower,new THREE.SphereGeometry(.008,8,6),'#ffe08a',0,0,.006);
 return g;
}

// Headwear worn in the Head slot (worn-gear.js). Each is built relative to the slime's Head anchor
// (the crown, y .79), so worn on any slime it sits where its first owner wore it.
const ANCHOR_Y=.79;
const box=(g,w,h,d,color,x=0,y=0,z=0)=>part(g,new THREE.BoxGeometry(w,h,d),color,x,y,z);
const atAnchor=(make,y)=>()=>{const g=new THREE.Group(),hat=make();hat.position.y=y-ANCHOR_Y;g.add(hat);return g;};
// Fletch's and Wisp's hats, placed as they wore them.
export const wornArcherCap=atAnchor(rangerHat,.76);
export const wornWizardHat=atAnchor(mageHat,.8);
// Bristle's iron skullcap: a brimless cap, raised central ridge and cheek guards.
export function ironSkullcap(){
 const g=new THREE.Group(),y=v=>v-ANCHOR_Y;
 part(g,new THREE.SphereGeometry(.37,12,6,0,Math.PI*2,0,Math.PI/2),'#657180',0,y(.77));
 box(g,.065,.20,.55,'#adb4ba',0,y(1.025),-.01);box(g,.065,.20,.045,'#adb4ba',0,y(.75),.365);
 for(const x of [-.33,.33]){const cheek=box(g,.075,.28,.22,'#657180',x,y(.68),.08);cheek.rotation.z=x<0?-.14:.14;box(g,.17,.06,.22,'#a3abb2',x,y(.50),.02);}
 return g;
}
// Borin's miner's cap: a dome, a broad brim and a lamp at the front.
export function minersCap(){
 const g=new THREE.Group(),y=v=>v-ANCHOR_Y;
 part(g,new THREE.SphereGeometry(.36,16,8,0,Math.PI*2,0,Math.PI/2),'#807458',0,y(.77));box(g,.75,.07,.7,'#998462',0,y(.77),.03);
 const lamp=part(g,new THREE.SphereGeometry(.075,12,8),'#f9d885',0,y(.9),.32);lamp.material.emissive=new THREE.Color('#c99a3a');lamp.material.emissiveIntensity=.4;
 return g;
}
// Ember's cloth headband, trailing ties and a floating ring of breath.
export function breathHeadband(){
 const g=new THREE.Group(),y=v=>v-ANCHOR_Y;
 part(g,new THREE.CylinderGeometry(.43,.43,.08,18),'#e8dcc0',0,y(.62));
 for(const x of [-.08,.08]){const tie=box(g,.05,.2,.02,'#e8dcc0',x,y(.52),-.42);tie.rotation.x=.4;}
 const ring=part(g,new THREE.TorusGeometry(.3,.025,8,28),'#bfe8e4',0,y(1.08));ring.rotation.x=Math.PI/2;
 return g;
}
// Reed's straw fishing hat: a low dome and a wide brim.
export function fishersHat(){
 const g=new THREE.Group(),y=v=>v-ANCHOR_Y;
 part(g,new THREE.SphereGeometry(.37,16,8,0,Math.PI*2,0,Math.PI/2),'#cbb58a',0,y(.78));
 part(g,new THREE.CylinderGeometry(.47,.47,.045,16),'#bba074',0,y(.78),.06);
 return g;
}
// Crude Helm: a bark cap, two bent sticks crossing over the crown, a bound band and a rock on top.
export function crudeHelm(){
 const g=new THREE.Group(),y=v=>v-ANCHOR_Y;
 part(g,new THREE.SphereGeometry(.36,10,5,0,Math.PI*2,0,Math.PI/2),'#a07a52',0,y(.77));
 for(const turn of [0,Math.PI/2])part(g,new THREE.TorusGeometry(.37,.022,5,12,Math.PI),'#8f6a45',0,y(.77)).rotation.y=turn;
 part(g,new THREE.CylinderGeometry(.38,.38,.07,10),'#cdb281',0,y(.8));
 part(g,new THREE.DodecahedronGeometry(.07,0),'#9aa19b',0,y(1.17));
 return g;
}
