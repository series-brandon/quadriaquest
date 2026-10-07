import {RECIPES,canMake,durationFor} from './recipes.js';
import {ITEMS} from './items.js';
import {icon} from './icons.js';
import {createInventoryMenu} from './inventory-menu.js';
import {skillProgress} from './skills.js';
import {ATTRIBUTES,ATTRIBUTE_INFO} from './character.js';
import {levelProgress} from './combat-formulas.js';

// Shared journal pages. Tutorial guidance is optional and does not own recipes or skills.
export function createGameMenus({getInventory,getSkills,getCharacter=()=>null,startCraft,craftState=()=>null,craftBusy=()=>false,equipment={}}){
 const $=id=>document.getElementById(id),events={};
 const host=document.createElement('div');host.id='game-menus';
 host.innerHTML=`<button id="game-menu-toggle" aria-label="Open game menu" aria-expanded="false">☰</button>
 <nav id="game-menu-bar" hidden aria-label="Game menu"><button id="open-skills">Skills</button><button id="open-inventory">Inventory</button><button id="open-crafting">Crafting</button></nav>
 <section id="crafting-panel" hidden aria-label="Crafting"><div class="crafting-heading"><h2>Crafting</h2><button id="close-crafting" aria-label="Close crafting menu">×</button></div><div class="recipe-browser"><div class="recipe-choices"></div><div class="recipe-details"></div></div><p id="recipe-error" role="status"></p></section>`;
 document.body.append(host);
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
 function openCrafting(id){closeMenus('switch');if(id)selectRecipe(id);else selectRecipe(selectedRecipe);panel.hidden=false;refresh();}
 const skillsPanel=document.createElement('section');skillsPanel.id='skills-panel';skillsPanel.hidden=true;skillsPanel.setAttribute('aria-label','Skills');
 skillsPanel.innerHTML='<div class="crafting-heading"><h2>Skills</h2><button id="close-skills" aria-label="Close skills menu">×</button></div><input id="skills-search" class="journal-search" type="search" placeholder="Search skills…" aria-label="Search skills"><section id="character-summary" aria-label="Core level and attributes"></section><div id="skills-list"></div>';host.append(skillsPanel);
 const inventoryMenu=createInventoryMenu(host,getInventory,id=>events.inventorySelected?.(id),()=>{if(!events.inventoryLocked?.())closeMenus('dismiss');},equipment);
 function openInventory(){closeMenus('switch');inventoryMenu.open();}
 let skillGuidance={};
 $('skills-search').oninput=()=>renderSkills();
  const skillRows=new Map();let characterSignature='';
  const whole=n=>Math.floor(n).toLocaleString();
  // Core level and attribute allocation share the production character; +1 spends one unspent point.
  function renderCharacter(){
    const character=getCharacter(),root=$('character-summary');root.hidden=!character;if(!character)return;
    const signature=JSON.stringify([character.core,character.unspent,ATTRIBUTES.map(character.attribute)]);if(signature===characterSignature)return;characterSignature=signature;
    const core=levelProgress(character.core.xp),points=character.unspent;
    root.innerHTML=`<div class="core-level"><strong>Core level ${core.level}</strong><span>${whole(character.core.xp)} core XP</span></div><progress max="1" value="${core.fraction}" aria-label="Core level progress"></progress><small>${whole(Math.ceil(core.remaining))} core XP to level ${core.level+1} · earned from all combat skill and proficiency XP (5 : 1)</small>
      <details class="attribute-list"${points?' open':''}><summary>Attributes · <b>${points} unspent point${points===1?'':'s'}</b></summary><ul>${ATTRIBUTES.map(a=>`<li><span><strong>${a[0].toUpperCase()+a.slice(1)}</strong> <small>${ATTRIBUTE_INFO[a]}</small></span><b>${character.attribute(a)}</b><button type="button" data-allocate="${a}" aria-label="Spend a point on ${a}"${character.canAllocate(a)?'':' disabled'}>+</button></li>`).join('')}</ul><small>Points are permanent for now; redistribution will be offered at Iter Crystals.</small></details>`;
    for(const b of root.querySelectorAll('[data-allocate]'))b.onclick=()=>{if(character.allocate(b.dataset.allocate))events.attributesChanged?.();renderSkills();};
  }
  function renderSkills(){
    renderCharacter();
    if($('close-skills').disabled!==!!skillGuidance.locked)$('close-skills').disabled=!!skillGuidance.locked;
    const skills=getSkills(),search=($('skills-search').value||'').toLowerCase();
    for(const [name,row] of skillRows)if(!skills[name]){row.remove();skillRows.delete(name);}
    for(const [name,skill] of Object.entries(skills)){
      let row=skillRows.get(name);
      if(!row){
        row=document.createElement('details');row.dataset.skill=name;row.className='skill-entry';
        row.innerHTML=`<summary>${icon(skill.icon||name)}<strong>${name}</strong><b></b><progress aria-label="${name} progress"></progress></summary><p></p><progress></progress><small></small><small></small>`;
        skillRows.set(name,row);$('skills-list').append(row);
      }
      const hide=!name.toLowerCase().includes(search);if(row.hidden!==hide)row.hidden=hide;
      const focus=name===skillGuidance.focus;
      // Open once on entering the lesson, without overriding subsequent clicks.
      if(focus&&!row.tutorialFocused)row.open=true;
      row.tutorialFocused=focus;row.classList.toggle('skill-focus',focus);
      const signature=`${skill.level}:${skill.xp}`;
      if(row.skillSignature===signature)continue;
      row.skillSignature=signature;
      const p=skillProgress(skill);
      row.querySelector('b').textContent=`Lv ${p.level}`;
      row.querySelector('p').textContent=`${whole(p.xp)} total XP`;
      const bars=row.querySelectorAll('progress');for(const bar of bars){bar.max=p.span;bar.value=p.into;}
      bars[1].setAttribute('aria-label',`${name} progress toward level ${p.level+1}`);
      const labels=row.querySelectorAll('small');
      labels[0].textContent=`${whole(p.into)} / ${whole(p.span)} XP toward Level ${p.level+1}`;
      labels[1].textContent=`${whole(Math.ceil(p.remaining))} XP to next level`;
    }
  }
  function openSkills(){closeMenus('switch');renderSkills();skillsPanel.hidden=false;}
  function action(){if(events.action)events.action();else closeMenus();}
 function closeMenus(reason='automatic'){if(events.beforeClose?.(reason)===false)return;for(const id of ['combat-panel','equipment-panel'])if($(id))$(id).hidden=true;if($('settings-panel'))$('settings-panel').hidden=true;if($('companions-panel'))$('companions-panel').hidden=true; if($('quests-panel'))$('quests-panel').hidden=true;$('game-menu-bar').hidden=true;$('crafting-panel').hidden=true;skillsPanel.hidden=true;inventoryMenu.close();$('game-menu-toggle').setAttribute('aria-expanded','false');}

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
  if(!inventoryMenu.panel.hidden)inventoryMenu.refresh();if(!skillsPanel.hidden)renderSkills();
 }
 $('open-inventory').onclick=()=>{if(!events.openInventory?.())openInventory();};
 $('open-skills').onclick=()=>{if(!events.openSkills?.())openSkills();};
 $('open-crafting').onclick=()=>{if(!events.openCrafting?.())openCrafting();};
 $('close-skills').onclick=()=>{if(!skillGuidance.locked)closeMenus('dismiss');};
 $('close-crafting').onclick=()=>{closeMenus('dismiss');events.closeCrafting?.();};
 $('game-menu-toggle').onclick=()=>{if(events.toggle?.())return;$('game-menu-bar').hidden=!$('game-menu-bar').hidden;$('game-menu-toggle').setAttribute('aria-expanded',String(!$('game-menu-bar').hidden));};
 return {host,skillsPanel,inventoryMenu,events,selectRecipe,openCrafting,openInventory,openSkills,closeMenus,action,refresh,renderSkills,setSkillGuidance(value){skillGuidance=value;renderSkills();}};
}
