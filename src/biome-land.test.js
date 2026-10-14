import test from 'node:test';
import assert from 'node:assert/strict';
import {createBiomeLand,CELL} from './biome-land.js';
import {BIOME_RULES,BIOME_IDS,BIOME_DEFAULTS,biomeRule} from './biome-rules.js';
import {TERRAIN_RULES,TERRAIN_DEFAULTS,terrainRule} from './terrain-rules.js';
import {TREE_SPECIES} from './tree-models.js';
import {COVER_KINDS} from './ground-cover.js';
import {RESOURCE_RULES} from './resource-actions.js';
import {ENEMIES} from './combat-rules.js';
import {AMBIENCE_PROFILES} from './ambience.js';
import {hash} from './noise.js';

const grid=(land,size)=>{const out=[];for(let z=0;z<size;z++)for(let x=0;x<size;x++)out.push(land.tile(x,z));return out;};
const only=(id,seed=1,size=128)=>createBiomeLand({seed,bounds:[0,0,size,size],map:{default:id}});
// Full-block steps between neighbouring land tiles (the no-cliff biomes must have none).
const steps=(land,size)=>{let n=0;for(const t of grid(land,size)){if(t.water)continue;for(const [dx,dz] of [[1,0],[0,1]]){const o=land.tile(t.x+dx,t.z+dz);if(o&&!o.water&&Math.abs(o.h-t.h)>.5)n++;}}return n;};

