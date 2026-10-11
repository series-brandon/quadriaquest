import {h,mount} from '../ui/dom.js';
import {keyedList} from '../ui/list.js';
import {segmented} from '../ui/controls.js';
import {signal,computed} from '../reactive.js';
import {createCityData,cityHeight,setCityHeight,setCitySurface,SURFACE_NAMES} from '../city-map.js';
import {cityProblems} from '../city-checks.js';
import {planBuilding,BUILDING_PRESETS} from '../building-kit.js';
import {PROPS,PROP_KINDS,propFootprint} from '../props.js';
import {DIRS} from '../city-terrain.js';
import {kitStreetData} from './kit-street.js';
import './city-editor.css';

// The playground city editor (docs/CITY.md, Authoring; city Phase 6). Dev only. It edits a city's data
// and rebuilds it in place with the production builders (city-map.js), so what you edit is exactly
// what the game builds:
//  - tools: inspect, raise/lower height (half blocks), paint surface, place a building (kit preset,
//    rotation), place a prop, lay stairs, draw an edge by hand, erase, set the arrival tile;
//  - Edit / Play: Play is a test walk in place (clicks move you as in the game); Reset rebuilds;
//  - live checks (city-checks.js), each a button that takes you to the problem;
//  - undo / redo, save to the repo (dev server endpoint), copy and download the JSON.
// host (main.js playground API): editCity(data, {keepPlayer}) → built city, setTileClick(fn|null),
// teleport(x, z), toast(text).
const repoCities=import.meta.glob('../maps/*.json',{eager:true,import:'default'});
const SIDE_LABELS={n:'North',e:'East',s:'South',w:'West'};
const TOOLS=[['inspect','Inspect'],['raise','Raise'],['lower','Lower'],['surface','Surface'],['building','Building'],['prop','Prop'],['stairs','Stairs'],['edge','Edge'],['erase','Erase'],['spawn','Arrival']];
export function cityCatalogue(){
 const list=[{id:'kit-street',name:'Kit street (playground)',make:()=>kitStreetData()},{id:'blank',name:'Blank 64 × 64',make:()=>createCityData({id:'new-city',name:'New city',size:[64,64]})}];
 for(const [path,data] of Object.entries(repoCities))list.push({id:'repo:'+path,name:`${data.name} (src/maps/${path.split('/').pop()})`,make:()=>structuredClone(data)});
 return list;
}

