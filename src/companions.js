import {companion,animateCompanion} from './companion-model.js';
import {createCompanionFollower} from './companion-follow.js';
import {createCompanionBehavior,PETTING_DURATION} from './companion-behavior.js';
import {signal} from './reactive.js';

// App-owned companion lifecycle. Worlds supply placement and quest context only.
export function createCompanionSystem(api){
 const model=companion(),state={owned:false,following:true,name:'Pebble'};
 const follower=createCompanionFollower(model,{toPosition:api.toPosition}),behavior=createCompanionBehavior();
 const listeners=new Set();let actionAge=null,preview=null,menu=null;
 const actor={group:model,x:0,z:0,tile:null,kind:'companion',duration:0,ready:false,opened:false,get label(){return `Pet ${state.name}`;}};
 const meshes=[];model.traverse(m=>{if(m.isMesh&&!m.userData.nonInteractive&&!m.name.startsWith('pet-heart')){m.userData.actor=actor;meshes.push(m);api.pickables.push(m);}});
 // `revision` changes with every state change (owned, name, following) for UI bindings.
 const revision=signal(0);
 const notify=()=>{revision.value++;for(const fn of listeners)fn(state);};
 function locate(){const tile=api.tileAtPosition(model.position);actor.tile=tile;actor.x=tile?.x??0;actor.z=tile?.z??0;actor.ready=state.owned&&!!tile;for(const m of meshes)m.userData.tile=tile;}
 function cancel(){if(actionAge!==null){behavior.reset();api.feedback.clearDestination();}actionAge=null;preview=null;}
 function acquire({name=state.name,at=null}={}){state.owned=true;state.following=true;state.name=name;api.scene.attach(model);model.visible=true;follower.reset(at);behavior.reset();locate();notify();}
 function pet(){if(!state.owned||api.blocked?.()||api.busy?.())return false;api.stop();actionAge=0;behavior.pet();locate();api.face(actor.x,actor.z);model.rotation.y=Math.atan2(api.player.position.x-model.position.x,api.player.position.z-model.position.z);api.feedback.destination(api.tile());api.feedback.interacting('Petting');return true;}
 function reset(){cancel();behavior.reset();follower.reset();Object.assign(state,{owned:false,following:true,name:'Pebble'});model.visible=false;actor.ready=false;menu?.close();notify();}
 function update(dt,time,camera){
  menu?.update(time);
  if(preview){preview.age+=dt;model.visible=true;animateCompanion(model,time,{motion:preview.motion,expression:preview.expression,moving:preview.motion==='Walk',age:preview.motion==='Sleeping'?preview.age:preview.age%2.6,camera});return null;}
  if(!state.owned)return null;
  if(model.parent!==api.scene)api.scene.attach(model);model.visible=true;
  if(api.moving()&&actionAge!==null)cancel();
  let moving=false;
  const world=api.world,changed=!actor.tile||world.get(`${actor.x},${actor.z}`)!==actor.tile;
  if((state.following||changed||api.reserved(actor.tile))&&(api.approaching()!==actor||follower.moving)&&!behavior.petting)moving=follower.update(dt,world,api.tile(),api.reserved,api.occupied);
  const mood=behavior.update(dt,moving,api.playerSleepTime());
  animateCompanion(model,time,{...mood,moving,gait:follower.gait,jump:follower.jump,camera});locate();
  if(actionAge===null)return null;
  actionAge+=dt;const motion={kind:'Petting',time:actionAge};api.feedback.interacting('Petting');
  if(actionAge>=PETTING_DURATION){actionAge=null;api.feedback.complete();}
  return motion;
 }
 const system={model,actor,revision,get state(){return {...state};},update,acquire,reset,cancel,pet,
  attachMenu(value){menu=value;},onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  rename(name){const value=name.trim();if(!value)return false;state.name=value;notify();return true;},
  setFollowing(value){state.following=!!value;behavior.reset();notify();},
  resetRoute(at=null){cancel();follower.reset(at);behavior.reset();},
  occupies(tile){return state.owned&&model.visible&&follower.occupies(tile);},
  cannotYield(tile){return system.occupies(tile)&&follower.yieldBlocked;},
  matches(target){return actionAge!==null&&target===actor;},get working(){return actionAge!==null;},
  scripted(time,options){if(!state.owned)animateCompanion(model,time,options);},
  name(options){menu?.editName(options);},
  preview:typeof __PLAYGROUND__!=='undefined'&&__PLAYGROUND__?function(motion,expression='Default'){cancel();if(!state.owned){acquire();follower.update(0,api.world,api.tile(),api.reserved,api.occupied);}preview={motion,expression,age:0};}:undefined,
  get previewing(){return !!preview;},
  dispose(){cancel();menu?.dispose();for(const mesh of meshes){const i=api.pickables.indexOf(mesh);if(i>=0)api.pickables.splice(i,1);}model.removeFromParent();listeners.clear();}
 };
 return system;
}
