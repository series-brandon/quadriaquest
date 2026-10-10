import * as THREE from 'three';

// Strong Strike's glow, shared by every slime (slime-presentation.js): a golden aura that gathers around
// the striking hand through the windup (`power`, flickering as it builds) and bursts outward as the blow
// lands (`flash`, fading over the follow-through). Driven by attackAnimation's power/flash/powerHand.
export function createStrikePresentation(hands){
 const geometry=new THREE.SphereGeometry(.17,16,12);
 const glows=hands.map(hand=>{
  // Normal blending (not additive) so the glow reads on light ground and sky as well as dark.
  const material=new THREE.MeshBasicMaterial({color:'#ffb52e',transparent:true,opacity:0,depthWrite:false});
  const glow=new THREE.Mesh(geometry,material);glow.name='strong-strike-glow';glow.visible=false;glow.userData.nonInteractive=true;glow.userData.portraitIgnore=true;hand.add(glow);return glow;
 });
 return {update(motion,time){
  glows.forEach((glow,i)=>{
   const power=motion?.powerHand===i?motion.power||0:0,flash=motion?.powerHand===i?motion.flash||0:0;
   glow.visible=power>.02||flash>.02;if(!glow.visible)return;
   const burst=1-flash;
   glow.scale.setScalar(flash>0?1.3+burst*1.6:(.5+power*.8)*(1+Math.sin(time*34)*.07*power));
   glow.material.opacity=flash>0?.7*flash:.12+.45*power;
  });
 }};
}
