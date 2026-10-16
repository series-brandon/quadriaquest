import {bootstrapDelta,round} from './stats.mjs';
const LOWER_IS_BETTER_COUNTERS=['draws','objects','visibleMeshes','programs','geometries','textures','uploadsPerFrame','uploadKBPerFrame','textureUploadsPerFrame','programSwitchesPerFrame','mutationsPerSec','layoutsPerSec'];
const pct=n=>`${n>=0?'+':''}${(n*100).toFixed(1)}%`;

// Gate one environment's results (user, 2026-10-16: fail only on what players feel). FAIL: fps under the target,
// stutter (frame-interval p95) or a hitch (worst gap between frames) over its threshold, leaks across travel, page
// errors. WARN: statistically significant timing/CPU regressions against the stored baseline. Counts (draws,
// objects, triangles, uploads…) are notes only: the map is still being designed, so they grow on purpose.
// A sweep's knee (view-density): per series, the first step whose felt time is clearly worse than the sweep's
// first (empty) step, or misses the environment's targets. lastGood is the step before it in the same series.
export const KNEE={fpsDrop:.1,p95Rise:.25};
export function sweepKnees(steps,target={}){
 const t0=steps[0].summary.timing,out={};
 const bad=({summary:{timing:t}})=>t.fps<t0.fps*(1-KNEE.fpsDrop)||t.intervalP95>t0.intervalP95*(1+KNEE.p95Rise)||(target.minFps&&t.fps<target.minFps)||(target.maxIntervalP95&&t.intervalP95>target.maxIntervalP95);
 for(const series of new Set(steps.map(s=>s.series))){const list=steps.filter(s=>s.series===series),i=list.findIndex(bad);out[series]={knee:i<0?null:list[i],lastGood:i<0?list.at(-1):i>0?list[i-1]:null};}
 return out;
}
const at=step=>`${step.props} props, ${Math.round(step.summary.counters.draws)} draws, ${Math.round(step.summary.counters.triangles/1000)}k triangles, ${round(step.summary.timing.fps,1)} fps, interval p95 ${round(step.summary.timing.intervalP95,1)} ms`;

export function evaluate({envName,env,results,baseline,budgets,calibrationMs,scenarios=[]}){
 const d=budgets.defaults,rows=[];
 // Machine-speed ratio vs the baseline session, clamped; scales baseline frame times (not CPU %, fps or counters).
 // A scenario updated on its own carries its own calibration (meta), else the file's applies.
 const speedFor=base=>{const was=base?.meta?.calibrationMs??baseline?.meta?.calibrationMs;return was&&calibrationMs?Math.min(1.6,Math.max(.6,calibrationMs/was)):1;};
 for(const r of results){
  const issues=[],notes=[],s=r.summary,base=baseline?.scenarios?.[r.scenario],speed=speedFor(base);
  const target={...budgets.targets?.[envName]?.['*'],...budgets.targets?.[envName]?.[r.scenario]};
  // A sweep drives frame time down on purpose: it reports its curve and knee, and fails only on page errors.
  if(r.sweep){
   const knees=sweepKnees(r.sweep,target);
   for(const [series,{knee,lastGood}] of Object.entries(knees))notes.push(`${series}: ${knee?`knee at ${at(knee)}`:'no knee'}${lastGood?`; last good ${at(lastGood)}`:''}`);
   if(r.errors?.length)issues.push({level:'FAIL',text:`${r.errors.length} page error(s): ${r.errors[0]}`});
   rows.push({scenario:r.scenario,status:issues.length?'FAIL':'PASS',issues,notes,knees,diagnosis:null});continue;
  }
  // Density within the view (draws and triangles actually drawn per frame, shadow pass included; not scene
  // totals): limits measured by the view-density sweep, where frame time starts to suffer (docs/PERFORMANCE.md).
  if(target.maxViewDraws&&s.counters.draws>target.maxViewDraws)issues.push({level:'FAIL',text:`density: ${Math.round(s.counters.draws)} draws per frame over ${target.maxViewDraws} (measured knee, view-density)`});
  if(target.maxViewTriangles&&s.counters.triangles>target.maxViewTriangles)issues.push({level:'FAIL',text:`density: ${Math.round(s.counters.triangles)} triangles per frame over ${target.maxViewTriangles} (measured knee, view-density)`});
  if(!env.countersOnly){
   if(target.minFps&&s.timing.fps<target.minFps)issues.push({level:'FAIL',text:`fps ${round(s.timing.fps,1)} below target ${target.minFps}`});
   if(target.maxIntervalP95&&s.timing.intervalP95>target.maxIntervalP95)issues.push({level:'FAIL',text:`stutter: frame interval p95 ${round(s.timing.intervalP95,1)} ms over ${target.maxIntervalP95} ms`});
   if(target.maxIntervalMs&&s.timing.intervalMax>target.maxIntervalMs)issues.push({level:'FAIL',text:`hitch: worst gap between frames ${round(s.timing.intervalMax,1)} ms over ${target.maxIntervalMs} ms`});
  }
  if(r.leak){const steady=r.leak.slice(1);for(const key of ['objects','geometries','textures','programs'])if(new Set(steady.map(c=>c[key])).size>1)issues.push({level:'FAIL',text:`${key} changed across travel cycles: ${steady.map(c=>c[key]).join(' → ')}`});
   const heap=steady.map(c=>c.heapMB).filter(v=>v!=null);if(heap.length>1&&heap.at(-1)-heap[0]>d.heapGrowthMB)issues.push({level:'FAIL',text:`heap grew ${round(heap.at(-1)-heap[0],2)} MB across travel cycles`});}
  if(r.errors?.length)issues.push({level:'FAIL',text:`${r.errors.length} page error(s): ${r.errors[0]}`});
  if(base){
   // Counts against the baseline: reported when they move, never gated.
   for(const key of LOWER_IS_BETTER_COUNTERS){const value=s.counters[key],was=base.summary.counters[key];if(value==null||was==null)continue;
    const tolerance=key.endsWith('PerSec')?d.rateTolerance:d.counterNote,slack=3;
    if(value>was*(1+tolerance)+slack)notes.push(`${key} ${round(value,1)} vs baseline ${round(was,1)} (${pct((value-was)/(was||1))}; not gated)`);
    else if(value<was*(1-tolerance)-slack)notes.push(`${key} ${round(was,1)} → ${round(value,1)} (${pct((value-was)/(was||1))})`);}
   if(!env.countersOnly){
    for(const [key,tolerance,higherIsWorse] of [['frameMs',d.medianTolerance,true],['frameP95',d.p95Tolerance,true],['cpuPercent',d.cpuTolerance,true],['fps',d.fpsTolerance,false]]){
     const scale=key.startsWith('frame')?speed:1,a=base.samples.map(x=>x[key]*scale).filter(Number.isFinite),b=r.samples.map(x=>x[key]).filter(Number.isFinite),ci=bootstrapDelta(a,b);if(!ci)continue;
     const worse=higherIsWorse?ci.relative>tolerance&&ci.low>0:ci.relative<-tolerance&&ci.high<0;
     const better=higherIsWorse?ci.relative<-tolerance&&ci.high<0:ci.relative>tolerance&&ci.low>0;
     if(worse)issues.push({level:'WARN',text:`${key} ${pct(ci.relative)} (95% CI ${pct(ci.low)}…${pct(ci.high)})`});else if(better)notes.push(`${key} improved ${pct(ci.relative)}`);
    }
   }
  }
  const status=issues.some(i=>i.level==='FAIL')?'FAIL':issues.length?'WARN':'PASS';
  rows.push({scenario:r.scenario,status,issues,notes,diagnosis:status==='PASS'?null:diagnose(r,base)});
 }
 return rows;
}

