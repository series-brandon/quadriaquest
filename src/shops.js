import {ITEMS} from './items.js';
import {GOLD,NEEDED_TOOLS,itemValue,sellPrice} from './economy.js';
import {signal} from './reactive.js';

// Shops (docs/ECONOMY.md): one shared system for every map. A shop definition has a name, its stock
// (unlimited unless `limit`; limited stock comes back one at a time every `restock` minutes) and what it
// buys: 'all' or a list of item categories (items.js). Buildings, counters and stalls know only a shop
// id; shopkeepers greet you and open it. Prices are the item's value to buy and the shared sell rate to
// sell. Items the player sells don't join a shop's stock in the prototype.
const FOOD={stock:[{item:'cookedFish'},{item:'rawFish'}],buys:['food','fish']};
export const SHOPS={
 general:{name:'General Store',greeting:'Tools, food and odds and ends. I buy anything.',buys:'all',
  stock:[{item:'crudeAxe'},{item:'pickaxes'},{item:'hammers'},{item:'rods'},{item:'firestarters'},{item:'campfires',limit:3},{item:'cookedFish'},{item:'sticks'},{item:'stones'},{item:'poplarWood'},{item:'arrows'}]},
 smithy:{name:'Smithy',greeting:'Copper, fresh from the forge.',buys:['metal','weapon','armour','tool'],
  stock:[{item:'copperOre'},{item:'copperIngots'},{item:'copperDagger',limit:3},{item:'copperShield',limit:2},{item:'hammers'},{item:'pickaxes'}]},
 weapons:{name:'Weaponsmith',greeting:'A good blade for a good slime.',buys:['weapon','ammo','metal'],
  stock:[{item:'copperDagger',limit:3},{item:'swords'},{item:'bows',limit:2},{item:'arrows'},{item:'staffs',limit:1}]},
 armour:{name:'Armourer',greeting:'Shields and helms. Mind the edges.',buys:['armour','hat','metal'],
  stock:[{item:'copperShield',limit:2},{item:'crudeShield'},{item:'ironSkullcap',limit:1}]},
 // A village smith (docs/TOWN.md, Mistrom): a little of the smithy, weaponsmith and armourer in one.
 villageSmith:{name:'Smith',greeting:'Metal, blades and shields. Whatever the forge can make.',buys:['metal','weapon','armour','tool','ammo'],
  stock:[{item:'copperOre'},{item:'copperIngots'},{item:'copperDagger',limit:3},{item:'swords',limit:2},{item:'copperShield',limit:2},{item:'crudeShield',limit:1},{item:'ironSkullcap',limit:1},{item:'hammers'},{item:'pickaxes'},{item:'arrows'}]},
 fishmonger:{name:'Fishmonger',greeting:'Caught this morning, every one.',buys:['fish','food'],
  stock:[{item:'rawFish'},{item:'cookedFish'},{item:'rods'}]},
 grocer:{name:'Grocer',greeting:'Fresh and filling.',...FOOD},
 bakery:{name:'Bakery',greeting:'Warm from the oven. Well, the fire.',...FOOD},
 tavern:{name:'Tavern',greeting:'Sit, eat, stay a while.',...FOOD},
 inn:{name:'Inn',greeting:'A hot meal for the road?',...FOOD},
 tailor:{name:'Hatter',greeting:'Every slime deserves a fine hat.',buys:['hat'],
  stock:[{item:'hats',limit:2},{item:'companionHats',limit:2},{item:'wizardHat',limit:1},{item:'archerCap',limit:1},{item:'fishersHat',limit:1},{item:'minersCap',limit:1},{item:'breathHeadband',limit:1}]},
 carpenter:{name:'Carpenter',greeting:'Good timber, straight and true.',buys:['wood','tool'],
  stock:[{item:'poplarWood'},{item:'sticks'},{item:'hammers'},{item:'crudeShield'}]},
 market:{name:'Market stall',greeting:'Fish, firewood and stone, cheap!',buys:['fish','food','wood','stone'],
  stock:[{item:'rawFish'},{item:'cookedFish'},{item:'poplarWood'},{item:'sticks'},{item:'stones'},{item:'flint'}]},
};
// Building uses (furnish.js) that trade, and which shop they run. A building's own `shop` wins.
export const SHOP_FOR_USE={store:'general',apothecary:'general',smithy:'smithy',weaponsmith:'weapons',armourer:'armour',fishmonger:'fishmonger',
 grocer:'grocer',bakery:'bakery',tavern:'tavern',inn:'inn',tailor:'tailor',carpenter:'carpenter'};
