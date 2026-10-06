// Playground-only frame instrumentation. Main-loop phases call lap(); renderer.render is wrapped so
// draw counts and render time are attributed per frame. Inactive probes cost one boolean check per lap.
const quantile=(values,q)=>{if(!values.length)return 0;const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*s.length))];};
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const round=n=>Math.round(n*1000)/1000;

export function createPerfProbe({renderer,scene}){
 let users=0,recording=null,frameStart=0,lapStart=0,sections={},renderMs=0,calls=0,triangles=0,hud=null,hudTimer=null;
 const rolling=[],gl=renderer.getContext(),timer=gl.getExtension?.('EXT_disjoint_timer_query_webgl2'),pendingQueries=[],gpuSamples=[];
 const render=renderer.render.bind(renderer);
 renderer.render=(target,camera)=>{
  if(!users)return render(target,camera);
  let query=null;if(timer&&pendingQueries.length<8){query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);}
  const start=performance.now();render(target,camera);const now=performance.now();renderMs+=now-start;lapStart=now;
  if(query){gl.endQuery(timer.TIME_ELAPSED_EXT);pendingQueries.push(query);}
  calls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;
 };
 function pollGpu(){
  while(pendingQueries.length&&gl.getQueryParameter(pendingQueries[0],gl.QUERY_RESULT_AVAILABLE)){const query=pendingQueries.shift();if(!gl.getParameter(timer.GPU_DISJOINT_EXT))gpuSamples.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}
  if(gpuSamples.length>240)gpuSamples.splice(0,gpuSamples.length-240);
 }
 function summarize(frames){
  const names=new Set(frames.flatMap(f=>Object.keys(f.sections)));
  return {frames:frames.length,
   frameMs:{median:round(quantile(frames.map(f=>f.total),.5)),p95:round(quantile(frames.map(f=>f.total),.95)),mean:round(mean(frames.map(f=>f.total)))},
   sections:Object.fromEntries([...names].map(n=>{const v=frames.map(f=>f.sections[n]||0);return [n,{mean:round(mean(v)),p95:round(quantile(v,.95))}];}).sort((a,b)=>b[1].mean-a[1].mean)),
   drawCalls:round(mean(frames.map(f=>f.calls))),triangles:Math.round(mean(frames.map(f=>f.triangles))),
   gpuMs:timer&&gpuSamples.length?{median:round(quantile(gpuSamples,.5)),p95:round(quantile(gpuSamples,.95))}:null};
 }
 function census(){
  const byKind={},byGroup={};let objects=0,visibleMeshes=0;
  const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
  scene.traverse(o=>{objects++;let top=o;while(top.parent&&top.parent!==scene)top=top.parent;const group=top===scene?'scene':top.name||top.type;byGroup[group]=(byGroup[group]||0)+1;
   if(!(o.isMesh||o.isLine||o.isPoints||o.isSprite)||!visible(o))return;const materials=Array.isArray(o.material)?o.material:[o.material];if(!materials.some(m=>m?.visible))return;
   visibleMeshes++;const key=`${o.type}/${o.geometry?.type}/${materials.map(m=>m.type).join('+')}${o.castShadow?'/shadow':''}`;byKind[key]=(byKind[key]||0)+1;});
  return {objects,visibleMeshes,programs:renderer.info.programs?.length||0,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,byGroup,byKind};
 }
 function drawHud(){
  if(!hud)return;const s=summarize(rolling),top=Object.entries(s.sections).slice(0,4).map(([n,v])=>`${n} ${v.mean.toFixed(2)}`).join(' · ');
  hud.textContent=`frame ${s.frameMs.median.toFixed(2)} ms (p95 ${s.frameMs.p95.toFixed(2)})${s.gpuMs?` · gpu ${s.gpuMs.median.toFixed(2)}`:''}\ndraws ${Math.round(s.drawCalls)} · tris ${s.triangles} · objects ${census().objects}\n${top}`;
 }
 return {
  get active(){return users>0;},
  begin(){frameStart=lapStart=performance.now();sections={};renderMs=0;calls=0;triangles=0;},
  lap(name){if(!users)return;const now=performance.now();sections[name]=(sections[name]||0)+now-lapStart;lapStart=now;},
  end(){
   const total=performance.now()-frameStart;let accounted=renderMs;for(const v of Object.values(sections))accounted+=v;
   const frame={total,calls,triangles,sections:{...sections,render:renderMs,other:Math.max(0,total-accounted)}};
   if(recording)recording.push(frame);rolling.push(frame);if(rolling.length>120)rolling.shift();if(timer)pollGpu();
  },
  record(){users++;recording=[];gpuSamples.length=0;},
  collect(){const frames=recording||[];recording=null;users=Math.max(0,users-1);return summarize(frames);},
  census,
  hud(show){
   if(show&&!hud){users++;hud=document.createElement('pre');hud.id='quadriaquest-perf-hud';hud.setAttribute('aria-live','off');document.body.append(hud);hudTimer=setInterval(drawHud,500);}
   else if(!show&&hud){users=Math.max(0,users-1);clearInterval(hudTimer);hud.remove();hud=null;}
   return !!hud;
  }
 };
}
