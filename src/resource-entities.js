import {makeTree} from './world-models.js';
import {makeBoulder} from './mining.js';
import {createGroundItemModel} from './ground-item-models.js';
import {createResourceHitbox} from './resource-hitbox.js';
import {highlightResource} from './resource-highlight.js';
import {setWorldOccupancy} from './world-occupancy.js';

// Picking, models, occupancy and depletion state are identical in every area.
export function createResourceEntity({kind,tile,parent,pickables,id,respawn=null,onStart,onReward}){
 const solid=kind==='tree'||kind==='boulder',group=kind==='tree'?makeTree():kind==='boulder'?makeBoulder():createGroundItemModel(kind);
 const entity={depleted:false,kind,id,tile,x:tile.x,z:tile.z,group,resourceNode:true,ready:true,duration:0,label:solid?(kind==='tree'?'Chop tree':'Mine boulder'):'Gather '+kind,respawn,onStart,onReward};
 group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);setWorldOccupancy(entity,true);
 group.traverse(mesh=>{if(mesh.isMesh){mesh.userData.tile=tile;mesh.userData[solid?'tree':'resource']=entity;pickables.push(mesh);}});
 entity.highlight=highlightResource(group,{height:solid?(kind==='tree'?2.9:1.6):.95});
 if(!solid){entity.hitbox=createResourceHitbox(entity,tile);pickables.push(entity.hitbox);}
 return entity;
}
