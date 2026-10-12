import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const SLIME_EXPRESSIONS=Object.freeze(['idle','focused','struggle','preparing','happy','pleased','sleeping','concerned','shocked','distraught','sad','frown','fainted','angry']);
const DARK_INK='#20332d', LIGHT_INK='#fff6df';
const luminance=c=>.2126*c.r+.7152*c.g+.0722*c.b;
export function faceInkFor(bodyColor) {
  const body=luminance(new THREE.Color(bodyColor));
  const dark=luminance(new THREE.Color(DARK_INK)),light=luminance(new THREE.Color(LIGHT_INK));
  const contrast=other=>(Math.max(body,other)+.05)/(Math.min(body,other)+.05);
  return contrast(light)>contrast(dark)?LIGHT_INK:DARK_INK;
}

// The face's parts, built once per ink colour (dark ink on light bodies, light ink on dark ones) as a
// template; createSlimeFace merges each expression of it into shared geometry.
function buildTemplate(variant) {
  const group=new THREE.Group();
  const chosen=variant==='light'?LIGHT_INK:DARK_INK;
  const ink=new THREE.MeshBasicMaterial({color:chosen,toneMapped:false});
  // Pale gray eyes preserve a white catchlight without dark pupil-like dots.
  const eyeInk=new THREE.MeshBasicMaterial({color:variant==='light'?'#cdd3d0':DARK_INK,toneMapped:false});
  const cream=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false});
  const pink=new THREE.MeshStandardMaterial({color:'#eea8a0'});
  function part(geometry,material,parent=group){const m=new THREE.Mesh(geometry,material);parent.add(m);return m;}
  const normal=new THREE.Group(),focused=new THREE.Group(),struggle=new THREE.Group(),happy=new THREE.Group(),pleased=new THREE.Group(),sleeping=new THREE.Group(),concerned=new THREE.Group(),distraught=new THREE.Group(),sad=new THREE.Group(),frown=new THREE.Group(),fainted=new THREE.Group(),angry=new THREE.Group();
  group.add(normal,focused,struggle,happy,pleased,sleeping,concerned,distraught,sad,frown,fainted,angry);
  function line(points,parent,r=.009){
    const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,.382)));
    return part(new THREE.TubeGeometry(curve,12,r,6,false),ink,parent);
  }
  for(const x of [-.14,.14]){
    for(const parent of [normal,focused,concerned,distraught,sad,frown,angry]){
      const eye=part(new THREE.SphereGeometry(.043,12,8),eyeInk,parent);eye.position.set(x,.5,.355);
      if(parent===focused)eye.scale.y=.75;if(parent===concerned)eye.scale.set(1.12,1.25,1);
      const glint=part(new THREE.SphereGeometry(.012,8,6),cream,parent);glint.position.set(x-.01,.512,.387);
    }
    line([[x-.045,.50],[x,.484],[x+.045,.50]],sleeping,.012);
    const sign=Math.sign(x);
    line([[x-sign*.06,.55],[x+sign*.055,.59]],focused,.013);
    line([[x+sign*.045,.55],[x-sign*.025,.51],[x+sign*.045,.475]],struggle,.012);
    for(const parent of [happy,pleased])line([[x-.047,.49],[x,.535],[x+.047,.49]],parent,.012);
    const cheek=part(new THREE.SphereGeometry(.035,10,6),pink);cheek.scale.set(1,.55,.3);cheek.position.set(x*1.5,.4,.363);
  }
  for(const parent of [normal,pleased])line([[-.04,.415],[0,.38],[.04,.415]],parent);
  line([[-.045,.397],[.01,.405],[.047,.397]],focused,.011);
  const effortMouth=part(new THREE.SphereGeometry(.032,12,8),ink,struggle);effortMouth.position.set(0,.395,.375);effortMouth.scale.set(.8,1.25,.25);
  const tenseMouth=line([[-.055,.397],[-.028,.411],[0,.385],[.028,.411],[.055,.397]],struggle,.009);
  const mouth=part(new THREE.SphereGeometry(.078,20,12),ink,happy);mouth.position.set(0,.39,.377);mouth.scale.set(1,.8,.23);
  const tongue=part(new THREE.SphereGeometry(.043,16,8),pink,happy);tongue.position.set(0,.356,.394);tongue.scale.set(1,.48,.2);
  const sleepyMouth=part(new THREE.SphereGeometry(.023,12,8),ink,sleeping);sleepyMouth.position.set(0,.39,.38);sleepyMouth.scale.set(.8,1,.25);
  const worriedMouth=part(new THREE.SphereGeometry(.045,12,8),ink,concerned);worriedMouth.position.set(0,.39,.377);worriedMouth.scale.set(.85,1.2,.25);
  for(const x of [-.14,.14])line([[x-.04,.59],[x,.61],[x+.04,.59]],concerned,.009);
  for(const parent of [distraught,sad])for(const x of [-.14,.14]){const side=Math.sign(x);line([[x-side*.05,.60],[x+side*.045,.56]],parent,.01);}
  line([[-.055,.38],[0,.414],[.055,.38]],sad,.01);
  line([[-.04,.387],[0,.401],[.04,.387]],frown,.009);
  line([[-.055,.393],[-.028,.405],[0,.385],[.028,.405],[.055,.393]],distraught,.01);
  for(const x of [-.14,.14]){
    const points=Array.from({length:65},(_,i)=>{const t=i/64,angle=t*Math.PI*4.5,r=.005+t*.047;return new THREE.Vector3(x+Math.cos(angle)*r,.51+Math.sin(angle)*r,.389);});
    part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.007,6,false),ink,fainted);
  }
  line([[-.045,.39],[-.02,.40],[.005,.385],[.03,.395],[.05,.385]],fainted,.008);
  for(const x of [-.14,.14]){const side=Math.sign(x);line([[x-side*.075,.53],[x+side*.07,.62]],angry,.022);}
  line([[-.065,.375],[0,.42],[.065,.375]],angry,.015);
  const expressions={angry,idle:normal,focused,struggle,happy,pleased,sleeping,concerned,distraught,sad,frown,fainted};
  return {group,expressions,tenseMouth,effortMouth,materials:[ink,eyeInk,cream,pink]};
}

