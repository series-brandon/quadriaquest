import test from 'node:test';
import assert from 'node:assert/strict';
import {createCraftingTutorial as createTutorialController} from './crafting-tutorial.js';
import {createGameMenus} from './game-menus.js';
function createCraftingTutorial(options){let tutorial;const startCraft=id=>{const started=options.startCraft(id);if(started)tutorial.craftStarted(id);return started;};const menus=createGameMenus({...options,startCraft});tutorial=createTutorialController({...options,menus});return Object.assign(tutorial,{menus});}

// Small DOM harness for the real tutorial controller's branching and callbacks.
function fixture(){
 const nodes=new Map();
 class Element{
  constructor(){this.children=[];this.handlers={};this.hidden=false;this.style={};this.dataset={};this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  set id(id){this._id=id;nodes.set(id,this);}get id(){return this._id;}
  set innerHTML(html){for(const [,id]of html.matchAll(/id="([^"]+)"/g))get(id);}
  insertBefore(child,before){const index=this.children.indexOf(before);if(index<0)this.children.push(child);else this.children.splice(index,0,child);}
  append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}
  setAttribute(){} querySelector(selector){this.queries??={};return this.queries[selector]??=new Element();}
  querySelectorAll(selector){if(selector==='progress'||selector==='small'){this.lists??={};return this.lists[selector]??=[new Element(),new Element()];}return [...nodes.values()].filter(n=>n.classes.has('gold-guide'));}
  addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
  click(){const event={target:{closest(){return null;}}};this.onclick?.(event);for(const fn of this.handlers.click||[])fn(event);}
 }
 const get=id=>{if(!nodes.has(id)){const node=new Element();node.id=id;}return nodes.get(id);};
 const document={getElementById:get,createElement:()=>new Element(),createTextNode:text=>({textContent:text}),body:new Element()};
 return {document,get,nodes};
}
test('normal chopping leads into optional mining guidance, retry, success and finale',()=>{
 const previous=globalThis.document,{document,get,nodes}=fixture();globalThis.document=document;
 try{
  let finished=0;const crafts=[];
  const tutorial=createCraftingTutorial({getInventory:()=>({sticks:3,stones:3,axes:1,pickaxes:0}),getSkills:()=>({}),startCraft:item=>{crafts.push(item);return true;},onComplete:()=>finished++});
  tutorial.chopped(2);assert.equal(tutorial.stage,'chop-success');assert.equal(finished,0);
  get('tutorial-continue').click();assert.equal(tutorial.stage,'mining-intro');
  for(let i=0;i<4;i++)get('dialogue').click();
  assert.equal(tutorial.stage,'pickaxe');assert.equal(get('tutorial-help').hidden,false);
  assert.equal([...nodes.values()].some(n=>n.classes.has('gold-guide')),false);
  get('craft-pickaxes').click();assert.deepEqual(crafts,['pickaxes']);assert.equal(tutorial.stage,'mining-craft');
  tutorial.craftCancelled();assert.equal(tutorial.stage,'pickaxe');assert.equal(get('tutorial-help').hidden,false);
  tutorial.menus.openCrafting('pickaxes');get('tutorial-help').click();assert.ok(get('craft-pickaxes').classes.has('gold-guide'));
  get('craft-pickaxes').click();tutorial.craftComplete('pickaxes');assert.equal(tutorial.stage,'mining-crafted');
  get('tutorial-continue').click();get('dialogue').click();get('dialogue').click();
  assert.equal(tutorial.stage,'mine');assert.equal(tutorial.highlightBoulders,false);
  get('tutorial-help').click();assert.equal(tutorial.highlightBoulders,true);
  tutorial.mined();assert.equal(tutorial.stage,'mining-success');assert.equal(tutorial.highlightBoulders,false);assert.equal(finished,0);
  get('tutorial-continue').click();assert.equal(finished,1);assert.equal(tutorial.stage,'done');
  tutorial.startMining();tutorial.reset();assert.equal(tutorial.stage,'done');assert.equal(get('tutorial-help').hidden,true);
 }finally{globalThis.document=previous;}
});

test('first quest introduces the hidden menu, guides Quests, then resumes opening lessons',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  let resumed=0;
  const tutorial=createCraftingTutorial({getInventory:()=>({}),getSkills:()=>({}),startCraft:()=>false});
  tutorial.startQuests(()=>resumed++);
  assert.equal(get('game-menus').hidden,true);
  assert.match(get('tutorial-copy').children.map(n=>n.textContent||'').join(''),/been given a quest/);
  get('tutorial-continue').click();
  assert.equal(tutorial.stage,'quests-reveal');assert.equal(get('game-menus').hidden,false);
  assert.ok(get('game-menu-toggle').classes.has('gold-guide'));assert.equal(resumed,0);
  get('game-menu-toggle').click();assert.equal(tutorial.stage,'quests-reveal');
  get('dialogue').click();assert.equal(tutorial.stage,'quests-toggle');
  get('game-menu-toggle').click();assert.equal(tutorial.stage,'quests-menu');
  assert.ok(get('open-quests').classes.has('gold-guide'));
  tutorial.questsOpened();assert.equal(tutorial.stage,'quests-detail');assert.equal(resumed,0);
  get('tutorial-continue').click();assert.equal(resumed,1);assert.equal(tutorial.stage,'inactive');
  assert.equal(get('quests-panel').hidden,true);assert.equal(get('gather-tutorial').hidden,true);
 }finally{globalThis.document=previous;}
});

 test('skill refresh preserves disclosure rows and open state while XP changes',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const skill={level:1,xp:0};
  const tutorial=createCraftingTutorial({freePlay:true,getInventory:()=>({}),getSkills:()=>({Gathering:skill}),startCraft:()=>false});
  get('open-skills').click();const row=get('skills-list').children[0];
  row.open=true;for(let i=0;i<8;i++)tutorial.menus.refresh();
  assert.equal(get('skills-list').children.length,1);assert.equal(get('skills-list').children[0],row);assert.equal(row.open,true);
  skill.xp=20;tutorial.menus.refresh();assert.equal(row.querySelector('p').textContent,'20 total XP');assert.equal(row.open,true);
  row.open=false;tutorial.menus.refresh();assert.equal(row.open,false);
  get('skills-search').value='mining';get('skills-search').oninput();assert.equal(row.hidden,true);
  get('skills-search').value='';get('skills-search').oninput();assert.equal(row.hidden,false);assert.equal(get('skills-list').children[0],row);
 }finally{globalThis.document=previous;}
});

 test('dialogue-only transitions notify journal locks before the required menu click',async()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const {mountJournalTutorialLock}=await import('./journal-tutorial-lock.js');
  const tutorial=createCraftingTutorial({getInventory:()=>({sticks:3,stones:3}),getSkills:()=>({}),startCraft:()=>true});
  const attrs=new Map();
  const toggle={inert:false,matches:s=>s==='#game-menu-toggle',closest:()=>null,getAttribute:k=>attrs.get(k),hasAttribute:k=>attrs.has(k),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
  // Deliberately no MutationObserver: the real regression happens when only
  // dialogue outside the journal changes between reveal and menu instructions.
  const host={querySelectorAll:s=>s==='.gold-guide[id]'?[]:[toggle],addEventListener(){}};
  const lock=mountJournalTutorialLock(host,tutorial);
  tutorial.startQuests();get('tutorial-continue').click();await Promise.resolve();
  assert.equal(tutorial.stage,'quests-reveal');assert.equal(toggle.inert,true);
  get('dialogue').click();await Promise.resolve();
  assert.equal(tutorial.stage,'quests-toggle');assert.equal(toggle.inert,false);
  assert.equal(attrs.has('aria-disabled'),false);
  get('game-menu-toggle').click();await Promise.resolve();assert.equal(toggle.inert,true);
  tutorial.questsOpened();get('tutorial-continue').click();await Promise.resolve();assert.equal(lock.locked,false);
  tutorial.startSkills();await Promise.resolve();assert.equal(toggle.inert,true);
  get('dialogue').click();await Promise.resolve();assert.equal(toggle.inert,false);
  tutorial.startInventory();await Promise.resolve();assert.equal(toggle.inert,true);
  for(let i=0;i<3;i++)get('dialogue').click();await Promise.resolve();assert.equal(toggle.inert,false);
 }finally{globalThis.document=previous;}
});

test('shared menus expose both introductory tools and Culinary without a tutorial or area adapter',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const inventory={sticks:2,stones:2},crafts=[];
  const menus=createGameMenus({getInventory:()=>inventory,getSkills:()=>({Crafting:{level:6,xp:600},Culinary:{level:1,xp:0}}),startCraft:id=>{crafts.push(id);return true;}});
  menus.openCrafting();
  for(const id of ['axes','pickaxes']){assert.equal(get('choose-'+id).hidden,false);assert.equal(get('craft-'+id).disabled,false);assert.equal(get(id+'-duration').textContent,'Time · 1.67 seconds');get('craft-'+id).click();}
  assert.deepEqual(crafts,['axes','pickaxes']);
  inventory.stones=0;menus.refresh();assert.equal(get('craft-axes').disabled,true);assert.equal(get('craft-pickaxes').disabled,true);
  menus.openSkills();assert.ok(get('skills-list').children.some(row=>row.dataset.skill==='Culinary'));
 }finally{globalThis.document=previous;}
});
