import * as playwright from 'playwright';
import {readFile} from 'node:fs/promises';
import {ENVIRONMENTS} from './environments.mjs';
import {browserCpuSeconds} from './cpu.mjs';
import {median,mean,round} from './stats.mjs';

const injectSource=await readFile(new URL('./inject.js',import.meta.url),'utf8');
const metricMap=result=>Object.fromEntries(result.metrics.map(m=>[m.name,m.value]));

// Fixed CPU workload timed in the same browser (median of 7), so cross-session timing comparisons
// can be scaled for background load and thermal state. A/B runs don't need it.
export async function calibrate(session){
 const page=await session.browser.newPage();
 try{return await page.evaluate(()=>{const runs=[];for(let r=0;r<7;r++){const start=performance.now();let x=0;const a=new Float64Array(20000);for(let i=0;i<a.length;i++)a[i]=Math.sin(i)*1e3;for(let k=0;k<40;k++){for(let i=0;i<a.length;i++)x+=Math.sqrt(Math.abs(a[i]))*Math.cos(x);a.sort();}runs.push(performance.now()-start);}runs.sort((p,q)=>p-q);return runs[3];});}
 finally{await page.close();}
}
export async function openEnvironment(name){
 const env=ENVIRONMENTS[name];if(!env)throw Error(`Unknown environment "${name}". Known: ${Object.keys(ENVIRONMENTS).join(', ')}`);
 const browser=await playwright[env.browser].launch({headless:true,channel:env.channel,args:env.args||[]});
 return {name,env,browser,close:()=>browser.close()};
}

function topFunctions(profile,limit=15){
 const self=new Map(),byId=new Map(profile.nodes.map(n=>[n.id,n]));let total=0;
 profile.samples.forEach((id,i)=>{const node=byId.get(id),f=node.callFrame;if(f.functionName==='(idle)')return;const dt=profile.timeDeltas[i]/1000;total+=dt;
  const key=`${f.functionName||'(anonymous)'} ${f.url.split('/').pop()}${f.url?':'+(f.lineNumber+1):''}`;self.set(key,(self.get(key)||0)+dt);});
 return [...self].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([fn,ms])=>({fn,ms:round(ms,1),share:round(ms/(total||1),3)}));
}

