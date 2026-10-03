import {Vector3} from 'three';

// Portable world-model behavior. Dialogue portraits retain their own framing.
export function createConversationFacing(model){
 let targetAngle=null;
 const point=new Vector3();
 return {
  face(target){
   target.getWorldPosition(point);
   if(model.parent)model.parent.worldToLocal(point);
   const dx=point.x-model.position.x,dz=point.z-model.position.z;
   if(dx*dx+dz*dz>1e-8)targetAngle=Math.atan2(dx,dz);
  },
  update(dt){
   if(targetAngle===null)return;
   const delta=Math.atan2(Math.sin(targetAngle-model.rotation.y),Math.cos(targetAngle-model.rotation.y));
   model.rotation.y+=delta*(1-Math.exp(-Math.max(0,dt)*12));
   if(Math.abs(delta)<.001){model.rotation.y=targetAngle;targetAngle=null;}
  },
  reset(){targetAngle=null;}
 };
}
