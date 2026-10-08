import {createQuestPanel} from './quests.js';
import {mountJournalTutorialLock} from './journal-tutorial-lock.js';
import {computed,signal,untracked} from './reactive.js';
import {h,mount} from './ui/dom.js';
import {iconNode} from './ui/icon.js';
import {bind} from './ui/scope.js';
import {compactViewport} from './ui/viewport.js';

// Free-play stages where the journal button opens or closes the last page directly.
const FREE_STAGES=['done','inactive','chop','mine'];
const EXPANDED_KEY='quadriaquest-journal-expanded';

// The adventurer's journal: the shell around the panel host's pages (header, docking,
// expansion), plus the Quests and Settings pages. Which page is open, whether the tab bar
// shows and which tabs exist all live in menus.panels; this module presents that state.
export function mountJournal(menus,controller,settings){
 const $=id=>document.getElementById(id),{panels,host}=menus,nav=$('game-menu-bar'),toggle=$('game-menu-toggle');
 const tutorialLock=mountJournalTutorialLock(host,controller);
 const compact=compactViewport(),docked=signal(false),expanded=signal(readExpanded());
 const dockedDesktop=computed(()=>docked.value&&!compact.value);
 const locked=tutorialLock.lockedState;
 const hidden=computed(()=>!dockedDesktop.value&&!panels.active.value&&!panels.navShown.value);

 const questPanel=createQuestPanel(host,()=>panels.dismiss());
 panels.register({id:'quests',label:'Quests',icon:'quests',order:10,element:questPanel,returnTo:true,
  closeLocked:computed(()=>controller.stageState.value==='quests-detail'),
  select(){
   const stage=controller.stage;
   if(stage.startsWith('quests-')&&stage!=='quests-menu')return;
   if(panels.isOpen('quests'))return;
   panels.open('quests');controller.questsOpened();
  }});

 const settingsView=mount(()=>h('section',{id:'settings-panel','aria-label':'Settings'},
  h('div',{class:'crafting-heading'},h('button',{type:'button','aria-label':'Close settings',on:{click:()=>panels.dismiss()}},'×'))));
 panels.register({id:'settings',label:'Settings',icon:'settings',order:60,element:settingsView.node,
  select(){panels.open('settings');settings.mount(settingsView.node);}});

 const shell=mount(()=>h('section',{
  id:'journal','aria-label':'Adventurer’s journal',hidden,
  classes:{expanded:()=>expanded.value&&!compact.value,'has-page':()=>!!panels.active.value},
 },h('header',{class:'journal-header'},
  h('span',null,()=>panels.activeEntry.value?.label??'Adventurer’s journal'),
  h('button',{id:'journal-size',type:'button','aria-label':()=>expanded.value?'Minimize journal':'Expand journal',on:{click:toggleExpanded}},iconNode('expand')),
  h('button',{id:'journal-close',type:'button','aria-label':'Close journal',disabled:panels.closeLocked,on:{click:closePage}},iconNode('close'))))).node;
 host.append(shell);shell.append(nav,questPanel,settingsView.node,$('inventory-panel'),menus.characterPanel,$('crafting-panel'));

 toggle.replaceChildren(iconNode('inventory'));toggle.setAttribute('aria-label','Open adventurer’s journal');
 const tip=$('gather-tutorial'),tipParent=tip.parentElement;
 let last='quests';

 mount(()=>{
  bind(()=>toggle.setAttribute('aria-expanded',String(!hidden.value)));
  // The docked desktop journal always shows its tabs and a page (the last one used).
  bind(()=>panels.setNavPinned(dockedDesktop.value&&!locked.value));
  bind(()=>{if(panels.active.value)last=panels.active.value;});
  bind(()=>{
   if(!dockedDesktop.value||locked.value||panels.active.value)return;
   untracked(()=>{const entry=panels.entry(last);if(entry&&panels.available(entry))panels.select(last);});
  });
  // On phones the lesson tip sits inside the open journal.
  bind(()=>{
   const inside=compact.value&&!hidden.value;
   if(inside&&tip.parentElement!==shell)shell.append(tip);
   else if(!inside&&tip.parentElement!==tipParent)tipParent.append(tip);
  });
  return shell;
 });

 function toggleExpanded(){expanded.value=!expanded.peek();try{localStorage.setItem(EXPANDED_KEY,expanded.peek());}catch{}}
 // Close button and Escape: the page's own close, then the shared close rules.
 function closePage(){
  if(dockedDesktop.peek()||tutorialLock.locked||panels.closeLocked.peek())return;
  panels.dismiss();menus.closeMenus('dismiss');
 }
 // Capture so these run before the menu's own toggle handling.
 toggle.addEventListener('click',e=>{
  if(!panels.isOpen('quests'))return;
  e.stopImmediatePropagation();panels.dismiss();
 },{capture:true});
 toggle.addEventListener('click',e=>{
  if(shell.hidden||!FREE_STAGES.includes(controller.stage))return;
  e.stopImmediatePropagation();menus.closeMenus('dismiss');
 },{capture:true});
 // In free play the button opens the last page directly rather than the bare tab bar.
 toggle.addEventListener('click',()=>{
  if(!FREE_STAGES.includes(controller.stage)||!panels.navShown.peek())return;
  const entry=panels.entry(last);panels.select(entry&&panels.available(entry)?last:'character');
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!shell.hidden){e.preventDefault();closePage();}});
 return {setDocked(value){docked.value=!!value;},compact(){expanded.value=false;},get locked(){return tutorialLock.locked;},get expanded(){return expanded.peek();}};
}

function readExpanded(){
 try{return (localStorage.getItem(EXPANDED_KEY)??localStorage.getItem('quadra-journal-expanded'))==='true';}catch{return false;}
}
