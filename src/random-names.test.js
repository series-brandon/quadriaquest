import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYER_NAMES,CORGI_NAMES,randomName} from './random-names.js';
test('all supplied names are normalized and rolls avoid the current name',()=>{assert.equal(PLAYER_NAMES.length,58);assert.equal(new Set(PLAYER_NAMES).size,58);for(const n of PLAYER_NAMES){assert.equal(n,n.split(' ').map(word=>word[0].toUpperCase()+word.slice(1).toLowerCase()).join(' '));assert.notEqual(randomName(n,()=>0),n);}assert.ok(PLAYER_NAMES.includes('Sir Slimesalot'));assert.ok(PLAYER_NAMES.includes('Madam Slimesalot'));});

test('corgi rolls use their own complete pool and avoid repeats',()=>{assert.equal(CORGI_NAMES.length,33);assert.equal(new Set(CORGI_NAMES).size,33);for(const [i,name] of CORGI_NAMES.entries()){assert.equal(randomName('',()=>i/CORGI_NAMES.length,CORGI_NAMES),name);assert.notEqual(randomName(name,()=>0,CORGI_NAMES),name);}assert.ok(CORGI_NAMES.includes('Overbaked Potato'));assert.ok(!PLAYER_NAMES.includes('Overbaked Potato'));assert.ok(!CORGI_NAMES.includes('Sir Slimesalot'));});
