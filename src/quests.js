import {signal} from './reactive.js';

// One source of truth for both the journal and brief on-screen updates.
export const objectives=new Map();
const chaptersByPrefix=new Map([['willow-','Broken Bridge Rescue']]);
export function registerQuestChapter(prefix,title){chaptersByPrefix.set(prefix,title);render();}
const DEFAULT_CHAPTER=['','A Small Beginning'];
const chapterFor=g=>[...chaptersByPrefix].find(([prefix])=>g.id.startsWith(prefix))??DEFAULT_CHAPTER;
// Quests whose story has ended, by objective prefix ('' is the clearing's A Small Beginning). Finishing
// every current objective doesn't end a quest: its next objective may not have been given yet.
const finishedQuests=new Set();
// The quest-progress pop-up (ui/hud/notices.js `objectiveToast`) shows each real change; null dismisses it.
export const notice=signal(null);
let noticeSeq=0;
// Changes with every objective, chapter or help change; the Quests page follows it.
export const questRevision=signal(0);
const render=()=>{questRevision.value++;};
const helpActions=new Map();
// The page only shows whether help exists, so replacing one action with another changes nothing visible.
export function setObjectiveHelp(id,action){const had=helpActions.has(id);if(action)helpActions.set(id,action);else helpActions.delete(id);if(had!==!!action)render();}
// parts (optional): [{label, current, total}] portions of one objective (Collect 3 Rocks, Collect 3
// Sticks); the objective's own progress is their sum, so current/total are ignored when given.
export function updateObjective(id,title,description,current=0,total=1,parts=null){
 const previous=objectives.get(id);
 if(parts){parts=parts.map(p=>({label:p.label,current:Math.min(p.current,p.total),total:p.total}));current=parts.reduce((n,p)=>n+p.current,0);total=parts.reduce((n,p)=>n+p.total,0);}
 const goal={id,title,description,current:Math.min(current,total),total,parts};
 objectives.set(id,goal);
 const changed=parts?.filter((p,i)=>p.current!==previous?.parts?.[i]?.current||p.label!==previous?.parts?.[i]?.label)??[];
 // Areas re-send unchanged objectives freely; only real changes update the page and the toast.
 if(previous&&previous.current===goal.current&&previous.total===goal.total&&previous.title===title&&previous.description===description&&!changed.length&&!previous.parts===!parts)return;
 render();
 // When exactly one portion moved, the toast names that portion.
 notice.value={seq:++noticeSeq,title,current:goal.current,total,part:previous&&changed.length===1?changed[0]:null};
}
export function finishObjective(id){const g=objectives.get(id);if(g)updateObjective(id,g.title,g.description,g.total,g.total,g.parts?.map(p=>({...p,current:p.total})));}
export function finishQuest(prefix='',finished=true){if(finishedQuests.has(prefix)===finished)return;if(finished)finishedQuests.add(prefix);else finishedQuests.delete(prefix);render();}
export function resetObjectives(prefix){if(prefix){for(const id of objectives.keys())if(id.startsWith(prefix)){objectives.delete(id);helpActions.delete(id);}finishedQuests.delete(prefix);}else{objectives.clear();helpActions.clear();finishedQuests.clear();}notice.value=null;render();}
// Quests for the journal page (ui/pages/quests-page.js): started quests in first-seen order, each
// with its objectives (in the order given, with whether they have a "Show me how" action) and
// whether its story has ended. Read questRevision to follow changes.
export function questChapters(){
 const chapters=new Map();
 for(const goal of objectives.values()){const [prefix,title]=chapterFor(goal);if(!chapters.has(title))chapters.set(title,{title,prefix,goals:[]});chapters.get(title).goals.push({...goal,help:helpActions.has(goal.id)});}
 return [...chapters.values()].map(({title,prefix,goals})=>({title,goals,complete:finishedQuests.has(prefix)&&goals.every(g=>g.current>=g.total)}));
}
export function showObjectiveHelp(id){helpActions.get(id)?.();}