test('every rule names things that exist: trees, cover, resources, enemies, ambience',()=>{
 for(const id of BIOME_IDS){const b=biomeRule(id);
  for(const s of Object.keys(b.trees.species))assert.ok(TREE_SPECIES[s],`${id}: tree ${s}`);
  for(const o of [b.trees.byWater,b.trees.onHigh].filter(Boolean))assert.ok(TREE_SPECIES[o.species],`${id}: tree ${o.species}`);
  for(const c of b.cover)assert.ok(COVER_KINDS.includes(c.kind),`${id}: cover ${c.kind}`);
  for(const r of b.resources)assert.ok(RESOURCE_RULES[r.kind],`${id}: resource ${r.kind}`);
  for(const e of b.enemies.table)assert.ok(ENEMIES[e.enemy],`${id}: enemy ${e.enemy}`);
  assert.ok(AMBIENCE_PROFILES[b.audio.ambience],`${id}: ambience ${b.audio.ambience}`);
  assert.equal(b.ground.palette.length,2);}
 assert.equal(biomeRule('coast').trees.clusterScale,BIOME_DEFAULTS.trees.clusterScale,'defaults fill what a biome leaves out (one level deep)');
 for(const id of BIOME_IDS)assert.ok(TERRAIN_RULES[biomeRule(id).terrain],`${id}: its usual terrain exists`);
 assert.equal(terrainRule('sea').relief,TERRAIN_DEFAULTS.relief,'terrain defaults fill what a terrain leaves out');assert.equal(terrainRule('hills').water.ponds,0);
});
test('the same seed and map always give the same land, and ids are stable',()=>{
 const a=only('forest',3,64),b=only('forest',3,64),ta=grid(a,64),tb=grid(b,64);
 assert.deepEqual(ta.map(t=>t.h),tb.map(t=>t.h));assert.deepEqual(a.entities(ta).map(e=>e.id),b.entities(tb).map(e=>e.id));
 assert.notDeepEqual(ta.map(t=>t.h),grid(only('forest',4,64),64).map(t=>t.h),'another seed, other land');
});
test('verticality follows the biome: flat meadows, coasts and wetlands; rising hills with rock on top; never a cliff',()=>{
 const top=(id,seed)=>Math.max(...grid(only(id,seed),128).filter(t=>!t.water).map(t=>t.h));
 for(const seed of [1,7]){
  assert.ok(top('meadow',seed)<=2,'meadow');assert.ok(top('coast',seed)<=1.5,'coast');assert.ok(top('wetland',seed)<=1.5,'wetland');
  for(const id of BIOME_IDS)if(!terrainRule(biomeRule(id).terrain).cliffs)assert.equal(steps(only(id,seed),128),0,`${id}: no full-block steps`);}
 assert.ok(Math.max(top('hills',1),top('hills',7))>=5,'hills climb');
 assert.ok(grid(only('hills',7),128).some(t=>t.rocky&&t.surface==='stone'),'stone on the hilltops');
});
test('a patchwork of biomes blends at its borders: no cliffs where they meet, and borders wander',()=>{
 for(const seed of [2,5]){
  const cells={};for(let cz=0;cz<20;cz++)for(let cx=0;cx<20;cx++)cells[`${cx},${cz}`]=BIOME_IDS.filter(id=>id!=='sea')[Math.floor(hash(cx>>1,cz>>1,seed)*6)];
  assert.equal(steps(createBiomeLand({seed,bounds:[0,0,160,160],map:{cells}}),160),0);}
 // A straight painted line between meadow and hills: the shown border moves about it.
 const cells={};for(let cz=0;cz<10;cz++)for(let cx=0;cx<10;cx++)cells[`${cx},${cz}`]=cx<5?'meadow':'hills';
 const land=createBiomeLand({seed:1,bounds:[0,0,80,80],map:{cells}}),line=5*CELL;
 const crossings=new Set();for(let z=0;z<80;z++){let x=line-8;while(x<line+8&&land.biomeAt(x,z)==='meadow')x++;crossings.add(x);}
 assert.ok(crossings.size>=4,`the border wanders (${crossings.size} positions)`);
});
test('water: the sea, ponds and marsh pools, always reachable from land half a block up',()=>{
 const cells={},terrain={};for(let cz=0;cz<12;cz++)for(let cx=0;cx<12;cx++){cells[`${cx},${cz}`]=cz>=9?'coast':cz>=7?'wetland':'hills';if(cz>=9)terrain[`${cx},${cz}`]='sea';}
 const land=createBiomeLand({seed:4,bounds:[0,0,96,96],map:{cells,terrain}}),tiles=grid(land,96);
 assert.ok(tiles.some(t=>t.waterKind==='sea')&&tiles.some(t=>t.waterKind==='marsh'));
 for(const t of tiles){if(t.water)continue;const wet=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>land.tile(t.x+dx,t.z+dz)?.water);if(wet)assert.equal(t.h,1,`shore at ${t.x},${t.z}`);}
});
test('foliage and resources follow the biome: woods are dense, coasts bare, pines are pines, hills have ore',()=>{
 const count=(id,seed=1)=>{const land=only(id,seed,128),tiles=grid(land,128).filter(t=>!t.water),e=land.entities(tiles);
  const trees=e.filter(x=>x.kind==='tree');return {land:tiles.length,trees:trees.length,species:trees.map(x=>x.species),kinds:new Set(e.map(x=>x.kind))};};
 const forest=count('forest'),meadow=count('meadow'),coast=count('coast'),pines=count('pines'),hills=count('hills',7),wet=count('wetland');
 assert.ok(forest.trees/forest.land>4*meadow.trees/meadow.land,'woods are much denser than meadows');
 assert.equal(coast.trees,0,'no trees on the coast');
 assert.ok(pines.species.filter(s=>s==='pine').length>pines.species.length*.7,'pine forest is mostly pines');
 assert.ok(wet.species.every(s=>s==='willow'||s==='birch'));
 assert.ok(hills.kinds.has('copper')&&hills.kinds.has('boulder'),'ore and boulders in the hills');
 assert.ok(!meadow.kinds.has('copper'),'no ore in the meadow');
});
test('extras and cover: fishing spots on water by land, enemies from the biome table, cover kinds from the rules',()=>{
 const land=only('forest',2,160),tiles=grid(land,160),extras=land.extras(tiles);
 assert.ok(extras.some(e=>e.kind==='enemy'&&['scrapper','bruiser'].includes(e.enemy)),'goblins in the woods');
 assert.ok(extras.filter(e=>e.kind==='fishing').every(e=>land.tile(e.x,e.z).water));
 const kinds=new Set(land.cover(tiles).map(c=>c.kind));for(const k of kinds)assert.ok(biomeRule('forest').cover.some(c=>c.kind===k)||k==='lilyPad',k);
 assert.equal(only('coast',2,96).extras(grid(only('coast',2,96),96)).filter(e=>e.kind==='enemy').length,0,'no enemies on the coast');
});
test('rivers are water, and the land paints by the map it is given',()=>{
 const cells={},terrain={};for(let cz=0;cz<10;cz++)terrain[`5,${cz}`]='river';for(const a of [-1,0,1])for(const b of [-1,0,1])cells[`${1+a},${8+b}`]='coast';
 const land=createBiomeLand({seed:2,bounds:[0,0,80,80],map:{default:'hills',cells,terrain}});
 assert.equal(land.tile(44,40).waterKind,'river');
 assert.equal(land.biomeAt(12,68),'coast');assert.equal(land.biomeAt(70,10),'hills','unpainted: the default');
 assert.equal(steps(land,80),0);
});
test('repainting: the land forgets an area and generates it again from the new paint; it can read new paint objects',()=>{
 const cells={};const land=createBiomeLand({seed:3,bounds:[0,0,96,96],map:{default:'meadow',cells}});
 const terrain={},land2=createBiomeLand({seed:3,bounds:[0,0,96,96],map:{default:'meadow',cells,terrain}});
 const before=land2.tile(40,40);terrain['5,5']='sea';assert.equal(land2.tile(40,40),before,'cached until forgotten');
 land2.forget(0,0,95,95);assert.equal(land2.tile(43,43).waterKind,'sea','painted sea');
 land2.useCells({},{});land2.forget(0,0,95,95);assert.ok(!land2.tile(43,43).water,'new paint read');
});
test('terrain and biome are painted apart: any biome on any terrain; plains have no ponds, lakeland many',()=>{
 const on=(biome,terrain,seed=1,size=128)=>{const terrainCells={};for(let cz=-3;cz<size/8+3;cz++)for(let cx=-3;cx<size/8+3;cx++)terrainCells[`${cx},${cz}`]=terrain;
  return createBiomeLand({seed,bounds:[0,0,size,size],map:{default:biome,terrain:terrainCells}});};
 const top=land=>Math.max(...grid(land,128).filter(t=>!t.water).map(t=>t.h)),ponds=land=>grid(land,128).filter(t=>t.waterKind==='pond').length;
 assert.ok(Math.max(top(on('meadow','hills',1)),top(on('meadow','hills',7)))>=5,'a meadow in the hills climbs');
 assert.ok(top(on('pines','plains'))<=1.5,'a pine forest on the plains stays flat');
 assert.ok(grid(on('pines','plains'),128).filter(t=>!t.water).every(t=>t.biome==='pines'&&t.terrain==='plains'));
 for(const seed of [1,2,3])assert.equal(ponds(on('meadow','plains',seed)),0,'plains: no ponds');
 let rolling=0,lakes=0;for(const seed of [1,2,3]){rolling+=ponds(on('meadow','rolling',seed));lakes+=ponds(on('meadow','lakeland',seed));}
 assert.ok(lakes>rolling*3,`lakeland has many more ponds (${lakes} vs ${rolling})`);
 assert.equal(on('forest','sea').tile(40,40).waterKind,'sea','any biome over the sea is sea');
 assert.equal(createBiomeLand({seed:1,bounds:[0,0,64,64],map:{default:'wetland'}}).terrainAt(30,30),'marsh','unpainted: the biome’s usual terrain');
});
