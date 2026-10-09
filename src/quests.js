import {signal} from './reactive.js';

// One source of truth for both the journal and brief on-screen updates.
export const objectives=new Map();
const chaptersByPrefix=new Map([['willow-','Broken Bridge Rescue']]);
export function registerQuestChapter(prefix,title){chaptersByPrefix.set(prefix,title);render();}
const chapterFor=g=>[...chaptersByPrefix].find(([prefix])=>g.id.startsWith(prefix))?.[1]||'A Small Beginning';
// The quest-progress pop-up (ui/hud/notices.js `objectiveToast`) shows each real change; null dismisses it.
export const notice=signal(null);
let noticeSeq=0;
// Changes with every objective, chapter or help change; the Quests page follows it.
export const questRevision=signal(0);
const render=()=>{questRevision.value++;};
const helpActions=new Map();
// The page only shows whether help exists, so replacing one action with another changes nothing visible.
export function setObjectiveHelp(id,action){const had=helpActions.has(id);if(action)helpActions.set(id,action);else helpActions.delete(id);if(had!==!!action)render();}
export function updateObjective(id,title,description,current=0,total=1){
 const previous=objectives.get(id);
 const goal={id,title,description,current:Math.min(current,total),total};
 objectives.set(id,goal);
 // Areas re-send unchanged objectives freely; only real changes update the page and the toast.
 if(previous&&previous.current===goal.current&&previous.total===goal.total&&previous.title===title&&previous.description===description)return;
 render();
 notice.value={seq:++noticeSeq,title,current:goal.current,total};
}
export function finishObjective(id){const g=objectives.get(id);if(g)updateObjective(id,g.title,g.description,g.total,g.total);}
export function resetObjectives(prefix){if(prefix){for(const id of objectives.keys())if(id.startsWith(prefix)){objectives.delete(id);helpActions.delete(id);}}else{objectives.clear();helpActions.clear();}notice.value=null;render();}
// Quests for the journal page (ui/pages/quests-page.js): chapters in first-seen order, each with its
// goals and whether they have a "Show me how" action. Read questRevision to follow changes.
export function questChapters(){
 const chapters=new Map();
 for(const goal of objectives.values()){const title=chapterFor(goal);if(!chapters.has(title))chapters.set(title,[]);chapters.get(title).push({...goal,help:helpActions.has(goal.id)});}
 return [...chapters].map(([title,goals])=>({title,goals}));
}
export function showObjectiveHelp(id){helpActions.get(id)?.();}
