import {Group} from 'three';
import {createWorldActor} from '../world-actors.js';
import {createResourceEntity} from '../resource-entities.js';
import {createEnemyEntity} from '../enemy-entity.js';
import {furnace,animateFurnace,anvil,supplyShelf} from '../training-models.js';
import {interactionRoute} from '../interaction-route.js';
// Placement only. All work, supplies, spells and combat use production controllers.
export function createTrainingFixtures(api){
 let actors=[],nodes=[],enemies=[],root=null,anchor=null;
 function clear(){api.stop();for(const a of actors)a.dispose();for(const n of nodes)api.resources.remove(n);for(const a of enemies)api.combat.remove(a);actors=[];nodes=[];enemies=[];root?.removeFromParent();root=null;anchor=null;}
 function free(){const p=api.tile();return [...api.world.values()].filter(t=>!t.blocked&&!t.water&&!api.occupied(t)&&Math.abs(t.x-p.x)+Math.abs(t.z-p.z)>=2&&interactionRoute(api.world,p,{tile:t,x:t.x,z:t.z})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];}
 return {clear,update(time){if(root)root.visible=api.world.get(`${anchor.x},${anchor.z}`)===anchor;for(const a of actors)if(a.kind==='furnace')animateFurnace(a.group,time);},run(action){
  if(action==='remove'){clear();return 'Removed portable training fixtures.';}
  if(action==='learn'){api.styles.learn('spark');return 'Learned Spark through shared spell state. Open Combat to select it.';}
  if(action==='forget'){api.stop();api.styles.reset();return 'Reset learned spells and style.';}
  if(action==='kit'){api.supplies.claim('archerKit');api.supplies.claim('arrows');api.supplies.claim('bow');return 'Used the shared starter/refill offers.';}
  if(action==='reset'){api.stop();for(const n of nodes)api.resources.reset(n);api.combat.resetWhere(a=>enemies.includes(a));return 'Reset fixture resources and encounters.';}
  if(action==='spawn'){clear();api.clearUI();root=new Group();api.scene.add(root);anchor=api.tile();for(const [kind,model] of [['furnace',furnace],['anvil',anvil],['supplies',supplyShelf]]){const tile=free();if(tile)actors.push(createWorldActor({kind,tile,world:api.world,parent:root,pickables:api.pickables,group:model(),label:kind==='supplies'?'Take a recovery meal':'Use '+kind,onInteract:a=>kind==='supplies'?api.supplies.claim('meal'):api.openStation(a)}));}
   const tile=free();if(tile)nodes.push(api.resources.add(createResourceEntity({kind:'copper',tile,parent:root,pickables:api.pickables,respawn:8})));
   for(const kind of ['target','scrapper']){const tile=free();if(tile)enemies.push(api.combat.add(createEnemyEntity({kind,tile,parent:root,pickables:api.pickables,respawn:8})));}
   return 'Production copper, furnace, anvil, supply shelf, target and enemy placed in this map. Inventory supplies tools; use real interactions.';
  }
  const target=[...actors,...nodes,...enemies].find(a=>a.kind===action&&api.world.get(`${a.tile.x},${a.tile.z}`)===a.tile);if(target){api.approach(target);return 'Approaching '+action+'.';}return 'Spawn portable training fixtures first.';
 }};
}
