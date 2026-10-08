import {RECIPES} from './recipes.js';
import {createInventoryMenu} from './inventory-menu.js';
import {computed,signal} from './reactive.js';
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
 // areas can choose one (selectRecipe) and guide its stable element ids.
 const selectedRecipe=signal('axes'),viewingRecipe=signal(false);
 function selectRecipe(id){if(!(id in RECIPES))return;selectedRecipe.value=id;viewingRecipe.value=true;events.selected?.(id);}
 const panel=mount(()=>h('section',{id:'crafting-panel','aria-label':'Crafting',hidden:true},craftingPage({
  inventory:getInventory(),skills:()=>(trackSkills(),getSkills()),active:craftActive,start:startCraft,onStarted:()=>action(),
  selected:selectedRecipe,viewing:viewingRecipe,onSelect:selectRecipe}))).node;
 host.append(panel);
 function openCrafting(id){if(id)selectRecipe(id);panels.open('crafting');}
 // Character page (ui/pages/character-page.js): core level over Attributes, Skills (non-combat,
 // combat and armor skills) and Proficiencies (weapon, armor-slot and element). Tutorial guidance
 // (setSkillGuidance) locks closing and opens the lesson's skill; records and the character push
 // their own changes. `section` remembers the sub-tab between visits.
 const guidance=signal({}),section=signal('attributes'),character=getCharacter();
 const proficiency=skill=>PROFICIENCY_GROUPS.includes(skill.group);
 const pick=test=>()=>Object.fromEntries(Object.entries(getSkills()).filter(([,skill])=>test(skill)));
 const skillsList=()=>skillsPage({skills:pick(skill=>!proficiency(skill)),track:trackSkills,guidance});
 const proficiencyList=()=>skillsPage({skills:pick(proficiency),track:trackSkills,noun:'proficiencies',empty:'Use weapons, armor and elements to train their proficiencies.'});
 const characterPanel=mount(()=>h('section',{id:'character-panel','aria-label':'Character',hidden:true},
  characterPage({character,section,skills:skillsList,proficiencies:proficiencyList,onAllocate:()=>events.attributesChanged?.()}))).node;
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
 return {host,panels,characterPanel,inventoryMenu,events,selectRecipe,get selectedRecipe(){return selectedRecipe.peek();},openCrafting,openInventory,openSkills,closeMenus,action,setSkillGuidance(value){guidance.value=value;}};
}
