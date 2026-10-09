import {questChapters,questRevision,showObjectiveHelp} from './quests.js';
import {questsPage} from './ui/pages/quests-page.js';
import {mountJournalTutorialLock} from './journal-tutorial-lock.js';
import {computed,signal,untracked} from './reactive.js';
import {h,mount} from './ui/dom.js';
import {iconNode} from './ui/icon.js';
import {bind} from './ui/scope.js';
import {compactViewport} from './ui/viewport.js';

const EXPANDED_KEY='quadriaquest-journal-expanded';

// The adventurer's journal: the shell around the panel host's pages (header, docking,
// expansion), plus the Quests and Settings pages. Which page is open, whether the tab bar
// shows and which tabs exist all live in menus.panels; this module presents that state.
export function mountJournal(menus,controller,settings){
 const $=id=>document.getElementById(id),{panels,host}=menus,nav=$('game-menu-bar');
 const tutorialLock=mountJournalTutorialLock(host,controller);
 const compact=compactViewport(),docked=signal(false),expanded=signal(readExpanded());
 const dockedDesktop=computed(()=>docked.value&&!compact.value);
 const locked=tutorialLock.lockedState;
 const hidden=computed(()=>!dockedDesktop.value&&!panels.active.value&&!panels.navShown.value);

 const questPanel=mount(()=>h('section',{id:'quests-panel','aria-label':'Quests',hidden:true},questsPage({chapters:questChapters,revision:questRevision,help:showObjectiveHelp}))).node;
 panels.register({id:'quests',label:'Quests',icon:'quests',order:10,primary:true,element:questPanel,returnTo:true,
  closeLocked:computed(()=>controller.stageState.value==='quests-detail'),
  select(){
   const stage=controller.stage;
   if(stage.startsWith('quests-')&&stage!=='quests-menu')return;
   if(panels.isOpen('quests'))return;
   panels.open('quests');controller.questsOpened();
  }});

 const settingsView=mount(()=>h('section',{id:'settings-panel','aria-label':'Settings',hidden:true},settings.page()));
 panels.register({id:'settings',label:'Settings',icon:'settings',order:60,element:settingsView.node,
  select(){panels.open('settings');}});

 const shell=mount(()=>h('section',{
  id:'journal','aria-label':'Adventurer’s journal',hidden,
  classes:{expanded:()=>expanded.value&&!compact.value,'has-page':()=>!!panels.active.value},
 },h('header',{class:'journal-header'},
  h('span',null,()=>panels.activeEntry.value?.label??'Adventurer’s journal'),
  h('button',{id:'journal-size',type:'button','aria-label':()=>expanded.value?'Dock journal':'Pop out journal',title:()=>expanded.value?'Dock journal':'Pop out journal',on:{click:toggleExpanded}},
   h('span',{class:'journal-size-icon',hidden:expanded},iconNode('popOut')),h('span',{class:'journal-size-icon',hidden:()=>!expanded.value},iconNode('popIn'))),
  h('button',{id:'journal-close',type:'button','aria-label':'Close journal',disabled:panels.closeLocked,on:{click:closePage}},iconNode('close'))))).node;
 host.append(shell);shell.append(nav,questPanel,settingsView.node,$('inventory-panel'),menus.characterPanel,$('crafting-panel'));

 const tip=$('gather-tutorial'),tipParent=tip.parentElement;
 let last='quests';

 mount(()=>{
  // The docked desktop journal always shows its tabs (lessons guide them) and, outside lessons,
  // a page (the last one used).
  bind(()=>panels.setNavPinned(dockedDesktop.value));
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
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!shell.hidden){e.preventDefault();closePage();}});
 return {setDocked(value){docked.value=!!value;},compact(){expanded.value=false;},
  // The docked sidebar has no header; its edge control pops the journal out.
  popOut(){if(!expanded.peek())toggleExpanded();},
  // Whether an open journal covers the world (phones, or the undocked desktop journal); the docked
  // sidebar never does.
  get covering(){return !hidden.peek()&&!dockedDesktop.peek();},get locked(){return tutorialLock.locked;},get expanded(){return expanded.peek();}};
}

function readExpanded(){
 try{return (localStorage.getItem(EXPANDED_KEY)??localStorage.getItem('quadra-journal-expanded'))==='true';}catch{return false;}
}
