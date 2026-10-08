import {createEnemyEntity} from '../enemy-entity.js';
import {interactionRoute} from '../interaction-route.js';
import {ENEMIES} from '../combat-rules.js';

const pct=v=>`${+v.toFixed(2)}%`;
// Production-derived enemy sheets; nothing here recalculates or overrides combat values.
export function enemySheetSummary(kind){
 const e=ENEMIES[kind],t=e.threat;
 return `${e.name}: ${e.health} HP, ${e.min}–${e.max} damage every ${+e.interval.toFixed(3)}s (base ${e.baseInterval}s), Threat ${t.level} (raw ${+t.raw.toFixed(2)}: offense ${+t.offensive.toFixed(2)}, defense ${+t.defensive.toFixed(2)}, support ${+t.support.toFixed(2)}), miss ${pct(e.missPercent)}, crit/dodge/block ${[e.canCritical,e.canDodge,e.canBlock].map(v=>v?'on':'off').join('/')}, resistance ${pct(e.resistancePct.melee)}, ${e.aggressive?`aggressive within ${e.aggroRange} tiles`:'passive'}${e.protected?', cannot defeat the player':''}.`;
}
export function enemySheetDetails(){
 const rows=(e)=>Object.entries({...e.sheet.attributes,...Object.fromEntries(Object.entries(e.sheet.skills).flatMap(([style,sk])=>Object.entries(sk).map(([k,v])=>[`${style} ${k}`,v]))),...Object.fromEntries(Object.entries(e.sheet.proficiencies).map(([k,v])=>[`${k} proficiency`,v]))});
 const [s,b]=[ENEMIES.scrapper,ENEMIES.bruiser];
 return `<table class="dev-sheet"><tr><th>Input</th><th>Scrapper</th><th>Bruiser</th></tr>${rows(s).map(([k,v],i)=>`<tr><td>${k}</td><td>${v}</td><td>${rows(b)[i][1]}</td></tr>`).join('')}</table>`;
}

// Only placement and test commands live here; every action is production combat.
export function createCombatFixtures(api){
 let actors=[];
 function clear(){api.combat.clear();for(const a of actors)api.combat.remove(a);actors=[];}
 function spawn(aggressive=false,attacksPacifists=false){
  api.stop();api.clearUI();clear();
  for(const kind of ['scrapper','bruiser']){
   const p=api.tile(),tile=[...api.world.values()].filter(t=>!t.water&&!t.blocked&&!api.occupied(t)&&Math.abs(t.x-p.x)+Math.abs(t.z-p.z)>=2&&interactionRoute(api.world,p,{x:t.x,z:t.z,tile:t})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
   if(!tile)continue;actors.push(api.combat.add(createEnemyEntity({kind,tile,parent:api.scene,pickables:api.pickables,aggressive,aggroRange:3,attacksPacifists})));
  }
  return actors.length?'Spawned '+(attacksPacifists?'aggressive, pacifist-hunting':aggressive?'aggressive (3-tile awareness)':'passive')+' combat practice enemies nearby.':'No clear reachable tiles for enemies.';
 }
 return {clear,run(action){
  if(action==='spawn')return spawn(false);
  if(action==='spawn-aggressive')return spawn(true);
  if(action==='spawn-hunters')return spawn(true,true);
  if(action==='sheets')return ['scrapper','bruiser'].map(enemySheetSummary).join(' ')+' All values are live: enemy attacks resolve miss → your dodge → your block → damage → your resistance.';
  if(action==='remove'){clear();return 'Removed combat practice enemies.';}
  if(action==='reset'){api.stop();api.combat.reset();return 'Reset enemy health, positions, and combat.';}
  if(action==='defeat'){api.combat.lose();return 'Playing the real defeat and safe respawn flow.';}
  const actor=actors.find(a=>a.kind===action&&api.world.get(`${a.home.x},${a.home.z}`)===a.home&&!a.opened);
  if(actor){api.approach(actor);return 'Approaching '+actor.rules.name+'.';}
  return 'Spawn or reset the practice enemies first.';
 }};
}
