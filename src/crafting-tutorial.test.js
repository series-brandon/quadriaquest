import test from 'node:test';
import assert from 'node:assert/strict';
import {createCraftingTutorial} from './crafting-tutorial.js';

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
  assert.equal(tutorial.stage,'pickaxe');assert.equal(tutorial.canMine,false);assert.equal(get('tutorial-help').hidden,false);
  assert.equal([...nodes.values()].some(n=>n.classes.has('gold-guide')),false);
  get('craft-pickaxe').click();assert.deepEqual(crafts,['pickaxes']);assert.equal(tutorial.stage,'mining-craft');
  tutorial.craftCancelled();assert.equal(tutorial.stage,'pickaxe');assert.equal(get('tutorial-help').hidden,false);
  get('crafting-panel').hidden=false;get('tutorial-help').click();assert.ok(get('craft-pickaxe').classes.has('gold-guide'));
  get('craft-pickaxe').click();tutorial.craftComplete('pickaxes');assert.equal(tutorial.stage,'mining-crafted');assert.equal(tutorial.canMine,false);
  get('tutorial-continue').click();get('dialogue').click();get('dialogue').click();
  assert.equal(tutorial.stage,'mine');assert.equal(tutorial.canMine,true);assert.equal(tutorial.highlightBoulders,false);
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
  row.open=true;for(let i=0;i<8;i++)tutorial.refresh();
  assert.equal(get('skills-list').children.length,1);assert.equal(get('skills-list').children[0],row);assert.equal(row.open,true);
  skill.xp=20;tutorial.refresh();assert.equal(row.querySelector('p').textContent,'20 total XP');assert.equal(row.open,true);
  row.open=false;tutorial.refresh();assert.equal(row.open,false);
  get('skills-search').value='mining';get('skills-search').oninput();assert.equal(row.hidden,true);
  get('skills-search').value='';get('skills-search').oninput();assert.equal(row.hidden,false);assert.equal(get('skills-list').children[0],row);
 }finally{globalThis.document=previous;}
});
