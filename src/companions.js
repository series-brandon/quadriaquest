import {companion,animateCompanion,setCompanionOutfit} from './companion-model.js';
import {createCompanionFollower} from './companion-follow.js';
import {key} from './world.js';
import {createCompanionBehavior,PETTING_DURATION} from './companion-behavior.js';
import {signal} from './reactive.js';

// Items a companion can wear, by slot. Wearing needs an owned copy; the item stays in the inventory.
export const COMPANION_GEAR={companionHats:{slot:'head'}};
const NO_OUTFIT=()=>({head:null});

// App-owned companion lifecycle. Worlds supply placement and quest context only.
export function createCompanionSystem(api){
 const model=companion(),state={owned:false,following:true,name:'Pebble',outfit:NO_OUTFIT()};
 const follower=createCompanionFollower(model,{toPosition:api.toPosition}),behavior=createCompanionBehavior();
 const listeners=new Set();let actionAge=null,preview=null,menu=null;
 const actor={group:model,x:0,z:0,tile:null,kind:'companion',duration:0,ready:false,opened:false,get label(){return `Pet ${state.name}`;}};
 const meshes=[];
 // Click targets, including outfit pieces made after the companion.
 function register(){model.traverse(m=>{if(m.isMesh&&!m.userData.actor&&!m.userData.nonInteractive&&!m.name.startsWith('pet-heart')){m.userData.actor=actor;m.userData.tile=actor.tile;meshes.push(m);api.pickables.push(m);}});}
 register();
 // `revision` changes with every state change (owned, name, following) for UI bindings.
 const revision=signal(0);
 const notify=()=>{revision.value++;for(const fn of listeners)fn(state);};
 function locate(){const tile=api.tileAtPosition(model.position);actor.tile=tile;actor.x=tile?.x??0;actor.z=tile?.z??0;actor.ready=state.owned&&!!tile;for(const m of meshes)m.userData.tile=tile;}
 const owns=id=>(api.inventory?.[id]||0)>0;
 function dress(){setCompanionOutfit(model,state.outfit);register();}
 // Losing the last copy of a worn item takes it off (checked each frame, so a refill in between keeps it).
 function refreshOutfit(){let lost=false;for(const [slot,id] of Object.entries(state.outfit))if(id&&!owns(id)){state.outfit[slot]=null;lost=true;}if(lost){dress();notify();}}
 // Puts an owned item on, or takes it off if it is already worn.
 function wear(id){const def=COMPANION_GEAR[id];if(!def||!state.owned||!owns(id))return false;state.outfit[def.slot]=state.outfit[def.slot]===id?null:id;dress();notify();return true;}
 // What the follower needs from the player: their route and facing, and how fast they are going.
 const followContext=()=>({reserved:api.reserved,occupied:api.occupied,next:api.nextTile?.()||null,facing:api.facing?.()??0,pace:api.pace?.()??1,sprinting:!!api.sprinting?.()});
 function cancel(){if(actionAge!==null){behavior.reset();api.feedback.clearDestination();}actionAge=null;preview=null;}
 function acquire({name=state.name,at=null}={}){state.owned=true;state.following=true;state.name=name;api.scene.attach(model);model.visible=true;follower.reset(at);behavior.reset();locate();notify();}
 function pet(){if(!state.owned||api.blocked?.()||api.busy?.())return false;api.stop();actionAge=0;behavior.pet();locate();api.face(actor.x,actor.z);model.rotation.y=Math.atan2(api.player.position.x-model.position.x,api.player.position.z-model.position.z);api.feedback.destination(api.tile());api.feedback.interacting('Petting');return true;}
 function reset(){cancel();behavior.reset();follower.reset();Object.assign(state,{owned:false,following:true,name:'Pebble',outfit:NO_OUTFIT()});dress();model.visible=false;actor.ready=false;menu?.close();notify();}
 function update(dt,time,camera){
  menu?.update(time);
  if(preview){preview.age+=dt;model.visible=true;animateCompanion(model,time,{motion:preview.motion,expression:preview.expression,moving:preview.motion==='Walk',age:preview.motion==='Sleeping'?preview.age:preview.age%2.6,camera});return null;}
  if(!state.owned)return null;
  refreshOutfit();
  if(model.parent!==api.scene)api.scene.attach(model);model.visible=true;
  if(api.moving()&&actionAge!==null)cancel();
  let moving=false;
  const world=api.world,changed=!actor.tile||world.get(`${actor.x},${actor.z}`)!==actor.tile;
  // A player stopping on its tile pushes it aside, following or not (world-occupancy.js).
   if((state.following||changed||api.reserved(actor.tile)||api.tile?.()===actor.tile&&!api.moving?.())&&(api.approaching()!==actor||follower.moving)&&!behavior.petting)moving=follower.update(dt,world,api.tile(),followContext());
  const mood=behavior.update(dt,moving,api.playerSleepTime());
  animateCompanion(model,time,{...mood,moving,gait:follower.gait,jump:follower.jump,camera});locate();
  if(actionAge===null)return null;
  actionAge+=dt;const motion={kind:'Petting',time:actionAge};api.feedback.interacting('Petting');
  if(actionAge>=PETTING_DURATION){actionAge=null;api.feedback.complete();}
  return motion;
 }
 const system={model,actor,revision,get state(){return {...state,outfit:{...state.outfit}};},update,acquire,reset,cancel,pet,wear,owns,gear:COMPANION_GEAR,
  // Inventory actions for companion gear: put it on the companion, or take it off.
  inventoryActions(id){const def=COMPANION_GEAR[id];if(!def)return [];const worn=state.outfit[def.slot]===id;
   return [{label:worn?`Remove from ${state.name}`:`Put on ${state.owned?state.name:'your companion'}`,disabled:!state.owned||!owns(id),run:()=>wear(id)}];},
  attachMenu(value){menu=value;},onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  rename(name){const value=name.trim();if(!value)return false;state.name=value;notify();return true;},
  setFollowing(value){state.following=!!value;behavior.reset();notify();},
  resetRoute(at=null){cancel();follower.reset(at);behavior.reset();},
  occupies(tile){return state.owned&&model.visible&&follower.occupies(tile);},
  // The tiles it occupies (resting and stepping onto), for the shared occupancy map.
  get cells(){return state.owned&&model.visible?follower.cells:[];},
  matches(target){return actionAge!==null&&target===actor;},get working(){return actionAge!==null;},
  scripted(time,options){if(!state.owned)animateCompanion(model,time,options);},
  name(options){menu?.editName(options);},
  preview:typeof __PLAYGROUND__!=='undefined'&&__PLAYGROUND__?function(motion,expression='Default'){cancel();if(!state.owned){acquire();follower.update(0,api.world,api.tile(),followContext());}preview={motion,expression,age:0};}:undefined,
  get previewing(){return !!preview;},
  // The tiles it is about to walk (the playground's route overlay).
  get route(){return state.owned&&model.visible?follower.route:[];},
  // Following, for the playground and checks: state (resting, following, teleported), the last teleport's
  // reason and the speed as a share of base walking.
  get follow(){return {state:follower.state,lastTeleport:follower.lastTeleport,speed:follower.speed,tile:follower.tile&&[follower.tile.x,follower.tile.z]};},
  // Pops in beside the player now (the real catch-up teleport).
  teleport(){if(!state.owned)return false;cancel();return follower.teleport(api.world,api.tile(),followContext(),'manual');},
  // Puts it `n` tiles behind the player (or the nearest dry, open tile to that spot), to watch it catch up.
  sendAway(n){if(!state.owned)return false;cancel();const p=api.tile(),f=api.facing?.()??0,world=api.world;
   const want={x:Math.round(p.x-Math.sin(f)*n),z:Math.round(p.z-Math.cos(f)*n)};
   const near=[];for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const t=world.get(key(want.x+dx,want.z+dz));if(t&&!t.blocked&&!t.water&&t!==p)near.push(t);}
   const spot=near.sort((a,b)=>Math.hypot(a.x-want.x,a.z-want.z)-Math.hypot(b.x-want.x,b.z-want.z))[0];
   if(!spot)return false;follower.reset(spot);model.position.copy(api.toPosition(spot));behavior.reset();locate();return [spot.x,spot.z];},
  dispose(){cancel();menu?.dispose();for(const mesh of meshes){const i=api.pickables.indexOf(mesh);if(i>=0)api.pickables.splice(i,1);}model.removeFromParent();listeners.clear();}
 };
 return system;
}
