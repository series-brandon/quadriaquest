import {ITEMS} from './items.js';
import {SHOP_WANTS} from './jobs.js';

// Talking to townsfolk (docs/ECONOMY.md, Jobs): a conversation in the character dialogue box, the same
// for anyone in any map. Someone with something for you greets you with "What can I do for you?" and
// offers what applies: hand over a package, hand in or ask about a job, ask for work, browse their wares.
// Anyone else just says their line. Everything happens through the shared systems (jobs.js, the shop).
//   dialogue      character-dialogue.js
//   jobs          jobs.js
//   shopFor(p)    the shop this person keeps or works (for the jobs they give), or null
//   openShop(p)   open the shop they're minding
//   received(job, result, stage)  receipts: 'accepted' (a package), 'delivered', 'paid'
const name=id=>ITEMS[id]?.name||id;
const GATHER_VERB={rawFish:'catch me',logs:'chop me',copperOre:'mine me'};
const verbFor=offer=>offer.kind==='craft'?'make me':offer.kind==='gather'?GATHER_VERB[offer.item]||'gather me':'bring me';
export function createTownsfolkTalk({dialogue,jobs,shopFor=()=>null,openShop=()=>{},received=()=>{}}){
 let current=null;
 const end=()=>{dialogue.hide();if(current)current.talking=.6;current=null;};
 const say=(person,text,{choices=null,expression='idle'}={})=>dialogue.show({side:'right',name:person.name,model:person.rig?.group||null,expression,text,
  ...(choices?{choices}:{next:end})});
 const gives=person=>person.giver==='post'||!!SHOP_WANTS[shopFor(person)];
 const ready=job=>jobs.active.find(j=>j.key===job.key)?.ready;

 function askForWork(person){
  const offer=jobs.offerFrom(person,shopFor(person));
  if(!offer)return say(person,'Not right now, thanks. Come back a little later.');
  const answer=[['I’ll do it!',()=>accept(person,offer),'happy'],['I don’t have time, sorry.',()=>say(person,'Another time, then.')]];
  if(offer.kind==='deliver'){
   const where=offer.recipient.where?` at ${offer.recipient.where}`:'';
   dialogue.show({side:'right',name:person.name,model:person.rig?.group||null,expression:'idle',text:`${offer.need} It’s for ${offer.recipient.name}${where}.`,
    next:()=>say(person,`Take it to them, then come back and I’ll pay you ${offer.gold} gold. What do you say?`,{choices:answer})});
   return;
  }
  dialogue.show({side:'right',name:person.name,model:person.rig?.group||null,expression:'idle',text:`Well… I need ${offer.count} ${name(offer.item)}. ${offer.need}`,
   next:()=>say(person,`I’ll pay you ${offer.gold} gold if you ${verbFor(offer)} ${offer.count} ${name(offer.item)}, what do you say?`,{choices:answer})});
 }
 function accept(person,offer){
  const result=jobs.accept(person,offer);if(!result.ok)return say(person,result.reason);
  received(result.job,result,'accepted');
  say(person,offer.kind==='deliver'?'Wonderful! Here’s the package. Mind you don’t drop it.':'Wonderful! I’ll be here when you have them.',{expression:'happy'});
 }
 function deliver(person,job){
  const result=jobs.deliver(job.key);if(!result.ok)return say(person,result.reason);
  received(result.job,result,'delivered');
  say(person,`Oh, my parcel! Thank you kindly. Do tell ${job.giverName} it arrived safe.`,{expression:'happy'});
 }
 function handIn(person,job){
  const result=jobs.handIn(job.key);if(!result.ok)return say(person,result.reason);
  received(result.job,result,'paid');
  say(person,job.kind==='deliver'?`Delivered, was it? Splendid. Here’s your ${job.gold} gold.`:`Thank you! That’s just what I needed. Here’s your ${job.gold} gold.`,{expression:'happy'});
 }
 function remind(person,job){
  const live=jobs.active.find(j=>j.key===job.key);
  if(job.kind==='deliver')return say(person,`Has ${job.recipient.name} got that package yet?${job.recipient.where?` They’re at ${job.recipient.where}.`:''}`);
  say(person,`I still need ${live.progress.need-live.progress.have} more ${name(job.item)}.`);
 }

 return {
  get talking(){return current;},
  talk(person,line){
   current=person;person.talking=Infinity;
   const options=[];
   for(const job of jobs.active.filter(j=>j.kind==='deliver'&&!j.delivered&&j.recipient?.id===person.id))options.push(['I have a package for you.',()=>deliver(person,job)]);
   const mine=jobs.giverJob(person.id);
   if(mine)options.push(ready(mine)?[mine.kind==='deliver'?'I delivered the package.':`I have your ${mine.count} ${name(mine.item)}.`,()=>handIn(person,mine)]:['About that job…',()=>remind(person,mine)]);
   else if(gives(person))options.push(['Do you have any jobs for me?',()=>askForWork(person)]);
   if(person.shop)options.push(['I’d like to browse your wares.',()=>{end();openShop(person);}]);
   if(!options.length)return say(person,line);
   options.push(['Nothing, thanks.',()=>end()]);
   say(person,'What can I do for you?',{choices:options});
  },
  end,
 };
}
