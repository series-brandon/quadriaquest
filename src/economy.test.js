import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,ITEM_GROUPS} from './items.js';
import {RECIPES} from './recipes.js';
import {GOLD,SELL_RATE,createWallet,formatGold,itemValue,sellPrice} from './economy.js';
import {SHOPS,SHOP_FOR_USE,createShops,RESTOCK_MINUTES} from './shops.js';
import {reactiveRecord} from './reactive.js';
import {USE_NAMES} from './furnish.js';

test('every item has a value and a category; gold is currency and cannot be sold',()=>{
 for(const [id,item] of Object.entries(ITEMS)){assert.ok(item.category,id);if(item.sellable!==false)assert.ok(item.value>0,id);}
 assert.equal(ITEMS.gold.sellable,false);assert.equal(Object.keys(ITEMS)[0],GOLD,'gold sorts first');
 assert.equal(sellPrice('copperDagger'),Math.floor(40*SELL_RATE));assert.equal(sellPrice('arrows'),1,'at least 1');
 assert.equal(formatGold(1250),'1,250 GP');
});
test('crafting pays, and nothing profits from buying and reselling',()=>{
 for(const id of Object.keys(ITEMS))if(itemValue(id))assert.ok(sellPrice(id)<=itemValue(id),`${id} sells for no more than it costs`);
 for(const [id,recipe] of Object.entries(RECIPES)){
  // A group (any wood) is priced as its lowest tier, the one crafting spends first.
  const lowest=i=>ITEM_GROUPS[i]?.items[0]??i,inputsSell=Object.entries(recipe.cost).reduce((sum,[i,n])=>sum+sellPrice(lowest(i))*n,0),inputsBuy=Object.entries(recipe.cost).reduce((sum,[i,n])=>sum+itemValue(lowest(i))*n,0);
  assert.ok(sellPrice(id)>=inputsSell,`${id}: worth more than its materials (${sellPrice(id)} ≥ ${inputsSell})`);
  assert.ok(sellPrice(id)<inputsBuy,`${id}: buying its materials to craft and sell loses gold (${sellPrice(id)} < ${inputsBuy})`);
 }
});
test('the wallet earns, spends, refuses to go below zero and reports each change',()=>{
 const inventory=reactiveRecord({}),wallet=createWallet({inventory}),seen=[];wallet.onChange(c=>seen.push(c));
 assert.ok(wallet.earn(25,'job'));assert.equal(wallet.gold,25);
 assert.equal(wallet.spend(30,'hat'),false);assert.equal(wallet.gold,25);
 assert.ok(wallet.spend(10,'fish'));assert.equal(inventory.gold,15);
 assert.deepEqual(seen,[{amount:25,source:'job'},{amount:-10,source:'fish'}]);assert.deepEqual(wallet.last.peek(),{amount:-10,source:'fish'});
 wallet.set(0);assert.equal(wallet.gold,0);
});
test('shops: every stocked item has a value; every trading use has a shop',()=>{
 for(const [id,shop] of Object.entries(SHOPS))for(const e of shop.stock)assert.ok(itemValue(e.item)>0,`${id}: ${e.item}`);
 for(const [use,shop] of Object.entries(SHOP_FOR_USE)){assert.ok(USE_NAMES.includes(use),use);assert.ok(SHOPS[shop],shop);}
});
function shop({gold=0,items={},equipped={}}={}){
 let time=0;const inventory=reactiveRecord({gold,...items}),wallet=createWallet({inventory});
 return {inventory,wallet,shops:createShops({inventory,wallet,equipped:id=>equipped[id]||0,now:()=>time}),advance:minutes=>{time+=minutes*60000;}};
}
test('buying spends gold and limited stock, which restocks over time',()=>{
 const s=shop({gold:200});
 assert.equal(s.shops.buy('smithy','copperShield',3).reason,'Only 2 left');
 assert.ok(s.shops.buy('smithy','copperShield',2).ok);assert.equal(s.inventory.copperShield,2);assert.equal(s.wallet.gold,40);
 assert.equal(s.shops.buy('smithy','copperShield').reason,'Sold out');
 assert.equal(s.shops.buy('general','poplarWood',11).reason,'Not enough gold');assert.equal(s.wallet.gold,40,'nothing taken');
 assert.equal(s.shops.maxBuy('general','poplarWood'),10);
 s.advance(RESTOCK_MINUTES);assert.equal(s.shops.left('smithy','copperShield'),1);
 s.advance(RESTOCK_MINUTES*10);assert.equal(s.shops.left('smithy','copperShield'),2,'up to its limit');
 assert.equal(s.shops.left('smithy','poplarWood'),0,'not stocked');
});
test('selling pays the sell rate; quest items, gold, the wrong shop and worn items are refused',()=>{
 const s=shop({items:{poplarWood:5,copperDagger:1,hats:2,crudeAxe:1},equipped:{copperDagger:1,hats:1}});
 const sold=s.shops.sell('general','poplarWood',5);assert.ok(sold.ok);assert.equal(s.wallet.gold,5*sellPrice('poplarWood'));assert.equal(s.inventory.poplarWood,0);
 assert.equal(s.shops.sellBlock('general','gold'),'Currency');
 assert.equal(s.shops.sellBlock('fishmonger','crudeAxe'),"The fishmonger doesn't buy this");
 assert.equal(s.shops.sellBlock('general','copperDagger'),'Equipped');
 assert.equal(s.shops.maxSell('tailor','hats'),1,'the worn copy stays');
 assert.ok(s.shops.needsConfirm('crudeAxe',1),'your last axe asks first');assert.ok(!s.shops.needsConfirm('poplarWood',1));
 assert.equal(s.shops.sell('general','poplarWood',1).reason,'You don’t have that many to sell');
});
