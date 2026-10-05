import {makeCrystal,animateCrystal} from './crystal-model.js';
import {highlightResource} from './resource-highlight.js';


export function createCrystals({world,pickables,travel,choose,hover=()=>null}){
 const crystals=new Set();
 function remove(actor){if(!crystals.delete(actor))return;travel.cancelFrom(actor);actor.ready=false;actor.tile.blocked=false;actor.group.removeFromParent();
  for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.actor===actor)pickables.splice(i,1);
  const geometry=new Set(),materials=new Set();actor.group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(!o.userData.portraitIgnore||o.isSprite)for(const m of [o.material].flat())if(m)materials.add(m);});for(const g of geometry)g.dispose();for(const m of materials)m.dispose();
 }
 return {add({tile,parent,destination,label='Use Iter Crystal',ready=true,onArrive}){
  const group=makeCrystal(),actor={group,tile,x:tile.x,z:tile.z,kind:'crystal',crystal:true,destination,label,ready,duration:0};
  group.position.set(tile.x-6,tile.h,tile.z-6);parent.add(group);tile.blocked=true;crystals.add(actor);
  group.traverse(m=>{if(m.isMesh){m.userData.actor=actor;m.userData.tile=tile;pickables.push(m);}});
  actor.highlight=highlightResource(group,{height:2.75});
  actor.available=()=>crystals.has(actor)&&actor.ready&&world.get(`${tile.x},${tile.z}`)===tile;
  actor.interact=()=>actor.available()&&(choose?choose(actor,onArrive):travel.request(destination,{source:actor,onArrive}));return actor;
 },remove,
 update(time){for(const actor of crystals){const available=actor.available();actor.highlight.update(available,time,available&&hover()===actor);if(available)animateCrystal(actor.group,time,actor.tile.h);}},
 current(){return [...crystals].filter(a=>a.available());}
 };
}
