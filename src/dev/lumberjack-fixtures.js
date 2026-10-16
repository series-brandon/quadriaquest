import {Group} from 'three';
import {createResourceEntity} from '../resource-entities.js';
import {interactionRoute} from '../interaction-route.js';
import {TREES,TREE_IDS,treeEffort} from '../lumberjack.js';
import {bestTool} from '../tool-tiers.js';
import {actionXp,workDuration,yieldBonus} from '../skill-pacing.js';
import {totalXpForLevel} from '../combat-formulas.js';
import {itemName} from '../items.js';
// Placement and state only: planted trees are production resource entities, chopped, felled and
// regrown by the shared resource actions in whichever map the player is in.
export function createLumberjackFixtures(api){
 let nodes=[],root=null,anchor=null;
 function clear(){api.stop();for(const n of nodes)api.resources.remove(n);nodes=[];root?.removeFromParent();root=null;anchor=null;}
 // Nearby tiles only, so planting stays instant on the large overworld.
 function free(){const p=api.tile(),near=[];for(let dz=-6;dz<=6;dz++)for(let dx=-6;dx<=6;dx++){const t=api.world.get(`${p.x+dx},${p.z+dz}`);if(t)near.push(t);}return near.filter(t=>!t.blocked&&!t.water&&!api.occupied(t)&&Math.abs(t.x-p.x)+Math.abs(t.z-p.z)>=2&&interactionRoute(api.world,p,{tile:t,x:t.x,z:t.z})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];}
 function plant(species){
  // Planted trees belong to one map: planting after travel starts over in the new one.
  if(root&&api.world.get(`${anchor.x},${anchor.z}`)!==anchor)clear();
  if(!root){root=new Group();api.scene.add(root);anchor=api.tile();}
  const tile=free();if(!tile)return false;
  nodes.push(api.resources.add(createResourceEntity({kind:'tree',species,tile,parent:root,pickables:api.pickables,id:`dev:tree:${species}:${tile.x},${tile.z}`})));return true;
 }
 function readout(species){
  const tree=TREES[species],skill=api.skills.Lumberjack,axe=bestTool('axe',api.inventory,skill.level),effort=treeEffort(species);
  const time=workDuration(effort,{level:skill.level,requirement:tree.level,toolSpeed:axe?.speed??1});
  const bonus=Math.round(yieldBonus(skill.level,tree.level)*100);
  const sure=tree.drops?.always?.[0],count=Array.isArray(sure?.count)?sure.count.join('–'):sure?.count??0;
  return `${tree.name}: Lv ${tree.level} (you ${skill.level}) · ${axe?itemName(axe.item):'no usable axe'} · ~${time.toFixed(1)}s · ${tree.xp??actionXp(effort,tree.level)} XP · ${sure?itemName(sure.item):'nothing'} ×${count}${bonus?` +${bonus}%`:''} · regrows ${tree.respawn}s`;
 }
 return {clear,update(){if(root)root.visible=api.world.get(`${anchor.x},${anchor.z}`)===anchor;},run(action,value){
  if(action==='plant')return plant(value)?readout(value):'No free tile nearby.';
  if(action==='plant-all'){clear();const n=TREE_IDS.filter(plant).length;return `Planted ${n} trees, lowest tier nearest.`;}
  if(action==='level'){const skill=api.skills.Lumberjack,level=TREES[value].level;Object.assign(skill,{xp:Math.ceil(totalXpForLevel(level)),level});return readout(value);}
  if(action==='info')return readout(value);
  if(action==='fell'){api.stop();for(const n of nodes)api.resources.restore(n,{depleted:true,respawnIn:n.respawn});return `Felled planted trees to stumps; each regrows on its tier's timer (${[...new Set(nodes.map(n=>n.respawn))].join(', ')} s).`;}
  if(action==='reset'){api.stop();for(const n of nodes)api.resources.reset(n);return 'Planted trees regrown.';}
  if(action==='remove'){clear();return 'Removed planted trees.';}
  if(action==='axe'){api.inventory[value]=(api.inventory[value]||0)+1;return `Gave ${itemName(value)}.`;}
  return '';
 }};
}
