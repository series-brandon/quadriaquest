import test from 'node:test';
import assert from 'node:assert/strict';
import {createCraftingTutorial as createTutorialController} from './crafting-tutorial.js';
import {createGameMenus} from './game-menus.js';
import {createNarrator} from './ui/hud/narrator.js';
import {createTip} from './ui/hud/tip.js';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {createGatheringSkill} from './skills.js';
import {reactiveRecord} from './reactive.js';
import {createCharacter} from './character.js';
function createCraftingTutorial(options){let tutorial;const startCraft=id=>{const started=options.startCraft(id);if(started)tutorial.craftStarted(id);return started;};const menus=createGameMenus({...options,startCraft});
 // The journal registers Quests in the game; lessons guide its tab.
 menus.panels.register({id:'quests',label:'Quests',icon:'quests',order:10,returnTo:true,element:document.createElement('section')});
 tutorial=createTutorialController({narrator:createNarrator(),tip:createTip(),...options,menus});return Object.assign(tutorial,{menus});}

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
  // Show me how walks the menus: the Crafting tab, then the recipe, then Craft; it never chooses.
  const guided=id=>get(id).classList.contains('gold-guide');
  tutorial.menus.closeMenus();get('tutorial-help').click();assert.ok(guided('open-crafting'));assert.equal(guided('choose-pickaxes'),false);
  get('open-crafting').click();assert.equal(tutorial.menus.selectedRecipe,null,'nothing is chosen for the player');
  assert.ok(guided('choose-pickaxes'));assert.equal(guided('open-crafting'),false);assert.equal(guided('craft-pickaxes'),false);
  get('choose-pickaxes').click();assert.ok(guided('craft-pickaxes'));assert.equal(guided('choose-pickaxes'),false);
  get('craft-pickaxes').click();assert.equal(guided('craft-pickaxes'),false,'starting the craft ends the guide');tutorial.craftComplete('pickaxes');assert.equal(tutorial.stage,'mining-crafted');
  get('tutorial-continue').click();get('dialogue').click();get('dialogue').click();
  assert.equal(tutorial.stage,'mine');assert.equal(tutorial.highlightBoulders,false);
  get('tutorial-help').click();assert.equal(tutorial.highlightBoulders,true);
  tutorial.mined();assert.equal(tutorial.stage,'mining-success');assert.equal(tutorial.highlightBoulders,false);assert.equal(finished,0);
  get('tutorial-continue').click();assert.equal(finished,1);assert.equal(tutorial.stage,'done');
  tutorial.startMining();tutorial.reset();assert.equal(tutorial.stage,'done');assert.equal(get('tutorial-help').hidden,true);
 }finally{globalThis.document=previous;}
});