// One scenario in one environment: a fresh page, real scenario setup, warm-up, then measurement windows.
export async function runScenario(session,{url,scenario,windows=3,windowMs=2500,warmupMs=1500,profile=false,screenshot}){
 const {env,browser}=session;
 const context=await browser.newContext({viewport:env.viewport,deviceScaleFactor:env.deviceScaleFactor,isMobile:env.isMobile,hasTouch:env.hasTouch});
 await context.addInitScript({content:injectSource});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e).slice(0,300)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300));});
 try{
  await page.goto(url);await page.waitForFunction(()=>window.quadriaquest?.perf,null,{timeout:30000});
  const renderer=await page.evaluate(()=>{const gl=document.querySelector('#game canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
  if(env.requireGpu&&/swiftshader|llvmpipe|software/i.test(renderer))throw Error(`${session.name} requires hardware WebGL but got "${renderer}"`);
  const cdp=env.browser==='chromium'?await context.newCDPSession(page):null;
  if(cdp)await cdp.send('Performance.enable');
  await page.evaluate(id=>window.quadriaquest.perf.prepare(id),scenario.id);
  if(cdp&&env.cpuThrottle)await cdp.send('Emulation.setCPUThrottlingRate',{rate:env.cpuThrottle});
  await page.waitForTimeout(warmupMs);
  const cpu=()=>env.processCpu===false?null:browserCpuSeconds();
  async function measure(action){
   const before=cdp?metricMap(await cdp.send('Performance.getMetrics')):null,cpu0=cpu(),t0=performance.now();
   await page.evaluate(()=>{window.quadriaquest.perf.wake();window.__perf.start();window.quadriaquest.perf.record();});
   if(action)await action();else await page.waitForTimeout(windowMs);
   const result=await page.evaluate(()=>({page:window.__perf.stop(),probe:window.quadriaquest.perf.collect()}));
   const wall=(performance.now()-t0)/1000,cpu1=cpu(),after=cdp?metricMap(await cdp.send('Performance.getMetrics')):null;
   const rate=key=>before?(after[key]-before[key])/wall:null;
   return {...result.page,probe:result.probe,cpuPercent:cpu0==null?null:(cpu1-cpu0)/wall*100,layoutsPerSec:rate('LayoutCount'),styleRecalcsPerSec:rate('RecalcStyleCount'),scriptMsPerSec:before?rate('ScriptDuration')*1000:null,taskMsPerSec:before?rate('TaskDuration')*1000:null};
  }
  const samples=[],leak=[];
  if(scenario.kind==='travel'){
   for(let cycle=0;cycle<3;cycle++){
    samples.push(await measure(()=>page.evaluate(()=>window.quadriaquest.perf.travelCycle())));
    // Two collections with a pause: a single pass sometimes leaves recently released travel garbage behind.
    if(cdp){await cdp.send('HeapProfiler.collectGarbage');await page.waitForTimeout(250);await cdp.send('HeapProfiler.collectGarbage');}
    const census=await page.evaluate(()=>window.quadriaquest.perf.census()),heapMB=await page.evaluate(()=>performance.memory?performance.memory.usedJSHeapSize/1048576:null);
    leak.push({cycle,objects:census.objects,geometries:census.geometries,textures:census.textures,programs:census.programs,heapMB:round(heapMB,2)});
   }
  }else for(let i=0;i<windows;i++)samples.push(await measure());
  let cpuProfile=null;
  if(profile&&cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start');await page.waitForTimeout(windowMs);cpuProfile=(await cdp.send('Profiler.stop')).profile;}
  const census=await page.evaluate(()=>window.quadriaquest.perf.census());
  if(screenshot)await page.screenshot({path:screenshot,type:'jpeg',quality:70});
  await page.evaluate(()=>window.quadriaquest.perf.stop());
  return {scenario:scenario.id,renderer,summary:summarize(samples,census),samples:samples.map(stripSample),leak:leak.length?leak:null,census,top:cpuProfile?topFunctions(cpuProfile):null,cpuProfile,errors};
 }finally{await context.close();}
}

const stripSample=s=>({frameMs:s.frameMs.median,frameP95:s.frameMs.p95,intervalP95:s.intervalMs.p95,fps:s.fps,cpuPercent:s.cpuPercent,draws:s.draws,gpuMs:s.probe.gpuMs?.median??null});
function summarize(samples,census){
 const pick=fn=>samples.map(fn).filter(v=>v!=null&&Number.isFinite(v)),med=fn=>{const v=pick(fn);return v.length?round(median(v)):null;};
 const sectionNames=[...new Set(samples.flatMap(s=>Object.keys(s.probe.sections)))];
 return {
  counters:{draws:med(s=>s.draws),threeDrawCalls:med(s=>s.probe.drawCalls),triangles:med(s=>s.probe.triangles),uploadsPerFrame:med(s=>s.uploads),uploadKBPerFrame:med(s=>s.uploadKB),
   textureUploadsPerFrame:med(s=>s.textureUploads),programSwitchesPerFrame:med(s=>s.programSwitches),mutationsPerSec:med(s=>s.mutationsPerSec),layoutsPerSec:med(s=>s.layoutsPerSec),styleRecalcsPerSec:med(s=>s.styleRecalcsPerSec),
   objects:census.objects,visibleMeshes:census.visibleMeshes,programs:census.programs,geometries:census.geometries,textures:census.textures},
  timing:{frameMs:med(s=>s.frameMs.median),frameP95:med(s=>s.frameMs.p95),frameMax:med(s=>s.frameMs.max),intervalP95:med(s=>s.intervalMs.p95),fps:med(s=>s.fps),cpuPercent:med(s=>s.cpuPercent),
   gpuMs:med(s=>s.probe.gpuMs?.median),scriptMsPerSec:med(s=>s.scriptMsPerSec),longTasks:pick(s=>s.longTasks).reduce((a,b)=>a+b,0)},
  sections:Object.fromEntries(sectionNames.map(n=>[n,round(mean(samples.map(s=>s.probe.sections[n]?.mean||0)))]).sort((a,b)=>b[1]-a[1]))
 };
}
