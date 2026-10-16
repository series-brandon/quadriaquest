import * as THREE from 'three';
import {getCheckpoint} from './tutorial-checkpoints.js';
import {propModel,placePropModel} from '../props.js';
import {mergeStatic} from '../static-merge.js';
// Playground-only, repeatable performance scenarios. Each setup uses the real gameplay entry points
// (checkpoints, travel, menus, combat fixtures) and then pins the camera, pointer and idle state.
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const DEG=Math.PI/180,DEFAULT_VIEW={angle:Math.PI/4,elevation:35.264*DEG,zoom:22};

// The view-density sweep (docs/PERFORMANCE.md, Density): real props (props.js) filling a disc that covers the
// default view round the clearing walk, more at each step. `separate`: each prop its own mesh, as clickable props
// are. `merged`: the same props merged per quarter of the disc, as a town chunk's always-visible decoration is
// (static-merge.js), so triangles grow while draws stay flat. Comparing the two at equal props separates the cost
// of draw calls from the cost of triangles and pixels.
const DENSITY_KINDS=['bench','barrel','crates','sacks','chair','tableRound','planter','lampPost','hedge','rockMedium','bush','cart','well','signpost','stool','woodpile'];
const DENSITY_CENTER=[7.5,7],DENSITY_RADIUS=12,GOLDEN=Math.PI*(3-Math.sqrt(5));
export const DENSITY_STEPS=[...[0,100,250,500,1000,1500,2000,3000,4000,5000,6000,8000].map(props=>({series:'separate',props})),...[1000,2000,4000,8000,12000,16000].map(props=>({series:'merged',props}))];

export const PERF_SCENARIOS=[
 {id:'splash',description:'Title garden and its own shadow light'},
 {id:'clearing-idle',description:'Clearing at rest: terrain, water, shadows, idle player'},
 {id:'clearing-walk',description:'Continuous walking in the clearing: movement and camera follow'},
 {id:'willowbank-river',description:'Willowbank with the river, actors and companion in view'},
 {id:'cinderhold-combat',stochastic:true,description:'Continuous melee against practice enemies in the Cinderhold recruit yard'},
 {id:'minimap-sprint',description:'Sprint movement, destination marker, zoomed minimap and resource updates'},
 {id:'menus',description:'Inventory journal page open over the clearing'},
 {id:'dialogue',description:'Character dialogue with the portrait renderer active'},
 {id:'travel',kind:'travel',description:'Crystal travel round trips (spikes and leak check)'},
 {id:'city-walk',description:'Kit street (city Phases 4–8): walking across the town square past buildings, props and its 14 townsfolk'},
 {id:'city-crowd',description:'Kit street square with a generated crowd of 60 townsfolk (crowd budget rings)'},
 {id:'capital-square',description:'The capital (160 × 160, city Phase 9): the town square at the default view, chunks streamed, its townsfolk'},
 {id:'overworld-pan',description:'The overworld (384 × 384) in the world editor, the free camera panning back and forth across it at zoom 40: chunks of land, nature, water and the map\'s content streaming in and out'},
 {id:'biome-atmosphere',stochastic:true,description:'The Biome test\'s broadleaf forest: walking among its trees in its fog (atmosphere.js); goblins wander in and out of view, redrawing the shadows'},
 {id:'mist-edge',description:'The overworld\'s north edge in the world editor at zoom 40: the mist wall\'s soft layers across the view (mist-wall.js)'},
 {id:'countryside-walk',description:'Gelton\'s countryside (docs/WORLD.md): walking the west road out of the city and back, loading and unloading countryside chunks (woods, rocks, goblins) on the way'},
 // A measurement, not a gate: run it by name (`--scenarios view-density`); the report prints its curve and knee.
 {id:'view-density',kind:'sweep',manual:true,steps:DENSITY_STEPS,description:'Walking in the clearing with more and more real props in view, separate then merged: where draws or triangles start to cost frame time'}
];

