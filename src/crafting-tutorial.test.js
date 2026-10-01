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
  append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}
  setAttribute(){} querySelector(selector){return this.queries??=new Element();}
  querySelectorAll(){return [...nodes.values()].filter(n=>n.classes.has('gold-guide'));}
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
