import {getCheckpoint} from './tutorial-checkpoints.js';
// Playground-only, repeatable performance scenarios. Each setup uses the real gameplay entry points
// (checkpoints, travel, menus, combat fixtures) and then pins the camera, pointer and idle state.
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const DEG=Math.PI/180,DEFAULT_VIEW={angle:Math.PI/4,elevation:35.264*DEG,zoom:22};

export const PERF_SCENARIOS=[
 {id:'splash',description:'Title garden and its own shadow light'},
 {id:'clearing-idle',description:'Clearing at rest: terrain, water, shadows, idle player'},
 {id:'clearing-walk',description:'Continuous walking in the clearing: movement and camera follow'},
 {id:'willowbank-river',description:'Willowbank with the river, actors and companion in view'},
 {id:'cinderhold-combat',stochastic:true,description:'Continuous melee against practice enemies in the Cinderhold recruit yard'},
 {id:'menus',description:'Inventory journal page open over the clearing'},
 {id:'dialogue',description:'Character dialogue with the portrait renderer active'},
 {id:'travel',kind:'travel',description:'Crystal travel round trips (spikes and leak check)'}
];

export function createPerfScenarios({api,probe,setView,walkTo,state}){
 let timers=[];
 const canvas=()=>document.querySelector('#game canvas');
 const visible=el=>!!el&&!el.hidden&&el.getClientRects().length>0;
 async function dismiss(){
  for(let i=0;i<40;i++){
   const box=[document.getElementById('character-dialogue'),document.getElementById('dialogue')].find(visible);
   const tip=[...document.querySelectorAll('#gather-tutorial button, .tutorial-tip button')].find(b=>visible(b)&&/dismiss/i.test(b.textContent));
   if(!box&&!tip)return;const choice=box&&[...box.querySelectorAll('.speaker-choices button')].find(visible);(tip||choice||box).click();await wait(350);
  }
 }
 function settle(view=DEFAULT_VIEW){canvas()?.dispatchEvent(new PointerEvent('pointerleave'));setView(view);api.wake();}
 function every(ms,fn){timers.push(setInterval(fn,ms));}
 function clear(){for(const t of timers)clearInterval(t);timers=[];}
 async function checkpoint(id,{keepDialogue=false}={}){await api.loadCheckpoint(getCheckpoint(id));await wait(600);if(!keepDialogue)await dismiss();}
 async function arrive(area){for(let i=0;i<120&&state().area!==area;i++)await wait(100);for(let i=0;i<60&&state().travel;i++)await wait(100);await wait(400);await dismiss();}
 const setups={
  async splash(){api.reset('all');api.showSplash();},
  async 'clearing-idle'(){api.reset('all');await dismiss();settle();},
  async 'clearing-walk'(){api.reset('all');await dismiss();settle();const ends=[[6,6],[9,8]];let next=1;every(200,()=>{if(state().moving)return;const [x,z]=ends[next];next=1-next;walkTo(x,z);});},
  async 'willowbank-river'(){await checkpoint('willowbank:fish');settle({angle:-.3*Math.PI,elevation:55*DEG,zoom:34});},
  async 'cinderhold-combat'(){await checkpoint('cinderhold:unarmed');api.landmark('scrapper');await dismiss();settle({...DEFAULT_VIEW,zoom:16});api.combatAction('spawn');
   // Fight in the recruit yard (outside the arrival court's safe zone); re-engage whenever a fight ends.
   const engage=()=>{const c=state().combat;if(!c.fight&&!c.chase&&!c.defeated&&!state().moving)api.combatAction(c.enemies.some(e=>e.kind==='scrapper'&&!e.opened)?'scrapper':'bruiser');};engage();every(1000,()=>{api.sharedAction('heal');engage();});await wait(2500);},
  async menus(){api.reset('all');await dismiss();settle();api.openInterface('inventory');},
  async dialogue(){await checkpoint('willowbank:dialogue',{keepDialogue:true});settle();},
  async travel(){api.reset('all');await dismiss();settle();}
 };
 return {
  scenarios:PERF_SCENARIOS,
  async prepare(id){clear();if(!setups[id])throw Error('Unknown perf scenario: '+id);await setups[id]();await wait(300);return {area:state().area};},
  // One crystal loop through every area, returning to the clearing.
  // Arrival introductions can briefly block movement, so departure waits for the area to allow it.
  async travelCycle(){for(const area of ['willowbank','cinderhold','clearing']){let started=false;for(let i=0;i<80&&!started;i++){started=api.travelTo(area);if(!started){await dismiss();await wait(250);}}if(!started)throw Error('Travel unavailable to '+area);await arrive(area);settle();}return {area:state().area};},
  stop(){clear();},dismiss,view:setView,wake:()=>api.wake(),
  record:()=>probe.record(),collect:()=>probe.collect(),census:()=>probe.census(),hud:show=>probe.hud(show)
 };
}
