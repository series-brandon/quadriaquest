import {copperOutcrop} from './training-models.js';
import {makeTree} from './world-models.js';
import {makeBoulder} from './mining.js';
import {createGroundItemModel} from './ground-item-models.js';
import {createResourceHitbox} from './resource-hitbox.js';
import {highlightResource} from './resource-highlight.js';
import {setWorldOccupancy} from './world-occupancy.js';

// Picking, models, occupancy and depletion state are identical in every area.
export function createResourceEntity({kind,tile,parent,pickables,id,respawn=null,onStart,onReward}){
 const solid=kind==='tree'||kind==='boulder'||kind==='copper',group=kind==='copper'?copperOutcrop():kind==='tree'?makeTree():kind==='boulder'?makeBoulder():createGroundItemModel(kind);
 const entity={depleted:false,kind,id,tile,x:tile.x,z:tile.z,group,resourceNode:true,ready:true,duration:0,label:solid?(kind==='tree'?'Chop tree':kind==='copper'?'Mine copper':'Mine boulder'):'Gather '+kind,respawn,onStart,onReward};
 group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);setWorldOccupancy(entity,true);
 group.traverse(mesh=>{if(mesh.isMesh){mesh.userData.tile=tile;mesh.userData[solid?'tree':'resource']=entity;pickables.push(mesh);}});
 entity.highlight=highlightResource(group,{height:solid?(kind==='tree'?2.9:1.6):.95});
 if(!solid){entity.hitbox=createResourceHitbox(entity,tile);pickables.push(entity.hitbox);}
 entity.dispose=()=>{setWorldOccupancy(entity,false);group.removeFromParent();for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.resource===entity||pickables[i].userData.tree===entity)pickables.splice(i,1);const mats=new Set();group.traverse(m=>{m.geometry?.dispose();for(const mat of [m.material].flat())if(mat)mats.add(mat);});for(const m of mats)if(!m.userData.shared)m.dispose();};
 return entity;
}