export const shopForBuilding=(desc,use)=>desc?.shop||SHOP_FOR_USE[use]||null;
export const RESTOCK_MINUTES=5;
const buysItem=(shop,id)=>shop.buys==='all'||shop.buys.includes(ITEMS[id]?.category);

// The shop system. equipped(id): how many copies are worn (hands, head, armour, the companion's hat).
// now(): milliseconds (for restocking). Buying and selling change the inventory and go through the
// wallet. Each refusal has a reason the screen shows.
export function createShops({inventory,wallet,equipped=()=>0,now=()=>Date.now(),shops=SHOPS}){
 const state=new Map(),revision=signal(0);
 const bump=()=>{revision.value++;};
 // Limited stock: what's left, topped up by elapsed restock periods.
 function stockOf(shopId){
  const shop=shops[shopId];if(!shop)return null;
  let s=state.get(shopId);if(!s){s={left:{},since:now()};for(const e of shop.stock)if(e.limit)s.left[e.item]=e.limit;state.set(shopId,s);}
  const periods=Math.floor((now()-s.since)/(RESTOCK_MINUTES*60000));
  if(periods>0){s.since+=periods*RESTOCK_MINUTES*60000;for(const e of shop.stock)if(e.limit)s.left[e.item]=Math.min(e.limit,s.left[e.item]+periods);}
  return s;
 }
 const entry=(shopId,id)=>shops[shopId]?.stock.find(e=>e.item===id)||null;
 // How many of an item a shop has left (Infinity when unlimited, 0 when it doesn't stock it).
 const left=(shopId,id)=>{const e=entry(shopId,id);if(!e)return 0;return e.limit?stockOf(shopId).left[id]:Infinity;};
 // Copies you could sell: what you own less what you're wearing.
 const spare=id=>Math.max(0,(inventory[id]||0)-equipped(id));
 // Why you can't sell an item here (null if you can).
 function sellBlock(shopId,id){
  const shop=shops[shopId],item=ITEMS[id];
  if(!shop||!item)return 'Unknown item';
  if(item.sellable===false)return id===GOLD?'Currency':'Quest item';
  if(!buysItem(shop,id))return `The ${shop.name.toLowerCase()} doesn't buy this`;
  if((inventory[id]||0)>0&&spare(id)===0)return 'Equipped';
  return null;
 }
 return {
  revision,shops,left,spare,sellBlock,
  buyPrice:id=>itemValue(id),sellPrice:id=>sellPrice(id),
  // The most you could buy now (stock and gold) and sell now.
  maxBuy(shopId,id){const price=itemValue(id),stock=left(shopId,id);if(!price)return 0;revision.value;return Math.min(stock,Math.floor(wallet.gold/price));},
  maxSell(shopId,id){revision.value;return sellBlock(shopId,id)?0:spare(id);},
  // Selling this many leaves you without a tool you need: the screen asks first.
  needsConfirm(id,n){return !!NEEDED_TOOLS[id]&&(inventory[id]||0)-n<=0;},
  buy(shopId,id,n=1){
   n=Math.floor(n);const price=itemValue(id);
   if(!(n>0)||!price)return {ok:false,reason:'Nothing to buy'};
   if(left(shopId,id)<n)return {ok:false,reason:left(shopId,id)?`Only ${left(shopId,id)} left`:'Sold out'};
   if(!wallet.spend(price*n,`bought ${id}`))return {ok:false,reason:'Not enough gold'};
   const e=entry(shopId,id);if(e.limit)stockOf(shopId).left[id]-=n;
   inventory[id]=(inventory[id]||0)+n;bump();
   return {ok:true,changes:{[id]:n,[GOLD]:-price*n}};
  },
  sell(shopId,id,n=1){
   n=Math.floor(n);const block=sellBlock(shopId,id);
   if(block)return {ok:false,reason:block};
   if(!(n>0)||spare(id)<n)return {ok:false,reason:'You don’t have that many to sell'};
   inventory[id]-=n;const paid=sellPrice(id)*n;wallet.earn(paid,`sold ${id}`);bump();
   return {ok:true,changes:{[id]:-n,[GOLD]:paid}};
  },
  // Playground: stock back to full and the restock clock restarted.
  reset(){state.clear();bump();},
 };
}
