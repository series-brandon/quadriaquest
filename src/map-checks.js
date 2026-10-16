import {key,edgeBetween,edgePasses} from './world.js';
import {planBuilding} from './building-kit.js';
import {propFootprint,PROPS} from './props.js';
import {stairProblems,DIRS} from './map-terrain.js';
import {interiorProblems} from './spaces.js';
import {townsfolkProblems} from './townsfolk.js';
import {CHUNK,REGION,withinChunk} from './world-grid.js';
import {mapCrystals,crystalCells} from './map-file.js';
import {RAMP_UP} from './chunk-terrain.js';

// Map checks (docs/CITY.md, Authoring: live checks; city Phase 6). The editor lists these; tests run
// them over every city in the repo. Each problem: {kind, severity: 'error'|'warning', tile:[x, z],
// text}. Inputs: the map data and its built map (world-map.js buildMap), so checks see exactly what
// the game sees.
const NEIGHBOURS=Object.values(DIRS);
// A tile's four neighbours (DIRS order: n, e, s, w; missing ones undefined), from a grid index built in one
// pass per check run: the checks walk a lazy world map's ~100k tiles in several passes, and building
// "x,z" string keys for every neighbour dominated their cost.
export function neighbourIndex(map){
 let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;
 for(const t of map.values()){if(t.x<x0)x0=t.x;if(t.x>x1)x1=t.x;if(t.z<z0)z0=t.z;if(t.z>z1)z1=t.z;}
 // Filled densely: a large pre-sized `new Array(n)` is stored as a slow dictionary.
 const W=x1-x0+1,D=z1-z0+1,grid=[];for(let i=0;i<W*D;i++)grid.push(undefined);
 for(const t of map.values())grid[(t.z-z0)*W+(t.x-x0)]=t;
 const at=(x,z)=>x<x0||x>x1||z<z0||z>z1?undefined:grid[(z-z0)*W+(x-x0)];
 return t=>NEIGHBOURS.map(([dx,dz])=>at(t.x+dx,t.z+dz));
}
// Walking with every unlocked door counted as open (a closed door is only a click away).
export function walkable(from,to){
 if(!to||to.blocked||to.water||Math.abs(to.h-from.h)>.5)return false;
 const edge=edgeBetween(from,to);return !edge||edgePasses(edge,'move')||edge.kind==='door'&&!edge.locked;
}
export function reachableFrom(map,start,near=neighbourIndex(map)){
 const seen=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++){const t=queue[i];for(const n of near(t))if(n&&!seen.has(n)&&walkable(t,n)){seen.add(n);queue.push(n);}}
 return seen;
}
// Whether two tiles share a walkable area. Areas are labelled lazily, one flood fill each, so many
// questions (every townsperson against every spot) cost about one pass over the map.
export function connectedAreas(near){
 const label=new Map();let next=0;
 const of=t=>{if(!label.has(t)){const id=next++;label.set(t,id);const queue=[t];
  for(let i=0;i<queue.length;i++)for(const n of near(queue[i]))if(n&&!label.has(n)&&walkable(queue[i],n)){label.set(n,id);queue.push(n);}}
  return label.get(t);};
 return (a,b)=>of(a)===of(b);
}
// Reachable if water could be crossed (a bridge or a boat, one day): into water from anywhere, and out of it onto
// open ground no more than half a block above the water's banks (land beside water is a beach, at ground level).
export function reachableAcrossWater(map,start,near=neighbourIndex(map)){
 const seen=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++){const t=queue[i];for(const n of near(t)){if(!n||seen.has(n))continue;
  if(walkable(t,n)||n.water||t.water&&!n.blocked&&n.h<=1.5){seen.add(n);queue.push(n);}}}
 return seen;
}
function footprintTiles(entry,kind){
 if(kind==='building'){const plan=planBuilding(entry.desc,[entry.x,entry.z]);return plan.tiles;}
 const [w,d]=propFootprint(entry.kind,entry.rotation||0),out=[];for(let z=0;z<d;z++)for(let x=0;x<w;x++)out.push([entry.x+x,entry.z+z]);return out;
}
export function mapProblems(data,built){
 const problems=[],add=(kind,severity,tile,text)=>problems.push({kind,severity,tile,text});
 // A lazy map (world-map.js): only the chunks made so far (the area round the view).
 const map=built.loadedTiles||built.tiles,spawn=built.spawn,near=neighbourIndex(map),connected=connectedAreas(near);
 if(!spawn||spawn.blocked)add('spawn','error',data.spawn,'The arrival tile is missing or blocked.');
 const reach=spawn?reachableFrom(map,spawn,near):new Set();
 // A world map (on the land) is whole regions (docs/TOWN.md, Whole regions).
 if(data.land&&data.size.some(n=>n%REGION))add('regions','warning',[0,0],`The map is ${data.size.join(' × ')}, not whole ${REGION}-tile regions: Round up to whole regions (Map) pads it.`);
 // Footprints: buildings, props and stairs must not overlap; nothing stands on a doorstep.
 const owners=new Map(),claim=(xz,what)=>{const k=xz.join(',');if(owners.has(k))add('overlap','error',xz,`${what} overlaps ${owners.get(k)}.`);else owners.set(k,what);};
 data.buildings.forEach((b,i)=>{try{for(const xz of footprintTiles(b,'building'))claim(xz,`building ${b.desc.name||i}`);}catch(error){add('building','error',[b.x,b.z],error.message);}});
 data.props.forEach(p=>{if(!PROPS[p.kind]){add('prop','error',[p.x,p.z],`Unknown prop "${p.kind}".`);return;}for(const xz of footprintTiles(p,'prop'))claim(xz,PROPS[p.kind].name.toLowerCase());});
 // Iter Crystals (docs/TOWN.md, Iter Crystals): each has an id and a name (the teleport list shows it), no two
 // share an id, and each stands on 2 × 2 open, dry, level tiles.
 const crystalIds=new Set();
 for(const c of mapCrystals(data)){const at=[c.x,c.z],label=c.name||c.id||'An Iter Crystal';
  if(!c.id)add('crystal','error',at,`${label} has no id.`);else if(crystalIds.has(c.id))add('crystal','error',at,`Two Iter Crystals share the id "${c.id}".`);else crystalIds.add(c.id);
  if(!c.name)add('crystal','warning',at,`The Iter Crystal "${c.id}" has no name for the teleport list.`);
  const tiles=crystalCells(c).map(([x,z])=>map.get(key(x,z)));
  if(tiles.every(Boolean)&&(tiles.some(t=>t.water)||tiles.some(t=>Math.abs(t.h-tiles[0].h)>.01)))add('crystal','error',at,`${label} needs 2 × 2 dry, level ground.`);
  for(const xz of crystalCells(c))claim(xz,`the Iter Crystal ${label}`);}
 for(const t of map.values())if(t.stair)claim([t.x,t.z],'stairs');
 // Doors: a doorstep you can stand on, reachable from the arrival point; the door rule.
 const doorsteps=new Set();
 for(const b of built.buildings.filter(Boolean))for(const d of b.anchors.doors){const step=d.doorstep;if(!step){add('door','error',[b.plan.x0,b.plan.z0],`${b.plan.desc.name||'A building'}'s door opens off the map.`);continue;}
  doorsteps.add(step);if(step.blocked)add('door','error',[step.x,step.z],`Something stands on ${b.plan.desc.name||'a building'}'s doorstep.`);
  else if(!reach.has(step))add('door','error',[step.x,step.z],`${b.plan.desc.name||'A building'}'s doorstep can't be reached from the arrival point.`);}
 for(const r of built.edges.doorProblems())add('door rule','error',[r.door.a.x,r.door.a.z],r.problems.join('; '));
 // Terrain: stairs need their landing; walkable ground that can't be reached (a terrace with no stairs).
 for(const p of stairProblems(map))add('stairs','error',[p.tile.x,p.tile.z],p.problem);
 // Ramps (docs/TOWN.md, Ramps): each slopes down half a block to the tiles below its uphill edge; one whose ground
 // has since changed under it no longer meets them.
 for(const t of map.values()){if(!t.ramp)continue;const [ux,uz]=RAMP_UP[t.ramp.dir],below=map.get(key(t.x-ux,t.z-uz));
  if(below&&!below.water&&Math.abs(below.h-(t.h-.5))>.01&&!below.ramp)add('ramp','warning',[t.x,t.z],'A ramp with no ledge half a block below it: it doesn\u2019t meet the ground.');}
 // Land only the water cuts off (across a river or the sea) is a note: it needs a bridge or a boat, not stairs.
 const open=[...map.values()].filter(t=>!t.blocked&&!t.water&&!t.indoor&&!reach.has(t)),across=open.length&&spawn?reachableAcrossWater(map,spawn,near):new Set();
 // A lazy map's groups that run into chunks not made yet may well be reached through them: no verdict yet.
 const [W,D]=data.size,unknown=group=>group.some(t=>near(t).some((n,i)=>{if(n)return false;const x=t.x+NEIGHBOURS[i][0],z=t.z+NEIGHBOURS[i][1];return x>=0&&z>=0&&x<W&&z<D;}));
 for(const group of components(open.filter(t=>!across.has(t)),near))if(!unknown(group))add('unreachable','warning',[group[0].x,group[0].z],`${group.length} tile${group.length>1?'s':''} of open ground can't be reached (a full-block drop needs stairs).`);
 for(const group of components(open.filter(t=>across.has(t)),near))if(!unknown(group))add('across water','info',[group[0].x,group[0].z],`${group.length} tile${group.length>1?'s':''} of land across the water: no bridge or boat reaches ${group.length>1?'them':'it'} yet.`);
 // Streets: no one-tile slots and no passages under two tiles wide (stairs may be one wide).
 for(const t of map.values()){if(t.blocked||t.water||t.indoor||t.stair||!reach.has(t)||doorsteps.has(t))continue;
  // DIRS order: n, e, s, w (opposites: 0–2, 1–3).
  const open=near(t).map(n=>!!n&&walkable(t,n));
  const count=open.filter(Boolean).length;
  if(count===1)add('dead end','warning',[t.x,t.z],'A one-tile slot that leads nowhere.');
  else if(count===2&&(open[0]&&open[2]||open[1]&&open[3]))add('narrow','warning',[t.x,t.z],'A passage one tile wide (streets and alleys are at least two).');}
 // Furniture (furnish.js): a bed, stove, forge, anvil or counter nobody can reach is wasted; so is a
 // shop whose keeper can't reach the counter.
 for(const b of built.buildings.filter(Boolean)){const door=b.anchors.doors[0]?.inside;if(!door||!b.furniture?.length)continue;const inside={has:t=>!!t&&connected(door,t)};
  for(const p of b.furniture){const useful=p.spots.filter(sp=>['sleep','cook','work','vend','browse'].includes(sp.kind));if(useful.length&&!useful.some(sp=>inside.has(sp.tile)))add("furniture","warning",[p.tile.x,p.tile.z],`${b.plan.desc.name||'A building'}: nobody can reach its ${p.def.name.toLowerCase()}.`);}
  if(b.anchors.keeper&&!inside.has(b.anchors.keeper))add('furniture','warning',[b.anchors.keeper.x,b.anchors.keeper.z],`${b.plan.desc.name||'A shop'}: the keeper can't get behind the counter.`);}
 // Separate interiors and dungeons (spaces.js).
 problems.push(...interiorProblems(data));
 // Townsfolk: homes and routines (townsfolk.js).
 problems.push(...townsfolkProblems(data,built,{reach,connected}));
 for(const p of built.props)for(const s of p.spots)if(s.tile&&(s.tile.blocked||!reach.has(s.tile)))add('spot','warning',[s.tile.x,s.tile.z],`${p.def.name}'s ${s.kind} spot can't be used.`);
 // The grid (docs/WORLD.md, Design constraints): a building stays inside one chunk, so it streams, draws
 // and is stored whole with it. Region lines are chunk lines, so this keeps it inside one region too.
 for(const b of built.buildings.filter(Boolean)){const {x0,z0,x1,z1}=b.plan;if(!withinChunk(x0,z0,x1,z1))add('chunks','error',[x0,z0],`${b.plan.desc.name||'A building'} crosses a chunk line (buildings must fit inside one ${CHUNK} × ${CHUNK} chunk).`);}
 return problems;
}
// Connected groups of tiles (4-neighbour, same walk rule).
function components(tiles,near){
 const left=new Set(tiles),out=[];
 for(const start of tiles){if(!left.has(start))continue;left.delete(start);const group=[start];
  for(let i=0;i<group.length;i++){const t=group[i];for(const n of near(t))if(n&&left.has(n)&&walkable(t,n)){left.delete(n);group.push(n);}}
  out.push(group);}
 return out;
}
