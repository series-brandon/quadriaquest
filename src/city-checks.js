import {key,edgeBetween,edgePasses} from './world.js';
import {planBuilding} from './building-kit.js';
import {propFootprint,PROPS} from './props.js';
import {stairProblems,DIRS} from './city-terrain.js';
import {interiorProblems} from './spaces.js';
import {townsfolkProblems} from './townsfolk.js';
import {CHUNK,withinChunk} from './world-grid.js';

// City checks (docs/CITY.md, Authoring: live checks; city Phase 6). The editor lists these; tests run
// them over every city in the repo. Each problem: {kind, severity: 'error'|'warning', tile:[x, z],
// text}. Inputs: the city data and its built city (city-map.js buildCity), so checks see exactly what
// the game sees.
const NEIGHBOURS=Object.values(DIRS);
// Walking with every unlocked door counted as open (a closed door is only a click away).
export function walkable(from,to){
 if(!to||to.blocked||to.water||Math.abs(to.h-from.h)>.5)return false;
 const edge=edgeBetween(from,to);return !edge||edgePasses(edge,'move')||edge.kind==='door'&&!edge.locked;
}
export function reachableFrom(map,start){
 const seen=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++){const t=queue[i];for(const [dx,dz] of NEIGHBOURS){const n=map.get(key(t.x+dx,t.z+dz));if(n&&!seen.has(n)&&walkable(t,n)){seen.add(n);queue.push(n);}}}
 return seen;
}
function footprintTiles(entry,kind){
 if(kind==='building'){const plan=planBuilding(entry.desc,[entry.x,entry.z]);return plan.tiles;}
 const [w,d]=propFootprint(entry.kind,entry.rotation||0),out=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)out.push([entry.x+x,entry.z+z]);return out;
}
export function cityProblems(data,built){
 const problems=[],add=(kind,severity,tile,text)=>problems.push({kind,severity,tile,text});
 const map=built.tiles,spawn=built.spawn;
 if(!spawn||spawn.blocked)add('spawn','error',data.spawn,'The arrival tile is missing or blocked.');
 const reach=spawn?reachableFrom(map,spawn):new Set();
 // Footprints: buildings, props and stairs must not overlap; nothing stands on a doorstep.
 const owners=new Map(),claim=(xz,what)=>{const k=xz.join(',');if(owners.has(k))add('overlap','error',xz,`${what} overlaps ${owners.get(k)}.`);else owners.set(k,what);};
 data.buildings.forEach((b,i)=>{try{for(const xz of footprintTiles(b,'building'))claim(xz,`building ${b.desc.name||i}`);}catch(error){add('building','error',[b.x,b.z],error.message);}});
 data.props.forEach(p=>{if(!PROPS[p.kind]){add('prop','error',[p.x,p.z],`Unknown prop "${p.kind}".`);return;}for(const xz of footprintTiles(p,'prop'))claim(xz,PROPS[p.kind].name.toLowerCase());});
 for(const t of map.values())if(t.stair)claim([t.x,t.z],'stairs');
 // Doors: a doorstep you can stand on, reachable from the arrival point; the door rule.
 const doorsteps=new Set();
 for(const b of built.buildings)for(const d of b.anchors.doors){const step=d.doorstep;if(!step){add('door','error',[b.plan.x0,b.plan.z0],`${b.plan.desc.name||'A building'}'s door opens off the map.`);continue;}
  doorsteps.add(step);if(step.blocked)add('door','error',[step.x,step.z],`Something stands on ${b.plan.desc.name||'a building'}'s doorstep.`);
  else if(!reach.has(step))add('door','error',[step.x,step.z],`${b.plan.desc.name||'A building'}'s doorstep can't be reached from the arrival point.`);}
 for(const r of built.edges.doorProblems())add('door rule','error',[r.door.a.x,r.door.a.z],r.problems.join('; '));
 // Terrain: stairs need their landing; walkable ground that can't be reached (a terrace with no stairs).
 for(const p of stairProblems(map))add('stairs','error',[p.tile.x,p.tile.z],p.problem);
 const stranded=[...map.values()].filter(t=>!t.blocked&&!t.water&&!t.indoor&&!reach.has(t));
 for(const group of components(stranded,map))add('unreachable','warning',[group[0].x,group[0].z],`${group.length} tile${group.length>1?'s':''} of open ground can't be reached (a full-block drop needs stairs).`);
 // Streets: no one-tile slots and no passages under two tiles wide (stairs may be one wide).
 for(const t of map.values()){if(t.blocked||t.water||t.indoor||t.stair||!reach.has(t)||doorsteps.has(t))continue;
  // DIRS order: n, e, s, w (opposites: 0–2, 1–3).
  const open=NEIGHBOURS.map(([dx,dz])=>{const n=map.get(key(t.x+dx,t.z+dz));return !!n&&walkable(t,n);});
  const count=open.filter(Boolean).length;
  if(count===1)add('dead end','warning',[t.x,t.z],'A one-tile slot that leads nowhere.');
  else if(count===2&&(open[0]&&open[2]||open[1]&&open[3]))add('narrow','warning',[t.x,t.z],'A passage one tile wide (streets and alleys are at least two).');}
 // Furniture (furnish.js): a bed, stove, forge, anvil or counter nobody can reach is wasted; so is a
 // shop whose keeper can't reach the counter.
 for(const b of built.buildings){const door=b.anchors.doors[0]?.inside;if(!door||!b.furniture?.length)continue;const inside=reachableFrom(map,door);
  for(const p of b.furniture){const useful=p.spots.filter(sp=>['sleep','cook','work','vend','browse'].includes(sp.kind));if(useful.length&&!useful.some(sp=>inside.has(sp.tile)))add("furniture","warning",[p.tile.x,p.tile.z],`${b.plan.desc.name||'A building'}: nobody can reach its ${p.def.name.toLowerCase()}.`);}
  if(b.anchors.keeper&&!inside.has(b.anchors.keeper))add('furniture','warning',[b.anchors.keeper.x,b.anchors.keeper.z],`${b.plan.desc.name||'A shop'}: the keeper can't get behind the counter.`);}
 // Separate interiors and dungeons (spaces.js).
 problems.push(...interiorProblems(data));
 // Townsfolk: homes and routines (townsfolk.js).
 problems.push(...townsfolkProblems(data,built));
 for(const p of built.props)for(const s of p.spots)if(s.tile&&(s.tile.blocked||!reach.has(s.tile)))add('spot','warning',[s.tile.x,s.tile.z],`${p.def.name}'s ${s.kind} spot can't be used.`);
 // The grid (docs/WORLD.md, Design constraints): a building stays inside one chunk, so it streams, draws
 // and is stored whole with it. Region lines are chunk lines, so this keeps it inside one region too.
 for(const b of built.buildings){const {x0,z0,x1,z1}=b.plan;if(!withinChunk(x0,z0,x1,z1))add('chunks','error',[x0,z0],`${b.plan.desc.name||'A building'} crosses a chunk line (buildings must fit inside one ${CHUNK} × ${CHUNK} chunk).`);}
 return problems;
}
// Connected groups of tiles (4-neighbour, same walk rule).
function components(tiles,map){
 const left=new Set(tiles),out=[];
 for(const start of tiles){if(!left.has(start))continue;left.delete(start);const group=[start];
  for(let i=0;i<group.length;i++){const t=group[i];for(const [dx,dz] of NEIGHBOURS){const n=map.get(key(t.x+dx,t.z+dz));if(n&&left.has(n)&&walkable(t,n)){left.delete(n);group.push(n);}}}
  out.push(group);}
 return out;
}
