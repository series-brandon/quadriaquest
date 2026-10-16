import {TREE_SPECIES,makeStumpModel} from './tree-models.js';
import {DEFAULT_TREE,TREES,treeOf} from './lumberjack.js';
import {copperOutcrop} from './training-models.js';
import {makeTree} from './world-models.js';
import {makeBoulder,makeRubble} from './mining.js';
import {createGroundItemModel} from './ground-item-models.js';
import {createResourceHitbox} from './resource-hitbox.js';
import {highlightResource} from './resource-highlight.js';
import {setWorldOccupancy} from './world-occupancy.js';

// Seconds before a depleted resource grows back; the same in every area. Pass respawn:null for a finite node.
export const RESOURCE_RESPAWN=8;
// Picking, models, occupancy and depletion state are identical in every area. A solid resource (tree,
// boulder, copper) leaves a remnant when depleted (a stump, rubble) that keeps its tile blocked until it
// regrows, as in RuneScape; ground items simply disappear.
// species: a tree's tier (lumberjack.js: level, wood, effort) and look (tree-models.js).
// xp: an optional entity XP modifier {scale, belowLevel} (resource-actions.js resourceXp).
export function createResourceEntity({kind,tile,parent,pickables,id,species=DEFAULT_TREE,respawn=RESOURCE_RESPAWN,xp=null,onStart,onReward}){
 if(kind==='tree'&&!TREES[species])species=DEFAULT_TREE;
 const solid=kind==='tree'||kind==='boulder'||kind==='copper',group=kind==='copper'?copperOutcrop():kind==='tree'?makeTree(species):kind==='boulder'?makeBoulder():createGroundItemModel(kind);
 const entity={depleted:false,kind,id,tile,x:tile.x,z:tile.z,group,resourceNode:true,ready:true,duration:0,species,xp,label:solid?(kind==='tree'?`Chop ${treeOf(species).name}`:kind==='copper'?'Mine copper':'Mine boulder'):'Gather '+kind,depletedLabel:kind==='tree'?`${treeOf(species).name} stump`:kind==='copper'?'Spent copper rock':kind==='boulder'?'Rubble':null,solid,remnant:null,respawn,onStart,onReward};
 group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);setWorldOccupancy(entity,true);
 group.traverse(mesh=>{if(mesh.isMesh){mesh.userData.tile=tile;mesh.userData[solid?'tree':'resource']=entity;pickables.push(mesh);}});
 entity.highlight=highlightResource(group,{height:solid?(kind==='tree'?TREE_SPECIES[species]?.height||2.9:1.6):.95});
 if(!solid){entity.hitbox=createResourceHitbox(entity,tile);pickables.push(entity.hitbox);}
 // The remnant is made the first time it is needed and shares the resource's tile, picking and parent.
 entity.showRemnant=on=>{
  if(!solid)return;
  if(on&&!entity.remnant){const r=kind==='tree'?makeStumpModel(species):makeRubble(kind);r.position.copy(group.position);parent.add(r);
   r.traverse(mesh=>{if(mesh.isMesh){mesh.userData.tile=tile;mesh.userData.tree=entity;pickables.push(mesh);}});entity.remnant=r;}
  if(entity.remnant)entity.remnant.visible=on;
 };
 entity.dispose=()=>{setWorldOccupancy(entity,false);group.removeFromParent();entity.remnant?.removeFromParent();for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.resource===entity||pickables[i].userData.tree===entity)pickables.splice(i,1);const mats=new Set();group.traverse(m=>{if(!m.geometry?.userData.shared)m.geometry?.dispose();for(const mat of [m.material].flat())if(mat)mats.add(mat);});for(const m of mats)if(!m.userData.shared)m.dispose();};
 return entity;
}
