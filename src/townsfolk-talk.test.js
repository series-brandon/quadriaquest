import test from 'node:test';
import assert from 'node:assert/strict';
import {reactiveRecord} from './reactive.js';
import {createWallet} from './economy.js';
import {createJobs} from './jobs.js';
import {seededRandom} from './drops.js';
import {ITEMS} from './items.js';
import {createTownsfolkTalk} from './townsfolk-talk.js';

// A stand-in dialogue box: records lines; `choose(text)` picks a choice, `next()` advances.
function box(){
 const log=[];let current=null;
 return {log,get line(){return current;},
  show(l){current=l;log.push(l.text);},hide(){current=null;},
  choose(text){const c=current.choices.find(([t])=>t===text);assert.ok(c,`choice “${text}” in ${current.choices.map(x=>x[0]).join(' | ')}`);c[1]();},
  next(){current.next();}};
}
function setup(){
 const inventory=reactiveRecord({gold:0,rawFish:9}),wallet=createWallet({inventory}),dialogue=box(),seen=[];
 const people={pim:{id:'pim',name:'Pim',giver:'post'},mira:{id:'mira',name:'Mira',house:{building:{shop:'fishmonger'}},shop:'fishmonger'},pearl:{id:'pearl',name:'Pearl'}};
 const jobs=createJobs({inventory,wallet,addresses:()=>[{id:'pearl',name:'Pearl',where:'house 3'}],value:id=>ITEMS[id].value,random:seededRandom(3),now:()=>0});
 const opened=[];
 const talk=createTownsfolkTalk({dialogue,jobs,shopFor:p=>p.house?.building.shop||null,openShop:p=>opened.push(p.id),received:(job,r,stage)=>seen.push(stage)});
 return {inventory,wallet,dialogue,jobs,talk,people,seen,opened};
}
test('a shopkeeper greets you, offers work in their own words, and opens the shop',()=>{
 const s=setup();s.talk.talk(s.people.mira,'Fresh fish!');
 assert.equal(s.dialogue.line.text,'What can I do for you?');
 assert.deepEqual(s.dialogue.line.choices.map(c=>c[0]),['Do you have any jobs for me?','I’d like to browse your wares.','Nothing, thanks.']);
 s.dialogue.choose('Do you have any jobs for me?');
 assert.match(s.dialogue.line.text,/^Well… I need \d+ /);s.dialogue.next();
 assert.match(s.dialogue.line.text,/I’ll pay you \d+ gold if you (catch|bring) me \d+ Raw Pondfish, what do you say\?/);
 s.dialogue.choose('I’ll do it!');assert.equal(s.jobs.active.length,1);assert.deepEqual(s.seen,['accepted']);
 // Talking again: about the job, or hand it in when it's ready.
 s.talk.talk(s.people.mira,'');const job=s.jobs.active[0];
 if(!job.ready){assert.ok(s.dialogue.line.choices.some(c=>c[0]==='About that job…'));s.jobs.forceReady(job.key);s.talk.talk(s.people.mira,'');}
 s.dialogue.choose(`I have your ${job.count} Raw Pondfish.`);assert.match(s.dialogue.line.text,/Here’s your \d+ gold/);assert.equal(s.wallet.gold,job.gold);
 s.talk.talk(s.people.mira,'');s.dialogue.choose('I’d like to browse your wares.');assert.deepEqual(s.opened,['mira']);
});
test('a delivery: Pim hands you a package, its recipient takes it, and Pim pays when you come back',()=>{
 const s=setup();s.talk.talk(s.people.pim,'');s.dialogue.choose('Do you have any jobs for me?');
 assert.match(s.dialogue.line.text,/It’s for Pearl at house 3\./);s.dialogue.next();s.dialogue.choose('I’ll do it!');
 assert.equal(s.inventory.package,1);
 s.talk.talk(s.people.pim,'');assert.ok(s.dialogue.line.choices.some(c=>c[0]==='About that job…'),'not delivered yet');
 s.talk.talk(s.people.pearl,'Hello!');s.dialogue.choose('I have a package for you.');assert.equal(s.inventory.package,0);assert.equal(s.wallet.gold,0);
 s.talk.talk(s.people.pim,'');s.dialogue.choose('I delivered the package.');assert.ok(s.wallet.gold>=12);assert.deepEqual(s.seen,['accepted','delivered','paid']);
 // Someone with nothing for you just says their line.
 s.talk.talk(s.people.pearl,'Lovely day.');assert.equal(s.dialogue.line.text,'Lovely day.');assert.ok(!s.dialogue.line.choices);
});
