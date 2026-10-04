import {icon} from './icons.js';

// One source of truth for both the journal and brief on-screen updates.
export const objectives=new Map();
let notification,timer,panel,selectedChapter=null,detailOpen=false;
const helpActions=new Map();
export function setObjectiveHelp(id,action){if(action)helpActions.set(id,action);else helpActions.delete(id);render();}
export function updateObjective(id,title,description,current=0,total=1){
 const previous=objectives.get(id);
 const goal={id,title,description,current:Math.min(current,total),total};
 objectives.set(id,goal);render();
 if(previous&&previous.current===goal.current&&previous.title===title&&previous.description===description)return;
 if(!notification){notification=document.createElement('aside');notification.id='objective-update';notification.setAttribute('role','status');document.body.append(notification);}
 notification.replaceChildren();const label=document.createElement('strong');label.textContent=`${goal.current===total?'✓ ':''}${title} · ${goal.current}/${total}`;
 const progress=document.createElement('progress');progress.max=total;progress.value=goal.current;notification.append(label,progress);
 notification.classList.toggle('complete',goal.current===total);notification.hidden=false;notification.classList.remove('fading');clearTimeout(timer);
 timer=setTimeout(()=>{notification.classList.add('fading');timer=setTimeout(()=>{notification.hidden=true;},650);},4500);
}
export function finishObjective(id){const g=objectives.get(id);if(g)updateObjective(id,g.title,g.description,g.total,g.total);}
export function resetObjectives(prefix){if(prefix){for(const id of objectives.keys())if(id.startsWith(prefix)){objectives.delete(id);helpActions.delete(id);}}else{objectives.clear();helpActions.clear();}clearTimeout(timer);if(notification)notification.hidden=true;render();}
function render(){
 if(!panel)return;const root=panel.querySelector('.quest-list');root.replaceChildren();
 panel.classList.toggle('viewing-detail',detailOpen);
 if(!objectives.size){root.textContent='Your next adventure will appear here.';return;}
 const chapters=['A Small Beginning','Broken Bridge Rescue'].filter(chapter=>[...objectives.values()].some(g=>(g.id.startsWith('willow-')?'Broken Bridge Rescue':'A Small Beginning')===chapter));
 if(!chapters.includes(selectedChapter))selectedChapter=chapters[0];
 const choices=document.createElement('div'),list=document.createElement('section');choices.className='journal-list';list.className='journal-detail';root.className='quest-list journal-browser';root.append(choices,list);
 for(const chapter of chapters){const button=document.createElement('button');button.className='journal-entry';button.textContent=chapter;button.setAttribute('aria-pressed',String(chapter===selectedChapter));button.onclick=()=>{selectedChapter=chapter;detailOpen=true;render();};choices.append(button);}
 const back=document.createElement('button');back.className='journal-back';back.textContent='Back to quests';back.onclick=()=>{detailOpen=false;render();};list.append(back);
 for(const chapter of ['A Small Beginning','Broken Bridge Rescue']){
 const goals=[...objectives.values()].filter(g=>(g.id.startsWith('willow-')?'Broken Bridge Rescue':'A Small Beginning')===chapter);if(!goals.length||chapter!==selectedChapter)continue;
 const heading=document.createElement('h3');heading.textContent=chapter;list.append(heading);
 for(const done of [false,true]){
  const section=document.createElement('ul');section.className=done?'quest-tasks completed-tasks':'quest-tasks';
  section.setAttribute('aria-label',done?'Completed tasks':'Current tasks');
  for(const g of goals){
   if((g.current===g.total)!==done)continue;
   const row=document.createElement('li'),title=document.createElement('h4'),description=document.createElement('p'),progress=document.createElement('progress'),count=document.createElement('small');
   title.textContent=g.title;description.textContent=g.description;progress.max=g.total;progress.value=g.current;progress.setAttribute('aria-label',g.title);count.textContent=`${g.current} / ${g.total}${done?' · Complete':''}`;
   if(done){row.className='completed-task';title.textContent='✓ '+g.title;count.textContent='Completed';row.append(title,count);section.append(row);continue;}
   row.append(title,description,progress,count);if(!done&&helpActions.has(g.id)){const help=document.createElement('button');help.className='quest-help';help.textContent='Show me how';help.onclick=helpActions.get(g.id);row.append(help);}section.append(row);
  }
  list.append(section);
 }
 }
}
export function createQuestPanel(host,close){
 panel=document.createElement('section');panel.id='quests-panel';panel.hidden=true;panel.setAttribute('aria-label','Quests');
 panel.innerHTML=`<div class="crafting-heading"><h2>Quests</h2><button aria-label="Close quests">${icon('close')}</button></div><div class="quest-list"></div>`;
 panel.resetView=()=>{detailOpen=false;render();};panel.querySelector('button').onclick=close;host.append(panel);render();return panel;
}
