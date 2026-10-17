import test from 'node:test';
import assert from 'node:assert/strict';
import {critter,animateCritter,CRITTERS,arthropod,animateArthropod,ARTHROPODS} from './creature-models.js';
import {ENEMIES} from './combat-rules.js';
import {BIOME_RULES} from './biome-rules.js';
import {findPart} from './named-parts.js';

test('wild creatures share geometry and materials across every one of a kind, and their rigs answer the shared attack clock',()=>{
 for(const [make,animate,kinds,rig] of [[critter,animateCritter,CRITTERS,'critter-rig'],[arthropod,animateArthropod,ARTHROPODS,'arthropod-rig']])
  for(const kind of Object.keys(kinds)){
   const a=make(kind),b=make(kind),meshes=g=>{const out=[];g.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
   assert.ok(meshes(a).every((m,i)=>m.geometry===meshes(b)[i].geometry&&m.geometry.userData.shared&&m.material.userData.shared),`${kind} builds nothing new per spawn`);
   animate(a,1,{attack:0});const rest=findPart(a,rig).position.z;animate(a,1,{attack:1});
   assert.ok(findPart(a,rig).position.z>rest,`${kind} lunges forward on impact`);
  }
});
test('every biome spawns real enemy types, and special attacks stay with bosses',()=>{
 for(const [id,rule] of Object.entries(BIOME_RULES))for(const e of rule.enemies?.table||[])assert.ok(ENEMIES[e.enemy],`${id}: ${e.enemy}`);
 for(const [kind,e] of Object.entries(ENEMIES))if(e.moves.some(m=>m.special))assert.ok(e.boss,`${kind} has special attacks but is not a boss`);
 // The new creatures: Gold Pieces only, until crafting needs their materials.
 for(const kind of [...Object.keys(CRITTERS),...Object.keys(ARTHROPODS)])assert.deepEqual(ENEMIES[kind].drops.always.map(d=>d.item),['gold'],kind);
});
