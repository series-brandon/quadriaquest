import {RECIPES,canMake,durationFor} from './recipes.js';
import {ITEMS} from './items.js';
import {icon} from './icons.js';
import {createInventoryMenu} from './inventory-menu.js';
import {computed,signal} from './reactive.js';
import {createPanelHost} from './ui/panels.js';
import {panelTabs} from './ui/panel-tabs.js';
import {h,mount} from './ui/dom.js';
import {skillsPage} from './ui/pages/skills-page.js';
import {characterPage} from './ui/pages/character-page.js';

// Character tracks shown on the Proficiencies page rather than Skills.
const PROFICIENCY_GROUPS=['weapon','armorSlot','element'];
import {bind} from './ui/scope.js';

// Shared journal pages. Tutorial guidance is optional and does not own recipes or skills.
// Page visibility, the tab bar and tab availability belong to the panel host (`panels`).
export function createGameMenus({getInventory,getSkills,getCharacter=()=>null,trackSkills=()=>{},startCraft,craftState=()=>null,craftBusy=()=>false,items={}}){
 const $=id=>document.getElementById(id),events={};
 const host=document.createElement('div');host.id='game-menus';
 host.innerHTML=`<button id="game-menu-toggle" aria-label="Open game menu" aria-expanded="false">☰</button>
 <nav id="game-menu-bar" hidden aria-label="Game menu"></nav>
 <section id="crafting-panel" hidden aria-label="Crafting"><div class="crafting-heading"><h2>Crafting</h2><button id="close-crafting" aria-label="Close crafting menu">×</button></div><div class="recipe-browser"><div class="recipe-choices"></div><div class="recipe-details"></div></div><p id="recipe-error" role="status"></p></section>`;
 document.body.append(host);
 // Plain pages close through the shared close rules (events.beforeClose), like their × buttons.
 const panels=createPanelHost({defaultDismiss:()=>closeMenus('dismiss')});
 const bar=$('game-menu-bar');
 mount(()=>{bind(()=>{bar.hidden=!panels.navShown.value;});return panelTabs(bar,panels);});
 const panel=$('crafting-panel'),recipeKinds=Object.keys(RECIPES);
 const back=document.createElement('button');back.className='recipe-back';back.textContent='← All recipes';back.onclick=()=>panel.classList.remove('viewing-recipe');panel.querySelector('.recipe-details').append(back);
 for(const id of recipeKinds){
  const recipe=RECIPES[id],choice=document.createElement('button');choice.className='recipe-choice';choice.id='choose-'+id;choice.innerHTML=icon(id)+' '+recipe.name;choice.onclick=()=>selectRecipe(id);panel.querySelector('.recipe-choices').append(choice);
  const detail=document.createElement('article');detail.id=id+'-detail';detail.className='recipe-detail';detail.hidden=true;
  detail.innerHTML=`<h3>${recipe.name}</h3><p>${ITEMS[id].description}</p><div class="ingredient-counts" id="${id}-ingredients"></div><div class="recipe-facts"><span id="${id}-duration"></span><span>Produces · ${recipe.name} ×1</span></div><button class="recipe" id="craft-${id}">Craft ${recipe.name}</button>`;panel.querySelector('.recipe-details').append(detail);
  $('craft-'+id).onclick=()=>{if(startCraft(id)){action();}else $('recipe-error').textContent='Check the required materials and finish your current action first.';};
 }
 function selectRecipe(id){if(!recipeKinds.includes(id))return;selectedRecipe=id;panel.classList.add('viewing-recipe');for(const kind of recipeKinds){$(kind+'-detail').hidden=kind!==id;$('choose-'+kind).setAttribute('aria-pressed',String(kind===id));}events.selected?.(id);}
 let selectedRecipe='axes';
 function openCrafting(id){if(id)selectRecipe(id);else selectRecipe(selectedRecipe);panels.open('crafting');refresh();}
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

 let recipeSignature='';
 function refresh(){
  const inventory=getInventory(),skills=getSkills(),level=skills.Crafting?.level||1,busy=craftBusy(),active=craftState()?.id;
  const signature=JSON.stringify([inventory,Object.entries(skills).map(([id,s])=>[id,s.level]),busy,active]);
  if(signature!==recipeSignature){recipeSignature=signature;
  for(const id of recipeKinds){const recipe=RECIPES[id],available=!recipe.station&&canMake(inventory,recipe);$('craft-'+id).textContent=recipe.station?'Requires '+recipe.station:'Craft '+recipe.name;$('craft-'+id).disabled=!available||busy;if(active===id)$('craft-'+id).textContent='Crafting…';$('craft-'+id).title=available?'':'Missing the ingredients or tool listed above';
   $(id+'-ingredients').innerHTML=Object.entries({...recipe.cost,...recipe.tools}).map(([item,n])=>`<span class="ingredient ${inventory[item]>=n?'enough':'missing'}">${icon(item)} ${ITEMS[item].name} · ${n} required / ${inventory[item]||0} owned${recipe.tools?.[item]?' · Reusable tool':''}</span>`).join('');
   $(id+'-duration').textContent=`Time · ${Number(durationFor(recipe.duration,skills[recipe.skill]?.level||level).toFixed(2))} seconds`;
  }
  if($('recipe-error').textContent)$('recipe-error').textContent='';}
 }
 // Tutorials may intercept a tab (events.open*) to run a lesson step instead.
 // Tutorials intercept the tab (events.openSkills) for the skills lesson.
 panels.register({id:'character',label:'Character',icon:'character',order:20,primary:true,element:characterPanel,badge:unspentPoints,select:()=>{if(!events.openSkills?.())openCharacter();},closeLocked:computed(()=>!!guidance.value.locked)});
 panels.register({id:'inventory',label:'Inventory',icon:'inventory',order:30,primary:true,element:inventoryMenu.panel,select:()=>{if(!events.openInventory?.())openInventory();},closeLocked:inventoryMenu.locked,dismiss:()=>{if(!events.inventoryLocked?.())closeMenus('dismiss');}});
 panels.register({id:'crafting',label:'Crafting',icon:'crafting',order:40,primary:true,element:panel,select:()=>{if(!events.openCrafting?.())openCrafting();},dismiss:()=>{closeMenus('dismiss');events.closeCrafting?.();}});
 $('close-crafting').addEventListener('click',()=>panels.dismiss());
 $('game-menu-toggle').addEventListener('click',()=>{if(!events.toggle?.())panels.toggleNav();});
 return {host,panels,characterPanel,inventoryMenu,events,selectRecipe,openCrafting,openInventory,openSkills,closeMenus,action,refresh,setSkillGuidance(value){guidance.value=value;}};
}