// Where to look first: loop phases that grew, scene contents that changed, hottest functions.
export function diagnose(r,base){
 const out={};
 if(base){
  out.sections=Object.entries(r.summary.sections).map(([k,v])=>[k,round(v-(base.summary.sections[k]||0))]).filter(([,v])=>Math.abs(v)>=.02).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const delta=(now={},was={})=>Object.entries({...was,...now}).map(([k])=>[k,(now[k]||0)-(was[k]||0)]).filter(([,v])=>v).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8);
  out.byGroup=delta(r.census.byGroup,base.census?.byGroup);out.byKind=delta(r.census.byKind,base.census?.byKind);
 }
 if(r.top)out.hotFunctions=r.top.slice(0,10);
 return out;
}

export function formatTable(envName,results,rows){
 const lines=[`\n## ${envName}`,'','| scenario | status | frame ms (p95) | fps | interval p95 / worst ms | browser CPU % | draws | objects | top phases |','|---|---|---|---|---|---|---|---|---|'];
 for(const r of results){const s=r.summary,row=rows.find(x=>x.scenario===r.scenario),phases=Object.entries(s.sections).slice(0,3).map(([k,v])=>`${k} ${v.toFixed(2)}`).join(', ');
  lines.push(`| ${r.scenario} | ${row?.status??'—'} | ${s.timing.frameMs?.toFixed(2)} (${s.timing.frameP95?.toFixed(2)}) | ${s.timing.fps?.toFixed(1)} | ${s.timing.intervalP95?.toFixed(1)} / ${s.timing.intervalMax?.toFixed(0)??'—'} | ${s.timing.cpuPercent?.toFixed(0)??'—'} | ${Math.round(s.counters.draws)} | ${s.counters.objects} | ${phases} |`);}
 for(const row of rows){
  const sweep=results.find(r=>r.scenario===row.scenario)?.sweep;
  if(sweep){lines.push('',`**${row.scenario}** sweep`,'','| step | series | props | draws | triangles | fps | interval p95 / worst ms | frame ms (p95) | GPU ms | render ms |','|---|---|---|---|---|---|---|---|---|---|');
   for(const {step,series,props,summary:{counters:c,timing:t,sections}} of sweep)lines.push(`| ${step} | ${series} | ${props} | ${Math.round(c.draws)} | ${Math.round(c.triangles)} | ${t.fps?.toFixed(1)} | ${t.intervalP95?.toFixed(1)} / ${t.intervalMax?.toFixed(0)} | ${t.frameMs?.toFixed(2)} (${t.frameP95?.toFixed(2)}) | ${t.gpuMs?.toFixed(2)??'—'} | ${sections.render?.toFixed(2)??'—'} |`);}
  if(row.issues.length||row.notes.length)lines.push('',`**${row.scenario}** — ${row.status}`,...row.issues.map(i=>`- ${i.level}: ${i.text}`),...row.notes.map(n=>`- note: ${n}`));
  const g=row.diagnosis;if(!g)continue;
  if(g.sections?.length)lines.push(`- phase change (ms/frame): ${g.sections.map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', ')}`);
  if(g.byGroup?.length)lines.push(`- objects by group: ${g.byGroup.map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', ')}`);
  if(g.byKind?.length)lines.push(`- visible meshes by kind: ${g.byKind.map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', ')}`);
  if(g.hotFunctions?.length)lines.push(`- hottest functions: ${g.hotFunctions.map(f=>`${f.fn} ${f.ms}ms`).join('; ')}`);
 }
 return lines.join('\n');
}
