import {ITEMS} from './items.js';
import {signal} from './reactive.js';

// Jobs (docs/ECONOMY.md, Jobs): repeatable paid tasks, apart from story quests, shared by every map.
// Four kinds:
//   deliver  take a package to someone: talk to them holding it (the giver hands it over on accepting);
//   bring    hand in items you have (taken when you hand them in, not when you accept);
//   craft    hand in things you made (items made earlier count too);
//   gather   counted from shared gathering events after you accept, then handed off to the giver.
// Jobs come from a quest board (about four offers from a pool; take up to three) and from townsfolk
// givers (one job each, with a cooldown after). No timers; abandoning is free and a package goes back.
// Rewards are gold plus a little XP in the related skill. Nothing here knows about a map: a board or a
// giver can stand anywhere, and delivery addresses come from the host (`addresses()`).
export const BOARD_SIZE=4,BOARD_LIMIT=3,BOARD_REFILL=20;
export const PACKAGE='package';
// The board's pool: a mix of kinds, always including jobs that need no combat and no tools.
export const BOARD_POOL=[
 {id:'sticks',kind:'bring',item:'sticks',count:10,gold:15,giver:'The guild clerk',note:'Kindling for the guild hall.',noTools:true},
 {id:'rocks',kind:'bring',item:'stones',count:10,gold:15,giver:'The road mender',note:'Fill for the potholes on the avenue.',noTools:true},
 {id:'logs',kind:'bring',item:'logs',count:5,gold:30,giver:'The carpenter',note:'Fresh timber for a new door.',xp:['Lumberjack',15]},
 {id:'ore',kind:'bring',item:'copperOre',count:3,gold:40,giver:'The smith',note:'Copper for the forge.',xp:['Mining',15]},
 {id:'stone',kind:'bring',item:'stone',count:4,gold:30,giver:'The mason',note:'Stone for the castle wall.',xp:['Mining',10]},
 {id:'meals',kind:'craft',item:'cookedFish',count:3,gold:50,giver:'The inn',note:'Hot meals for travellers.',xp:['Culinary',30]},
 {id:'rods',kind:'craft',item:'rods',count:2,gold:25,giver:'The fishmonger',note:'Spare rods for her apprentices.',xp:['Crafting',20]},
 {id:'daggers',kind:'craft',item:'copperDagger',count:1,gold:60,giver:'The guard captain',note:'A blade for a new recruit.',xp:['Smithing',30]},
 {id:'fish',kind:'gather',item:'rawFish',count:5,gold:45,giver:'The fishmonger',note:'Catch fresh pondfish.',xp:['Fishing',30]},
 {id:'chop',kind:'gather',item:'logs',count:5,gold:35,giver:'The carpenter',note:'Chop wood for the winter stores.',xp:['Lumberjack',25]},
 {id:'mine',kind:'gather',item:'copperOre',count:3,gold:45,giver:'The smith',note:'Mine copper yourself.',xp:['Mining',25]},
 {id:'gather-sticks',kind:'gather',item:'sticks',count:8,gold:12,giver:'The guild clerk',note:'Pick up fallen sticks around town.',noTools:true},
];
// Townsfolk givers. The post office always has a delivery to someone in town: take the package to
// them, then come back for your pay. Shopkeepers ask for things their shop deals in (SHOP_WANTS: the
// item, how, how many, and why), a random amount each time; the pay is the item's value times the count
// plus a little extra, so it beats selling. Each giver has one job at a time and a cooldown after.
export const POST={kind:'deliver',gold:[12,30],cooldown:30,need:'I need this package delivered!'};
export const GIVER_COOLDOWN=45;
const want=(item,kind,min,max,need)=>({item,kind,min,max,need});
const FOOD_WANTS=[want('cookedFish','craft',2,4,'The supper crowd will be here before I can cook enough.'),want('rawFish','bring',3,5,'I’m out of fish for the pot.')];
export const SHOP_WANTS={
 general:[want('sticks','bring',6,12,'Folk keep buying kindling faster than I can stock it.'),want('logs','bring',3,6,'Firewood flies off the shelves this time of year.'),want('stones','bring',5,10,'The road mender has emptied me of rocks.')],
 smithy:[want('copperOre','bring',2,5,'The forge is hungry for copper.'),want('copperIngots','craft',1,3,'I’ve more orders than I can smelt.')],
 weapons:[want('copperDagger','craft',1,2,'The guard wants new daggers, and I’m behind.'),want('logs','bring',2,4,'I need good wood for hilts.')],
 armour:[want('copperIngots','craft',2,4,'I need ingots for shield rims.'),want('copperShield','craft',1,1,'A recruit needs a shield by the week’s end.')],
 fishmonger:[want('rawFish','gather',3,6,'I’d go catch them myself, but I have to watch the shop.'),want('rawFish','bring',3,5,'The morning catch was thin.')],
 grocer:FOOD_WANTS,bakery:FOOD_WANTS,tavern:FOOD_WANTS,inn:FOOD_WANTS,
 carpenter:[want('logs','gather',4,8,'I need timber, and my axe arm is tired.'),want('sticks','bring',8,14,'Pegs and dowels don’t whittle themselves.')],
 market:[want('rawFish','gather',3,5,'The stall’s empty and the day is young.'),want('logs','bring',3,5,'Folk want firewood with their fish.')],
};
// The skill a job trains, by item and kind.
const SKILL_FOR={rawFish:{gather:'Fishing'},logs:{gather:'Lumberjack'},copperOre:{gather:'Mining',bring:'Mining'},cookedFish:{craft:'Culinary'},copperIngots:{craft:'Smithing'},copperDagger:{craft:'Smithing'},copperShield:{craft:'Smithing'}};
const KIND_VERB={deliver:'Deliver',bring:'Bring',craft:'Make',gather:'Gather'};
export const jobTitle=job=>job.kind==='deliver'?`Deliver a package to ${job.recipient.name}`:`${job.kind==='gather'&&job.item==='rawFish'?'Catch':KIND_VERB[job.kind]} ${ITEMS[job.item]?.name||job.item} ×${job.count}`;

