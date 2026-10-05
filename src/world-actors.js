import {highlightResource} from './resource-highlight.js';
import {mentorModel,animateMentor} from './training-models.js';
import {createConversationFacing} from './conversation-facing.js';
// Portable props/NPCs own picking, occupancy, availability and teardown.
export function createWorldActor({world,tile,parent,pickables,group,kind,label,onInteract,solid=true}){
 const actor={group,tile,x:tile.x,z:tile.z,kind,label,ready:true,opened:false,duration:0};
 group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);if(solid)tile.blocked=true;
 const meshes=[];group.traverse(m=>{if(m.isMesh){m.userData.actor=actor;m.userData.tile=tile;pickables.push(m);meshes.push(m);}});
 let removed=false;actor.available=()=>!removed&&actor.ready&&world.get(`${tile.x},${tile.z}`)===tile;
 actor.interact=()=>actor.available()&&onInteract?.(actor);
 actor.highlight=highlightResource(group,{height:1.5});
 actor.dispose=()=>{if(removed)return;removed=true;actor.ready=false;if(solid)tile.blocked=false;group.removeFromParent();for(const m of meshes){const i=pickables.indexOf(m);if(i>=0)pickables.splice(i,1);}const materials=new Set();group.traverse(m=>{m.geometry?.dispose();for(const mat of [m.material].flat())if(mat)materials.add(mat);});for(const m of materials)m.dispose();};
 return actor;
}
export function createMentor(options){const rig=mentorModel(options.kind),actor=createWorldActor({...options,group:rig.group}),facing=createConversationFacing(rig.group);actor.rig=rig;actor.face=target=>facing.face(target);actor.update=(dt,time,expression,motion='Idle')=>{facing.update(dt);animateMentor(rig,time,motion,expression);};actor.reset=()=>facing.reset();return actor;}