export function createCityEditor(host){
 let view=null,data=null,built=null;
 const tool=signal('inspect'),mode=signal('edit'),brush=signal('1'),status=signal(''),problems=signal([]),revision=signal(0);
 const options={surface:signal('cobble'),preset:signal('cottage'),rotation:signal('0'),prop:signal('bench'),dir:signal('n'),length:signal('2'),width:signal('2'),edge:signal('wall'),side:signal('s')};
 const undo=[],redo=[],history=signal({undo:0,redo:0});
 const rebuild=async({keepPlayer=true}={})=>{built=await host.editCity(data,{keepPlayer});problems.value=cityProblems(data,built);revision.value++;};
 const snapshot=()=>{undo.push(JSON.stringify(data));if(undo.length>60)undo.shift();redo.length=0;history.value={undo:undo.length,redo:0};};
 async function change(apply){const before=JSON.stringify(data);snapshot();try{apply();}catch(error){data=JSON.parse(before);undo.pop();history.value={undo:undo.length,redo:redo.length};status.value=error.message;return;}await rebuild();}
 const at=(x,z)=>built?.tiles.get(`${x},${z}`);
 const covers=(entry,x,z,kind)=>{try{if(kind==='building')return planBuilding(entry.desc,[entry.x,entry.z]).tiles.some(([a,b])=>a===x&&b===z);const [w,d]=propFootprint(entry.kind,entry.rotation||0);return x>=entry.x&&x<entry.x+w&&z>=entry.z&&z<entry.z+d;}catch{return false;}};
 function describe(x,z){const t=at(x,z);if(!t)return `${x},${z}: off the map`;
  const what=[t.stair?`stairs (${SIDE_LABELS[t.stair.dir]} up)`:null,data.buildings.find(b=>covers(b,x,z,'building'))?.desc.name,(()=>{const p=data.props.find(p=>covers(p,x,z,'prop'));return p&&PROPS[p.kind]?.name;})(),t.blocked?'solid':null].filter(Boolean);
  return `${x},${z} · height ${t.h} · ${t.surface}${what.length?' · '+what.join(', '):''}`;}
 // Placing over a building, a solid prop, stairs or off the map is refused (the checks still catch overlaps in loaded data).
 const taken=cells=>{for(const [a,b] of cells){const t=at(a,b);if(!t)throw Error(`${a},${b} is off the map.`);if(t.indoor||t.blocked||t.stair)throw Error(`${a},${b} is taken.`);}};
 function brushTiles(x,z){const r=brush.peek()==='3'?1:0,out=[];for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)out.push([x+dx,z+dz]);return out;}
 // A world click in Edit mode applies the tool; in Play mode the game handles it.
 async function click(tile){
  if(mode.peek()!=='edit')return false;const {x,z}=tile,o=Object.fromEntries(Object.entries(options).map(([k,s])=>[k,s.peek()])),rotation=+o.rotation;
  switch(tool.peek()){
   case 'inspect':status.value=describe(x,z);break;
   case 'raise':case 'lower':await change(()=>{for(const [a,b] of brushTiles(x,z)){const h=cityHeight(data,a,b);if(h!==null)setCityHeight(data,a,b,h+(tool.peek()==='raise'?.5:-.5));}});status.value=describe(x,z);break;
   case 'surface':await change(()=>{for(const [a,b] of brushTiles(x,z))setCitySurface(data,a,b,o.surface);});break;
   case 'building':await change(()=>{const desc={...structuredClone(BUILDING_PRESETS[o.preset]),rotation};delete desc.name;desc.name=`${BUILDING_PRESETS[o.preset].name} ${data.buildings.length+1}`;taken(planBuilding(desc,[x,z]).tiles);data.buildings.push({x,z,desc});});status.value=`Placed ${BUILDING_PRESETS[o.preset].name} at ${x},${z}.`;break;
   case 'prop':await change(()=>{const [w,d]=propFootprint(o.prop,rotation),cells=[];for(let b=0;b<d;b++)for(let a=0;a<w;a++)cells.push([x+a,z+b]);taken(cells);data.props.push({kind:o.prop,x,z,rotation});});status.value=`Placed ${PROPS[o.prop].name} at ${x},${z}.`;break;
   case 'stairs':await change(()=>{data.stairs.push({x,z,dir:o.dir,length:+o.length,width:+o.width});});status.value=`Stairs from ${x},${z}, going up ${SIDE_LABELS[o.dir].toLowerCase()}.`;break;
   case 'edge':await change(()=>{const [dx,dz]=DIRS[o.side],b=[x+dx,z+dz],same=e=>[e.a,e.b].map(String).sort().join('|')===[[x,z],b].map(String).sort().join('|');
    data.edges=data.edges.filter(e=>!same(e));if(o.edge!=='none')data.edges.push({a:[x,z],b,kind:o.edge});});break;
   case 'erase':await change(()=>{
    const i=data.buildings.findIndex(b=>covers(b,x,z,'building'));if(i>=0){data.buildings.splice(i,1);return;}
    const j=data.props.findIndex(p=>covers(p,x,z,'prop'));if(j>=0){data.props.splice(j,1);return;}
    const k=data.stairs.findIndex(s=>{const [dx,dz]=DIRS[s.dir],right=[-dz,dx];for(let a=0;a<s.length;a++)for(let b=0;b<(s.width||1);b++)if(s.x+dx*a+right[0]*b===x&&s.z+dz*a+right[1]*b===z)return true;return false;});if(k>=0){data.stairs.splice(k,1);return;}
    const before=data.edges.length;data.edges=data.edges.filter(e=>!(e.a[0]===x&&e.a[1]===z||e.b[0]===x&&e.b[1]===z));if(data.edges.length===before)throw Error('Nothing to erase here.');});break;
   case 'spawn':await change(()=>{data.spawn=[x,z];});status.value=`Arrival at ${x},${z}.`;break;
  }
  return true;
 }
 async function load(next){data=next;undo.length=0;redo.length=0;history.value={undo:0,redo:0};await rebuild({keepPlayer:false});status.value=`Editing ${data.name} (${data.size.join(' × ')}).`;}
 async function step(from,to){if(!from.length)return;to.push(JSON.stringify(data));data=JSON.parse(from.pop());history.value={undo:undo.length,redo:redo.length};await rebuild();}
 const json=()=>JSON.stringify(data,null,1);
 async function save(){
  try{const response=await fetch('/__city-save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:data.id,json:json()})});
   const result=await response.json();status.value=response.ok?`Saved to ${result.path}.`:`Not saved: ${result.error}`;}catch{status.value='Saving needs the playground dev server (npm run dev:debug). Use Copy or Download instead.';}}
 function download(){const link=h('a',{href:URL.createObjectURL(new Blob([json()],{type:'application/json'})),download:`${data.id}.json`});link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
 const select=(label,value,choices)=>h('label',{class:'q-city-editor__field'},label,h('select',{class:'q-select',on:{change:e=>{value.value=e.target.value;}}},choices.map(([id,name])=>h('option',{value:id,selected:()=>value.value===id},name))));
 const shown=(...tools)=>()=>!tools.includes(tool.value);
 const catalogue=cityCatalogue(),choice=signal(catalogue[0].id);
 const label=p=>`${p.severity==='error'?'Error':p.severity==='warning'?'Warning':'Note'} · ${p.tile.join(',')} · ${p.text}`;
 const counts=computed(()=>{const list=problems.value;return `${list.filter(p=>p.severity==='error').length} errors · ${list.filter(p=>p.severity==='warning').length} warnings · ${list.filter(p=>p.severity==='info').length} notes`;});
 function build(){
  return h('aside',{class:'q-city-editor','aria-label':'City editor'},
   h('header',{class:'q-city-editor__head'},h('strong',null,()=>{revision.value;return data?`${data.name} · ${data.size.join(' × ')}`:'City editor';}),h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>editor.close()}},'Close')),
   h('div',{class:'q-city-editor__row'},select('City',choice,catalogue.map(c=>[c.id,c.name])),h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>load(catalogue.find(c=>c.id===choice.peek()).make())}},'Open')),
   segmented({label:'Mode',options:[{value:'edit',label:'Edit'},{value:'play',label:'Play (test walk)'}],value:mode,onChange:v=>{mode.value=v;status.value=v==='play'?'Test walk: clicks move you. Reset rebuilds the edited state.':'Edit: clicks use the tool.';}}),
   h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:()=>rebuild({keepPlayer:false})}},'Reset'),
    h('button',{type:'button',class:'q-button q-button--small',disabled:()=>!history.value.undo,on:{click:()=>step(undo,redo)}},'Undo'),
    h('button',{type:'button',class:'q-button q-button--small',disabled:()=>!history.value.redo,on:{click:()=>step(redo,undo)}},'Redo')),
   h('div',{class:'q-city-editor__tools',hidden:()=>mode.value!=='edit'},TOOLS.map(([id,name])=>h('button',{type:'button',class:'q-button q-button--small','aria-pressed':()=>tool.value===id,on:{click:()=>{tool.value=id;}}},name))),
   h('div',{class:'q-city-editor__options',hidden:()=>mode.value!=='edit'},
    h('div',{hidden:shown('raise','lower','surface')},select('Brush',brush,[['1','1 tile'],['3','3 × 3']])),
    h('div',{hidden:shown('surface')},select('Surface',options.surface,SURFACE_NAMES.map(s=>[s,s]))),
    h('div',{hidden:shown('building')},select('Building',options.preset,Object.entries(BUILDING_PRESETS).map(([id,p])=>[id,p.name]))),
    h('div',{hidden:shown('prop')},select('Prop',options.prop,PROP_KINDS.map(k=>[k,PROPS[k].name]))),
    h('div',{hidden:shown('building','prop')},select('Rotation',options.rotation,[['0','0°'],['90','90°'],['180','180°'],['270','270°']])),
    h('div',{hidden:shown('stairs')},select('Up towards',options.dir,Object.entries(SIDE_LABELS)),select('Length',options.length,[1,2,3,4].map(n=>[String(n),`${n} (${n/2} block${n>2?'s':''})`])),select('Width',options.width,[1,2,3,4,5].map(n=>[String(n),String(n)]))),
    h('div',{hidden:shown('edge')},select('Edge',options.edge,[['wall','Wall'],['window','Window'],['fence','Fence'],['railing','Railing'],['low','Counter'],['door','Door'],['none','Remove']]),select('Side',options.side,Object.entries(SIDE_LABELS)))),
   h('p',{class:'q-page__help',role:'status'},status),
   h('div',{class:'q-city-editor__row'},h('button',{type:'button',class:'q-button q-button--small',on:{click:save}},'Save to repo'),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:async()=>{try{await navigator.clipboard.writeText(json());status.value='Copied the city JSON.';}catch{status.value='Copy failed: use Download.';}}}},'Copy JSON'),
    h('button',{type:'button',class:'q-button q-button--small',on:{click:download}},'Download')),
   h('h3',{class:'q-city-editor__title'},'Checks · ',counts),
   keyedList(h('ol',{class:'q-city-editor__checks'}),problems,p=>`${p.kind}:${p.tile.join(',')}:${p.text}`,p=>h('li',null,h('button',{type:'button',class:'q-city-editor__check','data-severity':p.peek().severity,
    on:{click:()=>{const [x,z]=p.peek().tile;const ok=[[0,0],[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,-1]].some(([dx,dz])=>host.teleport(x+dx,z+dz));status.value=ok?label(p.peek()):`Couldn't stand near ${x},${z}.`;}}},label(p.peek())))));
 }
 const editor={
  get active(){return !!view;},get data(){return data;},get built(){return built;},get problems(){return problems.peek();},tool,mode,options,brush,
  async open(next=kitStreetData()){if(!view){view=mount(build);document.body.append(view.node);host.setTileClick(tile=>click(tile));}await load(next);return editor;},
  close(){host.setTileClick(null);view?.dispose();view=null;},
  click,undo:()=>step(undo,redo),redo:()=>step(redo,undo),
 };
 return editor;
}