test('first quest reveals the menus with its line, guides the Quests tab, then resumes opening lessons',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  let resumed=0;
  const tutorial=createCraftingTutorial({getInventory:()=>({}),getSkills:()=>({}),startCraft:()=>false});
  // The phone tab bar's copy of the tab (no id, same data-tab).
  const phoneTab=document.createElement('button');phoneTab.dataset.tab='open-quests';get('game-menus').append(phoneTab);
  tutorial.startQuests(()=>resumed++);
  assert.equal(get('game-menus').hidden,true);
  assert.match(get('tutorial-copy').textContent,/been given a quest/);
  get('tutorial-continue').click();
  assert.equal(tutorial.stage,'quests-reveal');assert.equal(get('game-menus').hidden,false,'the menus arrive with the line');
  assert.equal(get('game-menu-toggle'),null,'no separate menu button');assert.equal(resumed,0);
  get('dialogue').click();assert.equal(tutorial.stage,'quests-menu');
  assert.ok(get('open-quests').classList.contains('gold-guide'));assert.ok(phoneTab.classList.contains('gold-guide'),'both bars are guided');
  assert.match(get('tutorial-copy').textContent,/Open the Quests tab/);
  tutorial.questsOpened();assert.equal(tutorial.stage,'quests-detail');assert.equal(resumed,0);
  get('tutorial-continue').click();assert.equal(resumed,1);assert.equal(tutorial.stage,'inactive');
  assert.equal(tutorial.menus.panels.active.value,null,'no page left open');assert.equal(get('gather-tutorial').hidden,true);
 }finally{globalThis.document=previous;}
});

 test('the skills page keeps rows and open state while XP changes, and highlights the lesson skill',()=>{
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
  tutorial.menus.setSkillGuidance({locked:true,guide:'Gathering'});
  assert.equal(open(),false,'guidance never opens the row');assert.equal(row.hasAttribute('data-guide'),true);assert.equal(tutorial.menus.panels.closeLocked.value,true);
 }finally{globalThis.document=previous;}
});

 test('dialogue-only transitions notify journal locks before the required tab click',async()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const {mountJournalTutorialLock}=await import('./journal-tutorial-lock.js');
  const tutorial=createCraftingTutorial({getInventory:()=>({sticks:3,stones:3}),getSkills:()=>({}),startCraft:()=>true});
  const tabs={};
  const make=tab=>{const attrs=new Map();return tabs[tab]={inert:false,dataset:{tab},matches:s=>s===`[data-tab="${tab}"]`,closest:()=>null,getAttribute:k=>attrs.get(k),hasAttribute:k=>attrs.has(k),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};};
  const controls=['open-quests','open-character','open-inventory'].map(make);
  // Deliberately no MutationObserver: the real regression happens when only
  // dialogue outside the journal changes between the line and the tab instruction.
  const host={querySelectorAll:s=>s.startsWith('.gold-guide')?[]:controls,addEventListener(){}};
  const lock=mountJournalTutorialLock(host,tutorial);
  tutorial.startQuests();get('tutorial-continue').click();await Promise.resolve();
  assert.equal(tutorial.stage,'quests-reveal');assert.equal(tabs['open-quests'].inert,true);
  get('dialogue').click();await Promise.resolve();
  assert.equal(tutorial.stage,'quests-menu');assert.equal(tabs['open-quests'].inert,false);assert.equal(tabs['open-character'].inert,true);
  assert.equal(tabs['open-quests'].hasAttribute('aria-disabled'),false);
  tutorial.questsOpened();get('tutorial-continue').click();await Promise.resolve();assert.equal(lock.locked,false);
  tutorial.startSkills();await Promise.resolve();assert.equal(tabs['open-character'].inert,true);
  get('dialogue').click();await Promise.resolve();assert.equal(tabs['open-character'].inert,false);
  tutorial.startInventory();await Promise.resolve();assert.equal(tabs['open-inventory'].inert,true);
  for(let i=0;i<3;i++)get('dialogue').click();await Promise.resolve();assert.equal(tabs['open-inventory'].inert,false);
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

test('the axe lesson has the player open Crafting, choose the Crude Axe, then craft it',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const crafts=[];
  const tutorial=createCraftingTutorial({getInventory:()=>({sticks:3,stones:3}),getSkills:()=>({}),startCraft:id=>{crafts.push(id);return true;}});
  const guided=id=>get(id).classList.contains('gold-guide');
  tutorial.start();for(let i=0;i<7;i++)get('dialogue').click();
  assert.equal(tutorial.stage,'craft-menu');assert.ok(guided('open-crafting'));
  get('open-crafting').click();
  assert.equal(tutorial.stage,'recipe');assert.equal(tutorial.menus.selectedRecipe,null,'the page opens with nothing chosen');
  assert.equal(get('axes-detail').hidden,true);assert.ok(guided('choose-axes'));assert.equal(guided('craft-axes'),false);
  get('choose-axes').click();
  assert.equal(get('axes-detail').hidden,false);assert.ok(guided('craft-axes'));assert.equal(guided('choose-axes'),false);
  get('craft-axes').click();assert.deepEqual(crafts,['axes']);assert.equal(tutorial.stage,'crafting');
  assert.equal(document.querySelectorAll('[data-menu-guide]').length,0);
  // Interrupted: back to the Crafting tab, and the recipe must be chosen again.
  tutorial.menus.closeMenus();tutorial.craftCancelled();assert.equal(tutorial.stage,'retry');assert.ok(guided('open-crafting'));
  get('open-crafting').click();assert.equal(tutorial.stage,'recipe');assert.ok(guided('choose-axes'));
 }finally{globalThis.document=previous;}
});

test('the shared menu guide walks the Inventory tab, the item, then its action',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const menus=createGameMenus({getInventory:()=>reactiveRecord({sticks:2}),getSkills:()=>({}),startCraft:()=>false});
  menus.guide({page:'inventory',item:'sticks'});
  assert.ok(get('open-inventory').classList.contains('gold-guide'));assert.equal(menus.panels.active.value,null,'the guide never opens the page');
  get('open-inventory').click();
  assert.equal(get('open-inventory').classList.contains('gold-guide'),false);
  assert.equal(menus.inventoryMenu.panel.querySelector('[data-item="sticks"]').hasAttribute('data-guide'),true);
  menus.guide(null);assert.equal(menus.inventoryMenu.panel.querySelector('[data-item="sticks"]').hasAttribute('data-guide'),false);
 }finally{globalThis.document=previous;}
});

test('the skills lesson has the player open Character, choose Skills, then open Gathering',()=>{
 const previous=globalThis.document,{document,get}=fixture();globalThis.document=document;
 try{
  const skill=createGatheringSkill();
  const tutorial=createCraftingTutorial({getInventory:()=>({}),getSkills:()=>({Gathering:skill}),getCharacter:()=>createCharacter(),startCraft:()=>false});
  const panel=tutorial.menus.characterPanel,tab=label=>[...panel.querySelectorAll('[role=tab]')].find(t=>t.textContent.startsWith(label));
  tutorial.startSkills();get('dialogue').click();
  assert.equal(tutorial.stage,'skills-menu');assert.ok(get('open-character').classList.contains('gold-guide'));
  get('open-character').click();
  assert.equal(tutorial.stage,'skills-section');assert.equal(tutorial.menus.characterSection.value,'attributes','the page opens as it was');
  assert.equal(tab('Skills').hasAttribute('data-guide'),true);assert.match(get('tutorial-copy').textContent,/Skills section/);
  tab('Skills').click();
  const row=panel.querySelector('[data-skill="Gathering"]');
  assert.equal(tutorial.stage,'skills-select');assert.equal(tab('Skills').hasAttribute('data-guide'),false);
  assert.equal(row.hasAttribute('data-guide'),true);assert.equal(row.hasAttribute('open'),false,'the row is the player\'s to open');
  row.setAttribute('open','');row.dispatchEvent(new window.Event('toggle'));
  assert.equal(tutorial.stage,'skills-detail');assert.match(get('tutorial-copy').textContent,/Here's your Gathering skill/);
  assert.equal(row.hasAttribute('data-guide'),false);
 }finally{globalThis.document=previous;}
});
