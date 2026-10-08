import test from 'node:test';
import assert from 'node:assert/strict';
import {createCraftingTutorial as createTutorialController} from './crafting-tutorial.js';
import {createGameMenus} from './game-menus.js';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {createGatheringSkill} from './skills.js';
import {reactiveRecord} from './reactive.js';
function createCraftingTutorial(options){let tutorial;const startCraft=id=>{const started=options.startCraft(id);if(started)tutorial.craftStarted(id);return started;};const menus=createGameMenus({...options,startCraft});
 // The journal registers Quests in the game; lessons guide its tab.
 menus.panels.register({id:'quests',label:'Quests',icon:'quests',order:10,returnTo:true,element:document.createElement('section')});
 tutorial=createTutorialController({...options,menus});return Object.assign(tutorial,{menus});}

// The game's real page markup on a lightweight DOM, so the tutorial drives the real menus.
const PAGE=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function fixture(){
 const {window,document}=parseHTML(PAGE);
 globalThis.window=window;
 return {document,get:id=>document.getElementById(id)};
}
test('normal chopping leads into optional mining guidance, retry, success and finale',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  let finished=0;const crafts=[];
  const tutorial=createCraftingTutorial({getInventory:()=>({sticks:3,stones:3,axes:1,pickaxes:0}),getSkills:()=>({}),startCraft:item=>{crafts.push(item);return true;},onComplete:()=>finished++});
  tutorial.chopped(2);assert.equal(tutorial.stage,'chop-success');assert.equal(finished,0);
  get('tutorial-continue').click();assert.equal(tutorial.stage,'mining-intro');
  for(let i=0;i<4;i++)get('dialogue').click();
  assert.equal(tutorial.stage,'pickaxe');assert.equal(get('tutorial-help').hidden,false);
  // The inventory overlay always carries the class; only highlighted controls count.
  assert.equal([...document.querySelectorAll('.gold-guide')].some(n=>n.id!=='inventory-guide'),false);
  get('craft-pickaxes').click();assert.deepEqual(crafts,['pickaxes']);assert.equal(tutorial.stage,'mining-craft');
  tutorial.craftCancelled();assert.equal(tutorial.stage,'pickaxe');assert.equal(get('tutorial-help').hidden,false);
  tutorial.menus.openCrafting('pickaxes');get('tutorial-help').click();assert.ok(get('craft-pickaxes').classList.contains('gold-guide'));
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
  assert.match(get('tutorial-copy').textContent,/been given a quest/);
  get('tutorial-continue').click();
  assert.equal(tutorial.stage,'quests-reveal');assert.equal(get('game-menus').hidden,false);
  assert.ok(get('game-menu-toggle').classList.contains('gold-guide'));assert.equal(resumed,0);
  get('game-menu-toggle').click();assert.equal(tutorial.stage,'quests-reveal');
  get('dialogue').click();assert.equal(tutorial.stage,'quests-toggle');
  get('game-menu-toggle').click();assert.equal(tutorial.stage,'quests-menu');
  assert.ok(get('open-quests').classList.contains('gold-guide'));
  tutorial.questsOpened();assert.equal(tutorial.stage,'quests-detail');assert.equal(resumed,0);
  get('tutorial-continue').click();assert.equal(resumed,1);assert.equal(tutorial.stage,'inactive');
  assert.equal(tutorial.menus.panels.active.value,null,'no page left open');assert.equal(get('gather-tutorial').hidden,true);
 }finally{globalThis.document=previous;}
});

 test('the skills page keeps rows and open state while XP changes, and opens the lesson skill',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const skill=createGatheringSkill();
  const tutorial=createCraftingTutorial({freePlay:true,getInventory:()=>({}),getSkills:()=>({Gathering:skill}),startCraft:()=>false});
  get('open-character').click();const rows=()=>[...get('character-panel').querySelectorAll('[data-skill]')],row=rows()[0];
  const open=()=>row.hasAttribute('open');row.toggleAttribute('open',true);skill.xp=20;
  assert.equal(rows().length,1);assert.ok(rows()[0]===row);assert.equal(open(),true);
  assert.match(row.textContent,/20 total XP/);
  row.toggleAttribute('open',false);skill.xp=40;assert.equal(open(),false,'XP changes never reopen a row');
  const search=get('character-panel').querySelector('input[type=search]');
  search.value='mining';search.dispatchEvent(new window.Event('input'));assert.equal(row.hidden,true);
  search.value='';search.dispatchEvent(new window.Event('input'));assert.equal(row.hidden,false);assert.ok(rows()[0]===row);
  tutorial.menus.setSkillGuidance({locked:true,focus:'Gathering'});
  assert.equal(open(),true);assert.equal(row.hasAttribute('data-guide'),true);assert.equal(tutorial.menus.panels.closeLocked.value,true);
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
  const inventory=reactiveRecord({sticks:2,stones:2}),crafts=[];let started=true;
  const menus=createGameMenus({getInventory:()=>inventory,getSkills:()=>({Crafting:{level:6,xp:600},Culinary:{level:1,xp:0},'Melee Power':{level:1,xp:0,group:'combat'},'Light Armor':{level:1,xp:0,group:'armor'},'Dagger Proficiency':{level:2,xp:90,group:'weapon',curve:'adopted'}}),startCraft:id=>{crafts.push(id);return started;}});
  menus.openCrafting();
  for(const id of ['axes','pickaxes']){assert.equal(get('choose-'+id).hidden,false);assert.equal(get('craft-'+id).disabled,false);assert.equal(get(id+'-duration').textContent,'Time · 1.67 seconds');get('craft-'+id).click();}
  assert.deepEqual(crafts,['axes','pickaxes']);
  inventory.stones=0;assert.equal(get('craft-axes').disabled,true,'materials follow the inventory');assert.equal(get('craft-pickaxes').disabled,true);
  assert.equal(get('craft-copperIngots').disabled,true,'station recipes are made at their station');assert.match(get('craft-copperIngots').textContent,/Make at a furnace/);
  inventory.stones=1;started=false;get('craft-axes').click();assert.match(get('axes-detail').textContent,/finish your current action first/,'a refused start explains why');
  menus.selectRecipe('pickaxes');assert.equal(get('pickaxes-detail').hidden,false);assert.equal(get('axes-detail').hidden,true);assert.equal(menus.selectedRecipe,'pickaxes');
  menus.openSkills();const lists=[...get('character-panel').querySelectorAll('.q-skills')].map(list=>[...list.querySelectorAll('[data-skill]')].map(row=>row.dataset.skill));
  assert.deepEqual(lists,[['Crafting','Culinary','Melee Power','Light Armor'],['Dagger Proficiency']],'skills (non-combat, combat, armor), then proficiencies');
  assert.equal(menus.panels.isOpen('character'),true);
 }finally{globalThis.document=previous;}
});