// inventory: reactive counts; wallet: earn(); grantXp(skill, amount); addresses(giver): [{id, name, where}]
// (people who can receive a delivery); random(); now() in seconds (for refills and cooldowns).
// value(item): an item's worth (items.js), for shop job pay.
export function createJobs({inventory,wallet,grantXp=()=>{},addresses=()=>[],value=()=>1,random=Math.random,now=()=>performance.now()/1000}){
 const revision=signal(0),bump=()=>{revision.value++;};
 let serial=0,offers=[],refills=[],active=[],cooldowns=new Map(),completed=0;const pending=new Map();
 const draw=()=>{const taken=new Set([...offers.map(o=>o.id),...active.filter(j=>j.board).map(j=>j.poolId)]),pool=BOARD_POOL.filter(p=>!taken.has(p.id));
  // Keep at least one job a new player can do (no combat, no tools) on the board.
  const needEasy=!offers.some(o=>o.noTools),choices=needEasy?pool.filter(p=>p.noTools):pool;const list=choices.length?choices:pool;
  return list.length?{...list[Math.floor(random()*list.length)]}:null;};
 const fillBoard=()=>{while(offers.length<BOARD_SIZE){const o=draw();if(!o)break;offers.push(o);}};
 fillBoard();
 // A delivery counts once the package is handed over (then you go back to the giver).
 const counts=job=>job.kind==='gather'?job.counted:job.kind==='deliver'?(job.delivered?1:0):Math.min(job.count,inventory[job.item]||0);
 const progress=job=>({have:Math.min(job.count,counts(job)),need:job.count});
 const ready=job=>counts(job)>=job.count;
 const make=(template,extra)=>({key:`job-${++serial}`,kind:template.kind,item:template.item||PACKAGE,count:template.count||1,gold:template.gold,xp:template.xp||null,note:template.note,counted:0,...extra});
 const giverJob=giverId=>active.find(j=>j.giverId===giverId)||null;

 const api={
  revision,
  get offers(){revision.value;return offers.map(o=>({...o,title:jobTitle(o)}));},
  get active(){revision.value;return active.map(j=>({...j,title:jobTitle(j),progress:progress(j),ready:ready(j)}));},
  get completed(){revision.value;return completed;},
  boardCount:()=>active.filter(j=>j.board).length,
  // Board: take an offer (up to BOARD_LIMIT); a new offer arrives BOARD_REFILL seconds later.
  take(offerId){
   const i=offers.findIndex(o=>o.id===offerId);if(i<0)return {ok:false,reason:'That job is gone.'};
   if(api.boardCount()>=BOARD_LIMIT)return {ok:false,reason:`You can take ${BOARD_LIMIT} board jobs at a time.`};
   const [o]=offers.splice(i,1);const job=make(o,{board:true,poolId:o.id,giverName:o.giver,handIn:'board'});active.push(job);refills.push(now()+BOARD_REFILL);bump();return {ok:true,job};
  },
  // A townsfolk giver's offer (null when they have nothing, are waiting on a job from you, or are
  // cooling down). person.giver 'post', or `shop` (the shop they keep) for SHOP_WANTS. The same offer
  // stands until it is taken, so asking twice gives the same answer.
  offerFrom(person,shop=null){
   if(giverJob(person.id)||(cooldowns.get(person.id)||0)>now())return null;
   if(pending.has(person.id))return pending.get(person.id);
   let offer=null;
   if(person.giver==='post'){const to=addresses(person).filter(a=>a.id!==person.id);if(!to.length)return null;
    const recipient=to[Math.floor(random()*to.length)],gold=POST.gold[0]+Math.floor(random()*(POST.gold[1]-POST.gold[0]+1));
    offer={...POST,gold,recipient,count:1,item:PACKAGE,title:`Deliver a package to ${recipient.name}`};}
   else{const wants=SHOP_WANTS[shop];if(!wants?.length)return null;const w=wants[Math.floor(random()*wants.length)],count=w.min+Math.floor(random()*(w.max-w.min+1));
    const each=value(w.item),gold=each*count+2+Math.floor(random()*Math.max(3,each)),skill=SKILL_FOR[w.item]?.[w.kind];
    offer={kind:w.kind,item:w.item,count,gold,need:w.need,cooldown:GIVER_COOLDOWN,xp:skill?[skill,count*6]:null};offer.title=jobTitle(offer);}
   pending.set(person.id,offer);return offer;
  },
  accept(person,offer=api.offerFrom(person)){
   if(!offer)return {ok:false,reason:'Nothing to do right now.'};
   pending.delete(person.id);
   const job=make(offer,{giverId:person.id,giverName:person.name,handIn:offer.kind==='deliver'?offer.recipient.id:person.id,recipient:offer.recipient||null,cooldown:offer.cooldown,need:offer.need,delivered:false});
   if(job.kind==='deliver')inventory[PACKAGE]=(inventory[PACKAGE]||0)+1;
   active.push(job);bump();return {ok:true,job};
  },
  // A delivery's first step: hand the package to its recipient; then the giver pays you.
  deliver(key){
   const job=active.find(j=>j.key===key);if(!job||job.kind!=='deliver'||job.delivered)return {ok:false,reason:'Nothing to deliver.'};
   if(!(inventory[PACKAGE]>0))return {ok:false,reason:'You don’t have the package.'};
   inventory[PACKAGE]-=1;job.delivered=true;job.handIn=job.giverId;bump();return {ok:true,job:{...job,title:jobTitle(job)},changes:{[PACKAGE]:-1}};
  },
  // Jobs this person (or the board, 'board') takes hand-ins for.
  dueAt:who=>active.filter(j=>j.handIn===who),
  giverJob,
  cooling:person=>Math.max(0,(cooldowns.get(person.id)||0)-now()),
  handIn(key){
   const job=active.find(j=>j.key===key);if(!job)return {ok:false,reason:'That job is gone.'};
   if(!ready(job))return {ok:false,reason:job.kind==='gather'?`Gather ${job.count-job.counted} more first.`:job.kind==='deliver'?'Deliver the package first.':`You need ${job.count-counts(job)} more.`};
   const changes={};
   if(job.kind==='bring'||job.kind==='craft'){inventory[job.item]-=job.count;changes[job.item]=-job.count;}
   active.splice(active.indexOf(job),1);completed++;
   wallet.earn(job.gold,`job ${job.kind}`);changes.gold=job.gold;
   const xp=job.xp?grantXp(job.xp[0],job.xp[1]):null;
   if(job.giverId)cooldowns.set(job.giverId,now()+(job.cooldown||30));
   bump();return {ok:true,job:{...job,title:jobTitle(job)},changes,xp};
  },
  // Abandoning is free; a delivery's package goes back to the giver.
  abandon(key){
   const job=active.find(j=>j.key===key);if(!job)return false;
   if(job.kind==='deliver'&&!job.delivered&&(inventory[PACKAGE]||0)>0)inventory[PACKAGE]-=1;
   active.splice(active.indexOf(job),1);bump();return true;
  },
  // Shared gathering events (resources, fishing): gather jobs count items gained after accepting.
  gathered(changes){let changed=false;for(const job of active)if(job.kind==='gather'&&changes[job.item]>0&&job.counted<job.count){job.counted=Math.min(job.count,job.counted+changes[job.item]);changed=true;}if(changed)bump();},
  // Refill board offers whose delay has passed (call now and then; cheap).
  update(){if(!refills.length)return;const t=now(),due=refills.filter(r=>r<=t).length;if(!due)return;refills=refills.filter(r=>r>t);for(let i=0;i<due;i++){const o=draw();if(o&&offers.length<BOARD_SIZE)offers.push(o);}bump();},
  // Playground: finish a job at once (counts filled, items supplied), and reset everything.
  forceReady(key){const job=active.find(j=>j.key===key);if(!job)return false;if(job.kind==='gather')job.counted=job.count;else if(job.kind!=='deliver')inventory[job.item]=Math.max(inventory[job.item]||0,job.count);else{job.delivered=true;job.handIn=job.giverId;if(inventory[PACKAGE]>0)inventory[PACKAGE]-=1;}bump();return true;},
  clearCooldowns(){cooldowns.clear();bump();},
  reset(){for(const job of active)if(job.kind==='deliver'&&!job.delivered&&(inventory[PACKAGE]||0)>0)inventory[PACKAGE]-=1;offers=[];refills=[];active=[];cooldowns.clear();pending.clear();completed=0;fillBoard();bump();},
 };
 return api;
}
