import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatData} from './data-file.js';
import {treesData} from './lumberjack.js';
import {resourcesData} from './resource-rules.js';
import {enemiesData} from './combat-rules.js';

// The shared type tables come from src/data (docs/DESIGN.md, Resource and enemy configuration); the Types screen
// saves them back with formatData, so an untouched table must write exactly the file it came from.
for(const [file,live] of [['trees',treesData],['resources',resourcesData],['enemies',enemiesData]])
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
