import {createEnemyEntity,enemySize} from '../enemy-entity.js';
import {interactionRoute} from '../interaction-route.js';
import {ENEMIES,SPECIAL_ATTACKS,attackMix,aggressiveUntil} from '../combat-rules.js';
import {STYLES} from '../combat-formulas.js';
import {footprint,footprintGap,canStand} from '../footprint.js';

const pct=v=>`${+v.toFixed(2)}%`;
// Production-derived enemy sheets; nothing here recalculates or overrides combat values.
export function enemySheetSummary(kind){
 const e=ENEMIES[kind],t=e.threat,until=e.aggressiveUntil??0;
 const mix=attackMix(e.moves).map(([m,p,when])=>`${m.name} ${+p.toFixed(1)}%${when?` once you keep away ${m.after}s`:''} (${m.min}–${m.max}, ${+m.interval.toFixed(3)}s)`).join(', ')||'none';
 return `${e.name}: ${e.health} HP, attacks ${mix} (base ${e.baseInterval}s), Threat ${t.level} (raw ${+t.raw.toFixed(2)}: offense ${+t.offensive.toFixed(2)}, defense ${+t.defensive.toFixed(2)}, support ${+t.support.toFixed(2)}), miss ${pct(e.missPercent)}, crit/dodge/block ${[e.canCritical,e.canDodge,e.canBlock].map(v=>v?'on':'off').join('/')}, resistance ${pct(e.resistancePct.melee)}, ${until>0?`aggressive within ${e.aggroRange} tiles to players below Threat ${until}`:'never aggressive'}${e.protected?', cannot defeat the player':''}.`;
}
// Attacks the playground can force on practice enemies: every regular style and every special attack.
export const FORCE_ATTACKS=[...STYLES.map(s=>[s,`${s[0].toUpperCase()}${s.slice(1)} (regular)`]),...Object.entries(SPECIAL_ATTACKS).map(([id,a])=>[id,a.name])];
export function enemySheetDetails(){
 const rows=(e)=>Object.entries({...e.sheet.attributes,...Object.fromEntries(Object.entries(e.sheet.skills).flatMap(([style,sk])=>Object.entries(sk).map(([k,v])=>[`${style} ${k}`,v]))),...Object.fromEntries(Object.entries(e.sheet.proficiencies).map(([k,v])=>[`${k} proficiency`,v]))});
 const [s,b]=[ENEMIES.scrapper,ENEMIES.bruiser];
 return `<table class="dev-sheet"><tr><th>Input</th><th>Scrapper</th><th>Bruiser</th></tr>${rows(s).map(([k,v],i)=>`<tr><td>${k}</td><td>${v}</td><td>${rows(b)[i][1]}</td></tr>`).join('')}</table>`;
}

// Only placement and test commands live here; every action is production combat.
export function createCombatFixtures(api){
 let actors=[];
 function clear(){api.combat.clear();for(const a of actors)api.combat.remove(a);actors=[];}
 // until: each spawn's aggressiveUntil override (0 passive, 999 always aggressive); undefined follows the type.
 function spawn(until,attacksPacifists=false,kinds=['scrapper','bruiser']){
  api.stop();api.clearUI();clear();
  for(const kind of kinds){
   const p=api.tile(),size=enemySize(kind),tile=[...api.world.values()].filter(t=>!t.water&&!t.blocked&&!api.occupied(t)&&footprintGap(t,size,p)>=2&&(size===1||canStand(api.world,t,size)&&footprint(api.world,t,size).every(c=>!api.occupied(c)))&&interactionRoute(api.world,p,{x:t.x,z:t.z,tile:t})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
   if(!tile)continue;actors.push(api.combat.add(createEnemyEntity(kind==='golem'?{kind,tile,parent:api.scene,pickables:api.pickables,aggroRange:4}:{kind,tile,parent:api.scene,pickables:api.pickables,aggressiveUntil:until,aggroRange:3,...attacksPacifists?{attacksPacifists}:{}})));
  }
  if(kinds.includes('golem'))return actors.length?'Spawned the Cinder Golem nearby (notices you within 4 tiles, even as a pacifist). Run when it winds up!':'No clear reachable tile for the golem.';
  const threat=api.combat.state.threat,mood=until===undefined?`as their types (your Threat ${threat}: ${actors.map(a=>`${a.rules.name} ${threat<aggressiveUntil(a)?'aggressive':'passive'} below ${aggressiveUntil(a)}`).join(', ')})`:attacksPacifists?'aggressive, pacifist-hunting':until>0?'aggressive (3-tile awareness)':'passive';
  return actors.length?`Spawned ${mood} combat practice enemies nearby.`:'No clear reachable tiles for enemies.';
 }
 // Practice enemies (and any enemy engaged now) use only this attack; '' goes back to their type's mix.
 function force(id){
  const engaged=api.combat.engagedEnemy,targets=[...actors.filter(a=>!a.opened),...engaged&&!actors.includes(engaged)?[engaged]:[]];
  for(const a of targets)api.combat.forceAttack(a,id||null);
  const name=FORCE_ATTACKS.find(([k])=>k===id)?.[1];
  return targets.length?(id?`${targets.length} enem${targets.length>1?'ies':'y'} now use only ${name}.`:'Enemies use their type\u2019s attack mix again.'):'Spawn practice enemies or engage one first.';
 }
 return {clear,run(action){
  if(action==='spawn')return spawn(0);
  if(action==='spawn-typed')return spawn(undefined);
  if(action==='spawn-aggressive')return spawn(999);
  if(action==='spawn-hunters')return spawn(999,true);
  if(action==='spawn-golem')return spawn(undefined,false,['golem']);
  if(action==='threat'){const c=api.combat.state;return `Your Threat ${c.threat}. `+(c.enemies.filter(e=>!e.opened).map(e=>`${ENEMIES[e.kind].name}: ${e.aggressive?'aggressive':'passive'} (below ${e.aggressiveUntil})${e.plan?`, next ${e.plan}`:''}${e.forced?`, forced ${e.forced}`:''}`).join('; ')||'No enemies here.');}
  if(action.startsWith('force:'))return force(action.slice(6));
  if(action.startsWith('spawn-kind:')){const kind=action.slice(11);return spawn(undefined,false,[kind]).replace(' combat practice enemies',` ${ENEMIES[kind].name}`);}
  if(action==='sheets')return Object.keys(ENEMIES).filter(k=>!ENEMIES[k].inert).map(enemySheetSummary).join(' ')+' All values are live: enemy attacks resolve miss → your dodge → your block → damage → your resistance.';
  if(action==='remove'){clear();return 'Removed combat practice enemies.';}
  if(action==='reset'){api.stop();api.combat.reset();return 'Reset enemy health, positions, and combat.';}
  if(action==='defeat'){api.combat.lose();return 'Playing the real defeat and safe respawn flow.';}
  const actor=actors.find(a=>a.kind===action&&api.world.get(`${a.home.x},${a.home.z}`)===a.home&&!a.opened);
  if(actor){api.approach(actor);return 'Approaching '+actor.rules.name+'.';}
  return 'Spawn or reset the practice enemies first.';
 }};
}
