import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {reactiveRecord} from './reactive.js';
import {createWallet} from './economy.js';
import {BOARD_LIMIT,BOARD_POOL,BOARD_REFILL,BOARD_SIZE,GIVERS,PACKAGE,createJobs} from './jobs.js';
import {rollDrops,dropOdds,seededRandom} from './drops.js';
import {ENEMIES} from './combat-rules.js';
import {ITEMS} from './items.js';
// The highlight draws an arrow on a canvas: a stand-in context is enough here.
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
globalThis.document??={createElement:()=>({getContext:()=>context})};
const {createLootPiles,LOOT_LIFETIME}=await import('./loot-piles.js');

function setup(items={}){
 let time=0;const inventory=reactiveRecord({gold:0,...items}),wallet=createWallet({inventory}),xp=[];
 const addresses=[{id:'fenwick',name:'Fenwick',where:'the Weaponsmith'},{id:'pearl',name:'Pearl',where:'a house on Main Street'}];
 const jobs=createJobs({inventory,wallet,grantXp:(s,n)=>{xp.push([s,n]);return {skillName:s,xp:n};},addresses:()=>addresses,random:seededRandom(7),now:()=>time});
 return {inventory,wallet,jobs,xp,advance:s=>{time+=s;}};
}

test('drop tables roll gold and items; the golem and targets drop nothing',()=>{
 const r=seededRandom(1);let gold=0,ore=0;
 for(let i=0;i<500;i++){const d=rollDrops(ENEMIES.bruiser.drops,r);gold+=d.gold;ore+=d.copperOre||0;assert.ok(d.gold>=5&&d.gold<=12);assert.equal(d.stones,2,'always drops');}
 assert.ok(ore>200&&ore<400,'about 40% drop 1–2 ore');
 assert.deepEqual(rollDrops(ENEMIES.golem.drops),{});assert.deepEqual(rollDrops(ENEMIES.target.drops),{});
 assert.deepEqual(rollDrops(ENEMIES.scrapper.drops,seededRandom(3)),rollDrops(ENEMIES.scrapper.drops,seededRandom(3)),'a fixed seed repeats');
 for(const e of dropOdds(ENEMIES.bruiser.drops))assert.ok(ITEMS[e.item],e.item);
});
test('loot piles are picked up by clicking and expire when left alone',()=>{
 const got=[],pickables=[],parent=new THREE.Group(),piles=createLootPiles({pickables,pickUp:items=>{got.push(items);}});
 const tile={x:3,z:4,h:0};
 assert.equal(piles.spawn({tile,parent,items:{}}),null,'nothing to drop');
 const pile=piles.spawn({tile,parent,items:{gold:5,sticks:2}});
 assert.ok(pickables.some(m=>m.userData.actor===pile));assert.equal(pile.label,'Pick up loot');
 pile.interact();assert.deepEqual(got,[{gold:5,sticks:2}]);assert.equal(piles.piles.length,0);assert.equal(pickables.length,0);
 piles.spawn({tile,parent,items:{logs:1}});piles.update(LOOT_LIFETIME-1,0);assert.equal(piles.piles.length,1);piles.update(1,0);assert.equal(piles.piles.length,0,'gone after its lifetime');
});
test('the board offers four jobs, one always needing no tools; taking is limited and refills later',()=>{
 const s=setup();
 assert.equal(s.jobs.offers.length,BOARD_SIZE);assert.ok(s.jobs.offers.some(o=>o.noTools));
 for(let i=0;i<BOARD_LIMIT;i++)assert.ok(s.jobs.take(s.jobs.offers[0].id).ok);
 assert.match(s.jobs.take(s.jobs.offers[0].id).reason,/3 board jobs/);
 assert.equal(s.jobs.offers.length,BOARD_SIZE-BOARD_LIMIT);
 s.advance(BOARD_REFILL);s.jobs.update();assert.equal(s.jobs.offers.length,BOARD_SIZE);
 assert.ok(BOARD_POOL.every(p=>ITEMS[p.item]));
});
test('bring and craft take items on hand-in; gather counts only after accepting',()=>{
 const s=setup({sticks:4,rawFish:9});
 // A gather job: pondfish caught before accepting don't count.
 const fishOffer=s.jobs.offerFrom({id:'mira',giver:'fishmonger',name:'Mira'});
 const fish=s.jobs.accept({id:'mira',giver:'fishmonger',name:'Mira'},fishOffer).job;
 assert.equal(s.jobs.handIn(fish.key).reason,'Gather 5 more first.');
 s.jobs.gathered({rawFish:3});s.jobs.gathered({logs:2});s.jobs.gathered({rawFish:4});
 assert.deepEqual(s.jobs.active.find(j=>j.key===fish.key).progress,{have:5,need:5});
 const done=s.jobs.handIn(fish.key);assert.ok(done.ok);assert.equal(s.inventory.rawFish,9,'gathered fish are kept');
 assert.equal(s.wallet.gold,GIVERS.fishmonger.gold);assert.deepEqual(s.xp,[['Fishing',30]]);
 assert.equal(s.jobs.offerFrom({id:'mira',giver:'fishmonger',name:'Mira'}),null,'cooling down');
 s.advance(GIVERS.fishmonger.cooldown);assert.ok(s.jobs.offerFrom({id:'mira',giver:'fishmonger',name:'Mira'}));
 // Bring: short, then enough.
 const smith={id:'hob',giver:'smith',name:'Hob'},ore=s.jobs.accept(smith).job;
 assert.equal(s.jobs.handIn(ore.key).reason,'You need 3 more.');
 s.inventory.copperOre=4;assert.ok(s.jobs.handIn(ore.key).ok);assert.equal(s.inventory.copperOre,1,'taken on hand-in');
});
test('deliveries hand you a package for someone else, handed in to them; abandoning returns it',()=>{
 const s=setup(),post={id:'pim',giver:'post',name:'Pim'};
 const offer=s.jobs.offerFrom(post);assert.ok(['fenwick','pearl'].includes(offer.recipient.id));
 const job=s.jobs.accept(post,offer).job;
 assert.equal(s.inventory[PACKAGE],1);assert.equal(job.handIn,offer.recipient.id);
 assert.equal(s.jobs.dueAt(offer.recipient.id).length,1);assert.equal(s.jobs.dueAt('pim').length,0);
 assert.equal(s.jobs.offerFrom(post),null,'one job per giver');
 assert.ok(s.jobs.handIn(job.key).ok);assert.equal(s.inventory[PACKAGE],0);assert.ok(s.wallet.gold>=12);
 s.advance(GIVERS.post.cooldown);const again=s.jobs.accept(post).job;
 assert.ok(s.jobs.abandon(again.key));assert.equal(s.inventory[PACKAGE],0);assert.equal(s.jobs.active.length,0);
 assert.equal(ITEMS[PACKAGE].sellable,false);
});
