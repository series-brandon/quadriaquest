import * as THREE from 'three';

const DARK_INK='#20332d', LIGHT_INK='#fff6df';
const luminance=c=>.2126*c.r+.7152*c.g+.0722*c.b;
export function faceInkFor(bodyColor) {
  const body=luminance(new THREE.Color(bodyColor));
  const dark=luminance(new THREE.Color(DARK_INK)),light=luminance(new THREE.Color(LIGHT_INK));
  const contrast=other=>(Math.max(body,other)+.05)/(Math.min(body,other)+.05);
  return contrast(light)>contrast(dark)?LIGHT_INK:DARK_INK;
}

export function createSlimeFace() {
  const group=new THREE.Group();
  // Unlit ink keeps expressions legible on both lit and shaded sides.
  const ink=new THREE.MeshBasicMaterial({color:DARK_INK,toneMapped:false});
  const eyeInk=new THREE.MeshBasicMaterial({color:DARK_INK,toneMapped:false});
  const cream=new THREE.MeshBasicMaterial({color:LIGHT_INK,toneMapped:false});
  const pink=new THREE.MeshStandardMaterial({color:'#eea8a0'});
  function part(geometry,material,parent=group){const m=new THREE.Mesh(geometry,material);parent.add(m);return m;}
  const normal=new THREE.Group(),focused=new THREE.Group(),struggle=new THREE.Group(),happy=new THREE.Group(),sleeping=new THREE.Group(),concerned=new THREE.Group();
  group.add(normal,focused,struggle,happy,sleeping,concerned);
  function line(points,parent,r=.009){
    const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,.382)));
    return part(new THREE.TubeGeometry(curve,12,r,6,false),ink,parent);
  }
  for(const x of [-.14,.14]){
    for(const parent of [normal,focused,concerned]){
      const eye=part(new THREE.SphereGeometry(.043,12,8),eyeInk,parent);eye.position.set(x,.5,.355);
      if(parent===focused)eye.scale.y=.75;if(parent===concerned)eye.scale.set(1.12,1.25,1);
      const glint=part(new THREE.SphereGeometry(.012,8,6),cream,parent);glint.position.set(x-.01,.512,.387);
    }
    line([[x-.045,.50],[x,.484],[x+.045,.50]],sleeping,.012);
    const sign=Math.sign(x);
    line([[x-sign*.06,.55],[x+sign*.055,.59]],focused,.013);
    line([[x+sign*.045,.55],[x-sign*.025,.51],[x+sign*.045,.475]],struggle,.012);
    line([[x-.047,.49],[x,.535],[x+.047,.49]],happy,.012);
    const cheek=part(new THREE.SphereGeometry(.035,10,6),pink);cheek.scale.set(1,.55,.3);cheek.position.set(x*1.5,.4,.363);
  }
  line([[-.04,.415],[0,.38],[.04,.415]],normal);
  line([[-.045,.397],[.01,.405],[.047,.397]],focused,.011);
  const effortMouth=part(new THREE.SphereGeometry(.032,12,8),ink,struggle);effortMouth.position.set(0,.395,.375);effortMouth.scale.set(.8,1.25,.25);
  const tenseMouth=line([[-.055,.397],[-.028,.411],[0,.385],[.028,.411],[.055,.397]],struggle,.009);
  const mouth=part(new THREE.SphereGeometry(.078,20,12),ink,happy);mouth.position.set(0,.39,.377);mouth.scale.set(1,.8,.23);
  const tongue=part(new THREE.SphereGeometry(.043,16,8),pink,happy);tongue.position.set(0,.356,.394);tongue.scale.set(1,.48,.2);
  const sleepyMouth=part(new THREE.SphereGeometry(.023,12,8),ink,sleeping);sleepyMouth.position.set(0,.39,.38);sleepyMouth.scale.set(.8,1,.25);
  const worriedMouth=part(new THREE.SphereGeometry(.045,12,8),ink,concerned);worriedMouth.position.set(0,.39,.377);worriedMouth.scale.set(.85,1.2,.25);
  for(const x of [-.14,.14])line([[x-.04,.59],[x,.61],[x+.04,.59]],concerned,.009);
  const expressions={idle:normal,focused,struggle,happy,sleeping,concerned};
  return {group,setBodyColor(color){
    const chosen=faceInkFor(color);
    ink.color.set(chosen);
    // Pale gray eyes preserve a white catchlight without dark pupil-like dots.
    eyeInk.color.set(chosen===LIGHT_INK?'#cdd3d0':DARK_INK);
    cream.color.set('#ffffff');
  },set(state){
    const preparing=state==='preparing';
    for(const [name,part]of Object.entries(expressions))part.visible=name===(preparing?'struggle':state);
    tenseMouth.visible=preparing;effortMouth.visible=!preparing;
  }};
}