// Every visible part of a template for one state, merged into two geometries: the unlit ink and the lit
// blush (cheeks, tongue). Shared by every slime with that ink; marked shared so disposers keep them.
const merged=new Map();
const STATES=[...SLIME_EXPRESSIONS.filter(s=>s!=='shocked'),'preparing'];
function faceGeometry(variant,state){
  const id=`${variant}:${state}`;if(merged.has(id))return merged.get(id);
  const t=buildTemplate(variant),preparing=state==='preparing';
  for(const [name,part] of Object.entries(t.expressions))part.visible=name===(preparing?'struggle':state);
  t.tenseMouth.visible=preparing;t.effortMouth.visible=!preparing;
  t.group.updateMatrixWorld(true);
  const lists={ink:[],blush:[]},color=new THREE.Color();
  t.group.traverseVisible(mesh=>{if(!mesh.isMesh)return;
    const g=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone());g.deleteAttribute('uv');g.applyMatrix4(mesh.matrixWorld);
    const n=g.attributes.position.count,colors=new Float32Array(n*3);color.copy(mesh.material.color);for(let i=0;i<n;i++){colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));(mesh.material.isMeshBasicMaterial?lists.ink:lists.blush).push(g);});
  const out={};for(const [k,list] of Object.entries(lists)){out[k]=mergeGeometries(list);out[k].userData.shared=true;for(const g of list)g.dispose();}
  t.group.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});for(const m of t.materials)m.dispose();
  merged.set(id,out);return out;
}
// A slime's face: two meshes (ink, blush) whose geometry swaps with the expression. Same parts and
// expressions as ever, two draws instead of a dozen, and nothing per slime to upload.
export function createSlimeFace() {
  const group=new THREE.Group();group.name='slime-face';
  // Unlit ink keeps expressions legible on both lit and shaded sides.
  // The blush is one colour (no vertex colours), so it shares the bent body's shader program.
  const inkMaterial=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),blushMaterial=new THREE.MeshStandardMaterial({color:'#eea8a0'});
  let variant='dark',state='idle';
  const ink=new THREE.Mesh(faceGeometry(variant,state).ink,inkMaterial),blush=new THREE.Mesh(faceGeometry(variant,state).blush,blushMaterial);
  // Every slime's ink draws together (one program switch for all faces, not one per slime).
  ink.renderOrder=1;ink.name='slime-face-ink';blush.name='slime-face-blush';group.add(ink,blush);
  const show=()=>{const g=faceGeometry(variant,state);ink.geometry=g.ink;blush.geometry=g.blush;};
  const face={group,get state(){return state;},
    setBodyColor(color){const next=faceInkFor(color)===LIGHT_INK?'light':'dark';if(next!==variant){variant=next;show();}},
    set(next){if(next==='shocked')next='concerned';if(!STATES.includes(next))next='idle';if(next!==state){state=next;show();}}};
  group.userData.face=face;
  return face;
}