// density: {scene, quality (render-quality.js), tileAt(x, z)} for the view-density sweep.
export function createPerfScenarios({api,probe,setView,walkTo,state,density}){
 let timers=[],densityGroup=null;
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
 let cleanups=[];
 function clear(){for(const t of timers)clearInterval(t);timers=[];for(const f of cleanups)f();cleanups=[];clearDensity();}
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
  async 'minimap-sprint'(){api.reset('all');await dismiss();settle();api.resources.toggle();document.querySelector('.overview-map canvas').dispatchEvent(new WheelEvent('wheel',{deltaY:100,cancelable:true}));const ends=[[6,6],[9,8]];let next=1;every(200,()=>{if(state().moving)return;const [x,z]=ends[next];next=1-next;walkTo(x,z);});},
  async menus(){api.reset('all');await dismiss();settle();api.openInterface('inventory');},
  async dialogue(){await checkpoint('willowbank:dialogue',{keepDialogue:true});settle();},
  async travel(){api.reset('all');await dismiss();settle();},
  async 'city-walk'(){api.reset('all');await dismiss();await api.enterMap('kit-street');await wait(800);settle();const ends=[[27,29],[33,35]];let next=1;every(200,()=>{if(state().moving)return;const [x,z]=ends[next];next=1-next;walkTo(x,z);});},
  async 'countryside-walk'(){api.reset('all');await dismiss();await api.countrysideJump([-6,87]);await wait(1500);settle();const ends=[[-6,87],[-40,87]];let next=1;every(200,()=>{if(state().moving)return;const [x,z]=ends[next];next=1-next;walkTo(x,z);});},
  async 'capital-square'(){api.reset('all');await dismiss();await api.enterCapital();await wait(1500);settle();},
  async 'overworld-pan'(){api.reset('all');await dismiss();const {default:data}=await import('../maps/overworld.json');await api.editMap(structuredClone(data),{keepPlayer:false});await wait(1500);
   settle({...DEFAULT_VIEW,zoom:40});api.freeCamera(true);const key=(type,k)=>dispatchEvent(new KeyboardEvent(type,{key:k}));let dir='w';key('keydown',dir);
   every(3000,()=>{key('keyup',dir);dir=dir==='w'?'s':'w';key('keydown',dir);});cleanups.push(()=>{key('keyup','w');key('keyup','s');api.freeCamera(false);});},
  async 'biome-atmosphere'(){api.reset('all');await dismiss();await api.enterBiomeTest('forest');await wait(2500);settle();const at=state().tile,ends=[[at.x,at.z],[at.x+5,at.z]];let next=1;every(200,()=>{if(state().moving)return;const [x,z]=ends[next];next=1-next;walkTo(x,z);});},
  async 'mist-edge'(){api.reset('all');await dismiss();const {default:data}=await import('../maps/overworld.json');await api.editMap(structuredClone(data),{keepPlayer:false});await wait(1000);
   settle({...DEFAULT_VIEW,zoom:40});api.lookAt(192,14);await wait(1500);cleanups.push(()=>api.freeCamera(false));},
  async 'city-crowd'(){api.reset('all');await dismiss();await api.enterMap('kit-street');await api.crowd(60);await wait(1500);settle();},
  // The tier Auto picked at load is pinned, so it can't step down halfway through the sweep (restored on stop).
  async 'view-density'(){api.reset('all');await dismiss();settle();const {quality}=density,was=quality.mode.peek();quality.setMode(quality.tier.peek());
   cleanups.push(()=>quality.setMode(was));densityStep(0);
   const ends=[[6,6],[9,8]];let next=1;every(200,()=>{if(state().moving)return;const [x,z]=ends[next];next=1-next;walkTo(x,z);});}
 };
 function clearDensity(){if(!densityGroup)return;densityGroup.removeFromParent();densityGroup.traverse(o=>{if(o.name==='static-merged')o.geometry.dispose();});densityGroup=null;}
 // One step of the sweep, built fresh. Props share their kind's cached geometry and material (props.js).
 function densityStep(i){
  const step=DENSITY_STEPS[i];if(!step)throw Error('No view-density step '+i);clearDensity();
  const group=new THREE.Group(),[cx,cz]=DENSITY_CENTER,quarters=step.series==='merged'?[0,1,2,3].map(()=>{const q=new THREE.Group();group.add(q);return q;}):null;group.name='perf-density';
  for(let n=0;n<step.props;n++){
   const kind=DENSITY_KINDS[n%DENSITY_KINDS.length],r=DENSITY_RADIUS*Math.sqrt((n+.5)/step.props),a=n*GOLDEN,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,model=propModel(kind);
   placePropModel(model,kind,[x,z],n%4*90,density.tileAt(Math.round(x),Math.round(z))?.h??0);
   (quarters?quarters[(x<cx?0:1)+(z<cz?0:2)]:group).add(model);
  }
  if(quarters)for(const quarter of quarters){const props=[...quarter.children];mergeStatic(quarter,props);for(const p of props)p.removeFromParent();}
  density.scene.add(group);densityGroup=group;api.wake();
  return {step:i,...step};
 }
 return {
  scenarios:PERF_SCENARIOS,
  async prepare(id){clear();if(!setups[id])throw Error('Unknown perf scenario: '+id);await setups[id]();await wait(300);return {area:state().area};},
  // One crystal loop through every area, returning to the clearing.
  // Arrival introductions can briefly block movement, so departure waits for the area to allow it.
  async travelCycle(){for(const area of ['willowbank','cinderhold','clearing']){let started=false;for(let i=0;i<80&&!started;i++){started=api.travelTo(area);if(!started){await dismiss();await wait(250);}}if(!started)throw Error('Travel unavailable to '+area);await arrive(area);settle();}return {area:state().area};},
  // view-density: build step i (DENSITY_STEPS) in place of the last; the walk and pinned tier carry on.
  sweep:densityStep,
  stop(){clear();},dismiss,view:setView,wake:()=>api.wake(),
  record:()=>probe.record(),collect:()=>probe.collect(),census:()=>probe.census(),hud:show=>probe.hud(show)
 };
}
