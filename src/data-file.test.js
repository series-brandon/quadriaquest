import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatData} from './data-file.js';
import {treesData} from './lumberjack.js';
import {resourcesData} from './resource-rules.js';
import {enemiesData} from './combat-rules.js';
import {itemsData} from './items.js';

// The shared type tables come from src/data (docs/DESIGN.md, Resource and enemy configuration); the type tools
// saves them back with formatData, so an untouched table must write exactly the file it came from.
for(const [file,live] of [['trees',treesData],['resources',resourcesData],['enemies',enemiesData],['items',itemsData]])
 test(`src/data/${file}.json round-trips through the live table unchanged`,()=>{
  const text=readFileSync(new URL(`./data/${file}.json`,import.meta.url),'utf8');
  assert.equal(formatData(live())+'\n',text);
 });
test('every tree tier and resource type sets its shared respawn and drop table as data',async()=>{
 const {TREES}=await import('./lumberjack.js'),{RESOURCE_RULES}=await import('./resource-rules.js'),{ENEMIES}=await import('./combat-rules.js');
 for(const [id,t] of Object.entries(TREES)){assert.ok(t.respawn>0,id);assert.ok(t.drops.always[0].item,id);assert.equal(typeof t.effort,'number',id);}
 for(const [kind,r] of Object.entries(RESOURCE_RULES))if(kind!=='tree'){assert.ok(r.respawn>0,kind);assert.ok(r.drops.always[0].item,kind);}
 for(const [kind,e] of Object.entries(ENEMIES)){assert.ok(e.respawn>0,kind);assert.equal(e.drops?.gold,undefined,'gold is an item in the table');}
});
test('equipment and foods are the items data, in the field names their code reads',async()=>{
 const {ITEMS}=await import('./items.js'),{GEAR,refreshGear}=await import('./equipment.js'),{FOODS}=await import('./player-health.js');
 const SLOTS=['hand','head','chest','hands','legs','feet','back','ward'];
 for(const [id,item] of Object.entries(ITEMS)){
  if(item.equipment){assert.ok(SLOTS.includes(item.equipment.slot),id);assert.equal(GEAR[id].name,item.name,id);}else assert.equal(GEAR[id],undefined,id);
  if(item.consume)assert.ok(FOODS[id],id);else assert.equal(FOODS[id],undefined,id);
 }
 assert.equal(GEAR.bows.twoHanded,true);assert.equal(GEAR.bows.baseInterval,2.55);assert.deepEqual(GEAR.staffs.magic,{power:6,accuracy:6});
 const row=GEAR.swords,before=ITEMS.swords.equipment.power;
 try{ITEMS.swords.equipment.power=99;refreshGear('swords');assert.equal(GEAR.swords,row,'updated in place');assert.equal(row.power,99);}
 finally{ITEMS.swords.equipment.power=before;refreshGear('swords');}
});
test('enemy types are data: the sheet derives health, each style\'s damage and interval, and Threat; overrides and code behaviour win',async()=>{
 const {ENEMIES,enemyData,refreshEnemy,deriveEnemy}=await import('./combat-rules.js');
 const {sheet,overrides,...config}=enemyData('bruiser'),derived=deriveEnemy(sheet,config);
 assert.equal(ENEMIES.bruiser.health,derived.health);
 for(const key of ['min','max','interval'])assert.equal(ENEMIES.bruiser[key],derived.profiles.melee[key],key);
 assert.equal(ENEMIES.golem.health,enemyData('golem').overrides.health,'an override replaces the derived value');
 assert.equal(ENEMIES.golem.moves.find(m=>m.id==='groundSlam').max,enemyData('golem').overrides.attacks.melee.max,'a style override reaches its special attacks');
 assert.deepEqual(ENEMIES.golem.moves.map(m=>m.id),['rockThrow','groundSlam'],'special attacks are listed by id; what they do stays in code');
 assert.ok(ENEMIES.target.inert,'inertness stays in code');
 const row=ENEMIES.scrapper,data=enemyData('scrapper'),before=data.sheet.attributes.constitution;
 try{data.sheet.attributes.constitution=before+10;refreshEnemy('scrapper');assert.equal(ENEMIES.scrapper,row,'updated in place');assert.ok(row.health>50,"more Constitution, more health");}
 finally{data.sheet.attributes.constitution=before;refreshEnemy('scrapper');}
 assert.equal(ENEMIES.scrapper.health,50);
});
