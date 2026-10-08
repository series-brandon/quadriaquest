import {displayedLoss} from './combat-formulas.js';
// Health the finger smash costs: enough that it is still worth eating by the end of the chapter
// (passive regeneration erased a smaller loss before the meal).
export const INJURY_DAMAGE=20;
export function createBridgeInjury(){
 let applied=false;
 return {get applied(){return applied;},reset(){applied=false;},atProgress(progress,health){
  if(applied||progress<.75)return null;
  applied=true;const next=Math.max(1,health-INJURY_DAMAGE);return {health:next,damage:displayedLoss(health,next)};
 }};
}
export function hammerInjuryPose(time){
 const recoil=Math.max(0,1-time/.35),shake=Math.sin(time*30)*Math.max(0,1-time/1.2);
 return {squash:1-recoil*.16,lean:-recoil*.16,twist:shake*.035,stretch:1,
 hands:[[-.34,.5,.35,0,0],[.34+shake*.07,.56,.42,shake*.5,0]]};
}
