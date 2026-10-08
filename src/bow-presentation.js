import {trainingTool,animateBow} from './training-models.js';

// The drawing hand carries the arrow from pickup through nocking and draw.
// Keep it separate from the bow so it never appears attached to the wooden grip.
// drawHand: the hand index that draws (0 = right for a bow held in the left hand, 1 for a right-hand bow).
export function createBowPresentation(bow,hands,drawHand=0){
 const arrow=trainingTool('arrows');arrow.name='held-arrow';arrow.visible=false;hands[drawHand].add(arrow);
 return {arrow,update(motion,visible=true){
  animateBow(bow,motion?.bowDraw||0,false);
  arrow.visible=visible&&!!motion?.nocked;
  const pitch=(motion?.arrowRaise||0)*Math.PI/2;
  arrow.rotation.set(pitch,0,0);
  arrow.position.set(0,.26*Math.cos(pitch),.26*Math.sin(pitch));
 }};
}
