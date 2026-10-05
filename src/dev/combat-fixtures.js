import {createEnemyEntity} from '../enemy-entity.js';
import {interactionRoute} from '../interaction-route.js';

// Only placement and test commands live here; every action is production combat.
export function createCombatFixtures(api){
 let actors=[];
 function clear(){api.combat.clear();for(const a of actors)api.combat.remove(a);actors=[];}
 function spawn(aggressive=false){
  api.stop();api.clearUI();clear();
  for(const kind of ['scrapper','bruiser']){
   const p=api.tile(),tile=[...api.world.values()].filter(t=>!t.water&&!t.blocked&&!api.occupied(t)&&Math.abs(t.x-p.x)+Math.abs(t.z-p.z)>=2&&interactionRoute(api.world,p,{x:t.x,z:t.z,tile:t})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
   if(!tile)continue;actors.push(api.combat.add(createEnemyEntity({kind,tile,parent:api.scene,pickables:api.pickables,aggressive,aggroRange:3})));
  }
  return actors.length?'Spawned '+(aggressive?'aggressive (3-tile awareness)':'passive')+' combat practice enemies nearby.':'No clear reachable tiles for enemies.';
 }
 return {clear,run(action){
  if(action==='spawn')return spawn(false);
  if(action==='spawn-aggressive')return spawn(true);
  if(action==='remove'){clear();return 'Removed combat practice enemies.';}
  if(action==='reset'){api.stop();api.combat.reset();return 'Reset enemy health, positions, and combat.';}
  if(action==='defeat'){api.combat.lose();return 'Playing the real defeat and safe respawn flow.';}
  const actor=actors.find(a=>a.kind===action&&api.world.get(`${a.home.x},${a.home.z}`)===a.home&&!a.opened);
  if(actor){api.approach(actor);return 'Approaching '+actor.rules.name+'.';}
  return 'Spawn or reset the practice enemies first.';
 }};
}
