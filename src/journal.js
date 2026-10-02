import {createQuestPanel} from './quests.js';
import {icon} from './icons.js';
export function mountJournal(controller,settings){
 const $=id=>document.getElementById(id),host=$('game-menus'),nav=$('game-menu-bar');
 const shell=document.createElement('section');shell.id='journal';shell.hidden=true;shell.setAttribute('aria-label','Adventurer’s journal');
 shell.innerHTML=`<header class="journal-header"><span>Adventurer’s journal</span><button id="journal-size" aria-label="Expand journal">${icon('expand')}</button><button id="journal-close" aria-label="Close journal">${icon('close')}</button></header>`;
 let suspendedPanels=[],suspendedNav=true;
 function closeQuests(){if(controller.stage==='quests-detail')return;questPanel.hidden=true;for(const node of suspendedPanels)node.hidden=false;nav.hidden=suspendedPanels.length?suspendedNav:true;suspendedPanels=[];}
 const questPanel=createQuestPanel(host,closeQuests);
 const questButton=document.createElement('button');questButton.id='open-quests';questButton.innerHTML=icon('quests')+'<span>Quests</span>';nav.prepend(questButton);
 questButton.onclick=()=>{if(controller.stage.startsWith('quests-')&&controller.stage!=='quests-menu')return;if(!questPanel.hidden)return;suspendedNav=nav.hidden;suspendedPanels=['inventory','skills','crafting','companions'].map(name=>$(name+'-panel')).filter(node=>node&&!node.hidden);for(const node of suspendedPanels)node.hidden=true;questPanel.hidden=false;controller.questsOpened();};
 nav.addEventListener('click',e=>{if(!questPanel.hidden&&e.target.closest('button')!==questButton&&e.target.closest('button')?.id!=='open-settings')closeQuests();},{capture:true});
 $('game-menu-toggle').addEventListener('click',e=>{if(!questPanel.hidden){e.stopImmediatePropagation();closeQuests();}},{capture:true});
 const settingsButton=document.createElement('button');settingsButton.id='open-settings';settingsButton.innerHTML=icon('settings')+'<span>Settings</span>';settingsButton.onclick=()=>settings.open();nav.append(settingsButton);
 host.append(shell);shell.append(nav,questPanel,$('inventory-panel'),$('skills-panel'),$('crafting-panel'));
 let expanded=false;try{expanded=localStorage.getItem('quadra-journal-expanded')==='true';}catch{}
 function resize(){shell.classList.toggle('expanded',expanded);$('journal-size').setAttribute('aria-label',expanded?'Minimize journal':'Expand journal');}
 resize();$('journal-size').onclick=()=>{expanded=!expanded;resize();try{localStorage.setItem('quadra-journal-expanded',expanded);}catch{}};
 $('game-menu-toggle').innerHTML=icon('inventory');$('game-menu-toggle').setAttribute('aria-label','Open adventurer’s journal');
 for(const name of ['skills','inventory','crafting'])$('open-'+name).innerHTML=icon(name)+`<span>${name[0].toUpperCase()+name.slice(1)}</span>`;
 const activeClose=()=>['inventory','skills','crafting','quests','companions'].map(name=>$(name+'-panel')).find(panel=>panel&&!panel.hidden)?.querySelector('.crafting-heading button');
 const mobile=matchMedia('(max-width:700px)'),tip=$('gather-tutorial'),tipParent=tip.parentElement;
 function closePage(){const close=activeClose();if(close&&!close.disabled)close.click();else if(!close)controller.closeMenus();}
 $('journal-close').onclick=closePage;
 let last='quests';
 const sync=()=>{
  const active=['inventory','skills','crafting','quests','companions'].find(name=>$(name+'-panel')&&!$(name+'-panel').hidden);
  const hide=!active&&nav.hidden;if(shell.hidden!==hide)shell.hidden=hide;
  shell.classList.toggle('has-page',!!active);
  if(mobile.matches&&!hide){if(tip.parentElement!==shell)shell.append(tip);}
  else if(tip.parentElement!==tipParent)tipParent.append(tip);

  if(active)last=active;

  const questClose=questPanel.querySelector('.crafting-heading button');const locked=controller.stage==='quests-detail';if(questClose.disabled!==locked)questClose.disabled=locked;
  const close=activeClose();if($('journal-close').disabled!==!!close?.disabled)$('journal-close').disabled=!!close?.disabled;
  for(const name of ['inventory','skills','crafting','quests','companions'])$('open-'+name)?.setAttribute('aria-current',String(active===name));
  $('game-menu-toggle').setAttribute('aria-expanded',String(!shell.hidden));
 };
 new MutationObserver(sync).observe(host,{subtree:true,attributes:true,attributeFilter:['hidden','disabled']});mobile.addEventListener('change',sync);sync();
 // Keep the tutorial's explicit tab-selection steps, but skip the extra menu in free play.
 $('game-menu-toggle').addEventListener('click',()=>{
  if(['done','inactive','chop','mine'].includes(controller.stage)&&!nav.hidden){
   const next=$('open-'+last)?.hidden?'skills':last;$('open-'+next).click();
  }
 });
 $('game-menu-toggle').addEventListener('click',e=>{if(!shell.hidden&&['done','inactive','chop','mine'].includes(controller.stage)){e.stopImmediatePropagation();controller.closeMenus();}},{capture:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('game-settings')?.open&&!shell.hidden){const close=activeClose();if(close&&!close.disabled)close.click();else if(!close)controller.closeMenus();}});
 return {open:()=>{$('game-menu-toggle').click();},expand(){expanded=true;resize();}};
}
