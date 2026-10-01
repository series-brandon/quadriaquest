import * as THREE from 'three';

export function createSlimeFace() {
  const group=new THREE.Group();
  const ink=new THREE.MeshStandardMaterial({color:'#314b41',roughness:.85});
  const cream=new THREE.MeshStandardMaterial({color:'#fffef1'});
  const pink=new THREE.MeshStandardMaterial({color:'#eea8a0'});
  function part(geometry,material,parent=group){const m=new THREE.Mesh(geometry,material);parent.add(m);return m;}
  const normal=new THREE.Group(),focused=new THREE.Group(),struggle=new THREE.Group(),happy=new THREE.Group();
  group.add(normal,focused,struggle,happy);
  function line(points,parent,r=.009){
    const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,.382)));
    return part(new THREE.TubeGeometry(curve,12,r,6,false),ink,parent);
  }
  for(const x of [-.14,.14]){
    for(const parent of [normal,focused]){
      const eye=part(new THREE.SphereGeometry(.043,12,8),ink,parent);eye.position.set(x,.5,.355);
      if(parent===focused)eye.scale.y=.75;
      const glint=part(new THREE.SphereGeometry(.012,8,6),cream,parent);glint.position.set(x-.01,.512,.387);
    }
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
  const expressions={idle:normal,focused,struggle,happy};
  return {group,set(state){
    const preparing=state==='preparing';
    for(const [name,part]of Object.entries(expressions))part.visible=name===(preparing?'struggle':state);
    tenseMouth.visible=preparing;effortMouth.visible=!preparing;
  }};
}
