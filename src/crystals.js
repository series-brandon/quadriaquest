import {makeCrystal,animateCrystal,crystalFootprint,crystalCentre,CRYSTAL_HEIGHT} from './crystal-model.js';
import {highlightResource} from './resource-highlight.js';

// Iter Crystals in the world (docs/TOWN.md, Iter Crystals): the shared entity every crystal is, in the tutorial
// areas and on any map. Each stands on 2 × 2 tiles (crystalFootprint), all blocked; the tile it was given
// carries the footprint (tile.crystalFootprint) so arrivals step off beside it (portal-spawn.js).
// place: the crystal's id when it's a destination of its own (a map's crystal, crystal-places.js).
export function createCrystals({world,pickables,travel,choose,hover=()=>null}){
 const crystals=new Set();
 function remove(actor){if(!crystals.delete(actor))return;travel.cancelFrom(actor);actor.ready=false;for(const t of actor.tiles)t.blocked=false;delete actor.tile.crystalFootprint;actor.group.removeFromParent();
  for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.actor===actor)pickables.splice(i,1);
  // The model's geometry and materials are shared by every crystal (crystal-model.js): only the rest goes.
  const geometry=new Set(),materials=new Set();actor.group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)geometry.add(o.geometry);if(!o.userData.portraitIgnore||o.isSprite)for(const m of [o.material].flat())if(m&&!m.userData.shared)materials.add(m);});for(const g of geometry)g.dispose();for(const m of materials)m.dispose();
 }
 // guide(): whether a tutorial step points the player at this crystal (gold outline and arrow).
 // Otherwise a crystal is plain, with the usual hover outline: being usable isn't an objective.
 // tileAt(x, z): the tiles around it (its area's, which may not be the live world yet); the world by default.
 return {add({tile,parent,destination=null,place=null,label='Use Iter Crystal',ready=true,onArrive,guide=()=>false,tileAt=(x,z)=>world.get(`${x},${z}`)}){
  const tiles=crystalFootprint(tile,(x,z)=>x===tile.x&&z===tile.z?tile:tileAt(x,z)),group=makeCrystal(),centre=crystalCentre(tiles);
  // Its body (footprint.js): anchored at the footprint's north-west tile, 2 × 2, so you face its middle.
  const actor={group,tile,tiles,x:Math.min(...tiles.map(t=>t.x)),z:Math.min(...tiles.map(t=>t.z)),size:tiles.length===4?2:1,kind:'crystal',crystal:true,destination,place,label,ready,duration:0};
  group.position.set(centre.x,centre.y,centre.z);parent.add(group);for(const t of tiles)t.blocked=true;tile.crystalFootprint=tiles;crystals.add(actor);
  group.traverse(m=>{if(m.isMesh){m.userData.actor=actor;m.userData.tile=tile;pickables.push(m);}});
  actor.highlight=highlightResource(group,{height:CRYSTAL_HEIGHT});actor.guide=guide;
  actor.available=()=>crystals.has(actor)&&actor.ready&&world.get(`${tile.x},${tile.z}`)===tile;
  actor.interact=()=>actor.available()&&(choose?choose(actor,onArrive):travel.request(destination,{source:actor,onArrive}));
  actor.dispose=()=>remove(actor);return actor;
 },remove,
 update(time){for(const actor of crystals){const available=actor.available();actor.highlight.update(available&&actor.guide(),time,available&&hover()===actor);if(available)animateCrystal(actor.group,time,actor.group.position.y);}},
 current(){return [...crystals].filter(a=>a.available());}
 };
}
