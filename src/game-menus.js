import {RECIPES} from './recipes.js';
import {createInventoryMenu} from './inventory-menu.js';
import {computed,effect,signal,untracked} from './reactive.js';
import {createPanelHost} from './ui/panels.js';
import {panelTabs} from './ui/panel-tabs.js';
import {h,mount} from './ui/dom.js';
import {skillsPage} from './ui/pages/skills-page.js';
import {characterPage} from './ui/pages/character-page.js';
import {craftingPage} from './ui/pages/crafting-page.js';
import {bind} from './ui/scope.js';

// Character tracks shown on the Proficiencies page rather than Skills.
const PROFICIENCY_GROUPS=['weapon','armorSlot','element'];

// Shared journal pages. Tutorial guidance is optional and does not own recipes or skills.
// Page visibility, the tab bar and tab availability belong to the panel host (`panels`).
export function createGameMenus({getInventory,getSkills,getCharacter=()=>null,trackSkills=()=>{},startCraft,craftActive=()=>null,items={}}){
 const $=id=>document.getElementById(id),events={};
 const host=document.createElement('div');host.id='game-menus';
 host.append(h('nav',{id:'game-menu-bar',class:'q-tabbar',hidden:true,'aria-label':'Journal pages'}));
 document.body.append(host);
 // Plain pages close through the shared close rules (events.beforeClose), like their × buttons.
 const panels=createPanelHost({defaultDismiss:()=>closeMenus('dismiss')});
 const bar=$('game-menu-bar');
 mount(()=>{bind(()=>{bar.hidden=!panels.navShown.value;});return panelTabs(bar,panels,{balance:72});});
 // Crafting page (ui/pages/crafting-page.js). The chosen recipe is host state so tutorials and
 // areas can follow it and guide its stable element ids. Nothing is chosen until the player picks.
 const selectedRecipe=signal(null),viewingRecipe=signal(false);
 function selectRecipe(id){if(!(id in RECIPES))return;selectedRecipe.value=id;viewingRecipe.value=true;events.selected?.(id);}
 const panel=mount(()=>h('section',{id:'crafting-panel','aria-label':'Crafting',hidden:true},craftingPage({
  inventory:getInventory(),skills:()=>(trackSkills(),getSkills()),active:craftActive,start:startCraft,onStarted:id=>{if(guided.peek()?.recipe===id)guided.value=null;action();},
  selected:selectedRecipe,viewing:viewingRecipe,onSelect:selectRecipe}))).node;
 host.append(panel);
 function openCrafting(id){if(id)selectRecipe(id);panels.open('crafting');}
 // Character page (ui/pages/character-page.js): core level over Attributes, Skills (non-combat,
 // combat and armor skills) and Proficiencies (weapon, armor-slot and element). Tutorial guidance
 // (setSkillGuidance {locked, section, guide}) locks closing and highlights the lesson's sub-tab and
 // skill without choosing them; events.skillToggled(name, open) follows the player's rows. Records
 // and the character push their own changes. `section` remembers the sub-tab between visits.
 const guidance=signal({}),section=signal('attributes'),character=getCharacter();
 const proficiency=skill=>PROFICIENCY_GROUPS.includes(skill.group);
 const pick=test=>()=>Object.fromEntries(Object.entries(getSkills()).filter(([,skill])=>test(skill)));
 const skillsList=()=>skillsPage({skills:pick(skill=>!proficiency(skill)),track:trackSkills,guidance,onToggle:(name,open)=>events.skillToggled?.(name,open)});
 const proficiencyList=()=>skillsPage({skills:pick(proficiency),track:trackSkills,noun:'proficiencies',empty:'Use weapons, armor and elements to train their proficiencies.'});
 const characterPanel=mount(()=>h('section',{id:'character-panel','aria-label':'Character',hidden:true},
  characterPage({character,section,guide:()=>guidance.value.section??null,skills:skillsList,proficiencies:proficiencyList,onAllocate:()=>events.attributesChanged?.()}))).node;
 host.append(characterPanel);
 const unspentPoints=computed(()=>!!character&&(character.revision.value,character.unspent>0));
 const inventoryMenu=createInventoryMenu({host,inventory:getInventory(),...items,onSelect:id=>events.inventorySelected?.(id)});
 function openInventory(){panels.open('inventory');}
  function openCharacter(){panels.open('character');}
  function openSkills(){section.value='skills';openCharacter();}
  function action(){if(events.action)events.action();else closeMenus();}
 function closeMenus(reason='automatic'){if(events.beforeClose?.(reason)===false)return;panels.close();}

 // Tutorials may intercept a tab (events.open*) to run a lesson step instead.
 // Tutorials intercept the tab (events.openSkills) for the skills lesson.
 panels.register({id:'character',label:'Character',icon:'character',order:20,primary:true,element:characterPanel,badge:unspentPoints,select:()=>{if(!events.openSkills?.())openCharacter();},closeLocked:computed(()=>!!guidance.value.locked)});
 panels.register({id:'inventory',label:'Inventory',icon:'inventory',order:30,primary:true,element:inventoryMenu.panel,select:()=>{if(!events.openInventory?.())openInventory();},closeLocked:inventoryMenu.locked,dismiss:()=>{if(!events.inventoryLocked?.())closeMenus('dismiss');}});
 panels.register({id:'crafting',label:'Crafting',icon:'crafting',order:40,primary:true,element:panel,select:()=>{if(!events.openCrafting?.())openCrafting();},dismiss:()=>{closeMenus('dismiss');events.closeCrafting?.();}});
 // Step-by-step guidance through the menus ("Show me how", lessons): highlight the page's tab until
 // the player opens it, then what to pick, then what to press. It never opens or chooses for them.
 //   guide({page:'crafting',recipe}) — the Crafting tab, the recipe, then its Craft button
 //   guide({page:'inventory',item,action}) — the Inventory tab, the item, then its action (optional)
 //   guide(null) ends it; starting a guided recipe's craft also ends it.
 // A new guide starts from each page's list, with no recipe chosen.
 const guided=signal(null);let itemStep=false;
 function guide(value){
  guided.value=value||null;
  if(value?.recipe){selectedRecipe.value=null;viewingRecipe.value=false;}
 }
 effect(()=>{
  const g=guided.value,page=panels.active.value;
  for(const node of host.querySelectorAll('[data-menu-guide]')){node.classList.remove('gold-guide');node.removeAttribute('data-menu-guide');}
  const onPage=!!g&&page===g.page;
  let id=g&&!onPage?panels.entry(g.page)?.tab:null;
  if(onPage&&g.recipe)id=viewingRecipe.value&&selectedRecipe.value===g.recipe?`craft-${g.recipe}`:`choose-${g.recipe}`;
  const items=onPage&&!!g.item;
  if(items!==itemStep||items){itemStep=items;untracked(()=>inventoryMenu.guide(items?{item:g.item,action:g.action}:false));}
  if(id)for(const node of host.querySelectorAll(`#${id},[data-tab="${id}"]`)){node.classList.add('gold-guide');node.dataset.menuGuide='';}
 });
 return {host,panels,characterPanel,inventoryMenu,events,selectRecipe,guide,get guided(){return guided.peek();},get selectedRecipe(){return selectedRecipe.peek();},characterSection:computed(()=>section.value),openCrafting,openInventory,openCharacter,openSkills,closeMenus,action,setSkillGuidance(value){guidance.value=value;}};
}
