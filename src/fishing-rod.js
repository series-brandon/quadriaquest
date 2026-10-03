import * as THREE from 'three';

export function makeFishingRod(){
 const group=new THREE.Group();
 const geometry=new THREE.CylinderGeometry(.014,.035,1.7,6,34);
 geometry.translate(0,.65,0);
 const original=geometry.attributes.position.array.slice();
 const shaft=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#a48556',roughness:.75}));shaft.castShadow=true;group.add(shaft);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:25},()=>new THREE.Vector3())),new THREE.LineBasicMaterial({color:'#ece6c8'}));group.add(line);
 group.userData.fishingRig={shaft,line,original};
 updateFishingRod(group,null,0);
 return group;
}
// The anchor is world-space: rod/hand movement never drags the water endpoint.
export function updateFishingRod(group,anchor,tension=0,tipAnchor=null){
 const rig=group.userData.fishingRig;if(!rig)return;
 group.updateWorldMatrix(true,false);
 const end=anchor?group.worldToLocal(anchor.clone()):new THREE.Vector3(0,.4,.35);
 const direction=new THREE.Vector2(end.x,end.z);if(direction.lengthSq()<.0001)direction.set(0,1);direction.normalize();
 // Integrate equal-length sections instead of displacing/stretching the shaft.
 // Curvature increases toward the thin tip; the first .35 units stay stiff.
 function centerline(angle){
  const points=[new THREE.Vector3(0,-.2,0)];
  for(let i=0;i<34;i++){
   const y=-.2+(i+.5)*.05,t=Math.max(0,(y-.15)/1.35),theta=angle*t**1.5;
   points.push(points[i].clone().add(new THREE.Vector3(direction.x*Math.sin(theta),Math.cos(theta),direction.y*Math.sin(theta)).multiplyScalar(.05)));
  }
  return points;
 }
 let angle=1.6*Math.max(0,Math.min(1,tension));
 if(tipAnchor){
  // Match the old height as closely as the rod permits, freeing horizontal travel.
  let best=Infinity;
  for(let i=0;i<=60;i++){
   const candidate=i*2.7/60,tip=centerline(candidate).at(-1).applyMatrix4(group.matrixWorld);
   const error=Math.abs(tip.y-tipAnchor.y);
   if(error<best){best=error;angle=candidate;}
  }
 }
 const centers=centerline(angle);rig.centerline=centers;
 const positions=rig.shaft.geometry.attributes.position,rotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 for(let i=0;i<positions.count;i++){
  const x=rig.original[i*3],y=rig.original[i*3+1],z=rig.original[i*3+2];
  const index=Math.max(0,Math.min(34,Math.round((y+.2)/.05))),t=Math.max(0,(y-.15)/1.35),theta=angle*t**1.5;
  rotation.setFromUnitVectors(up,new THREE.Vector3(direction.x*Math.sin(theta),Math.cos(theta),direction.y*Math.sin(theta)));
  const point=new THREE.Vector3(x,0,z).applyQuaternion(rotation).add(centers[index]);
  positions.setXYZ(i,point.x,point.y,point.z);
 }
 positions.needsUpdate=true;rig.shaft.geometry.computeVertexNormals();rig.shaft.geometry.computeBoundingSphere();
 const tip=centers.at(-1);
 const midpoint=tip.clone().lerp(end,.5);
 // Sag follows world gravity, shrinking as the line pulls taut.
 const gravity=new THREE.Vector3(0,-.18*(1-tension),0).transformDirection(group.matrixWorld.clone().invert());
 midpoint.addScaledVector(gravity,.18*(1-tension));
 const curve=new THREE.QuadraticBezierCurve3(tip,midpoint,end),attribute=rig.line.geometry.attributes.position;
 for(let i=0;i<attribute.count;i++){const p=curve.getPoint(i/(attribute.count-1));attribute.setXYZ(i,p.x,p.y,p.z);}
 attribute.needsUpdate=true;rig.line.geometry.computeBoundingSphere();
}

// Capture the pre-catch tip height; allow horizontal travel during the pull.
export function updateFishingRodMotion(group,anchor,catchTime=null){
 const rig=group.userData.fishingRig;
 if(catchTime===null){
  updateFishingRod(group,anchor,.2);
  rig.restTip=new THREE.Vector3().fromBufferAttribute(rig.line.geometry.attributes.position,0).applyMatrix4(group.matrixWorld);
  rig.catchTip=null;rig.lastCatchTime=null;return;
 }
 if(rig.lastCatchTime==null||catchTime<rig.lastCatchTime){
  if(catchTime<=.001||!rig.restTip){
   updateFishingRod(group,anchor,.2);
   rig.restTip=new THREE.Vector3().fromBufferAttribute(rig.line.geometry.attributes.position,0).applyMatrix4(group.matrixWorld);
  }
  rig.catchTip=rig.restTip.clone();
 }
 rig.lastCatchTime=catchTime;
 updateFishingRod(group,anchor,1,rig.catchTip);
}
export function resetFishingRodMotion(group){
 const rig=group.userData.fishingRig;rig.restTip=null;rig.catchTip=null;rig.lastCatchTime=null;
}

// Before release the line trails the tip; then its endpoint arcs into the fishing spot.
export function updateFishingCast(group,anchor,time){
 const rig=group.userData.fishingRig;
 resetFishingRodMotion(group);
 const release=.56,flight=Math.max(0,Math.min(1,(time-release)/.42));
 updateFishingRod(group,null,.08);
 const tip=new THREE.Vector3().fromBufferAttribute(rig.line.geometry.attributes.position,0).applyMatrix4(group.matrixWorld);
 if(time<release||!rig.castOrigin||time<rig.lastCastTime)rig.castOrigin=tip.clone().add(new THREE.Vector3(0,-.35,0));
 rig.lastCastTime=time;
 const endpoint=rig.castOrigin.clone().lerp(anchor,flight);endpoint.y+=Math.sin(flight*Math.PI)*.65;
 updateFishingRodMotion(group,endpoint);
}
