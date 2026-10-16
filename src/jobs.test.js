import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {reactiveRecord} from './reactive.js';
import {createWallet} from './economy.js';
import {BOARD_LIMIT,BOARD_POOL,BOARD_REFILL,BOARD_SIZE,GIVER_COOLDOWN,POST,SHOP_WANTS,PACKAGE,createJobs} from './jobs.js';
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
 const jobs=createJobs({inventory,wallet,grantXp:(s,n)=>{xp.push([s,n]);return {skillName:s,xp:n};},addresses:()=>addresses,value:id=>ITEMS[id].value,random:seededRandom(7),now:()=>time});
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
 piles.spawn({tile,parent,items:{poplarWood:1}});piles.update(LOOT_LIFETIME-1,0);assert.equal(piles.piles.length,1);piles.update(1,0);assert.equal(piles.piles.length,0,'gone after its lifetime');
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
test('shopkeepers ask for their shop’s goods: a random amount, paid by value plus a little, the same offer until taken',()=>{
 const s=setup({rawFish:9}),mira={id:'mira',name:'Mira'};
 const offer=s.jobs.offerFrom(mira,'fishmonger');
 assert.ok(SHOP_WANTS.fishmonger.some(w=>w.item===offer.item&&w.kind===offer.kind&&offer.count>=w.min&&offer.count<=w.max),'one of the fishmonger’s wants');
 const base=ITEMS[offer.item].value*offer.count;assert.ok(offer.gold>base&&offer.gold<=base+2+Math.max(3,ITEMS[offer.item].value),`pay ${offer.gold} over ${base}`);
 assert.ok(offer.need,'with a reason');assert.deepEqual(s.jobs.offerFrom(mira,'fishmonger'),offer,'asking again: the same offer');
 assert.equal(s.jobs.offerFrom({id:'hat',name:'Hatter'},'tailor'),null,'a shop with no wants has no jobs');
 const job=s.jobs.accept(mira,offer).job;assert.equal(s.jobs.offerFrom(mira,'fishmonger'),null,'one job per giver');
 if(job.kind==='gather'){assert.equal(s.jobs.handIn(job.key).ok,false);s.jobs.gathered({rawFish:job.count});}
 else s.inventory[job.item]=Math.max(s.inventory[job.item]||0,job.count);
 const before=s.inventory[job.item],done=s.jobs.handIn(job.key);assert.ok(done.ok);assert.equal(s.wallet.gold,offer.gold);
 assert.equal(s.inventory[job.item],job.kind==='gather'?before:before-job.count,'brought items are taken; gathered ones kept');
 assert.equal(s.jobs.offerFrom(mira,'fishmonger'),null,'cooling down');s.advance(GIVER_COOLDOWN);assert.ok(s.jobs.offerFrom(mira,'fishmonger'));
});
test('deliveries: take the package to its recipient, then go back to the giver to be paid; abandoning returns it',()=>{
 const s=setup(),pim={id:'pim',giver:'post',name:'Pim'};
 const offer=s.jobs.offerFrom(pim);assert.ok(['fenwick','pearl'].includes(offer.recipient.id));
 const job=s.jobs.accept(pim,offer).job;
 assert.equal(s.inventory[PACKAGE],1);assert.equal(job.handIn,offer.recipient.id);
 assert.equal(s.jobs.handIn(job.key).reason,'Deliver the package first.');
 assert.ok(s.jobs.deliver(job.key).ok);assert.equal(s.inventory[PACKAGE],0);assert.equal(s.wallet.gold,0,'not paid yet');
 const live=s.jobs.active.find(j=>j.key===job.key);assert.ok(live.ready&&live.handIn==='pim','back to Pim');
 assert.ok(s.jobs.handIn(job.key).ok);assert.equal(s.wallet.gold,offer.gold);
 s.advance(POST.cooldown);const again=s.jobs.accept(pim).job;
 assert.ok(s.jobs.abandon(again.key));assert.equal(s.inventory[PACKAGE],0);assert.equal(s.jobs.active.length,0);
 assert.equal(ITEMS[PACKAGE].sellable,false);
});
