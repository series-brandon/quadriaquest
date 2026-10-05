import {createQuestPanel} from './quests.js';
import {icon} from './icons.js';
import {mountJournalTutorialLock} from './journal-tutorial-lock.js';
export function mountJournal(menus,controller,settings){
 const $=id=>document.getElementById(id),host=$('game-menus'),nav=$('game-menu-bar');
 const shell=document.createElement('section');shell.id='journal';shell.hidden=true;shell.setAttribute('aria-label','Adventurer’s journal');
 shell.innerHTML=`<header class="journal-header"><span>Adventurer’s journal</span><button id="journal-size" aria-label="Expand journal">${icon('expand')}</button><button id="journal-close" aria-label="Close journal">${icon('close')}</button></header>`;
 const tutorialLock=mountJournalTutorialLock(host,controller);
 let suspendedPanels=[],suspendedNav=true;
 function closeQuests(){if(controller.stage==='quests-detail')return;questPanel.hidden=true;for(const node of suspendedPanels)node.hidden=false;nav.hidden=suspendedPanels.length?suspendedNav:true;suspendedPanels=[];}
 const questPanel=createQuestPanel(host,closeQuests);
 const questButton=document.createElement('button');questButton.id='open-quests';questButton.innerHTML=icon('quests')+'<span>Quests</span>';nav.prepend(questButton);
 questButton.onclick=()=>{if(controller.stage.startsWith('quests-')&&controller.stage!=='quests-menu')return;if(!questPanel.hidden)return;suspendedNav=nav.hidden;suspendedPanels=['inventory','skills','crafting','companions','settings','combat','equipment'].map(name=>$(name+'-panel')).filter(node=>node&&!node.hidden);for(const node of suspendedPanels)node.hidden=true;questPanel.hidden=false;controller.questsOpened();};
 nav.addEventListener('click',e=>{if(!questPanel.hidden&&e.target.closest('button')!==questButton)closeQuests();},{capture:true});
 $('game-menu-toggle').addEventListener('click',e=>{if(!questPanel.hidden){e.stopImmediatePropagation();closeQuests();}},{capture:true});
 const settingsButton=document.createElement('button');settingsButton.id='open-settings';settingsButton.innerHTML=icon('settings')+'<span>Settings</span>';settingsButton.onclick=()=>{menus.closeMenus('switch');settings.mount(settingsPanel);settingsPanel.hidden=false;};nav.append(settingsButton);
 const settingsPanel=document.createElement('section');settingsPanel.id='settings-panel';settingsPanel.hidden=true;settingsPanel.setAttribute('aria-label','Settings');settingsPanel.innerHTML='<div class="crafting-heading"><button aria-label="Close settings">×</button></div>';settingsPanel.querySelector('button').onclick=()=>menus.closeMenus('dismiss');
 host.append(shell);shell.append(nav,questPanel,settingsPanel,$('inventory-panel'),$('skills-panel'),$('crafting-panel'));
 let expanded=false;try{expanded=(localStorage.getItem('quadriaquest-journal-expanded')??localStorage.getItem('quadra-journal-expanded'))==='true';}catch{}
 const desktop=matchMedia('(min-width:701px)');
 function resize(){shell.classList.toggle('expanded',expanded&&desktop.matches);$('journal-size').setAttribute('aria-label',expanded?'Minimize journal':'Expand journal');}
 desktop.addEventListener('change',resize);resize();$('journal-size').onclick=()=>{expanded=!expanded;resize();try{localStorage.setItem('quadriaquest-journal-expanded',expanded);}catch{}};
 $('game-menu-toggle').innerHTML=icon('inventory');$('game-menu-toggle').setAttribute('aria-label','Open adventurer’s journal');
 for(const name of ['skills','inventory','crafting'])$('open-'+name).innerHTML=icon(name)+`<span>${name[0].toUpperCase()+name.slice(1)}</span>`;
 const activeClose=()=>['inventory','skills','crafting','quests','companions','settings','combat','equipment'].map(name=>$(name+'-panel')).find(panel=>panel&&!panel.hidden)?.querySelector('.crafting-heading button');
 const mobile=matchMedia('(max-width:700px)'),tip=$('gather-tutorial'),tipParent=tip.parentElement;
 function closePage(){if((docked&&desktop.matches)||tutorialLock.locked)return;const close=activeClose();if(close?.disabled)return;if(close)close.click();menus.closeMenus('dismiss');}
 $('journal-close').onclick=closePage;
 let last='quests',docked=false;
 const sync=()=>{
  const lastTab=nav.querySelector('[data-journal-last]');if(lastTab?.nextElementSibling)nav.append(lastTab);
  for(const button of nav.querySelectorAll('button')){const label=button.querySelector('span')?.textContent;if(label){if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',label);button.title=label;}}
  const active=['inventory','skills','crafting','quests','companions','settings','combat','equipment'].find(name=>$(name+'-panel')&&!$(name+'-panel').hidden);
  if(docked&&desktop.matches&&!tutorialLock.locked&&nav.hidden)nav.hidden=false;
  if(docked&&desktop.matches&&!active&&!tutorialLock.locked){const button=$(last==='combat'?'open-combat-styles':'open-'+last);if(button&&!button.hidden)button.click();}
  const hide=!(docked&&desktop.matches)&&!active&&nav.hidden;if(shell.hidden!==hide)shell.hidden=hide;
  shell.classList.toggle('has-page',!!active);
  if(mobile.matches&&!hide){if(tip.parentElement!==shell)shell.append(tip);}
  else if(tip.parentElement!==tipParent)tipParent.append(tip);

  if(active)last=active;const heading=shell.querySelector('.journal-header>span'),title=active?active[0].toUpperCase()+active.slice(1):'Adventurer’s journal';if(heading.textContent!==title)heading.textContent=title;

  const questClose=questPanel.querySelector('.crafting-heading button');const locked=controller.stage==='quests-detail';if(questClose.disabled!==locked)questClose.disabled=locked;
  const close=activeClose();if($('journal-close').disabled!==!!close?.disabled)$('journal-close').disabled=!!close?.disabled;
  for(const name of ['inventory','skills','crafting','quests','companions','settings','combat','equipment'])$(name==='combat'?'open-combat-styles':'open-'+name)?.setAttribute('aria-current',String(active===name));
  $('game-menu-toggle').setAttribute('aria-expanded',String(!shell.hidden));
  tutorialLock.sync();
 };
 new MutationObserver(sync).observe(host,{subtree:true,attributes:true,attributeFilter:['hidden','disabled','class'],childList:true});mobile.addEventListener('change',sync);sync();
 // Keep the tutorial's explicit tab-selection steps, but skip the extra menu in free play.
 $('game-menu-toggle').addEventListener('click',()=>{
  if(['done','inactive','chop','mine'].includes(controller.stage)&&!nav.hidden){
   const next=$('open-'+last)?.hidden?'skills':last;$(next==='combat'?'open-combat-styles':'open-'+next).click();
  }
 });
 $('game-menu-toggle').addEventListener('click',e=>{if(!shell.hidden&&['done','inactive','chop','mine'].includes(controller.stage)){e.stopImmediatePropagation();menus.closeMenus('dismiss');}},{capture:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!shell.hidden){e.preventDefault();closePage();}});
 return {setDocked(value){if(docked===value)return;docked=value;sync();},compact(){expanded=false;resize();},get locked(){return tutorialLock.locked;},get expanded(){return expanded;},open:()=>{$('game-menu-toggle').click();},expand(){expanded=true;resize();}};
}
